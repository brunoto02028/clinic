import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Sem gate, e de proposito: esta rota esta em `publicRoutes` (middleware.ts)
  // porque o link de confirmacao chega no e-mail NOVO e e aberto onde a pessoa
  // ler — outro navegador, o celular, o webmail — onde nao ha sessao nenhuma.
  // Quem autoriza aqui e o token, que ja diz de quem ele e; exigir sessao so
  // tiraria disponibilidade de um fluxo que nao depende dela.
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const changeToken = await prisma.emailChangeToken.findUnique({ where: { token } });

    if (!changeToken || changeToken.expires < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    // Guard against a race where the new email got taken between request and confirm
    const existing = await prisma.user.findUnique({ where: { email: changeToken.newEmail } });
    if (existing && existing.id !== changeToken.userId) {
      await prisma.emailChangeToken.deleteMany({ where: { id: changeToken.id } });
      return NextResponse.json({ error: "That email is no longer available." }, { status: 400 });
    }

    // deleteMany (not delete) so a duplicate/concurrent confirm request — e.g. an email
    // security scanner prefetching the link, or a double-submit — is a harmless no-op
    // instead of throwing "record to delete does not exist".
    /**
     * O terceiro elo, fechado aqui também (091 T-7).
     *
     * Esta rota é pública por desenho — quem autoriza é o token do e-mail — e
     * por isso ela não pode confiar em quem a chama. Se um token de troca
     * existir para uma conta gerida, ele não vale: a criança não tem e-mail
     * próprio, e dar um a ela é dar-lhe uma porta de entrada.
     *
     * Fechar só o pedido não bastaria: um token emitido antes desta correção,
     * ou por um caminho de admin, continuaria funcionando.
     */
    const alvo = await prisma.user.findUnique({
      where: { id: changeToken.userId },
      select: { managedById: true },
    });
    if (alvo?.managedById) {
      return NextResponse.json(
        { error: "This account cannot have its own email address." },
        { status: 403 }
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: changeToken.userId },
        data: { email: changeToken.newEmail },
      }),
      prisma.emailChangeToken.deleteMany({ where: { id: changeToken.id } }),
    ]);

    return NextResponse.json({ message: "Email updated successfully", newEmail: changeToken.newEmail });
  } catch (error) {
    console.error("Confirm email change error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
