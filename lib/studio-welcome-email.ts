// Welcome e-mail for a personal-trainer studio's owner (activity 56). The
// studio is its own product, so this is the studio's e-mail — not the
// clinic's "Welcome to the Team" staff e-mail, which names BPR and lists
// clinical permissions. Built standalone rather than on wrapInLayout: for a
// studio with no logo that layout falls back to BPR's logo and "patient portal".

const BONE = "#F5F4F1";
const INK = "#1F2421";
const MUTED = "#6B7280";
const LINE = "#E4E3DF";
const MOSS = "#4F7361";
const SENDER_ADDRESS = "noreply@bpr.clinic";
/** Stands in for the real temporary password in previews. */
export const MASKED_PASSWORD = "St-••••••••••••••";

// Local, like lib/book.ts — keeps this a pure module (the shared one pulls in prisma).
function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface StudioWelcomeInput {
  studioName: string;
  slug: string;
  firstName: string;
  email: string;
  tempPassword: string;
  isPt: boolean;
  appUrl: string;
  primaryColor?: string | null;
  /** BPR's header logo (getBprEmailLogoUrl) — nothing BPR sends goes out without it. */
  logoUrl: string;
}

export function studioWelcomeEmail(input: StudioWelcomeInput): { subject: string; html: string; from: string } {
  const { isPt } = input;
  const plainStudio = input.studioName.replace(/[\r\n]+/g, " ").trim();
  const studio = escapeHtml(input.studioName);
  const name = escapeHtml(input.firstName);
  const email = escapeHtml(input.email);
  const password = escapeHtml(input.tempPassword);
  const base = input.appUrl.replace(/\/+$/, "");
  const loginUrl = `${base}/staff-login`;
  const joinUrl = `${base}/join/${encodeURIComponent(input.slug)}`;
  // The studio's colour lands in style attributes — only a plain hex gets in.
  const accent = /^#[0-9a-fA-F]{6}$/.test(input.primaryColor || "") ? (input.primaryColor as string) : MOSS;

  const t = isPt
    ? {
        subject: `Seu estúdio ${plainStudio} está pronto`,
        preheader: "Seu acesso, o link para os seus alunos e os primeiros passos.",
        hello: `Olá, ${name}!`,
        intro: `Seu estúdio <strong>${studio}</strong> está pronto na BPR. Aqui você monta treinos, acompanha seus alunos e recebe os agendamentos deles.`,
        access: "Seu acesso",
        emailLabel: "E-mail",
        passwordLabel: "Senha temporária",
        open: "Abrir meu estúdio",
        joinTitle: "Link para os seus alunos",
        joinText: "Compartilhe este link. Cada aluno cria a conta dele e já entra no seu estúdio:",
        stepsTitle: "Primeiros passos",
        steps: [
          "<strong>Troque a senha</strong> em My Account logo no primeiro acesso.",
          "<strong>Cadastre seus exercícios</strong> na biblioteca. O vídeo é opcional e pode entrar depois; a IA de treino usa só os que têm vídeo.",
          "<strong>Convide seus alunos</strong> com o link acima, monte os treinos e atribua a cada um.",
          "<strong>Deixe com a sua cara:</strong> logo e cores em Studio Branding (opcional).",
        ],
        footer: "Powered by BPR",
        noReply: "Mensagem automática — não responda a este e-mail. Dúvidas: admin@bpr.clinic",
      }
    : {
        subject: `Your studio ${plainStudio} is ready`,
        preheader: "Your sign-in, your students' link and your first steps.",
        hello: `Hi ${name},`,
        intro: `Your studio <strong>${studio}</strong> is ready on BPR. This is where you build workouts, follow your students and take their bookings.`,
        access: "Your sign-in",
        emailLabel: "Email",
        passwordLabel: "Temporary password",
        open: "Open my studio",
        joinTitle: "Your students' link",
        joinText: "Share this link. Each student creates their account and lands straight in your studio:",
        stepsTitle: "First steps",
        steps: [
          "<strong>Change your password</strong> in My Account the first time you sign in.",
          "<strong>Add your exercises</strong> to your library. Videos are optional and can come later; the AI workout builder only uses the ones with a video.",
          "<strong>Invite your students</strong> with the link above, then build their workouts and assign them.",
          "<strong>Make it yours:</strong> logo and colours in Studio Branding (optional).",
        ],
        footer: "Powered by BPR",
        noReply: "Automated message — please don't reply. Questions: admin@bpr.clinic",
      };

  const steps = t.steps
    .map(
      (s, i) => `<tr>
        <td valign="top" style="padding:0 12px 14px 0;width:28px;">
          <div style="width:26px;height:26px;border-radius:13px;background-color:${accent};color:#ffffff;font-size:13px;font-weight:bold;line-height:26px;text-align:center;">${i + 1}</div>
        </td>
        <td valign="top" style="padding:3px 0 14px;font-size:15px;line-height:1.5;color:${INK};">${s}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="${isPt ? "pt" : "en"}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;color:#fff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${t.preheader}</span>
</head>
<body style="margin:0;padding:0;background-color:${BONE};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BONE}" style="background-color:${BONE};">
<tr><td align="center" style="padding:30px 15px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;">
  <tr><td bgcolor="${BONE}" style="background-color:${BONE};padding:28px 32px 22px;text-align:center;border-bottom:3px solid ${accent};">
    <img src="${escapeHtml(input.logoUrl)}" alt="BPR" style="max-height:72px;max-width:260px;display:block;margin:0 auto 14px;background-color:${BONE};" />
    <div style="font-size:24px;font-weight:bold;color:${INK};letter-spacing:-0.3px;">${studio}</div>
  </td></tr>
  <tr><td style="padding:32px 32px 8px;">
    <h1 style="margin:0 0 12px;font-size:22px;color:${INK};">${t.hello}</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${INK};">${t.intro}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-left:4px solid ${accent};border-radius:10px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;color:${MUTED};">${t.access}</p>
        <p style="margin:0 0 6px;font-size:15px;color:${INK};"><strong>${t.emailLabel}:</strong> ${email}</p>
        <p style="margin:0;font-size:15px;color:${INK};"><strong>${t.passwordLabel}:</strong> <span style="font-family:Consolas,Menlo,monospace;background-color:${BONE};padding:2px 6px;border-radius:4px;white-space:nowrap;">${password}</span></p>
      </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0 28px;">
      <a href="${loginUrl}" style="background-color:${accent};color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">${t.open}</a>
    </td></tr></table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BONE}" style="background-color:${BONE};border-radius:10px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 6px;font-size:15px;font-weight:bold;color:${INK};">${t.joinTitle}</p>
        <p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:${MUTED};">${t.joinText}</p>
        <p style="margin:0;font-size:15px;word-break:break-all;"><a href="${joinUrl}" style="color:${accent};font-weight:bold;">${joinUrl}</a></p>
      </td></tr>
    </table>

    <h2 style="margin:28px 0 14px;font-size:17px;color:${INK};">${t.stepsTitle}</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${steps}</table>
  </td></tr>
  <tr><td style="padding:20px 32px 26px;border-top:1px solid ${LINE};text-align:center;">
    <p style="margin:0 0 6px;font-size:12px;font-weight:bold;color:${MUTED};">${t.footer}</p>
    <p style="margin:0;font-size:11px;color:#9CA3AF;">${t.noReply}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  // Display names can't carry quotes or angle brackets unescaped in a From header.
  const senderName = `${plainStudio.replace(/["<>\\\r\n]/g, "").trim() || "Your studio"} via BPR`;
  return { subject: t.subject, html, from: `"${senderName}" <${SENDER_ADDRESS}>` };
}
