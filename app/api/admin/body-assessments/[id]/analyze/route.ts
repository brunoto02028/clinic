import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getConfigValue } from "@/lib/system-config";

async function imageToBase64(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:")) return url;
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = response.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

function buildAnalysisPrompt(): string {
  return `You are an expert biomechanical assessment specialist and physiotherapist. Analyze the provided body images (frontal, posterior, left lateral, right lateral views) and provide a comprehensive biomechanical assessment.

For each image, identify and evaluate:

1. **POSTURE ANALYSIS**: Head position, shoulder level/symmetry, thoracic kyphosis, lumbar lordosis, pelvic tilt, knee alignment (valgus/varus/recurvatum), ankle/foot alignment.

2. **MOTOR POINTS MAPPING**: For each identified motor point: name, body region, status (normal/hypertonic/hypotonic/trigger_point), severity (0-10), clinical notes. Assess: upper trapezius, levator scapulae, SCM, pectorals, rhomboids, latissimus dorsi, erector spinae, quadratus lumborum, gluteals, piriformis, hip flexors, quadriceps, hamstrings, adductors, TFL/ITB, gastrocnemius/soleus, tibialis anterior.

3. **SYMMETRY ANALYSIS**: Left vs right comparison per region with asymmetry percentage.

4. **JOINT ANGLES** (estimated from images): Cervical, shoulder, thoracic kyphosis, lumbar lordosis, hip, knee, ankle angles.

5. **ALIGNMENT DATA**: Plumb line deviations (frontal/sagittal), shoulder/hip/knee level differences (mm).

6. **KINETIC CHAIN**: Compensatory patterns, cause-effect relationships, primary dysfunction areas.

7. **MOVEMENT PATTERNS** (if videos provided): Squat, Gait, Overhead Squat, Single Leg Balance, Lunge, Hip Hinge.

8. **SEGMENT SCORES** (0-100): Score each body segment independently — head/neck, shoulders, spine/trunk, hips/pelvis, knees, ankles/feet.

9. **DEVIATION LABELS**: For every abnormal finding, provide a visual label with the affected joint/landmark name so it can be drawn on the skeleton. Include: the landmark name (from MediaPipe BlazePose), a short clinical label (e.g. "Forward Head", "Excessive Knee Valgus", "Anterior Pelvic Tilt", "Pronation", "Shoulder Elevation"), severity, and the measured/estimated angle.

10. **IDEAL vs ACTUAL COMPARISON**: For each major joint, provide the current measured angle, the ideal/normal angle, and the deviation in degrees. This helps visualize "Your Position" vs "Ideal Position".

11. **GAIT METRICS** (estimate from available data): ground contact time (ms), time of flight (ms), stride length (cm), cadence (steps/min), vertical oscillation (cm), foot strike angle, pronation angle.

12. **CORRECTIVE EXERCISES**: Based on findings, suggest 4-8 specific corrective exercises. Each must include: exercise name, target area, which finding it addresses, difficulty (beginner/intermediate/advanced), sets, reps, hold duration, step-by-step instructions, benefits, and muscles targeted.

13. **SCOLIOSIS SCREENING** (if back/posterior view available): Assess for signs of scoliosis — shoulder height difference, scapular prominence, waistline asymmetry, trunk shift, estimated Cobb angle, Adams forward bend test prediction, classification (structural vs functional).

Return your analysis as a JSON object with this EXACT structure:
{
  "postureAnalysis": {
    "frontalPlane": { "headTilt": "", "shoulderLevel": "", "hipLevel": "", "kneeAlignment": "", "overallFrontal": "" },
    "sagittalPlane": { "headForward": "", "thoracicKyphosis": "", "lumbarLordosis": "", "pelvicTilt": "", "kneePosition": "", "overallSagittal": "" },
    "scoliosisScreening": {
      "shoulderHeightDiff": "", "scapularProminence": "", "waistlineAsymmetry": "", "trunkShift": "",
      "estimatedCobbAngle": 0, "classification": "none|functional|structural", "severity": "none|mild|moderate|severe",
      "adamsTestPrediction": "", "notes": ""
    },
    "summary": ""
  },
  "motorPoints": [
    { "id": "1", "name": "Upper Trapezius R", "bodyRegion": "shoulder", "x": 0.65, "y": 0.15, "status": "hypertonic", "severity": 7, "notes": "Elevated, increased tone" }
  ],
  "symmetryAnalysis": {
    "shoulders": { "left": "", "right": "", "asymmetryPercent": 0, "notes": "" },
    "hips": { "left": "", "right": "", "asymmetryPercent": 0, "notes": "" },
    "knees": { "left": "", "right": "", "asymmetryPercent": 0, "notes": "" },
    "overall": { "asymmetryScore": 0, "dominantSide": "", "notes": "" }
  },
  "jointAngles": {
    "cervical": { "flexion": 0, "lateralTilt": 0 },
    "shoulders": { "left": { "elevation": 0, "protraction": 0 }, "right": { "elevation": 0, "protraction": 0 } },
    "thoracic": { "kyphosisAngle": 0 },
    "lumbar": { "lordosisAngle": 0 },
    "hips": { "left": { "flexion": 0, "tilt": 0 }, "right": { "flexion": 0, "tilt": 0 } },
    "knees": { "left": { "valgus": 0, "flexion": 0 }, "right": { "valgus": 0, "flexion": 0 } },
    "ankles": { "left": { "dorsiflexion": 0 }, "right": { "dorsiflexion": 0 } }
  },
  "alignmentData": {
    "plumbLineFrontal": { "deviations": [], "overallShift": "" },
    "plumbLineSagittal": { "deviations": [], "overallShift": "" },
    "shoulderLevelDiff": 0,
    "hipLevelDiff": 0,
    "kneeLevelDiff": 0
  },
  "kineticChain": {
    "compensations": [{ "area": "", "pattern": "", "likelyCause": "", "affectedAreas": [] }],
    "primaryDysfunction": "",
    "secondaryDysfunctions": []
  },
  "movementPatterns": {
    "squat": { "depth": "", "kneeTracking": "", "trunkLean": "", "heelRise": false, "weightShift": "", "quality": 0, "compensations": [], "notes": "" },
    "gait": { "strideSymmetry": "", "armSwing": "", "trunkRotation": "", "footStrike": "", "lateralSway": "", "cadence": "", "notes": "" },
    "overheadSquat": { "armDrift": "", "thoracicMobility": "", "compensations": [], "notes": "" },
    "singleLegBalance": { "left": { "timeHeld": 0, "trunkSway": "", "hipDrop": "", "strategy": "" }, "right": { "timeHeld": 0, "trunkSway": "", "hipDrop": "", "strategy": "" } },
    "lunge": { "kneeStability": "", "trunkAlignment": "", "stepLengthSymmetry": "", "notes": "" },
    "hipHinge": { "hamstringFlexibility": "", "lumbarControl": "", "hipSpineRatio": "", "notes": "" }
  },
  "scores": {
    "postureScore": 0,
    "symmetryScore": 0,
    "mobilityScore": 0,
    "overallScore": 0
  },
  "segmentScores": {
    "head": { "score": 0, "status": "good|fair|poor", "keyIssue": "" },
    "shoulders": { "score": 0, "status": "good|fair|poor", "keyIssue": "" },
    "spine": { "score": 0, "status": "good|fair|poor", "keyIssue": "" },
    "hips": { "score": 0, "status": "good|fair|poor", "keyIssue": "" },
    "knees": { "score": 0, "status": "good|fair|poor", "keyIssue": "" },
    "ankles": { "score": 0, "status": "good|fair|poor", "keyIssue": "" }
  },
  "deviationLabels": [
    { "joint": "nose", "label": "Forward Head Posture", "severity": "moderate", "angleDeg": 15, "direction": "anterior", "description": "Head positioned 15° anterior to plumb line" }
  ],
  "idealComparison": [
    { "segment": "Cervical Spine", "landmark": "nose", "currentAngle": 15, "idealAngle": 0, "deviationDeg": 15, "status": "deviation", "plane": "sagittal" }
  ],
  "gaitMetrics": {
    "groundContactTimeMs": 0,
    "timeOfFlightMs": 0,
    "strideLengthCm": 0,
    "cadenceSpm": 0,
    "verticalOscillationCm": 0,
    "footStrikeAngle": 0,
    "pronationAngle": 0,
    "overstridePercent": 0,
    "notes": ""
  },
  "correctiveExercises": [
    {
      "name": "Chin Tucks",
      "targetArea": "cervical",
      "finding": "Forward head posture",
      "difficulty": "beginner",
      "sets": 3,
      "reps": 10,
      "holdSeconds": 5,
      "instructions": "Sit tall. Draw chin straight back creating a double chin. Hold 5 seconds. Release.",
      "benefits": "Strengthens deep neck flexors, corrects forward head posture",
      "musclesTargeted": ["deep cervical flexors", "longus colli", "longus capitis"]
    }
  ],
  "findings": [
    { "area": "", "finding": "", "severity": "mild|moderate|severe", "recommendation": "", "icon": "alert|warning|info|check", "category": "posture|symmetry|mobility|alignment|scoliosis" }
  ],
  "summary": "",
  "recommendations": ""
}

IMPORTANT RULES:
- Be thorough and clinical. Use proper anatomical terminology.
- Base severity scores on visible evidence only.
- All angles must be numeric (degrees).
- Segment scores must be 0-100 where 100 is perfect.
- Deviation labels must reference valid MediaPipe BlazePose landmark names: nose, left_eye, right_eye, left_ear, right_ear, left_shoulder, right_shoulder, left_elbow, right_elbow, left_wrist, right_wrist, left_hip, right_hip, left_knee, right_knee, left_ankle, right_ankle, left_heel, right_heel, left_foot_index, right_foot_index.
- Corrective exercises must be practical, evidence-based, and directly address identified findings.
- If posterior view is available, always assess for scoliosis signs.`;
}

// POST - Run AI analysis on body assessment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assessment = await (prisma as any).bodyAssessment.findUnique({
      where: { id: params.id },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Collect all available images
    const imageUrls: string[] = [];
    const imageLabels: string[] = [];

    if (assessment.frontImageUrl) {
      imageUrls.push(assessment.frontImageUrl);
      imageLabels.push("FRONTAL VIEW");
    }
    if (assessment.backImageUrl) {
      imageUrls.push(assessment.backImageUrl);
      imageLabels.push("POSTERIOR VIEW");
    }
    if (assessment.leftImageUrl) {
      imageUrls.push(assessment.leftImageUrl);
      imageLabels.push("LEFT LATERAL VIEW");
    }
    if (assessment.rightImageUrl) {
      imageUrls.push(assessment.rightImageUrl);
      imageLabels.push("RIGHT LATERAL VIEW");
    }

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: "No images available for analysis. Please capture images first." },
        { status: 400 }
      );
    }

    // Update status to analyzing
    await (prisma as any).bodyAssessment.update({
      where: { id: params.id },
      data: { status: "ANALYZING" },
    });

    // Collect landmark data for enhanced analysis
    const landmarkInfo: string[] = [];
    if (assessment.frontLandmarks) landmarkInfo.push(`Front landmarks: ${JSON.stringify(assessment.frontLandmarks)}`);
    if (assessment.backLandmarks) landmarkInfo.push(`Back landmarks: ${JSON.stringify(assessment.backLandmarks)}`);
    if (assessment.leftLandmarks) landmarkInfo.push(`Left landmarks: ${JSON.stringify(assessment.leftLandmarks)}`);
    if (assessment.rightLandmarks) landmarkInfo.push(`Right landmarks: ${JSON.stringify(assessment.rightLandmarks)}`);

    // Build Gemini request with vision
    const geminiKey = await getConfigValue('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }
    const geminiModel = (await getConfigValue('GEMINI_MODEL')) || 'gemini-2.0-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;

    const parts: any[] = [
      { text: "You are a biomechanical assessment AI. Always respond with valid JSON only, no markdown formatting or code blocks.\n\n" + buildAnalysisPrompt() },
    ];

    for (let i = 0; i < imageUrls.length; i++) {
      parts.push({ text: `\n--- ${imageLabels[i]} ---` });
      const base64 = await imageToBase64(imageUrls[i]);
      if (base64) {
        const match = base64.match(/^data:(.+?);base64,(.+)$/);
        if (match) {
          parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        }
      }
    }

    if (landmarkInfo.length > 0) {
      parts.push({ text: `\n--- POSE DETECTION LANDMARKS (MediaPipe BlazePose) ---\n${landmarkInfo.join("\n")}` });
    }

    if (assessment.movementVideos && Array.isArray(assessment.movementVideos) && assessment.movementVideos.length > 0) {
      const videoInfo = assessment.movementVideos.map((v: any) => 
        `- ${v.label || v.testType}: ${v.duration}s recorded`
      ).join("\n");
      parts.push({ text: `\n--- MOVEMENT TESTS RECORDED ---\n${videoInfo}` });
    }

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 8000 },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      throw new Error(`Gemini API error (${geminiRes.status})`);
    }

    const geminiData = await geminiRes.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from response
    let analysisData: any = {};
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      analysisData = { rawResponse: responseText };
    }

    // Update assessment with AI results
    const updated = await (prisma as any).bodyAssessment.update({
      where: { id: params.id },
      data: {
        postureAnalysis: analysisData.postureAnalysis || null,
        symmetryAnalysis: analysisData.symmetryAnalysis || null,
        jointAngles: analysisData.jointAngles || null,
        alignmentData: analysisData.alignmentData || null,
        movementPatterns: analysisData.movementPatterns || null,
        kineticChain: analysisData.kineticChain || null,
        motorPoints: analysisData.motorPoints || null,
        postureScore: analysisData.scores?.postureScore || null,
        symmetryScore: analysisData.scores?.symmetryScore || null,
        mobilityScore: analysisData.scores?.mobilityScore || null,
        overallScore: analysisData.scores?.overallScore || null,
        segmentScores: analysisData.segmentScores || null,
        gaitMetrics: analysisData.gaitMetrics || null,
        correctiveExercises: analysisData.correctiveExercises || null,
        deviationLabels: analysisData.deviationLabels || null,
        idealComparison: analysisData.idealComparison || null,
        aiSummary: analysisData.summary || null,
        aiRecommendations: analysisData.recommendations || null,
        aiFindings: analysisData.findings || null,
        aiProcessedAt: new Date(),
        status: "PENDING_REVIEW",
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        therapist: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error analyzing body assessment:", error);

    // Revert status on failure
    try {
      await (prisma as any).bodyAssessment.update({
        where: { id: params.id },
        data: { status: "PENDING_ANALYSIS" },
      });
    } catch {}

    return NextResponse.json(
      { error: "Failed to analyze body assessment" },
      { status: 500 }
    );
  }
}
