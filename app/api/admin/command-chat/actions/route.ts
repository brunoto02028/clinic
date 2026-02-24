import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { callAI, generateImage as aiGenerateImage } from "@/lib/ai-provider";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// ─── POST — Execute an action from the Command Center ───
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, params } = await req.json();
    if (!type) {
      return NextResponse.json({ error: "Action type required" }, { status: 400 });
    }

    const clinicId = (session.user as any).clinicId;
    const userId = (session.user as any).id;

    switch (type) {
      case "generate_pdf":
        return await generatePDF(params);
      case "generate_pptx":
        return await generatePPTX(params);
      case "export_csv":
        return await exportCSV(params, clinicId);
      case "create_article":
        return await createArticle(params, clinicId, userId);
      case "generate_image":
        return await generateImageAction(params);
      case "send_email":
        return await sendEmailAction(params);
      case "instagram_post":
        return await instagramPostAction(params, clinicId);
      case "send_whatsapp":
        return await sendWhatsAppAction(params);
      case "marketing_campaign":
        return await marketingCampaignAction(params, clinicId);
      case "patient_reengagement":
        return await patientReengagementAction(params, clinicId);
      case "seo_content_plan":
        return await seoContentPlanAction(params);
      case "social_calendar":
        return await socialCalendarAction(params, clinicId);
      case "full_report":
        return await fullReportAction(params, clinicId);
      case "business_valuation":
        return await businessValuationAction(params, clinicId);
      default:
        return NextResponse.json({ error: `Unknown action type: ${type}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[command-actions] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PDF Generation ───
async function generatePDF(params: { title?: string; sections?: { heading: string; content: string }[] }) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const usableWidth = pageWidth - margin * 2;
  let y = 25;

  // Header bar
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("BRUNO PHYSICAL REHABILITATION", margin, 11);
  doc.setFontSize(7);
  doc.text("bpr.rehab | Command Center Report", pageWidth - margin, 11, { align: "right" });

  // Title
  y = 30;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  const title = params.title || "Report";
  doc.text(title, margin, y);
  y += 4;

  // Date line
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")} at ${new Date().toLocaleTimeString("en-GB")}`, margin, y + 5);
  y += 12;

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Sections
  const sections = params.sections || [];
  for (const section of sections) {
    // Check if we need a new page
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    // Section heading
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(section.heading, margin, y);
    y += 7;

    // Section content
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);

    const lines = doc.splitTextToSize(section.content, usableWidth);
    for (const line of lines) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 5;
    }
    y += 5;
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${totalPages} | Bruno Physical Rehabilitation | Confidential`,
      pageWidth / 2,
      290,
      { align: "center" }
    );
  }

  const buffer = Buffer.from(doc.output("arraybuffer"));
  const slug = (params.title || "report").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  const filename = `bpr-${slug}-${Date.now().toString(36)}.pdf`;

  // Save to uploads
  const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  const dir = path.join(baseUploadsDir, "exports");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), new Uint8Array(buffer));

  return NextResponse.json({ fileUrl: `/uploads/exports/${filename}`, filename, type: "pdf" });
}

// ─── PowerPoint Generation ───
async function generatePPTX(params: { title?: string; slides?: { title: string; bullets?: string[]; notes?: string }[] }) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();

  pptx.author = "BPR Command Center";
  pptx.company = "Bruno Physical Rehabilitation";
  pptx.title = params.title || "Presentation";
  pptx.layout = "LAYOUT_WIDE";

  // Color scheme
  const PRIMARY = "1E293B";    // slate-800
  const ACCENT = "10B981";     // emerald-500
  const TEXT_LIGHT = "F8FAFC";
  const TEXT_DARK = "334155";
  const SUBTLE = "94A3B8";

  // ─── Title Slide ───
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: PRIMARY };
  titleSlide.addText("BRUNO PHYSICAL REHABILITATION", {
    x: 0.8, y: 0.5, w: "80%", fontSize: 12, color: ACCENT,
    fontFace: "Arial", bold: true,
  });
  titleSlide.addText(params.title || "Presentation", {
    x: 0.8, y: 1.8, w: "80%", fontSize: 36, color: TEXT_LIGHT,
    fontFace: "Arial", bold: true,
  });
  titleSlide.addText(`${new Date().toLocaleDateString("en-GB")} | bpr.rehab`, {
    x: 0.8, y: 4.5, w: "80%", fontSize: 11, color: SUBTLE,
    fontFace: "Arial",
  });
  // Accent bar
  titleSlide.addShape("rect" as any, {
    x: 0.8, y: 1.5, w: 1.5, h: 0.06, fill: { color: ACCENT },
  });

  // ─── Content Slides ───
  const slides = params.slides || [];
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };

    // Top bar
    slide.addShape("rect" as any, {
      x: 0, y: 0, w: "100%", h: 0.06, fill: { color: ACCENT },
    });

    // Slide title
    slide.addText(s.title, {
      x: 0.8, y: 0.3, w: "85%", fontSize: 24, color: PRIMARY,
      fontFace: "Arial", bold: true,
    });

    // Bullets
    if (s.bullets && s.bullets.length > 0) {
      const bulletText = s.bullets.map((b) => ({
        text: b,
        options: {
          fontSize: 14,
          color: TEXT_DARK,
          fontFace: "Arial",
          bullet: { type: "bullet" as const, color: ACCENT },
          paraSpaceAfter: 8,
        },
      }));
      slide.addText(bulletText, {
        x: 0.8, y: 1.2, w: "85%", h: 3.8, valign: "top",
      });
    }

    // Slide number
    slide.addText(`${i + 2}`, {
      x: "90%", y: "90%", w: 0.5, fontSize: 9, color: SUBTLE,
      fontFace: "Arial", align: "right",
    });

    // Footer
    slide.addText("Bruno Physical Rehabilitation | bpr.rehab", {
      x: 0.8, y: "92%", w: "60%", fontSize: 7, color: SUBTLE,
      fontFace: "Arial",
    });

    if (s.notes) {
      slide.addNotes(s.notes);
    }
  }

  // Generate file
  const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
  const slug = (params.title || "presentation").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  const filename = `bpr-${slug}-${Date.now().toString(36)}.pptx`;

  const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  const dir = path.join(baseUploadsDir, "exports");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), new Uint8Array(buffer));

  return NextResponse.json({ fileUrl: `/uploads/exports/${filename}`, filename, type: "pptx" });
}

// ─── CSV / Excel Export ───
async function exportCSV(params: { dataType?: string; filters?: any }, clinicId?: string) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BPR Command Center";
  workbook.created = new Date();

  const cf = clinicId ? { clinicId } : {};
  const dataType = params?.dataType || "patients";

  let filename = "bpr-export";

  switch (dataType) {
    case "patients": {
      const patients = await (prisma as any).user.findMany({
        where: { ...cf, role: "PATIENT" },
        orderBy: { createdAt: "desc" },
        select: {
          firstName: true, lastName: true, email: true, phone: true,
          dateOfBirth: true, createdAt: true, updatedAt: true,
        },
      });

      const ws = workbook.addWorksheet("Patients");
      ws.columns = [
        { header: "First Name", key: "firstName", width: 18 },
        { header: "Last Name", key: "lastName", width: 18 },
        { header: "Email", key: "email", width: 28 },
        { header: "Phone", key: "phone", width: 18 },
        { header: "Date of Birth", key: "dateOfBirth", width: 14 },
        { header: "Registered", key: "createdAt", width: 14 },
        { header: "Last Active", key: "updatedAt", width: 14 },
      ];

      // Style header row
      ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };

      for (const p of patients) {
        ws.addRow({
          ...p,
          dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString("en-GB") : "",
          createdAt: new Date(p.createdAt).toLocaleDateString("en-GB"),
          updatedAt: new Date(p.updatedAt).toLocaleDateString("en-GB"),
        });
      }
      filename = `bpr-patients-${Date.now().toString(36)}`;
      break;
    }

    case "appointments": {
      const appts = await (prisma as any).appointment.findMany({
        where: cf,
        orderBy: { dateTime: "desc" },
        take: 500,
        include: {
          patient: { select: { firstName: true, lastName: true } },
          therapist: { select: { firstName: true, lastName: true } },
        },
      });

      const ws = workbook.addWorksheet("Appointments");
      ws.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Time", key: "time", width: 10 },
        { header: "Patient", key: "patient", width: 25 },
        { header: "Therapist", key: "therapist", width: 25 },
        { header: "Type", key: "type", width: 20 },
        { header: "Status", key: "status", width: 14 },
      ];

      ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };

      for (const a of appts) {
        ws.addRow({
          date: new Date(a.dateTime).toLocaleDateString("en-GB"),
          time: new Date(a.dateTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          patient: `${a.patient?.firstName || ""} ${a.patient?.lastName || ""}`.trim(),
          therapist: `${a.therapist?.firstName || ""} ${a.therapist?.lastName || ""}`.trim(),
          type: a.treatmentType || a.type || "",
          status: a.status,
        });
      }
      filename = `bpr-appointments-${Date.now().toString(36)}`;
      break;
    }

    case "payments": {
      const payments = await (prisma as any).payment.findMany({
        where: cf,
        orderBy: { createdAt: "desc" },
        take: 500,
        include: {
          patient: { select: { firstName: true, lastName: true, email: true } },
        },
      });

      const ws = workbook.addWorksheet("Payments");
      ws.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Patient", key: "patient", width: 25 },
        { header: "Email", key: "email", width: 28 },
        { header: "Amount (£)", key: "amount", width: 12 },
        { header: "Status", key: "status", width: 14 },
        { header: "Method", key: "method", width: 14 },
      ];

      ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };

      for (const p of payments) {
        ws.addRow({
          date: new Date(p.createdAt).toLocaleDateString("en-GB"),
          patient: `${p.patient?.firstName || ""} ${p.patient?.lastName || ""}`.trim(),
          email: p.patient?.email || "",
          amount: (p.amount || 0).toFixed(2),
          status: p.status,
          method: p.method || "",
        });
      }
      filename = `bpr-payments-${Date.now().toString(36)}`;
      break;
    }

    default:
      return NextResponse.json({ error: `Unknown data type: ${dataType}` }, { status: 400 });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fullFilename = `${filename}.xlsx`;

  const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  const dir = path.join(baseUploadsDir, "exports");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fullFilename), new Uint8Array(buffer as ArrayBuffer));

  return NextResponse.json({ fileUrl: `/uploads/exports/${fullFilename}`, filename: fullFilename, type: "xlsx" });
}

// ─── Create Article ───
async function createArticle(
  params: { title?: string; excerpt?: string; content?: string; language?: string; category?: string },
  clinicId?: string,
  authorId?: string
) {
  if (!params.title || !params.content) {
    return NextResponse.json({ error: "Article title and content are required" }, { status: 400 });
  }

  const slug = (params.title || "article")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

  const article = await (prisma as any).article.create({
    data: {
      clinicId: clinicId || undefined,
      authorId: authorId || undefined,
      title: params.title,
      slug: `${slug}-${Date.now().toString(36)}`,
      excerpt: params.excerpt || params.content.slice(0, 160),
      content: params.content,
      published: false,
    },
  });

  return NextResponse.json({
    success: true,
    articleId: article.id,
    slug: article.slug,
    message: `Article "${params.title}" created as draft. Go to Articles to review and publish.`,
  });
}

// ─── Generate Image ───
async function generateImageAction(params: { prompt?: string; aspectRatio?: string }) {
  if (!params.prompt) {
    return NextResponse.json({ error: "Image prompt is required" }, { status: 400 });
  }

  try {
    const urls = await aiGenerateImage(params.prompt, {
      aspectRatio: params.aspectRatio || "16:9",
      numImages: 1,
    });

    if (urls.length > 0) {
      const url = urls[0];
      let imageUrl = url;

      // If it's a URL, download and save locally
      if (url.startsWith("http")) {
        const imgRes = await fetch(url);
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer();
          const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
          const dir = path.join(baseUploadsDir, "generated");
          await mkdir(dir, { recursive: true });
          const filename = `bpr-ai-${Date.now().toString(36)}.png`;
          await writeFile(path.join(dir, filename), new Uint8Array(buf));
          imageUrl = `/uploads/generated/${filename}`;
        }
      } else if (url.startsWith("data:image")) {
        const match = url.match(/^data:image\/\w+;base64,(.+)$/);
        if (match) {
          const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
          const dir = path.join(baseUploadsDir, "generated");
          await mkdir(dir, { recursive: true });
          const filename = `bpr-ai-${Date.now().toString(36)}.png`;
          await writeFile(path.join(dir, filename), new Uint8Array(Buffer.from(match[1], "base64")));
          imageUrl = `/uploads/generated/${filename}`;
        }
      }

      return NextResponse.json({ success: true, imageUrl, message: "Image generated successfully." });
    }

    return NextResponse.json({ error: "Image generation returned no results" }, { status: 422 });
  } catch (err: any) {
    return NextResponse.json({ error: `Image generation failed: ${err.message}` }, { status: 500 });
  }
}

// ─── Send Email ───
async function sendEmailAction(params: { to?: string; subject?: string; body?: string }) {
  if (!params.to || !params.subject || !params.body) {
    return NextResponse.json({ error: "Email requires to, subject, and body" }, { status: 400 });
  }

  try {
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({
      to: params.to,
      subject: params.subject,
      html: params.body.replace(/\n/g, "<br/>"),
    });

    return NextResponse.json({
      success: true,
      message: `Email sent to ${params.to} with subject "${params.subject}".`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: `Failed to send email: ${err.message}` }, { status: 500 });
  }
}

// ─── Instagram Post (generate caption + image) ───
async function instagramPostAction(
  params: { topic?: string; caption?: string; imagePrompt?: string; language?: string },
  clinicId?: string
) {
  const results: any = { success: true };

  // Generate caption if not provided
  if (!params.caption && params.topic) {
    const captionPrompt = `Create an engaging Instagram caption for a physiotherapy clinic (Bruno Physical Rehabilitation).
Topic: ${params.topic}
Language: ${params.language || "en"}
Rules:
- Keep it under 200 words
- Include 2-3 relevant emojis
- Add a call to action
- Include 5-8 relevant hashtags at the end
- Professional but warm tone`;

    results.caption = await callAI(captionPrompt, { temperature: 0.8, maxTokens: 500 });
  } else {
    results.caption = params.caption || "";
  }

  // Generate image if prompt provided
  if (params.imagePrompt) {
    try {
      const urls = await aiGenerateImage(
        `Professional Instagram post image for a physiotherapy clinic: ${params.imagePrompt}. Clean, modern, healthcare aesthetic.`,
        { aspectRatio: "1:1", numImages: 1 }
      );
      if (urls.length > 0) {
        const url = urls[0];
        if (url.startsWith("http")) {
          const imgRes = await fetch(url);
          if (imgRes.ok) {
            const buf = await imgRes.arrayBuffer();
            const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
            const dir = path.join(baseUploadsDir, "generated");
            await mkdir(dir, { recursive: true });
            const filename = `bpr-instagram-${Date.now().toString(36)}.png`;
            await writeFile(path.join(dir, filename), new Uint8Array(buf));
            results.imageUrl = `/uploads/generated/${filename}`;
          }
        }
      }
    } catch (err: any) {
      results.imageError = err.message;
    }
  }

  // Save as draft social post if we have a clinic
  if (clinicId && results.caption) {
    try {
      const post = await (prisma as any).socialPost.create({
        data: {
          clinicId,
          platform: "INSTAGRAM",
          caption: results.caption,
          mediaUrls: results.imageUrl ? [results.imageUrl] : [],
          status: "DRAFT",
        },
      });
      results.postId = post.id;
      results.message = "Instagram post created as draft in Social Media section.";
    } catch {
      results.message = "Caption generated. Save it manually in Social Media.";
    }
  }

  return NextResponse.json(results);
}

// ─── Send WhatsApp ───
async function sendWhatsAppAction(params: { to?: string; patientName?: string; message?: string; context?: string }) {
  if (!params.to && !params.patientName) {
    return NextResponse.json({ error: "WhatsApp requires a phone number (to) or patient name" }, { status: 400 });
  }

  // If patient name provided but no phone, look up
  let phone = params.to;
  let name = params.patientName || "";

  if (!phone && name) {
    const patient = await prisma.user.findFirst({
      where: {
        role: "PATIENT",
        OR: [
          { firstName: { contains: name, mode: "insensitive" as any } },
          { lastName: { contains: name, mode: "insensitive" as any } },
        ],
      },
      select: { phone: true, firstName: true, lastName: true },
    });
    if (patient?.phone) {
      phone = patient.phone;
      name = `${patient.firstName || ""} ${patient.lastName || ""}`.trim();
    } else {
      return NextResponse.json({ error: `Patient "${name}" not found or has no phone number.` }, { status: 404 });
    }
  }

  if (!phone) {
    return NextResponse.json({ error: "No phone number available" }, { status: 400 });
  }

  try {
    const { sendAIWhatsAppMessage } = await import("@/lib/whatsapp");
    const result = await sendAIWhatsAppMessage({
      to: phone,
      patientName: name || "Patient",
      context: params.context || params.message || "general",
      additionalInfo: params.message,
    });

    if (result.success) {
      return NextResponse.json({ success: true, message: `WhatsApp sent to ${name || phone}.` });
    } else {
      return NextResponse.json({ error: `WhatsApp failed: ${result.error}` }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: `WhatsApp error: ${err.message}` }, { status: 500 });
  }
}

// ─── Marketing Campaign Plan ───
async function marketingCampaignAction(
  params: { goal?: string; duration?: string; channels?: string[]; budget?: string; language?: string },
  clinicId?: string
) {
  const cf = clinicId ? { clinicId } : {};

  // Gather real data for context
  const [patientCount, articleCount, recentAppts] = await Promise.all([
    prisma.user.count({ where: { ...cf, role: "PATIENT" } }),
    prisma.article.count({ where: cf }),
    (prisma as any).appointment.count({
      where: { ...cf, dateTime: { gte: new Date(Date.now() - 30 * 86400000) } },
    }),
  ]);

  const prompt = `You are a healthcare marketing strategist for Bruno Physical Rehabilitation (BPR), a physiotherapy clinic in London.

Current clinic data:
- Total patients: ${patientCount}
- Published articles: ${articleCount}
- Appointments last 30 days: ${recentAppts}

Create a detailed marketing campaign plan with:
- Goal: ${params.goal || "Increase patient acquisition and retention"}
- Duration: ${params.duration || "4 weeks"}
- Channels: ${(params.channels || ["instagram", "email", "blog", "whatsapp"]).join(", ")}
- Budget consideration: ${params.budget || "Low budget / organic focused"}

Format as JSON:
{
  "campaignName": "...",
  "objective": "...",
  "targetAudience": "...",
  "weeks": [
    {
      "week": 1,
      "theme": "...",
      "actions": [
        { "channel": "instagram", "task": "...", "content": "...", "timing": "..." },
        { "channel": "email", "task": "...", "content": "...", "timing": "..." },
        { "channel": "blog", "task": "...", "content": "...", "timing": "..." }
      ]
    }
  ],
  "kpis": ["..."],
  "estimatedResults": "..."
}

Language: ${params.language || "en"}
Be specific with actual content suggestions, hashtags, email subjects, and article titles.`;

  const result = await callAI(prompt, { temperature: 0.7, maxTokens: 3000 });

  // Try to parse JSON from response
  let campaign: any = null;
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) campaign = JSON.parse(jsonMatch[0]);
  } catch { /* raw text fallback */ }

  // Generate PDF of the campaign
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const mg = 18;
  const uw = pw - mg * 2;
  let y = 0;

  const addHdr = () => {
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pw, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("BPR Marketing Campaign", mg, 9);
    doc.text(new Date().toLocaleDateString("en-GB"), pw - mg, 9, { align: "right" });
  };

  // Cover
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pw, 297, "F");
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("BRUNO PHYSICAL REHABILITATION", mg, 40);
  doc.setDrawColor(16, 185, 129);
  doc.line(mg, 44, mg + 50, 44);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text(campaign?.campaignName || "Marketing Campaign Plan", mg, 75);
  doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.setTextColor(148, 163, 184);
  if (campaign?.objective) doc.text(doc.splitTextToSize(campaign.objective, uw)[0] || "", mg, 90);
  doc.text(`Duration: ${params.duration || "4 weeks"} | Generated: ${new Date().toLocaleDateString("en-GB")}`, mg, 105);
  if (campaign?.targetAudience) {
    doc.setFontSize(10);
    doc.text(`Target: ${campaign.targetAudience}`, mg, 115);
  }
  doc.setFontSize(8); doc.setTextColor(100, 116, 139);
  doc.text("bpr.rehab | Confidential", mg, 270);

  // Week pages
  const weeks = campaign?.weeks || [];
  for (const week of weeks) {
    doc.addPage(); addHdr(); y = 22;
    doc.setTextColor(30, 41, 59); doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text(`Week ${week.week}: ${week.theme || ""}`, mg, y); y += 10;

    for (const action of (week.actions || [])) {
      if (y > 260) { doc.addPage(); addHdr(); y = 22; }
      // Channel badge
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(mg, y - 3, 22, 6, 1, 1, "F");
      doc.setFontSize(7); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
      doc.text((action.channel || "").toUpperCase(), mg + 2, y + 1);

      // Task
      doc.setFontSize(10); doc.setTextColor(30, 41, 59); doc.setFont("helvetica", "bold");
      doc.text(action.task || "", mg + 25, y);
      y += 6;

      // Content
      if (action.content) {
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(71, 85, 105);
        const contentLines = doc.splitTextToSize(action.content, uw - 5);
        for (const cl of contentLines.slice(0, 4)) {
          if (y > 270) { doc.addPage(); addHdr(); y = 22; }
          doc.text(cl, mg + 3, y);
          y += 4.5;
        }
      }
      // Timing
      if (action.timing) {
        doc.setFontSize(8); doc.setTextColor(100, 116, 139);
        doc.text(`Timing: ${action.timing}`, mg + 3, y);
        y += 5;
      }
      y += 4;
    }
  }

  // KPIs page (if available)
  if (campaign?.kpis || campaign?.estimatedResults) {
    doc.addPage(); addHdr(); y = 22;
    doc.setTextColor(30, 41, 59); doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("KPIs & Expected Results", mg, y); y += 10;

    if (campaign.kpis) {
      doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
      for (const kpi of campaign.kpis) {
        doc.text(`•  ${kpi}`, mg + 3, y); y += 7;
      }
    }
    if (campaign.estimatedResults) {
      y += 5;
      doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
      const resLines = doc.splitTextToSize(campaign.estimatedResults, uw);
      for (const rl of resLines) { doc.text(rl, mg, y); y += 5; }
    }
  }

  // If no structured data, write the AI text cleanly
  if (weeks.length === 0) {
    doc.addPage(); addHdr(); y = 22;
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
    const cleanText = result.replace(/```json\n?|\n?```/g, "").trim();
    const fallbackLines = doc.splitTextToSize(cleanText, uw);
    for (const fl of fallbackLines) {
      if (y > 275) { doc.addPage(); addHdr(); y = 22; }
      doc.text(fl, mg, y); y += 5;
    }
  }

  // Footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i - 1} of ${totalPages - 1} | BPR Marketing Campaign | Confidential`, pw / 2, 290, { align: "center" });
  }

  const buffer = Buffer.from(doc.output("arraybuffer"));
  const filename = `bpr-campaign-${Date.now().toString(36)}.pdf`;
  const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  const dir = path.join(baseUploadsDir, "exports");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), new Uint8Array(buffer));

  return NextResponse.json({
    success: true,
    campaign: campaign || result,
    fileUrl: `/uploads/exports/${filename}`,
    filename,
    message: `Marketing campaign plan generated with ${weeks.length} weeks and saved as PDF.`,
  });
}

// ─── Patient Re-engagement ───
async function patientReengagementAction(
  params: { inactiveDays?: number; limit?: number; language?: string },
  clinicId?: string
) {
  const cf = clinicId ? { clinicId } : {};
  const daysThreshold = params.inactiveDays || 60;
  const cutoff = new Date(Date.now() - daysThreshold * 86400000);

  // Find patients who haven't had appointments recently
  const inactivePatients = await (prisma as any).user.findMany({
    where: {
      ...cf,
      role: "PATIENT",
      updatedAt: { lt: cutoff },
    },
    take: params.limit || 20,
    orderBy: { updatedAt: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  if (inactivePatients.length === 0) {
    return NextResponse.json({
      success: true,
      message: `No inactive patients found (threshold: ${daysThreshold} days). All patients are engaged!`,
      patients: [],
    });
  }

  // Generate personalized re-engagement suggestions
  const patientList = inactivePatients.map((p: any) => ({
    name: `${p.firstName || ""} ${p.lastName || ""}`.trim(),
    email: p.email,
    phone: p.phone,
    lastActive: p.updatedAt,
    daysSinceActive: Math.floor((Date.now() - new Date(p.updatedAt).getTime()) / 86400000),
    registeredOn: p.createdAt,
  }));

  const prompt = `You are a patient retention specialist for Bruno Physical Rehabilitation (BPR).

These patients have been inactive for ${daysThreshold}+ days:
${JSON.stringify(patientList, null, 2)}

For each patient, generate:
1. A personalized email subject line
2. A brief WhatsApp message (warm, personal, not salesy)
3. A re-engagement strategy (what offer/incentive to use)

Format as JSON array:
[{
  "name": "...",
  "email": "...",
  "daysSinceActive": N,
  "emailSubject": "...",
  "whatsappMessage": "...",
  "strategy": "...",
  "priority": "high|medium|low"
}]

Language: ${params.language || "en"}
Be warm and professional. Reference physiotherapy benefits.`;

  const result = await callAI(prompt, { temperature: 0.7, maxTokens: 2000 });

  let strategies: any[] = [];
  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) strategies = JSON.parse(jsonMatch[0]);
  } catch { /* fallback */ }

  // Generate Excel report
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BPR Command Center";
  const ws = workbook.addWorksheet("Re-engagement");
  ws.columns = [
    { header: "Patient", key: "name", width: 22 },
    { header: "Email", key: "email", width: 28 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Days Inactive", key: "days", width: 14 },
    { header: "Priority", key: "priority", width: 10 },
    { header: "Email Subject", key: "emailSubject", width: 35 },
    { header: "WhatsApp Message", key: "whatsapp", width: 40 },
    { header: "Strategy", key: "strategy", width: 35 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };

  for (let i = 0; i < patientList.length; i++) {
    const p = patientList[i];
    const s = strategies[i] || {};
    ws.addRow({
      name: p.name,
      email: p.email,
      phone: p.phone || "",
      days: p.daysSinceActive,
      priority: s.priority || "medium",
      emailSubject: s.emailSubject || "",
      whatsapp: s.whatsappMessage || "",
      strategy: s.strategy || "",
    });
  }

  const xlBuffer = await workbook.xlsx.writeBuffer();
  const xlFilename = `bpr-reengagement-${Date.now().toString(36)}.xlsx`;
  const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  const dir = path.join(baseUploadsDir, "exports");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, xlFilename), new Uint8Array(xlBuffer as ArrayBuffer));

  return NextResponse.json({
    success: true,
    patientsFound: patientList.length,
    strategies: strategies.length > 0 ? strategies : patientList,
    fileUrl: `/uploads/exports/${xlFilename}`,
    filename: xlFilename,
    message: `Found ${patientList.length} inactive patients (${daysThreshold}+ days). Re-engagement plan exported to Excel.`,
  });
}

// ─── SEO Content Plan ───
async function seoContentPlanAction(params: { niche?: string; count?: number; language?: string }) {
  const prompt = `You are an SEO content strategist for Bruno Physical Rehabilitation (BPR), a physiotherapy clinic in London, UK.

Generate an SEO content plan with ${params.count || 10} blog article ideas.
Niche focus: ${params.niche || "physiotherapy, rehabilitation, sports medicine, wellness"}

For each article, provide:
1. Title (SEO-optimized, compelling)
2. Target keyword (long-tail, search intent)
3. Estimated monthly search volume (realistic UK)
4. Content outline (4-6 key sections)
5. Meta description (155 chars max)
6. Internal linking suggestions (to clinic services)

Format as JSON:
{
  "strategy": "...",
  "articles": [
    {
      "title": "...",
      "targetKeyword": "...",
      "searchVolume": "...",
      "difficulty": "low|medium|high",
      "outline": ["..."],
      "metaDescription": "...",
      "internalLinks": ["..."],
      "priority": 1
    }
  ]
}

Language: ${params.language || "en"}
Focus on UK audience, NHS-aware, physiotherapy-specific.`;

  const result = await callAI(prompt, { temperature: 0.7, maxTokens: 3000 });

  let plan: any = null;
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) plan = JSON.parse(jsonMatch[0]);
  } catch { /* raw text fallback */ }

  // Generate Excel with the plan
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BPR Command Center";
  const ws = workbook.addWorksheet("SEO Content Plan");
  ws.columns = [
    { header: "#", key: "priority", width: 5 },
    { header: "Title", key: "title", width: 40 },
    { header: "Target Keyword", key: "keyword", width: 28 },
    { header: "Search Vol", key: "volume", width: 12 },
    { header: "Difficulty", key: "difficulty", width: 12 },
    { header: "Meta Description", key: "meta", width: 45 },
    { header: "Outline", key: "outline", width: 50 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };

  const articles = plan?.articles || [];
  for (const a of articles) {
    ws.addRow({
      priority: a.priority || "",
      title: a.title || "",
      keyword: a.targetKeyword || "",
      volume: a.searchVolume || "",
      difficulty: a.difficulty || "",
      meta: a.metaDescription || "",
      outline: (a.outline || []).join(" → "),
    });
  }

  const xlBuffer = await workbook.xlsx.writeBuffer();
  const xlFilename = `bpr-seo-plan-${Date.now().toString(36)}.xlsx`;
  const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  const dir = path.join(baseUploadsDir, "exports");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, xlFilename), new Uint8Array(xlBuffer as ArrayBuffer));

  return NextResponse.json({
    success: true,
    plan: plan || result,
    articlesCount: articles.length,
    fileUrl: `/uploads/exports/${xlFilename}`,
    filename: xlFilename,
    message: `SEO content plan with ${articles.length} articles generated and exported to Excel.`,
  });
}

// ─── Social Media Calendar ───
async function socialCalendarAction(
  params: { weeks?: number; platforms?: string[]; language?: string },
  clinicId?: string
) {
  const cf = clinicId ? { clinicId } : {};
  const weeks = params.weeks || 2;
  const platforms = params.platforms || ["instagram", "facebook"];

  // Get existing articles for content repurposing
  const articles = await (prisma as any).article.findMany({
    where: { ...cf, published: true },
    take: 10,
    orderBy: { createdAt: "desc" },
    select: { title: true, slug: true },
  });

  const prompt = `You are a social media manager for Bruno Physical Rehabilitation (BPR), a physiotherapy clinic in London.

Create a ${weeks}-week social media content calendar.
Platforms: ${platforms.join(", ")}

Existing blog articles for repurposing:
${articles.map((a: any) => `- "${a.title}"`).join("\n")}

For each day (Mon-Fri), provide:
- Platform
- Post type (carousel, reel, story, static, video)
- Content/caption idea
- Image/visual description
- Best posting time
- Hashtags (5-8)

Format as JSON:
{
  "weeks": [
    {
      "week": 1,
      "theme": "...",
      "posts": [
        {
          "day": "Monday",
          "platform": "instagram",
          "postType": "carousel",
          "caption": "...",
          "visualDescription": "...",
          "postingTime": "09:00",
          "hashtags": ["..."]
        }
      ]
    }
  ]
}

Language: ${params.language || "en"}
Mix educational content, patient testimonials (fictional), behind-the-scenes, and promotional posts. Keep it authentic and engaging.`;

  const result = await callAI(prompt, { temperature: 0.8, maxTokens: 4000 });

  let calendar: any = null;
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) calendar = JSON.parse(jsonMatch[0]);
  } catch { /* raw text fallback */ }

  // Generate Excel calendar
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BPR Command Center";
  const ws = workbook.addWorksheet("Social Calendar");
  ws.columns = [
    { header: "Week", key: "week", width: 8 },
    { header: "Day", key: "day", width: 12 },
    { header: "Platform", key: "platform", width: 12 },
    { header: "Type", key: "postType", width: 12 },
    { header: "Caption", key: "caption", width: 50 },
    { header: "Visual", key: "visual", width: 35 },
    { header: "Time", key: "time", width: 8 },
    { header: "Hashtags", key: "hashtags", width: 40 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };

  const calendarWeeks = calendar?.weeks || [];
  for (const w of calendarWeeks) {
    for (const p of (w.posts || [])) {
      ws.addRow({
        week: w.week,
        day: p.day || "",
        platform: p.platform || "",
        postType: p.postType || "",
        caption: p.caption || "",
        visual: p.visualDescription || "",
        time: p.postingTime || "",
        hashtags: (p.hashtags || []).join(", "),
      });
    }
  }

  const xlBuffer = await workbook.xlsx.writeBuffer();
  const xlFilename = `bpr-social-calendar-${Date.now().toString(36)}.xlsx`;
  const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  const dir = path.join(baseUploadsDir, "exports");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, xlFilename), new Uint8Array(xlBuffer as ArrayBuffer));

  const totalPosts = calendarWeeks.reduce((sum: number, w: any) => sum + (w.posts?.length || 0), 0);

  return NextResponse.json({
    success: true,
    calendar: calendar || result,
    totalPosts,
    fileUrl: `/uploads/exports/${xlFilename}`,
    filename: xlFilename,
    message: `${weeks}-week social media calendar with ${totalPosts} posts generated and exported to Excel.`,
  });
}

// ─── Full Comprehensive Report ───
async function fullReportAction(
  params: { title?: string; period?: string; language?: string; sections?: string[] },
  clinicId?: string
) {
  const cf = clinicId ? { clinicId } : {};
  const wh = cf.clinicId ? { clinicId: cf.clinicId } : {};
  const now = new Date();
  const d30 = new Date(Date.now() - 30 * 86400000);
  const d60 = new Date(Date.now() - 60 * 86400000);
  const d90 = new Date(Date.now() - 90 * 86400000);
  const lang = params.language || "en";

  // ── Gather comprehensive metrics ──
  const [
    totalPatients, newPatients30d, newPatients60d, activePatients, inactivePatients,
    totalAppointments, appts30d, appts60d, upcomingAppts,
    apptsByStatus,
    totalArticles, publishedArticles,
    totalPaymentsAgg, revenue30d, revenue60d, revenue90d,
    treatmentTypesCount, exercises, protocols, diagnoses,
    footScans, bodyAssessments, packages, paidPackages,
    activeSubs, memberships,
    socialPosts, educationContent, documents,
    recentPatients,
    screeningsCompleted,
  ] = await Promise.all([
    prisma.user.count({ where: { ...cf, role: "PATIENT" } }),
    prisma.user.count({ where: { ...cf, role: "PATIENT", createdAt: { gte: d30 } } }),
    prisma.user.count({ where: { ...cf, role: "PATIENT", createdAt: { gte: d60, lt: d30 } } }),
    prisma.user.count({ where: { ...cf, role: "PATIENT", updatedAt: { gte: d30 } } }),
    prisma.user.count({ where: { ...cf, role: "PATIENT", updatedAt: { lt: d60 } } }),
    (prisma as any).appointment.count({ where: cf }),
    (prisma as any).appointment.count({ where: { ...cf, dateTime: { gte: d30 } } }),
    (prisma as any).appointment.count({ where: { ...cf, dateTime: { gte: d60, lt: d30 } } }),
    (prisma as any).appointment.count({ where: { ...cf, dateTime: { gte: now }, status: "CONFIRMED" } }),
    (prisma as any).appointment.groupBy({ by: ["status"], _count: { id: true }, where: cf }),
    prisma.article.count({ where: cf }),
    prisma.article.count({ where: { ...cf, published: true } }),
    (prisma as any).payment.aggregate({ where: { ...cf, status: "SUCCEEDED" }, _sum: { amount: true }, _count: { id: true } }),
    (prisma as any).payment.aggregate({ where: { ...cf, status: "SUCCEEDED", createdAt: { gte: d30 } }, _sum: { amount: true }, _count: { id: true } }),
    (prisma as any).payment.aggregate({ where: { ...cf, status: "SUCCEEDED", createdAt: { gte: d60, lt: d30 } }, _sum: { amount: true } }),
    (prisma as any).payment.aggregate({ where: { ...cf, status: "SUCCEEDED", createdAt: { gte: d90, lt: d60 } }, _sum: { amount: true } }),
    prisma.treatmentType.count({ where: wh }),
    (prisma as any).exercise.count({ where: wh }).catch(() => 0),
    (prisma as any).treatmentProtocol.count({ where: wh }).catch(() => 0),
    (prisma as any).aIDiagnosis.count({ where: wh }).catch(() => 0),
    prisma.footScan.count({ where: wh }),
    (prisma as any).bodyAssessment.count({ where: wh }).catch(() => 0),
    (prisma as any).treatmentPackage.count({ where: wh }).catch(() => 0),
    (prisma as any).treatmentPackage.count({ where: { ...wh, isPaid: true } }).catch(() => 0),
    (prisma as any).patientSubscription.count({ where: { ...wh, status: "ACTIVE" } }).catch(() => 0),
    (prisma as any).membershipPlan.count({ where: wh }).catch(() => 0),
    (prisma as any).socialPost.count({ where: wh }).catch(() => 0),
    (prisma as any).educationContent.count({ where: wh }).catch(() => 0),
    (prisma as any).patientDocument.count({ where: wh }).catch(() => 0),
    prisma.user.findMany({
      where: { ...cf, role: "PATIENT" }, take: 10, orderBy: { createdAt: "desc" },
      select: { firstName: true, lastName: true, email: true, createdAt: true },
    }),
    prisma.medicalScreening.count({ where: wh }),
  ]);

  const rev30 = revenue30d._sum?.amount || 0;
  const rev60 = revenue60d._sum?.amount || 0;
  const rev90 = revenue90d._sum?.amount || 0;
  const totalRev = totalPaymentsAgg._sum?.amount || 0;
  const totalPayCount = totalPaymentsAgg._count?.id || 0;
  const pay30Count = revenue30d._count?.id || 0;
  const revGrowth = rev60 > 0 ? (((rev30 - rev60) / rev60) * 100).toFixed(1) : "N/A";
  const patGrowth = newPatients60d > 0 ? (((newPatients30d - newPatients60d) / newPatients60d) * 100).toFixed(1) : "N/A";
  const statusMap: Record<string, number> = {};
  for (const s of (apptsByStatus as any[])) statusMap[s.status] = s._count.id;
  const screeningRate = totalPatients > 0 ? ((screeningsCompleted / totalPatients) * 100).toFixed(0) : "0";
  const avgRevPerPatient = activePatients > 0 ? (rev30 / activePatients).toFixed(2) : "0";

  // ── AI-generated analysis ──
  const dataSnapshot = `Patients: ${totalPatients} total, ${activePatients} active, ${newPatients30d} new (30d), ${inactivePatients} inactive (60d+). Growth: ${patGrowth}%.
Revenue: £${totalRev.toFixed(2)} lifetime, £${rev30.toFixed(2)} (30d), £${rev60.toFixed(2)} (prev 30d), £${rev90.toFixed(2)} (60-90d). Growth: ${revGrowth}%. Avg/active patient: £${avgRevPerPatient}.
Appointments: ${totalAppointments} total, ${appts30d} (30d), ${upcomingAppts} upcoming. Status: ${Object.entries(statusMap).map(([k,v]) => `${k}: ${v}`).join(", ")}.
Clinical: ${treatmentTypesCount} treatment types, ${exercises} exercises, ${protocols} protocols, ${diagnoses} AI diagnoses, ${footScans} foot scans, ${bodyAssessments} body assessments.
Packages: ${packages} total, ${paidPackages} paid. Subscriptions: ${activeSubs} active, ${memberships} plans. Screening rate: ${screeningRate}%.
Content: ${totalArticles} articles (${publishedArticles} published), ${socialPosts} social posts, ${educationContent} education items, ${documents} patient documents.`;

  let aiAnalysis = "";
  try {
    aiAnalysis = await callAI(
      `You are a healthcare business analyst. Based on this clinic data, write a concise executive analysis (max 400 words) covering: 1) Overall health of the business, 2) Growth trends, 3) Top 3 strengths, 4) Top 3 concerns/risks, 5) Top 3 actionable recommendations. Be specific with numbers.\n\nData:\n${dataSnapshot}\n\nLanguage: ${lang === "pt" ? "Portuguese (pt-BR)" : "English (en-GB)"}`,
      { temperature: 0.6, maxTokens: 1500 }
    );
  } catch { aiAnalysis = "AI analysis unavailable."; }

  // ── Build the PDF ──
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const m = 18;
  const uw = pw - m * 2;
  let y = 0;

  const addPageHeader = (title: string) => {
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pw, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("BPR Comprehensive Report", m, 9);
    doc.text(title, pw - m, 9, { align: "right" });
  };

  const drawKpiCard = (x: number, yPos: number, w: number, label: string, value: string, sub: string) => {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, yPos, w, 22, 2, 2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + 4, yPos + 6);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(value, x + 4, yPos + 15);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(16, 185, 129);
    doc.text(sub, x + 4, yPos + 20);
  };

  // ── PAGE 1: Cover ──
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pw, 297, "F");
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("BRUNO PHYSICAL REHABILITATION", m, 40);
  doc.setDrawColor(16, 185, 129);
  doc.line(m, 44, m + 50, 44);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.text(params.title || (lang === "pt" ? "Relatorio Completo" : "Comprehensive Report"), m, 80);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(`${lang === "pt" ? "Periodo" : "Period"}: ${params.period || (lang === "pt" ? "Ultimos 30 Dias" : "Last 30 Days")}`, m, 95);
  doc.text(`${lang === "pt" ? "Gerado" : "Generated"}: ${now.toLocaleDateString("en-GB")} ${now.toLocaleTimeString("en-GB")}`, m, 103);
  // Quick stats on cover
  doc.setFontSize(11); doc.setTextColor(16, 185, 129); doc.setFont("helvetica", "bold");
  doc.text(lang === "pt" ? "RESUMO RAPIDO" : "QUICK SNAPSHOT", m, 140);
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(200, 215, 230);
  const coverStats = [
    `${totalPatients} ${lang === "pt" ? "pacientes" : "patients"} (${newPatients30d} ${lang === "pt" ? "novos" : "new"})`,
    `${totalAppointments} ${lang === "pt" ? "consultas" : "appointments"} (${upcomingAppts} ${lang === "pt" ? "agendadas" : "upcoming"})`,
    `£${rev30.toFixed(2)} ${lang === "pt" ? "receita (30d)" : "revenue (30d)"}`,
    `${treatmentTypesCount} ${lang === "pt" ? "tipos de tratamento" : "treatment types"} | ${exercises} ${lang === "pt" ? "exercicios" : "exercises"}`,
  ];
  let cy = 150;
  for (const s of coverStats) { doc.text(`   ${s}`, m, cy); cy += 8; }
  doc.setFontSize(8); doc.setTextColor(100, 116, 139);
  doc.text("bpr.rehab | Confidential", m, 270);

  // ── PAGE 2: KPI Dashboard ──
  doc.addPage(); addPageHeader(lang === "pt" ? "Painel de KPIs" : "KPI Dashboard"); y = 22;
  doc.setTextColor(30, 41, 59); doc.setFontSize(20); doc.setFont("helvetica", "bold");
  doc.text(lang === "pt" ? "Painel de Indicadores" : "KPI Dashboard", m, y); y += 12;
  // Row 1
  const cardW = (uw - 8) / 3;
  drawKpiCard(m, y, cardW, lang === "pt" ? "PACIENTES" : "PATIENTS", `${totalPatients}`, `+${newPatients30d} (${patGrowth}%)`);
  drawKpiCard(m + cardW + 4, y, cardW, lang === "pt" ? "RECEITA (30D)" : "REVENUE (30D)", `£${rev30.toFixed(0)}`, `${revGrowth}% vs prev`);
  drawKpiCard(m + (cardW + 4) * 2, y, cardW, lang === "pt" ? "CONSULTAS (30D)" : "APPTS (30D)", `${appts30d}`, `${upcomingAppts} upcoming`);
  y += 28;
  // Row 2
  drawKpiCard(m, y, cardW, lang === "pt" ? "ATIVOS (30D)" : "ACTIVE (30D)", `${activePatients}`, `${inactivePatients} inactive`);
  drawKpiCard(m + cardW + 4, y, cardW, lang === "pt" ? "RECEITA/PACIENTE" : "REV/PATIENT", `£${avgRevPerPatient}`, `${pay30Count} payments`);
  drawKpiCard(m + (cardW + 4) * 2, y, cardW, lang === "pt" ? "SCREENING" : "SCREENING", `${screeningRate}%`, `${screeningsCompleted} completed`);
  y += 28;
  // Row 3
  drawKpiCard(m, y, cardW, lang === "pt" ? "ARTIGOS" : "ARTICLES", `${totalArticles}`, `${publishedArticles} published`);
  drawKpiCard(m + cardW + 4, y, cardW, lang === "pt" ? "ASSINATURAS" : "SUBSCRIPTIONS", `${activeSubs}`, `${memberships} plans`);
  drawKpiCard(m + (cardW + 4) * 2, y, cardW, lang === "pt" ? "PACOTES" : "PACKAGES", `${paidPackages}/${packages}`, `paid/total`);
  y += 32;

  // Appointments by status
  doc.setTextColor(30, 41, 59); doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text(lang === "pt" ? "Consultas por Status" : "Appointments by Status", m, y); y += 8;
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  const statuses = ["CONFIRMED", "COMPLETED", "PENDING", "CANCELLED", "NO_SHOW"];
  const statusColors: Record<string, [number,number,number]> = {
    CONFIRMED: [16, 185, 129], COMPLETED: [59, 130, 246], PENDING: [245, 158, 11],
    CANCELLED: [239, 68, 68], NO_SHOW: [148, 163, 184],
  };
  for (const st of statuses) {
    const count = statusMap[st] || 0;
    if (count === 0) continue;
    const pct = totalAppointments > 0 ? (count / totalAppointments) * 100 : 0;
    const barW = Math.max(2, (pct / 100) * (uw - 60));
    const [r, g, b] = statusColors[st] || [100, 116, 139];
    doc.setFillColor(r, g, b);
    doc.roundedRect(m + 30, y - 3, barW, 5, 1, 1, "F");
    doc.setTextColor(51, 65, 85);
    doc.text(st, m, y);
    doc.text(`${count} (${pct.toFixed(0)}%)`, m + 32 + barW, y);
    y += 8;
  }

  // ── PAGE 3: Clinical Overview ──
  doc.addPage(); addPageHeader(lang === "pt" ? "Visao Clinica" : "Clinical Overview"); y = 22;
  doc.setTextColor(30, 41, 59); doc.setFontSize(20); doc.setFont("helvetica", "bold");
  doc.text(lang === "pt" ? "Visao Clinica" : "Clinical Overview", m, y); y += 12;

  const clinicalItems = [
    [lang === "pt" ? "Tipos de Tratamento" : "Treatment Types", `${treatmentTypesCount}`],
    [lang === "pt" ? "Exercicios na Biblioteca" : "Exercises in Library", `${exercises}`],
    [lang === "pt" ? "Protocolos de Tratamento" : "Treatment Protocols", `${protocols}`],
    [lang === "pt" ? "Diagnosticos IA" : "AI Diagnoses", `${diagnoses}`],
    [lang === "pt" ? "Escaneamentos de Pe" : "Foot Scans", `${footScans}`],
    [lang === "pt" ? "Avaliacoes Corporais" : "Body Assessments", `${bodyAssessments}`],
    [lang === "pt" ? "Documentos de Pacientes" : "Patient Documents", `${documents}`],
    [lang === "pt" ? "Conteudo Educacional" : "Education Content", `${educationContent}`],
    [lang === "pt" ? "Posts Sociais" : "Social Posts", `${socialPosts}`],
  ];
  doc.setFontSize(10);
  for (const [label, value] of clinicalItems) {
    doc.setFillColor(248, 250, 252);
    doc.rect(m, y - 4, uw, 10, "F");
    doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
    doc.text(label, m + 3, y + 2);
    doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59);
    doc.text(value, pw - m - 3, y + 2, { align: "right" });
    y += 12;
  }

  // Revenue trend
  y += 8;
  doc.setTextColor(30, 41, 59); doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text(lang === "pt" ? "Tendencia de Receita (3 Meses)" : "Revenue Trend (3 Months)", m, y); y += 10;
  const months = [
    { label: lang === "pt" ? "60-90 dias atras" : "60-90 days ago", val: rev90 },
    { label: lang === "pt" ? "30-60 dias atras" : "30-60 days ago", val: rev60 },
    { label: lang === "pt" ? "Ultimos 30 dias" : "Last 30 days", val: rev30 },
  ];
  const maxRev = Math.max(rev30, rev60, rev90, 1);
  doc.setFontSize(9);
  for (const mn of months) {
    const barW = Math.max(2, (mn.val / maxRev) * (uw - 80));
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(m + 40, y - 3, barW, 6, 1, 1, "F");
    doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
    doc.text(mn.label, m, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59);
    doc.text(`£${mn.val.toFixed(2)}`, m + 42 + barW, y);
    y += 10;
  }

  // Recent patients
  y += 8;
  doc.setTextColor(30, 41, 59); doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text(lang === "pt" ? "Pacientes Recentes" : "Recent Patients", m, y); y += 8;
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  for (const p of recentPatients.slice(0, 8)) {
    if (y > 270) break;
    doc.setTextColor(51, 65, 85);
    const name = `${(p as any).firstName || ""} ${(p as any).lastName || ""}`.trim();
    doc.text(`${name}  —  ${(p as any).email}  —  ${new Date((p as any).createdAt).toLocaleDateString("en-GB")}`, m + 3, y);
    y += 5.5;
  }

  // ── PAGE 4: AI Analysis ──
  doc.addPage(); addPageHeader(lang === "pt" ? "Analise IA" : "AI Analysis"); y = 22;
  doc.setTextColor(30, 41, 59); doc.setFontSize(20); doc.setFont("helvetica", "bold");
  doc.text(lang === "pt" ? "Analise e Recomendacoes (IA)" : "AI Analysis & Recommendations", m, y); y += 10;

  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
  const analysisLines = doc.splitTextToSize(aiAnalysis, uw);
  for (const line of analysisLines) {
    if (y > 275) { doc.addPage(); addPageHeader("AI Analysis"); y = 22; }
    doc.text(line, m, y);
    y += 5;
  }

  // ── Footer on all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i - 1} of ${totalPages - 1} | Bruno Physical Rehabilitation | Confidential`, pw / 2, 290, { align: "center" });
  }

  const buffer = Buffer.from(doc.output("arraybuffer"));
  const slug = (params.title || "report").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
  const filename = `bpr-full-report-${slug}-${Date.now().toString(36)}.pdf`;
  const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  const dir = path.join(baseUploadsDir, "exports");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), new Uint8Array(buffer));

  return NextResponse.json({
    success: true,
    fileUrl: `/uploads/exports/${filename}`,
    filename,
    metrics: {
      totalPatients, newPatients30d, patientGrowth: patGrowth, activePatients, inactivePatients,
      totalAppointments, appts30d, upcomingAppts,
      revenueTotal: totalRev, revenue30d: rev30, revenue60d: rev60, revenueGrowth: revGrowth,
      totalArticles, publishedArticles, treatmentTypes: treatmentTypesCount,
      screeningRate, activeSubs, paidPackages,
    },
    message: lang === "pt"
      ? `Relatorio completo gerado com ${totalPages} paginas e analise IA. PDF baixando agora.`
      : `Comprehensive report generated with ${totalPages} pages including AI analysis. PDF downloading now.`,
  });
}

// ─── Business Valuation ───
async function businessValuationAction(
  params: { language?: string; scenario?: string },
  clinicId?: string
) {
  const cf = clinicId ? { clinicId } : {};
  const wh = cf.clinicId ? { clinicId: cf.clinicId } : {};
  const d30 = new Date(Date.now() - 30 * 86400000);
  const d60 = new Date(Date.now() - 60 * 86400000);
  const d90 = new Date(Date.now() - 90 * 86400000);

  // ── Gather ALL metrics from DB ──
  const [
    totalPatients, activePatients, newPatients30d, newPatients60d,
    totalAppointments, appts30d, appts60d,
    totalRevenue, revenue30d, revenue60d, revenue90d,
    treatmentTypes, exercises, protocols, diagnoses,
    footScans, bodyAssessments, packages, paidPackages,
    articles, publishedArticles, servicePages,
    memberships, activeSubs,
    socialPosts, images, emailsSent,
    quizzes, achievements,
    educationContent, documents,
  ] = await Promise.all([
    prisma.user.count({ where: { ...cf, role: "PATIENT" } }),
    prisma.user.count({ where: { ...cf, role: "PATIENT", updatedAt: { gte: d30 } } }),
    prisma.user.count({ where: { ...cf, role: "PATIENT", createdAt: { gte: d30 } } }),
    prisma.user.count({ where: { ...cf, role: "PATIENT", createdAt: { gte: d60, lt: d30 } } }),
    (prisma as any).appointment.count({ where: cf }),
    (prisma as any).appointment.count({ where: { ...cf, dateTime: { gte: d30 } } }),
    (prisma as any).appointment.count({ where: { ...cf, dateTime: { gte: d60, lt: d30 } } }),
    (prisma as any).payment.aggregate({ where: { ...cf, status: "SUCCEEDED" }, _sum: { amount: true }, _count: { id: true } }),
    (prisma as any).payment.aggregate({ where: { ...cf, status: "SUCCEEDED", createdAt: { gte: d30 } }, _sum: { amount: true } }),
    (prisma as any).payment.aggregate({ where: { ...cf, status: "SUCCEEDED", createdAt: { gte: d60, lt: d30 } }, _sum: { amount: true } }),
    (prisma as any).payment.aggregate({ where: { ...cf, status: "SUCCEEDED", createdAt: { gte: d90, lt: d60 } }, _sum: { amount: true } }),
    prisma.treatmentType.count({ where: wh }),
    (prisma as any).exercise.count({ where: wh }),
    (prisma as any).treatmentProtocol.count({ where: wh }),
    (prisma as any).aIDiagnosis.count({ where: wh }),
    prisma.footScan.count({ where: wh }),
    (prisma as any).bodyAssessment.count({ where: wh }),
    (prisma as any).treatmentPackage.count({ where: wh }),
    (prisma as any).treatmentPackage.count({ where: { ...wh, isPaid: true } }),
    prisma.article.count({ where: cf }),
    prisma.article.count({ where: { ...cf, published: true } }),
    (prisma as any).servicePage.count(),
    (prisma as any).membershipPlan.count({ where: wh }),
    (prisma as any).patientSubscription.count({ where: { ...wh, status: "ACTIVE" } }),
    (prisma as any).socialPost.count({ where: wh }),
    prisma.imageLibrary.count(),
    (prisma as any).emailMessage.count(),
    (prisma as any).quiz.count(),
    (prisma as any).achievement.count(),
    (prisma as any).educationContent.count({ where: wh }),
    (prisma as any).patientDocument.count({ where: wh }),
  ]);

  const rev30 = revenue30d._sum?.amount || 0;
  const rev60 = revenue60d._sum?.amount || 0;
  const rev90 = revenue90d._sum?.amount || 0;
  const totalRev = totalRevenue._sum?.amount || 0;
  const mrr = rev30;
  const arr = mrr * 12;
  const revenueGrowth = rev60 > 0 ? (((rev30 - rev60) / rev60) * 100) : 0;
  const patientGrowth = newPatients60d > 0 ? (((newPatients30d - newPatients60d) / newPatients60d) * 100) : 0;

  // Count codebase features
  const totalFeatures = treatmentTypes + exercises + protocols + diagnoses + footScans
    + bodyAssessments + articles + servicePages + socialPosts + quizzes + achievements + educationContent;

  // ── AI Valuation Analysis ──
  const prompt = `You are a startup valuation expert and health-tech investment analyst. Perform a comprehensive business valuation for Bruno Physical Rehabilitation (BPR).

## REAL PLATFORM DATA:

### Technology Asset (Codebase)
- Full-stack Next.js 14 + React + TypeScript + PostgreSQL + Prisma
- 45+ database models, 80+ API routes, 30+ admin pages, 15+ patient portal pages
- AI integrations: Abacus AI (RouteLLM), Google Gemini (text, vision, voice)
- Payment: Stripe live (subscriptions, packages, one-time)
- Communication: WhatsApp Business API, Email SMTP/IMAP, Instagram Graph API
- Unique features: AI diagnosis, treatment protocols, biomechanical assessment with MediaPipe pose detection, foot scanning, voice transcription, gamification system, AI Command Center with 15+ executable actions
- Estimated development: 2000+ hours at senior full-stack developer rate

### Revenue & Financial
- Total revenue (all time): £${totalRev.toFixed(2)} from ${totalRevenue._count?.id || 0} payments
- MRR (Monthly Recurring Revenue): £${mrr.toFixed(2)}
- ARR (Annual Recurring Revenue): £${arr.toFixed(2)}
- Revenue last 30d: £${rev30.toFixed(2)} | 30-60d: £${rev60.toFixed(2)} | 60-90d: £${rev90.toFixed(2)}
- Revenue growth (MoM): ${revenueGrowth.toFixed(1)}%
- Active subscriptions: ${activeSubs}
- Paid treatment packages: ${paidPackages} of ${packages} total
- Membership plans available: ${memberships}

### User Base
- Total patients: ${totalPatients}
- Active patients (30d): ${activePatients}
- New patients last 30d: ${newPatients30d} | Previous 30d: ${newPatients60d}
- Patient growth (MoM): ${patientGrowth.toFixed(1)}%
- Total appointments: ${totalAppointments} | Last 30d: ${appts30d}

### Product & Engagement
- Treatment types: ${treatmentTypes} | Exercises: ${exercises}
- AI diagnoses: ${diagnoses} | Protocols: ${protocols}
- Foot scans: ${footScans} | Body assessments: ${bodyAssessments}
- Articles: ${articles} (${publishedArticles} published) | Service pages: ${servicePages}
- Social posts: ${socialPosts} | Images: ${images} | Emails: ${emailsSent}
- Quizzes: ${quizzes} | Achievements: ${achievements} | Education content: ${educationContent}
- Patient documents: ${documents}
- Total feature interactions: ${totalFeatures}+

### Market Comparables (Health-Tech)
- Physitrack: Acquired $124M (2021) — exercise prescription platform
- Sword Health: $3B valuation (2024) — digital MSK rehabilitation
- Kaia Health: $300M+ valuation — AI-powered physiotherapy
- Hinge Health: $6.2B valuation — digital MSK platform
- WELL Health: $1.5B+ — digital health clinic platform
- Health-tech SaaS multiples: typically 8-15x ARR for growth-stage, 3-6x for early-stage

## VALUATION TASK:
Calculate the valuation using ALL of these methodologies:
1. **Cost of Replacement** — What would it cost to rebuild this platform from scratch (dev hours × rate)
2. **Revenue Multiples** — ARR × appropriate multiple for health-tech SaaS
3. **DCF (Discounted Cash Flow)** — Project 5-year revenue with growth assumptions
4. **Comparable Transactions** — Based on similar health-tech acquisitions
5. **Scorecard Method** — Score across: Technology (0-30), Market (0-20), Traction (0-20), Team (0-15), Product (0-15)

Provide THREE scenarios: Conservative, Realistic, Optimistic.

Format as JSON:
{
  "companyName": "Bruno Physical Rehabilitation (BPR)",
  "date": "${new Date().toLocaleDateString("en-GB")}",
  "methodologies": {
    "costOfReplacement": { "devHours": N, "ratePerHour": N, "totalCost": N, "explanation": "..." },
    "revenueMultiples": { "arr": N, "multiple": N, "valuation": N, "explanation": "..." },
    "dcf": { "year1": N, "year2": N, "year3": N, "year4": N, "year5": N, "discountRate": N, "terminalValue": N, "npv": N, "explanation": "..." },
    "comparableTransactions": { "comparables": [{"name":"...","valuation":N,"metric":"..."}], "impliedValuation": N, "explanation": "..." },
    "scorecard": { "technology": N, "market": N, "traction": N, "team": N, "product": N, "totalScore": N, "explanation": "..." }
  },
  "scenarios": {
    "conservative": { "valuation": N, "basis": "..." },
    "realistic": { "valuation": N, "basis": "..." },
    "optimistic": { "valuation": N, "basis": "..." }
  },
  "keyStrengths": ["..."],
  "keyRisks": ["..."],
  "recommendations": ["..."],
  "summary": "..."
}

Language: ${params.language || "en"}
Be thorough, realistic, and data-driven. Use actual numbers from the data above.`;

  const result = await callAI(prompt, { temperature: 0.5, maxTokens: 4000 });

  let valuation: any = null;
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) valuation = JSON.parse(jsonMatch[0]);
  } catch { /* raw text fallback */ }

  // ── Generate Professional PDF ──
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const usableWidth = pageWidth - margin * 2;
  let y = 0;

  // Cover page
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 297, "F");
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CONFIDENTIAL — BUSINESS VALUATION REPORT", margin, 35);
  doc.setDrawColor(16, 185, 129);
  doc.line(margin, 39, margin + 70, 39);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(36);
  doc.text("BPR Valuation", margin, 70);
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("Bruno Physical Rehabilitation", margin, 82);
  doc.text("Digital Health-Tech Platform", margin, 92);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, margin, 110);

  // Valuation range on cover
  if (valuation?.scenarios) {
    const cons = valuation.scenarios.conservative?.valuation || 0;
    const real = valuation.scenarios.realistic?.valuation || 0;
    const opt = valuation.scenarios.optimistic?.valuation || 0;

    doc.setFontSize(13);
    doc.setTextColor(16, 185, 129);
    doc.setFont("helvetica", "bold");
    doc.text("ESTIMATED VALUATION RANGE", margin, 140);
    doc.setFontSize(28);
    doc.setTextColor(255, 255, 255);
    const formatVal = (v: number) => v >= 1000000 ? `£${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `£${(v / 1000).toFixed(0)}K` : `£${v.toFixed(0)}`;
    doc.text(`${formatVal(cons)} — ${formatVal(opt)}`, margin, 158);
    doc.setFontSize(14);
    doc.setTextColor(148, 163, 184);
    doc.text(`Realistic estimate: ${formatVal(real)}`, margin, 170);
  }

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("bpr.rehab | Confidential — For Internal Use Only", margin, 275);

  // Content pages
  doc.addPage();
  y = 25;

  // Header bar
  const addHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("BPR Business Valuation Report — Confidential", margin, 9);
    doc.text(new Date().toLocaleDateString("en-GB"), pageWidth - margin, 9, { align: "right" });
  };
  addHeader();

  // Write the full analysis as text
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Valuation Analysis", margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);

  // Clean text from AI response
  const cleanText = result.replace(/```json\n?|\n?```/g, "").replace(/[{}[\]"]/g, "").trim();
  const textLines = doc.splitTextToSize(cleanText, usableWidth);
  for (const line of textLines) {
    if (y > 278) { doc.addPage(); addHeader(); y = 22; }
    doc.text(line, margin, y);
    y += 4.5;
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i - 1} of ${totalPages - 1} | BPR Valuation Report | Confidential`, pageWidth / 2, 290, { align: "center" });
  }

  const buffer = Buffer.from(doc.output("arraybuffer"));
  const filename = `bpr-valuation-${Date.now().toString(36)}.pdf`;
  const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  const dir = path.join(baseUploadsDir, "exports");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), new Uint8Array(buffer));

  return NextResponse.json({
    success: true,
    valuation: valuation || result,
    fileUrl: `/uploads/exports/${filename}`,
    filename,
    message: `Business valuation report generated. PDF downloading now.`,
  });
}
