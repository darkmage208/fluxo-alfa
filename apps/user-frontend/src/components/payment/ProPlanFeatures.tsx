import React from 'react';
import { Crown, CheckCircle, MessageSquare, Zap, Shield, Users } from 'lucide-react';

const proFeatures = [
  {
    icon: MessageSquare,
    title: "Mensagens Ilimitadas",
    description: "Converse o quanto quiser, sem limites diários"
  },
  {
    icon: Zap,
    title: "Processamento Prioritário",
    description: "Tempos de resposta mais rápidos e fila prioritária"
  },
  {
    icon: Shield,
    title: "Recursos Avançados",
    description: "Acesso aos modelos de IA mais recentes e capacidades"
  },
  {
    icon: Users,
    title: "Suporte Premium",
    description: "Suporte ao cliente dedicado quando você precisar"
  }
];

export const ProPlanFeatures: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="text-center lg:text-left">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold mb-6">
          <Crown className="w-4 h-4 mr-2" />
          Plano Pro
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">
          Desbloqueie Conversas Ilimitadas com IA
        </h1>
        <p className="text-xl text-muted-foreground">
          Obtenha todo o poder da IA com mensagens ilimitadas e recursos premium
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