import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Zap, Shield, User } from "lucide-react";

const roles = [
  { value: "leader", label: "Líder", icon: Zap },
  { value: "vice-leader", label: "Vice-líder", icon: Shield },
  { value: "coordinator", label: "Coordenador", icon: User },
  { value: "fiscal", label: "Fiscal", icon: User },
  { value: "organizer", label: "Organizador", icon: User },
  { value: "administrator", label: "Administrador", icon: User },
  { value: "admin-legado", label: "Admin-legado", icon: User }
];

const clans = [
  { value: "atlantis", label: "Atlantis" },
  { value: "atlantis-argus", label: "Atlantis Argus" }
];

interface FirstLoginModalProps {
  userId: string | null;
  onSave: (role: string, clan: string, username: string) => void;
}

const FirstLoginModal = ({ userId, onSave }: FirstLoginModalProps) => {
  const [role, setRole] = useState("");
  const [clan, setClan] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!role || !clan || !username) return;
    setSaving(true);
    await onSave(role, clan, username);
    setSaving(false);
  };

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-runescape-gold text-center">Bem-vindo! Complete seu perfil</DialogTitle>
        </DialogHeader>
        <Card className="clan-card">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="role">Cargo no clã</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu cargo" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center space-x-2">
                        <role.icon className="h-4 w-4" />
                        <span>{role.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clan">Clã</Label>
              <Select value={clan} onValueChange={setClan}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu clã" />
                </SelectTrigger>
                <SelectContent>
                  {clans.map((clan) => (
                    <SelectItem key={clan.value} value={clan.value}>
                      {clan.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Nick do RuneScape</Label>
              <input
                id="username"
                className="w-full border rounded px-3 py-2"
                placeholder="Digite seu nick do RuneScape"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="off"
                maxLength={255}
              />
            </div>
            <Button
              className="w-full mt-4"
              onClick={handleSave}
              disabled={!role || !clan || !username || saving}
            >
              Salvar e continuar
            </Button>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default FirstLoginModal; 
