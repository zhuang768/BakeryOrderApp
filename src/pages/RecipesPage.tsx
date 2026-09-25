import { useState } from "react";
import { BreadForm } from "../components/BreadForm";
import { ConfirmDialog } from "../components/Modal";
import { breadFormFrom, emptyBreadForm } from "../lib/forms";
import { unitLabel } from "../lib/units";
import { useStore } from "../useStore";
import { useToast } from "../useToast";
import type { Bread } from "../types";

export function RecipesPage() {
  const store = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState<ReturnType<typeof emptyBreadForm> | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Bread | null>(null);

  return (
    <section className="page">
      <div className="page-head">
        <h1>配方</h1>
        <button type="button" className="button" onClick={() => setEditing(emptyBreadForm())}>
          新增麵包
        </button>
      </div>
      {store.breads.length === 0 && (
        <p className="empty">還沒有配方。先新增一款麵包，再回到今日叫貨。</p>
      )}
      <ul className="list">
        {store.breads.map((bread) => (
          <li key={bread.id} className="row-card column">
            <div className="split">
              <div>
                <p className="item-title">{bread.name}</p>
                <p className="meta">{bread.category || "未分類"}</p>
              </div>
              <div className="button-row">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setEditing(breadFormFrom(bread))}
                >
                  編輯
                </button>
                <button
                  type="button"
                  className="button danger"
                  onClick={() => setPendingDelete(bread)}
                >
                  刪除
                </button>
              </div>
            </div>
            <ul className="recipe-lines">
              {bread.items.map((item) => {
                const ingredient = store.ingredients.find(
                  (entry) => entry.id === item.ingredientId,
                );
                return (
                  <li key={`${bread.id}-${item.ingredientId}`}>
                    {ingredient?.name ?? "已刪除的原料"} {item.amount} {unitLabel(item.unit)}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
      {editing && (
        <BreadForm
          initial={editing}
          ingredients={store.ingredients}
          title={store.breads.some((bread) => bread.id === editing.id) ? "編輯配方" : "新增配方"}
          onClose={() => setEditing(null)}
          onCreateIngredient={async (ingredient) => {
            await store.upsertIngredient(ingredient);
          }}
          onSubmit={async (bread) => {
            await store.upsertBread(bread);
            setEditing(null);
            toast("配方已儲存");
          }}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          title="刪除配方"
          body={`確定刪除「${pendingDelete.name}」？已儲存的歷史紀錄仍會保留當時的名稱。`}
          confirmLabel="刪除"
          danger
          onClose={() => setPendingDelete(null)}
          onConfirm={() => {
            void store.removeBread(pendingDelete.id).then(() => toast("配方已刪除"));
            setPendingDelete(null);
          }}
        />
      )}
    </section>
  );
}
