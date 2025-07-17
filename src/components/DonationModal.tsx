import { useState, useEffect } from "react";
import { Calendar, Shield, User, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Donation {
  id: string;
  playerName: string;
  amount: number;
  event: string;
  portals: number;
  date: string;
  createdBy: string;
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
  const [formData, setFormData] = useState({
    playerName: "",
    amount: "",
    event: "",
    portals: "1",
    date: new Date().toISOString().split('T')[0],
    createdBy: "Admin", // In real app, get from auth context
    notes: ""
  });

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
        playerName: donation.playerName,
        amount: donation.amount.toString(),
        event: donation.event,
        portals: donation.portals.toString(),
        date: donation.date,
        createdBy: donation.createdBy,
        notes: donation.notes || ""
      });
    } else {
      setFormData({
        playerName: "",
        amount: "",
        event: "",
        portals: "1",
        date: new Date().toISOString().split('T')[0],
        createdBy: "Admin",
        notes: ""
      });
    }
  }, [donation, editMode, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const donationData = {
      playerName: formData.playerName,
      amount: parseInt(formData.amount),
      event: formData.event,
      portals: parseInt(formData.portals),
      date: formData.date,
      createdBy: formData.createdBy,
      notes: formData.notes
    };

    onSave(donationData);
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
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="playerName"
                placeholder="Nome do jogador"
                value={formData.playerName}
                onChange={(e) => handleInputChange("playerName", e.target.value)}
                className="pl-10"
                required
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

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="runescape"
              className="flex-1"
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