import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, AlertTriangle, FileText, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { profile, role } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", role],
    queryFn: async () => {
      const [patientsResult, appointmentsResult, lateResult] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
        supabase.from("late_patients").select("patient_id", { count: "exact", head: true }),
      ]);

      return {
        totalPatients: patientsResult.count ?? 0,
        scheduledAppointments: appointmentsResult.count ?? 0,
        latePatients: lateResult.count ?? 0,
      };
    },
  });

  const roleGreetings = {
    doctor: "Boas-vindas, Dr(a). ",
    nurse: "Boas-vindas, Enf. ",
    agent: "Boas-vindas, ",
  };

  const firstName = profile?.full_name.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {role && roleGreetings[role]}{firstName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Aqui está o resumo do seu dia
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(role === "doctor" || role === "nurse") && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Pacientes
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.totalPatients}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Consultas Agendadas
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.scheduledAppointments}</div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {(role === "nurse" || role === "agent") && (
          <Card className="border-destructive/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-destructive">
                Pacientes em Atraso
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-destructive">{stats?.latePatients}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Requerem atenção imediata
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {role === "doctor" && (
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesse rapidamente as funções principais</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <a href="/patients" className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Gerenciar Pacientes</p>
                <p className="text-sm text-muted-foreground">Cadastrar ou buscar pacientes</p>
              </div>
            </a>
            <a href="/records" className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Prontuários</p>
                <p className="text-sm text-muted-foreground">Registrar consultas</p>
              </div>
            </a>
          </CardContent>
        </Card>
      )}

      {role === "nurse" && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Busca Ativa
            </CardTitle>
            <CardDescription>
              Pacientes que ultrapassaram a data de retorno recomendada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/busca-ativa" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 px-4 py-2">
              Ver Pacientes em Atraso
            </a>
          </CardContent>
        </Card>
      )}

      {role === "agent" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Minha Área
            </CardTitle>
            <CardDescription>
              Gerencie as visitas domiciliares da sua região
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/territory" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              Ver Pacientes para Visita
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
