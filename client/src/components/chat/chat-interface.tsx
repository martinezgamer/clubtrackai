import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/use-websocket';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';
import { MessageBubble } from './message-bubble';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/components/auth/auth-provider';
import { 
  Mic, MicOff, Paperclip, Send, Calendar, 
  Users, TrendingUp, FileText, Loader2, Image,
  File, ChevronDown, Eye, Save, Table, PieChart, 
  FileSpreadsheet, Database, Camera, Palette, Settings,
  Radio, RadioIcon, Zap, Volume2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  imageUrl?: string;
  imageDescription?: string;
  metadata?: {
    type?: 'contact-profile' | 'form' | 'calendar' | 'social-media';
    data?: any;
  };
}

interface ChatInterfaceProps {
  onQuickAction: (action: string) => void;
  className?: string;
}

export function ChatInterface({ onQuickAction, className }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [enhancedAIVisual, setEnhancedAIVisual] = useState(false);
  const [autoSaveChats, setAutoSaveChats] = useState(true);
  const [showAISettings, setShowAISettings] = useState(false);
  const [createMode, setCreateMode] = useState<'table' | 'chart' | 'spreadsheet' | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Generate unique session ID per tab/window with user identification
  const sessionId = useMemo(() => {
    if (!user) return 'anonymous-session';
    
    // Create a unique session ID that includes user ID and a window-specific identifier
    const windowId = sessionStorage.getItem('chatWindowId') || 
      (() => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('chatWindowId', id);
        return id;
      })();
    
    return `${user.id}-${windowId}`;
  }, [user]);

  const { lastMessage, sendMessage, readyState } = useWebSocket('/ws');
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript,
    isSupported: voiceSupported,
    error 
  } = useVoiceRecognition();
  
  const { speak, stop, isSpeaking } = useTextToSpeech();

  // Add welcome message on mount (only once per session)
  useEffect(() => {
    const welcomeShown = sessionStorage.getItem('samWelcomeShown');
    
    if (!welcomeShown) {
      const welcomeMessages = [
        "Hey! Sam here, ready to help you manage the club. What's the situation today?",
        "What's up? Sam's online and ready to handle whatever you need - contacts, scheduling, you name it.",
        "Hey there! Sam checking in. I'm your chill AI assistant for all the club management stuff. What's going on?",
        "Yo! Sam here. Ready to help with dancers, schedules, forms, or whatever else you need sorted. What's up?",
        "Hey! Sam's here and ready to roll. Need help with contacts, scheduling, or just want to chat about club operations?",
        "What's good? Sam here, your laid-back AI buddy for club management. Ready to tackle whatever you throw at me.",
        "Hey there! Sam reporting for duty. I'm here to help with all your club management needs. What's the plan today?",
        "Sup! Sam here, ready to help you keep everything organized. Contacts, schedules, forms - I got you covered.",
      ];
      
      const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
      
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        content: randomWelcome,
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
      
      // Mark welcome as shown for this session
      sessionStorage.setItem('samWelcomeShown', 'true');
      
      // Auto-speak the welcome message only once
      const timer = setTimeout(() => {
        if (!isSpeaking) {
          speak(welcomeMessage.content);
        }
      }, 1000); // Delay to ensure page is loaded
      
      return () => clearTimeout(timer);
    } else {
      // Just set an empty messages array if welcome was already shown
      setMessages([]);
    }
  }, []); // Remove speak dependency to avoid re-runs

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        if (lastMessage.type === 'chat') {
          setIsTyping(false);
          const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            content: lastMessage.content || '',
            sender: 'ai',
            timestamp: lastMessage.timestamp || new Date().toISOString(),
            imageDescription: lastMessage.imageDescription,
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
                // In live mode, automatically start listening again after AI finishes speaking
                if (isLiveMode && voiceSupported) {
                  setTimeout(() => {
                    if (!isListening && !isSpeaking) {
                      startListening();
                    }
                  }, 2000); // Wait 2 seconds after speaking ends
                }
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
      // In live mode, automatically send the message when transcript is received
      if (isLiveMode && transcript.trim()) {
        setTimeout(() => {
          handleSendMessage();
          resetTranscript();
        }, 1000); // Small delay to ensure the transcript is complete
      }
    }
  }, [transcript, isLiveMode]);

  // Live mode management
  useEffect(() => {
    if (isLiveMode && voiceSupported && !isListening && !isSpeaking) {
      // Auto-start listening when live mode is enabled
      const timer = setTimeout(() => {
        startListening();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLiveMode, voiceSupported, isListening, isSpeaking]);

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
      // Send message via WebSocket with unique session ID and user identification
      sendMessage({
        type: 'chat',
        content: inputValue,
        sessionId: sessionId,
        userId: user?.id || 'anonymous',
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
    console.log('Voice toggle clicked, isListening:', isListening, 'voiceSupported:', voiceSupported);
    
    if (!voiceSupported) {
      toast({
        title: "Voice Not Supported",
        description: "Your browser doesn't support voice recognition. Try Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

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

  const handleLiveModeToggle = () => {
    const newLiveMode = !isLiveMode;
    setIsLiveMode(newLiveMode);
    
    if (newLiveMode) {
      // Starting live mode
      toast({
        title: "Live Mode ON",
        description: "Continuous conversation activated. Talk naturally with Sam!",
        duration: 3000,
      });
      
      // Start listening immediately if voice is supported
      if (voiceSupported && !isListening) {
        setTimeout(() => startListening(), 500);
      }
    } else {
      // Stopping live mode
      toast({
        title: "Live Mode OFF",
        description: "Switched to manual conversation mode.",
        duration: 2000,
      });
      
      // Stop current listening/speaking
      if (isListening) {
        stopListening();
      }
      if (isSpeaking) {
        stop();
      }
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
  }, [transcript, isListening, isContinuousMode, isSpeaking, startListening, handleSendMessage, resetTranscript]);

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

  const handleImageUpload = () => {
    imageInputRef.current?.click();
  };

  const handleDocumentUpload = () => {
    documentInputRef.current?.click();
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Check if it's an image file
        if (file.type.startsWith('image/')) {
          // Handle image upload with reading capability
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const imageData = e.target?.result as string;
              const base64Data = imageData.split(',')[1]; // Remove data URL prefix
              
              const fileMessage = `I'm uploading an image: ${file.name}. Please read and analyze everything you see in it.`;
              
              // Send the text message first with image preview
              const userMessage: ChatMessage = {
                id: `user-${Date.now()}`,
                content: fileMessage,
                sender: 'user',
                timestamp: new Date().toISOString(),
                imageUrl: imageData, // Store the full data URL for preview
              };
              
              setMessages(prev => [...prev, userMessage]);
              setInputValue('');
              setIsTyping(true);
              
              // Send image data to WebSocket
              sendMessage({
                type: 'image',
                imageData: base64Data,
                imageMimeType: file.type,
                userMessage: fileMessage,
                sessionId: sessionId,
                userId: user?.id || 'anonymous'
              });
            } catch (error) {
              console.error('Error processing image:', error);
              toast({
                title: "Upload Failed",
                description: "Failed to process image. Please try again.",
                variant: "destructive",
              });
              setIsTyping(false);
            }
          };
          reader.readAsDataURL(file);
        } else {
          // Handle non-image files
          const fileMessage = `I'm uploading a file: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)} KB). Please help me with it.`;
          
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
            sessionId: sessionId,
            userId: user?.id || 'anonymous'
          });
        }
        
        toast({
          title: "File Uploaded",
          description: `Successfully uploaded ${file.name}`,
        });
        
        // Reset file input
        if (imageInputRef.current) {
          imageInputRef.current.value = '';
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

  const handleDocumentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Check if it's a supported document type
        const supportedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!supportedTypes.includes(file.type)) {
          toast({
            title: "Unsupported File Type",
            description: "Please upload PDF, DOC, DOCX, or TXT files only.",
            variant: "destructive",
          });
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const fileData = e.target?.result;
            let base64Data = '';
            
            if (typeof fileData === 'string') {
              base64Data = fileData.split(',')[1]; // Remove data URL prefix
            } else if (fileData instanceof ArrayBuffer) {
              base64Data = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(fileData))));
            }
            
            const fileMessage = `I'm uploading a document: ${file.name}. Please process and analyze the content.`;
            
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
            
            // Send document data to WebSocket
            sendMessage({
              type: 'document',
              documentData: base64Data,
              documentMimeType: file.type,
              documentName: file.name,
              userMessage: fileMessage,
              sessionId: sessionId,
              userId: user?.id || 'anonymous'
            });
          } catch (error) {
            console.error('Error processing document:', error);
            toast({
              title: "Upload Failed",
              description: "Failed to process document. Please try again.",
              variant: "destructive",
            });
            setIsTyping(false);
          }
        };
        
        if (file.type === 'application/pdf') {
          reader.readAsArrayBuffer(file);
        } else {
          reader.readAsDataURL(file);
        }
        
        toast({
          title: "Document Uploaded",
          description: `Successfully uploaded ${file.name}`,
        });
        
        // Reset file input
        if (documentInputRef.current) {
          documentInputRef.current.value = '';
        }
        
      } catch (error) {
        console.error('Error uploading document:', error);
        toast({
          title: "Upload Failed",
          description: "Failed to upload document. Please try again.",
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
    <div className={`flex flex-col h-full overflow-hidden ${className || ''}`}>
      {/* Chat Header */}
      <div className="flex-shrink-0 p-3 md:p-4 border-b border-gray-700 bg-gray-900">
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
          <div className="text-xs text-gray-500">
            Connected • Ready
          </div>
        </div>
      </div>

      {/* Live Mode Header Indicator */}
      {isLiveMode && (
        <div className="bg-gradient-to-r from-green-600 to-green-500 px-4 py-2 text-center">
          <div className="flex items-center justify-center space-x-2">
            <Radio className="w-4 h-4 text-white animate-pulse" />
            <span className="text-sm font-medium text-white">LIVE CONVERSATION MODE</span>
            <Radio className="w-4 h-4 text-white animate-pulse" />
          </div>
          <p className="text-xs text-green-100 mt-1">Talk naturally with Sam - just speak and have a conversation!</p>
        </div>
      )}

      {/* Chat Messages - Scrollable container */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-3 md:p-4" ref={scrollAreaRef}>
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
      </div>

      {/* Chat Input - Mobile optimized */}
      <div className="flex-shrink-0 p-2 md:p-4 border-t border-gray-700 bg-gray-900">
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Ask Sam anything..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 pr-16 md:pr-20 text-sm md:text-base"
            />
            <div className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1 md:space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-gray-400 hover:text-white p-1 md:p-2"
                  >
                    <Paperclip className="w-3 h-3 md:w-4 md:h-4 mr-0 md:mr-1" />
                    <ChevronDown className="w-2 h-2 md:w-3 md:h-3 hidden md:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleImageUpload}>
                    <Image className="w-4 h-4 mr-2" />
                    Upload Image
                    {enhancedAIVisual && <Badge variant="secondary" className="ml-auto text-xs">Enhanced</Badge>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDocumentUpload}>
                    <File className="w-4 h-4 mr-2" />
                    Upload Document
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {setInputValue('Create a table for me'); setTimeout(() => handleSendMessage(), 100);}}>
                    <Table className="w-4 h-4 mr-2" />
                    Create Table
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {setInputValue('Create a chart for me'); setTimeout(() => handleSendMessage(), 100);}}>
                    <PieChart className="w-4 h-4 mr-2" />
                    Create Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {setInputValue('Create a spreadsheet for me'); setTimeout(() => handleSendMessage(), 100);}}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Create Spreadsheet
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowAISettings(!showAISettings)}>
                    <Settings className="w-4 h-4 mr-2" />
                    AI Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {voiceSupported && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleVoiceToggle}
                  className={`${isListening ? 'text-red-400' : 'text-gray-400 hover:text-white'} p-1 md:p-2`}
                >
                  {isListening ? <MicOff className="w-3 h-3 md:w-4 md:h-4" /> : <Mic className="w-3 h-3 md:w-4 md:h-4" />}
                </Button>
              )}
            </div>
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || readyState !== 1}
            className="bg-blue-600 hover:bg-blue-700 p-2 md:p-3"
            size="sm"
          >
            <Send className="w-3 h-3 md:w-4 md:h-4" />
          </Button>
          {voiceSupported && (
            <Button 
              onClick={handleLiveModeToggle}
              className={`${isLiveMode ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'} p-2 md:p-3 transition-all duration-200`}
              size="sm"
            >
              <Radio className={`w-3 h-3 md:w-4 md:h-4 ${isLiveMode ? 'animate-pulse' : ''}`} />
            </Button>
          )}
        </div>
        
        {/* Hidden file inputs */}
        <input
          type="file"
          ref={imageInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageChange}
        />
        <input
          type="file"
          ref={documentInputRef}
          accept=".pdf,.doc,.docx,.txt"
          style={{ display: 'none' }}
          onChange={handleDocumentChange}
        />
        
        {/* Voice Status Indicator */}
        {voiceSupported && (
          <div className="flex items-center justify-between mb-2 mt-2">
            <div className="flex items-center space-x-4">
              {isLiveMode && (
                <div className="flex items-center space-x-2 text-green-400">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span className="text-xs font-medium">LIVE MODE</span>
                </div>
              )}
              {isListening && (
                <div className="flex items-center space-x-2 text-red-400">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                  <span className="text-xs">Listening...</span>
                </div>
              )}
              {isSpeaking && (
                <div className="flex items-center space-x-2 text-blue-400">
                  <Volume2 className="w-3 h-3 animate-pulse" />
                  <span className="text-xs">Sam is speaking...</span>
                </div>
              )}
              {error && (
                <div className="flex items-center space-x-2 text-yellow-400">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                  <span className="text-xs">Need mic permission</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-xs text-gray-400">
                {isLiveMode ? 'Live conversation active' : error ? 'Click mic for permission' : 'Hold SPACE to talk'}
              </div>
              {!isLiveMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsContinuousMode(!isContinuousMode)}
                  className={`text-xs ${isContinuousMode ? 'text-green-400' : 'text-gray-400'}`}
                >
                  {isContinuousMode ? 'Continuous ON' : 'Continuous OFF'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Enhanced AI Settings Panel */}
        {showAISettings && (
          <Card className="mt-3 bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center">
                <Eye className="w-4 h-4 mr-2" />
                AI Visual Enhancement Settings
                <Badge variant="secondary" className="ml-auto text-xs">
                  Profile: {user?.username || 'Default'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="enhanced-ai-visual" className="text-sm text-gray-300">
                  Enhanced AI Visual
                </Label>
                <Switch 
                  id="enhanced-ai-visual"
                  checked={enhancedAIVisual}
                  onCheckedChange={setEnhancedAIVisual}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-save-chats" className="text-sm text-gray-300">
                  Auto-Save Chats (Profile-Specific)
                </Label>
                <Switch 
                  id="auto-save-chats"
                  checked={autoSaveChats}
                  onCheckedChange={setAutoSaveChats}
                />
              </div>
              <div className="text-xs text-gray-400 p-2 bg-gray-900 rounded">
                <div className="flex items-center mb-1">
                  <Save className="w-3 h-3 mr-1" />
                  Profile-specific data storage active
                </div>
                <div>• Enhanced AI: Advanced image analysis, OCR, table creation</div>
                <div>• Chat History: Saved per user profile with sync for important data</div>
                <div>• Content Creation: Tables, charts, spreadsheets via chat</div>
              </div>
            </CardContent>
          </Card>
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
            onClick={() => onQuickAction('enhanced-form-creator')}
          >
            <FileText className="w-4 h-4 mr-1" />
            AI Form Creator
          </Button>
        </div>
      </div>
    </div>
  );
}
