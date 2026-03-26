/**
 * Extracts the GraphQL SDL from the server's typeDefs.ts and writes it as
 * a standalone schema.graphql file that gql.tada uses for type inference.
 *
 * Re-run this script whenever the server schema changes:
 *   npm run generate:schema
 */
import { buildSchema, printSchema } from "graphql";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const typeDefsPath = resolve(__dirname, "../../server/src/schema/typeDefs.ts");
const fileContent = readFileSync(typeDefsPath, "utf-8");

// Extract the template literal content between backticks after gql`
const match = fileContent.match(/gql`([\s\S]*?)`/);
if (!match) {
  throw new Error("Could not find gql template literal in typeDefs.ts");
}

const sdl = match[1]!;
const schema = buildSchema(sdl);
const printed = printSchema(schema);

const outDir = resolve(__dirname, "../src/graphql");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "schema.graphql"), printed, "utf-8");
console.log("Schema written to src/graphql/schema.graphql");
