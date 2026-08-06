// One-off script: creates two DRAFT marketing campaigns announcing the
// "Beyond Pain" book to ALL subscribed contacts — one in English, one in
// Portuguese — so Bruno can review/edit in Admin → Email Marketing →
// Campaigns before choosing which to send (and to whom).
//
// Both campaigns target sendToAll: true. Nothing is sent by this script —
// it only creates DRAFT rows. Sending still requires the normal
// prepare → dispatch flow in the admin UI (or its API), same as any other
// campaign.
//
// Run with: node scripts/create-book-marketing-campaign.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const BRAND_PRIMARY = "#4F7361";

const enBody = `
<h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Something is coming.</h2>
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi {{recipientName}},</p>
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">For months now, in every spare hour between patients, I've been writing something I've wanted to write for years: <strong>Beyond Pain</strong> — a book about what pain really is, and why healing it takes more than fixing tissue.</p>
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">It isn't finished yet. But I wanted you to be one of the first to know it's on its way — and to give you something in the meantime that costs nothing, but I hope is worth your time.</p>

<div style="background:${"#EDF3EF"};border:1px solid #CFE0D6;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
  <p style="margin:0 0 10px;font-weight:700;color:#20242D;font-size:15px;">Two workmen. Two identical nails through the foot. Two completely different outcomes.</p>
  <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;">That's how Chapter One opens — and it's the thread running through everything the book tries to say about pain, the body, and the parts of us that tissue damage alone can never fully explain.</p>
</div>

<div style="text-align:center;margin:28px 0;">
  <a href="https://bpr.rehab/beyond-pain" style="display:inline-block;background-color:${BRAND_PRIMARY};color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Read Chapter One free →</a>
</div>

<h3 style="color:#20242D;font-size:16px;margin:0 0 10px;">What Beyond Pain is about</h3>
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">Pain is rarely only physical. It speaks the language of the body, the mind and the spirit — and lasting healing has to meet all three. Drawing on the real science of how pain works, alongside a faith that takes the whole person seriously, the book is being written now, chapter by chapter, in front of anyone who wants to follow along.</p>

<h3 style="color:#20242D;font-size:16px;margin:0 0 10px;">When does it launch?</h3>
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 8px;">Soon — I'm not going to rush it just to hit a date. What I can promise: subscribers are the first to read every new chapter as it's finished, and the first to know the moment the full book launches, with early-reader pricing as a thank-you for following the journey this far.</p>
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 24px;"><a href="https://bpr.rehab/beyond-pain/chapters" style="color:${BRAND_PRIMARY};">See the full table of contents →</a></p>

<hr style="border:none;border-top:1px solid #E4E3DF;margin:24px 0;" />
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 8px;">Thank you for being here — for your recovery, and now for this too.</p>
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">Bruno</p>
<hr style="border:none;border-top:1px solid #E4E3DF;margin:24px 0;" />
<p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;"><a href="{{unsubscribeUrl}}" style="color:#9ca3af;">Unsubscribe</a></p>`;

const ptBody = `
<h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Algo está a chegar.</h2>
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Olá {{recipientName}},</p>
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Há meses que, em cada hora livre entre pacientes, tenho escrito algo que quero escrever há anos: <strong>Além da Dor</strong> — um livro sobre o que a dor realmente é, e por que curá-la exige mais do que reparar tecido.</p>
<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">Ainda não está pronto. Mas quis que fosse um dos primeiros a saber que está a caminho — e deixar-lhe, entretanto, algo que não custa nada, mas que espero que valha o seu tempo.</p>

<div style="background:${"#EDF3EF"};border:1px solid #CFE0D6;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
  <p style="margin:0 0 10px;font-weight:700;color:#20242D;font-size:15px;">Dois operários. Dois pregos idênticos atravessando o pé. Dois desfechos completamente diferentes.</p>
  <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;">É assim que o Capítulo Um começa — e é o fio que percorre tudo o que o livro tenta dizer sobre a dor, o corpo, e as partes de nós que o dano nos tecidos, por si só, nunca consegue explicar por completo.</p>
</div>

<div style="text-align:center;margin:28px 0;">
  <a href="https://bpr.rehab/beyond-pain" style="display:inline-block;background-color:${BRAND_PRIMARY};color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Leia o Capítulo Um grátis →</a>
</div>

<h3 style="color:#20242D;font-size:16px;margin:0 0 10px;">Sobre o que é Além da Dor</h3>
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">A dor raramente é apenas física. Ela fala a língua do corpo, da mente e do espírito — e a cura duradoura precisa alcançar os três. Baseado na ciência real de como a dor funciona, ao lado de uma fé que leva a pessoa inteira a sério, o livro está sendo escrito agora, capítulo por capítulo, diante de quem quiser acompanhar.</p>

<h3 style="color:#20242D;font-size:16px;margin:0 0 10px;">Quando será lançado?</h3>
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 8px;">Em breve — não vou apressá-lo só para cumprir uma data. O que posso prometer: os inscritos são os primeiros a ler cada novo capítulo à medida que é concluído, e os primeiros a saber no momento em que o livro completo for lançado, com um preço especial de leitor antecipado como agradecimento por acompanhar a jornada até aqui.</p>
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 24px;"><a href="https://bpr.rehab/beyond-pain/chapters" style="color:${BRAND_PRIMARY};">Ver o índice completo →</a></p>

<hr style="border:none;border-top:1px solid #E4E3DF;margin:24px 0;" />
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 8px;">Obrigado por estar aqui — pela sua recuperação, e agora também por isto.</p>
<p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">Bruno</p>
<hr style="border:none;border-top:1px solid #E4E3DF;margin:24px 0;" />
<p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;"><a href="{{unsubscribeUrl}}" style="color:#9ca3af;">Cancelar subscrição</a></p>`;

async function main() {
  const en = await prisma.emailCampaign.create({
    data: {
      name: "Beyond Pain — Launch Announcement (EN)",
      subject: "The book that's coming — and the door that's already open \ud83d\udcd6",
      preheader: "Beyond Pain isn't out yet. But Chapter One already is — free.",
      htmlBody: enBody,
      fromName: "Bruno Physical Rehabilitation",
      fromEmail: "noreply@bpr.rehab",
      replyTo: "admin@bpr.rehab",
      sendToAll: true,
      status: "DRAFT",
    },
  });
  console.log("Created EN draft campaign:", en.id, "-", en.name);

  const pt = await prisma.emailCampaign.create({
    data: {
      name: "Beyond Pain — Launch Announcement (PT)",
      subject: "O livro que está a chegar — e a porta que já está aberta \ud83d\udcd6",
      preheader: "Além da Dor ainda não saiu. Mas o Capítulo Um já está disponível — grátis.",
      htmlBody: ptBody,
      fromName: "Bruno Physical Rehabilitation",
      fromEmail: "noreply@bpr.rehab",
      replyTo: "admin@bpr.rehab",
      sendToAll: true,
      status: "DRAFT",
    },
  });
  console.log("Created PT draft campaign:", pt.id, "-", pt.name);

  console.log("\nBoth are DRAFT — nothing was sent. Review/edit in Admin \u2192 Email Marketing \u2192 Campaigns, then Prepare + Dispatch when ready.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
