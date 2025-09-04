import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye
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
  
  // Pagination state for subscriptions
  const [subscriptionsPage, setSubscriptionsPage] = useState(1);
  const [subscriptionsPageSize, setSubscriptionsPageSize] = useState(25);
  const [totalSubscriptions, setTotalSubscriptions] = useState(0);
  
  // Pagination state for payments
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsPageSize, setPaymentsPageSize] = useState(25);
  const [totalPayments, setTotalPayments] = useState(0);
  
  // Detail dialog state
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // Active tab state
  const [activeTab, setActiveTab] = useState('subscriptions');
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [subscriptionsPage, subscriptionsPageSize, paymentsPage, paymentsPageSize]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [subscriptionsResponse, paymentsResponse, statsResponse] = await Promise.all([
        adminApiService.getSubscriptions(subscriptionsPage, subscriptionsPageSize),
        adminApiService.getPayments(paymentsPage, paymentsPageSize),
        adminApiService.getPaymentStats(),
      ]);
      
      setSubscriptions(subscriptionsResponse.data || []);
      setTotalSubscriptions(subscriptionsResponse.pagination?.total || subscriptionsResponse.data?.length || 0);
      
      setPayments(paymentsResponse.data || []);
      setTotalPayments(paymentsResponse.pagination?.total || paymentsResponse.data?.length || 0);
      
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

  const PaginationControls = ({ 
    currentPage, 
    setCurrentPage, 
    pageSize, 
    setPageSize, 
    total, 
    itemName 
  }: { 
    currentPage: number; 
    setCurrentPage: (page: number) => void; 
    pageSize: number; 
    setPageSize: (size: number) => void; 
    total: number; 
    itemName: string; 
  }) => {
    const totalPages = Math.ceil(total / pageSize);
    
    return (
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-0 px-4 lg:px-6 py-3 lg:py-4 border-t bg-gray-50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 order-2 lg:order-1">
          <div className="flex items-center text-xs lg:text-sm text-gray-600">
            Showing {Math.min((currentPage - 1) * pageSize + 1, total)} to {Math.min(currentPage * pageSize, total)} of {total.toLocaleString()} {itemName}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs lg:text-sm text-gray-600 whitespace-nowrap">Show:</span>
            <Select 
              value={pageSize.toString()} 
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-16 lg:w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center space-x-1 lg:space-x-2 order-1 lg:order-2 w-full lg:w-auto justify-center lg:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
            className="px-2 lg:px-3 h-8"
          >
            <ChevronLeft className="w-3 h-3 lg:w-4 lg:h-4 mr-0 lg:mr-1" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          
          <div className="flex items-center space-x-1">
            {(() => {
              const pages = [];
              
              // Always show first page
              pages.push(
                <Button
                  key={1}
                  variant={currentPage === 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={isLoading}
                  className="w-6 h-6 lg:w-8 lg:h-8 p-0 text-xs lg:text-sm"
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
                      className="w-6 h-6 lg:w-8 lg:h-8 p-0 text-xs lg:text-sm"
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
                    className="w-6 h-6 lg:w-8 lg:h-8 p-0 text-xs lg:text-sm"
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
            disabled={currentPage >= totalPages || isLoading}
            className="px-2 lg:px-3 h-8"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3 h-3 lg:w-4 lg:h-4 ml-0 lg:ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 lg:space-y-6 p-4 lg:p-6">
      <div className="space-y-2">
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center">
          <CreditCard className="w-6 h-6 lg:w-8 lg:h-8 mr-2 lg:mr-3" />
          <span className="hidden sm:inline">Subscriptions & Payments</span>
          <span className="sm:hidden">Subscriptions</span>
        </h1>
        <p className="text-muted-foreground text-sm lg:text-base">
          Manage user subscriptions and view payment history across all gateways
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(paymentStats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">All-time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-blue-600">{formatCurrency(paymentStats.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Subs</CardTitle>
            <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">{activeSubscriptions.length}</div>
            <p className="text-xs text-muted-foreground">{subscriptions.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Failed Payments</CardTitle>
            <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-red-600">{paymentStats.failedPayments}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-10 lg:h-12">
          <TabsTrigger value="subscriptions" className="text-xs lg:text-sm px-2 lg:px-4">
            <span className="hidden sm:inline">Subscription Status</span>
            <span className="sm:hidden">Subscriptions</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs lg:text-sm px-2 lg:px-4">
            <span className="hidden sm:inline">Payment History</span>
            <span className="sm:hidden">Payments</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="subscriptions" className="space-y-3 lg:space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg lg:text-xl">User Subscriptions</CardTitle>
              <p className="text-xs lg:text-sm text-muted-foreground">
                Current subscription status, payment methods, and billing dates
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile Card Layout */}
              <div className="block lg:hidden">
                {subscriptions.map((subscription: any) => (
                  <div key={subscription.id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{subscription.user.email}</div>
                          <div className="flex items-center mt-1">
                            {subscription.user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                            <span className="text-xs text-gray-500">{subscription.user.role}</span>
                          </div>
                        </div>
                        <Dialog open={detailDialogOpen && selectedSubscription?.id === subscription.id} onOpenChange={setDetailDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSubscription(subscription);
                                setDetailDialogOpen(true);
                              }}
                              className="text-xs h-7"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Subscription Details</DialogTitle>
                              <DialogDescription>
                                Detailed information about {subscription.user.email}'s subscription
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold text-sm">User Information</h4>
                                  <p className="text-sm">{subscription.user.email}</p>
                                  <p className="text-xs text-gray-500">Role: {subscription.user.role}</p>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm">Plan & Status</h4>
                                  <p className="text-sm">{subscription.plan.id} plan</p>
                                  <p className="text-xs text-gray-500">Status: {subscription.status}</p>
                                </div>
                              </div>
                              
                              {subscription.paymentMethod && (
                                <div>
                                  <h4 className="font-semibold text-sm">Payment Method</h4>
                                  <div className="flex items-center space-x-2">
                                    <PaymentMethodIcon method={subscription.paymentMethod} />
                                    <span className="text-sm capitalize">{subscription.paymentMethod?.replace('_', ' ')}</span>
                                  </div>
                                </div>
                              )}
                              
                              {subscription.currentPeriodStart && (
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-semibold text-sm">Current Period</h4>
                                    <p className="text-sm">
                                      {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                                    </p>
                                  </div>
                                  {subscription.nextBillingDate && (
                                    <div>
                                      <h4 className="font-semibold text-sm">Next Billing Date</h4>
                                      <p className="text-sm">{formatDate(subscription.nextBillingDate)}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold text-sm">Created</h4>
                                  <p className="text-sm">{formatDate(subscription.createdAt)}</p>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm">Last Updated</h4>
                                  <p className="text-sm">{formatDate(subscription.updatedAt)}</p>
                                </div>
                              </div>
                              
                              {subscription.cancelAtPeriodEnd && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                  <p className="text-sm text-yellow-800">
                                    <AlertCircle className="w-4 h-4 inline mr-1" />
                                    This subscription will be canceled at the end of the current period.
                                  </p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Plan:</span>
                          <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            subscription.plan.id === 'pro' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : subscription.plan.id === 'premium'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {subscription.plan.id === 'pro' && <Crown className="w-3 h-3 mr-1" />}
                            {subscription.plan.id.charAt(0).toUpperCase() + subscription.plan.id.slice(1)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
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
                        </div>
                        <div>
                          <span className="text-gray-500">Payment:</span>
                          <div className="ml-2 inline-flex items-center space-x-1">
                            <PaymentMethodIcon method={subscription.paymentMethod} />
                            <span className="text-xs capitalize">
                              {subscription.paymentMethod?.replace('_', ' ') || 'Not set'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Next Billing:</span>
                          <span className="ml-2 text-gray-900">
                            {subscription.nextBillingDate ? formatDate(subscription.nextBillingDate) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop Table Layout */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">User</th>
                      <th className="text-left p-3">Plan</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Payment Method</th>
                      <th className="text-left p-3">Current Period</th>
                      <th className="text-left p-3">Next Billing</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((subscription: any) => (
                      <tr key={subscription.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{subscription.user.email}</div>
                            <div className="text-sm text-gray-500 flex items-center">
                              {subscription.user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                              {subscription.user.role}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
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
                        <td className="p-3">
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
                        <td className="p-3">
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
                        <td className="p-3">
                          <Dialog open={detailDialogOpen && selectedSubscription?.id === subscription.id} onOpenChange={setDetailDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedSubscription(subscription);
                                  setDetailDialogOpen(true);
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Subscription Details</DialogTitle>
                                <DialogDescription>
                                  Detailed information about {subscription.user.email}'s subscription
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-semibold text-sm">User Information</h4>
                                    <p className="text-sm">{subscription.user.email}</p>
                                    <p className="text-xs text-gray-500">Role: {subscription.user.role}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm">Plan & Status</h4>
                                    <p className="text-sm">{subscription.plan.id} plan</p>
                                    <p className="text-xs text-gray-500">Status: {subscription.status}</p>
                                  </div>
                                </div>
                                
                                {subscription.paymentMethod && (
                                  <div>
                                    <h4 className="font-semibold text-sm">Payment Method</h4>
                                    <div className="flex items-center space-x-2">
                                      <PaymentMethodIcon method={subscription.paymentMethod} />
                                      <span className="text-sm capitalize">{subscription.paymentMethod?.replace('_', ' ')}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {subscription.currentPeriodStart && (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-semibold text-sm">Current Period</h4>
                                      <p className="text-sm">
                                        {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                                      </p>
                                    </div>
                                    {subscription.nextBillingDate && (
                                      <div>
                                        <h4 className="font-semibold text-sm">Next Billing Date</h4>
                                        <p className="text-sm">{formatDate(subscription.nextBillingDate)}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-semibold text-sm">Created</h4>
                                    <p className="text-sm">{formatDate(subscription.createdAt)}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm">Last Updated</h4>
                                    <p className="text-sm">{formatDate(subscription.updatedAt)}</p>
                                  </div>
                                </div>
                                
                                {subscription.cancelAtPeriodEnd && (
                                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <p className="text-sm text-yellow-800">
                                      <AlertCircle className="w-4 h-4 inline mr-1" />
                                      This subscription will be canceled at the end of the current period.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {subscriptions.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-gray-500">
                    No subscriptions found
                  </div>
                )}
              </div>
              
              {/* Subscriptions Pagination */}
              {totalSubscriptions > 0 && (
                <PaginationControls
                  currentPage={subscriptionsPage}
                  setCurrentPage={setSubscriptionsPage}
                  pageSize={subscriptionsPageSize}
                  setPageSize={setSubscriptionsPageSize}
                  total={totalSubscriptions}
                  itemName="subscriptions"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-3 lg:space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg lg:text-xl">Payment History</CardTitle>
              <p className="text-xs lg:text-sm text-muted-foreground">
                All payment transactions across Stripe, Mercado Pago, and Kiwify
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile Card Layout */}
              <div className="block lg:hidden">
                {payments.map((payment: any) => (
                  <div key={payment.id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{payment.user.email}</div>
                          <div className="flex items-center mt-1">
                            {payment.user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                            <span className="text-xs text-gray-500">{payment.user.role}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {formatCurrency(Number(payment.amount))}
                          </div>
                          <div className="text-xs text-gray-500">
                            {payment.currency?.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
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
                        </div>
                        <div>
                          <span className="text-gray-500">Gateway:</span>
                          <div className="ml-2 inline-flex items-center space-x-1">
                            <PaymentMethodIcon method={payment.paymentMethod} />
                            <span className="text-xs capitalize">
                              {payment.paymentMethod?.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Type:</span>
                          <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
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
                        </div>
                        <div>
                          <span className="text-gray-500">Date:</span>
                          <span className="ml-2 text-gray-900">{formatDate(payment.createdAt)}</span>
                        </div>
                      </div>
                      {payment.description && (
                        <div className="text-xs">
                          <span className="text-gray-500">Description:</span>
                          <span className="ml-2 text-gray-900">{payment.description}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">User</th>
                      <th className="text-left p-3">Amount</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Gateway</th>
                      <th className="text-left p-3">Type</th>
                      <th className="text-left p-3">Description</th>
                      <th className="text-left p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment: any) => (
                      <tr key={payment.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{payment.user.email}</div>
                            <div className="text-sm text-gray-500">
                              {payment.user.role === 'admin' && <Shield className="w-3 h-3 inline mr-1" />}
                              {payment.user.role}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-lg">
                            {formatCurrency(Number(payment.amount))}
                          </div>
                          <div className="text-xs text-gray-500">
                            {payment.currency?.toUpperCase()}
                          </div>
                        </td>
                        <td className="p-3">
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
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <PaymentMethodIcon method={payment.paymentMethod} />
                            <span className="text-sm capitalize">
                              {payment.paymentMethod?.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
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
                
                {payments.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-gray-500">
                    No payment history found
                  </div>
                )}
              </div>
              
              {/* Payments Pagination */}
              {totalPayments > 0 && (
                <PaginationControls
                  currentPage={paymentsPage}
                  setCurrentPage={setPaymentsPage}
                  pageSize={paymentsPageSize}
                  setPageSize={setPaymentsPageSize}
                  total={totalPayments}
                  itemName="payments"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SubscriptionsPage;