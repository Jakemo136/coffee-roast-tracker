import type { PrismaClient } from "@prisma/client";
import { GraphQLError } from "graphql";
import { FlavorService } from "./flavorService.js";

export interface BeanScrapeResult {
  name: string | null;
  origin: string | null;
  process: string | null;
  elevation: string | null;
  variety: string | null;
  bagNotes: string | null;
  score: number | null;
  cropYear: number | null;
  suggestedFlavors: string[];
}

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
};

// Common labels used across sites for each field
const ORIGIN_LABELS = [
  "country",
  "region",
  "local region",
  "origin",
  "source",
  "growing region",
];
const PROCESS_LABELS = [
  "process",
  "processing",
  "processing method",
  "preparation",
];
const ELEVATION_LABELS = [
  "elevation",
  "altitude",
  "altitude (meters)",
  "altitude (masl)",
  "growing altitude",
];
const VARIETY_LABELS = [
  "variety",
  "varietal",
  "varietals",
  "varieties",
  "cultivar detail",
  "cultivar",
  "botanical variety",
];
const CUPPING_NOTES_LABELS = [
  "cupping notes",
  "cupping notes upon arrival",
  "cup notes",
  "flavor notes",
  "tasting notes",
];
const SCORE_LABELS = [
  "cupping score",
  "cup score",
  "sca score",
  "score",
];
const CROP_YEAR_LABELS = [
  "crop year",
  "harvest",
  "harvest year",
  "crop",
];

export class ScrapingService {
  constructor(private prisma: PrismaClient) {}

  async scrapeBeanUrl(url: string): Promise<BeanScrapeResult> {
    try {
      new URL(url);
    } catch {
      throw new GraphQLError("Invalid URL", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    let response: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      response = await fetch(url, {
        headers: BROWSER_HEADERS,
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch {
      throw new GraphQLError(
        "Could not connect to that URL. Check that it's correct and try again.",
        { extensions: { code: "BAD_USER_INPUT" } },
      );
    }

    if (response.status === 403) {
      throw new GraphQLError(
        "This site blocked our request. Try pasting the page content instead.",
        { extensions: { code: "FORBIDDEN" } },
      );
    }

    if (!response.ok) {
      throw new GraphQLError(`Failed to fetch URL: ${response.status}`, {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    const html = await response.text();
    return this.parseProductPage(html);
  }

  async parseProductPage(html: string): Promise<BeanScrapeResult> {
    const name = this.extractName(html);
    const origin = this.extractLabeledField(html, ORIGIN_LABELS);
    const process = this.extractLabeledField(html, PROCESS_LABELS);
    const elevation = this.extractElevation(html);
    const variety = this.extractLabeledField(html, VARIETY_LABELS);
    const bagNotes = this.extractBagNotes(html);
    const score = this.extractScore(html);
    const cropYear = this.extractCropYear(html);
    const flavorService = new FlavorService(this.prisma);
    const cuppingNotesText = this.extractCuppingNotesText(html);
    // Prefer structured cupping notes, then bag notes prose.
    // Fall back to the full input only for plain-text pastes (no HTML tags),
    // to avoid false positives from scanning raw page markup.
    const isPlainText = !/<[a-z][\s\S]*>/i.test(html);
    const flavorSource = cuppingNotesText ?? bagNotes ?? (isPlainText ? html : "");
    const matchedDescriptors = await flavorService.parseSupplierNotes(flavorSource);
    const suggestedFlavors = matchedDescriptors.slice(0, 5).map((d) => d.name);

    return {
      name: name?.trim() ?? null,
      origin: origin?.trim() ?? null,
      process: process?.trim() ?? null,
      elevation: elevation?.trim() ?? null,
      variety: variety?.trim() ?? null,
      bagNotes: bagNotes?.trim() ?? null,
      score,
      cropYear,
      suggestedFlavors,
    };
  }

  // ── Name extraction ──────────────────────────────────────────────

  private extractName(html: string): string | null {
    // Prefer itemprop="name" when present (avoids CBC duplicate spans)
    const itemprop = this.matchAndStrip(
      html,
      /<[^>]*itemprop="name"[^>]*>(.*?)<\/[^>]+>/si,
    );
    if (itemprop) return itemprop;

    // WooCommerce: <h1 class="product_title ...">
    const woo = this.matchAndStrip(
      html,
      /<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>(.*?)<\/h1>/si,
    );
    if (woo) return woo;

    // Shopify: product JSON in page
    const shopifyTitle = this.extractShopifyField(html, "title");
    if (shopifyTitle) return shopifyTitle;

    // Generic: first <h1> on page
    const h1 = this.matchAndStrip(html, /<h1[^>]*>(.*?)<\/h1>/si);
    if (h1) return h1;

    // Generic: first <h2> (some sites like Roast Masters use h2)
    const h2 = this.matchAndStrip(html, /<h2[^>]*>(.*?)<\/h2>/si);
    if (h2) return h2;

    // Plain text: first non-empty line (for browser copy-paste)
    if (!/<[a-z][\s\S]*>/i.test(html)) {
      const firstLine = html.split("\n").map((l) => l.trim()).find((l) => l.length > 0);
      if (firstLine && firstLine.length < 200 && !firstLine.includes("\t")) return firstLine;
    }
    return null;
  }

  // ── Label-based field extraction (origin, process, variety) ──────

  /**
   * Shared extraction for fields that follow the same pattern:
   * try structured HTML labels first, then fall back to description blocks.
   */
  private extractLabeledField(html: string, labels: string[]): string | null {
    return this.extractByLabels(html, labels) ?? this.extractFromDescription(html, labels);
  }

  // ── Elevation extraction ─────────────────────────────────────────

  private extractElevation(html: string): string | null {
    const fromLabels = this.extractLabeledField(html, ELEVATION_LABELS);
    if (fromLabels) return fromLabels;

    // Fallback: look for MASL pattern in text
    const maslMatch = html.match(
      /(\d[\d,.]+ *[-–to]+ *\d[\d,.]+ *(?:masl|meters|m\.?a\.?s\.?l\.?))/i,
    );
    if (maslMatch?.[1]) return this.stripTags(maslMatch[1]);

    return null;
  }

  // ── Bag notes / description extraction ───────────────────────────

  private extractBagNotes(html: string): string | null {
    // WooCommerce short description
    const shortDesc = this.matchAndStrip(
      html,
      /<div[^>]*class="[^"]*(?:short-description|woocommerce-product-details__short-description)[^"]*"[^>]*>\s*<p>(.*?)<\/p>/si,
    );
    if (shortDesc) return shortDesc;

    // Sweet Maria's farm-notes
    const farmNotes = this.matchAndStrip(
      html,
      /<div[^>]*class="[^"]*farm-notes[^"]*"[^>]*>\s*<p>(.*?)<\/p>/si,
    );
    if (farmNotes) return farmNotes;

    // Shopify: extract description, clean it up
    const shopifyDesc = this.extractShopifyField(html, "description");
    if (shopifyDesc) {
      // Strip embedded spec labels from the description to get just the narrative
      const cleaned = this.stripTags(shopifyDesc)
        .replace(
          /\b(Country|Region|Varietal|Process|Altitude|Cupping Notes|Recommended Roast|Cupping Score|Fragrance\/Aroma|Acidity|Flavor\/Nuances|Sweetness|Body\/Mouthfeel|Finish\/Aftertaste)\s*:.*$/gim,
          "",
        )
        .replace(/\n{2,}/g, "\n")
        .trim();
      if (cleaned.length > 20) return cleaned;
    }

    // Look for cupping notes section
    const cuppingNotes = this.matchAndStrip(
      html,
      /(?:cupping\s*notes|tasting\s*notes|flavor\s*(?:profile|notes))\s*[:\-]?\s*(?:<[^>]*>)*\s*(.*?)(?:<\/(?:p|div|td|span|html)>|$)/si,
    );
    if (cuppingNotes && cuppingNotes.length > 10) return cuppingNotes;

    return null;
  }

  // ── Score extraction ─────────────────────────────────────────────

  private parseValidScore(value: string): number | null {
    const num = parseFloat(value);
    if (num >= 60 && num <= 100) return num;
    return null;
  }

  private extractScore(html: string): number | null {
    // Dedicated score field in table/list
    const fromTable = this.extractByLabels(html, SCORE_LABELS);
    if (fromTable) {
      const score = this.parseValidScore(fromTable);
      if (score !== null) return score;
    }

    // Score embedded in cupping notes (e.g., "85, black tea, grapefruit...")
    const cuppingNotesField = this.extractByLabels(html, CUPPING_NOTES_LABELS);
    if (cuppingNotesField) {
      const leadingScore = cuppingNotesField.match(/^(\d{2,3}(?:\.\d+)?)\s*[,;]/);
      if (leadingScore?.[1]) {
        const score = this.parseValidScore(leadingScore[1]);
        if (score !== null) return score;
      }
    }

    // Generic: look for "score" near a number
    const scorePattern = html.match(
      /(?:cupping|cup|sca)\s*score\s*[:\-]?\s*(?:<[^>]*>)*\s*(\d{2,3}(?:\.\d+)?)/i,
    );
    if (scorePattern?.[1]) {
      return this.parseValidScore(scorePattern[1]);
    }

    return null;
  }

  // ── Crop year extraction ─────────────────────────────────────────

  private extractCropYear(html: string): number | null {
    const fromTable = this.extractByLabels(html, CROP_YEAR_LABELS);
    if (fromTable) {
      // "2025 Crop", "2025/2026", or just "2025"
      const yearMatch = fromTable.match(/(20[1-3]\d)/);
      if (yearMatch?.[1]) return parseInt(yearMatch[1], 10);
    }

    // Look for "YYYY Crop" or "Crop Year: YYYY" in text
    const cropPattern = html.match(
      /(?:crop\s*(?:year)?|harvest\s*year)\s*[:\-]?\s*(?:<[^>]*>)*\s*(20[1-3]\d)/i,
    );
    if (cropPattern?.[1]) return parseInt(cropPattern[1], 10);

    return null;
  }

  // ── Flavor extraction ────────────────────────────────────────────

  /**
   * Extract raw cupping notes text for flavor matching.
   * Returns the cupping notes field text, or null if not found.
   * The caller passes this to FlavorService.parseSupplierNotes().
   */
  private extractCuppingNotesText(html: string): string | null {
    const fromLabels = this.extractByLabels(html, CUPPING_NOTES_LABELS);
    if (fromLabels) return fromLabels;

    const shopifyDesc = this.extractShopifyField(html, "description");
    if (shopifyDesc) {
      const notesMatch = this.stripTags(shopifyDesc).match(
        /cupping\s*notes\s*:\s*(.*?)(?:\n|$)/i,
      );
      if (notesMatch?.[1]) return notesMatch[1];
    }

    return null;
  }

  // ── Multi-strategy field extraction ──────────────────────────────

  /**
   * Try multiple extraction strategies for a labeled field:
   * 1. HTML table: <th>Label</th><td>Value</td>
   * 2. HTML table: <td>Label</td><td>Value</td>
   * 3. Definition list: <dt>Label</dt><dd>Value</dd>
   * 4. Bold-span: <b>Label:</b><span>Value</span>
   * 5. Strong-text: <strong>Label:</strong> Value
   * 6. List items: <li>LabelValue</li> (Coffee Bean Corral concatenated style)
   * 7. Colon-separated in text: Label: Value
   */
  private extractByLabels(html: string, labels: string[]): string | null {
    for (const label of labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Strategy 1: <th>Label</th> ... <td>Value</td>
      const thTd = this.matchAndStrip(
        html,
        new RegExp(
          `<th[^>]*>\\s*${escaped}\\s*</th>\\s*<td[^>]*>(.*?)</td>`,
          "si",
        ),
      );
      if (thTd) return thTd;

      // Strategy 2: <td>Label</td><td>Value</td>
      const tdTd = this.matchAndStrip(
        html,
        new RegExp(
          `<td[^>]*>\\s*${escaped}\\s*:?\\s*</td>\\s*<td[^>]*>(.*?)</td>`,
          "si",
        ),
      );
      if (tdTd) return tdTd;

      // Strategy 3: <dt>Label</dt><dd>Value</dd>
      const dtDd = this.matchAndStrip(
        html,
        new RegExp(
          `<dt[^>]*>\\s*${escaped}\\s*:?\\s*</dt>\\s*<dd[^>]*>(.*?)</dd>`,
          "si",
        ),
      );
      if (dtDd) return dtDd;

      // Strategy 4: <b>Label:</b><span>Value</span>
      const bSpan = this.matchAndStrip(
        html,
        new RegExp(
          `<b>\\s*${escaped}\\s*:?\\s*</b>\\s*<span[^>]*>(.*?)</span>`,
          "si",
        ),
      );
      if (bSpan) return bSpan;

      // Strategy 5: <strong>Label:</strong> Value (up to next tag or newline)
      const strongText = this.matchAndStrip(
        html,
        new RegExp(
          `<strong>\\s*${escaped}\\s*:?\\s*</strong>\\s*(.*?)(?:<(?:br|strong|div|p)|\\n)`,
          "si",
        ),
      );
      if (strongText) return strongText;

      // Strategy 5b: <b>Label:</b> Value (up to next tag or newline)
      const bText = this.matchAndStrip(
        html,
        new RegExp(
          `<b>\\s*${escaped}\\s*:?\\s*</b>\\s*(.*?)(?:<(?:br|b|div|p)|\\n|$)`,
          "si",
        ),
      );
      if (bText) return bText;

      // Strategy 6: Span label/value pairs (Coffee Bean Corral)
      // <span class="productpropertylabel">Label</span><span class="productpropertyvalue">Value</span>
      const spanPair = this.matchAndStrip(
        html,
        new RegExp(
          `<span[^>]*>\\s*${escaped}\\s*:?\\s*</span>\\s*<span[^>]*>(.*?)</span>`,
          "si",
        ),
      );
      if (spanPair) return spanPair;

      // Strategy 6b: Concatenated list items like <li>CountryPeru</li>
      const capitalLabel =
        label.charAt(0).toUpperCase() + label.slice(1).replace(/\s+/g, "\\s*");
      const liConcat = this.matchAndStrip(
        html,
        new RegExp(
          `<li[^>]*>\\s*${capitalLabel}\\s*([A-Z][^<]+)</li>`,
          "s",
        ),
      );
      if (liConcat) return liConcat;

      // Strategy 7: **Label:** Value in markdown-like text (some Shopify themes)
      const mdBold = html.match(
        new RegExp(
          `\\*\\*${escaped}\\s*:?\\*\\*\\s*:?\\s*([^\\n*]+)`,
          "i",
        ),
      );
      if (mdBold?.[1]) return this.stripTags(mdBold[1]).trim();

      // Strategy 8: Tab-separated "Label\tValue" lines (browser copy-paste)
      const tabMatch = html.match(
        new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\t+(.+)`, "im"),
      );
      if (tabMatch?.[1]) return tabMatch[1].trim();

      // Strategy 9: "Label  Value" with 2+ spaces (copy-paste without tabs)
      const spaceMatch = html.match(
        new RegExp(`(?:^|\\n)\\s*${escaped}\\s{2,}(.+)`, "im"),
      );
      if (spaceMatch?.[1]) return spaceMatch[1].trim();
    }
    return null;
  }

  /**
   * Extract from within the product description HTML using bold/label patterns.
   * This catches specs embedded inside description paragraphs.
   */
  private extractFromDescription(
    html: string,
    labels: string[],
  ): string | null {
    // Get the description block first
    const descBlocks = [
      // WooCommerce description tab
      this.matchContent(
        html,
        /<div[^>]*id="tab-description"[^>]*>(.*?)<\/div>/si,
      ),
      // Generic product description
      this.matchContent(
        html,
        /<div[^>]*class="[^"]*(?:product-description|entry-content|product__description)[^"]*"[^>]*>(.*?)<\/div>/si,
      ),
      // Shopify description from JSON
      this.extractShopifyField(html, "description"),
    ].filter(Boolean);

    for (const desc of descBlocks) {
      if (!desc) continue;
      for (const label of labels) {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Bold label in description
        const match = this.matchAndStrip(
          desc,
          new RegExp(
            `<b>\\s*${escaped}\\s*:?\\s*</b>\\s*(?:<[^>]*>)*\\s*(.*?)(?:<(?:br|b|div|p)|$)`,
            "si",
          ),
        );
        if (match) return match;

        // Plain text "Label: Value"
        const plainMatch = this.stripTags(desc).match(
          new RegExp(`${escaped}\\s*:\\s*([^\\n]+)`, "i"),
        );
        if (plainMatch?.[1]) return plainMatch[1].trim();
      }
    }
    return null;
  }

  // ── Shopify JSON extraction ──────────────────────────────────────

  private extractShopifyField(html: string, field: string): string | null {
    // Try multiple Shopify JSON locations
    const patterns = [
      // Standard Shopify product JSON
      /var\s+meta\s*=\s*(\{.*?"product".*?\});/gs,
      // Product data in script tags
      /<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs,
      // Shopify product object
      /productData\s*:\s*(\{.*?\})/gs,
      // ipBlockerCheckoutProduct or similar
      /(?:product|productData|checkoutProduct)\s*[=:]\s*(\{.*?\})/gs,
    ];

    for (const pattern of patterns) {
      const matches = html.matchAll(pattern);
      for (const m of matches) {
        try {
          const jsonStr = m[1] ?? "";
          const data = JSON.parse(jsonStr);
          const product = data.product || data;
          if (product[field]) return product[field];
        } catch {
          // JSON parse failed, try regex extraction from the JSON-like string
          const fieldPattern = new RegExp(
            `"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`,
            "i",
          );
          const fieldMatch = m[1]?.match(fieldPattern);
          if (fieldMatch?.[1]) {
            return fieldMatch[1]
              .replace(/\\u003c/gi, "<")
              .replace(/\\u003e/gi, ">")
              .replace(/\\u0026/gi, "&")
              .replace(/\\"/g, '"')
              .replace(/\\n/g, "\n")
              .replace(/\\\\/g, "\\");
          }
        }
      }
    }
    return null;
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private matchAndStrip(html: string, pattern: RegExp): string | null {
    const match = html.match(pattern);
    if (!match?.[1]) return null;
    const stripped = this.stripTags(match[1]).trim();
    return stripped || null;
  }

  private matchContent(html: string, pattern: RegExp): string | null {
    const match = html.match(pattern);
    return match?.[1] ?? null;
  }

  private stripTags(html: string): string {
    return html
      .replace(/\\u003c/gi, "<")
      .replace(/\\u003e/gi, ">")
      .replace(/\\u0026/gi, "&")
      .replace(/\\u0022/gi, '"')
      .replace(/<[^>]*>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}
