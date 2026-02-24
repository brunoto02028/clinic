export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { generatePresignedUploadUrl, getFileUrl } from "@/lib/s3";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const where = category ? { category } : {};

    const [images, siteSettings] = await Promise.all([
      prisma.imageLibrary.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          uploadedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.siteSettings.findFirst({
        select: {
          logoUrl: true, darkLogoUrl: true, faviconUrl: true,
          heroImageUrl: true, aboutImageUrl: true,
          insolesImageUrl: true, bioImageUrl: true, ogImageUrl: true,
          updatedAt: true,
        },
      }),
    ]);

    // Generate public URLs for ImageLibrary records
    const imagesWithUrls = images.map((img) => {
      if (img.cloud_storage_path.startsWith("local:")) {
        return { ...img, imageUrl: img.cloud_storage_path.replace("local:", "") };
      }
      if (img.imageUrl && img.imageUrl.startsWith("/uploads/")) {
        return img;
      }
      try {
        return { ...img, imageUrl: getFileUrl(img.cloud_storage_path, true) };
      } catch {
        return { ...img, imageUrl: "" };
      }
    });

    // Build virtual entries from SiteSettings image fields
    const settingsImages: any[] = [];
    if (siteSettings) {
      const fields: { url: string | null | undefined; label: string; cat: string }[] = [
        { url: siteSettings.logoUrl,        label: "Logo",                    cat: "logo" },
        { url: siteSettings.darkLogoUrl,    label: "Logo (Dark)",             cat: "logo" },
        { url: siteSettings.faviconUrl,     label: "Favicon",                 cat: "logo" },
        { url: siteSettings.heroImageUrl,   label: "Hero Image",              cat: "hero" },
        { url: siteSettings.aboutImageUrl,  label: "About Image",             cat: "about" },
        { url: siteSettings.insolesImageUrl,label: "Insoles Image",           cat: "services" },
        { url: siteSettings.bioImageUrl,    label: "Biomechanics Image",      cat: "services" },
        { url: siteSettings.ogImageUrl,     label: "OG / Social Share Image", cat: "general" },
      ];

      for (const f of fields) {
        if (!f.url) continue;
        // Skip if already in ImageLibrary (avoid duplicates)
        const alreadyExists = imagesWithUrls.some((img) => img.imageUrl === f.url);
        if (alreadyExists) continue;
        // Only include if matches category filter
        if (category && f.cat !== category) continue;

        const fileName = f.url.split("/").pop() || f.label;
        settingsImages.push({
          id: `settings-${f.cat}-${fileName}`,
          fileName,
          originalName: f.label,
          fileSize: 0,
          mimeType: "image/jpeg",
          imageUrl: f.url,
          cloud_storage_path: f.url,
          category: f.cat,
          altText: f.label,
          createdAt: siteSettings.updatedAt?.toISOString() || new Date().toISOString(),
          uploadedBy: null,
          fromSettings: true,
        });
      }
    }

    const allImages = [...imagesWithUrls, ...settingsImages];

    return NextResponse.json({ images: allImages });
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    // Only admins and therapists can upload to image library
    if (userRole === "PATIENT") {
      return NextResponse.json(
        { error: "Only staff members can upload images to the library" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { fileName, fileSize, mimeType, width, height, altText, category } = body;

    if (!fileName || !fileSize || !mimeType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate presigned URL for upload
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      fileName,
      mimeType,
      true // Public file
    );

    // Create database record (will be finalized after successful upload)
    const image = await prisma.imageLibrary.create({
      data: {
        fileName,
        originalName: fileName,
        fileSize,
        mimeType,
        imageUrl: "", // Will be set after upload completion
        cloud_storage_path,
        width,
        height,
        altText: altText || null,
        category: category || "general",
        uploadedById: userId,
      },
    });

    return NextResponse.json({
      success: true,
      uploadUrl,
      cloud_storage_path,
      imageId: image.id,
    });
  } catch (error) {
    console.error("Error initiating image upload:", error);
    return NextResponse.json(
      { error: "Failed to initiate image upload" },
      { status: 500 }
    );
  }
}
