import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarIcon, Loader2, FileText, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function MedicalRecords() {
  const [isOpen, setIsOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [returnDate, setReturnDate] = useState<Date>();
  
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: records, isLoading } = useQuery({
    queryKey: ["medical-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_records")
        .select(`
          *,
          patient:patients(full_name),
          doctor:profiles!medical_records_doctor_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false });
      
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
      if (!profile) throw new Error("Usuário não autenticado");
      
      const { error } = await supabase.from("medical_records").insert({
        patient_id: patientId,
        doctor_id: profile.user_id,
        diagnosis,
        prescription,
        clinical_notes: clinicalNotes,
        return_deadline_date: returnDate ? format(returnDate, "yyyy-MM-dd") : null,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-records"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Prontuário registrado com sucesso!" });
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setPatientId("");
    setDiagnosis("");
    setPrescription("");
    setClinicalNotes("");
    setReturnDate(undefined);
    setIsOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    return isBefore(new Date(dateStr), new Date());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Prontuários</h1>
          <p className="text-muted-foreground mt-1">Registre e visualize os prontuários médicos</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Novo Prontuário</DialogTitle>
                <DialogDescription>Registre os dados da consulta e a data de retorno</DialogDescription>
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
                  <Label htmlFor="diagnosis">Diagnóstico</Label>
                  <Textarea
                    id="diagnosis"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="Diagnóstico ou hipótese diagnóstica..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prescription">Prescrição</Label>
                  <Textarea
                    id="prescription"
                    value={prescription}
                    onChange={(e) => setPrescription(e.target.value)}
                    placeholder="Medicamentos e orientações..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinicalNotes">Anotações Clínicas</Label>
                  <Textarea
                    id="clinicalNotes"
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Observações gerais sobre o atendimento..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Data de Retorno Recomendada
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Esta data será usada para identificar pacientes em atraso na Busca Ativa
                  </p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !returnDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {returnDate ? format(returnDate, "PPP", { locale: ptBR }) : "Selecione a data de retorno"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={returnDate}
                        onSelect={setReturnDate}
                        disabled={(date) => isBefore(date, new Date())}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !patientId}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Prontuários Recentes
          </CardTitle>
          <CardDescription>Últimos registros médicos</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : records?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum prontuário registrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Diagnóstico</TableHead>
                  <TableHead>Data Retorno</TableHead>
                  <TableHead>Médico</TableHead>
                  <TableHead>Data Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.patient?.full_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {record.diagnosis || "-"}
                    </TableCell>
                    <TableCell>
                      {record.return_deadline_date ? (
                        <span className={cn(
                          "inline-flex items-center gap-1",
                          isOverdue(record.return_deadline_date) && "text-destructive font-medium"
                        )}>
                          {isOverdue(record.return_deadline_date) && <AlertTriangle className="h-3 w-3" />}
                          {format(new Date(record.return_deadline_date), "dd/MM/yyyy")}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{record.doctor?.full_name}</TableCell>
                    <TableCell>
                      {format(new Date(record.created_at), "dd/MM/yyyy", { locale: ptBR })}
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
