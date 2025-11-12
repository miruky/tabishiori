import { describe, expect, it } from 'vitest';
import { formatTime, normalizeTimeText, parseTime, sortByTime } from './time';

describe('parseTime', () => {
  it('コロン区切りを読む', () => {
    expect(parseTime('9:30')).toBe(9 * 60 + 30);
    expect(parseTime('09:30')).toBe(9 * 60 + 30);
    expect(parseTime('0:00')).toBe(0);
    expect(parseTime('23:59')).toBe(23 * 60 + 59);
  });

  it('「9時30分」「9時」を読む', () => {
    expect(parseTime('9時30分')).toBe(9 * 60 + 30);
    expect(parseTime('9時30')).toBe(9 * 60 + 30);
    expect(parseTime('9時')).toBe(9 * 60);
  });

  it('全角数字と全角コロンも読む', () => {
    expect(parseTime('９：３０')).toBe(9 * 60 + 30);
    expect(parseTime('９時３０分')).toBe(9 * 60 + 30);
  });

  it('読めない表記と範囲外はnull', () => {
    expect(parseTime('')).toBeNull();
    expect(parseTime('午前9時')).toBeNull();
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('9:60')).toBeNull();
    expect(parseTime('9:5')).toBeNull();
  });
});

describe('formatTime / normalizeTimeText', () => {
  it('分を2桁に揃え、時は揃えない', () => {
    expect(formatTime(9 * 60 + 5)).toBe('9:05');
    expect(formatTime(14 * 60 + 30)).toBe('14:30');
    expect(formatTime(0)).toBe('0:00');
  });

  it('読める表記は統一形式へ、読めない表記はそのまま', () => {
    expect(normalizeTimeText('09時5分')).toBe('9:05');
    expect(normalizeTimeText(' 14:30 ')).toBe('14:30');
    expect(normalizeTimeText('朝イチ')).toBe('朝イチ');
  });
});

describe('sortByTime', () => {
  it('時刻順に並べ、時刻のないものは入力順のまま末尾', () => {
    const entries = [
      { time: '', title: '夜の散歩' },
      { time: '13:00', title: '昼食' },
      { time: '9:00', title: '出発' },
      { time: '未定', title: 'お土産' },
    ];
    expect(sortByTime(entries).map((e) => e.title)).toEqual(['出発', '昼食', '夜の散歩', 'お土産']);
  });

  it('同時刻は入力順を保つ', () => {
    const entries = [
      { time: '9:00', title: 'A' },
      { time: '9:00', title: 'B' },
    ];
    expect(sortByTime(entries).map((e) => e.title)).toEqual(['A', 'B']);
  });
});
