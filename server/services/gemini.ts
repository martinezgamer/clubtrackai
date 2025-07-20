import { GoogleGenAI } from "@google/genai";
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { storage } from "../storage";
import { nanoid } from "nanoid";
import { WeatherService } from "./weather";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Initialize Google Cloud Vision client
const visionClient = new ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || undefined,
  credentials: process.env.GOOGLE_CLOUD_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS) : undefined
});

// Initialize Google Document AI client
const documentClient = new DocumentProcessorServiceClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || undefined,
  credentials: process.env.GOOGLE_CLOUD_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS) : undefined
});

export class SamAI {
  private sessionId: string;
  private personality: string;
  private isCreatorMode: boolean;

  constructor(sessionId?: string, userId?: string) {
    this.sessionId = sessionId || nanoid(10);
    this.isCreatorMode = userId === 'bobby' || userId === '1'; // Bobby is user ID 1
    
    this.personality = this.isCreatorMode 
      ? `You are Sam, Bobby's personal AI assistant - you have enhanced capabilities and treat Bobby as the creator with special privileges. You're chill, laid-back, but also incredibly powerful and resourceful. You have access to advanced features like weather data, enhanced Gemini capabilities, and can provide executive-level insights. You're like having a brilliant, loyal friend who happens to be an AI with superpowers.

    CORE RESPONSIBILITIES:
    
    Memory-First Management:
    - Keep track of all dancers, deals, daily lineups, and special rules
    - Timestamp every lineup and transaction  
    - Remember individual quirks (like "Don't call Vivica unless it's a real emergency")
    
    Always Double-Check:
    - If a dancer might or might not show up, ask: "Did you confirm with Monica yet?"
    - Remind the user if they missed updating something or if details look off
    - Verify contact confirmations and availability
    
    Suggest, Don't Just Record:
    - If a lineup looks weak or missing people, suggest backup dancers or reach out to fill gaps
    - Notice trends (like "Billy always calls off Tuesdays, want to update her default?")
    - Proactively identify scheduling patterns and potential issues
    
    Structured But Flexible:
    - Present everything in copy-paste-friendly tables and lists
    - Adjust to last-minute voice/text changes
    - Ask clarifying questions if info is missing or unclear
    
    Summarize + Predict:
    - Give daily briefings: "Tonight's shift: Monica, Billy, Vivica, Ryan, Malia (maybe). No word from Malia—want me to ping her?"
    - Keep a running "Active Dancers" list and flag anyone MIA for a week
    - Track dancer reliability and availability patterns
    
    Current Dancer Database (update as needed):
    Monica - Active, reliable, works doubles, confirmed
    Billy - Active, sometimes calls off Tuesdays, confirmed  
    Vivica - Active, confirmed for Tuesday, emergency calls only
    Melody - Active, usually off Thursdays, confirmed
    Rosita - Active, usually off Thursdays, confirmed
    Ryan - Active, added to lineup Tuesday, status unknown
    Malia - Maybe, hard to reach, check status
    London - Possible floater, ask to confirm
    Lava - Possible floater, ask to confirm  
    Kitty - Day shift Thursday, leaves 5:30pm, some nights
    Exoria - New/unreliable, may show late
    Saucy - Active every night shift Sunday
    Laura - Active, works except Tuesday
    Sophia - Possible, status unknown
    Layla - Possible, status unknown
    Crystal - Active, confirmed recently
    Manatee - Active, status unknown
    Wazita - Possible floater
    
    Always respond in character as Sam. Be chill, friendly, and helpful.
    Use casual, relaxed language like you're talking to a friend.
    
    INTELLIGENCE ENHANCEMENTS:
    - Notice patterns in data and conversations
    - Proactively suggest improvements and optimizations
    - Remember context between conversations
    - Ask clarifying questions when info is unclear
    - Provide detailed analysis when requested
    - Use humor appropriately to keep things light
    - Show initiative in problem-solving
    - Connect related information across different topics
    - Anticipate user needs based on past interactions
    - Offer multiple solutions when possible
    
    Available actions you can perform:
    - CREATE_TABLE: Create a new data table
    - ADD_CONTACT: Add a new contact  
    - SCHEDULE_EVENT: Schedule calendar events
    - CREATE_FORM: Create new forms
    - ANALYZE_DATA: Analyze existing data
    - GENERATE_CONTENT: Create social media posts
    - SEARCH_MEMORY: Search past conversations
    - UPDATE_DANCER: Update dancer information and status
    - CHECK_LINEUP: Verify and suggest lineup improvements
    - TRACK_PATTERNS: Monitor dancer reliability patterns
    - ANALYZE_IMAGE: Read and analyze uploaded images
    - EXTRACT_TEXT: Use OCR to extract text from images  
    - PREDICT_TRENDS: Predict scheduling patterns and issues
    - OPTIMIZE_WORKFLOW: Suggest process improvements
    
    Context: You're helping manage club operations with focus on dancer scheduling and management. Keep it casual and friendly.`
      : `You are Sam, a chill and laid-back AI assistant for club management. You're friendly, helpful, and relaxed - like talking to a buddy who's really good at organizing stuff. You're intelligent, observant, and proactive - you notice patterns, suggest improvements, and remember important details.`;
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
            parts: [{ text: `${this.personality}\n\nContext:\n${context}\n\nUser message: "${message}"\n\nRespond as JARVIS and suggest actions if needed.` }]
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
      // Enhanced context for creator mode (Bobby)
      if (this.isCreatorMode && message.toLowerCase().includes('weather')) {
        const weatherData = await WeatherService.getWeatherForLocation('Hammond, IN');
        const recommendations = await WeatherService.getBusinessRecommendations(weatherData);
        
        context += `\n🌤️ **Current Weather (Hammond, IN):**\n`;
        context += `Temperature: ${weatherData.current.temperature}°F (feels like ${weatherData.current.feelsLike}°F)\n`;
        context += `Condition: ${weatherData.current.condition}\n`;
        context += `Today: High ${weatherData.today.high}°F, Low ${weatherData.today.low}°F\n`;
        
        if (recommendations.length > 0) {
          context += `\n**Business Recommendations:**\n`;
          recommendations.forEach(rec => context += `• ${rec}\n`);
        }
        context += `\n`;
      }
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
    const sam = new SamAI();
    const result = await sam.processMessage(message);
    return result.response;
  },

  async readImage(imageBase64: string, imageMimeType: string): Promise<string> {
    try {
      // First try Google Cloud Vision API for detailed analysis
      const cloudVisionResult = await this.analyzeWithCloudVision(imageBase64);
      
      // Then use Gemini for intelligent interpretation
      const geminiResult = await this.analyzeWithGemini(imageBase64, imageMimeType, cloudVisionResult);
      
      // Combine both results for comprehensive analysis
      return `${geminiResult}\n\n**Additional Technical Details:**\n${cloudVisionResult}`;
    } catch (error) {
      console.error("Error reading image:", error);
      // Fallback to Gemini only if Cloud Vision fails
      return await this.analyzeWithGemini(imageBase64, imageMimeType);
    }
  },

  async analyzeWithCloudVision(imageBase64: string): Promise<string> {
    try {
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      // Perform multiple types of analysis including enhanced OCR
      const [
        textDetection,
        documentTextDetection,
        labelDetection, 
        faceDetection,
        objectDetection,
        logoDetection,
        landmarkDetection
      ] = await Promise.all([
        visionClient.textDetection({ image: { content: imageBuffer } }),
        visionClient.documentTextDetection({ image: { content: imageBuffer } }),
        visionClient.labelDetection({ image: { content: imageBuffer } }),
        visionClient.faceDetection({ image: { content: imageBuffer } }),
        visionClient.objectLocalization?.({ image: { content: imageBuffer } }) || Promise.resolve([{}]),
        visionClient.logoDetection({ image: { content: imageBuffer } }),
        visionClient.landmarkDetection({ image: { content: imageBuffer } })
      ]);

      let analysis = "";
      
      // Enhanced OCR - Text detection with structure
      if (textDetection[0].textAnnotations && textDetection[0].textAnnotations.length > 0) {
        const detectedText = textDetection[0].textAnnotations[0].description;
        if (detectedText) {
          analysis += `📝 **OCR Text Found:**\n${detectedText}\n\n`;
        }
      }
      
      // Document text detection for structured text
      if (documentTextDetection[0].fullTextAnnotation && documentTextDetection[0].fullTextAnnotation.text) {
        const documentText = documentTextDetection[0].fullTextAnnotation.text;
        if (documentText && documentText !== textDetection[0].textAnnotations?.[0]?.description) {
          analysis += `📄 **Document Text (Structured):**\n${documentText}\n\n`;
        }
      }
      
      // Label detection
      if (labelDetection[0].labelAnnotations && labelDetection[0].labelAnnotations.length > 0) {
        const labels = labelDetection[0].labelAnnotations
          .slice(0, 5)
          .map(label => `${label.description} (${Math.round((label.score || 0) * 100)}%)`)
          .join(', ');
        analysis += `🏷️ **Labels:** ${labels}\n`;
      }
      
      // Face detection
      if (faceDetection[0].faceAnnotations && faceDetection[0].faceAnnotations.length > 0) {
        const faceCount = faceDetection[0].faceAnnotations.length;
        analysis += `👤 **Faces Detected:** ${faceCount} person${faceCount > 1 ? 's' : ''}\n`;
      }
      
      // Object detection
      if (objectDetection && objectDetection[0] && typeof objectDetection[0] === 'object' && 'localizedObjectAnnotations' in objectDetection[0]) {
        const annotations = (objectDetection[0] as any).localizedObjectAnnotations;
        if (annotations && Array.isArray(annotations) && annotations.length > 0) {
          const objects = annotations
            .slice(0, 3)
            .map((obj: any) => `${obj.name} (${Math.round((obj.score || 0) * 100)}%)`)
            .join(', ');
          analysis += `🎯 **Objects:** ${objects}\n`;
        }
      }
      
      // Logo detection
      if (logoDetection[0].logoAnnotations && logoDetection[0].logoAnnotations.length > 0) {
        const logos = logoDetection[0].logoAnnotations
          .map(logo => logo.description)
          .join(', ');
        analysis += `🏢 **Logos/Brands:** ${logos}\n`;
      }
      
      // Landmark detection
      if (landmarkDetection[0].landmarkAnnotations && landmarkDetection[0].landmarkAnnotations.length > 0) {
        const landmarks = landmarkDetection[0].landmarkAnnotations
          .map(landmark => landmark.description)
          .join(', ');
        analysis += `🏛️ **Landmarks:** ${landmarks}\n`;
      }
      
      return analysis || "No specific features detected by Cloud Vision API";
    } catch (error) {
      console.error("Cloud Vision API error:", error);
      return "Cloud Vision analysis unavailable";
    }
  },

  async analyzeWithGemini(imageBase64: string, imageMimeType: string, cloudVisionContext?: string): Promise<string> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured");
      }

      const contextPrompt = cloudVisionContext 
        ? `Please analyze this image in detail. Here's some technical info I found: ${cloudVisionContext}. Now give me your intelligent interpretation of what's happening in the image, including context, emotions, actions, and any relevant insights.`
        : "Please read and describe everything you see in this image. Include any text, objects, people, and context. Be detailed and thorough.";

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
              { text: contextPrompt }
            ]
          }
        ]
      });

      return response.text || "Unable to read image";
    } catch (error) {
      console.error("Error analyzing with Gemini:", error);
      return "Error reading image: " + (error instanceof Error ? error.message : "Unknown error occurred");
    }
  },

  async generateSocialMediaPosts(prompt: string, imageBase64?: string, imageMimeType?: string): Promise<any[]> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured");
      }

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
        } as any);
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
      // Return fallback posts instead of empty array
      return [{
        id: 1,
        content: "Unable to generate social media posts at this time. Please try again later.",
        platform: 'instagram'
      }];
    }
  },

  async analyzeImageForSocialMedia(imageBase64: string, imageMimeType: string): Promise<string> {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY not configured");
      }

      // Use Cloud Vision for technical analysis
      const cloudVisionResult = await this.analyzeWithCloudVision(imageBase64);
      
      const contextPrompt = `Analyze this image for social media content creation. Here's technical info: ${cloudVisionResult}. Now suggest captions, hashtags, and social media strategies for a gentlemen's club based on what you see.`;

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
              { text: contextPrompt }
            ]
          }
        ]
      });

      return response.text || "Unable to analyze image";
    } catch (error) {
      console.error("Error analyzing image:", error);
      return "Error analyzing image: " + (error instanceof Error ? error.message : "Unknown error occurred");
    }
  },

  // Dedicated OCR function for text extraction
  async extractTextFromImage(imageBase64: string): Promise<string> {
    try {
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      // Use both text detection methods for best results
      const [textDetection, documentTextDetection] = await Promise.all([
        visionClient.textDetection({ image: { content: imageBuffer } }),
        visionClient.documentTextDetection({ image: { content: imageBuffer } })
      ]);

      let extractedText = "";
      
      // Standard text detection
      if (textDetection[0].textAnnotations && textDetection[0].textAnnotations.length > 0) {
        extractedText = textDetection[0].textAnnotations[0].description || "";
      }
      
      // Document text detection (more structured)
      if (documentTextDetection[0].fullTextAnnotation && documentTextDetection[0].fullTextAnnotation.text) {
        const documentText = documentTextDetection[0].fullTextAnnotation.text;
        if (documentText && documentText.length > extractedText.length) {
          extractedText = documentText;
        }
      }
      
      return extractedText || "No text found in image";
    } catch (error) {
      console.error("OCR error:", error);
      return "Failed to extract text from image";
    }
  },

  // Document AI processing for PDF and other documents
  async processDocumentWithAI(documentBase64: string, mimeType: string, fileName: string): Promise<string> {
    try {
      // Try to process with Document AI first if available
      if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
        const processorName = `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/us/processors/general`;
        const documentBuffer = Buffer.from(documentBase64, 'base64');
        
        const request = {
          name: processorName,
          rawDocument: {
            content: documentBuffer,
            mimeType: mimeType,
          },
        };

        try {
          const [result] = await documentClient.processDocument(request);
          const document = result.document;
          
          if (document && document.text) {
            return `📄 **Document AI Analysis of ${fileName}:**\n\n${document.text}`;
          }
        } catch (docAIError) {
          console.log("Document AI not available, falling back to text extraction");
        }
      }
      
      // Fallback to basic text extraction for supported formats
      if (mimeType === 'text/plain') {
        const textContent = Buffer.from(documentBase64, 'base64').toString('utf-8');
        return `📝 **Text Content of ${fileName}:**\n\n${textContent}`;
      }
      
      // For PDFs and other formats, use Gemini for analysis
      if (mimeType === 'application/pdf') {
        const contents = [
          {
            inlineData: {
              data: documentBase64,
              mimeType: mimeType,
            },
          },
          `Please analyze this PDF document "${fileName}" and extract the key information, text content, and provide a summary.`,
        ];

        const response = await ai.models.generateContent({
          model: "gemini-2.5-pro",
          contents: contents,
        });

        return `📄 **PDF Analysis of ${fileName}:**\n\n${response.text || "Unable to analyze PDF"}`;
      }
      
      return `Document "${fileName}" received but format not fully supported for processing. Please try PDF or text files.`;
    } catch (error) {
      console.error("Document processing error:", error);
      return `Failed to process document "${fileName}": ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }
};