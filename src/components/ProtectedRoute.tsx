import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Não redirecionar se estiver na página admin - ela gerencia seu próprio login
    if (!loading && !user && location.pathname !== '/admin') {
      navigate('/login');
    }
  }, [user, loading, navigate, location.pathname]);

  // Se for admin e está acessando /admin, libera imediatamente
  if (userRole === 'admin' && location.pathname === '/admin') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-runescape-gold"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não está logado e está na página admin, permite que a página admin gerencie
  if (!user && location.pathname === '/admin') {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
