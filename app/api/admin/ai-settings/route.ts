import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import {
  encryptValue,
  decryptValue,
  clearConfigCache,
  DEFAULT_CONFIGS,
} from "@/lib/system-config";

export const dynamic = "force-dynamic";

// GET — List all config entries (masked for secrets)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure all default configs exist in DB (upsert to avoid race conditions)
    for (const def of DEFAULT_CONFIGS) {
      await (prisma as any).systemConfig.upsert({
        where: { key: def.key },
        update: {},  // Don't overwrite existing values
        create: {
          key: def.key,
          value: "",
          label: def.label,
          description: def.description || null,
          category: def.category,
          isSecret: def.isSecret,
          isActive: false,
        },
      });
    }

    const configs = await (prisma as any).systemConfig.findMany({
      orderBy: [{ category: "asc" }, { label: "asc" }],
    });

    // Mask secret values — only show if configured or not
    const masked = configs.map((c: any) => ({
      id: c.id,
      key: c.key,
      label: c.label,
      description: c.description,
      category: c.category,
      isSecret: c.isSecret,
      isActive: c.isActive,
      hasValue: !!c.value,
      maskedValue: c.isSecret
        ? c.value
          ? "••••••••" + (decryptValue(c.value).slice(-4) || "")
          : ""
        : c.value || "",
      updatedAt: c.updatedAt,
      updatedBy: c.updatedBy,
    }));

    return NextResponse.json({ configs: masked });
  } catch (err: any) {
    console.error("[ai-settings] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — Update a config entry
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, key, value, label, description, category, isSecret, isActive } = body;

    if (!id && !key) {
      return NextResponse.json({ error: "id or key is required" }, { status: 400 });
    }

    const where = id ? { id } : { key };
    const existing = await (prisma as any).systemConfig.findUnique({ where });
    if (!existing) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    const updateData: any = {
      updatedBy: (session.user as any).email || "admin",
    };

    // Only update value if provided (not empty string from form)
    if (value !== undefined && value !== null) {
      updateData.value = existing.isSecret && value ? encryptValue(value) : value;
      // Clear cache for this key
      clearConfigCache(existing.key);
    }

    if (label !== undefined) updateData.label = label;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (isSecret !== undefined) updateData.isSecret = isSecret;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await (prisma as any).systemConfig.update({
      where,
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      config: {
        id: updated.id,
        key: updated.key,
        isActive: updated.isActive,
        hasValue: !!updated.value,
      },
    });
  } catch (err: any) {
    console.error("[ai-settings] PATCH error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — Create a new custom config entry
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key, value, label, description, category, isSecret } = await req.json();

    if (!key || !label) {
      return NextResponse.json({ error: "key and label are required" }, { status: 400 });
    }

    const existing = await (prisma as any).systemConfig.findUnique({ where: { key } });
    if (existing) {
      return NextResponse.json({ error: "Config key already exists" }, { status: 409 });
    }

    const config = await (prisma as any).systemConfig.create({
      data: {
        key,
        value: isSecret && value ? encryptValue(value) : (value || ""),
        label,
        description: description || null,
        category: category || "other",
        isSecret: isSecret ?? true,
        isActive: !!value,
        updatedBy: (session.user as any).email || "admin",
      },
    });

    return NextResponse.json({ success: true, config: { id: config.id, key: config.key } }, { status: 201 });
  } catch (err: any) {
    console.error("[ai-settings] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — Remove a custom config entry
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const config = await (prisma as any).systemConfig.findUnique({ where: { id } });
    if (!config) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    // Don't allow deleting default configs
    const isDefault = DEFAULT_CONFIGS.some((d) => d.key === config.key);
    if (isDefault) {
      return NextResponse.json({ error: "Cannot delete default configuration. You can disable it instead." }, { status: 400 });
    }

    await (prisma as any).systemConfig.delete({ where: { id } });
    clearConfigCache(config.key);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[ai-settings] DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
