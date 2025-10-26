import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { CreditCard, Crown } from 'lucide-react';
import { billingApi } from '@/lib/api';

interface CurrentPlanCardProps {
  subscription: any;
  isPro: boolean;
  isCanceled: boolean;
  onManageBilling: () => void;
  onCancelSubscription: () => void;
}

interface PlanSettings {
  free: {
    messageLimit: number;
    features: string[];
  };
  pro: {
    messageLimit: number | null;
    features: string[];
  };
}

export const CurrentPlanCard: React.FC<CurrentPlanCardProps> = ({
  subscription,
  isPro,
  isCanceled,
  onManageBilling,
  onCancelSubscription,
}) => {
  const [planSettings, setPlanSettings] = useState<PlanSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPlanSettings();
  }, []);

  const loadPlanSettings = async () => {
    try {
      const settings = await billingApi.getPlanSettings();
      setPlanSettings(settings);
    } catch (error) {
      console.error('Failed to load plan settings:', error);
      // Fallback to default values
      setPlanSettings({
        free: {
          messageLimit: 5,
          features: ['Respostas com IA', 'Busca contextual RAG', 'Suporte básico']
        },
        pro: {
          messageLimit: null,
          features: ['Chats ilimitados', 'Suporte prioritário', 'Recursos avançados de IA', 'Capacidades RAG aprimoradas']
        }
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Plano Atual
        </CardTitle>
        <CardDescription>Detalhes da sua assinatura ativa</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Plano:</span>
            <div className="flex items-center">
              {isPro && <Crown className="w-4 h-4 mr-1 text-yellow-500" />}
              <span className={`font-semibold ${isPro ? 'text-yellow-600' : 'text-gray-600'}`}>
                {subscription?.plan?.id === 'pro' ? 'Pro' : 'Gratuito'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="font-medium">Status:</span>
            <span className={`font-semibold ${
              subscription?.status === 'active' ? 'text-green-600' : 
              isCanceled ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {subscription?.status === 'active' ? 'Ativo' :
               isCanceled ? 'Cancelado' : subscription?.status || 'Gratuito'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium">Limite Diário de Chats:</span>
            <span className="font-semibold">
              {isLoading ? 'Carregando...' : 
               isPro ? 'Ilimitado' : 
               (planSettings?.free.messageLimit || 5)}
            </span>
          </div>

          {subscription?.paymentMethod && isPro && (
            <div className="flex items-center justify-between">
              <span className="font-medium">Método de Pagamento:</span>
              <span className="font-semibold capitalize">
                {subscription.paymentMethod.replace('_', ' ')}
              </span>
            </div>
          )}

          {subscription?.currentPeriodEnd && (
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {isCanceled ? 'Termina em:' : 'Renova em:'}
              </span>
              <span className="font-semibold">
                {formatDate(subscription.currentPeriodEnd)}
              </span>
            </div>
          )}

          <div className="pt-4 border-t">
            {isPro ? (
              <div className="space-y-2">
                <Button
                  onClick={onManageBilling}
                  className="w-full"
                >
                  Gerenciar Cobrança
                </Button>
                {!isCanceled && (
                  <Button
                    variant="outline"
                    onClick={onCancelSubscription}
                    className="w-full"
                  >
                    Cancelar Assinatura
                  </Button>
                )}
              </div>
            ) : (
              <Link to="/payment">
                <Button className="w-full">
                  <Crown className="w-4 h-4 mr-2" />
                  Fazer Upgrade para Pro
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};