import { useState } from "react";
import type { IngredientFormState } from "../lib/forms";
import { ingredientFromForm, validateIngredientForm } from "../lib/forms";
import {
  PACK_LABELS,
  type BaseUnit,
  type Ingredient,
  type MeasureUnit,
  type PackLabel,
} from "../types";

export function IngredientForm({
  initial,
  ingredients,
  onSubmit,
  onCancel,
}: {
  initial: IngredientFormState;
  ingredients: Ingredient[];
  onSubmit: (ingredient: Ingredient) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");

  async function save() {
    const message = validateIngredientForm(form, ingredients);
    if (message) {
      setError(message);
      return;
    }
    await onSubmit(ingredientFromForm(form));
  }

  return (
    <div className="stack">
      <label className="field">
        <span>原料名稱</span>
        <input
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
      </label>
      <label className="field">
        <span>基礎單位</span>
        <select
          value={form.baseUnit}
          onChange={(event) => setForm({ ...form, baseUnit: event.target.value as BaseUnit })}
        >
          <option value="g">公克（重量）</option>
          <option value="ml">毫升（容量）</option>
          <option value="piece">個（計數）</option>
        </select>
      </label>
      <label className="switch">
        <input
          type="checkbox"
          checked={form.specOn}
          onChange={(event) => setForm({ ...form, specOn: event.target.checked })}
        />
        <span>設定採購規格</span>
      </label>
      {form.specOn && (
        <div className="split">
          <label className="field slim">
            <span>規格</span>
            <select
              value={form.specLabel}
              onChange={(event) => setForm({ ...form, specLabel: event.target.value as PackLabel })}
            >
              {PACK_LABELS.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field grow">
            <span>每單位含量</span>
            <input
              inputMode="decimal"
              value={form.specQty}
              onChange={(event) => setForm({ ...form, specQty: event.target.value })}
            />
          </label>
          <label className="field slim">
            <span>含量單位</span>
            <select
              value={form.specUnit}
              onChange={(event) =>
                setForm({ ...form, specUnit: event.target.value as MeasureUnit })
              }
            >
              <option value="g">公克</option>
              <option value="kg">公斤</option>
              <option value="ml">毫升</option>
              <option value="L">公升</option>
              <option value="piece">個</option>
            </select>
          </label>
        </div>
      )}
      <label className="field">
        <span>預設到貨天數（可空白）</span>
        <input
          inputMode="numeric"
          value={form.leadDays}
          onChange={(event) => setForm({ ...form, leadDays: event.target.value })}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="button-row">
        <button type="button" className="button" onClick={() => void save()}>
          儲存原料
        </button>
        <button type="button" className="button secondary" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}
