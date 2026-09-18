import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getSessionStaffActor } from '@/lib/tenant-access';

export const dynamic = 'force-dynamic';

// Only media a social post can carry, checked by extension AND declared type,
// with a size cap (activity 52, T-9). It used to take any file from any
// session — an .svg with a <script> served from our own origin is stored XSS.
const ALLOWED: Record<string, { mime: string[]; maxBytes: number }> = {
  jpg: { mime: ['image/jpeg'], maxBytes: 10 * 1024 * 1024 },
  jpeg: { mime: ['image/jpeg'], maxBytes: 10 * 1024 * 1024 },
  png: { mime: ['image/png'], maxBytes: 10 * 1024 * 1024 },
  webp: { mime: ['image/webp'], maxBytes: 10 * 1024 * 1024 },
  gif: { mime: ['image/gif'], maxBytes: 10 * 1024 * 1024 },
  mp4: { mime: ['video/mp4'], maxBytes: 200 * 1024 * 1024 },
  mov: { mime: ['video/quicktime'], maxBytes: 200 * 1024 * 1024 },
  webm: { mime: ['video/webm'], maxBytes: 200 * 1024 * 1024 },
};

// POST /api/admin/social/upload - Upload media for social posts
export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionStaffActor(req);
    if (!actor || actor.role === 'THERAPIST') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate everything before writing anything.
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const rule = ALLOWED[ext];
      if (!rule || !rule.mime.includes(file.type)) {
        return NextResponse.json({ error: `File type not allowed: ${file.name}` }, { status: 400 });
      }
      if (file.size > rule.maxBytes) {
        return NextResponse.json({ error: `File too large: ${file.name}` }, { status: 413 });
      }
    }

    const uploadsBase = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads');
    const uploadsDir = path.join(uploadsBase, 'social');
    await mkdir(uploadsDir, { recursive: true });

    const uploaded: { url: string; filename: string; size: number }[] = [];

    for (const file of files) {
      const ext = file.name.split('.').pop()!.toLowerCase();
      const ts = Date.now();
      const rand = Math.random().toString(36).slice(2, 8);
      const filename = `${ts}-${rand}.${ext}`;
      const filePath = path.join(uploadsDir, filename);

      const arrayBuffer = await file.arrayBuffer();
      await writeFile(filePath, new Uint8Array(arrayBuffer));

      uploaded.push({
        url: `/uploads/social/${filename}`,
        filename,
        size: file.size,
      });
    }

    return NextResponse.json({ files: uploaded });
  } catch (error: any) {
    console.error('[SOCIAL UPLOAD] error:', error?.message);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
