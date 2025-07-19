import { Zap, Shield, Users, TrendingUp, Settings, LogOut, Calendar, Menu } from "lucide-react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const navigationItems = [
    { to: "/dashboard", icon: TrendingUp, label: "Dashboard" },
    { to: "/players", icon: Users, label: "Jogadores" },
    { to: "/donations", icon: Shield, label: "Doações" },
    { to: "/events", icon: Calendar, label: "Eventos" },
    ...(hasRolePermission(userRole, [
      'leader', 'vice-leader', 'coordinator', 'fiscal', 'organizer', 'administrator', 'admin'
    ]) ? [{ to: "/clans", icon: Zap, label: "Clãs" }] : []),
    ...(hasRolePermission(userRole, ['leader', 'vice-leader', 'administrator', 'admin']) ? [
      { to: "/admin", icon: Shield, label: "Painel Admin" }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="header-responsive">
            <div className="flex items-center space-x-3">
              <Link to="/" className="flex items-center space-x-3 group">
                <img src="/2logo.png" alt="Logo Atlantis" className="h-6 w-6 sm:h-8 sm:w-8" />
                <div>
                  <h1 className="text-lg sm:text-2xl font-cinzel font-bold text-runescape-gold group-hover:text-yellow-400 transition-colors">
                    Atlantis Stats
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    RuneScape 3 Dashboard
                  </p>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button variant="medieval" size="sm" className="btn-responsive hidden sm:flex">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Configurações</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="btn-responsive"
                onClick={rsUsername ? handlePlayerNameClick : () => setShowLinkModal(true)}
              >
                {rsUsername ? (
                  <span className="truncate max-w-[100px] sm:max-w-none">
                    {rsUsername}
                  </span>
                ) : (
                  <span className="hidden sm:inline">Vincular Perfil RuneScape</span>
                )}
              </Button>
              <Button variant="runescape" size="sm" className="btn-responsive">
                <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{userRole || 'Membro'}</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut} className="btn-responsive">
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Sair</span>
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
            if (user.id) {
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
          <div className="flex items-center justify-between">
            {/* Desktop Navigation */}
            <div className="hidden sm:flex space-x-8">
              {navigationItems.map((item) => (
                <Link key={item.to} to={item.to}>
                  <Button 
                    variant="ghost" 
                    className={`rounded-none border-b-2 btn-responsive ${
                      location.pathname === item.to 
                        ? 'border-runescape-gold' 
                        : 'border-transparent hover:border-runescape-gold'
                    }`}
                  >
                    <item.icon className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="ml-1">{item.label}</span>
                  </Button>
                </Link>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="sm:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="sm:hidden py-4 space-y-2 border-t border-border mt-4">
              {navigationItems.map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)}>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start rounded-lg ${
                      location.pathname === item.to 
                        ? 'bg-runescape-gold/20 text-runescape-gold' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          )}
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
