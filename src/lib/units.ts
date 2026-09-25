import type { BaseUnit, Ingredient, MeasureUnit, OrderDraft } from "../types";
import { MEASURE_UNITS, PACK_LABELS } from "../types";

const MASS_TO_G: Record<"g" | "kg", number> = { g: 1, kg: 1000 };
const VOLUME_TO_ML: Record<"ml" | "L", number> = { ml: 1, L: 1000 };

export type Dimension = "mass" | "volume" | "count";

export function isMeasureUnit(unit: string): unit is MeasureUnit {
  return (MEASURE_UNITS as readonly string[]).includes(unit);
}

export function isPackLabel(unit: string): boolean {
  return (PACK_LABELS as readonly string[]).includes(unit);
}

export function dimensionOf(unit: MeasureUnit): Dimension {
  if (unit === "g" || unit === "kg") return "mass";
  if (unit === "ml" || unit === "L") return "volume";
  return "count";
}

export function baseDimension(base: BaseUnit): Dimension {
  if (base === "g") return "mass";
  if (base === "ml") return "volume";
  return "count";
}

export function toBaseAmount(amount: number, unit: MeasureUnit, base: BaseUnit): number {
  if (dimensionOf(unit) !== baseDimension(base)) {
    throw new Error("UNIT_MISMATCH");
  }
  if (base === "g") return amount * MASS_TO_G[unit as "g" | "kg"];
  if (base === "ml") return amount * VOLUME_TO_ML[unit as "ml" | "L"];
  return amount;
}

export function stockToBase(amount: number, unit: string, ingredient: Ingredient): number {
  if (isMeasureUnit(unit)) return toBaseAmount(amount, unit, ingredient.baseUnit);
  const spec = ingredient.purchaseSpec;
  if (!spec || spec.unitLabel !== unit) throw new Error("PACK_MISMATCH");
  return amount * toBaseAmount(spec.quantity, spec.quantityUnit, ingredient.baseUnit);
}

export function unitsForBase(base: BaseUnit): MeasureUnit[] {
  if (base === "g") return ["g", "kg"];
  if (base === "ml") return ["ml", "L"];
  return ["piece"];
}

export function stockUnitChoices(ingredient: Ingredient): { value: string; label: string }[] {
  const choices: { value: string; label: string }[] = unitsForBase(ingredient.baseUnit).map(
    (unit) => ({
      value: unit,
      label: unitLabel(unit),
    }),
  );
  const spec = ingredient.purchaseSpec;
  if (spec && !choices.some((choice) => choice.value === spec.unitLabel)) {
    choices.push({ value: spec.unitLabel, label: spec.unitLabel });
  }
  return choices;
}

export function resolveStockUnit(ingredient: Ingredient, unit: string): string {
  return stockUnitChoices(ingredient).some((choice) => choice.value === unit)
    ? unit
    : ingredient.baseUnit;
}

export function sanitizeDraftStockUnits(draft: OrderDraft, ingredients: Ingredient[]): OrderDraft {
  let changed = false;
  const stocks = { ...draft.stocks };
  for (const ingredient of ingredients) {
    const stock = stocks[ingredient.id];
    if (!stock) continue;
    const unit = resolveStockUnit(ingredient, stock.unit);
    if (unit === stock.unit) continue;
    stocks[ingredient.id] = { ...stock, unit };
    changed = true;
  }
  return changed ? { ...draft, stocks } : draft;
}

export function unitLabel(unit: string): string {
  switch (unit) {
    case "g":
      return "公克";
    case "kg":
      return "公斤";
    case "ml":
      return "毫升";
    case "L":
      return "公升";
    case "piece":
      return "個";
    default:
      return unit;
  }
}

export function baseUnitLabel(base: BaseUnit): string {
  if (base === "g") return "公克";
  if (base === "ml") return "毫升";
  return "個";
}

export function formatBaseAmount(amount: number, base: BaseUnit): string {
  const rounded = roundAmount(amount);
  if (base === "g" && Math.abs(rounded) >= 1000) {
    return `${trimNumber(roundAmount(rounded / 1000))} 公斤`;
  }
  if (base === "ml" && Math.abs(rounded) >= 1000) {
    return `${trimNumber(roundAmount(rounded / 1000))} 公升`;
  }
  return `${trimNumber(rounded)} ${baseUnitLabel(base)}`;
}

export function roundAmount(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 1000) / 1000;
}

export function trimNumber(amount: number): string {
  return roundAmount(amount).toString();
}

export function ceilPacks(shortageBase: number, specBase: number): number {
  if (shortageBase <= 1e-6 || specBase <= 0) return 0;
  return Math.ceil(shortageBase / specBase - 1e-9);
}
