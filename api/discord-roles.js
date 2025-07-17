import { supabase } from '../src/integrations/supabase/client';

const ENV = process.env.DISCORD_ENV || 'production';
const BOT_TOKEN = ENV === 'test'
  ? process.env.DISCORD_BOT_TOKEN_TEST || 'SEU_TOKEN_TESTE_AQUI'
  : process.env.DISCORD_BOT_TOKEN_PROD || process.env.DISCORD_BOT_TOKEN || 'SEU_TOKEN_AQUI';

export default async function handler(req, res) {
  // Autenticação simples via token
  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${BOT_TOKEN}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { discord_id, action } = req.body;
  if (!discord_id) {
    return res.status(400).json({ error: 'discord_id obrigatório' });
  }

  // Buscar associação Discord ↔ Nick
  const { data: link, error: linkError } = await supabase
    .from('discord_links')
    .select('username, player_id')
    .eq('discord_id', discord_id)
    .single();
  if (linkError || !link) {
    await logRequest(discord_id, 'not_found', req.body);
    return res.status(404).json({ error: 'Associação não encontrada' });
  }

  // Buscar total de doações
  const { data: donations, error: donationError } = await supabase
    .from('donations')
    .select('amount')
    .eq('player_id', link.player_id);
  const total = donations ? donations.reduce((acc, d) => acc + (d.amount || 0), 0) : 0;

  // Determinar cargo
  let cargo = 'Membro';
  if (total >= 5000000000) cargo = 'Personalizado 👑';
  else if (total >= 2500000000) cargo = 'Filantropo 🪙';
  else if (total >= 1000000000) cargo = 'Bilionário 💷';
  else if (total >= 500000000) cargo = 'Milionário 💵';
  else if (total >= 250000000) cargo = 'Generoso 💰';

  // Logar requisição
  await logRequest(discord_id, 'success', { action, cargo, total });

  return res.status(200).json({
    username: link.username,
    total_donated: total,
    suggested_role: cargo,
    player_id: link.player_id,
  });
}

// Função para logar requisições do bot
async function logRequest(discord_id, status, extra) {
  await supabase.from('activity_logs').insert({
    activity_type: 'discord_bot',
    description: `Bot requisitou info para ${discord_id} [${status}]`,
    metadata: extra,
    player_id: null,
  });
} 