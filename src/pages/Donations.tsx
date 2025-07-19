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
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { useMemo } from "react";
import * as XLSX from "xlsx";
import { useRef } from "react";
import { hasRolePermission } from "@/lib/utils";
import { calcularCargo } from "@/lib/utils";
import axios from 'axios';

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
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [pendingExcelFile, setPendingExcelFile] = useState<File | null>(null);
  const [showEditGhostModal, setShowEditGhostModal] = useState(false);
  const [selectedGhostPlayer, setSelectedGhostPlayer] = useState<string>("");
  const [editingGhost, setEditingGhost] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);

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

  // Função para atualizar cargo no Discord
  const atualizarRoleDiscord = async (playerId) => {
    // Buscar Discord ID associado
    const { data: link } = await supabase
      .from('discord_links')
      .select('discord_id')
      .eq('player_id', playerId)
      .single();
    if (!link || !link.discord_id) return;
    // Buscar total de doações
    const { data: donations } = await supabase
      .from('donations')
      .select('amount')
      .eq('player_id', playerId);
    const total = donations ? donations.reduce((acc, d) => acc + (d.amount || 0), 0) : 0;
    const cargo = calcularCargo(total);
    try {
      await axios.post('https://atlantisstatus.vercel.app/api/discord-roles', {
        discord_id: link.discord_id,
        action: 'update_role'
      });
      toast({ title: 'Cargo do Discord atualizado!', description: `Novo cargo: ${cargo}` });
    } catch (err) {
      console.error('Erro ao atualizar cargo no Discord:', err.response?.data || err.message);
      toast({ title: 'Erro ao atualizar cargo no Discord', description: err.response?.data?.error || err.message, variant: 'destructive' });
    }
  };

  // Função para remover doação e atualizar cargo no Discord
  const handleDeleteDonation = async (donation) => {
    setDeletingGhost(true);
    try {
      const { error } = await supabase
        .from('donations')
        .delete()
        .eq('id', donation.id);
      if (error) throw error;
      // Atualizar cargo no Discord após remoção
      try {
        await atualizarRoleDiscord(donation.player_id);
        toast({ title: 'Cargo do Discord atualizado após remoção!' });
      } catch (err) {
        console.error('Erro ao atualizar cargo no Discord após remoção:', err.response?.data || err.message);
        toast({ title: 'Erro ao atualizar cargo no Discord', description: err.response?.data?.error || err.message, variant: 'destructive' });
      }
      toast({ title: 'Doação removida com sucesso' });
      setDeleteGhost(null);
      fetchPlayerDonations();
    } catch (error) {
      console.error('Erro ao remover doação:', error);
      toast({ title: 'Erro ao remover doação', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingGhost(false);
    }
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

  // Função para abrir modal de seleção de abas
  const handleExcelFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    setSheetNames(workbook.SheetNames);
    setSelectedSheets(workbook.SheetNames);
    setPendingExcelFile(file);
    setShowSheetModal(true);
  };

  // Função para importar doações das abas selecionadas
  const handleImportSelectedSheets = async () => {
    if (!pendingExcelFile || selectedSheets.length === 0) {
      setShowSheetModal(false);
      return;
    }
    setLoading(true);
    const fantasmas: string[] = [];
    try {
      const data = await pendingExcelFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      // Buscar todos os jogadores ativos para associar pelo nome
      const { data: players } = await supabase
        .from('players')
        .select('id, username, display_name, is_active');
      const donationsToInsert: any[] = [];
      selectedSheets.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);
        rows.forEach((row, idx) => {
          const nome = (row["Jogador"] || "").toString().trim();
          // Portáteis
          const portateis = parseInt(row["Portáteis"] || "0", 10);
          if (portateis > 0) {
            const player = players?.find(
              (p) =>
                p.is_active &&
                (p.display_name?.toLowerCase() === nome.toLowerCase() ||
                  p.username?.toLowerCase() === nome.toLowerCase() ||
                  p.display_name?.toLowerCase().includes(nome.toLowerCase()) ||
                  p.username?.toLowerCase().includes(nome.toLowerCase()))
            );
            if (!player) fantasmas.push(nome);
            donationsToInsert.push({
              player_id: player ? player.id : null,
              player_name: nome,
              amount: portateis,
              event: 'PORTATEIS',
              donation_type: 'portateis',
              portals: 1,
              date: new Date().toISOString().split('T')[0],
              created_by: null,
              created_by_email: 'import-excel',
              description: 'Importado via Excel'
            });
          }
          // Dinheiro (M)
          const dinheiroM = parseInt(row["Total Doado (M)"] || "0", 10);
          if (dinheiroM > 0) {
            const player = players?.find(
              (p) =>
                p.is_active &&
                (p.display_name?.toLowerCase() === nome.toLowerCase() ||
                  p.username?.toLowerCase() === nome.toLowerCase() ||
                  p.display_name?.toLowerCase().includes(nome.toLowerCase()) ||
                  p.username?.toLowerCase().includes(nome.toLowerCase()))
            );
            if (!player) fantasmas.push(nome);
            donationsToInsert.push({
              player_id: player ? player.id : null,
              player_name: nome,
              amount: dinheiroM * 1000000,
              event: 'Moeda',
              donation_type: 'moeda',
              portals: 1,
              date: new Date().toISOString().split('T')[0],
              created_by: null,
              created_by_email: 'import-excel',
              description: 'Importado via Excel'
            });
          }
        });
      });
      // Inserir em lotes de 100 para evitar timeout
      let totalInseridas = 0;
      for (let i = 0; i < donationsToInsert.length; i += 100) {
        const batch = donationsToInsert.slice(i, i + 100);
        const { error, count } = await supabase.from('donations').insert(batch, { count: 'exact' });
        if (error) {
          console.error('Erro ao inserir batch:', error, batch);
          toast({ title: 'Erro na importação', description: error.message || 'Erro desconhecido', variant: 'destructive' });
          setLoading(false);
          setShowSheetModal(false);
          setPendingExcelFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
        totalInseridas += batch.length;
      }
      let msg = `Doações importadas com sucesso! Total inseridas: ${totalInseridas}`;
      if (fantasmas.length > 0) {
        const unicos = Array.from(new Set(fantasmas));
        msg += `\nJogadores não encontrados (fantasmas):\n${unicos.join(', ')}`;
      }
      toast({ title: 'Importação concluída', description: msg, variant: 'default' });
      setShowDonationModal(false); // Fecha modal se aberto
      setCurrentPage(1); // Volta para primeira página
    } catch (err: any) {
      console.error('Erro geral na importação:', err);
      toast({ title: 'Erro na importação', description: err.message || 'Erro desconhecido', variant: 'destructive' });
    }
    setLoading(false);
    setShowSheetModal(false);
    setPendingExcelFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Função para buscar e atualizar a lista de doações após remoção
  const fetchPlayerDonations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('donations')
      .select('player_id, player_name, amount')
      .order('player_name', { ascending: true });
    if (!error && data) {
      // Agrupar no front (caso não tenha group by no supabase)
      const grouped: Record<string, PlayerDonationSummary> = {};
      for (const donation of data) {
        const key = donation.player_id || donation.player_name;
        if (!grouped[key]) {
          grouped[key] = {
            player_id: donation.player_id,
            player_name: donation.player_name,
            total_amount: 0,
          };
        }
        grouped[key].total_amount += donation.amount || 0;
      }
      setPlayerDonations(Object.values(grouped));
    }
    setLoading(false);
  };

  // Função para carregar jogadores disponíveis
  const loadAvailablePlayers = async () => {
    const { data } = await supabase
      .from('players')
      .select('id, username, display_name, is_active')
      .eq('is_active', true);
    setAvailablePlayers(data || []);
  };

  // Função para editar jogador fantasma
  const handleEditGhostPlayer = async () => {
    if (!selectedGhostPlayer) return;
    setEditingGhost(true);
    try {
      // Buscar todas as doações do jogador fantasma
      const { data: donations } = await supabase
        .from('donations')
        .select('id')
        .eq('player_name', selectedGhostPlayer)
        .is('player_id', null);
      
      if (donations && donations.length > 0) {
        // Atualizar todas as doações para o jogador selecionado
        const { error } = await supabase
          .from('donations')
          .update({ 
            player_id: selectedGhostPlayer,
            player_name: null // Limpar o nome fantasma
          })
          .eq('player_name', selectedGhostPlayer)
          .is('player_id', null);
        
        if (error) {
          toast({ title: 'Erro ao editar', description: error.message, variant: 'destructive' });
        } else {
          toast({ title: 'Jogador editado', description: 'Doações linkadas com sucesso!', variant: 'default' });
          setShowEditGhostModal(false);
          setSelectedGhostPlayer("");
          fetchPlayerDonations(); // Recarregar dados
        }
      }
    } catch (err: any) {
      toast({ title: 'Erro ao editar', description: err.message || 'Erro desconhecido', variant: 'destructive' });
    }
    setEditingGhost(false);
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
                            <CardTitle className="truncate">{cleanPlayerName(player.player_name)} {(() => { const cargo = calcularCargo(player.total_amount); return cargo.emoji ? <span title={cargo.titulo} style={{marginLeft:4}}>{cargo.emoji}</span> : null; })()}</CardTitle>
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
                            <CardTitle className="truncate">{cleanPlayerName(player.player_name)}</CardTitle>
                            <CardDescription>Total doado</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-lg ${gp.color}`}>{gp.display} GP</span>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">Jogador não cadastrado no sistema</div>
                            {userRole === 'admin' && (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={async () => {
                                    await loadAvailablePlayers();
                                    setSelectedGhostPlayer(player.player_name || "");
                                    setShowEditGhostModal(true);
                                  }}
                                >
                                  Editar
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  className="flex-1"
                                  onClick={() => setDeleteGhost(player.player_name)} 
                                  disabled={deletingGhost}
                                >
                                  Remover
                                </Button>
                              </div>
                            )}
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
                  onChange={handleExcelFileSelect}
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
      <AlertDialog open={!!deleteGhost} onOpenChange={() => setDeleteGhost(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Doação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta doação? Esta ação não pode ser desfeita e pode alterar o cargo do Discord do jogador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingGhost}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingGhost}
              onClick={() => handleDeleteDonation(playerDonations.find(d => d.player_name === deleteGhost))}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Modal de seleção de abas para importação */}
      {showSheetModal && (
        <AlertDialog open={showSheetModal} onOpenChange={setShowSheetModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Selecionar abas para importar</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sheetNames.map((sheet) => (
                <label key={sheet} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedSheets.includes(sheet)}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedSheets(prev => [...prev, sheet]);
                      } else {
                        setSelectedSheets(prev => prev.filter(s => s !== sheet));
                      }
                    }}
                  />
                  {sheet}
                </label>
              ))}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowSheetModal(false)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleImportSelectedSheets} disabled={selectedSheets.length === 0}>Importar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {/* Modal de edição de jogador fantasma */}
      {showEditGhostModal && (
        <AlertDialog open={showEditGhostModal} onOpenChange={setShowEditGhostModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Linkar jogador fantasma</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-4">
              <p>Selecione o jogador correto para linkar as doações:</p>
              <select
                className="w-full bg-[#181c24] text-runescape-gold border-2 border-border focus:border-runescape-gold rounded-md px-3 py-2"
                value={selectedGhostPlayer}
                onChange={(e) => setSelectedGhostPlayer(e.target.value)}
              >
                <option value="">Selecione um jogador</option>
                {availablePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {cleanPlayerName(p.display_name || p.username)}
                  </option>
                ))}
              </select>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowEditGhostModal(false)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleEditGhostPlayer} disabled={!selectedGhostPlayer || editingGhost}>
                {editingGhost ? 'Editando...' : 'Linkar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Layout>
  );
};

export default Donations;
