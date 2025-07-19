import { supabase } from '../src/integrations/supabase/client.js';
import axios from 'axios';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = "321012107942428673";
const PVM_CHANNEL_ID = process.env.DISCORD_PVM_CHANNEL_ID || "467069985270005760"; // Substitua pelo ID do canal PvM

// Emojis para reações
const REACTION_EMOJIS = {
  interested: "👍",
  attending: "✅",
  maybe: "❓",
  not_attending: "❌"
};

async function sendDiscordMessage(event) {
  const embed = {
    title: `🎮 ${event.title}`,
    description: event.description || "Evento do clã Atlantis",
    color: getEventColor(event.event_type),
    fields: [
      {
        name: "📅 Data e Hora",
        value: formatEventDateTime(event.start_time),
        inline: true
      },
      {
        name: "👥 Participantes",
        value: `${event.current_participants || 0}${event.max_participants ? `/${event.max_participants}` : ''}`,
        inline: true
      }
    ],
    footer: {
      text: "Atlantis Clan Events"
    },
    timestamp: new Date().toISOString()
  };

  if (event.boss_name) {
    embed.fields.push({
      name: "🎯 Boss/Minigame",
      value: event.boss_name,
      inline: true
    });
  }

  if (event.event_type === 'pvm' && event.boss_name) {
    embed.fields.push({
      name: "⚔️ Tipo",
      value: "PvM/Boss Raid",
      inline: true
    });
  }

  const messageData = {
    content: `@Membro **Novo evento criado!** 🎉`,
    embeds: [embed],
    components: [
      {
        type: 1, // Action Row
        components: [
          {
            type: 2, // Button
            style: 1, // Primary
            label: "Interessado",
            custom_id: `event_${event.id}_interested`,
            emoji: {
              name: "👍"
            }
          },
          {
            type: 2, // Button
            style: 3, // Success
            label: "Vou Participar",
            custom_id: `event_${event.id}_attending`,
            emoji: {
              name: "✅"
            }
          },
          {
            type: 2, // Button
            style: 2, // Secondary
            label: "Talvez",
            custom_id: `event_${event.id}_maybe`,
            emoji: {
              name: "❓"
            }
          },
          {
            type: 2, // Button
            style: 4, // Danger
            label: "Não Vou",
            custom_id: `event_${event.id}_not_attending`,
            emoji: {
              name: "❌"
            }
          }
        ]
      }
    ]
  };

  const url = `https://discord.com/api/v10/channels/${PVM_CHANNEL_ID}/messages`;
  const response = await axios.post(url, messageData, {
    headers: {
      'Authorization': `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data;
}

function getEventColor(eventType) {
  switch (eventType) {
    case 'pvm': return 0xFF0000; // Vermelho
    case 'minigame': return 0x00FF00; // Verde
    case 'social': return 0x0000FF; // Azul
    case 'skilling': return 0xFFFF00; // Amarelo
    case 'massive': return 0xFF00FF; // Magenta
    case 'weekly': return 0x00FFFF; // Ciano
    default: return 0x808080; // Cinza
  }
}

function formatEventDateTime(dateTimeString) {
  const date = new Date(dateTimeString);
  return `<t:${Math.floor(date.getTime() / 1000)}:F> (<t:${Math.floor(date.getTime() / 1000)}:R>)`;
}

async function handleButtonInteraction(interaction) {
  const { custom_id, user_id, message_id } = interaction;
  const [action, eventId, response] = custom_id.split('_');

  if (action !== 'event') return;

  try {
    // Buscar Discord ID do usuário
    const discordId = user_id;
    
    // Buscar player_id associado ao Discord ID
    const { data: link, error: linkError } = await supabase
      .from('discord_links')
      .select('player_id, username')
      .eq('discord_id', discordId)
      .single();

    if (linkError || !link) {
      await sendDiscordResponse(interaction, "❌ Você precisa vincular sua conta Discord ao RuneScape primeiro!");
      return;
    }

    // Verificar se já existe participação
    const { data: existingParticipation } = await supabase
      .from('event_participants')
      .select('status')
      .eq('event_id', eventId)
      .eq('player_id', link.player_id)
      .single();

    let newStatus;
    switch (response) {
      case 'interested':
        newStatus = 'interested';
        break;
      case 'attending':
        newStatus = 'registered';
        break;
      case 'maybe':
        newStatus = 'maybe';
        break;
      case 'not_attending':
        newStatus = 'not_attending';
        break;
      default:
        newStatus = 'interested';
    }

    if (existingParticipation) {
      // Atualizar participação existente
      await supabase
        .from('event_participants')
        .update({ status: newStatus })
        .eq('event_id', eventId)
        .eq('player_id', link.player_id);
    } else {
      // Criar nova participação
      await supabase
        .from('event_participants')
        .insert({
          event_id: eventId,
          player_id: link.player_id,
          status: newStatus
        });
    }

    // Atualizar contador de participantes no evento
    await updateEventParticipantCount(eventId);

    const statusMessages = {
      'interested': '👍 Interessado no evento!',
      'registered': '✅ Confirmado para o evento!',
      'maybe': '❓ Talvez participe do evento',
      'not_attending': '❌ Não vai participar do evento'
    };

    await sendDiscordResponse(interaction, statusMessages[newStatus] || 'Resposta registrada!');

  } catch (error) {
    console.error('Erro ao processar interação:', error);
    await sendDiscordResponse(interaction, "❌ Erro ao processar sua resposta. Tente novamente.");
  }
}

async function sendDiscordResponse(interaction, content) {
  const url = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}`;
  
  try {
    await axios.post(url, {
      content: content,
      flags: 64 // Ephemeral (só o usuário vê)
    });
  } catch (error) {
    console.error('Erro ao enviar resposta Discord:', error);
  }
}

async function updateEventParticipantCount(eventId) {
  try {
    const { data: participants, error } = await supabase
      .from('event_participants')
      .select('status')
      .eq('event_id', eventId)
      .in('status', ['registered', 'attending']);

    if (!error && participants) {
      const count = participants.length;
      await supabase
        .from('events')
        .update({ current_participants: count })
        .eq('id', eventId);
    }
  } catch (error) {
    console.error('Erro ao atualizar contador de participantes:', error);
  }
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action, event, interaction } = req.body;

    try {
      if (action === 'create_event') {
        const message = await sendDiscordMessage(event);
        
        // Log da criação do evento
        await supabase.from('activity_logs').insert({
          activity_type: 'event_created',
          description: `Evento "${event.title}" criado e notificação enviada para Discord`,
          metadata: {
            event_id: event.id,
            discord_message_id: message.id,
            event_type: event.event_type
          }
        });

        return res.status(200).json({
          success: true,
          message_id: message.id
        });
      }

      if (action === 'button_interaction') {
        await handleButtonInteraction(interaction);
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Ação não reconhecida' });

    } catch (error) {
      console.error('Erro na API Discord Events:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor',
        details: error.message 
      });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
} 
