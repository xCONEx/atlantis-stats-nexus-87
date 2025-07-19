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
import PlayerDetailsModal from "@/components/PlayerDetailsModal";

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
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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
        const uniqueRanks = Array.from(new Set(data.map((p: any) => p.clan_rank).filter(Boolean))) as string[];
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

  const handlePlayerClick = async (username: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("players")
      .select("username, clan_rank, total_experience, combat_level, total_level, created_at, updated_at, last_updated, clan_name")
      .eq("username", username)
      .single();
    setLoading(false);
    if (error || !data) {
      toast({ title: "Erro ao buscar jogador", description: error?.message || "Não encontrado", variant: "destructive" });
      return;
    }
    setSelectedPlayer({ ...data });
    setModalOpen(true);
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
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-cinzel font-bold text-runescape-gold">Jogadores</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Veja todos os membros dos clãs importados</p>
        </div>
        
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-start sm:items-center mb-4">
          <div className="flex items-center space-x-2">
            <label className="font-bold text-xs sm:text-sm">Clã:</label>
            <select
              value={clanFilter}
              onChange={e => setClanFilter(e.target.value)}
              className="border rounded px-2 py-1 bg-background text-foreground text-xs sm:text-sm"
            >
              <option value="Atlantis">Atlantis</option>
              <option value="Atlantis Argus">Atlantis Argus</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="font-bold text-xs sm:text-sm">Cargo:</label>
            <select
              value={rankFilter}
              onChange={e => setRankFilter(e.target.value)}
              className="border rounded px-2 py-1 bg-background text-foreground text-xs sm:text-sm"
            >
              <option value="">Todos</option>
              {allRanks.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Input
              type="text"
              placeholder="Buscar jogador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && fetchPlayers(clanFilter, 1, search, rankFilter)}
              className="text-xs sm:text-sm"
            />
            <Button 
              onClick={() => fetchPlayers(clanFilter, 1, search, rankFilter)} 
              disabled={loading} 
              className="btn-medieval btn-responsive"
            >
              <Search className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-1">Buscar</span>
            </Button>
          </div>
        </div>

        {/* Lista de Jogadores - Mobile Cards, Desktop Table */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-runescape-gold mx-auto mb-2"></div>
              <p className="text-sm">Carregando...</p>
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhum jogador encontrado</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="sm:hidden space-y-3">
                {players.map((p, i) => (
                  <div
                    key={p.username}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      i % 2 === 0 
                        ? "bg-[#23283a] text-runescape-gold hover:bg-[#2e3450]" 
                        : "bg-[#181c24] text-white hover:bg-[#23283a]"
                    }`}
                    onClick={() => handlePlayerClick(p.username)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-sm truncate flex-1">
                        {cleanName(p.username)}
                      </div>
                      <div className="text-xs text-muted-foreground ml-2">
                        {p.clan_rank}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      XP: {p.total_experience?.toLocaleString("pt-BR") || "0"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto rounded-lg border border-muted-foreground/20 bg-[#181c24] shadow-md">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-[#23283a] text-runescape-gold">
                      <th className="px-3 py-2 text-left font-bold">Nome</th>
                      <th className="px-3 py-2 text-left font-bold">Rank</th>
                      <th className="px-3 py-2 text-left font-bold">XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p, i) => (
                      <tr
                        key={p.username}
                        className={i % 2 === 0 ? "bg-[#23283a] text-runescape-gold cursor-pointer hover:bg-[#2e3450]" : "bg-[#181c24] text-white cursor-pointer hover:bg-[#23283a]"}
                        onClick={() => handlePlayerClick(p.username)}
                      >
                        <td className="px-3 py-2 font-bold break-all">{cleanName(p.username)}</td>
                        <td className="px-3 py-2">{p.clan_rank}</td>
                        <td className="px-3 py-2">{p.total_experience?.toLocaleString("pt-BR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex flex-wrap gap-2 justify-center items-center mt-4">
            <Button
              onClick={() => setPage(page - 1)}
              disabled={page === 1 || loading}
              className="btn-runescape btn-responsive"
            >
              <span className="text-xs sm:text-sm">Anterior</span>
            </Button>
            <span className="text-runescape-gold font-bold mx-2 text-xs sm:text-sm">
              Página {page} de {totalPages}
            </span>
            <Button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages || loading}
              className="btn-runescape btn-responsive"
            >
              <span className="text-xs sm:text-sm">Próxima</span>
            </Button>
          </div>
        )}
      </div>
      
      <PlayerDetailsModal
        player={selectedPlayer ? {
          name: selectedPlayer.username,
          clan: selectedPlayer.clan_name || clanFilter,
          combat: selectedPlayer.combat_level ?? 0,
          totalLevel: selectedPlayer.total_level ?? 0,
          totalXp: selectedPlayer.total_experience ?? 0,
          lastSeen: selectedPlayer.last_updated || selectedPlayer.updated_at || '',
          isOnline: false, // Ajuste se houver campo
          rank: selectedPlayer.clan_rank || '',
          joined: selectedPlayer.created_at || ''
        } : null}
        open={modalOpen && !!selectedPlayer}
        onClose={() => setModalOpen(false)}
      />
    </Layout>
  );
};

export default Players;
