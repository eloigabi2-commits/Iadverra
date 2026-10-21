// Persistência em chrome.storage.local. Whitelist e último scan ficam
// separados por conta (id do usuário logado), para não misturar perfis.
globalThis.IU_STORE = globalThis.IU_STORE || (() => {
  const DEFAULT_SETTINGS = {
    scanDelayMs: 1200, // espera entre páginas do scan
    scanLongPauseEvery: 15, // páginas até uma pausa longa
    scanLongPauseMs: 10000,
    unfollowDelayMs: 5000, // espera entre um unfollow e outro
    unfollowPauseEvery: 5, // unfollows até uma pausa de segurança
    unfollowPauseMs: 300000,
    maxUnfollowsPerRun: 100, // limite por rodada
  };

  async function get(key, fallback) {
    const data = await chrome.storage.local.get(key);
    return data[key] ?? fallback;
  }

  function set(key, value) {
    return chrome.storage.local.set({ [key]: value });
  }

  return {
    DEFAULT_SETTINGS,
    async loadSettings() {
      return { ...DEFAULT_SETTINGS, ...(await get('settings', {})) };
    },
    saveSettings: (settings) => set('settings', settings),
    loadWhitelist: (uid) => get(`whitelist:${uid}`, []),
    saveWhitelist: (uid, users) => set(`whitelist:${uid}`, users),
    loadScan: (uid) => get(`scan:${uid}`, null),
    saveScan: (uid, scan) => set(`scan:${uid}`, scan),
  };
})();
