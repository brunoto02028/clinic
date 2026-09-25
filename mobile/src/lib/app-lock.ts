import { AppState, type AppStateStatus } from "react-native";
import { lockIsActive } from "@/lib/biometrics";
import { shouldRelock } from "@/lib/biometric-rules";
import { useAuth } from "@/store/auth";

/**
 * Re-tranca o app quando ele passa tempo demais em segundo plano.
 *
 * Sem isto a tranca só valeria na abertura a frio — e um app de saúde fica
 * semanas vivo na bandeja do iPhone. Quem pega o telefone desbloqueado e o
 * encontra aberto ali leria o prontuário inteiro sem encostar em nenhuma
 * tranca. O relógio começa quando o app sai da tela.
 */
export function wireAppLock(): () => void {
  let leftAt: number | null = null;

  const onChange = (state: AppStateStatus) => {
    if (state === "active") {
      const elapsed = leftAt === null ? 0 : Date.now() - leftAt;
      leftAt = null;
      void (async () => {
        // `lockIsActive`, não a preferência crua: ele junta a preferência com o
        // que o aparelho ainda consegue fazer. Olhar só a preferência trancava
        // quem ligou a opção e depois apagou o rosto do telefone — e aí o
        // re-lock contradizia a abertura a frio, que já respeita isso. Dois
        // resultados opostos no mesmo aparelho, conforme o app tenha sido morto
        // ou não.
        if (!shouldRelock(elapsed, true)) return;
        if (await lockIsActive(true)) useAuth.getState().relock();
      })();
      return;
    }
    // `inactive` é a troca de app no iOS e a central de controle; conta igual,
    // senão o relógio nunca começaria em metade das saídas.
    if (leftAt === null) leftAt = Date.now();
  };

  const sub = AppState.addEventListener("change", onChange);
  return () => sub.remove();
}

