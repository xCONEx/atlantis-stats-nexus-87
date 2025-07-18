import { useState, useEffect } from "react";
import { Calendar, Shield, User, DollarSign, FileText, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import axios from 'axios';
import { calcularCargo } from '@/lib/utils';

interface Player {
  id: string;
  username: string;
  display_name?: string;
  clan_name?: string;
}

interface DonationFormData {
  player_id: string;
  amount: number;
  item_name?: string;
  donation_type: string;
  description?: string;
}

interface EnhancedDonationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  donation?: any | null;
  editMode?: boolean;
}

const EnhancedDonationModal = ({ open, onClose, onSave, donation, editMode = false }: EnhancedDonationModalProps) => {
  const [formData, setFormData] = useState<DonationFormData>({
    player_id: "",
    amount: 0,
    item_name: "",
    donation_type: "gp",
    description: ""
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerSearchOpen, setPlayerSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const donationTypes = [
    { value: "gp", label: "Gold (GP)" },
    { value: "item", label: "Item" },
    { value: "citadel", label: "Recursos do Citadel" },
    { value: "event", label: "Evento" }
  ];

  useEffect(() => {
    if (open) {
      fetchPlayers();
      if (donation && editMode) {
        setFormData({
          player_id: donation.player_id,
          amount: donation.amount,
          item_name: donation.item_name || "",
          donation_type: donation.donation_type || "gp",
          description: donation.description || ""
        });
        // Find and set selected player
        const player = players.find(p => p.id === donation.player_id);
        if (player) {
          setSelectedPlayer(player);
        }
      } else {
        resetForm();
      }
    }
  }, [open, donation, editMode, players]);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, username, display_name, clan_name')
        .eq('is_active', true)
        .order('username');

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de jogadores",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      player_id: "",
      amount: 0,
      item_name: "",
      donation_type: "gp",
      description: ""
    });
    setSelectedPlayer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit chamado', { selectedPlayer, formData });
    
    if (!selectedPlayer) {
      toast({
        title: "Erro",
        description: "Selecione um jogador",
        variant: "destructive"
      });
      return;
    }

    if (formData.amount <= 0) {
      toast({
        title: "Erro",
        description: "O valor deve ser maior que zero",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Buscar total antes da alteração
      const { data: donationsBefore } = await supabase
        .from('donations')
        .select('amount')
        .eq('player_id', selectedPlayer.id);
      console.log('donationsBefore', donationsBefore);
      const totalBefore = donationsBefore ? donationsBefore.reduce((acc, d) => acc + (d.amount || 0), 0) : 0;
      const cargoAntes = calcularCargo(totalBefore);
      console.log('cargoAntes', cargoAntes);

      const donationData = {
        player_id: selectedPlayer.id,
        amount: formData.amount,
        item_name: formData.item_name || null,
        donation_type: formData.donation_type,
        description: formData.description || null
      };

      let supabaseResult;
      if (editMode && donation) {
        supabaseResult = await supabase
          .from('donations')
          .update(donationData)
          .eq('id', donation.id);
        console.log('supabaseResult update', supabaseResult);
      } else {
        supabaseResult = await supabase
          .from('donations')
          .insert([donationData]);
        console.log('supabaseResult insert', supabaseResult);
      }
      const { error } = supabaseResult;
      if (error) throw error;

      // Buscar total depois da alteração
      const { data: donationsAfter } = await supabase
        .from('donations')
        .select('amount')
        .eq('player_id', selectedPlayer.id);
      console.log('donationsAfter', donationsAfter);
      const totalAfter = donationsAfter ? donationsAfter.reduce((acc, d) => acc + (d.amount || 0), 0) : 0;
      const cargoDepois = calcularCargo(totalAfter);
      console.log('cargoDepois', cargoDepois);

      // Log para depuração
      console.log('Comparando cargos:', cargoAntes, cargoDepois);

      // Atualizar cargo no Discord (centralizado)
      if (cargoAntes !== cargoDepois) {
        try {
          console.log('Chamando atualizarRoleDiscord', selectedPlayer.id);
          await atualizarRoleDiscord(selectedPlayer.id);
          console.log('Chamada para atualizarRoleDiscord concluída');
          toast({ title: 'Cargo do Discord atualizado!', description: `Novo cargo: ${cargoDepois}` });
        } catch (err) {
          console.error('Erro ao atualizar cargo no Discord:', err.response?.data || err.message);
          toast({ title: 'Erro ao atualizar cargo no Discord', description: err.response?.data?.error || err.message, variant: 'destructive' });
        }
      } else {
        toast({ title: 'Cargo do Discord não mudou', description: 'Nenhuma atualização necessária.' });
      }

      toast({
        title: 'Sucesso',
        description: editMode ? 'Doação atualizada com sucesso' : 'Doação registrada com sucesso'
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving donation:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar doação',
      });
    } finally {
      setLoading(false);
    }
  };

  // Adicionar chamada após exclusão de doação
  const handleDelete = async () => {
    if (!selectedPlayer || !donation) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('donations')
        .delete()
        .eq('id', donation.id);
      if (error) throw error;
      // Atualizar cargo no Discord após remoção
      try {
        await atualizarRoleDiscord(selectedPlayer.id);
        toast({ title: 'Cargo do Discord atualizado após remoção!' });
      } catch (err) {
        console.error('Erro ao atualizar cargo no Discord após remoção:', err.response?.data || err.message);
        toast({ title: 'Erro ao atualizar cargo no Discord', description: err.response?.data?.error || err.message, variant: 'destructive' });
      }
      toast({ title: 'Doação removida com sucesso' });
      onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao remover doação:', error);
      toast({ title: 'Erro ao remover doação', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const formatAmountDisplay = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString('pt-BR');
  };

  // Função para calcular cargo sugerido
  const calcularCargo = (total) => {
    if (total >= 5000000000) return 'Personalizado 👑';
    if (total >= 2500000000) return 'Filantropo 🪙';
    if (total >= 1000000000) return 'Bilionário 💷';
    if (total >= 500000000) return 'Milionário 💵';
    if (total >= 250000000) return 'Generoso 💰';
    return 'Membro';
  };

  // Função para atualizar role no Discord
  const atualizarRoleDiscord = async (playerId) => {
    // Buscar Discord ID associado
    const { data: link } = await supabase
      .from('discord_links')
      .select('discord_id')
      .eq('player_id', playerId)
      .single();
    if (!link || !link.discord_id) return;
    // Buscar total de doações
    const { data: donations } = await supabase
      .from('donations')
      .select('amount')
      .eq('player_id', playerId);
    const total = donations ? donations.reduce((acc, d) => acc + (d.amount || 0), 0) : 0;
    const cargo = calcularCargo(total);
    // Chamar endpoint do bot
    const ENV = process.env.DISCORD_ENV || 'production';
    const BOT_TOKEN = ENV === 'test'
      ? process.env.DISCORD_BOT_TOKEN_TEST || 'SEU_TOKEN_TESTE_AQUI'
      : process.env.DISCORD_BOT_TOKEN_PROD || process.env.DISCORD_BOT_TOKEN || 'SEU_TOKEN_AQUI';
    try {
      await axios.post('/api/discord/roles', {
        discord_id: link.discord_id,
        action: 'update_role',
      }, {
        headers: { Authorization: `Bearer ${BOT_TOKEN}` }
      });
      // Logar mudança
      await supabase.from('activity_logs').insert({
        activity_type: 'role_update',
        description: `Role atualizado para ${cargo} (doação: ${total})`,
        player_id: playerId,
        metadata: { cargo, total }
      });
    } catch (err) {
      await supabase.from('activity_logs').insert({
        activity_type: 'role_update_error',
        description: `Erro ao atualizar role no Discord: ${err.message}`,
        player_id: playerId,
        metadata: { cargo, total }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-runescape-gold">
            {editMode ? "Editar Doação" : "Nova Doação"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Player Search */}
          <div className="space-y-2">
            <Label>Jogador</Label>
            <Popover open={playerSearchOpen} onOpenChange={setPlayerSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={playerSearchOpen}
                  className="w-full justify-between"
                >
                  {selectedPlayer ? (
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{selectedPlayer.display_name || selectedPlayer.username}</span>
                      {selectedPlayer.clan_name && (
                        <span className="text-xs text-muted-foreground">({selectedPlayer.clan_name})</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4" />
                      <span>Selecionar jogador...</span>
                    </div>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Buscar jogador..." />
                  <CommandEmpty>Nenhum jogador encontrado.</CommandEmpty>
                  <CommandGroup>
                    {players.map((player) => (
                      <CommandItem
                        key={player.id}
                        onSelect={() => {
                          setSelectedPlayer(player);
                          setFormData(prev => ({ ...prev, player_id: player.id }));
                          setPlayerSearchOpen(false);
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>{player.display_name || player.username}</span>
                          {player.clan_name && (
                            <span className="text-xs text-muted-foreground">({player.clan_name})</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Donation Type */}
          <div className="space-y-2">
            <Label>Tipo de Doação</Label>
            <Select
              value={formData.donation_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, donation_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {donationTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              {formData.donation_type === 'gp' ? 'Valor (GP)' : 'Quantidade'}
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                placeholder="50000000"
                value={formData.amount || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                className="pl-10"
                required
              />
              {formData.amount > 0 && formData.donation_type === 'gp' && (
                <div className="text-sm text-muted-foreground mt-1">
                  Equivale a: {formatAmountDisplay(formData.amount)} GP
                </div>
              )}
            </div>
          </div>

          {/* Item Name (only for item donations) */}
          {formData.donation_type === 'item' && (
            <div className="space-y-2">
              <Label htmlFor="itemName">Nome do Item</Label>
              <Input
                id="itemName"
                placeholder="Ex: Dragon bones, Raw sharks..."
                value={formData.item_name || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
                required
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Observações (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Informações adicionais sobre a doação..."
              value={formData.description || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="runescape"
              className="flex-1"
              disabled={loading}
            >
              {loading ? "Salvando..." : (editMode ? "Atualizar" : "Salvar")} Doação
            </Button>
          </div>
        </form>
        {donation && (
          <div className="text-xs text-muted-foreground mt-4">
            Adicionado por: {donation.created_by_email ? donation.created_by_email : (donation.created_by || 'Desconhecido')}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedDonationModal;
