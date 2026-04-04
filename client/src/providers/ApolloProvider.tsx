import { ApolloProvider as ApolloClientProvider } from "@apollo/client/react";
import { useAuth } from "@clerk/clerk-react";
import { useMemo } from "react";
import { createApolloClient } from "../lib/apollo";

interface ApolloProviderProps {
  children: React.ReactNode;
}

export function ApolloProvider({ children }: ApolloProviderProps) {
  const { getToken } = useAuth();
  const client = useMemo(() => createApolloClient(getToken), [getToken]);
  return (
    <ApolloClientProvider client={client}>{children}</ApolloClientProvider>
  );
}
