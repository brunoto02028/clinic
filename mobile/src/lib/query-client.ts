import { QueryClient } from "@tanstack/react-query";

/**
 * The app's single QueryClient, in a module of its own so the auth store can
 * reach it.
 *
 * It used to be created inside app/_layout.tsx, where nothing else could touch
 * it — so signing out cleared the tokens and left every cached query in place.
 * On a shared phone that is a cross-account leak with teeth: user A signs out,
 * user B signs in within the cache lifetime, the screening wizard opens with
 * A's cached screening, B's own refetch returns nothing to overwrite it, and
 * the first autosave writes A's health data — red flags included — into B's
 * account. The module guard likewise decided on A's modules until the refetch
 * landed. `clearSessionCache` is called on every identity change.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

/** Drop everything cached for the previous identity. Cancels in-flight
 *  queries first, so a slow response for the old user cannot land after the
 *  clear and repopulate the cache. */
export async function clearSessionCache(): Promise<void> {
  await queryClient.cancelQueries();
  queryClient.clear();
}
