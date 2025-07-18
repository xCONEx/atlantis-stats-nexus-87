import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import FirstLoginModal from "@/components/FirstLoginModal";
import { runescapeApi } from '@/services/runescapeApi';
import LinkDiscordModal from '@/components/LinkDiscordModal';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any; user: User | null }>;
  signOut: () => Promise<void>;
  userRole: string | null;
  signInWithDiscord: () => Promise<void>;
  rsUsername?: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const cleanupAuthState = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [rsUsername, setRsUsername] = useState<string | null>(null);
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const { toast } = useToast();

  // Função para associar Discord ID ao nick do jogo
  const associateDiscordToPlayer = async (discordId: string) => {
    // Buscar membros dos clãs
    const [atlantis, argus] = await Promise.all([
      runescapeApi.getAtlantisClanMembers(),
      runescapeApi.getAtlantisArgusClanMembers(),
    ]);
    // Buscar nick do usuário pelo email/nome do Discord (ajustar se necessário)
    // Aqui, vamos assumir que o usuário já informou o nick em algum momento, ou que o email do Discord é igual ao username (ajustar conforme regra real)
    // Para este exemplo, vamos associar pelo display_name do Discord, se disponível
    const discordUser = user;
    if (!discordUser) return;
    const displayName = discordUser.user_metadata?.full_name || discordUser.user_metadata?.name || discordUser.email;
    if (!displayName) return;
    // Procurar nick nos clãs
    const matches = [...atlantis, ...argus].filter(m => m.name.toLowerCase() === displayName.toLowerCase());
    if (matches.length === 1) {
      // Salvar associação
      const player = matches[0];
      await supabase.from('discord_links').upsert({
        discord_id: discordUser.id,
        username: player.name,
        player_id: null // pode buscar o id real se necessário
      }, { onConflict: 'discord_id,username' });
    }
  };

  // Função para buscar o username do RuneScape
  const fetchRsUsername = async (discordId: string) => {
    const { data, error } = await supabase
      .from('discord_links')
      .select('username')
      .eq('discord_id', discordId)
      .single();
    if (data && data.username) {
      setRsUsername(data.username);
    } else {
      setRsUsername(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
            associateDiscordToPlayer(session.user.id);
            fetchRsUsername(session.user.id);
          }, 0);
          // Desativar temporariamente o modal de linkar conta para testes
          setShowLinkModal(false);
          // // Checar se já existe associação
          // const { data: link } = await supabase
          //   .from('discord_links')
          //   .select('username')
          //   .eq('discord_id', session.user.id)
          //   .single();
          // setShowLinkModal(!link);
        } else {
          setUserRole(null);
          setRsUsername(null);
          setShowLinkModal(false);
        }
        setLoading(false);
      }
    );
    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserRole(session.user.id);
        associateDiscordToPlayer(session.user.id);
        fetchRsUsername(session.user.id);
        // Desativar temporariamente o modal de linkar conta para testes
        setShowLinkModal(false);
        // // Checar se já existe associação
        // const { data: link } = await supabase
        //   .from('discord_links')
        //   .select('username')
        //   .eq('discord_id', session.user.id)
        //   .single();
        // // Só mostra o modal se não for admin
        // setShowLinkModal(!link && userRole !== 'admin');
      } else {
        setRsUsername(null);
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user role:', error);
        return;
      }
      // Se não existe role, insere 'member' na tabela
      if (!data || !data.role) {
        await supabase.from('user_roles').insert({
          user_id: userId,
          role: 'member',
        });
        setUserRole('member');
      } else {
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('member');
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      if (data.user) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo ao Atlantis Stats Dashboard",
        });
        // Após login, garantir que user_roles existe
        try {
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', data.user.id)
            .single();
          if (!roleData) {
            // Insere role 'member' automaticamente
            await supabase.from('user_roles').insert({
              user_id: data.user.id,
              role: 'member',
            });
            setUserRole('member');
          } else {
            setUserRole(roleData.role);
          }
        } catch (e) {
          // Apenas loga, não bloqueia o login
          console.error('Erro ao garantir user_roles:', e);
        }
        window.location.href = '/dashboard';
      }

      return { error: null };
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      cleanupAuthState();
      
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive",
        });
        return { error, user: null };
      }

      if (data.user) {
        toast({
          title: "Conta criada com sucesso!",
          description: "Verifique seu email para confirmar a conta.",
        });
      }

      return { error: null, user: data.user };
    } catch (error) {
      toast({
        title: "Erro no cadastro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      return { error, user: null };
    }
  };

  const signOut = async () => {
    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignore errors
      }
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/';
    }
  };

  const signInWithDiscord = async () => {
    try {
      cleanupAuthState();
      await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
    } catch (error) {
      toast({
        title: 'Erro no login Discord',
        description: 'Ocorreu um erro ao tentar autenticar com o Discord.',
        variant: 'destructive',
      });
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    userRole,
    signInWithDiscord,
    rsUsername,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showFirstLoginModal && (
        <FirstLoginModal
          userId={pendingUserId}
          onSave={async (role, clan, username) => {
            await supabase.from('user_roles').insert({
              user_id: pendingUserId,
              role: role || 'member',
              clan_name: clan
            });
            // Vincular Discord ao nick do RuneScape
            await supabase.from('discord_links').upsert({
              discord_id: pendingUserId,
              username: username.trim()
            }, { onConflict: 'discord_id,username' });
            setShowFirstLoginModal(false);
            setPendingUserId(null);
            window.location.href = '/dashboard';
          }}
        />
      )}
      {showLinkModal && user && (
        <LinkDiscordModal
          open={showLinkModal}
          onClose={async () => {
            setShowLinkModal(false);
            // Forçar reload para atualizar contexto
            window.location.reload();
          }}
          discordId={user.id}
        />
      )}
    </AuthContext.Provider>
  );
};
