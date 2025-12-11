import express from "express";
import { createServer } from 'node:http';
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { db } from "./config/db.js";
import { messagesTable, usersTable } from "./drizzle/schema.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";

// Routes
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import groupRouter from "./routes/group.routes.js";
import messageRouter from "./routes/message.routes.js";

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 8000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/groups", groupRouter);
app.use("/api/messages", messageRouter);

// Store active users: userId -> socket.id
const activeUsers = new Map();
// Store socket to user mapping: socket.id -> userId
const socketToUser = new Map();

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error("Authentication error"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on('connection', async (socket) => {
  const userId = socket.userId;
  console.log(`✅ User connected: ${userId} (socket: ${socket.id})`);

  // Store active user
  activeUsers.set(userId, socket.id);
  socketToUser.set(socket.id, userId);

  // Update user online status in database
  try {
    await db
      .update(usersTable)
      .set({ isOnline: true, lastSeen: new Date() })
      .where(eq(usersTable.id, userId));
  } catch (error) {
    console.error("Error updating user status:", error);
  }

  // Broadcast user online status to all connected clients
  io.emit("user_status_change", {
    userId,
    isOnline: true,
  });

  // Join user to their personal room
  socket.join(`user:${userId}`);

  // Get user info and emit to all clients
  try {
    const [user] = await db
      .select({
        id: usersTable.id,
        userName: usersTable.userName,
        name: usersTable.name,
        image: usersTable.image,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    socket.broadcast.emit("user_online", user);
  } catch (error) {
    console.error("Error fetching user:", error);
  }

  // Handle joining a group
  socket.on("join_group", async (data) => {
    const { groupId } = data;
    socket.join(`group:${groupId}`);
    console.log(`📥 User ${userId} joined group ${groupId}`);

    socket.to(`group:${groupId}`).emit("user_joined_group", {
      userId,
      groupId,
    });
  });

  // Handle leaving a group
  socket.on("leave_group", (data) => {
    const { groupId } = data;
    socket.leave(`group:${groupId}`);
    console.log(`📤 User ${userId} left group ${groupId}`);

    socket.to(`group:${groupId}`).emit("user_left_group", {
      userId,
      groupId,
    });
  });

  // Handle direct message
  socket.on("send_direct_message", async (data) => {
    const { receiverId, content } = data;
    
    try {
      // Save message to database
      const [savedMessage] = await db.insert(messagesTable).values({
        senderId: userId,
        receiverId,
        content,
        groupId: null,
      }).returning();

      // Get sender info
      const [sender] = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          userName: usersTable.userName,
          image: usersTable.image,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      const messageData = {
        ...savedMessage,
        senderName: sender.name,
        senderUserName: sender.userName,
        senderImage: sender.image,
      };

      // Send to receiver if online
      const receiverSocketId = activeUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive_direct_message", messageData);
      }

      // Send confirmation back to sender
      socket.emit("message_sent", messageData);

    } catch (error) {
      console.error("Error sending direct message:", error);
      socket.emit("message_error", { error: "Failed to send message" });
    }
  });

  // Handle group message
  socket.on("send_group_message", async (data) => {
    const { groupId, content } = data;
    
    try {
      // Save message to database
      const [savedMessage] = await db.insert(messagesTable).values({
        groupId,
        senderId: userId,
        content,
        receiverId: null,
      }).returning();

      // Get sender info
      const [sender] = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          userName: usersTable.userName,
          image: usersTable.image,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      const messageData = {
        ...savedMessage,
        senderName: sender.name,
        senderUserName: sender.userName,
        senderImage: sender.image,
      };

      // Broadcast to all users in the group
      io.to(`group:${groupId}`).emit("receive_group_message", messageData);

    } catch (error) {
      console.error("Error sending group message:", error);
      socket.emit("message_error", { error: "Failed to send message" });
    }
  });

  // Handle typing indicator for direct messages
  socket.on("typing_direct", (data) => {
    const { receiverId } = data;
    const receiverSocketId = activeUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user_typing_direct", { userId });
    }
  });

  socket.on("stop_typing_direct", (data) => {
    const { receiverId } = data;
    const receiverSocketId = activeUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user_stop_typing_direct", { userId });
    }
  });

  // Handle typing indicator for groups
  socket.on("typing_group", (data) => {
    const { groupId } = data;
    socket.to(`group:${groupId}`).emit("user_typing_group", { userId, groupId });
  });

  socket.on("stop_typing_group", (data) => {
    const { groupId } = data;
    socket.to(`group:${groupId}`).emit("user_stop_typing_group", { userId, groupId });
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log(`❌ User disconnected: ${userId} (socket: ${socket.id})`);
    
    activeUsers.delete(userId);
    socketToUser.delete(socket.id);

    // Update user offline status in database
    try {
      await db
        .update(usersTable)
        .set({ isOnline: false, lastSeen: new Date() })
        .where(eq(usersTable.id, userId));
    } catch (error) {
      console.error("Error updating user status:", error);
    }

    // Broadcast user offline status
    io.emit("user_status_change", {
      userId,
      isOnline: false,
    });
  });
});

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;