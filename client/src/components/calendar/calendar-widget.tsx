import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { calendarApi } from '@/lib/api';
import { CalendarIcon, Clock, Users, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { z } from 'zod';

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  location: z.string().optional(),
  eventType: z.string().default('meeting'),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface CalendarWidgetProps {
  selectedContact?: any;
  onSave: (event: any) => void;
  onCancel: () => void;
}

export function CalendarWidget({ selectedContact, onSave, onCancel }: CalendarWidgetProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: selectedContact ? `Meeting with ${selectedContact.name}` : '',
      description: '',
      startTime: '',
      endTime: '',
      location: '',
      eventType: 'meeting',
      isRecurring: false,
      recurringPattern: '',
    },
  });

  const isRecurring = watch('isRecurring');
  const eventType = watch('eventType');

  const createEventMutation = useMutation({
    mutationFn: (eventData: any) => calendarApi.createEvent(eventData),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      onSave(event);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EventFormData) => {
    const startDateTime = new Date(selectedDate);
    const endDateTime = new Date(selectedDate);
    
    // Parse time strings and set on the selected date
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);
    
    startDateTime.setHours(startHour, startMinute, 0, 0);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    const eventData = {
      ...data,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      attendees: selectedContact ? [selectedContact.id] : [],
    };

    createEventMutation.mutate(eventData);
  };

  const eventTypeOptions = [
    { value: 'meeting', label: 'Meeting', icon: Users },
    { value: 'shift', label: 'Shift', icon: Clock },
    { value: 'personal', label: 'Personal', icon: Users },
    { value: 'reminder', label: 'Reminder', icon: Clock },
  ];

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-500/20 text-blue-400';
      case 'shift': return 'bg-purple-500/20 text-purple-400';
      case 'personal': return 'bg-green-500/20 text-green-400';
      case 'reminder': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-white">
          {selectedContact ? `Schedule with ${selectedContact.name}` : 'Create Calendar Event'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Event Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-white">Event Title *</Label>
              <Input
                id="title"
                {...register('title')}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Enter event title"
              />
              {errors.title && (
                <p className="text-red-400 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description" className="text-white">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Optional event description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="eventType" className="text-white">Event Type</Label>
              <Select onValueChange={(value) => setValue('eventType', value)} defaultValue="meeting">
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-2">
                        <option.icon className="w-4 h-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location" className="text-white">Location</Label>
              <Input
                id="location"
                {...register('location')}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Event location (optional)"
              />
            </div>
          </div>

          {/* Date & Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-white">Date</Label>
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setShowCalendar(false);
                      }
                    }}
                    initialFocus
                    className="bg-gray-800"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="startTime" className="text-white">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                {...register('startTime')}
                className="bg-gray-700 border-gray-600 text-white"
              />
              {errors.startTime && (
                <p className="text-red-400 text-sm mt-1">{errors.startTime.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="endTime" className="text-white">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                {...register('endTime')}
                className="bg-gray-700 border-gray-600 text-white"
              />
              {errors.endTime && (
                <p className="text-red-400 text-sm mt-1">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          {/* Recurring Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="isRecurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setValue('isRecurring', checked)}
              />
              <Label htmlFor="isRecurring" className="text-white">
                Recurring Event
              </Label>
            </div>

            {isRecurring && (
              <div>
                <Label htmlFor="recurringPattern" className="text-white">
                  Recurring Pattern
                </Label>
                <Select onValueChange={(value) => setValue('recurringPattern', value)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Contact Info */}
          {selectedContact && (
            <Card className="bg-gray-900 border-gray-600">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{selectedContact.name}</p>
                    <p className="text-gray-400 text-sm">{selectedContact.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Event Type Preview */}
          <div className="p-4 bg-gray-900 rounded-lg border border-gray-600">
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-1 rounded-full text-sm ${getEventTypeColor(eventType)}`}>
                {eventTypeOptions.find(opt => opt.value === eventType)?.label}
              </div>
              <span className="text-gray-400">•</span>
              <span className="text-gray-400">
                {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'No date selected'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createEventMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createEventMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Event'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
