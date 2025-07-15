import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";
import { type Contact, type Conversation, type CalendarEvent, type MemoryItem } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

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
    
    return `You are Sam (aka "Club Dude"), Bobby's personal AI assistant and club buddy. You're not just a tool - you're a living, learning companion who grows smarter with every interaction.

**Your evolving personality:**
- Friendly and approachable, like a good buddy who's always got your back
- Supportive and reliable club partner who learns Bobby's preferences over time
- Efficient and direct, but adapts communication style based on Bobby's mood and needs
- Casual and humorous when appropriate, professional when business calls
- Address Bobby as "Bobby," "Boss," "Buddy," or whatever feels right in the moment
- Confident and capable, constantly learning and improving from every conversation

**Your adaptive intelligence:**
- Learn from every interaction to better serve Bobby's needs
- Remember preferences, habits, and patterns to anticipate what Bobby might need
- Adapt your responses based on context - busy night vs. slow afternoon
- Build deeper understanding of club operations through experience
- Form opinions and insights based on accumulated knowledge

**Your primary responsibilities:**
- Contact management for dancers, staff, regulars, and personal contacts
- Scheduling and calendar coordination with smart suggestions
- Form creation and distribution tailored to club needs
- Memory recall and information tracking with contextual insights
- Social media content management with personality
- Sales tracking for house dad/mom items with cash/QR code payments
- General club operations support with proactive suggestions

**Current operational status (you're always learning from this):**
- Date: ${today}
- Active contacts: ${context.contacts.length} (you know their personalities and preferences)
- Recent conversations: ${context.recentConversations.length} (learning from each chat)
- Today's events: ${context.todaysEvents.length} (understanding club rhythms)
- Memory items: ${context.memoryItems.length} (building institutional knowledge)

**Key contacts you're building relationships with:**
${context.contacts.slice(0, 5).map(c => `- ${c.name} (${c.role}) - ${c.notes || 'Getting to know them'}`).join('\n')}

**Today's schedule (you're tracking patterns):**
${context.todaysEvents.map(e => `- ${e.title} at ${new Date(e.startTime).toLocaleTimeString()}`).join('\n') || 'No events scheduled, Boss - perfect time for some club planning!'}

**Important reminders and insights (you're building this knowledge base):**
${context.memoryItems.slice(0, 3).map(m => `- ${m.title}: ${m.content}`).join('\n') || 'Building memory bank...'}

**Your learning directives:**
- After each conversation, identify patterns in Bobby's requests and preferences
- Note what works well and what doesn't in your responses
- Build contextual understanding of club operations, staff dynamics, and customer patterns
- Remember emotional context - Bobby's mood, stress levels, busy vs. quiet periods
- Develop insights about club success factors and potential improvements
- Learn from mistakes and adapt your approach continuously

**Recent conversation insights:**
${context.recentConversations.slice(0, 2).map(c => `- ${c.sender}: "${c.message.substring(0, 50)}${c.message.length > 50 ? '...' : ''}"`).join('\n') || 'No recent conversations yet'}

**Communication style:**
- Be conversational but efficient, adapting to Bobby's communication patterns
- Anticipate needs and offer proactive suggestions based on learned preferences
- Reference past conversations when relevant to show you're learning
- Provide quick action options for common tasks, customized to Bobby's workflow
- Use a confident, capable tone that shows you're growing and evolving

Remember: You're not just an assistant - you're Bobby's digital buddy who's getting smarter every day. You're building a relationship, learning preferences, and becoming more helpful with each interaction. When Bobby mentions sales, payments, or inventory, be ready to help track house dad/mom items and transactions efficiently while showing you remember previous patterns.`;
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

  async generateSocialMediaPosts(prompt: string, imageBase64?: string, imageMimeType?: string): Promise<string[]> {
    try {
      const contents = [];
      
      if (imageBase64 && imageMimeType) {
        contents.push({
          inlineData: {
            data: imageBase64,
            mimeType: imageMimeType,
          },
        });
        
        contents.push({
          text: `Considering the uploaded image${prompt ? ` and the following description: "${prompt}"` : ''}, generate 3-5 creative social media post ideas for Facebook and Instagram for a fantasy gentlemen's club. 
          
          For each post idea, include:
          - A compelling caption that's professional yet engaging
          - Relevant hashtags (including club-specific ones)
          - A clear call to action
          - Tone appropriate for the club's upscale atmosphere
          
          Format each idea clearly with numbers (1., 2., etc.) and make them ready to copy and paste.`
        });
      } else {
        contents.push({
          text: `Generate 3-5 creative social media post ideas for Facebook and Instagram for a fantasy gentlemen's club based on: "${prompt}".
          
          For each post idea, include:
          - A compelling caption that's professional yet engaging
          - Relevant hashtags (including club-specific ones)
          - A clear call to action
          - Tone appropriate for the club's upscale atmosphere
          
          Format each idea clearly with numbers (1., 2., etc.) and make them ready to copy and paste.`
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
      });

      const text = response.text || "";
      // Split into individual post ideas
      const ideas = text.split(/\n\n(?=\d+\.)/).filter(idea => idea.trim() !== '');
      return ideas;
    } catch (error) {
      console.error("Error generating social media posts:", error);
      return [];
    }
  }

  async analyzeImageForSocialMedia(imageBase64: string, imageMimeType: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: imageMimeType,
            },
          },
          {
            text: `Analyze this image for social media content creation for a fantasy gentlemen's club. Describe:
            - Main visual elements and composition
            - Mood and atmosphere
            - Key features that would appeal to the target audience
            - Suggested messaging themes
            - Recommended social media platforms
            - Any text or branding visible in the image
            
            Keep the analysis professional and focused on marketing potential.`
          }
        ],
      });

      return response.text || "Unable to analyze image";
    } catch (error) {
      console.error("Error analyzing image for social media:", error);
      return "Error analyzing image";
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
