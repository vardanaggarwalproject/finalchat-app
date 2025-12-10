import express from "express";
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import connectDB from "./config/dbConnection.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import groupRouter from "./routes/group.routes.js"; // NEW
import { initAuth } from "./lib/auth.js";
import { db } from "./config/db.js";
import { messagesTable } from "./drizzle/schema.js";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

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

const __dirname = dirname(fileURLToPath(import.meta.url));

// Store active users in rooms
const activeUsers = new Map(); // socket.id -> { userId, username, groupId }

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User joins a group chat
  socket.on("join_group", async (data) => {
    const { groupId, userId, username } = data;
    
    socket.join(groupId);
    activeUsers.set(socket.id, { userId, username, groupId });
    
    console.log(`User ${username} (${userId}) joined group ${groupId}`);
    
    // Notify other members
    socket.to(groupId).emit("user_joined", {
      userId,
      username,
      message: `${username} joined the chat`
    });

    // Send list of active users in this room
    const roomUsers = Array.from(activeUsers.values())
      .filter(user => user.groupId === groupId);
    
    io.to(groupId).emit("active_users", roomUsers);
  });

  // Handle incoming messages
  socket.on("send_message", async (data) => {
    const { groupId, userId, username, content } = data;
    
    try {
      // Save message to database
      const [savedMessage] = await db.insert(messagesTable).values({
        groupId,
        senderId: userId,
        content,
      }).returning();

      // Broadcast message to all users in the group
      const messageData = {
        id: savedMessage.id,
        content: savedMessage.content,
        createdAt: savedMessage.createdAt,
        senderId: userId,
        senderName: username,
        isEdited: false,
      };

      io.to(groupId).emit("receive_message", messageData);
      
    } catch (error) {
      console.error("Error saving message:", error);
      socket.emit("message_error", { error: "Failed to send message" });
    }
  });

  // User is typing indicator
  socket.on("typing", (data) => {
    const { groupId, username } = data;
    socket.to(groupId).emit("user_typing", { username });
  });

  socket.on("stop_typing", (data) => {
    const { groupId, username } = data;
    socket.to(groupId).emit("user_stop_typing", { username });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    
    if (user) {
      const { groupId, username } = user;
      
      // Notify others in the group
      socket.to(groupId).emit("user_left", {
        username,
        message: `${username} left the chat`
      });

      activeUsers.delete(socket.id);
      
      // Update active users list
      const roomUsers = Array.from(activeUsers.values())
        .filter(u => u.groupId === groupId);
      
      io.to(groupId).emit("active_users", roomUsers);
    }
    
    console.log(`User disconnected: ${socket.id}`);
  });
});

app.use(express.json());
app.use(cookieParser());

const auth = await initAuth();
app.use("/api/better-auth", toNodeHandler(auth));
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/groups", groupRouter); // NEW

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});