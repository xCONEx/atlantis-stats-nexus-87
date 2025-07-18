import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

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
  created_by_email?: string;
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

const PlayerDonationsModal = ({ player_id, player_name, open, onClose }: PlayerDonationsModalProps) => {
  const [donations, setDonations] = useState<DonationDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { userRole } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !player_id) return;
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

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from('donations').delete().eq('id', deleteId);
    if (!error) {
      setDonations((prev) => prev.filter((d) => d.id !== deleteId));
      toast({ title: 'Doação removida', description: 'A doação foi excluída com sucesso.', variant: 'default' });
    } else {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    }
    setDeleting(false);
    setDeleteId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-runescape-gold">Doações de {cleanPlayerName(player_name)}</DialogTitle>
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
                    <CardTitle className={`text-base font-medium ${formatGpWithColor(donation.amount).color}`}>{formatGpWithColor(donation.amount).display} GP</CardTitle>
                    <span className="text-xs text-muted-foreground">{donation.created_at ? new Date(donation.created_at).toLocaleDateString('pt-BR') : ''}</span>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 flex flex-row justify-between items-center">
                    <span className="text-xs text-muted-foreground">Adicionado por: {donation.created_by || 'Desconhecido'}</span>
                    {userRole === 'admin' && (
                      <Button variant="destructive" size="sm" onClick={() => setDeleteId(donation.id)} disabled={deleting}>
                        Remover
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
          </AlertDialogHeader>
          <div>Tem certeza que deseja remover esta doação? Esta ação não pode ser desfeita.</div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} onClick={() => setDeleteId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default PlayerDonationsModal; 
