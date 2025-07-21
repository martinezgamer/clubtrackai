import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Calendar, Edit, Trash2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface ContactCardProps {
  contact: {
    id: number;
    name: string;
    nickname?: string;
    stageName?: string;
    role: string;
    phone?: string;
    email?: string;
    photoUrl?: string;
    status: string;
    notes?: string;
    lastContact?: string;
    createdAt: string;
  };
  onEdit: (contact: any) => void;
  onDelete: (id: number) => void;
  onCall: (phone: string) => void;
  onEmail: (email: string) => void;
  onSchedule: (contact: any) => void;
  onMessage: (contact: any) => void;
}

export function ContactCard({ 
  contact, 
  onEdit, 
  onDelete, 
  onCall, 
  onEmail, 
  onSchedule, 
  onMessage 
}: ContactCardProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'inactive': return 'bg-gray-500/20 text-gray-400';
      case 'problematic': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'dancer': return 'bg-purple-500/20 text-purple-400';
      case 'staff': return 'bg-blue-500/20 text-blue-400';
      case 'regular': return 'bg-green-500/20 text-green-400';
      case 'friend': return 'bg-yellow-500/20 text-yellow-400';
      case 'family': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={contact.photoUrl} alt={contact.name} />
            <AvatarFallback className="text-lg">
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white truncate">
                  {contact.name}
                  {contact.nickname && (
                    <span className="text-gray-400 font-normal ml-2">
                      "{contact.nickname}"
                    </span>
                  )}
                </h3>
                {contact.stageName && contact.role === 'dancer' && (
                  <p className="text-purple-400 text-sm">Stage: {contact.stageName}</p>
                )}
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={getRoleColor(contact.role)}>
                    {contact.role}
                  </Badge>
                  <Badge className={getStatusColor(contact.status)}>
                    {contact.status}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onEdit(contact)}
                  className="text-gray-400 hover:text-white"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onDelete(contact.id)}
                  className="text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-3 space-y-1">
              {contact.phone && (
                <div className="flex items-center text-sm text-gray-400">
                  <Phone className="w-4 h-4 mr-2" />
                  <span>{contact.phone}</span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center text-sm text-gray-400">
                  <Mail className="w-4 h-4 mr-2" />
                  <span>{contact.email}</span>
                </div>
              )}
              {contact.lastContact && (
                <div className="flex items-center text-sm text-gray-400">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Last contact: {format(new Date(contact.lastContact), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
            
            {contact.notes && (
              <div className="mt-3 p-2 bg-gray-900 rounded text-sm text-gray-300">
                {contact.notes}
              </div>
            )}
            
            <div className="flex items-center space-x-2 mt-4">
              {contact.phone && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onCall(contact.phone!)}
                  className="bg-blue-500/20 border-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Call
                </Button>
              )}
              {contact.email && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onEmail(contact.email!)}
                  className="bg-green-500/20 border-green-500/20 text-green-400 hover:bg-green-500/30"
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onSchedule(contact)}
                className="bg-purple-500/20 border-purple-500/20 text-purple-400 hover:bg-purple-500/30"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Schedule
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onMessage(contact)}
                className="bg-orange-500/20 border-orange-500/20 text-orange-400 hover:bg-orange-500/30"
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Chat
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
