import { useState, useEffect } from "react";
import { Plus, Search, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import DonationModal from "@/components/DonationModal";
import { supabase } from "@/integrations/supabase/client";

const Donations = () => {
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDonations = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data) {
        setDonations(data);
      }
      setLoading(false);
    };
    fetchDonations();
  }, [showDonationModal]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-cinzel font-bold text-runescape-gold">Doações</h1>
            <p className="text-muted-foreground">Gerencie doações dos membros dos clãs</p>
          </div>
          <Button onClick={() => setShowDonationModal(true)} variant="runescape">
            <Plus className="h-4 w-4" />
            Nova Doação
          </Button>
        </div>

        <Card className="clan-card">
          <CardHeader>
            <CardTitle className="text-runescape-gold">Controle de Doações</CardTitle>
            <CardDescription>Lista de doações registradas</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Carregando doações...</p>
            ) : donations.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma doação encontrada.</p>
            ) : (
              <ul className="divide-y divide-border">
                {donations.map((donation) => (
                  <li key={donation.id} className="py-2 flex justify-between items-center">
                    <span className="font-medium">{donation.player_name || 'Jogador'}</span>
                    <span className="text-runescape-gold font-bold">{donation.amount.toLocaleString('pt-BR')} GP</span>
                    <span className="text-xs text-muted-foreground">{donation.created_at ? new Date(donation.created_at).toLocaleDateString('pt-BR') : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <DonationModal
        open={showDonationModal}
        onClose={() => setShowDonationModal(false)}
        onSave={(data) => {
          console.log('Donation saved:', data);
          setShowDonationModal(false);
        }}
      />
    </Layout>
  );
};

export default Donations;