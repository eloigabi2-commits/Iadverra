// Chamadas à API web do Instagram, feitas com a sessão já logada no navegador.
// Nada sai do instagram.com: não há servidor da extensão no meio.
globalThis.IU_API = globalThis.IU_API || (() => {
  const BASE = 'https://www.instagram.com';
  const APP_ID = '936619743392459';
  const ASBD_ID = '129477';
  // Fallback GraphQL (o mesmo que o site usa no botão "Seguindo" > "Deixar de seguir").
  const UNFOLLOW_DOC_ID = '27789106940691111';
  const UNFOLLOW_FRIENDLY_NAME = 'usePolarisUnfollowMutation';
  const NO_PICTURE_IDS = [
    '44884218_345707102882519_2446069589734326272_n',
    '464760996_1254146839119862_3605321457742435801_n',
  ];
  const BLOCK_PATTERN = /feedback_required|checkpoint|action_blocked|try again later|rate limit|please wait|tente novamente/i;

  class InstagramError extends Error {
    constructor(status, message, body) {
      super(message);
      this.name = 'InstagramError';
      this.status = status;
      this.body = body;
      this.blocked = isBlockSignal(status, body);
    }
  }

  function isBlockSignal(status, body) {
    if (status === 429) return true;
    if (!body) return false;
    if (body.spam === true) return true;
    const text = JSON.stringify([body.message, body.error_type, body.errors, body.error, body.errorSummary]);
    return BLOCK_PATTERN.test(text);
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function viewerId() {
    return getCookie('ds_user_id');
  }

  function headers(extra = {}) {
    const h = {
      'X-IG-App-ID': APP_ID,
      'X-ASBD-ID': ASBD_ID,
      'X-Requested-With': 'XMLHttpRequest',
      Accept: '*/*',
    };
    const csrf = getCookie('csrftoken');
    if (csrf) h['X-CSRFToken'] = csrf;
    try {
      const claim = sessionStorage.getItem('www-claim-v2');
      if (claim) h['X-IG-WWW-Claim'] = claim;
    } catch {
      // sessionStorage indisponível: segue sem o header.
    }
    return { ...h, ...extra };
  }

  async function readJson(res) {
    const text = await res.text().catch(() => '');
    try {
      return JSON.parse(text.replace(/^for \(;;\);/, ''));
    } catch {
      return null;
    }
  }

  async function getJson(url) {
    const res = await fetch(url, { credentials: 'include', headers: headers() });
    const body = await readJson(res);
    if (!res.ok || !body || body.status === 'fail') {
      throw new InstagramError(res.status, (body && body.message) || `Instagram respondeu HTTP ${res.status}`, body);
    }
    return body;
  }

  function normalizeUser(raw) {
    return {
      id: String(raw.pk_id ?? raw.pk ?? raw.id),
      username: raw.username || '',
      full_name: raw.full_name || '',
      profile_pic_url: raw.profile_pic_url || '',
      is_private: Boolean(raw.is_private),
      is_verified: Boolean(raw.is_verified),
    };
  }

  // Ids que o Instagram pode devolver para a mesma conta (pk, pk_id, id) + username.
  function identities(raw) {
    const ids = [];
    for (const value of [raw.pk, raw.pk_id, raw.id]) {
      const id = value === undefined || value === null ? '' : String(value).trim();
      if (id && !ids.includes(id)) ids.push(id);
    }
    return { ids, username: (raw.username || '').trim().toLowerCase() };
  }

  function hasNoPicture(user) {
    return !user.profile_pic_url || NO_PICTURE_IDS.some((id) => user.profile_pic_url.includes(id));
  }

  async function userCounts(userId) {
    try {
      const body = await getJson(`${BASE}/api/v1/users/${userId}/info/`);
      return {
        followers: body.user?.follower_count ?? null,
        following: body.user?.following_count ?? null,
        username: body.user?.username ?? null,
      };
    } catch {
      return { followers: null, following: null, username: null };
    }
  }

  function friendshipsPage(kind, userId, maxId, count = 50) {
    const params = new URLSearchParams({ count: String(count) });
    if (maxId) params.set('max_id', maxId);
    if (kind === 'followers') params.set('search_surface', 'follow_list_page');
    return getJson(`${BASE}/api/v1/friendships/${userId}/${kind}/?${params}`);
  }

  // true = ainda segue, false = não segue mais, null = não deu para verificar.
  async function isStillFollowing(user) {
    const uid = viewerId();
    if (!uid) return null;
    const params = new URLSearchParams({ count: '12', query: user.username, search_surface: 'follow_list_page' });
    try {
      const body = await getJson(`${BASE}/api/v1/friendships/${uid}/following/?${params}`);
      const username = user.username.toLowerCase();
      return (body.users || []).some((raw) => {
        const who = identities(raw);
        return who.ids.includes(user.id) || who.username === username;
      });
    } catch {
      return null;
    }
  }

  async function confirmFromStatus(user, friendshipStatus) {
    if (friendshipStatus && friendshipStatus.following === false && !friendshipStatus.outgoing_request) {
      return { outcome: 'unfollowed', detail: 'confirmado pela resposta' };
    }
    if (friendshipStatus && friendshipStatus.following === true) {
      return { outcome: 'failed', detail: 'o Instagram respondeu, mas ainda mostra "seguindo"' };
    }
    const still = await isStillFollowing(user);
    if (still === false) return { outcome: 'unfollowed', detail: 'confirmado na lista de seguindo' };
    if (still === true) return { outcome: 'failed', detail: 'a conta continua na sua lista de seguindo' };
    return { outcome: 'unconfirmed', detail: 'o Instagram aceitou, mas não foi possível confirmar' };
  }

  function findFriendshipStatus(value) {
    if (!value || typeof value !== 'object') return undefined;
    if (value.friendship_status && typeof value.friendship_status === 'object') return value.friendship_status;
    for (const child of Object.values(value)) {
      const found = findFriendshipStatus(child);
      if (found) return found;
    }
    return undefined;
  }

  async function unfollowRest(user) {
    const res = await fetch(`${BASE}/api/v1/friendships/destroy/${encodeURIComponent(user.id)}/`, {
      method: 'POST',
      credentials: 'include',
      headers: headers({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      body: new URLSearchParams({ user_id: user.id, container_module: 'profile' }).toString(),
    });
    const body = await readJson(res);
    return { res, body };
  }

  let sessionTokens = null;

  function parseTokens(html) {
    const dtsg = /"DTSGInitialData",\[\],\{"token":"([^"]+)"/.exec(html)?.[1] ?? /"dtsg":\{"token":"([^"]+)"/.exec(html)?.[1];
    const lsd = /"LSD",\[\],\{"token":"([^"]+)"/.exec(html)?.[1];
    if (!dtsg || !lsd) return null;
    return { dtsg, lsd, revision: /"client_revision":(\d+)/.exec(html)?.[1] };
  }

  async function loadSessionTokens() {
    if (sessionTokens) return sessionTokens;
    sessionTokens = parseTokens(document.documentElement.innerHTML);
    if (!sessionTokens) {
      try {
        const res = await fetch(`${BASE}/`, { credentials: 'include' });
        sessionTokens = parseTokens(await res.text());
      } catch {
        sessionTokens = null;
      }
    }
    return sessionTokens;
  }

  async function unfollowGraphql(user) {
    const tokens = await loadSessionTokens();
    if (!tokens) return null;
    const jazoest = `2${[...tokens.dtsg].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)}`;
    const form = {
      av: viewerId() || '',
      __d: 'www',
      __user: '0',
      __a: '1',
      __comet_req: '7',
      fb_dtsg: tokens.dtsg,
      jazoest,
      lsd: tokens.lsd,
      fb_api_caller_class: 'RelayModern',
      fb_api_req_friendly_name: UNFOLLOW_FRIENDLY_NAME,
      variables: JSON.stringify({
        target_user_id: user.id,
        container_module: 'profile',
        nav_chain: 'PolarisProfilePostsTabRoot:profilePage:1:via_cold_start',
      }),
      server_timestamps: 'true',
      doc_id: UNFOLLOW_DOC_ID,
    };
    if (tokens.revision) {
      form.__rev = tokens.revision;
      form.__spin_r = tokens.revision;
    }
    const res = await fetch(`${BASE}/api/graphql`, {
      method: 'POST',
      credentials: 'include',
      headers: headers({
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-FB-Friendly-Name': UNFOLLOW_FRIENDLY_NAME,
        'X-FB-LSD': tokens.lsd,
      }),
      body: new URLSearchParams(form).toString(),
    });
    const body = await readJson(res);
    return { res, body };
  }

  // Resultado: { outcome: 'unfollowed' | 'unconfirmed' | 'failed' | 'blocked', detail }
  async function unfollow(user) {
    const rest = await unfollowRest(user);
    if (isBlockSignal(rest.res.status, rest.body)) {
      return { outcome: 'blocked', detail: `bloqueio do Instagram (HTTP ${rest.res.status})` };
    }
    if (rest.res.ok && rest.body && rest.body.status === 'ok') {
      return confirmFromStatus(user, rest.body.friendship_status);
    }

    const graphql = await unfollowGraphql(user);
    if (!graphql) {
      return { outcome: 'failed', detail: `HTTP ${rest.res.status} e sem tokens para o método alternativo` };
    }
    if (isBlockSignal(graphql.res.status, graphql.body)) {
      return { outcome: 'blocked', detail: `bloqueio do Instagram (HTTP ${graphql.res.status})` };
    }
    const body = graphql.body;
    if (!graphql.res.ok || !body || body.errors || body.error || body.status === 'fail' || !body.data) {
      return { outcome: 'failed', detail: `HTTP ${rest.res.status} / ${graphql.res.status}` };
    }
    return confirmFromStatus(user, findFriendshipStatus(body.data));
  }

  return {
    InstagramError,
    viewerId,
    normalizeUser,
    identities,
    hasNoPicture,
    userCounts,
    friendshipsPage,
    unfollow,
  };
})();
