import { useState, useEffect } from "react";
import { Calendar, Plus, Users, Clock, MapPin, Target, Award, Filter, Search, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Lista completa de bosses do RuneScape
const BOSS_LIST = [
  // God Wars Dungeon
  "K'ril Tsutsaroth", "General Graardor", "Commander Zilyana", "Kril Tsutsaroth",
  // Slayer Bosses
  "Abyssal Demon", "Kalphite Queen", "King Black Dragon", "Dagannoth Kings",
  // High Level Bosses
  "Nex", "Vorago", "Araxxor", "Telos", "Solak", "Angel of Death",
  // Raids
  "Beastmaster Durzag", "Yakamaru", "Mazcab Raids", "Elite Dungeons",
  // Other Bosses
  "Queen Black Dragon", "Legiones", "Gregorovic", "Helwyr", "Twin Furies", "Vindicta",
  "Corporeal Beast", "Chaos Elemental", "Giant Mole", "Kalphite King",
  // Minigames
  "Castle Wars", "Pest Control", "Fight Caves", "Fight Kiln", "Dominion Tower",
  "Heist", "Stealing Creation", "Flash Powder Factory", "Big Chinchompa",
  // Special Events
  "Massive Event", "Weekly Event", "Social Event", "Competition", "Training Event"
];

const EVENT_TYPES = [
  { value: "pvm", label: "PvM/Boss", icon: Target },
  { value: "minigame", label: "Minigame", icon: Award },
  { value: "social", label: "Social", icon: Users },
  { value: "skilling", label: "Skilling", icon: Award },
  { value: "massive", label: "Massive", icon: Users },
  { value: "weekly", label: "Evento Semanal", icon: Calendar }
];

interface Event {
  id: string;
  title: string;
  description: string;
  event_type: string;
  boss_name?: string;
  start_time: string;
  end_time?: string;
  max_participants?: number;
  current_participants: number;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  discord_message_id?: string;
}

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { userRole } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_type: "pvm",
    boss_name: "",
    start_time: "",
    end_time: "",
    max_participants: 0,
    is_recurring: false,
    recurring_type: "weekly"
  });

  const canCreateEvents = userRole && ['leader', 'vice-leader', 'coordinator', 'fiscal', 'organizer', 'administrator', 'admin'].includes(userRole);
  const canEditEvents = userRole && ['leader', 'vice-leader', 'coordinator', 'fiscal', 'organizer', 'administrator', 'admin'].includes(userRole);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Função para obter data mínima (hoje + 1 hora)
  const getMinDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1); // Mínimo 1 hora no futuro
    return now.toISOString().slice(0, 16); // Formato para datetime-local
  };

  // Função para formatar data para datetime-local
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_participants(count)
        `)
        .order('start_time', { ascending: true });

      if (error) throw error;

      const eventsWithParticipants = data?.map(event => ({
        ...event,
        current_participants: event.event_participants?.[0]?.count || 0
      })) || [];

      setEvents(eventsWithParticipants);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar eventos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      title: "",
      description: "",
      event_type: "pvm",
      boss_name: "",
      start_time: "",
      end_time: "",
      max_participants: 0,
      is_recurring: false,
      recurring_type: "weekly"
    });
  };

  const handleCreateEvent = async () => {
    if (!formData.title || !formData.start_time) {
      toast({
        title: "Erro",
        description: "Título e data de início são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Validar se a data de início é no futuro
    const startDate = new Date(formData.start_time);
    const now = new Date();
    if (startDate <= now) {
      toast({
        title: "Erro",
        description: "A data de início deve ser no futuro",
        variant: "destructive"
      });
      return;
    }

    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        event_type: formData.event_type,
        boss_name: formData.boss_name || null,
        start_time: formData.start_time,
        end_time: formData.end_time || null,
        max_participants: formData.max_participants || null,
        status: 'planned',
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      // Enviar notificação para Discord
      await sendDiscordNotification(data);

      toast({
        title: "Sucesso",
        description: "Evento criado com sucesso!"
      });

      setShowCreateModal(false);
      resetFormData();
      fetchEvents();
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar evento",
        variant: "destructive"
      });
    }
  };

  const handleEditEvent = async () => {
    if (!editingEvent || !formData.title || !formData.start_time) {
      toast({
        title: "Erro",
        description: "Título e data de início são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Validar se a data de início é no futuro (apenas para eventos planejados)
    if (editingEvent.status === 'planned') {
      const startDate = new Date(formData.start_time);
      const now = new Date();
      if (startDate <= now) {
        toast({
          title: "Erro",
          description: "A data de início deve ser no futuro para eventos planejados",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        event_type: formData.event_type,
        boss_name: formData.boss_name || null,
        start_time: formData.start_time,
        end_time: formData.end_time || null,
        max_participants: formData.max_participants || null,
      };

      const { error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', editingEvent.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Evento atualizado com sucesso!"
      });

      setShowEditModal(false);
      setEditingEvent(null);
      resetFormData();
      fetchEvents();
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar evento",
        variant: "destructive"
      });
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', editingEvent.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Evento removido com sucesso!"
      });

      setShowEditModal(false);
      setEditingEvent(null);
      resetFormData();
      fetchEvents();
    } catch (error) {
      console.error('Erro ao remover evento:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover evento",
        variant: "destructive"
      });
    }
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      boss_name: event.boss_name || "",
      start_time: formatDateForInput(event.start_time),
      end_time: event.end_time ? formatDateForInput(event.end_time) : "",
      max_participants: event.max_participants || 0,
      is_recurring: false, // Não implementado ainda
      recurring_type: "weekly"
    });
    setShowEditModal(true);
  };

  const sendDiscordNotification = async (event: Event) => {
    try {
      const response = await fetch('/api/discord-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_event',
          event: event
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar notificação Discord');
      }

      const result = await response.json();
      
      // Atualizar evento com ID da mensagem Discord
      if (result.message_id) {
        await supabase
          .from('events')
          .update({ discord_message_id: result.message_id })
          .eq('id', event.id);
      }
    } catch (error) {
      console.error('Erro ao enviar notificação Discord:', error);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesType = filterType === "all" || event.event_type === filterType;
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.boss_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const upcomingEvents = filteredEvents.filter(event => 
    new Date(event.start_time) > new Date() && event.status === 'planned'
  );

  const activeEvents = filteredEvents.filter(event => 
    event.status === 'active'
  );

  const pastEvents = filteredEvents.filter(event => 
    new Date(event.start_time) < new Date() || event.status === 'completed'
  );

  return (
    <Layout>
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Eventos do Clã</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Gerencie eventos, raids e atividades do clã</p>
          </div>
          {canCreateEvents && (
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Criar Evento</span>
                  <span className="sm:hidden">Criar</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Novo Evento</DialogTitle>
                  <DialogDescription>
                    Crie um novo evento para o clã. Uma notificação será enviada automaticamente para o Discord.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Título do Evento</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="Ex: Raid Nex"
                      />
                    </div>
                    <div>
                      <Label htmlFor="event_type">Tipo de Evento</Label>
                      <Select
                        value={formData.event_type}
                        onValueChange={(value) => setFormData({...formData, event_type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EVENT_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.event_type === 'pvm' && (
                    <div>
                      <Label htmlFor="boss_name">Boss/Minigame</Label>
                      <Select
                        value={formData.boss_name}
                        onValueChange={(value) => setFormData({...formData, boss_name: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o boss" />
                        </SelectTrigger>
                        <SelectContent>
                          {BOSS_LIST.map(boss => (
                            <SelectItem key={boss} value={boss}>
                              {boss}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_time">Data e Hora de Início</Label>
                      <Input
                        id="start_time"
                        type="datetime-local"
                        value={formData.start_time}
                        min={getMinDateTime()}
                        onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_time">Data e Hora de Fim (Opcional)</Label>
                      <Input
                        id="end_time"
                        type="datetime-local"
                        value={formData.end_time}
                        min={formData.start_time || getMinDateTime()}
                        onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="max_participants">Máximo de Participantes (Opcional)</Label>
                      <Input
                        id="max_participants"
                        type="number"
                        value={formData.max_participants}
                        onChange={(e) => setFormData({...formData, max_participants: parseInt(e.target.value) || 0})}
                        placeholder="0 = ilimitado"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_recurring"
                        checked={formData.is_recurring}
                        onChange={(e) => setFormData({...formData, is_recurring: e.target.checked})}
                      />
                      <Label htmlFor="is_recurring">Evento Recorrente</Label>
                    </div>
                  </div>

                  {formData.is_recurring && (
                    <div>
                      <Label htmlFor="recurring_type">Tipo de Recorrência</Label>
                      <Select
                        value={formData.recurring_type}
                        onValueChange={(value) => setFormData({...formData, recurring_type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Descreva o evento, requisitos, recompensas..."
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {
                      setShowCreateModal(false);
                      resetFormData();
                    }}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateEvent}>
                      Criar Evento
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:max-w-sm"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              {EVENT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
              Próximos ({upcomingEvents.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs sm:text-sm">
              Ativos ({activeEvents.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="text-xs sm:text-sm">
              Passados ({pastEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Carregando eventos...</div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum evento próximo encontrado
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingEvents.map((event) => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    onUpdate={fetchEvents}
                    onEdit={openEditModal}
                    canEdit={canEditEvents}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Carregando eventos...</div>
            ) : activeEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum evento ativo no momento
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {activeEvents.map((event) => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    onUpdate={fetchEvents}
                    onEdit={openEditModal}
                    canEdit={canEditEvents}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Carregando eventos...</div>
            ) : pastEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum evento passado encontrado
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {pastEvents.map((event) => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    onUpdate={fetchEvents}
                    onEdit={openEditModal}
                    canEdit={canEditEvents}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal de Edição */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Evento</DialogTitle>
              <DialogDescription>
                Edite os detalhes do evento. As mudanças serão aplicadas imediatamente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_title">Título do Evento</Label>
                  <Input
                    id="edit_title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Ex: Raid Nex"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_event_type">Tipo de Evento</Label>
                  <Select
                    value={formData.event_type}
                    onValueChange={(value) => setFormData({...formData, event_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.event_type === 'pvm' && (
                <div>
                  <Label htmlFor="edit_boss_name">Boss/Minigame</Label>
                  <Select
                    value={formData.boss_name}
                    onValueChange={(value) => setFormData({...formData, boss_name: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o boss" />
                    </SelectTrigger>
                    <SelectContent>
                      {BOSS_LIST.map(boss => (
                        <SelectItem key={boss} value={boss}>
                          {boss}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_start_time">Data e Hora de Início</Label>
                  <Input
                    id="edit_start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    min={editingEvent?.status === 'planned' ? getMinDateTime() : undefined}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_end_time">Data e Hora de Fim (Opcional)</Label>
                  <Input
                    id="edit_end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    min={formData.start_time || getMinDateTime()}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_max_participants">Máximo de Participantes (Opcional)</Label>
                  <Input
                    id="edit_max_participants"
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({...formData, max_participants: parseInt(e.target.value) || 0})}
                    placeholder="0 = ilimitado"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit_description">Descrição</Label>
                <Textarea
                  id="edit_description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descreva o evento, requisitos, recompensas..."
                  rows={4}
                />
              </div>

              <div className="flex justify-between items-center">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover Evento
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja remover o evento "{editingEvent?.title}"? 
                        Esta ação não pode ser desfeita e todos os dados do evento serão perdidos permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteEvent}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Sim, Remover Evento
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    setShowEditModal(false);
                    setEditingEvent(null);
                    resetFormData();
                  }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleEditEvent}>
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

interface EventCardProps {
  event: Event;
  onUpdate: () => void;
  onEdit: (event: Event) => void;
  canEdit: boolean;
}

const EventCard = ({ event, onUpdate, onEdit, canEdit }: EventCardProps) => {
  const { userRole } = useAuth();
  const { toast } = useToast();
  
  const getEventTypeIcon = (type: string) => {
    const eventType = EVENT_TYPES.find(et => et.value === type);
    return eventType?.icon || Calendar;
  };

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const EventTypeIcon = getEventTypeIcon(event.event_type);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Evento ${newStatus === 'cancelled' ? 'cancelado' : 'atualizado'} com sucesso`
      });

      onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar evento",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <EventTypeIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{event.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getEventStatusColor(event.status)}>
              {event.status === 'planned' ? 'Planejado' :
               event.status === 'active' ? 'Ativo' :
               event.status === 'completed' ? 'Concluído' : 'Cancelado'}
            </Badge>
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(event)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {event.boss_name && (
          <CardDescription className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            {event.boss_name}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {event.description && (
            <p className="text-sm text-muted-foreground">{event.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {format(new Date(event.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {event.current_participants}
              {event.max_participants && `/${event.max_participants}`}
            </div>
          </div>

          {userRole && ['leader', 'vice-leader', 'administrator', 'admin'].includes(userRole) && (
            <div className="flex gap-2 pt-2">
              {event.status === 'planned' && (
                <>
                  <Button size="sm" onClick={() => handleStatusChange('active')}>
                    Iniciar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleStatusChange('cancelled')}>
                    Cancelar
                  </Button>
                </>
              )}
              {event.status === 'active' && (
                <Button size="sm" onClick={() => handleStatusChange('completed')}>
                  Concluir
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Events; 
