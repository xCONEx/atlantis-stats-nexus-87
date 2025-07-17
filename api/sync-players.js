import { runescapeApi } from '../src/services/runescapeApi';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SYNC_TOKEN = process.env.SYNC_PLAYERS_TOKEN;

async function syncPlayers(res) {
  try {
    // Buscar membros dos clãs
    const atlantis = await runescapeApi.getAtlantisClanMembers();
    const argus = await runescapeApi.getAtlantisArgusClanMembers();
    const allPlayers = [...atlantis, ...argus];
    // Remover duplicados pelo nome
    const uniquePlayers = Array.from(new Map(allPlayers.map(p => [p.name, p])).values());
    // Buscar todos os usernames atuais
    const { data: currentPlayers } = await supabase.from('players').select('username');
    const currentUsernames = (currentPlayers || []).map(p => p.username);
    // Upsert jogadores ativos
    let upserts = 0;
    for (const player of uniquePlayers) {
      const { error } = await supabase.from('players').upsert({
        username: player.name,
        clan_rank: player.rank,
        clan_name: player.clan || null,
        total_experience: player.experience,
        is_active: true
      }, { onConflict: 'username' });
      if (!error) upserts++;
    }
    // Marcar como inativo quem não está mais nos clãs
    const activeNames = uniquePlayers.map(p => p.name);
    const toDeactivate = currentUsernames.filter(name => !activeNames.includes(name));
    if (toDeactivate.length > 0) {
      await supabase.from('players').update({ is_active: false }).in('username', toDeactivate);
    }
    res.status(200).json({ imported: upserts, deactivated: toDeactivate.length });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao sincronizar jogadores', details: err.message });
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Permitir GET sem token (usado pelo cron do Vercel)
    return syncPlayers(res);
  }
  if (req.method === 'POST') {
    // Proteção por token simples
    const auth = req.headers.authorization || '';
    if (!SYNC_TOKEN || auth !== `Bearer ${SYNC_TOKEN}`) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    return syncPlayers(res);
  }
  res.status(405).json({ error: 'Método não permitido' });
} 
