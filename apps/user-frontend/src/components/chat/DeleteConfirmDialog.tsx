import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Excluir Conversa?</h2>
        </div>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Isso excluirá permanentemente esta conversa e todas as suas mensagens. 
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end space-x-3">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="px-6"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-6"
          >
            Excluir Conversa
          </Button>
        </div>
      </div>
    </div>
  );
};