import { describe, expect, it } from "vitest";
import type { Ingredient } from "../types";
import {
  breadFromForm,
  emptyBreadForm,
  selectCreatedIngredient,
  validateBreadForm,
  validateIngredientForm,
  emptyIngredientForm,
} from "./forms";
import { breadQuantityErrors } from "./calculate";

const flour: Ingredient = {
  id: "flour",
  name: "高筋麵粉",
  baseUnit: "g",
  purchaseSpec: null,
  defaultLeadDays: null,
};

describe("表單驗證", () => {
  it("無效數量會阻止進入下一步，空白與 0 合法", () => {
    expect(breadQuantityErrors({ a: "2", b: "x" }, ["a", "b"])).toHaveProperty("b");
    expect(breadQuantityErrors({ a: "", b: "0" }, ["a", "b"])).toEqual({});
    expect(breadQuantityErrors({ a: "-1" }, ["a"])).toHaveProperty("a");
    expect(breadQuantityErrors({ a: "1.2" }, ["a"])).toHaveProperty("a");
  });

  it("配方至少一項原料、用量大於 0，且不可重複", () => {
    const form = emptyBreadForm("餐包");
    expect(validateBreadForm(form, [flour])).toBe("請至少加入一項原料。");
    form.items.push({ key: "1", ingredientId: "flour", amount: "0", unit: "g" });
    expect(validateBreadForm(form, [flour])).toBe("每項原料的用量要大於 0。");
    form.items[0]!.amount = "80";
    form.items.push({ key: "2", ingredientId: "flour", amount: "10", unit: "g" });
    expect(validateBreadForm(form, [flour])).toBe("同一個麵包不可重複加入相同原料。");
    form.items.pop();
    expect(validateBreadForm(form, [flour])).toBeNull();
    expect(breadFromForm(form).items).toHaveLength(1);
  });

  it("建立新原料後可立刻加入配方", () => {
    const milk: Ingredient = {
      id: "milk",
      name: "牛奶",
      baseUnit: "ml",
      purchaseSpec: null,
      defaultLeadDays: null,
    };
    const form = emptyBreadForm("餐包");
    form.items.push({ key: "line", ingredientId: "", amount: "", unit: "g" });
    const next = selectCreatedIngredient(form, "line", milk);
    expect(next.items[0]?.ingredientId).toBe("milk");
    expect(next.items[0]?.unit).toBe("ml");
    const ingredientForm = emptyIngredientForm();
    ingredientForm.name = "牛奶";
    ingredientForm.baseUnit = "ml";
    expect(validateIngredientForm(ingredientForm, [flour])).toBeNull();
    ingredientForm.name = "高筋麵粉";
    expect(validateIngredientForm(ingredientForm, [flour])).toBe("已有同名原料，請換一個名稱。");
  });
});
