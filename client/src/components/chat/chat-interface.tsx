import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/use-websocket';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';
import { MessageBubble } from './message-bubble';
import { 
  Mic, MicOff, Camera, Paperclip, Send, Calendar, 
  Users, TrendingUp, FileText, Loader2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  metadata?: {
    type?: 'contact-profile' | 'form' | 'calendar' | 'social-media';
    data?: any;
  };
}

interface ChatInterfaceProps {
  onQuickAction: (action: string) => void;
}

export function ChatInterface({ onQuickAction }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { lastMessage, sendMessage, readyState } = useWebSocket('/ws');
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript,
    isSupported: voiceSupported 
  } = useVoiceRecognition();

  // Add welcome message on mount
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      content: "Hey Bobby! I'm ready to help you manage the club and keep track of everything. What would you like to work on today?",
      sender: 'ai',
      timestamp: new Date().toISOString(),
    };
    setMessages([welcomeMessage]);
  }, []);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'chat_response') {
        setIsTyping(false);
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          content: lastMessage.content,
          sender: 'ai',
          timestamp: lastMessage.timestamp || new Date().toISOString(),
          metadata: lastMessage.metadata,
        };
        setMessages(prev => [...prev, aiMessage]);
      } else if (lastMessage.type === 'error') {
        setIsTyping(false);
        toast({
          title: "Error",
          description: lastMessage.message,
          variant: "destructive",
        });
      }
    }
  }, [lastMessage, toast]);

  // Handle voice recognition transcript
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputValue,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Send message via WebSocket
    sendMessage({
      type: 'chat',
      content: inputValue,
      history: messages.slice(-10), // Send last 10 messages for context
    });

    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // TODO: Implement file upload logic
      toast({
        title: "File Upload",
        description: `Selected file: ${file.name}`,
      });
    }
  };

  const handleMessageAction = (action: string, data?: any) => {
    switch (action) {
      case 'call':
        toast({
          title: "Call Initiated",
          description: `Calling ${data.name}...`,
        });
        break;
      case 'schedule':
        onQuickAction('add-event');
        break;
      case 'edit':
        onQuickAction('edit-contact');
        break;
      case 'check-schedule':
        onQuickAction('today-schedule');
        break;
      case 'review-dancers':
        onQuickAction('all-contacts');
        break;
      case 'create-form':
        onQuickAction('create-form');
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
              <p className="text-sm text-gray-400">
                {readyState === 1 ? 'Ready to help with club operations' : 'Connecting...'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {voiceSupported && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleVoiceToggle}
                className={isListening ? 'text-red-400' : 'text-gray-400 hover:text-white'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <Camera className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-400 hover:text-white"
              onClick={handleFileUpload}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onAction={handleMessageAction}
            />
          ))}
          
          {isTyping && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                  <span className="text-xs text-gray-400 ml-2">AI is typing...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-900">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Ask me anything about the club, schedules, or contacts..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 pr-20"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleFileUpload}
                className="text-gray-400 hover:text-white"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              {voiceSupported && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleVoiceToggle}
                  className={isListening ? 'text-red-400' : 'text-gray-400 hover:text-white'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || readyState !== 1}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Quick Actions Bar */}
        <div className="flex items-center space-x-2 mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
            onClick={() => onQuickAction('today-schedule')}
          >
            <Calendar className="w-4 h-4 mr-1" />
            Today's Schedule
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
            onClick={() => onQuickAction('all-contacts')}
          >
            <Users className="w-4 h-4 mr-1" />
            All Contacts
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
            onClick={() => onQuickAction('sales-report')}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Sales Report
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
            onClick={() => onQuickAction('create-form')}
          >
            <FileText className="w-4 h-4 mr-1" />
            Create Form
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,audio/*,.pdf,.doc,.docx"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
