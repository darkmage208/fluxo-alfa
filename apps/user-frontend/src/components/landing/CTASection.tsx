import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export const CTASection: React.FC = () => {
  return (
    <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="container max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Ready to Transform Your Conversations?
        </h2>
        <p className="text-xl mb-8 opacity-90">
          Join thousands of users who have already discovered the power of AI-driven communication
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8 py-6">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 border-white text-white hover:bg-white hover:text-blue-600">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};