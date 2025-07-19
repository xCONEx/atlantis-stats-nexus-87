import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import FirstLoginModal from "@/components/FirstLoginModal";
import { runescapeApi } from '@/services/runescapeApi';
import LinkDiscordModal from '@/components/LinkDiscordModal';
import axios from 'axios';

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
  const associateDiscordToPlayer = async () => {
    // Buscar membros dos clãs
    const [atlantis, argus] = await Promise.all([
      runescapeApi.getAtlantisClanMembers(),
      runescapeApi.getAtlantisArgusClanMembers(),
    ]);
    const discordUser = user;
    if (!discordUser) return;
    const displayName = discordUser.user_metadata?.full_name || discordUser.user_metadata?.name || discordUser.email;
    if (!displayName) return;
    // Procurar nick nos clãs
    const matches = [...atlantis, ...argus].filter(m => m.name.toLowerCase() === displayName.toLowerCase());
    if (matches.length === 1) {
      // Buscar id real do Discord
      const realDiscordId = Array.isArray(discordUser.identities)
        ? discordUser.identities.find(i => i.provider === 'discord')?.id
        : null;
      if (!realDiscordId) {
        console.error('ID real do Discord não encontrado no objeto de autenticação!');
        return;
      }
      // Garantir que o ID é numérico
      if (!/^[0-9]{15,20}$/.test(realDiscordId)) {
        console.error('ID do Discord não é numérico! Valor:', realDiscordId);
        toast({ title: 'Erro', description: 'ID do Discord inválido. Faça login novamente com Discord.', variant: 'destructive' });
        return;
      }
      const player = matches[0];
      await supabase.from('discord_links').upsert({
        discord_id: realDiscordId,
        username: player.name,
        player_id: null // pode buscar o id real se necessário
      }, { onConflict: 'discord_id,username' });
      // Buscar player_id pelo username e atualizar o registro
      const { data: playerRow } = await supabase
        .from('players')
        .select('id')
        .eq('username', player.name)
        .single();
      if (playerRow && playerRow.id) {
        await supabase.from('discord_links')
          .update({ player_id: playerRow.id })
          .eq('discord_id', realDiscordId)
          .eq('username', player.name);
      }
      // Chamar endpoint para atualizar cargo no Discord
      try {
        await axios.post('https://atlantisstatus.vercel.app/api/discord-roles', {
          discord_id: realDiscordId,
          action: 'update_role'
        });
      } catch (err) {
        console.error('Erro ao atualizar cargo no Discord após login:', err.response?.data || err.message);
      }
    }
  };

  // Função para garantir que o vínculo inicial Discord -> Supabase existe
  const ensureDiscordLink = async () => {
    const discordUser = user;
    if (!discordUser) return;
    // Buscar id real do Discord
    const realDiscordId = Array.isArray(discordUser.identities)
      ? discordUser.identities.find(i => i.provider === 'discord')?.id
      : null;
    if (!realDiscordId) {
      console.error('ID real do Discord não encontrado no objeto de autenticação!');
      return;
    }
    // Garantir que o ID é numérico
    if (!/^[0-9]{15,20}$/.test(realDiscordId)) {
      console.error('ID do Discord não é numérico! Valor:', realDiscordId);
      toast({ title: 'Erro', description: 'ID do Discord inválido. Faça login novamente com Discord.', variant: 'destructive' });
      return;
    }
    // Upsert apenas se usuário autenticado (auth.uid())
    const { data: sessionData } = await supabase.auth.getSession();
    const authUid = sessionData?.session?.user?.id;
    if (!authUid) {
      console.error('Usuário não autenticado no Supabase!');
      toast({ title: 'Erro', description: 'Usuário não autenticado.', variant: 'destructive' });
      return;
    }
    // Upsert usando auth.uid() como id
    const { error } = await supabase.from('discord_links').upsert({
      id: authUid,
      discord_id: realDiscordId
    }, { onConflict: 'id' });
    if (error) {
      console.error('Erro ao fazer upsert em discord_links:', error);
      toast({ title: 'Erro', description: 'Falha ao vincular Discord.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Conta do Discord vinculada com sucesso!', description: 'Sua conta do Discord foi vinculada ao sistema.', variant: 'default' });
  };

  // Função para criar/atualizar user_profile
  const ensureUserProfile = async () => {
    const currentUser = user;
    if (!currentUser) return;
    
    const displayName = currentUser.user_metadata?.full_name || 
                       currentUser.user_metadata?.name || 
                       currentUser.email || 
                       'Usuário';
    
    const { error } = await supabase.from('user_profiles').upsert({
      user_id: currentUser.id,
      email: currentUser.email || '',
      display_name: displayName
    }, { onConflict: 'user_id' });
    
    if (error) {
      console.error('Erro ao criar/atualizar user_profile:', error);
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

  // Função para atualizar dados em user_roles após login/autenticação
  const upsertUserRolesInfo = async (userObj: User) => {
    if (!userObj) return;
    const displayName = userObj.user_metadata?.full_name || userObj.user_metadata?.name || userObj.email || '';
    const email = userObj.email || '';
    const discordIdentity = Array.isArray(userObj.identities)
      ? userObj.identities.find(i => i.provider === 'discord')
      : null;
    const discordId = discordIdentity?.id || null;
    // Atualiza todos os registros do usuário em user_roles (pode ser mais de um clã)
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, clan_name, role')
      .eq('user_id', userObj.id);
    if (roles && roles.length > 0) {
      for (const roleRow of roles) {
        const roleToSend = roleRow.role || 'member';
        const payload = {
          user_id: userObj.id,
          clan_name: roleRow.clan_name,
          display_name: displayName,
          email,
          discord_id: discordId,
          role: roleToSend
        };
        console.log('[user_roles upsert] payload:', payload);
        await supabase.from('user_roles').upsert(payload, { onConflict: ['user_id', 'clan_name'] });
      }
    } else {
      // Se não existir, cria pelo menos um registro com clan_name null e role 'member'
      const payload = {
        user_id: userObj.id,
        clan_name: null,
        display_name: displayName,
        email,
        discord_id: discordId,
        role: 'member'
      };
      console.log('[user_roles upsert] payload (novo):', payload);
      await supabase.from('user_roles').upsert(payload, { onConflict: ['user_id', 'clan_name'] });
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
            ensureDiscordLink(); // Garante o vínculo inicial
            ensureUserProfile(); // Garante o perfil do usuário
            const realDiscordId = Array.isArray(session.user.identities)
              ? session.user.identities.find(i => i.provider === 'discord')?.id
              : null;
            if (realDiscordId) {
              fetchRsUsername(realDiscordId);
            }
          }, 0);
          // Atualiza dados em user_roles
          upsertUserRolesInfo(session.user);
          setShowLinkModal(false);
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
        ensureDiscordLink(); // Garante o vínculo inicial
        ensureUserProfile(); // Garante o perfil do usuário
        const realDiscordId = Array.isArray(session.user.identities)
          ? session.user.identities.find(i => i.provider === 'discord')?.id
          : null;
        if (realDiscordId) {
          fetchRsUsername(realDiscordId);
        }
        // Atualiza dados em user_roles
        upsertUserRolesInfo(session.user);
        setShowLinkModal(false);
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
        // Atualiza dados em user_roles
        await upsertUserRolesInfo(data.user);
        // Remover redirecionamento automático - cada página gerencia seu próprio redirecionamento
        // window.location.href = '/dashboard';
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
