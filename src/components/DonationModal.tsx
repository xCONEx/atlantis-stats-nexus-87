import { useState, useEffect } from "react";
import { Calendar, Shield, User, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

  useEffect(() => {
    if (donation && editMode) {
      setFormData({
        playerName: '', // não usado mais
        amount: donation.amount.toString(),
        event: donation.event,
        portals: donation.portals.toString(),
        date: donation.date,
        createdBy: '',
        createdByEmail: donation.created_by_email || "",
        notes: donation.notes || ""
      });
      // Find the player by ID for editing
      const player = players.find(p => p.id === donation.player_id);
      setSelectedPlayer(player || null);
    } else {
      setFormData({
        playerName: "",
        amount: "",
        event: "",
        portals: "1",
        date: new Date().toISOString().split('T')[0],
        createdBy: "",
        createdByEmail: user?.email || "",
        notes: ""
      });
      setSelectedPlayer(null);
    }
  }, [donation, editMode, open, user]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const donationData = {
      player_id: selectedPlayer ? selectedPlayer.id : null,
      player_name: formData.playerName || (selectedPlayer ? selectedPlayer.username : ""),
      amount: parseInt(formData.amount),
      event: formData.event,
      portals: parseInt(formData.portals),
      date: formData.date,
      created_by: null, // sempre null
      created_by_email: user?.email || "",
      notes: formData.notes
    };
    // Salvar no Supabase
    const { error } = await supabase.from('donations').insert([
      {
        amount: donationData.amount,
        created_by: donationData.created_by,
        created_by_email: donationData.created_by_email,
        description: donationData.notes,
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
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Player Name */}
          <div className="space-y-2">
            <Label htmlFor="playerName">Nome do Jogador</Label>
            <div className="flex gap-2">
              <select
                id="playerSelect"
                className="input"
                value={selectedPlayer?.id || ""}
                onChange={e => {
                  const player = players.find(p => p.id === e.target.value);
                  setSelectedPlayer(player || null);
                  setFormData({ ...formData, playerName: player ? player.username : "" });
                }}
              >
                <option value="">Selecione um jogador</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>{p.display_name || p.username}</option>
                ))}
              </select>
              <input
                type="text"
                id="playerName"
                className="input flex-1"
                placeholder="Ou digite o nome do jogador"
                value={formData.playerName}
                onChange={e => {
                  setFormData({ ...formData, playerName: e.target.value });
                  setSelectedPlayer(null);
                }}
              />
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
                <div className="text-sm text-muted-foreground mt-1">
                  Equivale a: {formatAmountDisplay(formData.amount)} GP
                </div>
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
      </DialogContent>
    </Dialog>
  );
};

export default DonationModal;
