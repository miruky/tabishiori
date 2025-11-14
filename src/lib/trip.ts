// 旅のしおりの型・日付計算・永続化。しおり1冊分のデータを丸ごと1つのTripで持つ。

export type EntryKind = 'move' | 'meal' | 'sight' | 'stay' | 'note';

export interface ScheduleEntry {
  /** 「9:30」形式。未定なら空文字 */
  time: string;
  kind: EntryKind;
  title: string;
  note: string;
}

export interface DayPlan {
  entries: ScheduleEntry[];
}

export interface PackingItem {
  name: string;
  packed: boolean;
}

export type BudgetKind = 'transport' | 'stay' | 'food' | 'activity' | 'other';

export interface BudgetItem {
  label: string;
  kind: BudgetKind;
  amount: number;
}

export interface Trip {
  title: string;
  destination: string;
  /** 出発日(YYYY-MM-DD)。空なら「1日目」のような相対表示になる */
  startDate: string;
  members: string;
  days: DayPlan[];
  packing: PackingItem[];
  budget: BudgetItem[];
  memo: string;
}

export const ENTRY_KIND_LABELS: Record<EntryKind, string> = {
  move: '移動',
  meal: '食事',
  sight: '観光',
  stay: '宿',
  note: 'メモ',
};

export const BUDGET_KIND_LABELS: Record<BudgetKind, string> = {
  transport: '交通',
  stay: '宿泊',
  food: '食事',
  activity: '体験・観光',
  other: 'その他',
};

export const MAX_DAYS = 30;

export function emptyTrip(): Trip {
  return {
    title: '',
    destination: '',
    startDate: '',
    members: '',
    days: [{ entries: [] }],
    packing: [],
    budget: [],
    memo: '',
  };
}

/**
 * 指定した日を複製し、直後に挿入した新しい配列を返す。
 * 予定はそれぞれコピーするので、複製後の編集は元の日に影響しない。
 * 範囲外や日数上限(MAX_DAYS)に達している場合は元の配列をそのまま返す。
 */
export function duplicateDay(days: DayPlan[], index: number): DayPlan[] {
  const source = days[index];
  if (!source || days.length >= MAX_DAYS) return days;
  const copy: DayPlan = { entries: source.entries.map((entry) => ({ ...entry })) };
  return [...days.slice(0, index + 1), copy, ...days.slice(index + 1)];
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

/** 「1日目」「2日目」 */
export function dayOrdinal(index: number): string {
  return `${index + 1}日目`;
}

/**
 * 出発日からn日目の実日付を「6月13日(土)」形式で返す。
 * 出発日が空や不正ならnull(相対表示だけにする)。
 */
export function dayDate(startDate: string, index: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d) + index);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getMonth() + 1}月${date.getDate()}日(${WEEKDAYS[date.getDay()]})`;
}

function isEntry(value: unknown): value is ScheduleEntry {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.time === 'string' &&
    typeof e.kind === 'string' &&
    e.kind in ENTRY_KIND_LABELS &&
    typeof e.title === 'string' &&
    typeof e.note === 'string'
  );
}

function isDay(value: unknown): value is DayPlan {
  if (typeof value !== 'object' || value === null) return false;
  const d = value as Record<string, unknown>;
  return Array.isArray(d.entries) && d.entries.every(isEntry);
}

function isPackingItem(value: unknown): value is PackingItem {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return typeof p.name === 'string' && p.name !== '' && typeof p.packed === 'boolean';
}

function isBudgetItem(value: unknown): value is BudgetItem {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  return (
    typeof b.label === 'string' &&
    typeof b.kind === 'string' &&
    b.kind in BUDGET_KIND_LABELS &&
    typeof b.amount === 'number' &&
    Number.isFinite(b.amount) &&
    b.amount >= 0
  );
}

export function isTrip(value: unknown): value is Trip {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.title === 'string' &&
    typeof t.destination === 'string' &&
    typeof t.startDate === 'string' &&
    typeof t.members === 'string' &&
    Array.isArray(t.days) &&
    t.days.length >= 1 &&
    t.days.length <= MAX_DAYS &&
    t.days.every(isDay) &&
    Array.isArray(t.packing) &&
    t.packing.every(isPackingItem) &&
    Array.isArray(t.budget) &&
    t.budget.every(isBudgetItem) &&
    typeof t.memo === 'string'
  );
}

export function serializeTrip(trip: Trip): string {
  return JSON.stringify(trip);
}

/** JSON文字列から復元する。全体の形が崩れていればnull */
export function deserializeTrip(json: string): Trip | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  return isTrip(parsed) ? parsed : null;
}

export interface TripStore {
  load(): Trip | null;
  save(trip: Trip): void;
}

const STORAGE_KEY = 'tabishiori.trip.v1';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createStore(storage: StorageLike): TripStore {
  return {
    load() {
      const raw = storage.getItem(STORAGE_KEY);
      return raw === null ? null : deserializeTrip(raw);
    },
    save(trip) {
      storage.setItem(STORAGE_KEY, serializeTrip(trip));
    },
  };
}
