'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Sparkles, Download, Eye, Loader2, Palette, Type,
  Image as ImageIcon, RotateCcw, Copy, Phone, Globe, MapPin,
  Clock, Mail, Megaphone, ChevronDown, ChevronUp, Zap
} from 'lucide-react'

import { ImageGalleryPicker } from '@/components/ui/image-gallery-picker'

// ── BPR Services ──────────────────────────────────────────
const BPR_SERVICES = [
  'MLS Laser Therapy (Mphi 75)',
  'Custom Insoles & Foot Scans',
  'Biomechanical Assessment (AI-powered)',
  'Infrared Thermography',
  'Electrotherapy',
  'Exercise Therapy',
  'Sports Injury Treatment',
  'Chronic Pain Management',
  'Pre/Post Surgery Rehab',
  'Kinesiotherapy',
  'Microcurrent Therapy',
  'Shockwave Therapy',
]

// ── Flyer Templates ───────────────────────────────────────
interface FlyerTemplate {
  id: string
  name: string
  description: string
  size: { width: number; height: number; label: string }
  colors: { primary: string; secondary: string; accent: string; bg: string; text: string }
  layout: 'hero-top' | 'split' | 'centered' | 'gradient-diagonal' | 'minimal'
}

const TEMPLATES: FlyerTemplate[] = [
  {
    id: 'modern-teal',
    name: 'Modern Teal',
    description: 'Clean teal gradient with hero image area',
    size: { width: 210, height: 297, label: 'A4 Portrait' },
    colors: { primary: '#0d7377', secondary: '#0a5c5f', accent: '#c8952a', bg: '#ffffff', text: '#1a2332' },
    layout: 'hero-top',
  },
  {
    id: 'bold-dark',
    name: 'Bold Dark',
    description: 'Dark premium look with gold accents',
    size: { width: 210, height: 297, label: 'A4 Portrait' },
    colors: { primary: '#1a2332', secondary: '#2a3a52', accent: '#c8952a', bg: '#0f1923', text: '#ffffff' },
    layout: 'gradient-diagonal',
  },
  {
    id: 'fresh-green',
    name: 'Fresh Green',
    description: 'Light and clean with green highlights',
    size: { width: 210, height: 297, label: 'A4 Portrait' },
    colors: { primary: '#059669', secondary: '#047857', accent: '#f59e0b', bg: '#f0fdf4', text: '#1a2332' },
    layout: 'split',
  },
  {
    id: 'sports-energy',
    name: 'Sports Energy',
    description: 'Dynamic orange for sports marketing',
    size: { width: 210, height: 297, label: 'A4 Portrait' },
    colors: { primary: '#ea580c', secondary: '#c2410c', accent: '#0d7377', bg: '#fff7ed', text: '#1a2332' },
    layout: 'centered',
  },
  {
    id: 'elegant-minimal',
    name: 'Elegant Minimal',
    description: 'Minimalist white with subtle accents',
    size: { width: 210, height: 297, label: 'A4 Portrait' },
    colors: { primary: '#6366f1', secondary: '#4f46e5', accent: '#0d7377', bg: '#ffffff', text: '#1e1b4b' },
    layout: 'minimal',
  },
  {
    id: 'a5-leaflet',
    name: 'A5 Leaflet',
    description: 'Compact A5 leaflet size',
    size: { width: 148, height: 210, label: 'A5 Portrait' },
    colors: { primary: '#0d7377', secondary: '#0a5c5f', accent: '#c8952a', bg: '#ffffff', text: '#1a2332' },
    layout: 'hero-top',
  },
]

// ── Flyer Data ────────────────────────────────────────────
interface FlyerData {
  headline: string
  subheadline: string
  bodyText: string
  services: string[]
  ctaText: string
  phone: string
  email: string
  website: string
  address: string
  hours: string
  tagline: string
  promoText: string
  logoText: string
  logoUrl?: string
}

const DEFAULT_FLYER: FlyerData = {
  headline: 'Expert Physiotherapy & Rehabilitation',
  subheadline: 'Advanced treatments for pain relief, recovery & performance',
  bodyText: 'At BPR, we combine cutting-edge technology with hands-on expertise. Founded by Bruno, a former professional footballer who underwent 3 major knee surgeries — we understand rehabilitation from personal experience.',
  services: ['MLS Laser Therapy (Mphi 75)', 'Custom Insoles & Foot Scans', 'Biomechanical Assessment (AI-powered)', 'Sports Injury Treatment', 'Chronic Pain Management', 'Pre/Post Surgery Rehab'],
  ctaText: 'Book Your Assessment Today',
  phone: '+44 20 XXXX XXXX',
  email: 'info@bpr.rehab',
  website: 'bpr.rehab',
  address: 'Richmond TW10 6AQ & Ipswich, Suffolk',
  hours: 'Open 7 days a week',
  tagline: 'Your recovery starts here.',
  promoText: '',
  logoText: 'BPR',
  logoUrl: '',
}

export default function FlyerCreatorPage() {
  const [template, setTemplate] = useState<FlyerTemplate>(TEMPLATES[0])
  const [flyer, setFlyer] = useState<FlyerData>({ ...DEFAULT_FLYER })
  const [colors, setColors] = useState(TEMPLATES[0].colors)
  const [showTemplates, setShowTemplates] = useState(true)
  const [showServices, setShowServices] = useState(false)
  const [suggestingColors, setSuggestingColors] = useState(false)
  const [suggestingCopy, setSuggestingCopy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)
  const [showLogoPicker, setShowLogoPicker] = useState(false)

  const [clinicDefaults, setClinicDefaults] = useState<{ siteName?: string; logoUrl?: string; phone?: string; email?: string; address?: string; website?: string } | null>(null)
  const [marketingDefaultsJson, setMarketingDefaultsJson] = useState<string>('')

  const previewOuterRef = useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(1)

  function selectTemplate(t: FlyerTemplate) {
    setTemplate(t)
    setColors(t.colors)
  }

  function updateFlyer(field: keyof FlyerData, value: any) {
    setFlyer(prev => ({ ...prev, [field]: value }))
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
        setMarketingDefaultsJson(s.marketingFlyerDefaultsJson || '')
      } catch {
        // ignore
      }
    })()
    return () => { cancelled = true }
  }, [])

  function applyMarketingDefaults() {
    if (!marketingDefaultsJson) return
    try {
      const d = JSON.parse(marketingDefaultsJson)

      const templateId = d?.templateId
      if (templateId && typeof templateId === 'string') {
        const nextTemplate = TEMPLATES.find(t => t.id === templateId)
        if (nextTemplate) {
          setTemplate(nextTemplate)
          setColors(nextTemplate.colors)
        }
      }

      if (d?.colors && typeof d.colors === 'object') {
        setColors((prev: any) => ({ ...prev, ...d.colors }))
      }

      const allowedFlyerKeys: (keyof FlyerData)[] = [
        'logoText',
        'logoUrl',
        'headline',
        'subheadline',
        'ctaText',
        'promoText',
        'phone',
        'email',
        'website',
        'address',
        'hours',
      ]

      setFlyer((prev: FlyerData) => {
        const next: FlyerData = { ...prev }
        for (const k of allowedFlyerKeys) {
          if (d?.[k] !== undefined) (next as any)[k] = d[k]
        }
        return next
      })
    } catch {
      // ignore
    }
  }

  function toggleService(service: string) {
    setFlyer(prev => ({
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
            topic: `Generate 5 color palettes for a physiotherapy clinic flyer. Current headline: "${flyer.headline}". Template layout: ${template.layout}. Return a JSON array where each item has: primary, secondary, accent, bg, text (all hex colors). Example: [{"primary":"#0d7377","secondary":"#0a5c5f","accent":"#c8952a","bg":"#ffffff","text":"#1a2332"}]`,
          },
        }),
      })
      const data = await res.json()
      if (data.suggestions?.length) {
        try {
          const palette = JSON.parse(data.suggestions[0])
          if (palette.primary) setColors(palette)
        } catch {
          // Try parsing individual suggestions
        }
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
            title: `Write compelling flyer copy for BPR physiotherapy clinic. Generate: headline (max 8 words), subheadline (max 15 words), body text (2-3 sentences about the clinic), CTA text (max 5 words), tagline (max 8 words), and a promo text (optional offer/discount). Return as JSON: {"headline":"...","subheadline":"...","bodyText":"...","ctaText":"...","tagline":"...","promoText":"..."}`,
          },
        }),
      })
      const data = await res.json()
      if (data.suggestions?.length) {
        try {
          const copy = JSON.parse(data.suggestions[0])
          if (copy.headline) {
            setFlyer(prev => ({
              ...prev,
              headline: copy.headline || prev.headline,
              subheadline: copy.subheadline || prev.subheadline,
              bodyText: copy.bodyText || prev.bodyText,
              ctaText: copy.ctaText || prev.ctaText,
              tagline: copy.tagline || prev.tagline,
              promoText: copy.promoText || prev.promoText,
            }))
          }
        } catch {}
      }
    } catch {} finally { setSuggestingCopy(false) }
  }

  function buildFlyerHtml(): string {
    const c = colors
    const f = flyer
    const t = template

    const isDark = t.layout === 'gradient-diagonal' || c.bg.toLowerCase() === '#0f1923' || c.bg.toLowerCase() === '#000000'

    const servicesHtml = f.services.map(s =>
      `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><div style="width:6px;height:6px;border-radius:50%;background:${c.accent};flex-shrink:0;"></div><span style="font-size:11pt;color:${isDark || t.layout === 'gradient-diagonal' ? 'rgba(255,255,255,0.85)' : c.text};">${s}</span></div>`
    ).join('')
    const textColor = isDark ? '#ffffff' : c.text
    const subtextColor = isDark ? 'rgba(255,255,255,0.7)' : `${c.text}99`

    let bgStyle = `background:${c.bg};`
    if (t.layout === 'gradient-diagonal') {
      bgStyle = `background:linear-gradient(135deg, ${c.primary} 0%, ${c.secondary} 50%, ${c.primary}dd 100%);`
    } else if (t.layout === 'hero-top') {
      bgStyle = `background:linear-gradient(180deg, ${c.primary} 0%, ${c.primary}ee 30%, ${c.bg} 30%);`
    }

    const logoHtml = f.logoUrl
      ? `<img src="${f.logoUrl}" alt="Logo" style="height:44px;max-width:220px;object-fit:contain;display:block;" />`
      : `${f.logoText}`

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',sans-serif; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head>
<body>
<div style="width:${t.size.width}mm;min-height:${t.size.height}mm;${bgStyle}padding:0;position:relative;overflow:hidden;">

  ${t.layout === 'hero-top' ? `
  <!-- Hero Top Layout -->
  <div style="padding:40px 36px 30px;text-align:center;">
    <div style="display:inline-block;background:${c.accent};color:#fff;font-weight:800;font-size:24pt;padding:8px 20px;border-radius:6px;letter-spacing:2px;margin-bottom:16px;">${logoHtml}</div>
    <h1 style="font-size:28pt;font-weight:800;color:#ffffff;line-height:1.15;margin-bottom:10px;">${f.headline}</h1>
    <p style="font-size:13pt;color:rgba(255,255,255,0.85);font-weight:300;">${f.subheadline}</p>
  </div>
  <div style="padding:28px 36px 36px;">
    <p style="font-size:11pt;color:${c.text};line-height:1.7;margin-bottom:24px;">${f.bodyText}</p>
    ${f.promoText ? `<div style="background:${c.accent}15;border:2px solid ${c.accent};border-radius:8px;padding:12px 18px;margin-bottom:24px;text-align:center;"><p style="font-size:13pt;font-weight:700;color:${c.accent};">${f.promoText}</p></div>` : ''}
    <h3 style="font-size:12pt;font-weight:700;color:${c.primary};margin-bottom:14px;text-transform:uppercase;letter-spacing:1px;">Our Services</h3>
    <div style="columns:2;column-gap:20px;margin-bottom:28px;">${servicesHtml}</div>
    <div style="background:${c.primary};border-radius:10px;padding:18px 24px;text-align:center;margin-bottom:24px;">
      <p style="font-size:15pt;font-weight:700;color:#fff;">${f.ctaText}</p>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;font-size:9.5pt;color:${c.text}99;">
      <span style="display:flex;align-items:center;gap:4px;">${f.phone}</span>
      <span style="display:flex;align-items:center;gap:4px;">${f.website}</span>
      <span style="display:flex;align-items:center;gap:4px;">${f.email}</span>
    </div>
    <div style="text-align:center;margin-top:12px;font-size:9pt;color:${c.text}77;">
      <p>${f.address} · ${f.hours}</p>
    </div>
    <p style="text-align:center;margin-top:16px;font-size:11pt;font-weight:600;color:${c.primary};font-style:italic;">${f.tagline}</p>
  </div>
  ` : ''}

  ${t.layout === 'gradient-diagonal' ? `
  <!-- Gradient Diagonal Layout -->
  <div style="padding:48px 40px;">
    <div style="display:inline-block;background:${c.accent};color:#fff;font-weight:800;font-size:22pt;padding:8px 20px;border-radius:6px;letter-spacing:2px;margin-bottom:28px;">${logoHtml}</div>
    <h1 style="font-size:32pt;font-weight:800;color:#ffffff;line-height:1.1;margin-bottom:14px;">${f.headline}</h1>
    <p style="font-size:14pt;color:rgba(255,255,255,0.75);font-weight:300;margin-bottom:28px;">${f.subheadline}</p>
    <p style="font-size:11pt;color:rgba(255,255,255,0.7);line-height:1.7;margin-bottom:28px;">${f.bodyText}</p>
    ${f.promoText ? `<div style="background:rgba(255,255,255,0.1);border:2px solid ${c.accent};border-radius:8px;padding:14px 20px;margin-bottom:28px;text-align:center;"><p style="font-size:14pt;font-weight:700;color:${c.accent};">${f.promoText}</p></div>` : ''}
    <h3 style="font-size:11pt;font-weight:700;color:${c.accent};margin-bottom:16px;text-transform:uppercase;letter-spacing:2px;">Our Services</h3>
    <div style="columns:2;column-gap:20px;margin-bottom:32px;">${servicesHtml}</div>
    <div style="background:${c.accent};border-radius:10px;padding:18px 24px;text-align:center;margin-bottom:28px;">
      <p style="font-size:15pt;font-weight:700;color:#fff;">${f.ctaText}</p>
    </div>
    <div style="border-top:1px solid rgba(255,255,255,0.2);padding-top:18px;display:flex;flex-wrap:wrap;gap:20px;justify-content:center;font-size:9.5pt;color:rgba(255,255,255,0.6);">
      <span>${f.phone}</span><span>${f.website}</span><span>${f.email}</span>
    </div>
    <p style="text-align:center;margin-top:8px;font-size:9pt;color:rgba(255,255,255,0.5);">${f.address} · ${f.hours}</p>
    <p style="text-align:center;margin-top:16px;font-size:12pt;font-weight:600;color:${c.accent};font-style:italic;">${f.tagline}</p>
  </div>
  ` : ''}

  ${t.layout === 'split' ? `
  <!-- Split Layout -->
  <div style="display:flex;min-height:${t.size.height}mm;">
    <div style="width:38%;background:${c.primary};padding:36px 24px;display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        <div style="background:${c.accent};color:#fff;font-weight:800;font-size:22pt;padding:8px 16px;border-radius:6px;letter-spacing:2px;display:inline-block;margin-bottom:28px;">${logoHtml}</div>
        <h3 style="font-size:10pt;font-weight:600;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;">Our Services</h3>
        ${f.services.map(s => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><div style="width:5px;height:5px;border-radius:50%;background:${c.accent};"></div><span style="font-size:9.5pt;color:rgba(255,255,255,0.85);">${s}</span></div>`).join('')}
      </div>
      <div style="font-size:9pt;color:rgba(255,255,255,0.5);">
        <p>${f.phone}</p><p>${f.email}</p><p>${f.website}</p><p style="margin-top:8px;">${f.hours}</p>
      </div>
    </div>
    <div style="width:62%;padding:40px 32px;background:${c.bg};display:flex;flex-direction:column;justify-content:center;">
      <h1 style="font-size:28pt;font-weight:800;color:${c.text};line-height:1.1;margin-bottom:12px;">${f.headline}</h1>
      <p style="font-size:13pt;color:${c.primary};font-weight:500;margin-bottom:24px;">${f.subheadline}</p>
      <p style="font-size:11pt;color:${c.text}cc;line-height:1.7;margin-bottom:28px;">${f.bodyText}</p>
      ${f.promoText ? `<div style="background:${c.accent}15;border-left:4px solid ${c.accent};padding:12px 18px;margin-bottom:28px;"><p style="font-size:12pt;font-weight:700;color:${c.accent};">${f.promoText}</p></div>` : ''}
      <div style="background:${c.primary};border-radius:10px;padding:16px;text-align:center;margin-bottom:20px;">
        <p style="font-size:14pt;font-weight:700;color:#fff;">${f.ctaText}</p>
      </div>
      <p style="text-align:center;font-size:9pt;color:${c.text}88;">${f.address}</p>
      <p style="text-align:center;margin-top:16px;font-size:11pt;font-weight:600;color:${c.primary};font-style:italic;">${f.tagline}</p>
    </div>
  </div>
  ` : ''}

  ${t.layout === 'centered' ? `
  <!-- Centered Layout -->
  <div style="padding:44px 40px;text-align:center;">
    <div style="display:inline-block;background:${c.primary};color:#fff;font-weight:800;font-size:22pt;padding:8px 20px;border-radius:6px;letter-spacing:2px;margin-bottom:28px;">${logoHtml}</div>
    <h1 style="font-size:30pt;font-weight:800;color:${c.text};line-height:1.1;margin-bottom:12px;">${f.headline}</h1>
    <div style="width:60px;height:4px;background:${c.accent};border-radius:2px;margin:0 auto 18px;"></div>
    <p style="font-size:13pt;color:${c.primary};font-weight:500;margin-bottom:24px;">${f.subheadline}</p>
    <p style="font-size:11pt;color:${c.text}bb;line-height:1.7;max-width:85%;margin:0 auto 28px;">${f.bodyText}</p>
    ${f.promoText ? `<div style="background:${c.accent}12;border:2px dashed ${c.accent};border-radius:10px;padding:14px 24px;margin-bottom:28px;display:inline-block;"><p style="font-size:13pt;font-weight:700;color:${c.accent};">${f.promoText}</p></div>` : ''}
    <h3 style="font-size:11pt;font-weight:700;color:${c.primary};margin-bottom:16px;text-transform:uppercase;letter-spacing:1.5px;">Our Services</h3>
    <div style="max-width:80%;margin:0 auto 28px;text-align:left;columns:2;column-gap:24px;">${servicesHtml}</div>
    <div style="background:linear-gradient(135deg,${c.primary},${c.secondary});border-radius:10px;padding:18px 32px;display:inline-block;margin-bottom:24px;">
      <p style="font-size:15pt;font-weight:700;color:#fff;">${f.ctaText}</p>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:20px;justify-content:center;font-size:9.5pt;color:${c.text}88;margin-bottom:8px;">
      <span>${f.phone}</span><span>${f.website}</span><span>${f.email}</span>
    </div>
    <p style="font-size:9pt;color:${c.text}66;">${f.address} · ${f.hours}</p>
    <p style="margin-top:16px;font-size:11pt;font-weight:600;color:${c.primary};font-style:italic;">${f.tagline}</p>
  </div>
  ` : ''}

  ${t.layout === 'minimal' ? `
  <!-- Minimal Layout -->
  <div style="padding:50px 44px;">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:36px;">
      <div style="background:${c.primary};color:#fff;font-weight:800;font-size:18pt;padding:6px 14px;border-radius:6px;letter-spacing:1px;">${logoHtml}</div>
      <div style="height:1px;flex:1;background:${c.primary}22;"></div>
    </div>
    <h1 style="font-size:30pt;font-weight:800;color:${c.text};line-height:1.08;margin-bottom:14px;">${f.headline}</h1>
    <p style="font-size:14pt;color:${c.primary};font-weight:400;margin-bottom:28px;border-left:3px solid ${c.accent};padding-left:14px;">${f.subheadline}</p>
    <p style="font-size:11pt;color:${c.text}aa;line-height:1.75;margin-bottom:32px;">${f.bodyText}</p>
    ${f.promoText ? `<div style="background:${c.accent}0d;border-radius:8px;padding:14px 20px;margin-bottom:28px;text-align:center;"><p style="font-size:12pt;font-weight:600;color:${c.accent};">${f.promoText}</p></div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:32px;">
      ${f.services.map(s => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;"><div style="width:5px;height:5px;border-radius:50%;background:${c.accent};"></div><span style="font-size:10pt;color:${c.text}cc;">${s}</span></div>`).join('')}
    </div>
    <div style="background:${c.primary};border-radius:8px;padding:16px;text-align:center;margin-bottom:28px;">
      <p style="font-size:14pt;font-weight:700;color:#fff;">${f.ctaText}</p>
    </div>
    <div style="border-top:1px solid ${c.primary}15;padding-top:18px;display:flex;flex-wrap:wrap;gap:24px;font-size:9.5pt;color:${c.text}88;">
      <span>${f.phone}</span><span>${f.website}</span><span>${f.email}</span><span>${f.address}</span>
    </div>
    <p style="margin-top:12px;font-size:9pt;color:${c.text}66;">${f.hours}</p>
    <p style="margin-top:18px;font-size:11pt;font-weight:500;color:${c.primary};font-style:italic;">${f.tagline}</p>
  </div>
  ` : ''}

</div>
</body></html>`
  }

  function openPreview() {
    setPreviewHtml(buildFlyerHtml())
    setShowPreview(true)
  }

  async function exportAsPng() {
    setExporting(true)
    try {
      const html = buildFlyerHtml()
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const w = window.open(url, '_blank')
      if (w) {
        w.onload = () => {
          setTimeout(() => { w.print() }, 500)
        }
      }
    } finally { setExporting(false) }
  }

  function downloadHtml() {
    const html = buildFlyerHtml()
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bpr-flyer-${template.id}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const MM_TO_PX = 3.7795
  const FLYER_PX_W = useMemo(() => template.size.width * MM_TO_PX, [template.size.width])

  useEffect(() => {
    const el = previewOuterRef.current
    if (!el) return

    const update = () => {
      const w = el.clientWidth
      const available = Math.max(1, w - 32)
      const next = Math.min(1, available / FLYER_PX_W)
      setPreviewScale(Number.isFinite(next) ? next : 1)
    }

    update()
    const ro = new ResizeObserver(() => update())
    ro.observe(el)
    return () => ro.disconnect()
  }, [FLYER_PX_W])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/marketing" className="text-xs text-muted-foreground hover:text-primary mb-3 inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Marketing
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Flyer Creator</h1>
            <p className="text-sm text-muted-foreground">Design print-ready flyers with AI-powered suggestions — export PDF or PNG</p>
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
                <Palette className="h-4 w-4 text-rose-400" />
                <span className="text-sm font-medium text-foreground">Templates</span>
                <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full">{TEMPLATES.length}</span>
              </div>
              {showTemplates ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {showTemplates && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => selectTemplate(t)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      template.id === t.id
                        ? 'border-rose-500/50 bg-rose-500/10'
                        : 'border-border bg-muted/20 hover:border-rose-500/30'
                    }`}
                  >
                    <div className="flex gap-1.5 mb-2">
                      {[t.colors.primary, t.colors.secondary, t.colors.accent].map((c, i) => (
                        <div key={i} style={{ background: c }} className="w-4 h-4 rounded-full border border-white/20" />
                      ))}
                    </div>
                    <p className="text-xs font-medium text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.size.label}</p>
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
              {(['primary', 'secondary', 'accent', 'bg', 'text'] as const).map(key => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={e => setColors(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-8 h-8 rounded-lg border border-border cursor-pointer"
                  />
                  <span className="text-[10px] text-muted-foreground capitalize">{key}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Copy Editor */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-violet-400" />
                <span className="text-sm font-medium text-foreground">Content</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={applyMarketingDefaults}
                  disabled={!marketingDefaultsJson}
                  className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50 transition"
                >
                  Apply marketing defaults
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!clinicDefaults) return
                    setFlyer(prev => ({
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
                  {suggestingCopy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI Write Copy
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
                    {flyer.logoUrl ? flyer.logoUrl : 'Select from Image Library'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Pick</span>
                </button>
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Logo Text</label>
                <input type="text" value={flyer.logoText} onChange={e => updateFlyer('logoText', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Headline</label>
                <input type="text" value={flyer.headline} onChange={e => updateFlyer('headline', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-medium text-muted-foreground block mb-1">Subheadline</label>
              <input type="text" value={flyer.subheadline} onChange={e => updateFlyer('subheadline', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </div>

            <div>
              <label className="text-[10px] font-medium text-muted-foreground block mb-1">Body Text</label>
              <textarea value={flyer.bodyText} onChange={e => updateFlyer('bodyText', e.target.value)} rows={3} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary resize-none" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">CTA Button Text</label>
                <input type="text" value={flyer.ctaText} onChange={e => updateFlyer('ctaText', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Promo / Offer</label>
                <input type="text" value={flyer.promoText} onChange={e => updateFlyer('promoText', e.target.value)} placeholder="e.g. 20% Off First Visit!" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary placeholder-muted-foreground/50" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-medium text-muted-foreground block mb-1">Tagline</label>
              <input type="text" value={flyer.tagline} onChange={e => updateFlyer('tagline', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-teal-400" />
              <span className="text-sm font-medium text-foreground">Contact Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Phone</label>
                <input type="text" value={flyer.phone} onChange={e => updateFlyer('phone', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Email</label>
                <input type="text" value={flyer.email} onChange={e => updateFlyer('email', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Website</label>
                <input type="text" value={flyer.website} onChange={e => updateFlyer('website', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Address</label>
                <input type="text" value={flyer.address} onChange={e => updateFlyer('address', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground block mb-1">Opening Hours</label>
              <input type="text" value={flyer.hours} onChange={e => updateFlyer('hours', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </div>
          </div>

          {/* Services Selector */}
          <div className="bg-card border border-border rounded-xl p-4">
            <button onClick={() => setShowServices(!showServices)} className="flex items-center justify-between w-full text-left">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-foreground">Services ({flyer.services.length} selected)</span>
              </div>
              {showServices ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {showServices && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                {BPR_SERVICES.map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={flyer.services.includes(s)}
                      onChange={() => toggleService(s)}
                      className="accent-primary"
                    />
                    <span className={flyer.services.includes(s) ? 'text-foreground' : 'text-muted-foreground'}>{s}</span>
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
            <div className="bg-card border border-border rounded-xl p-3 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">Live Preview</span>
              <div className="flex gap-2">
                <button onClick={openPreview} className="text-xs bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-lg transition flex items-center gap-1"><Eye className="h-3 w-3" /> Full</button>
                <button onClick={downloadHtml} className="text-xs bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-lg transition flex items-center gap-1"><Download className="h-3 w-3" /> HTML</button>
                <button onClick={openPreview} className="text-xs bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1"><Download className="h-3 w-3" /> PDF</button>
              </div>
            </div>

            {/* Preview */}
            <div ref={previewOuterRef} className="bg-muted/20 border border-border rounded-xl p-4 overflow-hidden flex justify-center">
              <div
                ref={previewRef}
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top center',
                  width: `${template.size.width}mm`,
                  height: `${template.size.height}mm`,
                }}
                className="shadow-2xl"
              >
                <iframe
                  srcDoc={buildFlyerHtml()}
                  style={{ width: `${template.size.width}mm`, height: `${template.size.height}mm`, border: 'none' }}
                  title="Flyer Preview"
                />
              </div>
            </div>

            <p className="text-center text-[10px] text-muted-foreground">
              {template.size.label} · {template.size.width}×{template.size.height}mm · Click PDF to print
            </p>
          </div>
        </div>
      </div>

      {/* Full Preview Modal */}
      {showPreview && previewHtml && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <span className="text-sm font-medium text-gray-800">Flyer Preview — Ctrl+P to save as PDF</span>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-800 text-sm">Close</button>
            </div>
            <iframe srcDoc={previewHtml} className="w-full h-[80vh]" title="Flyer Preview Full" />
          </div>
        </div>
      )}

      <ImageGalleryPicker
        open={showLogoPicker}
        onOpenChange={setShowLogoPicker}
        onSelect={(imageUrl) => {
          updateFlyer('logoUrl', imageUrl)
        }}
        selectedImageUrl={flyer.logoUrl}
        category="logo"
      />
    </div>
  )
}
