/* Pregão Simulador — plataforma de opções binárias em modo simulação.
   Tudo roda no navegador: cotações sintéticas, saldos e histórico ficam no localStorage. */
(() => {
'use strict';

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = c => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brlSigned = c => (c > 0 ? '+' : c < 0 ? '−' : '') + brl(Math.abs(c));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const uid = () => Math.random().toString(36).slice(2, 10);
const TZ = 'America/Sao_Paulo';
const fHMS = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fHM = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const fDT = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fDate = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
const fDay = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'long' });
function parseBRL(str) {
  let s = String(str).replace(/[^\d,.]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? Math.round(n * 100) : NaN;
}
function fmtDur(sec) {
  if (sec < 60) return sec + 's';
  if (sec < 3600) return (sec % 60 ? (sec / 60).toFixed(1) : sec / 60) + 'm';
  return (sec % 3600 ? (sec / 3600).toFixed(1) : sec / 3600) + 'h';
}
function mmss(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(ss).padStart(2, '0');
}

/* ---------- armazenamento ---------- */
const KEY = 'pregao.v1';
const DEMO_START = 5000000; // R$ 50.000,00 em centavos, como a conta demo original
function defaults() {
  return {
    user: null,
    acct: 'demo',
    bal: { real: 0, demo: DEMO_START },
    bonus: 0,
    ftd: false,
    tabs: ['EUR-USD-OTC', 'BTC-USD-OTC', 'AAPL-OTC'],
    active: 'EUR-USD-OTC',
    favs: ['EUR-USD-OTC', 'BTC-USD-OTC', 'AAPL-OTC'],
    amount: 1000,
    expiry: 60,
    chart: { type: 'candles', tf: 5, bg: 'default' },
    skin: 'default',
    sound: true,
    trades: [],
    tx: [],
    sched: [],
    auto: null,
    rewards: {
      spins: 2,
      scratch: 1,
      norisk: [],
      coupons: [],
      boosts: [],
      log: []
    },
    notifs: [],
    tourJoined: false,
    mfa: false,
    kyc: 'none'
  };
}
let S;
try { S = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || 'null') || {}); } catch { S = defaults(); }
S.rewards = Object.assign(defaults().rewards, S.rewards || {});
S.chart = Object.assign(defaults().chart, S.chart || {});
let saveT;
function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 250); }
function saveNow() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* armazenamento indisponível */ } }
addEventListener('beforeunload', saveNow);

/* ---------- ativos ---------- */
const MIN_EXP = 30; // expiração mínima em segundos
const ASSETS = (window.ASSETS || []).map(r => ({
  sym: r[0], name: r[1], market: r[2], payout: r[3], opts: r[5].filter(o => o >= MIN_EXP), min: r[6], max: r[7],
  sched: r[8].map(d => d ? d.split(',').map(x => x.split('-').map(t => { const [h, m] = t.split(':'); return +h * 60 + +m; })) : []),
  base: r[9], dec: r[10], pop: r[11], vol: r[12], otc: /-OTC$/.test(r[0])
}));
const BY = Object.fromEntries(ASSETS.map(a => [a.sym, a]));
const MKT = { forex: 'Forex', crypto: 'Cripto', stocks: 'Ações' };
const COIN = { USD: '#2f7f55', EUR: '#2b5fb4', GBP: '#6d3fa8', JPY: '#b9373f', AUD: '#c47d14', NZD: '#16787e', CAD: '#c9473a', CHF: '#b52c3a', CNY: '#c21f2a', HKD: '#9a2a46', RUB: '#3a62a8', BRL: '#1b8e47', XAU: '#b8921c', XAG: '#7d8896', XPT: '#6e7b88', BTC: '#e8860f', ETH: '#5b74d6', SOL: '#7f48e6', XRP: '#3b4a5c', DOGE: '#b3962c', ADA: '#2a55c9', TRX: '#c42c37', USDT: '#1f9672' };
function colorOf(k) { if (COIN[k]) return COIN[k]; let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 45% 40%)`; }
function parts(a) { return a.sym.replace(/-OTC$/, '').split('-'); }
function label(a) {
  const p = parts(a);
  if (a.market === 'forex' && p.length === 2) return p[0] + '/' + p[1];
  return a.name.replace(/\s*\(OTC\)\s*/, '');
}
function subLabel(a) { return MKT[a.market] + (a.otc ? ' · OTC' : ''); }
function aicon(a, sm) {
  const p = parts(a), cls = sm ? ' sm' : '';
  if (a.market === 'forex' && p.length === 2) return `<span class="aicon${cls}" aria-hidden="true"><i style="background:${colorOf(p[0])}">${p[0]}</i><i style="background:${colorOf(p[1])}">${p[1]}</i></span>`;
  const tk = a.market === 'crypto' ? p[0] : p.join('');
  return `<span class="aicon single${cls}" aria-hidden="true"><i style="background:${colorOf(tk)}">${esc(tk.slice(0, 4))}</i></span>`;
}
function fmtP(a, p) { return p.toFixed(a.dec); }
function isOpen(a, d = new Date()) {
  const day = (d.getUTCDay() + 6) % 7, m = d.getUTCHours() * 60 + d.getUTCMinutes();
  return a.sched[day].some(([s, e]) => m >= s && m <= e);
}
function nextOpen(a) {
  const d = new Date(); d.setUTCSeconds(0, 0);
  for (let i = 0; i < 60 * 24 * 8; i++) { d.setTime(d.getTime() + 60000); if (isOpen(a, d)) return d; }
  return null;
}
function vipTier() {
  const since = Date.now() - 30 * 864e5;
  const total = S.tx.filter(t => t.kind === 'deposit' && t.status === 'paid' && t.t >= since).reduce((s, t) => s + t.amt, 0);
  let tier = TIERS[0];
  for (const t of TIERS) if (total >= t.min) tier = t;
  return { tier, total };
}
const TIERS = [
  { id: 'standard', name: 'Standard', min: 0, bonus: 0, perks: ['Retorno padrão de cada ativo', 'Suporte 24/7 pelo chat', 'Roleta Standard e raspadinha'] },
  { id: 'pro', name: 'Pro', min: 250000, bonus: 2, perks: ['+2 pontos de retorno em todos os ativos', '1 giro extra por semana', 'Saque analisado em até 6 horas'] },
  { id: 'vip', name: 'VIP', min: 2500000, bonus: 4, perks: ['+4 pontos de retorno em todos os ativos', 'Gerente de conta dedicado', 'Saque analisado em até 1 hora', 'Convites para torneios fechados'] }
];
function activeBoost(a) {
  const now = Date.now();
  S.rewards.boosts = S.rewards.boosts.filter(b => b.until > now);
  return a.otc ? S.rewards.boosts.reduce((s, b) => s + b.pct, 0) : 0;
}
function effPayout(a) { return a.payout + vipTier().tier.bonus + activeBoost(a); }

/* ---------- motor de cotações sintéticas ---------- */
const HIST_S = 3 * 3600;
const SER = {};
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function seed(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return mulberry32(h >>> 0); }
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function sigmaOf(a) { return ({ forex: 0.000045, crypto: 0.00012, stocks: 0.00008 }[a.market] || 0.00006) * (a.vol === 1 ? 0.7 : a.vol === 3 ? 1.5 : 1); }
function step(s, a, r, dt) {
  const sig = sigmaOf(a) * Math.sqrt(dt);
  if (r() < 0.006 * dt) s.mom = (r() - 0.5) * sig * 0.5;
  const rev = (a.base - s.p) / a.base * 0.0004 * dt;
  s.p *= 1 + gauss(r) * sig + s.mom + rev;
}
function pushSecond(s, a, t, r) {
  const o = s.p; let h = o, l = o;
  if (isOpen(a, new Date(t * 1000))) for (let k = 0; k < 2; k++) { step(s, a, r, 0.5); h = Math.max(h, s.p); l = Math.min(l, s.p); }
  s.bars.push({ t, o, h, l, c: s.p });
}
function series(sym) {
  if (SER[sym]) return SER[sym];
  const a = BY[sym], r = seed(sym + Math.floor(Date.now() / 36e5));
  const s = { bars: [], p: a.base * (1 + (r() - 0.5) * 0.004), mom: 0, last: 0 };
  const now = Math.floor(Date.now() / 1000);
  for (let t = now - HIST_S; t <= now; t++) pushSecond(s, a, t, r);
  SER[sym] = s;
  return s;
}
function priceAt(sym, ms) {
  const s = series(sym), t = Math.floor(ms / 1000), b = s.bars;
  let lo = 0, hi = b.length - 1;
  if (t >= b[hi].t) return s.p;
  while (lo < hi) { const m = (lo + hi) >> 1; if (b[m].t < t) lo = m + 1; else hi = m; }
  return b[lo].c;
}
function liveSyms() {
  const set = new Set(S.tabs);
  S.trades.forEach(t => t.status === 'open' && set.add(t.sym));
  S.sched.forEach(x => set.add(x.sym));
  if (S.auto?.running) set.add(S.auto.sym);
  return [...set].filter(x => BY[x]);
}
function tickMarket() {
  const t = Math.floor(Date.now() / 1000);
  for (const sym of liveSyms()) {
    const s = series(sym), a = BY[sym];
    let last = s.bars[s.bars.length - 1];
    if (t - last.t > 1) {
      const from = Math.max(last.t + 1, t - HIST_S);
      for (let tt = from; tt < t; tt++) pushSecond(s, a, tt, Math.random);
      last = s.bars[s.bars.length - 1];
    }
    if (last.t < t) { last = { t, o: s.p, h: s.p, l: s.p, c: s.p }; s.bars.push(last); }
    s.prev = s.p;
    if (isOpen(a)) { step(s, a, Math.random, 0.5); last.c = s.p; last.h = Math.max(last.h, s.p); last.l = Math.min(last.l, s.p); }
    if (s.bars.length > HIST_S + 900) s.bars.splice(0, s.bars.length - HIST_S);
  }
}

/* ---------- sons (sintetizados) ---------- */
let AC;
function tone(freqs, dur, type, gap, vol) {
  if (!S.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    freqs.forEach((f, i) => {
      const o = AC.createOscillator(), g = AC.createGain(), t0 = AC.currentTime + i * gap;
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    });
  } catch { /* áudio indisponível */ }
}
const SFX = {
  place: () => tone([1046, 1568], 0.09, 'triangle', 0.05, 0.08),
  win: () => tone([523, 659, 784, 1046], 0.16, 'triangle', 0.08, 0.12),
  loss: () => tone([330, 247], 0.25, 'sawtooth', 0.15, 0.04),
  deposit: () => tone([784, 988, 1318], 0.22, 'sine', 0.09, 0.12),
  welcome: () => tone([523, 659, 784, 1046], 0.5, 'sine', 0.06, 0.06),
  spin: () => tone([660], 0.03, 'square', 0, 0.03)
};

/* ---------- toasts, notificações e modais ---------- */
function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind; el.innerHTML = msg;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), 4200);
}
function notify(title, body) {
  S.notifs.unshift({ id: uid(), title, body, t: Date.now(), read: false });
  S.notifs = S.notifs.slice(0, 40);
  save(); updateHeader();
}
function openModal(html, opts = {}) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  $('#modal-root').append(back);
  const close = () => { back.remove(); opts.onClose?.(); };
  if (!opts.locked) {
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
  $$('[data-close]', back).forEach(b => b.addEventListener('click', close));
  setTimeout(() => $('input, button:not(.x)', back)?.focus(), 30);
  return { el: back, close };
}

/* ---------- topo ---------- */
function acctBalance(kind = S.acct) { return kind === 'real' ? S.bal.real + S.bonus : S.bal.demo; }
function updateHeader() {
  const real = S.acct === 'real';
  $('#acct-kind').textContent = real ? 'Conta real' : 'Conta demo';
  $('#acct-bal').textContent = brl(acctBalance());
  $('#acct-btn').classList.toggle('real', real);
  const unread = S.notifs.filter(n => !n.read).length;
  $('#bell-badge').hidden = !unread; $('#bell-badge').textContent = unread;
  $('#rewards-dot').hidden = !(S.rewards.spins > 0 || S.rewards.scratch > 0);
  $('#avatar').textContent = (S.user?.first || 'P')[0].toUpperCase();
  if (!$('#acct-menu').hidden) renderAcctMenu();
}
function renderAcctMenu() {
  $('#acct-menu').innerHTML = `
    <button class="acct-opt ${S.acct === 'real' ? 'on' : ''}" data-acct="real" type="button">
      <span><b>Conta real</b><small>Saldo ${brl(S.bal.real)} · Bônus ${brl(S.bonus)}</small></span><strong>${brl(acctBalance('real'))}</strong></button>
    <button class="acct-opt ${S.acct === 'demo' ? 'on' : ''}" data-acct="demo" type="button">
      <span><b>Conta demo</b><small>Para treinar sem risco</small></span><strong>${brl(S.bal.demo)}</strong></button>
    <div class="row-actions">
      <a class="btn btn-sm btn-primary" href="#deposit">Depositar</a>
      <a class="btn btn-sm" href="#withdraw">Sacar</a>
      <button class="btn btn-sm" type="button" id="reload-demo">Recarregar demo</button>
    </div>
    <p class="note">Ambiente de simulação: os saldos não representam dinheiro real.</p>`;
  $$('[data-acct]', $('#acct-menu')).forEach(b => b.onclick = () => { setAcct(b.dataset.acct); toggleAcctMenu(false); });
  $('#reload-demo').onclick = () => { S.bal.demo = DEMO_START; save(); updateHeader(); toast('Conta demo recarregada com ' + brl(DEMO_START) + '.', 'ok'); };
  $$('a', $('#acct-menu')).forEach(a => a.addEventListener('click', () => toggleAcctMenu(false)));
}
function toggleAcctMenu(force) {
  const m = $('#acct-menu'), show = force ?? m.hidden;
  m.hidden = !show; $('#acct-btn').setAttribute('aria-expanded', show);
  if (show) { renderAcctMenu(); $('#notif-panel').hidden = true; }
}
function setAcct(k) { S.acct = k; save(); updateHeader(); renderPanel(); toast(k === 'real' ? 'Você está operando na conta real.' : 'Você está operando na conta demo.'); }
function renderNotifs() {
  const p = $('#notif-panel');
  p.innerHTML = `<h4>Notificações <button class="link" type="button" id="notif-read">Marcar como lidas</button></h4>` +
    (S.notifs.length ? S.notifs.map(n => `<div class="notif ${n.read ? '' : 'unread'}"><b>${esc(n.title)}</b><span>${esc(n.body)}</span><span>${fDT.format(n.t)}</span></div>`).join('') : '<p class="empty-mini">Nenhuma notificação.</p>');
  $('#notif-read').onclick = () => { S.notifs.forEach(n => n.read = true); save(); updateHeader(); renderNotifs(); };
}
function renderTabs() {
  $('#asset-tabs').innerHTML = S.tabs.map(sym => {
    const a = BY[sym]; if (!a) return '';
    const open = isOpen(a);
    return `<div class="tab ${sym === S.active ? 'on' : ''}" role="tab" aria-selected="${sym === S.active}">
      <button class="tab-main" type="button" data-sym="${sym}">${aicon(a, true)}<span><span class="tab-name">${esc(label(a))}</span><br><span class="tab-sub ${open ? '' : 'closed'}">${open ? effPayout(a) + '%' : 'Fechado'}</span></span></button>
      ${S.tabs.length > 1 ? `<button class="tab-x" type="button" data-x="${sym}" aria-label="Fechar ${esc(label(a))}">×</button>` : ''}</div>`;
  }).join('');
  $$('[data-sym]', $('#asset-tabs')).forEach(b => b.onclick = () => selectAsset(b.dataset.sym));
  $$('[data-x]', $('#asset-tabs')).forEach(b => b.onclick = () => {
    const i = S.tabs.indexOf(b.dataset.x); S.tabs.splice(i, 1);
    if (S.active === b.dataset.x) selectAsset(S.tabs[Math.max(0, i - 1)]); else { save(); renderTabs(); }
  });
}
function selectAsset(sym) {
  if (!BY[sym]) return;
  if (!S.tabs.includes(sym)) S.tabs.push(sym);
  S.active = sym; CH.offset = 0; CH.yMin = null;
  const a = BY[sym];
  if (!a.opts.includes(S.expiry)) S.expiry = a.opts.reduce((b, o) => Math.abs(o - 60) < Math.abs(b - 60) ? o : b, a.opts[0]);
  series(sym); save(); renderTabs(); renderPanel();
  if (location.hash.slice(1).split('/')[0] !== 'trade') location.hash = 'trade';
}

/* ---------- seletor de ativos ---------- */
function openPicker() {
  let filter = 'all', q = '';
  const m = openModal(`
    <div class="modal-head"><h2>Escolha um ativo</h2><button class="x" data-close aria-label="Fechar">×</button></div>
    <input class="input" id="pick-q" placeholder="Buscar por nome ou código" autocomplete="off">
    <div class="picker-tabs" id="pick-tabs">
      ${[['all', 'Todos'], ['fav', 'Favoritos'], ['forex', 'Forex'], ['crypto', 'Cripto'], ['stocks', 'Ações'], ['otc', 'OTC']].map(([k, l]) => `<button class="chip ${k === 'all' ? 'on' : ''}" type="button" data-f="${k}">${l}</button>`).join('')}
    </div>
    <div class="picker-list" id="pick-list"></div>`, { wide: true });
  const draw = () => {
    const list = ASSETS.filter(a => (filter === 'all' || (filter === 'fav' ? S.favs.includes(a.sym) : filter === 'otc' ? a.otc : a.market === filter))
      && (!q || (a.sym + ' ' + a.name + ' ' + label(a)).toLowerCase().includes(q)))
      .sort((x, y) => (isOpen(y) - isOpen(x)) || effPayout(y) - effPayout(x));
    $('#pick-list', m.el).innerHTML = list.length ? list.map(a => {
      const open = isOpen(a);
      return `<div class="pick" role="button" tabindex="0" data-pick="${a.sym}">
        <button class="star ${S.favs.includes(a.sym) ? 'on' : ''}" type="button" data-star="${a.sym}" aria-label="Favoritar">${S.favs.includes(a.sym) ? '★' : '☆'}</button>
        ${aicon(a)}<span><b>${esc(label(a))}</b><br><small class="muted">${subLabel(a)} · ${a.opts.map(fmtDur).slice(0, 4).join(', ')}${a.opts.length > 4 ? '…' : ''}</small></span>
        <span class="pp">${open ? effPayout(a) + '%' : ''}</span>
        <span class="ch">${open ? '<span class="pill ok">Aberto</span>' : '<span class="pill">Fechado</span>'}</span></div>`;
    }).join('') : '<p class="empty-mini">Nenhum ativo encontrado.</p>';
    $$('[data-pick]', m.el).forEach(r => {
      const go = () => { selectAsset(r.dataset.pick); m.close(); };
      r.addEventListener('click', e => { if (!e.target.closest('[data-star]')) go(); });
      r.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    });
    $$('[data-star]', m.el).forEach(b => b.onclick = () => {
      const s = b.dataset.star, i = S.favs.indexOf(s);
      i >= 0 ? S.favs.splice(i, 1) : S.favs.push(s); save(); draw();
    });
  };
  $('#pick-q', m.el).addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); draw(); });
  $$('[data-f]', m.el).forEach(b => b.onclick = () => { filter = b.dataset.f; $$('[data-f]', m.el).forEach(x => x.classList.toggle('on', x === b)); draw(); });
  draw();
}

/* ---------- gráfico ---------- */
const CH = { cv: null, ctx: null, w: 0, h: 0, dpr: 1, n: 110, offset: 0, yMin: null, yMax: null, hover: null, preview: null, drag: null, bg: null, col: {} };
const TFS = [[5, '5s'], [15, '15s'], [30, '30s'], [60, '1m'], [300, '5m'], [900, '15m']];
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  ['up', 'down', 'fg', 'muted', 'accent', 'accent-ink', 'line', 'chart-bg', 'chart-grid', 'panel-2', 'raise'].forEach(k => CH.col[k] = cs.getPropertyValue('--' + k).trim());
}
function alpha(hex, a) {
  if (hex.startsWith('#')) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
  return hex;
}
function buildBg() {
  const c = document.createElement('canvas'), { w, h, dpr } = CH;
  c.width = w * dpr; c.height = h * dpr;
  const x = c.getContext('2d'); x.scale(dpr, dpr);
  x.fillStyle = CH.col['chart-bg']; x.fillRect(0, 0, w, h);
  const r = seed('bg');
  if (S.chart.bg === 'aurora') {
    [[0.2, 0.15, CH.col.up], [0.75, 0.05, CH.col.accent], [0.55, 0.9, CH.col.down]].forEach(([fx, fy, col]) => {
      const g = x.createRadialGradient(w * fx, h * fy, 0, w * fx, h * fy, Math.max(w, h) * 0.55);
      g.addColorStop(0, alpha(col, 0.13)); g.addColorStop(1, alpha(col, 0));
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    });
  } else if (S.chart.bg === 'grade') {
    x.fillStyle = alpha(CH.col.fg || '#ffffff', 0.07);
    for (let yy = 12; yy < h; yy += 20) for (let xx = 12; xx < w; xx += 20) {
      const v = Math.sin(xx * 0.011) * Math.cos(yy * 0.017) + Math.sin((xx + yy) * 0.004);
      if (v > 0.2) { x.beginPath(); x.arc(xx, yy, 1.3, 0, 7); x.fill(); }
    }
  } else if (S.chart.bg === 'cidade') {
    let xx = 0;
    while (xx < w) {
      const bw = 26 + r() * 50, bh = h * (0.12 + r() * 0.3);
      x.fillStyle = alpha(CH.col.fg || '#ffffff', 0.035); x.fillRect(xx, h - bh, bw - 4, bh);
      x.fillStyle = alpha(CH.col.accent, 0.08);
      for (let wy = h - bh + 8; wy < h - 8; wy += 12) for (let wx = xx + 5; wx < xx + bw - 10; wx += 9) if (r() > 0.6) x.fillRect(wx, wy, 3, 4);
      xx += bw;
    }
  } else {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, alpha(CH.col.raise || '#242b45', 0.35)); g.addColorStop(1, alpha(CH.col.raise || '#242b45', 0));
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }
  CH.bg = c;
}
function resizeChart() {
  const r = CH.cv.getBoundingClientRect();
  CH.dpr = Math.min(2, window.devicePixelRatio || 1);
  CH.w = Math.max(10, r.width); CH.h = Math.max(10, r.height);
  CH.cv.width = CH.w * CH.dpr; CH.cv.height = CH.h * CH.dpr;
  buildBg();
}
function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
}
function candlesFrom(s, tf, startB) {
  const b = s.bars; let lo = 0, hi = b.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (b[m].t < startB) lo = m + 1; else hi = m; }
  const out = []; let cur = null;
  for (let i = lo; i < b.length; i++) {
    const x = b[i], k = Math.floor(x.t / tf) * tf;
    if (!cur || cur.t !== k) { cur = { t: k, o: x.o, h: x.h, l: x.l, c: x.c }; out.push(cur); }
    else { cur.h = Math.max(cur.h, x.h); cur.l = Math.min(cur.l, x.l); cur.c = x.c; }
  }
  return out;
}
const LABEL_STEPS = [5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400];
function drawChart() {
  const { ctx, w, h, dpr, col } = CH;
  if (!w || !ctx) return;
  const a = BY[S.active], s = series(S.active), tf = S.chart.tf;
  const nowMs = Date.now(), nowS = nowMs / 1000;
  const axisW = 74, axisH = 24, topPad = 64;
  const plotR = w - axisW, plotB = h - axisH;
  const nowX = plotR * (w < 600 ? 0.72 : 0.78);
  const n = CH.n, slot = nowX / n;
  const lastB = Math.floor(s.bars[s.bars.length - 1].t / tf) * tf;
  const maxOff = Math.max(0, (lastB - s.bars[0].t) / tf - n - 2);
  CH.offset = clamp(CH.offset, 0, maxOff);
  $('#to-now').hidden = CH.offset < 1;
  const off = CH.offset;
  const xT = t => nowX + ((t - (lastB + tf)) / tf + off) * slot;
  const tAt = x => (x - nowX) / slot * tf - off * tf + lastB + tf;
  const cs = candlesFrom(s, tf, lastB - Math.ceil(n + off + 2) * tf);
  const mine = S.trades.filter(t => t.sym === S.active && t.acct === S.acct && (t.status === 'open' || t.expT / 1000 > tAt(0)));

  let lo = Infinity, hi = -Infinity;
  for (const c of cs) { const x = xT(c.t); if (x + slot < 0 || x > plotR) continue; if (c.l < lo) lo = c.l; if (c.h > hi) hi = c.h; }
  for (const t of mine) if (t.status === 'open') { lo = Math.min(lo, t.open); hi = Math.max(hi, t.open); }
  if (!isFinite(lo)) { lo = hi = s.p; }
  const pad = (hi - lo) * 0.2 || s.p * 0.0004;
  const tMin = lo - pad, tMax = hi + pad;
  if (CH.yMin == null) { CH.yMin = tMin; CH.yMax = tMax; }
  else { CH.yMin += (tMin - CH.yMin) * 0.12; CH.yMax += (tMax - CH.yMax) * 0.12; }
  const Y = p => topPad + (CH.yMax - p) / (CH.yMax - CH.yMin) * (plotB - topPad - 8);
  const P = y => CH.yMax - (y - topPad) / (plotB - topPad - 8) * (CH.yMax - CH.yMin);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.drawImage(CH.bg, 0, 0, w, h);

  // marca d'água
  ctx.save();
  ctx.font = `800 ${Math.min(72, w / 9)}px Sora, sans-serif`;
  ctx.fillStyle = alpha(col.fg, 0.035); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label(a).toUpperCase(), plotR / 2, (topPad + plotB) / 2);
  ctx.restore();

  // grade e eixo Y
  ctx.font = '11px "IBM Plex Mono", monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const stepY = niceStep((CH.yMax - CH.yMin) / 6);
  ctx.strokeStyle = col['chart-grid']; ctx.lineWidth = 1; ctx.fillStyle = col.muted;
  for (let v = Math.ceil(CH.yMin / stepY) * stepY; v <= CH.yMax; v += stepY) {
    const y = Math.round(Y(v)) + 0.5;
    if (y < topPad - 4 || y > plotB) continue;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(plotR, y); ctx.stroke();
    ctx.fillText(fmtP(a, v), plotR + 8, y);
  }
  // eixo X
  const L = LABEL_STEPS.find(v => v >= tf && v / tf * slot >= 90) || 14400;
  ctx.textAlign = 'center';
  for (let t = Math.floor(tAt(0) / L) * L; t < tAt(plotR); t += L) {
    const x = Math.round(xT(t)) + 0.5; if (x < 0) continue;
    ctx.beginPath(); ctx.moveTo(x, topPad - 10); ctx.lineTo(x, plotB); ctx.stroke();
    ctx.fillText((L < 60 ? fHMS : fHM).format(t * 1000), x, plotB + 12);
  }
  ctx.strokeStyle = col.line; ctx.beginPath(); ctx.moveTo(plotR + 0.5, 0); ctx.lineTo(plotR + 0.5, h); ctx.moveTo(0, plotB + 0.5); ctx.lineTo(w, plotB + 0.5); ctx.stroke();

  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, plotR, plotB); ctx.clip();

  // prévia da direção ao passar o mouse nos botões
  if (CH.preview && isOpen(a)) {
    const xe = Math.min(plotR, xT(nowS + S.expiry)), xs = xT(nowS), y = Y(s.p);
    const up = CH.preview === 'up';
    const g = ctx.createLinearGradient(0, y, 0, up ? topPad : plotB);
    g.addColorStop(0, alpha(up ? col.up : col.down, 0.22)); g.addColorStop(1, alpha(up ? col.up : col.down, 0));
    ctx.fillStyle = g; ctx.fillRect(xs, up ? topPad - 20 : y, xe - xs, up ? y - topPad + 20 : plotB - y);
  }

  // série
  const type = S.chart.type, bw = Math.max(1, slot - clamp(slot * 0.12, 1, 3)); // candles colados: só 1–3 px de respiro
  if (type === 'area') {
    ctx.beginPath(); let first = true, fx = 0;
    for (const c of cs) { const x = xT(c.t) + slot / 2; if (x < -slot) continue; if (first) { ctx.moveTo(x, Y(c.c)); fx = x; first = false; } else ctx.lineTo(x, Y(c.c)); }
    const lx = xT(lastB) + slot / 2;
    ctx.strokeStyle = col.accent; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineTo(lx, plotB); ctx.lineTo(fx, plotB); ctx.closePath();
    const g = ctx.createLinearGradient(0, topPad, 0, plotB);
    g.addColorStop(0, alpha(col.accent, 0.28)); g.addColorStop(1, alpha(col.accent, 0));
    ctx.fillStyle = g; ctx.fill();
  } else {
    for (const c of cs) {
      const x = xT(c.t) + slot / 2; if (x < -slot || x > plotR + slot) continue;
      const upC = c.c >= c.o, color = upC ? col.up : col.down;
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1;
      const xx = Math.round(x) + 0.5;
      if (type === 'bars') {
        ctx.beginPath(); ctx.moveTo(xx, Y(c.h)); ctx.lineTo(xx, Y(c.l));
        ctx.moveTo(xx - bw / 2, Y(c.o)); ctx.lineTo(xx, Y(c.o)); ctx.moveTo(xx, Y(c.c)); ctx.lineTo(xx + bw / 2, Y(c.c)); ctx.lineWidth = 1.5; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(xx, Y(c.h)); ctx.lineTo(xx, Y(c.l)); ctx.stroke();
        const y1 = Y(Math.max(c.o, c.c)), y2 = Y(Math.min(c.o, c.c));
        ctx.fillRect(Math.round(x - bw / 2), Math.round(y1), Math.round(bw), Math.max(1, Math.round(y2 - y1)));
      }
    }
  }

  // linha de expiração selecionada
  const xe = xT(nowS + S.expiry);
  if (xe < plotR) {
    ctx.setLineDash([4, 4]); ctx.strokeStyle = alpha(col.accent, 0.8); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Math.round(xe) + 0.5, topPad - 10); ctx.lineTo(Math.round(xe) + 0.5, plotB); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '600 10px "IBM Plex Sans", sans-serif'; ctx.fillStyle = col.accent; ctx.textAlign = 'center';
    ctx.fillText('EXPIRAÇÃO ' + fmtDur(S.expiry), xe, topPad - 18);
  }

  // operações
  ctx.font = '600 11px "IBM Plex Mono", monospace';
  for (const t of mine) {
    const x1 = xT(t.openT / 1000), x2 = xT(t.expT / 1000), y = Y(t.open);
    const c = t.dir === 'up' ? col.up : col.down;
    if (t.status === 'open') {
      const winning = t.dir === 'up' ? s.p > t.open : s.p < t.open;
      ctx.strokeStyle = c; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(Math.min(x2, plotR), y); ctx.stroke();
      ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(Math.min(x2, plotR - 1), topPad - 6); ctx.lineTo(Math.min(x2, plotR - 1), plotB); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x1, y, 4, 0, 7); ctx.fill();
      const txt = (t.dir === 'up' ? '▲ ' : '▼ ') + brl(t.amt) + '  ' + mmss(t.expT - nowMs);
      const tw = ctx.measureText(txt).width + 14, bx = clamp(x1 - tw / 2, 4, plotR - tw - 4), by = y + (t.dir === 'up' ? 10 : -30);
      ctx.fillStyle = winning ? col.up : col.down; roundRect(ctx, bx, by, tw, 20, 6); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(txt, bx + 7, by + 10.5);
    } else {
      const yc = Y(t.close);
      ctx.strokeStyle = alpha(c, 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
      ctx.fillStyle = t.status === 'win' ? col.up : t.status === 'loss' ? col.down : col.muted;
      ctx.beginPath(); ctx.arc(x2, yc, 5, 0, 7); ctx.fill();
    }
  }
  ctx.restore();

  // preço atual
  const yp = Math.round(Y(s.p)) + 0.5;
  ctx.setLineDash([3, 3]); ctx.strokeStyle = alpha(col.fg, 0.45); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, yp); ctx.lineTo(plotR, yp); ctx.stroke(); ctx.setLineDash([]);
  const lx = xT(lastB) + slot / 2, pulse = (nowMs % 1400) / 1400;
  if (type === 'area' && lx < plotR) {
    ctx.fillStyle = alpha(col.accent, 0.35 * (1 - pulse)); ctx.beginPath(); ctx.arc(lx, Y(s.p), 4 + pulse * 10, 0, 7); ctx.fill();
    ctx.fillStyle = col.accent; ctx.beginPath(); ctx.arc(lx, Y(s.p), 4, 0, 7); ctx.fill();
  }
  ctx.font = '600 12px "IBM Plex Mono", monospace'; ctx.textAlign = 'left';
  const upTick = s.p >= (s.prev ?? s.p);
  ctx.fillStyle = upTick ? col.up : col.down; roundRect(ctx, plotR + 2, yp - 11, axisW - 4, 22, 5); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillText(fmtP(a, s.p), plotR + 7, yp + 0.5);
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.fillStyle = col['panel-2']; roundRect(ctx, plotR + 2, yp + 13, axisW - 4, 18, 5); ctx.fill();
  ctx.fillStyle = col.muted; ctx.fillText(mmss((lastB + tf) * 1000 - nowMs), plotR + 7, yp + 22.5);

  // mira
  if (CH.hover && CH.hover.x < plotR && CH.hover.y < plotB && CH.hover.y > topPad - 10) {
    const { x, y } = CH.hover;
    ctx.strokeStyle = alpha(col.fg, 0.35); ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(x + 0.5, topPad - 10); ctx.lineTo(x + 0.5, plotB); ctx.moveTo(0, y + 0.5); ctx.lineTo(plotR, y + 0.5); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col.raise; roundRect(ctx, plotR + 2, y - 10, axisW - 4, 20, 5); ctx.fill();
    ctx.fillStyle = col.fg; ctx.textAlign = 'left'; ctx.fillText(fmtP(a, P(y)), plotR + 7, y + 0.5);
    const tt = fHMS.format(tAt(x) * 1000), tw = ctx.measureText(tt).width + 12;
    ctx.fillStyle = col.raise; roundRect(ctx, x - tw / 2, plotB + 2, tw, 20, 5); ctx.fill();
    ctx.fillStyle = col.fg; ctx.textAlign = 'center'; ctx.fillText(tt, x, plotB + 12);
    const hc = cs.find(c => tAt(x) >= c.t && tAt(x) < c.t + tf);
    if (hc) {
      ctx.textAlign = 'left'; ctx.font = '11px "IBM Plex Mono", monospace'; ctx.fillStyle = col.muted;
      ctx.fillText(`A ${fmtP(a, hc.o)}  M ${fmtP(a, hc.h)}  m ${fmtP(a, hc.l)}  F ${fmtP(a, hc.c)}`, 14, plotB - 12);
    }
  }
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function initChart() {
  CH.cv = $('#chart'); CH.ctx = CH.cv.getContext('2d');
  readColors();
  new ResizeObserver(resizeChart).observe(CH.cv);
  CH.cv.addEventListener('wheel', e => { e.preventDefault(); CH.n = clamp(Math.round(CH.n * (e.deltaY > 0 ? 1.12 : 0.89)), 16, 240); }, { passive: false });
  CH.cv.addEventListener('pointerdown', e => { CH.drag = { x: e.clientX, off: CH.offset }; CH.cv.setPointerCapture(e.pointerId); });
  CH.cv.addEventListener('pointermove', e => {
    const r = CH.cv.getBoundingClientRect();
    CH.hover = e.pointerType === 'mouse' ? { x: e.clientX - r.left, y: e.clientY - r.top } : null;
    if (CH.drag) { const slot = (CH.w - 74) * 0.78 / CH.n; CH.offset = CH.drag.off + (e.clientX - CH.drag.x) / slot; }
  });
  const end = () => { CH.drag = null; };
  CH.cv.addEventListener('pointerup', end); CH.cv.addEventListener('pointercancel', end);
  CH.cv.addEventListener('pointerleave', () => { CH.hover = null; });
  CH.cv.addEventListener('dblclick', () => { CH.offset = 0; });
  $('#to-now').onclick = () => { CH.offset = 0; };
  $('#zoom-in').onclick = () => { CH.n = clamp(Math.round(CH.n * 0.8), 16, 240); };
  $('#zoom-out').onclick = () => { CH.n = clamp(Math.round(CH.n * 1.25), 16, 240); };
  $('#tf-seg').innerHTML = TFS.map(([v, l]) => `<button type="button" data-tf="${v}">${l}</button>`).join('');
  $$('[data-tf]').forEach(b => b.onclick = () => { S.chart.tf = +b.dataset.tf; CH.offset = 0; CH.yMin = null; save(); syncChartTools(); });
  $$('[data-type]').forEach(b => b.onclick = () => { S.chart.type = b.dataset.type; save(); syncChartTools(); });
  syncChartTools();
  const loop = () => { if (!$('#trade-view').hidden && !document.hidden) drawChart(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
function syncChartTools() {
  $$('[data-tf]').forEach(b => b.classList.toggle('on', +b.dataset.tf === S.chart.tf));
  $$('[data-type]').forEach(b => b.classList.toggle('on', b.dataset.type === S.chart.type));
}

/* ---------- boleta e operações ---------- */
let tradeListTab = 'open';
function renderPanel() {
  const a = BY[S.active];
  $('#asset-pill').innerHTML = `${aicon(a)}<span><strong>${esc(label(a))}</strong><small>${subLabel(a)} · ${effPayout(a)}%${activeBoost(a) ? ' · boost +' + activeBoost(a) + '%' : ''}</small></span><svg viewBox="0 0 24 24" width="16"><path d="m6 9 6 6 6-6"/></svg>`;
  $('#expiry').innerHTML = a.opts.map(o => `<button type="button" role="radio" aria-checked="${o === S.expiry}" class="${o === S.expiry ? 'on' : ''}" data-exp="${o}">${fmtDur(o)}</button>`).join('');
  $$('[data-exp]').forEach(b => b.onclick = () => { S.expiry = +b.dataset.exp; save(); renderPanel(); });
  S.amount = clamp(S.amount, a.min, a.max);
  if (document.activeElement !== $('#amount')) $('#amount').value = brl(S.amount);
  $('#amt-chips').innerHTML = [500, 1000, 2500, 5000, 10000, 50000].map(v => `<button type="button" class="chip ${v === S.amount ? 'on' : ''}" data-amt="${v}">${v / 100}</button>`).join('');
  $$('[data-amt]').forEach(b => b.onclick = () => { S.amount = +b.dataset.amt; save(); renderPanel(); });
  const pct = effPayout(a);
  $('#payout-pct').textContent = pct + '%';
  $('#payout-val').textContent = '+' + brl(Math.round(S.amount * pct / 100));
  const nr = S.rewards.norisk.length;
  $('#norisk-row').hidden = !(nr && S.acct === 'real');
  $('#norisk-count').textContent = `(${nr} disponível${nr > 1 ? 'is' : ''}, até ${brl(S.rewards.norisk[0]?.limit || 0)})`;
  const open = isOpen(a);
  $('#btn-up').disabled = $('#btn-down').disabled = !open;
  const veil = $('#closed-veil');
  veil.hidden = open;
  if (!open) {
    const n = nextOpen(a);
    veil.innerHTML = `<div><h3>Mercado fechado</h3><p class="muted">${esc(label(a))} ${n ? 'abre ' + fDay.format(n) + ' às ' + fHM.format(n) + ' (Brasília)' : 'sem horário definido'}. Os ativos OTC funcionam todos os dias.</p><button class="btn btn-primary btn-sm" type="button" id="veil-pick">Escolher outro ativo</button></div>`;
    $('#veil-pick').onclick = openPicker;
  }
  renderTradeList(); renderAutoCard();
}
function renderTradeList() {
  const now = Date.now();
  const mine = S.trades.filter(t => t.acct === S.acct);
  const open = mine.filter(t => t.status === 'open');
  $('#open-count').textContent = open.length;
  $('#sched-count').textContent = S.sched.length;
  $$('.mini-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tl === tradeListTab));
  const arrow = d => `<span class="dir ${d}"><svg viewBox="0 0 24 24"><path d="${d === 'up' ? 'm5 15 7-7 7 7' : 'm5 9 7 7 7-7'}"/></svg></span>`;
  let html = '';
  if (tradeListTab === 'open') {
    html = open.length ? open.map(t => {
      const a = BY[t.sym], p = series(t.sym).p, win = t.dir === 'up' ? p > t.open : p < t.open;
      return `<li class="trade-item">${arrow(t.dir)}<span><strong>${esc(label(a))}</strong><span class="muted">${brl(t.amt)} · ${t.payout}%${t.norisk ? ' · sem risco' : ''}${t.auto ? ' · auto' : ''}</span></span>
        <span class="r ${win ? 'up-txt' : 'down-txt'}">${win ? '+' + brl(Math.round(t.amt * t.payout / 100)) : '−' + brl(t.amt)}<small>${mmss(t.expT - now)}</small></span></li>`;
    }).join('') : '<li class="empty-mini">Nenhuma operação aberta. Escolha a direção e toque em Acima ou Abaixo.</li>';
  } else if (tradeListTab === 'closed') {
    const closed = mine.filter(t => t.status !== 'open').slice(0, 25);
    html = closed.length ? closed.map(t => `<li class="trade-item">${arrow(t.dir)}<span><strong>${esc(label(BY[t.sym] || { sym: t.sym, name: t.sym, market: '' }))}</strong><span class="muted">${fHMS.format(t.expT)} · ${brl(t.amt)}</span></span>
        <span class="r ${t.profit > 0 ? 'up-txt' : t.profit < 0 ? 'down-txt' : ''}">${brlSigned(t.profit)}<small>${t.status === 'win' ? 'Ganho' : t.status === 'loss' ? 'Perda' : 'Empate'}</small></span></li>`).join('') : '<li class="empty-mini">Nenhuma operação encerrada nesta conta.</li>';
  } else {
    html = S.sched.length ? S.sched.map(x => `<li class="trade-item">${arrow(x.dir)}<span><strong>${esc(label(BY[x.sym]))}</strong><span class="muted">${fHMS.format(x.at)} · ${brl(x.amt)} · ${fmtDur(x.expiry)}</span></span>
        <span class="r"><button class="link" type="button" data-unsched="${x.id}">Cancelar</button><small>${mmss(x.at - now)}</small></span></li>`).join('') : '<li class="empty-mini">Nenhuma operação agendada.</li>';
  }
  $('#trade-list').innerHTML = html;
  $$('[data-unsched]').forEach(b => b.onclick = () => { S.sched = S.sched.filter(x => x.id !== b.dataset.unsched); save(); renderTradeList(); });
}
function placeTrade({ sym = S.active, dir, amt = S.amount, expiry = S.expiry, acct = S.acct, auto = false, norisk = false }) {
  const a = BY[sym];
  if (!a) return 'Ativo indisponível.';
  if (!isOpen(a)) return 'Mercado fechado para ' + label(a) + '.';
  if (!a.opts.includes(expiry)) return 'Expiração indisponível para este ativo.';
  if (amt < a.min) return 'O valor mínimo por operação é ' + brl(a.min) + '.';
  if (amt > a.max) return 'O valor máximo por operação é ' + brl(a.max) + '.';
  if (acctBalance(acct) < amt) return acct === 'real' ? 'Saldo insuficiente na conta real. <a href="#deposit">Depositar</a>' : 'Saldo demo insuficiente. Recarregue a conta demo no menu do saldo.';
  let fromBonus = 0;
  if (acct === 'real') {
    const fromReal = Math.min(S.bal.real, amt); fromBonus = amt - fromReal;
    S.bal.real -= fromReal; S.bonus -= fromBonus;
  } else S.bal.demo -= amt;
  let ticket = null;
  if (norisk && acct === 'real' && S.rewards.norisk.length) ticket = S.rewards.norisk.shift();
  const s = series(sym), now = Date.now();
  const t = { id: uid(), sym, dir, amt, acct, payout: effPayout(a), open: s.p, openT: now, exp: expiry, expT: now + expiry * 1000, status: 'open', auto, norisk: !!ticket, noriskLimit: ticket?.limit || 0, fromBonus };
  S.trades.unshift(t);
  S.trades = S.trades.slice(0, 600);
  SFX.place(); save(); updateHeader(); renderTradeList();
  if (ticket) { $('#norisk').checked = false; renderPanel(); }
  return t;
}
function tradeClick(dir) {
  const r = placeTrade({ dir, norisk: $('#norisk').checked });
  if (typeof r === 'string') toast(r, 'bad');
  else toast(`${dir === 'up' ? '▲ Acima' : '▼ Abaixo'} · ${esc(label(BY[r.sym]))} · ${brl(r.amt)} · ${fmtDur(r.exp)}`);
}
function resolveTrades() {
  const now = Date.now();
  let changed = false;
  for (const t of S.trades) {
    if (t.status !== 'open' || now < t.expT) continue;
    if (!BY[t.sym]) { t.status = 'draw'; t.profit = 0; continue; }
    const close = now - t.expT < 2000 ? series(t.sym).p : priceAt(t.sym, t.expT);
    t.close = close; changed = true;
    const won = t.dir === 'up' ? close > t.open : close < t.open;
    const draw = close === t.open;
    let credit = 0;
    if (draw) { t.status = 'draw'; credit = t.amt; t.profit = 0; }
    else if (won) { const gain = Math.round(t.amt * t.payout / 100); t.status = 'win'; credit = t.amt + gain; t.profit = gain; }
    else { t.status = 'loss'; const refund = t.norisk ? Math.min(t.amt, t.noriskLimit) : 0; credit = refund; t.profit = refund - t.amt; t.refund = refund; }
    if (t.acct === 'real') S.bal.real += credit; else S.bal.demo += credit;
    if (t.auto && S.auto) autoResult(t);
    if (now - t.expT < 5000) showResult(t);
  }
  if (changed) { save(); updateHeader(); renderTradeList(); }
}
function showResult(t) {
  const el = $('#result-pop');
  const win = t.status === 'win', loss = t.status === 'loss';
  el.className = 'result-pop ' + (win ? 'win' : loss ? 'loss' : '');
  el.innerHTML = `<span class="muted">${esc(label(BY[t.sym]))} · ${t.acct === 'real' ? 'conta real' : 'conta demo'}</span><span class="big">${brlSigned(t.profit)}</span><span class="muted">${win ? 'Você acertou a direção' : loss ? (t.norisk ? 'Operação sem risco: valor devolvido' : 'Não foi desta vez') : 'Empate: valor devolvido'}</span>`;
  el.hidden = false;
  clearTimeout(showResult.t); showResult.t = setTimeout(() => { el.hidden = true; }, 3200);
  win ? SFX.win() : loss ? SFX.loss() : SFX.place();
}

/* agendamento */
function openSchedule() {
  const a = BY[S.active];
  const d = new Date(Date.now() + 120000);
  const hhmm = fHM.format(d);
  const m = openModal(`
    <div class="modal-head"><h2>Agendar operação</h2><button class="x" data-close aria-label="Fechar">×</button></div>
    <p class="muted" style="margin:0">A operação abre sozinha no horário escolhido (Brasília), se houver saldo e o mercado estiver aberto.</p>
    <form class="form" id="sched-form">
      <div class="grid-2">
        <label class="field"><span class="label">Ativo</span><select class="input" id="sc-sym">${ASSETS.filter(x => x.opts.length).map(x => `<option value="${x.sym}" ${x.sym === a.sym ? 'selected' : ''}>${esc(label(x))}${x.otc ? ' (OTC)' : ''}</option>`).join('')}</select></label>
        <label class="field"><span class="label">Horário</span><input class="input" id="sc-time" type="time" step="1" value="${hhmm}" required></label>
        <label class="field"><span class="label">Valor (R$)</span><input class="input" id="sc-amt" inputmode="decimal" value="${(S.amount / 100).toFixed(2).replace('.', ',')}"></label>
        <label class="field"><span class="label">Expiração</span><select class="input" id="sc-exp"></select></label>
      </div>
      <div class="grid-2"><button class="btn-up" type="submit" data-dir="up">Acima</button><button class="btn-down" type="submit" data-dir="down">Abaixo</button></div>
      <p class="err" id="sc-err"></p>
    </form>`);
  const fillExp = () => { const x = BY[$('#sc-sym', m.el).value]; $('#sc-exp', m.el).innerHTML = x.opts.map(o => `<option value="${o}" ${o === S.expiry ? 'selected' : ''}>${fmtDur(o)}</option>`).join(''); };
  fillExp(); $('#sc-sym', m.el).onchange = fillExp;
  let dir = 'up';
  $$('[data-dir]', m.el).forEach(b => b.addEventListener('click', () => { dir = b.dataset.dir; }));
  $('#sched-form', m.el).addEventListener('submit', e => {
    e.preventDefault();
    const [h, mi, se] = $('#sc-time', m.el).value.split(':').map(Number);
    const nowParts = fHMS.format(new Date()).split(':').map(Number);
    let diff = ((h - nowParts[0]) * 3600 + (mi - nowParts[1]) * 60 + ((se || 0) - nowParts[2])) * 1000;
    if (diff <= 0) diff += 864e5;
    const amt = parseBRL($('#sc-amt', m.el).value), sym = $('#sc-sym', m.el).value, x = BY[sym];
    if (!(amt >= x.min && amt <= x.max)) { $('#sc-err', m.el).textContent = `Informe um valor entre ${brl(x.min)} e ${brl(x.max)}.`; return; }
    S.sched.push({ id: uid(), sym, dir, amt, expiry: +$('#sc-exp', m.el).value, at: Date.now() + diff, acct: S.acct });
    S.sched.sort((p, q) => p.at - q.at);
    save(); tradeListTab = 'sched'; renderTradeList(); m.close();
    toast(`Operação agendada para ${fHMS.format(Date.now() + diff)}.`, 'ok');
  });
}
function runSchedules() {
  const now = Date.now();
  const due = S.sched.filter(x => x.at <= now);
  if (!due.length) return;
  S.sched = S.sched.filter(x => x.at > now);
  for (const x of due) {
    const r = placeTrade({ sym: x.sym, dir: x.dir, amt: x.amt, expiry: x.expiry, acct: x.acct });
    if (typeof r === 'string') notify('Agendamento não executado', r.replace(/<[^>]+>/g, ''));
    else toast('Operação agendada executada: ' + esc(label(BY[x.sym])), 'ok');
  }
  save(); renderTradeList();
}

/* auto-trade */
const STRATS = { trend: 'Seguir a tendência', contra: 'Contra a tendência', alt: 'Alternar direções', rand: 'Direção aleatória' };
function openAuto() {
  const a = BY[S.active];
  const m = openModal(`
    <div class="modal-head"><h2>Auto-trade</h2><button class="x" data-close aria-label="Fechar">×</button></div>
    <p class="muted" style="margin:0">Abre operações em sequência em ${esc(label(a))}, uma por vez, até atingir a quantidade ou um dos limites.</p>
    <form class="form" id="auto-form">
      <div class="grid-2">
        <label class="field"><span class="label">Estratégia</span><select class="input" id="au-st">${Object.entries(STRATS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
        <label class="field"><span class="label">Valor por operação (R$)</span><input class="input" id="au-amt" inputmode="decimal" value="${(S.amount / 100).toFixed(2).replace('.', ',')}"></label>
        <label class="field"><span class="label">Expiração</span><select class="input" id="au-exp">${a.opts.filter(o => o <= 300).map(o => `<option value="${o}" ${o === S.expiry ? 'selected' : ''}>${fmtDur(o)}</option>`).join('')}</select></label>
        <label class="field"><span class="label">Quantidade de operações</span><input class="input" id="au-n" type="number" min="1" max="100" value="10"></label>
        <label class="field"><span class="label">Parar ao lucrar (R$)</span><input class="input" id="au-sw" inputmode="decimal" value="50,00"></label>
        <label class="field"><span class="label">Parar ao perder (R$)</span><input class="input" id="au-sl" inputmode="decimal" value="50,00"></label>
      </div>
      <p class="hint">Conta usada: <b>${S.acct === 'real' ? 'real' : 'demo'}</b>. Resultados passados não garantem resultados futuros.</p>
      <p class="err" id="au-err"></p>
      <button class="btn btn-primary" type="submit">Iniciar auto-trade</button>
    </form>`);
  $('#auto-form', m.el).addEventListener('submit', e => {
    e.preventDefault();
    const amt = parseBRL($('#au-amt', m.el).value);
    if (!(amt >= a.min && amt <= a.max)) { $('#au-err', m.el).textContent = `Informe um valor entre ${brl(a.min)} e ${brl(a.max)}.`; return; }
    if (!isOpen(a)) { $('#au-err', m.el).textContent = 'O mercado deste ativo está fechado.'; return; }
    S.auto = { running: true, sym: a.sym, acct: S.acct, strat: $('#au-st', m.el).value, amt, expiry: +$('#au-exp', m.el).value, total: clamp(+$('#au-n', m.el).value || 10, 1, 100), done: 0, wins: 0, losses: 0, net: 0, stopWin: parseBRL($('#au-sw', m.el).value) || 0, stopLoss: parseBRL($('#au-sl', m.el).value) || 0, nextAt: Date.now(), last: 'down', msg: '' };
    save(); renderAutoCard(); m.close(); toast('Auto-trade iniciado.', 'ok');
  });
}
function autoTick() {
  const A = S.auto;
  if (!A?.running || Date.now() < A.nextAt) return;
  if (S.trades.some(t => t.auto && t.status === 'open')) return;
  const s = series(A.sym), b = s.bars, ref = b[Math.max(0, b.length - 26)].c;
  let dir;
  if (A.strat === 'trend') dir = s.p >= ref ? 'up' : 'down';
  else if (A.strat === 'contra') dir = s.p >= ref ? 'down' : 'up';
  else if (A.strat === 'alt') dir = A.last === 'up' ? 'down' : 'up';
  else dir = Math.random() < 0.5 ? 'up' : 'down';
  A.last = dir;
  const r = placeTrade({ sym: A.sym, dir, amt: A.amt, expiry: A.expiry, acct: A.acct, auto: true });
  if (typeof r === 'string') { A.running = false; A.msg = r.replace(/<[^>]+>/g, ''); notify('Auto-trade parado', A.msg); }
  A.nextAt = Date.now() + 1500;
  save(); renderAutoCard();
}
function autoResult(t) {
  const A = S.auto; if (!A) return;
  A.done++; A.net += t.profit; t.status === 'win' ? A.wins++ : t.status === 'loss' && A.losses++;
  let why = '';
  if (A.done >= A.total) why = 'Quantidade de operações concluída.';
  else if (A.stopWin && A.net >= A.stopWin) why = 'Meta de lucro atingida.';
  else if (A.stopLoss && -A.net >= A.stopLoss) why = 'Limite de perda atingido.';
  if (why) { A.running = false; A.msg = why; notify('Auto-trade finalizado', `${why} Resultado: ${brlSigned(A.net)}.`); }
  A.nextAt = Date.now() + 1500;
  renderAutoCard();
}
function renderAutoCard() {
  const A = S.auto, el = $('#auto-card');
  if (!A) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<div class="row"><b>Auto-trade · ${esc(label(BY[A.sym]))}</b><span class="pill ${A.running ? 'ok' : ''}">${A.running ? 'Ativo' : 'Parado'}</span></div>
    <div class="row"><span class="muted">${STRATS[A.strat]} · ${brl(A.amt)} · ${fmtDur(A.expiry)}</span></div>
    <div class="row"><span>${A.done}/${A.total} · ${A.wins}G ${A.losses}P</span><b class="${A.net >= 0 ? 'up-txt' : 'down-txt'} mono">${brlSigned(A.net)}</b></div>
    ${A.msg ? `<div class="muted">${esc(A.msg)}</div>` : ''}
    <div class="row"><button class="link" type="button" id="auto-toggle">${A.running ? 'Parar' : 'Fechar'}</button></div>`;
  $('#auto-toggle').onclick = () => { if (S.auto.running) { S.auto.running = false; S.auto.msg = 'Parado por você.'; } else S.auto = null; save(); renderAutoCard(); };
}

/* sentimento */
function updateSentiment() {
  const s = series(S.active), b = s.bars, ref = b[Math.max(0, b.length - 60)].c;
  const tr = (s.p - ref) / ref / sigmaOf(BY[S.active]) / 8;
  const up = clamp(Math.round(50 + tr * 12 + (Math.random() - 0.5) * 8), 18, 82);
  $('#sent-up').textContent = up + '%'; $('#sent-down').textContent = (100 - up) + '%'; $('#sent-fill').style.width = up + '%';
}

/* ---------- páginas ---------- */
const PAGE = $('#page');
function subnav(items, cur) { return `<nav class="subnav">${items.map(([h, l]) => `<a href="#${h}" class="${h === cur ? 'on' : ''}">${l}</a>`).join('')}</nav>`; }

function pageHistory(sub) {
  sub = sub || 'trades';
  const f = pageHistory.f || (pageHistory.f = { acct: 'all', period: '7', res: 'all', sym: 'all' });
  let body;
  if (sub === 'trades') {
    const since = f.period === 'all' ? 0 : Date.now() - (+f.period) * 864e5;
    const list = S.trades.filter(t => t.status !== 'open' && (f.acct === 'all' || t.acct === f.acct) && t.openT >= since && (f.res === 'all' || t.status === f.res) && (f.sym === 'all' || t.sym === f.sym));
    const wins = list.filter(t => t.status === 'win').length, vol = list.reduce((s, t) => s + t.amt, 0), net = list.reduce((s, t) => s + t.profit, 0);
    const syms = [...new Set(S.trades.map(t => t.sym))];
    body = `
      <div class="filters">
        <select class="input" id="hf-acct"><option value="all">Todas as contas</option><option value="demo">Conta demo</option><option value="real">Conta real</option></select>
        <select class="input" id="hf-period"><option value="1">Hoje</option><option value="7">7 dias</option><option value="30">30 dias</option><option value="all">Tudo</option></select>
        <select class="input" id="hf-res"><option value="all">Todos os resultados</option><option value="win">Ganhos</option><option value="loss">Perdas</option><option value="draw">Empates</option></select>
        <select class="input" id="hf-sym"><option value="all">Todos os ativos</option>${syms.map(s => `<option value="${s}">${esc(BY[s] ? label(BY[s]) + (BY[s].otc ? ' OTC' : '') : s)}</option>`).join('')}</select>
      </div>
      <div class="stats">
        <div class="stat"><span>Operações</span><strong>${list.length}</strong></div>
        <div class="stat"><span>Taxa de acerto</span><strong>${list.length ? Math.round(wins / list.length * 100) : 0}%</strong></div>
        <div class="stat"><span>Volume</span><strong>${brl(vol)}</strong></div>
        <div class="stat"><span>Resultado</span><strong class="${net > 0 ? 'up-txt' : net < 0 ? 'down-txt' : ''}">${brlSigned(net)}</strong></div>
      </div>
      ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Ativo</th><th>Direção</th><th class="num">Valor</th><th class="num">Abertura</th><th class="num">Fechamento</th><th>Expiração</th><th>Conta</th><th class="num">Resultado</th></tr></thead><tbody>
        ${list.slice(0, 200).map(t => { const a = BY[t.sym]; return `<tr><td class="mono">${fDT.format(t.openT)}</td><td>${a ? esc(label(a)) + (a.otc ? ' <span class="pill">OTC</span>' : '') : esc(t.sym)}</td>
          <td class="${t.dir === 'up' ? 'up-txt' : 'down-txt'}">${t.dir === 'up' ? '▲ Acima' : '▼ Abaixo'}</td><td class="num mono">${brl(t.amt)}</td>
          <td class="num mono">${a ? fmtP(a, t.open) : t.open}</td><td class="num mono">${a ? fmtP(a, t.close) : t.close}</td><td>${fmtDur(t.exp)}</td><td>${t.acct === 'real' ? 'Real' : 'Demo'}</td>
          <td class="num mono ${t.profit > 0 ? 'up-txt' : t.profit < 0 ? 'down-txt' : ''}">${brlSigned(t.profit)}</td></tr>`; }).join('')}
        </tbody></table></div>` : '<div class="card empty"><b>Nenhuma operação encontrada</b><span>Ajuste os filtros ou abra sua primeira operação.</span><a class="btn btn-primary btn-sm" href="#trade">Negociar</a></div>'}`;
  } else {
    const KIND = { deposit: 'Depósito', withdraw: 'Saque', bonus: 'Bônus' }, ST = { paid: ['Concluído', 'ok'], pending: ['Em análise', 'warn'], canceled: ['Cancelado', 'bad'] };
    body = S.tx.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Método</th><th class="num">Valor</th><th>Status</th></tr></thead><tbody>
      ${S.tx.map(t => `<tr><td class="mono">${fDT.format(t.t)}</td><td>${KIND[t.kind]}</td><td>${esc(t.method || 'PIX')}</td><td class="num mono">${brl(t.amt)}</td><td><span class="pill ${ST[t.status][1]}">${ST[t.status][0]}</span></td></tr>`).join('')}
      </tbody></table></div>` : '<div class="card empty"><b>Nenhuma transação</b><span>Depósitos e saques aparecem aqui.</span><a class="btn btn-primary btn-sm" href="#deposit">Depositar</a></div>';
  }
  PAGE.innerHTML = `<div class="page-inner"><div><h1>Histórico</h1><p class="lede">Operações encerradas e movimentações das suas contas.</p></div>
    ${subnav([['history', 'Operações'], ['history/tx', 'Transações']], sub === 'trades' ? 'history' : 'history/tx')}${body}</div>`;
  if (sub === 'trades') {
    [['acct', 'hf-acct'], ['period', 'hf-period'], ['res', 'hf-res'], ['sym', 'hf-sym']].forEach(([k, id]) => {
      const el = $('#' + id); el.value = f[k]; el.onchange = () => { f[k] = el.value; pageHistory('trades'); };
    });
  }
}

const COUPONS = { PRIMEIRODEPOSITO: { percent: 100, cap: 100000, ftdOnly: true, label: 'Bônus de primeiro depósito' } };
function couponInfo(code) {
  code = code.trim().toUpperCase();
  if (!code) return null;
  if (COUPONS[code]) return COUPONS[code].ftdOnly && S.ftd ? { error: 'Este cupom vale apenas para o primeiro depósito.' } : { code, ...COUPONS[code] };
  const own = S.rewards.coupons.find(c => c.code === code && !c.used);
  if (own) return { code, percent: own.percent, cap: own.cap, label: 'Cupom de prêmio' };
  return { error: 'Cupom inválido ou já utilizado.' };
}
function pageDeposit() {
  const st = pageDeposit.st || (pageDeposit.st = { amt: 10000, coupon: S.ftd ? '' : 'PRIMEIRODEPOSITO' });
  const MIN = 6000, MAX = 5000000;
  const draw = () => {
    const c = couponInfo(st.coupon);
    const bonus = c && !c.error ? Math.min(Math.round(st.amt * c.percent / 100), c.cap) : 0;
    const { tier, total } = vipTier();
    const next = TIERS.find(t => t.min > total);
    PAGE.innerHTML = `<div class="page-inner"><div><h1>Depositar</h1><p class="lede">Escolha o valor, aplique um cupom e confirme com PIX.</p></div>
      <div class="banner"><span><b>Modo simulação.</b> Nenhuma cobrança PIX é gerada e nenhum dinheiro real é recebido. O valor é creditado na conta real simulada.</span></div>
      <div class="grid-2">
        <div class="card">
          <h2>Valor</h2>
          <div class="amount-grid">${[6000, 10000, 25000, 50000, 100000, 250000].map(v => `<button type="button" class="${v === st.amt ? 'on' : ''}" data-dv="${v}">${brl(v)}</button>`).join('')}</div>
          <label class="field"><span class="label">Outro valor</span><input class="input mono" id="dep-amt" inputmode="decimal" value="${(st.amt / 100).toFixed(2).replace('.', ',')}"></label>
          <p class="hint">Mínimo ${brl(MIN)} · máximo ${brl(MAX)} por depósito.</p>
          <h2>Método</h2>
          <div class="method"><span class="logo">PIX</span><span><b>PIX</b><br><small class="muted">Crédito imediato · sem taxa</small></span><span class="pill ok" style="margin-left:auto">Selecionado</span></div>
          <div class="grid-2">
            <div class="method off"><span class="logo" style="background:var(--raise);color:var(--muted)">₿</span><span><b>Cripto</b><br><small class="muted">Indisponível</small></span></div>
            <div class="method off"><span class="logo" style="background:var(--raise);color:var(--muted)">$</span><span><b>Cartão</b><br><small class="muted">Indisponível</small></span></div>
          </div>
        </div>
        <div class="card">
          <h2>Cupom</h2>
          <form class="form" id="cp-form" style="grid-template-columns:1fr auto;display:grid;gap:8px">
            <input class="input mono" id="dep-coupon" placeholder="Código do cupom" value="${esc(st.coupon)}" autocomplete="off">
            <button class="btn" type="submit">Aplicar</button>
          </form>
          ${c?.error ? `<p class="err">${esc(c.error)}</p>` : c ? `<p class="hint up-txt">${esc(c.label)}: +${c.percent}% até ${brl(c.cap)}.</p>` : ''}
          <div class="chips">${[!S.ftd && 'PRIMEIRODEPOSITO', ...S.rewards.coupons.filter(x => !x.used).map(x => x.code)].filter(Boolean).map(k => `<button type="button" class="chip" data-cp="${k}">${k}</button>`).join('')}</div>
          <h2>Resumo</h2>
          <div class="summary">
            <div><span class="muted">Depósito</span><span class="mono">${brl(st.amt)}</span></div>
            <div><span class="muted">Bônus</span><span class="mono up-txt">+${brl(bonus)}</span></div>
            <div class="total"><span>Total na conta</span><span class="mono">${brl(st.amt + bonus)}</span></div>
          </div>
          <p class="hint">O bônus pode ser usado para operar, mas não pode ser sacado.</p>
          ${(window.PREGAO_CONFIG || {}).n8nWebhookUrl ? (S.user?.email ? `<p class="hint">Você recebe um aviso em ${esc(S.user.email)} quando o saldo cair.</p>` : '<p class="hint">Cadastre seu e-mail em <a href="#account">Conta</a> para receber o aviso do depósito.</p>') : ''}
          <button class="btn btn-primary" type="button" id="dep-go" ${st.amt < MIN || st.amt > MAX ? 'disabled' : ''}>Depositar ${brl(st.amt)}</button>
          <p class="hint">Nível ${tier.name}${next ? ` · faltam ${brl(next.min - total)} em depósitos nos últimos 30 dias para o nível ${next.name}` : ''}. <a href="#account/vip">Programa VIP</a></p>
        </div>
      </div>
      ${S.tx.filter(t => t.kind === 'deposit').length ? `<div class="card"><h2>Últimos depósitos</h2><div class="inv">${S.tx.filter(t => t.kind === 'deposit').slice(0, 5).map(t => `<div class="inv-item"><span>${fDT.format(t.t)} · PIX</span><b class="mono">${brl(t.amt)}</b></div>`).join('')}</div></div>` : ''}
    </div>`;
    $$('[data-dv]').forEach(b => b.onclick = () => { st.amt = +b.dataset.dv; draw(); });
    $('#dep-amt').onchange = e => { const v = parseBRL(e.target.value); if (v) st.amt = v; draw(); };
    $('#cp-form').onsubmit = e => { e.preventDefault(); st.coupon = $('#dep-coupon').value.trim().toUpperCase(); draw(); };
    $$('[data-cp]').forEach(b => b.onclick = () => { st.coupon = b.dataset.cp; draw(); });
    $('#dep-go').onclick = () => confirmDeposit(st.amt, c && !c.error ? c : null, bonus);
  };
  draw();
}
/* aviso de depósito simulado por e-mail via webhook do n8n */
async function sendDepositWebhook(amt, bonus) {
  const url = (window.PREGAO_CONFIG || {}).n8nWebhookUrl;
  const email = S.user?.email;
  if (!url || !email) return false;
  const payload = {
    evento: 'deposito_simulado',
    simulacao: true,
    usuario: { id: S.user.id, nome: [S.user.first, S.user.last].filter(Boolean).join(' '), email },
    valor: amt / 100,
    valor_formatado: brl(amt),
    bonus: bonus / 100,
    bonus_formatado: brl(bonus),
    saldo: acctBalance('real') / 100,
    saldo_formatado: brl(acctBalance('real')),
    data: new Date().toISOString()
  };
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return r.ok;
  } catch {
    return false;
  }
}
function confirmDeposit(amt, coupon, bonus) {
  const m = openModal(`<div class="modal-head"><h2>Processando PIX</h2></div>
    <div class="empty" id="dep-step"><b>Gerando cobrança simulada…</b><span>${brl(amt)}</span></div>`, { locked: true });
  setTimeout(() => {
    S.bal.real += amt; S.bonus += bonus;
    const first = !S.ftd; S.ftd = true;
    S.tx.unshift({ id: uid(), kind: 'deposit', amt, status: 'paid', t: Date.now(), method: 'PIX' });
    if (bonus) S.tx.unshift({ id: uid(), kind: 'bonus', amt: bonus, status: 'paid', t: Date.now(), method: coupon.code });
    if (coupon) { const own = S.rewards.coupons.find(x => x.code === coupon.code && !x.used); if (own) own.used = true; }
    if (first) { S.rewards.scratch++; }
    pageDeposit.st = null;
    S.acct = 'real';
    save(); updateHeader(); renderPanel(); SFX.deposit();
    notify('Depósito confirmado', `${brl(amt)} creditados na conta real${bonus ? ' + ' + brl(bonus) + ' de bônus' : ''}.`);
    $('#dep-step', m.el).innerHTML = `<b class="up-txt" style="font-size:22px">Depósito confirmado</b><span>${brl(amt)} na conta real${bonus ? ` · bônus ${brl(bonus)}` : ''}${first ? ' · você ganhou uma raspadinha' : ''}.</span>
      <div class="filters" style="justify-content:center"><a class="btn btn-primary" href="#trade" data-close>Negociar agora</a><button class="btn" type="button" data-close>Fechar</button></div>`;
    $$('[data-close]', m.el).forEach(b => b.addEventListener('click', m.close));
    if (location.hash === '#deposit') pageDeposit();
    sendDepositWebhook(amt, bonus).then(ok => {
      if (ok) toast(`Aviso do depósito enviado para ${esc(S.user.email)}.`, 'ok');
      else if ((window.PREGAO_CONFIG || {}).n8nWebhookUrl && S.user?.email) toast('Não foi possível enviar o aviso por e-mail. Confira a URL do webhook do n8n.', 'bad');
    });
  }, 1800);
}

function pageWithdraw() {
  const MIN = 5000;
  const today = S.tx.filter(t => t.kind === 'withdraw' && t.status !== 'canceled' && Date.now() - t.t < 864e5).length;
  PAGE.innerHTML = `<div class="page-inner"><div><h1>Sacar</h1><p class="lede">Transfira o saldo da conta real para sua chave PIX.</p></div>
    <div class="banner"><span><b>Modo simulação.</b> O saque é registrado e aprovado automaticamente, sem transferência real.</span></div>
    <div class="grid-2">
      <div class="card">
        <div class="stats" style="grid-template-columns:1fr 1fr">
          <div class="stat"><span>Disponível para saque</span><strong>${brl(S.bal.real)}</strong></div>
          <div class="stat"><span>Bônus (não sacável)</span><strong>${brl(S.bonus)}</strong></div>
        </div>
        <form class="form" id="wd-form">
          <label class="field"><span class="label">Tipo de chave PIX</span><select class="input" id="wd-type"><option>CPF</option><option>E-mail</option><option>Telefone</option><option>Chave aleatória</option></select></label>
          <label class="field"><span class="label">Chave PIX</span><input class="input" id="wd-key" required autocomplete="off" placeholder="Informe a chave"></label>
          <label class="field"><span class="label">Valor (R$)</span><input class="input mono" id="wd-amt" inputmode="decimal" required placeholder="0,00"></label>
          <p class="hint">Valor mínimo ${brl(MIN)} · 1 saque por dia · análise em até ${vipTier().tier.id === 'vip' ? '1 hora' : vipTier().tier.id === 'pro' ? '6 horas' : '24 horas'}.</p>
          <p class="err" id="wd-err"></p>
          <button class="btn btn-primary" type="submit" ${today ? 'disabled' : ''}>${today ? 'Limite diário atingido' : 'Solicitar saque'}</button>
        </form>
      </div>
      <div class="card"><h2>Solicitações</h2>
        ${S.tx.filter(t => t.kind === 'withdraw').length ? `<div class="inv">${S.tx.filter(t => t.kind === 'withdraw').slice(0, 8).map(t => `<div class="inv-item"><span>${fDT.format(t.t)}<br><small class="muted">${esc(t.method)}</small></span><span style="text-align:right"><b class="mono">${brl(t.amt)}</b><br>
          ${t.status === 'pending' ? `<span class="pill warn">Em análise</span> <button class="link" type="button" data-cancel="${t.id}">Cancelar</button>` : t.status === 'paid' ? '<span class="pill ok">Pago</span>' : '<span class="pill bad">Cancelado</span>'}</span></div>`).join('')}</div>` : '<p class="muted">Nenhum saque solicitado.</p>'}
      </div>
    </div></div>`;
  $('#wd-form').onsubmit = e => {
    e.preventDefault();
    const amt = parseBRL($('#wd-amt').value), key = $('#wd-key').value.trim();
    const err = !key ? 'Informe a chave PIX.' : !(amt >= MIN) ? `O valor mínimo é ${brl(MIN)}.` : amt > S.bal.real ? 'Valor maior que o saldo disponível para saque.' : '';
    if (err) { $('#wd-err').textContent = err; return; }
    S.bal.real -= amt;
    const t = { id: uid(), kind: 'withdraw', amt, status: 'pending', t: Date.now(), method: 'PIX · ' + $('#wd-type').value };
    S.tx.unshift(t); save(); updateHeader(); toast('Saque solicitado. Acompanhe o status nesta página.', 'ok');
    setTimeout(() => { if (t.status === 'pending') { const x = S.tx.find(y => y.id === t.id); if (x && x.status === 'pending') { x.status = 'paid'; save(); notify('Saque pago', `${brl(amt)} enviados para sua chave PIX (simulação).`); if (location.hash === '#withdraw') pageWithdraw(); } } }, 15000);
    pageWithdraw();
  };
  $$('[data-cancel]').forEach(b => b.onclick = () => { const t = S.tx.find(x => x.id === b.dataset.cancel); if (t?.status === 'pending') { t.status = 'canceled'; S.bal.real += t.amt; save(); updateHeader(); pageWithdraw(); } });
}

/* prêmios: roleta, raspadinha, cupons */
const WHEEL = [
  { k: 'spin1', label: '+1 giro', w: 12 },
  { k: 'norisk', label: 'Sem risco', w: 22 },
  { k: 'empty', label: 'Vazio', w: 30 },
  { k: 'coupon', label: 'ROLETA100', w: 14 },
  { k: 'norisk2', label: '2× sem risco', w: 10 },
  { k: 'spin2', label: '+2 giros', w: 6 },
  { k: 'boost', label: 'Boost OTC', w: 6 }
];
const SCRATCH = [
  { k: 'empty', label: 'Não foi desta vez', w: 30 },
  { k: 'boost', label: 'Boost OTC +2% por 1 hora', w: 25 },
  { k: 'coupon100', label: 'Cupom TRADE100', w: 20 },
  { k: 'norisk', label: 'Operação sem risco', w: 25 }
];
function pickW(list) { let r = Math.random() * list.reduce((s, x) => s + x.w, 0); return list.find(x => (r -= x.w) < 0) || list[0]; }
function grant(k, src) {
  const R = S.rewards;
  const msgs = {
    spin1: () => { R.spins += 1; return '1 giro extra na roleta'; },
    spin2: () => { R.spins += 2; return '2 giros extras na roleta'; },
    norisk: () => { R.norisk.push({ id: uid(), limit: 5000, src }); return 'Operação sem risco (até R$ 50,00)'; },
    norisk2: () => { R.norisk.push({ id: uid(), limit: 5000, src }, { id: uid(), limit: 5000, src }); return '2 operações sem risco'; },
    coupon: () => { R.coupons.push({ code: 'ROLETA100', percent: 100, cap: 50000, used: false, src }); return 'Cupom ROLETA100: +100% no depósito, até R$ 500'; },
    coupon100: () => { R.coupons.push({ code: 'TRADE100', percent: 100, cap: 50000, used: false, src }); return 'Cupom TRADE100: +100% no depósito, até R$ 500'; },
    boost: () => { R.boosts.push({ pct: 2, until: Date.now() + 36e5 }); return 'Boost de +2% no retorno dos ativos OTC por 1 hora'; },
    empty: () => ''
  };
  const m = msgs[k]();
  if (m) { R.log.unshift({ t: Date.now(), m, src }); notify('Prêmio recebido', m); }
  save(); updateHeader(); renderPanel(); renderTabs();
  return m;
}
function pageRewards() {
  const R = S.rewards;
  PAGE.innerHTML = `<div class="page-inner"><div><h1>Prêmios</h1><p class="lede">Gire a roleta, raspe cartelas e use operações sem risco, boosts e cupons de depósito.</p></div>
    ${!S.user?.phoneVerified ? '<div class="banner"><span><b>Valide seu número e ganhe 1 giro na roleta.</b></span><a class="btn btn-sm btn-primary" href="#account/verify">Validar telefone</a></div>' : ''}
    <div class="grid-2">
      <div class="card"><div class="filters" style="justify-content:space-between"><h2>Roleta Standard</h2><span class="pill warn">${R.spins} giro${R.spins === 1 ? '' : 's'}</span></div>
        <div class="wheel-wrap"><span class="wheel-pin"></span><canvas id="wheel" width="680" height="680"></canvas>
        <button class="btn btn-primary" type="button" id="spin" ${R.spins ? '' : 'disabled'}>${R.spins ? 'Girar a roleta' : 'Sem giros disponíveis'}</button>
        <p class="hint" id="spin-res" aria-live="polite"></p></div></div>
      <div class="card"><div class="filters" style="justify-content:space-between"><h2>Raspadinha secreta</h2><span class="pill warn">${R.scratch} cartela${R.scratch === 1 ? '' : 's'}</span></div>
        <div id="scratch-box">${R.scratch ? '' : '<div class="empty"><b>Nenhuma cartela</b><span>Você ganha uma raspadinha no primeiro depósito.</span></div>'}</div>
      </div>
    </div>
    <div class="grid-3">
      <div class="card"><h2>Operações sem risco</h2>${R.norisk.length ? `<div class="inv">${R.norisk.map(n => `<div class="inv-item"><span>Devolve a perda até</span><b class="mono">${brl(n.limit)}</b></div>`).join('')}</div><p class="hint">Use na boleta da conta real marcando “Operação sem risco”.</p>` : '<p class="muted">Nenhuma disponível.</p>'}</div>
      <div class="card"><h2>Boosts ativos</h2>${R.boosts.filter(b => b.until > Date.now()).length ? `<div class="inv">${R.boosts.filter(b => b.until > Date.now()).map(b => `<div class="inv-item"><span>+${b.pct}% em ativos OTC</span><b class="mono">${mmss(b.until - Date.now())}</b></div>`).join('')}</div>` : '<p class="muted">Nenhum boost ativo.</p>'}</div>
      <div class="card"><h2>Cupons</h2>${R.coupons.length ? `<div class="inv">${R.coupons.map(c => `<div class="inv-item"><span class="mono">${c.code}</span>${c.used ? '<span class="pill">Usado</span>' : '<a class="pill ok" href="#deposit">Usar</a>'}</div>`).join('')}</div>` : '<p class="muted">Nenhum cupom.</p>'}</div>
    </div>
    ${R.log.length ? `<div class="card"><h2>Prêmios recebidos</h2><div class="inv">${R.log.slice(0, 10).map(l => `<div class="inv-item"><span>${esc(l.m)}</span><span class="muted mono">${fDT.format(l.t)}</span></div>`).join('')}</div></div>` : ''}
  </div>`;
  drawWheel(0);
  $('#spin').onclick = spinWheel;
  if (R.scratch) buildScratch();
}
function drawWheel(rot) {
  const c = $('#wheel'); if (!c) return;
  const x = c.getContext('2d'), r = c.width / 2, n = WHEEL.length, seg = Math.PI * 2 / n;
  readColors();
  const fills = [CH.col.accent, CH.col['panel-2'], CH.col.up, CH.col.raise, CH.col.down, CH.col['panel-2'], CH.col.raise];
  x.clearRect(0, 0, c.width, c.height);
  x.save(); x.translate(r, r); x.rotate(rot);
  WHEEL.forEach((w, i) => {
    x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, r - 8, i * seg - Math.PI / 2, (i + 1) * seg - Math.PI / 2); x.closePath();
    x.fillStyle = fills[i % fills.length]; x.fill(); x.strokeStyle = CH.col.line; x.lineWidth = 3; x.stroke();
    x.save(); x.rotate(i * seg + seg / 2 - Math.PI / 2); x.textAlign = 'right'; x.textBaseline = 'middle';
    x.fillStyle = i === 0 ? CH.col['accent-ink'] : CH.col.fg; x.font = '600 30px "IBM Plex Sans", sans-serif';
    x.fillText(w.label, r - 36, 0); x.restore();
  });
  x.beginPath(); x.arc(0, 0, 54, 0, 7); x.fillStyle = CH.col.accent; x.fill();
  x.restore();
  x.beginPath(); x.arc(r, r, r - 4, 0, 7); x.strokeStyle = CH.col.accent; x.lineWidth = 8; x.stroke();
}
function spinWheel() {
  if (!S.rewards.spins || spinWheel.busy) return;
  spinWheel.busy = true; S.rewards.spins--; save(); updateHeader();
  $('#spin').disabled = true;
  const prize = pickW(WHEEL), i = WHEEL.indexOf(prize), seg = Math.PI * 2 / WHEEL.length;
  const target = Math.PI * 2 * 6 - (i * seg + seg / 2) + (Math.random() - 0.5) * seg * 0.6;
  const t0 = performance.now(), dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 4200;
  let lastSeg = -1;
  const anim = now => {
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4), rot = target * e;
    drawWheel(rot);
    const cur = Math.floor(rot / seg); if (cur !== lastSeg) { lastSeg = cur; SFX.spin(); }
    if (p < 1) return requestAnimationFrame(anim);
    spinWheel.busy = false;
    const msg = grant(prize.k, 'Roleta Standard');
    if (msg) SFX.win(); else SFX.loss();
    pageRewards();
    $('#spin-res').textContent = msg ? 'Você ganhou: ' + msg + '.' : 'Vazio. Tente no próximo giro.';
  };
  requestAnimationFrame(anim);
}
function buildScratch() {
  const prize = pickW(SCRATCH);
  $('#scratch-box').innerHTML = `<div class="scratch"><div class="prize"><div><strong>${esc(prize.label)}</strong><span class="muted">Raspe toda a área para revelar</span></div></div><canvas id="scratch-cv"></canvas></div>
    <p class="hint" style="text-align:center">Arraste o dedo ou o mouse sobre a cartela.</p>`;
  const cv = $('#scratch-cv'), r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = r.width * dpr; cv.height = r.height * dpr;
  const x = cv.getContext('2d'); x.scale(dpr, dpr);
  const g = x.createLinearGradient(0, 0, r.width, r.height);
  g.addColorStop(0, '#b8bcc8'); g.addColorStop(0.5, '#e4e6ec'); g.addColorStop(1, '#9ea3b2');
  x.fillStyle = g; x.fillRect(0, 0, r.width, r.height);
  x.fillStyle = 'rgba(30,34,48,.55)'; x.font = '700 18px Sora, sans-serif'; x.textAlign = 'center';
  x.fillText('RASPE AQUI', r.width / 2, r.height / 2 + 6);
  x.globalCompositeOperation = 'destination-out';
  let down = false, done = false;
  const scratch = e => {
    if (!down || done) return;
    const b = cv.getBoundingClientRect();
    x.beginPath(); x.arc(e.clientX - b.left, e.clientY - b.top, 20, 0, 7); x.fill();
  };
  const check = () => {
    if (done) return;
    const d = x.getImageData(0, 0, cv.width, cv.height).data; let clear = 0;
    for (let i = 3; i < d.length; i += 64) if (d[i] === 0) clear++;
    if (clear / (d.length / 64) > 0.55) {
      done = true; cv.style.transition = 'opacity .4s'; cv.style.opacity = 0;
      S.rewards.scratch--; const msg = grant(prize.k, 'Raspadinha secreta');
      msg ? SFX.win() : SFX.loss();
      setTimeout(() => pageRewards(), 1600);
    }
  };
  cv.addEventListener('pointerdown', e => { down = true; cv.setPointerCapture(e.pointerId); scratch(e); });
  cv.addEventListener('pointermove', scratch);
  cv.addEventListener('pointerup', () => { down = false; check(); });
}

/* torneios e ranking */
const NICKS = ['Trader#7f3a91', 'LoboDoPregão', 'Trader#c41e07', 'Mari.Candles', 'Trader#0b9d2e', 'Velas&Café', 'Trader#5e88ac', 'RafaOTC', 'Trader#93d1f4', 'BiaForex', 'Trader#2a6c3b', 'Gustavo.Cripto', 'Trader#e07b55', 'NandaPips'];
function weekStart() { const d = new Date(); const day = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - day); return d.getTime(); }
function bots(seedStr, scale) {
  const r = seed(seedStr), progress = (Date.now() - weekStart()) / 6048e5;
  return NICKS.map(n => ({ nick: n, val: Math.round((r() * r() * scale + scale * 0.05) * (0.3 + progress * 0.7)), bot: true }));
}
function myProfit(acct, since) { return S.trades.filter(t => t.acct === acct && t.status !== 'open' && t.openT >= since).reduce((s, t) => s + t.profit, 0); }
function board(list) {
  list.sort((a, b) => b.val - a.val);
  return `<div class="table-wrap"><table><thead><tr><th>#</th><th>Trader</th><th class="num">Lucro</th></tr></thead><tbody>
    ${list.map((x, i) => `<tr class="lb-row ${x.bot ? '' : 'me'}"><td>${i + 1}</td><td>${esc(x.nick)}${x.bot ? '' : ' <span class="pill warn">você</span>'}</td><td class="num mono ${x.val >= 0 ? 'up-txt' : 'down-txt'}">${brlSigned(x.val)}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function pageTournaments() {
  const ws = weekStart(), end = ws + 6048e5;
  const me = { nick: S.user?.nick || 'Você', val: myProfit('demo', Math.max(ws, S.tourJoinedAt || ws)), bot: false };
  const list = bots('tour' + ws, 900000);
  if (S.tourJoined) list.push(me);
  PAGE.innerHTML = `<div class="page-inner"><div><h1>Torneios</h1><p class="lede">Dispute com outros traders usando a conta demo. Vence quem tiver o maior lucro no período.</p></div>
    <div class="grid-2">
      <div class="card">
        <div class="filters" style="justify-content:space-between"><h2>Copa Semanal Demo</h2><span class="pill ok">Em andamento</span></div>
        <div class="stats" style="grid-template-columns:1fr 1fr">
          <div class="stat"><span>Termina em</span><strong>${Math.max(0, Math.floor((end - Date.now()) / 36e5))}h</strong></div>
          <div class="stat"><span>Prêmio</span><strong>R$ 5.000</strong></div>
        </div>
        <ul class="muted" style="margin:0;padding-left:18px;display:grid;gap:4px">
          <li>Inscrição gratuita</li><li>Conta usada: demo</li><li>Conta o lucro das operações fechadas após a inscrição</li><li>Prêmio em bônus distribuído entre os 3 primeiros (simulado)</li>
        </ul>
        ${S.tourJoined ? '<span class="pill warn">Você está inscrito</span>' : '<button class="btn btn-primary" type="button" id="tour-join">Participar</button>'}
      </div>
      <div class="card"><h2>Classificação</h2>${board(list)}<p class="hint">Participantes simulados para fins de demonstração.</p></div>
    </div>
    <div class="card empty"><b>Nenhum torneio com dinheiro real no momento</b><span>Quando houver um torneio na conta real, ele aparece aqui.</span></div></div>`;
  $('#tour-join')?.addEventListener('click', () => { S.tourJoined = true; S.tourJoinedAt = Date.now(); save(); toast('Inscrição confirmada na Copa Semanal Demo.', 'ok'); pageTournaments(); });
}
function pageRanking(sub) {
  const day = sub !== 'week';
  const since = day ? new Date().setHours(0, 0, 0, 0) : weekStart();
  const list = bots((day ? 'day' : 'wk') + since, day ? 250000 : 1200000);
  list.push({ nick: S.user?.nick || 'Você', val: myProfit('real', since), bot: false });
  PAGE.innerHTML = `<div class="page-inner"><div><h1>Ranking</h1><p class="lede">Maiores lucros na conta real. Atualizado a cada operação encerrada.</p></div>
    ${subnav([['ranking', 'Hoje'], ['ranking/week', 'Semana']], day ? 'ranking' : 'ranking/week')}
    ${board(list)}<p class="hint">Os demais traders são simulados.</p></div>`;
}

/* conta */
function pageAccount(sub) {
  sub = sub || 'profile';
  const u = S.user || {};
  const nav = subnav([['account', 'Perfil'], ['account/vip', 'Programa VIP'], ['account/verify', 'Verificação'], ['account/look', 'Aparência e sons']], sub === 'profile' ? 'account' : 'account/' + sub);
  let body = '';
  if (sub === 'profile') {
    body = `<div class="grid-2"><div class="card"><h2>Dados pessoais</h2>
      <form class="form" id="pf-form">
        <div class="grid-2"><label class="field"><span class="label">Nome</span><input class="input" id="pf-first" value="${esc(u.first)}" required></label>
        <label class="field"><span class="label">Sobrenome</span><input class="input" id="pf-last" value="${esc(u.last)}"></label></div>
        <label class="field"><span class="label">Apelido público</span><input class="input" id="pf-nick" value="${esc(u.nick)}"></label>
        <label class="field"><span class="label">E-mail</span><input class="input" id="pf-email" type="email" value="${esc(u.email)}"></label>
        <div class="grid-2"><label class="field"><span class="label">País</span><input class="input" value="Brasil" disabled id="pf-country"></label><label class="field"><span class="label">Moeda</span><input class="input" value="Real (BRL)" disabled id="pf-cur"></label></div>
        <button class="btn btn-primary" type="submit">Salvar alterações</button>
      </form></div>
      <div class="card"><h2>Resumo</h2><div class="inv">
        <div class="inv-item"><span>ID</span><span class="mono">${esc(u.id)}</span></div>
        <div class="inv-item"><span>Membro desde</span><span>${u.created ? fDate.format(u.created) : '—'}</span></div>
        <div class="inv-item"><span>Nível</span><span class="pill warn">${vipTier().tier.name}</span></div>
        <div class="inv-item"><span>E-mail</span>${u.emailVerified ? '<span class="pill ok">Verificado</span>' : '<span class="pill bad">Não verificado</span>'}</div>
        <div class="inv-item"><span>Telefone</span>${u.phoneVerified ? '<span class="pill ok">Verificado</span>' : '<span class="pill bad">Não verificado</span>'}</div>
        <div class="inv-item"><span>Documento</span>${S.kyc === 'ok' ? '<span class="pill ok">Aprovado</span>' : S.kyc === 'pending' ? '<span class="pill warn">Em análise</span>' : '<span class="pill">Não enviado</span>'}</div>
      </div>
      <h2>Dados locais</h2><p class="hint">Apaga conta, saldos e histórico salvos neste navegador.</p>
      <button class="btn btn-danger" type="button" id="wipe">Apagar meus dados</button></div></div>`;
  } else if (sub === 'vip') {
    const { tier, total } = vipTier(), next = TIERS.find(t => t.min > total);
    const pct = next ? Math.round((total - tier.min) / (next.min - tier.min) * 100) : 100;
    body = `<div class="card"><div class="filters" style="justify-content:space-between"><h2>Seu nível: ${tier.name}</h2><span class="pill warn">Últimos 30 dias</span></div>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <p class="muted" style="margin:0">${next ? `${brl(total)} de ${brl(next.min)} em depósitos para chegar ao nível ${next.name}.` : 'Você está no nível mais alto.'}</p>
      ${next ? '<a class="btn btn-primary btn-sm" href="#deposit" style="justify-self:start">Depositar</a>' : ''}</div>
      <div class="grid-3">${TIERS.map(t => `<div class="tier ${t.id === tier.id ? 'cur' : ''}"><h3>${t.name}${t.id === tier.id ? ' <span class="pill warn">Atual</span>' : ''}</h3>
        <span class="muted">${t.min ? `A partir de ${brl(t.min)} em 30 dias` : 'Nível inicial'}</span><ul>${t.perks.map(p => `<li>${p}</li>`).join('')}</ul></div>`).join('')}</div>`;
  } else if (sub === 'verify') {
    body = `<div class="grid-2">
      <div class="card"><h2>Telefone</h2>${u.phoneVerified ? `<p><span class="pill ok">Verificado</span> <span class="mono">${esc(u.phone)}</span></p>` : `
        <p class="muted" style="margin:0">Valide seu número e ganhe 1 giro na roleta.</p>
        <form class="form" id="ph-form"><label class="field"><span class="label">Celular com DDD</span><input class="input mono" id="ph-num" inputmode="tel" placeholder="(11) 91234-5678" value="${esc(u.phone)}" required></label>
        <div id="ph-code-row" hidden><label class="field"><span class="label">Código recebido</span><input class="input mono" id="ph-code" inputmode="numeric" maxlength="6"></label></div>
        <p class="err" id="ph-err"></p><button class="btn btn-primary" type="submit" id="ph-btn">Enviar código</button></form>`}</div>
      <div class="card"><h2>E-mail</h2>${u.emailVerified ? `<p><span class="pill ok">Verificado</span> ${esc(u.email)}</p>` : `
        <p class="muted" style="margin:0">Confirme ${esc(u.email || 'seu e-mail')} para proteger a conta.</p>
        <form class="form" id="em-form"><div id="em-code-row" hidden><label class="field"><span class="label">Código</span><input class="input mono" id="em-code" inputmode="numeric" maxlength="6"></label></div>
        <p class="err" id="em-err"></p><button class="btn btn-primary" type="submit" id="em-btn">Enviar código</button></form>`}</div>
      <div class="card"><h2>Documento de identidade</h2>
        ${S.kyc === 'ok' ? '<p><span class="pill ok">Aprovado</span></p>' : S.kyc === 'pending' ? '<p><span class="pill warn">Em análise</span> A análise simulada leva alguns segundos.</p>' : `
        <p class="muted" style="margin:0">Envie uma foto do RG ou da CNH. O arquivo fica só no seu navegador e não é enviado a nenhum servidor.</p>
        <label class="field"><span class="label">Arquivo</span><input class="input" id="kyc-file" type="file" accept="image/*,application/pdf" style="padding-top:10px"></label>`}</div>
      <div class="card"><h2>Autenticação em dois fatores</h2><div class="toggle-row"><span>Exigir código ao entrar</span><label class="switch"><input type="checkbox" id="mfa" ${S.mfa ? 'checked' : ''}><i></i></label></div></div>
    </div>`;
  } else {
    const skins = [['default', 'Padrão', 'linear-gradient(135deg,#0e1220,#242b45)'], ['black', 'Black', 'linear-gradient(135deg,#000,#1d1d24)'], ['brasil', 'Brasil', 'linear-gradient(135deg,#04231a,#165a47 60%,#ffd23f)']];
    const bgs = [['default', 'Padrão'], ['grade', 'Grade'], ['aurora', 'Aurora'], ['cidade', 'Cidade']];
    body = `<div class="card"><h2>Tema</h2><div class="skins">${skins.map(([k, l, g]) => `<button type="button" class="skin ${S.skin === k ? 'on' : ''}" data-sk="${k}"><i style="background:${g}"></i><b>${l}</b></button>`).join('')}</div></div>
      <div class="card"><h2>Fundo do gráfico</h2><div class="chips">${bgs.map(([k, l]) => `<button type="button" class="chip ${S.chart.bg === k ? 'on' : ''}" data-bg="${k}">${l}</button>`).join('')}</div></div>
      <div class="card"><h2>Preferências</h2>
        <div class="toggle-row"><span>Sons de operação, resultado e depósito</span><label class="switch"><input type="checkbox" id="snd" ${S.sound ? 'checked' : ''}><i></i></label></div>
        <div class="toggle-row"><span>Atalhos de teclado (Shift + ↑ Acima, Shift + ↓ Abaixo)</span><span class="pill ok">Ativo</span></div></div>`;
  }
  PAGE.innerHTML = `<div class="page-inner"><div><h1>Conta</h1><p class="lede">${esc((u.first || '') + ' ' + (u.last || ''))} · ${esc(u.nick || '')}</p></div>${nav}${body}</div>`;

  $('#pf-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#pf-email').value.trim();
    Object.assign(S.user, { first: $('#pf-first').value.trim(), last: $('#pf-last').value.trim(), nick: $('#pf-nick').value.trim() || S.user.nick });
    if (email !== S.user.email) { S.user.email = email; S.user.emailVerified = false; }
    save(); updateHeader(); toast('Dados salvos.', 'ok'); pageAccount('profile');
  });
  $('#wipe')?.addEventListener('click', e => {
    const b = e.currentTarget;
    if (b.dataset.armed) { try { localStorage.removeItem(KEY); } catch { /* ignore */ } location.hash = 'trade'; location.reload(); return; }
    b.dataset.armed = 1; b.textContent = 'Toque de novo para confirmar';
  });
  const codeFlow = (form, row, btn, err, onOk) => {
    let code = null;
    $(form)?.addEventListener('submit', e => {
      e.preventDefault();
      if (!code) {
        if (form === '#ph-form' && $('#ph-num').value.replace(/\D/g, '').length < 10) { $(err).textContent = 'Informe o celular com DDD.'; return; }
        code = String(Math.floor(100000 + Math.random() * 900000));
        $(row).hidden = false; $(btn).textContent = 'Confirmar código'; $(err).textContent = '';
        toast(`Código de verificação (simulado): <b class="mono">${code}</b>`);
      } else if ($(row + ' input').value.trim() === code) onOk();
      else $(err).textContent = 'Código incorreto. Confira e tente de novo.';
    });
  };
  codeFlow('#ph-form', '#ph-code-row', '#ph-btn', '#ph-err', () => {
    S.user.phone = $('#ph-num').value.trim(); S.user.phoneVerified = true; S.rewards.spins++;
    save(); updateHeader(); notify('Telefone verificado', 'Você ganhou 1 giro na roleta.'); SFX.win(); pageAccount('verify');
  });
  codeFlow('#em-form', '#em-code-row', '#em-btn', '#em-err', () => { S.user.emailVerified = true; save(); toast('E-mail verificado.', 'ok'); pageAccount('verify'); });
  $('#kyc-file')?.addEventListener('change', e => {
    if (!e.target.files[0]) return;
    S.kyc = 'pending'; save(); pageAccount('verify');
    setTimeout(() => { S.kyc = 'ok'; save(); notify('Documento aprovado', 'Sua identidade foi verificada (simulação).'); if (location.hash === '#account/verify') pageAccount('verify'); }, 6000);
  });
  $('#mfa')?.addEventListener('change', e => { S.mfa = e.target.checked; save(); toast(S.mfa ? 'Dois fatores ativado.' : 'Dois fatores desativado.'); });
  $$('[data-sk]', PAGE).forEach(b => b.onclick = () => { applySkin(b.dataset.sk); pageAccount('look'); });
  $$('[data-bg]', PAGE).forEach(b => b.onclick = () => { S.chart.bg = b.dataset.bg; save(); buildBg(); pageAccount('look'); toast('Fundo do gráfico atualizado.'); });
  $('#snd')?.addEventListener('change', e => { S.sound = e.target.checked; save(); if (S.sound) SFX.place(); });
}
function applySkin(k) {
  S.skin = k; save();
  document.documentElement.dataset.skin = k;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  readColors(); if (CH.w) buildBg(); CH.yMin = null;
}

/* ajuda */
const FAQ = [
  ['Plataforma', [
    ['O que é negociação de opções binárias?', 'É uma forma de operar em que você prevê se o preço de um ativo vai subir ou cair dentro de um período definido. Se a previsão estiver certa, você recebe o valor investido mais o retorno indicado; se estiver errada, perde o valor investido.'],
    ['A negociação de opções binárias é arriscada?', 'Sim. Como em qualquer negociação, há risco de perder o valor investido. Entenda o mercado, defina limites e use a conta demo para treinar.'],
    ['Esta plataforma é regulamentada?', 'Não. Este site é um simulador para estudo e demonstração. Nenhum dinheiro real é recebido, investido ou pago.']]],
  ['Negociações', [
    ['Como faço uma operação?', 'Escolha o ativo, o tempo de expiração e o valor. Depois toque em Acima se acha que o preço vai subir, ou em Abaixo se acha que vai cair.'],
    ['Quais ativos posso negociar?', 'Pares de forex, metais, criptomoedas e ações, incluindo versões OTC que funcionam todos os dias.'],
    ['Posso cancelar uma operação depois de abrir?', 'Não. Depois de aberta, a operação não pode ser cancelada nem alterada. Operações agendadas podem ser canceladas antes do horário.'],
    ['O que é uma operação sem risco?', 'É um prêmio da roleta ou da raspadinha. Se a operação marcada como sem risco terminar em perda, o valor é devolvido até o limite do prêmio.']]],
  ['Depósitos', [
    ['Como deposito na minha conta?', 'Vá em Depositar, escolha o valor, aplique um cupom se tiver e confirme com PIX.'],
    ['Existem taxas para depositar?', 'Não há taxa da nossa parte. No simulador o depósito é creditado na hora.'],
    ['Quanto tempo leva para o depósito aparecer?', 'Depósitos por PIX são creditados imediatamente.']]],
  ['Saques', [
    ['Como faço um saque?', 'Vá em Sacar, informe a chave PIX e o valor. O saque fica em análise e depois é pago.'],
    ['Existe valor mínimo para saque?', 'Sim, o mínimo é R$ 50,00, com 1 saque por dia.'],
    ['Quanto tempo leva um saque?', 'A análise leva até 24 horas no nível Standard, 6 horas no Pro e 1 hora no VIP.'],
    ['Posso sacar o bônus?', 'Não. O bônus pode ser usado para operar, mas só o saldo real pode ser sacado.']]],
  ['Conta e segurança', [
    ['Como verifico minha conta?', 'Em Conta › Verificação, valide telefone e e-mail e envie um documento de identidade.'],
    ['Como meus dados são protegidos?', 'No simulador, tudo fica salvo apenas no seu navegador. Você pode ativar dois fatores e apagar seus dados a qualquer momento.'],
    ['Esqueci meus dados de acesso. O que faço?', 'A conta fica salva neste navegador. Se você limpar os dados do navegador, precisa criar uma nova conta.']]]
];
function pageFaq() {
  PAGE.innerHTML = `<div class="page-inner"><div><h1>Central de ajuda</h1><p class="lede">Perguntas frequentes e atendimento por chat.</p></div>
    <input class="input" id="faq-q" placeholder="Buscar uma dúvida" autocomplete="off">
    <div class="grid-2" style="align-items:start"><div class="faq-cat" id="faq-list"></div>
    <div class="card"><div class="filters" style="justify-content:space-between"><h2>Suporte 24/7</h2><span class="pill ok">Online</span></div>
      <div class="chat"><div class="chat-log" id="chat-log"><div class="msg">Olá${S.user?.first ? ', ' + esc(S.user.first) : ''}! Como posso ajudar? Pergunte sobre depósito, saque, operações ou verificação.</div></div>
      <form id="chat-form"><input class="input" id="chat-in" placeholder="Escreva sua mensagem" autocomplete="off"><button class="btn btn-primary" type="submit">Enviar</button></form></div></div></div></div>`;
  const draw = q => {
    q = (q || '').toLowerCase();
    $('#faq-list').innerHTML = FAQ.map(([cat, items]) => {
      const f = items.filter(([qq, aa]) => !q || (qq + aa).toLowerCase().includes(q));
      return f.length ? `<h2>${cat}</h2>${f.map(([qq, aa]) => `<details class="qa"><summary>${qq}</summary><p>${aa}</p></details>`).join('')}` : '';
    }).join('') || '<p class="muted">Nada encontrado. Tente outras palavras ou fale com o suporte.</p>';
  };
  draw();
  $('#faq-q').oninput = e => draw(e.target.value);
  $('#chat-form').onsubmit = e => {
    e.preventDefault();
    const v = $('#chat-in').value.trim(); if (!v) return;
    const log = $('#chat-log');
    log.insertAdjacentHTML('beforeend', `<div class="msg me">${esc(v)}</div>`); $('#chat-in').value = '';
    const words = v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\W+/).filter(w => w.length > 3);
    let best = null, score = 0;
    FAQ.forEach(([, items]) => items.forEach(([qq, aa]) => {
      const txt = (qq + ' ' + aa).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const sc = words.reduce((s, w) => s + (txt.includes(w.slice(0, 5)) ? 1 : 0), 0);
      if (sc > score) { score = sc; best = aa; }
    }));
    setTimeout(() => { log.insertAdjacentHTML('beforeend', `<div class="msg">${best ? esc(best) : 'Não encontrei uma resposta para isso. Tente perguntar sobre depósito, saque, bônus, operações ou verificação.'}</div>`); log.scrollTop = log.scrollHeight; }, 500);
    log.scrollTop = log.scrollHeight;
  };
}

/* ---------- rotas ---------- */
const ROUTES = { history: pageHistory, deposit: pageDeposit, withdraw: pageWithdraw, rewards: pageRewards, tournaments: pageTournaments, ranking: pageRanking, account: pageAccount, faq: pageFaq };
function route() {
  const [r, sub] = (location.hash.slice(1) || 'trade').split('/');
  const fn = ROUTES[r];
  $('#trade-view').hidden = !!fn; PAGE.hidden = !fn;
  $$('#rail-nav a').forEach(a => a.classList.toggle('on', a.dataset.route === (fn ? r : 'trade')));
  if (fn) { fn(sub); PAGE.scrollTop = 0; } else { requestAnimationFrame(resizeChart); renderPanel(); }
  toggleAcctMenu(false); $('#notif-panel').hidden = true;
}

/* ---------- boas-vindas ---------- */
function welcome() {
  const m = openModal(`<div class="form welcome">
    <span class="brand"><span class="brand-mark"><i></i><i></i><i></i></span></span>
    <h2>Pregão Simulador</h2>
    <p class="muted" style="margin:0">Treine opções binárias com cotações simuladas, ${brl(DEMO_START)} na conta demo e uma conta real fictícia para testar depósitos, saques e prêmios.</p>
    <form class="form" id="wl-form" style="width:100%;text-align:left">
      <div class="grid-2"><label class="field"><span class="label">Nome</span><input class="input" id="wl-first" required autocomplete="given-name"></label>
      <label class="field"><span class="label">Sobrenome</span><input class="input" id="wl-last" autocomplete="family-name"></label></div>
      <label class="field"><span class="label">E-mail (opcional)</span><input class="input" id="wl-email" type="email" autocomplete="email"></label>
      <p class="hint">Sem senha: a conta fica salva só neste navegador. Nenhum dado é enviado a servidores.</p>
      <button class="btn btn-primary" type="submit">Começar a operar</button>
    </form></div>`, { locked: true });
  $('#wl-form', m.el).addEventListener('submit', e => {
    e.preventDefault();
    const id = uid() + uid();
    S.user = { id, first: $('#wl-first', m.el).value.trim(), last: $('#wl-last', m.el).value.trim(), email: $('#wl-email', m.el).value.trim(), nick: 'Trader#' + id.slice(0, 8), phone: '', phoneVerified: false, emailVerified: false, created: Date.now() };
    S.notifs = [];
    notify('Bem-vindo ao Pregão', `Sua conta demo tem ${brl(DEMO_START)} para treinar.`);
    notify('Valide seu número e ganhe 1 giro na roleta', 'Acesse Conta › Verificação.');
    notify('Você tem 2 giros e 1 raspadinha', 'Abra Prêmios para usar.');
    save(); updateHeader(); m.close(); SFX.welcome();
  });
}

/* ---------- inicialização ---------- */
function init() {
  if (!BY[S.active]) S.active = ASSETS[0].sym;
  if (!BY[S.active].opts.includes(S.expiry)) S.expiry = BY[S.active].opts.includes(60) ? 60 : BY[S.active].opts[0];
  S.tabs = S.tabs.filter(x => BY[x]); if (!S.tabs.length) S.tabs = [S.active];
  applySkin(S.skin);
  initChart();
  series(S.active);
  renderTabs(); updateHeader(); renderPanel();

  $('#tab-add').onclick = openPicker;
  $('#asset-pill').onclick = openPicker;
  $('#acct-btn').onclick = e => { e.stopPropagation(); toggleAcctMenu(); };
  $('#bell').onclick = e => { e.stopPropagation(); const p = $('#notif-panel'); p.hidden = !p.hidden; if (!p.hidden) { renderNotifs(); toggleAcctMenu(false); } };
  document.addEventListener('click', e => {
    if (!e.target.closest('#acct')) toggleAcctMenu(false);
    if (!e.target.closest('#notif-panel') && !e.target.closest('#bell')) $('#notif-panel').hidden = true;
  });
  $('#btn-up').onclick = () => tradeClick('up');
  $('#btn-down').onclick = () => tradeClick('down');
  ['up', 'down'].forEach(d => {
    const b = $('#btn-' + d);
    b.addEventListener('pointerenter', () => { CH.preview = d; });
    b.addEventListener('pointerleave', () => { CH.preview = null; });
  });
  const amtStep = v => v < 1000 ? 100 : v < 10000 ? 500 : v < 100000 ? 5000 : 10000;
  $('#amt-dec').onclick = () => { S.amount = Math.max(BY[S.active].min, S.amount - amtStep(S.amount - 1)); save(); renderPanel(); };
  $('#amt-inc').onclick = () => { S.amount = Math.min(BY[S.active].max, S.amount + amtStep(S.amount)); save(); renderPanel(); };
  const amt = $('#amount');
  amt.addEventListener('focus', () => { amt.value = (S.amount / 100).toFixed(2).replace('.', ','); amt.select(); });
  amt.addEventListener('input', () => { const v = parseBRL(amt.value); if (v > 0) { $('#payout-val').textContent = '+' + brl(Math.round(v * effPayout(BY[S.active]) / 100)); } });
  amt.addEventListener('blur', () => { const v = parseBRL(amt.value); if (v > 0) S.amount = v; save(); renderPanel(); });
  amt.addEventListener('keydown', e => { if (e.key === 'Enter') amt.blur(); });
  $$('.mini-tabs button').forEach(b => b.onclick = () => { tradeListTab = b.dataset.tl; renderTradeList(); });
  $('#open-schedule').onclick = openSchedule;
  $('#open-auto').onclick = openAuto;
  document.addEventListener('keydown', e => {
    if (!e.shiftKey || $('#trade-view').hidden || e.target.matches('input, select, textarea') || $('#modal-root').children.length) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); tradeClick('up'); }
    if (e.key === 'ArrowDown') { e.preventDefault(); tradeClick('down'); }
  });

  addEventListener('hashchange', route);
  route();

  // relógio e cotações em tempo real (ticks de 500 ms, como o feed original)
  setInterval(() => {
    tickMarket(); resolveTrades(); runSchedules(); autoTick();
    if (!$('#trade-view').hidden && tradeListTab !== 'closed') renderTradeList();
  }, 500);
  setInterval(() => {
    $('#clock').textContent = fHMS.format(new Date()) + ' BRT';
    if (!$('#trade-view').hidden) updateSentiment();
  }, 1000);
  let lastMin = -1;
  setInterval(() => { const m = new Date().getMinutes(); if (m !== lastMin) { lastMin = m; renderTabs(); if (!$('#trade-view').hidden) renderPanel(); } }, 5000);

  if (!S.user) welcome();
}
init();
})();
