import { Zap, Shield, Users, TrendingUp, Search, Target, Award, ChevronRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Landing = () => {
  const features = [
    {
      icon: Search,
      title: "Busca de Jogadores",
      description: "Consulte estatísticas em tempo real de qualquer jogador do RuneScape 3 via API oficial"
    },
    {
      icon: Users,
      title: "Gestão de Clãs",
      description: "Importe automaticamente membros dos clãs Atlantis e Atlantis Argus"
    },
    {
      icon: Shield,
      title: "Controle de Doações",
      description: "Registre e monitore doações dos membros com histórico detalhado"
    },
    {
      icon: Zap,
      title: "Hierarquia de Cargos",
      description: "Sistema de permissões baseado em cargos: Líder, Vice-líder, Coordenador, Organizador"
    },
    {
      icon: Target,
      title: "Boss Tracking",
      description: "Acompanhe kills de bosses e minigames de todos os membros"
    },
    {
      icon: Award,
      title: "Eventos e Raids",
      description: "Organize e coordene eventos do clã com sistema de participantes"
    }
  ];

  const [stats, setStats] = useState({ members: 0, donations: 0, bossKills: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      // Buscar total de membros ativos
      const { count: totalMembers } = await supabase
        .from('players')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      // Buscar total de doações
      const { data: donationsData, error: donationsError } = await supabase
        .from('donations')
        .select('amount');
      const totalDonations = donationsData ? donationsData.reduce((acc, d) => acc + (d.amount || 0), 0) : 0;
      setStats({
        members: totalMembers || 0,
        donations: totalDonations || 0,
        bossKills: 0 // Se houver campo de boss kills, ajustar aqui
      });
      setLoadingStats(false);
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Zap className="h-8 w-8 text-runescape-gold" />
              <div>
                <h1 className="text-2xl font-cinzel font-bold text-runescape-gold">
                  Atlantis Stats
                </h1>
                <p className="text-sm text-muted-foreground">
                  RuneScape 3 Dashboard
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button className="btn-ghost">
                  Entrar
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

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-cinzel font-bold text-runescape-gold animate-glow-pulse">
              Atlantis Stats Dashboard
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Sistema completo de gerenciamento para clãs do RuneScape 3. 
              Monitore estatísticas, doações e coordene eventos dos clãs Atlantis.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button className="btn-runescape w-full sm:w-auto text-xl py-4 px-8">
                <Zap className="h-5 w-5" />
                Começar Agora
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/ranking">
              <Button className="btn-medieval w-full sm:w-auto text-xl py-4 px-8">
                <Trophy className="h-5 w-5" />
                Ranking de Doações
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl font-cinzel font-bold text-runescape-gold">
              Recursos Completos
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para gerenciar seu clã do RuneScape 3 em um só lugar
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="clan-card hover:scale-105 transition-transform">
                <CardHeader className="text-center">
                  <feature.icon className="h-12 w-12 text-runescape-gold mx-auto mb-4" />
                  <CardTitle className="text-runescape-gold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center space-y-12">
          <h2 className="text-4xl font-cinzel font-bold text-runescape-gold">
            Estatísticas em Tempo Real
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="text-5xl font-bold text-runescape-gold">
                {loadingStats ? '...' : stats.members.toLocaleString('pt-BR')}
              </div>
              <div className="text-xl text-muted-foreground">Membros Ativos</div>
              <div className="text-sm text-muted-foreground">Atlantis + Atlantis Argus</div>
            </div>
            
            <div className="text-center space-y-4">
              <div className="text-5xl font-bold text-runescape-blue">
                {loadingStats ? '...' : stats.donations.toLocaleString('pt-BR')}
              </div>
              <div className="text-xl text-muted-foreground">Total Doações</div>
              <div className="text-sm text-muted-foreground">Valor acumulado</div>
            </div>
            
            <div className="text-center space-y-4">
              <div className="text-5xl font-bold text-runescape-gold">
                {loadingStats ? '...' : stats.bossKills.toLocaleString('pt-BR')}
              </div>
              <div className="text-xl text-muted-foreground">Boss Kills</div>
              <div className="text-sm text-muted-foreground">Esta semana</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="clan-card runescape-glow">
          <CardContent className="text-center py-16">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl font-cinzel font-bold text-runescape-gold">
                  Pronto para começar?
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Junte-se ao sistema de gerenciamento mais avançado para clãs do RuneScape 3.
                  Configure sua conta em minutos e comece a usar hoje mesmo.
                </p>
              </div>
              
              <Link to="/register">
                <Button className="btn-runescape text-xl py-4 px-8">
                  <Zap className="h-5 w-5" />
                  Criar Conta Gratuita
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <Zap className="h-6 w-6 text-runescape-gold" />
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

export default Landing;
