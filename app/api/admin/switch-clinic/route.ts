import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { cookies } from "next/headers";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = cookies();
    const clinicId = cookieStore.get("selected-clinic-id")?.value || null;

    return NextResponse.json({ clinicId });
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "SUPERADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { clinicId } = await request.json();

        // Set cookie that lasts for 30 days
        const cookieStore = cookies();

        if (clinicId) {
            cookieStore.set("selected-clinic-id", clinicId, {
                maxAge: 30 * 24 * 60 * 60,
                path: "/",
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax"
            });
        } else {
            cookieStore.delete("selected-clinic-id");
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
