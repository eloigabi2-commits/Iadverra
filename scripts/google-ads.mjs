// Consulta a API do Google Ads (REST) com as credenciais OAuth do ambiente.
// Não tem dependências: roda direto com `node`, mesmo sem `npm install`.
//
// Uso:
//   node scripts/google-ads.mjs check                     # confere se as variáveis existem (sem mostrar valores)
//   node scripts/google-ads.mjs accounts                  # lista as contas que o login enxerga
//   node scripts/google-ads.mjs campaigns [dias]          # resumo das campanhas (padrão: últimos 30 dias)
//   node scripts/google-ads.mjs query "SELECT ..."        # qualquer consulta GAQL
//   node scripts/google-ads.mjs mutate plano.json         # testa (validateOnly) as operações, sem alterar nada
//   node scripts/google-ads.mjs mutate plano.json --apply # aplica de verdade, só depois do "sim" do dono da conta
//
// O arquivo do mutate é um JSON com a lista "mutateOperations" do GoogleAdsService.Mutate. As operações rodam
// numa transação só (tudo ou nada) e podem se referir umas às outras por IDs temporários negativos.
//
// Opções:
//   --customer 2955725842   conta a consultar (padrão: GOOGLE_ADS_CUSTOMER_ID ou 2955725842, Dra Jessica)
//
// Variáveis de ambiente:
//   GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN   (obrigatórias)
//   GOOGLE_ADS_CUSTOMER_ID         conta padrão
//   GOOGLE_ADS_LOGIN_CUSTOMER_ID   ID da MCC, só se a conta for acessada via administrador
//   GOOGLE_ADS_DEVELOPER_TOKEN     opcional: desde set/2026 o acesso vem do projeto do Google Cloud
//   GOOGLE_ADS_API_VERSION         padrão: v25

import { readFile } from "node:fs/promises";

const API_VERSION = process.env.GOOGLE_ADS_API_VERSION ?? "v25";
const DEFAULT_CUSTOMER = "2955725842";
const REQUIRED = [
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_REFRESH_TOKEN",
];

const digits = (id) => String(id).replace(/\D/g, "");

function parseArgs(argv) {
  const positional = [];
  let customer = process.env.GOOGLE_ADS_CUSTOMER_ID ?? DEFAULT_CUSTOMER;
  let apply = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--customer") customer = argv[++i];
    else if (argv[i] === "--apply") apply = true;
    else positional.push(argv[i]);
  }
  return { command: positional[0] ?? "check", rest: positional.slice(1), customer: digits(customer), apply };
}

function missingVars() {
  return REQUIRED.filter((name) => !process.env[name]);
}

async function accessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Falha ao renovar o token OAuth (${res.status}): ${body.error} ${body.error_description ?? ""}`);
  }
  return body.access_token;
}

async function adsFetch(path, init = {}) {
  const headers = {
    Authorization: `Bearer ${await accessToken()}`,
    "Content-Type": "application/json",
  };
  if (process.env.GOOGLE_ADS_DEVELOPER_TOKEN) headers["developer-token"] = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) {
    headers["login-customer-id"] = digits(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  }
  const res = await fetch(`https://googleads.googleapis.com/${API_VERSION}/${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`Google Ads API ${res.status}: ${JSON.stringify(body.error ?? body, null, 2)}`);
  return body;
}

async function search(customer, query) {
  const rows = [];
  let pageToken;
  do {
    const page = await adsFetch(`customers/${customer}/googleAds:search`, {
      method: "POST",
      body: JSON.stringify({ query, pageToken }),
    });
    rows.push(...(page.results ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return rows;
}

function campaignsQuery(days) {
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);
  const ymd = (d) => d.toISOString().slice(0, 10);
  return `
    SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
           metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions,
           metrics.ctr, metrics.average_cpc
    FROM campaign
    WHERE segments.date BETWEEN '${ymd(start)}' AND '${ymd(end)}'
    ORDER BY metrics.cost_micros DESC`;
}

async function main() {
  const { command, rest, customer, apply } = parseArgs(process.argv.slice(2));

  const missing = missingVars();
  if (command === "check") {
    for (const name of REQUIRED) console.log(`${name}: ${process.env[name] ? "ok" : "FALTANDO"}`);
    if (missing.length) process.exit(1);
    await accessToken();
    console.log("Token OAuth renovado com sucesso.");
    return;
  }
  if (missing.length) {
    console.error(`Faltam variáveis de ambiente: ${missing.join(", ")}. Elas são configuradas no ambiente cloud (Editar ambiente) e só valem em sessões novas.`);
    process.exit(1);
  }

  let result;
  if (command === "accounts") {
    result = await adsFetch("customers:listAccessibleCustomers");
  } else if (command === "campaigns") {
    result = await search(customer, campaignsQuery(Number(rest[0] ?? 30)));
  } else if (command === "query") {
    if (!rest[0]) throw new Error('Informe a consulta GAQL: node scripts/google-ads.mjs query "SELECT ..."');
    result = await search(customer, rest.join(" "));
  } else if (command === "mutate") {
    if (!rest[0]) throw new Error("Informe o arquivo JSON: node scripts/google-ads.mjs mutate plano.json [--apply]");
    const { mutateOperations } = JSON.parse(await readFile(rest[0], "utf8"));
    result = await adsFetch(`customers/${customer}/googleAds:mutate`, {
      method: "POST",
      body: JSON.stringify({ mutateOperations, validateOnly: !apply, responseContentType: "RESOURCE_NAME_ONLY" }),
    });
    console.error(apply ? `Aplicado: ${mutateOperations.length} operações.` : `Validado sem alterar nada: ${mutateOperations.length} operações. Use --apply para aplicar.`);
  } else {
    throw new Error(`Comando desconhecido: ${command}. Use check, accounts, campaigns, query ou mutate.`);
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
