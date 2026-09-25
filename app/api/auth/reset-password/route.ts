import { NextRequest } from "next/server";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

// Mesma razão da rota de esquecer a senha: o app fala com esta, e o alvo Web
// precisa do preflight. Ver o comentário em ../forgot-password/route.ts.
export function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest) {
    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return corsJson({ error: "Token and password are required" }, { status: 400 });
        }

        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token },
        });

        if (!resetToken || resetToken.expires < new Date()) {
            return corsJson({ error: "Invalid or expired token" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: resetToken.email },
        });

        if (!user) {
            return corsJson({ error: "User not found" }, { status: 404 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // deleteMany (not delete) so a duplicate/concurrent submit is a harmless no-op
        // instead of throwing "record to delete does not exist".
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword },
            }),
            prisma.passwordResetToken.deleteMany({
                where: { id: resetToken.id },
            }),
        ]);

        return corsJson({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Reset password error:", error);
        return corsJson({ error: "Internal server error" }, { status: 500 });
    }
}
