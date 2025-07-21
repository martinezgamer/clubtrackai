import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, ImageIcon, Copy, Loader2, AlertCircle, CheckCircle2, 
  Sparkles, Eye, Save, Share2, Camera, Palette, Wand2, Brain
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { socialMediaApi } from '@/lib/api';
import { useAuth } from '@/components/auth/auth-provider';

export default function EnhancedSocialMedia() {
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedPosts, setGeneratedPosts] = useState<string[]>([]);
  const [imageAnalysis, setImageAnalysis] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [aiEnhanced, setAiEnhanced] = useState(true);
  const [autoGenerateHashtags, setAutoGenerateHashtags] = useState(true);
  const [platformOptimization, setPlatformOptimization] = useState(true);
  const [chatPrefillData, setChatPrefillData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check for pre-filled data from chat
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const prefillData = urlParams.get('prefill');
    if (prefillData) {
      try {
        const data = JSON.parse(decodeURIComponent(prefillData));
        setChatPrefillData(data);
        if (data.prompt) setPrompt(data.prompt);
        if (data.imageAnalysis) setImageAnalysis(data.imageAnalysis);
        toast({
          title: "Pre-filled from Chat",
          description: "Content loaded from your chat conversation with Sam",
        });
      } catch (error) {
        console.error('Failed to parse prefill data:', error);
      }
    }
  }, [toast]);

  const generatePostsMutation = useMutation({
    mutationFn: ({ prompt, image, enhanced }: { prompt: string; image?: File; enhanced: boolean }) => 
      socialMediaApi.generatePosts(prompt, image),
    onSuccess: (data: any) => {
      setGeneratedPosts(data.posts || []);
      toast({
        title: "Success",
        description: `Generated ${data.posts?.length || 0} enhanced social media posts!`,
      });
    },
    onError: (error) => {
      console.error('Error generating posts:', error);
      toast({
        title: "Error",
        description: "Failed to generate social media posts. Please try again.",
        variant: "destructive",
      });
    },
  });

  const analyzeImageMutation = useMutation({
    mutationFn: (image: File) => socialMediaApi.analyzeImage(image),
    onSuccess: (data: any) => {
      setImageAnalysis(data.analysis || '');
      toast({
        title: "Enhanced Analysis Complete",
        description: "AI has analyzed your image with advanced capabilities",
      });
    },
    onError: (error) => {
      console.error('Error analyzing image:', error);
      toast({
        title: "Error",
        description: "Failed to analyze image. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Automatically analyze if AI enhanced mode is on
      if (aiEnhanced) {
        analyzeImageMutation.mutate(file);
      }
    }
  };

  const handleGeneratePosts = () => {
    if (!prompt.trim() && !selectedImage) {
      toast({
        title: "Input Required",
        description: "Please provide a prompt or upload an image.",
        variant: "destructive",
      });
      return;
    }

    generatePostsMutation.mutate({
      prompt: prompt || imageAnalysis,
      image: selectedImage || undefined,
      enhanced: aiEnhanced,
    });
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast({
        title: "Copied!",
        description: "Post copied to clipboard",
      });
    });
  };

  const enhancedFeatures = [
    { label: "AI Enhanced Analysis", description: "Advanced image recognition and content optimization" },
    { label: "Auto Hashtag Generation", description: "Intelligent hashtag suggestions based on content" },
    { label: "Platform Optimization", description: "Tailored content for different social platforms" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Enhanced Social Media Creator</h1>
          <p className="text-gray-400 mt-2">Create engaging posts with advanced AI assistance</p>
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
          <CardDescription>Configure advanced AI features for content creation</CardDescription>
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
                  checked={index === 0 ? aiEnhanced : index === 1 ? autoGenerateHashtags : platformOptimization}
                  onCheckedChange={index === 0 ? setAiEnhanced : index === 1 ? setAutoGenerateHashtags : setPlatformOptimization}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger value="create" className="text-white">Create Content</TabsTrigger>
          <TabsTrigger value="analyze" className="text-white">Image Analysis</TabsTrigger>
          <TabsTrigger value="history" className="text-white">Generated Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Content Creation</CardTitle>
              <CardDescription>Describe what you want to post or upload an image</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="prompt" className="text-white">Content Description</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe your content, event, or what you want to promote..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px] bg-gray-900 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label className="text-white">Upload Image (Optional)</Label>
                <div className="mt-2 space-y-2">
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Image
                  </Button>
                  {imagePreview && (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full max-w-md h-48 object-cover rounded-lg"
                      />
                      {aiEnhanced && analyzeImageMutation.isPending && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                          <div className="text-white text-sm flex items-center">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing with AI...
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleGeneratePosts}
                disabled={generatePostsMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {generatePostsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Enhanced Posts...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Enhanced Posts
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analyze" className="space-y-4">
          {imageAnalysis && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Enhanced AI Image Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <p className="text-gray-300 whitespace-pre-wrap">{imageAnalysis}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {generatedPosts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Generated Posts</h3>
              {generatedPosts.map((post, index) => (
                <Card key={index} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant="secondary" className="text-xs">
                        Post {index + 1}
                        {aiEnhanced && <Sparkles className="w-3 h-3 ml-1" />}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(post, index)}
                        className="text-gray-400 hover:text-white"
                      >
                        {copiedIndex === index ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap">{post}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}