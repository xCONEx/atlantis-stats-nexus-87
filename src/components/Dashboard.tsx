import { Users, TrendingUp, Crown, Shield, Target, Award, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PlayerSearch from "./PlayerSearch";
import RecentPlayers from "./RecentPlayers";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import he from "he";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [clanEvents, setClanEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      // Total de membros ativos
      const { count: totalMembers } = await supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      // Total de doações
      const { data: donationsData, error: donationsError } = await supabase
        .from("donations")
        .select("amount");
      const totalDonations = donationsData ? donationsData.reduce((acc, d) => acc + (d.amount || 0), 0) : 0;
      // Total de eventos
      const { count: totalEvents } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true });
      // Média de XP dos jogadores
      const { data: xpData } = await supabase
        .from("players")
        .select("total_experience")
        .eq("is_active", true);
      const avgXp = xpData && xpData.length > 0 ? Math.round(xpData.reduce((acc, p) => acc + (p.total_experience || 0), 0) / xpData.length) : 0;
      setStats([
        {
          title: "Membros Ativos",
          value: totalMembers || 0,
          icon: Users,
          description: "Jogadores cadastrados ativos"
        },
        {
          title: "Total Doações",
          value: totalDonations.toLocaleString("pt-BR"),
          icon: Shield,
          description: "Doações registradas"
        },
        {
          title: "Eventos Concluídos",
          value: totalEvents || 0,
          icon: Award,
          description: "Eventos cadastrados"
        },
        {
          title: "Média de XP",
          value: avgXp.toLocaleString("pt-BR"),
          icon: TrendingUp,
          description: "XP médio dos membros"
        }
      ]);
      setLoadingStats(false);
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoadingEvents(true);
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_time, current_participants, status')
        .order('start_time', { ascending: true })
        .limit(5);
      if (!error && data) {
        setClanEvents(
          data.map((e: any) => ({
            title: e.title,
            date: e.start_time ? new Date(e.start_time).toLocaleString('pt-BR') : '',
            participants: e.current_participants || 0,
            status: e.status || 'planejamento'
          }))
        );
      }
      setLoadingEvents(false);
    };
    fetchEvents();
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-cinzel font-bold text-runescape-gold animate-glow-pulse">
          Bem-vindo ao Dashboard Atlantis
        </h1>
        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
          Central de comando para gerenciamento dos clãs Atlantis e Atlantis Argus.
          Acompanhe estatísticas, doações e coordene eventos.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {loadingStats ? (
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 text-center text-muted-foreground">Carregando estatísticas...</div>
        ) : stats.length === 0 ? (
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 text-center text-muted-foreground">Nenhuma estatística encontrada.</div>
        ) : stats.map((stat) => (
          <Card key={stat.title} className="clan-card hover:scale-105 transition-transform">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-3 w-3 sm:h-4 sm:w-4 text-runescape-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-runescape-gold mb-2">
                {stat.value}
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs sm:text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stat.change}
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {stat.description}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Player Search - Takes 2 columns */}
        <div className="lg:col-span-2">
          <PlayerSearch />
        </div>

        {/* Sidebar Content */}
        <div className="space-y-4 sm:space-y-6">
          {/* Recent Players */}
          <RecentPlayers />

          {/* Upcoming Events */}
          <Card className="clan-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-runescape-gold">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-sm sm:text-base">Próximos Eventos</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Atividades programadas para os clãs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {loadingEvents ? (
                  <div className="text-center text-muted-foreground text-sm">Carregando eventos...</div>
                ) : clanEvents.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm">Nenhum evento encontrado.</div>
                ) : clanEvents.map((event, index) => (
                  <div
                    key={index}
                    className="border border-border rounded-lg p-3 sm:p-4 hover:border-runescape-gold/50 transition-colors"
                  >
                    <div className="font-medium text-foreground mb-2 text-sm sm:text-base">
                      {event.title}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                      {event.date}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm">
                        {event.participants} participantes
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        event.status === 'confirmado' 
                          ? 'bg-green-500/20 text-green-400' 
                          : event.status === 'aberto'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <Link to="/events">
                  <Button variant="clan" className="w-full btn-responsive">
                    <Crown className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">Gerenciar Eventos</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="clan-card">
            <CardHeader>
              <CardTitle className="text-runescape-gold text-sm sm:text-base">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="btn-runescape w-full btn-responsive">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Importar Membros do Clã</span>
              </Button>
              <Button className="btn-medieval w-full btn-responsive">
                <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Registrar Doação</span>
              </Button>
              <Button className="btn-outline w-full btn-responsive">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Relatórios</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
