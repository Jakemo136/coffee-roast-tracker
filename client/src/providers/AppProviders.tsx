import { ClerkProvider } from "@clerk/clerk-react";
import { BrowserRouter } from "react-router-dom";
import { ApolloProvider } from "./ApolloProvider";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const clerkPublishableKey = import.meta.env
    .VITE_CLERK_PUBLISHABLE_KEY as string;

  if (!clerkPublishableKey) {
    throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <BrowserRouter>
        <ApolloProvider>{children}</ApolloProvider>
      </BrowserRouter>
    </ClerkProvider>
  );
}
