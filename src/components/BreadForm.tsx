import { useState } from "react";
import type { Ingredient } from "../types";
import type { BreadFormState } from "../lib/forms";
import {
  breadFormDirty,
  breadFromForm,
  emptyIngredientForm,
  selectCreatedIngredient,
  validateBreadForm,
} from "../lib/forms";
import { unitLabel, unitsForBase } from "../lib/units";
import { ConfirmDialog, Modal } from "./Modal";
import { IngredientForm } from "./IngredientForm";

export function BreadForm({
  initial,
  ingredients,
  title,
  onSubmit,
  onClose,
  onCreateIngredient,
}: {
  initial: BreadFormState;
  ingredients: Ingredient[];
  title: string;
  onSubmit: (bread: ReturnType<typeof breadFromForm>) => Promise<void>;
  onClose: () => void;
  onCreateIngredient: (ingredient: Ingredient) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  function requestClose() {
    if (breadFormDirty(form)) setConfirmClose(true);
    else onClose();
  }

  function addLine() {
    setForm({
      ...form,
      items: [...form.items, { key: crypto.randomUUID(), ingredientId: "", amount: "", unit: "g" }],
    });
  }

  async function save() {
    const message = validateBreadForm(form, ingredients);
    if (message) {
      setError(message);
      return;
    }
    await onSubmit(breadFromForm(form));
  }

  return (
    <Modal title={title} onClose={requestClose}>
      <div className="stack">
        <label className="field">
          <span>麵包名稱</span>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label className="field">
          <span>分類（可空白）</span>
          <input
            value={form.category}
            placeholder="例如餐包、吐司"
            onChange={(event) => setForm({ ...form, category: event.target.value })}
          />
        </label>
        {form.items.map((item) => {
          const ingredient = ingredients.find((entry) => entry.id === item.ingredientId);
          const unitOptions = ingredient ? unitsForBase(ingredient.baseUnit) : [];
          return (
            <div key={item.key} className="editor-line">
              <label className="field grow">
                <span>原料</span>
                <select
                  value={item.ingredientId}
                  onChange={(event) => {
                    const next = ingredients.find((entry) => entry.id === event.target.value);
                    setForm({
                      ...form,
                      items: form.items.map((line) =>
                        line.key === item.key
                          ? {
                              ...line,
                              ingredientId: event.target.value,
                              unit: next?.baseUnit ?? line.unit,
                            }
                          : line,
                      ),
                    });
                  }}
                >
                  <option value="">請選擇</option>
                  {ingredients.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field slim">
                <span>每個用量</span>
                <input
                  inputMode="decimal"
                  value={item.amount}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      items: form.items.map((line) =>
                        line.key === item.key ? { ...line, amount: event.target.value } : line,
                      ),
                    })
                  }
                />
              </label>
              <label className="field slim">
                <span>單位</span>
                <select
                  value={item.unit}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      items: form.items.map((line) =>
                        line.key === item.key
                          ? { ...line, unit: event.target.value as typeof line.unit }
                          : line,
                      ),
                    })
                  }
                >
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unitLabel(unit)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setForm({ ...form, items: form.items.filter((line) => line.key !== item.key) })
                }
              >
                移除
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => setCreatingFor(item.key)}
              >
                建立新原料
              </button>
            </div>
          );
        })}
        <button type="button" className="button secondary" onClick={addLine}>
          加入原料
        </button>
        {error && <p className="error">{error}</p>}
        <button type="button" className="button" onClick={() => void save()}>
          儲存配方
        </button>
      </div>
      {creatingFor && (
        <Modal title="建立新原料" onClose={() => setCreatingFor(null)}>
          <IngredientForm
            initial={emptyIngredientForm()}
            ingredients={ingredients}
            onCancel={() => setCreatingFor(null)}
            onSubmit={async (ingredient) => {
              await onCreateIngredient(ingredient);
              setForm((current) => selectCreatedIngredient(current, creatingFor, ingredient));
              setCreatingFor(null);
            }}
          />
        </Modal>
      )}
      {confirmClose && (
        <ConfirmDialog
          title="放棄這份配方？"
          body="已輸入的內容尚未儲存。"
          confirmLabel="放棄"
          danger
          onClose={() => setConfirmClose(false)}
          onConfirm={onClose}
        />
      )}
    </Modal>
  );
}
