// app/api/admin/marketing/health/route.ts
import { NextResponse } from 'next/server'
import { checkClaudeHealth } from '@/lib/claude'

export async function GET() {
  const status = await checkClaudeHealth()
  return NextResponse.json(status)
}
