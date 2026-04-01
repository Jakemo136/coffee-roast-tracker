import { describe, it, expect } from "@jest/globals";
import { ScrapingService } from "./scrapingService.js";

const service = new ScrapingService();

// ── Fixture: Sweet Maria's (WooCommerce + shop_attributes table) ───────

const SWEET_MARIAS_HTML = `
<html>
  <h1 class="product_title entry-title">Ethiopia Honey Process Haro Wachu</h1>
  <div class="woocommerce-product-details__short-description">
    <p>A complex honey-process lot with stone fruit sweetness, floral honey, and a clean finish.</p>
  </div>
  <table class="shop_attributes">
    <tr><th>Region</th><td>Guji, Oromia</td></tr>
    <tr><th>Processing</th><td>Honey Process</td></tr>
    <tr><th>Elevation</th><td>1950 - 2100 meters</td></tr>
    <tr><th>Variety</th><td>Heirloom</td></tr>
  </table>
</html>
`;

const SWEET_MARIAS_HTML_2 = `
<html>
  <h1 class="product_title entry-title">Colombia Edward Sandoval Chiroso</h1>
  <div class="woocommerce-product-details__short-description">
    <p>Lush tropical fruit, panela sugar, and jasmine aromatics from a standout Chiroso lot.</p>
  </div>
  <table class="shop_attributes">
    <tr><th>Region</th><td>Huila, Colombia</td></tr>
    <tr><th>Processing</th><td>Washed</td></tr>
    <tr><th>Elevation</th><td>1800 to 2000 meters</td></tr>
    <tr><th>Variety</th><td>Chiroso</td></tr>
  </table>
</html>
`;

// ── Fixture: Coffee Bean Corral (concatenated list items + h1) ─────────

const CBC_HTML = `
<html>
  <h1>Costa Rica: La Gladiola Peaberry, Tarrazu</h1>
  <ul class="typedisplay">
    <li><span class="productpropertylabel">Country</span><span class="productpropertyvalue">Costa Rica</span></li>
    <li><span class="productpropertylabel">Local Region</span><span class="productpropertyvalue">Tarrazu</span></li>
    <li><span class="productpropertylabel">Process</span><span class="productpropertyvalue">Washed</span></li>
    <li><span class="productpropertylabel">Altitude (meters)</span><span class="productpropertyvalue">1,300 - 1,800 masl</span></li>
    <li><span class="productpropertylabel">Variety</span><span class="productpropertyvalue">Caturra, Catuai</span></li>
  </ul>
  <strong>Cupping Notes:</strong> Toasted almond, citrus, and dried cherry notes; balanced acidity with nutty sweetness; clean, bright finish.
</html>
`;

const CBC_DECAF_HTML = `
<html>
  <h1>Peru: Organic Decaf Sol Y Cafe, Cajamarca</h1>
  <ul class="typedisplay">
    <li><span class="productpropertylabel">Country</span><span class="productpropertyvalue">Peru</span></li>
    <li><span class="productpropertylabel">Local Region</span><span class="productpropertyvalue">Cajamarca, in the provinces of Jaen and San Ignacio</span></li>
    <li><span class="productpropertylabel">Process</span><span class="productpropertyvalue">Washed</span></li>
    <li><span class="productpropertylabel">Altitude (meters)</span><span class="productpropertyvalue">900 - 2,000 masl</span></li>
    <li><span class="productpropertylabel">Variety</span><span class="productpropertyvalue">Bourbon, Catuai, Pache, Typica</span></li>
    <li><span class="productpropertylabel">Harvest</span><span class="productpropertyvalue">May - November</span></li>
  </ul>
  <strong>Cupping Notes:</strong> Notes of milk chocolate and caramel with hints of orange and a creamy body.
</html>
`;

// ── Fixture: Bodhi Leaf (Shopify — description with bold-span) ─────────

const BODHI_LEAF_HTML = `
<html>
  <h1>Peru San Ignacio Organic - Green</h1>
  <script>
    window.essentialAnnouncementMeta = {
      productData: {
        "title": "Peru San Ignacio Organic - Green",
        "description": "<p><b>Country:</b><span>Peru</span><br><b>Region:</b><span>San Ignacio, Cajamarca</span><br><b>Varietal:</b><span>Caturra, Catimor, Typica</span><br><b>Process:</b><span>Washed</span><br><b>Altitude:</b><span>1,500 - 1,900 MASL</span><br><b>Cupping Notes:</b><span>Red Apple, Almond, Black Tea</span><br><b>Recommended Roast:</b><span>City to Full City</span></p>"
      }
    }
  </script>
</html>
`;

// ── Fixture: Mill City Roasters (Shopify — table in description with score) ──

const MILL_CITY_HTML = `
<html>
  <title>Java - West Java Sunda Badak, Wet-Hulled – Mill City Roasters</title>
  <h1>Java - West Java Sunda Badak, Wet-Hulled</h1>
  <script type="application/json" id="product-data">
    {
      "product": {
        "title": "Java - West Java Sunda Badak, Wet-Hulled",
        "description": "<table><tbody><tr><td>Cupping Score</td><td>81</td></tr><tr><td>Fragrance/Aroma:</td><td>Earthy, peat moss, rye whiskey</td></tr><tr><td>Acidity:</td><td>Citric, ruby red grapefruit</td></tr><tr><td>Flavor/Nuances:</td><td>Cacao nibs, nutmeg</td></tr><tr><td>Sweetness:</td><td>Baker's cocoa, spiced tea</td></tr><tr><td>Body/Mouthfeel:</td><td>Heavy and full-bodied</td></tr><tr><td>Finish/Aftertaste:</td><td>Lingering, cooked citrus</td></tr></tbody></table>"
      }
    }
  </script>
  <table>
    <tr><td>Cupping Score</td><td>81</td></tr>
    <tr><td>Fragrance/Aroma:</td><td>Earthy, peat moss, rye whiskey</td></tr>
    <tr><td>Process</td><td>Wet-Hulled</td></tr>
    <tr><td>Region</td><td>West Java</td></tr>
    <tr><td>Elevation</td><td>1,200 - 1,500 masl</td></tr>
    <tr><td>Variety</td><td>Typica, Ateng</td></tr>
  </table>
</html>
`;

// ── Fixture: Showroom Coffee (WooCommerce — score embedded in cupping notes) ──

const SHOWROOM_HTML = `
<html>
  <h1 class="product_title entry-title">Iyenga AMCOS Central Washed PB</h1>
  <div id="tab-description">
    <p>This peaberry lot from the Iyenga AMCOS cooperative in Tanzania's Songwe region
    delivers a bright, tea-like cup with citrus complexity.</p>
  </div>
  <div id="tab-additional_information">
    <table>
      <tr><td>Country</td><td><a href="/country/tanzania">TANZANIA</a></td></tr>
      <tr><td>Region</td><td>Songwe</td></tr>
      <tr><td>Processing Method</td><td><a href="/process/washed">Centrally Washed</a></td></tr>
      <tr><td>Elevation</td><td>1900</td></tr>
      <tr><td>Varietals</td><td>Bourbon, Jackson Bourbon</td></tr>
      <tr><td>Cupping Notes Upon Arrival</td><td>85, black tea, grapefruit, lemon-lime, nougat, tamarind, toffee</td></tr>
      <tr><td>Arrival Date</td><td>February 2026</td></tr>
    </table>
  </div>
</html>
`;

// ── Fixture: Roast Masters (narrative text, specs in description) ──────

const ROASTMASTERS_HTML = `
<html>
  <h2>Burundi Gahahe Washing Station</h2>
  <div class="product-description entry-content">
    <p>From the Kayanza province, this washed Bourbon delivers delicate fruit sweetness
    and a silky body. Grown by smallholders with an average of 230 trees.</p>
    <ul>
      <li><strong>Washing Station:</strong> Gahahe</li>
      <li><strong>Province:</strong> Kayanza</li>
      <li><strong>Processing:</strong> Washed, double soaked</li>
      <li><strong>Altitude:</strong> 1805 Meters above sea level</li>
      <li><strong>Variety:</strong> Red Bourbon</li>
      <li><strong>Harvest Year:</strong> 2026</li>
    </ul>
  </div>
</html>
`;

// ── Fixture: The Captain's Coffee (tabbed details with bold labels) ────

const CAPTAINS_HTML = `
<html>
  <h1>Colombia Finca La Riviera Pink Bourbon Honey</h1>
  <div class="product-details">
    <div class="tab-content">
      <p><strong>Region:</strong> Santa Rosa de Cabal, Risaralda Department, Colombia</p>
      <p><strong>Processing:</strong> Honey – 48 hour aerobic fermentation in cherry</p>
      <p><strong>Variety:</strong> Pink Bourbon</p>
      <p><strong>Grade:</strong> Excelso, grown at 1800-2200 masl</p>
      <p><strong>Harvest:</strong> 2025 Crop</p>
    </div>
  </div>
</html>
`;

// ── Fixture: 88 Graines (WooCommerce minimal) ─────────────────────────

const GRAINES_HTML = `
<html>
  <h1 class="product_title entry-title">Castillo / Washed</h1>
  <div class="woocommerce-product-details__short-description">
    <p>A typical washed profile from Cauca's high altitudes - fruity, saturated, sweet with great clarity!</p>
  </div>
  <table class="shop_attributes">
    <tr><th>Origin</th><td>Cauca, Colombia</td></tr>
    <tr><th>Processing</th><td>Washed</td></tr>
    <tr><th>Elevation</th><td>1700 - 2100 meters</td></tr>
    <tr><th>Variety</th><td>Castillo</td></tr>
  </table>
</html>
`;

// ── Fixture: Generic/unknown site (just basic HTML) ───────────────────

const GENERIC_HTML = `
<html>
  <h1>Kenya AA Nyeri Giakanja</h1>
  <div class="product-info">
    <table>
      <tr><th>Origin</th><td>Nyeri, Kenya</td></tr>
      <tr><th>Process</th><td>Fully Washed</td></tr>
      <th>Altitude</th><td>1700m</td></tr>
      <tr><th>Cultivar</th><td>SL28, SL34</td></tr>
      <tr><th>Cup Score</th><td>88.5</td></tr>
      <tr><th>Harvest</th><td>2025</td></tr>
      <tr><th>Tasting Notes</th><td>Blackcurrant, tomato, brown sugar, grapefruit zest</td></tr>
    </table>
  </div>
</html>
`;

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

describe("ScrapingService", () => {
  describe("parseProductPage", () => {
    // ── Sweet Maria's ────────────────────────────────────────────

    it("extracts all fields from Sweet Maria's WooCommerce page", () => {
      const result = service.parseProductPage(SWEET_MARIAS_HTML);
      expect(result.name).toBe("Ethiopia Honey Process Haro Wachu");
      expect(result.origin).toBe("Guji, Oromia");
      expect(result.process).toBe("Honey Process");
      expect(result.elevation).toBe("1950 - 2100 meters");
      expect(result.variety).toBe("Heirloom");
      expect(result.bagNotes).toContain("stone fruit sweetness");
      expect(result.score).toBeNull();
    });

    it("extracts from a second Sweet Maria's listing", () => {
      const result = service.parseProductPage(SWEET_MARIAS_HTML_2);
      expect(result.name).toBe("Colombia Edward Sandoval Chiroso");
      expect(result.origin).toBe("Huila, Colombia");
      expect(result.process).toBe("Washed");
      expect(result.variety).toBe("Chiroso");
      expect(result.bagNotes).toContain("panela sugar");
    });

    // ── Coffee Bean Corral ───────────────────────────────────────

    it("extracts from Coffee Bean Corral concatenated list items", () => {
      const result = service.parseProductPage(CBC_HTML);
      expect(result.name).toBe("Costa Rica: La Gladiola Peaberry, Tarrazu");
      expect(result.origin).toContain("Costa Rica");
      expect(result.process).toBe("Washed");
      expect(result.elevation).toContain("1,300 - 1,800");
      expect(result.variety).toContain("Caturra");
    });

    it("extracts from Coffee Bean Corral decaf listing", () => {
      const result = service.parseProductPage(CBC_DECAF_HTML);
      expect(result.name).toContain("Peru");
      expect(result.origin).toContain("Peru");
      expect(result.process).toBe("Washed");
      expect(result.variety).toContain("Bourbon");
      expect(result.bagNotes).toContain("milk chocolate");
    });

    it("extracts clean name from CBC page with itemprop span", () => {
      const html = `
        <h1><span class="coff-country">Bolivia</span> <span class="coff-name">Apolo</span>
        <span class="coff-region">La Paz</span>
        <span itemprop="name">Bolivia: Apolo, La Paz</span></h1>
      `;
      const result = service.parseProductPage(html);
      expect(result.name).toBe("Bolivia: Apolo, La Paz");
    });

    // ── Bodhi Leaf (Shopify) ─────────────────────────────────────

    it("extracts from Bodhi Leaf Shopify bold-span description", () => {
      const result = service.parseProductPage(BODHI_LEAF_HTML);
      expect(result.name).toBe("Peru San Ignacio Organic - Green");
      expect(result.origin).toContain("Peru");
      expect(result.process).toBe("Washed");
      expect(result.elevation).toContain("1,500 - 1,900");
      expect(result.variety).toContain("Caturra");
      expect(result.suggestedFlavors.length).toBeGreaterThan(0);
      expect(result.suggestedFlavors).toContain("Apple");
    });

    // ── Mill City Roasters (Shopify with score) ──────────────────

    it("extracts score and fields from Mill City Roasters", () => {
      const result = service.parseProductPage(MILL_CITY_HTML);
      expect(result.name).toContain("Java");
      expect(result.score).toBe(81);
      expect(result.process).toBe("Wet-Hulled");
      expect(result.origin).toContain("West Java");
      expect(result.elevation).toContain("1,200 - 1,500");
      expect(result.variety).toContain("Typica");
    });

    // ── Showroom Coffee (WooCommerce with embedded score) ────────

    it("extracts score from Showroom Coffee cupping notes field", () => {
      const result = service.parseProductPage(SHOWROOM_HTML);
      expect(result.name).toBe("Iyenga AMCOS Central Washed PB");
      expect(result.score).toBe(85);
      expect(result.origin).toBe("TANZANIA");
      expect(result.process).toBe("Centrally Washed");
      expect(result.elevation).toBe("1900");
      expect(result.variety).toContain("Bourbon");
      expect(result.suggestedFlavors).toContain("Tea");
      expect(result.suggestedFlavors).toContain("Grapefruit");
      expect(result.suggestedFlavors.length).toBeLessThanOrEqual(5);
    });

    // ── Roast Masters ────────────────────────────────────────────

    it("extracts from Roast Masters strong-label description", () => {
      const result = service.parseProductPage(ROASTMASTERS_HTML);
      expect(result.name).toBe("Burundi Gahahe Washing Station");
      expect(result.process).toContain("Washed");
      expect(result.elevation).toContain("1805");
      expect(result.variety).toBe("Red Bourbon");
      expect(result.cropYear).toBe(2026);
    });

    // ── The Captain's Coffee ─────────────────────────────────────

    it("extracts from The Captain's Coffee tabbed details", () => {
      const result = service.parseProductPage(CAPTAINS_HTML);
      expect(result.name).toBe("Colombia Finca La Riviera Pink Bourbon Honey");
      expect(result.origin).toContain("Santa Rosa de Cabal");
      expect(result.process).toContain("Honey");
      expect(result.variety).toBe("Pink Bourbon");
      expect(result.cropYear).toBe(2025);
    });

    // ── 88 Graines ───────────────────────────────────────────────

    it("extracts from 88 Graines WooCommerce page", () => {
      const result = service.parseProductPage(GRAINES_HTML);
      expect(result.name).toBe("Castillo / Washed");
      expect(result.origin).toBe("Cauca, Colombia");
      expect(result.process).toBe("Washed");
      expect(result.elevation).toContain("1700 - 2100");
      expect(result.variety).toBe("Castillo");
      expect(result.bagNotes).toContain("fruity");
    });

    // ── Generic unknown site ─────────────────────────────────────

    it("extracts from a generic site using standard table patterns", () => {
      const result = service.parseProductPage(GENERIC_HTML);
      expect(result.name).toBe("Kenya AA Nyeri Giakanja");
      expect(result.origin).toContain("Nyeri, Kenya");
      expect(result.process).toBe("Fully Washed");
      expect(result.variety).toContain("SL28");
      expect(result.score).toBe(88.5);
      expect(result.cropYear).toBe(2025);
      expect(result.suggestedFlavors).toContain("Blackcurrant");
    });

    // ── Edge cases ───────────────────────────────────────────────

    it("returns partial result for pages with some fields missing", () => {
      const html = `<html><h1 class="product_title entry-title">Test Bean</h1></html>`;
      const result = service.parseProductPage(html);
      expect(result.name).toBe("Test Bean");
      expect(result.origin).toBeNull();
      expect(result.process).toBeNull();
      expect(result.elevation).toBeNull();
      expect(result.variety).toBeNull();
      expect(result.bagNotes).toBeNull();
      expect(result.score).toBeNull();
      expect(result.cropYear).toBeNull();
      expect(result.suggestedFlavors).toEqual([]);
    });

    it("returns all nulls for unrecognized HTML", () => {
      const html = `<html><body><p>Nothing useful here</p></body></html>`;
      const result = service.parseProductPage(html);
      expect(result.name).toBeNull();
      expect(result.origin).toBeNull();
      expect(result.score).toBeNull();
      expect(result.suggestedFlavors).toEqual([]);
    });

    it("rejects scores outside the 60-100 range", () => {
      const html = `
        <table>
          <tr><th>Cupping Score</th><td>42</td></tr>
        </table>
      `;
      const result = service.parseProductPage(html);
      expect(result.score).toBeNull();
    });

    it("extracts score from inline cupping notes pattern", () => {
      const html = `
        <table>
          <tr><td>Cupping Notes</td><td>87.5, cherry, dark chocolate, caramel, cedar</td></tr>
        </table>
      `;
      const result = service.parseProductPage(html);
      expect(result.score).toBe(87.5);
      expect(result.suggestedFlavors).toContain("Cherry");
      expect(result.suggestedFlavors).toContain("Dark Chocolate");
    });

    it("extracts elevation from MASL pattern in free text", () => {
      const html = `
        <h1>Some Bean</h1>
        <p>Grown at 1800-2200 masl in the highlands.</p>
      `;
      const result = service.parseProductPage(html);
      expect(result.elevation).toContain("1800-2200 masl");
    });

    // ── Plain text paste (browser copy-paste from SM) ──────────

    it("extracts fields from plain-text paste of Sweet Maria's page", () => {
      const pastedText = `Colombia Edward Sandoval Chiroso
Fragrant sweetness, with unique aromatics and high toned complexity. Raw sugar notes, with juicy acidity, white grape, pink gum, tart hints of jamaica tea and yellow cherry, delicate tea, and so much more! City to City+.
This Chiroso coffee from Edward Sandoval has a fragrant sweetness to it, with unique aromatics and high toned complexity.

Process MethodWet Process (Washed)CultivarHeirloom TypesFarm GateYes

Region\tSanta Isabel, Tolima
Processing\tWet Process (Washed)
Drying Method\tCovered Sun-Dried
Arrival date\tDecember 2024 Arrival
Lot size\t12
Bag size\t70 KG
Packaging\tGrainPro Liner
Farm Gate\tYes
Cultivar Detail\tChiroso
Grade\tExcelso 15+
Appearance\t.2 d/300gr, 15-17 Screen
Roast Recommendations\tCity to City+
Type\tFarm Gate`;
      const result = service.parseProductPage(pastedText);
      expect(result.name).toBe("Colombia Edward Sandoval Chiroso");
      expect(result.origin).toContain("Santa Isabel, Tolima");
      expect(result.process).toContain("Wet Process (Washed)");
      expect(result.variety).toContain("Chiroso");
      expect(result.suggestedFlavors.length).toBeGreaterThan(0);
      expect(result.suggestedFlavors.length).toBeLessThanOrEqual(5);
    });

    it("extracts flavors from prose when no structured cupping notes exist", () => {
      const text = `Some Bean
Honey sweetness with jasmine florals, dark chocolate, and grape notes.`;
      const result = service.parseProductPage(text);
      expect(result.suggestedFlavors).toContain("Honey");
      expect(result.suggestedFlavors).toContain("Jasmine");
      expect(result.suggestedFlavors).toContain("Dark Chocolate");
      expect(result.suggestedFlavors).toContain("Grape");
    });

    it("limits suggested flavors to 5", () => {
      const html = `
        <table>
          <tr><td>Tasting Notes</td><td>cherry, chocolate, caramel, citrus, honey, vanilla, cinnamon, nutmeg</td></tr>
        </table>
      `;
      const result = service.parseProductPage(html);
      expect(result.suggestedFlavors.length).toBeLessThanOrEqual(5);
    });

    it("extracts fields from Shopify page with unicode-encoded HTML description", () => {
      const html = `
    <html>
      <h1>Colombia Test Bean</h1>
      <script>
        window.meta = {
          productData: {
            "title": "Colombia Test Bean",
            "description": "\\u003cp\\u003e\\u003cb\\u003eCountry:\\u003c/b\\u003e Colombia\\u003cbr\\u003e\\u003cb\\u003eProcess:\\u003c/b\\u003e Washed\\u003cbr\\u003e\\u003cb\\u003eVarietal:\\u003c/b\\u003e Caturra\\u003cbr\\u003e\\u003cb\\u003eAltitude:\\u003c/b\\u003e 1,800 MASL\\u003c/p\\u003e"
          }
        }
      </script>
    </html>
  `;
      const result = service.parseProductPage(html);
      expect(result.origin).toContain("Colombia");
      expect(result.process).toBe("Washed");
      expect(result.variety).toContain("Caturra");
      expect(result.elevation).toContain("1,800");
    });
  });
});
