import { useState } from 'react';
import { Sidebar } from '@/components/sidebar/sidebar';
import { ChatInterface } from '@/components/chat/chat-interface';
import { ContactForm } from '@/components/contacts/contact-form';
import { FormBuilder } from '@/components/forms/form-builder';
import { CalendarWidget } from '@/components/calendar/calendar-widget';
import SocialMedia from '@/pages/social-media';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ContactCard } from '@/components/contacts/contact-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsApi } from '@/lib/api';
import { Search, Filter } from 'lucide-react';

type ModalType = 'none' | 'store-dancer' | 'create-form' | 'add-event' | 'edit-contact' | 'all-contacts' | 'social-media' | 'settings';

export default function Home() {
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [contactsFilter, setContactsFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['/api/contacts', roleFilter],
    queryFn: () => contactsApi.getAll(roleFilter ? { role: roleFilter } : {}),
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: number) => contactsApi.delete(id),
    onSuccess: () => {
      toast({
        title: "Contact deleted",
        description: "The contact has been removed from your database.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'store-dancer':
        setActiveModal('store-dancer');
        setSelectedContact(null);
        break;
      case 'create-form':
        setActiveModal('create-form');
        break;
      case 'add-event':
        setActiveModal('add-event');
        break;
      case 'edit-contact':
        setActiveModal('edit-contact');
        break;
      case 'all-contacts':
        setActiveModal('all-contacts');
        break;
      case 'social-media':
        setActiveModal('social-media');
        break;
      case 'create-new':
        setActiveModal('store-dancer');
        setSelectedContact(null);
        break;
      case 'today-schedule':
        setActiveModal('calendar');
        break;
      case 'sales-report':
        setActiveModal('sales');
        break;
      case 'settings':
        setActiveModal('settings');
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const handleContactSelect = (contact: any) => {
    setSelectedContact(contact);
    // You could open a contact detail modal here if needed
    toast({
      title: "Contact Selected",
      description: `Selected ${contact.name}`,
    });
  };

  const handleContactAction = (action: string, data: any) => {
    switch (action) {
      case 'edit':
        setSelectedContact(data);
        setActiveModal('edit-contact');
        break;
      case 'delete':
        if (window.confirm('Are you sure you want to delete this contact?')) {
          deleteContactMutation.mutate(data);
        }
        break;
      case 'call':
        window.open(`tel:${data}`, '_self');
        break;
      case 'email':
        window.open(`mailto:${data}`, '_self');
        break;
      case 'schedule':
        setSelectedContact(data);
        setActiveModal('add-event');
        break;
      case 'message':
        toast({
          title: "Message Feature",
          description: `Starting chat with ${data.name}`,
        });
        break;
      default:
        console.log('Unknown contact action:', action);
    }
  };

  const handleModalClose = () => {
    setActiveModal('none');
    setSelectedContact(null);
  };

  const handleFormSave = (contact: any) => {
    handleModalClose();
    toast({
      title: "Success",
      description: `Contact ${contact.name} saved successfully.`,
    });
  };

  const safeContacts = Array.isArray(contacts) ? contacts : [];
  const filteredContacts = safeContacts.filter(contact => 
    contact.name.toLowerCase().includes(contactsFilter.toLowerCase()) ||
    (contact.nickname && contact.nickname.toLowerCase().includes(contactsFilter.toLowerCase()))
  );

  const getModalTitle = () => {
    switch (activeModal) {
      case 'store-dancer':
        return selectedContact ? 'Edit Dancer' : 'Store New Dancer';
      case 'create-form':
        return 'Create New Form';
      case 'add-event':
        return 'Add Calendar Event';
      case 'edit-contact':
        return 'Edit Contact';
      case 'all-contacts':
        return 'All Contacts';
      case 'social-media':
        return 'Social Media Generator';
      case 'calendar':
        return 'Calendar';
      case 'sales':
        return 'Sales Report';
      case 'settings':
        return 'System Settings';
      default:
        return '';
    }
  };

  const getModalDescription = () => {
    switch (activeModal) {
      case 'store-dancer':
        return selectedContact ? 'Edit dancer information and preferences' : 'Add a new dancer to your club management system';
      case 'create-form':
        return 'Create a new form for data collection and feedback';
      case 'add-event':
        return 'Schedule a new event on your calendar';
      case 'edit-contact':
        return 'Edit contact information and preferences';
      case 'all-contacts':
        return 'View and manage all your contacts';
      case 'social-media':
        return 'Generate and manage social media content';
      case 'calendar':
        return 'View and manage your calendar events';
      case 'sales':
        return 'View sales reports and analytics';
      case 'settings':
        return 'Configure application settings and preferences';
      default:
        return 'Modal dialog window';
    }
  };

  const renderModalContent = () => {
    switch (activeModal) {
      case 'store-dancer':
      case 'edit-contact':
        return (
          <ContactForm
            contact={selectedContact}
            onSave={handleFormSave}
            onCancel={handleModalClose}
          />
        );
      case 'create-form':
        return (
          <FormBuilder
            onSave={(form) => {
              handleModalClose();
              toast({
                title: "Form Created",
                description: `Form "${form.title}" created successfully.`,
              });
            }}
            onCancel={handleModalClose}
          />
        );
      case 'add-event':
        return (
          <CalendarWidget
            selectedContact={selectedContact}
            onSave={(event) => {
              handleModalClose();
              toast({
                title: "Event Created",
                description: `Event "${event.title}" added to calendar.`,
              });
            }}
            onCancel={handleModalClose}
          />
        );
      case 'all-contacts':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search contacts..."
                  value={contactsFilter}
                  onChange={(e) => setContactsFilter(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                <option value="">All Roles</option>
                <option value="dancer">Dancers</option>
                <option value="staff">Staff</option>
                <option value="regular">Regulars</option>
                <option value="friend">Friends</option>
                <option value="family">Family</option>
              </select>
            </div>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {contactsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    {contactsFilter ? 'No contacts match your search.' : 'No contacts found.'}
                  </div>
                ) : (
                  filteredContacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onEdit={(contact) => handleContactAction('edit', contact)}
                      onDelete={(id) => handleContactAction('delete', id)}
                      onCall={(phone) => handleContactAction('call', phone)}
                      onEmail={(email) => handleContactAction('email', email)}
                      onSchedule={(contact) => handleContactAction('schedule', contact)}
                      onMessage={(contact) => handleContactAction('message', contact)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      case 'social-media':
        return <SocialMedia />;
      case 'calendar':
        return (
          <div className="space-y-4">
            <CalendarWidget
              selectedContact={selectedContact}
              onSave={(event) => {
                handleModalClose();
                toast({
                  title: "Event Created",
                  description: `Event "${event.title}" added to calendar.`,
                });
              }}
              onCancel={handleModalClose}
            />
          </div>
        );
      case 'sales':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Sales Report</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Today's Sales</h4>
                  <p className="text-2xl font-bold text-green-400">$450.00</p>
                  <p className="text-sm text-gray-300">12 transactions</p>
                </div>
                <div className="p-4 bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-white mb-2">This Week</h4>
                  <p className="text-2xl font-bold text-blue-400">$2,340.00</p>
                  <p className="text-sm text-gray-300">67 transactions</p>
                </div>
                <div className="p-4 bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Top Items</h4>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-300">Energy Drinks - $180</p>
                    <p className="text-sm text-gray-300">Snacks - $120</p>
                    <p className="text-sm text-gray-300">Accessories - $95</p>
                  </div>
                </div>
                <div className="p-4 bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Payment Methods</h4>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-300">Cash - 65%</p>
                    <p className="text-sm text-gray-300">Card - 30%</p>
                    <p className="text-sm text-gray-300">Digital - 5%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">System Settings</h3>
              <div className="space-y-3">
                <div className="p-4 bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Sam AI Assistant</h4>
                  <p className="text-sm text-gray-300">Voice recognition and text-to-speech enabled</p>
                  <div className="mt-3 space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500"
                      onClick={() => toast({ title: "Settings", description: "Voice settings updated" })}
                    >
                      Configure Voice
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500 ml-2"
                      onClick={() => toast({ title: "Settings", description: "AI personality updated" })}
                    >
                      AI Personality
                    </Button>
                  </div>
                </div>
                <div className="p-4 bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Database</h4>
                  <p className="text-sm text-gray-300">PostgreSQL connected and operational</p>
                </div>
                <div className="p-4 bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-white mb-2">WebSocket Connection</h4>
                  <p className="text-sm text-gray-300">Real-time chat enabled</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleModalClose} className="bg-blue-600 hover:bg-blue-700">
                Close
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar
        onContactSelect={handleContactSelect}
        onQuickAction={handleQuickAction}
      />
      <ChatInterface onQuickAction={handleQuickAction} />
      
      <Dialog open={activeModal !== 'none'} onOpenChange={handleModalClose}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{getModalTitle()}</DialogTitle>
            <DialogDescription className="text-gray-300">
              {getModalDescription()}
            </DialogDescription>
          </DialogHeader>
          {renderModalContent()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
