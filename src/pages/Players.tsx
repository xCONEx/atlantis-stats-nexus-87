import { useState } from "react";
import { Search, Download, RefreshCw, User, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { runescapeApi, type PlayerHiscores, type ClanMember } from "@/services/runescapeApi";

const Players = () => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [atlantisMembers, setAtlantisMembers] = useState<ClanMember[]>([]);
  const [atlantisArgusMembers, setAtlantisArgusMembers] = useState<ClanMember[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerHiscores | null>(null);
  const { toast } = useToast();

  const loadClanMembers = async () => {
    setLoading(true);
    try {
      const [atlantis, atlantisArgus] = await Promise.all([
        runescapeApi.getAtlantisClanMembers(),
        runescapeApi.getAtlantisArgusClanMembers()
      ]);
      
      setAtlantisMembers(atlantis);
      setAtlantisArgusMembers(atlantisArgus);
      
      toast({
        title: "Membros carregados",
        description: `${atlantis.length + atlantisArgus.length} membros carregados com sucesso`,
      });
    } catch (error) {
      toast({
        title: "Erro ao carregar membros",
        description: "Falha ao buscar dados dos clãs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchPlayer = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const playerData = await runescapeApi.getPlayerHiscores(searchTerm);
      setSelectedPlayer(playerData);
      
      toast({
        title: "Jogador encontrado",
        description: `Dados de ${searchTerm} carregados com sucesso`,
      });
    } catch (error) {
      toast({
        title: "Jogador não encontrado",
        description: `Não foi possível encontrar o jogador "${searchTerm}"`,
        variant: "destructive",
      });
      setSelectedPlayer(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-cinzel font-bold text-runescape-gold">Jogadores</h1>
          <p className="text-muted-foreground">Busque e gerencie jogadores dos clãs</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Buscar jogador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchPlayer()}
            />
            <Button onClick={searchPlayer} disabled={loading} variant="runescape">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={loadClanMembers} disabled={loading} variant="medieval">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Carregar Membros dos Clãs
          </Button>
        </div>

        {selectedPlayer && (
          <Card className="clan-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-runescape-gold">
                <User className="h-5 w-5" />
                <span>{searchTerm}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-runescape-gold">
                    {selectedPlayer.overall.level}
                  </div>
                  <div className="text-sm text-muted-foreground">Nível Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-runescape-gold">
                    {runescapeApi.formatExperience(selectedPlayer.overall.experience)}
                  </div>
                  <div className="text-sm text-muted-foreground">XP Total</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Players;