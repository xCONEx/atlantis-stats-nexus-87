import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Zap, Shield, User, Crown, Users, Settings, UserCheck, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const ADMIN_ROLES = ['admin', 'leader'];

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  leader: 'Líder',
  'vice-leader': 'Vice-líder',
  coordinator: 'Coordenador',
  fiscal: 'Fiscal',
  organizer: 'Organizador',
  administrator: 'Administrador',
  'admin-legado': 'Admin-legado',
  member: 'Member',
};

const roleIcons: Record<string, React.ComponentType<any>> = {
  admin: Crown,
  leader: Zap,
  'vice-leader': Shield,
  coordinator: Users,
  fiscal: UserCheck,
  organizer: User,
  administrator: Settings,
  'admin-legado': Crown,
  member: User,
};

const AdminPage = () => {
  const { user, userRole, signIn, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<string>('');
  const [fetching, setFetching] = useState(false);
  const [updatingDiscordRoles, setUpdatingDiscordRoles] = useState(false);

  // Login por e-mail restrito
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    console.log('Tentando login com:', { email, password: '***' });
    
    try {
      const { error } = await signIn(email, password);
      console.log('Resultado do login:', { error });
      
      if (error) {
        console.error('Erro no login:', error);
        setLoginError(error.message || 'Erro ao fazer login');
      } else {
        console.log('Login bem-sucedido, redirecionando...');
        // Login bem-sucedido - redirecionar para /admin
        window.location.href = '/admin';
      }
    } catch (err: any) {
      console.error('Erro inesperado no login:', err);
      setLoginError('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  // Buscar usuários autenticados e seus cargos
  const fetchUsers = async () => {
    setFetching(true);
    try {
      // Buscar user_roles com todos os campos relevantes
      let { data: userRoles, error: userRolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, clan_name, display_name, email, discord_id')
        .order('role', { ascending: false });
      if (userRolesError) {
        console.error('Erro ao buscar user_roles:', userRolesError);
        setUsers([]);
        setFetching(false);
        return;
      }
      // Não precisa mais buscar user_profiles
      setUsers(userRoles);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setUsers([]);
    }
    setFetching(false);
  };

  useEffect(() => {
    if (user && ADMIN_ROLES.includes(userRole || '')) {
      console.log('Iniciando fetchUsers...', new Date().toISOString());
      fetchUsers();
    }
  }, [user, userRole]);

  // Filtro de busca
  const filteredUsers = users.filter(u => {
    const searchTerm = search.toLowerCase();
    return (
      (u.display_name?.toLowerCase().includes(searchTerm) || '') ||
      (u.email?.toLowerCase().includes(searchTerm) || '') ||
      (u.role?.toLowerCase().includes(searchTerm) || '') ||
      (u.clan_name?.toLowerCase().includes(searchTerm) || '') ||
      (u.discord_id?.toLowerCase().includes(searchTerm) || '')
    );
  });

  // Edição de cargo
  const handleEditRole = (userId: string, currentRole: string) => {
    setEditingRole(userId);
    setRoleDraft(currentRole);
  };

  const handleSaveRole = async (userId: string, oldRole: string, newRole: string) => {
    setLoading(true);
    console.log('Tentando atualizar cargo:', { userId, oldRole, newRole });
    
    // Atualiza role
    const { data, error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId)
      .select();
    
    console.log('Resultado da atualização:', { data, error });
    
    if (!error) {
      // Log de auditoria
      const { error: logError } = await supabase.from('activity_logs').insert({
        activity_type: 'admin_role_change',
        description: `Cargo alterado de ${oldRole} para ${newRole}`,
        player_id: null,
        metadata: {
          changed_by: user?.id,
          changed_user: userId,
          from: oldRole,
          to: newRole,
        },
      });
      
      if (logError) {
        console.error('Erro ao criar log de auditoria:', logError);
      }
      
      toast({ title: 'Cargo atualizado', description: `Novo cargo: ${roleLabels[newRole] || newRole}` });
      fetchUsers();
    } else {
      console.error('Erro ao atualizar cargo:', error);
      toast({ title: 'Erro', description: 'Falha ao atualizar cargo', variant: 'destructive' });
    }
    setEditingRole(null);
    setLoading(false);
  };

  // Função para atualizar todos os cargos do Discord
  const handleUpdateAllDiscordRoles = async () => {
    setUpdatingDiscordRoles(true);
    try {
      const response = await fetch('/api/update-all-discord-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({ 
          title: 'Cargos atualizados!', 
          description: `${result.success_count} jogadores atualizados com sucesso. ${result.error_count} erros.`, 
          variant: 'default' 
        });
      } else {
        toast({ 
          title: 'Erro ao atualizar cargos', 
          description: result.error || 'Erro desconhecido', 
          variant: 'destructive' 
        });
      }
    } catch (err: any) {
      toast({ 
        title: 'Erro ao atualizar cargos', 
        description: err.message || 'Erro de conexão', 
        variant: 'destructive' 
      });
    } finally {
      setUpdatingDiscordRoles(false);
    }
  };

  // Proteção de rota - se não está logado, mostrar formulário de login
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#181c24] to-[#23283a] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-xl shadow-2xl border border-runescape-gold/30 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-runescape-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-runescape-gold" />
            </div>
            <h1 className="text-3xl font-bold text-runescape-gold mb-2">Painel Administrativo</h1>
            <p className="text-muted-foreground">Acesso restrito para administradores e líderes</p>
          </div>
          
          <Card className="clan-card">
            <CardHeader className="text-center">
              <CardTitle className="text-runescape-gold">Login Administrativo</CardTitle>
              <CardDescription>
                Faça login com suas credenciais de administrador
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-runescape-gold">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-runescape-gold">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {loginError && (
                  <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-md">
                    {loginError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Entrando...' : 'Entrar como Administrador'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-8 pt-6 border-t border-runescape-gold/10">
            <p className="text-xs text-muted-foreground text-center">
              Este painel é exclusivo para administração do clã Atlantis.<br/>
              Todas as ações são registradas em log de auditoria.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Se está logado mas não tem permissão de admin
  if (!ADMIN_ROLES.includes(userRole || '')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#181c24] to-[#23283a] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-xl shadow-2xl border border-runescape-gold/30 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold text-red-500 mb-2">Acesso Negado</h1>
            <p className="text-muted-foreground">Você não tem permissão para acessar este painel</p>
          </div>
          
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Seu cargo atual: <span className="font-semibold text-runescape-gold">{roleLabels[userRole || ''] || userRole || 'N/A'}</span>
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => window.location.href = '/dashboard'}
              >
                Voltar ao Dashboard
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={signOut}
              >
                Sair
              </Button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-runescape-gold/10">
            <p className="text-xs text-muted-foreground text-center">
              Este painel é exclusivo para administração do clã Atlantis.<br/>
              Entre em contato com um administrador se precisar de acesso.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6 bg-gradient-to-br from-[#181c24] to-[#23283a] rounded-xl shadow-lg border border-runescape-gold/30">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-runescape-gold">Painel de Administração do Sistema</h1>
        <div className="flex gap-3">
          <Button 
            variant="runescape" 
            onClick={handleUpdateAllDiscordRoles} 
            disabled={updatingDiscordRoles}
          >
            {updatingDiscordRoles ? 'Atualizando...' : '🔄 Atualizar Cargos Discord'}
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
            Dashboard
          </Button>
          <Button variant="outline" onClick={signOut}>Sair</Button>
        </div>
      </div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <Input
          placeholder="Buscar por nome, email, cargo ou clã..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full md:w-80"
        />
        <span className="text-muted-foreground text-sm">Total: {filteredUsers.length} usuários</span>
      </div>
      <div className="overflow-x-auto rounded-lg shadow border border-runescape-gold/10 bg-card">
        {fetching ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-runescape-gold mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando usuários...</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-runescape-gold/10">
            <thead className="bg-runescape-gold/10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-runescape-gold">Nome de Exibição</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-runescape-gold">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-runescape-gold">Discord ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-runescape-gold">Cargo no Sistema</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-runescape-gold">Clã</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-runescape-gold">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-runescape-gold/10">
              {filteredUsers.map((u) => (
                <tr key={u.user_id + (u.clan_name || '')} className="hover:bg-runescape-gold/5 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-runescape-gold">{u.display_name || `Usuário ${u.user_id.slice(0, 8)}...`}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email || '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.discord_id || '-'}</td>
                  <td className="px-4 py-3">
                    {editingRole === u.user_id ? (
                      <Select value={roleDraft} onValueChange={setRoleDraft}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(roleLabels).map(role => {
                            const IconComponent = roleIcons[role];
                            return (
                              <SelectItem key={role} value={role}>
                                <div className="flex items-center gap-2">
                                  {IconComponent && <IconComponent className="h-4 w-4" />}
                                  {roleLabels[role]}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const IconComponent = roleIcons[u.role];
                          return IconComponent ? <IconComponent className="h-4 w-4 text-runescape-gold" /> : null;
                        })()}
                        <span className="capitalize font-semibold text-runescape-gold">{roleLabels[u.role] || u.role}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.clan_name || '-'}</td>
                  <td className="px-4 py-3">
                    {editingRole === u.user_id ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="runescape" onClick={() => handleSaveRole(u.user_id, u.role, roleDraft)} disabled={loading || u.role === roleDraft}>Salvar</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingRole(null)} disabled={loading}>Cancelar</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleEditRole(u.user_id, u.role)}>Editar</Button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && !fetching && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <div className="mt-8 text-xs text-muted-foreground text-center">
        Todas as alterações de cargo são registradas em log de auditoria.<br/>
        O botão "Atualizar Cargos Discord" sincroniza todos os cargos baseados em doações.<br/>
        Painel exclusivo para administração de usuários do sistema Atlantis.
      </div>
    </div>
  );
};

export default AdminPage; 
