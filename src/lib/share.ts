import type { HistoryBread, HistoryStock, OrderLine, OrderRecord } from "../types";
import { formatBaseAmount, unitLabel } from "./units";

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function buildOrderText(input: {
  createdAt: string;
  breads: HistoryBread[];
  stocks: HistoryStock[];
  includeLeadDays: boolean;
  safetyPercent: number;
  lines: OrderLine[];
}): string {
  const planned = input.breads.filter((item) => item.quantity > 0);
  const rows = [
    "光埔店叫貨清單",
    formatDateTime(input.createdAt),
    "",
    "製作計畫",
    ...planned.map((item) => `${item.name} × ${item.quantity}`),
    "",
    input.includeLeadDays
      ? "估算方式：本次需求 × 到貨天數（假設每天產量相同）"
      : "估算方式：只計算本次製作計畫",
    `安全備用：${input.safetyPercent}%`,
    "",
    "原料叫貨",
  ];

  if (input.lines.length === 0) {
    rows.push("沒有需要叫的原料");
  }

  for (const line of input.lines) {
    rows.push(line.name);
    rows.push(`總需求 ${formatBaseAmount(line.finalNeedBase, line.baseUnit)}`);
    rows.push(`現有庫存 ${formatBaseAmount(line.stockBase, line.baseUnit)}`);
    rows.push(`實際短缺 ${formatBaseAmount(line.shortageBase, line.baseUnit)}`);
    if (line.purchase) {
      rows.push(
        line.purchase.packs > 0
          ? `建議叫 ${line.purchase.packs} ${line.purchase.unitLabel}`
          : "庫存足夠，不必叫貨",
      );
    }
    rows.push("");
  }

  const stockNotes = input.stocks.filter((item) => item.amount > 0);
  if (stockNotes.length > 0) {
    rows.push("清點庫存");
    for (const stock of stockNotes) {
      rows.push(`${stock.name} ${stock.amount} ${unitLabel(stock.unit)}`);
    }
  }

  return rows.join("\n").trim();
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export async function shareOrCopy(text: string): Promise<"shared" | "copied"> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "光埔店叫貨清單", text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
    }
  }
  await copyText(text);
  return "copied";
}

export function recordFromLines(
  record: Omit<OrderRecord, "id" | "createdAt"> & { id?: string; createdAt?: string },
): OrderRecord {
  return {
    id: record.id ?? crypto.randomUUID(),
    createdAt: record.createdAt ?? new Date().toISOString(),
    breads: record.breads,
    stocks: record.stocks,
    includeLeadDays: record.includeLeadDays,
    defaultLeadDays: record.defaultLeadDays,
    safetyPercent: record.safetyPercent,
    leadDaysByIngredient: record.leadDaysByIngredient ?? {},
    lines: record.lines,
  };
}
