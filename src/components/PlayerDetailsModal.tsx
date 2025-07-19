import { useState, useEffect } from "react";
import { X, Zap, Sword, Shield, Target, Award, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { runescapeApi } from "@/services/runescapeApi";

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
  if (!player) return null;
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && player) {
      fetchPlayerStats();
    }
  }, [open, player]);

  const fetchPlayerStats = async () => {
    setLoading(true);
    try {
      const hiscores = await runescapeApi.getPlayerHiscores(player.name);
      setPlayerStats({
        skills: Object.fromEntries(
          Object.entries(hiscores).map(([skill, data]) => [
            skill,
            {
              level: data.level,
              xp: data.experience,
              rank: data.rank
            }
          ])
        ),
        bosses: {},
        minigames: {}
      });
    } catch (error) {
      console.error("Erro ao buscar stats do jogador:", error);
      setPlayerStats(null);
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

  const getSkillIcon = (skill: string) => {
    return `/skills/${skill}.png`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="modal-responsive max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 text-runescape-gold">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-base sm:text-lg truncate">{player.name}</span>
            </div>
            <div className="flex items-center space-x-2 text-xs sm:text-sm bg-runescape-gold/20 px-2 sm:px-3 py-1 rounded-full">
              <Sword className="h-3 w-3 sm:h-4 sm:w-4" />
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
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Visão Geral</TabsTrigger>
              <TabsTrigger value="skills" className="text-xs sm:text-sm">Habilidades</TabsTrigger>
              <TabsTrigger value="bosses" className="text-xs sm:text-sm">Bosses</TabsTrigger>
              <TabsTrigger value="minigames" className="text-xs sm:text-sm">Minigames</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Player Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <Card className="clan-card">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-runescape-gold mb-2">
                      {player.totalLevel}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Nível Total</div>
                  </CardContent>
                </Card>
                
                <Card className="clan-card">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-runescape-blue mb-2">
                      {formatXp(player.totalXp)}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">XP Total</div>
                  </CardContent>
                </Card>
                
                <Card className="clan-card">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-green-400 mb-2">
                      {player.combat}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Nível de Combate</div>
                  </CardContent>
                </Card>
              </div>

              {/* Player Details */}
              <Card className="clan-card">
                <CardHeader>
                  <CardTitle className="text-runescape-gold text-base sm:text-lg">Informações do Jogador</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Clã:</span>
                        <span className="font-medium truncate">{player.clan}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cargo:</span>
                        <span className="font-medium text-runescape-gold truncate">{player.rank}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Membro desde:</span>
                        <span className="font-medium text-xs">{new Date(player.joined).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            player.isOnline ? "bg-green-400" : "bg-gray-400"
                          }`} />
                          <span className="font-medium text-xs">
                            {player.isOnline ? "Online" : "Offline"}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Última vez visto:</span>
                        <span className="font-medium text-xs truncate">{player.lastSeen}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="skills" className="space-y-6">
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" onClick={fetchPlayerStats} disabled={loading} className="btn-responsive">
                  {loading ? "Atualizando..." : "Atualizar Skills"}
                </Button>
              </div>
              {playerStats && (
                <>
                  {/* Non-Combat Skills */}
                  <Card className="clan-card">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-runescape-gold">
                        <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-base sm:text-lg">Habilidades</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {Object.keys(playerStats.skills).map((skill) => {
                          const data = playerStats.skills[skill];
                          return (
                            <div key={skill} className="medieval-border p-3 sm:p-4 text-center flex flex-col items-center">
                              <div className="flex items-center justify-center mb-1">
                                <img
                                  src={getSkillIcon(skill)}
                                  alt={skill}
                                  className="w-5 h-5 sm:w-7 sm:h-7 mr-1 sm:mr-2"
                                  onError={e => (e.currentTarget.src = '/skills/default.png')}
                                />
                                <span className="font-medium text-runescape-gold text-xs sm:text-sm truncate">{skill}</span>
                              </div>
                              <div className="text-xl sm:text-2xl font-bold mb-1">{data ? data.level : '-'}</div>
                              <div className="text-xs text-muted-foreground mb-1">
                                {data ? formatXp(data.xp) : '0'} XP
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Rank: {data ? formatNumber(data.rank) : '0'}
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
              <Card className="clan-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-runescape-gold">
                    <Award className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-base sm:text-lg">Bosses</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground py-8">
                    <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Estatísticas de bosses em desenvolvimento</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="minigames" className="space-y-6">
              <Card className="clan-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-runescape-gold">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-base sm:text-lg">Minigames</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground py-8">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Estatísticas de minigames em desenvolvimento</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PlayerDetailsModal;
