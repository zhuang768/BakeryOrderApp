import type { Bread, Ingredient, OrderLine, StockInput } from "../types";
import { ceilPacks, stockToBase, toBaseAmount } from "./units";

export interface CalculateInput {
  breads: Bread[];
  ingredients: Ingredient[];
  quantities: Record<string, number>;
  stocks: Record<string, { amount: number; unit: string }>;
  includeLeadDays: boolean;
  defaultLeadDays: number;
  leadDaysByIngredient: Record<string, number>;
  safetyPercent: number;
}

export function parseNonNegative(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const number = Number(trimmed);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

export function parseBreadCount(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  if (!/^\d+$/.test(trimmed)) return null;
  const number = Number(trimmed);
  if (!Number.isInteger(number) || number < 0) return null;
  return number;
}

export const BREAD_COUNT_ERROR = "請輸入 0 以上的整數。";

export function breadQuantityErrors(
  quantities: Record<string, string>,
  breadIds: string[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const id of breadIds) {
    const raw = quantities[id];
    if (raw === undefined || raw.trim() === "") continue;
    if (parseBreadCount(raw) === null) errors[id] = BREAD_COUNT_ERROR;
  }
  return errors;
}

export function calculateOrder(input: CalculateInput): OrderLine[] {
  const ingredients = new Map(input.ingredients.map((item) => [item.id, item]));
  const need = new Map<string, number>();

  for (const bread of input.breads) {
    const quantity = input.quantities[bread.id] ?? 0;
    if (quantity <= 0) continue;
    for (const item of bread.items) {
      const ingredient = ingredients.get(item.ingredientId);
      if (!ingredient) continue;
      const amount = quantity * toBaseAmount(item.amount, item.unit, ingredient.baseUnit);
      need.set(item.ingredientId, (need.get(item.ingredientId) ?? 0) + amount);
    }
  }

  const lines: OrderLine[] = [];
  for (const [ingredientId, recipeNeedBase] of need) {
    const ingredient = ingredients.get(ingredientId);
    if (!ingredient) continue;
    const leadDays = input.includeLeadDays
      ? (input.leadDaysByIngredient[ingredientId] ??
        ingredient.defaultLeadDays ??
        input.defaultLeadDays)
      : 1;
    const estimatedBase = recipeNeedBase * leadDays;
    const finalNeedBase = estimatedBase * (1 + input.safetyPercent / 100);
    const stock = input.stocks[ingredientId];
    const stockBase = stock ? stockToBase(stock.amount, stock.unit, ingredient) : 0;
    const shortageBase = Math.max(finalNeedBase - stockBase, 0);
    const spec = ingredient.purchaseSpec;
    const specBase = spec ? toBaseAmount(spec.quantity, spec.quantityUnit, ingredient.baseUnit) : 0;
    lines.push({
      ingredientId,
      name: ingredient.name,
      baseUnit: ingredient.baseUnit,
      recipeNeedBase,
      leadDays,
      estimatedBase,
      safetyPercent: input.safetyPercent,
      finalNeedBase,
      stockBase,
      shortageBase,
      purchase:
        spec && specBase > 0
          ? { unitLabel: spec.unitLabel, specBase, packs: ceilPacks(shortageBase, specBase) }
          : null,
    });
  }

  return lines.sort(
    (a, b) => b.shortageBase - a.shortageBase || a.name.localeCompare(b.name, "zh-Hant"),
  );
}

export function stocksFromDraft(
  stocks: Record<string, StockInput>,
  ingredients: Ingredient[],
): Record<string, { amount: number; unit: string }> {
  const result: Record<string, { amount: number; unit: string }> = {};
  for (const ingredient of ingredients) {
    const input = stocks[ingredient.id];
    if (!input) continue;
    const amount = parseNonNegative(input.amount);
    if (amount === null || amount === 0) continue;
    result[ingredient.id] = { amount, unit: input.unit };
  }
  return result;
}
