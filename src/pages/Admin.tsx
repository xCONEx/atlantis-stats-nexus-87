import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const AdminPage = () => {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

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
