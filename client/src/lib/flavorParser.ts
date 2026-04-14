/**
 * Fuzzy flavor parser — matches supplier/cupping note prose against
 * a list of known flavor descriptors.
 *
 * Strategy:
 *  1. Normalize the input text (lowercase, strip punctuation)
 *  2. For each known flavor, check if it appears as a substring in the
 *     text, or if any of its constituent words appear in the text.
 *  3. Prefix matching (min 4 chars) catches morphological variants:
 *     "fruity" shares prefix "frui" with "fruit", "berries" shares
 *     "berr" with "blueberry", etc.
 *  4. Each descriptor matches at most once.
 */

const MIN_PREFIX = 4;

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[/\\()[\]{}"'`]/g, " ")
    .replace(/[,;.:!?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Check if two words share a common prefix of at least MIN_PREFIX chars */
function sharesPrefix(a: string, b: string): boolean {
  if (a.length < MIN_PREFIX || b.length < MIN_PREFIX) return false;
  const len = Math.min(a.length, b.length, MIN_PREFIX);
  return a.slice(0, len) === b.slice(0, len);
}

interface FlavorDescriptor {
  name: string;
  color?: string;
}

export function parseFlavorNotes(
  text: string,
  descriptors: FlavorDescriptor[],
): string[] {
  if (!text.trim()) return [];

  const normalized = normalizeText(text);
  const textWords = normalized.split(" ").filter(Boolean);

  const matched: string[] = [];

  for (const descriptor of descriptors) {
    const descriptorLower = descriptor.name.toLowerCase();
    const descriptorWords = descriptorLower.split(" ");

    // Direct substring: "dark chocolate" appears in text
    if (normalized.includes(descriptorLower)) {
      matched.push(descriptor.name);
      continue;
    }

    // Any word from the descriptor appears as a word in the text
    // e.g. descriptor "Dark Chocolate" matches if "chocolate" is in the text
    const anyWordMatch = descriptorWords.some((dw) =>
      textWords.includes(dw),
    );
    if (anyWordMatch) {
      matched.push(descriptor.name);
      continue;
    }

    // Prefix matching: "fruity" and "fruit" share prefix "frui"
    const anyPrefixMatch = descriptorWords.some((dw) =>
      textWords.some((tw) => sharesPrefix(tw, dw)),
    );
    if (anyPrefixMatch) {
      matched.push(descriptor.name);
      continue;
    }

    // Substring containment: "berry" (from "berries") found inside "blueberry"
    // Strip simple plural/adjective suffixes before checking
    const anySubstringMatch = textWords.some((tw) => {
      const base = tw.replace(/(?:ies|ied|ed|ing|s)$/, (m) =>
        m === "ies" || m === "ied" ? "y" : "",
      );
      return base.length >= MIN_PREFIX && descriptorWords.some((dw) => dw.includes(base));
    });
    if (anySubstringMatch) {
      matched.push(descriptor.name);
      continue;
    }
  }

  return matched;
}
