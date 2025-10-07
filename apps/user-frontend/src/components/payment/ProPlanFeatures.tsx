import React from 'react';
import { Crown, CheckCircle, MessageSquare, Zap, Shield, Users } from 'lucide-react';

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

export const ProPlanFeatures: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="text-center lg:text-left">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold mb-6">
          <Crown className="w-4 h-4 mr-2" />
          Pro Plan
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">
          Unlock Unlimited AI Conversations
        </h1>
        <p className="text-xl text-muted-foreground">
          Get the full power of AI with unlimited messages and premium features
        </p>
      </div>

      <div className="space-y-6">
        {proFeatures.map((feature, index) => (
          <div key={index} className="flex items-start space-x-4 p-4 bg-card rounded-xl shadow-sm border border-border">
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-xl border-2 border-primary/20">
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">R$197</div>
          <div className="text-muted-foreground mb-4">per month</div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium">
            <CheckCircle className="w-4 h-4 mr-1" />
            Cancel anytime
          </div>
        </div>
      </div>
    </div>
  );
};