import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getFileUrl } from "@/lib/s3";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { cloud_storage_path, isPublic } = await request.json();

    if (!cloud_storage_path) {
      return NextResponse.json(
        { error: "cloud_storage_path is required" },
        { status: 400 }
      );
    }

    // Generate file URL
    const fileUrl = await getFileUrl(cloud_storage_path, isPublic || false);

    return NextResponse.json({
      success: true,
      cloud_storage_path,
      fileUrl
    });
  } catch (error) {
    console.error("Error completing upload:", error);
    return NextResponse.json(
      { error: "Failed to complete upload" },
      { status: 500 }
    );
  }
}
