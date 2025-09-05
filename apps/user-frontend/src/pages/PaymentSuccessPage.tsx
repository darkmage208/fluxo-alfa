import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Crown, MessageSquare } from 'lucide-react';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const planName = searchParams.get('plan') || 'Pro';

  useEffect(() => {
    // Here you might want to verify the payment with your backend
    // and update the user's subscription status
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="text-center shadow-xl border-2 border-green-200">
          <CardHeader className="pb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-green-800 mb-4">
              Payment Successful!
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              Welcome to {planName} plan! Your subscription is now active and you have access to all premium features.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Success Details */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Crown className="w-6 h-6 text-yellow-600" />
                <span className="text-xl font-semibold text-green-800">{planName} Plan Activated</span>
              </div>
              <div className="text-sm text-green-700 space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Unlimited messages now available</span>
                </div>
                <div>Session ID: <code className="bg-green-100 px-2 py-1 rounded text-xs">{sessionId}</code></div>
              </div>
            </div>

            {/* What's Next */}
            <div className="text-left">
              <h3 className="text-lg font-semibold mb-4 text-center">What's next?</h3>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Start unlimited conversations with our AI</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Access advanced AI models and features</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Enjoy priority processing and support</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Manage your subscription in the billing page</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4 pt-6">
              <Link to="/chat" className="block">
                <Button size="lg" className="w-full text-lg py-6 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                  Start Chatting Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              
              <div className="flex space-x-4">
                <Link to="/billing" className="flex-1">
                  <Button variant="outline" className="w-full">
                    View Billing
                  </Button>
                </Link>
                <Link to="/" className="flex-1">
                  <Button variant="ghost" className="w-full">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </div>

            {/* Support Notice */}
            <div className="text-center text-sm text-gray-500 pt-4 border-t">
              <p>
                Need help? Contact our support team or visit our{' '}
                <a href="#" className="text-blue-600 hover:underline">help center</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;