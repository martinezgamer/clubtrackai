import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, Settings, Brain, CheckSquare, UserPlus, FileText, 
  CalendarPlus, Clock, Phone, Calendar, Edit, Users, TrendingUp, Plus
} from 'lucide-react';
import { contactsApi, memoryApi, calendarApi } from '@/lib/api';
import { format } from 'date-fns';

interface SidebarProps {
  onContactSelect: (contact: any) => void;
  onQuickAction: (action: string) => void;
}

export function Sidebar({ onContactSelect, onQuickAction }: SidebarProps) {
  const [activeTab, setActiveTab] = useState('memory');

  const { data: contacts = [] } = useQuery({
    queryKey: ['/api/contacts'],
    queryFn: () => contactsApi.getAll({ status: 'active' }),
  });

  const { data: memoryItems = [] } = useQuery({
    queryKey: ['/api/memory'],
    queryFn: () => memoryApi.getAll(),
  });

  const { data: todaysEvents = [] } = useQuery({
    queryKey: ['/api/calendar/events', new Date().toISOString().split('T')[0]],
    queryFn: () => calendarApi.getEvents(
      new Date().toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    ),
  });

  // Ensure data is always an array
  const safeContacts = Array.isArray(contacts) ? contacts : [];
  const safeMemoryItems = Array.isArray(memoryItems) ? memoryItems : [];
  const safeTodaysEvents = Array.isArray(todaysEvents) ? todaysEvents : [];

  const getContactInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-400';
      case 'problematic': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'dancer': return 'bg-purple-500/20 text-purple-400';
      case 'staff': return 'bg-blue-500/20 text-blue-400';
      case 'regular': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="w-80 bg-gray-900 border-r border-gray-700 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Club AI</h1>
              <p className="text-sm text-gray-400">Bobby's Assistant</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onQuickAction('settings')}>
            <Settings className="w-4 h-4 text-gray-400" />
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="p-4 border-b border-gray-700">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="memory" className="text-xs">
              <Brain className="w-4 h-4 mr-1" />
              Memory
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs">
              <CheckSquare className="w-4 h-4 mr-1" />
              Tasks
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
            onClick={() => onQuickAction('store-dancer')}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Store Dancer
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20"
            onClick={() => onQuickAction('create-form')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Create Form
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
            onClick={() => onQuickAction('add-event')}
          >
            <CalendarPlus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        {/* Recent Recalls */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Recent Recalls</h3>
          <div className="space-y-2">
            {safeMemoryItems.slice(0, 3).map((item) => (
              <Card key={item.id} className="bg-gray-800 border-gray-700">
                <CardContent className="p-3">
                  <p className="text-sm text-white">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {format(new Date(item.createdAt), 'MMM d, h:mm a')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Active Contacts */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Active Contacts</h3>
          <div className="space-y-2">
            {safeContacts.slice(0, 10).map((contact) => (
              <div 
                key={contact.id}
                className="flex items-center space-x-3 p-2 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                onClick={() => onContactSelect(contact)}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={contact.photoUrl} alt={contact.name} />
                  <AvatarFallback className="text-xs">
                    {getContactInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{contact.name}</p>
                  <Badge variant="secondary" className={`text-xs ${getRoleColor(contact.role)}`}>
                    {contact.role}
                  </Badge>
                </div>
                <div className={`w-2 h-2 rounded-full ${getStatusColor(contact.status)}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Today's Schedule</h3>
          <div className="space-y-2">
            {safeTodaysEvents.length === 0 ? (
              <p className="text-sm text-gray-400">No events scheduled for today</p>
            ) : (
              safeTodaysEvents.map((event) => (
                <Card key={event.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white">{event.title}</p>
                      <span className="text-xs text-gray-400">
                        {format(new Date(event.startTime), 'h:mm a')}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-xs text-gray-400 mt-1">{event.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Quick Actions Bar */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-400 hover:text-white"
            onClick={() => onQuickAction('today-schedule')}
          >
            <Calendar className="w-4 h-4 mr-1" />
            Today
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-400 hover:text-white"
            onClick={() => onQuickAction('all-contacts')}
          >
            <Users className="w-4 h-4 mr-1" />
            Contacts
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-400 hover:text-white"
            onClick={() => onQuickAction('sales-report')}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Sales
          </Button>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button 
          className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
          onClick={() => onQuickAction('create-new')}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
