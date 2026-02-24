import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// GET - Get single body assessment
export async function GET(
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
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        therapist: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    return NextResponse.json(assessment);
  } catch (error) {
    console.error("Error fetching body assessment:", error);
    return NextResponse.json(
      { error: "Failed to fetch body assessment" },
      { status: 500 }
    );
  }
}

// PUT - Update body assessment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "THERAPIST" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      status,
      therapistNotes,
      therapistFindings,
      motorPoints,
      frontImageUrl,
      frontImagePath,
      backImageUrl,
      backImagePath,
      leftImageUrl,
      leftImagePath,
      rightImageUrl,
      rightImagePath,
      frontAnnotatedUrl,
      backAnnotatedUrl,
      leftAnnotatedUrl,
      rightAnnotatedUrl,
      frontLandmarks,
      backLandmarks,
      leftLandmarks,
      rightLandmarks,
      captureMetadata,
      movementVideos,
    } = body;

    const updateData: any = {};

    // Image fields
    if (frontImageUrl !== undefined) updateData.frontImageUrl = frontImageUrl;
    if (frontImagePath !== undefined) updateData.frontImagePath = frontImagePath;
    if (backImageUrl !== undefined) updateData.backImageUrl = backImageUrl;
    if (backImagePath !== undefined) updateData.backImagePath = backImagePath;
    if (leftImageUrl !== undefined) updateData.leftImageUrl = leftImageUrl;
    if (leftImagePath !== undefined) updateData.leftImagePath = leftImagePath;
    if (rightImageUrl !== undefined) updateData.rightImageUrl = rightImageUrl;
    if (rightImagePath !== undefined) updateData.rightImagePath = rightImagePath;

    // Annotated images
    if (frontAnnotatedUrl !== undefined) updateData.frontAnnotatedUrl = frontAnnotatedUrl;
    if (backAnnotatedUrl !== undefined) updateData.backAnnotatedUrl = backAnnotatedUrl;
    if (leftAnnotatedUrl !== undefined) updateData.leftAnnotatedUrl = leftAnnotatedUrl;
    if (rightAnnotatedUrl !== undefined) updateData.rightAnnotatedUrl = rightAnnotatedUrl;

    // Landmarks
    if (frontLandmarks !== undefined) updateData.frontLandmarks = frontLandmarks;
    if (backLandmarks !== undefined) updateData.backLandmarks = backLandmarks;
    if (leftLandmarks !== undefined) updateData.leftLandmarks = leftLandmarks;
    if (rightLandmarks !== undefined) updateData.rightLandmarks = rightLandmarks;

    // Other data
    if (captureMetadata !== undefined) updateData.captureMetadata = captureMetadata;
    if (movementVideos !== undefined) updateData.movementVideos = movementVideos;
    if (motorPoints !== undefined) updateData.motorPoints = motorPoints;

    // Therapist fields
    if (therapistNotes !== undefined) updateData.therapistNotes = therapistNotes;
    if (therapistFindings !== undefined) updateData.therapistFindings = therapistFindings;

    // Status
    if (status) updateData.status = status;

    // If therapist is reviewing, record review timestamp
    if (status === "REVIEWED" || status === "COMPLETED") {
      updateData.reviewedAt = new Date();
    }

    const assessment = await (prisma as any).bodyAssessment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        therapist: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(assessment);
  } catch (error) {
    console.error("Error updating body assessment:", error);
    return NextResponse.json(
      { error: "Failed to update body assessment" },
      { status: 500 }
    );
  }
}

// DELETE - Delete body assessment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await (prisma as any).bodyAssessment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting body assessment:", error);
    return NextResponse.json(
      { error: "Failed to delete body assessment" },
      { status: 500 }
    );
  }
}
