import { supabase } from '../src/integrations/supabase/client.js';
import nacl from 'tweetnacl';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

// Função para ler o corpo bruto da requisição
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8'); // Garante que o body será lido como string UTF-8
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', err => {
      reject(err);
    });
  });
}

// Verificar assinatura do Discord usando Ed25519
function verifySignature({ rawBody, signature, timestamp, publicKey }) {
  try {
    const isValid = nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, 'hex'),
      Buffer.from(publicKey, 'hex')
    );
    return isValid;
  } catch (error) {
    console.error('Erro ao verificar assinatura:', error);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Lê o corpo bruto da requisição
  const rawBody = await getRawBody(req);
  console.log('rawBody recebido:', rawBody); // Log para depuração

  // Recupera headers
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];

  // Verifica assinatura
  if (!verifySignature({ rawBody, signature, timestamp, publicKey: PUBLIC_KEY })) {
    return res.status(401).json({ error: 'Assinatura inválida' });
  }

  // Parseia o body após a verificação
  let body;
  try {
    console.log('Tentando fazer parse do rawBody...');
    body = JSON.parse(rawBody);
  } catch (e) {
    console.error('Erro ao fazer parse do rawBody:', e);
    return res.status(400).json({ error: 'Body inválido' });
  }

  const { type, data } = body;

  // Responder a ping do Discord
  if (type === 1) {
    return res.status(200).json({ type: 1 });
  }

  // Processar interação de botão
  if (type === 2 && data?.component_type === 2) {
    try {
      const { custom_id } = data;
      const [action, eventId, response] = custom_id.split('_');

      if (action !== 'event') {
        return res.status(400).json({
          type: 4,
          data: {
            content: "❌ Interação inválida",
            flags: 64
          }
        });
      }

      // Buscar Discord ID do usuário corretamente
      const discordId = body.member?.user?.id;
      const messageId = body.message?.id;
      
      // Buscar player_id associado ao Discord ID
      const { data: link, error: linkError } = await supabase
        .from('discord_links')
        .select('player_id, username')
        .eq('discord_id', discordId)
        .single();

      if (linkError || !link) {
        return res.status(200).json({
          type: 4,
          data: {
            content: "❌ Você precisa vincular sua conta Discord ao RuneScape primeiro! Use o comando `/link` no Discord.",
            flags: 64
          }
        });
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

      // Log da interação
      await supabase.from('activity_logs').insert({
        activity_type: 'event_interaction',
        description: `Usuário ${link.username} respondeu ao evento ${eventId}: ${newStatus}`,
        metadata: {
          discord_id: discordId,
          event_id: eventId,
          response: response,
          status: newStatus
        },
        player_id: link.player_id
      });

      const statusMessages = {
        'interested': '👍 Interessado no evento!',
        'registered': '✅ Confirmado para o evento!',
        'maybe': '❓ Talvez participe do evento',
        'not_attending': '❌ Não vai participar do evento'
      };

      return res.status(200).json({
        type: 4,
        data: {
          content: statusMessages[newStatus] || 'Resposta registrada!',
          flags: 64
        }
      });

    } catch (error) {
      console.error('Erro ao processar interação:', error);
      return res.status(200).json({
        type: 4,
        data: {
          content: "❌ Erro ao processar sua resposta. Tente novamente.",
          flags: 64
        }
      });
    }
  }

  return res.status(400).json({ error: 'Tipo de interação não suportado' });
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
