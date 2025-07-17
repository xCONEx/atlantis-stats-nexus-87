import { useState } from "react";
import { Plus, Search, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import DonationModal from "@/components/DonationModal";

const Donations = () => {
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-cinzel font-bold text-runescape-gold">Doações</h1>
            <p className="text-muted-foreground">Gerencie doações dos membros dos clãs</p>
          </div>
          <Button onClick={() => setShowDonationModal(true)} variant="runescape">
            <Plus className="h-4 w-4" />
            Nova Doação
          </Button>
        </div>

        <Card className="clan-card">
          <CardHeader>
            <CardTitle className="text-runescape-gold">Controle de Doações</CardTitle>
            <CardDescription>Sistema integrado com APIs reais do RuneScape</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              As doações serão integradas com o banco de dados Supabase após a configuração.
            </p>
          </CardContent>
        </Card>
      </div>

      <DonationModal
        open={showDonationModal}
        onClose={() => setShowDonationModal(false)}
        onSave={(data) => {
          console.log('Donation saved:', data);
          setShowDonationModal(false);
        }}
      />
    </Layout>
  );
};

export default Donations;