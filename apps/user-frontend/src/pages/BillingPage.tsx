import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { billingApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, CreditCard, Crown, Check } from 'lucide-react';

const BillingPage = () => {
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuthStore();

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const data = await billingApi.getSubscription();
      setSubscription(data);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      const { url } = await billingApi.createCheckoutSession({
        priceId: import.meta.env.VITE_STRIPE_PRICE_PRO || 'price_pro_placeholder',
        successUrl: `${window.location.origin}/billing?success=true`,
        cancelUrl: `${window.location.origin}/billing?canceled=true`,
      });
      
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: "Failed to start checkout",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleManageBilling = async () => {
    try {
      const { url } = await billingApi.getCustomerPortal(window.location.href);
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: "Failed to open billing portal",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await billingApi.cancelSubscription();
      await loadSubscription();
      toast({
        title: "Subscription canceled",
        description: "Your subscription will be canceled at the end of the current period.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to cancel subscription",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isPro = subscription?.plan?.id === 'pro' && subscription?.status === 'active';
  const isCanceled = subscription?.status === 'canceled';

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/chat">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chat
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-gray-600 mt-2">Manage your Fluxo Alfa subscription</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Current Plan
              </CardTitle>
              <CardDescription>Your active subscription details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Plan:</span>
                  <div className="flex items-center">
                    {isPro && <Crown className="w-4 h-4 mr-1 text-yellow-500" />}
                    <span className={`font-semibold ${isPro ? 'text-yellow-600' : 'text-gray-600'}`}>
                      {subscription?.plan?.id === 'pro' ? 'Pro' : 'Free'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status:</span>
                  <span className={`font-semibold ${
                    subscription?.status === 'active' ? 'text-green-600' : 
                    isCanceled ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {subscription?.status === 'active' ? 'Active' :
                     isCanceled ? 'Canceled' : subscription?.status || 'Free'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Daily Chat Limit:</span>
                  <span className="font-semibold">
                    {subscription?.plan?.dailyChatLimit || 'Unlimited'}
                  </span>
                </div>

                {subscription?.currentPeriodEnd && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {isCanceled ? 'Ends on:' : 'Renews on:'}
                    </span>
                    <span className="font-semibold">
                      {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  </div>
                )}

                <div className="pt-4 border-t">
                  {isPro ? (
                    <div className="space-y-2">
                      <Button
                        onClick={handleManageBilling}
                        className="w-full"
                      >
                        Manage Billing
                      </Button>
                      {!isCanceled && (
                        <Button
                          variant="outline"
                          onClick={handleCancelSubscription}
                          className="w-full"
                        >
                          Cancel Subscription
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      onClick={handleUpgrade}
                      className="w-full"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade to Pro
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Comparison */}
          <div className="space-y-4">
            {/* Free Plan */}
            <Card className={subscription?.plan?.id === 'free' ? 'ring-2 ring-blue-500' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Free Plan</span>
                  {subscription?.plan?.id === 'free' && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                      Current
                    </span>
                  )}
                </CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                    <span>10 chats per day</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                    <span>AI-powered responses</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                    <span>RAG context search</span>
                  </div>
                  <div className="pt-4">
                    <div className="text-2xl font-bold">Free</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className={isPro ? 'ring-2 ring-yellow-500' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Crown className="w-5 h-5 mr-2 text-yellow-500" />
                    <span>Pro Plan</span>
                  </div>
                  {isPro && (
                    <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded">
                      Current
                    </span>
                  )}
                </CardTitle>
                <CardDescription>For power users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                    <span>Unlimited chats</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                    <span>Priority support</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                    <span>Advanced AI features</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                    <span>Enhanced RAG capabilities</span>
                  </div>
                  <div className="pt-4">
                    <div className="text-2xl font-bold">
                      $9.99
                      <span className="text-sm font-normal text-gray-500">/month</span>
                    </div>
                  </div>
                  {!isPro && (
                    <Button onClick={handleUpgrade} className="w-full mt-4">
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade Now
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Account Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Email:</span>
                <span className="ml-2">{user?.email}</span>
              </div>
              <div>
                <span className="font-medium">Account created:</span>
                <span className="ml-2">{formatDate(user?.createdAt || new Date())}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BillingPage;