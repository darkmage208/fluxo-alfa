import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';
import { billingApi } from '@/lib/api';
import { ProPlanFeatures, PaymentGatewaySelector, PaymentButton } from '@/components/payment';
import { ArrowLeft, Sparkles } from 'lucide-react';

const PaymentPage = () => {
  const [selectedGateway, setSelectedGateway] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const gateways = [
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Credit/Debit Cards, Apple Pay, Google Pay',
      icon: '💳',
      popular: true,
      currencies: ['USD', 'EUR', 'BRL'],
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'mercado_pago',
      name: 'Mercado Pago',
      description: 'PIX, Credit Cards, Bank Transfer',
      icon: '💰',
      popular: false,
      currencies: ['BRL', 'ARS', 'MXN'],
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      id: 'kiwify',
      name: 'Kiwify',
      description: 'Brazilian Payment Methods, PIX',
      icon: '🥝',
      popular: false,
      currencies: ['BRL'],
      color: 'from-green-500 to-green-600'
    }
  ];


  const handlePayment = async () => {
    if (!selectedGateway) {
      toast({
        title: "Please select a payment method",
        description: "Choose your preferred payment gateway to continue",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create checkout session with selected gateway
      const checkoutData = {
        planId: 'pro',
        gateway: selectedGateway,
        returnUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment`,
        metadata: {
          userId: user?.id,
          email: user?.email,
          gateway: selectedGateway
        }
      };

      const selectedGatewayInfo = gateways.find(g => g.id === selectedGateway);
      
      toast({
        title: "Redirecting to payment...",
        description: `Setting up your ${selectedGatewayInfo?.name} payment`,
      });

      // Show development notification instead of actual payment processing
      toast({
        title: "Feature Under Development",
        description: `Payment integration with ${selectedGatewayInfo?.name} is currently being developed. Please check back soon!`,
        variant: "default",
        duration: 8000,
      });
      
      setIsProcessing(false);
      return;

      // TODO: Uncomment when payment gateways are implemented
      // const response = await billingApi.createCheckoutSession(checkoutData);
      // 
      // if (response.checkoutUrl) {
      //   // Small delay to show the processing message
      //   setTimeout(() => {
      //     window.location.href = response.checkoutUrl;
      //   }, 1500);
      // } else {
      //   throw new Error('No checkout URL received');
      // }
    } catch (error: any) {
      console.error('Payment initiation error:', error);
      toast({
        title: "Payment setup failed",
        description: error.response?.data?.error || "Unable to connect to payment gateway. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/chat">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Chat
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <div className="text-lg font-semibold">Upgrade to Pro</div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {user?.email}
          </div>
        </div>
      </header>

      <div className="container max-w-6xl mx-auto py-12 px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          
          {/* Left Side - Pro Plan Benefits */}
          <ProPlanFeatures />

          {/* Right Side - Payment Method Selection */}
          <div className="space-y-8">
            <PaymentGatewaySelector
              gateways={gateways}
              selectedGateway={selectedGateway}
              onSelectGateway={setSelectedGateway}
            />

            {/* Payment Button */}
            <PaymentButton
              selectedGateway={selectedGateway}
              isProcessing={isProcessing}
              onPayment={handlePayment}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;