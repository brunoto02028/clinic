'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Sparkles, Download, Eye, Loader2, Palette, Type,
  Image as ImageIcon, RotateCcw, Copy, Phone, Globe, MapPin,
  Clock, Mail, Megaphone, ChevronDown, ChevronUp, Zap, Upload, X,
  Save, Trash2, FolderOpen
} from 'lucide-react'

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
  layout: 'hero-top' | 'split' | 'centered' | 'gradient-diagonal' | 'minimal' | 'magazine' | 'banner' | 'photo-grid'
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
  {
    id: 'magazine-editorial',
    name: 'Magazine Editorial',
    description: 'Two-column editorial with sidebar',
    size: { width: 210, height: 297, label: 'A4 Portrait' },
    colors: { primary: '#1a2332', secondary: '#0d7377', accent: '#c8952a', bg: '#ffffff', text: '#1a2332' },
    layout: 'magazine',
  },
  {
    id: 'bold-banner',
    name: 'Bold Banner',
    description: 'Full-width hero banner + grid',
    size: { width: 210, height: 297, label: 'A4 Portrait' },
    colors: { primary: '#0d7377', secondary: '#064e52', accent: '#f59e0b', bg: '#f8fafc', text: '#1a2332' },
    layout: 'banner',
  },
  {
    id: 'photo-showcase',
    name: 'Photo Showcase',
    description: 'Grid layout with image placeholders',
    size: { width: 210, height: 297, label: 'A4 Portrait' },
    colors: { primary: '#0d7377', secondary: '#0a5c5f', accent: '#c8952a', bg: '#ffffff', text: '#1a2332' },
    layout: 'photo-grid',
  },
  {
    id: 'luxury-dark-flyer',
    name: 'Luxury Dark',
    description: 'Premium dark with gold accents',
    size: { width: 210, height: 297, label: 'A4 Portrait' },
    colors: { primary: '#0a0a0a', secondary: '#1a1a1a', accent: '#c8952a', bg: '#0a0a0a', text: '#ffffff' },
    layout: 'gradient-diagonal',
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
}

// ── Saved Flyer Designs ──────────────────────────────────
const STORAGE_KEY_FLYERS = 'bpr_saved_flyers'
interface SavedFlyerDesign {
  id: string
  name: string
  savedAt: string
  templateId: string
  flyer: FlyerData
  colors: FlyerTemplate['colors']
  logoImage: string | null
  logoSize: number
  gradient: { enabled: boolean; angle: number; color1: string; color2: string }
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
  // Logo upload
  const [logoImage, setLogoImage] = useState<string | null>(null)
  const [logoSize, setLogoSize] = useState(28) // px height in flyer
  const logoInputRef = useRef<HTMLInputElement>(null)
  // Gradient options
  const [gradientEnabled, setGradientEnabled] = useState(false)
  const [gradientAngle, setGradientAngle] = useState(135)
  const [gradientColor1, setGradientColor1] = useState('#0d7377')
  const [gradientColor2, setGradientColor2] = useState('#0a5c5f')
  // Saved designs
  const [savedDesigns, setSavedDesigns] = useState<SavedFlyerDesign[]>([])
  const [saveName, setSaveName] = useState('')
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FLYERS)
      if (stored) setSavedDesigns(JSON.parse(stored))
    } catch {}
  }, [])

  function saveDesign() {
    const name = saveName.trim() || `Flyer ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    const design: SavedFlyerDesign = {
      id: Date.now().toString(),
      name,
      savedAt: new Date().toISOString(),
      templateId: template.id,
      flyer: { ...flyer },
      colors: { ...colors },
      logoImage,
      logoSize,
      gradient: { enabled: gradientEnabled, angle: gradientAngle, color1: gradientColor1, color2: gradientColor2 },
    }
    const updated = [design, ...savedDesigns]
    setSavedDesigns(updated)
    localStorage.setItem(STORAGE_KEY_FLYERS, JSON.stringify(updated))
    setSaveName('')
  }

  function loadDesign(design: SavedFlyerDesign) {
    const t = TEMPLATES.find(t => t.id === design.templateId) || TEMPLATES[0]
    setTemplate(t)
    setFlyer({ ...design.flyer })
    setColors({ ...design.colors })
    setLogoImage(design.logoImage)
    setLogoSize(design.logoSize)
    setGradientEnabled(design.gradient.enabled)
    setGradientAngle(design.gradient.angle)
    setGradientColor1(design.gradient.color1)
    setGradientColor2(design.gradient.color2)
    setShowSaved(false)
  }

  function deleteDesign(id: string) {
    const updated = savedDesigns.filter(d => d.id !== id)
    setSavedDesigns(updated)
    localStorage.setItem(STORAGE_KEY_FLYERS, JSON.stringify(updated))
  }

  function selectTemplate(t: FlyerTemplate) {
    setTemplate(t)
    setColors(t.colors)
    if (t.layout === 'gradient-diagonal') {
      setGradientEnabled(true)
      setGradientColor1(t.colors.primary)
      setGradientColor2(t.colors.secondary)
    } else {
      setGradientEnabled(false)
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setLogoImage(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  function updateFlyer(field: keyof FlyerData, value: any) {
    setFlyer(prev => ({ ...prev, [field]: value }))
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

    const isDark = gradientEnabled || t.layout === 'gradient-diagonal' || c.bg.toLowerCase() === '#0f1923' || c.bg.toLowerCase() === '#000000'

    const servicesHtml = f.services.map(s =>
      `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><div style="width:6px;height:6px;border-radius:50%;background:${c.accent};flex-shrink:0;"></div><span style="font-size:11pt;color:${isDark || t.layout === 'gradient-diagonal' ? 'rgba(255,255,255,0.85)' : c.text};">${s}</span></div>`
    ).join('')
    const textColor = isDark ? '#ffffff' : c.text
    const subtextColor = isDark ? 'rgba(255,255,255,0.7)' : `${c.text}99`

    // Logo helper — image or text fallback
    const logoHtmlInline = (bgColor: string, fontSize: string, padding: string, extraStyle = '') => logoImage
      ? `<img src="${logoImage}" style="height:${logoSize}pt;max-width:120px;object-fit:contain;border-radius:4px;${extraStyle}" />`
      : `<div style="display:inline-block;background:${bgColor};color:#fff;font-weight:800;font-size:${fontSize};padding:${padding};border-radius:6px;letter-spacing:2px;${extraStyle}">${f.logoText}</div>`

    let bgStyle = `background:${c.bg};`
    if (gradientEnabled) {
      bgStyle = `background:linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2});`
    } else if (t.layout === 'gradient-diagonal') {
      bgStyle = `background:linear-gradient(135deg, ${c.primary} 0%, ${c.secondary} 50%, ${c.primary}dd 100%);`
    } else if (t.layout === 'hero-top') {
      bgStyle = `background:linear-gradient(180deg, ${c.primary} 0%, ${c.primary}ee 30%, ${c.bg} 30%);`
    }

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
    ${logoHtmlInline(c.accent, '24pt', '8px 20px', 'margin-bottom:16px;')}
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
    ${logoHtmlInline(c.accent, '22pt', '8px 20px', 'margin-bottom:28px;')}
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
        ${logoHtmlInline(c.accent, '22pt', '8px 16px', 'margin-bottom:28px;')}
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
    ${logoHtmlInline(c.primary, '22pt', '8px 20px', 'margin-bottom:28px;')}
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
      ${logoHtmlInline(c.primary, '18pt', '6px 14px', '')}
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

  ${t.layout === 'magazine' ? `
  <!-- Magazine Editorial Layout -->
  <div style="display:flex;min-height:${t.size.height}mm;">
    <div style="width:65%;padding:44px 32px 36px 40px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
        ${logoHtmlInline(c.primary, '20pt', '6px 16px', '')}
        <div style="height:1px;flex:1;background:${c.primary}20;"></div>
      </div>
      <h1 style="font-size:30pt;font-weight:800;color:${textColor};line-height:1.08;margin-bottom:10px;">${f.headline}</h1>
      <p style="font-size:14pt;color:${c.secondary};font-weight:500;margin-bottom:20px;">${f.subheadline}</p>
      <div style="columns:2;column-gap:20px;margin-bottom:24px;">
        <p style="font-size:10pt;color:${subtextColor};line-height:1.75;">${f.bodyText}</p>
      </div>
      ${f.promoText ? `<div style="background:${c.accent}10;border-left:4px solid ${c.accent};padding:14px 18px;margin-bottom:24px;"><p style="font-size:13pt;font-weight:700;color:${c.accent};">${f.promoText}</p></div>` : ''}
      <div style="background:${c.primary};border-radius:8px;padding:16px;text-align:center;margin-bottom:20px;">
        <p style="font-size:14pt;font-weight:700;color:#fff;">${f.ctaText}</p>
      </div>
      <p style="font-size:10pt;font-weight:500;color:${c.primary};font-style:italic;">${f.tagline}</p>
    </div>
    <div style="width:35%;background:${c.primary};padding:44px 24px 36px;display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        <h3 style="font-size:10pt;font-weight:700;color:${c.accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:20px;">Our Services</h3>
        ${f.services.map(s => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.08);"><div style="width:5px;height:5px;border-radius:50%;background:${c.accent};flex-shrink:0;"></div><span style="font-size:9.5pt;color:rgba(255,255,255,0.85);">${s}</span></div>`).join('')}
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.15);padding-top:18px;">
        <div style="font-size:9pt;color:rgba(255,255,255,0.6);line-height:2;">
          <p>${f.phone}</p>
          <p>${f.email}</p>
          <p>${f.website}</p>
          <p>${f.address}</p>
          <p style="margin-top:8px;font-weight:600;color:rgba(255,255,255,0.8);">${f.hours}</p>
        </div>
      </div>
    </div>
  </div>
  ` : ''}

  ${t.layout === 'banner' ? `
  <!-- Bold Banner Layout -->
  <div>
    <div style="background:${gradientEnabled ? `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2})` : `linear-gradient(135deg, ${c.primary}, ${c.secondary})`};padding:48px 40px 40px;text-align:center;position:relative;">
      <div style="position:absolute;top:0;left:0;right:0;height:6px;background:${c.accent};"></div>
      ${logoHtmlInline(c.accent, '24pt', '8px 22px', 'margin-bottom:18px;')}
      <h1 style="font-size:32pt;font-weight:800;color:#ffffff;line-height:1.1;margin-bottom:10px;">${f.headline}</h1>
      <p style="font-size:14pt;color:rgba(255,255,255,0.8);font-weight:300;">${f.subheadline}</p>
    </div>
    <div style="padding:32px 40px 36px;background:${c.bg};">
      <p style="font-size:11pt;color:${c.text}bb;line-height:1.7;margin-bottom:24px;text-align:center;max-width:85%;margin-left:auto;margin-right:auto;">${f.bodyText}</p>
      ${f.promoText ? `<div style="background:${c.accent}12;border:2px solid ${c.accent};border-radius:10px;padding:14px 24px;margin-bottom:24px;text-align:center;"><p style="font-size:14pt;font-weight:700;color:${c.accent};">${f.promoText}</p></div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px;">
        ${f.services.map(s => `<div style="display:flex;align-items:center;gap:10px;background:${c.primary}08;border-radius:8px;padding:10px 14px;"><div style="width:8px;height:8px;border-radius:50%;background:${c.accent};flex-shrink:0;"></div><span style="font-size:10pt;color:${c.text};">${s}</span></div>`).join('')}
      </div>
      <div style="background:${c.primary};border-radius:10px;padding:18px;text-align:center;margin-bottom:24px;">
        <p style="font-size:15pt;font-weight:700;color:#fff;">${f.ctaText}</p>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:20px;justify-content:center;font-size:9.5pt;color:${c.text}88;margin-bottom:8px;">
        <span>${f.phone}</span><span>${f.website}</span><span>${f.email}</span>
      </div>
      <p style="text-align:center;font-size:9pt;color:${c.text}66;">${f.address} · ${f.hours}</p>
      <p style="text-align:center;margin-top:14px;font-size:11pt;font-weight:600;color:${c.primary};font-style:italic;">${f.tagline}</p>
    </div>
  </div>
  ` : ''}

  ${t.layout === 'photo-grid' ? `
  <!-- Photo Grid / Showcase Layout -->
  <div style="padding:40px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">
      ${logoHtmlInline(c.primary, '20pt', '6px 16px', '')}
      <div style="text-align:right;">
        <p style="font-size:9pt;color:${c.text}88;">${f.phone} · ${f.email}</p>
        <p style="font-size:9pt;color:${c.text}88;">${f.website}</p>
      </div>
    </div>
    <h1 style="font-size:28pt;font-weight:800;color:${textColor};line-height:1.1;margin-bottom:8px;">${f.headline}</h1>
    <p style="font-size:13pt;color:${c.primary};font-weight:500;margin-bottom:24px;">${f.subheadline}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px;">
      <div style="background:${c.primary}12;border-radius:10px;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;"><span style="font-size:9pt;color:${c.primary}88;">Photo 1</span></div>
      <div style="background:${c.primary}12;border-radius:10px;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;"><span style="font-size:9pt;color:${c.primary}88;">Photo 2</span></div>
      <div style="background:${c.primary}12;border-radius:10px;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;"><span style="font-size:9pt;color:${c.primary}88;">Photo 3</span></div>
    </div>
    <p style="font-size:11pt;color:${c.text}bb;line-height:1.7;margin-bottom:24px;">${f.bodyText}</p>
    ${f.promoText ? `<div style="background:${c.accent}10;border-radius:8px;padding:14px 20px;margin-bottom:24px;text-align:center;"><p style="font-size:13pt;font-weight:700;color:${c.accent};">${f.promoText}</p></div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:28px;">
      ${f.services.map(s => `<div style="display:flex;align-items:center;gap:8px;"><div style="width:6px;height:6px;border-radius:50%;background:${c.accent};"></div><span style="font-size:10pt;color:${c.text}cc;">${s}</span></div>`).join('')}
    </div>
    <div style="display:flex;gap:12px;margin-bottom:24px;">
      <div style="flex:1;background:${c.primary};border-radius:8px;padding:16px;text-align:center;">
        <p style="font-size:14pt;font-weight:700;color:#fff;">${f.ctaText}</p>
      </div>
    </div>
    <div style="border-top:1px solid ${c.primary}15;padding-top:16px;display:flex;justify-content:space-between;font-size:9pt;color:${c.text}77;">
      <span>${f.address}</span>
      <span>${f.hours}</span>
    </div>
    <p style="text-align:center;margin-top:14px;font-size:11pt;font-weight:600;color:${c.primary};font-style:italic;">${f.tagline}</p>
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

  // ── Scale factor for preview ──
  const SCALE = 0.38

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

          {/* Save / Load Designs */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-foreground">Save / Load Design</span>
                {savedDesigns.length > 0 && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">{savedDesigns.length} saved</span>}
              </div>
              {savedDesigns.length > 0 && (
                <button onClick={() => setShowSaved(!showSaved)} className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition">
                  <FolderOpen className="h-3 w-3" /> {showSaved ? 'Hide' : 'View saved'}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder="Design name (optional)"
                className="flex-1 bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                onKeyDown={e => e.key === 'Enter' && saveDesign()}
              />
              <button onClick={saveDesign} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition">
                <Save className="h-3.5 w-3.5" /> Save
              </button>
            </div>
            {showSaved && savedDesigns.length > 0 && (
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {savedDesigns.map(d => (
                  <div key={d.id} className="flex items-center gap-2 bg-muted/50 border border-border/50 rounded-lg px-3 py-2 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {TEMPLATES.find(t => t.id === d.templateId)?.name || 'Custom'} · {new Date(d.savedAt).toLocaleDateString('pt-BR')} {new Date(d.savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button onClick={() => loadDesign(d)} className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-md transition whitespace-nowrap">
                      Load
                    </button>
                    <button onClick={() => deleteDesign(d.id)} className="text-muted-foreground hover:text-red-400 p-1 transition opacity-0 group-hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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

          {/* Logo Upload */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-foreground">Logo Image</span>
              <span className="text-[10px] text-muted-foreground">(optional — replaces text logo)</span>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            {logoImage ? (
              <div className="flex items-center gap-3">
                <div className="bg-muted/30 border border-border rounded-lg p-2 flex items-center justify-center" style={{ width: '80px', height: '50px' }}>
                  <img src={logoImage} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-medium text-muted-foreground">Size: {logoSize}pt</label>
                    <input type="range" min={16} max={48} value={logoSize} onChange={e => setLogoSize(Number(e.target.value))} className="flex-1 accent-primary" />
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => logoInputRef.current?.click()} className="text-[10px] text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded border border-border hover:border-emerald-500/30 transition">Change</button>
                  <button onClick={() => { setLogoImage(null); if (logoInputRef.current) logoInputRef.current.value = '' }} className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 rounded border border-border hover:border-red-500/30 transition"><X className="h-3 w-3" /></button>
                </div>
              </div>
            ) : (
              <button onClick={() => logoInputRef.current?.click()} className="w-full border-2 border-dashed border-border hover:border-emerald-500/40 rounded-lg py-3 flex flex-col items-center gap-1.5 transition text-muted-foreground hover:text-emerald-400">
                <Upload className="h-5 w-5" />
                <span className="text-xs">Upload logo image (PNG, SVG, JPG)</span>
              </button>
            )}
          </div>

          {/* Gradient Background */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-pink-400" />
              <span className="text-sm font-medium text-foreground">Gradient Background</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={gradientEnabled} onChange={e => setGradientEnabled(e.target.checked)} className="accent-primary" />
              <span className="text-muted-foreground text-xs">Enable custom gradient</span>
            </label>
            {gradientEnabled && (
              <div className="flex flex-wrap items-center gap-3 pl-5">
                <div className="flex items-center gap-1.5">
                  <input type="color" value={gradientColor1} onChange={e => setGradientColor1(e.target.value)} className="w-7 h-7 rounded border border-border cursor-pointer" />
                  <span className="text-[10px] text-muted-foreground">From</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="color" value={gradientColor2} onChange={e => setGradientColor2(e.target.value)} className="w-7 h-7 rounded border border-border cursor-pointer" />
                  <span className="text-[10px] text-muted-foreground">To</span>
                </div>
                <div className="flex items-center gap-1.5 flex-1 min-w-[100px]">
                  <span className="text-[10px] text-muted-foreground">{gradientAngle}°</span>
                  <input type="range" min={0} max={360} step={15} value={gradientAngle} onChange={e => setGradientAngle(Number(e.target.value))} className="flex-1 accent-primary" />
                </div>
                <div className="w-8 h-8 rounded border border-border" style={{ background: `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2})` }} />
              </div>
            )}
          </div>

          {/* Copy Editor */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-violet-400" />
                <span className="text-sm font-medium text-foreground">Content</span>
              </div>
              <button onClick={suggestCopy} disabled={suggestingCopy} className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1 disabled:opacity-50 transition">
                {suggestingCopy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI Write Copy
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="bg-muted/20 border border-border rounded-xl p-4 overflow-hidden flex justify-center" style={{ height: `${template.size.height * 3.78 * SCALE + 32}px` }}>
              <div
                ref={previewRef}
                style={{
                  transform: `scale(${SCALE})`,
                  transformOrigin: 'top center',
                  width: `${template.size.width}mm`,
                  height: `${template.size.height}mm`,
                  flexShrink: 0,
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
    </div>
  )
}
