import { db } from "../config/db.js";
import { usersTable, messagesTable, userContactsTable } from "../drizzle/schema.js";
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
    const activeUsers = req.activeUsers; // Get real-time active users map

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

    // Override isOnline status with real-time data from activeUsers map
    const usersWithRealtimeStatus = users.map((user) => ({
      ...user,
      isOnline: activeUsers && activeUsers.has(user.id), // True if user is in activeUsers map, false otherwise
    }));

    // Get last message with each user AND check if they're added as contacts
    const usersWithLastMessage = await Promise.all(
      usersWithRealtimeStatus.map(async (user) => {
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

        // Check if user is added as contact
        let addedForChat = false;
        try {
          const [contact] = await db
            .select()
            .from(userContactsTable)
            .where(
              and(
                eq(userContactsTable.userId, currentUserId),
                eq(userContactsTable.contactUserId, user.id),
                eq(userContactsTable.addedForChat, true)
              )
            );

          addedForChat = !!contact;
        } catch (contactError) {
          // Table might not exist yet - that's okay, just treat as no contacts
          console.warn(`⚠️  Could not check contacts (table may not exist):`, contactError.message);
          addedForChat = false;
        }

        const hasChat = !!lastMessage;

        return {
          ...user,
          lastMessage: lastMessage || null,
          unreadCount: unreadMessages.length,
          hasChat, // true if user has chat history
          addedForChat, // true if user was added as contact
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

    // Validate email if provided
    if (email !== undefined && email.trim() !== "") {
      // Email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if email is unique (not used by another user)
      const [existingUser] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.email, email),
            ne(usersTable.id, userId) // Exclude current user
          )
        );

      if (existingUser) {
        return res.status(400).json({ message: "Email already in use by another user" });
      }
    }

    // Build update object with only provided fields
    const updateData = {};
    if (name !== undefined && name.trim() !== "") updateData.name = name.trim();
    if (email !== undefined && email.trim() !== "") updateData.email = email.trim();
    if (image !== undefined && image.trim() !== "") updateData.image = image.trim();
    updateData.updatedAt = new Date();

    // Check if there's actually anything to update
    if (Object.keys(updateData).length === 1) { // Only updatedAt field
      return res.status(400).json({ message: "Please provide at least one field to update" });
    }

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

export const addUserAsContact = async (req, res) => {
  try {
    const userId = req.userId;
    const { contactUserId } = req.body;

    console.log(`\n👥 [ADD CONTACT] User ${userId} adding user ${contactUserId} as contact`);

    // Validate contact user exists
    if (!contactUserId) {
      return res.status(400).json({ message: "Contact user ID is required" });
    }

    if (userId === contactUserId) {
      return res.status(400).json({ message: "Cannot add yourself as a contact" });
    }

    // Check if contact user exists
    const [contactUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, contactUserId));

    if (!contactUser) {
      return res.status(404).json({ message: "Contact user not found" });
    }

    try {
      // Check if already added as contact
      const [existingContact] = await db
        .select()
        .from(userContactsTable)
        .where(
          and(
            eq(userContactsTable.userId, userId),
            eq(userContactsTable.contactUserId, contactUserId),
            eq(userContactsTable.addedForChat, true)
          )
        );

      if (existingContact) {
        return res.status(400).json({ message: "User is already added as contact" });
      }

      // Add contact
      const [newContact] = await db
        .insert(userContactsTable)
        .values({
          userId,
          contactUserId,
          addedForChat: true,
        })
        .returning();

      console.log(`✅ [ADD CONTACT] Contact added successfully:`, newContact.id);

      res.status(200).json({
        message: "Contact added successfully",
        contact: newContact,
      });
    } catch (tableError) {
      // Table might not exist - create a temporary response
      if (tableError.message?.includes("does not exist")) {
        console.warn(`⚠️  user_contacts table does not exist yet`);
        console.log(`💡 [INFO] Run database migrations to create the table`);
        // Still return success so frontend can work
        res.status(200).json({
          message: "Contact added (table pending migration)",
          contact: { userId, contactUserId, addedForChat: true },
        });
      } else {
        throw tableError;
      }
    }
  } catch (error) {
    console.error("Add contact error:", error);
    res.status(500).json({ message: "Error adding contact" });
  }
};

export const removeUserAsContact = async (req, res) => {
  try {
    const userId = req.userId;
    const { contactUserId } = req.body;

    console.log(`\n❌ [REMOVE CONTACT] User ${userId} removing user ${contactUserId} as contact`);

    if (!contactUserId) {
      return res.status(400).json({ message: "Contact user ID is required" });
    }

    try {
      // Remove contact by setting addedForChat to false
      const [removed] = await db
        .update(userContactsTable)
        .set({ addedForChat: false })
        .where(
          and(
            eq(userContactsTable.userId, userId),
            eq(userContactsTable.contactUserId, contactUserId)
          )
        )
        .returning();

      if (!removed) {
        return res.status(404).json({ message: "Contact not found" });
      }

      console.log(`✅ [REMOVE CONTACT] Contact removed successfully`);

      res.status(200).json({
        message: "Contact removed successfully",
      });
    } catch (tableError) {
      // Table might not exist yet - that's okay
      if (tableError.message?.includes("does not exist")) {
        console.warn(`⚠️  user_contacts table does not exist yet`);
        // Still return success
        res.status(200).json({
          message: "Contact removed (table pending migration)",
        });
      } else {
        throw tableError;
      }
    }
  } catch (error) {
    console.error("Remove contact error:", error);
    res.status(500).json({ message: "Error removing contact" });
  }
};