import { ApolloClient, InMemoryCache, from } from "@apollo/client/core";
import { HttpLink } from "@apollo/client/link/http";
import { setContext } from "@apollo/client/link/context";

export function createApolloClient(getToken: () => Promise<string | null>) {
  const httpLink = new HttpLink({
    uri: "/graphql",
  });

  const authLink = setContext(async (_operation, prevContext) => {
    const token = await getToken();
    return {
      ...prevContext,
      headers: {
        ...prevContext.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  return new ApolloClient({
    link: from([authLink, httpLink]),
    cache: new InMemoryCache(),
  });
}
