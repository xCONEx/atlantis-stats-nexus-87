import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface PlayerDonationsModalProps {
  player_id: string;
  player_name: string;
  open: boolean;
  onClose: () => void;
}

interface DonationDetail {
  id: string;
  amount: number;
  created_at: string;
  created_by?: string;
}

const PlayerDonationsModal = ({ player_id, player_name, open, onClose }: PlayerDonationsModalProps) => {
  const [donations, setDonations] = useState<DonationDetail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchDonations = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('donations')
        .select('id, amount, created_at, created_by')
        .eq('player_id', player_id)
        .order('created_at', { ascending: false });
      if (!error && data) setDonations(data);
      setLoading(false);
    };
    fetchDonations();
  }, [open, player_id]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-runescape-gold">Doações de {player_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <p className="text-muted-foreground">Carregando doações...</p>
          ) : donations.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma doação encontrada.</p>
          ) : (
            <div className="space-y-2">
              {donations.map((donation) => (
                <Card key={donation.id} className="border border-border">
                  <CardHeader className="flex flex-row justify-between items-center p-3 pb-0">
                    <CardTitle className="text-base font-medium">{donation.amount.toLocaleString('pt-BR')} GP</CardTitle>
                    <span className="text-xs text-muted-foreground">{donation.created_at ? new Date(donation.created_at).toLocaleDateString('pt-BR') : ''}</span>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <span className="text-xs text-muted-foreground">Adicionado por: {donation.created_by || 'Desconhecido'}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerDonationsModal; 
