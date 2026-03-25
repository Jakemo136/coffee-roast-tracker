import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { typeDefs } from "./schema/typeDefs.js";
import { resolvers } from "./resolvers/index.js";
import { createContext, type Context } from "./context.js";

const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
});

const port = parseInt(process.env.PORT ?? "4000", 10);

const { url } = await startStandaloneServer(server, {
  listen: { port },
  context: async ({ req }) => createContext({ req }),
});

console.log(`🚀 Server ready at ${url}`);
