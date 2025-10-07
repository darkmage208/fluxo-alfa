import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';
import { Shield } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuthStore();
  const { toast } = useToast();

  if (isAuthenticated && user?.role === 'admin') {
    return <Navigate to="/" replace />;
  }

  if (isAuthenticated && user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Access Denied
              </h2>
              <p className="text-gray-600 mb-4">
                You don't have admin privileges to access this dashboard.
              </p>
              <Button onClick={() => window.location.href = 'http://localhost:3000'}>
                Go to User App
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      // Check if user is admin after login
      if (user?.role !== 'admin') {
        toast({
          title: "Access denied",
          description: "Admin privileges required",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Welcome back!",
        description: "Admin access granted.",
      });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.response?.data?.error || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img src="/logo.png" alt="Fluxo Alfa Logo" className="w-8 h-8 mr-2" />
            <span className="text-2xl font-bold">Fluxo Admin</span>
          </div>
          <CardTitle className="text-xl">Admin Dashboard</CardTitle>
          <CardDescription>Sign in with your admin account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Admin Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Demo Admin: admin@fluxoalfa.com / admin123456
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;