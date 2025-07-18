import { useState, useEffect } from "react";
import { Trophy, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface DonationRanking {
  player_id?: string | null;
  player_name: string;
  total_amount: number;
}

const RankingDonation = () => {
  const [donations, setDonations] = useState<DonationRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonationRanking();
  }, []);

  const fetchDonationRanking = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('player_id, player_name, amount');

      if (error) throw error;

      // Agrupar por player_id (quando existir), senão por player_name
      const groupedDonations: Record<string, { player_id: string | null, player_name: string, total_amount: number }> = {};
      data?.forEach((donation: any) => {
        const key = donation.player_id || donation.player_name;
        if (!groupedDonations[key]) {
          groupedDonations[key] = {
            player_id: donation.player_id,
            player_name: donation.player_name || 'Jogador',
            total_amount: 0,
          };
        }
        groupedDonations[key].total_amount += donation.amount || 0;
      });

      // Converter para array e ordenar por total
      const ranking = Object.values(groupedDonations)
        .sort((a, b) => b.total_amount - a.total_amount);

      setDonations(ranking);
    } catch (error) {
      console.error('Erro ao buscar ranking de doações:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1_000_000_000_000_000) {
      return `${(amount / 1_000_000_000_000_000).toFixed(1)}Q`;
    } else if (amount >= 1_000_000_000_000) {
      return `${(amount / 1_000_000_000_000).toFixed(1)}T`;
    } else if (amount >= 1_000_000_000) {
      return `${(amount / 1_000_000_000).toFixed(1)}B`;
    } else if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1)}M`;
    } else if (amount >= 1_000) {
      return `${(amount / 1_000).toFixed(1)}K`;
    }
    return amount.toLocaleString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Trophy className="h-8 w-8 text-runescape-gold" />
              <div>
                <h1 className="text-2xl font-cinzel font-bold text-runescape-gold">
                  Ranking de Doações
                </h1>
                <p className="text-sm text-muted-foreground">
                  Top doadores dos clãs Atlantis
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button className="btn-ghost">
                  ← Voltar
                </Button>
              </Link>
              <Link to="/register">
                <Button className="btn-runescape">
                  Criar Conta
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card className="clan-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-runescape-gold">
              <Trophy className="h-6 w-6" />
              <span>Top Doadores</span>
            </CardTitle>
            <CardDescription>
              Ranking dos jogadores com maior contribuição para os clãs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-runescape-gold mx-auto"></div>
                  <p className="text-muted-foreground">Carregando ranking...</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#23283a] text-runescape-gold">
                      <th className="px-4 py-3 text-left font-bold">Posição</th>
                      <th className="px-4 py-3 text-left font-bold">Nome</th>
                      <th className="px-4 py-3 text-right font-bold">Total Doado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center py-8 text-muted-foreground">
                          Nenhuma doação registrada ainda
                        </td>
                      </tr>
                    ) : (
                      donations.map((donation, index) => (
                        <tr
                          key={donation.player_id || donation.player_name}
                          className={index % 2 === 0 ? "bg-[#23283a] text-runescape-gold" : "bg-[#181c24] text-white"}
                        >
                          <td className="px-4 py-3 font-bold">
                            #{index + 1}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {donation.player_name}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-runescape-blue">
                            {formatAmount(donation.total_amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <Trophy className="h-6 w-6 text-runescape-gold" />
              <span className="text-xl font-cinzel font-bold text-runescape-gold">
                Atlantis Stats
              </span>
            </div>
            <p className="text-muted-foreground">
              Dashboard profissional para clãs do RuneScape 3
            </p>
            <div className="text-sm text-muted-foreground">
              © 2024 Atlantis Stats. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RankingDonation; 
