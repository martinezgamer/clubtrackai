import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (Bobby and other users)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contacts table (dancers, staff, regulars, etc.)
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nickname: text("nickname"),
  role: text("role").notNull(), // dancer, staff, regular, family, friend
  phone: text("phone"),
  email: text("email"),
  photoUrl: text("photo_url"),
  status: text("status").default("active"), // active, inactive, problematic
  notes: text("notes"),
  preferences: json("preferences").$type<Record<string, any>>(),
  lastContact: timestamp("last_contact"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conversations table for chat history
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").references(() => contacts.id),
  userId: integer("user_id").references(() => users.id),
  message: text("message").notNull(),
  sender: text("sender").notNull(), // user, ai, contact
  messageType: text("message_type").default("text"), // text, voice, image
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Forms table for creating custom forms
export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  fields: json("fields").$type<Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    options?: string[];
  }>>().notNull(),
  isRecurring: boolean("is_recurring").default(false),
  recurringSchedule: text("recurring_schedule"), // daily, weekly, monthly
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Form responses table
export const formResponses = pgTable("form_responses", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => forms.id),
  contactId: integer("contact_id").references(() => contacts.id),
  responses: json("responses").$type<Record<string, any>>().notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Calendar events table
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  attendees: json("attendees").$type<number[]>(), // contact IDs
  eventType: text("event_type").default("meeting"), // meeting, shift, personal, reminder
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: text("recurring_pattern"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Social media content table
export const socialMediaContent = pgTable("social_media_content", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  contentType: text("content_type").notNull(), // post, flyer, story
  platform: text("platform"), // instagram, facebook, twitter
  imageUrl: text("image_url"),
  scheduledFor: timestamp("scheduled_for"),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Memory/recall items table
export const memoryItems = pgTable("memory_items", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").references(() => contacts.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(), // conversation, reminder, note, task
  priority: text("priority").default("medium"), // low, medium, high
  isCompleted: boolean("is_completed").default(false),
  reminderDate: timestamp("reminder_date"),
  tags: json("tags").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales/Inventory tracking table
export const salesItems = pgTable("sales_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: text("price").notNull(), // stored as text for flexibility with pricing
  category: text("category").notNull(), // house-dad, house-mom, merchandise, etc.
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  stockQuantity: integer("stock_quantity").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales transactions table
export const salesTransactions = pgTable("sales_transactions", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => salesItems.id),
  customerId: integer("customer_id").references(() => contacts.id),
  quantity: integer("quantity").notNull(),
  unitPrice: text("unit_price").notNull(),
  totalAmount: text("total_amount").notNull(),
  paymentMethod: text("payment_method").notNull(), // cash, cashapp, venmo, etc.
  paymentStatus: text("payment_status").default("completed"), // pending, completed, refunded
  qrCodeData: text("qr_code_data"), // for payment QR codes
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations
export const contactsRelations = relations(contacts, ({ many }) => ({
  conversations: many(conversations),
  formResponses: many(formResponses),
  memoryItems: many(memoryItems),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  contact: one(contacts, {
    fields: [conversations.contactId],
    references: [contacts.id],
  }),
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
}));

export const formsRelations = relations(forms, ({ many }) => ({
  responses: many(formResponses),
}));

export const formResponsesRelations = relations(formResponses, ({ one }) => ({
  form: one(forms, {
    fields: [formResponses.formId],
    references: [forms.id],
  }),
  contact: one(contacts, {
    fields: [formResponses.contactId],
    references: [contacts.id],
  }),
}));

export const memoryItemsRelations = relations(memoryItems, ({ one }) => ({
  contact: one(contacts, {
    fields: [memoryItems.contactId],
    references: [contacts.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const insertContactSchema = createInsertSchema(contacts).pick({
  name: true,
  nickname: true,
  role: true,
  phone: true,
  email: true,
  photoUrl: true,
  status: true,
  notes: true,
  preferences: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  contactId: true,
  userId: true,
  message: true,
  sender: true,
  messageType: true,
  metadata: true,
});

export const insertFormSchema = createInsertSchema(forms).pick({
  title: true,
  description: true,
  fields: true,
  isRecurring: true,
  recurringSchedule: true,
});

export const insertFormResponseSchema = createInsertSchema(formResponses).pick({
  formId: true,
  contactId: true,
  responses: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).pick({
  title: true,
  description: true,
  startTime: true,
  endTime: true,
  location: true,
  attendees: true,
  eventType: true,
  isRecurring: true,
  recurringPattern: true,
});

export const insertSocialMediaContentSchema = createInsertSchema(socialMediaContent).pick({
  title: true,
  content: true,
  contentType: true,
  platform: true,
  imageUrl: true,
  scheduledFor: true,
});

export const insertMemoryItemSchema = createInsertSchema(memoryItems).pick({
  contactId: true,
  title: true,
  content: true,
  category: true,
  priority: true,
  reminderDate: true,
  tags: true,
});

export const insertSalesItemSchema = createInsertSchema(salesItems).pick({
  name: true,
  description: true,
  price: true,
  category: true,
  imageUrl: true,
  stockQuantity: true,
});

export const insertSalesTransactionSchema = createInsertSchema(salesTransactions).pick({
  itemId: true,
  customerId: true,
  quantity: true,
  unitPrice: true,
  totalAmount: true,
  paymentMethod: true,
  paymentStatus: true,
  qrCodeData: true,
  notes: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Form = typeof forms.$inferSelect;
export type InsertForm = z.infer<typeof insertFormSchema>;

export type FormResponse = typeof formResponses.$inferSelect;
export type InsertFormResponse = z.infer<typeof insertFormResponseSchema>;

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

export type SocialMediaContent = typeof socialMediaContent.$inferSelect;
export type InsertSocialMediaContent = z.infer<typeof insertSocialMediaContentSchema>;

export type MemoryItem = typeof memoryItems.$inferSelect;
export type InsertMemoryItem = z.infer<typeof insertMemoryItemSchema>;

export type SalesItem = typeof salesItems.$inferSelect;
export type InsertSalesItem = z.infer<typeof insertSalesItemSchema>;

export type SalesTransaction = typeof salesTransactions.$inferSelect;
export type InsertSalesTransaction = z.infer<typeof insertSalesTransactionSchema>;
