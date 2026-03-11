'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Sparkles, Download, Eye, Loader2, Palette, Type,
  Phone, Globe, MapPin, Mail, CreditCard, ChevronDown, ChevronUp,
  RotateCcw, QrCode, Instagram, Zap, Upload, X, Image as ImageIcon
} from 'lucide-react'

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
  style: 'classic' | 'modern' | 'bold' | 'minimal' | 'gradient' | 'elegant' | 'stripe' | 'split-bg'
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
  {
    id: 'elegant-ivory',
    name: 'Elegant Ivory',
    description: 'Refined centered layout with border',
    colors: { primary: '#0d7377', secondary: '#064e52', accent: '#c8952a', bg: '#fefcf3', text: '#2c2c2c', backBg: '#0d7377' },
    style: 'elegant',
  },
  {
    id: 'stripe-corporate',
    name: 'Stripe Corporate',
    description: 'Bold side stripe, structured look',
    colors: { primary: '#0d7377', secondary: '#0a5c5f', accent: '#c8952a', bg: '#ffffff', text: '#1a2332', backBg: '#0d7377' },
    style: 'stripe',
  },
  {
    id: 'split-mono',
    name: 'Split Mono',
    description: 'Two-tone dark/light split',
    colors: { primary: '#1a2332', secondary: '#0d7377', accent: '#c8952a', bg: '#ffffff', text: '#1a2332', backBg: '#1a2332' },
    style: 'split-bg',
  },
  {
    id: 'luxury-gold',
    name: 'Luxury Gold',
    description: 'Premium black & gold gradient',
    colors: { primary: '#1a1a1a', secondary: '#2a2a2a', accent: '#c8952a', bg: '#0a0a0a', text: '#ffffff', backBg: '#0a0a0a' },
    style: 'gradient',
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
  // Logo upload
  const [logoImage, setLogoImage] = useState<string | null>(null)
  const [logoSize, setLogoSize] = useState(12) // mm
  const logoInputRef = useRef<HTMLInputElement>(null)
  // Gradient options
  const [gradientEnabled, setGradientEnabled] = useState(false)
  const [gradientAngle, setGradientAngle] = useState(135)
  const [gradientColor1, setGradientColor1] = useState('#0d7377')
  const [gradientColor2, setGradientColor2] = useState('#0a5c5f')
  const [backGradientEnabled, setBackGradientEnabled] = useState(false)
  const [backGradientAngle, setBackGradientAngle] = useState(135)
  const [backGradientColor1, setBackGradientColor1] = useState('#0d7377')
  const [backGradientColor2, setBackGradientColor2] = useState('#064e52')

  function selectTemplate(t: CardTemplate) {
    setTemplate(t)
    setColors(t.colors)
    // Auto-enable gradient for gradient-style templates
    if (t.style === 'gradient') {
      setGradientEnabled(true)
      setGradientColor1(t.colors.primary)
      setGradientColor2(t.colors.secondary)
      setBackGradientEnabled(true)
      setBackGradientColor1(t.colors.secondary)
      setBackGradientColor2(t.colors.primary)
    } else {
      setGradientEnabled(false)
      setBackGradientEnabled(false)
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

  function updateCard(field: keyof CardData, value: any) {
    setCard(prev => ({ ...prev, [field]: value }))
  }

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
    if (gradientEnabled) {
      bgStyle = `background:linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2});`
    } else if (t.style === 'gradient') {
      bgStyle = `background:linear-gradient(135deg, ${c.primary}, ${c.secondary});`
    } else if (t.style === 'bold') {
      bgStyle = `background:${c.bg};`
    }

    const isLight = !gradientEnabled && (c.bg === '#ffffff' || c.bg === '#f8fafc' || c.bg === '#fefcf3')
    const txtCol = isLight ? c.text : '#ffffff'
    const subCol = isLight ? `${c.text}99` : 'rgba(255,255,255,0.65)'

    const logoHtml = logoImage
      ? `<img src="${logoImage}" style="height:${logoSize}mm;max-width:25mm;object-fit:contain;border-radius:1mm;" />`
      : `<div style="background:${c.primary};color:#fff;font-weight:800;font-size:11pt;padding:1.5mm 3mm;border-radius:1.5mm;letter-spacing:0.5mm;">${d.logoText}</div>`

    const logoHtmlSmall = logoImage
      ? `<img src="${logoImage}" style="height:${logoSize * 0.7}mm;max-width:18mm;object-fit:contain;border-radius:0.5mm;" />`
      : `<div style="background:${c.primary};color:#fff;font-weight:800;font-size:9pt;padding:1mm 2.5mm;border-radius:1mm;letter-spacing:0.5mm;">${d.logoText}</div>`

    // ── ELEGANT: centered, bordered, refined ──
    if (t.style === 'elegant') {
      return `<div style="width:${CARD_W}mm;height:${CARD_H}mm;${bgStyle}border-radius:2mm;overflow:hidden;position:relative;font-family:'Inter',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:2mm;border:0.4mm solid ${c.accent}40;border-radius:1.5mm;pointer-events:none;"></div>
        <div style="text-align:center;padding:4mm;">
          <div style="margin-bottom:3mm;display:flex;justify-content:center;">${logoHtml}</div>
          <h1 style="font-size:13pt;font-weight:700;color:${txtCol};margin:0 0 1mm;letter-spacing:0.3mm;">${d.name}</h1>
          <div style="width:12mm;height:0.4mm;background:${c.accent};margin:0 auto 1.5mm;border-radius:1mm;"></div>
          <p style="font-size:7pt;color:${c.primary};font-weight:600;margin:0 0 0.5mm;">${d.title}</p>
          <p style="font-size:5pt;color:${subCol};margin:0 0 3mm;">${d.qualifications}</p>
          <div style="display:flex;flex-wrap:wrap;gap:1.5mm 4mm;justify-content:center;font-size:5pt;color:${subCol};">
            <span>${d.phone}</span><span>${d.email}</span><span>${d.website}</span>
            ${d.instagram ? `<span>${d.instagram}</span>` : ''}
          </div>
        </div>
      </div>`
    }

    // ── STRIPE: bold left stripe with offset content ──
    if (t.style === 'stripe') {
      return `<div style="width:${CARD_W}mm;height:${CARD_H}mm;background:${c.bg};border-radius:2mm;overflow:hidden;position:relative;font-family:'Inter',system-ui,sans-serif;display:flex;">
        <div style="width:7mm;background:${gradientEnabled ? `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2})` : c.primary};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm;">
          <div style="writing-mode:vertical-rl;text-orientation:mixed;font-size:5pt;font-weight:700;color:rgba(255,255,255,0.6);letter-spacing:1.5mm;text-transform:uppercase;">${d.logoText}</div>
        </div>
        <div style="flex:1;padding:6mm 6mm 5mm 5mm;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <div style="margin-bottom:2.5mm;">${logoHtmlSmall}</div>
            <h1 style="font-size:12pt;font-weight:700;color:${c.text};margin:0 0 0.8mm;">${d.name}</h1>
            <p style="font-size:7pt;color:${c.primary};font-weight:600;margin:0 0 0.5mm;">${d.title}</p>
            <p style="font-size:5.5pt;color:${c.text}88;margin:0;">${d.qualifications}</p>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:1.5mm 4mm;font-size:5.5pt;color:${c.text}88;">
            <span>${d.phone}</span><span>${d.email}</span><span>${d.website}</span>
            ${d.instagram ? `<span>${d.instagram}</span>` : ''}
          </div>
        </div>
      </div>`
    }

    // ── SPLIT-BG: two-tone dark/light split ──
    if (t.style === 'split-bg') {
      return `<div style="width:${CARD_W}mm;height:${CARD_H}mm;border-radius:2mm;overflow:hidden;position:relative;font-family:'Inter',system-ui,sans-serif;display:flex;">
        <div style="width:32mm;background:${gradientEnabled ? `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2})` : c.primary};padding:6mm 5mm;display:flex;flex-direction:column;justify-content:space-between;">
          <div style="display:flex;justify-content:center;">${logoImage
            ? `<img src="${logoImage}" style="height:${logoSize}mm;max-width:22mm;object-fit:contain;" />`
            : `<div style="background:${c.accent};color:#fff;font-weight:800;font-size:14pt;padding:2mm 3mm;border-radius:1.5mm;letter-spacing:1mm;text-align:center;">${d.logoText}</div>`
          }</div>
          <div style="text-align:center;">
            <p style="font-size:5pt;color:rgba(255,255,255,0.5);font-style:italic;line-height:1.4;">${d.tagline}</p>
          </div>
        </div>
        <div style="flex:1;background:${c.bg};padding:6mm 6mm 5mm;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <h1 style="font-size:12pt;font-weight:700;color:${c.text};margin:0 0 0.8mm;">${d.name}</h1>
            <p style="font-size:7pt;color:${c.secondary};font-weight:600;margin:0 0 0.5mm;">${d.title}</p>
            <p style="font-size:5.5pt;color:${c.text}88;margin:0;">${d.qualifications}</p>
          </div>
          <div style="border-top:0.3mm solid ${c.primary}20;padding-top:2mm;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1mm;font-size:5pt;color:${c.text}88;">
              <span>${d.phone}</span><span>${d.email}</span>
              <span>${d.website}</span>${d.instagram ? `<span>${d.instagram}</span>` : ''}
            </div>
          </div>
        </div>
      </div>`
    }

    // ── DEFAULT STYLES: classic, modern, bold, minimal, gradient ──
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

    const isBackDark = c.backBg !== '#ffffff' && c.backBg !== '#f8fafc' && c.backBg !== '#fefcf3'
    const txtCol = isBackDark ? '#ffffff' : c.text
    const subCol = isBackDark ? 'rgba(255,255,255,0.7)' : `${c.text}88`

    let bgStyle = `background:${c.backBg};`
    if (backGradientEnabled) {
      bgStyle = `background:linear-gradient(${backGradientAngle}deg, ${backGradientColor1}, ${backGradientColor2});`
    } else if (t.style === 'gradient') {
      bgStyle = `background:linear-gradient(135deg, ${c.secondary}, ${c.primary});`
    }

    const servicesHtml = d.services.map(s =>
      `<div style="display:flex;align-items:center;gap:1.5mm;margin-bottom:1mm;"><div style="width:1.2mm;height:1.2mm;border-radius:50%;background:${c.accent};flex-shrink:0;"></div><span style="font-size:5.5pt;color:${subCol};">${s}</span></div>`
    ).join('')

    const backLogoHtml = logoImage
      ? `<img src="${logoImage}" style="height:${logoSize * 0.8}mm;max-width:20mm;object-fit:contain;border-radius:1mm;" />`
      : `<div style="background:${c.accent};color:#fff;font-weight:800;font-size:9pt;padding:1mm 2.5mm;border-radius:1mm;letter-spacing:0.5mm;">${d.logoText}</div>`

    // ── ELEGANT BACK: centered services with border ──
    if (t.style === 'elegant') {
      return `<div style="width:${CARD_W}mm;height:${CARD_H}mm;${bgStyle}border-radius:2mm;overflow:hidden;position:relative;font-family:'Inter',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:2mm;border:0.4mm solid ${c.accent}40;border-radius:1.5mm;pointer-events:none;"></div>
        <div style="text-align:center;padding:4mm 6mm;width:100%;">
          <div style="margin-bottom:2mm;display:flex;justify-content:center;">${backLogoHtml}</div>
          <div style="width:12mm;height:0.4mm;background:${c.accent};margin:0 auto 2.5mm;border-radius:1mm;"></div>
          <div style="columns:2;column-gap:4mm;text-align:left;margin-bottom:3mm;">${servicesHtml}</div>
          ${d.showQr ? `<div style="width:14mm;height:14mm;background:${isBackDark ? 'rgba(255,255,255,0.08)' : c.primary + '08'};border-radius:1.5mm;margin:0 auto 2mm;display:flex;align-items:center;justify-content:center;">
            <div style="font-size:4.5pt;color:${subCol};text-align:center;">QR<br>${d.website}</div>
          </div>` : ''}
          <p style="font-size:5pt;font-weight:600;color:${c.accent};font-style:italic;">${d.tagline}</p>
        </div>
      </div>`
    }

    // ── STRIPE BACK: stripe on right side ──
    if (t.style === 'stripe') {
      return `<div style="width:${CARD_W}mm;height:${CARD_H}mm;background:${isBackDark ? c.backBg : '#ffffff'};border-radius:2mm;overflow:hidden;position:relative;font-family:'Inter',system-ui,sans-serif;display:flex;">
        <div style="flex:1;padding:5mm 5mm 4mm 6mm;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <div style="margin-bottom:2mm;">${backLogoHtml}</div>
            <p style="font-size:6pt;font-weight:600;color:${c.accent};text-transform:uppercase;letter-spacing:0.3mm;margin-bottom:2mm;">Our Services</p>
            ${servicesHtml}
          </div>
          <div style="font-size:4.5pt;color:${subCol};line-height:1.5;">
            <p>${d.address} · ${d.addressLine2}</p>
          </div>
        </div>
        <div style="width:7mm;background:${backGradientEnabled ? `linear-gradient(${backGradientAngle}deg, ${backGradientColor1}, ${backGradientColor2})` : c.primary};display:flex;flex-direction:column;align-items:center;justify-content:center;">
          ${d.showQr ? `<div style="writing-mode:vertical-rl;font-size:4pt;color:rgba(255,255,255,0.5);letter-spacing:0.5mm;">${d.website}</div>` : ''}
        </div>
      </div>`
    }

    // ── SPLIT-BG BACK: inverted split ──
    if (t.style === 'split-bg') {
      return `<div style="width:${CARD_W}mm;height:${CARD_H}mm;border-radius:2mm;overflow:hidden;position:relative;font-family:'Inter',system-ui,sans-serif;display:flex;">
        <div style="flex:1;background:${c.bg};padding:5mm 5mm 4mm 6mm;">
          <p style="font-size:6pt;font-weight:600;color:${c.accent};text-transform:uppercase;letter-spacing:0.3mm;margin-bottom:2mm;">Our Services</p>
          ${servicesHtml}
          <p style="font-size:4.5pt;color:${c.text}77;margin-top:2mm;">${d.address} · ${d.addressLine2}</p>
        </div>
        <div style="width:32mm;background:${backGradientEnabled ? `linear-gradient(${backGradientAngle}deg, ${backGradientColor1}, ${backGradientColor2})` : c.primary};padding:5mm;display:flex;flex-direction:column;align-items:center;justify-content:space-between;">
          <div style="display:flex;justify-content:center;">${backLogoHtml}</div>
          ${d.showQr ? `<div style="width:16mm;height:16mm;background:rgba(255,255,255,0.1);border-radius:1.5mm;display:flex;align-items:center;justify-content:center;">
            <div style="font-size:4.5pt;color:rgba(255,255,255,0.6);text-align:center;">QR Code<br><span style="font-size:3.5pt;">${d.website}</span></div>
          </div>` : ''}
          <p style="font-size:5pt;font-weight:600;color:${c.accent};text-align:center;font-style:italic;">${d.tagline}</p>
        </div>
      </div>`
    }

    // ── DEFAULT BACK: classic, modern, bold, minimal, gradient ──
    return `<div style="width:${CARD_W}mm;height:${CARD_H}mm;${bgStyle}border-radius:2mm;overflow:hidden;position:relative;font-family:'Inter',system-ui,sans-serif;padding:5mm 6mm;display:flex;gap:4mm;">
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:2mm;margin-bottom:2.5mm;">
          ${backLogoHtml}
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

  const SCALE = 0.95

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
                <div className="bg-muted/30 border border-border rounded-lg p-2 flex items-center justify-center" style={{ width: '60px', height: '40px' }}>
                  <img src={logoImage} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-medium text-muted-foreground">Size: {logoSize}mm</label>
                    <input type="range" min={6} max={20} value={logoSize} onChange={e => setLogoSize(Number(e.target.value))} className="flex-1 accent-primary" />
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
            {/* Front gradient */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={gradientEnabled} onChange={e => setGradientEnabled(e.target.checked)} className="accent-primary" />
                <span className="text-muted-foreground text-xs">Enable gradient on <strong className="text-foreground">Front</strong></span>
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
            {/* Back gradient */}
            <div className="space-y-2 pt-1 border-t border-border/50">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={backGradientEnabled} onChange={e => setBackGradientEnabled(e.target.checked)} className="accent-primary" />
                <span className="text-muted-foreground text-xs">Enable gradient on <strong className="text-foreground">Back</strong></span>
              </label>
              {backGradientEnabled && (
                <div className="flex flex-wrap items-center gap-3 pl-5">
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={backGradientColor1} onChange={e => setBackGradientColor1(e.target.value)} className="w-7 h-7 rounded border border-border cursor-pointer" />
                    <span className="text-[10px] text-muted-foreground">From</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={backGradientColor2} onChange={e => setBackGradientColor2(e.target.value)} className="w-7 h-7 rounded border border-border cursor-pointer" />
                    <span className="text-[10px] text-muted-foreground">To</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 min-w-[100px]">
                    <span className="text-[10px] text-muted-foreground">{backGradientAngle}°</span>
                    <input type="range" min={0} max={360} step={15} value={backGradientAngle} onChange={e => setBackGradientAngle(Number(e.target.value))} className="flex-1 accent-primary" />
                  </div>
                  <div className="w-8 h-8 rounded border border-border" style={{ background: `linear-gradient(${backGradientAngle}deg, ${backGradientColor1}, ${backGradientColor2})` }} />
                </div>
              )}
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-violet-400" />
                <span className="text-sm font-medium text-foreground">Personal Info (Front)</span>
              </div>
              <button onClick={suggestCopy} disabled={suggestingCopy} className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1 disabled:opacity-50 transition">
                {suggestingCopy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI Suggest
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Logo Text</label>
                <input type="text" value={card.logoText} onChange={e => updateCard('logoText', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground block mb-1">Name</label>
                <input type="text" value={card.name} onChange={e => updateCard('name', e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              </div>
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
            <div className="bg-muted/20 border border-border rounded-xl p-4 flex justify-center overflow-hidden" style={{ height: `${55 * 3.78 * SCALE + 40}px` }}>
              <div
                style={{
                  transform: `scale(${SCALE})`,
                  transformOrigin: 'top center',
                  width: `${CARD_W}mm`,
                  height: `${CARD_H}mm`,
                  flexShrink: 0,
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
              <div className="flex gap-3 justify-center overflow-hidden" style={{ height: `${55 * 3.78 * 0.45 + 8}px` }}>
                <div onClick={() => setSide('front')} className={`cursor-pointer transition ${side === 'front' ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-card rounded-sm' : 'opacity-60 hover:opacity-100'}`} style={{ width: `${85 * 3.78 * 0.45}px`, flexShrink: 0 }}>
                  <div style={{ transform: 'scale(0.45)', transformOrigin: 'top left', width: `${CARD_W}mm`, height: `${CARD_H}mm` }} dangerouslySetInnerHTML={{ __html: buildCardFrontHtml() }} />
                </div>
                <div onClick={() => setSide('back')} className={`cursor-pointer transition ${side === 'back' ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-card rounded-sm' : 'opacity-60 hover:opacity-100'}`} style={{ width: `${85 * 3.78 * 0.45}px`, flexShrink: 0 }}>
                  <div style={{ transform: 'scale(0.45)', transformOrigin: 'top left', width: `${CARD_W}mm`, height: `${CARD_H}mm` }} dangerouslySetInnerHTML={{ __html: buildCardBackHtml() }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
