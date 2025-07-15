import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, ImageIcon, Copy, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { socialMediaApi } from '@/lib/api';

export default function SocialMedia() {
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedPosts, setGeneratedPosts] = useState<string[]>([]);
  const [imageAnalysis, setImageAnalysis] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const generatePostsMutation = useMutation({
    mutationFn: ({ prompt, image }: { prompt: string; image?: File }) => 
      socialMediaApi.generatePosts(prompt, image),
    onSuccess: (data) => {
      setGeneratedPosts(data.posts || []);
      toast({
        title: "Success",
        description: "Social media posts generated successfully!",
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
    onSuccess: (data) => {
      setImageAnalysis(data.analysis || '');
      toast({
        title: "Success",
        description: "Image analyzed successfully!",
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
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGeneratePosts = () => {
    if (!prompt.trim() && !selectedImage) {
      toast({
        title: "Error",
        description: "Please provide either a prompt or upload an image.",
        variant: "destructive",
      });
      return;
    }

    generatePostsMutation.mutate({ prompt, image: selectedImage });
  };

  const handleAnalyzeImage = () => {
    if (!selectedImage) {
      toast({
        title: "Error",
        description: "Please upload an image to analyze.",
        variant: "destructive",
      });
      return;
    }

    analyzeImageMutation.mutate(selectedImage);
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast({
        title: "Copied!",
        description: "Post copied to clipboard",
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setImageAnalysis('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <ImageIcon className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Social Media Content Generator</h1>
      </div>

      {/* Image Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Image (Optional)</CardTitle>
          <CardDescription>
            Upload a flyer, promotional image, or any visual content for AI analysis and post generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="flex-1"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Browse
            </Button>
            {selectedImage && (
              <Button
                onClick={clearImage}
                variant="outline"
                size="sm"
              >
                Clear
              </Button>
            )}
          </div>
          
          {imagePreview && (
            <div className="mt-4">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-full h-auto max-h-64 rounded-lg shadow-md border"
              />
            </div>
          )}
          
          {selectedImage && (
            <Button
              onClick={handleAnalyzeImage}
              disabled={analyzeImageMutation.isPending}
              className="w-full"
            >
              {analyzeImageMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Image...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Analyze Image
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Image Analysis Results */}
      {imageAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>Image Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{imageAnalysis}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Social Media Posts</CardTitle>
          <CardDescription>
            Add context or specific instructions for your social media posts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Post Description (Optional)</Label>
            <Textarea
              id="prompt"
              placeholder="e.g., 'Focus on luxury and exclusivity' or 'Promote our weekend special' or 'Describe the image you want based on your uploaded flyer...'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          
          <Button
            onClick={handleGeneratePosts}
            disabled={generatePostsMutation.isPending}
            className="w-full"
            size="lg"
          >
            {generatePostsMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Posts...
              </>
            ) : (
              'Generate Social Media Posts'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Posts Display */}
      {generatedPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Social Media Posts</CardTitle>
            <CardDescription>
              Ready-to-use posts for Facebook and Instagram
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatedPosts.map((post, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">Post {index + 1}</h3>
                    <Button
                      onClick={() => copyToClipboard(post, index)}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      {copiedIndex === index ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {post}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Tips:</strong> Upload promotional images, flyers, or event photos to generate more targeted social media content. 
          The AI will analyze the image and create posts that match your visual content.
        </AlertDescription>
      </Alert>
    </div>
  );
}