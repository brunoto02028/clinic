// app/api/admin/coworker/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { coworkerChat } from '@/lib/ai-coworker'

// POST — chat with the AI Co-Worker
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { message, history = [] } = body

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const result = await coworkerChat(message, history)

    return NextResponse.json({
      success: true,
      reply: result.reply,
      durationMs: result.durationMs,
    })

  } catch (error) {
    console.error('Co-Worker chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 }
    )
  }
}
