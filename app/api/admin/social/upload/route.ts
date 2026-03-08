import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// POST /api/admin/social/upload - Upload media for social posts
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'social');
    await mkdir(uploadsDir, { recursive: true });

    const uploaded: { url: string; filename: string; size: number }[] = [];

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
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
