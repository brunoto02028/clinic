import { deviceStore } from "@/lib/secure-storage";

/**
 * Onde o paciente estava antes de sair para os Ajustes.
 *
 * Mudar uma permissão nos Ajustes faz o **iOS matar e reiniciar o app** — é
 * comportamento do sistema, não um defeito nosso, e não dá para impedir. O que
 * dá é tornar a volta suave: quem saiu de "Mensagens" para permitir a câmera
 * espera voltar em "Mensagens", não na tela inicial. Observação do Bruno em
 * 25/09/2026.
 *
 * O prazo curto é deliberado. Isto **não** é restauração de estado do app:
 * guardar a última tela para sempre faria uma abertura normal, dias depois,
 * cair no meio de algo que a pessoa já esqueceu. Cinco minutos cobrem a ida e
 * volta aos Ajustes e nada mais.
 */
const CHAVE = "bpr.returnTo";
const VALIDADE_MS = 5 * 60 * 1000;

export async function lembrarOndeEstava(rota: string): Promise<void> {
  try {
    await deviceStore.set(CHAVE, JSON.stringify({ rota, em: Date.now() }));
  } catch {
    // Voltar para a tela certa é conforto, não função: falhar aqui não pode
    // atrapalhar quem só queria permitir a câmera.
  }
}

/** A rota guardada, se ainda vale. Lê e apaga — serve uma vez só. */
export async function consumirOndeEstava(): Promise<string | null> {
  try {
    const cru = await deviceStore.get(CHAVE);
    if (!cru) return null;
    await deviceStore.remove(CHAVE);
    const { rota, em } = JSON.parse(cru) as { rota?: string; em?: number };
    if (!rota || !em) return null;
    if (Date.now() - em > VALIDADE_MS) return null;
    return rota;
  } catch {
    return null;
  }
}
