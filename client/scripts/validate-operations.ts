/**
 * Validates all client GraphQL operations against the server schema.
 *
 * Run: npm run validate:schema
 *
 * Catches:
 *   - Client operations referencing fields that don't exist in the schema
 *   - Incorrect argument types or missing required arguments
 *   - Schema renames or removals that client operations haven't caught up with
 *
 * Scans operations.ts and all component files that export colocated fragments.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSchema, parse, validate } from "graphql";
import { globSync } from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));

const typeDefsPath = resolve(__dirname, "../../server/src/schema/typeDefs.ts");
const typeDefsContent = readFileSync(typeDefsPath, "utf-8");
const sdlMatch = typeDefsContent.match(/gql`([\s\S]*?)`/);
if (!sdlMatch) {
  console.error("Could not find gql template literal in typeDefs.ts");
  process.exit(1);
}
const schema = buildSchema(sdlMatch[1]!);

// Collect all fragment definitions from component files
const srcDir = resolve(__dirname, "../src");
const tsxFiles = globSync("**/*.{ts,tsx}", { cwd: srcDir, absolute: true });
const fragmentRegex = /graphql\(`([\s\S]*?)`\)/g;
const fragmentSources: string[] = [];

for (const file of tsxFiles) {
  if (file.endsWith("operations.ts")) continue;
  const content = readFileSync(file, "utf-8");
  let fMatch: RegExpExecArray | null;
  const localRegex = new RegExp(fragmentRegex.source, "g");
  while ((fMatch = localRegex.exec(content)) !== null) {
    const source = fMatch[1]!;
    // Only collect fragment definitions, skip @_unmask directive for parsing
    if (/^\s*fragment\s+/.test(source)) {
      fragmentSources.push(source.replace(/@_unmask/g, ""));
    }
  }
}

const fragmentMap = new Map<string, string>();
for (const src of fragmentSources) {
  const nameMatch = src.match(/fragment\s+(\w+)/);
  if (nameMatch) fragmentMap.set(nameMatch[1]!, src);
}

function collectFragments(source: string): string {
  const needed = new Set<string>();
  const spreadRegex = /\.\.\.(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = spreadRegex.exec(source)) !== null) {
    const name = m[1]!;
    if (fragmentMap.has(name) && !needed.has(name)) {
      needed.add(name);
      // Recursively collect fragments referenced by this fragment
      const fragSource = fragmentMap.get(name)!;
      let inner: RegExpExecArray | null;
      const innerRegex = /\.\.\.(\w+)/g;
      while ((inner = innerRegex.exec(fragSource)) !== null) {
        if (fragmentMap.has(inner[1]!)) needed.add(inner[1]!);
      }
    }
  }
  return Array.from(needed).map((n) => fragmentMap.get(n)!).join("\n");
}

// Extract operations from operations.ts
const opsPath = resolve(__dirname, "../src/graphql/operations.ts");
const opsContent = readFileSync(opsPath, "utf-8");

const operationRegex = /graphql\(`([^`]*)`(?:\s*,\s*\[[^\]]*\])?\s*\)/g;
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

let hasErrors = false;
for (const op of operations) {
  try {
    const neededFragments = collectFragments(op.source);
    const fullSource = neededFragments
      ? `${neededFragments}\n${op.source}`
      : op.source;
    const document = parse(fullSource);
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
