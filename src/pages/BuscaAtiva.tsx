import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Phone, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function BuscaAtiva() {
  const { data: latePatients, isLoading } = useQuery({
    queryKey: ["late-patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("late_patients")
        .select("*")
        .order("days_overdue", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const getSeverityBadge = (daysOverdue: number | null) => {
    if (!daysOverdue) return null;
    if (daysOverdue > 30) {
      return <Badge variant="destructive">Crítico ({daysOverdue} dias)</Badge>;
    }
    if (daysOverdue > 14) {
      return <Badge className="bg-orange-500 hover:bg-orange-600">Alto ({daysOverdue} dias)</Badge>;
    }
    return <Badge variant="secondary">{daysOverdue} dias</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          Busca Ativa
        </h1>
        <p className="text-muted-foreground mt-1">
          Pacientes que ultrapassaram a data de retorno recomendada e não têm consulta agendada
        </p>
      </div>

      <Card className="border-destructive/30">
        <CardHeader className="bg-destructive/5">
          <CardTitle className="text-destructive">Pacientes em Atraso</CardTitle>
          <CardDescription>
            {latePatients?.length ?? 0} paciente(s) requerem atenção imediata
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : latePatients?.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-medium text-foreground">Nenhum paciente em atraso!</p>
              <p className="text-muted-foreground">Todos os pacientes estão em dia com seus retornos.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>CNS</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Território</TableHead>
                  <TableHead>Data Retorno</TableHead>
                  <TableHead>Atraso</TableHead>
                  <TableHead>Último Diagnóstico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latePatients?.map((patient) => (
                  <TableRow key={patient.patient_id} className="hover:bg-destructive/5">
                    <TableCell className="font-medium">{patient.full_name}</TableCell>
                    <TableCell>{patient.cns ?? "-"}</TableCell>
                    <TableCell>
                      {patient.phone ? (
                        <a href={`tel:${patient.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                          <Phone className="h-3 w-3" />
                          {patient.phone}
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {patient.territory ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {patient.territory}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {patient.return_deadline_date
                        ? format(new Date(patient.return_deadline_date), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell>{getSeverityBadge(patient.days_overdue)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {patient.last_diagnosis || "-"}
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
