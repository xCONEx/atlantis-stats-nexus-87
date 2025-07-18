import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Zap, Shield, User, Crown, Users, Settings, UserCheck } from 'lucide-react';

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
  const [loginError, setLoginError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<string>('');
  const [fetching, setFetching] = useState(false);
  const [migrating, setMigrating] = useState(false);

  // Login por e-mail restrito
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        setLoginError(error.message || 'Erro ao fazer login');
      } else {
        // Login bem-sucedido - redirecionar para /admin
        window.location.href = '/admin';
      }
    } catch (err: any) {
      setLoginError('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  // Buscar usuários autenticados e seus cargos
  const fetchUsers = async () => {
    setFetching(true);
    try {
      // Buscar apenas user_roles
      let { data: userRoles, error: userRolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, clan_name')
        .order('role', { ascending: false });
      
      if (userRolesError) {
        console.error('Erro ao buscar user_roles:', userRolesError);
        setUsers([]);
        setFetching(false);
        return;
      }

      // Processar dados dos usuários
      const usersWithDetails = userRoles.map((userRole) => {
        // Se for o usuário atual, usar dados do contexto
        const isCurrentUser = user && user.id === userRole.user_id;
        
        if (isCurrentUser) {
          const displayName = user.user_metadata?.full_name || 
                             user.user_metadata?.name || 
                             user.email || 
                             'Usuário Atual';
          return {
            ...userRole,
            displayName,
            email: user.email
          };
        }
        
        // Para outros usuários, usar ID truncado
        const displayName = `Usuário ${userRole.user_id.slice(0, 8)}...`;
        
        return {
          ...userRole,
          displayName,
          email: null
        };
      });

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setUsers([]);
    }
    setFetching(false);
  };

  useEffect(() => {
    if (user && ADMIN_ROLES.includes(userRole || '')) {
      fetchUsers();
    }
  }, [user, userRole]);

  // Filtro de busca
  const filteredUsers = users.filter(u => {
    const searchTerm = search.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(searchTerm) ||
      (u.email && u.email.toLowerCase().includes(searchTerm)) ||
      u.role.toLowerCase().includes(searchTerm) ||
      (u.clan_name && u.clan_name.toLowerCase().includes(searchTerm))
    );
  });

  // Edição de cargo
  const handleEditRole = (userId: string, currentRole: string) => {
    setEditingRole(userId);
    setRoleDraft(currentRole);
  };

  const handleSaveRole = async (userId: string, oldRole: string, newRole: string) => {
    setLoading(true);
    // Atualiza role
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);
    if (!error) {
      // Log de auditoria
      await supabase.from('activity_logs').insert({
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
      toast({ title: 'Cargo atualizado', description: `Novo cargo: ${roleLabels[newRole] || newRole}` });
      fetchUsers();
    } else {
      toast({ title: 'Erro', description: 'Falha ao atualizar cargo', variant: 'destructive' });
    }
    setEditingRole(null);
    setLoading(false);
  };

  // Função para popular user_profiles
  const handlePopulateUserProfiles = async () => {
    setMigrating(true);
    try {
      const response = await fetch('/api/populate-user-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        toast({ 
          title: 'Migração concluída!', 
          description: `${result.count} perfis de usuário foram criados.` 
        });
        // Recarregar dados
        fetchUsers();
      } else {
        toast({ 
          title: 'Erro na migração', 
          description: result.error || 'Erro desconhecido', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Erro ao executar migração:', error);
      toast({ 
        title: 'Erro na migração', 
        description: 'Falha ao conectar com o servidor', 
        variant: 'destructive' 
      });
    } finally {
      setMigrating(false);
    }
  };

  // Proteção de rota
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#181c24] to-[#23283a] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-xl shadow-2xl border border-runescape-gold/30 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-runescape-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-runescape-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-runescape-gold mb-2">Painel Administrativo</h1>
            <p className="text-muted-foreground">Acesso restrito para administradores e líderes</p>
          </div>
          
          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-runescape-gold">E-mail</label>
              <Input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="seu@email.com"
                className="bg-background border-runescape-gold/20 focus:border-runescape-gold"
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-runescape-gold">Senha</label>
              <Input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
                className="bg-background border-runescape-gold/20 focus:border-runescape-gold"
                required 
              />
            </div>
            
            {loginError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{loginError}</p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-runescape-gold hover:bg-runescape-gold/90 text-black font-semibold" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                  Entrando...
                </div>
              ) : (
                'Acessar Painel'
              )}
            </Button>
          </form>
          
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

  if (!ADMIN_ROLES.includes(userRole || '')) {
    return <div className="p-8 text-center text-red-500 font-bold">Acesso restrito. Apenas administradores ou líderes.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6 bg-gradient-to-br from-[#181c24] to-[#23283a] rounded-xl shadow-lg border border-runescape-gold/30">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-runescape-gold">Painel de Administração do Sistema</h1>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handlePopulateUserProfiles}
            disabled={migrating}
          >
            {migrating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-runescape-gold/30 border-t-runescape-gold rounded-full animate-spin"></div>
                Migrando...
              </div>
            ) : (
              'Migrar Usuários'
            )}
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-runescape-gold">Nome do Usuário</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-runescape-gold">Cargo no Sistema</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-runescape-gold">Clã</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-runescape-gold">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-runescape-gold/10">
              {filteredUsers.map((u) => (
                <tr key={u.user_id} className="hover:bg-runescape-gold/5 transition">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-runescape-gold">{u.displayName}</div>
                      {u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
                    </div>
                  </td>
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
                  <td colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <div className="mt-8 text-xs text-muted-foreground text-center">
        Todas as alterações de cargo são registradas em log de auditoria.<br/>
        Painel exclusivo para administração de usuários do sistema Atlantis.
      </div>
    </div>
  );
};

export default AdminPage; 
