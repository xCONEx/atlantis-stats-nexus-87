import { useState } from "react";
import { Users, Download, RefreshCw, Crown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { runescapeApi } from "@/services/runescapeApi";

const Clans = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const importClanMembers = async (clanName: string) => {
    setLoading(true);
    try {
      const members = await runescapeApi.getClanMembers(clanName, 500);
      
      toast({
        title: "Membros importados",
        description: `${members.length} membros do clã ${clanName} importados com sucesso`,
      });
    } catch (error) {
      toast({
        title: "Erro na importação",
        description: "Falha ao importar membros do clã",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-cinzel font-bold text-runescape-gold">Clãs</h1>
          <p className="text-muted-foreground">Gerencie os clãs Atlantis e Atlantis Argus</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="clan-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-runescape-gold">
                <Crown className="h-6 w-6" />
                <span>Atlantis</span>
              </CardTitle>
              <CardDescription>Clã principal da organização</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-2xl font-bold text-runescape-gold">124 membros</div>
              <Button
                onClick={() => importClanMembers("Atlantis")}
                disabled={loading}
                className="btn-runescape w-full"
              >
                <Users className="h-4 w-4" />
                Importar Membros
              </Button>
            </CardContent>
          </Card>

          <Card className="clan-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-purple-400">
                <Shield className="h-6 w-6" />
                <span>Atlantis Argus</span>
              </CardTitle>
              <CardDescription>Clã secundário da organização</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-2xl font-bold text-purple-400">89 membros</div>
              <Button
                onClick={() => importClanMembers("Atlantis Argus")}
                disabled={loading}
                className="btn-clan w-full"
              >
                <Users className="h-4 w-4" />
                Importar Membros
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Clans;
