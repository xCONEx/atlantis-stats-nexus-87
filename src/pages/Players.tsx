import { useState, useEffect } from "react";
import { Search, Download, RefreshCw, User, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { runescapeApi, type PlayerHiscores, type ClanMember } from "@/services/runescapeApi";
import { supabase } from "@/integrations/supabase/client";
import he from "he";

const PAGE_SIZE = 20;

const Players = () => {
  const [loading, setLoading] = useState(false);
  const [clanFilter, setClanFilter] = useState<string>("Atlantis");
  const [players, setPlayers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [rankFilter, setRankFilter] = useState("");
  const [allRanks, setAllRanks] = useState<string[]>([]);
  const { toast } = useToast();

  // Função para decodificar nomes e remover caracteres problemáticos
  const cleanName = (name: string) => {
    if (!name) return "";
    // Decodifica entidades HTML e remove caracteres indesejados
    return he.decode(name.replace(/[^\w\s\-\[\]!@#$%^&*()_+=,.?']/g, "")).trim();
  };

  const fetchPlayers = async (clan: string, pageNum = 1, searchTerm = "", rank = "") => {
    setLoading(true);
    const from = (pageNum - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("players")
      .select("username, clan_rank, total_experience", { count: "exact" })
      .eq("clan_name", clan)
      .order("total_experience", { ascending: false });
    if (searchTerm) {
      query = query.ilike("username", `%${searchTerm}%`);
    }
    if (rank) {
      query = query.eq("clan_rank", rank);
    }
    const { data, error, count } = await query.range(from, to);
    if (!error && data) {
      setPlayers(data);
      setTotal(count || 0);
      // Atualiza lista de cargos disponíveis
      if (pageNum === 1 && !searchTerm && !rank) {
        const uniqueRanks = Array.from(new Set(data.map((p: any) => p.clan_rank).filter(Boolean)));
        setAllRanks(uniqueRanks);
      }
    } else {
      setPlayers([]);
      setTotal(0);
      toast({
        title: "Erro ao buscar jogadores",
        description: error?.message || "Erro desconhecido",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    setPage(1);
    fetchPlayers(clanFilter, 1, search, rankFilter);
    // eslint-disable-next-line
  }, [clanFilter, rankFilter]);

  useEffect(() => {
    fetchPlayers(clanFilter, page, search, rankFilter);
    // eslint-disable-next-line
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-cinzel font-bold text-runescape-gold">Jogadores</h1>
          <p className="text-muted-foreground">Veja todos os membros dos clãs importados</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <label className="font-bold">Clã:</label>
          <select
            value={clanFilter}
            onChange={e => setClanFilter(e.target.value)}
            className="border rounded px-2 py-1 bg-background text-foreground"
          >
            <option value="Atlantis">Atlantis</option>
            <option value="Atlantis Argus">Atlantis Argus</option>
          </select>
          <label className="font-bold">Cargo:</label>
          <select
            value={rankFilter}
            onChange={e => setRankFilter(e.target.value)}
            className="border rounded px-2 py-1 bg-background text-foreground"
          >
            <option value="">Todos</option>
            {allRanks.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Buscar jogador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchPlayers(clanFilter, 1, search, rankFilter)}
            className="border rounded px-2 py-1 bg-background text-foreground"
            style={{ minWidth: 180 }}
          />
          <Button onClick={() => fetchPlayers(clanFilter, 1, search, rankFilter)} disabled={loading} className="btn-medieval">
            Buscar
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-muted-foreground/20 bg-[#181c24] shadow-md">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[#23283a] text-runescape-gold">
                <th className="px-3 py-2 text-left font-bold">Nome</th>
                <th className="px-3 py-2 text-left font-bold">Rank</th>
                <th className="px-3 py-2 text-left font-bold">XP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="text-center py-4 text-foreground">Carregando...</td></tr>
              ) : players.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-4 text-foreground">Nenhum jogador encontrado</td></tr>
              ) : (
                players.map((p, i) => (
                  <tr key={p.username} className={i % 2 === 0 ? "bg-[#23283a] text-runescape-gold" : "bg-[#181c24] text-white"}>
                    <td className="px-3 py-2 font-bold break-all">{cleanName(p.username)}</td>
                    <td className="px-3 py-2">{p.clan_rank}</td>
                    <td className="px-3 py-2">{p.total_experience?.toLocaleString("pt-BR")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex flex-wrap gap-2 justify-center items-center mt-4">
            <Button
              onClick={() => setPage(page - 1)}
              disabled={page === 1 || loading}
              className="btn-runescape px-3 py-1"
            >
              Anterior
            </Button>
            <span className="text-runescape-gold font-bold mx-2">
              Página {page} de {totalPages}
            </span>
            <Button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages || loading}
              className="btn-runescape px-3 py-1"
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Players;