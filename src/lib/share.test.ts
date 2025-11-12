import { describe, expect, it } from 'vitest';
import { seedTrip } from './seed';
import { decodeTrip, encodeTrip, shareHash, sharePayloadFromHash } from './share';
import { emptyTrip } from './trip';

describe('encodeTrip / decodeTrip', () => {
  it('日本語を含むしおりが往復する', () => {
    const trip = seedTrip(0);
    expect(decodeTrip(encodeTrip(trip))).toEqual(trip);
  });

  it('空のしおりも往復する', () => {
    const trip = emptyTrip();
    expect(decodeTrip(encodeTrip(trip))).toEqual(trip);
  });

  it('URLに安全な文字だけを使う', () => {
    const encoded = encodeTrip(seedTrip(0));
    expect(encoded).toMatch(/^v1\.[A-Za-z0-9_-]+$/);
  });

  it('版違い・壊れた文字列はnull', () => {
    expect(decodeTrip('v2.abcd')).toBeNull();
    expect(decodeTrip('v1.@@@@')).toBeNull();
    expect(decodeTrip('v1.YWJj')).toBeNull();
    expect(decodeTrip('まったく違う文字列')).toBeNull();
  });

  it('途中で切れた共有文字列はnull', () => {
    const encoded = encodeTrip(seedTrip(0));
    expect(decodeTrip(encoded.slice(0, encoded.length - 5))).toBeNull();
  });
});

describe('sharePayloadFromHash / shareHash', () => {
  it('共有URLのハッシュから取り出して復元できる', () => {
    const trip = seedTrip(0);
    const payload = sharePayloadFromHash(shareHash(trip));
    expect(payload).not.toBeNull();
    expect(decodeTrip(payload ?? '')).toEqual(trip);
  });

  it('共有URLでないハッシュはnull', () => {
    expect(sharePayloadFromHash('')).toBeNull();
    expect(sharePayloadFromHash('#/shiori')).toBeNull();
    expect(sharePayloadFromHash('#s=')).toBeNull();
  });
});
