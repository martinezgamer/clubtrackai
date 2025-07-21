import { 
  users, contacts, conversations, forms, formResponses, 
  calendarEvents, socialMediaContent, memoryItems, salesItems, salesTransactions,
  followUpSequences, followUpActions, followUpExecutions,
  chatHistory, dynamicTables, dynamicTableData,
  type User, type InsertUser, type Contact, type InsertContact,
  type Conversation, type InsertConversation, type Form, type InsertForm,
  type FormResponse, type InsertFormResponse, type CalendarEvent, type InsertCalendarEvent,
  type SocialMediaContent, type InsertSocialMediaContent,
  type MemoryItem, type InsertMemoryItem, type SalesItem, type InsertSalesItem,
  type SalesTransaction, type InsertSalesTransaction,
  type FollowUpSequence, type InsertFollowUpSequence, type FollowUpAction, type InsertFollowUpAction,
  type FollowUpExecution, type InsertFollowUpExecution,
  type ChatHistory, type InsertChatHistory, type DynamicTable, type InsertDynamicTable,
  type DynamicTableData, type InsertDynamicTableData
} from "@shared/schema";
import { db } from "./db";
import { databaseManager, getDbForClub, getDbForUser } from "./database-manager";
import { eq, desc, and, or, like, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Users (Master DB only)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Contacts (Club-specific)
  getContact(id: number, clubId?: number): Promise<Contact | undefined>;
  getContacts(filters?: { role?: string; status?: string; clubId?: number }): Promise<Contact[]>;
  createContact(contact: InsertContact, clubId?: number): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>, clubId?: number): Promise<Contact>;
  deleteContact(id: number, clubId?: number): Promise<void>;
  searchContacts(query: string, clubId?: number): Promise<Contact[]>;

  // Conversations
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByContact(contactId: number): Promise<Conversation[]>;
  getRecentConversations(limit?: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;

  // Forms
  getForm(id: number): Promise<Form | undefined>;
  getForms(includeInactive?: boolean): Promise<Form[]>;
  createForm(form: InsertForm): Promise<Form>;
  updateForm(id: number, form: Partial<InsertForm>): Promise<Form>;
  deleteForm(id: number): Promise<void>;

  // Form Responses
  getFormResponse(id: number): Promise<FormResponse | undefined>;
  getFormResponses(formId: number): Promise<FormResponse[]>;
  createFormResponse(response: InsertFormResponse): Promise<FormResponse>;

  // Calendar Events
  getCalendarEvent(id: number): Promise<CalendarEvent | undefined>;
  getCalendarEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: number): Promise<void>;

  // Social Media Content
  getSocialMediaContent(id: number): Promise<SocialMediaContent | undefined>;
  getSocialMediaContentByDate(date: Date): Promise<SocialMediaContent[]>;
  getAllSocialMediaContent(): Promise<SocialMediaContent[]>;
  createSocialMediaContent(content: InsertSocialMediaContent): Promise<SocialMediaContent>;
  updateSocialMediaContent(id: number, content: Partial<InsertSocialMediaContent>): Promise<SocialMediaContent>;
  deleteSocialMediaContent(id: number): Promise<void>;

  // Memory Items
  getMemoryItem(id: number): Promise<MemoryItem | undefined>;
  getMemoryItems(contactId?: number, category?: string): Promise<MemoryItem[]>;
  createMemoryItem(item: InsertMemoryItem): Promise<MemoryItem>;
  updateMemoryItem(id: number, item: Partial<InsertMemoryItem>): Promise<MemoryItem>;
  deleteMemoryItem(id: number): Promise<void>;

  // Sales Items
  getSalesItem(id: number): Promise<SalesItem | undefined>;
  getSalesItems(category?: string): Promise<SalesItem[]>;
  createSalesItem(item: InsertSalesItem): Promise<SalesItem>;
  updateSalesItem(id: number, item: Partial<InsertSalesItem>): Promise<SalesItem>;
  deleteSalesItem(id: number): Promise<void>;

  // Sales Transactions
  getSalesTransaction(id: number): Promise<SalesTransaction | undefined>;
  getSalesTransactions(itemId?: number, customerId?: number): Promise<SalesTransaction[]>;
  createSalesTransaction(transaction: InsertSalesTransaction): Promise<SalesTransaction>;
  updateSalesTransaction(id: number, transaction: Partial<InsertSalesTransaction>): Promise<SalesTransaction>;

  // Follow-up Sequences
  getFollowUpSequence(id: number): Promise<FollowUpSequence | undefined>;
  getFollowUpSequencesByForm(formId: number): Promise<FollowUpSequence[]>;
  createFollowUpSequence(sequence: InsertFollowUpSequence): Promise<FollowUpSequence>;
  updateFollowUpSequence(id: number, sequence: Partial<InsertFollowUpSequence>): Promise<FollowUpSequence>;
  deleteFollowUpSequence(id: number): Promise<void>;

  // Follow-up Actions
  getFollowUpAction(id: number): Promise<FollowUpAction | undefined>;
  getFollowUpActionsBySequence(sequenceId: number): Promise<FollowUpAction[]>;
  createFollowUpAction(action: InsertFollowUpAction): Promise<FollowUpAction>;
  updateFollowUpAction(id: number, action: Partial<InsertFollowUpAction>): Promise<FollowUpAction>;
  deleteFollowUpAction(id: number): Promise<void>;

  // Follow-up Executions
  getFollowUpExecution(id: number): Promise<FollowUpExecution | undefined>;
  getFollowUpExecutionsByResponse(responseId: number): Promise<FollowUpExecution[]>;
  getPendingFollowUpExecutions(): Promise<FollowUpExecution[]>;
  createFollowUpExecution(execution: InsertFollowUpExecution): Promise<FollowUpExecution>;
  updateFollowUpExecution(id: number, execution: Partial<InsertFollowUpExecution>): Promise<FollowUpExecution>;

  // Chat History
  getChatHistory(sessionId: string, limit?: number): Promise<ChatHistory[]>;
  createChatHistory(chat: InsertChatHistory): Promise<ChatHistory>;
  getChatSessions(): Promise<string[]>;
  getChatAnalytics(sessionId?: string): Promise<any>;

  // Dynamic Tables
  getDynamicTable(id: number): Promise<DynamicTable | undefined>;
  getDynamicTableByName(tableName: string): Promise<DynamicTable | undefined>;
  getDynamicTables(): Promise<DynamicTable[]>;
  createDynamicTable(table: InsertDynamicTable): Promise<DynamicTable>;
  updateDynamicTable(id: number, table: Partial<InsertDynamicTable>): Promise<DynamicTable>;
  deleteDynamicTable(id: number): Promise<void>;

  // Dynamic Table Data
  getDynamicTableData(tableId: number): Promise<DynamicTableData[]>;
  createDynamicTableData(data: InsertDynamicTableData): Promise<DynamicTableData>;
  updateDynamicTableData(id: number, data: Partial<InsertDynamicTableData>): Promise<DynamicTableData>;
  deleteDynamicTableData(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users (Master DB only)
  async getUser(id: number): Promise<User | undefined> {
    const masterDb = databaseManager.getMasterDb();
    const [user] = await masterDb.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const masterDb = databaseManager.getMasterDb();
    const [user] = await masterDb.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const masterDb = databaseManager.getMasterDb();
    const [user] = await masterDb.insert(users).values(insertUser).returning();
    return user;
  }

  // Contacts (Club-specific)
  async getContact(id: number, clubId?: number): Promise<Contact | undefined> {
    const database = clubId ? await getDbForClub(clubId) : db;
    const [contact] = await database.select().from(contacts).where(eq(contacts.id, id));
    return contact || undefined;
  }

  async getContacts(filters?: { role?: string; status?: string; clubId?: number }): Promise<Contact[]> {
    const database = filters?.clubId ? await getDbForClub(filters.clubId) : db;
    
    if (filters?.role || filters?.status) {
      const conditions = [];
      if (filters.role) conditions.push(eq(contacts.role, filters.role));
      if (filters.status) conditions.push(eq(contacts.status, filters.status));
      if (filters.clubId) conditions.push(eq(contacts.clubId, filters.clubId));
      
      return await database.select().from(contacts)
        .where(and(...conditions))
        .orderBy(desc(contacts.lastContact), contacts.name);
    }
    
    const whereClause = filters?.clubId ? eq(contacts.clubId, filters.clubId) : undefined;
    return await database.select().from(contacts)
      .where(whereClause)
      .orderBy(desc(contacts.lastContact), contacts.name);
  }

  async createContact(contact: InsertContact, clubId?: number): Promise<Contact> {
    const database = clubId ? await getDbForClub(clubId) : db;
    const [newContact] = await database.insert(contacts).values(contact).returning();
    return newContact;
  }

  async updateContact(id: number, contact: Partial<InsertContact>, clubId?: number): Promise<Contact> {
    const database = clubId ? await getDbForClub(clubId) : db;
    const [updatedContact] = await database
      .update(contacts)
      .set({ ...contact, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();
    return updatedContact;
  }

  async deleteContact(id: number, clubId?: number): Promise<void> {
    const database = clubId ? await getDbForClub(clubId) : db;
    await database.delete(contacts).where(eq(contacts.id, id));
  }

  async searchContacts(query: string, clubId?: number): Promise<Contact[]> {
    const database = clubId ? await getDbForClub(clubId) : db;
    const conditions = or(
      like(contacts.name, `%${query}%`),
      like(contacts.nickname, `%${query}%`),
      like(contacts.role, `%${query}%`)
    );
    
    const whereClause = clubId 
      ? and(conditions, eq(contacts.clubId, clubId))
      : conditions;
    
    return await database.select().from(contacts).where(whereClause);
  }

  // Conversations
  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationsByContact(contactId: number): Promise<Conversation[]> {
    return await db.select().from(conversations)
      .where(eq(conversations.contactId, contactId))
      .orderBy(desc(conversations.createdAt));
  }

  async getRecentConversations(limit: number = 50): Promise<Conversation[]> {
    return await db.select().from(conversations)
      .orderBy(desc(conversations.createdAt))
      .limit(limit);
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db.insert(conversations).values(conversation).returning();
    return newConversation;
  }

  // Forms
  async getForm(id: number): Promise<Form | undefined> {
    const [form] = await db.select().from(forms).where(eq(forms.id, id));
    return form || undefined;
  }

  async getForms(includeInactive: boolean = false): Promise<Form[]> {
    if (!includeInactive) {
      return await db.select().from(forms)
        .where(eq(forms.isActive, true))
        .orderBy(desc(forms.createdAt));
    }
    return await db.select().from(forms)
      .orderBy(desc(forms.createdAt));
  }

  async createForm(form: InsertForm): Promise<Form> {
    const [newForm] = await db.insert(forms).values({
      ...form,
      fields: form.fields as any // Type assertion for JSON field
    }).returning();
    return newForm;
  }

  async updateForm(id: number, form: Partial<InsertForm>): Promise<Form> {
    const updateData: any = { ...form, updatedAt: new Date() };
    if (form.fields) {
      updateData.fields = form.fields as any; // Type assertion for JSON field
    }
    const [updatedForm] = await db
      .update(forms)
      .set(updateData)
      .where(eq(forms.id, id))
      .returning();
    return updatedForm;
  }

  async deleteForm(id: number): Promise<void> {
    await db.delete(forms).where(eq(forms.id, id));
  }

  // Form Responses
  async getFormResponse(id: number): Promise<FormResponse | undefined> {
    const [response] = await db.select().from(formResponses).where(eq(formResponses.id, id));
    return response || undefined;
  }

  async getFormResponses(formId: number): Promise<FormResponse[]> {
    return await db.select().from(formResponses)
      .where(eq(formResponses.formId, formId))
      .orderBy(desc(formResponses.submittedAt));
  }

  async createFormResponse(response: InsertFormResponse): Promise<FormResponse> {
    const [newResponse] = await db.insert(formResponses).values(response).returning();
    return newResponse;
  }

  // Calendar Events
  async getCalendarEvent(id: number): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    return event || undefined;
  }

  async getCalendarEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    if (startDate && endDate) {
      return await db.select().from(calendarEvents)
        .where(
          and(
            gte(calendarEvents.startTime, startDate),
            lte(calendarEvents.endTime, endDate)
          )
        )
        .orderBy(calendarEvents.startTime);
    }
    
    return await db.select().from(calendarEvents)
      .orderBy(calendarEvents.startTime);
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const [newEvent] = await db.insert(calendarEvents).values({
      ...event,
      attendees: event.attendees as any // Type assertion for JSON array field
    }).returning();
    return newEvent;
  }

  async updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent> {
    const updateData: any = { ...event, updatedAt: new Date() };
    if (event.attendees) {
      updateData.attendees = event.attendees as any; // Type assertion for JSON array field
    }
    const [updatedEvent] = await db
      .update(calendarEvents)
      .set(updateData)
      .where(eq(calendarEvents.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteCalendarEvent(id: number): Promise<void> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  }

  // Social Media Content
  async getSocialMediaContent(id: number): Promise<SocialMediaContent | undefined> {
    const [content] = await db.select().from(socialMediaContent).where(eq(socialMediaContent.id, id));
    return content || undefined;
  }

  async getSocialMediaContentByDate(date: Date): Promise<SocialMediaContent[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return db.select().from(socialMediaContent)
      .where(
        and(
          gte(socialMediaContent.createdAt, startOfDay),
          lte(socialMediaContent.createdAt, endOfDay)
        )
      )
      .orderBy(desc(socialMediaContent.createdAt));
  }

  async getAllSocialMediaContent(): Promise<SocialMediaContent[]> {
    return db.select().from(socialMediaContent)
      .orderBy(desc(socialMediaContent.createdAt));
  }

  async createSocialMediaContent(content: InsertSocialMediaContent): Promise<SocialMediaContent> {
    const [newContent] = await db.insert(socialMediaContent).values(content).returning();
    return newContent;
  }

  async updateSocialMediaContent(id: number, content: Partial<InsertSocialMediaContent>): Promise<SocialMediaContent> {
    const [updatedContent] = await db
      .update(socialMediaContent)
      .set({ ...content, updatedAt: new Date() })
      .where(eq(socialMediaContent.id, id))
      .returning();
    return updatedContent;
  }

  async deleteSocialMediaContent(id: number): Promise<void> {
    await db.delete(socialMediaContent).where(eq(socialMediaContent.id, id));
  }

  // Memory Items
  async getMemoryItem(id: number): Promise<MemoryItem | undefined> {
    const [item] = await db.select().from(memoryItems).where(eq(memoryItems.id, id));
    return item || undefined;
  }

  async getMemoryItems(contactId?: number, category?: string): Promise<MemoryItem[]> {
    if (contactId || category) {
      const conditions = [];
      if (contactId) conditions.push(eq(memoryItems.contactId, contactId));
      if (category) conditions.push(eq(memoryItems.category, category));
      
      return await db.select().from(memoryItems)
        .where(and(...conditions))
        .orderBy(desc(memoryItems.createdAt));
    }
    
    return await db.select().from(memoryItems)
      .orderBy(desc(memoryItems.createdAt));
  }

  async createMemoryItem(item: InsertMemoryItem): Promise<MemoryItem> {
    const [newItem] = await db.insert(memoryItems).values({
      ...item,
      tags: item.tags as any // Type assertion for JSON array field
    }).returning();
    return newItem;
  }

  async updateMemoryItem(id: number, item: Partial<InsertMemoryItem>): Promise<MemoryItem> {
    const updateData: any = { ...item, updatedAt: new Date() };
    if (item.tags) {
      updateData.tags = item.tags as any; // Type assertion for JSON array field
    }
    const [updatedItem] = await db
      .update(memoryItems)
      .set(updateData)
      .where(eq(memoryItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteMemoryItem(id: number): Promise<void> {
    await db.delete(memoryItems).where(eq(memoryItems.id, id));
  }

  // Sales Items
  async getSalesItem(id: number): Promise<SalesItem | undefined> {
    const [item] = await db.select().from(salesItems).where(eq(salesItems.id, id));
    return item || undefined;
  }

  async getSalesItems(category?: string): Promise<SalesItem[]> {
    if (category) {
      return await db.select().from(salesItems).where(eq(salesItems.category, category));
    }
    return await db.select().from(salesItems);
  }

  async createSalesItem(item: InsertSalesItem): Promise<SalesItem> {
    const [newItem] = await db.insert(salesItems).values(item).returning();
    return newItem;
  }

  async updateSalesItem(id: number, item: Partial<InsertSalesItem>): Promise<SalesItem> {
    const [updatedItem] = await db
      .update(salesItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(salesItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteSalesItem(id: number): Promise<void> {
    await db.delete(salesItems).where(eq(salesItems.id, id));
  }

  // Sales Transactions
  async getSalesTransaction(id: number): Promise<SalesTransaction | undefined> {
    const [transaction] = await db.select().from(salesTransactions).where(eq(salesTransactions.id, id));
    return transaction || undefined;
  }

  async getSalesTransactions(itemId?: number, customerId?: number): Promise<SalesTransaction[]> {
    if (itemId && customerId) {
      return await db.select().from(salesTransactions)
        .where(and(eq(salesTransactions.itemId, itemId), eq(salesTransactions.customerId, customerId)))
        .orderBy(desc(salesTransactions.createdAt));
    } else if (itemId) {
      return await db.select().from(salesTransactions)
        .where(eq(salesTransactions.itemId, itemId))
        .orderBy(desc(salesTransactions.createdAt));
    } else if (customerId) {
      return await db.select().from(salesTransactions)
        .where(eq(salesTransactions.customerId, customerId))
        .orderBy(desc(salesTransactions.createdAt));
    }
    
    return await db.select().from(salesTransactions)
      .orderBy(desc(salesTransactions.createdAt));
  }

  async createSalesTransaction(transaction: InsertSalesTransaction): Promise<SalesTransaction> {
    const [newTransaction] = await db.insert(salesTransactions).values(transaction).returning();
    return newTransaction;
  }

  async updateSalesTransaction(id: number, transaction: Partial<InsertSalesTransaction>): Promise<SalesTransaction> {
    const [updatedTransaction] = await db
      .update(salesTransactions)
      .set(transaction)
      .where(eq(salesTransactions.id, id))
      .returning();
    return updatedTransaction;
  }

  // Follow-up Sequences
  async getFollowUpSequence(id: number): Promise<FollowUpSequence | undefined> {
    const [sequence] = await db.select().from(followUpSequences).where(eq(followUpSequences.id, id));
    return sequence || undefined;
  }

  async getFollowUpSequencesByForm(formId: number): Promise<FollowUpSequence[]> {
    return await db.select().from(followUpSequences).where(eq(followUpSequences.formId, formId));
  }

  async createFollowUpSequence(sequence: InsertFollowUpSequence): Promise<FollowUpSequence> {
    const [newSequence] = await db.insert(followUpSequences).values({
      ...sequence,
      triggerConditions: sequence.triggerConditions as any // Type assertion for JSON array field
    }).returning();
    return newSequence;
  }

  async updateFollowUpSequence(id: number, sequence: Partial<InsertFollowUpSequence>): Promise<FollowUpSequence> {
    const updateData: any = { ...sequence };
    if (sequence.triggerConditions) {
      updateData.triggerConditions = sequence.triggerConditions as any; // Type assertion for JSON array field
    }
    const [updatedSequence] = await db
      .update(followUpSequences)
      .set(updateData)
      .where(eq(followUpSequences.id, id))
      .returning();
    return updatedSequence;
  }

  async deleteFollowUpSequence(id: number): Promise<void> {
    await db.delete(followUpSequences).where(eq(followUpSequences.id, id));
  }

  // Follow-up Actions
  async getFollowUpAction(id: number): Promise<FollowUpAction | undefined> {
    const [action] = await db.select().from(followUpActions).where(eq(followUpActions.id, id));
    return action || undefined;
  }

  async getFollowUpActionsBySequence(sequenceId: number): Promise<FollowUpAction[]> {
    return await db.select().from(followUpActions).where(eq(followUpActions.sequenceId, sequenceId));
  }

  async createFollowUpAction(action: InsertFollowUpAction): Promise<FollowUpAction> {
    const [newAction] = await db.insert(followUpActions).values(action).returning();
    return newAction;
  }

  async updateFollowUpAction(id: number, action: Partial<InsertFollowUpAction>): Promise<FollowUpAction> {
    const updateData: any = { ...action };
    if (action.actionData) {
      updateData.actionData = action.actionData as any; // Type assertion for JSON field
    }
    const [updatedAction] = await db
      .update(followUpActions)
      .set(updateData)
      .where(eq(followUpActions.id, id))
      .returning();
    return updatedAction;
  }

  async deleteFollowUpAction(id: number): Promise<void> {
    await db.delete(followUpActions).where(eq(followUpActions.id, id));
  }

  // Follow-up Executions
  async getFollowUpExecution(id: number): Promise<FollowUpExecution | undefined> {
    const [execution] = await db.select().from(followUpExecutions).where(eq(followUpExecutions.id, id));
    return execution || undefined;
  }

  async getFollowUpExecutionsByResponse(responseId: number): Promise<FollowUpExecution[]> {
    return await db.select().from(followUpExecutions).where(eq(followUpExecutions.responseId, responseId));
  }

  async getPendingFollowUpExecutions(): Promise<FollowUpExecution[]> {
    return await db.select().from(followUpExecutions).where(
      and(
        eq(followUpExecutions.status, 'pending'),
        lte(followUpExecutions.scheduledFor, new Date())
      )
    );
  }

  async createFollowUpExecution(execution: InsertFollowUpExecution): Promise<FollowUpExecution> {
    const [newExecution] = await db.insert(followUpExecutions).values(execution).returning();
    return newExecution;
  }

  async updateFollowUpExecution(id: number, execution: Partial<InsertFollowUpExecution>): Promise<FollowUpExecution> {
    const updateData: any = { ...execution };
    const [updatedExecution] = await db
      .update(followUpExecutions)
      .set(updateData)
      .where(eq(followUpExecutions.id, id))
      .returning();
    return updatedExecution;
  }

  // Chat History
  async getChatHistory(sessionId: string, limit: number = 50): Promise<ChatHistory[]> {
    return await db.select().from(chatHistory)
      .where(eq(chatHistory.sessionId, sessionId))
      .orderBy(desc(chatHistory.createdAt))
      .limit(limit);
  }

  async createChatHistory(chat: InsertChatHistory): Promise<ChatHistory> {
    const [newChat] = await db.insert(chatHistory).values(chat).returning();
    return newChat;
  }

  async getChatSessions(): Promise<string[]> {
    const sessions = await db.select({ sessionId: chatHistory.sessionId })
      .from(chatHistory)
      .groupBy(chatHistory.sessionId)
      .orderBy(desc(chatHistory.createdAt));
    return sessions.map(s => s.sessionId);
  }

  async getChatAnalytics(sessionId?: string): Promise<any> {
    const baseQuery = db.select().from(chatHistory);
    const query = sessionId ? baseQuery.where(eq(chatHistory.sessionId, sessionId)) : baseQuery;
    
    const messages = await query;
    const totalMessages = messages.length;
    const userMessages = messages.filter(m => m.sender === 'user').length;
    const aiMessages = messages.filter(m => m.sender === 'ai').length;
    
    return {
      totalMessages,
      userMessages,
      aiMessages,
      averageResponseTime: messages.reduce((sum, m) => sum + (m.responseTime || 0), 0) / totalMessages,
      sentimentDistribution: messages.reduce((acc, m) => {
        if (m.sentiment) {
          acc[m.sentiment] = (acc[m.sentiment] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
      messageTypes: messages.reduce((acc, m) => {
        acc[m.messageType || 'text'] = (acc[m.messageType || 'text'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  // Dynamic Tables
  async getDynamicTable(id: number): Promise<DynamicTable | undefined> {
    const [table] = await db.select().from(dynamicTables).where(eq(dynamicTables.id, id));
    return table || undefined;
  }

  async getDynamicTableByName(tableName: string): Promise<DynamicTable | undefined> {
    const [table] = await db.select().from(dynamicTables).where(eq(dynamicTables.tableName, tableName));
    return table || undefined;
  }

  async getDynamicTables(): Promise<DynamicTable[]> {
    return await db.select().from(dynamicTables).where(eq(dynamicTables.isActive, true));
  }

  async createDynamicTable(table: InsertDynamicTable): Promise<DynamicTable> {
    const [newTable] = await db.insert(dynamicTables).values(table).returning();
    return newTable;
  }

  async updateDynamicTable(id: number, table: Partial<InsertDynamicTable>): Promise<DynamicTable> {
    const [updatedTable] = await db
      .update(dynamicTables)
      .set(table)
      .where(eq(dynamicTables.id, id))
      .returning();
    return updatedTable;
  }

  async deleteDynamicTable(id: number): Promise<void> {
    await db.update(dynamicTables).set({ isActive: false }).where(eq(dynamicTables.id, id));
  }

  // Dynamic Table Data
  async getDynamicTableData(tableId: number): Promise<DynamicTableData[]> {
    return await db.select().from(dynamicTableData).where(eq(dynamicTableData.tableId, tableId));
  }

  async createDynamicTableData(data: InsertDynamicTableData): Promise<DynamicTableData> {
    const [newData] = await db.insert(dynamicTableData).values(data).returning();
    return newData;
  }

  async updateDynamicTableData(id: number, data: Partial<InsertDynamicTableData>): Promise<DynamicTableData> {
    const [updatedData] = await db
      .update(dynamicTableData)
      .set(data)
      .where(eq(dynamicTableData.id, id))
      .returning();
    return updatedData;
  }

  async deleteDynamicTableData(id: number): Promise<void> {
    await db.delete(dynamicTableData).where(eq(dynamicTableData.id, id));
  }
}

export const storage = new DatabaseStorage();
