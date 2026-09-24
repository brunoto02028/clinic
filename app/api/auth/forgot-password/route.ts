import { NextRequest } from "next/server";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { rateLimit } from "@/lib/rate-limit";
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
        // O middleware exclui `/api/auth` do rate limit dele, e agora esta rota
        // aceita chamada de qualquer origem — uma página qualquer poderia usar
        // o navegador de quem a visita para disparar reset em massa contra
        // endereços de terceiros. Dois limites, porque protegem coisas
        // diferentes: o IP contra o volume, o endereço contra ser alvo.
        const ip =
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            request.headers.get("x-real-ip") ||
            "unknown";
        const porIp = rateLimit(`forgot-password:ip:${ip}`, { max: 10, windowMs: 15 * 60_000 });
        if (!porIp.allowed) {
            return corsJson({ error: "Too many requests. Try again later." }, { status: 429 });
        }

        const { email } = await request.json();

        if (typeof email === "string" && email.trim()) {
            const porEmail = rateLimit(`forgot-password:email:${email.trim().toLowerCase()}`, {
                max: 3,
                windowMs: 60 * 60_000,
            });
            if (!porEmail.allowed) {
                // A mesma frase do caminho feliz: dizer "este endereço já pediu
                // demais" contaria a um estranho que a conta existe.
                return corsJson({
                    message: "If an account exists with that email, a reset link has been sent.",
                });
            }
        }

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
