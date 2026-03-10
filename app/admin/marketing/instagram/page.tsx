'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Instagram, Copy, Send, RefreshCw, Check, Sparkles } from 'lucide-react'

const SERVICES = [
  { value: 'laser_mls', label: 'MLS Laser Therapy' },
  { value: 'custom_insoles', label: 'Custom Insoles' },
  { value: 'biomechanical', label: 'Biomechanical Assessment' },
  { value: 'thermography', label: 'Thermography' },
  { value: 'sports_recovery', label: 'Sports Recovery' },
  { value: 'exercise_therapy', label: 'Exercise Therapy' },
  { value: 'pain_relief', label: 'Chronic Pain' },
  { value: 'foot_scan', label: 'Foot Scan' },
  { value: '', label: 'Other / Custom Topic' },
]

const TONES = [
  { value: 'educational', label: 'Educational', desc: 'Teach something valuable', icon: '📚' },
  { value: 'motivational', label: 'Motivational', desc: 'Inspire the audience', icon: '💪' },
  { value: 'testimonial', label: 'Testimonial', desc: 'Patient success story', icon: '⭐' },
  { value: 'promotional', label: 'Promotional', desc: 'Highlight BPR value', icon: '🎯' },
]

interface GeneratedPost {
  id?: string
  caption: string
  caption_pt?: string
  hashtags: string[]
  visual_suggestion: string
  image_url: string | null
}

export default function InstagramPage() {
  const searchParams = useSearchParams()
  const [topic, setTopic] = useState(searchParams.get('topic') || '')
  const [service, setService] = useState(searchParams.get('service') || '')
  const [tone, setTone] = useState('educational')
  const [language, setLanguage] = useState<'en' | 'pt' | 'both'>('en')
  const [generateImage, setGenerateImage] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GeneratedPost | null>(null)
  const [editedCaption, setEditedCaption] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [regeneratingImage, setRegeneratingImage] = useState(false)
  const [customImagePrompt, setCustomImagePrompt] = useState('')
  const [showImagePrompt, setShowImagePrompt] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (result) setEditedCaption(result.caption)
  }, [result])

  async function generate() {
    if (!topic && !service) {
      setError('Choose a service or type a topic')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    setPublished(false)

    const topicToUse = topic || SERVICES.find(s => s.value === service)?.label || service

    try {
      const res = await fetch('/api/admin/marketing/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicToUse,
          service,
          tone,
          language,
          generateImageFlag: generateImage,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data.post)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generating content')
    } finally {
      setLoading(false)
    }
  }

  async function regenerateImg() {
    if (!result) return
    setRegeneratingImage(true)
    try {
      const res = await fetch('/api/admin/marketing/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: customImagePrompt || result.visual_suggestion,
          service,
        }),
      })
      const data = await res.json()
      if (data.image_url) setResult({ ...result, image_url: data.image_url })
    } catch (e) {
      console.error(e)
    } finally {
      setRegeneratingImage(false)
    }
  }

  async function publish() {
    if (!result?.image_url || !editedCaption) return
    setPublishing(true)
    try {
      const res = await fetch('/api/admin/marketing/publish-instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: result.id,
          caption: editedCaption,
          imageUrl: result.image_url,
          hashtags: result.hashtags,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPublished(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error publishing')
    } finally {
      setPublishing(false)
    }
  }

  function copyCaption() {
    const full = `${editedCaption}\n\n${result?.hashtags?.join(' ') || ''}`
    navigator.clipboard.writeText(full)
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
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <Instagram className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Instagram Post Generator</h1>
            <p className="text-sm text-muted-foreground">Caption (Claude) + Professional image (Gemini) → Direct publish</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* LEFT: Config */}
        <div className="space-y-5">

          {/* Service */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Service / Topic</label>
            <select
              value={service}
              onChange={e => setService(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground text-sm focus:border-primary outline-none"
            >
              {SERVICES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Custom topic */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              Specific Topic <span className="text-muted-foreground/50">(optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. 'knee recovery after ACL surgery'"
              className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground text-sm focus:border-primary outline-none placeholder-muted-foreground/50"
            />
          </div>

          {/* Tone */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Post Tone</label>
            <div className="grid grid-cols-2 gap-2">
              {TONES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`p-3 rounded-lg border text-left transition-all text-sm ${
                    tone === t.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-border/80'
                  }`}
                >
                  <div className="font-medium">{t.icon} {t.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Language</label>
            <div className="flex gap-2">
              {([
                { key: 'en' as const, label: '🇬🇧 English' },
                { key: 'pt' as const, label: '🇧🇷 Português' },
                { key: 'both' as const, label: '🌐 Both' },
              ]).map(l => (
                <button
                  key={l.key}
                  onClick={() => setLanguage(l.key)}
                  className={`flex-1 py-2 rounded-lg border text-sm transition-all ${
                    language === l.key
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-border/80'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image toggle */}
          <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
            <div>
              <p className="text-sm font-medium text-foreground">Generate image (Gemini)</p>
              <p className="text-xs text-muted-foreground">AI-generated professional clinic image</p>
            </div>
            <button
              onClick={() => setGenerateImage(!generateImage)}
              className={`w-12 h-6 rounded-full transition-all ${generateImage ? 'bg-primary' : 'bg-muted'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-all mx-0.5 ${generateImage ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl text-sm transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Generating...</span>
            ) : '✨ Generate Post with AI'}
          </button>
        </div>

        {/* RIGHT: Result */}
        <div>
          {loading && (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground text-sm">Claude is writing the caption...</p>
              <p className="text-muted-foreground/50 text-xs mt-1">This may take 10-30 seconds</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">

              {/* Image */}
              {result.image_url ? (
                <div className="relative">
                  <img
                    src={result.image_url}
                    alt="Generated Instagram"
                    className="w-full aspect-square object-cover rounded-xl"
                  />
                  <div className="absolute bottom-3 right-3">
                    <button
                      onClick={() => setShowImagePrompt(!showImagePrompt)}
                      className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-full hover:bg-black/90 transition flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" /> Regenerate
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-dashed border-border rounded-xl aspect-square flex items-center justify-center text-muted-foreground text-sm">
                  <div className="text-center p-6">
                    <p className="text-2xl mb-2">🖼️</p>
                    <p>No image generated</p>
                    <p className="text-xs mt-1">{result.visual_suggestion}</p>
                  </div>
                </div>
              )}

              {showImagePrompt && (
                <div className="flex gap-2">
                  <input
                    value={customImagePrompt}
                    onChange={e => setCustomImagePrompt(e.target.value)}
                    placeholder={result.visual_suggestion}
                    className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary placeholder-muted-foreground/50"
                  />
                  <button
                    onClick={regenerateImg}
                    disabled={regeneratingImage}
                    className="bg-purple-700 hover:bg-purple-600 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-1"
                  >
                    {regeneratingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {/* Caption Editor */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">Caption (editable)</label>
                <textarea
                  value={editedCaption}
                  onChange={e => setEditedCaption(e.target.value)}
                  rows={8}
                  className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Portuguese version */}
              {result.caption_pt && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">Portuguese Version</label>
                  <div className="bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground/80 whitespace-pre-wrap">
                    {result.caption_pt}
                  </div>
                </div>
              )}

              {/* Hashtags */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">Hashtags</label>
                <div className="flex flex-wrap gap-1">
                  {result.hashtags?.map(h => (
                    <span key={h} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{h}</span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {published ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-lg text-center flex items-center justify-center gap-2">
                  <Check className="h-4 w-4" /> Published to Instagram successfully!
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={publish}
                    disabled={publishing || !result.image_url}
                    className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {publishing ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Publishing...</>
                    ) : (
                      <><Send className="h-4 w-4" /> Publish to Instagram</>
                    )}
                  </button>
                  <button
                    onClick={copyCaption}
                    className="bg-muted hover:bg-muted/80 text-foreground px-4 py-3 rounded-xl text-sm transition-all flex items-center gap-2"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {!result.image_url && (
                <p className="text-xs text-amber-500 text-center">
                  Image required for direct Instagram publish. Enable image generation or upload one manually.
                </p>
              )}
            </div>
          )}

          {!result && !loading && (
            <div className="bg-card border border-dashed border-border rounded-xl h-full min-h-64 flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center p-8">
                <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                <p>Configure and click Generate</p>
                <p className="text-xs mt-1">Result will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
