import { supabase } from '../src/integrations/supabase/client';
import axios from 'axios';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const ROLE_IDS = {
  Generoso: "1395811213144887317",
  Milionario: "1395811376605167847",
  'Bilionário': "1395811441982050509",
  Filantropo: "1395811476928856144",
};
const GUILD_ID = "664599420528099338";

function getRoleIdByDonation(total) {
  if (total >= 2500000000) return ROLE_IDS.Filantropo;
  if (total >= 1000000000) return ROLE_IDS['Bilionário'];
  if (total >= 500000000) return ROLE_IDS.Milionario;
  if (total >= 250000000) return ROLE_IDS.Generoso;
  return null;
}

async function assignRoleToUser(discord_id, role_id) {
  const url = `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discord_id}/roles/${role_id}`;
  await axios.put(url, {}, {
    headers: {
      'Authorization': `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}

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
  let role_id = null;
  if (total >= 2500000000) { cargo = 'Filantropo 🪙'; role_id = ROLE_IDS.Filantropo; }
  else if (total >= 1000000000) { cargo = 'Bilionário 💷'; role_id = ROLE_IDS['Bilionário']; }
  else if (total >= 500000000) { cargo = 'Milionário 💵'; role_id = ROLE_IDS.Milionario; }
  else if (total >= 250000000) { cargo = 'Generoso 💰'; role_id = ROLE_IDS.Generoso; }

  // Se tiver role_id, atribui o cargo no Discord
  if (role_id) {
    try {
      await assignRoleToUser(discord_id, role_id);
    } catch (err) {
      await logRequest(discord_id, 'discord_api_error', { action, cargo, total, role_id, error: err.response?.data || err.message });
      return res.status(500).json({ error: 'Erro ao atribuir cargo no Discord', details: err.response?.data || err.message });
    }
  }

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
