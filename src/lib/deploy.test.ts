import { describe, expect, it } from "vitest";
import config from "../../vite.config.ts?raw";
import { blankCatalog, isPristineDemo, leftoverDemoIds } from "./demo";
import { emptyDraft, seedBreads, seedIngredients } from "./seed";

describe("示範資料與部署檔", () => {
  it("清除後是空白目錄，未改過的示範資料可一次清掉", () => {
    expect(blankCatalog()).toEqual({ ingredients: [], breads: [] });
    expect(isPristineDemo(seedIngredients, seedBreads, 0, emptyDraft())).toBe(true);
    expect(isPristineDemo(seedIngredients, seedBreads, 1, emptyDraft())).toBe(false);
    const edited = seedBreads.map((bread, index) =>
      index === 0 ? { ...bread, name: "我的吐司" } : bread,
    );
    expect(isPristineDemo(seedIngredients, edited, 0, emptyDraft())).toBe(false);
    const leftovers = leftoverDemoIds(seedIngredients, edited);
    expect(leftovers.breadIds).not.toContain("bread-potato-cheese");
    expect(leftovers.breadIds.length).toBe(4);
  });

  it("PWA manifest、圖示與離線導覽 fallback 存在", () => {
    expect(config).toContain("pwa-192.png");
    expect(config).toContain("pwa-512.png");
    expect(config).toContain("pwa-maskable-512.png");
    expect(config).toContain('sizes: "192x192"');
    expect(config).toContain('sizes: "512x512"');
    expect(config).toContain('start_url: "/"');
    expect(config).toContain('navigateFallback: "/index.html"');
  });
});
