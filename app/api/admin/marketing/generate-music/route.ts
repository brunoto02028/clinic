import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { claudeGenerate } from '@/lib/claude'

const SUNO_API_KEY = process.env.SUNO_API_KEY || 'a267c6defdffa6d854db77642d89044e'
// sunoapi.org — correct endpoint and auth
const SUNO_BASE = 'https://api.sunoapi.org/api/v1'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      topic,
      caption,
      duration = 30,
      type = 'instrumental', // instrumental | vocal | spoken
      style = 'motivational upbeat',
      lyrics: customLyrics,
      language = 'en',
    } = await req.json()

    if (!topic && !caption) {
      return NextResponse.json({ error: 'Topic or caption required' }, { status: 400 })
    }

    const context = topic || caption?.slice(0, 200) || 'physiotherapy rehabilitation'

    // 1. Generate lyrics via Claude (if vocal or spoken, and no custom lyrics provided)
    let finalLyrics = customLyrics || ''
    let title = `BPR - ${context.slice(0, 40)}`
    let tags = style

    if (!customLyrics && (type === 'vocal' || type === 'spoken')) {
      const lyricPrompt = type === 'spoken'
        ? `Write a short spoken-word narration (${duration} seconds when read aloud) for an Instagram Reel about: "${context}".
           Sound like Bruno, a physiotherapist from Brazil living in the UK. Professional, warm, motivational.
           End with a call to action mentioning bpr.rehab.
           ${language === 'pt' ? 'Write in Portuguese (PT-BR).' : 'Write in English (UK).'}
           Return ONLY the spoken text, no stage directions.`
        : `Write short song lyrics (fits ${duration} seconds) for a ${style} song about: "${context}".
           Theme: physiotherapy, recovery, strength, movement, health.
           Keep it punchy, positive, professional. 2-3 short verses max.
           ${language === 'pt' ? 'Write in Portuguese (PT-BR).' : 'Write in English (UK).'}
           Return ONLY the lyrics, no explanations.`

      try {
        finalLyrics = await claudeGenerate(
          [{ role: 'user', content: lyricPrompt }],
          { temperature: 0.9, maxTokens: 500 }
        )
        finalLyrics = finalLyrics.trim()
      } catch {
        finalLyrics = context
      }
    }

    // Build Suno tags based on type and style
    if (type === 'instrumental') {
      tags = `${style}, instrumental, no vocals, ${duration <= 30 ? 'short' : 'medium'} track`
    } else if (type === 'spoken') {
      tags = `${style}, spoken word, voice over, no music beat, narration`
    } else {
      tags = `${style}, vocals, singing, ${duration <= 30 ? 'short' : 'medium'} track`
    }

    // 2. Call Suno API (sunoapi.org) — correct payload format
    const isInstrumental = type !== 'vocal' && type !== 'spoken'
    // Build a richer style description incorporating the post context
    const contextStyle = `${style}, background music for a physiotherapy clinic Instagram Reel about ${context.slice(0, 80)}, ${duration <= 30 ? 'short punchy' : 'full'} track`
    // callBackUrl is required by Suno — we use our own endpoint (ignores the callback, we poll instead)
    const SITE_URL = process.env.NEXTAUTH_URL || 'https://bpr.rehab'
    const sunoPayload = isInstrumental
      ? {
          customMode: true,
          instrumental: true,
          model: 'V4_5ALL',
          style: contextStyle.slice(0, 200),
          title: title.slice(0, 80),
          callBackUrl: `${SITE_URL}/api/admin/marketing/generate-music/callback`,
        }
      : {
          customMode: true,
          instrumental: false,
          model: 'V4_5ALL',
          prompt: (finalLyrics || context).slice(0, 3000),
          style: contextStyle.slice(0, 200),
          title: title.slice(0, 80),
          callBackUrl: `${SITE_URL}/api/admin/marketing/generate-music/callback`,
        }

    const sunoRes = await fetch(`${SUNO_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify(sunoPayload),
    })

    if (!sunoRes.ok) {
      const errText = await sunoRes.text()
      console.error('[SUNO] Error:', sunoRes.status, errText)
      return NextResponse.json(
        { error: `Suno API error: ${sunoRes.status} — ${errText.slice(0, 200)}` },
        { status: 502 }
      )
    }

    const sunoData = await sunoRes.json()
    console.log('[SUNO] Response:', JSON.stringify(sunoData).slice(0, 500))

    // sunoapi.org returns: { code: 200, data: { taskId: "...", ... } }
    const taskId = sunoData?.data?.taskId || sunoData?.taskId || null
    if (!taskId) {
      return NextResponse.json({ error: 'Suno returned no taskId: ' + JSON.stringify(sunoData).slice(0, 200) }, { status: 502 })
    }

    // Return taskId immediately — client will poll via GET
    return NextResponse.json({
      success: true,
      id: taskId,
      title,
      audioUrl: null,
      imageUrl: null,
      lyrics: finalLyrics || null,
      duration,
      type,
      style,
      status: 'pending',
    })

  } catch (error: any) {
    console.error('[generate-music]', error?.message)
    return NextResponse.json({ error: error?.message || 'Music generation failed' }, { status: 500 })
  }
}

// GET /api/admin/marketing/generate-music?id=xxx — poll for audio URL
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Correct endpoint: /generate/record-info?taskId=xxx
    const res = await fetch(`${SUNO_BASE}/generate/record-info?taskId=${id}`, {
      headers: { 'Authorization': `Bearer ${SUNO_API_KEY}` },
    })

    if (!res.ok) return NextResponse.json({ error: 'Poll failed: ' + res.status }, { status: 502 })

    const data = await res.json()
    const taskData = data?.data
    const taskStatus = taskData?.status // 'SUCCESS', 'PENDING', 'ERROR'
    const tracks: any[] = taskData?.response?.sunoData || []

    if (taskStatus === 'SUCCESS' && tracks.length > 0) {
      // Return both tracks so user can pick
      const mapped = tracks.map((clip: any) => ({
        id: clip.id,
        audioUrl: clip.audioUrl || clip.sourceAudioUrl || null,
        streamUrl: clip.streamAudioUrl || clip.sourceStreamAudioUrl || null,
        imageUrl: clip.imageUrl || null,
        title: clip.title || null,
        duration: clip.duration || null,
        tags: clip.tags || null,
      }))
      return NextResponse.json({
        id,
        status: 'complete',
        audioUrl: mapped[0].audioUrl,
        streamUrl: mapped[0].streamUrl,
        imageUrl: mapped[0].imageUrl,
        title: mapped[0].title,
        duration: mapped[0].duration,
        tracks: mapped,
      })
    }

    if (taskStatus === 'ERROR') {
      return NextResponse.json({
        id, status: 'error',
        error: taskData?.errorMessage || 'Suno generation failed',
      })
    }

    // Still pending
    return NextResponse.json({ id, status: 'pending' })

  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
