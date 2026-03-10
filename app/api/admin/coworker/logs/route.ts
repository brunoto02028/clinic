// app/api/admin/coworker/logs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'

// GET — fetch execution logs
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId') || undefined
  const type = searchParams.get('type') || undefined
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    const logs = await prisma.coWorkerLog.findMany({
      where: {
        ...(taskId ? { taskId } : {}),
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      include: {
        task: { select: { name: true, type: true } },
      },
    })

    return NextResponse.json({ logs })
  } catch {
    return NextResponse.json({ logs: [] })
  }
}
