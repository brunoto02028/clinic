'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Loader2, Copy, Check, Sparkles, User, Bot, Download, Eye } from 'lucide-react'
import { VoiceChatInput } from '@/components/marketing/voice-chat-input'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface PdfContent {
  title: string
  subtitle: string
  price_suggestion: string
  sections: Array<{ heading: string; content: string; type: string }>
  key_takeaways: string[]
  target_keywords: string[]
}

const TOPIC_SUGGESTIONS = [
  { title: 'Complete Guide to Knee Recovery', topic: 'knee rehabilitation after injury or surgery' },
  { title: 'Understanding Foot Pain', topic: 'common causes of foot pain and how custom insoles help' },
  { title: 'MLS Laser Therapy Explained', topic: 'how MLS laser therapy works for pain relief and healing' },
  { title: 'Sports Injury Prevention', topic: 'preventing common sports injuries with proper biomechanics' },
  { title: 'Back Pain Relief Guide', topic: 'managing and treating chronic back pain through physiotherapy' },
  { title: 'Postural Assessment Guide', topic: 'understanding postural imbalances and correction exercises' },
]

export default function EbooksPage() {
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('adults seeking physiotherapy and rehabilitation')
  const [pages, setPages] = useState(12)
  const [includeExercises, setIncludeExercises] = useState(true)
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState<PdfContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  function selectSuggestion(suggestion: { title: string; topic: string }) {
    setTitle(suggestion.title)
    setTopic(suggestion.topic)
    setChatMessages(prev => [...prev, {
      role: 'assistant',
      content: `Selected: **"${suggestion.title}"**\nTopic: ${suggestion.topic}\n\nYou can adjust the settings and click Generate, or tell me more about what you'd like to include.`,
      timestamp: new Date(),
    }])
  }

  async function generateContent() {
    if (!title || !topic) {
      setError('Title and topic are required')
      return
    }
    setLoading(true)
    setError(null)

    setChatMessages(prev => [...prev, {
      role: 'user',
      content: `Generate eBook: "${title}" — ${topic}, ~${pages} pages${includeExercises ? ' with exercises' : ''}`,
      timestamp: new Date(),
    }])

    try {
      const res = await fetch('/api/admin/marketing/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, topic, audience, pages, includeExercises, action: 'generate' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setContent(data.content)
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `eBook content generated! **"${data.content.title}"** with ${data.content.sections?.length || 0} sections.\n\nSuggested price: ${data.content.price_suggestion}\n\nYou can preview it, export to PDF, or ask me to refine sections.`,
        timestamp: new Date(),
      }])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Generation failed'
      setError(msg)
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${msg}`, timestamp: new Date() }])
    } finally {
      setLoading(false)
    }
  }

  async function exportPdf() {
    if (!content) return
    try {
      const res = await fetch('/api/admin/marketing/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export', content }),
      })
      const html = await res.text()
      setPreviewHtml(html)
      setShowPreview(true)
    } catch (e) {
      console.error('Export failed:', e)
    }
  }

  async function handleChatMessage(message: string) {
    setChatMessages(prev => [...prev, { role: 'user', content: message, timestamp: new Date() }])
    setChatLoading(true)

    try {
      // If no content yet, treat as topic description
      if (!content) {
        // Try to extract title/topic from the message
        if (!title && !topic) {
          setTopic(message)
          setTitle(message.length > 60 ? message.substring(0, 60) + '...' : message)
        }
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `I've set the topic to: **"${message}"**. Adjust the title if needed and click Generate to create the eBook content.`,
          timestamp: new Date(),
        }])
      } else {
        // Regenerate with refinement
        const res = await fetch('/api/admin/marketing/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, topic: message, audience, pages, includeExercises, action: 'generate' }),
        })
        const data = await res.json()
        if (data.content) {
          setContent(data.content)
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `Updated! **"${data.content.title}"** — ${data.content.sections?.length || 0} sections regenerated based on your feedback.`,
            timestamp: new Date(),
          }])
        }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/marketing" className="text-xs text-muted-foreground hover:text-primary mb-3 inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Marketing
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">eBook & PDF Generator</h1>
            <p className="text-sm text-muted-foreground">Create illustrated guides to sell — AI writes content, you review and export</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT: Config + Chat (3 cols) */}
        <div className="lg:col-span-3 space-y-4">

          {/* Topic Suggestions */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Quick Start — click a topic</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TOPIC_SUGGESTIONS.map((s) => (
                <button
                  key={s.title}
                  onClick={() => selectSuggestion(s)}
                  className="text-left p-3 bg-muted/30 border border-border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.topic}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Config */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">eBook Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Complete Guide to Knee Recovery"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary placeholder-muted-foreground/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Topic / Subject</label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="What should the eBook cover?"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary placeholder-muted-foreground/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Pages: ~{pages}</label>
                <input type="range" min={6} max={30} step={2} value={pages} onChange={e => setPages(Number(e.target.value))} className="w-full accent-primary" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeExercises} onChange={e => setIncludeExercises(e.target.checked)} className="accent-primary" />
                <span className="text-sm text-muted-foreground">Include exercises</span>
              </label>

              <button
                onClick={generateContent}
                disabled={loading || !title || !topic}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-lg">{error}</div>
            )}
          </div>

          {/* AI Chat */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Assistant</span>
              <span className="text-xs text-muted-foreground">— describe what you want or refine the content</span>
            </div>

            <div className="h-56 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground/50 text-sm py-6">
                  <BookOpen className="h-6 w-6 mx-auto mb-2 opacity-30" />
                  <p>Pick a topic above or describe your eBook.</p>
                  <p>You can type or use the mic button to speak.</p>
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
                placeholder="Describe your eBook idea or ask to refine..."
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Preview (2 cols) */}
        <div className="lg:col-span-2">
          {content ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden sticky top-6">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium">eBook Preview</span>
                <div className="flex gap-2">
                  <button
                    onClick={exportPdf}
                    className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" /> Preview PDF
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(JSON.stringify(content, null, 2)) }}
                    className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" /> Copy JSON
                  </button>
                </div>
              </div>

              <div className="p-4 max-h-[500px] overflow-y-auto space-y-4">
                {/* Cover */}
                <div className="bg-gradient-to-br from-slate-800 to-teal-900 text-white rounded-xl p-6">
                  <p className="text-[10px] uppercase tracking-widest text-teal-300 mb-2">BPR Professional Guide</p>
                  <h2 className="text-lg font-bold mb-1">{content.title}</h2>
                  <p className="text-sm text-white/60">{content.subtitle}</p>
                  {content.price_suggestion && (
                    <p className="text-xs text-amber-300 mt-3">Suggested price: {content.price_suggestion}</p>
                  )}
                </div>

                {/* Sections */}
                {content.sections?.map((section, i) => (
                  <div key={i} className={`border border-border rounded-lg p-3 ${section.type === 'exercise' ? 'bg-teal-500/5 border-teal-500/20' : ''}`}>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Section {i + 1} · {section.type}</p>
                    <h3 className="text-sm font-semibold text-foreground mb-2">{section.heading}</h3>
                    <p className="text-xs text-foreground/70 leading-relaxed line-clamp-4">{section.content}</p>
                  </div>
                ))}

                {/* Key Takeaways */}
                {content.key_takeaways?.length > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-400 mb-2">Key Takeaways</p>
                    <ul className="space-y-1">
                      {content.key_takeaways.map((t, i) => (
                        <li key={i} className="text-xs text-foreground/70 flex gap-2">
                          <span className="text-amber-400 shrink-0">•</span> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border rounded-xl h-64 flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center p-8">
                <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>eBook preview appears here</p>
                <p className="text-xs mt-1">Select a topic and generate</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PDF Preview Modal */}
      {showPreview && previewHtml && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <span className="text-sm font-medium text-gray-800">PDF Preview — use Ctrl+P to print/save as PDF</span>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-800 text-sm">Close</button>
            </div>
            <iframe srcDoc={previewHtml} className="w-full h-[80vh]" title="PDF Preview" />
          </div>
        </div>
      )}
    </div>
  )
}
