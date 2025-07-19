import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { runescapeApi } from '@/services/runescapeApi';
import { useToast } from '@/hooks/use-toast';

interface LinkDiscordModalProps {
  open: boolean;
  onClose: () => void;
  discordId: string;
  onLinked?: () => void; // Novo callback opcional
}

export default function LinkDiscordModal({ open, onClose, discordId, onLinked }: LinkDiscordModalProps) {
  const [nick, setNick] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setNick('');
      setSuggestions([]);
      fetchSuggestions();
    }
  }, [open]);

  const fetchSuggestions = async () => {
    // Busca todos os membros dos clãs Atlantis e Argus
    const [atlantis, argus] = await Promise.all([
      runescapeApi.getAtlantisClanMembers(),
      runescapeApi.getAtlantisArgusClanMembers(),
    ]);
    const names = Array.from(new Set([
      ...atlantis.map(m => m.name),
      ...argus.map(m => m.name),
    ]));
    setSuggestions(names);
  };

  const handleConfirm = async () => {
    if (!nick.trim()) {
      toast({ title: 'Erro', description: 'Digite ou selecione seu nick.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    // Verifica se o nick existe nos clãs
    if (!suggestions.includes(nick)) {
      toast({ title: 'Erro', description: 'Nick não encontrado nos clãs Atlantis/Argus.', variant: 'destructive' });
      setLoading(false);
      return;
    }
    // Busca player_id e clan_name
    const { data: player } = await supabase
      .from('players')
      .select('id, clan_name')
      .eq('username', nick)
      .single();
    // Busca usuário autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Erro', description: 'Usuário não autenticado.', variant: 'destructive' });
      setLoading(false);
      return;
    }
    // Busca dados do Discord
    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || '';
    const email = user.email || '';
    const discordIdentity = Array.isArray(user.identities)
      ? user.identities.find(i => i.provider === 'discord')
      : null;
    const discordId = discordIdentity?.id || null;
    // Atualiza associação existente pelo id do usuário Supabase
    await supabase.from('discord_links').update({
      username: nick,
      player_id: player?.id || null,
    }).eq('id', user.id);
    // Upsert em user_roles
    await supabase.from('user_roles').upsert({
      user_id: user.id,
      display_name: displayName,
      email,
      discord_id: discordId,
      clan_name: player?.clan_name || null,
    }, { onConflict: 'user_id,clan_name' });
    setLoading(false);
    toast({ title: 'Sucesso', description: 'Discord vinculado ao seu nick!', variant: 'default' });
    if (onLinked) onLinked(); // Chama callback se fornecido
    onClose();
  };

  const filteredSuggestions = suggestions.filter(s => s.toLowerCase().includes(nick.toLowerCase())).slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-runescape-gold">Vincular Discord ao RuneScape</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>Digite ou selecione seu nick do RuneScape para vincular ao Discord:</p>
          <Input
            value={nick}
            onChange={e => setNick(e.target.value)}
            placeholder="Ex: AtlantisLord"
            disabled={loading}
            list="rs-nicks"
          />
          <datalist id="rs-nicks">
            {filteredSuggestions.map(s => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <Button onClick={handleConfirm} disabled={loading || !nick} className="w-full">
            {loading ? 'Vinculando...' : 'Vincular'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
