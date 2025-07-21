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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { contactsApi } from '@/lib/api';
import { Camera, Upload, X } from 'lucide-react';
import { z } from 'zod';

const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nickname: z.string().optional(),
  stageName: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  status: z.string().default('active'),
  notes: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

interface ContactFormProps {
  contact?: any;
  onSave: (contact: any) => void;
  onCancel: () => void;
}

export function ContactForm({ contact, onSave, onCancel }: ContactFormProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(contact?.photoUrl || null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Watch the role field to conditionally show stage name
  const watchedRole = watch('role');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: contact?.name || '',
      nickname: contact?.nickname || '',
      stageName: contact?.stageName || '',
      role: contact?.role || '',
      phone: contact?.phone || '',
      email: contact?.email || '',
      status: contact?.status || 'active',
      notes: contact?.notes || '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { contact: ContactFormData; photo?: File }) =>
      contactsApi.create(data.contact, data.photo),
    onSuccess: (newContact: any) => {
      toast({
        title: "Contact created",
        description: `${newContact.name} has been added to your contacts.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      onSave(newContact);
    },
    onError: (error) => {
      toast({
        title: "Error creating contact",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { contact: ContactFormData; photo?: File }) =>
      contactsApi.update(contact.id, data.contact, data.photo),
    onSuccess: (updatedContact: any) => {
      toast({
        title: "Contact updated",
        description: `${updatedContact.name} has been updated.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      onSave(updatedContact);
    },
    onError: (error) => {
      toast({
        title: "Error updating contact",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = () => {
    // TODO: Implement camera capture
    toast({
      title: "Camera Feature",
      description: "Camera capture will be implemented soon.",
    });
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const onSubmit = (data: ContactFormData) => {
    if (contact) {
      updateMutation.mutate({ contact: data, photo: photoFile || undefined });
    } else {
      createMutation.mutate({ contact: data, photo: photoFile || undefined });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Card className="bg-gray-800 border-gray-700 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-white">
          {contact ? 'Edit Contact' : 'Add New Contact'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Photo Section */}
          <div className="flex items-center space-x-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={photoPreview || undefined} alt="Contact photo" />
              <AvatarFallback className="text-2xl">
                {watch('name') ? getInitials(watch('name')) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                id="photo-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('photo-upload')?.click()}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCameraCapture}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
              {photoPreview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removePhoto}
                  className="bg-red-600 border-red-500 text-white hover:bg-red-500"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-white">
                Name *
              </Label>
              <Input
                id="name"
                {...register('name')}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Enter full name"
              />
              {errors.name && (
                <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="nickname" className="text-white">
                Nickname
              </Label>
              <Input
                id="nickname"
                {...register('nickname')}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Optional nickname"
              />
            </div>

            {/* Stage Name field - only visible for dancers */}
            {watchedRole === 'dancer' && (
              <div>
                <Label htmlFor="stageName" className="text-white">
                  Stage Name
                </Label>
                <Input
                  id="stageName"
                  {...register('stageName')}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Performance/stage name"
                />
              </div>
            )}

            <div>
              <Label htmlFor="role" className="text-white">
                Role *
              </Label>
              <Select onValueChange={(value) => setValue('role', value)} defaultValue={contact?.role}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dancer">Dancer</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="regular">Regular Customer</SelectItem>
                  <SelectItem value="friend">Friend</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-red-400 text-sm mt-1">{errors.role.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="status" className="text-white">
                Status
              </Label>
              <Select onValueChange={(value) => setValue('status', value)} defaultValue={contact?.status || 'active'}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
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
              <Label htmlFor="phone" className="text-white">
                Phone
              </Label>
              <Input
                id="phone"
                {...register('phone')}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="email@example.com"
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-white">
              Notes
            </Label>
            <Textarea
              id="notes"
              {...register('notes')}
              className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
              placeholder="Add any notes about this contact..."
            />
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
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <span className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {contact ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                contact ? 'Update Contact' : 'Create Contact'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
