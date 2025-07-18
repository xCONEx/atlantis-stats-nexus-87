import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar se a tabela user_profiles existe
    const { data: tableExists, error: tableError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .limit(1);

    if (tableError) {
      return res.status(500).json({ 
        error: 'Tabela user_profiles não existe. Execute o SQL primeiro.',
        details: tableError 
      });
    }

    // Buscar todos os user_roles
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .order('user_id');

    if (userRolesError) {
      return res.status(500).json({ 
        error: 'Erro ao buscar user_roles',
        details: userRolesError 
      });
    }

    // Para cada user_role, buscar dados do usuário via Supabase Auth Admin
    const profilesToInsert = [];
    
    for (const userRole of userRoles) {
      try {
        // Buscar dados do usuário via Supabase Auth Admin
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userRole.user_id);
        
        if (authError || !authData?.user) {
          console.log(`Usuário ${userRole.user_id} não encontrado no Auth`);
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
      } catch (error) {
        console.error(`Erro ao buscar dados do usuário ${userRole.user_id}:`, error);
      }
    }

    // Inserir todos os perfis de uma vez
    if (profilesToInsert.length > 0) {
      const { data: insertedProfiles, error: insertError } = await supabase
        .from('user_profiles')
        .upsert(profilesToInsert, { onConflict: 'user_id' });

      if (insertError) {
        return res.status(500).json({ 
          error: 'Erro ao inserir perfis',
          details: insertError 
        });
      }

      res.status(200).json({ 
        message: `Perfis criados com sucesso!`,
        count: profilesToInsert.length,
        profiles: insertedProfiles
      });
    } else {
      res.status(200).json({ 
        message: 'Nenhum perfil foi criado',
        count: 0
      });
    }

  } catch (error) {
    console.error('Erro na API populate-user-profiles:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
} 
