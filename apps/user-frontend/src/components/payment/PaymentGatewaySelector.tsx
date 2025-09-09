import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, CheckCircle } from 'lucide-react';

interface Gateway {
  id: string;
  name: string;
  description: string;
  icon: string;
  popular: boolean;
  currencies: string[];
  color: string;
}

interface PaymentGatewaySelectorProps {
  gateways: Gateway[];
  selectedGateway: string;
  onSelectGateway: (gatewayId: string) => void;
}

export const PaymentGatewaySelector: React.FC<PaymentGatewaySelectorProps> = ({
  gateways,
  selectedGateway,
  onSelectGateway,
}) => {
  return (
    <Card className="border-2 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <CreditCard className="w-6 h-6 mr-3" />
          Choose Payment Method
        </CardTitle>
        <CardDescription className="text-base">
          Select your preferred payment gateway to complete your Pro subscription
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {gateways.map((gateway) => (
          <div
            key={gateway.id}
            className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
              selectedGateway === gateway.id
                ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
            onClick={() => onSelectGateway(gateway.id)}
          >
            {gateway.popular && (
              <div className="absolute -top-3 left-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm px-4 py-1 rounded-full font-medium">
                Most Popular
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-3xl">{gateway.icon}</div>
                <div>
                  <div className="font-bold text-xl">{gateway.name}</div>
                  <div className="text-sm text-muted-foreground mb-2">{gateway.description}</div>
                  <div className="flex items-center space-x-2">
                    {gateway.currencies.map((currency) => (
                      <span key={currency} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                        {currency}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedGateway === gateway.id
                  ? 'bg-blue-600 border-blue-600'
                  : 'border-gray-300'
              }`}>
                {selectedGateway === gateway.id && (
                  <CheckCircle className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};