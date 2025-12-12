import express from "express";
import jwt from "jsonwebtoken";
import { db } from "../config/db.js";
import { groupsTable, groupMembersTable, messagesTable, usersTable } from "../drizzle/schema.js";
import { eq, and, desc } from "drizzle-orm";

const router = express.Router();

// FIXED: Proper authentication middleware that extracts user ID from JWT
const authenticateUser = async (req, res, next) => {
  try {
    // Get token from cookies
    let token = req.cookies.token;
    
    console.log("Raw token from cookies:", token);
    
    if (!token) {
      return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    // Handle case where token might be JSON stringified
    if (typeof token === 'object') {
      token = token.token || JSON.stringify(token);
    }

    // If token is a string that looks like JSON, try to parse it
    if (typeof token === 'string' && (token.startsWith('{') || token.startsWith('j:'))) {
      try {
        // Remove 'j:' prefix if present (added by cookie-parser for JSON cookies)
        if (token.startsWith('j:')) {
          token = token.substring(2);
        }
        const parsed = JSON.parse(token);
        if (parsed.token) {
          token = parsed.token;
        }
      } catch (e) {
        // If parsing fails, use token as is
        console.log("Token parsing failed, using as is");
      }
    }

    console.log("Processed token:", token);

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log("Decoded token:", decoded);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Unauthorized - Invalid token structure" });
    }

    // Attach user ID to request
    req.userId = decoded.userId;
    console.log("Authenticated user ID:", req.userId);
     console.log("📊 User ID type:", typeof req.userId);

    // ADDED: Verify user exists in database
    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId));
    
    if (!user) {
      console.error("❌ User not found in database:", req.userId);
      return res.status(401).json({ error: "User not found" });
    }
    
    console.log("✅ User verified in database:", user.id);
    
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    res.status(401).json({ error: "Authentication failed: " + error.message });
  }
};
// Create a new group
router.post("/create", authenticateUser, async (req, res) => {
  try {
    const { name, description, memberIds = [] } = req.body;

    // Create group
    const [newGroup] = await db.insert(groupsTable).values({
      name,
      description,
      createdBy: req.userId,
    }).returning();

    // Add creator as admin
    await db.insert(groupMembersTable).values({
      groupId: newGroup.id,
      userId: req.userId,
      role: "admin",
    });

    // Add other members
    if (memberIds.length > 0) {
      const memberValues = memberIds.map(userId => ({
        groupId: newGroup.id,
        userId,
        role: "member",
      }));
      await db.insert(groupMembersTable).values(memberValues);
    }

    // Return group with memberIds for socket event
    res.status(201).json({ group: newGroup, memberIds });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Failed to create group", details: error.message });
  }
});

// Get user's groups
router.get("/my-groups", authenticateUser, async (req, res) => {
  try {
    const groups = await db
      .select({
        id: groupsTable.id,
        name: groupsTable.name,
        description: groupsTable.description,
        createdAt: groupsTable.createdAt,
        role: groupMembersTable.role,
      })
      .from(groupMembersTable)
      .innerJoin(groupsTable, eq(groupMembersTable.groupId, groupsTable.id))
      .where(eq(groupMembersTable.userId, req.userId));

    res.json({ groups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

// Get group details with members
router.get("/:groupId", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;

    // Verify user is a member
    const membership = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, groupId),
          eq(groupMembersTable.userId, req.userId)
        )
      );

    if (membership.length === 0) {
      return res.status(403).json({ error: "Not a member of this group" });
    }

    // Get group details
    const [group] = await db
      .select()
      .from(groupsTable)
      .where(eq(groupsTable.id, groupId));

    // Get members
    const members = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        userName: usersTable.userName,
        role: groupMembersTable.role,
        joinedAt: groupMembersTable.joinedAt,
      })
      .from(groupMembersTable)
      .innerJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
      .where(eq(groupMembersTable.groupId, groupId));

    res.json({ group, members });
  } catch (error) {
    console.error("Error fetching group details:", error);
    res.status(500).json({ error: "Failed to fetch group details" });
  }
});

// Get messages for a group
router.get("/:groupId/messages", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify user is a member
    const membership = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, groupId),
          eq(groupMembersTable.userId, req.userId)
        )
      );

    if (membership.length === 0) {
      return res.status(403).json({ error: "Not a member of this group" });
    }

    // Get messages
    const messages = await db
      .select({
        id: messagesTable.id,
        content: messagesTable.content,
        createdAt: messagesTable.createdAt,
        isEdited: messagesTable.isEdited,
        senderId: messagesTable.senderId,
        senderName: usersTable.name,
        senderUserName: usersTable.userName,
        senderEmail: usersTable.email,
      })
      .from(messagesTable)
      .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(eq(messagesTable.groupId, groupId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send a message (REST endpoint as backup to socket)
router.post("/:groupId/messages", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content } = req.body;

    // Verify user is a member
    const membership = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, groupId),
          eq(groupMembersTable.userId, req.userId)
        )
      );

    if (membership.length === 0) {
      return res.status(403).json({ error: "Not a member of this group" });
    }

    const [message] = await db.insert(messagesTable).values({
      groupId,
      senderId: req.userId,
      content,
    }).returning();

    res.status(201).json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Add member to group
router.post("/:groupId/members", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    // Check if requester is admin
    const [requesterMembership] = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, groupId),
          eq(groupMembersTable.userId, req.userId)
        )
      );

    if (!requesterMembership || requesterMembership.role !== "admin") {
      return res.status(403).json({ error: "Only admins can add members" });
    }

    // Add new member
    await db.insert(groupMembersTable).values({
      groupId,
      userId,
      role: "member",
    });

    res.status(201).json({ message: "Member added successfully" });
  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).json({ error: "Failed to add member" });
  }
});

export default router;