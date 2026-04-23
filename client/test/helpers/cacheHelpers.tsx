import { render } from "@testing-library/react";
import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { ApolloProvider } from "@apollo/client/react";
import { MockLink } from "@apollo/client/testing";
import { MemoryRouter } from "react-router-dom";
import type { DocumentNode } from "graphql";

interface FragmentWrite {
  fragment: DocumentNode;
  data: Record<string, unknown>;
}

export function renderWithCache(
  ui: React.ReactNode,
  fragments: FragmentWrite[],
  { route = "/" }: { route?: string } = {},
) {
  const cache = new InMemoryCache();
  for (const { fragment, data } of fragments) {
    cache.writeFragment({ fragment, data });
  }
  const client = new ApolloClient({
    cache,
    link: new MockLink([]),
  });
  return render(
    <ApolloProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </ApolloProvider>,
  );
}
