'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Instagram, Copy, Send, RefreshCw, Check, Sparkles,
  Mic, MicOff, ImageIcon, Calendar, Clock, FileText, Trash2, Eye,
  Heart, MessageCircle, ChevronDown, X, Save, PenSquare, CheckCircle, AlertCircle
} from 'lucide-react'
import { useVoiceInput } from '@/hooks/use-voice-input'

const SERVICE_CHIPS = [
  { value: 'laser_mls', label: 'MLS Laser' },
  { value: 'custom_insoles', label: 'Custom Insoles' },
  { value: 'biomechanical', label: 'Biomechanics' },
  { value: 'thermography', label: 'Thermography' },
  { value: 'sports_recovery', label: 'Sports Recovery' },
  { value: 'exercise_therapy', label: 'Exercise Therapy' },
  { value: 'pain_relief', label: 'Chronic Pain' },
  { value: 'foot_scan', label: 'Foot Scan' },
  { value: 'posture', label: 'Posture' },
  { value: 'shockwave', label: 'Shockwave' },
  { value: 'pregnancy', label: 'Pregnancy Care' },
  { value: 'elderly', label: 'Elderly Rehab' },
]

const TONES = [
  { value: 'educational', label: 'Educational', icon: '📚' },
  { value: 'motivational', label: 'Motivational', icon: '💪' },
  { value: 'testimonial', label: 'Testimonial', icon: '⭐' },
  { value: 'promotional', label: 'Promotional', icon: '🎯' },
  { value: 'behind_scenes', label: 'Behind the Scenes', icon: '🎬' },
  { value: 'tips', label: 'Quick Tips', icon: '💡' },
]

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-500/20 text-slate-300' },
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-300' },
  PUBLISHING: { label: 'Publishing', color: 'bg-amber-500/20 text-amber-300' },
  PUBLISHED: { label: 'Published', color: 'bg-emerald-500/20 text-emerald-300' },
  FAILED: { label: 'Failed', color: 'bg-red-500/20 text-red-300' },
}

interface SocialPost {
  id: string
  caption: string
  hashtags: string | null
  postType: string
  mediaUrls: string[]
  status: string
  scheduledAt: string | null
  publishedAt: string | null
  likes: number
  comments: number
  reach: number
  aiGenerated: boolean
  createdAt: string
  account: { accountName: string } | null
  campaign: { name: string } | null
}

interface GeneratedPost {
  id?: string
  caption: string
  caption_pt?: string
  hashtags: string[]
  visual_suggestion: string
  image_url: string | null
}

function InstagramContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'create' | 'posts'>(searchParams.get('tab') === 'posts' ? 'posts' : 'create')

  // ── Create Tab State ──
  const [topic, setTopic] = useState('')
  const [service, setService] = useState('')
  const [tone, setTone] = useState('educational')
  const [language, setLanguage] = useState<'en' | 'pt' | 'both'>('en')
  const [postType, setPostType] = useState<'IMAGE' | 'CAROUSEL'>('IMAGE')
  const [generateImage, setGenerateImage] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GeneratedPost | null>(null)
  const [editedCaption, setEditedCaption] = useState('')
  const [editedHashtags, setEditedHashtags] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [regeneratingImage, setRegeneratingImage] = useState(false)
  const [copied, setCopied] = useState(false)

  // ── Posts Tab State ──
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsFilter, setPostsFilter] = useState('all')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])

  const voice = useVoiceInput({
    language: language === 'pt' ? 'pt-BR' : 'en-GB',
    onTranscript: (text) => setTopic(prev => (prev + ' ' + text).trim()),
  })

  useEffect(() => {
    if (result) {
      setEditedCaption(result.caption)
      setEditedHashtags(result.hashtags?.join(', ') || '')
    }
  }, [result])

  useEffect(() => {
    if (activeTab === 'posts') fetchPosts()
  }, [activeTab, postsFilter])

  // ── Generate ──
  async function generate() {
    if (!topic && !service) { setError('Type a topic or pick a service'); return }
    setLoading(true)
    setError(null)
    setResult(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/marketing/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic || SERVICE_CHIPS.find(s => s.value === service)?.label || service,
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
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally { setLoading(false) }
  }

  // ── Regenerate Image ──
  async function regenerateImg() {
    if (!result) return
    setRegeneratingImage(true)
    try {
      const res = await fetch('/api/admin/marketing/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: result.visual_suggestion, service }),
      })
      const data = await res.json()
      if (data.image_url) setResult({ ...result, image_url: data.image_url })
    } catch {} finally { setRegeneratingImage(false) }
  }

  // ── Save as Draft / Schedule ──
  async function savePost(status: 'DRAFT' | 'SCHEDULED') {
    if (!editedCaption.trim()) { setError('Caption is required'); return }
    if (status === 'SCHEDULED' && !scheduledAt) { setError('Set a schedule date'); return }
    setSaving(true)
    setError(null)

    try {
      const allImages = [...(result?.image_url ? [result.image_url] : []), ...uploadedImages]
      const res = await fetch('/api/admin/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: editedCaption,
          hashtags: editedHashtags || null,
          postType: allImages.length > 1 ? 'CAROUSEL' : postType,
          mediaUrls: allImages,
          mediaPaths: [],
          accountId: null,
          scheduledAt: scheduledAt || null,
          status,
          aiGenerated: true,
          aiPrompt: topic || service,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSuccess(status === 'SCHEDULED' ? 'Post scheduled!' : 'Saved as draft!')
      setTimeout(() => setSuccess(null), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally { setSaving(false) }
  }

  // ── Publish Now ──
  async function publishNow() {
    if (!editedCaption.trim()) { setError('Caption required'); return }
    setPublishing(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/marketing/publish-instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: result?.id,
          caption: editedCaption,
          imageUrl: result?.image_url || uploadedImages[0],
          hashtags: editedHashtags.split(',').map(h => h.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess('Published to Instagram!')
      setTimeout(() => setSuccess(null), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed')
    } finally { setPublishing(false) }
  }

  // ── Image Upload ──
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(file => {
      setUploadedImages(prev => [...prev, URL.createObjectURL(file)])
    })
    e.target.value = ''
  }

  // ── Fetch Posts ──
  async function fetchPosts() {
    setPostsLoading(true)
    try {
      const url = postsFilter !== 'all' ? `/api/admin/social/posts?status=${postsFilter}` : '/api/admin/social/posts'
      const res = await fetch(url)
      const data = await res.json()
      setPosts(data.posts || [])
    } catch {} finally { setPostsLoading(false) }
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return
    try {
      await fetch(`/api/admin/social/posts/${id}`, { method: 'DELETE' })
      fetchPosts()
    } catch {}
  }

  function copyCaption() {
    const full = `${editedCaption}\n\n${editedHashtags.split(',').map(h => `#${h.trim().replace(/^#/, '')}`).join(' ')}`
    navigator.clipboard.writeText(full)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const allImages = [...(result?.image_url ? [result.image_url] : []), ...uploadedImages]
  const previewCaption = editedCaption || 'Your caption...'
  const previewHashtags = editedHashtags ? editedHashtags.split(',').slice(0, 5).map(h => `#${h.trim().replace(/^#/, '')}`).join(' ') : ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/marketing" className="text-xs text-muted-foreground hover:text-primary mb-3 inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Marketing
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Instagram className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Instagram</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="text-[10px] bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded-full">Claude (text)</span>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded-full">Gemini (images)</span>
              </p>
            </div>
          </div>
          <div className="flex bg-muted/50 rounded-lg p-0.5">
            {(['create', 'posts'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab === 'create' ? 'Create' : 'Posts'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-3 w-3" /></button>
        </div>
      )}

      {/* ═══ CREATE TAB ═══ */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: AI + Config (2 cols) */}
          <div className="lg:col-span-2 space-y-4">

            {/* Topic Input */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Topic — type freely or pick a service</label>
              <div className="flex gap-2">
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Benefits of custom insoles for runners, knee recovery tips..." className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary placeholder-muted-foreground/50" />
                {voice.isSupported && (
                  <button type="button" onClick={voice.status === 'listening' ? voice.stop : voice.start} className={`px-3 rounded-lg border transition-all ${voice.status === 'listening' ? 'bg-red-500 border-red-500 text-white animate-pulse' : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50'}`}>
                    {voice.status === 'listening' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {voice.status === 'listening' && <p className="text-xs text-red-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Listening...</p>}

              {/* Service Chips */}
              <div className="flex flex-wrap gap-1.5">
                {SERVICE_CHIPS.map(s => (
                  <button key={s.value} onClick={() => { setService(s.value === service ? '' : s.value); if (!topic) setTopic(s.label) }} className={`text-xs px-2.5 py-1 rounded-full border transition-all ${service === s.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone + Language + Type */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {/* Tone */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Tone</label>
                  <div className="grid grid-cols-2 gap-1">
                    {TONES.map(t => (
                      <button key={t.value} onClick={() => setTone(t.value)} className={`text-[11px] px-2 py-1.5 rounded-lg border transition-all text-left ${tone === t.value ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Language */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Language</label>
                  <div className="space-y-1">
                    {([{ key: 'en' as const, label: 'English' }, { key: 'pt' as const, label: 'Portugues' }, { key: 'both' as const, label: 'Both (EN+PT)' }]).map(l => (
                      <button key={l.key} onClick={() => setLanguage(l.key)} className={`w-full text-xs px-2 py-1.5 rounded-lg border transition-all ${language === l.key ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Post Type + Image Toggle */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Options</label>
                  <div className="flex gap-1">
                    {(['IMAGE', 'CAROUSEL'] as const).map(pt => (
                      <button key={pt} onClick={() => setPostType(pt)} className={`flex-1 text-[11px] px-2 py-1.5 rounded-lg border transition-all ${postType === pt ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'}`}>
                        {pt === 'IMAGE' ? 'Single' : 'Carousel'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button onClick={() => setGenerateImage(!generateImage)} className={`w-8 h-4 rounded-full transition-all ${generateImage ? 'bg-primary' : 'bg-muted'}`}>
                      <div className={`w-3.5 h-3.5 bg-white rounded-full transition-all mx-px ${generateImage ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                    <span className="text-muted-foreground">AI Image</span>
                  </div>
                </div>
              </div>

              <button onClick={generate} disabled={loading || (!topic && !service)} className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? 'Generating...' : 'Generate Post with AI'}
              </button>
            </div>

            {/* Result: Caption + Hashtags + Images */}
            {result && !loading && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                {/* Caption */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Caption (editable)</label>
                  <textarea value={editedCaption} onChange={e => setEditedCaption(e.target.value)} rows={5} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary resize-none" />
                  <p className="text-[10px] text-muted-foreground text-right mt-1">{editedCaption.length} chars</p>
                </div>

                {/* Portuguese */}
                {result.caption_pt && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Portuguese Version</label>
                    <div className="bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground/80 whitespace-pre-wrap max-h-32 overflow-y-auto">{result.caption_pt}</div>
                  </div>
                )}

                {/* Hashtags */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5"># Hashtags</label>
                  <textarea value={editedHashtags} onChange={e => setEditedHashtags(e.target.value)} rows={2} placeholder="footcare, physiotherapy, insoles..." className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary resize-none placeholder-muted-foreground/50" />
                </div>

                {/* Images */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Images</label>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                  <div className="flex gap-2 flex-wrap">
                    {allImages.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {i > 0 && (
                          <button onClick={() => setUploadedImages(prev => prev.filter((_, j) => j !== i - (result?.image_url ? 1 : 0)))} className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center hover:border-primary/50 transition-colors">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground mt-0.5">Upload</span>
                    </button>
                    {result?.image_url && (
                      <button onClick={regenerateImg} disabled={regeneratingImage} className="w-20 h-20 rounded-lg border-2 border-dashed border-cyan-500/30 flex flex-col items-center justify-center hover:border-cyan-500/50 transition-colors bg-cyan-500/5 disabled:opacity-50">
                        {regeneratingImage ? <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" /> : <RefreshCw className="h-4 w-4 text-cyan-400" />}
                        <span className="text-[9px] text-cyan-400 mt-0.5">Regen</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5 flex items-center gap-1"><Calendar className="h-3 w-3" /> Schedule (optional)</label>
                  <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
                  <p className="text-[10px] text-muted-foreground mt-1">Leave empty to save as draft or publish now</p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={publishNow} disabled={publishing || !allImages.length} className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5">
                    {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Publish
                  </button>
                  <button onClick={() => savePost('SCHEDULED')} disabled={saving || !scheduledAt} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                    Schedule
                  </button>
                  <button onClick={() => savePost('DRAFT')} disabled={saving} className="bg-muted hover:bg-muted/80 text-foreground font-medium py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5">
                    <Save className="h-3.5 w-3.5" /> Draft
                  </button>
                </div>

                <button onClick={copyCaption} className="w-full text-xs text-muted-foreground hover:text-foreground py-1.5 flex items-center justify-center gap-1">
                  {copied ? <><Check className="h-3 w-3 text-emerald-400" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy caption + hashtags</>}
                </button>
              </div>
            )}

            {loading && (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                <p className="text-sm text-muted-foreground">Claude is writing, Gemini is drawing...</p>
              </div>
            )}
          </div>

          {/* RIGHT: Instagram Preview */}
          <div className="sticky top-6">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground">Instagram Preview</p>
              </div>
              <div className="bg-white dark:bg-zinc-950">
                {/* IG Header */}
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                    <div className="w-full h-full rounded-full bg-white dark:bg-zinc-950 flex items-center justify-center">
                      <Instagram className="h-3.5 w-3.5 text-zinc-800 dark:text-zinc-200" />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex-1 truncate">bruno_physical_rehabilitation</p>
                  <svg className="w-4 h-4 text-zinc-900 dark:text-zinc-100" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                </div>
                {/* Image */}
                {allImages.length > 0 ? (
                  <div className="relative">
                    <img src={allImages[0]} alt="" className="w-full aspect-square object-cover" />
                    {allImages.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {allImages.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-white/60'}`} />)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-800 dark:to-zinc-900 flex flex-col items-center justify-center gap-2">
                    <ImageIcon className="h-10 w-10 text-slate-300 dark:text-zinc-600" />
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">Upload an image</p>
                  </div>
                )}
                {/* Action icons */}
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-4">
                    <Heart className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
                    <MessageCircle className="h-5 w-5 text-zinc-900 dark:text-zinc-100 scale-x-[-1]" />
                    <Send className="h-5 w-5 text-zinc-900 dark:text-zinc-100 -rotate-[20deg]" />
                  </div>
                  <svg className="w-5 h-5 text-zinc-900 dark:text-zinc-100" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                </div>
                {/* Caption */}
                <div className="px-3 pb-3">
                  <p className="text-xs text-zinc-900 dark:text-zinc-100">
                    <span className="font-semibold mr-1">bruno_physical_rehabilitation</span>
                    <span className="whitespace-pre-wrap">{previewCaption.length > 140 ? previewCaption.slice(0, 140) + '... more' : previewCaption}</span>
                  </p>
                  {previewHashtags && <p className="text-xs text-blue-500 mt-1">{previewHashtags}</p>}
                </div>
              </div>
            </div>

            {/* Schedule info */}
            {scheduledAt && (
              <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2 text-xs text-blue-400 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Scheduled: {new Date(scheduledAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ POSTS TAB ═══ */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {/* Filter tabs */}
          <div className="flex gap-1 bg-muted/30 rounded-lg p-1 w-fit">
            {['all', 'DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED'].map(f => (
              <button key={f} onClick={() => setPostsFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${postsFilter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {f === 'all' ? 'All' : STATUS_MAP[f]?.label || f}
              </button>
            ))}
          </div>

          {postsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : posts.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl py-12 text-center">
              <Instagram className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No posts yet</p>
              <button onClick={() => setActiveTab('create')} className="mt-3 text-xs bg-primary text-primary-foreground px-4 py-2 rounded-lg">Create your first post</button>
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map(post => {
                const st = STATUS_MAP[post.status] || STATUS_MAP.DRAFT
                return (
                  <div key={post.id} className="bg-card border border-border rounded-xl p-3 flex gap-3">
                    {post.mediaUrls[0] ? (
                      <img src={post.mediaUrls[0]} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-2">{post.caption}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                        {post.aiGenerated && <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">AI</span>}
                        {post.scheduledAt && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> {new Date(post.scheduledAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {post.status === 'PUBLISHED' && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-2">
                            <Heart className="h-2.5 w-2.5" />{post.likes} <Eye className="h-2.5 w-2.5" />{post.reach}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => deletePost(post.id)} className="text-muted-foreground hover:text-red-400 transition shrink-0 self-start p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function InstagramPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <InstagramContent />
    </Suspense>
  )
}
