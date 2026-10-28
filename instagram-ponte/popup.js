const PADRAO = "http://localhost:3000";
const campoCodigo = document.getElementById("codigo");
const campoApp = document.getElementById("app");
const botaoSync = document.getElementById("sync");
const botaoAbrir = document.getElementById("abrir");
const statusEl = document.getElementById("status");
let timer = null;

function normalizarApp(valor) {
  return String(valor || "").trim().replace(/\/+$/, "");
}

function render(status) {
  if (!status) {
    statusEl.className = "";
    statusEl.textContent = "Cole o código do painel e sincronize com o Instagram aberto nesta aba.";
    return;
  }
  statusEl.className = status.fase === "erro" ? "err" : status.fase === "pronto" ? "ok" : "";
  statusEl.textContent = status.mensagem || status.fase;
}

async function iniciar() {
  const { ponteCodigo, ponteApp, ponteStatus } = await chrome.storage.local.get([
    "ponteCodigo",
    "ponteApp",
    "ponteStatus",
  ]);
  campoCodigo.value = ponteCodigo || "";
  campoApp.value = ponteApp || PADRAO;
  render(ponteStatus);
  atualizarBotaoAbrir(ponteCodigo, ponteApp);
  if (ponteStatus && ponteStatus.fase !== "pronto" && ponteStatus.fase !== "erro") acompanhar();
}

function atualizarBotaoAbrir(codigo, app) {
  botaoAbrir.hidden = !codigo || !app;
  if (codigo && app) {
    botaoAbrir.onclick = () => {
      chrome.tabs.create({ url: `${normalizarApp(app)}/instagram?codigo=${encodeURIComponent(codigo)}` });
    };
  }
}

function acompanhar() {
  clearInterval(timer);
  timer = setInterval(async () => {
    const { ponteStatus } = await chrome.storage.local.get("ponteStatus");
    render(ponteStatus);
    if (ponteStatus && (ponteStatus.fase === "pronto" || ponteStatus.fase === "erro")) {
      clearInterval(timer);
      timer = null;
    }
  }, 700);
}

botaoSync.addEventListener("click", async () => {
  const codigo = campoCodigo.value.trim().toUpperCase();
  const app = normalizarApp(campoApp.value) || PADRAO;

  if (!/^[A-Z0-9-]{8,}$/.test(codigo)) {
    render({ fase: "erro", mensagem: "Código inválido. Copie o código do painel do Iadverra." });
    return;
  }

  const concedido = await chrome.permissions.request({ origins: [`${app}/*`] });
  if (!concedido) {
    render({ fase: "erro", mensagem: "Sem permissão para enviar os dados ao Iadverra." });
    return;
  }

  const [aba] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!aba || !/^https:\/\/www\.instagram\.com\//.test(aba.url || "")) {
    render({ fase: "erro", mensagem: "Abra o Instagram nesta aba (logado) antes de sincronizar." });
    return;
  }

  await chrome.storage.local.set({
    ponteCodigo: codigo,
    ponteApp: app,
    ponteStatus: { fase: "iniciando", mensagem: "Iniciando...", quando: Date.now() },
  });
  atualizarBotaoAbrir(codigo, app);
  render({ fase: "iniciando", mensagem: "Iniciando..." });

  try {
    await chrome.scripting.executeScript({ target: { tabId: aba.id }, files: ["sync.js"] });
    acompanhar();
  } catch (e) {
    render({ fase: "erro", mensagem: String(e && e.message ? e.message : e) });
  }
});

void iniciar();
