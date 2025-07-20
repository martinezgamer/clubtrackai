import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Users, Building, Shield, Edit, Trash2, Key } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface UserWithRole {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isSuperUser: boolean;
  role: {
    id: number;
    name: string;
    displayName: string;
  };
  clubAssignments: Array<{
    club: {
      id: number;
      name: string;
      displayName: string;
    };
    isDefault: boolean;
  }>;
}

export default function UserManagement() {
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateClubOpen, setIsCreateClubOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: '',
    roleId: '',
    clubIds: [] as number[],
  });
  const [newClubData, setNewClubData] = useState({
    name: '',
    displayName: '',
    address: '',
    description: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users with roles and club assignments
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: () => apiRequest('/api/users'),
  });

  // Fetch clubs
  const { data: clubs = [] } = useQuery({
    queryKey: ['/api/clubs'],
    queryFn: () => apiRequest('/api/clubs'),
  });

  // Fetch roles
  const { data: roles = [] } = useQuery({
    queryKey: ['/api/roles'],
    queryFn: () => apiRequest('/api/roles'),
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: typeof newUserData) => apiRequest('/api/users', {
      method: 'POST',
      body: userData,
    }),
    onSuccess: () => {
      toast({ title: "User created successfully" });
      setIsCreateUserOpen(false);
      setNewUserData({
        username: '',
        password: '',
        email: '',
        firstName: '',
        lastName: '',
        roleId: '',
        clubIds: [],
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: () => {
      toast({ title: "Failed to create user", variant: "destructive" });
    },
  });

  // Create club mutation
  const createClubMutation = useMutation({
    mutationFn: (clubData: typeof newClubData) => apiRequest('/api/clubs', {
      method: 'POST',
      body: clubData,
    }),
    onSuccess: () => {
      toast({ title: "Club created successfully" });
      setIsCreateClubOpen(false);
      setNewClubData({
        name: '',
        displayName: '',
        address: '',
        description: '',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clubs'] });
    },
    onError: () => {
      toast({ title: "Failed to create club", variant: "destructive" });
    },
  });

  // Toggle user active status
  const toggleUserMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
      apiRequest(`/api/users/${userId}`, {
        method: 'PATCH',
        body: { isActive },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
  });

  const handleCreateUser = () => {
    if (!newUserData.username || !newUserData.password || !newUserData.roleId) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createUserMutation.mutate(newUserData);
  };

  const handleCreateClub = () => {
    if (!newClubData.name || !newClubData.displayName) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createClubMutation.mutate(newClubData);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">User Management</h1>
            <p className="text-gray-400 mt-2">Manage users, roles, and club access</p>
          </div>
          <div className="flex space-x-3">
            <Dialog open={isCreateClubOpen} onOpenChange={setIsCreateClubOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Building className="w-4 h-4 mr-2" />
                  Add Club
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle>Create New Club</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Club ID</Label>
                    <Input
                      value={newClubData.name}
                      onChange={(e) => setNewClubData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. club-oasis"
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  <div>
                    <Label>Display Name</Label>
                    <Input
                      value={newClubData.displayName}
                      onChange={(e) => setNewClubData(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="e.g. The Oasis"
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={newClubData.address}
                      onChange={(e) => setNewClubData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Club address"
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={newClubData.description}
                      onChange={(e) => setNewClubData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Club description"
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  <Button onClick={handleCreateClub} className="w-full">
                    Create Club
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>First Name</Label>
                      <Input
                        value={newUserData.firstName}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="bg-gray-700 border-gray-600"
                      />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input
                        value={newUserData.lastName}
                        onChange={(e) => setNewUserData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="bg-gray-700 border-gray-600"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Username *</Label>
                    <Input
                      value={newUserData.username}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, username: e.target.value }))}
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  <div>
                    <Label>Password *</Label>
                    <Input
                      type="password"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  <div>
                    <Label>Role *</Label>
                    <Select onValueChange={(value) => setNewUserData(prev => ({ ...prev, roleId: value }))}>
                      <SelectTrigger className="bg-gray-700 border-gray-600">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role: any) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateUser} className="w-full">
                    Create User
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="clubs">Clubs</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="grid gap-4">
              {usersLoading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : (
                users.map((user: UserWithRole) => (
                  <Card key={user.id} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              {user.firstName} {user.lastName} ({user.username})
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant={user.isSuperUser ? "default" : "secondary"}>
                                {user.isSuperUser ? 'Super User' : user.role?.displayName}
                              </Badge>
                              <Badge variant={user.isActive ? "default" : "destructive"}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            {user.clubAssignments?.length > 0 && (
                              <div className="flex items-center space-x-2 mt-2">
                                <span className="text-sm text-gray-400">Clubs:</span>
                                {user.clubAssignments.map((assignment) => (
                                  <Badge key={assignment.club.id} variant="outline">
                                    {assignment.club.displayName}
                                    {assignment.isDefault && ' (Default)'}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={(checked) =>
                              toggleUserMutation.mutate({ userId: user.id, isActive: checked })
                            }
                          />
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="clubs" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clubs.map((club: any) => (
                <Card key={club.id} className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Building className="w-5 h-5 text-blue-400" />
                      <span>{club.displayName}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-sm mb-2">ID: {club.name}</p>
                    {club.address && (
                      <p className="text-gray-300 text-sm mb-2">{club.address}</p>
                    )}
                    {club.description && (
                      <p className="text-gray-400 text-sm">{club.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      <Badge variant={club.isActive ? "default" : "destructive"}>
                        {club.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((role: any) => (
                <Card key={role.id} className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-green-400" />
                      <span>{role.displayName}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-sm mb-4">{role.description}</p>
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-gray-300">Permissions:</span>
                      <div className="flex flex-wrap gap-2">
                        {role.permissions?.map((permission: string) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <Badge variant={role.isActive ? "default" : "destructive"}>
                        {role.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}