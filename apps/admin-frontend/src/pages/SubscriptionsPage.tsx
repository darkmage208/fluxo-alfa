import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { adminApiService } from '@/lib/admin-api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { 
  CreditCard, 
  Crown, 
  Users, 
  TrendingUp, 
  DollarSign, 
  CheckCircle, 
  XCircle,
  Calendar,
  Shield,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

const PaymentMethodIcon = ({ method }: { method: string }) => {
  switch (method?.toLowerCase()) {
    case 'stripe':
      return <div className="w-4 h-4 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">S</div>;
    case 'mercado_pago':
      return <div className="w-4 h-4 bg-yellow-400 rounded text-white text-xs flex items-center justify-center font-bold">MP</div>;
    case 'kiwify':
      return <div className="w-4 h-4 bg-green-600 rounded text-white text-xs flex items-center justify-center font-bold">K</div>;
    case 'credit_card':
    case 'card':
      return <CreditCard className="w-4 h-4 text-blue-600" />;
    case 'pix':
      return <div className="w-4 h-4 bg-green-500 rounded text-white text-xs flex items-center justify-center font-bold">PIX</div>;
    case 'boleto':
    case 'boleto_bancario':
      return <div className="w-4 h-4 bg-orange-500 rounded text-white text-xs flex items-center justify-center font-bold">B</div>;
    case 'wallet':
    case 'digital_wallet':
      return <div className="w-4 h-4 bg-purple-500 rounded text-white text-xs flex items-center justify-center font-bold">W</div>;
    case 'bank_debit':
    case 'debit':
      return <div className="w-4 h-4 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">D</div>;
    case 'paypal':
      return <div className="w-4 h-4 bg-blue-800 rounded text-white text-xs flex items-center justify-center font-bold">PP</div>;
    case 'apple_pay':
      return <div className="w-4 h-4 bg-black rounded text-white text-xs flex items-center justify-center font-bold">AP</div>;
    case 'google_pay':
      return <div className="w-4 h-4 bg-green-700 rounded text-white text-xs flex items-center justify-center font-bold">GP</div>;
    default:
      return <CreditCard className="w-4 h-4 text-gray-500" />;
  }
};

const SubscriptionsPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentStats, setPaymentStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    successfulPayments: 0,
    failedPayments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subscriptionsResponse, paymentsResponse, statsResponse] = await Promise.all([
        adminApiService.getSubscriptions(1, 100),
        adminApiService.getPayments(1, 100),
        adminApiService.getPaymentStats(),
      ]);
      
      setSubscriptions(subscriptionsResponse.data);
      setPayments(paymentsResponse.data);
      setPaymentStats(statsResponse);
    } catch (error: any) {
      toast({
        title: "Failed to load data",
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
          Subscriptions & Payments
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage user subscriptions and view payment history across all gateways
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(paymentStats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">All-time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(paymentStats.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Crown className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeSubscriptions.length}</div>
            <p className="text-xs text-muted-foreground">{subscriptions.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{paymentStats.failedPayments}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="subscriptions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="subscriptions">Subscription Status</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Subscriptions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Current subscription status, payment methods, and billing dates
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">User</th>
                      <th className="text-left p-2">Plan</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Payment Method</th>
                      <th className="text-left p-2">Current Period</th>
                      <th className="text-left p-2">Next Billing</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((subscription: any) => (
                      <tr key={subscription.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{subscription.user.email}</div>
                            <div className="text-sm text-gray-500 flex items-center">
                              {subscription.user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                              {subscription.user.role}
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            subscription.plan.id === 'pro' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : subscription.plan.id === 'premium'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {subscription.plan.id === 'pro' && <Crown className="w-3 h-3 mr-1" />}
                            {subscription.plan.id.charAt(0).toUpperCase() + subscription.plan.id.slice(1)}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            subscription.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : subscription.status === 'canceled'
                              ? 'bg-red-100 text-red-800'
                              : subscription.status === 'past_due'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {subscription.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {subscription.status === 'canceled' && <XCircle className="w-3 h-3 mr-1" />}
                            {subscription.status === 'past_due' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center space-x-2">
                            <PaymentMethodIcon method={subscription.paymentMethod} />
                            <span className="text-sm capitalize">
                              {subscription.paymentMethod?.replace('_', ' ') || 'Not set'}
                            </span>
                          </div>
                        </td>
                        <td className="p-2 text-sm">
                          {subscription.currentPeriodStart && subscription.currentPeriodEnd ? (
                            <div>
                              <div>{formatDate(subscription.currentPeriodStart)}</div>
                              <div className="text-gray-500">to {formatDate(subscription.currentPeriodEnd)}</div>
                            </div>
                          ) : (
                            <span className="text-gray-500">N/A</span>
                          )}
                        </td>
                        <td className="p-2 text-sm">
                          {subscription.nextBillingDate ? (
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(subscription.nextBillingDate)}
                            </div>
                          ) : (
                            <span className="text-gray-500">No billing date</span>
                          )}
                        </td>
                        <td className="p-2">
                          <button className="text-blue-600 hover:text-blue-800 text-sm flex items-center">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View Details
                          </button>
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
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <p className="text-sm text-muted-foreground">
                All payment transactions across Stripe, Mercado Pago, and Kiwify
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">User</th>
                      <th className="text-left p-2">Amount</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Gateway</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-left p-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment: any) => (
                      <tr key={payment.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{payment.user.email}</div>
                            <div className="text-sm text-gray-500">
                              {payment.user.role === 'admin' && <Shield className="w-3 h-3 inline mr-1" />}
                              {payment.user.role}
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="font-bold text-lg">
                            {formatCurrency(Number(payment.amount))}
                          </div>
                          <div className="text-xs text-gray-500">
                            {payment.currency?.toUpperCase()}
                          </div>
                        </td>
                        <td className="p-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            payment.status === 'succeeded' 
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : payment.status === 'refunded'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.status === 'succeeded' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {payment.status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center space-x-2">
                            <PaymentMethodIcon method={payment.paymentMethod} />
                            <span className="text-sm capitalize">
                              {payment.paymentMethod?.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            payment.type === 'subscription'
                              ? 'bg-blue-100 text-blue-800' 
                              : payment.type === 'one_time'
                              ? 'bg-green-100 text-green-800'
                              : payment.type === 'refund'
                              ? 'bg-red-100 text-red-800'
                              : payment.type === 'chargeback'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {payment.type === 'subscription' && <Crown className="w-3 h-3 mr-1" />}
                            {payment.type === 'one_time' && <DollarSign className="w-3 h-3 mr-1" />}
                            {payment.type === 'refund' && <XCircle className="w-3 h-3 mr-1" />}
                            {payment.type === 'chargeback' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {payment.type?.replace('_', ' ').charAt(0).toUpperCase() + payment.type?.replace('_', ' ').slice(1) || 'Unknown'}
                          </span>
                        </td>
                        <td className="p-2 text-sm">
                          {payment.description || 'No description'}
                        </td>
                        <td className="p-2 text-sm text-gray-500">
                          {formatDate(payment.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {payments.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No payment history found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SubscriptionsPage;