// 予算の集計と金額表記。金額は円の整数だけを扱う。

import { BUDGET_KIND_LABELS, type BudgetItem, type BudgetKind } from './trip';

/** 「12,300円」形式。3桁区切りはロケールに頼らず自前で入れる */
export function formatYen(amount: number): string {
  return `${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}円`;
}

/**
 * 金額の入力を円の整数にする。「12,300」「12300円」「¥12300」全角数字も受け付け、
 * 解釈できない・負になるものはnull。
 */
export function parseAmount(raw: string): number | null {
  const text = raw
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[,，\s¥￥\\]/g, '')
    .replace(/円$/, '');
  if (!/^\d+$/.test(text)) return null;
  return Number(text);
}

export function budgetTotal(items: BudgetItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

export interface KindSubtotal {
  kind: BudgetKind;
  label: string;
  total: number;
}

/** 費目ごとの小計。項目のない費目は出さず、表示順は費目の定義順 */
export function budgetByKind(items: BudgetItem[]): KindSubtotal[] {
  const kinds = Object.keys(BUDGET_KIND_LABELS) as BudgetKind[];
  return kinds
    .map((kind) => ({
      kind,
      label: BUDGET_KIND_LABELS[kind],
      total: budgetTotal(items.filter((i) => i.kind === kind)),
    }))
    .filter((s) => s.total > 0);
}
