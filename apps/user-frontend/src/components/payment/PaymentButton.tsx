import React from 'react';
import { Button } from '@/components/ui/button';
import { Crown, Loader2, Shield } from 'lucide-react';

interface PaymentButtonProps {
  selectedGateway: string;
  isProcessing: boolean;
  onPayment: () => void;
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  selectedGateway,
  isProcessing,
  onPayment,
}) => {
  return (
    <div className="space-y-6">
      <Button
        onClick={onPayment}
        disabled={!selectedGateway || isProcessing}
        size="lg"
        className="w-full text-xl py-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-3 h-6 w-6 animate-spin" />
            Setting up payment...
          </>
        ) : (
          <>
            <Crown className="mr-3 h-6 w-6" />
            Purchase Pro - $36/month (R$197)
          </>
        )}
      </Button>

      <div className="text-center space-y-3 pt-4">
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Secure payment powered by industry leaders</span>
        </div>
        <div className="text-xs text-muted-foreground max-w-md mx-auto">
          By continuing, you agree to our Terms of Service and Privacy Policy. 
          Your subscription will renew automatically unless cancelled.
        </div>
      </div>
    </div>
  );
};