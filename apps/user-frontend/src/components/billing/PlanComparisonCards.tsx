import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Check } from 'lucide-react';

interface PlanComparisonCardsProps {
  subscription: any;
  isPro: boolean;
}

export const PlanComparisonCards: React.FC<PlanComparisonCardsProps> = ({
  subscription,
  isPro,
}) => {
  return (
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
              <div className="text-2xl font-bold text-foreground">
                R$197
                <span className="text-sm font-normal text-muted-foreground">/month</span>
                <div className="text-sm text-muted-foreground">$36/month</div>
              </div>
            </div>
            {!isPro && (
              <Link to="/payment">
                <Button className="w-full mt-4">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Now
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};