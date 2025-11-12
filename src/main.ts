import './style.css';
import { createApp } from './app';
import { createStore } from './lib/trip';
import { seedTrip } from './lib/seed';

const root = document.getElementById('app');
if (!root) throw new Error('#app が見つかりません');

const store = createStore(localStorage);

// 初回起動だけ見本のしおりを入れて保存する。一度でも保存があればその状態を尊重する
let trip = store.load();
if (trip === null) {
  trip = seedTrip(Date.now());
  store.save(trip);
}

createApp({ root, store, initialTrip: trip });
