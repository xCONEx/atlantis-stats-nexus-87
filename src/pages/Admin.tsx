import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

const ADMIN_ROLES = ['admin', 'leader'];

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  leader: 'Leader',
  member: 'Member',
  moderator: 'Moderator',
  staff: 'Staff',
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

  // Login por e-mail restrito
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        setLoginError(error.message || 'Erro ao fazer login');
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
    let { data, error } = await supabase
      .from('user_roles')
      .select('user_id, role, clan_name, users:users(email), discord_links(username, discord_id)')
      .order('role', { ascending: false });
    if (!error && data) {
      setUsers(data);
    } else {
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
    const name = u.discord_links?.username || u.users?.email || '';
    return name.toLowerCase().includes(search.toLowerCase());
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

  // Proteção de rota
  if (!user) {
    return (
      <div className="max-w-sm mx-auto mt-20 p-8 bg-card rounded shadow">
        <h1 className="text-2xl font-bold mb-6 text-runescape-gold">Login Admin/Líder</h1>
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">E-mail</label>
            <input type="email" className="w-full border rounded px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block mb-1 font-medium">Senha</label>
            <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {loginError && <div className="text-red-500 text-sm">{loginError}</div>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</Button>
        </form>
      </div>
    );
  }

  if (!ADMIN_ROLES.includes(userRole || '')) {
    return <div className="p-8 text-center text-red-500 font-bold">Acesso restrito. Apenas administradores ou líderes.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6 bg-gradient-to-br from-[#181c24] to-[#23283a] rounded-xl shadow-lg border border-runescape-gold/30">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-runescape-gold">Painel de Administração do Clã</h1>
        <Button variant="outline" onClick={signOut}>Sair</Button>
      </div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full md:w-80"
        />
        <span className="text-muted-foreground text-sm">Total: {filteredUsers.length}</span>
      </div>
      <div className="overflow-x-auto rounded-lg shadow border border-runescape-gold/10 bg-card">
        <table className="min-w-full divide-y divide-runescape-gold/10">
          <thead className="bg-runescape-gold/10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-runescape-gold">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-runescape-gold">E-mail</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-runescape-gold">Cargo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-runescape-gold">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-runescape-gold/10">
            {filteredUsers.map((u) => (
              <tr key={u.user_id} className="hover:bg-runescape-gold/5 transition">
                <td className="px-4 py-3 font-medium text-runescape-gold">{u.discord_links?.username || '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.users?.email || '-'}</td>
                <td className="px-4 py-3">
                  {editingRole === u.user_id ? (
                    <Select value={roleDraft} onValueChange={setRoleDraft}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(roleLabels).map(role => (
                          <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="capitalize font-semibold text-runescape-gold">{roleLabels[u.role] || u.role}</span>
                  )}
                </td>
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
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-8 text-xs text-muted-foreground text-center">
        Todas as alterações de cargo são registradas em log de auditoria.<br/>
        Painel exclusivo para administração do clã Atlantis.
      </div>
    </div>
  );
};

export default AdminPage; 
