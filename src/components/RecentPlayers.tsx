import { Clock, User, Crown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PlayerDetailsModal from "./PlayerDetailsModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface RecentPlayer {
  name: string;
  clan: string;
  combat: number;
  totalLevel: number;
  searchedAt: string;
  isOnline: boolean;
  // Adicionar campos extras se necessário para o modal
}

const RecentPlayers = () => {
  const [recentPlayers, setRecentPlayers] = useState<RecentPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<RecentPlayer | null>(null);
  const [modalStatsOpen, setModalStatsOpen] = useState(false);
  const [modalHistoryOpen, setModalHistoryOpen] = useState(false);
  const [historyPlayers, setHistoryPlayers] = useState<RecentPlayer[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchRecentPlayers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select('username, clan_name, combat_level, total_level, is_active, updated_at')
        .order('updated_at', { ascending: false })
        .limit(4);
      if (!error && data) {
        setRecentPlayers(
          data.map((p: any) => ({
            name: p.username,
            clan: p.clan_name || '',
            combat: p.combat_level || 0,
            totalLevel: p.total_level || 0,
            searchedAt: p.updated_at ? new Date(p.updated_at).toLocaleString('pt-BR') : '',
            isOnline: p.is_active || false
          }))
        );
      }
      setLoading(false);
    };
    fetchRecentPlayers();
  }, []);

  const openStatsModal = (player: RecentPlayer) => {
    setSelectedPlayer(player);
    setModalStatsOpen(true);
  };

  const closeStatsModal = () => {
    setSelectedPlayer(null);
    setModalStatsOpen(false);
  };

  const openHistoryModal = async () => {
    setModalHistoryOpen(true);
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('players')
      .select('username, clan_name, combat_level, total_level, is_active, updated_at')
      .order('updated_at', { ascending: false })
      .limit(20);
    if (!error && data) {
      setHistoryPlayers(
        data.map((p: any) => ({
          name: p.username,
          clan: p.clan_name || '',
          combat: p.combat_level || 0,
          totalLevel: p.total_level || 0,
          searchedAt: p.updated_at ? new Date(p.updated_at).toLocaleString('pt-BR') : '',
          isOnline: p.is_active || false
        }))
      );
    }
    setLoadingHistory(false);
  };

  const closeHistoryModal = () => {
    setModalHistoryOpen(false);
    setHistoryPlayers([]);
  };

  return (
    <Card className="clan-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-runescape-gold">
          <Clock className="h-5 w-5" />
          <span>Jogadores Recentes</span>
        </CardTitle>
        <CardDescription>
          Últimos jogadores pesquisados no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center text-muted-foreground">Carregando jogadores recentes...</div>
          ) : recentPlayers.length === 0 ? (
            <div className="text-center text-muted-foreground">Nenhum jogador recente encontrado.</div>
          ) : recentPlayers.map((player) => (
            <div
              key={player.name}
              className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-runescape-gold/50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <User className="h-8 w-8 text-muted-foreground" />
                  {player.isOnline && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background"></div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="font-medium flex items-center space-x-2">
                    <span className="text-foreground">{player.name}</span>
                    {player.clan === "Atlantis" && (
                      <Crown className="h-4 w-4 text-runescape-gold" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {player.clan} • Combat {player.combat} • Total {player.totalLevel}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {player.searchedAt}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm">
                  <TrendingUp className="h-4 w-4" />
                </Button>
                <Button variant="medieval" size="sm" onClick={() => openStatsModal(player)}>
                  Ver Stats
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Button variant="outline" className="w-full" onClick={openHistoryModal}>
            Ver Histórico Completo
          </Button>
        </div>

        {/* Modal de Stats */}
        {selectedPlayer && (
          <PlayerDetailsModal
            player={{
              name: selectedPlayer.name,
              clan: selectedPlayer.clan,
              combat: selectedPlayer.combat,
              totalLevel: selectedPlayer.totalLevel,
              totalXp: 0, // Pode ser ajustado se disponível
              lastSeen: selectedPlayer.searchedAt,
              isOnline: selectedPlayer.isOnline,
              rank: "",
              joined: new Date().toISOString(),
            }}
            open={modalStatsOpen}
            onClose={closeStatsModal}
          />
        )}

        {/* Modal de Histórico */}
        <Dialog open={modalHistoryOpen} onOpenChange={closeHistoryModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-runescape-gold">Histórico Completo de Jogadores Pesquisados</DialogTitle>
            </DialogHeader>
            {loadingHistory ? (
              <div className="text-center text-muted-foreground py-8">Carregando histórico...</div>
            ) : historyPlayers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Nenhum histórico encontrado.</div>
            ) : (
              <div className="divide-y divide-border">
                {historyPlayers.map((player) => (
                  <div key={player.name} className="flex items-center justify-between py-3">
                    <div className="flex items-center space-x-4">
                      <User className="h-7 w-7 text-muted-foreground" />
                      <div>
                        <div className="font-medium flex items-center space-x-2">
                          <span className="text-foreground">{player.name}</span>
                          {player.clan === "Atlantis" && (
                            <Crown className="h-4 w-4 text-runescape-gold" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {player.clan} • Combat {player.combat} • Total {player.totalLevel}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {player.searchedAt}
                        </div>
                      </div>
                    </div>
                    <Button variant="medieval" size="sm" onClick={() => openStatsModal(player)}>
                      Ver Stats
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default RecentPlayers;
