import { useState } from "react";
import { Search, Loader2, User, Crown, Sword } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { runescapeApi } from "@/services/runescapeApi";
import { supabase } from "@/integrations/supabase/client";
import PlayerDetailsModal from "./PlayerDetailsModal";

interface PlayerStats {
  name: string;
  combat: number;
  totalLevel: number;
  totalXp: number;
  skills: {
    [key: string]: { level: number; xp: number; rank: number };
  };
}

// Cache simples em memória para membros dos clãs
const clanCache: {
  atlantis: { members: any[]; timestamp: number } | null;
  atlantisArgus: { members: any[]; timestamp: number } | null;
} = {
  atlantis: null,
  atlantisArgus: null,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

const PlayerSearch = () => {
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [playerData, setPlayerData] = useState<PlayerStats | null>(null);
  const [error, setError] = useState("");
  const [playerClan, setPlayerClan] = useState<string>("");
  const [playerRanks, setPlayerRanks] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const searchPlayer = async () => {
    if (!playerName.trim()) return;
    setLoading(true);
    setError("");
    setPlayerClan("");
    setPlayerRanks([]);
    try {
      const now = Date.now();
      // Verificar cache
      let atlantisMembers: any[] = [];
      let atlantisArgusMembers: any[] = [];
      if (clanCache.atlantis && now - clanCache.atlantis.timestamp < CACHE_DURATION) {
        atlantisMembers = clanCache.atlantis.members;
      } else {
        atlantisMembers = await runescapeApi.getAtlantisClanMembers();
        clanCache.atlantis = { members: atlantisMembers, timestamp: now };
      }
      if (clanCache.atlantisArgus && now - clanCache.atlantisArgus.timestamp < CACHE_DURATION) {
        atlantisArgusMembers = clanCache.atlantisArgus.members;
      } else {
        atlantisArgusMembers = await runescapeApi.getAtlantisArgusClanMembers();
        clanCache.atlantisArgus = { members: atlantisArgusMembers, timestamp: now };
      }
      // Verificar se o jogador está em algum dos clãs
      const foundAtlantis = atlantisMembers.find(
        (m) => m.name.toLowerCase() === playerName.trim().toLowerCase()
      );
      const foundAtlantisArgus = atlantisArgusMembers.find(
        (m) => m.name.toLowerCase() === playerName.trim().toLowerCase()
      );
      if (!foundAtlantis && !foundAtlantisArgus) {
        setError("Jogador não encontrado nos clãs Atlantis ou Atlantis Argus");
        setPlayerData(null);
        setLoading(false);
        return;
      }
      // Determinar a qual clã pertence e o(s) cargo(s)
      let clanMsg = "";
      let ranks: string[] = [];
      if (foundAtlantis && foundAtlantisArgus) {
        clanMsg = "Membro dos clãs Atlantis e Atlantis Argus";
        ranks.push(`Atlantis: ${foundAtlantis.rank}`);
        ranks.push(`Atlantis Argus: ${foundAtlantisArgus.rank}`);
      } else if (foundAtlantis) {
        clanMsg = "Membro do clã Atlantis";
        ranks.push(`Atlantis: ${foundAtlantis.rank}`);
      } else if (foundAtlantisArgus) {
        clanMsg = "Membro do clã Atlantis Argus";
        ranks.push(`Atlantis Argus: ${foundAtlantisArgus.rank}`);
      }
      setPlayerClan(clanMsg);
      setPlayerRanks(ranks);
      // Buscar dados do jogador na API oficial do RuneScape
      const hiscores = await runescapeApi.getPlayerHiscores(playerName);
      // Adaptar estrutura para PlayerStats local
      setPlayerData({
        name: playerName.trim(),
        combat: hiscores.overall.level || 0,
        totalLevel: hiscores.overall.level || 0,
        totalXp: hiscores.overall.experience || 0,
        skills: Object.fromEntries(
          Object.entries(hiscores).map(([skill, data]) => [
            skill,
            {
              level: data.level,
              xp: data.experience,
              rank: data.rank
            }
          ])
        )
      });
      // Atualiza o updated_at do jogador no Supabase
      await supabase.from("players").update({ updated_at: new Date().toISOString() }).eq("username", playerName.trim());
    } catch (err) {
      setError("Jogador não encontrado ou erro na API");
      setPlayerData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('pt-BR');
  };

  const formatXp = (xp: number) => {
    if (xp >= 1000000) {
      return `${(xp / 1000000).toFixed(1)}M`;
    }
    if (xp >= 1000) {
      return `${(xp / 1000).toFixed(1)}K`;
    }
    return xp.toString();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Search Section */}
      <Card className="clan-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-runescape-gold">
            <Search className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-sm sm:text-base">Buscar Jogador</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Digite o nome do jogador para visualizar suas estatísticas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <Input
              placeholder="Nome do jogador (ex: AtlantisLord)"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchPlayer()}
              className="flex-1"
            />
            <Button 
              onClick={searchPlayer}
              disabled={loading || !playerName.trim()}
              className="btn-runescape btn-responsive"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <Search className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
              <span className="ml-1 text-xs sm:text-sm">Buscar</span>
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-xs sm:text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Player Stats */}
      {playerData && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          {/* Player Overview */}
          <Card className="clan-card runescape-glow">
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 text-runescape-gold">
                <button
                  className="focus:outline-none hover:underline text-runescape-gold flex items-center space-x-2"
                  onClick={() => setModalOpen(true)}
                  style={{ background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer" }}
                >
                  <Crown className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-sm sm:text-base truncate">{playerData.name}</span>
                </button>
                <div className="flex items-center space-x-2 text-xs sm:text-sm bg-runescape-gold/20 px-2 sm:px-3 py-1 rounded-full">
                  <Sword className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Combat: {playerData.combat}</span>
                </div>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {playerClan}
                {playerRanks.length > 0 && (
                  <div className="mt-1 text-xs text-runescape-gold/80">
                    {playerRanks.map((r, i) => (
                      <div key={i} className="truncate">{r}</div>
                    ))}
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="text-center p-3 sm:p-4 bg-gradient-primary rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-primary-foreground">
                    {playerData.totalLevel}
                  </div>
                  <div className="text-xs sm:text-sm text-primary-foreground/80">
                    Nível Total
                  </div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-gradient-secondary rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-accent-foreground">
                    {formatXp(playerData.totalXp)}
                  </div>
                  <div className="text-xs sm:text-sm text-accent-foreground/80">
                    XP Total
                  </div>
                </div>
                <div className="text-center p-3 sm:p-4 bg-gradient-card rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">
                    {playerData.combat}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Nível de Combate
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills Grid */}
          <Card className="clan-card">
            <CardHeader>
              <CardTitle className="text-runescape-gold text-sm sm:text-base">Habilidades</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Níveis e experiência em todas as habilidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="stats-grid">
                {Object.entries(playerData.skills).map(([skill, data]) => (
                  <div
                    key={skill}
                    className="medieval-border p-3 sm:p-4 text-center hover:scale-105 transition-transform"
                  >
                    <div className="font-medium text-runescape-gold mb-2 text-xs sm:text-sm truncate">
                      {skill}
                    </div>
                    <div className="text-xl sm:text-2xl font-bold mb-1">
                      {data.level}
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {formatXp(data.xp)} XP
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Rank: {formatNumber(data.rank)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Player Details Modal */}
      {modalOpen && playerData && (
        <PlayerDetailsModal
          player={{
            name: playerData.name,
            clan: playerClan,
            combat: playerData.combat,
            totalLevel: playerData.totalLevel,
            totalXp: playerData.totalXp,
            lastSeen: new Date().toLocaleString('pt-BR'),
            isOnline: true,
            rank: playerRanks.join(', '),
            joined: new Date().toLocaleDateString('pt-BR')
          }}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};

export default PlayerSearch;
