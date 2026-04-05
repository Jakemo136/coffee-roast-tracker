/**
 * Mock auth context for E2E tests. Replaces ClerkProvider so the app
 * can render without a real Clerk key.
 *
 * The `authedPage` fixture sets window.__e2e_authed = true via addInitScript.
 * This context reads that flag to determine auth state.
 */
import { createContext, useContext, useMemo } from "react";

interface E2eAuthContextValue {
  isSignedIn: boolean;
  isLoaded: boolean;
  userId: string | null;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const E2eAuthContext = createContext<E2eAuthContextValue>({
  isSignedIn: false,
  isLoaded: true,
  userId: null,
  getToken: async () => null,
  signOut: async () => {},
});

export function E2eAuthProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => {
    const isAuthed =
      typeof window !== "undefined" &&
      (window as any).__e2e_authed === true;

    return {
      isSignedIn: isAuthed,
      isLoaded: true,
      userId: isAuthed ? "e2e-user" : null,
      getToken: async () => (isAuthed ? "e2e-test-token" : null),
      signOut: async () => {},
    };
  }, []);

  return (
    <E2eAuthContext.Provider value={value}>{children}</E2eAuthContext.Provider>
  );
}

export function useE2eAuth() {
  return useContext(E2eAuthContext);
}
