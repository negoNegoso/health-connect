import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, AlertTriangle, CheckCircle2, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Territory() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: latePatients, isLoading } = useQuery({
    queryKey: ["late-patients-territory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("late_patients")
        .select("*")
        .order("days_overdue", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: myVisits } = useQuery({
    queryKey: ["my-visits"],
    queryFn: async () => {
      if (!profile) return [];
      const { data, error } = await supabase
        .from("community_visits")
        .select("patient_id, status")
        .eq("agent_id", profile.user_id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  const createVisitMutation = useMutation({
    mutationFn: async (patientId: string) => {
      if (!profile) throw new Error("Usuário não autenticado");
      
      const { error } = await supabase.from("community_visits").insert({
        agent_id: profile.user_id,
        patient_id: patientId,
        status: "notified",
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-visits"] });
      toast({ title: "Paciente marcado como notificado!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar", description: error.message, variant: "destructive" });
    },
  });

  const getVisitStatus = (patientId: string | null) => {
    if (!patientId || !myVisits) return null;
    return myVisits.find((v) => v.patient_id === patientId)?.status;
  };

  const getSeverityColor = (daysOverdue: number | null) => {
    if (!daysOverdue) return "border-border";
    if (daysOverdue > 30) return "border-destructive bg-destructive/5";
    if (daysOverdue > 14) return "border-orange-500 bg-orange-50";
    return "border-yellow-500 bg-yellow-50";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <MapPin className="h-8 w-8 text-primary" />
          Minha Área
        </h1>
        <p className="text-muted-foreground mt-1">
          Pacientes que precisam de visita domiciliar
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : latePatients?.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-medium text-foreground">Nenhum paciente para visitar!</p>
              <p className="text-muted-foreground">Todos os pacientes estão em dia.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {latePatients?.map((patient) => {
            const visitStatus = getVisitStatus(patient.patient_id);
            const isNotified = visitStatus === "notified" || visitStatus === "visited";

            return (
              <Card 
                key={patient.patient_id} 
                className={`${getSeverityColor(patient.days_overdue)} transition-all`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-background rounded-full">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{patient.full_name}</CardTitle>
                        {patient.cns && (
                          <CardDescription className="text-xs">CNS: {patient.cns}</CardDescription>
                        )}
                      </div>
                    </div>
                    {patient.days_overdue && patient.days_overdue > 30 && (
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pb-3">
                  {patient.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{patient.address}</span>
                    </div>
                  )}
                  {patient.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${patient.phone}`} className="text-primary hover:underline">
                        {patient.phone}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Retorno era em{" "}
                      {patient.return_deadline_date
                        ? format(new Date(patient.return_deadline_date), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </span>
                  </div>
                  <Badge 
                    variant={patient.days_overdue && patient.days_overdue > 30 ? "destructive" : "secondary"}
                    className="mt-2"
                  >
                    {patient.days_overdue} dias em atraso
                  </Badge>
                </CardContent>
                <CardFooter className="pt-0">
                  {isNotified ? (
                    <Button variant="outline" className="w-full" disabled>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
                      Notificado
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      onClick={() => patient.patient_id && createVisitMutation.mutate(patient.patient_id)}
                      disabled={createVisitMutation.isPending}
                    >
                      Marcar como Notificado
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
