import { NextRequest } from "next/server";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { prisma } from "@/lib/db";
import { sendTemplatedEmail } from "@/lib/email-templates";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

/**
 * O app chama esta rota — é a mesma que o formulário do site usa, e não faz
 * sentido ter duas. No iOS nativo isso já funcionava (nativo não aplica CORS),
 * mas no alvo Web do Expo o preflight era recusado e a tela de recuperar senha
 * simplesmente falhava. Achado dirigindo a tela no QA da 075.
 *
 * O middleware não resolve: ele pula `/api/auth` inteiro antes de chegar ao
 * bloco de CORS. O padrão da casa para isso são as próprias rotas exportarem o
 * `OPTIONS`, como as de `/api/mobile` já fazem.
 */
export function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return corsJson({ error: "Email is required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        // For security, don't reveal if user exists
        if (!user) {
            return corsJson({
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
            user.clinicId,
        );

        return corsJson({
            message: "If an account exists with that email, a reset link has been sent."
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        return corsJson({ error: "Interal server error" }, { status: 500 });
    }
}
