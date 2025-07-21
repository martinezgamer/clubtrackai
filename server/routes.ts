import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { databaseManager } from "./database-manager";
import { geminiService } from "./services/gemini";
import { ttsService } from "./services/tts";
import { userManagementService } from "./services/user-management";
import { insertContactSchema, insertFormSchema, insertCalendarEventSchema, insertMemoryItemSchema, insertFollowUpSequenceSchema, insertFollowUpActionSchema, insertUserSchema, insertClubSchema } from "@shared/schema";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { followUpProcessor } from "./services/follow-up-processor";
import { zfd } from "zod-form-data";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { SamAI } from "./services/gemini";
import { WeatherService } from "./services/weather";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// WebSocket connection management
const clients = new Set<WebSocket>();
const samSessions = new Map<string, SamAI>();

function broadcastToClients(message: any) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Handle Sam actions
async function handleSamAction(action: string, data: any) {
  try {
    switch (action) {
      case 'CREATE_TABLE':
        if (data && data.tableName) {
          const sam = new SamAI();
          await sam.createDynamicTable(data);
        }
        break;
      
      case 'ADD_CONTACT':
        if (data && data.name) {
          await storage.createContact({
            name: data.name,
            nickname: data.nickname || null,
            role: data.role || 'unknown',
            phone: data.phone || null,
            email: data.email || null,
            notes: data.notes || null,
            status: 'active'
          });
        }
        break;
      
      case 'SCHEDULE_EVENT':
        if (data && data.title) {
          await storage.createCalendarEvent({
            title: data.title,
            description: data.description || null,
            startTime: new Date(data.startTime || Date.now()),
            endTime: new Date(data.endTime || Date.now() + 3600000),
            location: data.location || null,
            attendees: data.attendees || [],
            eventType: 'meeting',
            isRecurring: false
          });
        }
        break;
      
      case 'CREATE_FORM':
        if (data && data.title) {
          await storage.createForm({
            title: data.title,
            description: data.description || null,
            fields: data.fields || [],
            isRecurring: false
          });
        }
        break;
    }
  } catch (error) {
    console.error('Error handling FRIDAY action:', error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected to WebSocket');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'chat') {
          const sessionId = message.sessionId || 'default';
          const userId = message.userId; // Get user ID from message for enhanced features
          
          // Get or create Sam session with user ID for enhanced Bobby experience
          if (!samSessions.has(sessionId)) {
            samSessions.set(sessionId, new SamAI(sessionId, userId));
          }
          
          const sam = samSessions.get(sessionId)!;
          
          // Process message with Sam
          const result = await sam.processMessage(message.content);
          
          // Handle actions if needed
          if (result.action) {
            await handleSamAction(result.action, result.data);
          }
          
          // Send response back to client
          ws.send(JSON.stringify({
            type: 'chat',
            content: result.response,
            sender: 'ai',
            timestamp: new Date().toISOString(),
            messageType: result.messageType,
            action: result.action,
            data: result.data
          }));
        } else if (message.type === 'quickAction') {
          // Handle quick actions from UI
          const action = message.action;
          let response = '';
          
          switch (action) {
            case 'create-new':
              response = "I'll help you create a new contact. What details would you like to add?";
              break;
            case 'settings':
              response = "Let me help you with settings. What would you like to configure?";
              break;
            case 'today-schedule':
              response = "Let me get today's schedule for you.";
              break;
            case 'all-contacts':
              response = "Here are all your contacts. What would you like to do with them?";
              break;
            case 'sales-report':
              response = "I'll generate a sales report for you.";
              break;
            case 'create-form':
              response = "I'll help you create a new form. What type of form do you need?";
              break;
            default:
              response = `I received your ${action} request. How can I help you with that?`;
          }
          
          ws.send(JSON.stringify({
            type: 'chat',
            content: response,
            sender: 'ai',
            timestamp: new Date().toISOString(),
            messageType: 'text',
            action: action,
            data: null
          }));
        } else if (message.type === 'image') {
          // Handle image uploads for reading
          try {
            const sessionId = message.sessionId || 'default';
            
            // Get or create Sam session with user ID
            if (!samSessions.has(sessionId)) {
              samSessions.set(sessionId, new SamAI(sessionId, message.userId));
            }
            
            const sam = samSessions.get(sessionId)!;
            
            // Read the image and get description
            const imageDescription = await geminiService.readImage(
              message.imageData,
              message.imageMimeType
            );
            
            // Process the image description with Sam
            const contextMessage = `I've uploaded an image. Here's what I see in it: ${imageDescription}. ${message.userMessage || 'What do you think about this?'}`;
            const result = await sam.processMessage(contextMessage);
            
            // Handle actions if needed
            if (result.action) {
              await handleSamAction(result.action, result.data);
            }
            
            // Send response back to client
            ws.send(JSON.stringify({
              type: 'chat',
              content: result.response,
              sender: 'ai',
              timestamp: new Date().toISOString(),
              messageType: result.messageType,
              action: result.action,
              data: result.data,
              imageDescription: imageDescription
            }));
          } catch (error) {
            console.error('Error processing image:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to process image'
            }));
          }
        } else if (message.type === 'document') {
          // Handle document uploads for processing
          try {
            const sessionId = message.sessionId || 'default';
            
            // Get or create Sam session
            if (!samSessions.has(sessionId)) {
              samSessions.set(sessionId, new SamAI(sessionId));
            }
            
            const sam = samSessions.get(sessionId)!;
            
            // Process the document
            const documentAnalysis = await geminiService.processDocumentWithAI(
              message.documentData,
              message.documentMimeType,
              message.documentName
            );
            
            // Process the document analysis with Sam
            const contextMessage = `I've uploaded a document (${message.documentName}). Here's the analysis: ${documentAnalysis}. ${message.userMessage || 'What do you think about this document?'}`;
            const result = await sam.processMessage(contextMessage);
            
            // Handle actions if needed
            if (result.action) {
              await handleSamAction(result.action, result.data);
            }
            
            // Send response back to client
            ws.send(JSON.stringify({
              type: 'chat',
              content: result.response,
              sender: 'ai',
              timestamp: new Date().toISOString(),
              messageType: result.messageType,
              action: result.action,
              data: result.data,
              documentAnalysis: documentAnalysis
            }));
          } catch (error) {
            console.error('Error processing document:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to process document'
            }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        try {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to process message'
          }));
        } catch (sendError) {
          console.error('Failed to send error message:', sendError);
        }
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('Client disconnected from WebSocket');
    });
  });

  // Club Management API
  app.get('/api/clubs', async (req, res) => {
    try {
      const masterDb = databaseManager.getMasterDb();
      const clubs = await masterDb.select().from(schema.clubs);
      res.json(clubs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch clubs' });
    }
  });

  app.post('/api/clubs', async (req, res) => {
    try {
      const clubData = insertClubSchema.parse(req.body);
      const masterDb = databaseManager.getMasterDb();
      
      // Create club in master database
      const [club] = await masterDb.insert(schema.clubs).values(clubData).returning();
      
      // Create database for the club (in production this would be a separate database)
      await databaseManager.createClubDatabase(club.name);
      
      // Initialize schema for the club
      await databaseManager.initializeClubSchema(String(club.id));
      
      res.json(club);
    } catch (error) {
      console.error('Club creation error:', error);
      res.status(400).json({ error: 'Failed to create club' });
    }
  });

  app.get('/api/clubs/:id', async (req, res) => {
    try {
      const masterDb = databaseManager.getMasterDb();
      const [club] = await masterDb.select().from(schema.clubs).where(eq(schema.clubs.id, parseInt(req.params.id)));
      
      if (!club) {
        return res.status(404).json({ error: 'Club not found' });
      }
      
      res.json(club);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch club' });
    }
  });

  // Contacts API (now club-aware)
  app.get('/api/contacts', async (req, res) => {
    try {
      const { role, status, clubId } = req.query;
      const contacts = await storage.getContacts({ 
        role: role as string, 
        status: status as string,
        clubId: clubId ? parseInt(clubId as string) : undefined
      });
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  app.get('/api/contacts/:id', async (req, res) => {
    try {
      const { clubId } = req.query;
      const contact = await storage.getContact(
        parseInt(req.params.id), 
        clubId ? parseInt(clubId as string) : undefined
      );
      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      res.json(contact);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch contact' });
    }
  });

  app.post('/api/contacts', upload.single('photo'), async (req, res) => {
    try {
      const contactData = insertContactSchema.parse(req.body);
      
      // Handle photo upload
      if (req.file) {
        const photoUrl = `/uploads/${req.file.filename}`;
        contactData.photoUrl = photoUrl;
      }
      
      const contact = await storage.createContact(contactData, contactData.clubId || undefined);
      res.json(contact);
    } catch (error) {
      res.status(400).json({ error: 'Invalid contact data' });
    }
  });

  app.put('/api/contacts/:id', upload.single('photo'), async (req, res) => {
    try {
      const contactData = insertContactSchema.partial().parse(req.body);
      
      if (req.file) {
        const photoUrl = `/uploads/${req.file.filename}`;
        contactData.photoUrl = photoUrl;
      }
      
      const contact = await storage.updateContact(parseInt(req.params.id), contactData);
      res.json(contact);
    } catch (error) {
      res.status(400).json({ error: 'Invalid contact data' });
    }
  });

  app.delete('/api/contacts/:id', async (req, res) => {
    try {
      await storage.deleteContact(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete contact' });
    }
  });

  app.get('/api/contacts/search/:query', async (req, res) => {
    try {
      const contacts = await storage.searchContacts(req.params.query);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to search contacts' });
    }
  });

  // Conversations API
  app.get('/api/conversations', async (req, res) => {
    try {
      const conversations = await storage.getRecentConversations(50);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  app.get('/api/conversations/contact/:contactId', async (req, res) => {
    try {
      const conversations = await storage.getConversationsByContact(parseInt(req.params.contactId));
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  // Forms API
  app.get('/api/forms', async (req, res) => {
    try {
      const forms = await storage.getForms();
      res.json(forms);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch forms' });
    }
  });

  app.post('/api/forms', async (req, res) => {
    try {
      const { enhanced, fields, ...formData } = req.body;
      const validatedFormData = insertFormSchema.parse(formData);
      
      // Store enhanced metadata with the form
      const enhancedFormData = {
        ...validatedFormData,
        metadata: {
          enhanced: enhanced || false,
          aiGenerated: fields && fields.length > 0,
          fieldCount: fields ? fields.length : 0,
          ...validatedFormData.metadata
        }
      };
      
      const form = await storage.createForm(enhancedFormData);
      
      // Store form fields if provided
      if (fields && Array.isArray(fields)) {
        // TODO: Add form fields storage when implementing dynamic forms
        console.log('Enhanced form created with', fields.length, 'AI-generated fields');
      }
      
      res.json(form);
    } catch (error) {
      console.error('Form creation error:', error);
      res.status(400).json({ error: 'Invalid form data' });
    }
  });

  // Enhanced AI Form Generation API
  app.post('/api/forms/generate', async (req, res) => {
    try {
      const { formType, context, enhanced, smartValidation, autoCompletion } = req.body;
      
      if (!formType) {
        return res.status(400).json({ error: 'Form type is required' });
      }

      const sam = new SamAI();
      let prompt = `Create a ${formType} form for a gentlemen's club management system.`;
      
      if (context) {
        prompt += ` Context: ${context}`;
      }
      
      if (enhanced === 'true') {
        prompt += ` Generate enhanced fields with smart validation rules and auto-completion suggestions.`;
        
        if (smartValidation === 'true') {
          prompt += ` Include intelligent validation patterns and error messages.`;
        }
        
        if (autoCompletion === 'true') {
          prompt += ` Add predictive field suggestions and auto-completion options.`;
        }
      }
      
      const formStructure = await sam.extractFormInfo(prompt);
      
      if (!formStructure) {
        return res.status(500).json({ error: 'Failed to generate form structure' });
      }

      // Enhanced field processing
      let fields = formStructure.fields || [];
      
      if (enhanced === 'true') {
        // Add enhanced properties to each field
        fields = fields.map((field: any) => ({
          ...field,
          id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          enhanced: true,
          smartValidation: smartValidation === 'true',
          autoCompletion: autoCompletion === 'true',
          placeholder: field.placeholder || `Enter ${field.name.toLowerCase()}...`
        }));
      }

      res.json({ 
        questions: fields,
        metadata: {
          enhanced: enhanced === 'true',
          smartValidation: smartValidation === 'true',
          autoCompletion: autoCompletion === 'true',
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Enhanced form generation error:', error);
      res.status(500).json({ error: 'Failed to generate enhanced form questions' });
    }
  });

  app.get('/api/forms/:id/responses', async (req, res) => {
    try {
      const responses = await storage.getFormResponses(parseInt(req.params.id));
      res.json(responses);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch form responses' });
    }
  });

  // Calendar API
  app.get('/api/calendar/events', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const events = await storage.getCalendarEvents(start, end);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
  });

  app.post('/api/calendar/events', async (req, res) => {
    try {
      const eventData = insertCalendarEventSchema.parse(req.body);
      const event = await storage.createCalendarEvent(eventData);
      res.json(event);
    } catch (error) {
      res.status(400).json({ error: 'Invalid event data' });
    }
  });

  app.put('/api/calendar/events/:id', async (req, res) => {
    try {
      const eventData = insertCalendarEventSchema.partial().parse(req.body);
      const event = await storage.updateCalendarEvent(parseInt(req.params.id), eventData);
      res.json(event);
    } catch (error) {
      res.status(400).json({ error: 'Invalid event data' });
    }
  });

  app.delete('/api/calendar/events/:id', async (req, res) => {
    try {
      await storage.deleteCalendarEvent(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete event' });
    }
  });

  // Social Media API
  app.get('/api/social-media', async (req, res) => {
    try {
      const { date } = req.query;
      let content;
      
      if (date) {
        content = await storage.getSocialMediaContentByDate(new Date(date as string));
      } else {
        content = await storage.getAllSocialMediaContent();
      }
      
      res.json(content);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch social media content' });
    }
  });

  app.post('/api/social-media/generate', async (req, res) => {
    try {
      const { contentType, topic, platform } = req.body;
      const content = await geminiService.generateSocialMediaPosts(`Generate ${contentType} content for ${platform} about ${topic}`);
      res.json(content);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate social media content' });
    }
  });

  // Memory Items API
  app.get('/api/memory', async (req, res) => {
    try {
      const { contactId, category } = req.query;
      const items = await storage.getMemoryItems(
        contactId ? parseInt(contactId as string) : undefined,
        category as string
      );
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch memory items' });
    }
  });

  app.post('/api/memory', async (req, res) => {
    try {
      const itemData = insertMemoryItemSchema.parse(req.body);
      const item = await storage.createMemoryItem(itemData);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: 'Invalid memory item data' });
    }
  });

  app.put('/api/memory/:id', async (req, res) => {
    try {
      const itemData = insertMemoryItemSchema.partial().parse(req.body);
      const item = await storage.updateMemoryItem(parseInt(req.params.id), itemData);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: 'Invalid memory item data' });
    }
  });

  // Image analysis API
  app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image provided' });
      }
      
      const imageBase64 = fs.readFileSync(req.file.path, 'base64');
      const analysis = await geminiService.readImage(imageBase64, req.file.mimetype);
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      res.json({ analysis });
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze image' });
    }
  });

  // Sales Items API
  app.get('/api/sales/items', async (req, res) => {
    try {
      const { category } = req.query;
      const items = await storage.getSalesItems(category as string);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sales items' });
    }
  });

  app.post('/api/sales/items', async (req, res) => {
    try {
      const item = await storage.createSalesItem(req.body);
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create sales item' });
    }
  });

  app.put('/api/sales/items/:id', async (req, res) => {
    try {
      const item = await storage.updateSalesItem(parseInt(req.params.id), req.body);
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update sales item' });
    }
  });

  app.delete('/api/sales/items/:id', async (req, res) => {
    try {
      await storage.deleteSalesItem(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete sales item' });
    }
  });

  // Sales Transactions API
  app.get('/api/sales/transactions', async (req, res) => {
    try {
      const { itemId, customerId } = req.query;
      const transactions = await storage.getSalesTransactions(
        itemId ? parseInt(itemId as string) : undefined,
        customerId ? parseInt(customerId as string) : undefined
      );
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sales transactions' });
    }
  });

  app.post('/api/sales/transactions', async (req, res) => {
    try {
      const transaction = await storage.createSalesTransaction(req.body);
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create sales transaction' });
    }
  });

  app.put('/api/sales/transactions/:id', async (req, res) => {
    try {
      const transaction = await storage.updateSalesTransaction(parseInt(req.params.id), req.body);
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update sales transaction' });
    }
  });

  // Text-to-Speech API
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, voice, audioConfig } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required and must be a string' });
      }

      if (!ttsService.isAvailable()) {
        return res.status(503).json({ error: 'TTS service not available' });
      }

      const audioBuffer = await ttsService.synthesizeText({
        text,
        voice,
        audioConfig
      }).catch(error => {
        console.error('TTS synthesis error:', error);
        return null;
      });

      if (!audioBuffer) {
        return res.status(500).json({ error: 'Failed to generate audio' });
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.send(audioBuffer);
    } catch (error) {
      console.error('TTS API error:', error);
      res.status(500).json({ error: 'TTS generation failed' });
    }
  });

  // Enhanced Social Media Post Generation API
  app.post('/api/social-media/generate-posts', upload.single('image'), async (req, res) => {
    try {
      const { prompt, enhanced, autoHashtags, platformOptimized } = req.body;
      
      if (!prompt && !req.file) {
        return res.status(400).json({ error: 'Either prompt or image is required' });
      }

      let imageBase64 = null;
      let imageMimeType = null;
      let imageAnalysis = null;

      if (req.file) {
        const imageBuffer = fs.readFileSync(req.file.path);
        imageBase64 = imageBuffer.toString('base64');
        imageMimeType = req.file.mimetype;
        
        // Enhanced AI visual analysis if requested
        if (enhanced === 'true') {
          imageAnalysis = await geminiService.analyzeImageForSocialMedia(imageBase64, imageMimeType);
        }
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
      }

      let posts = await geminiService.generateSocialMediaPosts(
        prompt || '',
        imageBase64 || undefined,
        imageMimeType || undefined
      );

      // Enhanced features
      if (enhanced === 'true') {
        const sam = new SamAI();
        
        // Add AI-generated hashtags if requested
        if (autoHashtags === 'true') {
          posts = await sam.enhancePostsWithHashtags(posts);
        }
        
        // Platform optimization if requested
        if (platformOptimized === 'true') {
          posts = await sam.optimizePostsForPlatforms(posts);
        }
      }
      
      res.json({ 
        posts, 
        imageAnalysis,
        enhanced: enhanced === 'true'
      });
    } catch (error) {
      console.error('Social media post generation error:', error);
      res.status(500).json({ error: 'Failed to generate social media posts' });
    }
  });

  // User Management API
  app.get('/api/users', async (req, res) => {
    try {
      const users = await userManagementService.getUsersWithDetails();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const { clubIds, ...userData } = req.body;
      
      // Parse user data (without clubIds)
      const validatedUserData = insertUserSchema.parse(userData);
      
      // Create user
      const user = await userManagementService.createUser(validatedUserData);
      
      // Create club assignments if provided
      if (clubIds && Array.isArray(clubIds) && clubIds.length > 0) {
        const masterDb = databaseManager.getMasterDb();
        
        // Create club assignments
        for (let i = 0; i < clubIds.length; i++) {
          const clubId = parseInt(clubIds[i]);
          await masterDb.insert(schema.userClubAssignments).values({
            userId: user.id,
            clubId: clubId,
            isDefault: i === 0, // First club is default
          });
        }
      }
      
      res.json(user);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(400).json({ error: 'Invalid user data' });
    }
  });

  app.patch('/api/users/:id', async (req, res) => {
    try {
      console.log('Updating user with data:', req.body);
      const userId = parseInt(req.params.id);
      const { isActive, roleId, isSuperUser } = req.body;
      
      let user;
      if (isActive !== undefined) {
        user = await userManagementService.updateUserStatus(userId, isActive);
      } else if (roleId !== undefined || isSuperUser !== undefined) {
        user = await userManagementService.updateUserRole(userId, roleId, isSuperUser);
      } else {
        return res.status(400).json({ error: 'No valid update fields provided' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('User update error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // Club Management API
  app.get('/api/clubs', async (req, res) => {
    try {
      const clubs = await userManagementService.getClubs();
      res.json(clubs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch clubs' });
    }
  });

  app.post('/api/clubs', async (req, res) => {
    try {
      console.log('Creating club with data:', req.body);
      const clubData = insertClubSchema.parse(req.body);
      console.log('Parsed club data:', clubData);
      const club = await userManagementService.createClub(clubData);
      console.log('Created club:', club);
      res.json(club);
    } catch (error) {
      console.error('Club creation error:', error);
      res.status(400).json({ 
        error: 'Failed to create club', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Role Management API
  app.get('/api/roles', async (req, res) => {
    try {
      const roles = await userManagementService.getRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  });

  // Authentication API
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      console.log('Login attempt for username:', username);
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const user = await userManagementService.verifyUser(username, password);
      
      console.log('User verification result:', user ? 'SUCCESS' : 'FAILED');
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Set user session (basic implementation)
      req.session = req.session || {};
      (req.session as any).userId = user.id;
      (req.session as any).username = user.username;
      (req.session as any).isSuperUser = user.isSuperUser;

      res.json({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isSuperUser: user.isSuperUser,
        role: user.role,
        clubs: user.clubAssignments?.map(assignment => assignment.club) || []
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      if (req.session && req.session.destroy) {
        req.session.destroy(() => {
          res.json({ success: true });
        });
      } else {
        res.json({ success: true });
      }
    } catch (error) {
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const session = req.session as any;
      
      if (!session?.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await userManagementService.getUsersWithDetails();
      const currentUser = user.find(u => u.id === session.userId);
      
      if (!currentUser) {
        return res.status(401).json({ error: 'User not found' });
      }

      res.json({
        id: currentUser.id,
        username: currentUser.username,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        isSuperUser: currentUser.isSuperUser,
        role: currentUser.role,
        clubs: currentUser.clubAssignments?.map(assignment => assignment.club) || []
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user info' });
    }
  });

  // Enhanced Image Analysis for Social Media API
  app.post('/api/social-media/analyze-image', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
      }

      const { enhanced } = req.body;
      const imageBuffer = fs.readFileSync(req.file.path);
      const imageBase64 = imageBuffer.toString('base64');
      const imageMimeType = req.file.mimetype;
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      let analysis;
      if (enhanced === 'true') {
        // Enhanced AI visual analysis with detailed insights
        const visualAnalysis = await geminiService.analyzeImageForSocialMedia(imageBase64, imageMimeType);
        
        // Add additional AI enhancements
        const ocrText = await geminiService.extractTextFromImage(imageBase64);
        const sam = new SamAI();
        const socialSuggestions = await sam.generateSocialSuggestions(visualAnalysis);
        
        analysis = {
          visualAnalysis: visualAnalysis,
          extractedText: ocrText,
          socialSuggestions: socialSuggestions,
          enhanced: true
        };
      } else {
        analysis = await geminiService.analyzeImageForSocialMedia(imageBase64, imageMimeType);
      }

      res.json({ analysis });
    } catch (error) {
      console.error('Image analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze image' });
    }
  });

  // General Image Reading API with Cloud Vision
  app.post('/api/read-image', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
      }

      const imageBuffer = fs.readFileSync(req.file.path);
      const imageBase64 = imageBuffer.toString('base64');
      const imageMimeType = req.file.mimetype;
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      const description = await geminiService.readImage(
        imageBase64,
        imageMimeType
      );

      res.json({ description });
    } catch (error) {
      console.error('Image reading error:', error);
      res.status(500).json({ error: 'Failed to read image' });
    }
  });

  // Cloud Vision API test endpoint
  app.post('/api/test-cloud-vision', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
      }

      const imageBuffer = fs.readFileSync(req.file.path);
      const imageBase64 = imageBuffer.toString('base64');
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      const analysis = await geminiService.analyzeWithCloudVision(imageBase64);

      res.json({ analysis });
    } catch (error) {
      console.error('Cloud Vision test error:', error);
      res.status(500).json({ error: 'Failed to analyze with Cloud Vision' });
    }
  });

  // OCR-specific endpoint for text extraction
  app.post('/api/ocr', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
      }

      const imageBuffer = fs.readFileSync(req.file.path);
      const imageBase64 = imageBuffer.toString('base64');
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      const ocrResult = await geminiService.extractTextFromImage(imageBase64);

      res.json({ text: ocrResult });
    } catch (error) {
      console.error('OCR error:', error);
      res.status(500).json({ error: 'Failed to extract text from image' });
    }
  });

  // Document processing endpoint
  app.post('/api/process-document', upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Document file is required' });
      }

      const documentBuffer = fs.readFileSync(req.file.path);
      const documentBase64 = documentBuffer.toString('base64');
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      const documentAnalysis = await geminiService.processDocumentWithAI(
        documentBase64,
        req.file.mimetype,
        req.file.originalname
      );

      res.json({ analysis: documentAnalysis });
    } catch (error) {
      console.error('Document processing error:', error);
      res.status(500).json({ error: 'Failed to process document' });
    }
  });

  // Follow-up Sequences API
  app.get('/api/follow-up/sequences', async (req, res) => {
    try {
      const { formId } = req.query;
      const sequences = formId 
        ? await storage.getFollowUpSequencesByForm(parseInt(formId as string))
        : [];
      res.json(sequences);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch follow-up sequences' });
    }
  });

  app.post('/api/follow-up/sequences', async (req, res) => {
    try {
      const validatedData = insertFollowUpSequenceSchema.parse(req.body);
      const sequence = await storage.createFollowUpSequence(validatedData);
      res.json(sequence);
    } catch (error) {
      res.status(400).json({ error: 'Invalid follow-up sequence data' });
    }
  });

  app.put('/api/follow-up/sequences/:id', async (req, res) => {
    try {
      const sequence = await storage.updateFollowUpSequence(parseInt(req.params.id), req.body);
      res.json(sequence);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update follow-up sequence' });
    }
  });

  app.delete('/api/follow-up/sequences/:id', async (req, res) => {
    try {
      await storage.deleteFollowUpSequence(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete follow-up sequence' });
    }
  });

  // Follow-up Actions API
  app.get('/api/follow-up/actions', async (req, res) => {
    try {
      const { sequenceId } = req.query;
      const actions = sequenceId 
        ? await storage.getFollowUpActionsBySequence(parseInt(sequenceId as string))
        : [];
      res.json(actions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch follow-up actions' });
    }
  });

  app.post('/api/follow-up/actions', async (req, res) => {
    try {
      const validatedData = insertFollowUpActionSchema.parse(req.body);
      const action = await storage.createFollowUpAction(validatedData);
      res.json(action);
    } catch (error) {
      res.status(400).json({ error: 'Invalid follow-up action data' });
    }
  });

  app.put('/api/follow-up/actions/:id', async (req, res) => {
    try {
      const action = await storage.updateFollowUpAction(parseInt(req.params.id), req.body);
      res.json(action);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update follow-up action' });
    }
  });

  app.delete('/api/follow-up/actions/:id', async (req, res) => {
    try {
      await storage.deleteFollowUpAction(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete follow-up action' });
    }
  });

  // Follow-up Executions API
  app.get('/api/follow-up/executions', async (req, res) => {
    try {
      const { responseId } = req.query;
      const executions = responseId
        ? await storage.getFollowUpExecutionsByResponse(parseInt(responseId as string))
        : await storage.getPendingFollowUpExecutions();
      res.json(executions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch follow-up executions' });
    }
  });

  // Manual trigger for follow-up processing
  app.post('/api/follow-up/process', async (req, res) => {
    try {
      await followUpProcessor.processPendingFollowUps();
      res.json({ success: true, message: 'Follow-up processing triggered' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process follow-ups' });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'uploads', req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  });

  // Chat History API
  app.get('/api/chat/history/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getChatHistory(sessionId, limit);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  });

  app.get('/api/chat/sessions', async (req, res) => {
    try {
      const sessions = await storage.getChatSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch chat sessions' });
    }
  });

  app.get('/api/chat/analytics', async (req, res) => {
    try {
      const { sessionId } = req.query;
      const analytics = await storage.getChatAnalytics(sessionId as string);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch chat analytics' });
    }
  });

  // Dynamic Tables API
  app.get('/api/dynamic-tables', async (req, res) => {
    try {
      const tables = await storage.getDynamicTables();
      res.json(tables);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dynamic tables' });
    }
  });

  app.get('/api/dynamic-tables/:id', async (req, res) => {
    try {
      const table = await storage.getDynamicTable(parseInt(req.params.id));
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      res.json(table);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dynamic table' });
    }
  });

  app.get('/api/dynamic-tables/name/:tableName', async (req, res) => {
    try {
      const table = await storage.getDynamicTableByName(req.params.tableName);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      res.json(table);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dynamic table' });
    }
  });

  app.post('/api/dynamic-tables', async (req, res) => {
    try {
      const table = await storage.createDynamicTable(req.body);
      res.json(table);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create dynamic table' });
    }
  });

  app.put('/api/dynamic-tables/:id', async (req, res) => {
    try {
      const table = await storage.updateDynamicTable(parseInt(req.params.id), req.body);
      res.json(table);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update dynamic table' });
    }
  });

  app.delete('/api/dynamic-tables/:id', async (req, res) => {
    try {
      await storage.deleteDynamicTable(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete dynamic table' });
    }
  });

  // Dynamic Table Data API
  app.get('/api/dynamic-tables/:id/data', async (req, res) => {
    try {
      const data = await storage.getDynamicTableData(parseInt(req.params.id));
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch table data' });
    }
  });

  app.post('/api/dynamic-tables/:id/data', async (req, res) => {
    try {
      const data = await storage.createDynamicTableData({
        tableId: parseInt(req.params.id),
        rowData: req.body
      });
      res.json(data);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create table data' });
    }
  });

  app.put('/api/dynamic-tables/data/:id', async (req, res) => {
    try {
      const data = await storage.updateDynamicTableData(parseInt(req.params.id), {
        rowData: req.body
      });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update table data' });
    }
  });

  app.delete('/api/dynamic-tables/data/:id', async (req, res) => {
    try {
      await storage.deleteDynamicTableData(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete table data' });
    }
  });

  // Weather API - Enhanced for Bobby (super user)
  app.get('/api/weather', async (req, res) => {
    try {
      const { location = 'Hammond, IN' } = req.query;
      const session = req.session as any;
      
      // Check if this is Bobby or super user
      const isSuperUser = session?.userId === 1 || session?.isSuperUser;
      
      if (!isSuperUser) {
        return res.status(403).json({ error: 'Weather access restricted to super users' });
      }
      
      const weatherData = await WeatherService.getWeatherForLocation(location as string);
      const recommendations = await WeatherService.getBusinessRecommendations(weatherData);
      
      res.json({
        ...weatherData,
        businessRecommendations: recommendations,
        accessLevel: 'super_user',
        message: 'Enhanced weather data for club operations'
      });
    } catch (error) {
      console.error('Weather API error:', error);
      res.status(500).json({ error: 'Failed to fetch weather data' });
    }
  });

  return httpServer;
}
