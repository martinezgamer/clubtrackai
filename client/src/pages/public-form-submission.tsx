import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Building2, User, Phone, Mail } from 'lucide-react';

// Dynamic form schema based on form type
const createFormSchema = (formType: string) => {
  const baseSchema = {
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
  };

  if (formType === 'manager') {
    return z.object({
      ...baseSchema,
      experience: z.string().min(10, "Please describe your management experience"),
      references: z.string().optional(),
      availability: z.string().min(5, "Please specify your availability"),
      certifications: z.string().optional(),
    });
  }

  if (formType === 'dancer') {
    return z.object({
      ...baseSchema,
      stageName: z.string().min(2, "Stage name is required"),
      experience: z.string().min(10, "Please describe your dancing experience"),
      availability: z.string().min(5, "Please specify your availability"),
      specialSkills: z.string().optional(),
    });
  }

  if (formType === 'staff') {
    return z.object({
      ...baseSchema,
      position: z.string().min(2, "Position is required"),
      experience: z.string().min(10, "Please describe your relevant experience"),
      availability: z.string().min(5, "Please specify your availability"),
    });
  }

  return z.object(baseSchema);
};

export default function PublicFormSubmission() {
  const [linkData, setLinkData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Get token from URL parameters
  const urlToken = new URLSearchParams(window.location.search).get('token');

  const formSchema = linkData ? createFormSchema(linkData.formType) : z.object({});
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(formSchema)
  });

  useEffect(() => {
    if (!urlToken) {
      setError("Invalid or missing form link");
      setIsLoading(false);
      return;
    }

    // Fetch one-time link data
    fetch(`/api/forms/public/${urlToken}`)
      .then(async res => {
        if (!res.ok) {
          throw new Error(await res.text());
        }
        return res.json();
      })
      .then(data => {
        setLinkData(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message || "Failed to load form");
        setIsLoading(false);
      });
  }, [urlToken]);

  const onSubmit = async (data: any) => {
    if (!linkData) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/forms/submit/${urlToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setIsSubmitted(true);
      toast({
        title: "Application Submitted",
        description: "Your application has been submitted for review. You will be contacted soon.",
      });
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFormIcon = (formType: string) => {
    switch (formType) {
      case 'manager':
        return <Building2 className="w-6 h-6" />;
      case 'dancer':
        return <User className="w-6 h-6" />;
      case 'staff':
        return <User className="w-6 h-6" />;
      default:
        return <User className="w-6 h-6" />;
    }
  };

  const getFormTitle = (formType: string) => {
    switch (formType) {
      case 'manager':
        return 'Manager Application';
      case 'dancer':
        return 'Dancer Application';
      case 'staff':
        return 'Staff Application';
      default:
        return 'Application';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-300">Loading application form...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Access Error</h2>
            <p className="text-gray-300">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Application Submitted!</h2>
            <p className="text-gray-300 mb-4">
              Thank you for your interest. Your application has been submitted and is under review.
            </p>
            <Badge variant="secondary" className="bg-green-500/20 text-green-300">
              Status: Under Review
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {getFormIcon(linkData.formType)}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Smart Tools 4U</h1>
          <p className="text-gray-400">AI and people meet as one</p>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center">
                  {getFormIcon(linkData.formType)}
                  <span className="ml-2">{getFormTitle(linkData.formType)}</span>
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Complete this form to apply for a position at {linkData.clubName || 'our club'}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                {linkData.formType}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      Full Name *
                    </label>
                    <Input
                      {...register('name')}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <p className="text-red-400 text-sm mt-1">{errors.name.message as string}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      {...register('email')}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Enter your email"
                    />
                    {errors.email && (
                      <p className="text-red-400 text-sm mt-1">{errors.email.message as string}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Phone Number *
                    </label>
                    <Input
                      {...register('phone')}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Enter your phone number"
                    />
                    {errors.phone && (
                      <p className="text-red-400 text-sm mt-1">{errors.phone.message as string}</p>
                    )}
                  </div>

                  {linkData.formType === 'dancer' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Stage Name *
                      </label>
                      <Input
                        {...register('stageName')}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Enter your stage name"
                      />
                      {errors.stageName && (
                        <p className="text-red-400 text-sm mt-1">{errors.stageName.message as string}</p>
                      )}
                    </div>
                  )}

                  {linkData.formType === 'staff' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Position Applied For *
                      </label>
                      <Select onValueChange={(value) => setValue('position', value)}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bartender">Bartender</SelectItem>
                          <SelectItem value="security">Security</SelectItem>
                          <SelectItem value="server">Server</SelectItem>
                          <SelectItem value="dj">DJ</SelectItem>
                          <SelectItem value="host">Host</SelectItem>
                          <SelectItem value="cleaner">Cleaner</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.position && (
                        <p className="text-red-400 text-sm mt-1">{errors.position.message as string}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Experience Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                  Experience & Qualifications
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Experience *
                  </label>
                  <Textarea
                    {...register('experience')}
                    className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                    placeholder={`Describe your ${linkData.formType === 'manager' ? 'management' : 
                      linkData.formType === 'dancer' ? 'dancing' : 'relevant'} experience...`}
                  />
                  {errors.experience && (
                    <p className="text-red-400 text-sm mt-1">{errors.experience.message as string}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Availability *
                  </label>
                  <Textarea
                    {...register('availability')}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Describe your availability (days, hours, etc.)"
                  />
                  {errors.availability && (
                    <p className="text-red-400 text-sm mt-1">{errors.availability.message as string}</p>
                  )}
                </div>

                {/* Conditional fields based on form type */}
                {linkData.formType === 'manager' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        References
                      </label>
                      <Textarea
                        {...register('references')}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Provide professional references (optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Certifications
                      </label>
                      <Input
                        {...register('certifications')}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="List relevant certifications (optional)"
                      />
                    </div>
                  </>
                )}

                {linkData.formType === 'dancer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Special Skills
                    </label>
                    <Input
                      {...register('specialSkills')}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="List special skills or talents (optional)"
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Submitting Application...
                    </div>
                  ) : (
                    'Submit Application'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by Smart Tools 4U - AI Club Management System</p>
        </div>
      </div>
    </div>
  );
}