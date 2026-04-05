import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter } from "react-router-dom";
import { ApolloProvider } from "./ApolloProvider";
import { E2eApolloProvider } from "./E2eApolloProvider";

interface AppProvidersProps {
  children: React.ReactNode;
}

const isE2e = import.meta.env.VITE_E2E_TEST === "true";

export function AppProviders({ children }: AppProvidersProps) {
  if (isE2e) {
    return (
      <BrowserRouter>
        <E2eApolloProvider>{children}</E2eApolloProvider>
      </BrowserRouter>
    );
  }

  const clerkPublishableKey = import.meta.env
    .VITE_CLERK_PUBLISHABLE_KEY as string;

  if (!clerkPublishableKey) {
    throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/sign-in">
      <BrowserRouter>
        <ApolloProvider>{children}</ApolloProvider>
      </BrowserRouter>
    </ClerkProvider>
  );
}
