'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Bot, Send, Loader2, Plus, Play, Pause, Trash2, Clock, CheckCircle,
  XCircle, AlertTriangle, User, Sparkles, FileText, Mail, BarChart3,
  Calendar, Mic, MicOff, ChevronDown, ChevronUp, Zap, History
} from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  durationMs?: number
}

interface Task {
  id: string
  name: string
  description?: string
  type: string
  prompt: string
  schedule?: string
  isActive: boolean
  requiresApproval: boolean
  lastRunAt?: string
  runCount: number
  _count?: { logs: number }
}

interface LogEntry {
  id: string
  type: string
  status: string
  input?: string
  output?: string
  durationMs?: number
  createdAt: string
  task?: { name: string; type: string }
}

interface Template {
  name: string
  type: string
  description: string
  prompt: string
  schedule: string
  config: Record<string, unknown>
  requiresApproval: boolean
}

const TYPE_ICONS: Record<string, typeof Mail> = {
  EMAIL_FOLLOWUP: Mail,
  SOCIAL_POST: Sparkles,
  REPORT: BarChart3,
  EMAIL_CHECK: Mail,
  PATIENT_OUTREACH: User,
  CUSTOM: Zap,
}

const TYPE_COLORS: Record<string, string> = {
  EMAIL_FOLLOWUP: 'text-blue-400 bg-blue-500/10',
  SOCIAL_POST: 'text-pink-400 bg-pink-500/10',
  REPORT: 'text-emerald-400 bg-emerald-500/10',
  EMAIL_CHECK: 'text-cyan-400 bg-cyan-500/10',
  PATIENT_OUTREACH: 'text-amber-400 bg-amber-500/10',
  CUSTOM: 'text-purple-400 bg-purple-500/10',
}

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: 'text-emerald-400',
  FAILED: 'text-red-400',
  PENDING_APPROVAL: 'text-amber-400',
}

type Tab = 'chat' | 'tasks' | 'logs'

export default function AICoWorkerPage() {
  const [tab, setTab] = useState<Tab>('chat')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [executing, setExecuting] = useState<string | null>(null)
  const [executionResult, setExecutionResult] = useState<{ taskId: string; output: string } | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const isSupported = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    fetchTasks()
    fetchTemplates()
  }, [])

  useEffect(() => {
    if (tab === 'logs') fetchLogs()
  }, [tab])

  async function fetchTasks() {
    try {
      const res = await fetch('/api/admin/coworker/tasks')
      const data = await res.json()
      if (data.tasks) setTasks(data.tasks)
    } catch {}
  }

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/admin/coworker/tasks?action=templates')
      const data = await res.json()
      if (data.templates) setTemplates(data.templates)
    } catch {}
  }

  async function fetchLogs() {
    try {
      const res = await fetch('/api/admin/coworker/logs?limit=50')
      const data = await res.json()
      if (data.logs) setLogs(data.logs)
    } catch {}
  }

  // Voice
  function toggleVoice() {
    if (!isSupported) return
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = 'pt-BR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (e: any) => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) text += e.results[i][0].transcript + ' '
      }
      if (text.trim()) setChatInput(prev => (prev + ' ' + text).trim())
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  // Chat
  async function sendChat() {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: msg }])
    setChatLoading(true)

    try {
      const history = chatMessages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/admin/coworker/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply, durationMs: data.durationMs }])
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Failed'}` }])
    } finally {
      setChatLoading(false)
    }
  }

  // Create task from template
  async function createFromTemplate(template: Template) {
    try {
      const res = await fetch('/api/admin/coworker/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      })
      const data = await res.json()
      if (data.success) {
        await fetchTasks()
        setShowTemplates(false)
        setTab('tasks')
      }
    } catch {}
  }

  // Execute task
  async function runTask(taskId: string) {
    setExecuting(taskId)
    setExecutionResult(null)
    try {
      const res = await fetch('/api/admin/coworker/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
      const data = await res.json()
      setExecutionResult({ taskId, output: data.output || data.error })
      await fetchTasks()
    } catch (e) {
      setExecutionResult({ taskId, output: `Error: ${e instanceof Error ? e.message : 'Failed'}` })
    } finally {
      setExecuting(null)
    }
  }

  // Toggle task active
  async function toggleTask(task: Task) {
    try {
      await fetch('/api/admin/coworker/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, isActive: !task.isActive }),
      })
      await fetchTasks()
    } catch {}
  }

  // Delete task
  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task and all its logs?')) return
    try {
      await fetch(`/api/admin/coworker/tasks?id=${taskId}`, { method: 'DELETE' })
      await fetchTasks()
    } catch {}
  }

  function formatDuration(ms?: number) {
    if (!ms) return ''
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
  }

  function cronToHuman(cron?: string) {
    if (!cron) return 'Manual only'
    const parts = cron.split(' ')
    const h = parts[1], d = parts[4]
    const days = d === '*' ? 'Daily' : d === '1' ? 'Monday' : d === '1-5' ? 'Weekdays' : d === '5' ? 'Friday' : d === '2,4' ? 'Tue/Thu' : d
    const time = `${h?.padStart(2, '0')}:${parts[0]?.padStart(2, '0')}`
    return `${days} at ${time}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Co-Worker</h1>
            <p className="text-sm text-muted-foreground">Your autonomous AI assistant — chats, executes tasks, contacts patients</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1 w-fit">
        {([
          { key: 'chat' as Tab, label: 'Chat', icon: Bot },
          { key: 'tasks' as Tab, label: 'Tasks', icon: Calendar },
          { key: 'logs' as Tab, label: 'Activity Log', icon: History },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
            {t.key === 'tasks' && tasks.length > 0 && (
              <span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full">{tasks.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* CHAT TAB */}
      {tab === 'chat' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="h-[500px] overflow-y-auto p-5 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-16">
                <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
                <h3 className="text-lg font-medium text-foreground mb-1">BPR AI Co-Worker</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  I have access to your entire clinic system. Ask me anything — patient data, appointment stats, draft emails, or give me tasks to execute.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  {[
                    'How many patients haven\'t visited in 30 days?',
                    'Draft a follow-up email for inactive patients',
                    'Weekly performance summary',
                    'What appointments are scheduled today?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => { setChatInput(q); }}
                      className="text-xs bg-muted/50 border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary/50 transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted/50 text-foreground rounded-bl-md'
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.durationMs && (
                    <p className="text-[10px] opacity-50 mt-1">{formatDuration(msg.durationMs)}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t border-border p-4">
            <div className="flex items-end gap-2">
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                placeholder="Ask anything about your clinic or give a task..."
                rows={1}
                className="flex-1 bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary resize-none min-h-[44px] max-h-[120px] placeholder-muted-foreground/50"
                style={{ height: 'auto', maxHeight: 120 }}
              />
              {isSupported && (
                <button
                  onClick={toggleVoice}
                  className={`p-3 rounded-xl transition-all ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-muted/50 text-muted-foreground hover:text-foreground'}`}
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              )}
              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                className="p-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 transition-all"
              >
                {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            {listening && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Listening... speak now
              </p>
            )}
          </div>
        </div>
      )}

      {/* TASKS TAB */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Scheduled Tasks</h2>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 hover:from-violet-500 hover:to-indigo-500 transition"
            >
              <Plus className="h-4 w-4" /> {showTemplates ? 'Hide Templates' : 'Add Task'}
            </button>
          </div>

          {/* Templates */}
          {showTemplates && (
            <div className="bg-card border border-primary/20 rounded-xl p-4">
              <p className="text-xs font-medium text-primary mb-3">Task Templates — click to add</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {templates.map((t, i) => {
                  const Icon = TYPE_ICONS[t.type] || Zap
                  return (
                    <button
                      key={i}
                      onClick={() => createFromTemplate(t)}
                      className="text-left p-4 bg-muted/30 border border-border rounded-xl hover:border-primary/50 transition group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${TYPE_COLORS[t.type] || 'bg-muted'}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm font-medium group-hover:text-primary transition">{t.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-9">{t.description}</p>
                      <p className="text-[10px] text-muted-foreground/60 ml-9 mt-1">{cronToHuman(t.schedule)}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Active Tasks */}
          {tasks.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">No tasks yet</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Click "Add Task" to get started with templates</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => {
                const Icon = TYPE_ICONS[task.type] || Zap
                const isRunning = executing === task.id
                return (
                  <div key={task.id} className={`bg-card border rounded-xl p-4 transition ${task.isActive ? 'border-border' : 'border-border/50 opacity-60'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${TYPE_COLORS[task.type] || 'bg-muted'}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold">{task.name}</h3>
                          {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>}
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {cronToHuman(task.schedule || undefined)}</span>
                            <span>Runs: {task.runCount}</span>
                            {task.lastRunAt && <span>Last: {new Date(task.lastRunAt).toLocaleDateString()}</span>}
                            {task.requiresApproval && <span className="text-amber-400 flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" /> Approval needed</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => runTask(task.id)}
                          disabled={isRunning}
                          className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition disabled:opacity-50"
                          title="Run now"
                        >
                          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => toggleTask(task)}
                          className={`p-2 rounded-lg transition ${task.isActive ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                          title={task.isActive ? 'Pause' : 'Activate'}
                        >
                          {task.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {executionResult?.taskId === task.id && (
                      <div className="mt-3 bg-muted/30 border border-border rounded-lg p-3 text-xs text-foreground/80 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {executionResult.output}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* LOGS TAB */}
      {tab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Activity Log</h2>
            <button onClick={fetchLogs} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition">
              <History className="h-3 w-3" /> Refresh
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
              <History className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <LogItem key={log.id} log={log} formatDuration={formatDuration} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LogItem({ log, formatDuration }: { log: LogEntry; formatDuration: (ms?: number) => string }) {
  const [expanded, setExpanded] = useState(false)

  const statusIcon = log.status === 'SUCCESS' ? CheckCircle : log.status === 'FAILED' ? XCircle : AlertTriangle
  const StatusIcon = statusIcon

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 transition"
      >
        <div className="flex items-center gap-3">
          <StatusIcon className={`h-4 w-4 shrink-0 ${STATUS_STYLES[log.status] || 'text-muted-foreground'}`} />
          <div>
            <p className="text-sm font-medium">{log.task?.name || log.type}</p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(log.createdAt).toLocaleString()} {log.durationMs ? `· ${formatDuration(log.durationMs)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            log.type === 'CHAT' ? 'bg-violet-500/10 text-violet-400' :
            log.type === 'TASK_RUN' ? 'bg-blue-500/10 text-blue-400' :
            log.type === 'ERROR' ? 'bg-red-500/10 text-red-400' :
            'bg-muted text-muted-foreground'
          }`}>{log.type}</span>
          {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-3 space-y-2">
          {log.input && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Input</p>
              <p className="text-xs text-foreground/70 whitespace-pre-wrap bg-muted/30 rounded-lg p-2 max-h-32 overflow-y-auto">{log.input}</p>
            </div>
          )}
          {log.output && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Output</p>
              <p className="text-xs text-foreground/70 whitespace-pre-wrap bg-muted/30 rounded-lg p-2 max-h-48 overflow-y-auto">{log.output}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
