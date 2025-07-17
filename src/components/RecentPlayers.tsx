import { Clock, User, Crown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RecentPlayer {
  name: string;
  clan: string;
  combat: number;
  totalLevel: number;
  searchedAt: string;
  isOnline: boolean;
}

const RecentPlayers = () => {
  const [recentPlayers, setRecentPlayers] = useState<RecentPlayer[]>([]);
  const [loading, setLoading] = useState(true);

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
                <Button variant="medieval" size="sm">
                  Ver Stats
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Button variant="outline" className="w-full">
            Ver Histórico Completo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentPlayers;