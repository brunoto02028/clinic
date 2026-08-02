"use client";

import React from "react";

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|__(.+?)__|_(.+?)_|\*(.+?)\*|`(.+?)`)/gs;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={m.index}><em>{m[2]}</em></strong>);
    else if (m[3]) parts.push(<strong key={m.index}>{m[3]}</strong>);
    else if (m[4]) parts.push(<strong key={m.index}>{m[4]}</strong>);
    else if (m[5]) parts.push(<em key={m.index}>{m[5]}</em>);
    else if (m[6]) parts.push(<em key={m.index}>{m[6]}</em>);
    else if (m[7]) parts.push(<code key={m.index} className="bg-muted px-1 py-0.5 rounded text-[0.85em] font-mono">{m[7]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

interface Props {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className = "" }: Props) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let listItems: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listItems.length === 0) return;
    const key = `list-${i}`;
    if (listType === "ul") {
      elements.push(
        <ul key={key} className="list-disc list-inside space-y-0.5 my-1 ml-2">
          {listItems}
        </ul>
      );
    } else {
      elements.push(
        <ol key={key} className="list-decimal list-inside space-y-0.5 my-1 ml-2">
          {listItems}
        </ol>
      );
    }
    listItems = [];
    listType = null;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={`hr-${i}`} className="border-border/40 my-2" />);
      i++;
      continue;
    }

    // Headings
    const h3 = trimmed.match(/^###\s+(.*)/);
    const h2 = trimmed.match(/^##\s+(.*)/);
    const h1 = trimmed.match(/^#\s+(.*)/);
    if (h3) {
      flushList();
      elements.push(<p key={`h-${i}`} className="font-semibold text-sm mt-2 mb-0.5">{parseInline(h3[1])}</p>);
      i++; continue;
    }
    if (h2) {
      flushList();
      elements.push(<p key={`h-${i}`} className="font-bold text-sm mt-2 mb-0.5">{parseInline(h2[1])}</p>);
      i++; continue;
    }
    if (h1) {
      flushList();
      elements.push(<p key={`h-${i}`} className="font-bold text-[15px] mt-2 mb-1">{parseInline(h1[1])}</p>);
      i++; continue;
    }

    // Unordered list
    const ul = trimmed.match(/^[-*+]\s+(.*)/);
    if (ul) {
      if (listType !== "ul") { flushList(); listType = "ul"; }
      listItems.push(<li key={`li-${i}`} className="text-[inherit]">{parseInline(ul[1])}</li>);
      i++; continue;
    }

    // Ordered list
    const ol = trimmed.match(/^\d+\.\s+(.*)/);
    if (ol) {
      if (listType !== "ol") { flushList(); listType = "ol"; }
      listItems.push(<li key={`li-${i}`} className="text-[inherit]">{parseInline(ol[1])}</li>);
      i++; continue;
    }

    // Blank line
    if (trimmed === "") {
      flushList();
      elements.push(<div key={`br-${i}`} className="h-1.5" />);
      i++; continue;
    }

    // Regular paragraph
    flushList();
    elements.push(<p key={`p-${i}`} className="leading-relaxed">{parseInline(trimmed)}</p>);
    i++;
  }

  flushList();

  return (
    <div className={`text-sm space-y-0.5 ${className}`}>
      {elements}
    </div>
  );
}
