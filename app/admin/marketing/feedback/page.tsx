'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, MessageSquare, Loader2, Sparkles, User, Bot, BarChart3, RefreshCw } from 'lucide-react'
import { VoiceChatInput } from '@/components/marketing/voice-chat-input'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface FeedbackItem {
  text: string
  date: string
  source: string
  id: string
}

interface FeedbackStats {
  total_feedback: number
  by_source: Record<string, number>
  period_days: number
}

interface Analysis {
  summary?: string
  sentiment?: string
  themes?: string[]
  improvements?: string[]
  strengths?: string[]
  marketing_suggestions?: string[]
  error?: string
}

export default function FeedbackPage() {
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([])
  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function fetchFeedback(analyze: boolean = false) {
    setLoading(true)
    setError(null)

    setChatMessages(prev => [...prev, {
      role: 'user',
      content: analyze
        ? `Fetch and analyze patient feedback from the last ${days} days`
        : `Fetch patient feedback from the last ${days} days`,
      timestamp: new Date(),
    }])

    try {
      const res = await fetch(`/api/admin/marketing/feedback?days=${days}&analyze=${analyze}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setFeedbackItems(data.feedback || [])
      setStats(data.stats)

      if (data.analysis) {
        setAnalysis(data.analysis)
        const a = data.analysis
        let analysisText = ''
        if (a.summary) analysisText += `**Summary:** ${a.summary}\n\n`
        if (a.sentiment) analysisText += `**Sentiment:** ${a.sentiment}\n\n`
        if (a.strengths?.length) analysisText += `**Strengths:** ${a.strengths.join(', ')}\n\n`
        if (a.improvements?.length) analysisText += `**Areas to improve:** ${a.improvements.join(', ')}\n\n`
        if (a.marketing_suggestions?.length) analysisText += `**Marketing ideas:** ${a.marketing_suggestions.join(', ')}`

        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: analysisText || `Analysis complete. Found ${data.feedback?.length || 0} feedback items.`,
          timestamp: new Date(),
        }])
      } else {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `Found **${data.feedback?.length || 0}** feedback items from the last ${days} days.\n\nSources: ${Object.entries(data.stats?.by_source || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'}\n\nClick **Analyze with AI** to get sentiment analysis and marketing insights.`,
          timestamp: new Date(),
        }])
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch feedback'
      setError(msg)
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${msg}`, timestamp: new Date() }])
    } finally {
      setLoading(false)
    }
  }

  async function handleChatMessage(message: string) {
    setChatMessages(prev => [...prev, { role: 'user', content: message, timestamp: new Date() }])
    setChatLoading(true)

    // For now, trigger a fetch + analyze based on the message
    try {
      const res = await fetch(`/api/admin/marketing/feedback?days=${days}&analyze=true`)
      const data = await res.json()

      if (data.analysis) {
        setAnalysis(data.analysis)
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `Based on the feedback data and your question: "${message}"\n\n${data.analysis.summary || 'Analysis updated. Check the insights panel on the right.'}`,
          timestamp: new Date(),
        }])
      } else {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `I found ${data.feedback?.length || 0} feedback items. To get deeper insights, make sure there is feedback data available from appointments and clinical notes.`,
          timestamp: new Date(),
        }])
      }
    } catch (e) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
        timestamp: new Date(),
      }])
    } finally {
      setChatLoading(false)
    }
  }

  const sourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      appointment_note: 'Appointment Notes',
      clinical_note: 'Clinical Notes',
      patient_screening: 'Patient Screening',
    }
    return labels[source] || source
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/marketing" className="text-xs text-muted-foreground hover:text-primary mb-3 inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Marketing
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Feedback Analysis</h1>
            <p className="text-sm text-muted-foreground">AI analyses patient feedback for sentiment, themes, and marketing insights</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT: Controls + Chat (3 cols) */}
        <div className="lg:col-span-3 space-y-4">

          {/* Controls */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Period: last {days} days</label>
                <input type="range" min={7} max={90} step={7} value={days} onChange={e => setDays(Number(e.target.value))} className="w-full accent-primary" />
              </div>

              <button
                onClick={() => fetchFeedback(false)}
                disabled={loading}
                className="bg-muted hover:bg-muted/80 text-foreground font-medium py-2.5 px-5 rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Fetch Data
              </button>

              <button
                onClick={() => fetchFeedback(true)}
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Analyze with AI
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-lg mt-3">{error}</div>
            )}
          </div>

          {/* AI Chat */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Assistant</span>
              <span className="text-xs text-muted-foreground">— ask questions about patient feedback</span>
            </div>

            <div className="h-56 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground/50 text-sm py-6">
                  <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-30" />
                  <p>Click "Analyze with AI" to start,</p>
                  <p>or ask a question about patient feedback.</p>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-foreground'
                  }`}>
                    {msg.content.split('\n').map((line, j) => (
                      <p key={j} className={j > 0 ? 'mt-1' : ''}>
                        {line.split(/(\*\*[^*]+\*\*)/).map((part, k) =>
                          part.startsWith('**') && part.endsWith('**')
                            ? <strong key={k}>{part.slice(2, -2)}</strong>
                            : part
                        )}
                      </p>
                    ))}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-3 w-3" />
                    </div>
                  )}
                </div>
              ))}

              {chatLoading && (
                <div className="flex gap-2 items-center">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  <div className="bg-muted/50 rounded-xl px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-border">
              <VoiceChatInput
                onSend={handleChatMessage}
                disabled={chatLoading || loading}
                placeholder="Ask about patient satisfaction, common complaints..."
              />
            </div>
          </div>

          {/* Feedback List */}
          {feedbackItems.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-medium mb-3">Raw Feedback ({feedbackItems.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {feedbackItems.map((item, i) => (
                  <div key={i} className="bg-muted/30 border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">{sourceLabel(item.source)}</span>
                      <span className="text-[10px] text-muted-foreground">{item.date}</span>
                    </div>
                    <p className="text-xs text-foreground/80 line-clamp-3">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Insights (2 cols) */}
        <div className="lg:col-span-2">
          {stats ? (
            <div className="space-y-4 sticky top-6">
              {/* Stats */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Statistics</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{stats.total_feedback}</p>
                    <p className="text-xs text-muted-foreground">Total items</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{stats.period_days}</p>
                    <p className="text-xs text-muted-foreground">Days</p>
                  </div>
                </div>

                {Object.entries(stats.by_source).length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">By Source</p>
                    {Object.entries(stats.by_source).map(([source, count]) => (
                      <div key={source} className="flex items-center justify-between text-xs">
                        <span className="text-foreground/80">{sourceLabel(source)}</span>
                        <span className="text-primary font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Analysis */}
              {analysis && !analysis.error && (
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">AI Insights</span>
                  </div>

                  {analysis.sentiment && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Overall Sentiment</p>
                      <p className="text-sm text-foreground">{analysis.sentiment}</p>
                    </div>
                  )}

                  {analysis.strengths && analysis.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-emerald-400 mb-1">Strengths</p>
                      <ul className="space-y-1">
                        {analysis.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-foreground/70 flex gap-2">
                            <span className="text-emerald-400 shrink-0">+</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.improvements && analysis.improvements.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-amber-400 mb-1">Areas to Improve</p>
                      <ul className="space-y-1">
                        {analysis.improvements.map((s, i) => (
                          <li key={i} className="text-xs text-foreground/70 flex gap-2">
                            <span className="text-amber-400 shrink-0">!</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.marketing_suggestions && analysis.marketing_suggestions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-primary mb-1">Marketing Ideas</p>
                      <ul className="space-y-1">
                        {analysis.marketing_suggestions.map((s, i) => (
                          <li key={i} className="text-xs text-foreground/70 flex gap-2">
                            <span className="text-primary shrink-0">→</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border rounded-xl h-64 flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center p-8">
                <BarChart3 className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>Insights appear here</p>
                <p className="text-xs mt-1">Fetch and analyze feedback to see results</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
