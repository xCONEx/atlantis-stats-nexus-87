import { Zap, Shield, Users, TrendingUp, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { useState } from 'react';
import LinkDiscordModal from '@/components/LinkDiscordModal';
import { hasRolePermission } from "@/lib/utils";
import PlayerDetailsModal from './PlayerDetailsModal';
import { supabase } from '@/integrations/supabase/client';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, userRole, rsUsername, user } = useAuth();
  const location = useLocation();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [playerData, setPlayerData] = useState<any>(null);

  const handlePlayerNameClick = async () => {
    if (!rsUsername) return;
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('username', rsUsername)
      .single();
    if (!error && data) {
      setPlayerData({
        name: data.username,
        clan: data.clan_name || '',
        combat: data.combat_level || 0,
        totalLevel: data.total_level || 0,
        totalXp: data.total_experience || 0,
        lastSeen: data.updated_at ? new Date(data.updated_at).toLocaleString('pt-BR') : '',
        isOnline: !!data.is_active,
        rank: data.clan_rank || '',
        joined: data.created_at ? new Date(data.created_at).toLocaleDateString('pt-BR') : ''
      });
      setPlayerModalOpen(true);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-3 group">
                <img src="/2logo.png" alt="Logo Atlantis" className="h-8 w-8" />
                <div>
                  <h1 className="text-2xl font-cinzel font-bold text-runescape-gold group-hover:text-yellow-400 transition-colors">
                    Atlantis Stats
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    RuneScape 3 Dashboard
                  </p>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="medieval" size="sm">
                <Settings className="h-4 w-4" />
                Configurações
              </Button>
              <Button variant="outline" size="sm"
                onClick={rsUsername ? handlePlayerNameClick : () => setShowLinkModal(true)}>
                {rsUsername ? rsUsername : 'Vincular Perfil RuneScape'}
              </Button>
              <Button variant="runescape" size="sm">
                <Zap className="h-4 w-4" />
                {userRole || 'Membro'}
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>
      {showLinkModal && user && (
        <LinkDiscordModal
          open={showLinkModal}
          onClose={() => setShowLinkModal(false)}
          discordId={Array.isArray(user.identities) ? user.identities.find(i => i.provider === 'discord')?.id || '' : ''}
          onLinked={() => {
            // Atualiza o contexto rsUsername em tempo real
            if (user.id) {
              // Chama fetchRsUsername do AuthContext se disponível
              // Como não está exposto, pode forçar reload ou usar um método do contexto futuramente
              window.location.reload();
            }
          }}
        />
      )}
      {playerModalOpen && playerData && (
        <PlayerDetailsModal
          player={playerData}
          open={playerModalOpen}
          onClose={() => setPlayerModalOpen(false)}
        />
      )}

      {/* Navigation */}
      <nav className="border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <Link to="/dashboard">
              <Button 
                variant="ghost" 
                className={`rounded-none border-b-2 ${
                  location.pathname === '/dashboard' 
                    ? 'border-runescape-gold' 
                    : 'border-transparent hover:border-runescape-gold'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/players">
              <Button 
                variant="ghost" 
                className={`rounded-none border-b-2 ${
                  location.pathname === '/players' 
                    ? 'border-runescape-gold' 
                    : 'border-transparent hover:border-runescape-gold'
                }`}
              >
                <Users className="h-4 w-4" />
                Jogadores
              </Button>
            </Link>
            <Link to="/donations">
              <Button 
                variant="ghost" 
                className={`rounded-none border-b-2 ${
                  location.pathname === '/donations' 
                    ? 'border-runescape-gold' 
                    : 'border-transparent hover:border-runescape-gold'
                }`}
              >
                <Shield className="h-4 w-4" />
                Doações
              </Button>
            </Link>
            {hasRolePermission(userRole, [
              'admin', 'administrator', 'leader', 'vice-leader', 'coordinator'
            ]) && (
              <Link to="/clans">
                <Button 
                  variant="ghost" 
                  className={`rounded-none border-b-2 ${
                    location.pathname === '/clans' 
                      ? 'border-runescape-gold' 
                      : 'border-transparent hover:border-runescape-gold'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  Clãs
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
