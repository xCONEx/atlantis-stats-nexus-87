import { useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import DonationModal from "@/components/DonationModal";
import { supabase } from "@/integrations/supabase/client";
import PlayerDonationsModal from "@/components/PlayerDonationsModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useMemo } from "react";
import * as XLSX from "xlsx";
import { useRef } from "react";
import { hasRolePermission } from "@/lib/utils";

interface PlayerDonationSummary {
  player_id: string;
  player_name: string;
  total_amount: number;
}

function cleanPlayerName(name: string) {
  if (!name) return '';
  return name.normalize('NFC').replace(/[^\p{L}\p{N}\s\-_'!@#$%^&*()+=,.?]/gu, '');
}

function formatGpWithColor(value: number) {
  let display = value.toLocaleString('pt-BR');
  let color = 'text-yellow-300';
  let sufixo = '';
  if (value >= 1_000_000_000_000_000) {
    display = (value / 1_000_000_000_000_000).toFixed(3).replace(/\.000$/, '') + 'Q';
    color = 'text-orange-400';
  } else if (value >= 1_000_000_000_000) {
    display = (value / 1_000_000_000_000).toFixed(3).replace(/\.000$/, '') + 'T';
    color = 'text-purple-400';
  } else if (value >= 1_000_000_000) {
    display = (value / 1_000_000_000).toFixed(3).replace(/\.000$/, '') + 'B';
    color = 'text-blue-400';
  } else if (value >= 10_000_000) {
    display = (value / 1_000_000).toFixed(3).replace(/\.000$/, '') + 'M';
    color = 'text-green-400';
  } else if (value >= 100_000) {
    display = (value / 1_000).toFixed(3).replace(/\.000$/, '') + 'K';
    color = 'text-white';
  }
  return { display, color };
}

const Donations = () => {
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [playerDonations, setPlayerDonations] = useState<PlayerDonationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<{ player_id: string; player_name: string } | null>(null);
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [deleteGhost, setDeleteGhost] = useState<string | null>(null);
  const [deletingGhost, setDeletingGhost] = useState(false);
  const PAGE_SIZE = 120; // 30 linhas x 4 cards
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchPlayerDonations = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('donations')
        .select('player_id, player_name, amount')
        .order('player_name', { ascending: true });
      if (!error && data) {
        // Agrupar no front (caso não tenha group by no supabase)
        const grouped: Record<string, PlayerDonationSummary> = {};
        data.forEach((donation: any) => {
          const key = donation.player_id || donation.player_name;
          if (!grouped[key]) {
            grouped[key] = {
              player_id: donation.player_id,
              player_name: donation.player_name || 'Jogador',
              total_amount: 0,
            };
          }
          grouped[key].total_amount += donation.amount || 0;
        });
        let arr = Object.values(grouped);
        // Filtro de busca
        if (searchTerm.trim()) {
          arr = arr.filter((p) =>
            p.player_name.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        // Ordenar alfabeticamente
        arr.sort((a, b) => a.player_name.localeCompare(b.player_name, 'pt-BR'));
        setTotalPages(Math.max(1, Math.ceil(arr.length / PAGE_SIZE)));
        // Paginação
        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        setPlayerDonations(arr.slice(start, end));
      }
      setLoading(false);
    };
    fetchPlayerDonations();
    // eslint-disable-next-line
  }, [showDonationModal, searchTerm, currentPage]);

  // Atualiza página se filtro reduzir o total
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleDeleteGhost = async () => {
    if (!deleteGhost) return;
    setDeletingGhost(true);
    const { error } = await supabase.from('donations').delete().eq('player_name', deleteGhost).is('player_id', null);
    if (!error) {
      setPlayerDonations((prev) => prev.filter((p) => p.player_name !== deleteGhost));
      toast({ title: 'Usuário fantasma removido', description: 'Todas as doações desse nome foram excluídas.', variant: 'default' });
    } else {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    }
    setDeletingGhost(false);
    setDeleteGhost(null);
  };

  // Função para exportar todos os dados filtrados para Excel
  const handleExportExcel = async () => {
    setLoading(true);
    // Buscar todos os dados agrupados (sem paginação)
    const { data, error } = await supabase
      .from('donations')
      .select('player_id, player_name, amount')
      .order('player_name', { ascending: true });
    if (!error && data) {
      // Agrupar no front
      const grouped: Record<string, PlayerDonationSummary> = {};
      data.forEach((donation: any) => {
        const key = donation.player_id || donation.player_name;
        if (!grouped[key]) {
          grouped[key] = {
            player_id: donation.player_id,
            player_name: donation.player_name || 'Jogador',
            total_amount: 0,
          };
        }
        grouped[key].total_amount += donation.amount || 0;
      });
      let arr = Object.values(grouped);
      // Filtro de busca
      if (searchTerm.trim()) {
        arr = arr.filter((p) =>
          p.player_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      // Ordenar alfabeticamente
      arr.sort((a, b) => a.player_name.localeCompare(b.player_name, 'pt-BR'));
      // Montar dados para Excel
      const excelData = arr.map((p) => ({
        "Nome do Jogador": p.player_name,
        "Valor Total Doado": p.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      }));
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Doações");
      XLSX.writeFile(wb, "doacoes.xlsx");
    }
    setLoading(false);
  };

  // Função para importar doações de um arquivo Excel
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
      // Buscar todos os jogadores ativos para associar pelo nome
      const { data: players } = await supabase
        .from('players')
        .select('id, username, display_name, is_active');
      const donationsToInsert = rows.map((row) => {
        const nome = (row["Nome do Jogador"] || "").toString().trim();
        const valorStr = (row["Valor Total Doado"] || "0").toString().replace(/[^\d,\.]/g, '').replace(',', '.');
        const valor = parseFloat(valorStr);
        // Busca exata ou parcial (case-insensitive)
        const player = players?.find(
          (p) =>
            p.is_active &&
            (p.display_name?.toLowerCase() === nome.toLowerCase() ||
              p.username?.toLowerCase() === nome.toLowerCase() ||
              p.display_name?.toLowerCase().includes(nome.toLowerCase()) ||
              p.username?.toLowerCase().includes(nome.toLowerCase()))
        );
        return {
          player_id: player ? player.id : null,
          player_name: nome,
          amount: valor,
          event: 'Importação Excel',
          portals: 1,
          date: new Date().toISOString().split('T')[0],
          created_by: null,
          created_by_email: 'import-excel',
          notes: 'Importado via Excel'
        };
      });
      // Inserir em lotes de 100 para evitar timeout
      for (let i = 0; i < donationsToInsert.length; i += 100) {
        const batch = donationsToInsert.slice(i, i + 100);
        const { error } = await supabase.from('donations').insert(batch);
        if (error) throw error;
      }
      toast({ title: 'Importação concluída', description: 'Doações importadas com sucesso!', variant: 'default' });
      setShowDonationModal(false); // Fecha modal se aberto
      setCurrentPage(1); // Volta para primeira página
    } catch (err: any) {
      toast({ title: 'Erro na importação', description: err.message || 'Erro desconhecido', variant: 'destructive' });
    }
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-cinzel font-bold text-runescape-gold">Doações</h1>
            <p className="text-muted-foreground">Gerencie doações dos membros dos clãs</p>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Buscar jogador..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            {hasRolePermission(userRole, [
              'admin', 'administrator', 'leader', 'vice-leader', 'coordinator', 'fiscal', 'organizador'
            ]) && (
              <Button onClick={() => setShowDonationModal(true)} className="btn-runescape">
                <Plus className="h-4 w-4" />
                Nova Doação
              </Button>
            )}
          </div>
        </div>

        <div>
          <Card className="clan-card">
            <CardHeader>
              <CardTitle className="text-runescape-gold">Controle de Doações</CardTitle>
              <CardDescription>Resumo por jogador</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Carregando doações...</p>
              ) : playerDonations.length === 0 ? (
                <p className="text-muted-foreground">Nenhum jogador encontrado.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {playerDonations
                    .filter(player => !!player.player_id)
                    .map((player) => {
                      const gp = formatGpWithColor(player.total_amount);
                      return (
                        <Card
                          key={player.player_id}
                          className="shadow-md hover:shadow-lg transition cursor-pointer"
                          // Remover onClick do Card
                        >
                          <CardHeader>
                            <CardTitle className="truncate">{cleanPlayerName(player.player_name)}</CardTitle>
                            <CardDescription>Total doado</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-lg ${gp.color}`}>{gp.display} GP</span>
                            </div>
                            <Button
                              variant={"outline" as any}
                              size={"sm" as any}
                              className="mt-2 w-full"
                              onClick={() => setSelectedPlayer({ player_id: player.player_id, player_name: player.player_name })}
                            >
                              Ver detalhes
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  {/* Jogadores sem player_id */}
                  {playerDonations
                    .filter(player => !player.player_id)
                    .map((player) => {
                      const gp = formatGpWithColor(player.total_amount);
                      return (
                        <Card key={player.player_name} className="shadow-md opacity-60">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="truncate">{cleanPlayerName(player.player_name)}</CardTitle>
                              {userRole === 'admin' && (
                                <Button variant="destructive" size="sm" onClick={() => setDeleteGhost(player.player_name)} disabled={deletingGhost}>
                                  Remover
                                </Button>
                              )}
                            </div>
                            <CardDescription>Total doado</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-lg ${gp.color}`}>{gp.display} GP</span>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">Jogador não cadastrado no sistema</div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-muted-foreground">
            Exibindo {playerDonations.length > 0 ? ((currentPage - 1) * PAGE_SIZE + 1) : 0}
            -{(currentPage - 1) * PAGE_SIZE + playerDonations.length} de {totalPages * PAGE_SIZE}
          </div>
          <div className="flex gap-2 items-center">
            {hasRolePermission(userRole, [
              'admin', 'administrator', 'leader', 'vice-leader', 'coordinator', 'fiscal', 'organizador'
            ]) && (
              <>
                <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={loading}>
                  Exportar para Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                  Importar Excel
                </Button>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleImportExcel}
                />
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>« Primeira</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>‹ Anterior</Button>
            <span className="text-sm">Página {currentPage} de {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Próxima ›</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>Última »</Button>
          </div>
        </div>
      </div>

      <DonationModal
        open={showDonationModal}
        onClose={() => setShowDonationModal(false)}
        onSave={() => setShowDonationModal(false)}
      />
      {/* Modal de detalhes das doações do jogador */}
      {selectedPlayer && selectedPlayer.player_id && (
        <PlayerDonationsModal
          player_id={selectedPlayer.player_id}
          player_name={selectedPlayer.player_name}
          open={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
      <AlertDialog open={!!deleteGhost} onOpenChange={(open) => !open && setDeleteGhost(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário fantasma</AlertDialogTitle>
          </AlertDialogHeader>
          <div>Tem certeza que deseja remover todas as doações deste usuário? Esta ação não pode ser desfeita.</div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingGhost} onClick={() => setDeleteGhost(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={deletingGhost} onClick={handleDeleteGhost}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Donations;
