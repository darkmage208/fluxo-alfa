import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { billingApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { CurrentPlanCard, PlanComparisonCards, AccountInfoCard } from '@/components/billing';
import { ArrowLeft } from 'lucide-react';

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

  const handleUpgrade = () => {
    // Redirect to payment page instead of direct checkout
    window.location.href = '/payment';
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
          <CurrentPlanCard
            subscription={subscription}
            isPro={isPro}
            isCanceled={isCanceled}
            onManageBilling={handleManageBilling}
            onCancelSubscription={handleCancelSubscription}
          />

          {/* Plan Comparison */}
          <PlanComparisonCards
            subscription={subscription}
            isPro={isPro}
          />
        </div>

        {/* Account Info */}
        <AccountInfoCard user={user} />
      </div>
    </div>
  );
};

export default BillingPage;