export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { deleteFile, getFileUrl } from "@/lib/s3";
import { unlink } from "fs/promises";
import path from "path";
import { campoDoIdVirtual } from "@/lib/site-settings-images";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // Update image after successful upload
    const image = await prisma.imageLibrary.update({
      where: { id },
      data: {
        imageUrl: body.imageUrl || "",
        altText: body.altText || null,
        category: body.category || "general",
      },
    });

    // Generate public URL
    const imageUrl = getFileUrl(image.cloud_storage_path, true);

    return NextResponse.json({
      success: true,
      image: {
        ...image,
        imageUrl,
      },
    });
  } catch (error) {
    console.error("Error updating image:", error);
    return NextResponse.json(
      { error: "Failed to update image" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const userRole = (session.user as any).role;

    // Only admins and therapists can delete from image library
    if (userRole === "PATIENT") {
      return NextResponse.json(
        { error: "Only staff members can delete images from the library" },
        { status: 403 }
      );
    }

    const { id } = params;

    // Virtual "settings-*" images come from SiteSettings fields, not ImageLibrary table
    if (id.startsWith("settings-")) {
      /**
       * O campo sai do **arquivo**, e nao do prefixo do id.
       *
       * Havia aqui um mapa de prefixo para campo, e ele estava errado por
       * construção: o id é `settings-<categoria>-<arquivo>`, e três campos
       * dividem a categoria `logo`. O mapa ainda tinha `"settings-logo-"`
       * **duas vezes** — apagar a logo clara apagava a escura — e não tinha o
       * favicon. Ver `lib/site-settings-images.ts`.
       */
      const settings = await prisma.siteSettings.findFirst();
      if (settings) {
        const campo = campoDoIdVirtual(id, settings as unknown as Record<string, unknown>);
        if (campo) {
          await prisma.siteSettings.update({
            where: { id: settings.id },
            data: { [campo]: null },
          });
        }
      }
      return NextResponse.json({ success: true, message: "Image cleared from settings" });
    }

    const image = await prisma.imageLibrary.findUnique({
      where: { id },
    });

    if (!image) {
      return NextResponse.json({ success: true, message: "Image not found, skipping" });
    }

    // Delete file from storage
    try {
      if (image.cloud_storage_path.startsWith("dataurl:")) {
        // Data URL - no external storage to delete
        console.log('[delete] Data URL image, skipping storage deletion');
      } else if (image.cloud_storage_path.startsWith("local:")) {
        // Local file - delete from disk
        const localPath = image.cloud_storage_path.replace("local:", "");
        const fullPath = path.join(process.cwd(), "public", localPath);
        await unlink(fullPath).catch(() => {});
      } else if (image.cloud_storage_path.startsWith("s3:")) {
        // S3 file
        await deleteFile(image.cloud_storage_path);
      }
    } catch (storageError) {
      console.error("Failed to delete file from storage:", storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await prisma.imageLibrary.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
