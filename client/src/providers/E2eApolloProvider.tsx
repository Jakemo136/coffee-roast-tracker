import { ApolloProvider as ApolloClientProvider } from "@apollo/client/react";
import { useMemo } from "react";
import { createApolloClient } from "../lib/apollo";

interface E2eApolloProviderProps {
  children: React.ReactNode;
}

/**
 * Apollo provider for E2E tests. Bypasses Clerk and injects a fixed
 * test token that the server recognizes when E2E_TEST_USER_ID is set.
 */
export function E2eApolloProvider({ children }: E2eApolloProviderProps) {
  const client = useMemo(
    () => createApolloClient(async () => "e2e-test-token"),
    [],
  );
  return (
    <ApolloClientProvider client={client}>{children}</ApolloClientProvider>
  );
}
