import type { Bread, Ingredient, OrderDraft } from "../types";
import { seedBreads, seedIngredients } from "./seed";

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function leftoverDemoIds(ingredients: Ingredient[], breads: Bread[]) {
  const breadIds = breads
    .filter((bread) => seedBreads.some((seed) => seed.id === bread.id && same(seed, bread)))
    .map((bread) => bread.id);
  const kept = breads.filter((bread) => !breadIds.includes(bread.id));
  const used = new Set(kept.flatMap((bread) => bread.items.map((item) => item.ingredientId)));
  const ingredientIds = ingredients
    .filter(
      (item) =>
        seedIngredients.some((seed) => seed.id === item.id && same(seed, item)) &&
        !used.has(item.id),
    )
    .map((item) => item.id);
  return { ingredientIds, breadIds };
}

export function isPristineDemo(
  ingredients: Ingredient[],
  breads: Bread[],
  historyCount: number,
  draft: OrderDraft,
): boolean {
  if (historyCount > 0) return false;
  const quantities = Object.values(draft.quantities).some(
    (value) => value.trim() !== "" && value.trim() !== "0",
  );
  const stocks = Object.values(draft.stocks).some((stock) => stock.amount.trim() !== "");
  const leadDays = Object.values(draft.leadDaysByIngredient).some((value) => value.trim() !== "");
  if (quantities || stocks || leadDays) return false;
  if (ingredients.length !== seedIngredients.length || breads.length !== seedBreads.length)
    return false;
  return (
    ingredients.every((item) => seedIngredients.some((seed) => same(seed, item))) &&
    breads.every((item) => seedBreads.some((seed) => same(seed, item)))
  );
}

export function blankCatalog() {
  return { ingredients: [] as Ingredient[], breads: [] as Bread[] };
}
