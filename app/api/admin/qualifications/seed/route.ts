import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST — Seed Bruno's existing qualifications (run once)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existingCount = await prisma.qualification.count();
  if (existingCount > 0) {
    return NextResponse.json({ message: "Qualifications already seeded", count: existingCount });
  }

  const qualifications = [
    {
      title: "Bacharelado em Ciências Biológica - Modalidade Medica (Physiotherapy)",
      provider: "Faculdade de Americana",
      providerUrl: null,
      certificateNumber: "UK ENIC 4002353901",
      dateAchieved: new Date("2002-12-01"),
      cpdHours: null,
      level: "RQF Level 4 / SCQF Level 7",
      category: "degree",
      accreditation: "UK ENIC Statement of Comparability",
      tutor: null,
      location: "Americana, São Paulo, Brazil",
      description: "4-year Physiotherapy and Biological Sciences degree (incomplete). UK ENIC assessed as RQF Level 4. No direct UK comparison.",
      status: "completed",
      notes: "Brazilian degree. UK ENIC issued 23 May 2025. Incomplete but assessed at RQF Level 4.",
    },
    {
      title: "Electrotherapy and Ultrasound",
      provider: "Core Elements Training",
      providerUrl: "https://coreelements.uk.com",
      certificateNumber: "07202507",
      dateAchieved: new Date("2025-07-11"),
      cpdHours: 16,
      level: "CPD",
      category: "electrotherapy",
      accreditation: "STO + FHT accredited",
      tutor: "Dawn Morse MSc",
      location: "8 Bath Road, Swindon, Wiltshire, SN1 4BA",
      description: "Comprehensive CPD course covering therapeutic ultrasound and electrotherapy modalities for musculoskeletal conditions.",
      status: "completed",
      notes: null,
    },
    {
      title: "Dry Needling (Foundation Course)",
      provider: "Core Elements Training",
      providerUrl: "https://coreelements.uk.com",
      certificateNumber: "09202509",
      dateAchieved: new Date("2025-09-12"),
      cpdHours: 22,
      level: "Foundation",
      category: "dry_needling",
      accreditation: "STO + FHT accredited",
      tutor: "Dawn Morse MSc",
      location: "8 Bath Road, Swindon, Wiltshire, SN1 4BA",
      description: "Foundation course in dry needling / acupuncture for trigger point therapy and musculoskeletal pain management.",
      status: "completed",
      notes: null,
    },
    {
      title: "Myofascial Dry Cupping",
      provider: "Core Elements Training",
      providerUrl: "https://coreelements.uk.com",
      certificateNumber: "09202510",
      dateAchieved: new Date("2025-09-15"),
      cpdHours: 8,
      level: "CPD",
      category: "manual_therapy",
      accreditation: "STO + FHT accredited",
      tutor: "Dawn Morse MSc",
      location: "8 Bath Road, Swindon, Wiltshire, SN1 4BA",
      description: "Myofascial dry cupping techniques for soft tissue treatment, pain relief, and recovery enhancement.",
      status: "completed",
      notes: null,
    },
  ];

  const created = await prisma.qualification.createMany({
    data: qualifications,
  });

  return NextResponse.json({ success: true, created: created.count });
}
