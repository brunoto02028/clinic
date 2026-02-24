import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.redirect(new URL("/login?error=MissingToken", request.url));
        }

        const verificationToken = await prisma.verificationToken.findUnique({
            where: { token },
        });

        if (!verificationToken || verificationToken.expires < new Date()) {
            return NextResponse.redirect(new URL("/login?error=InvalidToken", request.url));
        }

        const user = await prisma.user.findUnique({
            where: { email: verificationToken.identifier },
        });

        if (!user) {
            return NextResponse.redirect(new URL("/login?error=UserNotFound", request.url));
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: {
                    emailVerified: new Date(),
                    isActive: true
                },
            }),
            prisma.verificationToken.delete({
                where: { id: verificationToken.id },
            }),
        ]);

        return NextResponse.redirect(new URL("/login?verified=true", request.url));
    } catch (error) {
        console.error("Verification error:", error);
        return NextResponse.redirect(new URL("/login?error=ServerError", request.url));
    }
}
