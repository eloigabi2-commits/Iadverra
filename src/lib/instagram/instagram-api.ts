import { MAX_PESSOAS, normalizarPessoa, type PessoaIg } from "./tipos";

const APP_ID = "936619743392459";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const BASE = "https://www.instagram.com";

export class ErroInstagram extends Error {
  constructor(
    public codigo: "login_required" | "rate_limit" | "falha" | "csrf",
    mensagem: string
  ) {
    super(mensagem);
    this.name = "ErroInstagram";
  }
}

export interface SessaoIg {
  cookies: Record<string, string>;
  userId: string;
  username: string;
  nome: string | null;
  foto: string | null;
  criadaEm: string;
}

export interface Pendente2fa {
  cookies: Record<string, string>;
  identifier: string;
  username: string;
  criadoEm: string;
}

export type ResultadoEntrar =
  | { tipo: "ok"; sessao: SessaoIg }
  | { tipo: "2fa"; pendente: Pendente2fa; mensagem: string }
  | { tipo: "desafio"; mensagem: string }
  | { tipo: "erro"; mensagem: string; status: number };

function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchIg(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    return await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

class Jar {
  private mapa = new Map<string, string>();

  absorver(res: Response): void {
    const lista =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : res.headers.get("set-cookie")
          ? [res.headers.get("set-cookie") as string]
          : [];
    for (const bruto of lista) {
      const par = bruto.split(";")[0] ?? "";
      const igual = par.indexOf("=");
      if (igual < 1) continue;
      const nome = par.slice(0, igual).trim();
      const valor = par.slice(igual + 1).trim();
      if (!nome) continue;
      if (!valor || /expires=Thu, 01 Jan 1970/i.test(bruto)) this.mapa.delete(nome);
      else this.mapa.set(nome, valor);
    }
  }

  get(nome: string): string | null {
    return this.mapa.get(nome) ?? null;
  }

  set(nome: string, valor: string): void {
    this.mapa.set(nome, valor);
  }

  header(): string {
    return [...this.mapa].map(([nome, valor]) => `${nome}=${valor}`).join("; ");
  }

  json(): Record<string, string> {
    return Object.fromEntries(this.mapa);
  }

  static de(dados: Record<string, string>): Jar {
    const jar = new Jar();
    for (const [nome, valor] of Object.entries(dados)) jar.set(nome, valor);
    return jar;
  }
}

function cabecalhos(jar: Jar, extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = {
    "user-agent": UA,
    accept: "*/*",
    "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
    "x-ig-app-id": APP_ID,
    "x-asbd-id": "129477",
    "x-requested-with": "XMLHttpRequest",
    origin: BASE,
    referer: `${BASE}/`,
    ...extra,
  };
  const csrf = jar.get("csrftoken");
  if (csrf) h["x-csrftoken"] = csrf;
  const cookie = jar.header();
  if (cookie) h.cookie = cookie;
  return h;
}

function jazoest(csrf: string): string {
  let soma = 0;
  for (const caractere of csrf) soma += caractere.charCodeAt(0);
  return `2${soma}`;
}

function jsonSeguro(texto: string): Record<string, unknown> {
  try {
    const valor = JSON.parse(texto) as unknown;
    return valor && typeof valor === "object" ? (valor as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function iniciarJar(): Promise<Jar> {
  const jar = new Jar();
  const res = await fetchIg(`${BASE}/accounts/login/`, {
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  });
  if (res.status === 429) throw new ErroInstagram("rate_limit", "O Instagram pediu pausa. Tente mais tarde.");
  jar.absorver(res);
  const html = await res.text().catch(() => "");
  if (!jar.get("csrftoken")) {
    const achado = html.match(/"csrf_token":"([^"]+)"/);
    if (achado?.[1]) jar.set("csrftoken", achado[1]);
  }
  if (!jar.get("csrftoken")) {
    throw new ErroInstagram("csrf", "Não consegui abrir a sessão do Instagram. Tente de novo.");
  }
  return jar;
}

async function lerPerfil(jar: Jar, userId: string): Promise<PessoaIg | null> {
  try {
    const res = await fetchIg(`${BASE}/api/v1/users/${userId}/info/`, {
      headers: cabecalhos(jar, { referer: `${BASE}/` }),
    });
    if (!res.ok) return null;
    const corpo = (await res.json().catch(() => null)) as
      | { user?: Record<string, unknown> }
      | Record<string, unknown>
      | null;
    if (!corpo) return null;
    const u = (corpo as { user?: Record<string, unknown> }).user ?? (corpo as Record<string, unknown>);
    if (!u || typeof u.username !== "string") return null;
    return normalizarPessoa({
      igId: String(u.pk ?? u.id ?? userId),
      username: u.username,
      nome: u.full_name,
      foto: u.profile_pic_url,
      privado: u.is_private,
      verificado: u.is_verified,
    });
  } catch {
    return null;
  }
}

async function sessaoDe(
  jar: Jar,
  userId: string,
  username: string,
  nome: string | null,
  foto: string | null
): Promise<SessaoIg> {
  return {
    cookies: jar.json(),
    userId,
    username: username.replace(/^@/, "").toLowerCase(),
    nome,
    foto,
    criadaEm: new Date().toISOString(),
  };
}

export async function entrarNoInstagram(usernameBruto: string, senha: string): Promise<ResultadoEntrar> {
  const username = usernameBruto.replace(/^@/, "").trim().toLowerCase();
  let jar: Jar;
  try {
    jar = await iniciarJar();
  } catch (e) {
    if (e instanceof ErroInstagram) {
      return { tipo: "erro", mensagem: e.message, status: e.codigo === "rate_limit" ? 429 : 502 };
    }
    return { tipo: "erro", mensagem: "Sem conexão com o Instagram.", status: 502 };
  }

  const csrf = jar.get("csrftoken") as string;
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("enc_password", `#PWD_INSTAGRAM_BROWSER:0:${Date.now()}:${senha}`);
  body.set("queryParams", "{}");
  body.set("optIntoOneTap", "false");
  body.set("stopDeletionNonce", "");
  body.set("trustedDeviceRecords", "{}");
  body.set("jazoest", jazoest(csrf));

  let res: Response;
  try {
    res = await fetchIg(`${BASE}/api/v1/web/accounts/login/ajax/`, {
      method: "POST",
      headers: cabecalhos(jar, {
        "content-type": "application/x-www-form-urlencoded",
        "x-csrftoken": csrf,
        "x-instagram-ajax": "1",
        referer: `${BASE}/accounts/login/`,
      }),
      body,
      redirect: "manual",
    });
  } catch {
    return { tipo: "erro", mensagem: "O Instagram não respondeu. Tente de novo.", status: 502 };
  }

  jar.absorver(res);
  const texto = await res.text().catch(() => "");
  const corpo = jsonSeguro(texto);
  const mensagem = String(corpo.message ?? corpo.error_type ?? "").toLowerCase();
  const local = res.headers.get("location") ?? "";

  if (res.status === 429 || mensagem === "rate_limit") {
    return { tipo: "erro", mensagem: "O Instagram pediu pausa. Espere alguns minutos.", status: 429 };
  }

  if (corpo.two_factor_required === true || mensagem === "two_factor_required") {
    const info = (corpo.two_factor_info ?? {}) as Record<string, unknown>;
    const identifier = String(info.two_factor_identifier ?? info.identifier ?? "");
    if (!identifier) {
      return { tipo: "erro", mensagem: "O Instagram pediu 2FA, mas não abriu a confirmação.", status: 502 };
    }
    return {
      tipo: "2fa",
      pendente: {
        cookies: jar.json(),
        identifier,
        username: String(info.username ?? username),
        criadoEm: new Date().toISOString(),
      },
      mensagem: "Digite o código de confirmação do Instagram.",
    };
  }

  if (mensagem.includes("challenge") || mensagem.includes("checkpoint") || local.includes("challenge") || corpo.checkpoint_url) {
    return {
      tipo: "desafio",
      mensagem:
        "O Instagram pediu verificação. Abra o app do Instagram, aprove a tentativa de login e toque em entrar de novo.",
    };
  }

  if (corpo.authenticated === true || (corpo.user === true && corpo.userId != null)) {
    const userId = String(corpo.userId ?? jar.get("ds_user_id") ?? "");
    if (!userId || !jar.get("sessionid")) {
      return { tipo: "erro", mensagem: "O Instagram aceitou o login mas não devolveu a sessão.", status: 502 };
    }
    const perfil = await lerPerfil(jar, userId);
    return {
      tipo: "ok",
      sessao: await sessaoDe(
        jar,
        userId,
        perfil?.username ?? username,
        perfil?.nome ?? null,
        perfil?.foto ?? null
      ),
    };
  }

  if (res.status === 403) {
    return {
      tipo: "desafio",
      mensagem:
        "O Instagram bloqueou esta tentativa. Abra o app do Instagram, confirme que é você e tente de novo.",
    };
  }

  if (mensagem === "bad_password") {
    return { tipo: "erro", mensagem: "Usuário ou senha incorretos.", status: 401 };
  }
  if (mensagem === "wait_few_minutes") {
    return { tipo: "erro", mensagem: "O Instagram pediu para esperar alguns minutos.", status: 429 };
  }

  return {
    tipo: "erro",
    mensagem: "O Instagram recusou o login. Confira o usuário e a senha.",
    status: 401,
  };
}

export async function verificarCodigo2fa(pendente: Pendente2fa, codigo: string): Promise<ResultadoEntrar> {
  const jar = Jar.de(pendente.cookies);
  const csrf = jar.get("csrftoken") ?? "";
  const body = new URLSearchParams();
  body.set("username", pendente.username);
  body.set("identifier", pendente.identifier);
  body.set("verificationCode", codigo);
  body.set("queryParams", "{}");
  body.set("trustedDeviceRecords", "{}");

  let res: Response;
  try {
    res = await fetchIg(`${BASE}/api/v1/web/accounts/login/ajax/two_factor/`, {
      method: "POST",
      headers: cabecalhos(jar, {
        "content-type": "application/x-www-form-urlencoded",
        "x-csrftoken": csrf,
        "x-instagram-ajax": "1",
        referer: `${BASE}/accounts/login/two_factor/`,
      }),
      body,
      redirect: "manual",
    });
  } catch {
    return { tipo: "erro", mensagem: "O Instagram não respondeu. Tente de novo.", status: 502 };
  }

  jar.absorver(res);
  const texto = await res.text().catch(() => "");
  const corpo = jsonSeguro(texto);
  const mensagem = String(corpo.message ?? corpo.error_type ?? "").toLowerCase();

  if (corpo.authenticated === true || (corpo.user === true && corpo.userId != null)) {
    const userId = String(corpo.userId ?? jar.get("ds_user_id") ?? "");
    if (!userId || !jar.get("sessionid")) {
      return { tipo: "erro", mensagem: "A confirmação passou, mas a sessão não foi salva.", status: 502 };
    }
    const perfil = await lerPerfil(jar, userId);
    return {
      tipo: "ok",
      sessao: await sessaoDe(
        jar,
        userId,
        perfil?.username ?? pendente.username,
        perfil?.nome ?? null,
        perfil?.foto ?? null
      ),
    };
  }

  if (mensagem === "invalid_code" || mensagem === "bad_password") {
    return { tipo: "erro", mensagem: "Código incorreto. Confira e tente de novo.", status: 401 };
  }
  if (mensagem.includes("challenge") || mensagem.includes("checkpoint")) {
    return {
      tipo: "desafio",
      mensagem: "O Instagram pediu outra verificação. Abra o app, aprove a tentativa e entre de novo.",
    };
  }
  if (res.status === 429) {
    return { tipo: "erro", mensagem: "O Instagram pediu pausa. Espere alguns minutos.", status: 429 };
  }

  return { tipo: "erro", mensagem: "Não consegui confirmar o código. Tente de novo.", status: 401 };
}

export async function listar(
  sessao: SessaoIg,
  tipo: "followers" | "following",
  limite: number
): Promise<{ pessoas: PessoaIg[]; truncado: boolean }> {
  const jar = Jar.de(sessao.cookies);
  const pessoas: PessoaIg[] = [];
  const vistos = new Set<string>();
  let maxId = "";
  let truncado = false;

  for (let pagina = 0; pagina < 400; pagina++) {
    if (Date.now() > limite) {
      truncado = true;
      break;
    }
    if (pagina > 0) await dormir(250 + Math.random() * 200);

    let url = `${BASE}/api/v1/friendships/${sessao.userId}/${tipo}/?count=50`;
    url += tipo === "followers" ? "&search_surface=follow_list_page" : "&order=date_followed_latest";
    if (maxId) url += `&max_id=${encodeURIComponent(maxId)}`;

    const res = await fetchIg(url, {
      headers: cabecalhos(jar, {
        referer: `${BASE}/${sessao.username}/`,
        "x-ig-www-claim": "0",
      }),
    });

    if (res.status === 401 || res.status === 403) {
      throw new ErroInstagram("login_required", "Sua sessão do Instagram expirou.");
    }
    if (res.status === 429) {
      throw new ErroInstagram("rate_limit", "O Instagram pediu pausa. Tente mais tarde.");
    }
    if (!res.ok) {
      throw new ErroInstagram("falha", `O Instagram respondeu ${res.status}.`);
    }

    const dados = (await res.json().catch(() => null)) as
      | { users?: unknown[]; next_max_id?: unknown; has_more?: unknown }
      | null;
    if (!dados) throw new ErroInstagram("falha", "O Instagram não devolveu os dados esperados.");

    const usuarios = Array.isArray(dados.users) ? dados.users : [];
    for (const bruto of usuarios) {
      const u = (bruto ?? {}) as Record<string, unknown>;
      const pessoa = normalizarPessoa({
        igId: u.pk != null ? String(u.pk) : null,
        username: u.username,
        nome: u.full_name,
        foto: u.profile_pic_url,
        privado: u.is_private,
        verificado: u.is_verified,
      });
      if (!pessoa || vistos.has(pessoa.id)) continue;
      vistos.add(pessoa.id);
      pessoas.push(pessoa);
      if (pessoas.length >= MAX_PESSOAS) {
        truncado = true;
        break;
      }
    }

    const proximo = dados.next_max_id != null ? String(dados.next_max_id) : "";
    if (truncado || dados.has_more === false || !proximo) break;
    maxId = proximo;
  }

  return { pessoas, truncado };
}

export async function perfilExiste(sessao: SessaoIg, id: string): Promise<boolean | null> {
  const jar = Jar.de(sessao.cookies);
  const res = await fetchIg(`${BASE}/api/v1/users/${id}/info/`, {
    headers: cabecalhos(jar, { referer: `${BASE}/`, "x-ig-www-claim": "0" }),
  });
  if (res.status === 404) return false;
  if (res.status === 429) return null;
  if (res.status === 401 || res.status === 403) {
    throw new ErroInstagram("login_required", "Sua sessão do Instagram expirou.");
  }
  if (!res.ok) return null;
  const corpo = (await res.json().catch(() => null)) as { user?: unknown } | null;
  return Boolean(corpo && corpo.user);
}
