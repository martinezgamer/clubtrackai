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

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// WebSocket connection management
const clients = new Set<WebSocket>();

function broadcastToClients(message: any) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
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
          // Save user message
          await storage.createConversation({
            contactId: null,
            userId: 1, // Assuming Bobby is user ID 1
            message: message.content,
            sender: 'user',
            messageType: 'text',
          });

          // Generate AI response
          const aiResponse = await geminiService.generateResponse(message.content, message.history || []);
          
          // Save AI response
          await storage.createConversation({
            contactId: null,
            userId: 1,
            message: aiResponse,
            sender: 'ai',
            messageType: 'text',
          });

          // Broadcast AI response to all clients
          broadcastToClients({
            type: 'chat_response',
            content: aiResponse,
            timestamp: new Date().toISOString()
          });
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

  return httpServer;
}
