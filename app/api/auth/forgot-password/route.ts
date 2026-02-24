import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendTemplatedEmail } from "@/lib/email-templates";
import crypto from "crypto";

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        // For security, don't reveal if user exists
        if (!user) {
            return NextResponse.json({
                message: "If an account exists with that email, a reset link has been sent."
            });
        }

        // Generate token
        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 3600000); // 1 hour

        // Save token
        await prisma.passwordResetToken.create({
            data: {
                email: email.toLowerCase(),
                token,
                expires,
            },
        });

        const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

        await sendTemplatedEmail(
            'PASSWORD_RESET',
            email.toLowerCase(),
            {
                patientName: user.firstName,
                resetUrl,
                portalUrl: `${process.env.NEXTAUTH_URL}/dashboard`,
            },
            user.id,
        );

        return NextResponse.json({
            message: "If an account exists with that email, a reset link has been sent."
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json({ error: "Interal server error" }, { status: 500 });
    }
}
