import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Building2, Users, Settings, Database } from "lucide-react";
import { insertClubSchema } from "@shared/schema";
import type { z } from "zod";
import { useToast } from "@/hooks/use-toast";

type ClubFormData = z.infer<typeof insertClubSchema>;

interface Club {
  id: number;
  name: string;
  displayName: string;
  address?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export default function ClubManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ClubFormData>({
    resolver: zodResolver(insertClubSchema),
    defaultValues: {
      name: "",
      displayName: "",
      address: "",
      description: "",
    },
  });

  // Fetch clubs
  const { data: clubs = [], isLoading } = useQuery<Club[]>({
    queryKey: ["/api/clubs"],
  });

  // Create club mutation
  const createClubMutation = useMutation({
    mutationFn: async (data: ClubFormData) => {
      const response = await fetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create club");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Club created successfully with its own database!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create club. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ClubFormData) => {
    createClubMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading clubs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Club Management</h1>
          <p className="text-gray-400 mt-2">
            Manage your clubs - each club gets its own separate database
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Create New Club
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Club</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Club ID/Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., club-fantasy-palace"
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Display Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Fantasy Palace"
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Address (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="123 Main St, City, State"
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Brief description of the club..."
                          className="bg-gray-800 border-gray-600 text-white"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createClubMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {createClubMutation.isPending ? "Creating..." : "Create Club"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubs.map((club) => (
          <Card key={club.id} className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold text-white flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-purple-400" />
                {club.displayName}
              </CardTitle>
              <div className={`px-2 py-1 rounded-full text-xs ${
                club.isActive 
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {club.isActive ? 'Active' : 'Inactive'}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Club ID</p>
                  <p className="text-white font-mono">{club.name}</p>
                </div>
                
                {club.address && (
                  <div>
                    <p className="text-sm text-gray-400">Address</p>
                    <p className="text-white">{club.address}</p>
                  </div>
                )}
                
                {club.description && (
                  <div>
                    <p className="text-sm text-gray-400">Description</p>
                    <p className="text-white">{club.description}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-gray-400">Created</p>
                  <p className="text-white">{new Date(club.createdAt).toLocaleDateString()}</p>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Manage
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Settings
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
                  >
                    <Database className="w-4 h-4 mr-1" />
                    Database
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {clubs.length === 0 && (
          <Card className="bg-gray-800 border-gray-700 border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-48">
              <Building2 className="w-12 h-12 text-gray-500 mb-4" />
              <p className="text-gray-400 text-center">
                No clubs yet. Create your first club to get started.
              </p>
              <p className="text-sm text-gray-500 text-center mt-2">
                Each club will have its own separate database for complete data isolation.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      
      {clubs.length > 0 && (
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <Database className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-400">Multi-Tenant Architecture</h3>
              <p className="text-sm text-blue-300 mt-1">
                Each club has its own separate database ensuring complete data isolation. 
                This means contacts, forms, events, and all other data are kept completely separate between clubs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}