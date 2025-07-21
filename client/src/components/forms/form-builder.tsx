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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { formsApi } from '@/lib/api';
import { 
  Plus, Minus, GripVertical, Type, List, CheckSquare, 
  Calendar, Clock, Hash, Mail, Phone, Sparkles
} from 'lucide-react';
import { z } from 'zod';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringSchedule: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'time' | 'number' | 'email' | 'tel';
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface FormBuilderProps {
  onSave: (form: any) => void;
  onCancel: () => void;
}

export function FormBuilder({ onSave, onCancel }: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      isRecurring: false,
      recurringSchedule: '',
    },
  });

  const isRecurring = watch('isRecurring');

  const createFormMutation = useMutation({
    mutationFn: (formData: FormData & { fields: FormField[] }) => 
      formsApi.create(formData),
    onSuccess: (form) => {
      queryClient.invalidateQueries({ queryKey: ['/api/forms'] });
      onSave(form);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create form. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateFieldsMutation = useMutation({
    mutationFn: ({ formType, context }: { formType: string; context: string }) =>
      formsApi.generateQuestions(formType, context),
    onSuccess: (data: any) => {
      if (data.questions && data.questions.length > 0) {
        setFields(data.questions);
        toast({
          title: "Fields Generated",
          description: `Generated ${data.questions.length} form fields using AI.`,
        });
      }
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
      toast({
        title: "Error",
        description: "Failed to generate fields. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      required: false,
      options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2'] : undefined,
      placeholder: type === 'text' || type === 'textarea' ? 'Enter your answer...' : undefined,
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const addOption = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (field && field.options) {
      updateField(fieldId, {
        options: [...field.options, `Option ${field.options.length + 1}`]
      });
    }
  };

  const removeOption = (fieldId: string, optionIndex: number) => {
    const field = fields.find(f => f.id === fieldId);
    if (field && field.options) {
      updateField(fieldId, {
        options: field.options.filter((_, index) => index !== optionIndex)
      });
    }
  };

  const updateOption = (fieldId: string, optionIndex: number, value: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (field && field.options) {
      const newOptions = [...field.options];
      newOptions[optionIndex] = value;
      updateField(fieldId, { options: newOptions });
    }
  };

  const handleGenerateFields = () => {
    const formTitle = watch('title');
    const formDescription = watch('description');
    
    if (!formTitle) {
      toast({
        title: "Missing Information",
        description: "Please enter a form title before generating fields.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    generateFieldsMutation.mutate({
      formType: formTitle,
      context: formDescription || formTitle,
    });
  };

  const onSubmit = (data: FormData) => {
    if (fields.length === 0) {
      toast({
        title: "No Fields",
        description: "Please add at least one field to your form.",
        variant: "destructive",
      });
      return;
    }

    createFormMutation.mutate({
      ...data,
      fields: fields,
    });
  };

  const fieldTypeIcons = {
    text: Type,
    textarea: Type,
    select: List,
    checkbox: CheckSquare,
    radio: CheckSquare,
    date: Calendar,
    time: Clock,
    number: Hash,
    email: Mail,
    tel: Phone,
  };

  const getFieldIcon = (type: FormField['type']) => {
    const Icon = fieldTypeIcons[type] || Type;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Form Basic Info */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Form Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-white">Form Title *</Label>
            <Input
              id="title"
              {...register('title')}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="e.g., Daily Availability Form"
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
              placeholder="Brief description of the form's purpose..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isRecurring"
              checked={isRecurring}
              onCheckedChange={(checked) => setValue('isRecurring', checked)}
            />
            <Label htmlFor="isRecurring" className="text-white">
              Recurring Form
            </Label>
          </div>

          {isRecurring && (
            <div>
              <Label htmlFor="recurringSchedule" className="text-white">
                Recurring Schedule
              </Label>
              <Select onValueChange={(value) => setValue('recurringSchedule', value)}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            type="button"
            onClick={handleGenerateFields}
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Fields with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Field Types */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Add Fields</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {Object.entries(fieldTypeIcons).map(([type, Icon]) => (
              <Button
                key={type}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addField(type as FormField['type'])}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                <Icon className="w-4 h-4 mr-2" />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form Fields */}
      {fields.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Form Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <Card key={field.id} className="bg-gray-900 border-gray-600">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center space-x-2">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                          <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                            {getFieldIcon(field.type)}
                            <span className="ml-1">{field.type}</span>
                          </Badge>
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-white">Label</Label>
                              <Input
                                value={field.label}
                                onChange={(e) => updateField(field.id, { label: e.target.value })}
                                className="bg-gray-800 border-gray-600 text-white"
                                placeholder="Field label"
                              />
                            </div>
                            
                            {(field.type === 'text' || field.type === 'textarea') && (
                              <div>
                                <Label className="text-white">Placeholder</Label>
                                <Input
                                  value={field.placeholder || ''}
                                  onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                  className="bg-gray-800 border-gray-600 text-white"
                                  placeholder="Placeholder text"
                                />
                              </div>
                            )}
                          </div>

                          {(field.type === 'select' || field.type === 'radio') && field.options && (
                            <div>
                              <Label className="text-white">Options</Label>
                              <div className="space-y-2">
                                {field.options.map((option, optionIndex) => (
                                  <div key={optionIndex} className="flex items-center space-x-2">
                                    <Input
                                      value={option}
                                      onChange={(e) => updateOption(field.id, optionIndex, e.target.value)}
                                      className="bg-gray-800 border-gray-600 text-white"
                                      placeholder={`Option ${optionIndex + 1}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeOption(field.id, optionIndex)}
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addOption(field.id)}
                                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Option
                                </Button>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`required-${field.id}`}
                              checked={field.required}
                              onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                            />
                            <Label htmlFor={`required-${field.id}`} className="text-white">
                              Required
                            </Label>
                          </div>
                        </div>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeField(field.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

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
          onClick={handleSubmit(onSubmit)}
          disabled={createFormMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {createFormMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Creating...
            </>
          ) : (
            'Create Form'
          )}
        </Button>
      </div>
    </div>
  );
}
