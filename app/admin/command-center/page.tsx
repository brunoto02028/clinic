"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Send,
  Bot,
  User,
  Loader2,
  ArrowLeft,
  Download,
  FileText,
  Image as ImageIcon,
  Presentation,
  Sparkles,
  Terminal,
  Trash2,
  Copy,
  Check,
  Mail,
  MessageSquare,
  Instagram,
  BarChart3,
  CalendarDays,
  Search,
  Users,
  Mic,
  MicOff,
  Globe,
  ChevronDown,
  DollarSign,
  Brain,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: ActionBlock[];
}

interface ActionBlock {
  type: string;
  params: any;
}

const QUICK_COMMANDS = [
  { label: "Full Report", icon: "BarChart3", prompt: "I need a clinic report. What do we have?" },
  { label: "Marketing", icon: "BarChart3", prompt: "Help me plan a marketing campaign for the clinic." },
  { label: "Social Calendar", icon: "CalendarDays", prompt: "I need a social media content calendar." },
  { label: "SEO Strategy", icon: "Search", prompt: "Help me with SEO and blog content ideas." },
  { label: "Inactive Patients", icon: "Users", prompt: "Which patients haven't come back recently? How can we re-engage them?" },
  { label: "Blog Article", icon: "FileText", prompt: "Help me write a new blog article." },
  { label: "Instagram Post", icon: "Instagram", prompt: "I want to create an Instagram post." },
  { label: "Valuation", icon: "DollarSign", prompt: "What is the business worth right now?" },
  { label: "Presentation", icon: "Presentation", prompt: "I need a presentation about the clinic." },
];

export default function CommandCenterPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [outputLang, setOutputLang] = useState<"en" | "pt">("en");
  const [isRecording, setIsRecording] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [memoryCount, setMemoryCount] = useState(0);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
    // Load chat history from localStorage
    try {
      const saved = localStorage.getItem('bpr-command-chat');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
        }
      }
      const savedLang = localStorage.getItem('bpr-command-lang');
      if (savedLang === 'pt' || savedLang === 'en') setOutputLang(savedLang);
    } catch {}
    // Load memory count
    fetch('/api/admin/command-memory').then(r => r.json()).then(d => {
      if (d.count !== undefined) setMemoryCount(d.count);
    }).catch(() => {});
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        // Keep last 50 messages max
        const toSave = messages.slice(-50);
        localStorage.setItem('bpr-command-chat', JSON.stringify(toSave));
      } catch {}
    }
  }, [messages]);

  // Save language preference
  useEffect(() => {
    localStorage.setItem('bpr-command-lang', outputLang);
  }, [outputLang]);

  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem('bpr-command-chat');
  }, []);

  // Auto-resize textarea as content grows/shrinks
  const autoResizeTextarea = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, []);

  useEffect(() => {
    autoResizeTextarea();
  }, [input, autoResizeTextarea]);

  // Voice recording via Web Speech API
  const toggleVoice = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = outputLang === "pt" ? "pt-BR" : "en-GB";

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording, outputLang]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/command-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          language: outputLang,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages([
          ...newMessages,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `**Error:** ${data.error}`,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages([
          ...newMessages,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: data.reply || "No response.",
            timestamp: new Date(),
            actions: data.actions || [],
          },
        ]);
      }
    } catch (err: any) {
      setMessages([
        ...newMessages,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `**Connection error:** ${err.message}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (action: ActionBlock, msgId: string) => {
    setActionLoading(`${msgId}-${action.type}`);
    try {
      const res = await fetch("/api/admin/command-chat/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: action.type, params: action.params }),
      });
      const data = await res.json();

      if (data.error) {
        appendSystemMsg(`**Error:** ${data.error}`);
        return;
      }

      // File downloads (PDF, PPTX, Excel)
      if (data.fileUrl) {
        downloadFile(data.fileUrl, data.filename);
        appendSystemMsg(`**${data.filename}** generated — downloading now.`);
      }
      // Image generation
      else if (data.imageUrl) {
        appendSystemMsg(`Image generated: [View image](${data.imageUrl})`);
      }
      // Instagram post
      else if (data.caption) {
        let msg = `**Instagram post created!**\n\n${data.caption}`;
        if (data.imageUrl) msg += `\n\n[View image](${data.imageUrl})`;
        if (data.postId) msg += `\n\n_Saved as draft in Social Media._`;
        appendSystemMsg(msg);
      }
      // General success
      else if (data.message) {
        appendSystemMsg(data.message);
      } else if (data.success) {
        appendSystemMsg(`Action **${action.type}** completed successfully.`);
      }
    } catch (err: any) {
      appendSystemMsg(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const appendSystemMsg = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        role: "assistant",
        content: text,
        timestamp: new Date(),
      },
    ]);
  };

  // clearChat is defined above with localStorage clearing

  const userName = session?.user
    ? `${(session.user as any).firstName || ""} ${(session.user as any).lastName || ""}`.trim() || "Admin"
    : "Admin";

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin")} className="p-1.5 hover:bg-white/10 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Command Center</h1>
              <p className="text-[11px] text-slate-300">BPR Intelligent HQ — Powered by Abacus AI</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition"
            >
              <Globe className="w-3.5 h-3.5" />
              {outputLang === "en" ? "EN" : "PT"}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showLangMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 min-w-[140px]">
                <button
                  onClick={() => { setOutputLang("en"); setShowLangMenu(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 ${outputLang === "en" ? "text-emerald-600 font-bold" : "text-slate-700 dark:text-slate-300"}`}
                >
                  🇬🇧 English (UK)
                </button>
                <button
                  onClick={() => { setOutputLang("pt"); setShowLangMenu(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 ${outputLang === "pt" ? "text-emerald-600 font-bold" : "text-slate-700 dark:text-slate-300"}`}
                >
                  🇧🇷 Português (BR)
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {memoryCount > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] bg-emerald-500/20 text-emerald-300 rounded-full" title={`${memoryCount} memories stored`}>
                <Brain className="w-3 h-3" />
                {memoryCount}
              </span>
            )}
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center mb-4 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-1 text-slate-800 dark:text-white">Hey, {userName}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center max-w-md">
              I&apos;m your AI business partner. Ask me anything about the clinic, or pick a starting point below. I&apos;ll ask smart questions before executing.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-w-2xl">
              {QUICK_COMMANDS.map((cmd) => (
                <button
                  key={cmd.label}
                  onClick={() => sendMessage(cmd.prompt)}
                  className="text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-md transition-all text-xs leading-tight group flex items-center gap-2.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 transition-colors">
                    {getQuickIcon(cmd.icon)}
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {cmd.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto py-4 px-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-slate-800 text-white rounded-br-md"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-md shadow-sm"
                  }`}
                >
                  <div
                    className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      msg.role === "assistant" ? "prose prose-sm dark:prose-invert max-w-none prose-pre:bg-slate-100 dark:prose-pre:bg-slate-900 prose-pre:rounded-lg prose-pre:p-3" : ""
                    }`}
                    dangerouslySetInnerHTML={
                      msg.role === "assistant"
                        ? { __html: formatMarkdown(msg.content) }
                        : undefined
                    }
                  >
                    {msg.role === "user" ? msg.content : undefined}
                  </div>

                  {/* Action buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 flex flex-wrap gap-2">
                      {msg.actions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => handleAction(action, msg.id)}
                          disabled={actionLoading === `${msg.id}-${action.type}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition disabled:opacity-50"
                        >
                          {actionLoading === `${msg.id}-${action.type}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : getActionIcon(action.type)}
                          {actionLoading === `${msg.id}-${action.type}` ? "Working..." : getActionLabel(action.type)}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Copy button for assistant messages */}
                  {msg.role === "assistant" && (
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 transition"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedId === msg.id ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing system data...
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-white dark:bg-slate-900 p-3 rounded-b-xl">
        <div className="max-w-4xl mx-auto flex gap-2">
          <button
            onClick={toggleVoice}
            className={`px-3 py-2 rounded-xl border transition-all flex items-center justify-center ${
              isRecording
                ? "bg-red-500 border-red-500 text-white animate-pulse shadow-lg shadow-red-500/30"
                : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-emerald-500 hover:border-emerald-300"
            }`}
            title={isRecording ? "Stop recording" : "Voice input (any language)"}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? (outputLang === "pt" ? "🎤 Ouvindo... fale em português" : "🎤 Listening... speak in English") : (outputLang === "pt" ? "Digite ou fale um comando..." : "Type or speak a command...")}
            className={`flex-1 resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-400 min-h-[44px] max-h-[200px] overflow-y-auto ${
              isRecording
                ? "border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800"
                : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            }`}
            rows={1}
            disabled={loading}
          />
          <button
            onClick={() => { if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); } sendMessage(); }}
            disabled={!input.trim() || loading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-1.5">
          BPR Command Center — Powered by Abacus AI RouteLLM • {outputLang === "en" ? "English" : "Português"} output • Full system access
        </p>
      </div>
    </div>
  );
}

function formatMarkdown(text: string): string {
  // Remove action blocks from display
  let html = text.replace(/```action\s*[\s\S]*?```/g, "");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">$1</code>');
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-4 mb-1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>');
  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="my-3 border-slate-200 dark:border-slate-700" />');
  // Line breaks
  html = html.replace(/\n\n/g, "<br/><br/>");
  html = html.replace(/\n/g, "<br/>");

  return html;
}

function getQuickIcon(icon: string) {
  const cls = "w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-500 transition-colors";
  switch (icon) {
    case "BarChart3": return <BarChart3 className={cls} />;
    case "CalendarDays": return <CalendarDays className={cls} />;
    case "Search": return <Search className={cls} />;
    case "Users": return <Users className={cls} />;
    case "FileText": return <FileText className={cls} />;
    case "Instagram": return <Instagram className={cls} />;
    case "DollarSign": return <DollarSign className={cls} />;
    case "Presentation": return <Presentation className={cls} />;
    default: return <Sparkles className={cls} />;
  }
}

function getActionIcon(type: string) {
  switch (type) {
    case "generate_pdf": return <FileText className="w-3.5 h-3.5" />;
    case "generate_pptx": return <Presentation className="w-3.5 h-3.5" />;
    case "generate_image": return <ImageIcon className="w-3.5 h-3.5" />;
    case "export_csv": return <Download className="w-3.5 h-3.5" />;
    case "create_article": return <FileText className="w-3.5 h-3.5" />;
    case "send_email": return <Mail className="w-3.5 h-3.5" />;
    case "instagram_post": return <Instagram className="w-3.5 h-3.5" />;
    case "send_whatsapp": return <MessageSquare className="w-3.5 h-3.5" />;
    case "marketing_campaign": return <BarChart3 className="w-3.5 h-3.5" />;
    case "patient_reengagement": return <Users className="w-3.5 h-3.5" />;
    case "seo_content_plan": return <Search className="w-3.5 h-3.5" />;
    case "social_calendar": return <CalendarDays className="w-3.5 h-3.5" />;
    case "full_report": return <BarChart3 className="w-3.5 h-3.5" />;
    case "business_valuation": return <DollarSign className="w-3.5 h-3.5" />;
    default: return <Sparkles className="w-3.5 h-3.5" />;
  }
}

function getActionLabel(type: string): string {
  switch (type) {
    case "generate_pdf": return "Generate PDF";
    case "generate_pptx": return "Generate Presentation";
    case "generate_image": return "Generate Image";
    case "export_csv": return "Export Excel";
    case "create_article": return "Create Article";
    case "send_email": return "Send Email";
    case "instagram_post": return "Create Instagram Post";
    case "send_whatsapp": return "Send WhatsApp";
    case "marketing_campaign": return "Generate Campaign Plan";
    case "patient_reengagement": return "Re-engagement Report";
    case "seo_content_plan": return "SEO Content Plan";
    case "social_calendar": return "Social Calendar";
    case "full_report": return "Full Report PDF";
    case "business_valuation": return "Business Valuation";
    default: return "Execute";
  }
}
