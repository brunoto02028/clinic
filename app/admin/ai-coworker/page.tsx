'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Bot, Send, Loader2, Plus, Play, Pause, Trash2, Clock, CheckCircle,
  XCircle, AlertTriangle, User, Sparkles, FileText, Mail, BarChart3,
  Calendar, Mic, MicOff, ChevronDown, ChevronUp, Zap, History,
  Lightbulb, PlusCircle, Shield, Bell, Filter, RefreshCw,
  X, Eye, MessageSquare, CheckCheck
} from 'lucide-react'

// ─── Types ───
interface ChatMessage { role: 'user' | 'assistant'; content: string; durationMs?: number; taskCreated?: boolean }
interface Task { id: string; name: string; description?: string; type: string; prompt: string; schedule?: string; isActive: boolean; requiresApproval: boolean; lastRunAt?: string; runCount: number; config?: Record<string, unknown>; _count?: { logs: number } }
interface LogEntry { id: string; type: string; status: string; input?: string; output?: string; durationMs?: number; createdAt: string; task?: { name: string; type: string } }
interface Template { name: string; type: string; description: string; prompt: string; schedule: string; config: Record<string, unknown>; requiresApproval: boolean }
interface Suggestion { name: string; type: string; description: string; prompt: string; schedule: string; priority: 'high' | 'medium' | 'low'; reason: string; requiresApproval: boolean }
interface Notif { id: string; type: 'approval' | 'completed' | 'failed'; title: string; body: string; summary?: string; timestamp: string; read: boolean }

// ─── Constants ───
const TYPE_ICONS: Record<string, typeof Mail> = { EMAIL_FOLLOWUP: Mail, SOCIAL_POST: Sparkles, REPORT: BarChart3, EMAIL_CHECK: Mail, PATIENT_OUTREACH: User, CUSTOM: Zap }
const TYPE_COLORS: Record<string, string> = { EMAIL_FOLLOWUP: 'text-blue-400 bg-blue-500/10', SOCIAL_POST: 'text-pink-400 bg-pink-500/10', REPORT: 'text-emerald-400 bg-emerald-500/10', EMAIL_CHECK: 'text-cyan-400 bg-cyan-500/10', PATIENT_OUTREACH: 'text-amber-400 bg-amber-500/10', CUSTOM: 'text-purple-400 bg-purple-500/10' }
const PRIORITY_COLORS: Record<string, string> = { high: 'bg-red-500/20 text-red-300', medium: 'bg-amber-500/20 text-amber-300', low: 'bg-slate-500/20 text-slate-300' }
const SCHED_PRESETS = [{ l: 'Manual only', v: '' }, { l: 'Daily 9am', v: '0 9 * * *' }, { l: 'Weekdays 9am', v: '0 9 * * 1-5' }, { l: 'Mon 8am', v: '0 8 * * 1' }, { l: 'Fri 5pm', v: '0 17 * * 5' }]

type Tab = 'tasks' | 'executions' | 'notifications'

export default function AICoWorkerPage() {
  const [tab, setTab] = useState<Tab>('tasks')
  // Data
  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [notifications, setNotifications] = useState<Notif[]>([])
  const [executing, setExecuting] = useState<string | null>(null)
  const [executionResult, setExecutionResult] = useState<{ taskId: string; output: string } | null>(null)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  // Suggestions
  const [suggesting, setSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  // Chat panel
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [chatPlanName, setChatPlanName] = useState('')
  const [chatPlanType, setChatPlanType] = useState('CUSTOM')
  const [chatPlanSchedule, setChatPlanSchedule] = useState('')
  const [chatPlanDesc, setChatPlanDesc] = useState('')
  // New Task Modal
  const [showModal, setShowModal] = useState(false)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('CUSTOM')
  const [formDesc, setFormDesc] = useState('')
  const [formPrompt, setFormPrompt] = useState('')
  const [formSchedule, setFormSchedule] = useState('')
  const [formApproval, setFormApproval] = useState(false)
  const [formNotifyEmail, setFormNotifyEmail] = useState(true)
  const [formNotifySms, setFormNotifySms] = useState(false)
  const [formNotifyInApp, setFormNotifyInApp] = useState(true)
  const [formSaving, setFormSaving] = useState(false)

  const isSupported = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])
  useEffect(() => { fetchTasks(); fetchLogs() }, [])

  // ─── Fetch ───
  async function fetchTasks() {
    try { const r = await fetch('/api/admin/coworker/tasks'); const d = await r.json(); if (d.tasks) setTasks(d.tasks) } catch {}
  }
  async function fetchLogs() {
    try {
      const r = await fetch('/api/admin/coworker/logs?limit=100'); const d = await r.json()
      if (d.logs) {
        setLogs(d.logs)
        const notifs: Notif[] = d.logs
          .filter((l: LogEntry) => l.type === 'TASK_RUN' || l.type === 'ERROR' || l.status === 'PENDING_APPROVAL')
          .map((l: LogEntry) => ({
            id: l.id,
            type: l.status === 'PENDING_APPROVAL' ? 'approval' as const : l.status === 'FAILED' || l.type === 'ERROR' ? 'failed' as const : 'completed' as const,
            title: l.status === 'PENDING_APPROVAL' ? `Approval needed: ${l.task?.name || 'Task'}` : l.status === 'FAILED' ? `Failed: ${l.task?.name || 'Task'}` : `Task completed: ${l.task?.name || 'Task'}`,
            body: l.status === 'PENDING_APPROVAL' ? `Claude completed "${l.task?.name}" and is awaiting your approval before publishing.` : l.status === 'FAILED' ? `Task "${l.task?.name}" failed.` : '',
            summary: l.output?.substring(0, 120) || '',
            timestamp: l.createdAt,
            read: false,
          }))
        setNotifications(notifs)
      }
    } catch {}
  }

  // ─── Voice ───
  function toggleVoice() {
    if (!isSupported) return
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = 'pt-BR'; recognition.continuous = true; recognition.interimResults = true
    recognition.onresult = (e: any) => { let t = ''; for (let i = 0; i < e.results.length; i++) { if (e.results[i].isFinal) t += e.results[i][0].transcript + ' ' }; if (t.trim()) setChatInput(prev => (prev + ' ' + t).trim()) }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition; recognition.start(); setListening(true)
  }

  // ─── Chat ───
  async function sendChat() {
    const msg = chatInput.trim(); if (!msg || chatLoading) return
    setChatInput(''); setChatMessages(prev => [...prev, { role: 'user', content: msg }]); setChatLoading(true)
    const taskKw = ['create a task', 'make a task', 'new task', 'add task', 'automate', 'criar tarefa', 'nova tarefa', 'monitorar', 'agendar']
    if (taskKw.some(k => msg.toLowerCase().includes(k))) {
      try {
        const res = await fetch(`/api/admin/coworker/tasks?action=create-from-chat&message=${encodeURIComponent(msg)}`); const data = await res.json()
        if (data.success && data.task) {
          setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Task plan ready! Edit fields on the right.', durationMs: data.durationMs, taskCreated: true }])
          setChatPlanName(data.task.name || ''); setChatPlanType(data.task.type || 'CUSTOM'); setChatPlanSchedule(data.task.schedule || ''); setChatPlanDesc(data.task.description || '')
          await fetchTasks()
        } else { setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.error || 'Could not create task', durationMs: data.durationMs }]) }
      } catch (e) { setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Failed'}` }]) }
      finally { setChatLoading(false) }; return
    }
    try {
      const history = chatMessages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/admin/coworker/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, history }) })
      const data = await res.json(); if (!res.ok) throw new Error(data.error)
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply, durationMs: data.durationMs }])
    } catch (e) { setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Failed'}` }]) }
    finally { setChatLoading(false) }
  }

  // ─── Suggest ───
  async function handleSuggestTasks() {
    setSuggesting(true); setSuggestions([])
    try { const r = await fetch('/api/admin/coworker/tasks?action=suggest'); const d = await r.json(); if (d.suggestions) setSuggestions(d.suggestions) } catch {} finally { setSuggesting(false) }
  }
  async function addSuggestion(s: Suggestion) {
    try { const r = await fetch('/api/admin/coworker/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: s.name, type: s.type, description: s.description, prompt: s.prompt, schedule: s.schedule, requiresApproval: s.requiresApproval }) }); const d = await r.json(); if (d.success) { setSuggestions(prev => prev.filter(x => x.name !== s.name)); await fetchTasks() } } catch {}
  }

  // ─── Save task (modal) ───
  async function saveTask() {
    if (!formName || !formPrompt) return; setFormSaving(true)
    try {
      const r = await fetch('/api/admin/coworker/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, type: formType, description: formDesc, prompt: formPrompt, schedule: formSchedule || null, requiresApproval: formApproval,
          config: { notifyChannels: [...(formNotifyEmail ? ['email'] : []), ...(formNotifySms ? ['sms'] : []), ...(formNotifyInApp ? ['in_app'] : [])] } }) })
      const d = await r.json(); if (d.success) { await fetchTasks(); closeModal() }
    } catch {} finally { setFormSaving(false) }
  }
  function closeModal() { setShowModal(false); setFormName(''); setFormType('CUSTOM'); setFormDesc(''); setFormPrompt(''); setFormSchedule(''); setFormApproval(false); setFormNotifyEmail(true); setFormNotifySms(false); setFormNotifyInApp(true) }

  // ─── Task actions ───
  async function runTask(taskId: string) {
    setExecuting(taskId); setExecutionResult(null)
    try { const r = await fetch('/api/admin/coworker/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId }) }); const d = await r.json(); setExecutionResult({ taskId, output: d.output || d.error }); await fetchTasks(); await fetchLogs() }
    catch (e) { setExecutionResult({ taskId, output: `Error: ${e instanceof Error ? e.message : 'Failed'}` }) } finally { setExecuting(null) }
  }
  async function toggleTask(task: Task) { try { await fetch('/api/admin/coworker/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: task.id, isActive: !task.isActive }) }); await fetchTasks() } catch {} }
  async function deleteTask(taskId: string) { if (!confirm('Delete this task and all its logs?')) return; try { await fetch(`/api/admin/coworker/tasks?id=${taskId}`, { method: 'DELETE' }); await fetchTasks() } catch {} }
  function markAllRead() { setNotifications(prev => prev.map(n => ({ ...n, read: true }))) }

  // ─── Helpers ───
  function fmtDur(ms?: number) { if (!ms) return ''; return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s` }
  function cronToHuman(cron?: string) {
    if (!cron) return 'Manual only'; const p = cron.split(' '); const h = p[1]; const d = p[4]
    const days = d === '*' ? 'Daily' : d === '1' ? 'Monday' : d === '1-5' ? 'Weekdays' : d === '5' ? 'Friday' : d === '2,4' ? 'Tue/Thu' : d
    return `${days} at ${h?.padStart(2, '0')}:${p[0]?.padStart(2, '0')}`
  }
  function shortDate(d: string) { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }
  function getNotifyIcons(task: Task) { const cfg = task.config as Record<string, unknown> | undefined; return (cfg?.notifyChannels as string[]) || [] }

  const unreadCount = notifications.filter(n => !n.read).length
  const taskLogs = logs.filter(l => l.type === 'TASK_RUN' || l.type === 'ERROR')

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-500/20"><Bot className="h-6 w-6 text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Claude Co-Work</h1>
            <p className="text-sm text-muted-foreground">IA Autonomous — reads your system, executes tasks & notifies you</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowChat(!showChat)} className={`text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all ${showChat ? 'bg-amber-500 text-white' : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400'}`}>
            <MessageSquare className="h-4 w-4" /> Falar com Claude
          </button>
          <button onClick={handleSuggestTasks} disabled={suggesting} className="bg-muted text-foreground text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-muted/80 transition disabled:opacity-50">
            {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Sugerir Tasks
          </button>
          <button onClick={() => setShowModal(true)} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 hover:from-violet-500 hover:to-indigo-500 transition">
            <Plus className="h-4 w-4" /> Nova Task
          </button>
        </div>
      </div>

      {/* ═══ CHAT PANEL (slide-down) ═══ */}
      {showChat && (
        <div className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/30 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
            <p className="text-sm font-medium text-amber-200 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Assistente Claude Co-Work <span className="text-xs text-amber-300/60 hidden sm:inline">· Describe by voice or text what you want</span></p>
            <button onClick={() => setShowChat(false)} className="text-amber-300/60 hover:text-amber-200"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-amber-500/10">
            {/* Chat side */}
            <div className="flex flex-col">
              <div className="h-[220px] overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="bg-muted/30 rounded-xl px-4 py-3 text-sm text-muted-foreground">
                    <span className="text-amber-400">👋</span> Hi! Describe by voice or text what you want me to do. I will interpret your request, confirm the plan, and create the task automatically.
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'assistant' && <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shrink-0 mt-0.5"><Bot className="h-3 w-3 text-white" /></div>}
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-foreground'}`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      {msg.taskCreated && <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full mt-1 inline-block">Task Created</span>}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shrink-0"><Bot className="h-3 w-3 text-white" /></div>
                    <div className="bg-muted/50 rounded-xl px-3 py-2 text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Thinking...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="border-t border-amber-500/10 p-3 flex items-end gap-2">
                {isSupported && (
                  <button onClick={toggleVoice} className={`p-2 rounded-lg transition ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-muted/30 text-muted-foreground hover:text-foreground'}`}>
                    {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  </button>
                )}
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendChat() } }} placeholder="Ex: monitor system errors daily at 9am..." className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-amber-500/50 placeholder-muted-foreground/50" />
                <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="p-2 rounded-lg bg-amber-500 text-white hover:bg-amber-400 disabled:opacity-50 transition">
                  {chatLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            {/* Task plan side */}
            <div className="p-4 space-y-3">
              <p className="text-xs font-medium text-emerald-400 flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> TASK PLAN (you can edit)</p>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Task Name *</label>
                <input value={chatPlanName} onChange={e => setChatPlanName(e.target.value)} placeholder="Task name" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Type</label>
                  <select value={chatPlanType} onChange={e => setChatPlanType(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
                    {Object.keys(TYPE_ICONS).map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Schedule</label>
                  <select value={chatPlanSchedule} onChange={e => setChatPlanSchedule(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
                    {SCHED_PRESETS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Description / context</label>
                <textarea value={chatPlanDesc} onChange={e => setChatPlanDesc(e.target.value)} rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary resize-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ AI SUGGESTIONS ═══ */}
      {suggestions.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-400" /><p className="text-sm font-medium text-foreground">AI Suggestions based on your system</p></div>
          <div className="space-y-2">
            {suggestions.map((s, i) => {
              const Icon = TYPE_ICONS[s.type] || Zap
              return (
                <div key={i} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLORS[s.type] || 'bg-muted'}`}><Icon className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><p className="text-sm font-medium">{s.name}</p><span className={`text-[9px] px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[s.priority] || ''}`}>{s.priority}</span></div>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1 italic">{s.reason}</p>
                  </div>
                  <button onClick={() => addSuggestion(s)} className="shrink-0 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition flex items-center gap-1"><Plus className="h-3 w-3" /> Add</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ TABS ═══ */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1 w-fit">
        {([
          { key: 'tasks' as Tab, label: 'Tasks', icon: Zap },
          { key: 'executions' as Tab, label: 'Registo de Execuções', icon: FileText },
          { key: 'notifications' as Tab, label: `Notificações`, icon: Bell, badge: unreadCount },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="h-4 w-4" /> {t.label}
            {t.badge ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* ═══ TASKS TAB ═══ */}
      {tab === 'tasks' && (
        <div className="space-y-3">
          {tasks.length === 0 && suggestions.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">No tasks yet</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Click &quot;Sugerir Tasks&quot; or &quot;Nova Task&quot; to get started</p>
            </div>
          ) : (
            tasks.map(task => {
              const Icon = TYPE_ICONS[task.type] || Zap
              const isRunning = executing === task.id
              const isExpanded = expandedTask === task.id
              const notifyChannels = getNotifyIcons(task)
              const lastLog = logs.find(l => l.task?.name === task.name && (l.type === 'TASK_RUN' || l.type === 'ERROR'))
              const lastLogPreview = lastLog?.output?.substring(0, 80)
              const lastResult = executionResult?.taskId === task.id ? executionResult.output : null
              return (
                <div key={task.id} className={`bg-card border rounded-xl transition ${task.isActive ? 'border-border' : 'border-border/50 opacity-60'}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TYPE_COLORS[task.type] || 'bg-muted'}`}><Icon className="h-5 w-5" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold">{task.name}</h3>
                            {task.requiresApproval && <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">Requer aprovação</span>}
                          </div>
                          {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>}
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {cronToHuman(task.schedule || undefined)}</span>
                            <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3" /> {task.runCount} executions</span>
                            {task.lastRunAt && <span>Last: {shortDate(task.lastRunAt)}</span>}
                            {notifyChannels.length > 0 && <span className="flex items-center gap-1">{notifyChannels.includes('email') && <Mail className="h-3 w-3 text-blue-400" />}{notifyChannels.includes('sms') && <MessageSquare className="h-3 w-3 text-green-400" />}{notifyChannels.includes('in_app') && <Bell className="h-3 w-3 text-amber-400" />}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => runTask(task.id)} disabled={isRunning} className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition disabled:opacity-50" title="Run now">
                          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button onClick={() => setExpandedTask(isExpanded ? null : task.id)} className="p-2 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground transition" title="View"><Eye className="h-4 w-4" /></button>
                        <button onClick={() => toggleTask(task)} className={`p-2 rounded-lg transition ${task.isActive ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`} title={task.isActive ? 'Pause' : 'Activate'}>
                          {task.isActive ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </button>
                        <button onClick={() => deleteTask(task.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    {lastLogPreview && !isExpanded && (
                      <div className="mt-3">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg max-w-full truncate ${lastLog?.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : lastLog?.status === 'PENDING_APPROVAL' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {lastLog?.status === 'SUCCESS' ? <CheckCircle className="h-3 w-3 shrink-0" /> : lastLog?.status === 'PENDING_APPROVAL' ? <AlertTriangle className="h-3 w-3 shrink-0" /> : <XCircle className="h-3 w-3 shrink-0" />}
                          {lastLog?.status === 'PENDING_APPROVAL' ? 'Approved' : lastLog?.status === 'SUCCESS' ? 'Completed' : 'Failed'} — {lastLogPreview}...
                        </span>
                      </div>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="border-t border-border p-4 space-y-3">
                      <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Prompt</p><p className="text-xs text-foreground/80 whitespace-pre-wrap bg-muted/30 rounded-lg p-3 max-h-48 overflow-y-auto">{task.prompt}</p></div>
                      {(lastResult || lastLog?.output) && <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Last Output</p><p className="text-xs text-foreground/70 whitespace-pre-wrap bg-muted/30 rounded-lg p-3 max-h-48 overflow-y-auto">{lastResult || lastLog?.output}</p></div>}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ═══ EXECUTION LOG TAB ═══ */}
      {tab === 'executions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Registo de Execuções</h2>
            <button onClick={fetchLogs} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition"><RefreshCw className="h-3 w-3" /> Refresh</button>
          </div>
          {taskLogs.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center"><History className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" /><p className="text-muted-foreground text-sm">No executions yet</p></div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="px-4 py-3 font-medium">Task</th><th className="px-4 py-3 font-medium">Estado</th><th className="px-4 py-3 font-medium">Resumo</th><th className="px-4 py-3 font-medium">Quando</th></tr></thead>
                  <tbody>{taskLogs.map(log => <LogTableRow key={log.id} log={log} shortDate={shortDate} />)}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ NOTIFICATIONS TAB ═══ */}
      {tab === 'notifications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Notificações</h2>
            {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition"><CheckCheck className="h-3.5 w-3.5" /> Marcar todas como lidas</button>}
          </div>
          {notifications.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center"><Bell className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" /><p className="text-muted-foreground text-sm">No notifications yet</p></div>
          ) : (
            <div className="space-y-3">
              {notifications.map(n => (
                <div key={n.id} className={`rounded-xl border p-4 relative transition-all ${n.type === 'approval' ? 'bg-amber-500/5 border-amber-500/30' : n.type === 'failed' ? 'bg-red-500/5 border-red-500/30' : 'bg-emerald-500/5 border-emerald-500/30'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'approval' ? 'bg-amber-500/10' : n.type === 'failed' ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                      {n.type === 'approval' ? <Bell className="h-4 w-4 text-amber-400" /> : n.type === 'failed' ? <XCircle className="h-4 w-4 text-red-400" /> : <CheckCircle className="h-4 w-4 text-emerald-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${n.type === 'approval' ? 'text-amber-200' : n.type === 'failed' ? 'text-red-300' : 'text-emerald-200'}`}>{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                      {n.summary && <p className="text-xs text-foreground/60 mt-2 bg-muted/20 rounded-lg px-3 py-2 line-clamp-2"># {n.summary}</p>}
                      <p className="text-[10px] text-muted-foreground/60 mt-2">{shortDate(n.timestamp)}</p>
                    </div>
                    {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0 mt-1" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ NEW TASK MODAL ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => closeModal()}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Criar Task Claude Co-Work</h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">NOME DA TASK *</label>
                <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="ex: Daily Patient Follow-up" className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">TIPO DE TASK *</label>
                <select value={formType} onChange={e => setFormType(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary">
                  {Object.keys(TYPE_ICONS).map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">DESCRIÇÃO</label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2} placeholder="Optional description..." className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">PROMPT (what AI should do) *</label>
                <textarea value={formPrompt} onChange={e => setFormPrompt(e.target.value)} rows={3} placeholder="Describe what the AI should do each run..." className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">AGENDAMENTO *</label>
                <select value={formSchedule} onChange={e => setFormSchedule(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary">
                  {SCHED_PRESETS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                </select>
              </div>
              <div className="space-y-4 pt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CONFIGURAÇÕES</p>
                {/* Require Approval */}
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-foreground">Requer Aprovação</p><p className="text-[10px] text-muted-foreground">Claude waits for your OK before publishing</p></div>
                  <button onClick={() => setFormApproval(!formApproval)} className={`w-11 h-6 rounded-full transition-all ${formApproval ? 'bg-amber-500' : 'bg-muted'}`}><div className={`w-5 h-5 bg-white rounded-full transition-all mx-0.5 ${formApproval ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                </div>
                {/* Email Notification */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-400" /><p className="text-sm font-medium text-foreground">Notificação por Email</p></div>
                  <button onClick={() => setFormNotifyEmail(!formNotifyEmail)} className={`w-11 h-6 rounded-full transition-all ${formNotifyEmail ? 'bg-amber-500' : 'bg-muted'}`}><div className={`w-5 h-5 bg-white rounded-full transition-all mx-0.5 ${formNotifyEmail ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                </div>
                {/* SMS */}
                <div className="flex items-center justify-between">
                  <div><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-green-400" /><p className="text-sm font-medium text-foreground">Notificação SMS</p></div><p className="text-[10px] text-muted-foreground ml-6">Requires Twilio — for critical alerts only</p></div>
                  <button onClick={() => setFormNotifySms(!formNotifySms)} className={`w-11 h-6 rounded-full transition-all ${formNotifySms ? 'bg-amber-500' : 'bg-muted'}`}><div className={`w-5 h-5 bg-white rounded-full transition-all mx-0.5 ${formNotifySms ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                </div>
                {/* In-App */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-amber-400" /><p className="text-sm font-medium text-foreground">Notificação no App</p></div>
                  <button onClick={() => setFormNotifyInApp(!formNotifyInApp)} className={`w-11 h-6 rounded-full transition-all ${formNotifyInApp ? 'bg-amber-500' : 'bg-muted'}`}><div className={`w-5 h-5 bg-white rounded-full transition-all mx-0.5 ${formNotifyInApp ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={closeModal} className="text-sm text-muted-foreground px-4 py-2.5">Cancelar</button>
              <button onClick={saveTask} disabled={formSaving || !formName || !formPrompt} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl disabled:opacity-50 flex items-center gap-2 hover:from-violet-500 hover:to-indigo-500 transition">
                {formSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Criar Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Execution Log Table Row ───
function LogTableRow({ log, shortDate }: { log: LogEntry; shortDate: (d: string) => string }) {
  const [expanded, setExpanded] = useState(false)
  const statusLabel = log.status === 'SUCCESS' ? 'Completed' : log.status === 'PENDING_APPROVAL' ? 'Approved' : 'Failed'
  const statusColor = log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : log.status === 'PENDING_APPROVAL' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
  const StatusIcon = log.status === 'SUCCESS' ? CheckCircle : log.status === 'PENDING_APPROVAL' ? AlertTriangle : XCircle

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-muted/20 transition cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-foreground">{log.task?.name || log.type}</p>
          {log.task?.type && <p className="text-[10px] text-muted-foreground">{log.task.type.replace(/_/g, ' ')}</p>}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border ${statusColor}`}>
            <StatusIcon className="h-3 w-3" /> {statusLabel}
          </span>
        </td>
        <td className="px-4 py-3"><p className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">{log.output?.substring(0, 80) || '—'}</p></td>
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{shortDate(log.createdAt)}</td>
      </tr>
      {expanded && (
        <tr><td colSpan={4} className="px-4 py-3 bg-muted/10">
          <p className="text-xs text-foreground/70 whitespace-pre-wrap max-h-48 overflow-y-auto">{log.output || 'No output'}</p>
        </td></tr>
      )}
    </>
  )
}
