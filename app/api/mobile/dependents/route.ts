export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { ehSessaoDeTerceiro } from "@/lib/mobile-tokens";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import {
  validarPessoa,
  pessoaPublica,
  pessoasGeridasPor,
  criarPessoaGerida,
} from "@/lib/managed-patients";

export function OPTIONS() {
  return corsPreflight();
}

/**
 * As pessoas por quem este usuário responde (091 T-7).
 *
 * Mora fora de `/labs` porque deixou de ser coisa do laboratório: a mesma
 * criança pede exame de sangue **e** faz tratamento de reabilitação, e duas
 * listas de filhos que podem divergir seriam pior que nenhuma.
 *
 * **O responsável vem sempre da sessão.** Nenhum caminho aqui aceita um dono
 * de fora: seria a porta para pendurar uma criança na conta de outra pessoa,
 * ou para listar os filhos de um desconhecido.
 */
export async function GET(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const pessoas = await pessoasGeridasPor(payload.sub);
  return corsJson({ dependents: pessoas.map(pessoaPublica) });
}

export async function POST(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  // Quem está vendo como a filha não cadastra pessoas (091 T-7). Seria um
  // dependente de um dependente, sem dono claro — e a filha não tem conta para
  // responder por ninguém.
  if (ehSessaoDeTerceiro(payload)) {
    return corsJson(
      {
        error: "Switch back to your own account to manage this.",
        errorPt: "Volte para a sua conta para gerir isto.",
        code: "on_behalf_read_only",
      },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const r = validarPessoa(body);
  if ("erro" in r) return corsJson({ error: r.erro, errorPt: r.erroPt }, { status: 400 });

  // Um teto por conta. Não é regra de negócio — é o que impede a tabela de
  // virar depósito se alguém automatizar o formulário.
  const quantos = await prisma.user.count({ where: { managedById: payload.sub, deletedAt: null } });
  if (quantos >= 10) {
    return corsJson(
      {
        error: "You have reached the limit of people on this account. Write to the clinic if you need more.",
        errorPt: "Você chegou ao limite de pessoas nesta conta. Escreva à clínica se precisar de mais.",
      },
      { status: 400 }
    );
  }

  const criada = await criarPessoaGerida({
    guardianId: payload.sub,
    clinicId: payload.clinicId ?? null,
    pessoa: r.pessoa,
  });

  return corsJson({ dependent: pessoaPublica(criada) }, { status: 201 });
}
