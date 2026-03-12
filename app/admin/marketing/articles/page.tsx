'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Loader2, Copy, Check, Sparkles, User, Bot, ExternalLink, Edit } from 'lucide-react'
import { VoiceChatInput } from '@/components/marketing/voice-chat-input'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface GeneratedArticle {
  id?: string
  title: string
  slug: string
  content: string
  excerpt: string
  meta_description: string
  tags: string[]
  word_count: number
}

export default function ArticlesPage() {
  const searchParams = useSearchParams()
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '')
  const [title, setTitle] = useState(searchParams.get('title') || '')
  const [wordCount, setWordCount] = useState(1200)
  const [loading, setLoading] = useState(false)
  const [article, setArticle] = useState<GeneratedArticle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // If keyword/title came from URL params, add welcome message
  useEffect(() => {
    if (keyword || title) {
      setChatMessages([{
        role: 'assistant',
        content: `I've pre-loaded the keyword **"${keyword}"**${title ? ` with title **"${title}"**` : ''}. You can generate the article now, or tell me more about what angle you'd like to take.`,
        timestamp: new Date(),
      }])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function generateArticle() {
    if (!keyword) {
      setError('Enter a keyword to generate an article')
      return
    }
    setLoading(true)
    setError(null)

    setChatMessages(prev => [...prev, {
      role: 'user',
      content: `Generate SEO article for keyword: "${keyword}"${title ? `, title: "${title}"` : ''}, ~${wordCount} words`,
      timestamp: new Date(),
    }])

    try {
      const res = await fetch('/api/admin/marketing/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, title: title || undefined, wordCount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setArticle(data.article)
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Article generated! **"${data.article.title}"** — ${data.article.word_count} words.\n\nMeta: ${data.article.meta_description}\n\nYou can edit it below, copy the content, or ask me to refine specific sections.`,
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

  async function handleChatMessage(message: string) {
    setChatMessages(prev => [...prev, { role: 'user', content: message, timestamp: new Date() }])
    setChatLoading(true)

    try {
      // Use Claude to refine or answer questions about the article
      const res = await fetch('/api/admin/marketing/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keyword || message,
          title: title || undefined,
          wordCount,
          // Pass the user message as the keyword/refinement
          ...(article ? { refinement: message, existingContent: article.content.substring(0, 2000) } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.article) {
        setArticle(data.article)
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `Updated! **"${data.article.title}"** — ${data.article.word_count} words. Check the preview below.`,
          timestamp: new Date(),
        }])
      }
    } catch (e) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${e instanceof Error ? e.message : 'Unknown error'}. Try again or rephrase your request.`,
        timestamp: new Date(),
      }])
    } finally {
      setChatLoading(false)
    }
  }

  function copyContent() {
    if (!article) return
    navigator.clipboard.writeText(article.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/marketing" className="text-xs text-muted-foreground hover:text-primary mb-3 inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Marketing
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">SEO Article Generator</h1>
            <p className="text-sm text-muted-foreground">Claude writes SEO-optimised articles for your blog — type or speak</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT: Config + Chat (3 cols) */}
        <div className="lg:col-span-3 space-y-4">

          {/* Config */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Target Keyword</label>
                <input
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="e.g. physiotherapy Richmond Surrey"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary placeholder-muted-foreground/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Article Title (optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="AI will generate if empty"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary placeholder-muted-foreground/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Word Count: ~{wordCount}</label>
                <input
                  type="range"
                  min={500}
                  max={3000}
                  step={100}
                  value={wordCount}
                  onChange={e => setWordCount(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <button
                onClick={generateArticle}
                disabled={loading || !keyword}
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-all flex items-center gap-2"
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
              <span className="text-xs text-muted-foreground">— type or speak to refine your article</span>
            </div>

            <div className="h-64 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground/50 text-sm py-8">
                  <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-30" />
                  <p>Enter a keyword above and click Generate,</p>
                  <p>or tell me what article you want to create.</p>
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
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-foreground'
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
                placeholder="Ask AI to refine, change tone, add sections..."
              />
            </div>
          </div>

          {/* Link to existing articles */}
          <Link
            href="/admin/articles"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors px-1"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View all published articles in Blog Manager
          </Link>
        </div>

        {/* RIGHT: Preview (2 cols) */}
        <div className="lg:col-span-2">
          {article ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden sticky top-6">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium">Article Preview</span>
                <div className="flex gap-2">
                  {article.id && (
                    <Link
                      href={`/admin/articles/${article.id}`}
                      className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" /> Edit in Blog Manager
                    </Link>
                  )}
                  <button
                    onClick={copyContent}
                    className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              {article.id && (
                <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-400">Saved as draft in Blog Manager — edit, add image & publish from there</span>
                </div>
              )}

              <div className="p-4 max-h-[600px] overflow-y-auto">
                <h2 className="text-lg font-bold text-foreground mb-2">{article.title}</h2>
                <p className="text-xs text-muted-foreground mb-1">Slug: /{article.slug}</p>
                <p className="text-xs text-primary mb-3">~{article.word_count} words</p>

                {article.meta_description && (
                  <div className="bg-muted/30 border border-border rounded-lg p-3 mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Meta Description</p>
                    <p className="text-sm text-foreground/80">{article.meta_description}</p>
                  </div>
                )}

                <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {article.content}
                </div>

                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-4 pt-4 border-t border-border">
                    {article.tags.map(tag => (
                      <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border rounded-xl h-64 flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center p-8">
                <FileText className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>Article preview appears here</p>
                <p className="text-xs mt-1">Enter a keyword and generate</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
