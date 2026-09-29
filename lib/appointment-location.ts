import { prisma } from "@/lib/db";

/**
 * Onde a consulta acontece, na frase que o paciente lê.
 *
 * Domicílio é o endereço **dele**; o resto é o da clínica. Escrever "compareça
 * à clínica" para quem vai ser atendido em casa é o tipo de erro que só se
 * descobre com alguém batendo na porta errada.
 *
 * Mora aqui, e não dentro de uma rota, porque é o **terceiro** lugar que precisa
 * dela: o `POST /api/admin/appointments`, o `PUT` da mesma consulta e a
 * remarcação. As três cópias anteriores divergiram — a do `PUT` farejava
 * "domicílio" no texto das notas com uma expressão regular, quando o campo
 * `mode` existe no banco desde a atividade 089.
 */
export async function localDaConsulta(
  clinicId: string | null | undefined,
  mode: string | null | undefined,
  patientId: string
): Promise<string> {
  if (mode === "VIDEO") return "Video consultation — a link opens in your app";

  if (mode === "HOME_VISIT") {
    const p = await prisma.user.findUnique({
      where: { id: patientId },
      select: { address: true, city: true, postcode: true },
    });
    const dele = [p?.address, p?.city, p?.postcode].filter(Boolean).join(", ");
    return dele ? `At your address — ${dele}` : "At your address";
  }

  // Sem inquilino resolvido não se inventa endereço: o nome da casa sozinho é
  // verdade, e um endereço errado manda alguém para a rua errada.
  if (!clinicId) return "BPR Physical Rehabilitation";

  const c = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { name: true, address: true, city: true },
  });
  const endereco = [c?.address, c?.city].filter(Boolean).join(", ");
  return c?.name ? `${c.name}${endereco ? " — " + endereco : ""}` : "BPR Physical Rehabilitation";
}
