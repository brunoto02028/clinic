import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET — list all tracks for this clinic
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    const user = session.user as any;
    const clinicId = user.clinicId;
    if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 400 });

    const tracks = await prisma.musicTrack.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ tracks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — save a new track
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    const user = session.user as any;
    const clinicId = user.clinicId;
    if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 400 });

    const body = await req.json();
    const { title, audioUrl, duration, type, style, topic, lyrics, source } = body;
    if (!audioUrl) return NextResponse.json({ error: 'audioUrl required' }, { status: 400 });

    const track = await prisma.musicTrack.create({
      data: {
        clinicId,
        createdById: user.id,
        title: title || 'Sem título',
        audioUrl,
        duration: duration ? Number(duration) : null,
        type: type || 'instrumental',
        style: style || null,
        topic: topic || null,
        lyrics: lyrics || null,
        source: source || 'suno',
      },
    });
    return NextResponse.json({ track });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — remove a track
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    const user = session.user as any;
    const clinicId = user.clinicId;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await prisma.musicTrack.deleteMany({ where: { id, clinicId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
