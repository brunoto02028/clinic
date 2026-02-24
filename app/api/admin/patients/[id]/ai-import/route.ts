import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { callAI } from "@/lib/ai-provider";
import { extractText } from "@/lib/docling";
import fs from "fs";
import path from "path";

const RED_FLAG_KEYS = [
  "unexplainedWeightLoss", "nightPain", "traumaHistory", "neurologicalSymptoms",
  "bladderBowelDysfunction", "recentInfection", "cancerHistory", "steroidUse",
  "osteoporosisRisk", "cardiovascularSymptoms", "severeHeadache", "dizzinessBalanceIssues",
];

// POST — Process clinical text + uploaded documents with AI
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const patientId = params.id;
  const therapistId = (session.user as any).id;

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { id: true, firstName: true, lastName: true, clinicId: true, role: true },
  });
  if (!patient || patient.role !== "PATIENT") {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const clinicalText = (formData.get("clinicalText") as string) || "";
  const files = formData.getAll("files") as File[];

  // 1. Extract text from uploaded PDFs/images
  let extractedTexts: string[] = [];
  const savedFiles: { filename: string; filepath: string; type: string }[] = [];

  for (const file of files) {
    try {
      // Save the file locally
      const uploadDir = path.join(process.cwd(), "public", "uploads", "documents", patientId);
      fs.mkdirSync(uploadDir, { recursive: true });
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const filepath = path.join(uploadDir, safeName);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filepath, buffer);
      savedFiles.push({ filename: file.name, filepath: `/uploads/documents/${patientId}/${safeName}`, type: file.type });

      // Try to extract text via Docling
      try {
        const extracted = await extractText(file, file.name);
        if (extracted?.text) {
          extractedTexts.push(`--- Document: ${file.name} ---\n${extracted.text}`);
        } else if (extracted?.content) {
          extractedTexts.push(`--- Document: ${file.name} ---\n${extracted.content}`);
        }
      } catch (doclingErr: any) {
        console.warn(`[ai-import] Docling extraction failed for ${file.name}: ${doclingErr.message}. Sending to AI directly.`);
        // If Docling fails, we'll still mention the document to the AI
        extractedTexts.push(`--- Document: ${file.name} (text extraction unavailable, type: ${file.type}) ---`);
      }
    } catch (err: any) {
      console.error(`[ai-import] Error processing file ${file.name}:`, err.message);
    }
  }

  // 2. Build the combined input for AI
  const allText = [
    clinicalText ? `=== THERAPIST CLINICAL NOTES ===\n${clinicalText}` : "",
    ...extractedTexts,
  ].filter(Boolean).join("\n\n");

  if (!allText.trim()) {
    return NextResponse.json({ error: "No clinical data provided" }, { status: 400 });
  }

  // 3. Call AI to parse into structured data
  const systemPrompt = `You are a clinical data extraction AI for a physiotherapy/rehabilitation clinic.
Given the clinical text and document contents, extract structured patient data.

Return a JSON object with these fields:
{
  "screening": {
    "redFlags": { "unexplainedWeightLoss": false, "nightPain": false, "traumaHistory": false, "neurologicalSymptoms": false, "bladderBowelDysfunction": false, "recentInfection": false, "cancerHistory": false, "steroidUse": false, "osteoporosisRisk": false, "cardiovascularSymptoms": false, "severeHeadache": false, "dizzinessBalanceIssues": false },
    "currentMedications": "string or null",
    "allergies": "string or null",
    "surgicalHistory": "string or null",
    "otherConditions": "string or null",
    "gpDetails": "string or null"
  },
  "soapNotes": [
    {
      "subjective": "patient complaints and history",
      "objective": "clinical findings and observations",
      "assessment": "clinical assessment and diagnosis",
      "plan": "treatment plan"
    }
  ],
  "documents": [
    {
      "title": "document title",
      "content": "summary of the document",
      "documentType": "MEDICAL_REFERRAL | MEDICAL_REPORT | PRESCRIPTION | IMAGING | PREVIOUS_TREATMENT | OTHER"
    }
  ]
}

Rules:
- Set red flags to true ONLY if clearly mentioned in the text
- Create SOAP notes for each distinct clinical encounter or visit mentioned
- If the text is a general history overview, create one comprehensive SOAP note
- For documents section, create entries only for distinct documents/reports mentioned
- Use null for fields where no information is available
- Be thorough but accurate — do not invent data
- Return ONLY valid JSON, no markdown fences`;

  try {
    const aiResponse = await callAI(
      `Patient: ${patient.firstName} ${patient.lastName}\n\n${allText}`,
      {
        systemPrompt,
        temperature: 0.3,
        maxTokens: 4096,
        jsonMode: true,
      }
    );

    // Parse AI response
    let parsed: any;
    try {
      // Strip markdown fences if present
      const cleaned = aiResponse.replace(/^```json?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON. Please try again." }, { status: 500 });
    }

    // 4. Save extracted data to database
    let screeningResult: any = null;
    let soapNotesCreated = 0;
    let documentsCreated = 0;

    // 4a. Create/update screening
    if (parsed.screening) {
      const screeningData: any = {
        clinicId: patient.clinicId,
        isSubmitted: true,
        consentGiven: true,
      };

      // Red flags
      if (parsed.screening.redFlags) {
        for (const key of RED_FLAG_KEYS) {
          screeningData[key] = !!parsed.screening.redFlags[key];
        }
      }

      // Text fields
      for (const key of ["currentMedications", "allergies", "surgicalHistory", "otherConditions", "gpDetails"]) {
        if (parsed.screening[key]) {
          screeningData[key] = parsed.screening[key];
        }
      }

      const existing = await (prisma as any).medicalScreening.findUnique({ where: { userId: patientId } });
      if (existing) {
        await (prisma as any).medicalScreening.update({ where: { userId: patientId }, data: screeningData });
      } else {
        await (prisma as any).medicalScreening.create({ data: { ...screeningData, userId: patientId } });
      }

      const redFlagsCount = RED_FLAG_KEYS.filter((k) => screeningData[k]).length;
      screeningResult = {
        conditions: parsed.screening.otherConditions ? [parsed.screening.otherConditions] : [],
        medications: parsed.screening.currentMedications || null,
        redFlagsCount,
      };
    }

    // 4b. Create SOAP notes
    if (parsed.soapNotes && Array.isArray(parsed.soapNotes)) {
      for (const note of parsed.soapNotes) {
        if (note.subjective || note.objective || note.assessment || note.plan) {
          await (prisma as any).clinicalNote.create({
            data: {
              clinicId: patient.clinicId,
              patientId,
              therapistId,
              subjective: note.subjective || "",
              objective: note.objective || "",
              assessment: note.assessment || "",
              plan: note.plan || "",
            },
          });
          soapNotesCreated++;
        }
      }
    }

    // 4c. Save uploaded files as documents + AI-generated document entries
    for (const sf of savedFiles) {
      await (prisma as any).patientDocument.create({
        data: {
          clinicId: patient.clinicId,
          patientId,
          uploadedById: therapistId,
          title: sf.filename,
          filePath: sf.filepath,
          fileType: sf.type,
          documentType: "OTHER",
          source: "ADMIN_UPLOAD",
          extractedText: extractedTexts.find((t) => t.includes(sf.filename))?.replace(/^---.*---\n/, "") || null,
        },
      });
      documentsCreated++;
    }

    // Create AI-generated clinical history document entries
    if (parsed.documents && Array.isArray(parsed.documents)) {
      for (const doc of parsed.documents) {
        if (doc.content) {
          await (prisma as any).patientDocument.create({
            data: {
              clinicId: patient.clinicId,
              patientId,
              uploadedById: therapistId,
              title: doc.title || "Clinical History",
              content: doc.content,
              documentType: doc.documentType || "OTHER",
              source: "ADMIN_UPLOAD",
              aiSummary: doc.content,
            },
          });
          documentsCreated++;
        }
      }
    }

    // Save the clinical text as a document too if provided
    if (clinicalText.trim()) {
      await (prisma as any).patientDocument.create({
        data: {
          clinicId: patient.clinicId,
          patientId,
          uploadedById: therapistId,
          title: "Therapist Clinical Notes (AI Import)",
          content: clinicalText,
          documentType: "PREVIOUS_TREATMENT",
          source: "ADMIN_UPLOAD",
        },
      });
      documentsCreated++;
    }

    return NextResponse.json({
      success: true,
      importId: `import-${Date.now()}`,
      screening: screeningResult,
      soapNotesCreated,
      documentsCreated,
      message: "AI Import processed successfully",
    });
  } catch (err: any) {
    console.error("[ai-import] AI processing error:", err.message);
    return NextResponse.json({ error: `AI processing failed: ${err.message}` }, { status: 500 });
  }
}

// PATCH — Confirm AI import (currently a no-op since we save immediately, but kept for future review flow)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Data is already saved in POST. This endpoint confirms the admin has reviewed it.
  return NextResponse.json({ success: true, message: "Import confirmed" });
}
