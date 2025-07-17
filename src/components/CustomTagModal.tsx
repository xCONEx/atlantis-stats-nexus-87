import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomTagModalProps {
  open: boolean;
  onClose: () => void;
  playerId: string;
  totalDonated: number;
}

const MIN_DONATION = 5000000000;

export default function CustomTagModal({ open, onClose, playerId, totalDonated }: CustomTagModalProps) {
  const [tag, setTag] = useState('');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setTag('');
    setPreview('');
  }, [open]);

  if (totalDonated < MIN_DONATION) {
    return null;
  }

  // Validação: formato igual ao exemplo, emoji no início, max 20 chars, cor baseada no emoji
  const validateTag = (value: string) => {
    const emojiRegex = /^\p{Emoji}/u;
    if (!emojiRegex.test(value)) return 'A tag deve começar com um emoji.';
    if (value.length > 20) return 'Máximo de 20 caracteres.';
    // Pode adicionar mais validações conforme necessário
    return '';
  };

  const handlePreview = () => {
    setPreview(tag);
  };

  const handleSubmit = async () => {
    const errorMsg = validateTag(tag);
    if (errorMsg) {
      toast({ title: 'Erro', description: errorMsg, variant: 'destructive' });
      return;
    }
    setLoading(true);
    // Salvar sugestão na tabela custom_tags
    const { error } = await supabase.from('custom_tags').insert({
      player_id: playerId,
      tag,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao salvar sugestão', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Sugestão enviada para aprovação!', variant: 'default' });
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-runescape-gold">Personalizar Tag</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>Você pode sugerir uma tag personalizada (máx. 20 caracteres, deve começar com emoji):</p>
          <Input
            value={tag}
            onChange={e => setTag(e.target.value)}
            placeholder="Ex: 👑 O Rei do GP"
            maxLength={20}
            disabled={loading}
          />
          <Button onClick={handlePreview} disabled={loading || !tag} className="w-full">Pré-visualizar</Button>
          {preview && (
            <div className="p-3 border rounded bg-background text-lg text-center">
              {preview}
            </div>
          )}
          <Button onClick={handleSubmit} disabled={loading || !tag} className="w-full">
            {loading ? 'Enviando...' : 'Enviar para aprovação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 