/**
 * Quem manda no rótulo é o aparelho.
 *
 * "Face ID" é nome de produto da Apple e só existe em iPhone com câmera
 * TrueDepth. Num iPhone SE a mesma tranca se chama Touch ID; num Android é
 * digital, ou desbloqueio facial, e o nome varia por fabricante. Escrever
 * "Face ID" na tela de todo mundo seria mentir para a maioria — e pior, mandar
 * o paciente procurar um botão que o telefone dele não tem.
 *
 * Então o texto vem do que o sistema responde, não do que a gente supõe. Este
 * arquivo é só a decisão, sem nenhum import: dá para testar as combinações de
 * plataforma e sensor sem um aparelho e sem o runtime do React Native.
 */

/** Os valores de `LocalAuthentication.AuthenticationType`. */
export const AUTH_TYPE = {
  FINGERPRINT: 1,
  FACIAL_RECOGNITION: 2,
  IRIS: 3,
} as const;

export type BiometricKind = "face" | "fingerprint" | "iris" | "none";

/**
 * O sensor que vamos anunciar. Um aparelho pode ter mais de um; escolhemos o
 * facial quando existe, porque é o que o usuário encosta primeiro (o telefone
 * tenta o rosto sozinho ao acender a tela).
 */
export function kindFor(types: readonly number[] | null | undefined): BiometricKind {
  if (!types || types.length === 0) return "none";
  if (types.includes(AUTH_TYPE.FACIAL_RECOGNITION)) return "face";
  if (types.includes(AUTH_TYPE.FINGERPRINT)) return "fingerprint";
  if (types.includes(AUTH_TYPE.IRIS)) return "iris";
  return "none";
}

/** Como este aparelho chama a própria tranca, em inglês e português. */
export function labelFor(
  platform: string,
  kind: BiometricKind
): { en: string; pt: string } {
  if (platform === "ios") {
    // Os dois são marcas registradas da Apple e é assim que o iPhone se
    // refere a elas na própria interface.
    if (kind === "face") return { en: "Face ID", pt: "Face ID" };
    if (kind === "fingerprint") return { en: "Touch ID", pt: "Touch ID" };
  }
  if (kind === "face") return { en: "face unlock", pt: "desbloqueio facial" };
  if (kind === "fingerprint") return { en: "fingerprint", pt: "digital" };
  if (kind === "iris") return { en: "iris unlock", pt: "leitura de íris" };
  return { en: "biometrics", pt: "biometria" };
}

export interface LockDecision {
  /** O aparelho tem o sensor. */
  hasHardware: boolean;
  /** A pessoa cadastrou rosto/digital no aparelho. */
  isEnrolled: boolean;
  /** A pessoa ligou a tranca no perfil. */
  preferenceOn: boolean;
  /** Existe sessão guardada para destrancar. */
  hasSession: boolean;
}

/**
 * Oferecer a tranca só faz sentido se o aparelho tem o sensor **e** a pessoa
 * já cadastrou o rosto/digital nele. Sem cadastro, o prompt do sistema abre e
 * falha, e a opção no perfil vira uma promessa quebrada.
 */
export function canOfferLock(d: Pick<LockDecision, "hasHardware" | "isEnrolled">): boolean {
  return d.hasHardware && d.isEnrolled;
}

/**
 * Trancar ou não na abertura.
 *
 * O caso que importa é o do meio: a pessoa ligou a tranca e depois **apagou**
 * o rosto do aparelho (trocou de telefone, resetou a biometria). Se a gente
 * trancasse assim mesmo, ela ficaria de fora da própria conta sem nada a
 * apertar. Então a tranca cai sozinha e o app abre — a senha continua sendo a
 * chave de verdade, e ninguém perde o acesso por causa de um sensor.
 */
export function shouldLock(d: LockDecision): boolean {
  if (!d.hasSession) return false;
  if (!d.preferenceOn) return false;
  return canOfferLock(d);
}

/**
 * Quanto tempo o app pode ficar em segundo plano antes de pedir o rosto de
 * novo.
 *
 * Trancar só na abertura a frio não protegeria quase nada: o app fica semanas
 * vivo na bandeja, e quem pega o telefone desbloqueado entra por ali sem
 * passar por tranca nenhuma. Trancar a cada troca de app, por outro lado,
 * castiga o uso normal — abrir a câmera para fotografar um documento e voltar
 * não deveria exigir o rosto outra vez.
 *
 * Dois minutos separam as duas coisas: cobre a ida e volta a outro app e não
 * cobre o telefone esquecido na mesa.
 */
export const RELOCK_AFTER_MS = 2 * 60 * 1000;

/** Se o app voltou ao primeiro plano tempo demais depois de sair dele. */
export function shouldRelock(elapsedMs: number, preferenceOn: boolean): boolean {
  if (!preferenceOn) return false;
  return elapsedMs >= RELOCK_AFTER_MS;
}
