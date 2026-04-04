/**
 * Auth state hook that works in both production (Clerk) and E2E test mode.
 *
 * In production: delegates to Clerk's useAuth().
 * In E2E mode: reads from E2eAuthContext (no Clerk dependency).
 *
 * The `isE2e` check is a build-time constant (import.meta.env is replaced
 * at compile time), so the conditional hook call is safe — the branch
 * never changes at runtime.
 */
import { useAuth } from "@clerk/clerk-react";
import { useE2eAuth } from "../providers/E2eAuthContext";

const isE2e = import.meta.env.VITE_E2E_TEST === "true";

export function useAuthState() {
  // Both hooks are always called in the same order per environment.
  // isE2e is a compile-time constant so branch is deterministic.
  if (isE2e) {
    return useE2eAuth();
  }

  const clerkAuth = useAuth();
  return {
    isSignedIn: clerkAuth.isSignedIn ?? false,
    isLoaded: clerkAuth.isLoaded,
    userId: clerkAuth.userId,
    getToken: clerkAuth.getToken,
    signOut: clerkAuth.signOut,
  };
}
