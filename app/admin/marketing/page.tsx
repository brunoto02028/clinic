'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, Instagram, FileText, BookOpen, MessageSquare, Loader2, CheckCircle, XCircle, Zap, Megaphone, CreditCard } from 'lucide-react'

interface AIStatus {
  available: boolean
  model: string
  error?: string
}

const MODULES = [
  {
    id: 'instagram',
    icon: Instagram,
    title: 'Instagram Posts',
    subtitle: 'Generate captions + images with AI',
    href: '/admin/marketing/instagram',
    color: 'from-pink-500 to-purple-600',
    stats: 'Claude caption + Gemini image',
  },
  {
    id: 'articles',
    icon: FileText,
    title: 'SEO Articles',
    subtitle: 'Create blog content',
    href: '/admin/marketing/articles',
    color: 'from-teal-500 to-cyan-600',
    stats: 'Optimised for Google UK',
  },
  {
    id: 'ebooks',
    icon: BookOpen,
    title: 'eBooks & PDFs',
    subtitle: 'Educational guides to sell',
    href: '/admin/marketing/ebooks',
    color: 'from-amber-500 to-orange-600',
    stats: 'Ready for Stripe checkout',
  },
  {
    id: 'feedback',
    icon: MessageSquare,
    title: 'Feedback Analysis',
    subtitle: 'Patient sentiment insights',
    href: '/admin/marketing/feedback',
    color: 'from-green-500 to-emerald-600',
    stats: 'AI sentiment analysis',
  },
  {
    id: 'flyers',
    icon: Megaphone,
    title: 'Flyer Creator',
    subtitle: 'Print-ready flyers & leaflets',
    href: '/admin/marketing/flyers',
    color: 'from-rose-500 to-pink-600',
    stats: 'Templates + AI design',
  },
  {
    id: 'business-cards',
    icon: CreditCard,
    title: 'Business Cards',
    subtitle: 'Front & back card designer',
    href: '/admin/marketing/business-cards',
    color: 'from-indigo-500 to-violet-600',
    stats: 'Print-ready PDF + PNG',
  },
]

const QUICK_TOPICS = [
  { label: 'MLS Laser', service: 'laser_mls' },
  { label: 'Custom Insoles', service: 'custom_insoles' },
  { label: 'Biomechanical Assessment', service: 'biomechanical' },
  { label: 'Thermography', service: 'thermography' },
  { label: 'Sports Recovery', service: 'sports_recovery' },
  { label: 'Chronic Pain', service: 'pain_relief' },
]

export default function MarketingDashboard() {
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null)
  const [quickLoading, setQuickLoading] = useState<string | null>(null)
  const [quickResult, setQuickResult] = useState<{
    caption: string
    hashtags: string[]
    image_url: string | null
  } | null>(null)

  useEffect(() => {
    checkAI()
  }, [])

  async function checkAI() {
    try {
      const res = await fetch('/api/admin/marketing/health')
      if (res.ok) {
        const data = await res.json()
        setAiStatus(data)
      }
    } catch {
      setAiStatus({ available: false, model: 'claude-sonnet-4', error: 'Cannot reach API' })
    }
  }

  async function quickGenerate(topic: string, service: string) {
    setQuickLoading(service)
    setQuickResult(null)
    try {
      const res = await fetch('/api/admin/marketing/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, service, language: 'en', tone: 'educational', generateImageFlag: true }),
      })
      const data = await res.json()
      if (data.success) setQuickResult(data.post)
    } catch (e) {
      console.error(e)
    } finally {
      setQuickLoading(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Marketing Intelligence</h1>
            <p className="text-sm text-muted-foreground">AI-powered content generation — Claude (text) + Gemini (images)</p>
          </div>
        </div>
      </div>

      {/* AI Status Bar */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm border ${
        aiStatus === null
          ? 'bg-muted/30 border-border text-muted-foreground'
          : aiStatus.available
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : 'bg-red-500/10 border-red-500/20 text-red-400'
      }`}>
        {aiStatus === null ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking AI services...</span>
          </>
        ) : aiStatus.available ? (
          <>
            <CheckCircle className="h-4 w-4" />
            <span>Claude Sonnet 4 online — Ready to generate</span>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4" />
            <span>{aiStatus.error || 'AI service offline'}</span>
          </>
        )}
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {MODULES.map((mod) => (
          <Link
            key={mod.id}
            href={mod.href}
            className="group relative bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${mod.color} flex items-center justify-center mb-4`}>
              <mod.icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">{mod.title}</h3>
            <p className="text-muted-foreground text-sm mb-3">{mod.subtitle}</p>
            <p className="text-xs text-primary">{mod.stats}</p>
          </Link>
        ))}
      </div>

      {/* Quick Generate */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold">Quick Generate</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-5">Click a topic to instantly generate an Instagram post</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {QUICK_TOPICS.map((t) => (
            <button
              key={t.service}
              onClick={() => quickGenerate(t.label, t.service)}
              disabled={!!quickLoading}
              className={`px-4 py-2 rounded-full text-sm border transition-all ${
                quickLoading === t.service
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {quickLoading === t.service ? (
                <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Generating...</span>
              ) : t.label}
            </button>
          ))}
        </div>

        {quickLoading && !quickResult && (
          <div className="bg-muted/30 border border-border rounded-lg p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-muted-foreground text-sm">Claude is writing the caption...</p>
            <p className="text-muted-foreground/50 text-xs mt-1">Gemini is generating the image...</p>
          </div>
        )}

        {quickResult && (
          <div className="bg-muted/30 border border-border rounded-lg p-5 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs tracking-widest uppercase text-primary mb-3">Caption</p>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{quickResult.caption}</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {quickResult.hashtags?.slice(0, 8).map((h: string) => (
                    <span key={h} className="text-xs text-primary/70">{h}</span>
                  ))}
                </div>
              </div>
              {quickResult.image_url && (
                <div>
                  <p className="text-xs tracking-widest uppercase text-primary mb-3">Generated Image</p>
                  <img
                    src={quickResult.image_url}
                    alt="Generated"
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <Link
                href="/admin/marketing/instagram"
                className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors"
              >
                Edit & Publish →
              </Link>
              <button
                onClick={() => navigator.clipboard.writeText(quickResult.caption + '\n\n' + (quickResult.hashtags?.join(' ') || ''))}
                className="text-sm bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-lg transition-colors"
              >
                Copy Caption
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SEO Article Suggestions */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-1">SEO Article Ideas</h2>
        <p className="text-muted-foreground text-sm mb-5">High-potential keywords for Richmond and Ipswich UK</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { keyword: 'physiotherapy Richmond Surrey', title: 'Best Physiotherapy in Richmond — Expert Guide' },
            { keyword: 'MLS laser therapy knee pain', title: 'MLS Laser Therapy for Knee Pain: What to Expect' },
            { keyword: 'custom orthotics Ipswich', title: 'Custom Insoles in Ipswich — Walk Pain-Free' },
            { keyword: 'sports injury treatment Richmond', title: 'Sports Injury Treatment in Richmond — Return to Sport Fast' },
            { keyword: 'biomechanical assessment UK', title: 'What is a Biomechanical Assessment? Complete Guide' },
            { keyword: 'infrared thermography physiotherapy', title: 'Infrared Thermography: The Future of Physiotherapy Monitoring' },
          ].map((s) => (
            <Link
              key={s.keyword}
              href={`/admin/marketing/articles?keyword=${encodeURIComponent(s.keyword)}&title=${encodeURIComponent(s.title)}`}
              className="flex items-start gap-3 p-3 bg-muted/30 border border-border rounded-lg hover:border-primary/50 transition-colors group"
            >
              <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.keyword}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
