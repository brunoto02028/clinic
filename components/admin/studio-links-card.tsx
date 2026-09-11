"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, LogIn, UserPlus } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

// The trainer's shareable studio links. Personal-trainer tenants only — the
// branded login (/studio/[slug]) and the invite/sign-up (/join/[slug]).
export default function StudioLinksCard() {
  const { data: session } = useSession();
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const user = session?.user as any;
  const [copied, setCopied] = useState<string | null>(null);

  if (user?.clinicType !== "PERSONAL_TRAINER" || !user?.clinicSlug) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const slug = user.clinicSlug as string;
  const links = [
    {
      key: "login",
      icon: LogIn,
      label: isPt ? "Login do aluno" : "Student login",
      hint: isPt ? "Onde seus alunos entram" : "Where your students sign in",
      url: `${origin}/studio/${slug}`,
    },
    {
      key: "join",
      icon: UserPlus,
      label: isPt ? "Convite (cadastro)" : "Invite (sign-up)",
      hint: isPt ? "Para novos alunos criarem conta" : "For new students to create an account",
      url: `${origin}/join/${slug}`,
    },
  ];

  const copy = async (key: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch { /* clipboard blocked — the field is selectable as a fallback */ }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{isPt ? "Links do seu estúdio" : "Your studio links"}</CardTitle>
        <CardDescription>
          {isPt ? "Compartilhe com seus alunos para acessarem a área deles." : "Share these with your students to reach their area."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {links.map((l) => (
          <div key={l.key} className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
            <l.icon className="h-4 w-4 flex-shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{l.label}</p>
              <p className="text-xs text-muted-foreground">{l.hint}</p>
              <p className="truncate text-xs font-mono text-muted-foreground/80" title={l.url}>{l.url}</p>
            </div>
            <Button type="button" size="sm" variant="outline" className="flex-shrink-0 gap-1.5" onClick={() => copy(l.key, l.url)}>
              {copied === l.key ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === l.key ? (isPt ? "Copiado" : "Copied") : (isPt ? "Copiar" : "Copy")}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
