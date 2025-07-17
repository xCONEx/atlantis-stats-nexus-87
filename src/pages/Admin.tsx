import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ADMIN_EMAIL = 'xconexrs3@gmail.com';

const AdminPage = () => {
  const { user, userRole, signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Token do ambiente (NUNCA expor em prod real, aqui só para demo/local)
  const token = import.meta.env.VITE_SYNC_PLAYERS_TOKEN || '';

  const handleSync = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/sync-players', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`Importados/atualizados: ${data.imported}, desativados: ${data.deactivated}`);
      } else {
        setResult(`Erro: ${data.error || 'Erro desconhecido'}`);
      }
    } catch (err: any) {
      setResult('Erro ao chamar a API');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        setLoginError(error.message || 'Erro ao fazer login');
      } else {
        // Se for o admin, garantir papel admin
        if (email === ADMIN_EMAIL && user) {
          await supabase.from('user_roles').upsert({
            user_id: user.id,
            role: 'admin',
            clan_name: null
          }, { onConflict: 'user_id' });
        }
      }
    } catch (err: any) {
      setLoginError('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-sm mx-auto mt-20 p-8 bg-card rounded shadow">
        <h1 className="text-2xl font-bold mb-6 text-runescape-gold">Login Admin</h1>
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

  if (userRole !== 'admin') {
    return <div className="p-8 text-center text-red-500 font-bold">Acesso restrito. Apenas administradores.</div>;
  }

  return (
    <div className="max-w-lg mx-auto mt-12 p-8 bg-card rounded shadow">
      <h1 className="text-2xl font-bold mb-6 text-runescape-gold">Administração - Sincronizar Jogadores</h1>
      <Button onClick={handleSync} disabled={loading} className="w-full mb-4">
        {loading ? 'Sincronizando...' : 'Sincronizar Jogadores Agora'}
      </Button>
      {result && <div className="mt-4 text-center text-sm text-muted-foreground">{result}</div>}
      <div className="mt-8 text-xs text-muted-foreground">
        A sincronização automática ocorre de hora em hora.<br/>
        Use este botão apenas para forçar uma atualização manual.
      </div>
    </div>
  );
};

export default AdminPage; 
