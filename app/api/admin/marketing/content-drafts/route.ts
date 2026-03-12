// app/api/admin/marketing/content-drafts/route.ts
// Save and load Content Intelligence drafts — stored as JSON files on disk
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

const getDraftsDir = () => {
  const base = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads')
  return path.join(base, 'content-drafts')
}

async function ensureDir() {
  await mkdir(getDraftsDir(), { recursive: true })
}

// GET — list all saved drafts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureDir()
    const dir = getDraftsDir()

    let files: string[] = []
    try {
      files = await readdir(dir)
    } catch {
      return NextResponse.json({ drafts: [] })
    }

    const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse()
    const drafts = await Promise.all(
      jsonFiles.slice(0, 50).map(async (filename) => {
        try {
          const raw = await readFile(path.join(dir, filename), 'utf-8')
          const data = JSON.parse(raw)
          return { ...data, filename }
        } catch {
          return null
        }
      })
    )

    return NextResponse.json({ drafts: drafts.filter(Boolean) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — save a new draft
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureDir()

    const body = await req.json()
    const { title, type, data } = body

    if (!title || !type || !data) {
      return NextResponse.json({ error: 'title, type, and data are required' }, { status: 400 })
    }

    const timestamp = Date.now()
    const safeTitle = title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 40)
    const filename = `${timestamp}-${type}-${safeTitle}.json`

    const draft = {
      id: `${timestamp}`,
      filename,
      title,
      type, // 'trending-idea' | 'calendar' | 'hook' | 'marketplace' | 'improved-content'
      data,
      savedAt: new Date().toISOString(),
    }

    await writeFile(path.join(getDraftsDir(), filename), JSON.stringify(draft, null, 2), 'utf-8')

    return NextResponse.json({ success: true, draft })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — remove a draft by filename
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { filename } = await req.json()
    if (!filename || filename.includes('..') || !filename.endsWith('.json')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    await unlink(path.join(getDraftsDir(), filename))
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
