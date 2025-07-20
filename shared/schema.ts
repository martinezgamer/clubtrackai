import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Clubs table
export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  address: text("address"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  settings: json("settings").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User roles table
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  permissions: json("permissions").$type<string[]>().notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Users table (Bobby and other users)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  roleId: integer("role_id").references(() => userRoles.id),
  isActive: boolean("is_active").default(true),
  isSuperUser: boolean("is_super_user").default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User club assignments table (many-to-many)
export const userClubAssignments = pgTable("user_club_assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  clubId: integer("club_id").references(() => clubs.id),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// User sessions table for authentication
export const userSessions = pgTable("user_sessions", {
  sid: text("sid").primaryKey(),
  sess: json("sess").$type<any>().notNull(),
  expire: timestamp("expire").notNull(),
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
  clubId: integer("club_id").references(() => clubs.id),
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

// Follow-up sequences table
export const followUpSequences = pgTable("follow_up_sequences", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => forms.id),
  name: text("name").notNull(),
  description: text("description"),
  triggerConditions: json("trigger_conditions").$type<Array<{
    fieldId: string;
    operator: string; // equals, contains, greater_than, less_than, not_equals
    value: any;
  }>>().notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Follow-up actions table
export const followUpActions = pgTable("follow_up_actions", {
  id: serial("id").primaryKey(),
  sequenceId: integer("sequence_id").references(() => followUpSequences.id),
  actionType: text("action_type").notNull(), // create_memory, schedule_event, send_message, create_task
  actionData: json("action_data").$type<Record<string, any>>().notNull(),
  delayMinutes: integer("delay_minutes").default(0), // delay before executing action
  executionOrder: integer("execution_order").notNull(), // order of execution within sequence
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Follow-up executions table (tracks what has been executed)
export const followUpExecutions = pgTable("follow_up_executions", {
  id: serial("id").primaryKey(),
  responseId: integer("response_id").references(() => formResponses.id),
  sequenceId: integer("sequence_id").references(() => followUpSequences.id),
  actionId: integer("action_id").references(() => followUpActions.id),
  status: text("status").default("pending"), // pending, completed, failed
  executedAt: timestamp("executed_at"),
  scheduledFor: timestamp("scheduled_for"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat History Table
export const chatHistory = pgTable("chat_history", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  message: text("message").notNull(),
  sender: text("sender").notNull(), // user, ai
  messageType: text("message_type").default("text"), // text, table, form, action
  metadata: json("metadata").$type<Record<string, any>>(), // For storing table data, form data, etc.
  sentiment: text("sentiment"), // positive, negative, neutral
  keywords: text("keywords").array(),
  responseTime: integer("response_time"), // in milliseconds
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dynamic Tables created by AI
export const dynamicTables = pgTable("dynamic_tables", {
  id: serial("id").primaryKey(),
  tableName: text("table_name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  schema: json("schema").$type<Record<string, any>>().notNull(), // Column definitions
  createdBy: text("created_by").notNull().default("ai"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dynamic Table Data
export const dynamicTableData = pgTable("dynamic_table_data", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id").references(() => dynamicTables.id),
  rowData: json("row_data").$type<Record<string, any>>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations
export const clubsRelations = relations(clubs, ({ many }) => ({
  contacts: many(contacts),
  userAssignments: many(userClubAssignments),
}));

export const userRolesRelations = relations(userRoles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(userRoles, {
    fields: [users.roleId],
    references: [userRoles.id],
  }),
  clubAssignments: many(userClubAssignments),
  conversations: many(conversations),
}));

export const userClubAssignmentsRelations = relations(userClubAssignments, ({ one }) => ({
  user: one(users, {
    fields: [userClubAssignments.userId],
    references: [users.id],
  }),
  club: one(clubs, {
    fields: [userClubAssignments.clubId],
    references: [clubs.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  club: one(clubs, {
    fields: [contacts.clubId],
    references: [clubs.id],
  }),
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

export const followUpSequencesRelations = relations(followUpSequences, ({ one, many }) => ({
  form: one(forms, {
    fields: [followUpSequences.formId],
    references: [forms.id],
  }),
  actions: many(followUpActions),
  executions: many(followUpExecutions),
}));

export const followUpActionsRelations = relations(followUpActions, ({ one, many }) => ({
  sequence: one(followUpSequences, {
    fields: [followUpActions.sequenceId],
    references: [followUpSequences.id],
  }),
  executions: many(followUpExecutions),
}));

export const followUpExecutionsRelations = relations(followUpExecutions, ({ one }) => ({
  response: one(formResponses, {
    fields: [followUpExecutions.responseId],
    references: [formResponses.id],
  }),
  sequence: one(followUpSequences, {
    fields: [followUpExecutions.sequenceId],
    references: [followUpSequences.id],
  }),
  action: one(followUpActions, {
    fields: [followUpExecutions.actionId],
    references: [followUpActions.id],
  }),
}));

// Insert schemas
export const insertClubSchema = createInsertSchema(clubs).pick({
  name: true,
  displayName: true,
  address: true,
  description: true,
}).extend({
  address: z.string().optional(),
  description: z.string().optional(),
});

export const insertUserRoleSchema = createInsertSchema(userRoles).pick({
  name: true,
  displayName: true,
  description: true,
  permissions: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  roleId: true,
});

export const insertUserClubAssignmentSchema = createInsertSchema(userClubAssignments).pick({
  userId: true,
  clubId: true,
  isDefault: true,
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
  clubId: true,
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
export type Club = typeof clubs.$inferSelect;
export type InsertClub = z.infer<typeof insertClubSchema>;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserClubAssignment = typeof userClubAssignments.$inferSelect;
export type InsertUserClubAssignment = z.infer<typeof insertUserClubAssignmentSchema>;

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

export const insertFollowUpSequenceSchema = createInsertSchema(followUpSequences).pick({
  formId: true,
  name: true,
  description: true,
  triggerConditions: true,
});

export const insertFollowUpActionSchema = createInsertSchema(followUpActions).pick({
  sequenceId: true,
  actionType: true,
  actionData: true,
  delayMinutes: true,
  executionOrder: true,
});

export const insertFollowUpExecutionSchema = createInsertSchema(followUpExecutions).pick({
  responseId: true,
  sequenceId: true,
  actionId: true,
  status: true,
  scheduledFor: true,
  errorMessage: true,
});

export const insertChatHistorySchema = createInsertSchema(chatHistory).pick({
  sessionId: true,
  message: true,
  sender: true,
  messageType: true,
  metadata: true,
  sentiment: true,
  keywords: true,
  responseTime: true,
});

export const insertDynamicTableSchema = createInsertSchema(dynamicTables).pick({
  tableName: true,
  displayName: true,
  description: true,
  schema: true,
  createdBy: true,
});

export const insertDynamicTableDataSchema = createInsertSchema(dynamicTableData).pick({
  tableId: true,
  rowData: true,
});

export type FollowUpSequence = typeof followUpSequences.$inferSelect;
export type InsertFollowUpSequence = z.infer<typeof insertFollowUpSequenceSchema>;

export type FollowUpAction = typeof followUpActions.$inferSelect;
export type InsertFollowUpAction = z.infer<typeof insertFollowUpActionSchema>;

export type FollowUpExecution = typeof followUpExecutions.$inferSelect;
export type InsertFollowUpExecution = z.infer<typeof insertFollowUpExecutionSchema>;

export type ChatHistory = typeof chatHistory.$inferSelect;
export type InsertChatHistory = z.infer<typeof insertChatHistorySchema>;

export type DynamicTable = typeof dynamicTables.$inferSelect;
export type InsertDynamicTable = z.infer<typeof insertDynamicTableSchema>;

export type DynamicTableData = typeof dynamicTableData.$inferSelect;
export type InsertDynamicTableData = z.infer<typeof insertDynamicTableDataSchema>;
