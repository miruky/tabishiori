// 初回起動時に表示する見本のしおり。一度でも保存があれば使わない。

import type { Trip } from './trip';

/** 実行日の30日後を出発日にした京都二泊三日の見本 */
export function seedTrip(now: number): Trip {
  const departure = new Date(now + 30 * 24 * 60 * 60 * 1000);
  const y = departure.getFullYear();
  const m = String(departure.getMonth() + 1).padStart(2, '0');
  const d = String(departure.getDate()).padStart(2, '0');
  return {
    title: '京都 二泊三日',
    destination: '京都',
    startDate: `${y}-${m}-${d}`,
    members: '2名',
    days: [
      {
        entries: [
          { time: '8:30', kind: 'move', title: '新幹線で京都へ', note: 'のぞみ、指定席' },
          { time: '11:00', kind: 'meal', title: '錦市場で食べ歩き', note: '' },
          { time: '13:00', kind: 'sight', title: '清水寺', note: '坂道が多いので歩きやすい靴で' },
          { time: '16:00', kind: 'sight', title: '八坂神社から祇園を散歩', note: '' },
          { time: '18:00', kind: 'stay', title: '宿にチェックイン', note: '夕食は宿で' },
        ],
      },
      {
        entries: [
          { time: '9:00', kind: 'sight', title: '嵐山 竹林の小径', note: '朝早めが空いている' },
          { time: '10:30', kind: 'sight', title: '天龍寺', note: '庭園をゆっくり' },
          { time: '12:30', kind: 'meal', title: '湯豆腐の昼食', note: '' },
          { time: '15:00', kind: 'sight', title: '金閣寺', note: '' },
          { time: '', kind: 'note', title: '夜は鴨川沿いを散歩', note: '時間があれば' },
        ],
      },
      {
        entries: [
          { time: '9:30', kind: 'sight', title: '伏見稲荷大社', note: '千本鳥居は午前中に' },
          { time: '12:00', kind: 'meal', title: '駅近くで昼食', note: '' },
          { time: '14:00', kind: 'move', title: 'お土産を買って帰路へ', note: '' },
        ],
      },
    ],
    packing: [
      { name: '着替え 2日分', packed: false },
      { name: 'モバイルバッテリー', packed: false },
      { name: '常備薬', packed: false },
      { name: '折りたたみ傘', packed: false },
      { name: '歩きやすい靴', packed: true },
      { name: 'ICカード', packed: true },
    ],
    budget: [
      { label: '新幹線往復(2名)', kind: 'transport', amount: 54000 },
      { label: '宿 2泊(2名)', kind: 'stay', amount: 48000 },
      { label: '食事', kind: 'food', amount: 24000 },
      { label: '拝観料・入場料', kind: 'activity', amount: 6000 },
      { label: 'お土産', kind: 'other', amount: 10000 },
    ],
    memo: '雨の場合は2日目を博物館と錦市場に差し替え。',
  };
}
