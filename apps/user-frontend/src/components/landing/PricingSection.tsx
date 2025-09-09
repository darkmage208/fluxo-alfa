import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    features: [
      "10 messages per day",
      "Basic AI responses",
      "Standard support",
      "Web access"
    ],
    popular: false,
    buttonText: "Get Started",
    buttonLink: "/register"
  },
  {
    name: "Pro",
    price: "$36",
    period: "per month",
    description: "Unlimited conversations and premium features",
    features: [
      "Unlimited messages",
      "Priority processing",
      "Advanced AI models",
      "Premium support",
      "API access",
      "Custom integrations"
    ],
    popular: true,
    buttonText: "Upgrade to Pro",
    buttonLink: "/payment"
  }
];

export const PricingSection: React.FC = () => {
  return (
    <section className="py-20 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Plan</h2>
          <p className="text-xl text-gray-600">
            Start free and upgrade when you need more power
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <Card key={index} className={`relative ${plan.popular ? 'border-2 border-blue-500 shadow-xl' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {plan.price}
                  <span className="text-lg text-gray-500 font-normal">/{plan.period}</span>
                  {plan.name === 'Pro' && <div className="text-lg text-green-600 font-semibold">R$197</div>}
                </div>
                <CardDescription className="text-base">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to={plan.buttonLink} className="block">
                  <Button 
                    className={`w-full text-lg py-6 ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                        : ''
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {plan.buttonText}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};