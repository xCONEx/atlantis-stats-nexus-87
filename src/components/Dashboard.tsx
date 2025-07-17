import { Users, TrendingUp, Crown, Shield, Target, Award, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PlayerSearch from "./PlayerSearch";
import RecentPlayers from "./RecentPlayers";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [clanEvents, setClanEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      const { data, error } = await supabase
        .from('clan_statistics')
        .select('clan_name, total_members, total_donations, total_events')
        .order('created_at', { ascending: false })
        .limit(2);
      if (!error && data) {
        setStats([
          {
            title: "Membros Ativos",
            value: data.reduce((acc, c) => acc + (c.total_members || 0), 0),
            change: "",
            changeType: "positive",
            icon: Users,
            description: data.map(c => c.clan_name).join(' + ')
          },
          {
            title: "Total Doações",
            value: data.reduce((acc, c) => acc + (c.total_donations || 0), 0),
            change: "",
            changeType: "positive",
            icon: Shield,
            description: "Este mês"
          },
          {
            title: "Eventos Concluídos",
            value: data.reduce((acc, c) => acc + (c.total_events || 0), 0),
            change: "",
            changeType: "positive",
            icon: Award,
            description: "Este mês"
          }
        ]);
      }
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
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-cinzel font-bold text-runescape-gold animate-glow-pulse">
          Bem-vindo ao Dashboard Atlantis
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Central de comando para gerenciamento dos clãs Atlantis e Atlantis Argus.
          Acompanhe estatísticas, doações e coordene eventos.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loadingStats ? (
          <div className="col-span-4 text-center text-muted-foreground">Carregando estatísticas...</div>
        ) : stats.length === 0 ? (
          <div className="col-span-4 text-center text-muted-foreground">Nenhuma estatística encontrada.</div>
        ) : stats.map((stat) => (
          <Card key={stat.title} className="clan-card hover:scale-105 transition-transform">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-runescape-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-runescape-gold mb-2">
                {stat.value}
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-muted-foreground">
                  {stat.description}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Player Search - Takes 2 columns */}
        <div className="lg:col-span-2">
          <PlayerSearch />
        </div>

        {/* Sidebar Content */}
        <div className="space-y-6">
          {/* Recent Players */}
          <RecentPlayers />

          {/* Upcoming Events */}
          <Card className="clan-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-runescape-gold">
                <Calendar className="h-5 w-5" />
                <span>Próximos Eventos</span>
              </CardTitle>
              <CardDescription>
                Atividades programadas para os clãs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loadingEvents ? (
                  <div className="text-center text-muted-foreground">Carregando eventos...</div>
                ) : clanEvents.length === 0 ? (
                  <div className="text-center text-muted-foreground">Nenhum evento encontrado.</div>
                ) : clanEvents.map((event, index) => (
                  <div
                    key={index}
                    className="border border-border rounded-lg p-4 hover:border-runescape-gold/50 transition-colors"
                  >
                    <div className="font-medium text-foreground mb-2">
                      {event.title}
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {event.date}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
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
                <Button variant="clan" className="w-full">
                  <Crown className="h-4 w-4" />
                  Gerenciar Eventos
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="clan-card">
            <CardHeader>
              <CardTitle className="text-runescape-gold">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="runescape" className="w-full">
                <Users className="h-4 w-4" />
                Importar Membros do Clã
              </Button>
              <Button variant="medieval" className="w-full">
                <Shield className="h-4 w-4" />
                Registrar Doação
              </Button>
              <Button variant="outline" className="w-full">
                <TrendingUp className="h-4 w-4" />
                Relatórios
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;