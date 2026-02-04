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
import { Plus, CalendarIcon, Loader2, FileText, AlertTriangle, Pencil, Search, ArrowUpDown } from "lucide-react";
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
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!profile) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("medical_records").update({
        diagnosis,
        prescription,
        clinical_notes: clinicalNotes,
        return_deadline_date: returnDate ? format(returnDate, "yyyy-MM-dd") : null,
      }).eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-records"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Prontuário atualizado com sucesso!" });
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setPatientId("");
    setDiagnosis("");
    setPrescription("");
    setClinicalNotes("");
    setReturnDate(undefined);
    setEditingRecord(null);
    setIsOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecord) {
      updateMutation.mutate(editingRecord.id);
    } else {
      createMutation.mutate();
    }
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setPatientId(record.patient_id);
    setDiagnosis(record.diagnosis || "");
    setPrescription(record.prescription || "");
    setClinicalNotes(record.clinical_notes || "");
    setReturnDate(record.return_deadline_date ? new Date(record.return_deadline_date) : undefined);
    setIsOpen(true);
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    return isBefore(new Date(dateStr), new Date());
  };

  const filteredRecords = records
    ?.filter((record) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        record.patient?.full_name.toLowerCase().includes(searchLower) ||
        record.diagnosis?.toLowerCase().includes(searchLower) ||
        record.prescription?.toLowerCase().includes(searchLower) ||
        record.clinical_notes?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

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
                <DialogTitle>{editingRecord ? "Editar Prontuário" : "Novo Prontuário"}</DialogTitle>
                <DialogDescription>
                  {editingRecord ? "Atualize os dados do prontuário" : "Registre os dados da consulta e a data de retorno"}
                </DialogDescription>
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
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || !patientId}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRecord ? "Atualizar" : "Registrar"}
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
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por paciente, diagnóstico, medicamentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Mais Recentes</SelectItem>
                <SelectItem value="asc">Mais Antigos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRecords?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum prontuário encontrado
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
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords?.map((record) => (
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
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(record)}
                        disabled={record.doctor_id !== profile?.user_id}
                        title={record.doctor_id !== profile?.user_id ? "Apenas o médico responsável pode editar" : "Editar"}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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
