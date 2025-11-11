// 行程の時刻表記。「9:30」「09:30」「9時30分」「9時」を受け付けて
// 0時からの分数に正規化し、表示は「9:30」に統一する。

/** 全角数字と全角コロンを半角に直し、空白を取り除く */
function normalize(text: string): string {
  return text
    .replace(/[０-９：]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, '');
}

/** 時刻表記を0時からの分数にする。読めなければnull */
export function parseTime(raw: string): number | null {
  const text = normalize(raw);
  const m = /^(\d{1,2}):(\d{2})$/.exec(text) ?? /^(\d{1,2})時(?:(\d{1,2})分?)?$/.exec(text);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2] ?? 0);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** 分数を「9:05」形式にする */
export function formatTime(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

/** 入力された時刻表記を表示形式に整える。読めない表記はそのまま返す */
export function normalizeTimeText(raw: string): string {
  const parsed = parseTime(raw);
  return parsed === null ? raw.trim() : formatTime(parsed);
}

interface Timed {
  time: string;
}

/**
 * 時刻のあるものを時刻順に並べる。時刻が空・読めないものは
 * 入力順を保ったまま末尾に置く。
 */
export function sortByTime<T extends Timed>(entries: T[]): T[] {
  const keyed = entries.map((entry, index) => ({ entry, index, at: parseTime(entry.time) }));
  keyed.sort((a, b) => {
    if (a.at === null && b.at === null) return a.index - b.index;
    if (a.at === null) return 1;
    if (b.at === null) return -1;
    return a.at - b.at || a.index - b.index;
  });
  return keyed.map((k) => k.entry);
}
