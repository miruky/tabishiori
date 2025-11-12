import { describe, expect, it } from 'vitest';
import { budgetByKind, budgetTotal, formatYen, parseAmount } from './budget';
import type { BudgetItem } from './trip';

describe('formatYen', () => {
  it('3桁区切りを入れる', () => {
    expect(formatYen(0)).toBe('0円');
    expect(formatYen(980)).toBe('980円');
    expect(formatYen(12300)).toBe('12,300円');
    expect(formatYen(1234567)).toBe('1,234,567円');
  });
});

describe('parseAmount', () => {
  it('区切りや単位の混じった入力を整数にする', () => {
    expect(parseAmount('12300')).toBe(12300);
    expect(parseAmount('12,300')).toBe(12300);
    expect(parseAmount('12300円')).toBe(12300);
    expect(parseAmount('¥12,300')).toBe(12300);
    expect(parseAmount('￥12,300')).toBe(12300);
    expect(parseAmount('１２３００')).toBe(12300);
  });

  it('読めない入力はnull', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('およそ1万')).toBeNull();
    expect(parseAmount('-500')).toBeNull();
    expect(parseAmount('1.5')).toBeNull();
  });
});

const items: BudgetItem[] = [
  { label: '新幹線', kind: 'transport', amount: 27000 },
  { label: 'バス1日券', kind: 'transport', amount: 700 },
  { label: '宿', kind: 'stay', amount: 24000 },
  { label: 'お土産', kind: 'other', amount: 5000 },
];

describe('budgetTotal / budgetByKind', () => {
  it('合計を出す', () => {
    expect(budgetTotal(items)).toBe(56700);
    expect(budgetTotal([])).toBe(0);
  });

  it('費目ごとに小計し、項目のない費目は出さない', () => {
    expect(budgetByKind(items)).toEqual([
      { kind: 'transport', label: '交通', total: 27700 },
      { kind: 'stay', label: '宿泊', total: 24000 },
      { kind: 'other', label: 'その他', total: 5000 },
    ]);
  });
});
