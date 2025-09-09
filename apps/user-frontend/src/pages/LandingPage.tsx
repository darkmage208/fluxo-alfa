import React from 'react';
import { 
  Header,
  HeroSection,
  FeaturesSection,
  PricingSection,
  TestimonialsSection,
  CTASection,
  Footer
} from '@/components/landing';

const LandingPage = () => {

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default LandingPage;