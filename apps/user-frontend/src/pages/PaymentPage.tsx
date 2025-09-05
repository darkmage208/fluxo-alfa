import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';
import { billingApi } from '@/lib/api';
import { 
  Crown, 
  CheckCircle, 
  CreditCard, 
  ArrowLeft,
  Zap,
  Shield,
  MessageSquare,
  Users,
  Loader2,
  Sparkles
} from 'lucide-react';

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

  const proFeatures = [
    {
      icon: MessageSquare,
      title: "Unlimited Messages",
      description: "Chat as much as you want, no daily limits"
    },
    {
      icon: Zap,
      title: "Priority Processing",
      description: "Faster response times and priority queue"
    },
    {
      icon: Shield,
      title: "Advanced Features",
      description: "Access to latest AI models and capabilities"
    },
    {
      icon: Users,
      title: "Premium Support",
      description: "Dedicated customer support when you need it"
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
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold mb-6">
                <Crown className="w-4 h-4 mr-2" />
                Pro Plan
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-4">
                Unlock Unlimited AI Conversations
              </h1>
              <p className="text-xl text-muted-foreground">
                Get the full power of AI with unlimited messages and premium features
              </p>
            </div>

            <div className="space-y-6">
              {proFeatures.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-blue-100">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">$36</div>
                <div className="text-lg text-green-600 font-semibold mb-2">R$197</div>
                <div className="text-muted-foreground mb-4">per month</div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Cancel anytime
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Payment Method Selection */}
          <div className="space-y-8">
            <Card className="border-2 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <CreditCard className="w-6 h-6 mr-3" />
                  Choose Payment Method
                </CardTitle>
                <CardDescription className="text-base">
                  Select your preferred payment gateway to complete your Pro subscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {gateways.map((gateway) => (
                  <div
                    key={gateway.id}
                    className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                      selectedGateway === gateway.id
                        ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    onClick={() => setSelectedGateway(gateway.id)}
                  >
                    {gateway.popular && (
                      <div className="absolute -top-3 left-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm px-4 py-1 rounded-full font-medium">
                        Most Popular
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-3xl">{gateway.icon}</div>
                        <div>
                          <div className="font-bold text-xl">{gateway.name}</div>
                          <div className="text-sm text-muted-foreground mb-2">{gateway.description}</div>
                          <div className="flex items-center space-x-2">
                            {gateway.currencies.map((currency) => (
                              <span key={currency} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                {currency}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedGateway === gateway.id
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedGateway === gateway.id && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Payment Button */}
            <Button
              onClick={handlePayment}
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
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;