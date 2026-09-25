import type { AppSettings, Bread, ExportData, Ingredient, OrderDraft, OrderRecord } from "../types";
import { parseBreadCount } from "./calculate";
import { emptyDraft } from "./seed";
import { sanitizeDraftStockUnits } from "./units";

type LegacyOrderRecord = Omit<OrderRecord, "leadDaysByIngredient"> & {
  leadDaysByIngredient?: Record<string, number> | null;
};

export function manualLeadDays(input: Record<string, string> | undefined): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [id, raw] of Object.entries(input ?? {})) {
    const days = parseBreadCount(raw ?? "");
    if (days !== null && days >= 1) result[id] = days;
  }
  return result;
}

export function normalizeOrderRecord(record: LegacyOrderRecord): OrderRecord {
  const leadDays = record.leadDaysByIngredient;
  return {
    ...record,
    leadDaysByIngredient: leadDays && typeof leadDays === "object" ? { ...leadDays } : {},
  };
}

export function normalizeExportData(data: ExportData): ExportData {
  return {
    ...data,
    history: data.history.map((record) => normalizeOrderRecord(record)),
    draft: {
      ...data.draft,
      leadDaysByIngredient: data.draft.leadDaysByIngredient ?? {},
    },
  };
}

export function draftFromRecord(
  record: LegacyOrderRecord,
  settings: AppSettings,
  breads: Bread[],
  ingredients: Ingredient[],
): OrderDraft {
  const normalized = normalizeOrderRecord(record);
  const draft = emptyDraft(settings);
  for (const bread of normalized.breads) {
    if (breads.some((item) => item.id === bread.breadId)) {
      draft.quantities[bread.breadId] = String(bread.quantity);
    }
  }
  for (const stock of normalized.stocks) {
    if (ingredients.some((item) => item.id === stock.ingredientId)) {
      draft.stocks[stock.ingredientId] = { amount: String(stock.amount), unit: stock.unit };
    }
  }
  draft.includeLeadDays = normalized.includeLeadDays;
  draft.safetyPercent = String(normalized.safetyPercent);
  draft.leadDaysByIngredient = Object.fromEntries(
    Object.entries(normalized.leadDaysByIngredient)
      .filter(([id]) => ingredients.some((item) => item.id === id))
      .map(([id, days]) => [id, String(days)]),
  );
  return sanitizeDraftStockUnits(draft, ingredients);
}
