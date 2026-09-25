import { useState } from "react";
import { IngredientForm } from "../components/IngredientForm";
import { ConfirmDialog, Modal } from "../components/Modal";
import { emptyIngredientForm, ingredientFormFrom } from "../lib/forms";
import { baseUnitLabel, unitLabel } from "../lib/units";
import { useStore } from "../useStore";
import { useToast } from "../useToast";
import type { Ingredient } from "../types";

export function IngredientsPage() {
  const store = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState<ReturnType<typeof emptyIngredientForm> | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Ingredient | null>(null);

  return (
    <section className="page">
      <div className="page-head">
        <h1>原料</h1>
        <button type="button" className="button" onClick={() => setEditing(emptyIngredientForm())}>
          新增原料
        </button>
      </div>
      {store.ingredients.length === 0 && <p className="empty">還沒有原料。新增後就能寫進配方。</p>}
      <ul className="list">
        {store.ingredients.map((ingredient) => (
          <li key={ingredient.id} className="row-card">
            <div>
              <p className="item-title">{ingredient.name}</p>
              <p className="meta">
                基礎單位 {baseUnitLabel(ingredient.baseUnit)}
                {ingredient.purchaseSpec
                  ? ` · 每${ingredient.purchaseSpec.unitLabel} ${ingredient.purchaseSpec.quantity} ${unitLabel(ingredient.purchaseSpec.quantityUnit)}`
                  : " · 未設採購規格"}
                {ingredient.defaultLeadDays ? ` · 預設 ${ingredient.defaultLeadDays} 天到貨` : ""}
              </p>
            </div>
            <div className="button-row">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(ingredientFormFrom(ingredient))}
              >
                編輯
              </button>
              <button
                type="button"
                className="button danger"
                onClick={() => setPendingDelete(ingredient)}
              >
                刪除
              </button>
            </div>
          </li>
        ))}
      </ul>
      {editing && (
        <Modal
          title={store.ingredients.some((item) => item.id === editing.id) ? "編輯原料" : "新增原料"}
          onClose={() => setEditing(null)}
        >
          <IngredientForm
            initial={editing}
            ingredients={store.ingredients}
            onCancel={() => setEditing(null)}
            onSubmit={async (ingredient) => {
              await store.upsertIngredient(ingredient);
              setEditing(null);
              toast("原料已儲存");
            }}
          />
        </Modal>
      )}
      {pendingDelete && (
        <ConfirmDialog
          title="刪除原料"
          body={`確定刪除「${pendingDelete.name}」？使用它的配方會移除這一項。`}
          confirmLabel="刪除"
          danger
          onClose={() => setPendingDelete(null)}
          onConfirm={() => {
            void store.removeIngredient(pendingDelete.id).then(() => toast("原料已刪除"));
            setPendingDelete(null);
          }}
        />
      )}
    </section>
  );
}
