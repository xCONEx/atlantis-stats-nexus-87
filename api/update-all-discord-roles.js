import { supabase } from '../src/integrations/supabase/client.js';
import axios from 'axios';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const ROLE_IDS = {
  Generoso: "1395811213144887317",
  Milionario: "1395811376605167847",
  'Bilionário': "1395811441982050509",
  Filantropo: "1395811476928856144",
};
const GUILD_ID = "664599420528099338";

const DONATION_ROLE_IDS = [
  "1395811213144887317", // Generoso
  "1395811376605167847", // Milionario
  "1395811441982050509", // Bilionário
  "1395811476928856144", // Filantropo
];

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

async function removeDonationRoles(discord_id) {
  for (const role_id of DONATION_ROLE_IDS) {
    try {
      const url = `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discord_id}/roles/${role_id}`;
      await axios.delete(url, {
        headers: {
          'Authorization': `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      if (err.response && err.response.status !== 404) {
        console.error(`Erro ao remover cargo ${role_id}:`, err.response?.data || err.message);
      }
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Buscar todos os jogadores que têm doações e discord_links
    const { data: playersWithDonations, error: playersError } = await supabase
      .from('players')
      .select(`
        id,
        username,
        display_name,
        discord_links!inner(discord_id),
        donations!inner(amount)
      `)
      .eq('is_active', true);

    if (playersError) {
      console.error('Erro ao buscar jogadores:', playersError);
      return res.status(500).json({ error: 'Erro ao buscar jogadores' });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const player of playersWithDonations) {
      try {
        const discord_id = player.discord_links[0]?.discord_id;
        if (!discord_id) continue;

        // Calcular total de doações
        const total = player.donations.reduce((acc, d) => acc + (d.amount || 0), 0);
        
        // Determinar cargo
        let cargo = 'Membro';
        let role_id = null;
        if (total >= 2500000000) { cargo = 'Filantropo 🪙'; role_id = ROLE_IDS.Filantropo; }
        else if (total >= 1000000000) { cargo = 'Bilionário 💷'; role_id = ROLE_IDS['Bilionário']; }
        else if (total >= 500000000) { cargo = 'Milionário 💵'; role_id = ROLE_IDS.Milionario; }
        else if (total >= 250000000) { cargo = 'Generoso 💰'; role_id = ROLE_IDS.Generoso; }

        // Remover todos os cargos de doação primeiro
        await removeDonationRoles(discord_id);

        // Se tiver role_id, atribui o cargo no Discord
        if (role_id) {
          await assignRoleToUser(discord_id, role_id);
        }

        results.push({
          player_id: player.id,
          discord_id,
          username: player.display_name || player.username,
          total_donated: total,
          role: cargo,
          status: 'success'
        });
        successCount++;

      } catch (err) {
        console.error(`Erro ao processar jogador ${player.id}:`, err);
        results.push({
          player_id: player.id,
          discord_id: player.discord_links[0]?.discord_id,
          username: player.display_name || player.username,
          error: err.message,
          status: 'error'
        });
        errorCount++;
      }
    }

    // Log da operação
    await supabase.from('activity_logs').insert({
      activity_type: 'bulk_discord_roles_update',
      description: `Atualização em massa de cargos Discord: ${successCount} sucessos, ${errorCount} erros`,
      player_id: null,
      metadata: {
        total_processed: playersWithDonations.length,
        success_count: successCount,
        error_count: errorCount,
        results
      },
    });

    return res.status(200).json({
      message: 'Atualização concluída',
      total_processed: playersWithDonations.length,
      success_count: successCount,
      error_count: errorCount,
      results
    });

  } catch (err) {
    console.error('Erro geral:', err);
    return res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
  }
} 
