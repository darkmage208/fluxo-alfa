import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

interface AccountInfoCardProps {
  user: any;
}

export const AccountInfoCard: React.FC<AccountInfoCardProps> = ({ user }) => {
  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Informações da Conta</CardTitle>
        <CardDescription>Detalhes da sua conta</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <span className="font-medium">Email:</span>
            <span className="ml-2">{user?.email}</span>
          </div>
          <div>
            <span className="font-medium">Conta criada:</span>
            <span className="ml-2">{formatDate(user?.createdAt || new Date())}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};