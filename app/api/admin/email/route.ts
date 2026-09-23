import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { fetchInboxEmails } from '@/lib/imap-client';
import { sessionClinicId } from '@/lib/session-clinic';

export const dynamic = 'force-dynamic';

// Every handler below starts here. Nothing in this route used to filter by
// clinic at all — any signed-in staff member (any clinic) could list,
// approve/send, discard, or delete another clinic's financial emails
// (found via a patient invoice, activity 71). `sessionClinicId` never falls
// back to "whichever clinic comes first", so a session that can't resolve
// one is refused rather than handed someone else's tenant.
async function requireClinic(session: any): Promise<{ clinicId: string } | { response: NextResponse }> {
  if (!session?.user || !['SUPERADMIN', 'ADMIN', 'THERAPIST'].includes((session.user as any).role)) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const clinicId = await sessionClinicId(session);
  if (!clinicId) {
    return { response: NextResponse.json({ error: 'No clinic resolved for this account' }, { status: 403 }) };
  }
  return { clinicId };
}

// GET — List emails by folder, search, pagination
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const guard = await requireClinic(session);
    if ('response' in guard) return guard.response;
    const { clinicId } = guard;

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder') || 'INBOX';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const skip = (page - 1) * limit;

    const where: any = { folder, clinicId };
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
      (prisma as any).emailMessage.count({ where: { folder: 'INBOX', isRead: false, isSpam: false, clinicId } }),
    ]);

    // Folder counts
    const [inboxCount, sentCount, draftCount, spamCount, trashCount, pendingApprovalCount] = await Promise.all([
      (prisma as any).emailMessage.count({ where: { folder: 'INBOX', isSpam: false, clinicId } }),
      (prisma as any).emailMessage.count({ where: { folder: 'SENT', clinicId } }),
      (prisma as any).emailMessage.count({ where: { folder: 'DRAFT', clinicId } }),
      (prisma as any).emailMessage.count({ where: { isSpam: true, clinicId } }),
      (prisma as any).emailMessage.count({ where: { folder: 'TRASH', clinicId } }),
      (prisma as any).emailMessage.count({ where: { folder: 'PENDING_APPROVAL', clinicId } }),
    ]);

    return NextResponse.json({
      messages,
      total,
      page,
      pages: Math.ceil(total / limit),
      unreadCount,
      folderCounts: { INBOX: inboxCount, SENT: sentCount, DRAFT: draftCount, SPAM: spamCount, TRASH: trashCount, PENDING_APPROVAL: pendingApprovalCount },
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
    const guard = await requireClinic(session);
    if ('response' in guard) return guard.response;
    const { clinicId } = guard;
    const user = session!.user as any; // requireClinic already refused a sessionless request

    const body = await req.json();
    const { action } = body;

    // ─── Compose & Send ───
    if (action === 'send') {
      const { to, subject, htmlBody, textBody, patientId, saveDraft } = body;
      if (!to || !subject) {
        return NextResponse.json({ error: 'to and subject are required' }, { status: 400 });
      }
      // A patientId is a link into another tenant's records if not checked —
      // same rule as every other route that accepts one as a foreign key.
      if (patientId) {
        const patient = await prisma.user.findFirst({ where: { id: patientId, clinicId }, select: { id: true } });
        if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      if (saveDraft) {
        const draft = await (prisma as any).emailMessage.create({
          data: {
            direction: 'OUTBOUND',
            folder: 'DRAFT',
            fromAddress: user.email,
            fromName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin',
            toAddress: to,
            subject,
            htmlBody: htmlBody || null,
            textBody: textBody || null,
            isRead: true,
            patientId: patientId || null,
            clinicId,
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
            fromAddress: user.email || 'admin@bpr.clinic',
            fromName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin',
            toAddress: to,
            subject,
            htmlBody: html,
            textBody: textBody || null,
            isRead: true,
            patientId: patientId || null,
            clinicId,
            sentAt: new Date(),
            messageId: (result.data as any)?.id || null,
          },
        });
        return NextResponse.json({ success: true, message: `Email sent to ${to}` });
      } else {
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
      }
    }

    // ─── Sync IMAP Inbox ───
    // The mailbox itself is shared infrastructure (one set of IMAP
    // credentials), but every row it produces belongs to the syncing staff
    // member's own clinic from here on, same as every other action in this
    // route — a second clinic syncing the same shared inbox never sees or
    // touches what the first clinic already imported.
    if (action === 'sync') {
      const lastSync = await (prisma as any).emailMessage.findFirst({
        where: { direction: 'INBOUND', clinicId },
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

        // Try to link to patient — only one of this clinic's own, so an
        // inbound message never gets attached to another tenant's record.
        let patientId: string | null = null;
        try {
          const patient = await prisma.user.findUnique({
            where: { email: email.from },
            select: { id: true, role: true, clinicId: true },
          });
          if (patient?.role === 'PATIENT' && patient.clinicId === clinicId) patientId = patient.id;
        } catch {}

        await (prisma as any).emailMessage.create({
          data: {
            messageId: email.messageId,
            direction: 'INBOUND',
            folder: 'INBOX',
            clinicId,
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
      const deleted = await (prisma as any).emailMessage.deleteMany({ where: { id, clinicId } });
      if (deleted.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    // ─── Approve & Send a pending financial email (activity 39) ───
    // The content/attachments were frozen when the pending item was created,
    // so this sends exactly what the admin previewed — not whatever the
    // underlying appointment/price looks like now.
    if (action === 'approveSend') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

      const pending = await (prisma as any).emailMessage.findFirst({ where: { id, clinicId } });
      if (!pending || pending.folder !== 'PENDING_APPROVAL') {
        return NextResponse.json({ error: 'No pending item with this id' }, { status: 404 });
      }

      // Claim it atomically before sending — a conditional update (only
      // succeeds if folder is still PENDING_APPROVAL) closes the race where
      // two near-simultaneous approveSend calls both pass the check above
      // and both send. Only the request that actually flips the folder
      // proceeds; the loser gets 409 without ever calling sendEmail. The
      // clinicId in the same where is what stops another clinic's staff
      // from ever reaching this claim in the first place, not just the
      // findFirst check above (activity 71).
      const claim = await (prisma as any).emailMessage.updateMany({
        where: { id, folder: 'PENDING_APPROVAL', clinicId },
        data: { folder: 'SENT', sentAt: new Date() },
      });
      if (claim.count === 0) {
        return NextResponse.json({ error: 'Already sent or discarded' }, { status: 409 });
      }

      let attachments: { filename: string; content: Buffer }[] | undefined;
      if (pending.attachmentsJson) {
        const parsed = JSON.parse(pending.attachmentsJson) as { filename: string; contentBase64: string }[];
        attachments = parsed.map((a) => ({ filename: a.filename, content: Buffer.from(a.contentBase64, 'base64') }));
      }

      const sendResult = await sendEmail({
        to: pending.toAddress,
        subject: pending.subject,
        html: pending.htmlBody || '',
        from: pending.fromName ? `${pending.fromName} <${pending.fromAddress}>` : pending.fromAddress,
        attachments,
      });

      if (!sendResult.success) {
        // Revert the claim so the admin can see it's still pending and retry.
        await (prisma as any).emailMessage.update({ where: { id }, data: { folder: 'PENDING_APPROVAL', sentAt: null } });
        return NextResponse.json({ error: `Failed to send: ${sendResult.error}` }, { status: 502 });
      }

      const sent = await (prisma as any).emailMessage.update({
        where: { id },
        data: { messageId: (sendResult.data as any)?.id || null },
      });

      // Activity 072 — reflect the send on the structured invoice, but only
      // while it's still DRAFT: a resend of an already-PAID or VOID invoice
      // (PDF was wrong, sending again) must never regress its real status
      // back to SENT.
      if (pending.patientInvoiceId) {
        await (prisma as any).patientInvoice.updateMany({
          where: { id: pending.patientInvoiceId, status: 'DRAFT' },
          data: { status: 'SENT' },
        });
      }

      return NextResponse.json({ success: true, message: sent });
    }

    // ─── Discard a pending financial email without sending it ───
    if (action === 'discard') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

      const pending = await (prisma as any).emailMessage.findFirst({ where: { id, clinicId } });
      if (!pending || pending.folder !== 'PENDING_APPROVAL') {
        return NextResponse.json({ error: 'No pending item with this id' }, { status: 404 });
      }

      await (prisma as any).emailMessage.updateMany({ where: { id, clinicId }, data: { folder: 'TRASH' } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action. Use: send, sync, permanentDelete, approveSend, discard' }, { status: 400 });
  } catch (err: any) {
    console.error('[email] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — Update email (mark read, star, spam, move folder)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const guard = await requireClinic(session);
    if ('response' in guard) return guard.response;
    const { clinicId } = guard;

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

      const updated = await (prisma as any).emailMessage.updateMany({
        where: { id: { in: ids }, clinicId },
        data: updateData,
      });
      return NextResponse.json({ success: true, updated: updated.count });
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

    const updated = await (prisma as any).emailMessage.updateMany({ where: { id, clinicId }, data: updateData });
    if (updated.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
    const clinicId = await sessionClinicId(session);
    if (!clinicId) return NextResponse.json({ error: 'No clinic resolved for this account' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids')?.split(',');

    if (ids?.length) {
      const deleted = await (prisma as any).emailMessage.updateMany({
        where: { id: { in: ids }, clinicId },
        data: { folder: 'TRASH' },
      });
      return NextResponse.json({ success: true, deleted: deleted.count });
    }

    if (id) {
      const deleted = await (prisma as any).emailMessage.updateMany({
        where: { id, clinicId },
        data: { folder: 'TRASH' },
      });
      if (deleted.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'id or ids required' }, { status: 400 });
  } catch (err: any) {
    console.error('[email] DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
