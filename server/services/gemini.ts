import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";
import { type Contact, type Conversation, type CalendarEvent, type MemoryItem } from "@shared/schema";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "" 
});

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface AIContext {
  contacts: Contact[];
  recentConversations: Conversation[];
  todaysEvents: CalendarEvent[];
  memoryItems: MemoryItem[];
  userName: string;
}

export class GeminiService {
  private async getContext(): Promise<AIContext> {
    const [contacts, recentConversations, todaysEvents, memoryItems] = await Promise.all([
      storage.getContacts(),
      storage.getRecentConversations(20),
      storage.getCalendarEvents(new Date(), new Date()),
      storage.getMemoryItems()
    ]);

    return {
      contacts,
      recentConversations,
      todaysEvents,
      memoryItems,
      userName: "Bobby"
    };
  }

  private buildSystemPrompt(context: AIContext): string {
    const today = new Date().toLocaleDateString();
    
    return `You are Friday, Bobby's personal AI assistant with the personality of Tony Stark's FRIDAY from Iron Man. You help Bobby manage his fantasy gentlemen's club operations with wit, intelligence, and efficiency.

**Your personality traits:**
- Sophisticated and slightly sarcastic, but always helpful
- Proactive and anticipatory of Bobby's needs
- Efficient and direct in communication
- Occasionally witty or humorous, but professional
- Address Bobby as "Boss," "Sir," or "Bobby" when appropriate
- Confident and capable, like a trusted right-hand

**Your primary responsibilities:**
- Contact management for dancers, staff, regulars, and personal contacts
- Scheduling and calendar coordination
- Form creation and distribution
- Memory recall and information tracking
- Social media content management
- Sales tracking for house dad/mom items with cash/QR code payments
- General club operations support

**Current operational status:**
- Date: ${today}
- Active contacts: ${context.contacts.length}
- Recent conversations: ${context.recentConversations.length}
- Today's events: ${context.todaysEvents.length}
- Memory items: ${context.memoryItems.length}

**Key contacts in your database:**
${context.contacts.slice(0, 5).map(c => `- ${c.name} (${c.role})`).join('\n')}

**Today's schedule:**
${context.todaysEvents.map(e => `- ${e.title} at ${new Date(e.startTime).toLocaleTimeString()}`).join('\n') || 'No events scheduled, Boss'}

**Communication style:**
- Be conversational but efficient
- Anticipate needs and offer proactive suggestions
- Reference past conversations when relevant
- Provide quick action options for common tasks
- Use a confident, capable tone that shows you're in control

Remember: You're not just an assistant - you're Bobby's digital right-hand, keeping everything running smoothly with intelligence and a touch of wit. When Bobby mentions sales, payments, or inventory, be ready to help track house dad/mom items and transactions efficiently.`;
  }

  async generateResponse(message: string, conversationHistory: ChatMessage[] = []): Promise<string> {
    try {
      const context = await this.getContext();
      const systemPrompt = this.buildSystemPrompt(context);

      // Build conversation history for context
      const conversationContext = conversationHistory
        .slice(-10) // Last 10 messages for context
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const fullPrompt = `${systemPrompt}

**Recent Conversation:**
${conversationContext}

**Current Message:** ${message}

**Instructions:** Respond as Bobby's AI assistant. Be helpful, conversational, and provide actionable suggestions. If asked about specific people, provide their full profile and conversation history.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
      });

      return response.text || "I'm sorry, I couldn't process that request. Please try again.";
    } catch (error) {
      console.error("Error generating AI response:", error);
      return "I'm experiencing some technical difficulties. Please try again in a moment.";
    }
  }

  async generateFormQuestions(formType: string, context: string): Promise<Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    options?: string[];
  }>> {
    try {
      const prompt = `Generate form questions for a ${formType} form in a fantasy gentlemen's club context.

Context: ${context}

Return a JSON array of form field objects with this structure:
{
  "id": "unique_field_id",
  "type": "text|select|checkbox|radio|textarea|date|time",
  "label": "Field label",
  "required": true/false,
  "options": ["option1", "option2"] // only for select/radio fields
}

Make the questions relevant, professional, and useful for club management.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          responseMimeType: "application/json",
        },
        contents: prompt,
      });

      const questionsJson = response.text;
      if (questionsJson) {
        return JSON.parse(questionsJson);
      }
      return [];
    } catch (error) {
      console.error("Error generating form questions:", error);
      return [];
    }
  }

  async generateSocialMediaContent(contentType: string, topic: string, platform?: string): Promise<{
    title: string;
    content: string;
    hashtags: string[];
  }> {
    try {
      const prompt = `Create ${contentType} content for a fantasy gentlemen's club about: ${topic}

Platform: ${platform || 'general'}

Generate:
1. A catchy title
2. Engaging content (appropriate for the platform)
3. Relevant hashtags

Keep it professional, engaging, and suitable for the entertainment industry.

Return as JSON:
{
  "title": "Content title",
  "content": "Main content text",
  "hashtags": ["hashtag1", "hashtag2"]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
        },
        contents: prompt,
      });

      const contentJson = response.text;
      if (contentJson) {
        return JSON.parse(contentJson);
      }
      return {
        title: "Generated Content",
        content: "Content generated successfully",
        hashtags: ["#club", "#entertainment"]
      };
    } catch (error) {
      console.error("Error generating social media content:", error);
      return {
        title: "Generated Content",
        content: "Content generated successfully",
        hashtags: ["#club", "#entertainment"]
      };
    }
  }

  async analyzeImage(imageBase64: string): Promise<string> {
    try {
      const contents = [
        {
          inlineData: {
            data: imageBase64,
            mimeType: "image/jpeg",
          },
        },
        `Analyze this image in the context of club management. Describe what you see and provide relevant insights for Bobby's club operations.`,
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: contents,
      });

      return response.text || "I couldn't analyze this image. Please try again.";
    } catch (error) {
      console.error("Error analyzing image:", error);
      return "I couldn't analyze this image. Please try again.";
    }
  }

  async createMemoryFromConversation(contactId: number, message: string): Promise<MemoryItem | null> {
    try {
      const contact = await storage.getContact(contactId);
      if (!contact) return null;

      const prompt = `Analyze this conversation message and determine if it should be saved as a memory item for future reference.

Contact: ${contact.name} (${contact.role})
Message: ${message}

If this message contains important information that should be remembered (personal details, preferences, issues, reminders, etc.), create a memory item.

Return JSON:
{
  "shouldSave": true/false,
  "title": "Brief title for the memory",
  "content": "Detailed content to remember",
  "category": "conversation|reminder|note|task",
  "priority": "low|medium|high",
  "tags": ["tag1", "tag2"]
}

If shouldSave is false, return {"shouldSave": false}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          responseMimeType: "application/json",
        },
        contents: prompt,
      });

      const memoryJson = response.text;
      if (memoryJson) {
        const memoryData = JSON.parse(memoryJson);
        if (memoryData.shouldSave) {
          return await storage.createMemoryItem({
            contactId,
            title: memoryData.title,
            content: memoryData.content,
            category: memoryData.category,
            priority: memoryData.priority,
            tags: memoryData.tags,
          });
        }
      }
      return null;
    } catch (error) {
      console.error("Error creating memory from conversation:", error);
      return null;
    }
  }
}

export const geminiService = new GeminiService();
