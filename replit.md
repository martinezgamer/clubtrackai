# Smart Tools 4U - Club Management AI System

## Overview

This is a comprehensive Club Tracker AI platform designed specifically for managing gentlemen's club operations. The system serves as an intelligent Club Management AI that combines modern web technologies with AI assistance to streamline all aspects of club operations including contact management, dancer tracking, scheduling, form creation, and chat-based assistance with Sam - a chill, laid-back AI assistant with natural voice interaction capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.
AI personality: Sam - chill, laid-back, and friendly Club Management AI assistant. Casual and relaxed like talking to a helpful buddy who understands the gentlemen's club industry.
Company branding: Smart Tools 4U with tagline "AI and people meet as one" - specialized Club Tracker AI for gentlemen's club management integrated throughout the application interface.

## Recent Updates (July 21, 2025)

✓ **Terminology Update**: Rebranded as "Club Management AI" and "Club Tracker AI"
  - Updated documentation to emphasize "Club Management AI" branding throughout
  - Clarified that this is specifically designed for gentlemen's club operations
  - Enhanced AI assistant description to reflect club management specialization
  - All UI components already properly aligned with club management terminology

✓ **Multi-Tenant Database Architecture**: Complete data isolation system
  - Implemented separate databases per club for complete data isolation
  - Created dynamic database manager with club-specific connections
  - Updated storage layer to support club-aware data operations
  - Each club gets its own database for contacts, forms, events, and all data
  - Club databases are created automatically when new clubs are added

✓ **User Club Assignment System**: Multi-club membership support
  - Users can be assigned to multiple clubs during creation
  - Club assignments are required when creating new users
  - First assigned club becomes the default club for the user
  - Updated user management UI with club selection checkboxes
  - Fixed user creation API to properly handle club assignments

✓ **Dancer Stage Name Feature**: Enhanced contact management for performers
  - Added stageName field to contacts schema and database
  - Stage name input field appears only when "dancer" role is selected
  - Contact cards display stage names prominently for dancers
  - Updated contact form validation to include stage name field

✓ **Critical Bug Fixes**: Comprehensive debugging and error resolution
  - Fixed TTS audio playback failures due to browser autoplay policies
  - Resolved unhandled promise rejections in WebSocket connections
  - Enhanced speech recognition error handling and cleanup
  - Added React Error Boundaries for component-level error catching
  - Improved global error handlers to filter out known browser limitations
  - Fixed sidebar tab buttons not working due to conflicting Tabs components
  - Prevented Sam's repetitive welcome messages by using session storage tracking

✓ **Enhanced Error Handling**: Systematic improvements across all systems
  - TTS fallback mechanism from Google Cloud TTS to browser TTS
  - WebSocket reconnection error handling with proper try-catch blocks  
  - Voice recognition cleanup with safe stop procedures
  - Better logging with appropriate warning vs error classifications
  - User-friendly error messages with actionable feedback

✓ **System Stability**: Application robustness improvements
  - Error boundaries prevent full application crashes
  - Graceful degradation when external services fail
  - Comprehensive error logging for debugging
  - Proper cleanup of resources in all hooks and components

✓ Completed comprehensive role-based permission system debugging
✓ Fixed Bobby's super admin role assignment and permissions  
✓ Verified all user management buttons work correctly
✓ Enhanced Bobby's Super User Capabilities with weather API access and special Gemini AI features
✓ Weather Service Integration with real-time weather data and business recommendations  
✓ Creator Mode Features with executive-level insights for Bobby as app creator
✓ Dynamic Weather Widget restricted to super users with business intelligence
✓ Login System Implementation with comprehensive authentication and secure session management
✓ Performance Optimization fixing duplicate API calls and WebSocket connection issues
✓ User Interface Enhancement integrating user authentication into sidebar with personalized welcome messages
✓ Authentication System Fully Operational with complete authentication flow and session management working properly

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

### 1. Club Contact Management System
- **Purpose**: Comprehensive tracking system for dancers, staff, regulars, friends, and family within the gentlemen's club ecosystem
- **Features**: 
  - Contact profiles with photos and detailed information
  - Role-based categorization (dancer, staff, regular, family, friend)
  - Status tracking (active, inactive, problematic)
  - Notes and preferences storage
  - Search and filtering capabilities

### 2. Sam Club Management AI Assistant
- **Purpose**: Provide intelligent Club Tracker AI assistance for gentlemen's club operations with a chill, friendly personality
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
  - **Enhanced Creator Mode (Bobby Only)**: Special super user capabilities with:
    - Real-time weather data integration for business operations
    - Executive-level insights and enhanced AI responses
    - Advanced analytics and performance recommendations
    - Priority feature access and enhanced system controls
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

### 10. User Authentication System
- **Purpose**: Secure access control with role-based permissions
- **Features**:
  - Modern login interface with Smart Tools 4U branding
  - Session-based authentication with PostgreSQL storage
  - Protected routes requiring authentication
  - User context management across the application
  - Personalized welcome messages in sidebar
  - Secure logout functionality with session cleanup
  - Error handling for invalid credentials
  - Loading states and user feedback
  - Auto-redirect to login for unauthorized access

### 11. Voice Command Integration
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
- **Weather Data**: Open-Meteo API (free, no key required) with Google Geocoding for locations

### Development Tools
- **TypeScript**: Type safety and development experience
- **Vite**: Fast development server and build tool
- **ESBuild**: Fast JavaScript bundler for production
- **Drizzle Kit**: Database migrations and schema management

### Authentication & Sessions
- **Session Management**: Express sessions with PostgreSQL store and connect-pg-simple
- **Frontend Authentication**: React-based login system with protected routes
- **User Context**: Comprehensive auth provider with login/logout state management
- **Session Security**: HttpOnly cookies with 24-hour expiration
- **Password Security**: Bcrypt hashing for secure credential verification
- **Auto-redirect**: Automatic login screen for unauthenticated users

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
- **SESSION_SECRET**: Secret key for session management (auto-generated if not provided)

### File Structure
```
├── client/          # Frontend React application
├── server/          # Backend Express server
├── shared/          # Shared types and schemas
├── uploads/         # File upload storage
└── dist/           # Production build output
```

### Multi-Tenant Architecture
The application now supports complete multi-tenancy with:
- **Master Database**: Stores users, roles, clubs, and user-club assignments
- **Club-Specific Databases**: Each club gets a separate database for complete data isolation
- **Dynamic Database Connections**: Database manager handles routing to appropriate club databases
- **Club-Aware Operations**: All data operations are scoped to the user's assigned clubs
- **Automatic Database Creation**: New club databases are created automatically when clubs are added

The application is designed to be deployed on platforms that support Node.js with PostgreSQL, with the frontend serving as a single-page application and the backend providing API endpoints and WebSocket connections.