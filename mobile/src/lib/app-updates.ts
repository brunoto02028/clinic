import * as Updates from "expo-updates";

/**
 * Buscar e aplicar o update na **mesma** abertura.
 *
 * O comportamento padrão do `expo-updates` é baixar numa abertura e aplicar na
 * seguinte. Para o usuário final isso é o certo — ninguém quer o app recarregar
 * na cara. Para quem está testando é péssimo: abre, vê tudo igual, e conclui
 * que a correção não foi feita. Aconteceu em 24/09/2026, duas vezes, e custou
 * horas de diagnóstico caçando um bug que já estava corrigido.
 *
 * Aqui o app verifica na abertura e, se houver algo novo, recarrega na hora.
 * Não entra em laço: depois de recarregar, `checkForUpdateAsync` responde que
 * não há novidade, porque a novidade virou o bundle atual.
 *
 * Nunca lança e nunca bloqueia a inicialização. Sem rede, com o servidor fora
 * do ar ou com o update corrompido, o app segue com o que já tem — que é a
 * regra de todo o resto: uma falha de rede não pode tirar o paciente do ar.
 */
export async function applyUpdateOnLaunch(): Promise<void> {
  // `isEnabled` é falso no Expo Go e no desenvolvimento, onde não existe
  // binário para atualizar.
  if (!Updates.isEnabled) return;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch {
    // Silêncio de propósito: isto roda na abertura, antes de haver tela onde
    // mostrar um erro, e falhar em atualizar não é falhar em funcionar.
  }
}

export interface RunningVersion {
  /** A versão do binário, que só muda com build novo. */
  app: string;
  /** `true` quando está rodando o JavaScript embutido no binário, sem update. */
  embedded: boolean;
  /** Os primeiros dígitos do id do update, quando há um. */
  updateId: string | null;
  channel: string | null;
}

/**
 * O que está rodando agora.
 *
 * Existe para responder, sem adivinhação, à pergunta que nos custou caro hoje:
 * "o update chegou?". `isEmbeddedLaunch` é a resposta — verdadeiro significa
 * que o app está executando o JavaScript que veio dentro do binário, e que
 * nenhum update foi aplicado.
 */
export function runningVersion(version: string): RunningVersion {
  return {
    app: version,
    embedded: Updates.isEmbeddedLaunch,
    updateId: Updates.updateId ? Updates.updateId.slice(0, 8) : null,
    channel: Updates.channel ?? null,
  };
}
