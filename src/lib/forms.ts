import type { BaseUnit, Bread, Ingredient, MeasureUnit, PackLabel } from "../types";
import { PACK_LABELS } from "../types";
import { parseBreadCount, parseNonNegative } from "./calculate";
import { unitsForBase } from "./units";

export interface RecipeLineDraft {
  key: string;
  ingredientId: string;
  amount: string;
  unit: MeasureUnit;
}

export interface BreadFormState {
  id: string;
  name: string;
  category: string;
  items: RecipeLineDraft[];
}

export interface IngredientFormState {
  id: string;
  name: string;
  baseUnit: BaseUnit;
  specOn: boolean;
  specLabel: PackLabel;
  specQty: string;
  specUnit: MeasureUnit;
  leadDays: string;
}

export function emptyBreadForm(name = ""): BreadFormState {
  return { id: crypto.randomUUID(), name, category: "", items: [] };
}

export function breadFormFrom(bread: Bread): BreadFormState {
  return {
    id: bread.id,
    name: bread.name,
    category: bread.category,
    items: bread.items.map((item) => ({
      key: crypto.randomUUID(),
      ingredientId: item.ingredientId,
      amount: String(item.amount),
      unit: item.unit,
    })),
  };
}

export function emptyIngredientForm(): IngredientFormState {
  return {
    id: crypto.randomUUID(),
    name: "",
    baseUnit: "g",
    specOn: false,
    specLabel: "包",
    specQty: "",
    specUnit: "kg",
    leadDays: "",
  };
}

export function ingredientFormFrom(ingredient: Ingredient): IngredientFormState {
  return {
    id: ingredient.id,
    name: ingredient.name,
    baseUnit: ingredient.baseUnit,
    specOn: Boolean(ingredient.purchaseSpec),
    specLabel: ingredient.purchaseSpec?.unitLabel ?? "包",
    specQty: ingredient.purchaseSpec ? String(ingredient.purchaseSpec.quantity) : "",
    specUnit:
      ingredient.purchaseSpec?.quantityUnit ??
      (ingredient.baseUnit === "ml" ? "L" : ingredient.baseUnit === "piece" ? "piece" : "kg"),
    leadDays: ingredient.defaultLeadDays ? String(ingredient.defaultLeadDays) : "",
  };
}

export function breadFormDirty(form: BreadFormState): boolean {
  return (
    form.name.trim() !== "" ||
    form.category.trim() !== "" ||
    form.items.some((item) => item.ingredientId !== "" || item.amount.trim() !== "")
  );
}

export function validateBreadForm(form: BreadFormState, ingredients: Ingredient[]): string | null {
  if (!form.name.trim()) return "請填寫麵包名稱。";
  if (form.items.length === 0) return "請至少加入一項原料。";
  const seen = new Set<string>();
  for (const item of form.items) {
    if (!item.ingredientId) return "請選擇原料。";
    if (seen.has(item.ingredientId)) return "同一個麵包不可重複加入相同原料。";
    seen.add(item.ingredientId);
    const ingredient = ingredients.find((entry) => entry.id === item.ingredientId);
    if (!ingredient) return "有原料已不存在，請重新選擇。";
    const amount = parseNonNegative(item.amount);
    if (amount === null || amount <= 0) return "每項原料的用量要大於 0。";
    if (!unitsForBase(ingredient.baseUnit).includes(item.unit)) {
      return `${ingredient.name}的單位需和基礎單位同一類。`;
    }
  }
  return null;
}

export function breadFromForm(form: BreadFormState): Bread {
  return {
    id: form.id,
    name: form.name.trim(),
    category: form.category.trim(),
    items: form.items.map((item) => ({
      ingredientId: item.ingredientId,
      amount: parseNonNegative(item.amount) ?? 0,
      unit: item.unit,
    })),
  };
}

export function selectCreatedIngredient(
  form: BreadFormState,
  lineKey: string,
  ingredient: Ingredient,
): BreadFormState {
  const exists = form.items.some((item) => item.key === lineKey);
  const items = exists
    ? form.items.map((item) =>
        item.key === lineKey
          ? { ...item, ingredientId: ingredient.id, unit: ingredient.baseUnit }
          : item,
      )
    : [
        ...form.items,
        {
          key: lineKey,
          ingredientId: ingredient.id,
          amount: "",
          unit: ingredient.baseUnit,
        },
      ];
  return { ...form, items };
}

export function validateIngredientForm(
  form: IngredientFormState,
  ingredients: Ingredient[],
): string | null {
  const name = form.name.trim();
  if (!name) return "請填寫原料名稱。";
  const duplicated = ingredients.some((item) => item.id !== form.id && item.name.trim() === name);
  if (duplicated) return "已有同名原料，請換一個名稱。";
  if (form.leadDays.trim()) {
    const days = parseBreadCount(form.leadDays);
    if (!days || days < 1) return "預設到貨天數請輸入 1 以上的整數，或留空。";
  }
  if (form.specOn) {
    const quantity = parseNonNegative(form.specQty);
    if (quantity === null || quantity <= 0) return "採購規格的數量要大於 0。";
    const allowed = unitsForBase(form.baseUnit);
    if (!allowed.includes(form.specUnit)) return "採購規格的單位要和基礎單位同一類。";
    if (!(PACK_LABELS as readonly string[]).includes(form.specLabel)) return "請選擇採購單位。";
  }
  return null;
}

export function ingredientFromForm(form: IngredientFormState): Ingredient {
  const days = form.leadDays.trim() ? parseBreadCount(form.leadDays) : null;
  return {
    id: form.id,
    name: form.name.trim(),
    baseUnit: form.baseUnit,
    defaultLeadDays: days && days >= 1 ? days : null,
    purchaseSpec: form.specOn
      ? {
          unitLabel: form.specLabel,
          quantity: parseNonNegative(form.specQty) ?? 0,
          quantityUnit: form.specUnit,
        }
      : null,
  };
}
