import {
  pgTable,
  varchar,
  text,
  timestamp,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const usersTable = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }),
  userName: varchar("user_name", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  image: text("image").default(""),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Groups table
export const groupsTable = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  isPrivate: boolean("is_private").default(false),
  createdBy: varchar("created_by", { length: 255 })
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Group Members table
export const groupMembersTable = pgTable("group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groupsTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role").default("member"), // 'admin' or 'member'
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Messages table (for both group and direct messages)
export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => groupsTable.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id", { length: 255 })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  receiverId: varchar("receiver_id", { length: 255 })
    .references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"), // 'text', 'image', 'file'
  createdAt: timestamp("created_at").defaultNow(),
  isEdited: boolean("is_edited").default(false),
  isRead: boolean("is_read").default(false),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  createdGroups: many(groupsTable),
  groupMemberships: many(groupMembersTable),
  sentMessages: many(messagesTable),
}));

export const groupsRelations = relations(groupsTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [groupsTable.createdBy],
    references: [usersTable.id],
  }),
  members: many(groupMembersTable),
  messages: many(messagesTable),
}));

export const groupMembersRelations = relations(
  groupMembersTable,
  ({ one }) => ({
    group: one(groupsTable, {
      fields: [groupMembersTable.groupId],
      references: [groupsTable.id],
    }),
    user: one(usersTable, {
      fields: [groupMembersTable.userId],
      references: [usersTable.id],
    }),
  })
);

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  group: one(groupsTable, {
    fields: [messagesTable.groupId],
    references: [groupsTable.id],
  }),
  sender: one(usersTable, {
    fields: [messagesTable.senderId],
    references: [usersTable.id],
  }),
  receiver: one(usersTable, {
    fields: [messagesTable.receiverId],
    references: [usersTable.id],
  }),
}));