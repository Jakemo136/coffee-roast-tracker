import { describe, it, expect } from "@jest/globals";
import { ScrapingService } from "./scrapingService.js";

describe("ScrapingService", () => {
  describe("parseProductPage", () => {
    it("parses a product page with all fields", () => {
      const html = `
        <html>
          <h1 class="product_title entry-title">Colombia China Alta Jose Buitrago</h1>
          <div class="woocommerce-product-details__short-description">
            <p>A clean and balanced cup with caramel sweetness and milk chocolate body.</p>
          </div>
          <table class="shop_attributes">
            <tr><th>Region</th><td>Huila, Colombia</td></tr>
            <tr><th>Processing</th><td>Fully Washed</td></tr>
            <tr><th>Elevation</th><td>1800 to 2000 meters</td></tr>
          </table>
        </html>
      `;

      const service = new ScrapingService();
      const result = service.parseProductPage(html);

      expect(result.name).toBe("Colombia China Alta Jose Buitrago");
      expect(result.origin).toBe("Huila, Colombia");
      expect(result.process).toBe("Fully Washed");
      expect(result.elevation).toBe("1800 to 2000 meters");
      expect(result.bagNotes).toContain("caramel sweetness");
    });

    it("returns partial result for incomplete pages", () => {
      const html = `<html><h1 class="product_title entry-title">Test Bean</h1></html>`;
      const service = new ScrapingService();
      const result = service.parseProductPage(html);
      expect(result.name).toBe("Test Bean");
      expect(result.origin).toBeNull();
      expect(result.process).toBeNull();
      expect(result.elevation).toBeNull();
      expect(result.bagNotes).toBeNull();
    });

    it("returns empty result for unrecognized HTML", () => {
      const html = `<html><body>Nothing useful here</body></html>`;
      const service = new ScrapingService();
      const result = service.parseProductPage(html);
      expect(result.name).toBeNull();
    });
  });
});
