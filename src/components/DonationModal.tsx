import { useState, useEffect, useMemo } from "react";
import { Calendar, Shield, User, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import axios from 'axios';
import { useToast } from "@/components/ui/use-toast";

interface Donation {
  id: string;
  player_id: string;
  amount: number;
  event: string;
  portals: number;
  date: string;
  created_by: string;
  created_by_email?: string;
  notes?: string;
}

interface DonationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (donation: Omit<Donation, 'id'>) => void;
  donation?: Donation | null;
  editMode?: boolean;
}

function cleanPlayerName(name: string) {
  if (!name) return '';
  return name.normalize('NFC').replace(/[^\p{L}\p{N}\s\-_'!@#$%^&*()+=,.?]/gu, '');
}

function formatGpWithColor(value: number) {
  let display = value.toLocaleString('pt-BR');
  let color = 'text-yellow-300';
  if (value >= 1_000_000_000_000_000) {
    display = (value / 1_000_000_000_000_000).toFixed(3).replace(/\.000$/, '') + 'Q';
    color = 'text-orange-400';
  } else if (value >= 1_000_000_000_000) {
    display = (value / 1_000_000_000_000).toFixed(3).replace(/\.000$/, '') + 'T';
    color = 'text-purple-400';
  } else if (value >= 1_000_000_000) {
    display = (value / 1_000_000_000).toFixed(3).replace(/\.000$/, '') + 'B';
    color = 'text-blue-400';
  } else if (value >= 10_000_000) {
    display = (value / 1_000_000).toFixed(3).replace(/\.000$/, '') + 'M';
    color = 'text-green-400';
  } else if (value >= 100_000) {
    display = (value / 1_000).toFixed(3).replace(/\.000$/, '') + 'K';
    color = 'text-white';
  }
  return { display, color };
}

const DonationModal = ({ open, onClose, onSave, donation, editMode = false }: DonationModalProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    playerName: "",
    amount: "",
    event: "",
    portals: "1",
    date: new Date().toISOString().split('T')[0],
    createdBy: "", // não usar mais para o banco
    createdByEmail: "", // novo campo para o e-mail
    notes: ""
  });

  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const { toast } = useToast();

  const events = [
    "Citadel Upgrade",
    "Boss Event", 
    "Guild Event",
    "Weekly Event",
    "Special Event",
    "Raid Event",
    "PvM Training",
    "Skill Competition"
  ];

  // Sugestões de jogadores para autocomplete
  const playerSuggestions = useMemo(() => {
    if (!formData.playerName) return [];
    const name = cleanPlayerName(formData.playerName).toLowerCase();
    return players.filter(
      (p) =>
        cleanPlayerName(p.display_name || p.username).toLowerCase().includes(name) ||
        cleanPlayerName(p.username).toLowerCase().includes(name)
    );
  }, [formData.playerName, players]);

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, username, display_name, clan_name')
        .eq('is_active', true)
        .order('username');
      if (!error && data) setPlayers(data);
    };
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (open && !editMode) {
      setFormData({
        playerName: "",
        amount: "",
        event: "",
        portals: "1",
        date: new Date().toISOString().split('T')[0],
        createdBy: "",
        createdByEmail: "",
        notes: ""
      });
      setSelectedPlayer(null);
    }
  }, [open, editMode]);

  const calcularCargo = (total) => {
    if (total >= 5000000000) return 'Personalizado 👑';
    if (total >= 2500000000) return 'Filantropo 🪙';
    if (total >= 1000000000) return 'Bilionário 💷';
    if (total >= 500000000) return 'Milionário 💵';
    if (total >= 250000000) return 'Generoso 💰';
    return 'Membro';
  };

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
    try {
      await axios.post('https://atlantisstatus.vercel.app/api/discord-roles', {
        discord_id: link.discord_id,
        action: 'update_role'
      }); // sem header Authorization
      toast({ title: 'Cargo do Discord atualizado!', description: `Novo cargo: ${cargo}` });
    } catch (err) {
      console.error('Erro ao atualizar cargo no Discord:', err.response?.data || err.message);
      toast({ title: 'Erro ao atualizar cargo no Discord', description: err.response?.data?.error || err.message, variant: 'destructive' });
    }
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

    if (!formData.amount || parseInt(formData.amount) <= 0) {
      toast({
        title: "Erro",
        description: "O valor deve ser maior que zero",
        variant: "destructive"
      });
      return;
    }

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
      player_id: selectedPlayer ? selectedPlayer.id : null,
      player_name: formData.playerName || (selectedPlayer ? selectedPlayer.username : ""),
      amount: parseInt(formData.amount),
      event: formData.event,
      portals: parseInt(formData.portals),
      date: formData.date,
      created_by: null, // sempre null
      created_by_email: user?.email || "",
      // notes removido para evitar erro na importação
    };
    // Salvar no Supabase
    const { error } = await supabase.from('donations').insert([
      {
        amount: donationData.amount,
        created_by: donationData.created_by,
        created_by_email: donationData.created_by_email,
        description: formData.notes,
        donation_type: 'gp',
        item_name: null,
        player_id: donationData.player_id,
        player_name: donationData.player_name,
        event: donationData.event,
        portals: donationData.portals,
        date: donationData.date
      }
    ]);
    if (!error) {
      // Buscar total depois da alteração
      const { data: donationsAfter } = await supabase
        .from('donations')
        .select('amount')
        .eq('player_id', selectedPlayer.id);
      console.log('donationsAfter', donationsAfter);
      const totalAfter = donationsAfter ? donationsAfter.reduce((acc, d) => acc + (d.amount || 0), 0) : 0;
      const cargoDepois = calcularCargo(totalAfter);
      console.log('cargoDepois', cargoDepois);
      console.log('Comparando cargos:', cargoAntes, cargoDepois);
      if (cargoAntes !== cargoDepois) {
        await atualizarRoleDiscord(selectedPlayer.id);
      } else {
        toast({ title: 'Cargo do Discord não mudou', description: 'Nenhuma atualização necessária.' });
      }
      onSave(donationData);
    } else {
      alert('Erro ao salvar doação: ' + error.message);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatAmountDisplay = (value: string) => {
    const num = parseInt(value.replace(/\D/g, ''));
    if (isNaN(num)) return '';
    
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)}B`;
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString('pt-BR');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-runescape-gold">
            {editMode ? "Editar Doação" : "Nova Doação"}
          </DialogTitle>
          <DialogDescription>
            {editMode ? "Altere os dados da doação abaixo." : "Preencha os dados da nova doação."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Player Name */}
          <div className="space-y-2">
            <Label htmlFor="playerName">Nome do Jogador</Label>
            <div className="flex gap-2">
              <select
                id="playerSelect"
                className="bg-[#181c24] text-runescape-gold placeholder-runescape-gold/70 border-2 border-border focus:border-runescape-gold rounded-md px-3 py-2 h-11 transition-colors w-1/2"
                value={selectedPlayer?.id || ""}
                onChange={e => {
                  const player = players.find(p => p.id === e.target.value);
                  setSelectedPlayer(player || null);
                  setFormData({ ...formData, playerName: player ? player.username : "" });
                }}
              >
                <option value="" className="text-runescape-gold/70">Selecione um jogador</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>{cleanPlayerName(p.display_name || p.username)}</option>
                ))}
              </select>
              <div className="relative w-full flex-1">
                <input
                  type="text"
                  id="playerName"
                  className="bg-[#181c24] text-white placeholder-gray-400 border-2 border-border focus:border-runescape-gold rounded-md px-3 py-2 h-11 transition-colors w-full"
                  placeholder="Ou digite o nome do jogador"
                  value={formData.playerName}
                  onChange={e => {
                    setFormData({ ...formData, playerName: e.target.value });
                    setSelectedPlayer(null);
                  }}
                  autoComplete="off"
                />
                {/* Dropdown de sugestões */}
                {formData.playerName && playerSuggestions.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 bg-[#181c24] border border-border rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                    {playerSuggestions.map((p) => (
                      <div
                        key={p.id}
                        className="px-3 py-2 cursor-pointer hover:bg-runescape-gold/10 text-runescape-gold"
                        onClick={() => {
                          setSelectedPlayer(p);
                          setFormData({ ...formData, playerName: p.username });
                        }}
                      >
                        {cleanPlayerName(p.display_name || p.username)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor da Doação</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                placeholder="50000000"
                value={formData.amount}
                onChange={(e) => handleInputChange("amount", e.target.value)}
                className="pl-10"
                required
              />
              {formData.amount && (
                (() => {
                  const num = parseInt(formData.amount.replace(/\D/g, ''));
                  if (isNaN(num)) return null;
                  const gp = formatGpWithColor(num);
                  return (
                    <div className={`text-sm mt-1 font-bold ${gp.color}`}>
                      Equivale a: {gp.display} GP
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          {/* Event and Portals Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event">Evento</Label>
              <Select
                value={formData.event}
                onValueChange={(value) => handleInputChange("event", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o evento" />
                </SelectTrigger>
                <SelectContent>
                  {events.map(event => (
                    <SelectItem key={event} value={event}>
                      {event}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portals">Portais</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="portals"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="1"
                  value={formData.portals}
                  onChange={(e) => handleInputChange("portals", e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Data da Doação</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <div className="relative">
              <Textarea
                id="notes"
                placeholder="Informações adicionais sobre a doação..."
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Email de quem adicionou */}
          {/* Remover campo manual de email do formulário (não exibir mais para o usuário) */}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              className="flex-1 btn-outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 btn-runescape"
            >
              {editMode ? "Atualizar" : "Salvar"} Doação
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

export default DonationModal;
