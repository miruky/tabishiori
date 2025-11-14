import { describe, expect, it } from 'vitest';
import { seedTrip } from './seed';
import {
  MAX_DAYS,
  createStore,
  dayDate,
  dayOrdinal,
  deserializeTrip,
  duplicateDay,
  emptyTrip,
  isTrip,
  serializeTrip,
  type DayPlan,
} from './trip';

describe('dayOrdinal / dayDate', () => {
  it('n日目の表示を作る', () => {
    expect(dayOrdinal(0)).toBe('1日目');
    expect(dayOrdinal(2)).toBe('3日目');
  });

  it('出発日からの実日付を曜日つきで出す', () => {
    expect(dayDate('2026-06-13', 0)).toBe('6月13日(土)');
    expect(dayDate('2026-06-13', 1)).toBe('6月14日(日)');
  });

  it('月またぎを正しく繰り上げる', () => {
    expect(dayDate('2026-06-30', 1)).toBe('7月1日(水)');
    expect(dayDate('2026-12-31', 1)).toBe('1月1日(金)');
  });

  it('出発日が空・不正ならnull', () => {
    expect(dayDate('', 0)).toBeNull();
    expect(dayDate('2026/06/13', 0)).toBeNull();
    expect(dayDate('未定', 0)).toBeNull();
  });
});

describe('isTrip / deserializeTrip', () => {
  it('見本データと空のしおりは妥当', () => {
    expect(isTrip(seedTrip(Date.now()))).toBe(true);
    expect(isTrip(emptyTrip())).toBe(true);
  });

  it('serializeTripと往復できる', () => {
    const trip = seedTrip(0);
    expect(deserializeTrip(serializeTrip(trip))).toEqual(trip);
  });

  it('壊れたJSON・形の崩れたデータはnull', () => {
    expect(deserializeTrip('{')).toBeNull();
    expect(deserializeTrip('[]')).toBeNull();
    expect(deserializeTrip('{"title":"x"}')).toBeNull();
  });

  it('日が1日もないしおりは受け付けない', () => {
    const trip = { ...emptyTrip(), days: [] };
    expect(isTrip(trip)).toBe(false);
  });

  it('不正な費目・種別は受け付けない', () => {
    const badKind = { ...emptyTrip(), budget: [{ label: 'x', kind: 'travel', amount: 1 }] };
    expect(isTrip(badKind)).toBe(false);
    const badEntry = {
      ...emptyTrip(),
      days: [{ entries: [{ time: '', kind: 'walk', title: 'x', note: '' }] }],
    };
    expect(isTrip(badEntry)).toBe(false);
  });
});

describe('duplicateDay', () => {
  it('指定した日を直後に深いコピーで挿入する', () => {
    const days = seedTrip(0).days;
    const out = duplicateDay(days, 0);
    expect(out).toHaveLength(days.length + 1);
    expect(out[1]).toEqual(days[0]);
    expect(out[1]).not.toBe(days[0]);
    expect(out[1]?.entries[0]).not.toBe(days[0]?.entries[0]);
    // 元の配列は変更しない
    expect(days).toHaveLength(seedTrip(0).days.length);
  });

  it('範囲外の指定では元の配列を返す', () => {
    const days = seedTrip(0).days;
    expect(duplicateDay(days, 99)).toBe(days);
  });

  it('日数が上限に達していると複製しない', () => {
    const max: DayPlan[] = Array.from({ length: MAX_DAYS }, () => ({ entries: [] }));
    expect(duplicateDay(max, 0)).toBe(max);
  });
});

describe('createStore', () => {
  function memoryStorage(): {
    getItem(k: string): string | null;
    setItem(k: string, v: string): void;
  } {
    const map = new Map<string, string>();
    return {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
    };
  }

  it('保存して読み戻せる', () => {
    const store = createStore(memoryStorage());
    expect(store.load()).toBeNull();
    const trip = seedTrip(0);
    store.save(trip);
    expect(store.load()).toEqual(trip);
  });

  it('壊れた保存データはnull扱い', () => {
    const storage = memoryStorage();
    storage.setItem('tabishiori.trip.v1', 'not json');
    expect(createStore(storage).load()).toBeNull();
  });
});
