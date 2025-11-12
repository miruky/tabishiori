// 画面の描画と遷移。編集(#/)・しおり表示(#/shiori)・共有表示(#s=...)の
// 3モードを持ち、状態が変わるたびに現在のモードを丸ごと描き直す。
// テキスト入力はchangeイベント(確定時)で反映するので、再描画で入力が途切れない。

import {
  BUDGET_KIND_LABELS,
  ENTRY_KIND_LABELS,
  MAX_DAYS,
  dayDate,
  dayOrdinal,
  emptyTrip,
  type BudgetKind,
  type EntryKind,
  type Trip,
  type TripStore,
} from './lib/trip';
import { normalizeTimeText, sortByTime } from './lib/time';
import { budgetByKind, budgetTotal, formatYen, parseAmount } from './lib/budget';
import { decodeTrip, shareHash, sharePayloadFromHash } from './lib/share';
import { icons } from './icons';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPES[ch] ?? ch);
}

type Mode = { view: 'edit' } | { view: 'preview' } | { view: 'shared'; trip: Trip | null };

function parseMode(hash: string): Mode {
  const payload = sharePayloadFromHash(hash);
  if (payload !== null) return { view: 'shared', trip: decodeTrip(payload) };
  if (hash === '#/shiori') return { view: 'preview' };
  return { view: 'edit' };
}

function entryKindOptions(selected: EntryKind): string {
  return (Object.keys(ENTRY_KIND_LABELS) as EntryKind[])
    .map(
      (kind) =>
        `<option value="${kind}" ${kind === selected ? 'selected' : ''}>${ENTRY_KIND_LABELS[kind]}</option>`,
    )
    .join('');
}

function budgetKindOptions(selected: BudgetKind): string {
  return (Object.keys(BUDGET_KIND_LABELS) as BudgetKind[])
    .map(
      (kind) =>
        `<option value="${kind}" ${kind === selected ? 'selected' : ''}>${BUDGET_KIND_LABELS[kind]}</option>`,
    )
    .join('');
}

export interface AppDeps {
  root: HTMLElement;
  store: TripStore;
  initialTrip: Trip;
}

export function createApp({ root, store, initialTrip }: AppDeps): void {
  let trip = initialTrip;
  let mode = parseMode(location.hash);
  let copied = false;
  /** 二度押し確認の対象。'reset' または 'day-<index>' */
  let confirming: string | null = null;
  let confirmTimer: ReturnType<typeof setTimeout> | null = null;

  function commit(): void {
    store.save(trip);
    render();
  }

  function armConfirm(key: string): void {
    confirming = key;
    if (confirmTimer) clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => {
      confirming = null;
      render();
    }, 4000);
    render();
  }

  window.addEventListener('hashchange', () => {
    mode = parseMode(location.hash);
    copied = false;
    confirming = null;
    render();
  });

  // ---- 部品 ----

  function header(): string {
    const onPreview = mode.view !== 'edit';
    return `
      <header class="site-header no-print">
        <div class="site-header-inner">
          <a class="brand" href="#/">${icons.logo}<span>tabishiori</span></a>
          <nav aria-label="主要">
            <a href="#/" ${onPreview ? '' : 'aria-current="page"'}>${icons.pencil}<span>編集</span></a>
            <a href="#/shiori" ${mode.view === 'preview' ? 'aria-current="page"' : ''}>${icons.book}<span>しおり</span></a>
          </nav>
        </div>
      </header>`;
  }

  function tripDateRange(t: Trip): string | null {
    const start = dayDate(t.startDate, 0);
    if (start === null) return null;
    if (t.days.length === 1) return start;
    return `${start} から ${dayDate(t.startDate, t.days.length - 1)}`;
  }

  // ---- 編集モード ----

  function metaPanel(): string {
    return `
      <section class="panel">
        <h2>基本情報</h2>
        <div class="field-row">
          <label class="field grow"><span>旅のタイトル</span>
            <input id="trip-title" data-meta="title" value="${esc(trip.title)}" placeholder="京都 二泊三日" /></label>
          <label class="field grow"><span>行き先</span>
            <input id="trip-dest" data-meta="destination" value="${esc(trip.destination)}" placeholder="京都" /></label>
        </div>
        <div class="field-row">
          <label class="field"><span>出発日</span>
            <input id="trip-date" data-meta="startDate" type="date" value="${esc(trip.startDate)}" /></label>
          <label class="field grow"><span>メンバー</span>
            <input id="trip-members" data-meta="members" value="${esc(trip.members)}" placeholder="2名" /></label>
        </div>
      </section>`;
  }

  function dayPanel(dayIndex: number): string {
    const day = trip.days[dayIndex];
    if (!day) return '';
    const date = dayDate(trip.startDate, dayIndex);
    const confirmKey = `day-${dayIndex}`;
    const rows = day.entries
      .map(
        (entry, i) => `
          <li class="entry-row" style="--i:${i}">
            <input class="entry-time" id="e-${dayIndex}-${i}-time" data-entry="${dayIndex}:${i}:time"
              value="${esc(entry.time)}" placeholder="9:00" aria-label="時刻" />
            <select id="e-${dayIndex}-${i}-kind" data-entry="${dayIndex}:${i}:kind" aria-label="種別">
              ${entryKindOptions(entry.kind)}
            </select>
            <input class="entry-title" id="e-${dayIndex}-${i}-title" data-entry="${dayIndex}:${i}:title"
              value="${esc(entry.title)}" aria-label="予定" />
            <input class="entry-note" id="e-${dayIndex}-${i}-note" data-entry="${dayIndex}:${i}:note"
              value="${esc(entry.note)}" placeholder="補足" aria-label="補足" />
            <button type="button" class="icon-button" id="e-${dayIndex}-${i}-del"
              data-del-entry="${dayIndex}:${i}" aria-label="この予定を削除">${icons.trash}</button>
          </li>`,
      )
      .join('');
    return `
      <section class="panel day-panel">
        <div class="panel-head">
          <h3>${dayOrdinal(dayIndex)}${date ? `<span class="day-date">${date}</span>` : ''}</h3>
          ${
            trip.days.length > 1
              ? `<button type="button" class="button small danger ${confirming === confirmKey ? 'confirming' : ''}"
                  id="del-day-${dayIndex}" data-del-day="${dayIndex}">
                  ${icons.trash}<span>${confirming === confirmKey ? 'もう一度押すと削除' : '日を削除'}</span></button>`
              : ''
          }
        </div>
        ${day.entries.length > 0 ? `<ul class="entries">${rows}</ul>` : '<p class="hint">まだ予定がありません。下の行から追加してください。</p>'}
        <form class="entry-add" data-add-entry="${dayIndex}">
          <input name="time" id="add-${dayIndex}-time" class="entry-time" placeholder="9:00" aria-label="時刻" />
          <select name="kind" id="add-${dayIndex}-kind" aria-label="種別">${entryKindOptions('sight')}</select>
          <input name="title" id="add-${dayIndex}-title" class="entry-title" placeholder="予定(例: 清水寺)" required aria-label="予定" />
          <input name="note" id="add-${dayIndex}-note" class="entry-note" placeholder="補足" aria-label="補足" />
          <button type="submit" class="icon-button accent" id="add-${dayIndex}-submit" aria-label="予定を追加">${icons.plus}</button>
        </form>
      </section>`;
  }

  function packingPanel(): string {
    const done = trip.packing.filter((p) => p.packed).length;
    const rows = trip.packing
      .map(
        (item, i) => `
          <li style="--i:${i}" class="${item.packed ? 'packed' : ''}">
            <label>
              <input type="checkbox" id="pack-${i}" data-pack-toggle="${i}" ${item.packed ? 'checked' : ''} />
              <span>${esc(item.name)}</span>
            </label>
            <button type="button" class="icon-button" id="pack-${i}-del" data-pack-del="${i}"
              aria-label="${esc(item.name)}を削除">${icons.trash}</button>
          </li>`,
      )
      .join('');
    return `
      <section class="panel">
        <div class="panel-head">
          <h2>持ち物</h2>
          ${trip.packing.length > 0 ? `<p class="progress">${done} / ${trip.packing.length} 準備済み</p>` : ''}
        </div>
        ${trip.packing.length > 0 ? `<ul class="packing">${rows}</ul>` : '<p class="hint">持ち物を追加してチェックリストを作りましょう。</p>'}
        <form class="inline-add" data-add-packing>
          <input name="name" id="add-pack-name" placeholder="持ち物(例: モバイルバッテリー)" required aria-label="持ち物" />
          <button type="submit" class="icon-button accent" id="add-pack-submit" aria-label="持ち物を追加">${icons.plus}</button>
        </form>
      </section>`;
  }

  function budgetPanel(): string {
    const rows = trip.budget
      .map(
        (item, i) => `
          <li class="budget-row" style="--i:${i}">
            <input class="budget-label" id="b-${i}-label" data-budget="${i}:label"
              value="${esc(item.label)}" aria-label="項目" />
            <select id="b-${i}-kind" data-budget="${i}:kind" aria-label="費目">${budgetKindOptions(item.kind)}</select>
            <input class="budget-amount" id="b-${i}-amount" data-budget="${i}:amount" inputmode="numeric"
              value="${item.amount}" aria-label="金額(円)" />
            <button type="button" class="icon-button" id="b-${i}-del" data-budget-del="${i}"
              aria-label="${esc(item.label)}を削除">${icons.trash}</button>
          </li>`,
      )
      .join('');
    const subtotals = budgetByKind(trip.budget)
      .map((s) => `<span class="subtotal"><strong>${s.label}</strong> ${formatYen(s.total)}</span>`)
      .join('');
    return `
      <section class="panel">
        <div class="panel-head">
          <h2>予算</h2>
          ${trip.budget.length > 0 ? `<p class="progress">合計 <strong>${formatYen(budgetTotal(trip.budget))}</strong></p>` : ''}
        </div>
        ${trip.budget.length > 0 ? `<ul class="budget">${rows}</ul><div class="subtotals">${subtotals}</div>` : '<p class="hint">費目ごとに金額を入れると合計が出ます。</p>'}
        <form class="inline-add budget-add" data-add-budget>
          <input name="label" id="add-budget-label" placeholder="項目(例: 新幹線往復)" required aria-label="項目" />
          <select name="kind" id="add-budget-kind" aria-label="費目">${budgetKindOptions('transport')}</select>
          <input name="amount" id="add-budget-amount" inputmode="numeric" placeholder="金額" required aria-label="金額(円)" />
          <button type="submit" class="icon-button accent" id="add-budget-submit" aria-label="予算を追加">${icons.plus}</button>
        </form>
      </section>`;
  }

  function editView(): string {
    return `
      <section class="view">
        ${metaPanel()}
        <div class="section-head">
          <h2>行程</h2>
          <button type="button" class="button small" id="add-day" ${trip.days.length >= MAX_DAYS ? 'disabled' : ''}>
            ${icons.plus}<span>日を追加</span></button>
        </div>
        ${trip.days.map((_, i) => dayPanel(i)).join('')}
        ${packingPanel()}
        ${budgetPanel()}
        <section class="panel">
          <h2>メモ</h2>
          <label class="field"><span class="visually-hidden">メモ</span>
            <textarea id="trip-memo" rows="3" placeholder="雨の場合の代替案、集合場所など">${esc(trip.memo)}</textarea></label>
        </section>
        <div class="edit-footer">
          <a class="button primary" href="#/shiori">${icons.book}<span>しおりを見る</span></a>
          <button type="button" class="button danger ${confirming === 'reset' ? 'confirming' : ''}" id="reset">
            ${icons.trash}<span>${confirming === 'reset' ? 'もう一度押すと全部消えます' : '最初から作り直す'}</span></button>
        </div>
      </section>`;
  }

  function bindEditView(): void {
    for (const input of root.querySelectorAll<HTMLInputElement>('[data-meta]')) {
      input.addEventListener('change', () => {
        const key = input.dataset.meta as 'title' | 'destination' | 'startDate' | 'members';
        trip[key] = input.value.trim();
        commit();
      });
    }
    root.querySelector('#trip-memo')?.addEventListener('change', (e) => {
      trip.memo = (e.target as HTMLTextAreaElement).value.trim();
      commit();
    });

    root.querySelector('#add-day')?.addEventListener('click', () => {
      if (trip.days.length >= MAX_DAYS) return;
      trip.days.push({ entries: [] });
      commit();
    });

    for (const el of root.querySelectorAll<HTMLElement>('[data-del-day]')) {
      el.addEventListener('click', () => {
        const index = Number(el.dataset.delDay);
        const key = `day-${index}`;
        if (confirming !== key) {
          armConfirm(key);
          return;
        }
        confirming = null;
        trip.days.splice(index, 1);
        commit();
      });
    }

    for (const el of root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-entry]')) {
      el.addEventListener('change', () => {
        const [dayRaw, idxRaw, field] = (el.dataset.entry ?? '').split(':');
        const entry = trip.days[Number(dayRaw)]?.entries[Number(idxRaw)];
        if (!entry) return;
        if (field === 'time') {
          entry.time = normalizeTimeText(el.value);
          const day = trip.days[Number(dayRaw)];
          if (day) day.entries = sortByTime(day.entries);
        } else if (field === 'kind') {
          entry.kind = el.value as EntryKind;
        } else if (field === 'title') {
          if (el.value.trim() !== '') entry.title = el.value.trim();
        } else if (field === 'note') {
          entry.note = el.value.trim();
        }
        commit();
      });
    }

    for (const el of root.querySelectorAll<HTMLElement>('[data-del-entry]')) {
      el.addEventListener('click', () => {
        const [dayRaw, idxRaw] = (el.dataset.delEntry ?? '').split(':');
        trip.days[Number(dayRaw)]?.entries.splice(Number(idxRaw), 1);
        commit();
      });
    }

    for (const form of root.querySelectorAll<HTMLFormElement>('[data-add-entry]')) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const day = trip.days[Number(form.dataset.addEntry)];
        if (!day) return;
        const data = new FormData(form);
        const read = (key: string): string => String(data.get(key) ?? '').trim();
        const title = read('title');
        if (title === '') return;
        day.entries.push({
          time: normalizeTimeText(read('time')),
          kind: (read('kind') || 'sight') as EntryKind,
          title,
          note: read('note'),
        });
        day.entries = sortByTime(day.entries);
        commit();
        root.querySelector<HTMLInputElement>(`#add-${form.dataset.addEntry}-time`)?.focus();
      });
    }

    for (const el of root.querySelectorAll<HTMLInputElement>('[data-pack-toggle]')) {
      el.addEventListener('change', () => {
        const item = trip.packing[Number(el.dataset.packToggle)];
        if (!item) return;
        item.packed = el.checked;
        commit();
      });
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-pack-del]')) {
      el.addEventListener('click', () => {
        trip.packing.splice(Number(el.dataset.packDel), 1);
        commit();
      });
    }
    root.querySelector<HTMLFormElement>('[data-add-packing]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.currentTarget as HTMLFormElement;
      const name = String(new FormData(form).get('name') ?? '').trim();
      if (name === '') return;
      trip.packing.push({ name, packed: false });
      commit();
      root.querySelector<HTMLInputElement>('#add-pack-name')?.focus();
    });

    for (const el of root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-budget]')) {
      el.addEventListener('change', () => {
        const [idxRaw, field] = (el.dataset.budget ?? '').split(':');
        const item = trip.budget[Number(idxRaw)];
        if (!item) return;
        if (field === 'label') {
          if (el.value.trim() !== '') item.label = el.value.trim();
        } else if (field === 'kind') {
          item.kind = el.value as BudgetKind;
        } else if (field === 'amount') {
          const amount = parseAmount(el.value);
          if (amount !== null) item.amount = amount;
        }
        commit();
      });
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-budget-del]')) {
      el.addEventListener('click', () => {
        trip.budget.splice(Number(el.dataset.budgetDel), 1);
        commit();
      });
    }
    root.querySelector<HTMLFormElement>('[data-add-budget]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.currentTarget as HTMLFormElement;
      const data = new FormData(form);
      const label = String(data.get('label') ?? '').trim();
      const amount = parseAmount(String(data.get('amount') ?? ''));
      if (label === '' || amount === null) return;
      trip.budget.push({ label, kind: String(data.get('kind') ?? 'other') as BudgetKind, amount });
      commit();
      root.querySelector<HTMLInputElement>('#add-budget-label')?.focus();
    });

    root.querySelector('#reset')?.addEventListener('click', () => {
      if (confirming !== 'reset') {
        armConfirm('reset');
        return;
      }
      confirming = null;
      trip = emptyTrip();
      commit();
    });
  }

  // ---- しおり(表示・印刷・共有) ----

  function sheet(t: Trip): string {
    const range = tripDateRange(t);
    const headMeta = [t.destination, range, t.members].filter((v) => v).join(' ・ ');
    const days = t.days
      .map((day, di) => {
        const date = dayDate(t.startDate, di);
        const entries = sortByTime(day.entries)
          .map(
            (entry, i) => `
              <li style="--i:${i}">
                <span class="sheet-time">${esc(entry.time)}</span>
                <span class="kind kind-${entry.kind}">${ENTRY_KIND_LABELS[entry.kind]}</span>
                <span class="sheet-title">${esc(entry.title)}</span>
                ${entry.note ? `<span class="sheet-note">${esc(entry.note)}</span>` : ''}
              </li>`,
          )
          .join('');
        return `
          <section class="sheet-day">
            <h3>${dayOrdinal(di)}${date ? `<span class="day-date">${date}</span>` : ''}</h3>
            ${day.entries.length > 0 ? `<ul class="sheet-entries">${entries}</ul>` : '<p class="hint">予定なし</p>'}
          </section>`;
      })
      .join('');
    const packing =
      t.packing.length === 0
        ? ''
        : `
          <section class="sheet-block">
            <h3>持ち物</h3>
            <ul class="sheet-packing">
              ${t.packing
                .map(
                  (item) => `
                    <li class="${item.packed ? 'packed' : ''}">
                      <span class="box" aria-hidden="true">${item.packed ? icons.check : ''}</span>
                      <span>${esc(item.name)}</span>
                    </li>`,
                )
                .join('')}
            </ul>
          </section>`;
    const budget =
      t.budget.length === 0
        ? ''
        : `
          <section class="sheet-block">
            <h3>予算</h3>
            <table class="sheet-budget">
              <tbody>
                ${t.budget
                  .map(
                    (item) => `
                      <tr>
                        <th scope="row">${esc(item.label)}</th>
                        <td class="kind-cell">${BUDGET_KIND_LABELS[item.kind]}</td>
                        <td class="amount">${formatYen(item.amount)}</td>
                      </tr>`,
                  )
                  .join('')}
                <tr class="total">
                  <th scope="row">合計</th>
                  <td></td>
                  <td class="amount">${formatYen(budgetTotal(t.budget))}</td>
                </tr>
              </tbody>
            </table>
          </section>`;
    return `
      <article class="sheet">
        <header class="sheet-head">
          <h1>${esc(t.title) || '無題の旅'}</h1>
          ${headMeta ? `<p class="sheet-meta">${esc(headMeta)}</p>` : ''}
        </header>
        ${days}
        ${packing}
        ${budget}
        ${t.memo ? `<section class="sheet-block"><h3>メモ</h3><p class="sheet-memo">${esc(t.memo)}</p></section>` : ''}
      </article>`;
  }

  function previewView(): string {
    return `
      <section class="view">
        <div class="toolbar no-print">
          <a class="button" href="#/">${icons.pencil}<span>編集に戻る</span></a>
          <button type="button" class="button" id="copy-share">
            ${copied ? icons.check : icons.copy}<span>${copied ? 'コピーしました' : '共有リンクをコピー'}</span></button>
          <button type="button" class="button primary" id="print">${icons.print}<span>印刷する</span></button>
        </div>
        ${sheet(trip)}
      </section>`;
  }

  function bindPreviewView(): void {
    root.querySelector('#print')?.addEventListener('click', () => window.print());
    root.querySelector('#copy-share')?.addEventListener('click', () => {
      const url = `${location.origin}${location.pathname}${shareHash(trip)}`;
      void navigator.clipboard.writeText(url).then(() => {
        copied = true;
        render();
        setTimeout(() => {
          copied = false;
          render();
        }, 2000);
      });
    });
  }

  function sharedView(shared: Trip | null): string {
    if (!shared) {
      return `
        <section class="view">
          <section class="panel">
            <h2>共有リンクを読めませんでした</h2>
            <p class="hint">リンクが途中で切れているか、形式が新しすぎる可能性があります。</p>
            <a class="button" href="#/">${icons.pencil}<span>自分のしおりを開く</span></a>
          </section>
        </section>`;
    }
    return `
      <section class="view">
        <div class="toolbar no-print">
          <p class="share-banner">共有されたしおりを表示しています。</p>
          <button type="button" class="button primary" id="import-shared">
            ${icons.import}<span>自分のしおりとして取り込む</span></button>
          <button type="button" class="button" id="print">${icons.print}<span>印刷する</span></button>
        </div>
        ${sheet(shared)}
      </section>`;
  }

  function bindSharedView(shared: Trip | null): void {
    root.querySelector('#print')?.addEventListener('click', () => window.print());
    root.querySelector('#import-shared')?.addEventListener('click', () => {
      if (!shared) return;
      trip = shared;
      store.save(trip);
      location.hash = '#/';
    });
  }

  // ---- 描画 ----

  function render(): void {
    const activeId = document.activeElement instanceof HTMLElement ? document.activeElement.id : '';
    let body: string;
    let bind: () => void;
    if (mode.view === 'edit') {
      body = editView();
      bind = bindEditView;
    } else if (mode.view === 'preview') {
      body = previewView();
      bind = bindPreviewView;
    } else {
      const shared = mode.trip;
      body = sharedView(shared);
      bind = () => bindSharedView(shared);
    }
    root.innerHTML = `
      ${header()}
      <main class="site-main">${body}</main>
      <footer class="site-footer no-print">
        <p>tabishiori — 旅のしおり。データはこの端末のブラウザにだけ保存されます。</p>
      </footer>`;
    bind();
    if (activeId !== '') document.getElementById(activeId)?.focus();
  }

  render();
}
