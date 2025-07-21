import { storage } from "../storage";
import { geminiService } from "./gemini";
import { ttsService } from "./tts";
import type { FormResponse, FollowUpSequence, FollowUpAction, FollowUpExecution } from "@shared/schema";

export class FollowUpProcessor {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startProcessing();
  }

  private startProcessing() {
    // Process pending follow-ups every 30 seconds
    this.processingInterval = setInterval(() => {
      this.processPendingFollowUps();
    }, 30000);
  }

  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  async processPendingFollowUps() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      const pendingExecutions = await storage.getPendingFollowUpExecutions();
      
      for (const execution of pendingExecutions) {
        await this.processExecution(execution);
      }
    } catch (error) {
      console.error('Error processing follow-ups:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async processExecution(execution: FollowUpExecution) {
    try {
      const action = execution.actionId ? await storage.getFollowUpAction(execution.actionId) : null;
      if (!action) {
        await storage.updateFollowUpExecution(execution.id, {
          status: 'failed',
          errorMessage: 'Follow-up action not found'
        });
        return;
      }

      let success = false;
      let errorMessage = '';

      switch (action.actionType) {
        case 'send_message':
          success = await this.sendMessage(action, execution);
          break;
        case 'create_memory':
          success = await this.createMemory(action, execution);
          break;
        case 'schedule_event':
          success = await this.scheduleEvent(action, execution);
          break;
        case 'generate_social_content':
          success = await this.generateSocialContent(action, execution);
          break;
        default:
          errorMessage = `Unknown action type: ${action.actionType}`;
          break;
      }

      await storage.updateFollowUpExecution(execution.id, {
        status: success ? 'completed' : 'failed',
        errorMessage: success ? null : errorMessage
      });

    } catch (error) {
      await storage.updateFollowUpExecution(execution.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async sendMessage(action: FollowUpAction, execution: FollowUpExecution): Promise<boolean> {
    try {
      const actionData = action.actionData as any;
      const response = execution.responseId ? await storage.getFormResponse(execution.responseId) : null;
      
      if (!response || !response.contactId) return false;

      const contact = await storage.getContact(response.contactId);
      if (!contact) return false;

      // Generate personalized message using AI
      const personalizedMessage = await geminiService.generateResponse(
        `Generate a personalized follow-up message for ${contact.name}. Context: ${actionData.template}. Form response: ${JSON.stringify(response.responses)}`
      );

      // Store as conversation
      if (contact.id) {
        await storage.createConversation({
          contactId: contact.id,
          userId: 1, // System user
          message: personalizedMessage,
          sender: 'assistant',
          messageType: 'text'
        });
      }

      return true;
    } catch (error) {
      console.error('Error sending follow-up message:', error);
      return false;
    }
  }

  private async createMemory(action: FollowUpAction, execution: FollowUpExecution): Promise<boolean> {
    try {
      const actionData = action.actionData as any;
      const response = execution.responseId ? await storage.getFormResponse(execution.responseId) : null;
      
      if (!response || !response.contactId) return false;

      await storage.createMemoryItem({
        contactId: response.contactId,
        title: actionData.title,
        content: actionData.content || `Follow-up from form response: ${JSON.stringify(response.responses)}`,
        category: actionData.category || 'follow-up',
        priority: actionData.priority || 'medium',
        reminderDate: actionData.reminderDate ? new Date(actionData.reminderDate) : null,
        tags: actionData.tags || []
      });

      return true;
    } catch (error) {
      console.error('Error creating follow-up memory:', error);
      return false;
    }
  }

  private async scheduleEvent(action: FollowUpAction, execution: FollowUpExecution): Promise<boolean> {
    try {
      const actionData = action.actionData as any;
      const response = execution.responseId ? await storage.getFormResponse(execution.responseId) : null;
      
      if (!response || !response.contactId) return false;

      const contact = await storage.getContact(response.contactId);
      if (!contact) return false;

      await storage.createCalendarEvent({
        title: actionData.title,
        description: actionData.description || `Follow-up event for ${contact.name}`,
        startTime: new Date(actionData.startTime),
        endTime: new Date(actionData.endTime),
        location: actionData.location || null,
        attendees: [contact.id],
        eventType: actionData.eventType || 'follow-up',
        isRecurring: false,
        recurringPattern: null
      });

      return true;
    } catch (error) {
      console.error('Error scheduling follow-up event:', error);
      return false;
    }
  }

  private async generateSocialContent(action: FollowUpAction, execution: FollowUpExecution): Promise<boolean> {
    try {
      const actionData = action.actionData as any;
      const response = execution.responseId ? await storage.getFormResponse(execution.responseId) : null;
      
      if (!response) return false;

      const content = await geminiService.generateSocialMediaPosts(
        `Generate ${actionData.platform || 'general'} content. Topic: ${actionData.topic || 'General update'}. Type: ${actionData.contentType || 'post'}`
      );

      await storage.createSocialMediaContent({
        title: typeof content === 'string' ? 'Generated Content' : (content as any)?.title || 'Generated Content',
        content: typeof content === 'string' ? content : (content as any)?.content || JSON.stringify(content),
        contentType: actionData.contentType || 'post',
        platform: actionData.platform || 'general',
        imageUrl: null,
        scheduledFor: actionData.scheduledFor ? new Date(actionData.scheduledFor) : null
      });

      return true;
    } catch (error) {
      console.error('Error generating social content:', error);
      return false;
    }
  }

  async createFollowUpSequence(formId: number, responses: FormResponse[]): Promise<void> {
    const sequences = await storage.getFollowUpSequencesByForm(formId);
    
    for (const sequence of sequences) {
      for (const response of responses) {
        if (this.shouldTriggerSequence(sequence, response)) {
          await this.scheduleSequenceActions(sequence, response);
        }
      }
    }
  }

  private shouldTriggerSequence(sequence: FollowUpSequence, response: FormResponse): boolean {
    const conditions = sequence.triggerConditions as any[];
    
    for (const condition of conditions) {
      const responseValue = response.responses[condition.fieldId];
      
      if (!this.evaluateCondition(condition, responseValue)) {
        return false;
      }
    }
    
    return true;
  }

  private evaluateCondition(condition: any, value: any): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      case 'not_empty':
        return value !== null && value !== undefined && value !== '';
      case 'is_empty':
        return value === null || value === undefined || value === '';
      default:
        return false;
    }
  }

  private async scheduleSequenceActions(sequence: FollowUpSequence, response: FormResponse): Promise<void> {
    const actions = await storage.getFollowUpActionsBySequence(sequence.id);
    
    for (const action of actions) {
      const delayMs = (action.delayMinutes || 0) * 60 * 1000;
      const scheduledFor = new Date(Date.now() + delayMs);
      
      await storage.createFollowUpExecution({
        responseId: response.id,
        sequenceId: sequence.id,
        actionId: action.id,
        status: 'pending',
        scheduledFor,
        errorMessage: null
      });
    }
  }
}

export const followUpProcessor = new FollowUpProcessor();