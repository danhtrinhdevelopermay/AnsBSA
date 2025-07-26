import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json, integer, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  firebaseUid: text("firebase_uid").unique(),
  username: text("username"),
  password: text("password"),
  credits: integer("credits").notNull().default(1000),
  role: text("role").notNull().default("user"), // "user" | "admin"
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chats = pgTable("chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  attachments: json("attachments").$type<Array<{
    type: 'image' | 'video' | 'audio' | 'file';
    name: string;
    url: string;
    mimeType: string;
    size?: number;
  }>>(),
  creditsUsed: integer("credits_used").notNull().default(0),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Credit usage tracking table
export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  messageId: varchar("message_id"),
  type: text("type").notNull(), // "chat", "imageGeneration", "videoAnalysis", "deepSearch", "webScraping", "learning", "admin_adjustment"
  amount: integer("amount").notNull(), // Negative for deductions, positive for additions
  balanceAfter: integer("balance_after").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  chats: many(chats),
  messages: many(messages),
  creditTransactions: many(creditTransactions),
}));

export const chatRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messageRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
}));

export const creditTransactionRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, {
    fields: [creditTransactions.userId],
    references: [users.id],
  }),
  message: one(messages, {
    fields: [creditTransactions.messageId],
    references: [messages.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firebaseUid: true,
  username: true,
  password: true,
  role: true,
});

export const insertChatSchema = createInsertSchema(chats).pick({
  title: true,
  userId: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  chatId: true,
  userId: true,
  role: true,
  content: true,
  attachments: true,
  creditsUsed: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).pick({
  userId: true,
  messageId: true,
  type: true,
  amount: true,
  balanceAfter: true,
  description: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chats.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;

// Credit cost mapping (matches quota rates from gemini-manager)
export const CREDIT_COSTS = {
  chat: 100,
  imageGeneration: 200,
  videoAnalysis: 300,
  webScraping: 150,
  deepSearch: 200,
  learning: 100,
} as const;

export type CreditType = keyof typeof CREDIT_COSTS;
