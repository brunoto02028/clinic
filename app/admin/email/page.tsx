"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail, Inbox, Send, FileText, AlertOctagon, Trash2, Search,
  Loader2, RefreshCw, Star, StarOff, CheckCircle, AlertCircle,
  X, Eye, Reply, PenSquare, MailOpen, MailCheck, ShieldAlert,
  ShieldCheck, ChevronLeft, ChevronRight, User, Settings,
  CheckCheck, MailX, Eraser, Image as ImageIcon, Phone, AtSign,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImagePicker } from "@/components/ui/image-picker";

interface EmailMsg {
  id: string;
  messageId: string | null;
  direction: string;
  folder: string;
  fromAddress: string;
  fromName: string | null;
  toAddress: string;
  toName: string | null;
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  isRead: boolean;
  isStarred: boolean;
  isSpam: boolean;
  templateSlug: string | null;
  patientId: string | null;
  patient: { id: string; firstName: string; lastName: string; email: string } | null;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string;
}

interface FolderCounts {
  INBOX: number;
  SENT: number;
  DRAFT: number;
  SPAM: number;
  TRASH: number;
}

interface EmailSignature {
  id: string;
  label: string;
  isDefault: boolean;
  enabled: boolean;
  name: string;
  title: string;
  email: string;
  phone: string;
  logoUrl: string;
}

const FOLDERS = [
  { key: "INBOX", label: "Inbox", icon: Inbox },
  { key: "SENT", label: "Sent", icon: Send },
  { key: "DRAFT", label: "Drafts", icon: FileText },
  { key: "SPAM", label: "Spam", icon: AlertOctagon },
  { key: "TRASH", label: "Trash", icon: Trash2 },
];

const DEFAULT_SIGNATURES: EmailSignature[] = [{
  id: 'sig-1',
  label: 'Clinic Signature',
  isDefault: true,
  enabled: true,
  name: 'Bruno Toaz',
  title: 'Physical Rehabilitation Specialist',
  email: 'admin@bpr.rehab',
  phone: '+44 7XXX XXXXXX',
  logoUrl: '',
}];

function genSigId() { return 'sig-' + Date.now(); }

function buildSignatureHtml(sig: EmailSignature, logoUrl?: string): string {
  if (!sig.enabled) return '';
  const logo = sig.logoUrl || logoUrl;
  return `
<br/>
<table cellpadding="0" cellspacing="0" style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;border-top:2px solid #5dc9c0;padding-top:14px;margin-top:20px;max-width:480px;">
  <tr>
    ${logo ? `<td style="padding-right:18px;vertical-align:middle;width:80px;">
      <img src="${logo}" alt="" width="70" height="auto" style="display:block;max-width:70px;max-height:70px;width:auto;height:auto;object-fit:contain;border-radius:8px;border:1px solid #e5e7eb;"/>
    </td>` : ''}
    <td style="vertical-align:middle;">
      <p style="margin:0;font-weight:700;font-size:15px;color:#607d7d;line-height:1.3;">${sig.name}</p>
      ${sig.title ? `<p style="margin:2px 0 0;font-size:12px;color:#6b7280;line-height:1.4;">${sig.title}</p>` : ''}
      <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;line-height:1.4;">
        ${sig.email ? `<span style="white-space:nowrap;">&#9993; ${sig.email}</span>` : ''}
        ${sig.email && sig.phone ? ' &nbsp;&middot;&nbsp; ' : ''}
        ${sig.phone ? `<span style="white-space:nowrap;">&#9742; ${sig.phone}</span>` : ''}
      </p>
    </td>
  </tr>
</table>`;
}

export default function EmailPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [folder, setFolder] = useState("INBOX");
  const [messages, setMessages] = useState<EmailMsg[]>([]);
  const [folderCounts, setFolderCounts] = useState<FolderCounts>({ INBOX: 0, SENT: 0, DRAFT: 0, SPAM: 0, TRASH: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<EmailMsg | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Compose state
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<EmailMsg | null>(null);

  // Signature state — multiple signatures
  const [showSignatureConfig, setShowSignatureConfig] = useState(false);
  const [signatures, setSignatures] = useState<EmailSignature[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('emailSignatures') || '');
        if (Array.isArray(stored) && stored.length > 0) return stored;
      } catch {}
    }
    return DEFAULT_SIGNATURES;
  });
  const [editingSigId, setEditingSigId] = useState<string | null>(null);
  const [activeSigId, setActiveSigId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const sigs = JSON.parse(localStorage.getItem('emailSignatures') || '[]');
        const def = sigs.find((s: EmailSignature) => s.isDefault);
        if (def) return def.id;
      } catch {}
    }
    return 'sig-1';
  });
  const [siteLogoUrl, setSiteLogoUrl] = useState('');

  // Selected IDs for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showImagePicker, setShowImagePicker] = useState(false);

  // Fetch site logo for signature
  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      if (d?.settings?.logoUrl) {
        const base = window.location.origin;
        setSiteLogoUrl(d.settings.logoUrl.startsWith('http') ? d.settings.logoUrl : `${base}${d.settings.logoUrl}`);
      }
    }).catch(() => {});
  }, []);

  const persistSigs = (sigs: EmailSignature[]) => {
    localStorage.setItem('emailSignatures', JSON.stringify(sigs));
  };

  const updateSig = (id: string, partial: Partial<EmailSignature>) => {
    setSignatures(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...partial } : s);
      persistSigs(updated);
      return updated;
    });
  };

  const addSignature = () => {
    const newSig: EmailSignature = {
      id: genSigId(), label: 'New Signature', isDefault: false, enabled: true,
      name: '', title: '', email: '', phone: '', logoUrl: '',
    };
    setSignatures(prev => {
      const updated = [...prev, newSig];
      persistSigs(updated);
      return updated;
    });
    setEditingSigId(newSig.id);
  };

  const deleteSig = (id: string) => {
    setSignatures(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (remaining.length > 0 && !remaining.some(s => s.isDefault)) {
        remaining[0].isDefault = true;
      }
      persistSigs(remaining);
      if (activeSigId === id && remaining.length > 0) setActiveSigId(remaining[0].id);
      return remaining;
    });
    if (editingSigId === id) setEditingSigId(null);
  };

  const setDefaultSig = (id: string) => {
    setSignatures(prev => {
      const updated = prev.map(s => ({ ...s, isDefault: s.id === id }));
      persistSigs(updated);
      return updated;
    });
    setActiveSigId(id);
  };

  const activeSig = signatures.find(s => s.id === activeSigId) || signatures.find(s => s.isDefault) || signatures[0];
  const editingSig = signatures.find(s => s.id === editingSigId);

  const markAllRead = async () => {
    const unreadIds = messages.filter(m => !m.isRead).map(m => m.id);
    if (!unreadIds.length) return;
    await fetch("/api/admin/email", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unreadIds, isRead: true }),
    });
    setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
    setUnreadCount(0);
    setSuccess("All marked as read");
    setTimeout(() => setSuccess(""), 2000);
  };

  const markUnread = async (msg: EmailMsg) => {
    await fetch("/api/admin/email", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: msg.id, isRead: false }),
    });
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: false } : m));
    if (folder === "INBOX") setUnreadCount(prev => prev + 1);
  };

  const permanentDelete = async (id: string) => {
    await fetch("/api/admin/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "permanentDelete", id }),
    });
    setSelectedMsg(null);
    setSuccess("Permanently deleted");
    setTimeout(() => setSuccess(""), 2000);
    fetchMessages();
  };

  const bulkDelete = async () => {
    if (!selectedIds.size) return;
    const ids = Array.from(selectedIds);
    await fetch(`/api/admin/email?ids=${ids.join(",")}`, { method: "DELETE" });
    setSelectedIds(new Set());
    setSuccess(`${ids.length} emails moved to trash`);
    setTimeout(() => setSuccess(""), 2000);
    fetchMessages();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map(m => m.id)));
    }
  };

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ folder, page: String(page), limit: "30" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/email?${params}`);
      const data = await res.json();
      setMessages(data.messages || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setUnreadCount(data.unreadCount || 0);
      setFolderCounts(data.folderCounts || { INBOX: 0, SENT: 0, DRAFT: 0, SPAM: 0 });
    } catch {
      setError("Failed to load emails");
    } finally {
      setLoading(false);
    }
  }, [folder, page, search]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Synced ${data.imported} new emails`);
        setTimeout(() => setSuccess(""), 3000);
        fetchMessages();
      } else {
        setError(data.error || "Sync failed");
      }
    } catch {
      setError("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const markRead = async (msg: EmailMsg) => {
    if (msg.isRead) return;
    await fetch("/api/admin/email", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: msg.id, isRead: true }),
    });
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const toggleStar = async (msg: EmailMsg) => {
    await fetch("/api/admin/email", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: msg.id, isStarred: !msg.isStarred }),
    });
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, isStarred: !m.isStarred } : m)));
  };

  const toggleSpam = async (msg: EmailMsg) => {
    await fetch("/api/admin/email", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: msg.id, isSpam: !msg.isSpam }),
    });
    setSuccess(msg.isSpam ? "Moved to Inbox" : "Marked as Spam");
    setTimeout(() => setSuccess(""), 2000);
    fetchMessages();
  };

  const deleteMsg = async (msg: EmailMsg) => {
    await fetch(`/api/admin/email?id=${msg.id}`, { method: "DELETE" });
    setSelectedMsg(null);
    fetchMessages();
  };

  const openMessage = (msg: EmailMsg) => {
    setSelectedMsg(msg);
    markRead(msg);
    setShowCompose(false);
  };

  const startReply = (msg: EmailMsg) => {
    setReplyTo(msg);
    setComposeTo(msg.direction === "INBOUND" ? msg.fromAddress : msg.toAddress);
    setComposeSubject(msg.subject.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`);
    setComposeBody("");
    setShowCompose(true);
    setSelectedMsg(null);
  };

  const startCompose = () => {
    setReplyTo(null);
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
    setShowCompose(true);
    setSelectedMsg(null);
  };

  const handleSend = async () => {
    if (!composeTo || !composeSubject) {
      setError("To and Subject are required");
      return;
    }
    setSending(true);
    setError("");
    try {
      const sigHtml = activeSig ? buildSignatureHtml(activeSig, siteLogoUrl) : '';
      const bodyWithSig = composeBody + (sigHtml ? `\n\n---SIGNATURE---` : '');
      const htmlBody = `<div style="font-family:sans-serif;white-space:pre-wrap;">${composeBody.replace(/\n/g, '<br/>')}</div>${sigHtml}`;
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          to: composeTo,
          subject: composeSubject,
          textBody: bodyWithSig,
          htmlBody,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Email sent!");
        setTimeout(() => setSuccess(""), 3000);
        setShowCompose(false);
        fetchMessages();
      } else {
        setError(data.error || "Send failed");
      }
    } catch {
      setError("Send failed");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    const date = new Date(d);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            {T("admin.emailTitle")}
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs ml-1">{unreadCount}</Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Send, receive, and manage patient communications</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowSignatureConfig(!showSignatureConfig)} className="gap-1.5">
            <Settings className="h-4 w-4" /> Signature
          </Button>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-1.5">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync
          </Button>
          <Button size="sm" onClick={startCompose} className="gap-1.5">
            <PenSquare className="h-4 w-4" /> Compose
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0" onClick={() => setError("")}><X className="h-3 w-3" /></Button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg flex items-center gap-2 border border-green-200">
          <CheckCircle className="h-4 w-4" /> {success}
        </div>
      )}

      {/* Signature Configuration — Multiple Signatures */}
      {showSignatureConfig && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" /> Email Signatures ({signatures.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={addSignature}><PenSquare className="h-3 w-3" /> New</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowSignatureConfig(false)}><X className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Signature List */}
            <div className="space-y-2">
              {signatures.map((sig) => (
                <div key={sig.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${editingSigId === sig.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`} onClick={() => setEditingSigId(editingSigId === sig.id ? null : sig.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{sig.label || 'Untitled'}</p>
                      {sig.isDefault && <Badge className="text-[9px] px-1.5 py-0">Default</Badge>}
                      {!sig.enabled && <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">Disabled</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{sig.name} · {sig.email || '—'}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!sig.isDefault && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setDefaultSig(sig.id); }}>Set Default</Button>}
                    {signatures.length > 1 && <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={(e) => { e.stopPropagation(); deleteSig(sig.id); }}><Trash2 className="h-3 w-3" /></Button>}
                  </div>
                </div>
              ))}
            </div>

            {/* Edit Panel for selected signature */}
            {editingSig && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-semibold">Editing: </Label>
                  <Input className="h-8 text-sm font-semibold flex-1" value={editingSig.label} onChange={(e) => updateSig(editingSig.id, { label: e.target.value })} placeholder="Signature Name" />
                  <Switch checked={editingSig.enabled} onCheckedChange={(v) => updateSig(editingSig.id, { enabled: v })} />
                  <Label className="text-xs">Active</Label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> Full Name</Label>
                    <Input value={editingSig.name} onChange={(e) => updateSig(editingSig.id, { name: e.target.value })} placeholder="Bruno Toaz" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Title / Role</Label>
                    <Input value={editingSig.title} onChange={(e) => updateSig(editingSig.id, { title: e.target.value })} placeholder="Physical Rehabilitation Specialist" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1"><AtSign className="h-3 w-3" /> Email</Label>
                    <Input value={editingSig.email} onChange={(e) => updateSig(editingSig.id, { email: e.target.value })} placeholder="admin@bpr.rehab" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label>
                    <Input value={editingSig.phone} onChange={(e) => updateSig(editingSig.id, { phone: e.target.value })} placeholder="+44 7XXX XXXXXX" />
                  </div>
                  <div className="col-span-full space-y-1">
                    <Label className="text-xs flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Signature Logo</Label>
                    <div className="flex items-center gap-3">
                      {(editingSig.logoUrl || siteLogoUrl) && (
                        <div className="w-16 h-16 rounded-lg border bg-white flex items-center justify-center overflow-hidden shrink-0">
                          <img src={editingSig.logoUrl || siteLogoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2 flex-wrap">
                          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowImagePicker(true)}>
                            <ImageIcon className="h-3.5 w-3.5" /> {editingSig.logoUrl ? 'Change' : 'Pick from Library'}
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => document.getElementById('sig-logo-upload')?.click()}>Upload New</Button>
                          {editingSig.logoUrl && (
                            <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={() => updateSig(editingSig.id, { logoUrl: '' })}><X className="h-3 w-3" /> Remove</Button>
                          )}
                        </div>
                      </div>
                      <input id="sig-logo-upload" type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const fd = new FormData();
                        fd.append('file', file);
                        fd.append('category', 'signature');
                        try {
                          const res = await fetch('/api/upload', { method: 'POST', body: fd });
                          const data = await res.json();
                          const url = data?.image?.imageUrl || data?.url;
                          if (url) {
                            const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
                            updateSig(editingSig.id, { logoUrl: fullUrl });
                          } else { setError(data?.error || 'Upload failed'); }
                        } catch { setError('Logo upload failed'); }
                        e.target.value = '';
                      }} />
                    </div>
                    <ImagePicker open={showImagePicker} onClose={() => setShowImagePicker(false)} onSelect={(url) => {
                      const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
                      updateSig(editingSig.id, { logoUrl: fullUrl });
                    }} category="signature" title="Select Signature Logo" />
                  </div>
                  <div className="col-span-full">
                    <Label className="text-xs mb-2 block">Preview</Label>
                    <div className="border rounded-lg p-4 bg-white dark:bg-background">
                      <div dangerouslySetInnerHTML={{ __html: buildSignatureHtml(editingSig, siteLogoUrl) }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Folders Sidebar */}
        <div className="space-y-1">
          {FOLDERS.map((f) => {
            const Icon = f.icon;
            const count = folderCounts[f.key as keyof FolderCounts] || 0;
            const isActive = folder === f.key;
            return (
              <button
                key={f.key}
                onClick={() => { setFolder(f.key); setPage(1); setSelectedMsg(null); setShowCompose(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {f.label}
                <span className={`ml-auto text-xs ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {count}
                </span>
                {f.key === "INBOX" && unreadCount > 0 && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            );
          })}

          {/* Search */}
          <div className="pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Message List + Viewer */}
        <div className="lg:col-span-3">
          {/* Compose */}
          {showCompose && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <PenSquare className="h-4 w-4" />
                  {replyTo ? `Reply to: ${replyTo.fromName || replyTo.fromAddress}` : "New Email"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input
                      type="email"
                      placeholder="patient@example.com"
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Subject</Label>
                    <Input
                      placeholder="Email subject..."
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Message</Label>
                  <Textarea
                    placeholder="Write your message..."
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    rows={8}
                  />
                </div>
                {/* Signature selector */}
                {signatures.filter(s => s.enabled).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Signature:</Label>
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={activeSigId}
                        onChange={(e) => setActiveSigId(e.target.value)}
                      >
                        <option value="">No Signature</option>
                        {signatures.filter(s => s.enabled).map(s => (
                          <option key={s.id} value={s.id}>{s.label}{s.isDefault ? ' (Default)' : ''}</option>
                        ))}
                      </select>
                    </div>
                    {activeSig && activeSig.enabled && (
                      <div className="border rounded-lg p-3 bg-muted/20 text-xs">
                        <div dangerouslySetInnerHTML={{ __html: buildSignatureHtml(activeSig, siteLogoUrl) }} />
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleSend} disabled={sending} className="gap-1.5">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </Button>
                  <Button variant="outline" onClick={() => setShowCompose(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected Message View */}
          {selectedMsg && !showCompose && (
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{selectedMsg.subject}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      {selectedMsg.direction === "INBOUND" ? (
                        <span>From: <strong className="text-foreground">{selectedMsg.fromName || selectedMsg.fromAddress}</strong></span>
                      ) : (
                        <span>To: <strong className="text-foreground">{selectedMsg.toName || selectedMsg.toAddress}</strong></span>
                      )}
                      <span>·</span>
                      <span>{formatDate(selectedMsg.sentAt || selectedMsg.receivedAt || selectedMsg.createdAt)}</span>
                      {selectedMsg.patient && (
                        <>
                          <span>·</span>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <User className="h-2.5 w-2.5" />
                            {selectedMsg.patient.firstName} {selectedMsg.patient.lastName}
                          </Badge>
                        </>
                      )}
                      {selectedMsg.isSpam && (
                        <Badge className="bg-red-100 text-red-700 text-[10px]">SPAM</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => startReply(selectedMsg)}>
                      <Reply className="h-3.5 w-3.5" /> Reply
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => { markUnread(selectedMsg); setSelectedMsg(null); }} title="Mark as Unread">
                      <MailX className="h-3.5 w-3.5" /> Unread
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => toggleSpam(selectedMsg)} title={selectedMsg.isSpam ? "Not Spam" : "Mark as Spam"}>
                      {selectedMsg.isSpam ? <ShieldCheck className="h-3.5 w-3.5 text-green-600" /> : <ShieldAlert className="h-3.5 w-3.5 text-orange-500" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-destructive" onClick={() => deleteMsg(selectedMsg)} title="Move to Trash">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {selectedMsg.folder === "TRASH" && (
                      <Button variant="ghost" size="sm" className="h-8 text-destructive gap-1" onClick={() => permanentDelete(selectedMsg.id)} title="Delete Permanently">
                        <Eraser className="h-3.5 w-3.5" /> Permanent
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelectedMsg(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {selectedMsg.htmlBody ? (
                  <iframe
                    srcDoc={selectedMsg.htmlBody}
                    className="w-full min-h-[300px] border rounded-lg bg-white"
                    title="Email Content"
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
                    {selectedMsg.textBody || "(No content)"}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Message List */}
          {!showCompose && !selectedMsg && (
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Inbox className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">No emails in {folder.toLowerCase()}</p>
                    {folder === "INBOX" && (
                      <Button variant="outline" onClick={handleSync} className="mt-3 gap-1.5" size="sm">
                        <RefreshCw className="h-3.5 w-3.5" /> Sync from server
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Bulk Action Bar */}
                    <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === messages.length && messages.length > 0}
                        onChange={selectAll}
                        className="h-3.5 w-3.5 rounded border-gray-300"
                        title="Select all"
                      />
                      <span className="text-xs text-muted-foreground">
                        {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select"}
                      </span>
                      {selectedIds.size > 0 && (
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-destructive" onClick={bulkDelete}>
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      )}
                      <div className="ml-auto flex gap-1">
                        {folder === "INBOX" && unreadCount > 0 && (
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={markAllRead}>
                            <CheckCheck className="h-3 w-3" /> Mark all read
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="divide-y">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          onClick={() => openMessage(msg)}
                          className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 group ${
                            !msg.isRead ? "bg-primary/5 font-medium" : ""
                          } ${selectedIds.has(msg.id) ? "bg-primary/10" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(msg.id)}
                            onChange={(e) => { e.stopPropagation(); toggleSelect(msg.id); }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-3.5 w-3.5 rounded border-gray-300 shrink-0"
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleStar(msg); }}
                            className="shrink-0"
                          >
                            {msg.isStarred ? (
                              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                            ) : (
                              <StarOff className="h-4 w-4 text-muted-foreground/30 hover:text-amber-300" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm truncate ${!msg.isRead ? "font-semibold" : ""}`}>
                                {msg.direction === "INBOUND"
                                  ? (msg.fromName || msg.fromAddress)
                                  : `To: ${msg.toName || msg.toAddress}`}
                              </span>
                              {msg.isSpam && <Badge className="bg-red-100 text-red-600 text-[9px] px-1 py-0">SPAM</Badge>}
                              {msg.templateSlug && <Badge variant="outline" className="text-[9px] px-1 py-0">Auto</Badge>}
                              {msg.patient && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5">
                                  <User className="h-2 w-2" /> Patient
                                </Badge>
                              )}
                            </div>
                            <p className={`text-sm truncate ${!msg.isRead ? "" : "text-muted-foreground"}`}>
                              {msg.subject}
                            </p>
                            {msg.textBody && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {msg.textBody.slice(0, 100)}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteMsg(msg); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </button>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                {formatDate(msg.sentAt || msg.receivedAt || msg.createdAt)}
                              </p>
                              {!msg.isRead && (
                                <div className="w-2 h-2 rounded-full bg-primary ml-auto mt-1" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Pagination */}
                {pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      Page {page} of {pages} ({total} emails)
                    </p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
