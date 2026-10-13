import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("statistiques de visite (Umami)", () => {
  it("la balise est présente, limitée à lino.charlescoiffier.fr et respecte Do Not Track", () => {
    const tag = html.match(/<script[^>]*src="https:\/\/stats\.charlescoiffier\.fr\/script\.js"[^>]*>/);
    expect(tag).not.toBeNull();
    expect(tag![0]).toMatch(/\bdefer\b/);
    expect(tag![0]).toContain('data-website-id="5f0a6d95-0954-4d99-b4d6-2fc09edcfd6b"');
    expect(tag![0]).toContain('data-domains="lino.charlescoiffier.fr"');
    expect(tag![0]).toContain('data-do-not-track="true"');
  });
});
