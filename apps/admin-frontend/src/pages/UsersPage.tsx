import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { adminApiService } from '@/lib/admin-api';
import { formatDate } from '@/lib/utils';
import { 
  Users, 
  Search, 
  MoreHorizontal, 
  UserCheck, 
  UserX, 
  Shield, 
  Trash2,
  KeyRound,
  CreditCard,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalUsers, setTotalUsers] = useState(0);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'passwordReset' | null;
    user: any;
    isOpen: boolean;
  }>({ type: null, user: null, isOpen: false });
  const { toast } = useToast();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const [usersResponse, metricsResponse] = await Promise.all([
        adminApiService.getUsers(currentPage, pageSize, debouncedSearchTerm),
        adminApiService.getOverviewMetrics()
      ]);
      setUsers(usersResponse.data || []);
      setTotalUsers(usersResponse.pagination?.total || usersResponse.data?.length || 0);
      setMetrics(metricsResponse);
    } catch (error: any) {
      toast({
        title: "Failed to load users",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [debouncedSearchTerm, currentPage, pageSize]);

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      await adminApiService.updateUser(userId, { isActive: !isActive });
      await loadUsers();
      toast({
        title: "User updated",
        description: `User ${!isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to update user",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await adminApiService.updateUser(userId, { role: newRole });
      await loadUsers();
      toast({
        title: "User role updated",
        description: `User role changed to ${newRole}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to update role",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await adminApiService.deleteUser(userId);
      await loadUsers();
      setConfirmAction({ type: null, user: null, isOpen: false });
      toast({
        title: "User deleted",
        description: "User has been permanently removed",
      });
    } catch (error: any) {
      toast({
        title: "Failed to delete user",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handlePasswordReset = async (userId: string) => {
    try {
      await adminApiService.requestUserPasswordReset(userId);
      setConfirmAction({ type: null, user: null, isOpen: false });
      toast({
        title: "Password reset initiated",
        description: "Password reset email has been sent to the user",
      });
    } catch (error: any) {
      toast({
        title: "Failed to initiate password reset",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center">
          <Users className="w-8 h-8 mr-3" />
          Users Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage user accounts and permissions
        </p>
      </div>

      {/* User Statistics */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Free Plan Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.freeUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pro Plan Users</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.proUsers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search users by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show:</span>
              <Select 
                value={pageSize.toString()} 
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">per page</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Users ({totalUsers.toLocaleString()} total)
            {debouncedSearchTerm && ` - showing search results for "${debouncedSearchTerm}"`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Plan</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Created</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: any) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{user.email}</div>
                        <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                      </div>
                    </td>
                    <td className="p-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.subscription?.planId === 'pro' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.subscription?.planId === 'pro' ? <CreditCard className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
                        {user.subscription?.planId || 'free'}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? <UserCheck className="w-3 h-3 mr-1" /> : <UserX className="w-3 h-3 mr-1" />}
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-2 text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="p-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(user.id, user.isActive)}
                          >
                            {user.isActive ? (
                              <><UserX className="mr-2 h-4 w-4" />Deactivate</>
                            ) : (
                              <><UserCheck className="mr-2 h-4 w-4" />Activate</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(user.id, user.role)}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            {user.role === 'admin' ? 'Make User' : 'Make Admin'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setConfirmAction({ type: 'passwordReset', user, isOpen: true })}
                          >
                            <KeyRound className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setConfirmAction({ type: 'delete', user, isOpen: true })}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {users.length === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500">
                {debouncedSearchTerm ? `No users found matching "${debouncedSearchTerm}"` : 'No users found'}
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {totalUsers > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
              <div className="flex items-center text-sm text-gray-600">
                Showing {Math.min((currentPage - 1) * pageSize + 1, totalUsers)} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers.toLocaleString()} users
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage <= 1 || isLoading}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {(() => {
                    const totalPages = Math.ceil(totalUsers / pageSize);
                    const pages = [];
                    
                    // Always show first page
                    pages.push(
                      <Button
                        key={1}
                        variant={currentPage === 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={isLoading}
                        className="w-8 h-8 p-0"
                      >
                        1
                      </Button>
                    );
                    
                    // Add ellipsis if needed
                    if (currentPage > 4) {
                      pages.push(<span key="ellipsis1" className="px-2 text-gray-400">...</span>);
                    }
                    
                    // Add pages around current page
                    const startPage = Math.max(2, currentPage - 1);
                    const endPage = Math.min(totalPages - 1, currentPage + 1);
                    
                    for (let i = startPage; i <= endPage; i++) {
                      if (i !== 1 && i !== totalPages) {
                        pages.push(
                          <Button
                            key={i}
                            variant={currentPage === i ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(i)}
                            disabled={isLoading}
                            className="w-8 h-8 p-0"
                          >
                            {i}
                          </Button>
                        );
                      }
                    }
                    
                    // Add ellipsis if needed
                    if (currentPage < totalPages - 3) {
                      pages.push(<span key="ellipsis2" className="px-2 text-gray-400">...</span>);
                    }
                    
                    // Always show last page if there's more than 1 page
                    if (totalPages > 1) {
                      pages.push(
                        <Button
                          key={totalPages}
                          variant={currentPage === totalPages ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={isLoading}
                          className="w-8 h-8 p-0"
                        >
                          {totalPages}
                        </Button>
                      );
                    }
                    
                    return pages;
                  })()}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalUsers / pageSize) || isLoading}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmAction.isOpen} onOpenChange={(open) => !open && setConfirmAction({ type: null, user: null, isOpen: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction.type === 'delete' ? 'Delete User' : 'Reset Password'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction.type === 'delete' ? (
                <>
                  Are you sure you want to delete <strong>{confirmAction.user?.email}</strong>? 
                  This action cannot be undone and will permanently remove the user and all their data.
                </>
              ) : (
                <>
                  Are you sure you want to send a password reset email to <strong>{confirmAction.user?.email}</strong>?
                  They will receive an email with instructions to reset their password.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
              onClick={() => {
                if (confirmAction.type === 'delete') {
                  handleDeleteUser(confirmAction.user?.id);
                } else if (confirmAction.type === 'passwordReset') {
                  handlePasswordReset(confirmAction.user?.id);
                }
              }}
            >
              {confirmAction.type === 'delete' ? 'Delete User' : 'Send Reset Email'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersPage;