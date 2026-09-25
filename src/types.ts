export const BASE_UNITS = ["g", "ml", "piece"] as const;
export type BaseUnit = (typeof BASE_UNITS)[number];

export const MEASURE_UNITS = ["g", "kg", "ml", "L", "piece"] as const;
export type MeasureUnit = (typeof MEASURE_UNITS)[number];

export const PACK_LABELS = ["包", "袋", "箱", "瓶", "罐", "盒", "塊"] as const;
export type PackLabel = (typeof PACK_LABELS)[number];

export interface PurchaseSpec {
  unitLabel: PackLabel;
  quantity: number;
  quantityUnit: MeasureUnit;
}

export interface Ingredient {
  id: string;
  name: string;
  baseUnit: BaseUnit;
  purchaseSpec: PurchaseSpec | null;
  defaultLeadDays: number | null;
}

export interface RecipeItem {
  ingredientId: string;
  amount: number;
  unit: MeasureUnit;
}

export interface Bread {
  id: string;
  name: string;
  category: string;
  items: RecipeItem[];
}

export interface AppSettings {
  includeLeadDays: boolean;
  defaultLeadDays: number;
  safetyPercent: number;
}

export interface StockInput {
  amount: string;
  unit: string;
}

export interface OrderDraft {
  quantities: Record<string, string>;
  stocks: Record<string, StockInput>;
  includeLeadDays: boolean;
  leadDaysByIngredient: Record<string, string>;
  safetyPercent: string;
}

export interface PurchaseSuggestion {
  unitLabel: string;
  specBase: number;
  packs: number;
}

export interface OrderLine {
  ingredientId: string;
  name: string;
  baseUnit: BaseUnit;
  recipeNeedBase: number;
  leadDays: number;
  estimatedBase: number;
  safetyPercent: number;
  finalNeedBase: number;
  stockBase: number;
  shortageBase: number;
  purchase: PurchaseSuggestion | null;
}

export interface HistoryBread {
  breadId: string;
  name: string;
  category: string;
  quantity: number;
}

export interface HistoryStock {
  ingredientId: string;
  name: string;
  amount: number;
  unit: string;
  baseAmount: number;
}

export interface OrderRecord {
  id: string;
  createdAt: string;
  breads: HistoryBread[];
  stocks: HistoryStock[];
  includeLeadDays: boolean;
  defaultLeadDays: number;
  safetyPercent: number;
  leadDaysByIngredient: Record<string, number>;
  lines: OrderLine[];
}

export interface ExportData {
  version: 1;
  ingredients: Ingredient[];
  breads: Bread[];
  settings: AppSettings;
  history: OrderRecord[];
  draft: OrderDraft;
}
