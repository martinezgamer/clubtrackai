import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, Minus, GripVertical, Type, List, CheckSquare, 
  Calendar, Clock, Hash, Mail, Phone, Sparkles, Brain,
  Wand2, Eye, Save, FileText, Database, Settings
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { formsApi } from '@/lib/api';
import { useAuth } from '@/components/auth/auth-provider';
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

interface EnhancedFormCreatorProps {
  onSave?: (form: any) => void;
  onCancel?: () => void;
}

export default function EnhancedFormCreator({ onSave, onCancel }: EnhancedFormCreatorProps) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiEnhanced, setAiEnhanced] = useState(true);
  const [smartValidation, setSmartValidation] = useState(true);
  const [autoCompletion, setAutoCompletion] = useState(true);
  const [chatPrefillData, setChatPrefillData] = useState<any>(null);
  const [formType, setFormType] = useState('');
  const [context, setContext] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check for pre-filled data from chat
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const prefillData = urlParams.get('prefill');
    if (prefillData) {
      try {
        const data = JSON.parse(decodeURIComponent(prefillData));
        setChatPrefillData(data);
        if (data.formType) setFormType(data.formType);
        if (data.context) setContext(data.context);
        if (data.title) setValue('title', data.title);
        if (data.description) setValue('description', data.description);
        toast({
          title: "Pre-filled from Chat",
          description: "Form details loaded from your conversation with Sam",
        });
      } catch (error) {
        console.error('Failed to parse prefill data:', error);
      }
    }
  }, []);

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
    mutationFn: (formData: FormData & { fields: FormField[]; enhanced: boolean }) => 
      formsApi.create(formData),
    onSuccess: (form) => {
      queryClient.invalidateQueries({ queryKey: ['/api/forms'] });
      onSave?.(form);
      toast({
        title: "Enhanced Form Created",
        description: "Your form has been created with AI enhancements",
      });
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
    mutationFn: ({ formType, context, enhanced }: { formType: string; context: string; enhanced: boolean }) =>
      formsApi.generateQuestions(formType, context),
    onSuccess: (data: any) => {
      if (data.questions && data.questions.length > 0) {
        setFields(data.questions);
        toast({
          title: "AI Fields Generated",
          description: `Generated ${data.questions.length} intelligent form fields`,
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

  const generateEnhancedFields = () => {
    if (!formType.trim()) {
      toast({
        title: "Form Type Required",
        description: "Please specify the type of form you want to create.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    generateFieldsMutation.mutate({
      formType,
      context,
      enhanced: aiEnhanced,
    });
  };

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
      enhanced: aiEnhanced,
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

  const enhancedFeatures = [
    { label: "AI Enhanced", description: "Intelligent field generation and optimization" },
    { label: "Smart Validation", description: "Advanced form validation rules" },
    { label: "Auto Completion", description: "Predictive field completion" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Enhanced AI Form Creator</h1>
          <p className="text-gray-400 mt-2">Build intelligent forms with advanced AI assistance</p>
        </div>
        {chatPrefillData && (
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
            <Brain className="w-3 h-3 mr-1" />
            Pre-filled from Chat
          </Badge>
        )}
      </div>

      {/* Enhanced AI Settings */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Sparkles className="w-5 h-5 mr-2" />
            AI Enhancement Settings
            <Badge variant="secondary" className="ml-2 text-xs">Profile: {user?.username || 'Default'}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {enhancedFeatures.map((feature, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-white">{feature.label}</div>
                  <div className="text-xs text-gray-400">{feature.description}</div>
                </div>
                <Switch 
                  checked={index === 0 ? aiEnhanced : index === 1 ? smartValidation : autoCompletion}
                  onCheckedChange={index === 0 ? setAiEnhanced : index === 1 ? setSmartValidation : setAutoCompletion}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger value="generate" className="text-white">AI Generator</TabsTrigger>
          <TabsTrigger value="manual" className="text-white">Manual Builder</TabsTrigger>
          <TabsTrigger value="preview" className="text-white">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Wand2 className="w-5 h-5 mr-2" />
                AI Form Generation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="form-type" className="text-white">Form Type</Label>
                <Input
                  id="form-type"
                  placeholder="e.g., Customer Feedback, Event Registration, Survey..."
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="context" className="text-white">Additional Context (Optional)</Label>
                <Textarea
                  id="context"
                  placeholder="Provide additional details about your form requirements..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>
              <Button 
                onClick={generateEnhancedFields}
                disabled={isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Generating Enhanced Fields...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Generate AI Fields
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Form Settings */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Form Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-white">Title</Label>
                  <Input
                    id="title"
                    {...register('title')}
                    className="bg-gray-900 border-gray-600 text-white"
                    placeholder="Enter form title"
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
                    className="bg-gray-900 border-gray-600 text-white"
                    placeholder="Describe the purpose of this form"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isRecurring"
                    {...register('isRecurring')}
                  />
                  <Label htmlFor="isRecurring" className="text-white">Recurring Form</Label>
                </div>

                {isRecurring && (
                  <div>
                    <Label htmlFor="recurringSchedule" className="text-white">Schedule</Label>
                    <Input
                      id="recurringSchedule"
                      {...register('recurringSchedule')}
                      className="bg-gray-900 border-gray-600 text-white"
                      placeholder="e.g., Daily, Weekly, Monthly"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Fields */}
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

                                {(field.type === 'select' || field.type === 'radio') && (
                                  <div>
                                    <Label className="text-white">Options</Label>
                                    <div className="space-y-2">
                                      {field.options?.map((option, optionIndex) => (
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
                                        <Plus className="w-4 h-4 mr-1" />
                                        Add Option
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`required-${field.id}`}
                                    checked={field.required}
                                    onCheckedChange={(checked) => updateField(field.id, { required: !!checked })}
                                  />
                                  <Label htmlFor={`required-${field.id}`} className="text-white">Required</Label>
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
            <div className="flex justify-end space-x-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={createFormMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createFormMutation.isPending ? (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Create Enhanced Form
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          {fields.length > 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Form Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label className="text-white">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </Label>
                    {field.type === 'text' && (
                      <Input 
                        placeholder={field.placeholder}
                        className="bg-gray-900 border-gray-600 text-white"
                        disabled
                      />
                    )}
                    {field.type === 'textarea' && (
                      <Textarea 
                        placeholder={field.placeholder}
                        className="bg-gray-900 border-gray-600 text-white"
                        disabled
                      />
                    )}
                    {field.type === 'select' && (
                      <div className="bg-gray-900 border border-gray-600 rounded-md p-2 text-white">
                        Select an option...
                      </div>
                    )}
                    {field.type === 'checkbox' && (
                      <div className="flex items-center space-x-2">
                        <Checkbox disabled />
                        <span className="text-gray-300">Checkbox option</span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8 text-center">
                <p className="text-gray-400">No fields added yet. Use the AI Generator or Manual Builder to create form fields.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}