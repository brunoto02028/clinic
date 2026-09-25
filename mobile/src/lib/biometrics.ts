import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { lockPreference } from "@/lib/secure-storage";
import { canOfferLock, kindFor, labelFor, shouldLock, type BiometricKind } from "@/lib/biometric-rules";

/**
 * A tranca biométrica do app.
 *
 * O que ela é: uma tranca em cima de uma sessão que já existe. O app guarda o
 * refresh token no cofre do aparelho (Keychain/Keystore), então o paciente já
 * não digitava senha a cada abertura — abria e estava dentro. Num app de saúde
 * isso significa que quem pega o telefone desbloqueado lê o prontuário. A
 * biometria fecha essa porta.
 *
 * O que ela **não** é: um segundo fator, nem um substituto da senha. O rosto
 * vale neste aparelho e mais nada; a conta continua acessível por senha em
 * qualquer outro. Por isso nada aqui pode deixar alguém trancado do lado de
 * fora — ver `shouldLock` em biometric-rules.ts.
 */

const isWeb = Platform.OS === "web";

export interface BiometricCapability {
  /** Dá para oferecer a tranca neste aparelho. */
  canOffer: boolean;
  /** O aparelho tem o sensor. */
  hasHardware: boolean;
  /** A pessoa já cadastrou rosto/digital no aparelho. */
  isEnrolled: boolean;
  kind: BiometricKind;
  /** Como este aparelho chama a tranca ("Face ID", "digital", …). */
  label: { en: string; pt: string };
}

const UNAVAILABLE: BiometricCapability = {
  canOffer: false,
  hasHardware: false,
  isEnrolled: false,
  kind: "none",
  label: labelFor("web", "none"),
};

/** O que este aparelho oferece, agora. Nunca lança. */
export async function capability(): Promise<BiometricCapability> {
  if (isWeb) return UNAVAILABLE;
  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const kind = kindFor(types);
    return {
      canOffer: canOfferLock({ hasHardware, isEnrolled }),
      hasHardware,
      isEnrolled,
      kind,
      label: labelFor(Platform.OS, kind),
    };
  } catch {
    // Um aparelho que não responde sobre o próprio sensor é um aparelho sem
    // sensor, para o nosso caso.
    return UNAVAILABLE;
  }
}

/** Pede o rosto/digital. `true` só quando o sistema confirmou. */
export async function prompt(message: { en: string; pt: string }, lang: string): Promise<boolean> {
  if (isWeb) return false;
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: lang === "pt" ? message.pt : message.en,
      cancelLabel: lang === "pt" ? "Cancelar" : "Cancel",
      // O código do aparelho serve como saída: quem trocou o rosto ainda entra
      // com o PIN do telefone em vez de ficar preso na tela de tranca.
      disableDeviceFallback: false,
    });
    return res.success;
  } catch {
    return false;
  }
}

/** A tranca está ligada **e** o aparelho ainda consegue cumpri-la. */
export async function lockIsActive(hasSession: boolean): Promise<boolean> {
  if (isWeb) return false;
  const [pref, cap] = await Promise.all([lockPreference.get(), capability()]);
  return shouldLock({
    hasHardware: cap.hasHardware,
    isEnrolled: cap.isEnrolled,
    preferenceOn: pref,
    hasSession,
  });
}

