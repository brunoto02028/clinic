import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { fetchInboxEmails } from '@/lib/imap-client';

export const dynamic = 'force-dynamic';

// GET — List emails by folder, search, pagination
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['SUPERADMIN', 'ADMIN', 'THERAPIST'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder') || 'INBOX';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const skip = (page - 1) * limit;

    const where: any = { folder };
    if (folder === 'SPAM') where.isSpam = true;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { fromAddress: { contains: search, mode: 'insensitive' } },
        { fromName: { contains: search, mode: 'insensitive' } },
        { toAddress: { contains: search, mode: 'insensitive' } },
        { textBody: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [messages, total, unreadCount] = await Promise.all([
      (prisma as any).emailMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { patient: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
      (prisma as any).emailMessage.count({ where }),
      (prisma as any).emailMessage.count({ where: { folder: 'INBOX', isRead: false, isSpam: false } }),
    ]);

    // Folder counts
    const [inboxCount, sentCount, draftCount, spamCount, trashCount] = await Promise.all([
      (prisma as any).emailMessage.count({ where: { folder: 'INBOX', isSpam: false } }),
      (prisma as any).emailMessage.count({ where: { folder: 'SENT' } }),
      (prisma as any).emailMessage.count({ where: { folder: 'DRAFT' } }),
      (prisma as any).emailMessage.count({ where: { isSpam: true } }),
      (prisma as any).emailMessage.count({ where: { folder: 'TRASH' } }),
    ]);

    return NextResponse.json({
      messages,
      total,
      page,
      pages: Math.ceil(total / limit),
      unreadCount,
      folderCounts: { INBOX: inboxCount, SENT: sentCount, DRAFT: draftCount, SPAM: spamCount, TRASH: trashCount },
    });
  } catch (err: any) {
    console.error('[email] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — Compose & send email, or sync IMAP
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['SUPERADMIN', 'ADMIN', 'THERAPIST'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // ─── Compose & Send ───
    if (action === 'send') {
      const { to, subject, htmlBody, textBody, patientId, saveDraft } = body;
      if (!to || !subject) {
        return NextResponse.json({ error: 'to and subject are required' }, { status: 400 });
      }

      if (saveDraft) {
        const draft = await (prisma as any).emailMessage.create({
          data: {
            direction: 'OUTBOUND',
            folder: 'DRAFT',
            fromAddress: (session.user as any).email,
            fromName: `${(session.user as any).firstName || ''} ${(session.user as any).lastName || ''}`.trim() || 'Admin',
            toAddress: to,
            subject,
            htmlBody: htmlBody || null,
            textBody: textBody || null,
            isRead: true,
            patientId: patientId || null,
          },
        });
        return NextResponse.json({ success: true, draft });
      }

      // Send via SMTP
      const html = htmlBody || `<div style="font-family:sans-serif;white-space:pre-wrap;">${textBody || ''}</div>`;
      const result = await sendEmail({ to, subject, html });

      if (result.success) {
        // Log sent email
        await (prisma as any).emailMessage.create({
          data: {
            direction: 'OUTBOUND',
            folder: 'SENT',
            fromAddress: (session.user as any).email || 'admin@bpr.rehab',
            fromName: `${(session.user as any).firstName || ''} ${(session.user as any).lastName || ''}`.trim() || 'Admin',
            toAddress: to,
            subject,
            htmlBody: html,
            textBody: textBody || null,
            isRead: true,
            patientId: patientId || null,
            sentAt: new Date(),
            messageId: (result.data as any)?.messageId || null,
          },
        });
        return NextResponse.json({ success: true, message: `Email sent to ${to}` });
      } else {
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
      }
    }

    // ─── Sync IMAP Inbox ───
    if (action === 'sync') {
      const lastSync = await (prisma as any).emailMessage.findFirst({
        where: { direction: 'INBOUND' },
        orderBy: { receivedAt: 'desc' },
        select: { receivedAt: true },
      });

      const since = lastSync?.receivedAt
        ? new Date(new Date(lastSync.receivedAt).getTime() - 86400000) // 1 day overlap
        : undefined;

      const emails = await fetchInboxEmails(100, since);
      let imported = 0;

      for (const email of emails) {
        if (!email.messageId || !email.from) continue;

        // Skip if already exists
        const exists = await (prisma as any).emailMessage.findUnique({
          where: { messageId: email.messageId },
        });
        if (exists) continue;

        // Try to link to patient
        let patientId: string | null = null;
        try {
          const patient = await prisma.user.findUnique({
            where: { email: email.from },
            select: { id: true, role: true },
          });
          if (patient?.role === 'PATIENT') patientId = patient.id;
        } catch {}

        await (prisma as any).emailMessage.create({
          data: {
            messageId: email.messageId,
            direction: 'INBOUND',
            folder: 'INBOX',
            fromAddress: email.from,
            fromName: email.fromName || null,
            toAddress: email.to,
            subject: email.subject,
            textBody: email.textBody || null,
            htmlBody: email.htmlBody || null,
            isRead: false,
            isSpam: false,
            patientId,
            receivedAt: email.date,
          },
        });
        imported++;
      }

      return NextResponse.json({ success: true, imported, total: emails.length });
    }

    // ─── Permanent Delete ───
    if (action === 'permanentDelete') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      await (prisma as any).emailMessage.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action. Use: send, sync, permanentDelete' }, { status: 400 });
  } catch (err: any) {
    console.error('[email] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — Update email (mark read, star, spam, move folder)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['SUPERADMIN', 'ADMIN', 'THERAPIST'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ids, isRead, isStarred, isSpam, folder } = await req.json();

    // Bulk update
    if (ids?.length) {
      const updateData: any = {};
      if (isRead !== undefined) updateData.isRead = isRead;
      if (isStarred !== undefined) updateData.isStarred = isStarred;
      if (isSpam !== undefined) {
        updateData.isSpam = isSpam;
        updateData.folder = isSpam ? 'SPAM' : 'INBOX';
      }
      if (folder !== undefined) updateData.folder = folder;

      await (prisma as any).emailMessage.updateMany({
        where: { id: { in: ids } },
        data: updateData,
      });
      return NextResponse.json({ success: true, updated: ids.length });
    }

    if (!id) return NextResponse.json({ error: 'id or ids required' }, { status: 400 });

    const updateData: any = {};
    if (isRead !== undefined) updateData.isRead = isRead;
    if (isStarred !== undefined) updateData.isStarred = isStarred;
    if (isSpam !== undefined) {
      updateData.isSpam = isSpam;
      updateData.folder = isSpam ? 'SPAM' : 'INBOX';
    }
    if (folder !== undefined) updateData.folder = folder;

    await (prisma as any).emailMessage.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[email] PATCH error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — Delete email(s)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['SUPERADMIN', 'ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids')?.split(',');

    if (ids?.length) {
      await (prisma as any).emailMessage.updateMany({
        where: { id: { in: ids } },
        data: { folder: 'TRASH' },
      });
      return NextResponse.json({ success: true, deleted: ids.length });
    }

    if (id) {
      await (prisma as any).emailMessage.update({
        where: { id },
        data: { folder: 'TRASH' },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'id or ids required' }, { status: 400 });
  } catch (err: any) {
    console.error('[email] DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
