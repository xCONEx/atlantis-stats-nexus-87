import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Buscar user_roles
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('user_id, role, clan_name')
      .order('role', { ascending: false });

    if (userRolesError) {
      return res.status(500).json({ error: 'Erro ao buscar user_roles' });
    }

    // Para cada user_role, buscar dados do usuário via Supabase Auth
    const usersWithDetails = await Promise.all(
      userRoles.map(async (userRole) => {
        try {
          // Buscar dados do usuário via Supabase Auth Admin
          const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userRole.user_id);
          
          if (authError || !authData?.user) {
            return {
              ...userRole,
              displayName: `Usuário ${userRole.user_id.slice(0, 8)}...`,
              email: null
            };
          }

          const user = authData.user;
          const displayName = user.user_metadata?.full_name || 
                             user.user_metadata?.name || 
                             user.email || 
                             'Usuário Desconhecido';

          return {
            ...userRole,
            displayName,
            email: user.email
          };
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', userRole.user_id, error);
          return {
            ...userRole,
            displayName: `Usuário ${userRole.user_id.slice(0, 8)}...`,
            email: null
          };
        }
      })
    );

    res.status(200).json({ users: usersWithDetails });
  } catch (error) {
    console.error('Erro na API admin-users:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
} 
