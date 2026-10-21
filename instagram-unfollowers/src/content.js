// Painel da extensão, injetado nas páginas do instagram.com dentro de um Shadow DOM
// (o CSS do Instagram não vaza para o painel e vice-versa).
(() => {
  'use strict';
  if (globalThis.__iuUnfollowersLoaded) return;
  globalThis.__iuUnfollowersLoaded = true;

  const API = globalThis.IU_API;
  const Store = globalThis.IU_STORE;
  const LIST_PAGE = 100; // linhas renderizadas por vez
  const MAX_PAGES = 400; // trava de segurança da paginação (400 x 50 contas)

  const SETTINGS_FIELDS = [
    { key: 'scanDelayMs', label: 'Espera entre páginas do scan', unit: 's', factor: 1000, min: 0.5 },
    { key: 'scanLongPauseEvery', label: 'Pausa longa a cada N páginas', unit: 'páginas', factor: 1, min: 0 },
    { key: 'scanLongPauseMs', label: 'Duração da pausa longa', unit: 's', factor: 1000, min: 0 },
    { key: 'unfollowDelayMs', label: 'Espera entre unfollows', unit: 's', factor: 1000, min: 2 },
    { key: 'unfollowPauseEvery', label: 'Pausa de segurança a cada N unfollows', unit: 'unfollows', factor: 1, min: 0 },
    { key: 'unfollowPauseMs', label: 'Duração da pausa de segurança', unit: 's', factor: 1000, min: 0 },
    { key: 'maxUnfollowsPerRun', label: 'Máximo de unfollows por rodada (0 = sem limite)', unit: 'contas', factor: 1, min: 0 },
  ];

  const state = {
    open: false,
    view: 'idle', // idle | scanning | results | unfollowing
    showSettings: false,
    uid: null,
    username: null,
    settings: { ...Store.DEFAULT_SETTINGS },
    whitelist: new Map(),
    cached: null,
    scan: null, // { timestamp, complete, username, results }
    selected: new Set(),
    tab: 'non', // non | white
    search: '',
    filters: { verified: true, private: true, noPic: true },
    shown: LIST_PAGE,
    status: { text: '', tone: '' },
    progress: 0,
    job: null, // { kind, paused, stopped } do scan ou unfollow em andamento
    scanStats: null,
    run: null, // rodada de unfollow
  };

  let host = null;
  const els = {};

  // ---------- utilitários ----------

  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
      else el.setAttribute(key, value === true ? '' : String(value));
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      el.append(child instanceof Node ? child : String(child));
    }
    return el;
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const jitter = (ms, spread = 0.3) => Math.round(ms * (1 + Math.random() * spread));
  const sortUsers = (users) => [...users].sort((a, b) => a.username.localeCompare(b.username));
  const number = (n) => n.toLocaleString('pt-BR');

  function formatDuration(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}min ${String(seconds).padStart(2, '0')}s` : `${seconds}s`;
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function setStatus(text, tone = '') {
    state.status = { text, tone };
    if (els.status) {
      els.status.textContent = text;
      els.status.className = `status ${tone}`;
    }
  }

  function setProgress(percent) {
    state.progress = Math.max(0, Math.min(100, percent));
    if (els.bar) els.bar.style.width = `${state.progress}%`;
  }

  // Espera respeitando Pausar/Parar. Retorna false se o usuário parou.
  async function wait(ms, label) {
    const job = state.job;
    let remaining = ms;
    let shown = null;
    while (remaining > 0) {
      if (!job || job.stopped) return false;
      if (job.paused) {
        if (shown !== 'paused') setStatus('Pausado.');
        shown = 'paused';
      } else {
        const seconds = Math.ceil(remaining / 1000);
        if (label && shown !== seconds) setStatus(`${label} ${formatDuration(seconds)}`);
        shown = seconds;
        remaining -= 250;
      }
      await sleep(250);
    }
    return !job.stopped;
  }

  async function waitWhilePaused() {
    const job = state.job;
    if (job && job.paused) setStatus('Pausado.');
    while (job && job.paused && !job.stopped) await sleep(250);
    return Boolean(job) && !job.stopped;
  }

  // ---------- scan ----------

  async function withRetry(fn) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const network = error instanceof TypeError;
        const blocked = Boolean(error && error.blocked);
        if (!(network || blocked) || attempt >= 3) throw error;
        const seconds = blocked ? 60 * (attempt + 1) : 5 * (attempt + 1);
        const label = blocked ? 'O Instagram pediu para esperar. Nova tentativa em' : 'Falha de rede. Nova tentativa em';
        if (!(await wait(seconds * 1000, label))) return null;
      }
    }
  }

  async function fetchAll(kind, uid, onUsers) {
    const s = state.settings;
    let maxId;
    for (let page = 1; page <= MAX_PAGES; page++) {
      if (!(await waitWhilePaused())) return { complete: false, reason: 'stopped' };
      let body;
      try {
        body = await withRetry(() => API.friendshipsPage(kind, uid, maxId));
      } catch (error) {
        console.error(`[Unfollowers] falha ao carregar ${kind}:`, error);
        return { complete: false, reason: 'error', error };
      }
      if (!body) return { complete: false, reason: 'stopped' };
      const users = body.users || [];
      onUsers(users);
      if (!body.next_max_id || body.has_more === false || users.length === 0) return { complete: true };
      maxId = body.next_max_id;
      const longPause = s.scanLongPauseEvery > 0 && page % s.scanLongPauseEvery === 0;
      const ok = longPause
        ? await wait(s.scanLongPauseMs, 'Pausa de segurança do scan:')
        : await wait(jitter(s.scanDelayMs));
      if (!ok) return { complete: false, reason: 'stopped' };
    }
    return { complete: false, reason: 'limit' };
  }

  function phaseProgress(done, total) {
    if (total) return Math.min(1, done / total);
    return 1 - 1 / (1 + done / 300);
  }

  function updateScanView() {
    const st = state.scanStats;
    if (!st) return;
    const followers = phaseProgress(st.followers, st.followersTotal);
    const following = st.phase === 'following' ? phaseProgress(st.following, st.followingTotal) : 0;
    setProgress(Math.min(99, Math.round(followers * 50 + following * 50)));
    if (els.statFollowers) {
      els.statFollowers.textContent = st.followersTotal ? `${number(st.followers)} / ${number(st.followersTotal)}` : number(st.followers);
      els.statFollowing.textContent = st.followingTotal ? `${number(st.following)} / ${number(st.followingTotal)}` : number(st.following);
      els.statFound.textContent = number(st.found);
    }
  }

  async function startScan() {
    const uid = API.viewerId();
    if (!uid) {
      setStatus('Faça login no Instagram antes de escanear.', 'error');
      return;
    }
    state.uid = uid;
    state.job = { kind: 'scan', paused: false, stopped: false };
    state.scanStats = { phase: 'followers', followers: 0, following: 0, found: 0, followersTotal: null, followingTotal: null };
    state.view = 'scanning';
    state.showSettings = false;
    setProgress(0);
    render();
    setStatus('Lendo o total de seguidores…');

    const counts = await API.userCounts(uid);
    const st = state.scanStats;
    st.followersTotal = counts.followers;
    st.followingTotal = counts.following;
    if (counts.username) state.username = counts.username;
    render();

    // 1) Seguidores: só guarda ids e usernames num índice.
    const followerIds = new Set();
    const followerNames = new Set();
    const followers = await fetchAll('followers', uid, (users) => {
      for (const raw of users) {
        const who = API.identities(raw);
        who.ids.forEach((id) => followerIds.add(id));
        if (who.username) followerNames.add(who.username);
      }
      st.followers += users.length;
      updateScanView();
      setStatus(`Carregando seus seguidores… ${number(st.followers)}`);
    });

    if (!followers.complete) {
      state.job = null;
      state.view = state.scan ? 'results' : 'idle';
      render();
      setStatus(
        followers.reason === 'stopped'
          ? 'Scan cancelado.'
          : 'Não foi possível carregar a lista de seguidores. Sem ela não dá para saber quem não te segue. Tente de novo mais tarde.',
        followers.reason === 'stopped' ? '' : 'error',
      );
      return;
    }

    // 2) Seguindo: quem não está no índice de seguidores não te segue de volta.
    st.phase = 'following';
    const found = new Map();
    const following = await fetchAll('following', uid, (users) => {
      for (const raw of users) {
        const who = API.identities(raw);
        const followsBack = who.ids.some((id) => followerIds.has(id)) || (who.username && followerNames.has(who.username));
        if (!followsBack) {
          const user = API.normalizeUser(raw);
          found.set(user.id, user);
        }
      }
      st.following += users.length;
      st.found = found.size;
      updateScanView();
      setStatus(`Conferindo quem você segue… ${number(st.following)}`);
    });

    state.job = null;
    if (following.reason === 'stopped' && st.following === 0) {
      state.view = state.scan ? 'results' : 'idle';
      render();
      setStatus('Scan cancelado.');
      return;
    }

    state.scan = {
      timestamp: Date.now(),
      complete: following.complete,
      username: state.username,
      results: sortUsers(found.values()),
    };
    state.selected.clear();
    state.tab = 'non';
    state.search = '';
    state.shown = LIST_PAGE;
    await Store.saveScan(uid, state.scan);
    state.cached = state.scan;
    state.view = 'results';
    setProgress(100);
    render();
    if (following.complete) {
      setStatus(`Scan concluído: ${number(found.size)} contas não te seguem de volta.`, 'ok');
    } else {
      setStatus(`Scan interrompido depois de ${number(st.following)} contas. A lista pode estar incompleta.`, 'error');
    }
  }

  // ---------- unfollow ----------

  async function startUnfollow() {
    if (!state.scan || !state.scan.complete) return;
    const queue = state.scan.results.filter((u) => state.selected.has(u.id) && !state.whitelist.has(u.id));
    if (queue.length === 0) return;
    const s = state.settings;
    const batch = s.maxUnfollowsPerRun > 0 ? queue.slice(0, s.maxUnfollowsPerRun) : queue;
    const perPause = s.unfollowPauseEvery > 0 ? Math.floor((batch.length - 1) / s.unfollowPauseEvery) : 0;
    const estimate = Math.round((batch.length * s.unfollowDelayMs * 1.15 + perPause * s.unfollowPauseMs) / 1000);
    const lines = [
      `Deixar de seguir ${batch.length} conta(s)?`,
      queue.length > batch.length ? `(Limite por rodada: ${batch.length} de ${queue.length} selecionadas.)` : '',
      `Tempo estimado: ${formatDuration(estimate)}. Mantenha esta aba aberta.`,
    ];
    if (!confirm(lines.filter(Boolean).join('\n'))) return;

    state.job = { kind: 'unfollow', paused: false, stopped: false };
    state.run = { total: batch.length, log: [], finished: false, blocked: false };
    state.view = 'unfollowing';
    setProgress(0);
    render();

    const run = state.run;
    for (let i = 0; i < batch.length; i++) {
      if (!(await waitWhilePaused())) break;
      const user = batch[i];
      setStatus(`Deixando de seguir @${user.username} (${i + 1}/${batch.length})…`);
      let result;
      try {
        result = await API.unfollow(user);
      } catch (error) {
        result = { outcome: 'failed', detail: error && error.message ? error.message : String(error) };
      }
      const entry = { user, ...result };
      run.log.push(entry);
      if (result.outcome === 'unfollowed' || result.outcome === 'unconfirmed') state.selected.delete(user.id);
      if (result.outcome === 'unfollowed') {
        state.scan.results = state.scan.results.filter((u) => u.id !== user.id);
      }
      appendLog(entry);
      setProgress(Math.round(((i + 1) / batch.length) * 100));
      updateRunCounts();

      if (result.outcome === 'blocked') {
        run.blocked = true;
        break;
      }
      if (i === batch.length - 1) break;
      const safetyPause = s.unfollowPauseEvery > 0 && (i + 1) % s.unfollowPauseEvery === 0;
      const ok = safetyPause
        ? await wait(s.unfollowPauseMs, 'Pausa de segurança. Próximo em')
        : await wait(jitter(s.unfollowDelayMs), 'Próximo em');
      if (!ok) break;
    }

    run.finished = true;
    state.job = null;
    await Store.saveScan(state.uid, state.scan);
    state.cached = state.scan;
    render();
    const done = run.log.filter((e) => e.outcome === 'unfollowed').length;
    if (run.blocked) {
      setStatus('O Instagram bloqueou a ação (feedback_required / limite). A fila parou para proteger sua conta. Espere algumas horas antes de tentar de novo.', 'error');
    } else {
      setStatus(`Rodada encerrada: ${done} de ${run.total} deixadas de seguir.`, 'ok');
    }
  }

  // ---------- whitelist ----------

  async function saveWhitelist() {
    await Store.saveWhitelist(state.uid, [...state.whitelist.values()]);
  }

  async function toggleWhitelist(user) {
    if (state.whitelist.has(user.id)) {
      state.whitelist.delete(user.id);
    } else {
      const { id, username, full_name, profile_pic_url, is_private, is_verified } = user;
      state.whitelist.set(id, { id, username, full_name, profile_pic_url, is_private, is_verified });
      state.selected.delete(user.id);
    }
    await saveWhitelist();
    renderList();
    renderResultsChrome();
  }

  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = h('a', { href: url, download: filename });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportWhitelist() {
    const date = new Date().toISOString().slice(0, 10);
    download(`whitelist-instagram-${date}.json`, JSON.stringify([...state.whitelist.values()], null, 2), 'application/json');
  }

  function importWhitelist(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data)) throw new Error('o arquivo não é uma lista');
        let added = 0;
        for (const item of data) {
          if (!item || !item.id || !item.username) continue;
          const id = String(item.id);
          if (state.whitelist.has(id)) continue;
          state.whitelist.set(id, {
            id,
            username: String(item.username),
            full_name: String(item.full_name || ''),
            profile_pic_url: String(item.profile_pic_url || ''),
            is_private: Boolean(item.is_private),
            is_verified: Boolean(item.is_verified),
          });
          added++;
        }
        await saveWhitelist();
        render();
        setStatus(`Whitelist importada: ${added} conta(s) nova(s).`, 'ok');
      } catch (error) {
        setStatus(`Não foi possível importar: ${error.message}`, 'error');
      }
    };
    reader.readAsText(file);
  }

  // ---------- exportação ----------

  function csvCell(value) {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function exportCsv() {
    const rows = visibleUsers().map((u) =>
      [u.username, u.full_name, `https://www.instagram.com/${u.username}/`, u.is_verified, u.is_private].map(csvCell).join(','),
    );
    const csv = ['username,nome,perfil,verificado,privado', ...rows].join('\n');
    download('nao-me-seguem.csv', `﻿${csv}`, 'text/csv;charset=utf-8');
  }

  async function copyList() {
    const text = visibleUsers().map((u) => u.username).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`${number(visibleUsers().length)} usernames copiados.`, 'ok');
    } catch {
      setStatus('O navegador não deixou copiar. Use o CSV.', 'error');
    }
  }

  // ---------- lista ----------

  function visibleUsers() {
    if (!state.scan && state.tab === 'non') return [];
    const term = state.search.trim().toLowerCase();
    const base =
      state.tab === 'non'
        ? state.scan.results.filter((u) => !state.whitelist.has(u.id))
        : sortUsers(state.whitelist.values());
    return base.filter((u) => {
      if (!state.filters.verified && u.is_verified) return false;
      if (!state.filters.private && u.is_private) return false;
      if (!state.filters.noPic && API.hasNoPicture(u)) return false;
      if (term && !u.username.toLowerCase().includes(term) && !u.full_name.toLowerCase().includes(term)) return false;
      return true;
    });
  }

  function toggleSelect(id, checked, row) {
    if (checked) state.selected.add(id);
    else state.selected.delete(id);
    if (row) row.classList.toggle('selected', checked);
    renderResultsChrome();
  }

  function renderRow(user) {
    const whitelisted = state.whitelist.has(user.id);
    const selected = state.selected.has(user.id);
    const avatar = user.profile_pic_url
      ? h('img', { class: 'avatar', src: user.profile_pic_url, alt: '', loading: 'lazy' })
      : h('div', { class: 'avatar empty' }, user.username.slice(0, 1).toUpperCase());
    const checkbox =
      state.tab === 'non'
        ? h('input', { type: 'checkbox', class: 'check', checked: selected, 'aria-label': `Selecionar @${user.username}` })
        : null;
    const row = h(
      'div',
      { class: `row${selected ? ' selected' : ''}` },
      avatar,
      h(
        'div',
        { class: 'who' },
        h(
          'a',
          { class: 'username', href: `https://www.instagram.com/${user.username}/`, target: '_blank', rel: 'noopener' },
          `@${user.username}`,
        ),
        user.is_verified && h('span', { class: 'verified', title: 'Verificado' }, '✓'),
        h('span', { class: 'name' }, user.full_name || '—'),
        h(
          'span',
          { class: 'tags' },
          user.is_private && h('span', { class: 'tag' }, 'Privado'),
          API.hasNoPicture(user) && h('span', { class: 'tag' }, 'Sem foto'),
        ),
      ),
      h(
        'button',
        {
          class: `star${whitelisted ? ' on' : ''}`,
          type: 'button',
          title: whitelisted ? 'Remover da whitelist' : 'Proteger (whitelist)',
          'aria-label': whitelisted ? `Remover @${user.username} da whitelist` : `Proteger @${user.username}`,
          onClick: () => toggleWhitelist(user),
        },
        whitelisted ? '★' : '☆',
      ),
      checkbox,
    );
    if (checkbox) {
      checkbox.addEventListener('change', () => toggleSelect(user.id, checkbox.checked, row));
      row.addEventListener('click', (event) => {
        if (event.target.closest('a, button, input')) return;
        checkbox.checked = !checkbox.checked;
        toggleSelect(user.id, checkbox.checked, row);
      });
    }
    return row;
  }

  function renderList() {
    if (!els.list) return;
    const users = visibleUsers();
    const rows = users.slice(0, state.shown).map(renderRow);
    if (rows.length === 0) {
      const empty =
        state.tab === 'white'
          ? 'Nenhuma conta na whitelist. Toque na ☆ de uma conta para protegê-la.'
          : state.scan && state.scan.results.length === 0
            ? 'Todo mundo que você segue te segue de volta. 🎉'
            : 'Nenhuma conta com esses filtros.';
      rows.push(h('p', { class: 'list-empty' }, empty));
    }
    els.list.replaceChildren(...rows);
    els.more.hidden = users.length <= state.shown;
    els.more.textContent = `Mostrar mais (${number(users.length - state.shown)} restantes)`;
    els.showing.textContent = `${number(Math.min(users.length, state.shown))} de ${number(users.length)}`;
  }

  // Contadores, abas e botão principal (sem recriar a lista).
  function renderResultsChrome() {
    if (!els.unfollowBtn || !state.scan) return;
    const nonCount = state.scan.results.filter((u) => !state.whitelist.has(u.id)).length;
    const selectedCount = state.scan.results.filter((u) => state.selected.has(u.id) && !state.whitelist.has(u.id)).length;
    els.tabNon.textContent = `Não te seguem (${number(nonCount)})`;
    els.tabWhite.textContent = `Whitelist (${number(state.whitelist.size)})`;
    els.tabNon.classList.toggle('active', state.tab === 'non');
    els.tabWhite.classList.toggle('active', state.tab === 'white');
    els.selectRow.hidden = state.tab !== 'non';
    els.unfollowBtn.textContent = `Deixar de seguir (${number(selectedCount)})`;
    els.unfollowBtn.disabled = !state.scan.complete || selectedCount === 0 || state.tab !== 'non';
  }

  // ---------- telas ----------

  function renderHeader() {
    const busy = Boolean(state.job);
    return h(
      'header',
      { class: 'header' },
      h(
        'div',
        { class: 'brand' },
        h('strong', {}, 'Unfollowers'),
        h('span', {}, state.username ? `@${state.username}` : 'para Instagram'),
      ),
      h(
        'div',
        { class: 'header-actions' },
        h(
          'button',
          {
            class: `icon${state.showSettings ? ' active' : ''}`,
            type: 'button',
            title: busy ? 'Indisponível durante um scan ou unfollow' : 'Configurações',
            'aria-label': 'Configurações',
            disabled: busy,
            onClick: () => {
              state.showSettings = !state.showSettings;
              render();
            },
          },
          '⚙',
        ),
        h('button', { class: 'icon', type: 'button', title: 'Fechar', 'aria-label': 'Fechar', onClick: toggle }, '×'),
      ),
    );
  }

  function jobControls() {
    const job = state.job;
    return h(
      'div',
      { class: 'controls' },
      h(
        'button',
        {
          class: 'secondary',
          type: 'button',
          onClick: (event) => {
            job.paused = !job.paused;
            event.currentTarget.textContent = job.paused ? 'Retomar' : 'Pausar';
            if (!job.paused) setStatus('Retomando…');
          },
        },
        job.paused ? 'Retomar' : 'Pausar',
      ),
      h(
        'button',
        {
          class: 'secondary danger-text',
          type: 'button',
          onClick: () => {
            job.stopped = true;
            job.paused = false;
            setStatus('Parando…');
          },
        },
        'Parar',
      ),
    );
  }

  function renderIdle() {
    const cached = state.cached;
    return h(
      'section',
      { class: 'body intro' },
      h('h2', {}, 'Quem não te segue de volta'),
      h(
        'p',
        {},
        'O scan lê suas listas de seguidores e de seguindo direto do Instagram, com pausas entre as páginas. Tudo roda neste navegador: nenhum dado sai do instagram.com.',
      ),
      h('button', { class: 'primary', type: 'button', onClick: startScan }, 'Escanear agora'),
      cached &&
        cached.results &&
        h(
          'button',
          {
            class: 'secondary wide',
            type: 'button',
            onClick: () => {
              state.scan = cached;
              state.view = 'results';
              state.selected.clear();
              render();
              setStatus(`Scan de ${formatDate(cached.timestamp)} carregado.${cached.complete ? '' : ' Esse scan ficou incompleto.'}`);
            },
          },
          `Abrir último scan (${number(cached.results.length)} contas · ${formatDate(cached.timestamp)})`,
        ),
      h(
        'p',
        { class: 'note warn' },
        'Deixar de seguir em massa vai contra os termos do Instagram e pode gerar bloqueio temporário de ações. Mantenha as pausas padrão e não passe de ~100 por dia.',
      ),
    );
  }

  function renderScanning() {
    els.statFollowers = h('strong', {}, '0');
    els.statFollowing = h('strong', {}, '0');
    els.statFound = h('strong', {}, '0');
    const view = h(
      'section',
      { class: 'body' },
      h(
        'div',
        { class: 'stats' },
        h('div', { class: 'stat' }, h('span', {}, 'Seguidores lidos'), els.statFollowers),
        h('div', { class: 'stat' }, h('span', {}, 'Seguindo conferidos'), els.statFollowing),
        h('div', { class: 'stat accent' }, h('span', {}, 'Não te seguem'), els.statFound),
      ),
      h('p', { class: 'note' }, 'Pode fechar o painel: o scan continua nesta aba. Só não recarregue a página.'),
      jobControls(),
    );
    queueMicrotask(updateScanView);
    return view;
  }

  function renderResults() {
    const scan = state.scan;
    els.tabNon = h('button', { class: 'tab', type: 'button', onClick: () => switchTab('non') });
    els.tabWhite = h('button', { class: 'tab', type: 'button', onClick: () => switchTab('white') });
    els.list = h('div', { class: 'list', role: 'list' });
    els.more = h('button', {
      class: 'secondary wide',
      type: 'button',
      onClick: () => {
        state.shown += LIST_PAGE;
        renderList();
      },
    });
    els.showing = h('span', { class: 'showing' });
    els.unfollowBtn = h('button', {
      class: 'danger',
      type: 'button',
      title: scan.complete ? '' : 'Desativado: o scan ficou incompleto',
      onClick: startUnfollow,
    });

    const filter = (key, label) => {
      const input = h('input', { type: 'checkbox', checked: state.filters[key] });
      input.addEventListener('change', () => {
        state.filters[key] = input.checked;
        state.shown = LIST_PAGE;
        renderList();
      });
      return h('label', { class: 'chip' }, input, label);
    };

    const search = h('input', {
      class: 'search',
      type: 'search',
      placeholder: 'Buscar por @ ou nome…',
      value: state.search,
      'aria-label': 'Buscar',
    });
    search.addEventListener('input', () => {
      state.search = search.value;
      state.shown = LIST_PAGE;
      renderList();
    });

    els.selectRow = h(
      'div',
      { class: 'select-row' },
      h(
        'button',
        {
          class: 'link',
          type: 'button',
          onClick: () => {
            visibleUsers().forEach((u) => state.selected.add(u.id));
            renderList();
            renderResultsChrome();
          },
        },
        'Selecionar todos os filtrados',
      ),
      h(
        'button',
        {
          class: 'link',
          type: 'button',
          onClick: () => {
            state.selected.clear();
            renderList();
            renderResultsChrome();
          },
        },
        'Limpar seleção',
      ),
      els.showing,
    );

    const view = h(
      'section',
      { class: 'body results' },
      !scan.complete &&
        h(
          'p',
          { class: 'banner' },
          'Scan incompleto: ele parou antes de conferir todas as contas. Para proteger sua conta, deixar de seguir fica desativado. Rode um novo scan.',
        ),
      h('p', { class: 'meta' }, `Scan de ${formatDate(scan.timestamp)}`),
      h('nav', { class: 'tabs' }, els.tabNon, els.tabWhite),
      search,
      h('div', { class: 'filters' }, filter('verified', 'Verificados'), filter('private', 'Privados'), filter('noPic', 'Sem foto')),
      els.selectRow,
      els.list,
      els.more,
      h(
        'footer',
        { class: 'footer' },
        h(
          'div',
          { class: 'footer-tools' },
          h('button', { class: 'secondary', type: 'button', onClick: copyList }, 'Copiar'),
          h('button', { class: 'secondary', type: 'button', onClick: exportCsv }, 'CSV'),
          h('button', { class: 'secondary', type: 'button', onClick: startScan }, 'Novo scan'),
        ),
        els.unfollowBtn,
      ),
    );
    queueMicrotask(() => {
      renderList();
      renderResultsChrome();
    });
    return view;
  }

  function switchTab(tab) {
    if (state.tab === tab) return;
    state.tab = tab;
    state.shown = LIST_PAGE;
    renderList();
    renderResultsChrome();
  }

  function logEntry(entry) {
    const labels = {
      unfollowed: ['ok', 'Deixou de seguir'],
      unconfirmed: ['warn', 'Enviado, não confirmado'],
      failed: ['error', 'Falhou'],
      blocked: ['error', 'Bloqueado pelo Instagram'],
    };
    const [tone, label] = labels[entry.outcome] || labels.failed;
    return h(
      'div',
      { class: `log-item ${tone}`, title: entry.detail || '' },
      h('a', { href: `https://www.instagram.com/${entry.user.username}/`, target: '_blank', rel: 'noopener' }, `@${entry.user.username}`),
      h('span', {}, label),
    );
  }

  function appendLog(entry) {
    if (els.log) els.log.prepend(logEntry(entry));
  }

  function updateRunCounts() {
    const run = state.run;
    if (!run || !els.runDone) return;
    const ok = run.log.filter((e) => e.outcome === 'unfollowed').length;
    const bad = run.log.filter((e) => e.outcome === 'failed' || e.outcome === 'blocked').length;
    els.runDone.textContent = `${run.log.length} / ${run.total}`;
    els.runOk.textContent = String(ok);
    els.runBad.textContent = String(bad);
  }

  function renderUnfollowing() {
    const run = state.run;
    els.runDone = h('strong', {});
    els.runOk = h('strong', {});
    els.runBad = h('strong', {});
    els.log = h('div', { class: 'log' }, ...[...run.log].reverse().map(logEntry));
    const view = h(
      'section',
      { class: 'body' },
      h(
        'div',
        { class: 'stats' },
        h('div', { class: 'stat' }, h('span', {}, 'Processadas'), els.runDone),
        h('div', { class: 'stat ok' }, h('span', {}, 'Deixou de seguir'), els.runOk),
        h('div', { class: 'stat bad' }, h('span', {}, 'Falhas'), els.runBad),
      ),
      run.finished
        ? h(
            'button',
            {
              class: 'primary',
              type: 'button',
              onClick: () => {
                state.view = 'results';
                render();
              },
            },
            'Voltar aos resultados',
          )
        : h(
            'div',
            {},
            h('p', { class: 'note' }, 'Mantenha esta aba aberta até terminar. Pode fechar o painel.'),
            jobControls(),
          ),
      els.log,
    );
    queueMicrotask(updateRunCounts);
    return view;
  }

  function renderSettings() {
    const inputs = {};
    const rows = SETTINGS_FIELDS.map((field) => {
      const input = h('input', {
        type: 'number',
        min: field.min,
        step: field.factor === 1000 ? 0.5 : 1,
        value: state.settings[field.key] / field.factor,
        id: `iu-${field.key}`,
      });
      inputs[field.key] = input;
      return h(
        'div',
        { class: 'setting' },
        h('label', { for: `iu-${field.key}` }, field.label),
        h('div', { class: 'setting-input' }, input, h('span', {}, field.unit)),
      );
    });

    const fileInput = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (file) importWhitelist(file);
      fileInput.value = '';
    });

    return h(
      'section',
      { class: 'body settings' },
      h('h2', {}, 'Configurações'),
      ...rows,
      h('p', { class: 'note warn' }, 'Diminuir as esperas aumenta o risco de bloqueio da conta.'),
      h(
        'div',
        { class: 'controls' },
        h(
          'button',
          {
            class: 'primary',
            type: 'button',
            onClick: async () => {
              const next = { ...state.settings };
              for (const field of SETTINGS_FIELDS) {
                const value = Number(inputs[field.key].value);
                next[field.key] = Math.round(Math.max(field.min, Number.isFinite(value) ? value : field.min) * field.factor);
              }
              state.settings = next;
              await Store.saveSettings(next);
              state.showSettings = false;
              render();
              setStatus('Configurações salvas.', 'ok');
            },
          },
          'Salvar',
        ),
        h(
          'button',
          {
            class: 'secondary',
            type: 'button',
            onClick: () => {
              for (const field of SETTINGS_FIELDS) {
                inputs[field.key].value = Store.DEFAULT_SETTINGS[field.key] / field.factor;
              }
            },
          },
          'Restaurar padrão',
        ),
      ),
      h('h2', {}, `Whitelist (${number(state.whitelist.size)})`),
      h('p', { class: 'note' }, 'Contas na whitelist nunca entram na fila de unfollow. Exporte para ter um backup.'),
      h(
        'div',
        { class: 'controls' },
        h('button', { class: 'secondary', type: 'button', disabled: state.whitelist.size === 0, onClick: exportWhitelist }, 'Exportar'),
        h('button', { class: 'secondary', type: 'button', onClick: () => fileInput.click() }, 'Importar'),
        h(
          'button',
          {
            class: 'secondary danger-text',
            type: 'button',
            disabled: state.whitelist.size === 0,
            onClick: async () => {
              if (!confirm('Apagar toda a whitelist desta conta?')) return;
              state.whitelist.clear();
              await saveWhitelist();
              render();
              setStatus('Whitelist apagada.');
            },
          },
          'Apagar',
        ),
        fileInput,
      ),
    );
  }

  function render() {
    if (!els.panel) return;
    for (const key of ['list', 'unfollowBtn', 'log', 'runDone', 'statFollowers']) els[key] = null;
    els.bar = h('div', { class: 'bar' });
    els.bar.style.width = `${state.progress}%`;
    els.status = h('p', { class: `status ${state.status.tone}`, role: 'status', 'aria-live': 'polite' }, state.status.text);

    let body;
    if (state.showSettings) body = renderSettings();
    else if (state.view === 'scanning') body = renderScanning();
    else if (state.view === 'unfollowing') body = renderUnfollowing();
    else if (state.view === 'results' && state.scan) body = renderResults();
    else body = renderIdle();

    const showBar = state.view === 'scanning' || state.view === 'unfollowing';
    els.panel.replaceChildren(renderHeader(), h('div', { class: `progress${showBar ? '' : ' hidden'}` }, els.bar), els.status, body);
  }

  // ---------- montagem ----------

  function mount() {
    host = document.createElement('div');
    host.id = 'iu-unfollowers-host';
    host.hidden = true;
    const shadow = host.attachShadow({ mode: 'open' });
    const css = h('link', { rel: 'stylesheet', href: chrome.runtime.getURL('src/panel.css') });
    els.panel = h('aside', { class: 'panel', 'aria-label': 'Unfollowers' });
    shadow.append(css, els.panel);
    document.documentElement.append(host);
    return new Promise((resolve) => {
      css.addEventListener('load', resolve, { once: true });
      css.addEventListener('error', resolve, { once: true });
    });
  }

  async function loadAccount() {
    const uid = API.viewerId();
    state.settings = await Store.loadSettings();
    if (state.job || uid === state.uid) return;
    // Conta nova (ou primeira abertura): zera o estado da conta anterior.
    state.uid = uid;
    state.username = null;
    state.scan = null;
    state.selected.clear();
    state.view = 'idle';
    state.whitelist = new Map();
    state.cached = null;
    if (!uid) {
      setStatus('Faça login no Instagram para usar o Unfollowers.', 'error');
      return;
    }
    const [whitelist, cached] = await Promise.all([Store.loadWhitelist(uid), Store.loadScan(uid)]);
    state.whitelist = new Map(whitelist.map((u) => [String(u.id), u]));
    state.cached = cached;
    state.username = cached ? cached.username || null : null;
    setStatus('');
  }

  async function toggle() {
    if (!host) await mount();
    state.open = !state.open;
    if (state.open) {
      await loadAccount();
      render();
    }
    host.hidden = !state.open;
  }

  window.addEventListener('beforeunload', (event) => {
    if (!state.job) return;
    event.preventDefault();
    event.returnValue = '';
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === 'iu-toggle') {
      toggle().then(() => sendResponse({ open: state.open }));
      return true;
    }
    return false;
  });
})();
