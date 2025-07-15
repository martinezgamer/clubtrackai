import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/use-websocket';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';
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
  const [isContinuousMode, setIsContinuousMode] = useState(false);
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
  
  const { speak, stop, isSpeaking } = useTextToSpeech();

  // Add welcome message on mount
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      content: "Hey there! Sam here, your chill AI buddy for club management. I'm all set up and ready to help with contacts, scheduling, forms, and whatever else you need. I can also whip up custom tables for any data you want to track. What's going on today?",
      sender: 'ai',
      timestamp: new Date().toISOString(),
    };
    setMessages([welcomeMessage]);
    
    // Auto-speak the welcome message only once
    const timer = setTimeout(() => {
      if (!isSpeaking) {
        speak(welcomeMessage.content);
      }
    }, 1000); // Delay to ensure page is loaded
    
    return () => clearTimeout(timer);
  }, []); // Remove speak dependency to avoid re-runs

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        if (lastMessage.type === 'chat') {
          setIsTyping(false);
          const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            content: lastMessage.content,
            sender: 'ai',
            timestamp: lastMessage.timestamp || new Date().toISOString(),
            messageType: lastMessage.messageType,
            action: lastMessage.action,
            data: lastMessage.data,
            metadata: lastMessage.data ? {
              type: lastMessage.messageType,
              data: lastMessage.data
            } : undefined
          };
          setMessages(prev => [...prev, aiMessage]);
          
          // Auto-speak AI responses for hands-free operation (only if not already speaking)
          if (aiMessage.content && !isSpeaking) {
            setTimeout(() => {
              try {
                speak(aiMessage.content);
              } catch (speakError) {
                console.warn('Text-to-speech error:', speakError);
              }
            }, 100); // Small delay to avoid conflicts
          }
        } else if (lastMessage.type === 'error') {
          setIsTyping(false);
          toast({
            title: "Error",
            description: lastMessage.message,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        setIsTyping(false);
        toast({
          title: "Error",
          description: "Failed to process message",
          variant: "destructive",
        });
      }
    }
  }, [lastMessage, toast]);

  // Handle voice recognition transcript
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

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

    try {
      // Send message via WebSocket
      sendMessage({
        type: 'chat',
        content: inputValue,
        sessionId: 'bobby-session',
        history: messages.slice(-10), // Send last 10 messages for context
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      toast({
        title: "Connection Error",
        description: "Failed to send message. Please check your connection.",
        variant: "destructive",
      });
    }

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
      // If we have transcript, send it immediately
      if (transcript.trim()) {
        setInputValue(transcript);
        resetTranscript();
        // Auto-send the message after a short delay
        setTimeout(() => {
          handleSendMessage();
        }, 100);
      }
    } else {
      // Stop any current speech before starting to listen
      if (isSpeaking) {
        stop();
      }
      startListening();
    }
  };

  // Auto-send voice input when user stops speaking
  useEffect(() => {
    if (transcript && !isListening && transcript.trim().length > 0) {
      setInputValue(transcript);
      // Auto-send after user stops speaking
      const timer = setTimeout(() => {
        if (transcript.trim()) {
          handleSendMessage();
          if (isContinuousMode) {
            // In continuous mode, start listening again after AI response
            setTimeout(() => {
              if (!isSpeaking) {
                startListening();
              }
            }, 2000);
          }
        }
        resetTranscript();
      }, 1500); // 1.5 second delay to ensure user is done speaking
      
      return () => clearTimeout(timer);
    }
  }, [transcript, isListening, isContinuousMode, isSpeaking, startListening]);

  // Keyboard shortcuts for voice activation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Spacebar for push-to-talk (when not typing in input)
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (!isListening) {
          if (isSpeaking) {
            stop();
          }
          startListening();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (isListening) {
          stopListening();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isListening, isSpeaking, startListening, stopListening, stop]);

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Create form data to send the file
        const formData = new FormData();
        formData.append('file', file);
        
        // Send the file to the chat with context
        const fileMessage = `I'm uploading a file: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)} KB). Please analyze it and help me with it.`;
        
        // Send the text message first
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          content: fileMessage,
          sender: 'user',
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsTyping(true);
        
        // Send to WebSocket
        sendMessage({
          type: 'chat',
          content: fileMessage,
          file: file,
          sessionId: 'default'
        });
        
        toast({
          title: "File Uploaded",
          description: `Successfully uploaded ${file.name}`,
        });
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: "Upload Failed",
          description: "Failed to upload file. Please try again.",
          variant: "destructive",
        });
      }
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
      case 'create-new':
        onQuickAction('store-dancer');
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
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-400 hover:text-white"
              onClick={handleFileUpload}
            >
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
        
        {/* Voice Status Indicator */}
        {voiceSupported && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {isListening && (
                <div className="flex items-center space-x-2 text-red-400">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                  <span className="text-xs">Listening...</span>
                </div>
              )}
              {isSpeaking && (
                <div className="flex items-center space-x-2 text-blue-400">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <span className="text-xs">Speaking...</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-xs text-gray-400">
                Hold SPACE to talk • Click mic to toggle
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsContinuousMode(!isContinuousMode)}
                className={`text-xs ${isContinuousMode ? 'text-green-400' : 'text-gray-400'}`}
              >
                {isContinuousMode ? 'Continuous ON' : 'Continuous OFF'}
              </Button>
            </div>
          </div>
        )}

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
