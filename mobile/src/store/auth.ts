import { create } from "zustand";
import { tokenStorage } from "@/lib/secure-storage";
import { setOnAuthFailure, refreshSession, pendingRefresh } from "@/api/client";
import { loginRequest, logoutRequest, registerRequest } from "@/api/auth";
import type { AuthUser } from "@/api/types";
import { clearSessionCache } from "@/lib/query-client";

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: Status;
  user: AuthUser | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string, tenantSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  status: "loading",
  user: null,

  /** Restores a session from stored tokens on app boot (shared refresh lock). */
  bootstrap: async () => {
    const refresh = await tokenStorage.getRefresh();
    if (!refresh) {
      set({ status: "unauthenticated", user: null });
      return;
    }
    const res = await refreshSession();
    if (res.ok && res.user) {
      set({ status: "authenticated", user: res.user });
    } else {
      await tokenStorage.clear();
      set({ status: "unauthenticated", user: null });
    }
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
