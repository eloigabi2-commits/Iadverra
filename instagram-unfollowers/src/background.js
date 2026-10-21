// Clique no ícone da extensão: abre/fecha o painel na aba do Instagram,
// ou abre o Instagram se a aba atual for outro site.
const INSTAGRAM = 'https://www.instagram.com/';
const CONTENT_FILES = ['src/storage.js', 'src/api.js', 'src/content.js'];

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || !tab.url.startsWith(INSTAGRAM)) {
    await chrome.tabs.create({ url: INSTAGRAM });
    return;
  }
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'iu-toggle' });
  } catch {
    // Aba aberta antes da instalação: o content script ainda não está lá.
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: CONTENT_FILES });
    await chrome.tabs.sendMessage(tab.id, { type: 'iu-toggle' });
  }
});
