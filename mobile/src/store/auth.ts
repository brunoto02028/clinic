import { create } from "zustand";
import { tokenStorage } from "@/lib/secure-storage";
import { setOnAuthFailure, refreshSession, pendingRefresh } from "@/api/client";
import { loginRequest, logoutRequest, registerRequest } from "@/api/auth";
import type { AuthUser } from "@/api/types";
import { clearSessionCache } from "@/lib/query-client";
import { lockIsActive, prompt as biometricPrompt } from "@/lib/biometrics";
import { deviceLang } from "@/lib/i18n";

/**
 * `locked` é uma sessão válida que ainda não foi liberada pelo rosto/digital.
 * Os tokens estão no cofre e continuam lá — o que falta é a pessoa provar que
 * é dona do aparelho. É diferente de `unauthenticated`, onde não há sessão
 * nenhuma para liberar.
 */
type Status = "loading" | "locked" | "authenticated" | "unauthenticated";

interface AuthState {
  status: Status;
  user: AuthUser | null;
  bootstrap: () => Promise<void>;
  /** Pede a biometria e, dando certo, abre a sessão guardada. */
  unlock: () => Promise<"ok" | "refused" | "offline">;
  /** Volta a trancar sem derrubar a sessão (app ficou tempo demais em segundo plano). */
  relock: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string, tenantSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  status: "loading",
  user: null,

  /** Restores a session from stored tokens on app boot (shared refresh lock). */
  bootstrap: async () => {
    try {
      const refresh = await tokenStorage.getRefresh();
      if (!refresh) {
        set({ status: "unauthenticated", user: null });
        return;
      }
      // A tranca vem antes de qualquer chamada ao servidor: enquanto ela não
      // cair, nem o refresh acontece, e nada do paciente é carregado.
      if (await lockIsActive(true)) {
        set({ status: "locked", user: null });
        return;
      }
      const res = await refreshSession();
      if (res.ok && res.user) {
        set({ status: "authenticated", user: res.user });
        return;
      }
      // Sem rede os tokens ficam: a sessão não morreu, o telefone é que não
      // alcançou o servidor. Apagá-los aqui transformava um túnel de metrô em
      // logout permanente.
      if (res.reason !== "network") await tokenStorage.clear();
      set({ status: "unauthenticated", user: null });
    } catch {
      // O cofre do aparelho pode lançar (keystore inválido depois de restaurar
      // um backup). Sem isto a promessa rejeitava, `status` ficava em "loading"
      // para sempre, e o app abria num spinner eterno — sem saída nenhuma.
      set({ status: "unauthenticated", user: null });
    }
  },

  unlock: async () => {
    // O idioma do prompt vem do aparelho: aqui não há paciente carregado para
    // consultar. Estava fixo em inglês, e o brasileiro lia a tela em português
    // com o prompt do iPhone em inglês.
    const ok = await biometricPrompt(
      { en: "Unlock BPR", pt: "Destravar o BPR" },
      deviceLang()
    );
    if (!ok) return "refused";

    const res = await refreshSession();
    if (res.ok && res.user) {
      set({ status: "authenticated", user: res.user });
      return "ok";
    }
    // Sem rede a sessão continua viva — segue trancado, e a tela oferece
    // tentar de novo. Apagar os tokens aqui deixaria o paciente sem sessão E
    // sem como entrar, porque o login também precisa de rede.
    if (res.reason === "network") return "offline";

    // A sessão guardada morreu enquanto o app estava trancado (token expirado
    // ou revogado no painel). Cai no login com senha, que é a saída honesta.
    await tokenStorage.clear();
    set({ status: "unauthenticated", user: null });
    return "refused";
  },

  relock: () => {
    if (useAuth.getState().status !== "authenticated") return;
    set({ status: "locked", user: null });
  },

  login: async (email, password) => {
    const res = await loginRequest(email, password);
    await tokenStorage.save(res.accessToken, res.refreshToken);
    // Cleared before the status flips, so no screen mounts against the cache
    // of whoever used this device last. See lib/query-client.ts.
    await clearSessionCache();
    set({ status: "authenticated", user: res.user });
  },

  register: async (firstName, lastName, email, password, tenantSlug) => {
    const res = await registerRequest(firstName, lastName, email, password, tenantSlug);
    await tokenStorage.save(res.accessToken, res.refreshToken);
    await clearSessionCache();
    set({ status: "authenticated", user: res.user });
  },

  logout: async () => {
    // Wait for any in-flight rotation so we revoke the current token, not a
    // stale one (which would leave the freshly-issued refresh orphaned).
    await pendingRefresh()?.catch(() => {});
    const refresh = await tokenStorage.getRefresh();
    if (refresh) await logoutRequest(refresh);
    await tokenStorage.clear();
    // The step that was missing: tokens went, cached health data stayed.
    await clearSessionCache();
    set({ status: "unauthenticated", user: null });
  },
}));

// When the client can't recover a session (refresh failed mid-request),
// reflect that in the store so the UI redirects to login.
setOnAuthFailure(() => {
  // A lost session is an identity change too — the next person to sign in
  // must not inherit this one's cache.
  void clearSessionCache();
  useAuth.setState({ status: "unauthenticated", user: null });
});
