import { apiRequest } from "./queryClient";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Contact {
  id: number;
  name: string;
  nickname?: string;
  role: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  status: string;
  notes?: string;
  preferences?: Record<string, any>;
  lastContact?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Form {
  id: number;
  title: string;
  description?: string;
  fields: Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    options?: string[];
  }>;
  isRecurring: boolean;
  recurringSchedule?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: number[];
  eventType: string;
  isRecurring: boolean;
  recurringPattern?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryItem {
  id: number;
  contactId?: number;
  title: string;
  content: string;
  category: string;
  priority: string;
  isCompleted: boolean;
  reminderDate?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SocialMediaContent {
  id: number;
  title: string;
  content: string;
  contentType: string;
  platform?: string;
  imageUrl?: string;
  scheduledFor?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

// Contacts API
export const contactsApi = {
  getAll: (filters?: { role?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.status) params.append('status', filters.status);
    return apiRequest('GET', `/api/contacts?${params}`);
  },
  
  getById: (id: number) => apiRequest('GET', `/api/contacts/${id}`),
  
  create: (contact: Partial<Contact>, photo?: File) => {
    const formData = new FormData();
    Object.entries(contact).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    });
    if (photo) {
      formData.append('photo', photo);
    }
    return apiRequest('POST', '/api/contacts', formData);
  },
  
  update: (id: number, contact: Partial<Contact>, photo?: File) => {
    const formData = new FormData();
    Object.entries(contact).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    });
    if (photo) {
      formData.append('photo', photo);
    }
    return apiRequest('PUT', `/api/contacts/${id}`, formData);
  },
  
  delete: (id: number) => apiRequest('DELETE', `/api/contacts/${id}`),
  
  search: (query: string) => apiRequest('GET', `/api/contacts/search/${query}`),
};

// Forms API
export const formsApi = {
  getAll: () => apiRequest('GET', '/api/forms'),
  
  create: (form: Partial<Form>) => apiRequest('POST', '/api/forms', form),
  
  generateQuestions: (formType: string, context: string) => 
    apiRequest('POST', '/api/forms/generate', { formType, context }),
  
  getResponses: (formId: number) => apiRequest('GET', `/api/forms/${formId}/responses`),
};

// Calendar API
export const calendarApi = {
  getEvents: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiRequest('GET', `/api/calendar/events?${params}`);
  },
  
  createEvent: (event: Partial<CalendarEvent>) => 
    apiRequest('POST', '/api/calendar/events', event),
  
  updateEvent: (id: number, event: Partial<CalendarEvent>) => 
    apiRequest('PUT', `/api/calendar/events/${id}`, event),
  
  deleteEvent: (id: number) => apiRequest('DELETE', `/api/calendar/events/${id}`),
};

// Memory API
export const memoryApi = {
  getAll: (contactId?: number, category?: string) => {
    const params = new URLSearchParams();
    if (contactId) params.append('contactId', contactId.toString());
    if (category) params.append('category', category);
    return apiRequest('GET', `/api/memory?${params}`);
  },
  
  create: (item: Partial<MemoryItem>) => apiRequest('POST', '/api/memory', item),
  
  update: (id: number, item: Partial<MemoryItem>) => 
    apiRequest('PUT', `/api/memory/${id}`, item),
};

// Social Media API
export const socialMediaApi = {
  getAll: (date?: string) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    return apiRequest('GET', `/api/social-media?${params}`);
  },
  
  generateContent: (contentType: string, topic: string, platform?: string) => 
    apiRequest('POST', '/api/social-media/generate', { contentType, topic, platform }),
  
  generatePosts: (prompt: string, image?: File) => {
    const formData = new FormData();
    formData.append('prompt', prompt);
    if (image) {
      formData.append('image', image);
    }
    return apiRequest('POST', '/api/social-media/generate-posts', formData);
  },
  
  analyzeImage: (image: File) => {
    const formData = new FormData();
    formData.append('image', image);
    return apiRequest('POST', '/api/social-media/analyze-image', formData);
  },
};

// Image Analysis API
export const imageApi = {
  analyze: (image: File) => {
    const formData = new FormData();
    formData.append('image', image);
    return apiRequest('POST', '/api/analyze-image', formData);
  },
  
  readImage: (image: File) => {
    const formData = new FormData();
    formData.append('image', image);
    return apiRequest('POST', '/api/read-image', formData);
  },
  
  // OCR for text extraction
  extractText: (image: File) => {
    const formData = new FormData();
    formData.append('image', image);
    return apiRequest('POST', '/api/ocr', formData);
  },
  
  // Test Cloud Vision API
  testCloudVision: (image: File) => {
    const formData = new FormData();
    formData.append('image', image);
    return apiRequest('POST', '/api/test-cloud-vision', formData);
  },
};

// Conversations API
export const conversationsApi = {
  getAll: () => apiRequest('GET', '/api/conversations'),
  
  getByContact: (contactId: number) => 
    apiRequest('GET', `/api/conversations/contact/${contactId}`),
};

// Sales API
export interface SalesItem {
  id: number;
  name: string;
  description?: string;
  price: string;
  category: string;
  imageUrl?: string;
  isActive: boolean;
  stockQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface SalesTransaction {
  id: number;
  itemId?: number;
  customerId?: number;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  paymentMethod: string;
  paymentStatus: string;
  qrCodeData?: string;
  notes?: string;
  createdAt: string;
}

export const salesApi = {
  // Sales Items
  getItems: (category?: string) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    return apiRequest('GET', `/api/sales/items?${params}`);
  },
  
  createItem: (item: Partial<SalesItem>) => 
    apiRequest('POST', '/api/sales/items', item),
  
  updateItem: (id: number, item: Partial<SalesItem>) => 
    apiRequest('PUT', `/api/sales/items/${id}`, item),
  
  deleteItem: (id: number) => 
    apiRequest('DELETE', `/api/sales/items/${id}`),

  // Sales Transactions
  getTransactions: (itemId?: number, customerId?: number) => {
    const params = new URLSearchParams();
    if (itemId) params.append('itemId', itemId.toString());
    if (customerId) params.append('customerId', customerId.toString());
    return apiRequest('GET', `/api/sales/transactions?${params}`);
  },
  
  createTransaction: (transaction: Partial<SalesTransaction>) => 
    apiRequest('POST', '/api/sales/transactions', transaction),
  
  updateTransaction: (id: number, transaction: Partial<SalesTransaction>) => 
    apiRequest('PUT', `/api/sales/transactions/${id}`, transaction),
};
