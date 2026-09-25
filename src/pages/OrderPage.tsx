import { useEffect, useMemo, useState } from "react";
import { IconMinus, IconPlus } from "../components/Icons";
import { BreadForm } from "../components/BreadForm";
import { emptyBreadForm } from "../lib/forms";
import { useToast } from "../useToast";
import {
  breadQuantityErrors,
  calculateOrder,
  parseBreadCount,
  parseNonNegative,
} from "../lib/calculate";
import { manualLeadDays } from "../lib/history";
import { buildOrderText, shareOrCopy } from "../lib/share";
import {
  formatBaseAmount,
  resolveStockUnit,
  sanitizeDraftStockUnits,
  stockToBase,
  stockUnitChoices,
  unitLabel,
} from "../lib/units";
import { useStore } from "../useStore";
import type { HistoryBread, HistoryStock, OrderDraft } from "../types";

export function OrderPage() {
  const store = useStore();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [breadForm, setBreadForm] = useState<ReturnType<typeof emptyBreadForm> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const draft = store.draft;

  useEffect(() => {
    const next = sanitizeDraftStockUnits(draft, store.ingredients);
    if (next !== draft) store.setDraft(next);
  }, [draft, store]);

  const update = (patch: Partial<OrderDraft>) => store.setDraft({ ...draft, ...patch });

  const selected = useMemo(() => {
    return store.breads
      .map((bread) => ({ bread, quantity: parseBreadCount(draft.quantities[bread.id] ?? "") ?? 0 }))
      .filter((item) => item.quantity > 0);
  }, [store.breads, draft.quantities]);

  const usedIngredients = useMemo(() => {
    const ids = new Set<string>();
    for (const item of selected) {
      for (const recipe of item.bread.items) ids.add(recipe.ingredientId);
    }
    return store.ingredients.filter((ingredient) => ids.has(ingredient.id));
  }, [selected, store.ingredients]);

  const filteredBreads = store.breads.filter((bread) => bread.name.includes(query.trim()));

  const lines = useMemo(() => {
    if (step < 3) return [];
    const quantities: Record<string, number> = {};
    for (const item of selected) quantities[item.bread.id] = item.quantity;
    const stocks: Record<string, { amount: number; unit: string }> = {};
    const leadDays: Record<string, number> = {};
    for (const ingredient of usedIngredients) {
      const stock = draft.stocks[ingredient.id];
      const amount = parseNonNegative(stock?.amount ?? "") ?? 0;
      if (amount > 0 && stock) stocks[ingredient.id] = { amount, unit: stock.unit };
      const custom = draft.leadDaysByIngredient[ingredient.id];
      if (custom?.trim()) {
        const days = parseBreadCount(custom);
        if (days && days > 0) leadDays[ingredient.id] = days;
      }
    }
    return calculateOrder({
      breads: store.breads,
      ingredients: store.ingredients,
      quantities,
      stocks,
      includeLeadDays: draft.includeLeadDays,
      defaultLeadDays: store.settings.defaultLeadDays,
      leadDaysByIngredient: leadDays,
      safetyPercent: parseNonNegative(draft.safetyPercent) ?? 0,
    });
  }, [
    step,
    selected,
    usedIngredients,
    draft,
    store.breads,
    store.ingredients,
    store.settings.defaultLeadDays,
  ]);

  function setQuantity(id: string, next: number) {
    update({ quantities: { ...draft.quantities, [id]: String(Math.max(0, next)) } });
  }

  const quantityErrors = breadQuantityErrors(
    draft.quantities,
    store.breads.map((bread) => bread.id),
  );

  function validateStep(target: number) {
    const nextErrors: Record<string, string> = {};
    if (target > 0) {
      Object.assign(nextErrors, quantityErrors);
      const hasValidPlan = store.breads.some((bread) => {
        const count = parseBreadCount(draft.quantities[bread.id] ?? "");
        return count !== null && count > 0;
      });
      if (Object.keys(quantityErrors).length === 0 && !hasValidPlan) {
        nextErrors.plan = "請至少輸入一種麵包的製作數量。";
      }
    }
    if (target > 1) {
      for (const ingredient of usedIngredients) {
        const stock = draft.stocks[ingredient.id] ?? { amount: "", unit: ingredient.baseUnit };
        const amount = parseNonNegative(stock.amount);
        if (amount === null) nextErrors[ingredient.id] = "請輸入 0 以上的數字。";
        else if (amount > 0) {
          try {
            stockToBase(amount, stock.unit, ingredient);
          } catch {
            nextErrors[ingredient.id] = ingredient.purchaseSpec
              ? `這個單位對不上。可改用${unitLabel(ingredient.baseUnit)}，或採購單位「${ingredient.purchaseSpec.unitLabel}」。`
              : "這個單位和原料的基礎單位不同，請改選。";
          }
        }
      }
    }
    if (target > 2) {
      const safety = parseNonNegative(draft.safetyPercent);
      if (safety === null) nextErrors.safety = "安全備用百分比請輸入 0 以上的數字。";
      if (draft.includeLeadDays && store.settings.defaultLeadDays < 1) {
        nextErrors.lead = "預設到貨天數至少要 1 天，請到設定調整。";
      }
      for (const ingredient of usedIngredients) {
        const custom = draft.leadDaysByIngredient[ingredient.id] ?? "";
        if (!draft.includeLeadDays || custom.trim() === "") continue;
        const days = parseBreadCount(custom);
        if (!days || days < 1)
          nextErrors[`lead-${ingredient.id}`] = "到貨天數請輸入 1 以上的整數。";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function go(target: number) {
    if (target > step && !validateStep(target)) return;
    setStep(target);
  }

  async function saveOrder() {
    if (!validateStep(4)) return;
    const breads: HistoryBread[] = selected.map((item) => ({
      breadId: item.bread.id,
      name: item.bread.name,
      category: item.bread.category,
      quantity: item.quantity,
    }));
    const stocks: HistoryStock[] = usedIngredients.map((ingredient) => {
      const stock = draft.stocks[ingredient.id] ?? { amount: "0", unit: ingredient.baseUnit };
      const amount = parseNonNegative(stock.amount) ?? 0;
      let baseAmount = 0;
      try {
        baseAmount = amount > 0 ? stockToBase(amount, stock.unit, ingredient) : 0;
      } catch {
        baseAmount = 0;
      }
      return {
        ingredientId: ingredient.id,
        name: ingredient.name,
        amount,
        unit: stock.unit,
        baseAmount,
      };
    });
    await store.addHistory({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      breads,
      stocks,
      includeLeadDays: draft.includeLeadDays,
      defaultLeadDays: store.settings.defaultLeadDays,
      safetyPercent: parseNonNegative(draft.safetyPercent) ?? 0,
      leadDaysByIngredient: manualLeadDays(draft.leadDaysByIngredient),
      lines,
    });
    toast("已儲存本次叫貨");
  }

  async function shareOrder() {
    const text = buildOrderText({
      createdAt: new Date().toISOString(),
      breads: selected.map((item) => ({
        breadId: item.bread.id,
        name: item.bread.name,
        category: item.bread.category,
        quantity: item.quantity,
      })),
      stocks: [],
      includeLeadDays: draft.includeLeadDays,
      safetyPercent: parseNonNegative(draft.safetyPercent) ?? 0,
      lines,
    });
    try {
      const result = await shareOrCopy(text);
      toast(result === "shared" ? "已開啟分享" : "已複製叫貨清單");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast("無法分享或複製");
    }
  }

  async function copyOrder() {
    const text = buildOrderText({
      createdAt: new Date().toISOString(),
      breads: selected.map((item) => ({
        breadId: item.bread.id,
        name: item.bread.name,
        category: item.bread.category,
        quantity: item.quantity,
      })),
      stocks: [],
      includeLeadDays: draft.includeLeadDays,
      safetyPercent: parseNonNegative(draft.safetyPercent) ?? 0,
      lines,
    });
    try {
      await navigator.clipboard.writeText(text);
      toast("已複製叫貨清單");
    } catch {
      toast("無法複製，請檢查瀏覽器權限");
    }
  }

  return (
    <section className="page">
      <header className="page-head">
        <h1 className="page-title">今日叫貨</h1>
        <p className="meta">
          {new Intl.DateTimeFormat("zh-TW", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "short",
          }).format(new Date())}
        </p>
      </header>

      {step === 0 && (
        <div className="stack">
          <label className="field">
            <span>搜尋麵包</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="輸入名稱"
            />
          </label>
          {errors.plan && <p className="error">{errors.plan}</p>}
          {Object.keys(quantityErrors).length > 0 &&
            !filteredBreads.some((bread) => quantityErrors[bread.id]) && (
              <p className="error">有麵包的製作數量不正確。請清除搜尋，並改成 0 以上的整數。</p>
            )}
          {store.breads.length === 0 && (
            <div className="empty">
              <p>尚未建立麵包品項</p>
              <button
                type="button"
                className="button"
                onClick={() => setBreadForm(emptyBreadForm())}
              >
                新增麵包
              </button>
            </div>
          )}
          {store.breads.length > 0 && filteredBreads.length === 0 && (
            <div className="empty">
              <p>找不到符合的麵包</p>
              <button
                type="button"
                className="button"
                onClick={() => setBreadForm(emptyBreadForm(query.trim()))}
              >
                新增麵包
              </button>
            </div>
          )}
          {store.breads.length > 0 && (
            <button
              type="button"
              className="button secondary"
              onClick={() => setBreadForm(emptyBreadForm())}
            >
              新增麵包
            </button>
          )}
          <ul className="list">
            {filteredBreads.map((bread) => {
              const raw = draft.quantities[bread.id] ?? "0";
              const count = parseBreadCount(raw);
              return (
                <li key={bread.id} className="row-card">
                  <div>
                    <p className="item-title">{bread.name}</p>
                    <p className="meta">{bread.category}</p>
                  </div>
                  <div className="stepper">
                    <button
                      type="button"
                      aria-label={`減少${bread.name}`}
                      onClick={() => setQuantity(bread.id, (count ?? 0) - 1)}
                    >
                      <IconMinus />
                    </button>
                    <input
                      aria-label={`${bread.name}製作數量`}
                      inputMode="numeric"
                      value={raw === "" ? "" : raw}
                      onChange={(event) =>
                        update({
                          quantities: { ...draft.quantities, [bread.id]: event.target.value },
                        })
                      }
                    />
                    <button
                      type="button"
                      aria-label={`增加${bread.name}`}
                      onClick={() => setQuantity(bread.id, (count ?? 0) + 1)}
                    >
                      <IconPlus />
                    </button>
                  </div>
                  {quantityErrors[bread.id] && <p className="error">{quantityErrors[bread.id]}</p>}
                </li>
              );
            })}
          </ul>
          <p className="summary">
            已選 {selected.length} 款，共 {selected.reduce((sum, item) => sum + item.quantity, 0)}{" "}
            個
          </p>
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          <p className="note">只列出這次製作會用到的原料。空白視為 0。</p>
          {usedIngredients.length === 0 && <p className="empty">請先回到上一步輸入製作量。</p>}
          <ul className="list">
            {usedIngredients.map((ingredient) => {
              const stock = draft.stocks[ingredient.id] ?? {
                amount: "",
                unit: ingredient.baseUnit,
              };
              const unit = resolveStockUnit(ingredient, stock.unit);
              return (
                <li key={ingredient.id} className="row-card column">
                  <p className="item-title">{ingredient.name}</p>
                  <div className="split">
                    <label className="field grow">
                      <span>剩餘數量</span>
                      <input
                        inputMode="decimal"
                        value={stock.amount}
                        aria-label={`${ingredient.name}剩餘數量`}
                        onChange={(event) =>
                          update({
                            stocks: {
                              ...draft.stocks,
                              [ingredient.id]: { ...stock, amount: event.target.value },
                            },
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>單位</span>
                      <select
                        aria-label={`${ingredient.name}單位`}
                        value={unit}
                        onChange={(event) =>
                          update({
                            stocks: {
                              ...draft.stocks,
                              [ingredient.id]: { ...stock, unit: event.target.value },
                            },
                          })
                        }
                      >
                        {stockUnitChoices(ingredient).map((choice) => (
                          <option key={choice.value} value={choice.value}>
                            {choice.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {errors[ingredient.id] && <p className="error">{errors[ingredient.id]}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {step === 2 && (
        <div className="stack">
          <label className="switch">
            <input
              type="checkbox"
              checked={draft.includeLeadDays}
              onChange={(event) => update({ includeLeadDays: event.target.checked })}
            />
            <span>納入到貨天數</span>
          </label>
          <p className="note">
            這是 Demo 估算：假設到貨前每天的製作量和本次相同，以「本次需求 ×
            到貨天數」計算。關閉時只算目前這次計畫。之後可依師傅的實際排程調整。
          </p>
          {draft.includeLeadDays && (
            <>
              <p className="meta">
                全域預設 {store.settings.defaultLeadDays}{" "}
                天。下面沒填的原料會用原料自己的預設，再不然就用這個全域值。
              </p>
              <ul className="list">
                {usedIngredients.map((ingredient) => (
                  <li key={ingredient.id} className="row-card">
                    <div>
                      <p className="item-title">{ingredient.name}</p>
                      <p className="meta">
                        {ingredient.defaultLeadDays
                          ? `原料預設 ${ingredient.defaultLeadDays} 天`
                          : "沿用全域預設"}
                      </p>
                    </div>
                    <label className="field slim">
                      <span>天數</span>
                      <input
                        inputMode="numeric"
                        placeholder="預設"
                        aria-label={`${ingredient.name}到貨天數`}
                        value={draft.leadDaysByIngredient[ingredient.id] ?? ""}
                        onChange={(event) =>
                          update({
                            leadDaysByIngredient: {
                              ...draft.leadDaysByIngredient,
                              [ingredient.id]: event.target.value,
                            },
                          })
                        }
                      />
                    </label>
                    {errors[`lead-${ingredient.id}`] && (
                      <p className="error">{errors[`lead-${ingredient.id}`]}</p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          <label className="field">
            <span>安全備用百分比</span>
            <input
              inputMode="decimal"
              value={draft.safetyPercent}
              onChange={(event) => update({ safetyPercent: event.target.value })}
            />
          </label>
          {errors.safety && <p className="error">{errors.safety}</p>}
          <p className="meta">預設 0%。例如 10 表示在估算需求上再加 10%。</p>
        </div>
      )}

      {step === 3 && (
        <div className="stack">
          {lines.length === 0 && <p className="empty">目前沒有可計算的原料。</p>}
          <ul className="list">
            {lines.map((line) => (
              <li key={line.ingredientId} className="result-card">
                <h2>{line.name}</h2>
                <dl>
                  <div>
                    <dt>總需求</dt>
                    <dd>{formatBaseAmount(line.finalNeedBase, line.baseUnit)}</dd>
                  </div>
                  <div>
                    <dt>現有庫存</dt>
                    <dd>{formatBaseAmount(line.stockBase, line.baseUnit)}</dd>
                  </div>
                  <div>
                    <dt>實際短缺</dt>
                    <dd className={line.shortageBase > 0 ? "shortage" : ""}>
                      {formatBaseAmount(line.shortageBase, line.baseUnit)}
                    </dd>
                  </div>
                </dl>
                {line.recipeNeedBase !== line.finalNeedBase && (
                  <p className="meta">
                    配方合計 {formatBaseAmount(line.recipeNeedBase, line.baseUnit)}
                    {draft.includeLeadDays ? ` × ${line.leadDays} 天` : ""}
                    {line.safetyPercent > 0 ? `，再加安全備用 ${line.safetyPercent}%` : ""}
                  </p>
                )}
                {line.purchase ? (
                  <p className="suggest">
                    {line.shortageBase > 0
                      ? `短缺 ${formatBaseAmount(line.shortageBase, line.baseUnit)}，建議叫 ${line.purchase.packs} ${line.purchase.unitLabel}`
                      : "庫存足夠，不必叫貨"}
                  </p>
                ) : (
                  <p className="suggest">尚未設定採購規格，以上為精確短缺量。</p>
                )}
              </li>
            ))}
          </ul>
          <div className="button-row">
            <button type="button" className="button" onClick={() => void saveOrder()}>
              儲存本次叫貨
            </button>
            <button type="button" className="button secondary" onClick={() => void copyOrder()}>
              複製叫貨清單
            </button>
            <button type="button" className="button secondary" onClick={() => void shareOrder()}>
              分享叫貨清單
            </button>
          </div>
        </div>
      )}

      {breadForm && (
        <BreadForm
          initial={breadForm}
          ingredients={store.ingredients}
          title="新增麵包"
          onClose={() => setBreadForm(null)}
          onCreateIngredient={(ingredient) => store.upsertIngredient(ingredient)}
          onSubmit={async (bread) => {
            await store.upsertBread(bread);
            setBreadForm(null);
            toast("麵包已新增");
          }}
        />
      )}

      <div className="button-row sticky-actions">
        {step > 0 && (
          <button type="button" className="button secondary" onClick={() => setStep(step - 1)}>
            上一步
          </button>
        )}
        {step < 3 && (
          <button type="button" className="button" onClick={() => go(step + 1)}>
            下一步
          </button>
        )}
      </div>
    </section>
  );
}
