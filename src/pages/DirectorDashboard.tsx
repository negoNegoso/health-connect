import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Loader2 } from "lucide-react";

export default function DirectorDashboard() {
    const { data: analytics, isLoading } = useQuery({
        queryKey: ["director-analytics"],
        queryFn: async () => {
            // 1. Fetch Patients by Priority
            const { data: priorities, error: prioritiesError } = await supabase
                .from("patients")
                .select("manual_priority");

            if (prioritiesError) throw prioritiesError;

            const priorityCounts = priorities.reduce((acc, curr) => {
                const priority = curr.manual_priority || "Sem Prioridade";
                acc[priority] = (acc[priority] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const priorityData = [
                { name: "Não Definida", value: priorityCounts["Sem Prioridade"] || 0, color: "#9CA3AF" },
                { name: "Verde (Baixa)", value: priorityCounts["green"] || 0, color: "#22C55E" },
                { name: "Amarelo (Média)", value: priorityCounts["yellow"] || 0, color: "#EAB308" },
                { name: "Laranja (Alta)", value: priorityCounts["orange"] || 0, color: "#F97316" },
                { name: "Vermelho (Urgente)", value: priorityCounts["red"] || 0, color: "#EF4444" },
            ].filter(item => item.value > 0);

            // 2. Fetch Patients by Delay Range (using late_patients view logic)
            const { data: delays, error: delaysError } = await supabase
                .from("late_patients")
                .select("days_overdue");

            if (delaysError) throw delaysError;

            const delayRanges = {
                "Em dia": 0,
                "1-14 dias": 0,
                "15-30 dias": 0,
                "> 30 dias": 0,
            };

            delays.forEach((p) => {
                const days = p.days_overdue || 0;
                if (days <= 0) delayRanges["Em dia"]++;
                else if (days <= 14) delayRanges["1-14 dias"]++;
                else if (days <= 30) delayRanges["15-30 dias"]++;
                else delayRanges["> 30 dias"]++;
            });

            const delayData = Object.entries(delayRanges).map(([name, value]) => ({ name, value }));

            // 3. Fetch Effectiveness (Visits vs Appointments Created)
            // For simplicity, let's count total visits and total appointments in the last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { count: visitsCount } = await supabase
                .from("community_visits")
                .select("*", { count: "exact", head: true })
                .gte("created_at", thirtyDaysAgo.toISOString());

            const { count: appointmentsCount } = await supabase
                .from("appointments")
                .select("*", { count: "exact", head: true })
                .gte("created_at", thirtyDaysAgo.toISOString());

            const effectivenessData = [
                { name: "Visitas Realizadas", value: visitsCount || 0 },
                { name: "Consultas Agendadas", value: appointmentsCount || 0 },
            ];

            return { priorityData, delayData, effectivenessData };
        },
    });

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 container mx-auto p-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Painel do Diretor</h1>
                <p className="text-muted-foreground mt-1">Análise de desempenho e saúde da população</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Priority Distribution Chart */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Distribuição por Prioridade</CardTitle>
                        <CardDescription>Pacientes classificados por nível de urgência</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={analytics?.priorityData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {analytics?.priorityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Delay Levels Chart */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Níveis de Atraso</CardTitle>
                        <CardDescription>Pacientes por tempo de atraso na consulta</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics?.delayData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" fontSize={12} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#3B82F6" name="Pacientes" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Effectiveness Chart */}
                <Card className="col-span-1 md:col-span-2 lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Eficácia das Ações (30 dias)</CardTitle>
                        <CardDescription>Visitas realizadas vs Novas consultas</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics?.effectivenessData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
