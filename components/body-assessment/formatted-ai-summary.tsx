"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Brain, AlertTriangle, Target, Stethoscope, Dumbbell, Clock, FileText, CheckCircle2 } from "lucide-react";

interface FormattedAISummaryProps {
  text: string;
  locale?: string;
}

// Parse markdown-like AI text into structured sections
function parseAISummary(raw: string) {
  const sections: { title: string; content: string[]; severity?: string }[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];

  const lines = raw.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect headers: ## Header, **Header**, # Header
    const h2Match = trimmed.match(/^#{1,3}\s+(.+)/);
    const boldHeaderMatch = trimmed.match(/^\*\*([^*]{3,})\*\*\s*$/);
    const numberedHeaderMatch = trimmed.match(/^\d+\.\s+\*\*(.+?)\*\*/);

    if (h2Match || boldHeaderMatch) {
      // Save previous section
      if (currentTitle || currentLines.length > 0) {
        sections.push({ title: currentTitle, content: [...currentLines] });
        currentLines = [];
      }
      currentTitle = (h2Match?.[1] || boldHeaderMatch?.[1] || "").replace(/\*\*/g, "").trim();
    } else if (numberedHeaderMatch && trimmed.length < 120) {
      // Numbered section header like "1. **Clinical Hypotheses**"
      if (currentTitle || currentLines.length > 0) {
        sections.push({ title: currentTitle, content: [...currentLines] });
        currentLines = [];
      }
      currentTitle = numberedHeaderMatch[1].replace(/\*\*/g, "").trim();
    } else {
      currentLines.push(trimmed);
    }
  }

  // Push last section
  if (currentTitle || currentLines.length > 0) {
    sections.push({ title: currentTitle, content: [...currentLines] });
  }

  return sections;
}

// Format inline markdown: **bold**, *italic*
function formatInline(text: string) {
  const parts: (string | JSX.Element)[] = [];
  // Split by **bold** patterns
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={match.index} className="font-semibold text-foreground">{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// Get an icon for common section titles
function getSectionIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes("clinical") || t.includes("assessment") || t.includes("avaliação") || t.includes("análise")) return Brain;
  if (t.includes("hypothesis") || t.includes("hipótese") || t.includes("finding")) return Target;
  if (t.includes("recommendation") || t.includes("recomend") || t.includes("treatment") || t.includes("tratamento")) return Stethoscope;
  if (t.includes("exercise") || t.includes("exercício") || t.includes("rehabilitation") || t.includes("reabilitação")) return Dumbbell;
  if (t.includes("goal") || t.includes("objetivo") || t.includes("short-term") || t.includes("long-term")) return Clock;
  if (t.includes("precaution") || t.includes("warning") || t.includes("alert") || t.includes("risk") || t.includes("risco")) return AlertTriangle;
  if (t.includes("instruction") || t.includes("instrução") || t.includes("note") || t.includes("nota")) return FileText;
  if (t.includes("summary") || t.includes("resumo") || t.includes("conclusion") || t.includes("prognosis")) return CheckCircle2;
  return null;
}

function SectionCard({ title, content, defaultOpen = false }: { title: string; content: string[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = getSectionIcon(title);

  // Determine if content has bullet points
  const formattedContent = content.map((line, i) => {
    const isBullet = line.startsWith("- ") || line.startsWith("• ") || line.startsWith("* ") || line.match(/^[a-z]\)\s/i);
    const isNumbered = line.match(/^\d+[\.\)]\s/);
    const isKeyValue = line.match(/^\*\*(.+?)\*\*[:\s]/);

    if (isBullet) {
      const text = line.replace(/^[-•*]\s+/, "").replace(/^[a-z]\)\s+/i, "");
      return (
        <li key={i} className="flex items-start gap-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 flex-shrink-0" />
          <span className="text-sm text-muted-foreground leading-relaxed">{formatInline(text)}</span>
        </li>
      );
    }

    if (isNumbered) {
      return (
        <li key={i} className="flex items-start gap-2 py-0.5">
          <span className="text-xs font-bold text-primary/70 mt-0.5 flex-shrink-0 w-4">{line.match(/^\d+/)![0]}.</span>
          <span className="text-sm text-muted-foreground leading-relaxed">{formatInline(line.replace(/^\d+[\.\)]\s+/, ""))}</span>
        </li>
      );
    }

    if (isKeyValue) {
      return (
        <div key={i} className="py-0.5">
          <span className="text-sm text-muted-foreground leading-relaxed">{formatInline(line)}</span>
        </div>
      );
    }

    return (
      <p key={i} className="text-sm text-muted-foreground leading-relaxed py-0.5">
        {formatInline(line)}
      </p>
    );
  });

  if (!title) {
    // Untitled intro section — always open
    return (
      <div className="space-y-1 mb-3">
        {formattedContent}
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors text-left"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
        {Icon && <Icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
        <span className="text-sm font-semibold flex-1">{title}</span>
        <Badge variant="outline" className="text-[9px] h-4 px-1.5">{content.length} items</Badge>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 border-t space-y-0.5">
          <ul className="space-y-0.5">{formattedContent}</ul>
        </div>
      )}
    </div>
  );
}

export function FormattedAISummary({ text, locale }: FormattedAISummaryProps) {
  const isPt = locale === "pt-BR";
  const sections = parseAISummary(text);

  if (sections.length === 0) {
    return <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{text}</p>;
  }

  // If only 1 section with no title, just render the text nicely
  if (sections.length === 1 && !sections[0].title) {
    return (
      <div className="space-y-1">
        {sections[0].content.map((line, i) => (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">{formatInline(line)}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sections.map((sec, i) => (
        <SectionCard
          key={i}
          title={sec.title}
          content={sec.content}
          defaultOpen={i === 0}
        />
      ))}
    </div>
  );
}
