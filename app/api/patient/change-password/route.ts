import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';
import bcrypt from "bcryptjs";
import { patientGate } from "@/lib/patient-gate";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ skipConsent: true });
  if (__gate.response) return __gate.response;

  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /**
     * Ninguém define senha na conta de outra pessoa (091 T-7).
     *
     * Este era o buraco mais sério do review de 27/09/2026, e ele já existia:
     * um admin impersonando um paciente pela web podia trocar a senha dele.
     * Com a sessão emprestada, quem responde pela criança ganhava o mesmo — e
     * pior, porque a conta gerida tem `password: null`, então o
     * `if (currentPassword && user.password)` abaixo **nem chegava a rodar**.
     *
     * O dano não é imediato: o login recusa `managedById`. Mas no dia em que a
     * pessoa for promovida a conta própria — o caminho óbvio quando ela faz 18
     * e o vínculo é desfeito — existiria uma credencial válida que ninguém
     * sabe que foi criada.
     */
    if (effectiveUser.isImpersonating) {
      return NextResponse.json(
        {
          error: "Read-only: you cannot set a password on someone else's account.",
          errorPt: "Somente leitura: você não pode definir a senha da conta de outra pessoa.",
        },
        { status: 403 }
      );
    }

    const userId = effectiveUser.userId;
    const { currentPassword, newPassword } = await req.json();

    if (!newPassword) {
      return NextResponse.json({ error: "New password is required." }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // If currentPassword provided, verify it (optional — patient can skip)
    if (currentPassword && user.password) {
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[change-password] Error:", err);
    return NextResponse.json({ error: "Failed to change password." }, { status: 500 });
  }
}
