export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { publishReel } from '@/lib/instagram';
import { resolveClinicId } from '@/lib/resolve-clinic-id';

// POST /api/admin/social/publish-reel
// multipart/form-data: video (webm, e.g. from the Ken Burns exporter), caption
//
// Instagram's Reels API requires MP4 (H.264/AAC); the browser-side Ken Burns
// exporter can only produce webm via MediaRecorder. This route transcodes
// webm -> mp4 with ffmpeg (already installed in the production image for
// yt-dlp — see Dockerfile) before handing the video off to the Graph API,
// so "Publish as Reel" is a single click instead of download → convert →
// upload by hand on the phone.
export async function POST(req: NextRequest) {
  let tempWebmPath: string | null = null;
  let outputMp4Path: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPERADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clinicId = await resolveClinicId(session);
    if (!clinicId) return NextResponse.json({ error: 'No clinic context' }, { status: 400 });

    const igAccount = await prisma.socialAccount.findFirst({
      where: { clinicId, platform: 'INSTAGRAM', isActive: true },
    });
    if (!igAccount) {
      return NextResponse.json({
        error: 'No connected Instagram account. Connect it at Admin → Marketing → Instagram Connect.',
      }, { status: 400 });
    }

    const formData = await req.formData();
    const video = formData.get('video') as File | null;
    const caption = String(formData.get('caption') || '');
    if (!video) return NextResponse.json({ error: 'video is required' }, { status: 400 });
    if (!caption) return NextResponse.json({ error: 'caption is required' }, { status: 400 });

    const uploadsBase = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads');
    const socialDir = path.join(uploadsBase, 'social');
    await mkdir(socialDir, { recursive: true });

    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    tempWebmPath = path.join(socialDir, `.tmp-${ts}-${rand}.webm`);
    const outputFilename = `reel-${ts}-${rand}.mp4`;
    outputMp4Path = path.join(socialDir, outputFilename);

    const arrayBuffer = await video.arrayBuffer();
    await writeFile(tempWebmPath, new Uint8Array(arrayBuffer));

    // Transcode webm -> mp4 (H.264/AAC), the format Instagram's Reels API
    // expects. The Ken Burns exporter records video-only (no microphone
    // input), so there's no audio track to carry over.
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempWebmPath as string)
        .videoCodec('libx264')
        .outputOptions(['-pix_fmt yuv420p', '-movflags +faststart', '-an'])
        .on('error', reject)
        .on('end', () => resolve())
        .save(outputMp4Path as string);
    });

    const BASE = process.env.NEXTAUTH_URL || 'https://bpr.rehab';
    const videoUrl = `${BASE}/uploads/social/${outputFilename}`;

    const result = await publishReel({
      igAccountId: igAccount.accountId,
      accessToken: igAccount.accessToken,
      videoUrl,
      caption,
    });

    await prisma.socialPost.create({
      data: {
        clinicId,
        accountId: igAccount.id,
        caption,
        postType: 'REEL',
        mediaUrls: [videoUrl],
        mediaPaths: [],
        status: 'PUBLISHED',
        publishedAt: new Date(),
        platformPostId: result.id,
        createdById: (session.user as any).id,
      },
    }).catch((err) => console.error('[publish-reel] Failed to save SocialPost record:', err));

    return NextResponse.json({ success: true, mediaId: result.id, permalink: result.permalink, videoUrl });
  } catch (error: any) {
    console.error('[publish-reel] error:', error?.message);
    return NextResponse.json({ error: error?.message || 'Failed to publish Reel' }, { status: 500 });
  } finally {
    if (tempWebmPath) await unlink(tempWebmPath).catch(() => {});
  }
}
