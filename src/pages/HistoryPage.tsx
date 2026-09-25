import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog, Modal } from "../components/Modal";
import { useToast } from "../useToast";
import { draftFromRecord, normalizeOrderRecord } from "../lib/history";
import { buildOrderText, formatDateTime, shareOrCopy } from "../lib/share";
import { formatBaseAmount, unitLabel } from "../lib/units";
import { useStore } from "../useStore";
import type { OrderRecord } from "../types";

export function HistoryPage() {
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<OrderRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<OrderRecord | null>(null);

  const records = useMemo(() => {
    const keyword = query.trim();
    if (!keyword) return store.history;
    return store.history.filter((record) => {
      const haystack = [
        formatDateTime(record.createdAt),
        ...record.lines.map((line) => line.name),
        ...record.breads.map((bread) => bread.name),
      ].join(" ");
      return haystack.includes(keyword);
    });
  }, [query, store.history]);

  async function share(record: OrderRecord) {
    try {
      const result = await shareOrCopy(buildOrderText(record));
      toast(result === "shared" ? "已開啟分享" : "已複製叫貨清單");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast("無法分享或複製");
    }
  }

  function reuse(record: OrderRecord) {
    const draft = draftFromRecord(record, store.settings, store.breads, store.ingredients);
    store.setDraft(draft);
    setActive(null);
    toast("已帶入新的叫貨單，請再確認數量");
    void navigate("/");
  }

  return (
    <section className="page">
      <h1>歷史紀錄</h1>
      <label className="field">
        <span>搜尋日期或原料</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="例如 馬鈴薯 或 09"
        />
      </label>
      {store.history.length === 0 && (
        <p className="empty">還沒有叫貨紀錄。在今日叫貨完成計算後可以儲存。</p>
      )}
      {store.history.length > 0 && records.length === 0 && (
        <p className="empty">沒有符合的紀錄。</p>
      )}
      <ul className="list">
        {records.map((record) => {
          const shortage = record.lines.filter((line) => line.shortageBase > 0).length;
          return (
            <li key={record.id} className="row-card column order-slip">
              <div>
                <p className="item-title">{formatDateTime(record.createdAt)}</p>
                <p className="meta">
                  {record.breads.filter((item) => item.quantity > 0).length} 款麵包 · {shortage}{" "}
                  項要補貨
                </p>
              </div>
              <div className="button-row">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setActive(record)}
                >
                  查看
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => void share(record)}
                >
                  複製或分享
                </button>
                <button type="button" className="button" onClick={() => reuse(record)}>
                  再次叫貨
                </button>
                <button
                  type="button"
                  className="button danger"
                  onClick={() => setPendingDelete(record)}
                >
                  刪除
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {active && (
        <Modal title={formatDateTime(active.createdAt)} onClose={() => setActive(null)}>
          <div className="stack">
            <p className="meta">
              {active.includeLeadDays ? "有納入到貨天數" : "只算本次製作"} · 安全備用{" "}
              {active.safetyPercent}%
            </p>
            {active.includeLeadDays && (
              <>
                <h2 className="subhead">實際到貨天數</h2>
                <ul className="recipe-lines">
                  {active.lines.map((line) => (
                    <li key={`${line.ingredientId}-days`}>
                      {line.name} {line.leadDays} 天
                      {normalizeOrderRecord(active).leadDaysByIngredient[line.ingredientId]
                        ? "（本次手動設定）"
                        : "（使用預設）"}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <h2 className="subhead">製作數量</h2>
            <ul className="recipe-lines">
              {active.breads.map((bread) => (
                <li key={bread.breadId}>
                  {bread.name} × {bread.quantity}
                </li>
              ))}
            </ul>
            <h2 className="subhead">當時庫存</h2>
            <ul className="recipe-lines">
              {active.stocks.map((stock) => (
                <li key={stock.ingredientId}>
                  {stock.name} {stock.amount} {unitLabel(stock.unit)}
                </li>
              ))}
            </ul>
            <h2 className="subhead">叫貨清單</h2>
            <ul className="recipe-lines">
              {active.lines.map((line) => (
                <li key={line.ingredientId}>
                  {line.name} 短缺 {formatBaseAmount(line.shortageBase, line.baseUnit)}
                  {line.purchase && line.purchase.packs > 0
                    ? `，建議 ${line.purchase.packs} ${line.purchase.unitLabel}`
                    : ""}
                </li>
              ))}
            </ul>
            <div className="button-row">
              <button type="button" className="button" onClick={() => reuse(active)}>
                再次叫貨
              </button>
              <button type="button" className="button secondary" onClick={() => void share(active)}>
                複製或分享
              </button>
            </div>
          </div>
        </Modal>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="刪除紀錄"
          body="確定刪除這筆叫貨紀錄？刪除後無法復原。"
          confirmLabel="刪除"
          danger
          onClose={() => setPendingDelete(null)}
          onConfirm={() => {
            void store.removeHistory(pendingDelete.id).then(() => toast("紀錄已刪除"));
            setPendingDelete(null);
          }}
        />
      )}
    </section>
  );
}
