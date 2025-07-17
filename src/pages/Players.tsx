import { useState, useEffect } from "react";
import { Search, Download, RefreshCw, User, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { runescapeApi, type PlayerHiscores, type ClanMember } from "@/services/runescapeApi";
import { supabase } from "@/integrations/supabase/client";

const Players = () => {
  const [loading, setLoading] = useState(false);
  const [clanFilter, setClanFilter] = useState<string>("Atlantis");
  const [players, setPlayers] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchPlayers = async (clan: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("players")
      .select("username, clan_rank, total_experience")
      .eq("clan_name", clan)
      .order("total_experience", { ascending: false });
    if (!error && data) {
      setPlayers(data);
    } else {
      setPlayers([]);
      toast({
        title: "Erro ao buscar jogadores",
        description: error?.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlayers(clanFilter);
  }, [clanFilter]);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-cinzel font-bold text-runescape-gold">Jogadores</h1>
          <p className="text-muted-foreground">Veja todos os membros dos clãs importados</p>
        </div>
        <div className="flex gap-4 items-center mb-4">
          <label className="font-bold">Clã:</label>
          <select
            value={clanFilter}
            onChange={e => setClanFilter(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="Atlantis">Atlantis</option>
            <option value="Atlantis Argus">Atlantis Argus</option>
          </select>
          <Button onClick={() => fetchPlayers(clanFilter)} disabled={loading} className="btn-medieval">
            Atualizar Lista
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-muted-foreground/10">
                <th className="px-2 py-1 text-left">Nome</th>
                <th className="px-2 py-1 text-left">Rank</th>
                <th className="px-2 py-1 text-left">XP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="text-center py-4">Carregando...</td></tr>
              ) : players.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-4">Nenhum jogador encontrado</td></tr>
              ) : (
                players.map((p, i) => (
                  <tr key={p.username} className={i % 2 === 0 ? "bg-white" : "bg-muted-foreground/5"}>
                    <td className="px-2 py-1 font-bold">{p.username}</td>
                    <td className="px-2 py-1">{p.clan_rank}</td>
                    <td className="px-2 py-1">{p.total_experience?.toLocaleString("pt-BR")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Players;
