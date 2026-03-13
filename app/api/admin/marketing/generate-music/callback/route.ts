import { NextRequest, NextResponse } from 'next/server'

// Suno callback endpoint — receives completion notification
// We don't need to process it since we poll manually, but Suno requires a valid URL
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[SUNO callback]', JSON.stringify(body).slice(0, 300))
    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ received: true })
  }
}
