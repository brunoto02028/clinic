'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Calendar,
    Users,
    Clock,
    ClipboardList,
    ArrowRight,
    User,
    Activity,
    TrendingUp,
    Search,
    Plus,
    Bell,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

// Mock Data for the Preview
const MOCK_STATS = {
    todayAppointments: 8,
    weekAppointments: 42,
    totalPatients: 156,
    pendingAppointments: 3,
    revenueIncrease: 12.5,
    treatmentSuccess: 94,
    upcomingAppointments: [
        { id: "1", patient: { firstName: "Ana", lastName: "Silva" }, time: "10:30", type: "Fisioterapia Esportiva", status: "Confirmado" },
        { id: "2", patient: { firstName: "João", lastName: "Pereira" }, time: "11:45", type: "Reabilitação Pós-Operatória", status: "Confirmado" },
        { id: "3", patient: { firstName: "Maria", lastName: "Santos" }, time: "14:00", type: "Consulta Inicial", status: "Pendente" },
    ],
    recentPatients: [
        { id: "p1", name: "Carlos Oliveira", date: "Há 2 horas", diagnosis: "Lesão de LCA" },
        { id: "p2", name: "Beatriz Costa", date: "Há 4 horas", diagnosis: "Escoliose" },
        { id: "p3", name: "Ricardo Lima", date: "Ontem", diagnosis: "Tendinite" },
    ]
};

export default function PreviewPage() {
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-10">
            {/* Header Interativo */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Activity className="text-blue-600 h-8 w-8" />
                        Clinic Alpha Preview
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Explore a interface administrativa e as funcionalidades do sistema clínico.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar paciente..."
                            className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo
                    </Button>
                    <div className="relative ml-2">
                        <Button variant="outline" size="icon" className="rounded-full">
                            <Bell className="h-5 w-5" />
                        </Button>
                        <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 border-2 border-white dark:border-slate-950 rounded-full"></span>
                    </div>
                </div>
            </header>

            <Tabs defaultValue="overview" className="space-y-8">
                <TabsList className="bg-slate-200/50 dark:bg-slate-900/50 p-1 border border-slate-200 dark:border-slate-800">
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="patients">Pacientes</TabsTrigger>
                    <TabsTrigger value="scans">Escaneamentos 3D</TabsTrigger>
                    <TabsTrigger value="settings">Configurações</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8">
                    {/* Grid de Estatísticas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            label="Hoje"
                            value={MOCK_STATS.todayAppointments}
                            sub="Agendamentos"
                            icon={<Calendar />}
                            color="bg-blue-100 text-blue-600"
                        />
                        <StatCard
                            label="Taxa de Sucesso"
                            value={`${MOCK_STATS.treatmentSuccess}%`}
                            sub="Resultados AI"
                            icon={<CheckCircle2 />}
                            color="bg-emerald-100 text-emerald-600"
                        />
                        <StatCard
                            label="Pacientes Totais"
                            value={MOCK_STATS.totalPatients}
                            sub="+12 este mês"
                            icon={<Users />}
                            color="bg-violet-100 text-violet-600"
                        />
                        <StatCard
                            label="Receita Est."
                            value={`+${MOCK_STATS.revenueIncrease}%`}
                            sub="vs. mês passado"
                            icon={<TrendingUp />}
                            color="bg-amber-100 text-amber-600"
                        />
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Próximos Agendamentos */}
                        <Card className="lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div>
                                    <CardTitle className="text-xl">Próximos Agendamentos</CardTitle>
                                    <CardDescription>Sua agenda para as próximas horas.</CardDescription>
                                </div>
                                <Button variant="ghost" size="sm" className="text-blue-600">Ver Agenda</Button>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {MOCK_STATS.upcomingAppointments.map((apt) => (
                                        <div key={apt.id} className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 bg-white dark:bg-slate-900/50 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                                                    {apt.patient.firstName[0]}{apt.patient.lastName[0]}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">{apt.patient.firstName} {apt.patient.lastName}</h4>
                                                    <p className="text-sm text-slate-500">{apt.type}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant={apt.status === "Confirmado" ? "default" : "secondary"} className={apt.status === "Confirmado" ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : ""}>
                                                    {apt.status}
                                                </Badge>
                                                <div className="flex items-center gap-1 text-sm text-slate-500 mt-1 font-medium justify-end">
                                                    <Clock className="h-3 w-3" />
                                                    {apt.time}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Performance AI */}
                        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-xl">Análise de Performance</CardTitle>
                                <CardDescription>Monitoramento em tempo real.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Eficiência de Atendimento</span>
                                        <span className="font-bold">88%</span>
                                    </div>
                                    <Progress value={88} className="h-2 bg-slate-100 dark:bg-slate-800" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Retenção de Pacientes</span>
                                        <span className="font-bold">92%</span>
                                    </div>
                                    <Progress value={92} className="h-2 bg-slate-100 dark:bg-slate-800" />
                                </div>
                                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 mt-4">
                                    <div className="flex gap-3">
                                        <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Dica da AI</p>
                                            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">Você tem 3 pacientes que não agendam há mais de 30 dias. Considere enviar um lembrete automático.</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="patients">
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold">Módulo de Pacientes</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mt-2">Aqui você poderá gerenciar prontuários, documentos e histórico de tratamento em tempo real.</p>
                            <Button variant="outline" className="mt-6">Explorar Protótipo</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="scans">
                    <Card>
                        <CardContent className="p-12 text-center text-slate-400">
                            <Activity className="h-12 w-12 mx-auto mb-4" />
                            Módulo de Escaneamento 3D em desenvolvimento.
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Footer do Preview */}
            <footer className="mt-20 pt-10 border-t border-slate-200 dark:border-slate-800 text-center">
                <p className="text-sm text-slate-400">
                    Visualização em Modo Preview - Clinic Automation System v1.0
                </p>
                <div className="flex justify-center gap-6 mt-4">
                    <Link href="/test" className="text-xs text-blue-600 hover:underline">Voltar para Teste de Ambiente</Link>
                    <Link href="/" className="text-xs text-blue-600 hover:underline">Página de Login (Real)</Link>
                </div>
            </footer>
        </div>
    );
}

function StatCard({ label, value, sub, icon, color }: any) {
    return (
        <div>
            <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden relative">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-2xl ${color}`}>
                            {icon}
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{value}</h3>
                            <span className="text-xs font-medium text-slate-500">{sub}</span>
                        </div>
                    </div>
                    {/* Subtle Background Pattern */}
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-slate-900 dark:text-white">
                        {icon && <div className="h-24 w-24 transform rotate-12">{icon}</div>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
