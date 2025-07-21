import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, XCircle, Clock, Eye, User, Mail, Phone, 
  Calendar, Building2, Home, Filter, Search 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'wouter';

interface FormSubmission {
  id: number;
  formType: string;
  clubId: number;
  submitterName: string;
  submitterEmail: string;
  formData: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: number;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function FormSubmissionsDashboard() {
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['/api/form-submissions', filter, searchQuery],
    queryFn: () => 
      fetch(`/api/form-submissions?status=${filter}&search=${encodeURIComponent(searchQuery)}`)
        .then(res => res.json()),
  });

  const reviewSubmissionMutation = useMutation({
    mutationFn: async ({ id, action, notes }: { id: number; action: 'approve' | 'reject'; notes: string }) => {
      const response = await fetch(`/api/form-submissions/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      if (!response.ok) throw new Error('Failed to review submission');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/form-submissions'] });
      setSelectedSubmission(null);
      setReviewNotes('');
      toast({
        title: `Application ${variables.action === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `The ${selectedSubmission?.formType} application has been ${variables.action}d.`,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to review application. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleReview = (action: 'approve' | 'reject') => {
    if (!selectedSubmission) return;
    reviewSubmissionMutation.mutate({
      id: selectedSubmission.id,
      action,
      notes: reviewNotes,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-300',
      approved: 'bg-green-500/20 text-green-300',
      rejected: 'bg-red-500/20 text-red-300',
    };
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500/20 text-gray-300'}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  const getFormTypeIcon = (formType: string) => {
    switch (formType) {
      case 'manager':
        return <Building2 className="w-5 h-5" />;
      case 'dancer':
      case 'staff':
        return <User className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  const filteredSubmissions = submissions.filter((submission: FormSubmission) => {
    if (filter !== 'all' && submission.status !== filter) return false;
    if (searchQuery && !submission.submitterName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !submission.submitterEmail.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header with Home Button */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Application Management</h1>
              <p className="text-gray-400 mt-1">Review and manage form submissions</p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Search Applicants
            </label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Filter by Status
            </label>
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Applications</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end">
            <div className="text-sm text-gray-400">
              <p>{filteredSubmissions.length} applications found</p>
              <p>{submissions.filter((s: FormSubmission) => s.status === 'pending').length} pending review</p>
            </div>
          </div>
        </div>

        {/* Submissions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubmissions.map((submission: FormSubmission) => (
            <Card key={submission.id} className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
                  onClick={() => setSelectedSubmission(submission)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg flex items-center">
                    {getFormTypeIcon(submission.formType)}
                    <span className="ml-2 capitalize">{submission.formType} Application</span>
                  </CardTitle>
                  {getStatusBadge(submission.status)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center text-gray-300">
                    <User className="w-4 h-4 mr-2" />
                    <span className="font-medium">{submission.submitterName}</span>
                  </div>
                  <div className="flex items-center text-gray-400 text-sm">
                    <Mail className="w-4 h-4 mr-2" />
                    <span>{submission.submitterEmail}</span>
                  </div>
                  <div className="flex items-center text-gray-400 text-sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{new Date(submission.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Review
                  </Button>
                  
                  {submission.status === 'pending' && (
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                      Action Required
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSubmissions.length === 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="text-center py-12">
              <User className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Applications Found</h3>
              <p className="text-gray-400">
                {searchQuery ? 'No applications match your search criteria.' : 'No applications have been submitted yet.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Review Dialog */}
        {selectedSubmission && (
          <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
            <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  {getFormTypeIcon(selectedSubmission.formType)}
                  <span className="ml-2 capitalize">{selectedSubmission.formType} Application Review</span>
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Review application details and make a decision
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Applicant Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-white mb-2">Applicant Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{selectedSubmission.submitterName}</span>
                      </div>
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{selectedSubmission.submitterEmail}</span>
                      </div>
                      {selectedSubmission.formData.phone && (
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{selectedSubmission.formData.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-white mb-2">Application Status</h4>
                    <div className="space-y-2">
                      {getStatusBadge(selectedSubmission.status)}
                      <p className="text-sm text-gray-400">
                        Submitted {new Date(selectedSubmission.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Data */}
                <div>
                  <h4 className="font-semibold text-white mb-3">Application Details</h4>
                  <div className="bg-gray-900 p-4 rounded-lg space-y-4">
                    {Object.entries(selectedSubmission.formData).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-300 mb-1 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        <div className="text-gray-100 bg-gray-800 p-3 rounded border">
                          {typeof value === 'string' && value.length > 100 ? (
                            <div className="space-y-2">
                              <p>{value}</p>
                            </div>
                          ) : (
                            <p>{String(value)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review Section - Only show if pending */}
                {selectedSubmission.status === 'pending' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-white">Review Decision</h4>
                    <Textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add review notes (optional)..."
                      className="bg-gray-900 border-gray-600 text-white"
                    />
                    
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => handleReview('approve')}
                        disabled={reviewSubmissionMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white flex-1"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Application
                      </Button>
                      <Button
                        onClick={() => handleReview('reject')}
                        disabled={reviewSubmissionMutation.isPending}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Application
                      </Button>
                    </div>
                  </div>
                )}

                {/* Previous Review */}
                {selectedSubmission.status !== 'pending' && selectedSubmission.reviewNotes && (
                  <div>
                    <h4 className="font-semibold text-white mb-2">Review Notes</h4>
                    <div className="bg-gray-900 p-3 rounded border text-gray-300">
                      {selectedSubmission.reviewNotes}
                    </div>
                    {selectedSubmission.reviewedAt && (
                      <p className="text-sm text-gray-400 mt-2">
                        Reviewed on {new Date(selectedSubmission.reviewedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}