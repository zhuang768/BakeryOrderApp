import { describe, expect, it } from "vitest";
import type { Bread, Ingredient } from "../types";
import { breadQuantityErrors, calculateOrder } from "./calculate";
import { ceilPacks, formatBaseAmount, stockToBase, toBaseAmount } from "./units";

const flour: Ingredient = {
  id: "flour",
  name: "高筋麵粉",
  baseUnit: "g",
  purchaseSpec: { unitLabel: "包", quantity: 1, quantityUnit: "kg" },
  defaultLeadDays: null,
};

const potato: Ingredient = {
  id: "potato",
  name: "馬鈴薯",
  baseUnit: "g",
  purchaseSpec: { unitLabel: "袋", quantity: 2, quantityUnit: "kg" },
  defaultLeadDays: null,
};

const cheese: Ingredient = {
  id: "cheese",
  name: "起司",
  baseUnit: "g",
  purchaseSpec: { unitLabel: "包", quantity: 1, quantityUnit: "kg" },
  defaultLeadDays: null,
};

const milk: Ingredient = {
  id: "milk",
  name: "牛奶",
  baseUnit: "ml",
  purchaseSpec: null,
  defaultLeadDays: null,
};

function bread(id: string, items: Bread["items"]): Bread {
  return { id, name: id, category: "測試", items };
}

const baseInput = {
  includeLeadDays: false,
  defaultLeadDays: 1,
  leadDaysByIngredient: {},
  safetyPercent: 0,
  stocks: {},
};

describe("麵包製作數量", () => {
  const ids = ["a", "b"];

  it("一個合法品項加上一個非法品項時必須失敗", () => {
    expect(breadQuantityErrors({ a: "10", b: "-1" }, ids)).toEqual({
      b: "請輸入 0 以上的整數。",
    });
    expect(breadQuantityErrors({ a: "3", b: "1.5" }, ids).b).toBeTruthy();
    expect(breadQuantityErrors({ a: "3", b: "abc" }, ids).b).toBeTruthy();
  });

  it("負數、小數、英文字母必須失敗", () => {
    expect(breadQuantityErrors({ a: "-2" }, ["a"]).a).toBeTruthy();
    expect(breadQuantityErrors({ a: "2.5" }, ["a"]).a).toBeTruthy();
    expect(breadQuantityErrors({ a: "ten" }, ["a"]).a).toBeTruthy();
  });

  it("空白與 0 可以接受", () => {
    expect(breadQuantityErrors({ a: "", b: "0" }, ids)).toEqual({});
    expect(breadQuantityErrors({}, ids)).toEqual({});
  });

  it("正整數可以接受", () => {
    expect(breadQuantityErrors({ a: "1", b: "100" }, ids)).toEqual({});
  });
});

describe("單位換算", () => {
  it("把公斤與公升換成基礎單位", () => {
    expect(toBaseAmount(2, "kg", "g")).toBe(2000);
    expect(toBaseAmount(1.5, "L", "ml")).toBe(1500);
    expect(toBaseAmount(3, "piece", "piece")).toBe(3);
  });

  it("庫存用採購規格換算", () => {
    expect(stockToBase(2, "kg", potato)).toBe(2000);
    expect(stockToBase(1, "袋", potato)).toBe(2000);
  });

  it("拒絕跨維度換算", () => {
    expect(() => toBaseAmount(1, "ml", "g")).toThrow("UNIT_MISMATCH");
  });
});

describe("原料叫貨計算", () => {
  it("多種麵包共用同一原料時會加總", () => {
    const lines = calculateOrder({
      ...baseInput,
      ingredients: [flour],
      breads: [
        bread("a", [{ ingredientId: "flour", amount: 80, unit: "g" }]),
        bread("b", [{ ingredientId: "flour", amount: 50, unit: "g" }]),
      ],
      quantities: { a: 10, b: 4 },
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.recipeNeedBase).toBe(1000);
    expect(formatBaseAmount(lines[0]!.recipeNeedBase, "g")).toBe("1 公斤");
  });

  it("數量為 0 的麵包不納入", () => {
    const lines = calculateOrder({
      ...baseInput,
      ingredients: [flour],
      breads: [bread("a", [{ ingredientId: "flour", amount: 80, unit: "g" }])],
      quantities: { a: 0 },
    });
    expect(lines).toHaveLength(0);
  });

  it("庫存足夠時短缺量為 0", () => {
    const lines = calculateOrder({
      ...baseInput,
      ingredients: [flour],
      breads: [bread("a", [{ ingredientId: "flour", amount: 100, unit: "g" }])],
      quantities: { a: 2 },
      stocks: { flour: { amount: 1, unit: "kg" } },
    });
    expect(lines[0]?.shortageBase).toBe(0);
    expect(lines[0]?.purchase?.packs).toBe(0);
  });

  it("採購規格向上取整", () => {
    expect(ceilPacks(2300, 1000)).toBe(3);
    const lines = calculateOrder({
      ...baseInput,
      ingredients: [flour],
      breads: [bread("a", [{ ingredientId: "flour", amount: 230, unit: "g" }])],
      quantities: { a: 10 },
    });
    expect(lines[0]?.shortageBase).toBe(2300);
    expect(lines[0]?.purchase).toEqual({ unitLabel: "包", specBase: 1000, packs: 3 });
  });

  it("到貨天數關閉時只算本次，開啟時乘上天數", () => {
    const breads = [bread("a", [{ ingredientId: "flour", amount: 100, unit: "g" }])];
    const off = calculateOrder({
      ...baseInput,
      ingredients: [flour],
      breads,
      quantities: { a: 2 },
      includeLeadDays: false,
      defaultLeadDays: 3,
    });
    const on = calculateOrder({
      ...baseInput,
      ingredients: [flour],
      breads,
      quantities: { a: 2 },
      includeLeadDays: true,
      defaultLeadDays: 3,
    });
    expect(off[0]?.finalNeedBase).toBe(200);
    expect(on[0]?.leadDays).toBe(3);
    expect(on[0]?.finalNeedBase).toBe(600);
  });

  it("個別到貨天數覆寫全域預設", () => {
    const lines = calculateOrder({
      ...baseInput,
      includeLeadDays: true,
      defaultLeadDays: 2,
      leadDaysByIngredient: { flour: 5 },
      ingredients: [flour],
      breads: [bread("a", [{ ingredientId: "flour", amount: 10, unit: "g" }])],
      quantities: { a: 1 },
    });
    expect(lines[0]?.leadDays).toBe(5);
    expect(lines[0]?.estimatedBase).toBe(50);
  });

  it("安全備用百分比會加在估算需求上", () => {
    const lines = calculateOrder({
      ...baseInput,
      safetyPercent: 10,
      ingredients: [milk],
      breads: [bread("a", [{ ingredientId: "milk", amount: 100, unit: "ml" }])],
      quantities: { a: 10 },
    });
    expect(lines[0]?.finalNeedBase).toBe(1100);
    expect(lines[0]?.shortageBase).toBe(1100);
  });

  it("驗收案例：馬鈴薯短缺 3 公斤、起司短缺 1.5 公斤", () => {
    const lines = calculateOrder({
      ...baseInput,
      ingredients: [potato, cheese],
      breads: [
        bread("potato-cheese", [
          { ingredientId: "potato", amount: 50, unit: "g" },
          { ingredientId: "cheese", amount: 20, unit: "g" },
        ]),
      ],
      quantities: { "potato-cheese": 100 },
      stocks: {
        potato: { amount: 2, unit: "kg" },
        cheese: { amount: 500, unit: "g" },
      },
    });
    const byId = Object.fromEntries(lines.map((line) => [line.ingredientId, line]));
    expect(byId.potato?.recipeNeedBase).toBe(5000);
    expect(byId.potato?.shortageBase).toBe(3000);
    expect(formatBaseAmount(byId.potato!.recipeNeedBase, "g")).toBe("5 公斤");
    expect(formatBaseAmount(byId.potato!.shortageBase, "g")).toBe("3 公斤");
    expect(byId.cheese?.recipeNeedBase).toBe(2000);
    expect(byId.cheese?.shortageBase).toBe(1500);
    expect(formatBaseAmount(byId.cheese!.recipeNeedBase, "g")).toBe("2 公斤");
    expect(formatBaseAmount(byId.cheese!.shortageBase, "g")).toBe("1.5 公斤");
    expect(byId.potato?.purchase?.packs).toBe(2);
    expect(byId.cheese?.purchase?.packs).toBe(2);
  });
});
