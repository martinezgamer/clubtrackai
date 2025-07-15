import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, User, Phone, Calendar, Edit, Copy, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    sender: 'user' | 'ai';
    timestamp: string;
    metadata?: {
      type?: 'contact-profile' | 'form' | 'calendar' | 'social-media';
      data?: any;
    };
  };
  onAction?: (action: string, data?: any) => void;
}

export function MessageBubble({ message, onAction }: MessageBubbleProps) {
  const isAI = message.sender === 'ai';
  const isUser = message.sender === 'user';

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could show a toast here
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const renderContactProfile = (contact: any) => (
    <Card className="bg-gray-800 border-gray-700 mb-4">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3 mb-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={contact.photoUrl} alt={contact.name} />
            <AvatarFallback>
              {contact.name.split(' ').map((n: string) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h4 className="font-semibold text-white">{contact.name}</h4>
            <p className="text-sm text-gray-400">{contact.role} • {contact.experience || 'New'}</p>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400">
                {contact.status}
              </Badge>
              {contact.issues && (
                <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-400">
                  {contact.issues}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-gray-400">Phone</p>
            <p className="text-white">{contact.phone || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-gray-400">Last Contact</p>
            <p className="text-white">{contact.lastContact || 'No recent contact'}</p>
          </div>
          <div>
            <p className="text-gray-400">Preferred Shifts</p>
            <p className="text-white">{contact.preferredShifts || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-gray-400">Performance</p>
            <p className="text-white">{contact.performance || 'Not rated'}</p>
          </div>
        </div>

        {contact.conversations && (
          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-300 mb-2">Recent Conversations:</h5>
            <div className="space-y-2">
              {contact.conversations.map((conv: any, index: number) => (
                <div key={index} className="p-3 bg-gray-900 rounded border border-gray-700">
                  <p className="text-sm text-white">{conv.topic}</p>
                  <p className="text-xs text-gray-400">{conv.date} • {conv.status}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => onAction?.('call', contact)}
          >
            <Phone className="w-4 h-4 mr-1" />
            Call
          </Button>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => onAction?.('schedule', contact)}
          >
            <Calendar className="w-4 h-4 mr-1" />
            Schedule
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onAction?.('edit', contact)}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderQuickActions = () => (
    <div className="flex flex-wrap gap-2 mt-3">
      <Button 
        variant="outline" 
        size="sm" 
        className="bg-blue-500/20 text-blue-400 border-blue-500/20 hover:bg-blue-500/30"
        onClick={() => onAction?.('check-schedule')}
      >
        Check today's schedule
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className="bg-green-500/20 text-green-400 border-green-500/20 hover:bg-green-500/30"
        onClick={() => onAction?.('review-dancers')}
      >
        Review dancer profiles
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className="bg-purple-500/20 text-purple-400 border-purple-500/20 hover:bg-purple-500/30"
        onClick={() => onAction?.('create-form')}
      >
        Create new form
      </Button>
    </div>
  );

  return (
    <div className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      <Avatar className={`w-8 h-8 flex-shrink-0 ${isUser ? 'bg-green-600' : 'bg-blue-600'}`}>
        <AvatarFallback>
          {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 max-w-2xl">
        <div className={`rounded-lg p-4 ${isUser ? 'bg-green-500/20 ml-auto' : 'bg-gray-800'}`}>
          {message.metadata?.type === 'contact-profile' && message.metadata.data ? (
            <>
              <p className="text-white mb-4">{message.content}</p>
              {renderContactProfile(message.metadata.data)}
            </>
          ) : (
            <p className="text-white whitespace-pre-wrap">{message.content}</p>
          )}
          
          {isAI && !message.metadata?.type && renderQuickActions()}
          
          {/* Copy button for AI messages */}
          {isAI && (
            <div className="flex items-center justify-between mt-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-400 hover:text-white"
                onClick={() => handleCopy(message.content)}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>
          )}
        </div>
        
        <p className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {format(new Date(message.timestamp), 'MMM d, h:mm a')}
        </p>
      </div>
    </div>
  );
}
