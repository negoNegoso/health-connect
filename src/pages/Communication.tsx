import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Search, Phone, User, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Communication() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: patients, isLoading } = useQuery({
    queryKey: ["patients-communication"],
    queryFn: async () => {
      // Use late_patients view to get more info like days_overdue
      const { data, error } = await supabase
        .from("late_patients")
        .select("*")
        .order("full_name");

      if (error) {
        toast({
          title: "Erro ao carregar pacientes",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }
      return data;
    },
  });

  const filteredPatients = patients?.filter(patient =>
    (patient.full_name && patient.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (patient.cns && patient.cns.includes(searchTerm))
  );

  const handleWhatsAppClick = (phone: string | null, name: string | null, daysOverdue: number | null, nextDate: string | null) => {
    if (!phone) {
      toast({
        title: "Telefone não disponível",
        description: "Este paciente não possui número de telefone cadastrado.",
        variant: "destructive",
      });
      return;
    }

    const patientName = name || "Paciente";
    let message = `Olá ${patientName}, sou da equipe de saúde.`;

    if (daysOverdue && daysOverdue > 0) {
      message = `Olá ${patientName}, notamos que sua consulta está atrasada em ${daysOverdue} dias. Por favor, entre em contato para regularizarmos.`;
    } else if (nextDate) {
      const formattedDate = format(new Date(nextDate), "dd/MM/yyyy", { locale: ptBR });
      message = `Olá ${patientName}, lembrete de sua consulta agendada para ${formattedDate}.`;
    }

    // Remove non-numeric characters for the link
    const cleanPhone = phone.replace(/\D/g, "");
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/55${cleanPhone}?text=${encodedMessage}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-primary" />
          Comunicação
        </h1>
        <p className="text-muted-foreground mt-1">
          Entre em contato com os pacientes via WhatsApp
        </p>
      </div>

      <div className="flex w-full max-w-sm items-center space-x-2">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar paciente..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-32 bg-muted rounded-lg animate-pulse"></div>
          <div className="h-32 bg-muted rounded-lg animate-pulse"></div>
          <div className="h-32 bg-muted rounded-lg animate-pulse"></div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPatients?.map((patient) => (
            <Card key={patient.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-muted rounded-full">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{patient.full_name}</CardTitle>
                      <CardDescription className="text-xs">CNS: {patient.cns || "N/A"}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{patient.phone || "Sem telefone"}</span>
                  </div>

                  {patient.days_overdue && patient.days_overdue > 0 ? (
                    <div className="flex items-center gap-2 text-sm text-destructive font-medium">
                      <CalendarClock className="h-4 w-4" />
                      <span>{patient.days_overdue} dias atrasado</span>
                    </div>
                  ) : null}

                  <Button
                    className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white"
                    onClick={() => handleWhatsAppClick(patient.phone, patient.full_name, patient.days_overdue, patient.next_appointment_date)}
                    disabled={!patient.phone}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredPatients?.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              Nenhum paciente encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
