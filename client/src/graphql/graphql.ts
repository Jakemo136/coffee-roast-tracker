import { initGraphQLTada } from "gql.tada";
import type { introspection } from "./graphql-env.d.ts";

export const graphql = initGraphQLTada<{
  introspection: introspection;
  scalars: {
    DateTime: string;
    JSON: unknown;
  };
}>();

export type { FragmentOf, ResultOf, VariablesOf } from "gql.tada";
