import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { adminApiService } from '@/lib/admin-api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { CreditCard, Crown, Users, TrendingUp } from 'lucide-react';

const SubscriptionsPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const response = await adminApiService.getSubscriptions(1, 100);
      setSubscriptions(response.data);
    } catch (error: any) {
      toast({
        title: "Failed to load subscriptions",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeSubscriptions = subscriptions.filter((sub: any) => sub.status === 'active');
  const canceledSubscriptions = subscriptions.filter((sub: any) => sub.status === 'canceled');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center">
          <CreditCard className="w-8 h-8 mr-3" />
          Subscriptions
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor user subscriptions and billing
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Pro</CardTitle>
            <Crown className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeSubscriptions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceled</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{canceledSubscriptions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR Estimate</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(activeSubscriptions.length * 9.99)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Plan</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Current Period End</th>
                  <th className="text-left p-2">Stripe</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((subscription: any) => (
                  <tr key={subscription.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{subscription.user.email}</div>
                        <div className="text-sm text-gray-500">
                          {subscription.user.createdAt ? formatDate(subscription.user.createdAt) : 'Unknown'}
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        subscription.plan.id === 'pro' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {subscription.plan.id === 'pro' && <Crown className="w-3 h-3 mr-1" />}
                        {subscription.plan.id.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        subscription.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : subscription.status === 'canceled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {subscription.status}
                      </span>
                    </td>
                    <td className="p-2 text-sm text-gray-500">
                      {subscription.currentPeriodEnd 
                        ? formatDate(subscription.currentPeriodEnd)
                        : 'N/A'
                      }
                    </td>
                    <td className="p-2">
                      <div className="text-sm">
                        <div>Customer: {subscription.stripeCustomerId?.slice(-8) || 'N/A'}</div>
                        <div className="text-gray-500">Sub: {subscription.stripeSubscriptionId?.slice(-8) || 'N/A'}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {subscriptions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No subscriptions found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionsPage;