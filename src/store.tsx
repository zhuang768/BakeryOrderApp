import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { normalizeExportData } from "./lib/history";
import { emptyDraft } from "./lib/seed";
import { sanitizeDraftStockUnits } from "./lib/units";
import { StoreContext, type StoreValue } from "./store-context";
import type { AppSettings, Bread, Ingredient, OrderDraft, OrderRecord } from "./types";
import {
  clearAllData,
  deleteBread,
  deleteHistory,
  deleteIngredient,
  loadApp,
  replaceAll,
  saveBread,
  saveDraft,
  saveHistory,
  saveIngredient,
  saveSettings,
} from "./lib/storage";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [breads, setBreads] = useState<Bread[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    includeLeadDays: false,
    defaultLeadDays: 1,
    safetyPercent: 0,
  });
  const [history, setHistory] = useState<OrderRecord[]>([]);
  const [draft, setDraftState] = useState<OrderDraft>(emptyDraft());
  const [demoLeftovers, setDemoLeftovers] = useState({
    ingredientIds: [] as string[],
    breadIds: [] as string[],
  });

  useEffect(() => {
    let active = true;
    loadApp()
      .then((snapshot) => {
        if (!active) return;
        setIngredients(snapshot.ingredients);
        setBreads(snapshot.breads);
        setSettings(snapshot.settings);
        setHistory(snapshot.history);
        setDraftState(snapshot.draft);
        setDemoLeftovers(snapshot.demoLeftovers);
        setReady(true);
      })
      .catch((error: unknown) => {
        console.error(error);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setDraft = useCallback((next: OrderDraft) => {
    setDraftState(next);
    void saveDraft(next);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      ingredients,
      breads,
      settings,
      history,
      draft,
      demoLeftovers,
      setDraft,
      async upsertIngredient(ingredient) {
        await saveIngredient(ingredient);
        const nextIngredients = [
          ...ingredients.filter((item) => item.id !== ingredient.id),
          ingredient,
        ].sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
        const nextDraft = sanitizeDraftStockUnits(draft, nextIngredients);
        setIngredients(nextIngredients);
        if (nextDraft !== draft) {
          setDraftState(nextDraft);
          await saveDraft(nextDraft);
        }
      },
      async removeIngredient(id) {
        await deleteIngredient(id);
        setIngredients((current) => current.filter((item) => item.id !== id));
        setBreads((current) =>
          current.map((bread) => ({
            ...bread,
            items: bread.items.filter((item) => item.ingredientId !== id),
          })),
        );
        const nextBreads = breads.map((bread) => ({
          ...bread,
          items: bread.items.filter((item) => item.ingredientId !== id),
        }));
        await Promise.all(nextBreads.map((bread) => saveBread(bread)));
      },
      async upsertBread(bread) {
        await saveBread(bread);
        setBreads((current) =>
          [...current.filter((item) => item.id !== bread.id), bread].sort(
            (a, b) =>
              a.category.localeCompare(b.category, "zh-Hant") ||
              a.name.localeCompare(b.name, "zh-Hant"),
          ),
        );
      },
      async removeBread(id) {
        await deleteBread(id);
        setBreads((current) => current.filter((item) => item.id !== id));
      },
      async updateSettings(next) {
        await saveSettings(next);
        setSettings(next);
      },
      async addHistory(record) {
        await saveHistory(record);
        setHistory((current) => [record, ...current]);
      },
      async removeHistory(id) {
        await deleteHistory(id);
        setHistory((current) => current.filter((item) => item.id !== id));
      },
      async importData(data) {
        const normalized = normalizeExportData(data);
        const nextDraft = sanitizeDraftStockUnits(normalized.draft, normalized.ingredients);
        await replaceAll({ ...normalized, draft: nextDraft });
        setIngredients(normalized.ingredients);
        setBreads(normalized.breads);
        setSettings(normalized.settings);
        setHistory(normalized.history.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setDraftState(nextDraft);
      },
      async resetAll() {
        await clearAllData();
        const snapshot = await loadApp();
        setIngredients(snapshot.ingredients);
        setBreads(snapshot.breads);
        setSettings(snapshot.settings);
        setHistory(snapshot.history);
        setDraftState(snapshot.draft);
        setDemoLeftovers(snapshot.demoLeftovers);
      },
      async removeDemoLeftovers() {
        await Promise.all([
          ...demoLeftovers.breadIds.map((id) => deleteBread(id)),
          ...demoLeftovers.ingredientIds.map((id) => deleteIngredient(id)),
        ]);
        setBreads((current) => current.filter((item) => !demoLeftovers.breadIds.includes(item.id)));
        setIngredients((current) =>
          current.filter((item) => !demoLeftovers.ingredientIds.includes(item.id)),
        );
        setDemoLeftovers({ ingredientIds: [], breadIds: [] });
      },
    }),
    [ready, ingredients, breads, settings, history, draft, demoLeftovers, setDraft],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
