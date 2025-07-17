import { Zap, Shield, Users, TrendingUp, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { useState } from 'react';
import LinkDiscordModal from '@/components/LinkDiscordModal';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, userRole, rsUsername, user } = useAuth();
  const location = useLocation();
  const [showLinkModal, setShowLinkModal] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Zap className="h-8 w-8 text-runescape-gold animate-glow-pulse" />
                <div>
                  <h1 className="text-2xl font-cinzel font-bold text-runescape-gold">
                    Atlantis Stats
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    RuneScape 3 Dashboard
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="medieval" size="sm">
                <Settings className="h-4 w-4" />
                Configurações
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowLinkModal(true)}>
                Vincular Perfil RuneScape
              </Button>
              {rsUsername && (
                <span className="text-runescape-gold font-semibold text-lg" title="Nick do RuneScape">
                  {rsUsername}
                </span>
              )}
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
          discordId={user.id}
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
