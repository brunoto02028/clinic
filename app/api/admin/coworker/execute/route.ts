// app/api/admin/coworker/execute/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { executeTask } from '@/lib/ai-coworker'

// POST — execute a task manually
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { taskId } = body

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
    }

    const task = await prisma.coWorkerTask.findUnique({ where: { id: taskId } })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const result = await executeTask({
      taskId: task.id,
      taskType: task.type,
      prompt: task.prompt,
      config: (task.config as Record<string, unknown>) || undefined,
    })

    return NextResponse.json({
      success: result.success,
      output: result.output,
      action: result.action,
      data: result.data,
      durationMs: result.durationMs,
    })

  } catch (error) {
    console.error('Execute task error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Execution failed' },
      { status: 500 }
    )
  }
}
