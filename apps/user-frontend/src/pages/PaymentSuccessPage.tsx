import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FlowerConfetti } from '@/components/payment';
import { CheckCircle, ArrowRight, Crown, MessageSquare } from 'lucide-react';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const planName = searchParams.get('plan') || 'Pro';

  useEffect(() => {
    // Here you might want to verify the payment with your backend
    // and update the user's subscription status
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Celebratory flower animation */}
      <FlowerConfetti duration={6000} />
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center space-x-2 mb-8 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="Fluxo Alfa Logo" className="w-8 h-8" />
          <img src="/fluxoalfa.png" alt="Fluxo Alfa" className="h-7 w-auto" />
        </Link>

        <Card className="text-center shadow-lg border-border">
          <CardHeader className="pb-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold text-foreground mb-4">
              Pagamento Bem-sucedido!
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Bem-vindo ao plano {planName}! Sua assinatura está ativa e você tem acesso a todos os recursos premium.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Success Details */}
            <div className="bg-accent rounded-xl p-6 border border-border">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Crown className="w-6 h-6 text-primary" />
                <span className="text-xl font-semibold text-foreground">Plano {planName} Ativado</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Mensagens ilimitadas agora disponíveis</span>
                </div>
                <div>Session ID: <code className="bg-muted px-2 py-1 rounded text-xs">{sessionId}</code></div>
              </div>
            </div>

            {/* What's Next */}
            <div className="text-left">
              <h3 className="text-lg font-semibold mb-4 text-center text-foreground">O que vem a seguir?</h3>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Comece conversas ilimitadas com nossa IA</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Acesse modelos de IA avançados e recursos</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Desfrute de processamento prioritário e suporte</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Gerencie sua assinatura na página de cobrança</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4 pt-6">
              <Link to="/chat" className="block">
                <Button size="lg" className="w-full text-lg py-6">
                  Começar a Conversar Agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              
              <div className="flex space-x-4">
                <Link to="/billing" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Ver Cobrança
                  </Button>
                </Link>
                <Link to="/" className="flex-1">
                  <Button variant="ghost" className="w-full">
                    Voltar ao Início
                  </Button>
                </Link>
              </div>
            </div>

            {/* Support Notice */}
            <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border">
              <p>
                Need help? Contact our support team or visit our{' '}
                <a href="#" className="text-primary hover:underline">help center</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;