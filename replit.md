# Bobby's Club Management System

## Overview

This is a full-stack web application designed to help Bobby manage his fantasy gentlemen's club operations. The system combines modern web technologies with AI assistance to streamline club management tasks including contact management, scheduling, form creation, and chat-based assistance with FRIDAY - an Iron Man-inspired AI assistant with natural voice interaction capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.
AI personality: Sam - chill, laid-back, and friendly AI assistant. Casual and relaxed like talking to a helpful buddy.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI with Tailwind CSS for styling
- **State Management**: TanStack Query for server state and React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **Real-time Communication**: WebSocket server for chat functionality
- **AI Integration**: Google Gemini AI for intelligent assistance
- **Computer Vision**: Google Cloud Vision API for advanced image analysis and OCR

### Development Environment
- **TypeScript**: Full type safety across frontend and backend
- **Hot Module Replacement**: Vite development server with HMR
- **Path Aliases**: Configured for clean imports (@/, @shared/)
- **ESM**: Modern ES modules throughout the application

## Key Components

### 1. Contact Management System
- **Purpose**: Track dancers, staff, regulars, friends, and family
- **Features**: 
  - Contact profiles with photos and detailed information
  - Role-based categorization (dancer, staff, regular, family, friend)
  - Status tracking (active, inactive, problematic)
  - Notes and preferences storage
  - Search and filtering capabilities

### 2. Sam AI Assistant
- **Purpose**: Provide intelligent assistance for club operations with a chill, friendly personality
- **Features**:
  - Real-time WebSocket-based chat with persistent sessions
  - Context-aware responses using club data and conversation history
  - Voice recognition support with continuous listening mode
  - Dynamic table creation capabilities
  - Automatic action execution (contact creation, scheduling, form creation)
  - Comprehensive chat history storage and analytics
  - Natural conversation flow with professional sophistication
  - Advanced dancer management with lineup tracking and reliability patterns
  - Memory-first approach with timestamped transactions and individual quirks
  - Proactive suggestions for schedule gaps and backup dancer recommendations
  - Daily briefings with confirmation status and availability predictions
  - **Advanced Image Analysis**: Google Cloud Vision API integration for:
    - Enhanced OCR (Optical Character Recognition) for text extraction
    - Object and face detection
    - Logo and landmark recognition
    - Label detection with confidence scores
    - Document text analysis for structured content
  - **Document Processing**: Google Document AI integration for:
    - PDF document analysis and text extraction
    - Structured document understanding
    - Support for various document formats (PDF, DOC, DOCX, TXT)
    - Intelligent document content summarization
  - **File Upload System**: Dropdown menu interface for organized file uploads
  - **Varied Welcome Messages**: Randomized greeting messages to prevent repetitive interactions

### 3. Form Builder
- **Purpose**: Create custom forms for schedules, feedback, and data collection
- **Features**:
  - Drag-and-drop form creation
  - Multiple field types (text, select, checkbox, date, etc.)
  - Recurring form schedules
  - Response collection and management

### 4. Calendar Management
- **Purpose**: Schedule events, meetings, and shifts
- **Features**:
  - Event creation and management
  - Recurring event support
  - Attendee management
  - Time conflict detection

### 5. Memory System
- **Purpose**: Track important information and follow-ups
- **Features**:
  - Persistent memory items
  - Categorized information storage
  - AI-enhanced recall capabilities

### 6. Sales Tracking System
- **Purpose**: Track house dad/mom item sales and transactions
- **Features**:
  - Inventory management for house items
  - Cash payment tracking
  - QR code payment support (future)
  - Transaction history
  - Customer purchase tracking

### 7. Automated Follow-Up Sequences
- **Purpose**: Create automated responses and actions based on form submissions
- **Features**:
  - Define trigger conditions based on form field values
  - Multiple action types: send messages, create memories, schedule events, generate social content
  - Delay scheduling for timed follow-ups
  - Execution tracking and error handling
  - AI-powered content generation for personalized responses

### 8. Dynamic Table Creation System
- **Purpose**: Allow AI to create custom data tables on demand
- **Features**:
  - AI-powered table schema generation from natural language
  - Dynamic table creation through conversation
  - Flexible data storage with JSON-based rows
  - Table management (create, read, update, delete)
  - Integration with Sam AI for seamless table operations

### 9. Chat History and Analytics
- **Purpose**: Track and analyze all conversations with Sam
- **Features**:
  - Persistent chat history storage by session
  - Conversation analytics and sentiment tracking
  - Response time monitoring
  - Message type categorization
  - Historical conversation retrieval
  - Performance metrics for AI interactions

### 10. Voice Command Integration
- **Purpose**: Provide hands-free navigation and control of the club management system
- **Features**:
  - Speech recognition for voice commands with Web Speech API
  - Natural language command processing for navigation
  - Audio feedback with text-to-speech responses
  - Keyboard shortcuts (Ctrl+Shift+V to toggle, Esc to stop)
  - Comprehensive command categories: navigation, actions, and controls
  - Real-time listening indicator with visual feedback
  - Voice command help system with categorized command lists
  - Integration with all major app functions (contacts, calendar, forms, etc.)
  - Accessibility features for hands-free operation

## Data Flow

### Real-time Communication
1. Client connects to WebSocket server at `/ws`
2. Chat messages are processed through Gemini AI
3. AI responses include context from contacts, calendar, and memory
4. Real-time updates broadcast to all connected clients

### Data Management
1. Frontend uses TanStack Query for server state management
2. API requests handled through `/api` routes
3. Database operations through Drizzle ORM
4. Shared types and schemas between frontend and backend

### File Uploads
1. Multer middleware handles file uploads (10MB limit)
2. Files stored in local `uploads/` directory
3. Photo URLs stored in database for contact profiles

## External Dependencies

### Core Libraries
- **React Ecosystem**: React 18, React DOM, React Hook Form
- **UI Components**: Radix UI primitives, Tailwind CSS
- **Database**: Drizzle ORM, Neon PostgreSQL client
- **AI Integration**: Google Gemini AI SDK
- **WebSocket**: Native WebSocket with ws library
- **Date Handling**: date-fns for date operations

### Development Tools
- **TypeScript**: Type safety and development experience
- **Vite**: Fast development server and build tool
- **ESBuild**: Fast JavaScript bundler for production
- **Drizzle Kit**: Database migrations and schema management

### Authentication & Sessions
- **Session Management**: Express sessions with PostgreSQL store
- **Security**: Environment-based configuration for sensitive data

## Deployment Strategy

### Build Process
1. **Development**: `npm run dev` - Runs TSX server with hot reload
2. **Production Build**: `npm run build` - Vite build + ESBuild bundling
3. **Production Start**: `npm start` - Runs compiled server

### Database Management
- **Schema**: Defined in `shared/schema.ts` with Drizzle
- **Migrations**: Generated in `./migrations` directory
- **Push Changes**: `npm run db:push` for schema updates

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **GEMINI_API_KEY**: Google AI API key for chat functionality
- **GOOGLE_CLOUD_PROJECT_ID**: Google Cloud project ID for Vision API (optional)
- **GOOGLE_APPLICATION_CREDENTIALS**: Path to Google Cloud service account key file (optional)
- **GOOGLE_CLOUD_CREDENTIALS**: JSON string of Google Cloud service account credentials (optional)
- **NODE_ENV**: Environment setting (development/production)

### File Structure
```
├── client/          # Frontend React application
├── server/          # Backend Express server
├── shared/          # Shared types and schemas
├── migrations/      # Database migration files
├── uploads/         # File upload storage
└── dist/           # Production build output
```

The application is designed to be deployed on platforms that support Node.js with PostgreSQL, with the frontend serving as a single-page application and the backend providing API endpoints and WebSocket connections.