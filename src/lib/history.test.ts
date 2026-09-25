import { describe, expect, it } from "vitest";
import type { Bread, ExportData, Ingredient, OrderRecord } from "../types";
import {
  draftFromRecord,
  manualLeadDays,
  normalizeExportData,
  normalizeOrderRecord,
} from "./history";
import { defaultSettings } from "./seed";

const flour: Ingredient = {
  id: "flour",
  name: "高筋麵粉",
  baseUnit: "g",
  purchaseSpec: null,
  defaultLeadDays: 2,
};

const bread: Bread = {
  id: "toast",
  name: "吐司",
  category: "吐司",
  items: [{ ingredientId: "flour", amount: 100, unit: "g" }],
};

function record(extra: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "rec-1",
    createdAt: "2026-09-26T00:00:00.000Z",
    breads: [{ breadId: "toast", name: "吐司", category: "吐司", quantity: 4 }],
    stocks: [{ ingredientId: "flour", name: "高筋麵粉", amount: 1, unit: "kg", baseAmount: 1000 }],
    includeLeadDays: true,
    defaultLeadDays: 1,
    safetyPercent: 10,
    leadDaysByIngredient: { flour: 5 },
    lines: [],
    ...extra,
  };
}

describe("歷史叫貨的到貨天數", () => {
  it("儲存手動輸入的到貨天數", () => {
    expect(manualLeadDays({ flour: "5", milk: "" })).toEqual({ flour: 5 });
  });

  it("再次叫貨後個別到貨天數不會遺失", () => {
    const saved = record();
    const draft = draftFromRecord(saved, defaultSettings, [bread], [flour]);
    expect(draft.quantities.toast).toBe("4");
    expect(draft.stocks.flour).toEqual({ amount: "1", unit: "kg" });
    expect(draft.includeLeadDays).toBe(true);
    expect(draft.leadDaysByIngredient.flour).toBe("5");
    expect(draft.safetyPercent).toBe("10");
    expect(manualLeadDays(draft.leadDaysByIngredient)).toEqual({ flour: 5 });
  });

  it("舊紀錄缺少 leadDaysByIngredient 時預設為空物件", () => {
    const legacy = record();
    delete (legacy as { leadDaysByIngredient?: Record<string, number> }).leadDaysByIngredient;
    const normalized = normalizeOrderRecord(legacy);
    expect(normalized.leadDaysByIngredient).toEqual({});
    expect(
      draftFromRecord(normalized, defaultSettings, [bread], [flour]).leadDaysByIngredient,
    ).toEqual({});
  });

  it("匯入舊版 JSON 時補上缺少的欄位", () => {
    const legacy = record();
    delete (legacy as { leadDaysByIngredient?: Record<string, number> }).leadDaysByIngredient;
    const data = {
      version: 1,
      ingredients: [flour],
      breads: [bread],
      settings: defaultSettings,
      history: [legacy],
      draft: {
        quantities: {},
        stocks: {},
        includeLeadDays: false,
        safetyPercent: "0",
      },
    } as ExportData;
    const normalized = normalizeExportData(data);
    expect(normalized.history[0]?.leadDaysByIngredient).toEqual({});
    expect(normalized.draft.leadDaysByIngredient).toEqual({});
  });
});
