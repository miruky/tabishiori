// しおりをURLのハッシュに載せて共有する。サーバーを持たないので、
// データそのものをbase64url化してURLに埋め込む。先頭にバージョン札を付け、
// 将来形式を変えても古いリンクを区別できるようにする。

import { isTrip, type Trip } from './trip';

const VERSION = 'v1';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function toBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 0b11) << 4) | ((b1 ?? 0) >> 4)];
    if (b1 !== undefined) out += B64[((b1 & 0b1111) << 2) | ((b2 ?? 0) >> 6)];
    if (b2 !== undefined) out += B64[b2 & 0b111111];
  }
  return out;
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null;
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i += 4) {
    const chunk = [...text.slice(i, i + 4)].map((ch) => B64.indexOf(ch));
    const [n0 = 0, n1 = 0, n2, n3] = chunk;
    bytes.push((n0 << 2) | (n1 >> 4));
    if (n2 !== undefined) bytes.push(((n1 & 0b1111) << 4) | (n2 >> 2));
    if (n3 !== undefined && n2 !== undefined) bytes.push(((n2 & 0b11) << 6) | n3);
  }
  return new Uint8Array(bytes);
}

export function encodeTrip(trip: Trip): string {
  const bytes = new TextEncoder().encode(JSON.stringify(trip));
  return `${VERSION}.${toBase64Url(bytes)}`;
}

/** 共有文字列からしおりを復元する。版違い・壊れた文字列はnull */
export function decodeTrip(text: string): Trip | null {
  const dot = text.indexOf('.');
  if (dot === -1 || text.slice(0, dot) !== VERSION) return null;
  const bytes = fromBase64Url(text.slice(dot + 1));
  if (bytes === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
  return isTrip(parsed) ? parsed : null;
}

/** location.hashから共有データ部分を取り出す。共有URLでなければnull */
export function sharePayloadFromHash(hash: string): string | null {
  const m = /^#s=(.+)$/.exec(hash);
  return m?.[1] ?? null;
}

/** 共有URLのハッシュ部分を作る */
export function shareHash(trip: Trip): string {
  return `#s=${encodeTrip(trip)}`;
}
