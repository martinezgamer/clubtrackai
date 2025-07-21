import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  UserPlus, Camera, Brain, Sparkles, Save, Eye, Star,
  Phone, Mail, Calendar, MapPin, DollarSign, Users, 
  TrendingUp, Clock, Award, Heart, Settings
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { contactsApi } from '@/lib/api';
import { useAuth } from '@/components/auth/auth-provider';
import { z } from 'zod';

const dancerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  stageName: z.string().min(1, 'Stage name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'problematic']).default('active'),
  preferences: z.string().optional(),
  scheduleNotes: z.string().optional(),
  performanceRating: z.number().min(1).max(5).optional(),
  customerFeedback: z.string().optional(),
});

type DancerFormData = z.infer<typeof dancerSchema>;

export default function EnhancedDancerStore() {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [aiEnhanced, setAiEnhanced] = useState(true);
  const [smartRecommendations, setSmartRecommendations] = useState(true);
  const [performanceTracking, setPerformanceTracking] = useState(true);
  const [chatPrefillData, setChatPrefillData] = useState<any>(null);
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
        if (data.name) setValue('name', data.name);
        if (data.stageName) setValue('stageName', data.stageName);
        if (data.phone) setValue('phone', data.phone);
        if (data.email) setValue('email', data.email);
        if (data.notes) setValue('notes', data.notes);
        if (data.scheduleNotes) setValue('scheduleNotes', data.scheduleNotes);
        toast({
          title: "Pre-filled from Chat",
          description: "Dancer profile loaded from your conversation with Sam",
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
    reset,
    formState: { errors },
  } = useForm<DancerFormData>({
    resolver: zodResolver(dancerSchema),
    defaultValues: {
      name: '',
      stageName: '',
      phone: '',
      email: '',
      notes: '',
      status: 'active',
      preferences: '',
      scheduleNotes: '',
      performanceRating: undefined,
      customerFeedback: '',
    },
  });

  const { data: existingDancers = [] } = useQuery({
    queryKey: ['/api/contacts', 'dancers'],
    queryFn: () => contactsApi.getAll({ role: 'dancer' }),
  });

  const createDancerMutation = useMutation({
    mutationFn: (data: DancerFormData & { photoUrl?: string; enhanced: boolean }) => 
      contactsApi.create({
        name: data.name,
        phone: data.phone,
        email: data.email,
        notes: `Stage Name: ${data.stageName}\n\n${data.notes || ''}`,
        status: data.status,
        role: 'dancer',
        photoUrl: data.photoUrl,
      }),
    onSuccess: (newContact: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      reset();
      setProfileImage(null);
      toast({
        title: "Enhanced Dancer Profile Created",
        description: `${newContact?.stageName || newContact?.name || 'Dancer'} has been added with AI enhancements`,
      });
    },
    onError: (error) => {
      console.error('Failed to create dancer:', error);
      toast({
        title: "Error",
        description: "Failed to create dancer profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setProfileImage(data.url);
      toast({
        title: "Image Uploaded",
        description: "Profile image uploaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);
      uploadImageMutation.mutate(file);
    }
  };

  const onSubmit = (data: DancerFormData) => {
    createDancerMutation.mutate({
      ...data,
      photoUrl: profileImage || undefined,
      enhanced: aiEnhanced,
    });
  };

  const enhancedFeatures = [
    { label: "AI Enhanced Profile", description: "Intelligent profile analysis and suggestions" },
    { label: "Smart Recommendations", description: "AI-powered scheduling and pairing recommendations" },
    { label: "Performance Tracking", description: "Advanced analytics and performance insights" },
  ];

  const stageName = watch('stageName');
  const performanceRating = watch('performanceRating');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Enhanced AI Dancer Store</h1>
          <p className="text-gray-400 mt-2">Create intelligent dancer profiles with advanced AI assistance</p>
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
                  checked={index === 0 ? aiEnhanced : index === 1 ? smartRecommendations : performanceTracking}
                  onCheckedChange={index === 0 ? setAiEnhanced : index === 1 ? setSmartRecommendations : setPerformanceTracking}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger value="profile" className="text-white">Profile Setup</TabsTrigger>
          <TabsTrigger value="performance" className="text-white">Performance</TabsTrigger>
          <TabsTrigger value="analytics" className="text-white">AI Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Dancer Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Profile Image Upload */}
                <div className="flex items-center space-x-4">
                  <Avatar className="w-20 h-20">
                    {profileImage ? (
                      <AvatarImage src={profileImage} alt="Profile" />
                    ) : (
                      <AvatarFallback className="bg-gray-700 text-white">
                        {stageName ? stageName[0].toUpperCase() : <Camera className="w-8 h-8" />}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="space-y-2">
                    <Label className="text-white">Profile Photo</Label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                    {isUploading && (
                      <div className="flex items-center text-sm text-blue-400">
                        <Settings className="w-4 h-4 mr-1 animate-spin" />
                        Uploading...
                      </div>
                    )}
                  </div>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-white">Real Name</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      className="bg-gray-900 border-gray-600 text-white"
                      placeholder="Enter real name"
                    />
                    {errors.name && (
                      <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="stageName" className="text-white">Stage Name</Label>
                    <Input
                      id="stageName"
                      {...register('stageName')}
                      className="bg-gray-900 border-gray-600 text-white"
                      placeholder="Enter stage name"
                    />
                    {errors.stageName && (
                      <p className="text-red-400 text-sm mt-1">{errors.stageName.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-white">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="phone"
                        {...register('phone')}
                        className="bg-gray-900 border-gray-600 text-white pl-10"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-white">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        {...register('email')}
                        className="bg-gray-900 border-gray-600 text-white pl-10"
                        placeholder="dancer@example.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="status" className="text-white">Status</Label>
                  <Select onValueChange={(value) => setValue('status', value as any)}>
                    <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="problematic">Problematic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes" className="text-white">General Notes</Label>
                  <Textarea
                    id="notes"
                    {...register('notes')}
                    className="bg-gray-900 border-gray-600 text-white"
                    placeholder="Add any general notes about the dancer..."
                  />
                </div>

                <div>
                  <Label htmlFor="preferences" className="text-white">Preferences & Specialties</Label>
                  <Textarea
                    id="preferences"
                    {...register('preferences')}
                    className="bg-gray-900 border-gray-600 text-white"
                    placeholder="Music preferences, dance styles, customer preferences..."
                  />
                </div>

                <div>
                  <Label htmlFor="scheduleNotes" className="text-white">Schedule Notes</Label>
                  <Textarea
                    id="scheduleNotes"
                    {...register('scheduleNotes')}
                    className="bg-gray-900 border-gray-600 text-white"
                    placeholder="Availability, preferred shifts, time off requests..."
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => reset()}>
                Clear Form
              </Button>
              <Button 
                type="submit" 
                disabled={createDancerMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createDancerMutation.isPending ? (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Enhanced Profile
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Performance Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="performanceRating" className="text-white">Performance Rating</Label>
                <div className="flex items-center space-x-2 mt-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setValue('performanceRating', rating)}
                      className={`p-1 ${performanceRating === rating ? 'text-yellow-400' : 'text-gray-400'}`}
                    >
                      <Star className="w-5 h-5" fill={performanceRating && performanceRating >= rating ? 'currentColor' : 'none'} />
                    </Button>
                  ))}
                  <span className="text-white ml-2">
                    {performanceRating ? `${performanceRating}/5` : 'Not rated'}
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="customerFeedback" className="text-white">Customer Feedback</Label>
                <Textarea
                  id="customerFeedback"
                  {...register('customerFeedback')}
                  className="bg-gray-900 border-gray-600 text-white"
                  placeholder="Customer reviews and feedback..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Brain className="w-5 h-5 mr-2" />
                AI Analytics & Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.isArray(existingDancers) && existingDancers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Users className="w-5 h-5 text-blue-400 mr-2" />
                      <span className="text-white font-medium">Total Dancers</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-400">{existingDancers.length}</div>
                  </div>

                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Heart className="w-5 h-5 text-green-400 mr-2" />
                      <span className="text-white font-medium">Active Dancers</span>
                    </div>
                    <div className="text-2xl font-bold text-green-400">
                      {existingDancers.filter((d: any) => d.status === 'active').length}
                    </div>
                  </div>

                  <div className="bg-gray-900 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Award className="w-5 h-5 text-yellow-400 mr-2" />
                      <span className="text-white font-medium">Top Performers</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {existingDancers.filter((d: any) => d.performanceRating >= 4).length}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No dancers in the system yet. Create your first enhanced dancer profile to see AI analytics.</p>
                </div>
              )}

              {aiEnhanced && (
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2 flex items-center">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Recommendations Active
                  </h4>
                  <ul className="text-sm text-blue-300 space-y-1">
                    <li>• Smart scheduling based on dancer preferences and performance</li>
                    <li>• Intelligent customer pairing recommendations</li>
                    <li>• Performance analytics and improvement suggestions</li>
                    <li>• Automated shift optimization and conflict detection</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}