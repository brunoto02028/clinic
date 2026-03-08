"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Pencil, Check, X, MessageSquare, Loader2, Send, Sparkles, Copy, RotateCcw, Mic, MicOff,
} from "lucide-react";

interface ChatMessage {
  role: "therapist" | "ai";
  content: string;
  timestamp: Date;
}

interface AiChatFieldProps {
  value: string;
  assessmentId: string;
  field: string;
  onSave: (newValue: string) => Promise<void>;
  onChange?: (newValue: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  locale?: string;
  className?: string;
}

export function AiChatField({
  value,
  assessmentId,
  field,
  onSave,
  onChange,
  label,
  placeholder,
  rows = 4,
  locale = "en",
  className = "",
}: AiChatFieldProps) {
  const isPt = locale === "pt-BR";
  const [editing, setEditing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraftInternal] = useState(value);
  const setDraft = (val: string | ((prev: string) => string)) => {
    setDraftInternal((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      onChange?.(next);
      return next;
    });
  };
  const [saving, setSaving] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [listening, setListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!editing && !chatOpen) setDraftInternal(value);
  }, [value, editing, chatOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (chatOpen && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [chatOpen]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editing]);

  const handleSave = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
      setChatOpen(false);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async () => {
    const msg = chatInput.trim();
    if (!msg || sending) return;

    const therapistMsg: ChatMessage = { role: "therapist", content: msg, timestamp: new Date() };
    const updatedMessages = [...messages, therapistMsg];
    setMessages(updatedMessages);
    setChatInput("");
    setSending(true);

    try {
      const res = await fetch(`/api/admin/body-assessments/${assessmentId}/ai-enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          currentValue: draft || value,
          language: locale,
          action: "chat",
          chatMessages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();
      if (data.text) {
        const aiMsg: ChatMessage = { role: "ai", content: data.text, timestamp: new Date() };
        setMessages([...updatedMessages, aiMsg]);
      }
    } catch (err) {
      console.error("AI chat failed:", err);
      const errMsg: ChatMessage = {
        role: "ai",
        content: isPt ? "Erro ao processar. Tente novamente." : "Error processing. Try again.",
        timestamp: new Date(),
      };
      setMessages([...updatedMessages, errMsg]);
    } finally {
      setSending(false);
    }
  };

  const applyAiSuggestion = (text: string) => {
    setDraft(text);
    if (!editing) setEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(isPt ? "Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge." : "Your browser does not support speech recognition. Use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = isPt ? "pt-BR" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interim = transcript;
        }
      }
      setChatInput((prev) => {
        const base = prev.replace(/\s*🎙.*$/, "");
        const text = (base ? base + " " : "") + finalTranscript;
        return interim ? text + "🎙 " + interim : text;
      });
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      setChatInput((prev) => prev.replace(/\s*🎙.*$/, "").trim());
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  // --- Read-only display ---
  if (!editing && !chatOpen) {
    return (
      <div className={`group relative ${className}`}>
        <p className="text-sm whitespace-pre-wrap leading-relaxed pr-16">
          {value || (
            <span className="text-muted-foreground italic">
              {placeholder || (isPt ? "Nenhum conteúdo" : "No content")}
            </span>
          )}
        </p>
        <div className="absolute top-0 right-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => { setChatOpen(true); }}
            title={isPt ? "Chat com IA" : "Chat with AI"}
          >
            <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => { setDraft(value); setEditing(true); }}
            title={isPt ? "Editar" : "Edit"}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // --- Edit + Chat mode ---
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Editable text area */}
      <div className="space-y-2">
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="text-sm"
          onClick={() => { if (!editing) setEditing(true); }}
        />
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant={chatOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setChatOpen(!chatOpen)}
            className={`text-xs gap-1.5 ${chatOpen ? "bg-purple-600 hover:bg-purple-700" : "border-purple-500/30 text-purple-500 hover:bg-purple-500/10"}`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {isPt ? "Chat IA" : "AI Chat"}
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={() => { setDraft(value); setEditing(false); setChatOpen(false); setMessages([]); }}
            disabled={saving}
            className="text-xs"
          >
            <X className="h-3.5 w-3.5 mr-1" /> {isPt ? "Cancelar" : "Cancel"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || draft === value} className="text-xs">
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
            {isPt ? "Salvar" : "Save"}
          </Button>
        </div>
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div className="border rounded-lg bg-muted/30 overflow-hidden">
          {/* Chat header */}
          <div className="px-3 py-2 border-b bg-purple-500/5 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            <span className="text-xs font-medium text-purple-600">
              {isPt ? "Assistente IA — Colaboração Clínica" : "AI Assistant — Clinical Collaboration"}
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {isPt
                ? "Descreva suas observações. A IA incorporará no texto clínico com referências."
                : "Describe your observations. AI will incorporate into clinical text with references."}
            </span>
          </div>

          {/* Messages */}
          <div className="max-h-[300px] overflow-y-auto px-3 py-2 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  {isPt
                    ? "Diga suas observações clínicas. Ex: \"O paciente apresenta hiperextensão do joelho esquerdo, porém não no direito por conta da cirurgia prévia.\""
                    : "Share your clinical observations. Ex: \"Patient shows left knee hyperextension, but not the right due to previous surgery.\""}
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "therapist" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "therapist"
                      ? "bg-primary text-primary-foreground"
                      : "bg-purple-500/10 border border-purple-500/20"
                  }`}
                >
                  {msg.role === "ai" && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="h-3 w-3 text-purple-500" />
                      <span className="text-[10px] font-semibold text-purple-500">AI</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed text-xs">{msg.content}</p>
                  {msg.role === "ai" && (
                    <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-purple-500/10">
                      <Button
                        variant="ghost" size="sm"
                        className="h-6 text-[10px] gap-1 text-purple-500 hover:text-purple-600 hover:bg-purple-500/10 px-2"
                        onClick={() => applyAiSuggestion(msg.content)}
                      >
                        <Check className="h-3 w-3" />
                        {isPt ? "Aplicar" : "Apply"}
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground px-2"
                        onClick={() => navigator.clipboard.writeText(msg.content)}
                      >
                        <Copy className="h-3 w-3" />
                        {isPt ? "Copiar" : "Copy"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500" />
                  <span className="text-xs text-muted-foreground">{isPt ? "Analisando..." : "Analyzing..."}</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t px-3 py-2 flex gap-2">
            <div className="flex-1 relative">
              <Textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isPt
                  ? "Descreva ou fale suas observações clínicas..."
                  : "Type or speak your clinical observations..."}
                rows={2}
                className="text-xs resize-none pr-10"
              />
              {listening && (
                <div className="absolute top-1.5 right-2 flex items-center gap-1">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <span className="text-[9px] text-red-500 font-medium">{isPt ? "Ouvindo..." : "Listening..."}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Button
                size="icon"
                className="h-8 w-8 bg-purple-600 hover:bg-purple-700"
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || sending}
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
              <Button
                size="icon"
                variant={listening ? "destructive" : "outline"}
                className={`h-8 w-8 ${listening ? "" : "border-purple-500/30 text-purple-500 hover:bg-purple-500/10"}`}
                onClick={toggleVoice}
                title={listening ? (isPt ? "Parar gravação" : "Stop recording") : (isPt ? "Falar observação" : "Speak observation")}
              >
                {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </Button>
              {messages.length > 0 && (
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => setMessages([])}
                  title={isPt ? "Limpar chat" : "Clear chat"}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AiChatField;
