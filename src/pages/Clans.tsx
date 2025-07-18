import { useState, useEffect } from "react";
import { Users, Download, RefreshCw, Crown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { runescapeApi } from "@/services/runescapeApi";
import { supabase } from "@/integrations/supabase/client";

// Função utilitária para calcular o nível de combate (RuneScape 3)
function calculateCombatLevel(hiscores: any) {
  // Fórmula oficial RS3: https://runescape.wiki/w/Combat_level
  const defence = hiscores.defence?.level || 1;
  const constitution = hiscores.constitution?.level || 10;
  const prayer = hiscores.prayer?.level || 1;
  const summoning = hiscores.summoning?.level || 1;
  const attack = hiscores.attack?.level || 1;
  const strength = hiscores.strength?.level || 1;
  const magic = hiscores.magic?.level || 1;
  const ranged = hiscores.ranged?.level || 1;

  const base = 0.25 * (defence + constitution + Math.floor(prayer / 2) + Math.floor(summoning / 2));
  const melee = 0.325 * (attack + strength);
  const range = 0.325 * Math.floor(ranged * 1.5);
  const mage = 0.325 * Math.floor(magic * 1.5);
  return Math.floor(base + Math.max(melee, range, mage));
}

const Clans = () => {
  const [loading, setLoading] = useState(false);
  const [atlantisCount, setAtlantisCount] = useState<number | null>(null);
  const [argusCount, setArgusCount] = useState<number | null>(null);
  const { toast } = useToast();

  // Função para buscar a contagem de membros de cada clã
  const fetchClanCounts = async () => {
    const [{ count: atlantis }, { count: argus }] = await Promise.all([
      supabase.from("players").select("id", { count: "exact", head: true }).eq("clan_name", "Atlantis"),
      supabase.from("players").select("id", { count: "exact", head: true }).eq("clan_name", "Atlantis Argus"),
    ]);
    setAtlantisCount(atlantis ?? 0);
    setArgusCount(argus ?? 0);
  };

  useEffect(() => {
    fetchClanCounts();
  }, []);

  const TEN_HOURS_MS = 10 * 60 * 60 * 1000;

  const importClanMembers = async (clanName: string) => {
    setLoading(true);
    try {
      const members = await runescapeApi.getClanMembers(clanName, 500);
      // Buscar todos os jogadores já existentes desse clã no Supabase
      const { data: existingPlayers, error: fetchError } = await supabase
        .from("players")
        .select("username, updated_at")
        .eq("clan_name", clanName);
      const existingMap = (existingPlayers || []).reduce((acc: any, p: any) => {
        acc[p.username.toLowerCase()] = p.updated_at ? new Date(p.updated_at) : null;
        return acc;
      }, {});

      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      for (const member of members) {
        const lastUpdate = existingMap[member.name.toLowerCase()];
        if (lastUpdate && Date.now() - lastUpdate.getTime() < TEN_HOURS_MS) {
          skippedCount++;
          continue; // Pula jogadores atualizados nas últimas 10h
        }
        try {
          // Buscar hiscores do jogador
          const hiscores = await runescapeApi.getPlayerHiscores(member.name);
          // Calcular total_level (soma dos níveis das skills)
          const total_level = Object.values(hiscores).reduce((acc: number, skill: any) => acc + (skill.level || 0), 0);
          // Calcular combat_level
          const combat_level = calculateCombatLevel(hiscores);
          // Salvar no Supabase
          const { error } = await supabase.from("players").upsert({
            username: member.name,
            clan_name: clanName,
            clan_rank: member.rank,
            total_experience: member.experience,
            total_level,
            combat_level,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "username" });
          if (error) errorCount++;
          else successCount++;
        } catch (err) {
          errorCount++;
          // Continua para o próximo jogador
        }
      }
      await fetchClanCounts(); // Atualiza a contagem após importação
      toast({
        title: "Importação concluída",
        description: `${successCount} membros importados/atualizados, ${skippedCount} já estavam atualizados, ${errorCount > 0 ? errorCount + ' erros.' : ''}`,
      });
    } catch (error) {
      toast({
        title: "Erro na importação",
        description: "Falha ao importar membros do clã",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-cinzel font-bold text-runescape-gold">Clãs</h1>
          <p className="text-muted-foreground">Gerencie os clãs Atlantis e Atlantis Argus</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="clan-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-runescape-gold">
                <Crown className="h-6 w-6" />
                <span>Atlantis</span>
              </CardTitle>
              <CardDescription>Clã principal da organização</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-2xl font-bold text-runescape-gold">
                {atlantisCount !== null ? `${atlantisCount} membros` : "..."}
              </div>
              <Button
                onClick={() => importClanMembers("Atlantis")}
                disabled={loading}
                className="btn-runescape w-full"
              >
                <Users className="h-4 w-4" />
                Importar Membros
              </Button>
            </CardContent>
          </Card>

          <Card className="clan-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-purple-400">
                <Shield className="h-6 w-6" />
                <span>Atlantis Argus</span>
              </CardTitle>
              <CardDescription>Clã secundário da organização</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-2xl font-bold text-purple-400">
                {argusCount !== null ? `${argusCount} membros` : "..."}
              </div>
              <Button
                onClick={() => importClanMembers("Atlantis Argus")}
                disabled={loading}
                className="btn-clan w-full"
              >
                <Users className="h-4 w-4" />
                Importar Membros
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Clans;
