import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { CreditCard, Crown } from 'lucide-react';

interface CurrentPlanCardProps {
  subscription: any;
  isPro: boolean;
  isCanceled: boolean;
  onManageBilling: () => void;
  onCancelSubscription: () => void;
}

export const CurrentPlanCard: React.FC<CurrentPlanCardProps> = ({
  subscription,
  isPro,
  isCanceled,
  onManageBilling,
  onCancelSubscription,
}) => {
  return (
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

          {subscription?.paymentMethod && isPro && (
            <div className="flex items-center justify-between">
              <span className="font-medium">Payment Method:</span>
              <span className="font-semibold capitalize">
                {subscription.paymentMethod.replace('_', ' ')}
              </span>
            </div>
          )}

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
                  onClick={onManageBilling}
                  className="w-full"
                >
                  Manage Billing
                </Button>
                {!isCanceled && (
                  <Button
                    variant="outline"
                    onClick={onCancelSubscription}
                    className="w-full"
                  >
                    Cancel Subscription
                  </Button>
                )}
              </div>
            ) : (
              <Link to="/payment">
                <Button className="w-full">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};