import { describe, it, expect } from "vitest";
import { graphql } from "../graphql";

describe("gql.tada setup", () => {
  it("creates a typed document from a query string", () => {
    const MyBeansQuery = graphql(`
      query MyBeans {
        myBeans {
          id
          shortName
          bean {
            id
            name
            origin
          }
        }
      }
    `);

    expect(MyBeansQuery).toBeDefined();
    expect(MyBeansQuery.kind).toBe("Document");
  });
});
