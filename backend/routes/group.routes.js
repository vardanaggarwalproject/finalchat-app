// routes/group.routes.js

import express from "express";
import { db } from "../config/db.js";
import { groupsTable, groupMembersTable, messagesTable, usersTable } from "../drizzle/schema.js";
import { eq, and, desc } from "drizzle-orm";

const router = express.Router();

// Middleware to check authentication (adjust based on your auth setup)
const authenticateUser = async (req, res, next) => {
  try {
    // Get user from your auth session
    // This depends on your better-auth setup
    const userId = req.session?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.userId = userId;
    next();
  } catch (error) {
    res.status(401).json({ error: "Authentication failed" });
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

    res.status(201).json({ group: newGroup });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Failed to create group" });
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

// Send a message (also handled via socket, but endpoint for consistency)
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