import { createContext } from "react";
import type { AppSettings, Bread, ExportData, Ingredient, OrderDraft, OrderRecord } from "./types";

export interface StoreValue {
  ready: boolean;
  ingredients: Ingredient[];
  breads: Bread[];
  settings: AppSettings;
  history: OrderRecord[];
  draft: OrderDraft;
  setDraft: (draft: OrderDraft) => void;
  upsertIngredient: (ingredient: Ingredient) => Promise<void>;
  removeIngredient: (id: string) => Promise<void>;
  upsertBread: (bread: Bread) => Promise<void>;
  removeBread: (id: string) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  addHistory: (record: OrderRecord) => Promise<void>;
  removeHistory: (id: string) => Promise<void>;
  importData: (data: ExportData) => Promise<void>;
  resetAll: () => Promise<void>;
  demoLeftovers: { ingredientIds: string[]; breadIds: string[] };
  removeDemoLeftovers: () => Promise<void>;
}

export const StoreContext = createContext<StoreValue | null>(null);
