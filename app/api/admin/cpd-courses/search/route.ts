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
  "injection_therapy",
  "prescribing_rights",
  "diagnostic_ultrasound",
  "msk_sonography",
  "advanced_practice",
  "first_contact_practitioner",
  "return_to_sport",
  "strength_conditioning",
  "nutrition_supplementation",
  "mental_health_wellbeing",
];

const SEARCH_MODES = [
  { value: "cpd", label: "CPD Courses & Workshops" },
  { value: "licence", label: "Licences & New Qualifications" },
  { value: "all", label: "Everything (CPD + Licences)" },
];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postcode, interests, type, radius, searchMode } = await req.json();

  if (!postcode) {
    return NextResponse.json({ error: "Postcode is required" }, { status: 400 });
  }

  const interestList = interests?.length > 0
    ? interests.join(", ")
    : "shockwave therapy, MLS laser therapy, sports rehabilitation, biomechanical assessment, electrotherapy, pain management, clinical pilates";

  const typeFilter = type === "online" ? "ONLINE ONLY" : type === "in_person" ? "IN-PERSON ONLY" : "both online and in-person";
  const radiusInfo = radius ? `within ${radius} miles of postcode ${postcode}` : `near postcode ${postcode} (within 50 miles)`;

  const mode = searchMode || "all";

  const licenceBlock = mode !== "cpd" ? `

LICENCES & ADDITIONAL QUALIFICATIONS TO SEARCH:
As a HCPC-registered physiotherapist in the UK, Bruno can expand his scope of practice with:

1. INJECTION THERAPY — Musculoskeletal injection courses (corticosteroid, hyaluronic acid, PRP). Physios can legally inject in the UK with appropriate training.
   - Providers: CSP Injection Therapy courses, Arthritis Research UK, University post-grad certs
   
2. INDEPENDENT/SUPPLEMENTARY PRESCRIBING — Physiotherapist Independent Prescriber (PIP). Allows prescribing from BNF. University-level qualification.
   - Providers: UK universities with HCPC-approved prescribing programmes
   
3. DIAGNOSTIC ULTRASOUND / MSK SONOGRAPHY — Real-time imaging for diagnosis, not just therapy ultrasound.
   - Providers: Case4Health, Musculoskeletal Ultrasound courses, university PgCerts
   
4. FIRST CONTACT PRACTITIONER (FCP) — NHS pathway. Allows direct access without GP referral.
   - Providers: HEE, CSP FCP training, NHS credential pathway
   
5. ADVANCED CLINICAL PRACTITIONER (ACP) — MSc-level. Broadest scope: assess, diagnose, treat, prescribe, refer.
   - Providers: University MSc programmes, HEE credential
   
6. ACUPUNCTURE / DRY NEEDLING — AACP membership + training allows physios to needle.
   - Providers: AACP Foundation & Advanced courses
   
7. STRENGTH & CONDITIONING (CSCS/ASCC) — Certified S&C coach for return-to-sport.
   - Providers: UKSCA, NSCA (CSCS)
   
8. SPORTS MEDICINE DIPLOMA — Extended scope in sports medicine.
   - Providers: University of Bath, University of Glasgow, FIFA Diploma
   
9. PLATELET-RICH PLASMA (PRP) — Licence to perform PRP injections.
   - Providers: RCGP courses, private training companies
   
10. CLINICAL NUTRITION / SUPPLEMENTATION — Understanding prescription of supplements for recovery.
    - Providers: IOC Diploma in Sports Nutrition, SENR registration
    
11. OCCUPATIONAL HEALTH — Workplace assessments, DSE, ergonomics.
    - Providers: University post-grad programmes, IOSH courses` : "";

  const cpdBlock = mode !== "licence" ? `

CPD COURSES & WORKSHOPS TO SEARCH:
- Chartered Society of Physiotherapy (CSP) courses
- AACP (acupuncture for physios)
- EMS/Storz/BTL manufacturer training (shockwave, laser, electrotherapy)
- University post-graduate certificates/diplomas
- Sports Medicine conferences
- Pain Science courses (NOI Group, Explain Pain, Butler/Moseley)
- BSRM courses (rehabilitation medicine)
- PhysioFirst courses
- Private training companies (Kinetic Control, MACP, MCSP advanced)
- Equipment manufacturer advanced certifications` : "";

  const prompt = `You are a professional development and licensing discovery agent for a UK-based physiotherapist named Bruno who owns "Bruno Physical Rehabilitation" (BPR) clinic in Richmond (London) and Ipswich (Suffolk).

BRUNO'S PROFILE:
- Ex-professional footballer (played in Brazil, Germany, Sweden), had 3 major knee surgeries
- Now a qualified HCPC-registered physiotherapist in the UK
- Specialises in: MLS Laser Therapy, Shockwave Therapy, Biomechanical Assessment (AI-powered), Electrotherapy, Sports Injury, Chronic Pain, Custom Insoles (3D foot scanning)
- Equipment: MLS Mphi 75 Laser (£30k), Shockwave machine, Infrared Thermography, 3D Foot Scanner
- Looking to specialise further, expand scope of practice, gain new licences/credentials to offer more services
- Postcode: ${postcode}

TASK: Find and recommend ${typeFilter} ${mode === "licence" ? "licensing programmes, certifications, and new qualifications" : mode === "cpd" ? "CPD courses, training, and workshops" : "CPD courses, licensing programmes, certifications, new qualifications, and professional development"} that are relevant to Bruno's practice and career growth.

FOCUS AREAS: ${interestList}

SEARCH SCOPE: 
- ${typeFilter === "ONLINE ONLY" ? "Online courses accessible from the UK" : typeFilter === "IN-PERSON ONLY" ? `In-person courses/workshops ${radiusInfo}` : `Both online and in-person courses. For in-person, focus ${radiusInfo}`}
- UK-based providers preferred (HCPC-approved, university programmes, CSP, AACP, NHS pathway)
- International online courses from reputable providers also welcome
${licenceBlock}${cpdBlock}

IMPORTANT: Generate REALISTIC opportunities from REAL UK providers. Use your knowledge of actual organisations, universities, and the UK regulatory framework for physiotherapy scope of practice.

Return a JSON array of 8-12 opportunities. Each MUST have:
{
  "title": "Course/Programme title",
  "provider": "Organisation name",
  "url": "https://realistic-url.example.com/course (use real org domains where possible)",
  "description": "2-3 sentence description of what the course covers and what qualification/licence it grants",
  "aiSummary": "Why this is relevant for Bruno specifically — how it connects to his practice, equipment, revenue potential, or growth goals. Include what new services he could offer after completing this.",
  "category": "one of: ${CATEGORIES.join(", ")}",
  "type": "online | in_person | hybrid",
  "location": "City/venue or 'Online' for online courses",
  "postcode": "Venue postcode for in-person, null for online",
  "distance": "Estimated distance from ${postcode} for in-person, null for online",
  "cost": "Price in GBP (e.g. '£350', '£1,200', '£4,500 per year')",
  "duration": "e.g. '2 days', '6 weeks online', '1 year part-time', 'MSc 2-3 years'",
  "startDate": "Approximate next available date (e.g. 'September 2026', 'Monthly intake', 'On-demand')",
  "accreditation": "e.g. '12 CPD points', 'HCPC approved', 'Grants prescribing rights', 'Level 7 MSc credits', 'Allows injection therapy'",
  "relevanceScore": number 1-100 (how relevant and impactful this is for Bruno's practice growth and revenue)
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
