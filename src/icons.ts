// UIで使う線画アイコン。24pxグリッド・stroke=currentColorで統一し、
// 隣に必ずテキストラベルを置く前提ですべて装飾(aria-hidden)とする。

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const icons = {
  logo: svg(
    '<path d="M3.5 6.5 9 4.5l6 2 5.5-2v13L15 19.5l-6-2-5.5 2z"/>' +
      '<path d="M9 4.5v13"/><path d="M15 6.5v13"/>' +
      '<path d="M5.5 12.5c2-2.5 5-1 6.5.5s4 2.5 6-.5" stroke-dasharray="2.4 2.2"/>',
  ),
  plus: svg('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  trash: svg(
    '<path d="M4 7h16"/>' +
      '<path d="M9.5 7V5A1.5 1.5 0 0 1 11 3.5h2A1.5 1.5 0 0 1 14.5 5v2"/>' +
      '<path d="m6.5 7 .7 11.2a2 2 0 0 0 2 1.8h5.6a2 2 0 0 0 2-1.8L17.5 7"/>' +
      '<path d="M10 11v5.5"/><path d="M14 11v5.5"/>',
  ),
  copy: svg(
    '<rect x="9" y="9" width="11" height="11" rx="2"/>' + '<path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  ),
  check: svg('<path d="m5 13 4.5 4.5L19 7"/>'),
  print: svg(
    '<path d="M7 8V3.5h10V8"/>' +
      '<path d="M7 16H4.5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H17"/>' +
      '<rect x="7" y="13.5" width="10" height="7" rx="1"/>',
  ),
  import: svg('<path d="M12 4v10"/><path d="m8 10 4 4 4-4"/><path d="M4.5 18.5h15"/>'),
  pencil: svg('<path d="m16.9 3.8 3.3 3.3L8.6 18.7 4 20l1.3-4.6z"/><path d="m14.5 6.2 3.3 3.3"/>'),
  book: svg(
    '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21z"/>' +
      '<path d="M4 18.5V21"/><path d="M20 18.5H6.5"/>',
  ),
} as const;
