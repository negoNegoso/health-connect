import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarIcon, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Agendada", variant: "default" },
  completed: { label: "Realizada", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "outline" },
  no_show: { label: "Faltou", variant: "destructive" },
};

export default function Appointments() {
  const [isOpen, setIsOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<string>("auto");

  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patient:patients(full_name),
          doctor:profiles!appointments_doctor_id_fkey(full_name)
        `)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: patients } = useQuery({
    queryKey: ["patients-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name")
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !date) throw new Error("Dados inválidos");

      const { error: appointmentError } = await supabase.from("appointments").insert({
        patient_id: patientId,
        doctor_id: profile.user_id,
        scheduled_date: date.toISOString(),
        notes,
      });

      if (appointmentError) throw appointmentError;

      // Update patient priority
      const { error: priorityError } = await supabase
        .from("patients")
        .update({ manual_priority: priority === "auto" ? null : priority })
        .eq("id", patientId);

      if (priorityError) throw priorityError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Consulta agendada com sucesso!" });
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Status atualizado!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setPatientId("");
    setDate(undefined);
    setNotes("");
    setPriority("auto");
    setIsOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Consultas</h1>
          <p className="text-muted-foreground mt-1">Gerencie os agendamentos</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Consulta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Agendar Consulta</DialogTitle>
                <DialogDescription>Preencha os dados da consulta</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Paciente *</Label>
                  <Select value={patientId} onValueChange={setPatientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data e Hora *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP 'às' HH:mm", { locale: ptBR }) : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade do Paciente (Território)</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automático (Padrão)</SelectItem>
                      <SelectItem value="green">Verde (Baixa)</SelectItem>
                      <SelectItem value="yellow">Amarelo (Média)</SelectItem>
                      <SelectItem value="orange">Laranja (Alta)</SelectItem>
                      <SelectItem value="red">Vermelho (Urgente)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observações sobre a consulta..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !patientId || !date}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Agendar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consultas Agendadas</CardTitle>
          <CardDescription>Lista de todas as consultas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : appointments?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma consulta agendada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Médico</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments?.map((apt) => (
                  <TableRow key={apt.id}>
                    <TableCell className="font-medium">{apt.patient?.full_name}</TableCell>
                    <TableCell>
                      {format(new Date(apt.scheduled_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{apt.doctor?.full_name}</TableCell>
                    <TableCell>
                      <Badge variant={statusLabels[apt.status]?.variant ?? "default"}>
                        {statusLabels[apt.status]?.label ?? apt.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={apt.status}
                        onValueChange={(status) => updateStatusMutation.mutate({ id: apt.id, status })}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Agendada</SelectItem>
                          <SelectItem value="completed">Realizada</SelectItem>
                          <SelectItem value="cancelled">Cancelada</SelectItem>
                          <SelectItem value="no_show">Faltou</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
