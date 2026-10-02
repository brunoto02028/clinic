import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sendArticleNewsletter } from "@/lib/article-newsletter";

export const dynamic = "force-dynamic";

function authGuard(session: any) {
  const role = session?.user?.role;
  return session && ["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role);
}

/** Quantas pessoas receberiam este disparo agora. */
async function contarInscritos(): Promise<number> {
  return prisma.emailContact.count({ where: { subscribed: true } });
}

// GET /api/admin/articles/[id]/notify
/**
 * O número **antes** do clique (104, 02/10/2026).
 *
 * Um disparo em massa sem contagem na tela é um clique no escuro: a lista
 * cresce sozinha, e quem aperta não sabe se são trinta pessoas ou três mil.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  return NextResponse.json({ subscribers: await contarInscritos() });
}

// POST /api/admin/articles/[id]/notify
// Manually (re-)sends the newsletter for an already-published article.
// Independent of the publish action — gives staff full freedom to notify
// subscribers whenever they choose, not only at publish time.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!authGuard(session)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const article = await prisma.article.findUnique({ where: { id: params.id } });
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }
  if (!article.published) {
    return NextResponse.json({ error: "Article must be published before notifying subscribers" }, { status: 400 });
  }

  /**
   * A confirmação é o **número**, não um booleano.
   *
   * `notify: true` provaria que alguém clicou, não que leu quantas pessoas
   * iam receber. Exigir o número que a tela mostrou prova as duas coisas — e
   * se a lista mudou entre ver e apertar, o disparo para e pede para olhar
   * de novo, como o preview do e-mail faz com o texto.
   */
  const body = await request.json().catch(() => ({} as any));
  const inscritos = await contarInscritos();

  if (typeof body?.confirmedCount !== "number") {
    return NextResponse.json(
      { error: "Confirm how many people this goes to first", code: "count_not_confirmed", subscribers: inscritos },
      { status: 400 }
    );
  }
  if (body.confirmedCount !== inscritos) {
    return NextResponse.json(
      {
        error: `The list changed: it was ${body.confirmedCount}, it is now ${inscritos}. Check it again before sending.`,
        code: "COUNT_MISMATCH",
        subscribers: inscritos,
      },
      { status: 409 }
    );
  }

  const result = await sendArticleNewsletter(article);
  return NextResponse.json({ success: true, subscribers: inscritos, ...result });
}
