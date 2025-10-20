import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

const plans = [
  {
    name: "Gratuito",
    price: "R$0",
    period: "para sempre",
    description: "Perfeito para começar",
    features: [
      "5 mensagens por dia",
      "Respostas básicas de IA",
      "Suporte padrão",
      "Acesso web"
    ],
    popular: false,
    buttonText: "Começar",
    buttonLink: "/register"
  },
  {
    name: "Pro",
    price: "R$197",
    period: "por mês",
    description: "Conversas ilimitadas e recursos premium",
    features: [
      "Mensagens ilimitadas",
      "Processamento prioritário",
      "Modelos de IA avançados",
      "Suporte premium",
      "Acesso à API",
      "Integrações personalizadas"
    ],
    popular: true,
    buttonText: "Fazer Upgrade para Pro",
    buttonLink: "/payment"
  }
];

export const PricingSection: React.FC = () => {
  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 bg-background">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Escolha Seu Plano</h2>
          <p className="text-xl text-muted-foreground">
            Comece grátis e faça upgrade quando precisar de mais poder
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <Card key={index} className={`relative flex flex-col h-full ${plan.popular ? 'border-2 border-primary shadow-xl' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-semibold">
                  Mais Popular
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-foreground">{plan.name}</CardTitle>
                <div className="mb-2">
                  <div className="text-4xl font-bold text-primary">
                    {plan.price}
                    <span className="text-lg text-muted-foreground font-normal">/{plan.period}</span>
                  </div>
                </div>
                <CardDescription className="text-base text-muted-foreground">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <Link to={plan.buttonLink} className="block">
                    <Button
                      className="w-full text-lg py-6"
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.buttonText}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};