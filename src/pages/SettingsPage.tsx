import { useState } from "react";
import { ConfirmDialog } from "../components/Modal";
import { useToast } from "../useToast";
import { parseBreadCount, parseNonNegative } from "../lib/calculate";
import { exportSnapshot } from "../lib/storage";
import { useStore } from "../useStore";
import type { ExportData } from "../types";

function isExportData(value: unknown): value is ExportData {
  if (!value || typeof value !== "object") return false;
  const data = value as ExportData;
  return (
    data.version === 1 &&
    Array.isArray(data.ingredients) &&
    Array.isArray(data.breads) &&
    Array.isArray(data.history)
  );
}

export function SettingsPage() {
  const store = useStore();
  const toast = useToast();
  const [includeLeadDays, setIncludeLeadDays] = useState(store.settings.includeLeadDays);
  const [leadDays, setLeadDays] = useState(String(store.settings.defaultLeadDays));
  const [safety, setSafety] = useState(String(store.settings.safetyPercent));
  const [error, setError] = useState("");
  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2 | 3>(0);

  async function save() {
    const days = parseBreadCount(leadDays);
    const percent = parseNonNegative(safety);
    if (!days || days < 1) {
      setError("預設到貨天數請輸入 1 以上的整數。");
      return;
    }
    if (percent === null) {
      setError("安全備用百分比請輸入 0 以上的數字。");
      return;
    }
    await store.updateSettings({ includeLeadDays, defaultLeadDays: days, safetyPercent: percent });
    setError("");
    toast("設定已儲存");
  }

  function exportJson() {
    const blob = new Blob(
      [
        JSON.stringify(
          exportSnapshot({
            ingredients: store.ingredients,
            breads: store.breads,
            settings: store.settings,
            history: store.history,
            draft: store.draft,
          }),
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bakery-order-data.json";
    link.click();
    URL.revokeObjectURL(url);
    toast("已匯出 JSON");
  }

  async function importJson(file: File) {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isExportData(parsed) || !parsed.settings || !parsed.draft) {
        toast("檔案格式不正確");
        return;
      }
      await store.importData(parsed);
      setIncludeLeadDays(parsed.settings.includeLeadDays);
      setLeadDays(String(parsed.settings.defaultLeadDays));
      setSafety(String(parsed.settings.safetyPercent));
      toast("已匯入資料");
    } catch {
      toast("無法讀取這個 JSON 檔");
    }
  }

  return (
    <section className="page">
      <h1>設定</h1>
      <div className="about">
        <p>此 Demo 的配方與採購資料需由師傅確認後才能正式使用。</p>
      </div>
      <div className="stack">
        <label className="switch">
          <input
            type="checkbox"
            checked={includeLeadDays}
            onChange={(event) => setIncludeLeadDays(event.target.checked)}
          />
          <span>新的叫貨單預設納入到貨天數</span>
        </label>
        <label className="field">
          <span>預設到貨天數</span>
          <input
            inputMode="numeric"
            value={leadDays}
            onChange={(event) => setLeadDays(event.target.value)}
          />
        </label>
        <label className="field">
          <span>預設安全備用百分比</span>
          <input
            inputMode="decimal"
            value={safety}
            onChange={(event) => setSafety(event.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="button" className="button" onClick={() => void save()}>
          儲存設定
        </button>
        <button type="button" className="button secondary" onClick={exportJson}>
          匯出全部資料
        </button>
        <label className="button secondary file-button">
          從 JSON 匯入
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importJson(file);
              event.target.value = "";
            }}
          />
        </label>
        <button type="button" className="button danger" onClick={() => setConfirmStep(1)}>
          清除全部資料
        </button>
        <p className="note">
          每支手機的資料各自保存，不會自動同步。換手機、換瀏覽器或清除網站資料前，請先匯出 JSON。App
          更新前也建議先備份。這是店內流程 Demo，正式使用前要由師傅確認配方與採購規格。
        </p>
        {store.demoLeftovers.ingredientIds.length + store.demoLeftovers.breadIds.length > 0 && (
          <button type="button" className="button secondary" onClick={() => setConfirmStep(3)}>
            移除示範資料
          </button>
        )}
      </div>

      {confirmStep === 1 && (
        <ConfirmDialog
          title="清除全部資料"
          body="這會刪除配方、原料、叫貨草稿和歷史紀錄。請再確認一次。"
          confirmLabel="我了解，繼續"
          danger
          onClose={() => setConfirmStep(0)}
          onConfirm={() => setConfirmStep(2)}
        />
      )}
      {confirmStep === 2 && (
        <ConfirmDialog
          title="最後確認"
          body="確定清除這台裝置上的全部叫貨資料？此動作無法復原。"
          confirmLabel="清除全部"
          danger
          onClose={() => setConfirmStep(0)}
          onConfirm={() => {
            setConfirmStep(0);
            void store.resetAll().then(() => {
              setIncludeLeadDays(false);
              setLeadDays("1");
              setSafety("0");
              toast("已清除全部資料");
            });
          }}
        />
      )}
      {confirmStep === 3 && (
        <ConfirmDialog
          title="移除示範資料"
          body="只會移除尚未改過的原始示範麵包與原料。你自己新增或修改過的項目，以及歷史紀錄都會留下。"
          confirmLabel="移除示範資料"
          danger
          onClose={() => setConfirmStep(0)}
          onConfirm={() => {
            setConfirmStep(0);
            void store.removeDemoLeftovers().then(() => toast("已移除未修改的示範資料"));
          }}
        />
      )}
    </section>
  );
}
