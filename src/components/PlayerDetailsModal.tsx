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
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Remover mockStats e usar API real
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

  // Adicionar mapeamento de imagens das skills da wiki
  const SKILL_IMAGES: { [key: string]: string } = {
    Attack: "https://runescape.wiki/images/Attack-icon.png",
    Defence: "https://runescape.wiki/images/Defence-icon.png",
    Strength: "https://runescape.wiki/images/Strength-icon.png",
    Constitution: "https://runescape.wiki/images/Constitution-icon.png",
    Ranged: "https://runescape.wiki/images/Ranged-icon.png",
    Prayer: "https://runescape.wiki/images/Prayer-icon.png",
    Magic: "https://runescape.wiki/images/Magic-icon.png",
    Cooking: "https://runescape.wiki/images/Cooking-icon.png",
    Woodcutting: "https://runescape.wiki/images/Woodcutting-icon.png",
    Fletching: "https://runescape.wiki/images/Fletching-icon.png",
    Fishing: "https://runescape.wiki/images/Fishing-icon.png",
    Firemaking: "https://runescape.wiki/images/Firemaking-icon.png",
    Crafting: "https://runescape.wiki/images/Crafting-icon.png",
    Smithing: "https://runescape.wiki/images/Smithing-icon.png",
    Mining: "https://runescape.wiki/images/Mining-icon.png",
    Herblore: "https://runescape.wiki/images/Herblore-icon.png",
    Agility: "https://runescape.wiki/images/Agility-icon.png",
    Thieving: "https://runescape.wiki/images/Thieving-icon.png",
    Slayer: "https://runescape.wiki/images/Slayer-icon.png",
    Farming: "https://runescape.wiki/images/Farming-icon.png",
    Runecrafting: "https://runescape.wiki/images/Runecrafting-icon.png",
    Hunter: "https://runescape.wiki/images/Hunter-icon.png",
    Construction: "https://runescape.wiki/images/Construction-icon.png",
    Summoning: "https://runescape.wiki/images/Summoning-icon.png",
    Dungeoneering: "https://runescape.wiki/images/Dungeoneering-icon.png",
    Divination: "https://runescape.wiki/images/Divination-icon.png",
    Invention: "https://runescape.wiki/images/Invention-icon.png",
    Archaeology: "https://runescape.wiki/images/Archaeology-icon.png",
    Necromancy: "https://runescape.wiki/images/Necromancy-icon.png"
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
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" onClick={fetchPlayerStats} disabled={loading}>
                  {loading ? "Atualizando..." : "Atualizar Skills"}
                </Button>
              </div>
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
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                        {getCombatSkills().map((skill) => {
                          const data = playerStats.skills[skill];
                          return (
                            <div key={skill} className="medieval-border p-4 text-center flex flex-col items-center">
                              <div className="flex items-center justify-center mb-1">
                                <img src={SKILL_IMAGES[skill]} alt={skill} className="w-7 h-7 mr-2" />
                                <span className="font-medium text-runescape-gold">{skill}</span>
                              </div>
                              <div className="text-2xl font-bold mb-1">{data ? data.level : '-'}</div>
                              <div className="text-sm text-muted-foreground mb-1">
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

                  {/* Non-Combat Skills */}
                  <Card className="clan-card">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-runescape-gold">
                        <Target className="h-5 w-5" />
                        <span>Outras Habilidades</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                        {getNonCombatSkills().map((skill) => {
                          const data = playerStats.skills[skill];
                          return (
                            <div key={skill} className="medieval-border p-4 text-center flex flex-col items-center">
                              <div className="flex items-center justify-center mb-1">
                                <img src={SKILL_IMAGES[skill]} alt={skill} className="w-7 h-7 mr-2" />
                                <span className="font-medium text-runescape-gold">{skill}</span>
                              </div>
                              <div className="text-2xl font-bold mb-1">{data ? data.level : '-'}</div>
                              <div className="text-sm text-muted-foreground mb-1">
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
