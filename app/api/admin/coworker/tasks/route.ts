// app/api/admin/coworker/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { getTaskTemplates, suggestTasks, createTaskFromChat } from '@/lib/ai-coworker'

// GET — list tasks + templates
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'templates') {
    return NextResponse.json({ templates: getTaskTemplates() })
  }

  if (action === 'suggest') {
    try {
      const result = await suggestTasks()
      return NextResponse.json({ suggestions: result.suggestions, durationMs: result.durationMs })
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to suggest tasks' }, { status: 500 })
    }
  }

  if (action === 'create-from-chat') {
    const message = searchParams.get('message')
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })
    try {
      const result = await createTaskFromChat(message)
      if (result.task) {
        const task = await prisma.coWorkerTask.create({
          data: {
            name: result.task.name,
            description: result.task.description || null,
            type: result.task.type,
            prompt: result.task.prompt,
            schedule: result.task.schedule || null,
            isActive: true,
            requiresApproval: result.task.requiresApproval,
            createdById: (session.user as any).id,
          },
        })
        return NextResponse.json({ success: true, task, reply: result.reply, durationMs: result.durationMs })
      }
      return NextResponse.json({ success: false, reply: result.reply, durationMs: result.durationMs })
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
    }
  }

  try {
    const tasks = await prisma.coWorkerTask.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { logs: true } },
      },
    })

    return NextResponse.json({ tasks })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch tasks', tasks: [] }, { status: 500 })
  }
}

// POST — create task
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, description, type, prompt, schedule, isActive, requiresApproval, config } = body

    if (!name || !type || !prompt) {
      return NextResponse.json({ error: 'Name, type, and prompt are required' }, { status: 400 })
    }

    const task = await prisma.coWorkerTask.create({
      data: {
        name,
        description: description || null,
        type,
        prompt,
        schedule: schedule || null,
        isActive: isActive !== false,
        requiresApproval: requiresApproval || false,
        config: config || undefined,
        createdById: (session.user as any).id,
      },
    })

    return NextResponse.json({ success: true, task })
  } catch (err) {
    console.error('Create task error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create task' },
      { status: 500 }
    )
  }
}

// PUT — update task
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
    }

    const task = await prisma.coWorkerTask.update({
      where: { id },
      data: updates,
    })

    return NextResponse.json({ success: true, task })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

// DELETE — remove task
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 })

  try {
    await prisma.coWorkerLog.deleteMany({ where: { taskId: id } })
    await prisma.coWorkerTask.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
