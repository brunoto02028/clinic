"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X, Sparkles, Loader2 } from "lucide-react";

interface EditableTextFieldProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  onAiEnhance?: (currentValue: string) => Promise<string>;
  label?: string;
  placeholder?: string;
  rows?: number;
  locale?: string;
  className?: string;
}

export function EditableTextField({
  value,
  onSave,
  onAiEnhance,
  label,
  placeholder,
  rows = 4,
  locale = "en",
  className = "",
}: EditableTextFieldProps) {
  const isPt = locale === "pt-BR";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const handleSave = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAiEnhance = async () => {
    if (!onAiEnhance) return;
    setEnhancing(true);
    try {
      const enhanced = await onAiEnhance(draft || value);
      setDraft(enhanced);
      if (!editing) setEditing(true);
    } catch (err) {
      console.error("AI enhance failed:", err);
    } finally {
      setEnhancing(false);
    }
  };

  if (!editing) {
    return (
      <div className={`group relative ${className}`}>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{value || <span className="text-muted-foreground italic">{placeholder || (isPt ? "Nenhum conteúdo" : "No content")}</span>}</p>
        <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onAiEnhance && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAiEnhance} disabled={enhancing} title={isPt ? "Melhorar com IA" : "Enhance with AI"}>
              {enhancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDraft(value); setEditing(true); }} title={isPt ? "Editar" : "Edit"}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="text-sm"
      />
      <div className="flex items-center gap-2 justify-end">
        {onAiEnhance && (
          <Button variant="outline" size="sm" onClick={handleAiEnhance} disabled={enhancing || saving} className="text-xs">
            {enhancing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-500" />}
            {isPt ? "IA Melhorar" : "AI Enhance"}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => { setDraft(value); setEditing(false); }} disabled={saving} className="text-xs">
          <X className="h-3.5 w-3.5 mr-1" /> {isPt ? "Cancelar" : "Cancel"}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
          {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
          {isPt ? "Salvar" : "Save"}
        </Button>
      </div>
    </div>
  );
}

export default EditableTextField;
