import { describe, expect, it } from "vitest";
import type { Ingredient, OrderDraft } from "../types";
import { emptyDraft } from "./seed";
import { resolveStockUnit, sanitizeDraftStockUnits, stockToBase, stockUnitChoices } from "./units";

function ingredient(patch: Partial<Ingredient>): Ingredient {
  return {
    id: "flour",
    name: "高筋麵粉",
    baseUnit: "g",
    purchaseSpec: null,
    defaultLeadDays: null,
    ...patch,
  };
}

describe("庫存單位選單", () => {
  it("重量只顯示公克與公斤", () => {
    expect(stockUnitChoices(ingredient({ baseUnit: "g" })).map((item) => item.value)).toEqual([
      "g",
      "kg",
    ]);
  });

  it("容量只顯示毫升與公升", () => {
    expect(stockUnitChoices(ingredient({ baseUnit: "ml" })).map((item) => item.value)).toEqual([
      "ml",
      "L",
    ]);
  });

  it("個數只顯示個", () => {
    expect(stockUnitChoices(ingredient({ baseUnit: "piece" })).map((item) => item.value)).toEqual([
      "piece",
    ]);
  });

  it("有採購規格時才額外顯示該單位，並能換算", () => {
    const potato = ingredient({
      id: "potato",
      name: "馬鈴薯",
      purchaseSpec: { unitLabel: "袋", quantity: 2, quantityUnit: "kg" },
    });
    expect(stockUnitChoices(potato).map((item) => item.value)).toEqual(["g", "kg", "袋"]);
    expect(stockToBase(1, "袋", potato)).toBe(2000);
  });

  it("沒有採購規格時不顯示包或箱", () => {
    const values = stockUnitChoices(ingredient({})).map((item) => item.value);
    expect(values).not.toContain("包");
    expect(values).not.toContain("箱");
  });

  it("失效的庫存單位改回基礎單位", () => {
    const flour = ingredient({});
    const draft: OrderDraft = {
      ...emptyDraft(),
      stocks: { flour: { amount: "1", unit: "包" } },
    };
    expect(resolveStockUnit(flour, "包")).toBe("g");
    expect(sanitizeDraftStockUnits(draft, [flour]).stocks.flour?.unit).toBe("g");
  });
});
