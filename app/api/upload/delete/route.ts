import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { deleteFile } from "@/lib/s3";

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { cloud_storage_path } = await request.json();

    if (!cloud_storage_path) {
      return NextResponse.json(
        { error: "cloud_storage_path is required" },
        { status: 400 }
      );
    }

    await deleteFile(cloud_storage_path);

    return NextResponse.json({
      success: true,
      message: "File deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
