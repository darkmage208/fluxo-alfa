import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Check } from 'lucide-react';

interface PlanComparisonCardsProps {
  subscription: any;
  isPro: boolean;
}

export const PlanComparisonCards: React.FC<PlanComparisonCardsProps> = ({
  subscription,
  isPro,
}) => {
  return (
    <div className="space-y-4">
      {/* Free Plan */}
      <Card className={subscription?.plan?.id === 'free' ? 'ring-2 ring-blue-500' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Plano Gratuito</span>
            {subscription?.plan?.id === 'free' && (
              <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                Atual
              </span>
            )}
          </CardTitle>
          <CardDescription>Perfeito para começar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-500" />
              <span>5 chats por dia</span>
            </div>
            <div className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-500" />
              <span>Respostas com IA</span>
            </div>
            <div className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-500" />
              <span>Busca contextual RAG</span>
            </div>
            <div className="pt-4">
              <div className="text-2xl font-bold">Gratuito</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pro Plan */}
      <Card className={isPro ? 'ring-2 ring-yellow-500' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Crown className="w-5 h-5 mr-2 text-yellow-500" />
              <span>Plano Pro</span>
            </div>
            {isPro && (
              <span className="text-xs bg-yellow-500 text-white px-2 py-2 rounded">
                Atual
              </span>
            )}
          </CardTitle>
          <CardDescription>Para usuários avançados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-500" />
              <span>Chats ilimitados</span>
            </div>
            <div className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-500" />
              <span>Suporte prioritário</span>
            </div>
            <div className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-500" />
              <span>Recursos avançados de IA</span>
            </div>
            <div className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-500" />
              <span>Capacidades RAG aprimoradas</span>
            </div>
            <div className="pt-4">
              <div className="text-2xl font-bold text-foreground">
                R$197
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </div>
            </div>
            {!isPro && (
              <Link to="/payment">
                <Button className="w-full mt-4">
                  <Crown className="w-4 h-4 mr-2" />
                  Fazer Upgrade Agora
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};