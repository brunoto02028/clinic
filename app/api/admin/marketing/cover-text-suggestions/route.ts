import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { claudeGenerate } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { context, language = 'en' } = await req.json()
    if (!context) return NextResponse.json({ error: 'context required' }, { status: 400 })

    const prompt = `You are a world-class creative director and typographer specialising in cinematic Instagram covers for BPR - Bruno Physical Rehabilitation (UK physiotherapy clinic).

The post is about: "${context}"

Create exactly 5 UNIQUE, READY-TO-USE poster text options. Each option must be a complete, polished poster layout — using REAL, SPECIFIC words directly inspired by the topic above. Do NOT use generic placeholders like "TÍTULO AQUI" or "YOUR TITLE". Write the ACTUAL headline text the poster would show.

Each option must vary in: position (top/center/bottom), font style, color palette, and emotional tone.

Rules:
- headline: 2–5 powerful words DIRECTLY about the topic (ALL CAPS preferred). Must be the real poster title, not a placeholder.
- subline: 5–10 words supporting the headline (sentence case). Must be specific and meaningful.
- font: one of: Montserrat, Impact, Playfair Display, Oswald, Georgia
- color: #hex — white (#ffffff), off-white (#f0f0f0), teal (#14b8a6), gold (#f59e0b), red (#ef4444), or black (#111111)
- y: vertical position 0.0–1.0 — vary across options (0.12=top, 0.45=center, 0.75=lower, 0.88=bottom)
- size: font size as % of image width — 8 to 13
- style: cinematic | editorial | bold | motivational | documentary

Return ONLY a valid JSON array, no markdown, no explanation.
Format: [{"headline":"...","subline":"...","font":"...","color":"...","y":0.45,"size":11,"style":"cinematic"},...]`

    const raw = await claudeGenerate(
      [{ role: 'user', content: prompt }],
      { temperature: 0.85, maxTokens: 800 }
    )

    // Extract JSON array from response
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return NextResponse.json({ suggestions: [] })

    const parsed = JSON.parse(match[0])
    const suggestions = parsed.slice(0, 5).map((s: any) => ({
      headline: String(s.headline || '').slice(0, 60),
      subline: s.subline ? String(s.subline).slice(0, 80) : '',
      font: ['Montserrat', 'Impact', 'Playfair Display', 'Oswald', 'Georgia'].includes(s.font)
        ? s.font : 'Montserrat',
      color: /^#[0-9a-fA-F]{3,6}$/.test(s.color) ? s.color : '#ffffff',
      y: typeof s.y === 'number' ? Math.min(0.95, Math.max(0.05, s.y)) : 0.5,
      size: typeof s.size === 'number' ? Math.min(14, Math.max(5, s.size)) : 9,
      style: s.style || 'cinematic',
    }))

    return NextResponse.json({ suggestions })
  } catch (error: any) {
    console.error('[cover-text-suggestions]', error?.message)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
