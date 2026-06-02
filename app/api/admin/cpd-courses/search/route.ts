import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { callAI } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "shockwave_therapy",
  "laser_therapy",
  "sports_rehabilitation",
  "manual_therapy",
  "electrotherapy",
  "biomechanics",
  "exercise_therapy",
  "pain_management",
  "post_surgical_rehab",
  "foot_and_gait",
  "ultrasound_therapy",
  "dry_needling",
  "clinical_pilates",
  "business_and_leadership",
  "general_cpd",
];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postcode, interests, type, radius } = await req.json();

  if (!postcode) {
    return NextResponse.json({ error: "Postcode is required" }, { status: 400 });
  }

  const interestList = interests?.length > 0
    ? interests.join(", ")
    : "shockwave therapy, MLS laser therapy, sports rehabilitation, biomechanical assessment, electrotherapy, pain management, clinical pilates";

  const typeFilter = type === "online" ? "ONLINE ONLY" : type === "in_person" ? "IN-PERSON ONLY" : "both online and in-person";
  const radiusInfo = radius ? `within ${radius} miles of postcode ${postcode}` : `near postcode ${postcode} (within 50 miles)`;

  const prompt = `You are a CPD (Continuing Professional Development) course discovery agent for a UK-based physiotherapist named Bruno who owns "Bruno Physical Rehabilitation" (BPR) clinic in Richmond (London) and Ipswich (Suffolk).

BRUNO'S PROFILE:
- Ex-professional footballer (played in Brazil, Germany, Sweden), had 3 major knee surgeries
- Now a qualified physiotherapist in the UK
- Specialises in: MLS Laser Therapy, Shockwave Therapy, Biomechanical Assessment (AI-powered), Electrotherapy, Sports Injury, Chronic Pain, Custom Insoles (3D foot scanning)
- Equipment: MLS Mphi 75 Laser (£30k), Shockwave machine, Infrared Thermography, 3D Foot Scanner
- Looking to specialise further and stay ahead of the competition
- Postcode: ${postcode}

TASK: Find and recommend ${typeFilter} CPD courses, training, workshops, and certification programmes that are relevant to Bruno's practice.

FOCUS AREAS: ${interestList}

SEARCH SCOPE: 
- ${typeFilter === "ONLINE ONLY" ? "Online courses accessible from the UK" : typeFilter === "IN-PERSON ONLY" ? `In-person courses/workshops ${radiusInfo}` : `Both online and in-person courses. For in-person, focus ${radiusInfo}`}
- UK-based providers preferred (CSP, AACP, HCPC-approved, university post-grad, equipment manufacturers)
- International online courses from reputable providers also welcome

IMPORTANT: Generate REALISTIC courses from REAL UK physiotherapy CPD providers. Use your knowledge of actual organisations and typical courses they offer. Include:
- Chartered Society of Physiotherapy (CSP) courses
- AACP (acupuncture for physios)
- EMS/Storz/BTL manufacturer training
- University post-graduate certificates/diplomas
- Sports Medicine conferences
- Pain Science courses (NOI Group, Explain Pain)
- BSRM courses
- PhysioFirst courses
- Private training companies (e.g. Kinetic Control, MACP, MCSP advanced courses)

Return a JSON array of 8-12 course opportunities. Each course MUST have:
{
  "title": "Course title",
  "provider": "Organisation name",
  "url": "https://realistic-url.example.com/course (use real org domains where possible)",
  "description": "2-3 sentence description of what the course covers",
  "aiSummary": "Why this is relevant for Bruno specifically — how it connects to his practice, equipment, or growth goals",
  "category": "one of: ${CATEGORIES.join(", ")}",
  "type": "online | in_person | hybrid",
  "location": "City/venue or 'Online' for online courses",
  "postcode": "Venue postcode for in-person, null for online",
  "distance": "Estimated distance from ${postcode} for in-person, null for online",
  "cost": "Price in GBP (e.g. '£350', '£1,200', 'Free for CSP members')",
  "duration": "e.g. '2 days', '6 weeks online', '3-day intensive'",
  "startDate": "Approximate next available date (e.g. 'September 2026', 'Monthly intake', 'On-demand')",
  "accreditation": "e.g. '12 CPD points', 'HCPC approved', 'CSP endorsed', 'Level 7 credits'",
  "relevanceScore": number 1-100 (how relevant this is for Bruno's specific practice and growth)
}

Return ONLY the JSON array, no markdown, no explanation.`;

  try {
    const rawResponse = await callAI(prompt, {
      temperature: 0.8,
      maxTokens: 8192,
    });

    // Parse JSON array from response
    let courses: any[] = [];
    const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        courses = JSON.parse(jsonMatch[0]);
      } catch {
        // Try cleaning markdown
        const cleaned = rawResponse.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
        const retryMatch = cleaned.match(/\[[\s\S]*\]/);
        if (retryMatch) courses = JSON.parse(retryMatch[0]);
      }
    }

    if (!courses.length) {
      return NextResponse.json({ error: "AI did not return valid course data. Please try again." }, { status: 422 });
    }

    // Save courses to database (avoid duplicates by title+provider)
    const saved: any[] = [];
    for (const course of courses) {
      // Check for existing duplicate
      const existing = await prisma.courseOpportunity.findFirst({
        where: {
          title: course.title,
          provider: course.provider,
        },
      });

      if (existing) {
        // Update existing with fresh data
        const updated = await prisma.courseOpportunity.update({
          where: { id: existing.id },
          data: {
            description: course.description || existing.description,
            aiSummary: course.aiSummary || existing.aiSummary,
            cost: course.cost || existing.cost,
            startDate: course.startDate || existing.startDate,
            relevanceScore: course.relevanceScore || existing.relevanceScore,
            searchQuery: interestList,
            searchPostcode: postcode,
          },
        });
        saved.push(updated);
      } else {
        const created = await prisma.courseOpportunity.create({
          data: {
            title: course.title || "Untitled Course",
            provider: course.provider || "Unknown",
            url: course.url || null,
            description: course.description || "",
            aiSummary: course.aiSummary || null,
            category: course.category || "general_cpd",
            type: course.type || "online",
            location: course.location || null,
            postcode: course.postcode || null,
            distance: course.distance || null,
            cost: course.cost || null,
            duration: course.duration || null,
            startDate: course.startDate || null,
            accreditation: course.accreditation || null,
            relevanceScore: Math.min(100, Math.max(0, parseInt(course.relevanceScore) || 50)),
            status: "new",
            searchQuery: interestList,
            searchPostcode: postcode,
          },
        });
        saved.push(created);
      }
    }

    return NextResponse.json({
      success: true,
      found: courses.length,
      saved: saved.length,
      courses: saved,
    });
  } catch (error: any) {
    console.error("[cpd-courses] Search error:", error);
    return NextResponse.json({ error: error.message || "Failed to search for courses" }, { status: 500 });
  }
}
