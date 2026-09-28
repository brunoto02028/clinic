/**
 * O material educativo na língua de quem está lendo (096 T-1).
 *
 * ## Por que existe
 *
 * `Article` sempre teve `titleEn/contentEn` e `titlePt/contentPt`.
 * `EducationContent` tinha **um** título e **um** corpo, e importar um artigo
 * como estava jogaria fora metade do que já foi escrito — com a Ana lendo em
 * inglês ([[ana-livia-lingua-ingles]]) e outro paciente em português.
 *
 * ## A regra da queda
 *
 * **Mostra o que existe.** Material só em inglês aparece em inglês para quem lê
 * português — e não um espaço vazio, que é o que uma queda "correta" para
 * `null` produziria. Um texto na língua errada é lido com esforço; um card sem
 * título não é lido de jeito nenhum.
 *
 * O inverso também vale: material escrito só em português não some para quem
 * tem o app em inglês.
 *
 * ## Onde a escolha acontece
 *
 * **No servidor**, como nos termos. A tela recebe `title` e `body` já
 * resolvidos e não decide língua — senão cada tela decide por conta, e um dia
 * uma delas decide diferente.
 */

export interface ConteudoBilingue {
  title: string;
  description?: string | null;
  body?: string | null;
  titlePt?: string | null;
  descriptionPt?: string | null;
  bodyPt?: string | null;
}

/** `pt-BR`, `pt`, `PT` — tudo isso é português. Qualquer outra coisa é inglês. */
export function ehPortugues(locale: string | null | undefined): boolean {
  return (locale || "").toLowerCase().startsWith("pt");
}

/**
 * O campo na língua pedida, caindo para o que existe.
 *
 * A ordem da queda não é simétrica por acaso: a versão principal
 * (`title`/`body`) é a que sempre existe, porque é a coluna obrigatória. A
 * portuguesa pode faltar.
 */
function escolher(principal: string | null | undefined, pt: string | null | undefined, portugues: boolean): string | null {
  if (portugues) return (pt && pt.trim()) || principal || null;
  return (principal && principal.trim()) || pt || null;
}

/**
 * Devolve o material com `title`, `description` e `body` já na língua certa,
 * e **sem** os campos `*Pt` — a tela não precisa deles, e mandá-los dobraria o
 * tamanho da resposta com texto que ninguém vai mostrar.
 */
export function naLingua<T extends ConteudoBilingue>(
  c: T,
  locale: string | null | undefined
): Omit<T, "titlePt" | "descriptionPt" | "bodyPt"> {
  const pt = ehPortugues(locale);
  const { titlePt, descriptionPt, bodyPt, ...resto } = c as any;
  return {
    ...resto,
    // `title` é obrigatório no banco, então a queda nunca devolve nulo aqui.
    title: escolher(c.title, titlePt, pt) || c.title,
    description: escolher(c.description, descriptionPt, pt),
    body: escolher(c.body, bodyPt, pt),
  };
}

/**
 * Este material tem versão na língua pedida, ou está sendo lido por queda?
 *
 * Serve ao painel — quem escreve precisa ver **o que falta traduzir** — e não à
 * tela do paciente, onde dizer "este texto está em inglês" no meio de uma lista
 * é ruído sobre algo que ele já percebeu ao ler.
 */
export function temTraducao(c: ConteudoBilingue, locale: string | null | undefined): boolean {
  return ehPortugues(locale) ? !!(c.titlePt && c.titlePt.trim()) : !!(c.title && c.title.trim());
}
