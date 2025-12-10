import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),

  name: varchar("name", { length: 255 }),

  userName: varchar("user_name", { length: 255 }).notNull().unique(),

  email: varchar("email", { length: 255 }).notNull().unique(),

  password: varchar("password", { length: 255 }).notNull(),

  image: text("image").default(""),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// group table
export const groupsTable = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// group Members table
export const groupMembersTable = pgTable("group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groupsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role").default("member"), // 'admin' or 'member'
  joinedAt: timestamp("joined_at").defaultNow(),
});

// messages table
export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groupsTable.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  isEdited: boolean("is_edited").default(false),
});
// Relations
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
}));
