import { useState, useEffect } from "react";
import { X, Zap, Sword, Shield, Target, Award, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface Player {
  name: string;
  clan: string;
  combat: number;
  totalLevel: number;
  totalXp: number;
  lastSeen: string;
  isOnline: boolean;
  rank: string;
  joined: string;
}

interface PlayerDetailsModalProps {
  player: Player;
  open: boolean;
  onClose: () => void;
}

interface PlayerStats {
  skills: {
    [key: string]: { level: number; xp: number; rank: number };
  };
  bosses: {
    [key: string]: { kills: number; rank: number };
  };
  minigames: {
    [key: string]: { score: number; rank: number };
  };
}

const PlayerDetailsModal = ({ player, open, onClose }: PlayerDetailsModalProps) => {
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Mock data for detailed stats
  const mockStats: PlayerStats = {
    skills: {
      "Attack": { level: 99, xp: 13034431, rank: 125847 },
      "Defence": { level: 99, xp: 13034431, rank: 156291 },
      "Strength": { level: 99, xp: 13034431, rank: 143567 },
      "Constitution": { level: 99, xp: 16274853, rank: 98234 },
      "Ranged": { level: 99, xp: 13034431, rank: 187432 },
      "Prayer": { level: 99, xp: 13034431, rank: 67891 },
      "Magic": { level: 99, xp: 13034431, rank: 203456 },
      "Cooking": { level: 99, xp: 13034431, rank: 89123 },
      "Woodcutting": { level: 99, xp: 13034431, rank: 145678 },
      "Fletching": { level: 99, xp: 13034431, rank: 76543 },
      "Fishing": { level: 99, xp: 13034431, rank: 198765 },
      "Firemaking": { level: 99, xp: 13034431, rank: 123456 },
      "Crafting": { level: 99, xp: 13034431, rank: 98765 },
      "Smithing": { level: 99, xp: 13034431, rank: 112233 },
      "Mining": { level: 99, xp: 13034431, rank: 87654 },
      "Herblore": { level: 99, xp: 13034431, rank: 234567 },
      "Agility": { level: 99, xp: 13034431, rank: 345678 },
      "Thieving": { level: 99, xp: 13034431, rank: 456789 },
      "Slayer": { level: 99, xp: 13034431, rank: 23456 },
      "Farming": { level: 99, xp: 13034431, rank: 78901 },
      "Runecrafting": { level: 99, xp: 13034431, rank: 567890 },
      "Hunter": { level: 99, xp: 13034431, rank: 123890 },
      "Construction": { level: 99, xp: 13034431, rank: 234901 },
      "Summoning": { level: 99, xp: 13034431, rank: 345012 },
      "Dungeoneering": { level: 120, xp: 104273167, rank: 45678 },
      "Divination": { level: 99, xp: 13034431, rank: 56789 },
      "Invention": { level: 120, xp: 80618654, rank: 23456 },
      "Archaeology": { level: 120, xp: 80618654, rank: 34567 }
    },
    bosses: {
      "Telos": { kills: 1247, rank: 3456 },
      "Araxxor": { kills: 2891, rank: 1234 },
      "Nex": { kills: 567, rank: 7890 },
      "Vorago": { kills: 234, rank: 5678 },
      "Rise of the Six": { kills: 89, rank: 9012 },
      "Solak": { kills: 156, rank: 4567 },
      "Raksha": { kills: 445, rank: 2345 },
      "Kerapac": { kills: 278, rank: 6789 }
    },
    minigames: {
      "Castle Wars": { score: 1234, rank: 5678 },
      "Pest Control": { score: 2345, rank: 3456 },
      "Soul Wars": { score: 567, rank: 7890 },
      "Barbarian Assault": { score: 890, rank: 2345 },
      "Fist of Guthix": { score: 1567, rank: 4567 }
    }
  };

  useEffect(() => {
    if (open && player) {
      fetchPlayerStats();
    }
  }, [open, player]);

  const fetchPlayerStats = async () => {
    setLoading(true);
    try {
      // Simular chamada para API do RuneScape
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPlayerStats(mockStats);
    } catch (error) {
      console.error("Erro ao buscar stats do jogador:", error);
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

  const getCombatSkills = () => {
    if (!playerStats) return [];
    return ["Attack", "Defence", "Strength", "Constitution", "Ranged", "Prayer", "Magic"];
  };

  const getNonCombatSkills = () => {
    if (!playerStats) return [];
    const combatSkills = getCombatSkills();
    return Object.keys(playerStats.skills).filter(skill => !combatSkills.includes(skill));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3 text-runescape-gold">
            <Zap className="h-6 w-6" />
            <span>{player.name}</span>
            <div className="flex items-center space-x-2 text-sm bg-runescape-gold/20 px-3 py-1 rounded-full">
              <Sword className="h-4 w-4" />
              <span>Combat: {player.combat}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-runescape-gold mx-auto"></div>
              <p className="text-muted-foreground">Carregando estatísticas...</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="skills">Habilidades</TabsTrigger>
              <TabsTrigger value="bosses">Bosses</TabsTrigger>
              <TabsTrigger value="minigames">Minigames</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Player Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="clan-card">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-runescape-gold mb-2">
                      {player.totalLevel}
                    </div>
                    <div className="text-sm text-muted-foreground">Nível Total</div>
                  </CardContent>
                </Card>
                
                <Card className="clan-card">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-runescape-blue mb-2">
                      {formatXp(player.totalXp)}
                    </div>
                    <div className="text-sm text-muted-foreground">XP Total</div>
                  </CardContent>
                </Card>
                
                <Card className="clan-card">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">
                      {player.combat}
                    </div>
                    <div className="text-sm text-muted-foreground">Nível de Combate</div>
                  </CardContent>
                </Card>
              </div>

              {/* Player Details */}
              <Card className="clan-card">
                <CardHeader>
                  <CardTitle className="text-runescape-gold">Informações do Jogador</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clã:</span>
                        <span className="font-medium">{player.clan}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cargo:</span>
                        <span className="font-medium text-runescape-gold">{player.rank}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Membro desde:</span>
                        <span className="font-medium">{new Date(player.joined).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            player.isOnline ? "bg-green-400" : "bg-gray-400"
                          }`} />
                          <span className="font-medium">
                            {player.isOnline ? "Online" : "Offline"}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Última vez visto:</span>
                        <span className="font-medium">{player.lastSeen}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="skills" className="space-y-6">
              {playerStats && (
                <>
                  {/* Combat Skills */}
                  <Card className="clan-card">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-runescape-gold">
                        <Sword className="h-5 w-5" />
                        <span>Habilidades de Combate</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {getCombatSkills().map((skill) => {
                          const data = playerStats.skills[skill];
                          return (
                            <div key={skill} className="medieval-border p-4 text-center">
                              <div className="font-medium text-runescape-gold mb-1">{skill}</div>
                              <div className="text-2xl font-bold mb-1">{data.level}</div>
                              <div className="text-sm text-muted-foreground mb-1">
                                {formatXp(data.xp)} XP
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Rank: {formatNumber(data.rank)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Non-Combat Skills */}
                  <Card className="clan-card">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-runescape-gold">
                        <Target className="h-5 w-5" />
                        <span>Outras Habilidades</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {getNonCombatSkills().map((skill) => {
                          const data = playerStats.skills[skill];
                          return (
                            <div key={skill} className="medieval-border p-4 text-center">
                              <div className="font-medium text-runescape-gold mb-1">{skill}</div>
                              <div className="text-2xl font-bold mb-1">{data.level}</div>
                              <div className="text-sm text-muted-foreground mb-1">
                                {formatXp(data.xp)} XP
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Rank: {formatNumber(data.rank)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="bosses" className="space-y-6">
              {playerStats && (
                <Card className="clan-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-runescape-gold">
                      <Shield className="h-5 w-5" />
                      <span>Boss Kills</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {Object.entries(playerStats.bosses).map(([boss, data]) => (
                        <div key={boss} className="medieval-border p-4 text-center">
                          <div className="font-medium text-runescape-gold mb-1">{boss}</div>
                          <div className="text-2xl font-bold mb-1">{formatNumber(data.kills)}</div>
                          <div className="text-sm text-muted-foreground">Kills</div>
                          <div className="text-xs text-muted-foreground">
                            Rank: {formatNumber(data.rank)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="minigames" className="space-y-6">
              {playerStats && (
                <Card className="clan-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-runescape-gold">
                      <Award className="h-5 w-5" />
                      <span>Minigames</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(playerStats.minigames).map(([minigame, data]) => (
                        <div key={minigame} className="medieval-border p-4 text-center">
                          <div className="font-medium text-runescape-gold mb-1">{minigame}</div>
                          <div className="text-2xl font-bold mb-1">{formatNumber(data.score)}</div>
                          <div className="text-sm text-muted-foreground">Score</div>
                          <div className="text-xs text-muted-foreground">
                            Rank: {formatNumber(data.rank)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PlayerDetailsModal;