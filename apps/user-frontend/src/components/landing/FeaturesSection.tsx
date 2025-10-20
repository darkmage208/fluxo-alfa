import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Zap, Shield, Users } from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: "Conversas com IA",
    description: "Participe de conversas naturais e inteligentes com tecnologia de IA avançada"
  },
  {
    icon: Zap,
    title: "Respostas Instantâneas",
    description: "Obtenha respostas instantâneas às suas perguntas com performance otimizada"
  },
  {
    icon: Shield,
    title: "Seguro e Privado",
    description: "Suas conversas são criptografadas e protegidas com segurança de nível empresarial"
  },
  {
    icon: Users,
    title: "Suporte Multi-Usuário",
    description: "Colabore com sua equipe e compartilhe conversas perfeitamente"
  }
];

export const FeaturesSection: React.FC = () => {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Por que Escolher o Fluxo Alfa?</h2>
          <p className="text-xl text-muted-foreground">
            Descubra os recursos que fazem nossa plataforma de IA se destacar
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