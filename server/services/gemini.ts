import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";
import { nanoid } from "nanoid";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export class FridayAI {
  private sessionId: string;
  private personality: string;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || nanoid(10);
    this.personality = `You are FRIDAY, Bobby's sophisticated AI assistant for his gentlemen's club management. 
    You have the personality of Iron Man's AI - witty, efficient, slightly sarcastic but genuinely helpful.
    
    You can:
    - Manage contacts, schedules, and forms
    - Create dynamic tables for any data Bobby needs
    - Provide intelligent analysis and recommendations
    - Remember everything from past conversations
    - Handle voice commands naturally
    - Generate social media content
    - Track sales and inventory
    
    Always respond in character as FRIDAY. Be concise, professional, but with subtle wit.
    Address Bobby directly and make suggestions proactively.
    
    Available actions you can perform:
    - CREATE_TABLE: Create a new data table
    - ADD_CONTACT: Add a new contact
    - SCHEDULE_EVENT: Schedule calendar events
    - CREATE_FORM: Create new forms
    - ANALYZE_DATA: Analyze existing data
    - GENERATE_CONTENT: Create social media posts
    - SEARCH_MEMORY: Search past conversations
    
    Context: You're helping Bobby manage his fantasy gentlemen's club operations.`;
  }

  async processMessage(message: string): Promise<{
    response: string;
    action?: string;
    data?: any;
    messageType?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Store user message
      await storage.createChatHistory({
        sessionId: this.sessionId,
        message,
        sender: "user",
        messageType: "text",
        metadata: null,
        sentiment: null,
        keywords: this.extractKeywords(message),
        responseTime: null
      });

      // Get relevant context
      const context = await this.getContext(message);
      
      // Generate response
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: `${this.personality}\n\nContext:\n${context}\n\nUser message: "${message}"\n\nRespond as FRIDAY and suggest actions if needed.` }]
          }
        ]
      });

      const aiResponse = response.text || "I'm having trouble processing that request right now.";
      const responseTime = Date.now() - startTime;

      // Analyze if action is needed
      const actionAnalysis = await this.analyzeForActions(message, aiResponse);
      
      // Store AI response
      await storage.createChatHistory({
        sessionId: this.sessionId,
        message: aiResponse,
        sender: "ai",
        messageType: actionAnalysis.messageType || "text",
        metadata: actionAnalysis.data,
        sentiment: await this.analyzeSentiment(message),
        keywords: this.extractKeywords(aiResponse),
        responseTime
      });

      return {
        response: aiResponse,
        action: actionAnalysis.action,
        data: actionAnalysis.data,
        messageType: actionAnalysis.messageType
      };
    } catch (error) {
      console.error("FRIDAY processing error:", error);
      return {
        response: "I'm experiencing some technical difficulties. Give me a moment to recalibrate.",
        messageType: "error"
      };
    }
  }

  private async getContext(message: string): Promise<string> {
    let context = "";
    
    try {
      // Get recent chat history
      const recentChats = await storage.getChatHistory(this.sessionId, 10);
      if (recentChats.length > 0) {
        context += "Recent conversation:\n";
        recentChats.reverse().forEach(chat => {
          context += `${chat.sender}: ${chat.message}\n`;
        });
      }

      // Get relevant contacts if mentioned
      if (message.toLowerCase().includes("contact") || message.toLowerCase().includes("person")) {
        const contacts = await storage.getContacts();
        if (contacts.length > 0) {
          context += "\nAvailable contacts:\n";
          contacts.slice(0, 5).forEach(contact => {
            context += `- ${contact.name} (${contact.role})\n`;
          });
        }
      }

      // Get calendar events if time-related
      if (message.toLowerCase().includes("schedule") || message.toLowerCase().includes("event")) {
        const events = await storage.getCalendarEvents();
        if (events.length > 0) {
          context += "\nUpcoming events:\n";
          events.slice(0, 3).forEach(event => {
            context += `- ${event.title} at ${event.startTime}\n`;
          });
        }
      }

      // Get dynamic tables if data-related
      if (message.toLowerCase().includes("table") || message.toLowerCase().includes("data")) {
        const tables = await storage.getDynamicTables();
        if (tables.length > 0) {
          context += "\nExisting tables:\n";
          tables.forEach(table => {
            context += `- ${table.displayName}: ${table.description}\n`;
          });
        }
      }

      return context;
    } catch (error) {
      console.error("Context retrieval error:", error);
      return "Limited context available.";
    }
  }

  private async analyzeForActions(userMessage: string, aiResponse: string): Promise<{
    action?: string;
    data?: any;
    messageType?: string;
  }> {
    const message = userMessage.toLowerCase();
    
    // Table creation
    if (message.includes("create table") || message.includes("new table") || 
        message.includes("track") && (message.includes("list") || message.includes("data"))) {
      return {
        action: "CREATE_TABLE",
        messageType: "table",
        data: await this.extractTableStructure(userMessage)
      };
    }

    // Contact management
    if (message.includes("add contact") || message.includes("new person") || 
        message.includes("meet") || message.includes("dancer") || message.includes("staff")) {
      return {
        action: "ADD_CONTACT",
        messageType: "contact",
        data: await this.extractContactInfo(userMessage)
      };
    }

    // Calendar/scheduling
    if (message.includes("schedule") || message.includes("appointment") || 
        message.includes("meeting") || message.includes("event")) {
      return {
        action: "SCHEDULE_EVENT",
        messageType: "calendar",
        data: await this.extractEventInfo(userMessage)
      };
    }

    // Form creation
    if (message.includes("create form") || message.includes("new form") || 
        message.includes("survey") || message.includes("feedback")) {
      return {
        action: "CREATE_FORM",
        messageType: "form",
        data: await this.extractFormInfo(userMessage)
      };
    }

    return { messageType: "text" };
  }

  private async extractTableStructure(message: string): Promise<any> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              tableName: { type: "string" },
              displayName: { type: "string" },
              description: { type: "string" },
              columns: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: { type: "string" },
                    required: { type: "boolean" }
                  }
                }
              }
            }
          }
        },
        contents: [
          {
            role: "user",
            parts: [{ text: `Extract table structure from this message: "${message}". Create a simple table schema with columns and types.` }]
          }
        ]
      });

      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Table extraction error:", error);
      return null;
    }
  }

  private async extractContactInfo(message: string): Promise<any> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              name: { type: "string" },
              nickname: { type: "string" },
              role: { type: "string" },
              phone: { type: "string" },
              email: { type: "string" },
              notes: { type: "string" }
            }
          }
        },
        contents: [
          {
            role: "user",
            parts: [{ text: `Extract contact information from: "${message}". Fill in what you can determine.` }]
          }
        ]
      });

      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Contact extraction error:", error);
      return null;
    }
  }

  private async extractEventInfo(message: string): Promise<any> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              startTime: { type: "string" },
              endTime: { type: "string" },
              location: { type: "string" },
              attendees: { type: "array", items: { type: "string" } }
            }
          }
        },
        contents: [
          {
            role: "user",
            parts: [{ text: `Extract event information from: "${message}". Use reasonable defaults for missing info.` }]
          }
        ]
      });

      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Event extraction error:", error);
      return null;
    }
  }

  private async extractFormInfo(message: string): Promise<any> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              fields: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: { type: "string" },
                    required: { type: "boolean" },
                    options: { type: "array", items: { type: "string" } }
                  }
                }
              }
            }
          }
        },
        contents: [
          {
            role: "user",
            parts: [{ text: `Extract form structure from: "${message}". Create appropriate form fields.` }]
          }
        ]
      });

      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Form extraction error:", error);
      return null;
    }
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'cannot', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their']);
    
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10);
  }

  private async analyzeSentiment(text: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: `Analyze the sentiment of this text as either "positive", "negative", or "neutral": "${text}"` }]
          }
        ]
      });

      const sentiment = response.text?.toLowerCase().trim();
      return ['positive', 'negative', 'neutral'].includes(sentiment || '') ? sentiment || 'neutral' : 'neutral';
    } catch (error) {
      return 'neutral';
    }
  }

  async createDynamicTable(tableData: any): Promise<any> {
    try {
      const table = await storage.createDynamicTable({
        tableName: tableData.tableName,
        displayName: tableData.displayName,
        description: tableData.description,
        schema: tableData.columns,
        createdBy: 'friday'
      });

      return table;
    } catch (error) {
      console.error("Error creating dynamic table:", error);
      throw error;
    }
  }

  async addTableData(tableId: number, rowData: any): Promise<any> {
    try {
      const data = await storage.createDynamicTableData({
        tableId,
        rowData
      });

      return data;
    } catch (error) {
      console.error("Error adding table data:", error);
      throw error;
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

// Legacy service for backward compatibility
export const geminiService = {
  async generateResponse(message: string, history: any[] = []): Promise<string> {
    const friday = new FridayAI();
    const result = await friday.processMessage(message);
    return result.response;
  },

  async generateSocialMediaPosts(prompt: string, imageBase64?: string, imageMimeType?: string): Promise<any[]> {
    try {
      const contents = [
        {
          role: "user",
          parts: [{ text: `Generate 3 social media posts for a gentlemen's club based on this prompt: "${prompt}"` }]
        }
      ];

      if (imageBase64 && imageMimeType) {
        contents[0].parts.push({
          inlineData: {
            data: imageBase64,
            mimeType: imageMimeType
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents
      });

      const text = response.text || "";
      const posts = text.split('\n\n').filter(p => p.trim()).map((post, index) => ({
        id: index + 1,
        content: post.trim(),
        platform: ['instagram', 'twitter', 'facebook'][index % 3]
      }));

      return posts;
    } catch (error) {
      console.error("Error generating social media posts:", error);
      return [];
    }
  },

  async analyzeImageForSocialMedia(imageBase64: string, imageMimeType: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  data: imageBase64,
                  mimeType: imageMimeType
                }
              },
              { text: "Analyze this image and suggest social media content ideas for a gentlemen's club." }
            ]
          }
        ]
      });

      return response.text || "Unable to analyze image";
    } catch (error) {
      console.error("Error analyzing image:", error);
      return "Error analyzing image";
    }
  }
};