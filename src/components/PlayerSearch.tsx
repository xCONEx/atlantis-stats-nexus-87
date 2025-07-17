import { useState } from "react";
import { Search, Loader2, User, Crown, Sword } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlayerStats {
  name: string;
  combat: number;
  totalLevel: number;
  totalXp: number;
  skills: {
    [key: string]: { level: number; xp: number; rank: number };
  };
}

const PlayerSearch = () => {
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [playerData, setPlayerData] = useState<PlayerStats | null>(null);
  const [error, setError] = useState("");

  const mockPlayerData: PlayerStats = {
    name: "AtlantisLord",
    combat: 138,
    totalLevel: 2736,
    totalXp: 425847392,
    skills: {
      Attack: { level: 99, xp: 13034431, rank: 125847 },
      Defence: { level: 99, xp: 13034431, rank: 156291 },
      Strength: { level: 99, xp: 13034431, rank: 143567 },
      Constitution: { level: 99, xp: 16274853, rank: 98234 },
      Ranged: { level: 99, xp: 13034431, rank: 187432 },
      Prayer: { level: 99, xp: 13034431, rank: 67891 },
      Magic: { level: 99, xp: 13034431, rank: 203456 },
      Cooking: { level: 99, xp: 13034431, rank: 89123 },
      Woodcutting: { level: 99, xp: 13034431, rank: 145678 },
      Fletching: { level: 99, xp: 13034431, rank: 76543 },
      Fishing: { level: 99, xp: 13034431, rank: 198765 },
      Firemaking: { level: 99, xp: 13034431, rank: 123456 },
    }
  };

  const searchPlayer = async () => {
    if (!playerName.trim()) return;
    
    setLoading(true);
    setError("");
    
    try {
      // Simulated API call - replace with actual RuneScape API integration
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (playerName.toLowerCase().includes("atlantis")) {
        setPlayerData(mockPlayerData);
      } else {
        setError("Jogador não encontrado ou não é membro do clã Atlantis");
        setPlayerData(null);
      }
    } catch (err) {
      setError("Erro ao buscar dados do jogador");
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
    <div className="space-y-6">
      {/* Search Section */}
      <Card className="clan-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-runescape-gold">
            <Search className="h-6 w-6" />
            <span>Buscar Jogador</span>
          </CardTitle>
          <CardDescription>
            Digite o nome do jogador para visualizar suas estatísticas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
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
              variant="runescape"
              size="lg"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Player Stats */}
      {playerData && (
        <div className="space-y-6 animate-fade-in">
          {/* Player Overview */}
          <Card className="clan-card runescape-glow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3 text-runescape-gold">
                <Crown className="h-6 w-6" />
                <span>{playerData.name}</span>
                <div className="flex items-center space-x-2 text-sm bg-runescape-gold/20 px-3 py-1 rounded-full">
                  <Sword className="h-4 w-4" />
                  <span>Combat: {playerData.combat}</span>
                </div>
              </CardTitle>
              <CardDescription>
                Membro do clã Atlantis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gradient-primary rounded-lg">
                  <div className="text-2xl font-bold text-primary-foreground">
                    {playerData.totalLevel}
                  </div>
                  <div className="text-sm text-primary-foreground/80">
                    Nível Total
                  </div>
                </div>
                <div className="text-center p-4 bg-gradient-secondary rounded-lg">
                  <div className="text-2xl font-bold text-accent-foreground">
                    {formatXp(playerData.totalXp)}
                  </div>
                  <div className="text-sm text-accent-foreground/80">
                    XP Total
                  </div>
                </div>
                <div className="text-center p-4 bg-gradient-card rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {playerData.combat}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Nível de Combate
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills Grid */}
          <Card className="clan-card">
            <CardHeader>
              <CardTitle className="text-runescape-gold">Habilidades</CardTitle>
              <CardDescription>
                Níveis e experiência em todas as habilidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="stats-grid">
                {Object.entries(playerData.skills).map(([skill, data]) => (
                  <div
                    key={skill}
                    className="medieval-border p-4 text-center hover:scale-105 transition-transform"
                  >
                    <div className="font-medium text-runescape-gold mb-1">
                      {skill}
                    </div>
                    <div className="text-2xl font-bold mb-1">
                      {data.level}
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">
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
    </div>
  );
};

export default PlayerSearch;