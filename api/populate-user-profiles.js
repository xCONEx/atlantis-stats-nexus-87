import { createClient } from '@supabase/supabase-js';

// Verificar variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('SUPABASE_URL não encontrada');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Iniciando migração de user_profiles...');
    
    // Verificar se a tabela user_profiles existe
    console.log('Verificando se a tabela user_profiles existe...');
    const { data: tableExists, error: tableError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .limit(1);

    if (tableError) {
      console.error('Erro ao verificar tabela user_profiles:', tableError);
      return res.status(500).json({ 
        error: 'Tabela user_profiles não existe ou não está acessível.',
        details: tableError.message 
      });
    }

    console.log('Tabela user_profiles encontrada, buscando user_roles...');

    // Buscar todos os user_roles
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .order('user_id');

    if (userRolesError) {
      console.error('Erro ao buscar user_roles:', userRolesError);
      return res.status(500).json({ 
        error: 'Erro ao buscar user_roles',
        details: userRolesError.message 
      });
    }

    console.log(`Encontrados ${userRoles.length} user_roles para migrar`);

    // Se não temos service role, criar perfis básicos
    if (!supabaseServiceKey) {
      console.log('Service role não disponível, criando perfis básicos...');
      
      const profilesToInsert = userRoles.map(userRole => ({
        user_id: userRole.user_id,
        email: `user-${userRole.user_id.slice(0, 8)}@example.com`,
        display_name: `Usuário ${userRole.user_id.slice(0, 8)}...`
      }));

      const { data: insertedProfiles, error: insertError } = await supabase
        .from('user_profiles')
        .upsert(profilesToInsert, { onConflict: 'user_id' });

      if (insertError) {
        console.error('Erro ao inserir perfis:', insertError);
        return res.status(500).json({ 
          error: 'Erro ao inserir perfis',
          details: insertError.message 
        });
      }

      console.log(`Migração básica concluída: ${profilesToInsert.length} perfis criados`);
      res.status(200).json({ 
        message: `Migração básica concluída! ${profilesToInsert.length} perfis criados.`,
        count: profilesToInsert.length,
        note: 'Service role não configurada, emails são placeholder'
      });
      return;
    }

    // Com service role, buscar dados completos
    const profilesToInsert = [];
    
    for (const userRole of userRoles) {
      try {
        console.log(`Processando usuário: ${userRole.user_id}`);
        
        // Buscar dados do usuário via Supabase Auth Admin
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userRole.user_id);
        
        if (authError || !authData?.user) {
          console.log(`Usuário ${userRole.user_id} não encontrado no Auth:`, authError?.message);
          continue;
        }

        const user = authData.user;
        const displayName = user.user_metadata?.full_name || 
                           user.user_metadata?.name || 
                           user.email || 
                           'Usuário';

        profilesToInsert.push({
          user_id: userRole.user_id,
          email: user.email || '',
          display_name: displayName
        });

        console.log(`Perfil criado para ${user.email}`);
      } catch (error) {
        console.error(`Erro ao buscar dados do usuário ${userRole.user_id}:`, error);
      }
    }

    console.log(`Preparados ${profilesToInsert.length} perfis para inserção`);

    // Inserir todos os perfis de uma vez
    if (profilesToInsert.length > 0) {
      const { data: insertedProfiles, error: insertError } = await supabase
        .from('user_profiles')
        .upsert(profilesToInsert, { onConflict: 'user_id' });

      if (insertError) {
        console.error('Erro ao inserir perfis:', insertError);
        return res.status(500).json({ 
          error: 'Erro ao inserir perfis',
          details: insertError.message 
        });
      }

      console.log(`Migração concluída: ${profilesToInsert.length} perfis criados`);
      res.status(200).json({ 
        message: `Migração concluída com sucesso!`,
        count: profilesToInsert.length,
        profiles: insertedProfiles
      });
    } else {
      console.log('Nenhum perfil foi criado');
      res.status(200).json({ 
        message: 'Nenhum perfil foi criado',
        count: 0
      });
    }

  } catch (error) {
    console.error('Erro na API populate-user-profiles:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
} 
