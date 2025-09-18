import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Zap, Shield, Users } from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: "AI-Powered Conversations",
    description: "Engage in natural, intelligent conversations with advanced AI technology"
  },
  {
    icon: Zap,
    title: "Lightning Fast Responses",
    description: "Get instant responses to your questions with optimized performance"
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your conversations are encrypted and protected with enterprise-grade security"
  },
  {
    icon: Users,
    title: "Multi-User Support",
    description: "Collaborate with your team and share conversations seamlessly"
  }
];

export const FeaturesSection: React.FC = () => {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Fluxo Alfa?</h2>
          <p className="text-xl text-muted-foreground">
            Discover the features that make our AI platform stand out
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-accent-foreground" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};