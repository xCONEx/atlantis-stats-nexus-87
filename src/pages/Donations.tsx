import { useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import DonationModal from "@/components/DonationModal";
import { supabase } from "@/integrations/supabase/client";
import PlayerDonationsModal from "@/components/PlayerDonationsModal";

interface PlayerDonationSummary {
  player_id: string;
  player_name: string;
  total_amount: number;
}

const Donations = () => {
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [playerDonations, setPlayerDonations] = useState<PlayerDonationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<{ player_id: string; player_name: string } | null>(null);

  useEffect(() => {
    const fetchPlayerDonations = async () => {
      setLoading(true);
      // Consulta agrupada por jogador
      const { data, error } = await supabase
        .from('donations')
        .select('player_id, player_name, amount')
        .order('player_name', { ascending: true });
      if (!error && data) {
        // Agrupar no front (caso não tenha group by no supabase)
        const grouped: Record<string, PlayerDonationSummary> = {};
        data.forEach((donation: any) => {
          const key = donation.player_id || donation.player_name;
          if (!grouped[key]) {
            grouped[key] = {
              player_id: donation.player_id,
              player_name: donation.player_name || 'Jogador',
              total_amount: 0,
            };
          }
          grouped[key].total_amount += donation.amount || 0;
        });
        let arr = Object.values(grouped);
        // Filtro de busca
        if (searchTerm.trim()) {
          arr = arr.filter((p) =>
            p.player_name.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        // Ordenar alfabeticamente
        arr.sort((a, b) => a.player_name.localeCompare(b.player_name, 'pt-BR'));
        setPlayerDonations(arr);
      }
      setLoading(false);
    };
    fetchPlayerDonations();
    // eslint-disable-next-line
  }, [showDonationModal, searchTerm]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-cinzel font-bold text-runescape-gold">Doações</h1>
            <p className="text-muted-foreground">Gerencie doações dos membros dos clãs</p>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Buscar jogador..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={() => setShowDonationModal(true)} className="btn-runescape">
              <Plus className="h-4 w-4" />
              Nova Doação
            </Button>
          </div>
        </div>

        <div>
          <Card className="clan-card">
            <CardHeader>
              <CardTitle className="text-runescape-gold">Controle de Doações</CardTitle>
              <CardDescription>Resumo por jogador</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Carregando doações...</p>
              ) : playerDonations.length === 0 ? (
                <p className="text-muted-foreground">Nenhum jogador encontrado.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {playerDonations.map((player) => (
                    <Card
                      key={player.player_id || player.player_name}
                      className="shadow-md hover:shadow-lg transition cursor-pointer"
                      onClick={() => {
                        if (player.player_id) setSelectedPlayer({ player_id: player.player_id, player_name: player.player_name });
                      }}
                    >
                      <CardHeader>
                        <CardTitle className="truncate">{player.player_name}</CardTitle>
                        <CardDescription>Total doado</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <span className="text-runescape-gold font-bold text-lg">{player.total_amount.toLocaleString('pt-BR')} GP</span>
                        </div>
                        <Button variant="outline" size="sm" className="mt-2 w-full">Ver detalhes</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DonationModal
        open={showDonationModal}
        onClose={() => setShowDonationModal(false)}
        onSave={() => setShowDonationModal(false)}
      />
      {/* Modal de detalhes das doações do jogador */}
      {selectedPlayer && selectedPlayer.player_id && (
        <PlayerDonationsModal
          player_id={selectedPlayer.player_id}
          player_name={selectedPlayer.player_name}
          open={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </Layout>
  );
};

export default Donations;
