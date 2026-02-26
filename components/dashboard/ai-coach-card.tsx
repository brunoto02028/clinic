"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";

export default function AICoachCard() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [tip, setTip] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasData, setHasData] = useState(true);

  const fetchTip = async (force = false) => {
    try {
      const url = force ? "/api/patient/ai-coach?refresh=1" : "/api/patient/ai-coach";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTip(data.tip);
        setTitle(data.title);
        setHasData(data.hasData !== false);
      }
    } catch {}
  };

  useEffect(() => {
    fetchTip().finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTip(true);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />
        <CardContent className="p-5 flex items-center justify-center min-h-[80px]">
          <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
        </CardContent>
      </Card>
    );
  }

  if (!tip) return null;

  return (
    <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-card overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="text-sm font-semibold text-violet-300 flex items-center gap-1.5">
                {isPt ? "Coach IA" : "AI Coach"}
                {title && <span className="text-xs font-normal text-muted-foreground">— {title}</span>}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-violet-400"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
