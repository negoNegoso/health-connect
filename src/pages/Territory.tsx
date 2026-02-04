import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, AlertTriangle, CheckCircle2, Calendar, User, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import MapComponent from "@/components/MapComponent";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutList, Map as MapIcon } from "lucide-react";

export default function Territory() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleWhatsAppClick = (phone: string | null, name: string, daysOverdue: number | null, nextDate: string | null) => {
    if (!phone) {
      toast({
        title: "Telefone não disponível",
        description: "Este paciente não possui número de telefone cadastrado.",
        variant: "destructive",
      });
      return;
    }

    let message = `Olá ${name}, sou da equipe de saúde.`;

    if (daysOverdue && daysOverdue > 0) {
      message = `Olá ${name}, notamos que sua consulta está atrasada em ${daysOverdue} dias. Por favor, entre em contato para regularizarmos.`;
    } else if (nextDate) {
      const formattedDate = format(new Date(nextDate), "dd/MM/yyyy", { locale: ptBR });
      message = `Olá ${name}, lembrete de sua consulta agendada para ${formattedDate}.`;
    }

    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleanPhone}?text=${encodedMessage}`, "_blank");
  };

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

  const getSeverityColor = (daysOverdue: number | null, manualPriority: string | null) => {
    if (manualPriority) {
      switch (manualPriority) {
        case 'red': return "border-destructive bg-destructive/5";
        case 'orange': return "border-orange-500 bg-orange-50";
        case 'yellow': return "border-yellow-500 bg-yellow-50";
        case 'green': return "border-green-500 bg-green-50";
      }
    }
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

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">
            <LayoutList className="h-4 w-4 mr-2" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="map">
            <MapIcon className="h-4 w-4 mr-2" />
            Mapa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
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
                    className={`${getSeverityColor(patient.days_overdue, patient.manual_priority)} transition-all`}
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

                      {/* Manual Priority Removed as requested */}

                      <Badge
                        variant={
                          patient.manual_priority === 'red' ? "destructive" :
                            patient.manual_priority === 'orange' ? "default" : // Orange badge not std, use default
                              patient.manual_priority === 'yellow' ? "secondary" :
                                patient.manual_priority === 'green' ? "outline" :
                                  (patient.days_overdue && patient.days_overdue > 30 ? "destructive" : "secondary")
                        }
                        className="mt-2"
                      >
                        {patient.days_overdue} dias em atraso
                      </Badge>
                    </CardContent>
                    <CardFooter className="pt-0 gap-2">
                      {isNotified ? (
                        <Button variant="outline" className="w-full flex-1" disabled>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
                          Notificado
                        </Button>
                      ) : (
                        <Button
                          className="w-full flex-1"
                          onClick={() => patient.patient_id && createVisitMutation.mutate(patient.patient_id)}
                          disabled={createVisitMutation.isPending}
                        >
                          Marcar como Notificado
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        className="w-full flex-1 bg-[#25D366] hover:bg-[#25D366]/90 text-white border-0"
                        onClick={() => handleWhatsAppClick(patient.phone, patient.full_name || "", patient.days_overdue, patient.next_appointment_date)}
                        disabled={!patient.phone}
                        title="Conversar no WhatsApp"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          {isLoading ? (
            <Skeleton className="h-[500px] w-full rounded-lg" />
          ) : (
            <MapComponent
              markers={latePatients?.filter(p => p.latitude && p.longitude).map(p => {
                let statusColor: 'green' | 'yellow' | 'orange' | 'red' = 'green';

                if (p.manual_priority) {
                  statusColor = p.manual_priority as 'green' | 'yellow' | 'orange' | 'red';
                } else if (p.days_overdue) {
                  if (p.days_overdue > 30) statusColor = 'red';
                  else if (p.days_overdue > 14) statusColor = 'orange';
                  else statusColor = 'yellow';
                }

                return {
                  id: p.patient_id || Math.random().toString(),
                  lat: p.latitude!,
                  lng: p.longitude!,
                  title: p.full_name || 'Paciente',
                  description: `${p.days_overdue || 0} dias atrasado`,
                  statusColor,
                  onWhatsAppClick: () => handleWhatsAppClick(p.phone, p.full_name || "", p.days_overdue, p.next_appointment_date),
                  hasPhone: !!p.phone
                };
              }) || []}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
