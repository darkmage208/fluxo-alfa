import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Trash2 
} from 'lucide-react';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const loadUsers = async () => {
    try {
      const response = await adminApiService.getUsers(1, 100, searchTerm);
      setUsers(response.data);
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
  }, [searchTerm]);

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
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await adminApiService.deleteUser(userId);
      await loadUsers();
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

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search users by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Role</th>
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
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant={user.isActive ? "outline" : "default"}
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRoleChange(user.id, user.role)}
                        >
                          {user.role === 'admin' ? 'Make User' : 'Make Admin'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPage;