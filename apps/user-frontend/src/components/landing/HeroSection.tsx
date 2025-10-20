import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 bg-background">
      <div className="container max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4 mr-2" />
          Alimentado por Tecnologia de IA Avançada
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground leading-tight">
          Conversas Inteligentes
          <br className="hidden sm:block" />
          <span className="sm:hidden"> </span>
          Possibilidades Ilimitadas
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
          Experimente o futuro da comunicação com IA com o Fluxo Alfa.
          Participe de conversas naturais, obtenha insights instantâneos e desbloqueie seu potencial de produtividade.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground">
              Iniciar Teste Gratuito
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/chat" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg px-8 py-6">
              Experimentar Demo
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};