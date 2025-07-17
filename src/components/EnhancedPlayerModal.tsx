import { useState, useEffect } from "react";
import { X, Zap, Sword, Shield, Target, Award, TrendingUp, Clock, User, Edit, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
// import { fetchRunescapePlayer } from "@/services/runescapeApi";

interface Player {
  id?: string;
  username: string;
  display_name?: string;
  clan_name?: string;
  clan_rank?: string;
  combat_level?: number;
  total_level?: number;
  total_experience?: number;
  is_active?: boolean;
}

interface EnhancedPlayerModalProps {
  player: Player | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  editMode?: boolean;
}

const EnhancedPlayerModal = ({ player, open, onClose, onSave, editMode = false }: EnhancedPlayerModalProps) => {
  const [playerData, setPlayerData] = useState<Player>({
    username: "",
    display_name: "",
    clan_name: "",
    clan_rank: "",
    combat_level: 3,
    total_level: 0,
    total_experience: 0,
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(editMode);
  const [runescapeStats, setRunescapeStats] = useState<any>(null);
  const { toast } = useToast();

  const clanRanks = [
    "Recruit",
    "Corporal", 
    "Sergeant",
    "Lieutenant",
    "Captain",
    "General",
    "Admin",
    "Organiser",
    "Coordinator",
    "Overseer",
    "Deputy Leader",
    "Leader"
  ];

  const clans = [
    "Atlantis",
    "Atlantis Argus"
  ];

  useEffect(() => {
    if (open && player) {
      setPlayerData({
        ...player,
        username: player.username || "",
        display_name: player.display_name || "",
        clan_name: player.clan_name || "",
        clan_rank: player.clan_rank || "",
        combat_level: player.combat_level || 3,
        total_level: player.total_level || 0,
        total_experience: player.total_experience || 0,
        is_active: player.is_active !== false
      });
      setIsEditing(editMode || !player.id);
      
      // Load RuneScape stats if we have a username
      if (player.username) {
        fetchPlayerStats(player.username);
      }
    } else if (open && !player) {
      // New player mode
      setPlayerData({
        username: "",
        display_name: "",
        clan_name: "",
        clan_rank: "",
        combat_level: 3,
        total_level: 0,
        total_experience: 0,
        is_active: true
      });
      setIsEditing(true);
    }
  }, [open, player, editMode]);

  const fetchPlayerStats = async (username: string) => {
    try {
      setLoading(true);
      // TODO: Implement RuneScape API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Mock stats for now
      const stats = null;
      setRunescapeStats(stats);
    } catch (error) {
      console.error('Error fetching RuneScape stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!playerData.username.trim()) {
      toast({
        title: "Erro",
        description: "Nome de usuário é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (player?.id) {
        // Update existing player
        const { error } = await supabase
          .from('players')
          .update({
            username: playerData.username,
            display_name: playerData.display_name || null,
            clan_name: playerData.clan_name || null,
            clan_rank: playerData.clan_rank || null,
            combat_level: playerData.combat_level,
            total_level: playerData.total_level,
            total_experience: playerData.total_experience,
            is_active: playerData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', player.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Jogador atualizado com sucesso"
        });
      } else {
        // Create new player
        const { error } = await supabase
          .from('players')
          .insert([{
            username: playerData.username,
            display_name: playerData.display_name || null,
            clan_name: playerData.clan_name || null,
            clan_rank: playerData.clan_rank || null,
            combat_level: playerData.combat_level,
            total_level: playerData.total_level,
            total_experience: playerData.total_experience,
            is_active: playerData.is_active
          }]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Jogador adicionado com sucesso"
        });
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving player:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar jogador",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof Player, value: any) => {
    setPlayerData(prev => ({ ...prev, [field]: value }));
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-runescape-gold">
            <div className="flex items-center space-x-3">
              <Zap className="h-6 w-6" />
              <span>{player?.id ? playerData.username : 'Novo Jogador'}</span>
              {playerData.combat_level && (
                <div className="flex items-center space-x-2 text-sm bg-runescape-gold/20 px-3 py-1 rounded-full">
                  <Sword className="h-4 w-4" />
                  <span>Combat: {playerData.combat_level}</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {!isEditing && player?.id && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {isEditing && (
                <Button variant="runescape" size="sm" onClick={handleSave} disabled={loading}>
                  <Save className="h-4 w-4" />
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="clan-card">
                <CardHeader>
                  <CardTitle className="text-runescape-gold">Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Nome de Usuário</Label>
                    <Input
                      id="username"
                      value={playerData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      disabled={!isEditing}
                      onBlur={() => {
                        if (playerData.username && isEditing) {
                          fetchPlayerStats(playerData.username);
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName">Nome de Exibição</Label>
                    <Input
                      id="displayName"
                      value={playerData.display_name || ""}
                      onChange={(e) => handleInputChange('display_name', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Nome alternativo para exibição"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clan">Clã</Label>
                    <Select
                      value={playerData.clan_name || ""}
                      onValueChange={(value) => handleInputChange('clan_name', value)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o clã" />
                      </SelectTrigger>
                      <SelectContent>
                        {clans.map(clan => (
                          <SelectItem key={clan} value={clan}>
                            {clan}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rank">Cargo no Clã</Label>
                    <Select
                      value={playerData.clan_rank || ""}
                      onValueChange={(value) => handleInputChange('clan_rank', value)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        {clanRanks.map(rank => (
                          <SelectItem key={rank} value={rank}>
                            {rank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="clan-card">
                <CardHeader>
                  <CardTitle className="text-runescape-gold">Estatísticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="combat">Nível de Combate</Label>
                    <Input
                      id="combat"
                      type="number"
                      value={playerData.combat_level || ""}
                      onChange={(e) => handleInputChange('combat_level', parseInt(e.target.value) || 0)}
                      disabled={!isEditing}
                      min="3"
                      max="138"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totalLevel">Nível Total</Label>
                    <Input
                      id="totalLevel"
                      type="number"
                      value={playerData.total_level || ""}
                      onChange={(e) => handleInputChange('total_level', parseInt(e.target.value) || 0)}
                      disabled={!isEditing}
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totalXp">Experiência Total</Label>
                    <Input
                      id="totalXp"
                      type="number"
                      value={playerData.total_experience || ""}
                      onChange={(e) => handleInputChange('total_experience', parseInt(e.target.value) || 0)}
                      disabled={!isEditing}
                      min="0"
                    />
                    {playerData.total_experience && (
                      <div className="text-sm text-muted-foreground">
                        {formatXp(playerData.total_experience || 0)} XP
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="active"
                      checked={playerData.is_active !== false}
                      onChange={(e) => handleInputChange('is_active', e.target.checked)}
                      disabled={!isEditing}
                      className="rounded"
                    />
                    <Label htmlFor="active">Membro Ativo</Label>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex space-x-3 pt-4">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancelar
                </Button>
                <Button variant="runescape" onClick={handleSave} disabled={loading} className="flex-1">
                  {loading ? "Salvando..." : (player?.id ? "Atualizar" : "Criar")} Jogador
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            {runescapeStats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="clan-card">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-runescape-gold mb-2">
                      {runescapeStats.totalskill || playerData.total_level}
                    </div>
                    <div className="text-sm text-muted-foreground">Nível Total</div>
                  </CardContent>
                </Card>
                
                <Card className="clan-card">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-runescape-blue mb-2">
                      {formatXp(runescapeStats.totalxp || playerData.total_experience || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">XP Total</div>
                  </CardContent>
                </Card>
                
                <Card className="clan-card">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">
                      {runescapeStats.combatlevel || playerData.combat_level}
                    </div>
                    <div className="text-sm text-muted-foreground">Nível de Combate</div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  {loading ? "Carregando estatísticas..." : "Estatísticas do RuneScape não disponíveis"}
                </div>
                {playerData.username && !loading && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => fetchPlayerStats(playerData.username)}
                  >
                    Tentar Carregar Novamente
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedPlayerModal;