import { getConfigValue } from '@/lib/system-config';

// ─── IMAP Email Fetcher (Hostinger) ───

interface RawEmail {
  messageId: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  date: Date;
}

export async function fetchInboxEmails(limit = 50, since?: Date): Promise<RawEmail[]> {
  const host = (await getConfigValue('SMTP_HOST'))?.replace('smtp.', 'imap.') || 'imap.hostinger.com';
  const user = await getConfigValue('SMTP_USER');
  const pass = await getConfigValue('SMTP_PASS');

  if (!user || !pass) {
    console.warn('[IMAP] SMTP_USER or SMTP_PASS not configured');
    return [];
  }

  try {
    const imapSimple = await import('imap-simple');
    const { simpleParser } = await import('mailparser');

    const config = {
      imap: {
        user,
        password: pass,
        host,
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
      },
    };

    const connection = await imapSimple.connect(config);
    await connection.openBox('INBOX');

    const searchCriteria = since
      ? ['ALL', ['SINCE', since.toISOString().split('T')[0]]]
      : ['ALL'];

    const fetchOptions = {
      bodies: [''],
      markSeen: false,
      struct: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    // Take last N messages
    const recent = messages.slice(-limit);
    const emails: RawEmail[] = [];

    for (const msg of recent) {
      try {
        const rawBody = msg.parts.find((p: any) => p.which === '')?.body || '';
        const parsed = await simpleParser(rawBody);

        emails.push({
          messageId: parsed.messageId || `msg-${Date.now()}-${Math.random()}`,
          from: (parsed.from as any)?.value?.[0]?.address || '',
          fromName: (parsed.from as any)?.value?.[0]?.name || '',
          to: (parsed.to as any)?.value?.[0]?.address || user,
          subject: parsed.subject || '(no subject)',
          textBody: parsed.text || '',
          htmlBody: parsed.html || parsed.textAsHtml || '',
          date: parsed.date || new Date(),
        });
      } catch (parseErr) {
        console.warn('[IMAP] Failed to parse message:', parseErr);
      }
    }

    connection.end();
    return emails;
  } catch (err) {
    console.error('[IMAP] Connection error:', err);
    return [];
  }
}
