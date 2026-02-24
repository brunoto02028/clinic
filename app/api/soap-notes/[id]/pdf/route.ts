export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { id } = params;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const soapNote = await prisma.sOAPNote.findUnique({
      where: { id },
      include: {
        appointment: {
          select: {
            dateTime: true,
            treatmentType: true,
            duration: true,
          },
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        therapist: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!soapNote) {
      return NextResponse.json(
        { error: "Clinical note not found" },
        { status: 404 }
      );
    }

    // Check access
    if (userRole === "PATIENT" && soapNote.patientId !== userId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Generate HTML for PDF
    const dateFormatted = soapNote?.appointment?.dateTime
      ? new Date(soapNote.appointment.dateTime).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "N/A";

    const timeFormatted = soapNote?.appointment?.dateTime
      ? new Date(soapNote.appointment.dateTime).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A";

    const html = `
      <!DOCTYPE html>
      <html lang="en-GB">
      <head>
        <meta charset="UTF-8">
        <title>Clinical Note - ${soapNote?.patient?.firstName ?? ""} ${soapNote?.patient?.lastName ?? ""}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0ea5e9;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #0ea5e9;
            margin-bottom: 5px;
          }
          .header p {
            color: #666;
            margin: 5px 0;
          }
          .patient-info {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .patient-info h2 {
            color: #0ea5e9;
            margin-top: 0;
            font-size: 16px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .info-item {
            margin: 5px 0;
          }
          .info-item strong {
            color: #555;
          }
          .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          .section h3 {
            background: #0ea5e9;
            color: white;
            padding: 10px 15px;
            margin: 0 0 15px 0;
            border-radius: 5px;
            font-size: 14px;
          }
          .section-content {
            padding: 0 15px;
            line-height: 1.6;
          }
          .clinical-data {
            background: #f1f5f9;
            padding: 15px;
            border-radius: 5px;
            margin-top: 10px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body { padding: 20px; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Bruno Physical Rehabilitation</h1>
          <p>Clinical SOAP Note</p>
          <p>The Vineyard, Richmond TW10 6AQ</p>
        </div>

        <div class="patient-info">
          <h2>Patient Information</h2>
          <div class="info-grid">
            <div class="info-item"><strong>Patient Name:</strong> ${soapNote?.patient?.firstName ?? ""} ${soapNote?.patient?.lastName ?? ""}</div>
            <div class="info-item"><strong>Date:</strong> ${dateFormatted}</div>
            <div class="info-item"><strong>Email:</strong> ${soapNote?.patient?.email ?? "N/A"}</div>
            <div class="info-item"><strong>Time:</strong> ${timeFormatted}</div>
            <div class="info-item"><strong>Phone:</strong> ${soapNote?.patient?.phone ?? "N/A"}</div>
            <div class="info-item"><strong>Treatment:</strong> ${soapNote?.appointment?.treatmentType ?? "N/A"}</div>
            <div class="info-item"><strong>Therapist:</strong> ${soapNote?.therapist?.firstName ?? ""} ${soapNote?.therapist?.lastName ?? ""}</div>
            <div class="info-item"><strong>Duration:</strong> ${soapNote?.appointment?.duration ?? 60} minutes</div>
          </div>
        </div>

        <div class="section">
          <h3>S - Subjective (Patient's Description)</h3>
          <div class="section-content">
            ${soapNote?.subjective ?? "Not recorded"}
            ${soapNote?.painLevel !== null ? `<div class="clinical-data"><strong>Pain Level:</strong> ${soapNote.painLevel}/10</div>` : ""}
          </div>
        </div>

        <div class="section">
          <h3>O - Objective (Clinical Findings)</h3>
          <div class="section-content">
            ${soapNote?.objective ?? "Not recorded"}
            ${soapNote?.rangeOfMotion ? `<div class="clinical-data"><strong>Range of Motion:</strong> ${soapNote.rangeOfMotion}</div>` : ""}
            ${soapNote?.functionalTests ? `<div class="clinical-data"><strong>Functional Tests:</strong> ${soapNote.functionalTests}</div>` : ""}
          </div>
        </div>

        <div class="section">
          <h3>A - Assessment (Clinical Reasoning)</h3>
          <div class="section-content">
            ${soapNote?.assessment ?? "Not recorded"}
          </div>
        </div>

        <div class="section">
          <h3>P - Plan (Treatment Plan)</h3>
          <div class="section-content">
            ${soapNote?.plan ?? "Not recorded"}
          </div>
        </div>

        <div class="footer">
          <p>This document is confidential and intended only for the patient named above.</p>
          <p>Generated on ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} at ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
          <p>Bruno Physical Rehabilitation | admin@bpr.rehab</p>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="SOAP-Note-${soapNote?.patient?.firstName ?? "Patient"}-${soapNote?.patient?.lastName ?? ""}-${dateFormatted.replace(/\s/g, "-")}.html"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
