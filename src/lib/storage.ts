import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AppSettings, Bread, ExportData, Ingredient, OrderDraft, OrderRecord } from "../types";
import { isPristineDemo, leftoverDemoIds } from "./demo";
import { normalizeOrderRecord } from "./history";
import { defaultSettings, emptyDraft } from "./seed";
import { sanitizeDraftStockUnits } from "./units";

interface BakeryDB extends DBSchema {
  ingredients: { key: string; value: Ingredient };
  breads: { key: string; value: Bread };
  settings: { key: string; value: AppSettings };
  history: { key: string; value: OrderRecord };
  draft: { key: string; value: OrderDraft };
  meta: { key: string; value: { seeded: boolean } };
}

const DB_NAME = "bakery-order-assistant";
const DB_VERSION = 1;

let databasePromise: Promise<IDBPDatabase<BakeryDB>> | null = null;

function db() {
  databasePromise ??= openDB<BakeryDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      database.createObjectStore("ingredients", { keyPath: "id" });
      database.createObjectStore("breads", { keyPath: "id" });
      database.createObjectStore("settings");
      database.createObjectStore("history", { keyPath: "id" });
      database.createObjectStore("draft");
      database.createObjectStore("meta");
    },
  });
  return databasePromise;
}

export interface AppSnapshot {
  ingredients: Ingredient[];
  breads: Bread[];
  settings: AppSettings;
  history: OrderRecord[];
  draft: OrderDraft;
  demoLeftovers: { ingredientIds: string[]; breadIds: string[] };
}

export async function loadApp(): Promise<AppSnapshot> {
  const database = await db();
  const seeded = await database.get("meta", "seed");
  if (!seeded?.seeded) {
    const tx = database.transaction(["settings", "draft", "meta"], "readwrite");
    await Promise.all([
      tx.objectStore("settings").put(defaultSettings, "app"),
      tx.objectStore("draft").put(emptyDraft(), "current"),
      tx.objectStore("meta").put({ seeded: true }, "seed"),
      tx.done,
    ]);
  }

  const [ingredients, breads, settings, history, draft] = await Promise.all([
    database.getAll("ingredients"),
    database.getAll("breads"),
    database.get("settings", "app"),
    database.getAll("history"),
    database.get("draft", "current"),
  ]);

  const loadedDraft = draft ?? emptyDraft(settings ?? defaultSettings);
  let nextIngredients = ingredients;
  let nextBreads = breads;
  if (isPristineDemo(ingredients, breads, history.length, loadedDraft)) {
    const wipe = database.transaction(["ingredients", "breads"], "readwrite");
    await Promise.all([
      wipe.objectStore("ingredients").clear(),
      wipe.objectStore("breads").clear(),
      wipe.done,
    ]);
    nextIngredients = [];
    nextBreads = [];
  }
  const sortedIngredients = nextIngredients.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  const sortedBreads = nextBreads.sort(
    (a, b) =>
      a.category.localeCompare(b.category, "zh-Hant") || a.name.localeCompare(b.name, "zh-Hant"),
  );
  return {
    ingredients: sortedIngredients,
    breads: sortedBreads,
    settings: settings ?? defaultSettings,
    history: history
      .map((record) => normalizeOrderRecord(record))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    draft: sanitizeDraftStockUnits(loadedDraft, sortedIngredients),
    demoLeftovers: leftoverDemoIds(sortedIngredients, sortedBreads),
  };
}

export async function saveIngredient(ingredient: Ingredient) {
  await (await db()).put("ingredients", ingredient);
}

export async function deleteIngredient(id: string) {
  await (await db()).delete("ingredients", id);
}

export async function saveBread(bread: Bread) {
  await (await db()).put("breads", bread);
}

export async function deleteBread(id: string) {
  await (await db()).delete("breads", id);
}

export async function saveSettings(settings: AppSettings) {
  await (await db()).put("settings", settings, "app");
}

export async function saveDraft(draft: OrderDraft) {
  await (await db()).put("draft", draft, "current");
}

export async function saveHistory(record: OrderRecord) {
  await (await db()).put("history", record);
}

export async function deleteHistory(id: string) {
  await (await db()).delete("history", id);
}

export async function replaceAll(data: ExportData) {
  const database = await db();
  const tx = database.transaction(
    ["ingredients", "breads", "settings", "history", "draft", "meta"],
    "readwrite",
  );
  await Promise.all([
    tx.objectStore("ingredients").clear(),
    tx.objectStore("breads").clear(),
    tx.objectStore("history").clear(),
    tx.done,
  ]);
  const write = database.transaction(
    ["ingredients", "breads", "settings", "history", "draft", "meta"],
    "readwrite",
  );
  await Promise.all([
    ...data.ingredients.map((item) => write.objectStore("ingredients").put(item)),
    ...data.breads.map((item) => write.objectStore("breads").put(item)),
    ...data.history.map((item) => write.objectStore("history").put(item)),
    write.objectStore("settings").put(data.settings, "app"),
    write.objectStore("draft").put(data.draft, "current"),
    write.objectStore("meta").put({ seeded: true }, "seed"),
    write.done,
  ]);
}

export async function clearAllData() {
  const database = await db();
  const tx = database.transaction(
    ["ingredients", "breads", "settings", "history", "draft", "meta"],
    "readwrite",
  );
  await Promise.all([
    tx.objectStore("ingredients").clear(),
    tx.objectStore("breads").clear(),
    tx.objectStore("settings").clear(),
    tx.objectStore("history").clear(),
    tx.objectStore("draft").clear(),
    tx.objectStore("meta").clear(),
    tx.done,
  ]);
  database.close();
  databasePromise = null;
  await loadApp();
}

export function exportSnapshot(snapshot: Omit<AppSnapshot, "demoLeftovers">): ExportData {
  return {
    version: 1,
    ingredients: snapshot.ingredients,
    breads: snapshot.breads,
    settings: snapshot.settings,
    history: snapshot.history,
    draft: snapshot.draft,
  };
}
