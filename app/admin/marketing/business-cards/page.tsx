'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Sparkles, Download, Eye, Loader2, Palette, Type,
  Phone, Globe, MapPin, Mail, CreditCard, ChevronDown, ChevronUp,
  RotateCcw, QrCode, Instagram, Zap
} from 'lucide-react'

import { ImageGalleryPicker } from '@/components/ui/image-gallery-picker'

// ── BPR Services (short names for card back) ──────────────
const BPR_SERVICES_SHORT = [
  'MLS Laser Therapy',
  'Custom Insoles & Foot Scans',
  'Biomechanical Assessment',
  'Infrared Thermography',
  'Electrotherapy & Microcurrent',
  'Exercise Therapy',
  'Sports Injury Treatment',
  'Chronic Pain Management',
  'Pre/Post Surgery Rehab',
  'Shockwave Therapy',
]

// ── Card Templates ────────────────────────────────────────
interface CardTemplate {
  id: string
  name: string
  description: string
  colors: { primary: string; secondary: string; accent: string; bg: string; text: string; backBg: string }
  style: 'classic' | 'modern' | 'bold' | 'minimal' | 'gradient'
}

const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'bpr-teal',
    name: 'BPR Teal',
    description: 'Official BPR brand colors',
    colors: { primary: '#0d7377', secondary: '#0a5c5f', accent: '#c8952a', bg: '#ffffff', text: '#1a2332', backBg: '#0d7377' },
    style: 'classic',
  },
  {
    id: 'dark-premium',
    name: 'Dark Premium',
    description: 'Dark elegance with gold',
    colors: { primary: '#c8952a', secondary: '#a67a1f', accent: '#0d7377', bg: '#1a2332', text: '#ffffff', backBg: '#0f1923' },
    style: 'bold',
  },
  {
    id: 'clean-white',
    name: 'Clean White',
    description: 'Minimal white card',
    colors: { primary: '#0d7377', secondary: '#059669', accent: '#c8952a', bg: '#ffffff', text: '#1a2332', backBg: '#f8fafc' },
    style: 'minimal',
  },
  {
    id: 'ocean-gradient',
    name: 'Ocean Gradient',
    description: 'Teal to dark gradient',
    colors: { primary: '#0d7377', secondary: '#064e52', accent: '#f59e0b', bg: '#0d7377', text: '#ffffff', backBg: '#064e52' },
    style: 'gradient',
  },
  {
    id: 'modern-indigo',
    name: 'Modern Indigo',
    description: 'Contemporary indigo',
    colors: { primary: '#4f46e5', secondary: '#3730a3', accent: '#c8952a', bg: '#ffffff', text: '#1e1b4b', backBg: '#4f46e5' },
    style: 'modern',
  },
  {
    id: 'rose-energy',
    name: 'Rose Energy',
    description: 'Energetic rose & coral',
    colors: { primary: '#e11d48', secondary: '#be123c', accent: '#0d7377', bg: '#ffffff', text: '#1a2332', backBg: '#e11d48' },
    style: 'modern',
  },
]

// ── Card Data ─────────────────────────────────────────────
interface CardData {
  name: string
  title: string
  qualifications: string
  phone: string
  email: string
  website: string
  address: string
  addressLine2: string
  instagram: string
  logoText: string
  logoUrl?: string
  tagline: string
  services: string[]
  showQr: boolean
}

const DEFAULT_CARD: CardData = {
  name: 'Bruno',
  title: 'Founder & Lead Physiotherapist',
  qualifications: 'BSc Physiotherapy · Sports Rehab Specialist',
  phone: '+44 20 XXXX XXXX',
  email: 'info@bpr.rehab',
  website: 'bpr.rehab',
  address: 'Richmond TW10 6AQ',
  addressLine2: 'Ipswich, Suffolk',
  instagram: '@bpr.rehab',
  logoText: 'BPR',
  logoUrl: '',
  tagline: 'Expert Physiotherapy & Rehabilitation',
  services: ['MLS Laser Therapy', 'Custom Insoles & Foot Scans', 'Biomechanical Assessment', 'Sports Injury Treatment', 'Chronic Pain Management', 'Pre/Post Surgery Rehab'],
  showQr: true,
}

// Standard business card: 85mm × 55mm (3.5" × 2")
const CARD_W = 85
const CARD_H = 55

export default function BusinessCardCreatorPage() {
  const [template, setTemplate] = useState<CardTemplate>(CARD_TEMPLATES[0])
  const [card, setCard] = useState<CardData>({ ...DEFAULT_CARD })
  const [colors, setColors] = useState(CARD_TEMPLATES[0].colors)
  const [side, setSide] = useState<'front' | 'back'>('front')
  const [showTemplates, setShowTemplates] = useState(true)
  const [showServices, setShowServices] = useState(false)
  const [suggestingColors, setSuggestingColors] = useState(false)
  const [suggestingCopy, setSuggestingCopy] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [showLogoPicker, setShowLogoPicker] = useState(false)

  const [clinicDefaults, setClinicDefaults] = useState<{ siteName?: string; logoUrl?: string; phone?: string; email?: string; address?: string; website?: string } | null>(null)

  const previewOuterRef = useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(1)

  function selectTemplate(t: CardTemplate) {
    setTemplate(t)
    setColors(t.colors)
  }

  function updateCard(field: keyof CardData, value: any) {
    setCard(prev => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) return
        const s = await res.json()
        if (cancelled) return
        setClinicDefaults({
          siteName: s.siteName || '',
          logoUrl: s.logoUrl || '',
          phone: s.phone || '',
          email: s.email || '',
          address: s.address || '',
          website: s.businessWebsite || s.website || 'bpr.rehab',
        })
      } catch {
        // ignore
      }
    })()
    return () => { cancelled = true }
  }, [])

  function toggleService(service: string) {
    setCard(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service],
    }))
  }

  async function suggestColors() {
    setSuggestingColors(true)
    try {
      const res = await fetch('/api/admin/marketing/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest',
          field: 'title',
          context: {
            topic: `Generate 5 professional color palettes for a physiotherapy business card. Return a JSON array of objects with: primary, secondary, accent, bg, text, backBg (all hex colors). Example: [{"primary":"#0d7377","secondary":"#0a5c5f","accent":"#c8952a","bg":"#ffffff","text":"#1a2332","backBg":"#0d7377"}]`,
          },
        }),
      })
      const data = await res.json()
      if (data.suggestions?.length) {
        try {
          const palette = JSON.parse(data.suggestions[0])
          if (palette.primary) setColors(palette)
        } catch {}
      }
    } catch {} finally { setSuggestingColors(false) }
  }

  async function suggestCopy() {
    setSuggestingCopy(true)
    try {
      const res = await fetch('/api/admin/marketing/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest',
          field: 'topic',
          context: {
            title: `Write a professional tagline and title for a physiotherapy business card. The person is a physiotherapist and clinic founder. Return JSON: {"tagline":"...(max 6 words)","title":"...(professional title)","qualifications":"...(credentials)"}`,
          },
        }),
      })
      const data = await res.json()
      if (data.suggestions?.length) {
        try {
          const copy = JSON.parse(data.suggestions[0])
          if (copy.tagline) {
            setCard(prev => ({
              ...prev,
              tagline: copy.tagline || prev.tagline,
              title: copy.title || prev.title,
              qualifications: copy.qualifications || prev.qualifications,
            }))
          }
        } catch {}
      }
    } catch {} finally { setSuggestingCopy(false) }
  }

  function buildCardFrontHtml(): string {
    const c = colors
    const d = card
    const t = template

    let bgStyle = `background:${c.bg};`
    if (t.style === 'gradient') bgStyle = `background:linear-gradient(135deg, ${c.primary}, ${c.secondary});`
    if (t.style === 'bold') bgStyle = `background:${c.bg};`

    const isLight = c.bg === '#ffffff' || c.bg === '#f8fafc'
    const txtCol = isLight ? c.text : '#ffffff'
    const subCol = isLight ? `${c.text}99` : 'rgba(255,255,255,0.65)'

    const logoHtml = d.logoUrl
      ? `<img src="${d.logoUrl}" alt="Logo" style="height:9mm;max-width:28mm;object-fit:contain;display:block;" />`
      : `<div style="background:${c.primary};color:#fff;font-weight:800;font-size:11pt;padding:1.5mm 3mm;border-radius:1.5mm;letter-spacing:0.5mm;">${d.logoText}</div>`

    return `<div style="width:${CARD_W}mm;height:${CARD_H}mm;${bgStyle}border-radius:2mm;overflow:hidden;position:relative;font-family:'Inter',system-ui,sans-serif;display:flex;flex-direction:column;justify-content:space-between;padding:6mm 7mm;">
      ${t.style === 'classic' ? `<div style="position:absolute;top:0;left:0;right:0;height:2mm;background:${c.accent};"></div>` : ''}
      ${t.style === 'modern' ? `<div style="position:absolute;bottom:0;left:0;width:30mm;height:2mm;background:${c.accent};border-radius:0 1mm 0 0;"></div>` : ''}
      <div>
        <div style="display:flex;align-items:center;gap:3mm;margin-bottom:3mm;">
          ${logoHtml}
          ${t.style !== 'minimal' ? `<div style="height:0.3mm;flex:1;background:${isLight ? c.primary + '20' : 'rgba(255,255,255,0.15)'};"></div>` : ''}
        </div>
        <h1 style="font-size:12pt;font-weight:700;color:${txtCol};margin:0 0 0.8mm;">${d.name}</h1>
        <p style="font-size:7pt;color:${c.primary};font-weight:600;margin:0 0 0.5mm;${!isLight ? `color:${c.accent};` : ''}">${d.title}</p>
        <p style="font-size:5.5pt;color:${subCol};margin:0;">${d.qualifications}</p>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:2mm 5mm;font-size:5.5pt;color:${subCol};">
        <span>${d.phone}</span>
        <span>${d.email}</span>
        <span>${d.website}</span>
        ${d.instagram ? `<span>${d.instagram}</span>` : ''}
      </div>
    </div>`
  }

  function buildCardBackHtml(): string {
    const c = colors
    const d = card
    const t = template

    const isBackDark = c.backBg !== '#ffffff' && c.backBg !== '#f8fafc'
    const txtCol = isBackDark ? '#ffffff' : c.text
    const subCol = isBackDark ? 'rgba(255,255,255,0.7)' : `${c.text}88`

    const logoHtml = d.logoUrl
      ? `<img src="${d.logoUrl}" alt="Logo" style="height:7.5mm;max-width:22mm;object-fit:contain;display:block;" />`
      : `<div style="background:${c.accent};color:#fff;font-weight:800;font-size:9pt;padding:1mm 2.5mm;border-radius:1mm;letter-spacing:0.5mm;">${d.logoText}</div>`

    let bgStyle = `background:${c.backBg};`
    if (t.style === 'gradient') bgStyle = `background:linear-gradient(135deg, ${c.secondary}, ${c.primary});`

    const servicesHtml = d.services.map(s =>
      `<div style="display:flex;align-items:center;gap:1.5mm;margin-bottom:1mm;"><div style="width:1.2mm;height:1.2mm;border-radius:50%;background:${c.accent};flex-shrink:0;"></div><span style="font-size:5.5pt;color:${subCol};">${s}</span></div>`
    ).join('')

    return `<div style="width:${CARD_W}mm;height:${CARD_H}mm;${bgStyle}border-radius:2mm;overflow:hidden;position:relative;font-family:'Inter',system-ui,sans-serif;padding:5mm 6mm;display:flex;gap:4mm;">
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:2mm;margin-bottom:2.5mm;">
          ${logoHtml}
        </div>
        <p style="font-size:6pt;font-weight:600;color:${c.accent};text-transform:uppercase;letter-spacing:0.3mm;margin-bottom:2mm;">Our Services</p>
        ${servicesHtml}
      </div>
      <div style="width:22mm;display:flex;flex-direction:column;align-items:center;justify-content:space-between;">
        ${d.showQr ? `<div style="width:18mm;height:18mm;background:${isBackDark ? 'rgba(255,255,255,0.1)' : c.primary + '10'};border-radius:1.5mm;display:flex;align-items:center;justify-content:center;">
          <div style="font-size:5pt;color:${subCol};text-align:center;">QR Code<br><span style="font-size:4pt;">${d.website}</span></div>
        </div>` : ''}
        <div style="text-align:center;font-size:4.5pt;color:${subCol};line-height:1.5;">
          <p>${d.address}</p>
          <p>${d.addressLine2}</p>
        </div>
        <p style="font-size:5pt;font-weight:600;color:${c.accent};text-align:center;font-style:italic;">${d.tagline}</p>
      </div>
    </div>`
  }

  function buildFullHtml(): string {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',sans-serif; background:#f1f5f9; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; gap:20px; padding:40px; }
  .card-label { font-size:10pt; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; }
  @media print {
    body { background:#fff; }
    .card-label { display:none; }
  }
</style></head>
<body>
  <p class="card-label">Front</p>
  ${buildCardFrontHtml()}
  <p class="card-label">Back</p>
  ${buildCardBackHtml()}
</body></html>`
  }

  function openPreview() {
    setPreviewHtml(buildFullHtml())
    setShowPreview(true)
  }

  function downloadHtml() {
    const html = buildFullHtml()
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bpr-business-card-${template.id}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const CARD_PX_W = useMemo(() => CARD_W * 3.7795, [])

  useEffect(() => {
    const el = previewOuterRef.current
    if (!el) return

    const update = () => {
      const w = el.clientWidth
      const available = Math.max(1, w - 48)
      const next = Math.min(1, available / CARD_PX_W)
      setPreviewScale(Number.isFinite(next) ? next : 1)
    }

    update()
    const ro = new ResizeObserver(() => update())
    ro.observe(el)
    return () => ro.disconnect()
  }, [CARD_PX_W])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/marketing" className="text-xs text-muted-foreground hover:text-primary mb-3 inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Marketing
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Business Card Creator</h1>
            <p className="text-sm text-muted-foreground">Design front & back — standard 85×55mm print-ready cards</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT: Editor */}
        <div className="lg:col-span-3 space-y-4">

          {/* Templates */}
          <div className="bg-card border border-border rounded-xl p-4">
            <button onClick={() => setShowTemplates(!showTemplates)} className="flex items-center justify-between w-full text-left">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-indigo-400" />
                <span className="text-sm font-medium text-foreground">Templates</span>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full">{CARD_TEMPLATES.length}</span>
              </div>
              {showTemplates ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {showTemplates && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {CARD_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => selectTemplate(t)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      template.id === t.id
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-border bg-muted/20 hover:border-indigo-500/30'
                    }`}
                  >
                    <div className="flex gap-1.5 mb-2">
                      {[t.colors.primary, t.colors.accent, t.colors.backBg].map((c, i) => (
                        <div key={i} style={{ background: c }} className="w-4 h-4 rounded-full border border-white/20" />
                      ))}
                    </div>
                    <p className="text-xs font-medium text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-foreground">Colors</span>
              </div>
              <button onClick={suggestColors} disabled={suggestingColors} className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 disabled:opacity-50 transition">
                {suggestingColors ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI Suggest
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {(['primary', 'secondary', 'accent', 'bg', 'text', 'backBg'] as const).map(key => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={e => setColors(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-8 h-8 rounded-lg border border-border cursor-pointer"
                  />
                  <span className="text-[10px] text-muted-foreground capitalize">{key === 'backBg' ? 'Back' : key}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-violet-400" />
                <span className="text-sm font-medium text-foreground">Personal Info (Front)</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!clinicDefaults) return
                    setCard(prev => ({
                      ...prev,
                      logoUrl: clinicDefaults.logoUrl || prev.logoUrl,
                      phone: clinicDefaults.phone || prev.phone,
                      email: clinicDefaults.email || prev.email,
                      website: clinicDefaults.website || prev.website,
                      address: clinicDefaults.address || prev.address,
                    }))
                  }}
                  disabled={!clinicDefaults}
                  className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50 transition"
                >
                  Use clinic defaults
                </button>
                <button onClick={suggestCopy} disabled={suggestingCopy} className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1 disabled:opacity-50 transition">
                  {suggestingCopy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI Suggest
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Logo Image</label>
                <button
                  type="button"
                  onClick={() => setShowLogoPicker(true)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary flex items-center justify-between gap-2"
                >
                  <span className="truncate text-muted-foreground">
                    {card.logoUrl ? card.logoUrl : 'Select from Image Library'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Pick</span>
                </button>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Logo Text</label>
                <input type="text" value={card.logoText} onChange={e => updateCard('logoText', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground block mb-1">Name</label>
              <input type="text" value={card.name} onChange={e => updateCard('name', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Title / Role</label>
                <input type="text" value={card.title} onChange={e => updateCard('title', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Qualifications</label>
                <input type="text" value={card.qualifications} onChange={e => updateCard('qualifications', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-teal-400" />
              <span className="text-sm font-medium text-foreground">Contact Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Phone</label>
                <input type="text" value={card.phone} onChange={e => updateCard('phone', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Email</label>
                <input type="text" value={card.email} onChange={e => updateCard('email', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Website</label>
                <input type="text" value={card.website} onChange={e => updateCard('website', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Instagram</label>
                <input type="text" value={card.instagram} onChange={e => updateCard('instagram', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Address Line 1</label>
                <input type="text" value={card.address} onChange={e => updateCard('address', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Address Line 2</label>
                <input type="text" value={card.addressLine2} onChange={e => updateCard('addressLine2', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
            </div>
          </div>

          {/* Back Side Content */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-foreground">Back Side</span>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground block mb-1">Tagline</label>
              <input type="text" value={card.tagline} onChange={e => updateCard('tagline', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={card.showQr} onChange={e => updateCard('showQr', e.target.checked)} className="accent-primary" />
              <span className="text-muted-foreground">Show QR Code placeholder</span>
            </label>
          </div>

          {/* Services */}
          <div className="bg-card border border-border rounded-xl p-4">
            <button onClick={() => setShowServices(!showServices)} className="flex items-center justify-between w-full text-left">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-foreground">Services on Back ({card.services.length})</span>
              </div>
              {showServices ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {showServices && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                {BPR_SERVICES_SHORT.map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={card.services.includes(s)} onChange={() => toggleService(s)} className="accent-primary" />
                    <span className={card.services.includes(s) ? 'text-foreground' : 'text-muted-foreground'}>{s}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-6 space-y-4">
            {/* Action bar */}
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-sm font-medium text-foreground">Preview</span>
                <div className="flex gap-2">
                  <button onClick={openPreview} className="text-xs bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-lg transition flex items-center gap-1"><Eye className="h-3 w-3" /> Full</button>
                  <button onClick={downloadHtml} className="text-xs bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-lg transition flex items-center gap-1"><Download className="h-3 w-3" /> HTML</button>
                  <button onClick={openPreview} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1"><Download className="h-3 w-3" /> PDF</button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSide('front')} className={`flex-1 text-xs py-1.5 rounded-lg transition ${side === 'front' ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>Front</button>
                <button onClick={() => setSide('back')} className={`flex-1 text-xs py-1.5 rounded-lg transition ${side === 'back' ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>Back</button>
              </div>
            </div>

            {/* Card Preview */}
            <div ref={previewOuterRef} className="bg-muted/20 border border-border rounded-xl p-6 flex justify-center overflow-hidden">
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top center',
                }}
              >
                <div
                  dangerouslySetInnerHTML={{ __html: side === 'front' ? buildCardFrontHtml() : buildCardBackHtml() }}
                  style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.25))' }}
                />
              </div>
            </div>

            <p className="text-center text-[10px] text-muted-foreground">
              Standard Business Card · {CARD_W}×{CARD_H}mm · {side === 'front' ? 'Front' : 'Back'} · Click PDF to print
            </p>

            {/* Both sides mini preview */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-[10px] font-medium text-muted-foreground mb-3">Both Sides</p>
              <div className="flex gap-3 justify-center overflow-hidden">
                <div onClick={() => setSide('front')} className={`cursor-pointer transition ${side === 'front' ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-card rounded-sm' : 'opacity-60 hover:opacity-100'}`}>
                  <div style={{ transform: 'scale(1.05)', transformOrigin: 'top center' }} dangerouslySetInnerHTML={{ __html: buildCardFrontHtml() }} />
                </div>
                <div onClick={() => setSide('back')} className={`cursor-pointer transition ${side === 'back' ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-card rounded-sm' : 'opacity-60 hover:opacity-100'}`}>
                  <div style={{ transform: 'scale(1.05)', transformOrigin: 'top center' }} dangerouslySetInnerHTML={{ __html: buildCardBackHtml() }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ImageGalleryPicker
        open={showLogoPicker}
        onOpenChange={setShowLogoPicker}
        onSelect={(imageUrl) => {
          updateCard('logoUrl', imageUrl)
        }}
        selectedImageUrl={card.logoUrl}
        category="logo"
      />

      {/* Full Preview Modal */}
      {showPreview && previewHtml && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <span className="text-sm font-medium text-gray-800">Business Card — Ctrl+P to save as PDF</span>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-800 text-sm">Close</button>
            </div>
            <iframe srcDoc={previewHtml} className="w-full h-[70vh]" title="Card Preview" />
          </div>
        </div>
      )}
    </div>
  )
}
