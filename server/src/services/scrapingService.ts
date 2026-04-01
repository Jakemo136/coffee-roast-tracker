import { GraphQLError } from "graphql";

export interface BeanScrapeResult {
  name: string | null;
  origin: string | null;
  process: string | null;
  elevation: string | null;
  bagNotes: string | null;
  suggestedFlavors: string[];
}

export class ScrapingService {
  async scrapeBeanUrl(url: string): Promise<BeanScrapeResult> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new GraphQLError("Invalid URL", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    if (!parsed.hostname.endsWith("sweetmarias.com")) {
      throw new GraphQLError("Only Sweet Maria's URLs are supported in v1", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    const response = await fetch(url, {
      headers: { "User-Agent": "CoffeeRoastTracker/1.0" },
    });
    if (!response.ok) {
      throw new GraphQLError(`Failed to fetch URL: ${response.status}`, {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }

    const html = await response.text();
    return this.parseProductPage(html);
  }

  parseProductPage(html: string): BeanScrapeResult {
    const name = this.extractMatch(
      html,
      /<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>(.*?)<\/h1>/s,
    );
    const origin = this.extractTableField(html, "Region");
    const process = this.extractTableField(html, "Processing");
    const elevation = this.extractTableField(html, "Elevation");

    // Try short description first, then farm notes
    const bagNotes =
      this.extractMatch(
        html,
        /<div[^>]*class="[^"]*short-description[^"]*"[^>]*>\s*<p>(.*?)<\/p>/s,
      ) ??
      this.extractMatch(
        html,
        /<div[^>]*class="[^"]*farm-notes[^"]*"[^>]*>\s*<p>(.*?)<\/p>/s,
      );

    const suggestedFlavors: string[] = [];

    return {
      name: name?.trim() ?? null,
      origin: origin?.trim() ?? null,
      process: process?.trim() ?? null,
      elevation: elevation?.trim() ?? null,
      bagNotes: bagNotes?.trim() ?? null,
      suggestedFlavors,
    };
  }

  private extractMatch(html: string, pattern: RegExp): string | null {
    const match = html.match(pattern);
    return match?.[1]?.replace(/<[^>]*>/g, "").trim() || null;
  }

  private extractTableField(html: string, label: string): string | null {
    const pattern = new RegExp(
      `<th[^>]*>${label}</th>\\s*<td[^>]*>(.*?)</td>`,
      "si",
    );
    return this.extractMatch(html, pattern);
  }
}
