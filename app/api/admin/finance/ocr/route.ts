import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { callAI, parseAIJson } from "@/lib/ai-provider";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// POST — upload invoice/receipt, OCR extract + AI categorize
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
  if (!user?.clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Save the file to uploads
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = path.extname(file.name) || ".pdf";
    const filename = `invoice_${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "invoices");

    await mkdir(uploadDir, { recursive: true });
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const fileUrl = `/uploads/invoices/${filename}`;

    // Get available categories for this clinic
    const categories = await prisma.financialCategory.findMany({
      where: { clinicId: user.clinicId, isActive: true },
      select: { id: true, name: true, nameEn: true, namePt: true, type: true, hmrcCode: true },
      orderBy: { sortOrder: "asc" },
    });

    const categoryList = categories.map((c) => `- ${c.name} (${c.type}, HMRC: ${c.hmrcCode || "N/A"}, ID: ${c.id})`).join("\n");

    // Convert file to base64 for AI analysis
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "application/pdf";

    // Build the AI prompt
    const systemPrompt = `You are a UK accountant AI assistant specializing in HMRC compliance and financial document processing for a physiotherapy clinic.
You extract financial data from invoices, receipts, and bills.
Always respond with valid JSON only, no markdown.`;

    const prompt = `Analyze this uploaded document (${file.name}, ${mimeType}).

The document is base64 encoded: data:${mimeType};base64,${base64.substring(0, 50000)}

Extract the following financial information from this invoice/receipt/bill:

1. **description** — Brief description of what this payment is for
2. **amount** — Total amount (number only, no currency symbol)
3. **currency** — Currency code (GBP, EUR, USD, BRL, etc.)
4. **supplierName** — Who issued this invoice (company/person name)
5. **invoiceNumber** — Invoice/receipt number if present
6. **invoiceDate** — Date on the document (ISO format YYYY-MM-DD)
7. **dueDate** — Payment due date if present (ISO format YYYY-MM-DD)
8. **type** — "INCOME" or "EXPENSE" (most uploaded documents are expenses)
9. **vatAmount** — VAT amount if applicable
10. **categoryId** — Best matching category ID from the list below
11. **categoryReason** — Brief explanation of why this category was chosen

Available categories:
${categoryList}

Respond with this exact JSON structure:
{
  "description": "string",
  "amount": number,
  "currency": "string",
  "supplierName": "string or null",
  "invoiceNumber": "string or null",
  "invoiceDate": "string or null",
  "dueDate": "string or null",
  "type": "INCOME or EXPENSE",
  "vatAmount": number or null,
  "categoryId": "string (category ID from list)",
  "categoryReason": "string",
  "confidence": number between 0 and 1,
  "rawText": "first 500 chars of extracted text"
}`;

    const aiResponse = await callAI(prompt, {
      temperature: 0.1,
      maxTokens: 2048,
      systemPrompt,
    });

    const parsed = parseAIJson(aiResponse);

    return NextResponse.json({
      success: true,
      fileUrl,
      filename: file.name,
      extracted: {
        description: parsed.description || file.name,
        amount: parsed.amount || 0,
        currency: parsed.currency || "GBP",
        supplierName: parsed.supplierName || null,
        invoiceNumber: parsed.invoiceNumber || null,
        invoiceDate: parsed.invoiceDate || null,
        dueDate: parsed.dueDate || null,
        type: parsed.type || "EXPENSE",
        vatAmount: parsed.vatAmount || null,
        categoryId: parsed.categoryId || null,
        categoryReason: parsed.categoryReason || null,
        confidence: parsed.confidence || 0,
        rawText: parsed.rawText || null,
      },
    });
  } catch (err: any) {
    console.error("[finance/ocr] Error:", err);
    return NextResponse.json({ error: err.message || "OCR processing failed" }, { status: 500 });
  }
}
