// しおりをJSONファイルへ書き出す・読み込むためのユーティリティ。
// 中身の妥当性検査と保存形式は trip.ts に委ね、ここはファイル名と整形だけを担う。

import { serializeTrip, type Trip } from './trip';

const UNSAFE_FILENAME = /[\\/:*?"<>|\s]+/g;

/**
 * ダウンロード時のファイル名を旅のタイトルと日付から組み立てる。
 * 記号や空白は _ にまとめ、タイトルが空なら既定名にフォールバックする。
 */
export function backupFilename(trip: Trip, today: Date = new Date()): string {
  const base = trip.title
    .trim()
    .replace(UNSAFE_FILENAME, '_')
    .replace(/^_+|_+$/g, '');
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${base || 'tabishiori'}-${y}${m}${d}.json`;
}

/**
 * バックアップ用の整形済みJSON。手で開いて読めるよう2スペースで字下げする。
 * serializeTrip(圧縮形)と同じ内容で、deserializeTripでそのまま読み戻せる。
 */
export function backupJson(trip: Trip): string {
  return JSON.stringify(JSON.parse(serializeTrip(trip)), null, 2);
}
