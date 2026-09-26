export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { coordenadaDoPostcode, postcodeDoCadastro } from "@/lib/postcode";
import { nearestTestLocations } from "@/lib/lml";

export function OPTIONS() {
  return corsPreflight();
}

/**
 * Os pontos de coleta perto da pessoa (081).
 *
 * O Bruno: *"se o paciente já tem o cadastro dele no profile com o endereço
 * completo, isso precisa aparecer. Eu quero que já apareçam sugestões de pontos
 * de coleta para ele fazer o exame de sangue, ou dependendo do tipo de exame,
 * ele pode receber o kit na casa dele."*
 *
 * **A rota responde mesmo sem o laboratório ligado**, e é de propósito. Ela tem
 * quatro respostas possíveis, e três delas já valem hoje:
 *
 * | estado | o que a tela mostra |
 * |---|---|
 * | `sem_postcode` | um pedido para completar o cadastro, com o caminho até lá |
 * | `postcode_desconhecido` | o código digitado não existe — erro de digitação |
 * | `laboratorio_desconectado` | o código postal conferido, e que os pontos entram quando a conexão abrir |
 * | `ok` | os pontos, ordenados por distância |
 *
 * Uma tela que não sabe *por que* está vazia só sabe ficar vazia. Estes quatro
 * estados são a diferença entre "complete seu cadastro" e "ainda não ligamos
 * isso" — duas mensagens opostas que um array vazio não distingue.
 */
export async function GET(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { postcode: true, address: true, city: true },
  });
  if (!user) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const postcode = postcodeDoCadastro(user);
  if (!postcode) {
    return corsJson({ estado: "sem_postcode", postcode: null, local: null, pontos: [] });
  }

  const coord = await coordenadaDoPostcode(postcode);
  if (!coord) {
    return corsJson({ estado: "postcode_desconhecido", postcode, local: null, pontos: [] });
  }

  const pontos = await nearestTestLocations(coord.lat, coord.long);
  if (!pontos) {
    // Sem token, ou a chamada falhou. Nos dois casos a tela diz a mesma coisa —
    // e o código postal continua confirmado, que é o que a pessoa acabou de
    // cadastrar e quer ver reconhecido.
    return corsJson({ estado: "laboratorio_desconectado", postcode, local: coord.local, pontos: [] });
  }

  return corsJson({ estado: "ok", postcode, local: coord.local, pontos });
}
