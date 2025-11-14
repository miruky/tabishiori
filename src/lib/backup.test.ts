import { describe, expect, it } from 'vitest';
import { backupFilename, backupJson } from './backup';
import { deserializeTrip, emptyTrip } from './trip';
import { seedTrip } from './seed';

describe('backupFilename', () => {
  it('タイトルと日付からファイル名を作る', () => {
    const trip = { ...emptyTrip(), title: '京都 二泊三日' };
    expect(backupFilename(trip, new Date(2026, 6, 20))).toBe('京都_二泊三日-20260720.json');
  });

  it('記号や前後の空白を畳んで安全な名前にする', () => {
    const trip = { ...emptyTrip(), title: '  夏/旅: 2026?  ' };
    expect(backupFilename(trip, new Date(2026, 0, 5))).toBe('夏_旅_2026-20260105.json');
  });

  it('タイトルが空なら既定名にする', () => {
    expect(backupFilename(emptyTrip(), new Date(2026, 11, 31))).toBe('tabishiori-20261231.json');
  });
});

describe('backupJson', () => {
  it('整形JSONを書き出し、そのまま読み戻せる', () => {
    const trip = seedTrip(0);
    const json = backupJson(trip);
    expect(json).toContain('\n  ');
    expect(deserializeTrip(json)).toEqual(trip);
  });
});
