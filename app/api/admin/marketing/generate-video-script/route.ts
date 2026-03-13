import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { claudeGenerate } from '@/lib/claude'
import { BPR_SYSTEM_CONTEXT } from '@/lib/marketing-prompts'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { topic, service, tone = 'educational', duration = 30, language = 'en' } = await req.json()
    if (!topic && !service) return NextResponse.json({ error: 'Topic required' }, { status: 400 })

    const topicText = topic || service
    const langInstruction = language === 'pt' ? 'Write in Portuguese (pt-BR).' : language === 'both' ? 'Write in English, then provide Portuguese translation.' : 'Write in English.'

    const prompt = `You are creating a ${duration}-second Instagram Reel script for Bruno Physical Rehabilitation (BPR), a premium clinical rehab clinic in Richmond, London.

Topic: ${topicText}
Tone: ${tone}
Duration: ${duration} seconds
${langInstruction}

Create a complete video script with:
1. A viral hook (first 3 seconds — must stop the scroll)
2. Main content breakdown (second by second)
3. Call to action (last 3 seconds)
4. On-screen text suggestions (captions/overlays)
5. Visual direction (what to show on camera)
6. Background music mood suggestion
7. Caption for the post
8. Hashtags (20-25 relevant tags)

Return as JSON:
{
  "hook": "First line spoken — must be attention-grabbing",
  "script": [
    { "time": "0-3s", "visual": "what to film", "audio": "what to say", "text_overlay": "on-screen text" },
    ...more segments
  ],
  "cta": "Call to action text",
  "caption": "Full Instagram caption",
  "hashtags": ["tag1", "tag2"],
  "music_mood": "upbeat/calm/motivational etc",
  "filming_tips": ["tip1", "tip2", "tip3"],
  "caption_pt": "Portuguese caption (if applicable)"
}`

    const raw = await claudeGenerate(
      [{ role: 'user', content: prompt }],
      { temperature: 0.8, maxTokens: 3000, systemPrompt: BPR_SYSTEM_CONTEXT }
    )

    let scriptData: any
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON')
      scriptData = JSON.parse(jsonMatch[0])
    } catch {
      scriptData = {
        hook: raw.split('\n')[0] || 'Hook not generated',
        script: [{ time: '0-30s', visual: 'Film clinic environment', audio: raw, text_overlay: '' }],
        cta: 'Book your assessment at bpr.rehab',
        caption: raw,
        hashtags: ['#physiotherapy', '#rehabilitation', '#BPR', '#London', '#sportsinjury'],
        music_mood: 'motivational',
        filming_tips: ['Good lighting', 'Stable camera', 'Clear audio'],
      }
    }

    return NextResponse.json({ success: true, script: scriptData })
  } catch (error: any) {
    console.error('Video script error:', error)
    return NextResponse.json({ error: error?.message || 'Generation failed' }, { status: 500 })
  }
}
