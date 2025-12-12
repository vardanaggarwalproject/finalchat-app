import { db } from "../config/db.js";
import { usersTable, messagesTable } from "../drizzle/schema.js";
import { eq, and, or, desc, ne } from "drizzle-orm";

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;

    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        userName: usersTable.userName,
        email: usersTable.email,
        image: usersTable.image,
        isOnline: usersTable.isOnline,
        lastSeen: usersTable.lastSeen,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user online status
    await db
      .update(usersTable)
      .set({ isOnline: true, lastSeen: new Date() })
      .where(eq(usersTable.id, userId));

    res.status(200).json({ user: { ...user, isOnline: true } });
  } catch (error) {
    // console.error("Get current user error:", error);
    res.status(500).json({ message: "Error fetching user data" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.userId;

    // Get all users except current user
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        userName: usersTable.userName,
        email: usersTable.email,
        image: usersTable.image,
        isOnline: usersTable.isOnline,
        lastSeen: usersTable.lastSeen,
      })
      .from(usersTable)
      .where(ne(usersTable.id, currentUserId));

    // Get last message with each user
    const usersWithLastMessage = await Promise.all(
      users.map(async (user) => {
        const [lastMessage] = await db
          .select({
            content: messagesTable.content,
            createdAt: messagesTable.createdAt,
            senderId: messagesTable.senderId,
          })
          .from(messagesTable)
          .where(
            and(
              or(
                and(
                  eq(messagesTable.senderId, currentUserId),
                  eq(messagesTable.receiverId, user.id)
                ),
                and(
                  eq(messagesTable.senderId, user.id),
                  eq(messagesTable.receiverId, currentUserId)
                )
              ),
              eq(messagesTable.groupId, null)
            )
          )
          .orderBy(desc(messagesTable.createdAt))
          .limit(1);

        // Count unread messages
        const unreadMessages = await db
          .select()
          .from(messagesTable)
          .where(
            and(
              eq(messagesTable.senderId, user.id),
              eq(messagesTable.receiverId, currentUserId),
              eq(messagesTable.isRead, false),
              eq(messagesTable.groupId, null)
            )
          );

        return {
          ...user,
          lastMessage: lastMessage || null,
          unreadCount: unreadMessages.length,
        };
      })
    );

    res.status(200).json({ users: usersWithLastMessage });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { isOnline } = req.body;

    await db
      .update(usersTable)
      .set({
        isOnline,
        lastSeen: new Date(),
      })
      .where(eq(usersTable.id, userId));

    res.status(200).json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({ message: "Error updating status" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, email, image } = req.body;

    // Build update object with only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (image !== undefined) updateData.image = image;
    updateData.updatedAt = new Date();

    // Update user
    await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, userId));

    // Get updated user
    const [updatedUser] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        userName: usersTable.userName,
        email: usersTable.email,
        image: usersTable.image,
        isOnline: usersTable.isOnline,
        lastSeen: usersTable.lastSeen,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    // console.log(" Profile updated for user:", userId);
    // console.log(" Updated user data:", updatedUser);

    // Store updated user in response for middleware to broadcast
    res.locals.updatedUser = updatedUser;

    res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update user profile error:", error);
    res.status(500).json({ message: "Error updating profile" });
  }
};