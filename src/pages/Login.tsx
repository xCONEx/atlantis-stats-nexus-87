import { useState, useEffect } from "react";
import { Zap, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { signInWithDiscord, signIn, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        setLoginError(error.message || 'Erro ao fazer login');
      }
    } catch (err: any) {
      setLoginError('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Link to="/" className="inline-flex items-center space-x-3">
            <img src="/2logo.svg" alt="Logo Atlantis" className="h-10 w-10 animate-glow-pulse" />
            <div>
              <h1 className="text-3xl font-cinzel font-bold text-runescape-gold">
                Atlantis Stats
              </h1>
              <p className="text-sm text-muted-foreground">
                RuneScape 3 Dashboard
              </p>
            </div>
          </Link>
        </div>
        {/* Login Social Discord */}
        <Card className="clan-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-cinzel text-runescape-gold">
              Entrar com Discord
            </CardTitle>
            <CardDescription>
              Acesse o dashboard do seu clã usando sua conta Discord
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              className="w-full flex items-center justify-center gap-2"
              onClick={signInWithDiscord}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.317 4.3698A19.7913 19.7913 0 0 0 16.8854 3.1952C16.7252 2.8618 16.5127 2.5547 16.255 2.2888C15.9982 2.0229 15.7007 1.8031 15.3746 1.6414C15.0485 1.4797 14.6996 1.3796 14.343 1.3472C13.9864 1.3148 13.6291 1.3506 13.2884 1.4532C12.9477 1.5558 12.6301 1.7232 12.3532 1.9462C12.0763 2.1692 11.8462 2.4432 11.6772 2.7512C11.5082 3.0592 11.4042 3.3942 11.3732 3.7392C10.2282 3.7652 9.0862 3.9652 7.9652 4.3342C7.9652 4.3342 5.6322 6.6342 4.3172 9.3692C2.9022 12.3342 2.3172 15.3342 2.3172 15.3342C2.3172 15.3342 4.3172 17.3342 7.9652 18.3342C7.9652 18.3342 8.9652 17.3342 11.9652 17.3342C14.9652 17.3342 15.9652 18.3342 15.9652 18.3342C19.6132 17.3342 21.6132 15.3342 21.6132 15.3342C21.6132 15.3342 21.0282 12.3342 19.6132 9.3692C18.2982 6.6342 15.9652 4.3342 15.9652 4.3342C14.8442 3.9652 13.7022 3.7652 12.5572 3.7392C12.5262 3.3942 12.4222 3.0592 12.2532 2.7512C12.0842 2.4432 11.8541 2.1692 11.5772 1.9462C11.3003 1.7232 10.9827 1.5558 10.642 1.4532C10.3013 1.3506 9.944 1.3148 9.5874 1.3472C9.2308 1.3796 8.8819 1.4797 8.5558 1.6414C8.2297 1.8031 7.9322 2.0229 7.6754 2.2888C7.4177 2.5547 7.2052 2.8618 7.045 3.1952A19.7913 19.7913 0 0 0 3.6132 4.3698C2.1982 7.3342 1.6132 10.3342 1.6132 10.3342C1.6132 10.3342 3.6132 12.3342 7.2612 13.3342C7.2612 13.3342 8.2612 12.3342 11.2612 12.3342C14.2612 12.3342 15.2612 13.3342 15.2612 13.3342C18.9092 12.3342 20.9092 10.3342 20.9092 10.3342C20.9092 10.3342 20.3242 7.3342 18.9092 4.3698Z" fill="#5865F2"/></svg>
              Entrar com Discord
            </Button>
          </CardContent>
        </Card>
        {/* Login por Email/Senha */}
        <Card className="clan-card">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-cinzel text-runescape-gold">
              Ou entre com e-mail
            </CardTitle>
            <CardDescription>
              Para administradores ou acesso alternativo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              {loginError && <div className="text-red-500 text-sm">{loginError}</div>}
              <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</Button>
            </form>
          </CardContent>
        </Card>
        {/* Back to Landing */}
        <div className="text-center">
          <Link to="/">
            <Button>
              ← Voltar para página inicial
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
