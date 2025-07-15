import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { geminiService } from "./services/gemini";
import { ttsService } from "./services/tts";
import { insertContactSchema, insertFormSchema, insertCalendarEventSchema, insertMemoryItemSchema, insertFollowUpSequenceSchema, insertFollowUpActionSchema } from "@shared/schema";
import { followUpProcessor } from "./services/follow-up-processor";
import { zfd } from "zod-form-data";
import multer from "multer";
import path from "path";
import fs from "fs";
import { SamAI } from "./services/gemini";

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
          
          // Get or create Sam session
          if (!samSessions.has(sessionId)) {
            samSessions.set(sessionId, new SamAI(sessionId));
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
            
            // Get or create Sam session
            if (!samSessions.has(sessionId)) {
              samSessions.set(sessionId, new SamAI(sessionId));
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
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message'
        }));
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('Client disconnected from WebSocket');
    });
  });

  // Contacts API
  app.get('/api/contacts', async (req, res) => {
    try {
      const { role, status } = req.query;
      const contacts = await storage.getContacts({ 
        role: role as string, 
        status: status as string 
      });
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  app.get('/api/contacts/:id', async (req, res) => {
    try {
      const contact = await storage.getContact(parseInt(req.params.id));
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
      
      const contact = await storage.createContact(contactData);
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
      const formData = insertFormSchema.parse(req.body);
      const form = await storage.createForm(formData);
      res.json(form);
    } catch (error) {
      res.status(400).json({ error: 'Invalid form data' });
    }
  });

  app.post('/api/forms/generate', async (req, res) => {
    try {
      const { formType, context } = req.body;
      const questions = await geminiService.generateFormQuestions(formType, context);
      res.json({ questions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate form questions' });
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
      const content = await geminiService.generateSocialMediaContent(contentType, topic, platform);
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
      const analysis = await geminiService.analyzeImage(imageBase64);
      
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

  // Social Media Post Generation API
  app.post('/api/social-media/generate-posts', upload.single('image'), async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt && !req.file) {
        return res.status(400).json({ error: 'Either prompt or image is required' });
      }

      let imageBase64 = null;
      let imageMimeType = null;

      if (req.file) {
        const imageBuffer = fs.readFileSync(req.file.path);
        imageBase64 = imageBuffer.toString('base64');
        imageMimeType = req.file.mimetype;
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
      }

      const posts = await geminiService.generateSocialMediaPosts(
        prompt || '',
        imageBase64,
        imageMimeType
      );

      res.json({ posts });
    } catch (error) {
      console.error('Social media post generation error:', error);
      res.status(500).json({ error: 'Failed to generate social media posts' });
    }
  });

  // Image Analysis for Social Media API
  app.post('/api/social-media/analyze-image', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
      }

      const imageBuffer = fs.readFileSync(req.file.path);
      const imageBase64 = imageBuffer.toString('base64');
      const imageMimeType = req.file.mimetype;
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      const analysis = await geminiService.analyzeImageForSocialMedia(
        imageBase64,
        imageMimeType
      );

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

  return httpServer;
}
