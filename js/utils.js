/* ============================================================================
 * utils.js — 共用小工具，不依賴任何遊戲狀態。
 * ==========================================================================*/

function nowMs() { return Date.now(); }

let __uidCounter = 1;
function uid(prefix) {
  __uidCounter += 1;
  return (prefix || 'id') + '_' + __uidCounter + '_' + Math.floor(Math.random() * 1e6);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function lerp(a, b, t) { return a + (b - a) * t; }

function distance(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }

function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randomInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

function formatNumber(n) {
  n = Math.floor(n);
  if (n >= 1000000) return (n / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function formatDuration(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (v) => String(v).padStart(2, '0');
  if (h > 0) return pad(h) + ':' + pad(m) + ':' + pad(s);
  return pad(m) + ':' + pad(s);
}

function formatDurationShort(ms) {
  if (ms <= 0) return '0秒';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return h + '時' + m + '分';
  if (m > 0) return m + '分' + s + '秒';
  return s + '秒';
}

function sumObjects(objs) {
  const out = {};
  objs.forEach((o) => {
    if (!o) return;
    Object.keys(o).forEach((k) => { out[k] = (out[k] || 0) + o[k]; });
  });
  return out;
}

function canAfford(resources, cost) {
  return Object.keys(cost).every((k) => (resources[k] || 0) >= cost[k]);
}

function payCost(resources, cost) {
  Object.keys(cost).forEach((k) => { resources[k] = (resources[k] || 0) - cost[k]; });
}

function refundCost(resources, cost, pct) {
  pct = pct === undefined ? 1 : pct;
  Object.keys(cost).forEach((k) => { resources[k] = (resources[k] || 0) + cost[k] * pct; });
}

// 觸控 tap 綑綁：處理 touchend + click fallback，避免部分引擎不合成 click。
function onTap(el, handler) {
  if (!el) return;
  let lastTouchAt = 0;
  el.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    lastTouchAt = Date.now();
    handler(e);
  }, { passive: false });
  el.addEventListener('click', (e) => {
    if (Date.now() - lastTouchAt < 700) return;
    handler(e);
  });
}

function el(tag, className, html) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function clearNode(node) { while (node.firstChild) node.removeChild(node.firstChild); }

function toast(msg, ms) {
  const box = document.getElementById('toastBox');
  if (!box) return;
  const t = el('div', 'toast', msg);
  box.appendChild(t);
  setTimeout(() => { t.classList.add('toastOut'); }, (ms || 1800) - 250);
  setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, ms || 1800);
}
