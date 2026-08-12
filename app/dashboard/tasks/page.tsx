"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Bell, CheckCircle2, Clock, AlertTriangle, Loader2,
  FileText, Mic, Shield, User, CreditCard, CalendarCheck,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

const TYPE_ICONS: Record<string, any> = {
  UPLOAD_DOCUMENT: FileText,
  COMPLETE_SCREENING: Shield,
  RECORD_AUDIO: Mic,
  SIGN_CONSENT: FileText,
  UPDATE_PROFILE: User,
  CONFIRM_APPOINTMENT: CalendarCheck,
  PAY_INVOICE: CreditCard,
  CUSTOM: Bell,
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "border-l-red-500",
  high: "border-l-orange-500",
  normal: "border-l-blue-500",
  low: "border-l-gray-400",
};

export default function PatientTasksPage() {
  const { toast } = useToast();
  const { locale } = useLocale();
  const isPt = locale?.startsWith("pt");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/patient/tasks?status=active");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {
      toast({ title: isPt ? "Falha ao carregar tarefas" : "Failed to load tasks", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, []);

  const markComplete = async (taskId: string) => {
    try {
      const res = await fetch("/api/patient/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: "completed" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: isPt ? "Tarefa concluida!" : "Task completed!" });
      fetchTasks();
    } catch {
      toast({ title: isPt ? "Erro" : "Error", variant: "destructive" });
    }
  };

  const getTitle = (task: any) => (isPt && task.titlePt) ? task.titlePt : task.title;
  const getDesc = (task: any) => (isPt && task.descriptionPt) ? task.descriptionPt : task.description;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bell className="h-6 w-6 text-violet-500" />
          {isPt ? "Acoes Pendentes" : "Pending Actions"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isPt
            ? "Acoes solicitadas pela sua clinica. Complete-as para um melhor atendimento."
            : "Actions requested by your clinic. Complete them for the best care experience."}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
            <p className="text-lg font-medium text-foreground">
              {isPt ? "Tudo em dia!" : "All caught up!"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isPt ? "Nenhuma acao pendente no momento." : "No pending actions at this time."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const Icon = TYPE_ICONS[task.type] || Bell;
            const borderClass = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal;

            return (
              <Card key={task.id} className={`border-l-4 ${borderClass} hover:shadow-md transition-shadow`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 mt-0.5">
                        <Icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{getTitle(task)}</h3>
                        {getDesc(task) && (
                          <p className="text-sm text-muted-foreground mt-1">{getDesc(task)}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {task.priority === "urgent" && (
                            <Badge className="bg-red-500 text-white text-[10px]">
                              <AlertTriangle className="h-3 w-3 mr-0.5" />
                              {isPt ? "Urgente" : "Urgent"}
                            </Badge>
                          )}
                          {task.priority === "high" && (
                            <Badge className="bg-orange-500 text-white text-[10px]">
                              {isPt ? "Alta prioridade" : "High priority"}
                            </Badge>
                          )}
                          {task.dueDate && (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              <Clock className="h-3 w-3" />
                              {isPt ? "Prazo:" : "Due:"} {new Date(task.dueDate).toLocaleDateString(isPt ? "pt-BR" : "en-GB")}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(task.createdAt).toLocaleDateString(isPt ? "pt-BR" : "en-GB")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {task.actionUrl && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={task.actionUrl}>{isPt ? "Ir" : "Go"}</a>
                        </Button>
                      )}
                      <Button size="sm" onClick={() => markComplete(task.id)} className="gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isPt ? "Feito" : "Done"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
