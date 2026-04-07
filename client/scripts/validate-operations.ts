/**
 * Validates all client GraphQL operations against the server schema.
 *
 * Run: npm run validate:schema
 *
 * Catches:
 *   - Client operations referencing fields that don't exist in the schema
 *   - Incorrect argument types or missing required arguments
 *   - Schema renames or removals that client operations haven't caught up with
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSchema, parse, validate } from "graphql";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. Extract SDL from server typeDefs.ts
const typeDefsPath = resolve(__dirname, "../../server/src/schema/typeDefs.ts");
const typeDefsContent = readFileSync(typeDefsPath, "utf-8");
const sdlMatch = typeDefsContent.match(/gql`([\s\S]*?)`/);
if (!sdlMatch) {
  console.error("Could not find gql template literal in typeDefs.ts");
  process.exit(1);
}
const schema = buildSchema(sdlMatch[1]!);

// 2. Extract operation strings from operations.ts
const opsPath = resolve(__dirname, "../src/graphql/operations.ts");
const opsContent = readFileSync(opsPath, "utf-8");

// Match all graphql(`...`) template literals
const operationRegex = /graphql\(`([\s\S]*?)`\)/g;
const operations: Array<{ name: string; source: string }> = [];
let match: RegExpExecArray | null;
while ((match = operationRegex.exec(opsContent)) !== null) {
  const source = match[1]!;
  const nameMatch = source.match(/(?:query|mutation|subscription)\s+(\w+)/);
  operations.push({
    name: nameMatch ? nameMatch[1]! : "anonymous",
    source,
  });
}

if (operations.length === 0) {
  console.error("No GraphQL operations found in operations.ts");
  process.exit(1);
}

// 3. Validate each operation
let hasErrors = false;
for (const op of operations) {
  try {
    const document = parse(op.source);
    const errors = validate(schema, document);
    if (errors.length > 0) {
      hasErrors = true;
      console.error(`\n✗ ${op.name}:`);
      for (const err of errors) {
        console.error(`  ${err.message}`);
      }
    } else {
      console.log(`✓ ${op.name}`);
    }
  } catch (parseError) {
    hasErrors = true;
    console.error(`\n✗ ${op.name}: parse error — ${(parseError as Error).message}`);
  }
}

console.log(`\n${operations.length} operations checked.`);

if (hasErrors) {
  console.error("\nSchema validation FAILED — client operations do not match server schema.");
  process.exit(1);
} else {
  console.log("Schema validation passed.");
}
