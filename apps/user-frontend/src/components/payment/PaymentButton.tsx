import React from 'react';
import { Button } from '@/components/ui/button';
import { Crown, Loader2, Shield } from 'lucide-react';

interface PaymentButtonProps {
  selectedGateway: string;
  isProcessing: boolean;
  onPayment: () => void;
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  selectedGateway,
  isProcessing,
  onPayment,
}) => {
  return (
    <div className="space-y-6">
      <Button
        onClick={onPayment}
        disabled={!selectedGateway || isProcessing}
        size="lg"
        className="w-full text-lg py-6"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-3 h-6 w-6 animate-spin" />
            Configurando pagamento...
          </>
        ) : (
          <>
            <Crown className="mr-3 h-6 w-6" />
            Comprar Pro - R$197/mês
          </>
        )}
      </Button>

      <div className="text-center space-y-3 pt-4">
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Pagamento seguro fornecido por líderes da indústria</span>
        </div>
        <div className="text-xs text-muted-foreground max-w-md mx-auto">
          Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade. 
          Sua assinatura será renovada automaticamente, a menos que cancelada.
        </div>
      </div>
    </div>
  );
};