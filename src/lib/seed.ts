import type { AppSettings, Bread, Ingredient, OrderDraft } from "../types";

export const defaultSettings: AppSettings = {
  includeLeadDays: false,
  defaultLeadDays: 1,
  safetyPercent: 0,
};

export const emptyDraft = (settings: AppSettings = defaultSettings): OrderDraft => ({
  quantities: {},
  stocks: {},
  includeLeadDays: settings.includeLeadDays,
  leadDaysByIngredient: {},
  safetyPercent: String(settings.safetyPercent),
});

export const seedIngredients: Ingredient[] = [
  {
    id: "ing-high-flour",
    name: "高筋麵粉",
    baseUnit: "g",
    purchaseSpec: { unitLabel: "包", quantity: 1, quantityUnit: "kg" },
    defaultLeadDays: 2,
  },
  {
    id: "ing-low-flour",
    name: "低筋麵粉",
    baseUnit: "g",
    purchaseSpec: { unitLabel: "包", quantity: 1, quantityUnit: "kg" },
    defaultLeadDays: 2,
  },
  {
    id: "ing-butter",
    name: "奶油",
    baseUnit: "g",
    purchaseSpec: { unitLabel: "塊", quantity: 500, quantityUnit: "g" },
    defaultLeadDays: 2,
  },
  {
    id: "ing-cheese",
    name: "起司",
    baseUnit: "g",
    purchaseSpec: { unitLabel: "包", quantity: 1, quantityUnit: "kg" },
    defaultLeadDays: 2,
  },
  {
    id: "ing-potato",
    name: "馬鈴薯",
    baseUnit: "g",
    purchaseSpec: { unitLabel: "袋", quantity: 2, quantityUnit: "kg" },
    defaultLeadDays: 1,
  },
  {
    id: "ing-red-bean",
    name: "紅豆餡",
    baseUnit: "g",
    purchaseSpec: { unitLabel: "罐", quantity: 1, quantityUnit: "kg" },
    defaultLeadDays: 3,
  },
  {
    id: "ing-sugar",
    name: "糖",
    baseUnit: "g",
    purchaseSpec: { unitLabel: "包", quantity: 1, quantityUnit: "kg" },
    defaultLeadDays: 7,
  },
  {
    id: "ing-salt",
    name: "鹽",
    baseUnit: "g",
    purchaseSpec: { unitLabel: "包", quantity: 500, quantityUnit: "g" },
    defaultLeadDays: 14,
  },
  {
    id: "ing-yeast",
    name: "酵母",
    baseUnit: "g",
    purchaseSpec: { unitLabel: "包", quantity: 500, quantityUnit: "g" },
    defaultLeadDays: 7,
  },
  {
    id: "ing-milk",
    name: "牛奶",
    baseUnit: "ml",
    purchaseSpec: { unitLabel: "瓶", quantity: 1, quantityUnit: "L" },
    defaultLeadDays: 1,
  },
  {
    id: "ing-egg",
    name: "雞蛋",
    baseUnit: "piece",
    purchaseSpec: { unitLabel: "盒", quantity: 10, quantityUnit: "piece" },
    defaultLeadDays: 2,
  },
];

export const seedBreads: Bread[] = [
  {
    id: "bread-potato-cheese",
    name: "起司馬鈴薯麵包",
    category: "餐包",
    items: [
      { ingredientId: "ing-potato", amount: 50, unit: "g" },
      { ingredientId: "ing-cheese", amount: 20, unit: "g" },
      { ingredientId: "ing-high-flour", amount: 80, unit: "g" },
      { ingredientId: "ing-butter", amount: 15, unit: "g" },
      { ingredientId: "ing-sugar", amount: 8, unit: "g" },
      { ingredientId: "ing-salt", amount: 1.5, unit: "g" },
      { ingredientId: "ing-yeast", amount: 2, unit: "g" },
      { ingredientId: "ing-milk", amount: 40, unit: "ml" },
      { ingredientId: "ing-egg", amount: 0.2, unit: "piece" },
    ],
  },
  {
    id: "bread-red-bean",
    name: "紅豆麵包",
    category: "餐包",
    items: [
      { ingredientId: "ing-low-flour", amount: 70, unit: "g" },
      { ingredientId: "ing-red-bean", amount: 40, unit: "g" },
      { ingredientId: "ing-butter", amount: 10, unit: "g" },
      { ingredientId: "ing-sugar", amount: 12, unit: "g" },
      { ingredientId: "ing-salt", amount: 1, unit: "g" },
      { ingredientId: "ing-yeast", amount: 1.5, unit: "g" },
      { ingredientId: "ing-milk", amount: 30, unit: "ml" },
      { ingredientId: "ing-egg", amount: 0.15, unit: "piece" },
    ],
  },
  {
    id: "bread-butter-roll",
    name: "奶油餐包",
    category: "餐包",
    items: [
      { ingredientId: "ing-high-flour", amount: 45, unit: "g" },
      { ingredientId: "ing-butter", amount: 18, unit: "g" },
      { ingredientId: "ing-sugar", amount: 8, unit: "g" },
      { ingredientId: "ing-salt", amount: 0.8, unit: "g" },
      { ingredientId: "ing-yeast", amount: 1.2, unit: "g" },
      { ingredientId: "ing-milk", amount: 22, unit: "ml" },
      { ingredientId: "ing-egg", amount: 0.1, unit: "piece" },
    ],
  },
  {
    id: "bread-melon",
    name: "菠蘿麵包",
    category: "甜麵包",
    items: [
      { ingredientId: "ing-high-flour", amount: 55, unit: "g" },
      { ingredientId: "ing-low-flour", amount: 25, unit: "g" },
      { ingredientId: "ing-butter", amount: 25, unit: "g" },
      { ingredientId: "ing-sugar", amount: 18, unit: "g" },
      { ingredientId: "ing-salt", amount: 0.8, unit: "g" },
      { ingredientId: "ing-yeast", amount: 1.5, unit: "g" },
      { ingredientId: "ing-milk", amount: 20, unit: "ml" },
      { ingredientId: "ing-egg", amount: 0.25, unit: "piece" },
    ],
  },
  {
    id: "bread-toast",
    name: "吐司",
    category: "吐司",
    items: [
      { ingredientId: "ing-high-flour", amount: 400, unit: "g" },
      { ingredientId: "ing-butter", amount: 40, unit: "g" },
      { ingredientId: "ing-sugar", amount: 30, unit: "g" },
      { ingredientId: "ing-salt", amount: 8, unit: "g" },
      { ingredientId: "ing-yeast", amount: 6, unit: "g" },
      { ingredientId: "ing-milk", amount: 240, unit: "ml" },
      { ingredientId: "ing-egg", amount: 1, unit: "piece" },
    ],
  },
];
