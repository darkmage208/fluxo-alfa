import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="py-20 px-4">
      <div className="container max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4 mr-2" />
          Powered by Advanced AI Technology
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Intelligent Conversations
          <br />
          Unlimited Possibilities
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Experience the future of AI communication with Fluxo Alfa. 
          Engage in natural conversations, get instant insights, and unlock your productivity potential.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register">
            <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/chat">
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg px-8 py-6">
              Try Demo
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};