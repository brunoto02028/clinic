'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, BookOpen, Loader2, Copy, Sparkles, User, Bot, Eye,
  ImageIcon, Edit3, ChevronDown, ChevronUp, BookMarked, X
} from 'lucide-react'
import { VoiceChatInput } from '@/components/marketing/voice-chat-input'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Section {
  heading: string
  content: string
  type: string
  image_prompt?: string
  image_url?: string
}

interface EbookContent {
  title: string
  subtitle: string
  price_suggestion: string
  cover_image_prompt?: string
  cover_image_url?: string
  sections: Section[]
  key_takeaways: string[]
  target_keywords: string[]
  references?: string[]
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
  const [content, setContent] = useState<EbookContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [editingSection, setEditingSection] = useState<number | null>(null)
  const [editPrompt, setEditPrompt] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [generatingImage, setGeneratingImage] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<number | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // AI Suggestions
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([])
  const [coverSuggestions, setCoverSuggestions] = useState<string[]>([])
  const [suggestingTitle, setSuggestingTitle] = useState(false)
  const [suggestingTopic, setSuggestingTopic] = useState(false)
  const [suggestingCover, setSuggestingCover] = useState(false)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  function addChat(role: 'user' | 'assistant', content: string) {
    setChatMessages(prev => [...prev, { role, content }])
  }

  async function suggestTitles() {
    setSuggestingTitle(true); setTitleSuggestions([])
    try {
      const res = await fetch('/api/admin/marketing/generate-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest', field: 'title', context: { topic, audience } }),
      })
      const data = await res.json()
      if (data.suggestions) setTitleSuggestions(data.suggestions)
      addChat('assistant', `Here are some title suggestions:\n${(data.suggestions || []).map((s: string, i: number) => `${i + 1}. **${s}**`).join('\n')}`)
    } catch {} finally { setSuggestingTitle(false) }
  }

  async function suggestTopics() {
    setSuggestingTopic(true); setTopicSuggestions([])
    try {
      const res = await fetch('/api/admin/marketing/generate-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest', field: 'topic', context: { title, audience } }),
      })
      const data = await res.json()
      if (data.suggestions) setTopicSuggestions(data.suggestions)
      addChat('assistant', `Topic suggestions:\n${(data.suggestions || []).map((s: string, i: number) => `${i + 1}. **${s}**`).join('\n')}`)
    } catch {} finally { setSuggestingTopic(false) }
  }

  async function suggestCovers() {
    setSuggestingCover(true); setCoverSuggestions([])
    try {
      const res = await fetch('/api/admin/marketing/generate-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest', field: 'cover', context: { title: content?.title || title, topic: content?.subtitle || topic } }),
      })
      const data = await res.json()
      if (data.suggestions) setCoverSuggestions(data.suggestions)
      addChat('assistant', `Cover style suggestions:\n${(data.suggestions || []).map((s: string, i: number) => `${i + 1}. **${s}**`).join('\n')}`)
    } catch {} finally { setSuggestingCover(false) }
  }

  function selectSuggestion(s: { title: string; topic: string }) {
    setTitle(s.title)
    setTopic(s.topic)
    addChat('assistant', `Selected: **"${s.title}"**\nTopic: ${s.topic}\n\nAdjust settings or tell me more via chat. When ready, click **Generate**.`)
  }

  async function generateContent() {
    if (!title || !topic) { setError('Title and topic are required'); return }
    setLoading(true)
    setError(null)
    addChat('user', `Generate eBook: "${title}" — ${topic}, ~${pages} pages${includeExercises ? ', with exercises' : ''}`)

    try {
      // Collect extra instructions from chat history
      const userMessages = chatMessages.filter(m => m.role === 'user').map(m => m.content)
      const extraInstructions = userMessages.length > 0 ? userMessages.join('\n') : undefined

      const res = await fetch('/api/admin/marketing/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, topic, audience, pages, includeExercises, action: 'generate', extraInstructions }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setContent(data.content)
      const refs = data.content.references?.length || 0
      addChat('assistant', `eBook generated! **"${data.content.title}"** — ${data.content.sections?.length || 0} sections, ${refs} references.\n\nPrice: ${data.content.price_suggestion}\n\n**Claude** (text) + **Gemini** (images). Click any section to edit or generate images.`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Generation failed'
      setError(msg)
      addChat('assistant', `Error: ${msg}`)
    } finally { setLoading(false) }
  }

  async function editSection(index: number) {
    if (!content || !editPrompt.trim()) return
    setEditLoading(true)

    try {
      const res = await fetch('/api/admin/marketing/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit-section', content, sectionIndex: index, editPrompt }),
      })
      const data = await res.json()
      if (data.content) {
        setContent(data.content)
        addChat('assistant', `Section ${index + 1} updated: **"${data.content.sections[index]?.heading}"**`)
      }
    } catch (e) {
      addChat('assistant', `Edit error: ${e instanceof Error ? e.message : 'Failed'}`)
    } finally {
      setEditLoading(false)
      setEditingSection(null)
      setEditPrompt('')
    }
  }

  async function generateSectionImage(index: number, prompt: string) {
    if (!content || !prompt) return
    setGeneratingImage(`section-${index}`)

    try {
      const res = await fetch('/api/admin/marketing/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-image', imagePrompt: prompt }),
      })
      const data = await res.json()
      if (data.imageUrl) {
        const updated = { ...content }
        updated.sections = [...content.sections]
        updated.sections[index] = { ...updated.sections[index], image_url: data.imageUrl }
        setContent(updated)
        addChat('assistant', `Image generated for section ${index + 1} using **Gemini**.`)
      }
    } catch (e) {
      addChat('assistant', `Image error: ${e instanceof Error ? e.message : 'Failed'}`)
    } finally { setGeneratingImage(null) }
  }

  async function generateCoverImage() {
    if (!content?.cover_image_prompt) return
    setGeneratingImage('cover')

    try {
      const res = await fetch('/api/admin/marketing/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-image', imagePrompt: content.cover_image_prompt }),
      })
      const data = await res.json()
      if (data.imageUrl) {
        setContent({ ...content, cover_image_url: data.imageUrl })
        addChat('assistant', 'Cover image generated with **Gemini**.')
      }
    } catch (e) {
      addChat('assistant', `Cover image error: ${e instanceof Error ? e.message : 'Failed'}`)
    } finally { setGeneratingImage(null) }
  }

  async function exportPdf() {
    if (!content) return
    try {
      const res = await fetch('/api/admin/marketing/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export', content }),
      })
      setPreviewHtml(await res.text())
      setShowPreview(true)
    } catch {}
  }

  async function handleChatMessage(message: string) {
    addChat('user', message)
    setChatLoading(true)

    try {
      if (!content) {
        if (!title) setTitle(message.length > 60 ? message.substring(0, 60) + '...' : message)
        if (!topic) setTopic(message)
        addChat('assistant', `Topic set: **"${message}"**. Add more details or click **Generate**.`)
      } else {
        // Regenerate with the new instruction
        const res = await fetch('/api/admin/marketing/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: content.title, topic: content.subtitle, audience, pages, includeExercises, action: 'generate', extraInstructions: message }),
        })
        const data = await res.json()
        if (data.content) {
          setContent(data.content)
          addChat('assistant', `Regenerated **"${data.content.title}"** with ${data.content.sections?.length || 0} sections based on your instructions.`)
        }
      }
    } catch (e) {
      addChat('assistant', `Error: ${e instanceof Error ? e.message : 'Unknown'}`)
    } finally { setChatLoading(false) }
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
            <h1 className="text-2xl font-bold text-foreground">eBook & PDF Generator</h1>
            <p className="text-sm text-muted-foreground">Claude (text) + Gemini (images) — briefing via chat, full editing, references</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT: Config + Chat */}
        <div className="lg:col-span-3 space-y-4">

          {/* Quick Start */}
          {!content && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Quick Start — click a topic or describe your eBook in the chat</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TOPIC_SUGGESTIONS.map(s => (
                  <button key={s.title} onClick={() => selectSuggestion(s)} className="text-left p-3 bg-muted/30 border border-border rounded-lg hover:border-primary/50 transition-colors">
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.topic}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Config */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">eBook Title</label>
                  <button onClick={suggestTitles} disabled={suggestingTitle} className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 disabled:opacity-50 transition">
                    {suggestingTitle ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI Suggest
                  </button>
                </div>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Complete Guide to Knee Recovery" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary placeholder-muted-foreground/50" />
                {titleSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {titleSuggestions.map((s, i) => (
                      <button key={i} onClick={() => { setTitle(s); setTitleSuggestions([]) }} className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-lg hover:bg-amber-500/20 transition truncate max-w-full">{s}</button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Topic / Subject</label>
                  <button onClick={suggestTopics} disabled={suggestingTopic} className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 disabled:opacity-50 transition">
                    {suggestingTopic ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI Suggest
                  </button>
                </div>
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="What should the eBook cover?" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary placeholder-muted-foreground/50" />
                {topicSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {topicSuggestions.map((s, i) => (
                      <button key={i} onClick={() => { setTopic(s); setTopicSuggestions([]) }} className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-lg hover:bg-amber-500/20 transition truncate max-w-full">{s}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Pages: ~{pages}</label>
                <input type="range" min={6} max={30} step={2} value={pages} onChange={e => setPages(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeExercises} onChange={e => setIncludeExercises(e.target.checked)} className="accent-primary" />
                <span className="text-sm text-muted-foreground">Exercises</span>
              </label>
              <button onClick={generateContent} disabled={loading || !title || !topic} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-all flex items-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? 'Generating...' : content ? 'Regenerate' : 'Generate'}
              </button>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-lg">{error}</div>}
          </div>

          {/* AI Chat */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">AI Briefing Chat</span>
              <span className="text-[10px] bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full">Claude</span>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full">Gemini (images)</span>
            </div>

            <div className="h-64 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground/50 text-sm py-8">
                  <BookOpen className="h-6 w-6 mx-auto mb-2 opacity-30" />
                  <p>Describe your eBook — type or speak.</p>
                  <p className="text-xs mt-1">Tell me: topic, audience, style, what to include, what angle to take...</p>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-foreground'}`}>
                    {msg.content.split('\n').map((line, j) => (
                      <p key={j} className={j > 0 ? 'mt-1' : ''}>
                        {line.split(/(\*\*[^*]+\*\*)/).map((part, k) =>
                          part.startsWith('**') && part.endsWith('**') ? <strong key={k}>{part.slice(2, -2)}</strong> : part
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
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Bot className="h-3 w-3 text-primary" /></div>
                  <div className="bg-muted/50 rounded-xl px-3 py-2"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-border">
              <VoiceChatInput onSend={handleChatMessage} disabled={chatLoading || loading} placeholder="Describe your eBook or ask to refine..." />
            </div>
          </div>
        </div>

        {/* RIGHT: Preview */}
        <div className="lg:col-span-2">
          {content ? (
            <div className="space-y-4 sticky top-6">
              {/* Actions bar */}
              <div className="bg-card border border-border rounded-xl p-3 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">eBook Preview</span>
                <div className="flex gap-2">
                  <button onClick={exportPdf} className="text-xs bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-lg transition flex items-center gap-1"><Eye className="h-3 w-3" /> PDF</button>
                  <button onClick={() => navigator.clipboard.writeText(JSON.stringify(content, null, 2))} className="text-xs bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-lg transition flex items-center gap-1"><Copy className="h-3 w-3" /> JSON</button>
                </div>
              </div>

              <div className="max-h-[calc(100vh-200px)] overflow-y-auto space-y-3 pr-1">
                {/* Cover */}
                <div className="bg-gradient-to-br from-slate-800 to-teal-900 text-white rounded-xl overflow-hidden">
                  {content.cover_image_url && (
                    <img src={content.cover_image_url} alt="Cover" className="w-full h-40 object-cover" />
                  )}
                  <div className="p-5">
                    <p className="text-[10px] uppercase tracking-widest text-teal-300 mb-2">BPR Professional Guide</p>
                    <h2 className="text-lg font-bold mb-1">{content.title}</h2>
                    <p className="text-sm text-white/70">{content.subtitle}</p>
                    {content.price_suggestion && <p className="text-xs text-amber-300 mt-3">Price: {content.price_suggestion}</p>}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {content.cover_image_prompt && !content.cover_image_url && (
                        <button onClick={generateCoverImage} disabled={generatingImage === 'cover'} className="text-[10px] bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1 disabled:opacity-50">
                          {generatingImage === 'cover' ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
                          Generate Cover Image
                        </button>
                      )}
                      <button onClick={suggestCovers} disabled={suggestingCover} className="text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1.5 rounded-lg transition flex items-center gap-1 disabled:opacity-50">
                        {suggestingCover ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        AI Cover Ideas
                      </button>
                    </div>
                    {coverSuggestions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {coverSuggestions.map((s, i) => (
                          <button key={i} onClick={() => { if (content) { setContent({ ...content, cover_image_prompt: s }); setCoverSuggestions([]) } }} className="block w-full text-left text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1.5 rounded-lg text-white/80 transition truncate">
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sections */}
                {content.sections?.map((section, i) => (
                  <div key={i} className={`border rounded-xl overflow-hidden ${section.type === 'exercise' ? 'border-teal-500/30 bg-teal-500/5' : 'border-border bg-card'}`}>
                    {/* Section image */}
                    {section.image_url && <img src={section.image_url} alt={section.heading} className="w-full h-32 object-cover" />}

                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Section {i + 1} · {section.type}</p>
                          <h3 className="text-sm font-semibold text-foreground mt-0.5">{section.heading}</h3>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => setExpandedSection(expandedSection === i ? null : i)} className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition" title="Expand">
                            {expandedSection === i ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                          <button onClick={() => { setEditingSection(i); setEditPrompt('') }} className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition" title="Edit with AI">
                            <Edit3 className="h-3 w-3" />
                          </button>
                          {section.image_prompt && !section.image_url && (
                            <button onClick={() => generateSectionImage(i, section.image_prompt!)} disabled={generatingImage === `section-${i}`} className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition disabled:opacity-50" title="Generate Image">
                              {generatingImage === `section-${i}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded content */}
                      {expandedSection === i ? (
                        <div className="mt-2 text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">{section.content}</div>
                      ) : (
                        <p className="mt-1 text-xs text-foreground/60 line-clamp-2">{section.content}</p>
                      )}

                      {/* Edit section inline */}
                      {editingSection === i && (
                        <div className="mt-3 bg-muted/30 border border-border rounded-lg p-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-primary font-medium">Edit with Claude AI</p>
                            <button onClick={() => setEditingSection(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                          </div>
                          <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="e.g. Make it more detailed, add statistics, change the tone..." rows={2} className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary placeholder-muted-foreground/50 resize-none" />
                          <button onClick={() => editSection(i)} disabled={editLoading || !editPrompt.trim()} className="text-[10px] bg-primary text-primary-foreground px-3 py-1 rounded-lg disabled:opacity-50 flex items-center gap-1">
                            {editLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Apply
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Key Takeaways */}
                {content.key_takeaways?.length > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                    <p className="text-xs font-semibold text-amber-400 mb-2">Key Takeaways</p>
                    <ul className="space-y-1">
                      {content.key_takeaways.map((t, i) => (
                        <li key={i} className="text-xs text-foreground/70 flex gap-2"><span className="text-amber-400 shrink-0">•</span> {t}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* References */}
                {content.references && content.references.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <BookMarked className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs font-semibold text-foreground">References ({content.references.length})</p>
                    </div>
                    <ol className="space-y-1 list-decimal list-inside">
                      {content.references.map((ref, i) => (
                        <li key={i} className="text-[10px] text-foreground/60 leading-relaxed">{ref}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border rounded-xl h-64 flex items-center justify-center">
              <div className="text-center p-8">
                <BookOpen className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">eBook preview appears here</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Describe your eBook in the chat or select a topic</p>
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
              <span className="text-sm font-medium text-gray-800">PDF Preview — Ctrl+P to save as PDF</span>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-800 text-sm">Close</button>
            </div>
            <iframe srcDoc={previewHtml} className="w-full h-[80vh]" title="PDF Preview" />
          </div>
        </div>
      )}
    </div>
  )
}
