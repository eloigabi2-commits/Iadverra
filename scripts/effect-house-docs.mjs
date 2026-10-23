// Baixa a documentação do Effect House (TikTok) e converte cada página em
// Markdown, para consultar a API de scripts sem abrir o site. Não tem
// dependências: usa o `curl` do sistema, que respeita HTTPS_PROXY.
//
// Uso:
//   node scripts/effect-house-docs.mjs                 # só a API Reference (padrão)
//   node scripts/effect-house-docs.mjs --all           # o site /learn inteiro
//   node scripts/effect-house-docs.mjs --filter 2d-ui  # só URLs que contêm o texto
//
// Opções:
//   --out docs/effect-house   pasta de saída (padrão; fica fora do git)

import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { promisify } from "node:util";

const BASE = "https://effecthouse.tiktok.com";
const SITEMAP = `${BASE}/learn/sitemap.xml`;
const CONCURRENCY = 6;

const run = promisify(execFile);

function parseArgs(argv) {
  const opts = { all: false, filter: null, out: "docs/effect-house" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--all") opts.all = true;
    else if (argv[i] === "--filter") opts.filter = argv[++i];
    else if (argv[i] === "--out") opts.out = argv[++i];
  }
  return opts;
}

async function get(url) {
  const { stdout } = await run("curl", ["-sSfL", "--retry", "3", url], { maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&(\w+|#39);/g, (m, e) => ENTITIES[e] ?? m)
    .replace(/​/g, "");
}

const stripTags = (s) => decode(s.replace(/<[^>]+>/g, ""));

/** Converte o HTML do artigo (Docusaurus) em Markdown legível. */
function toMarkdown(html) {
  const blocks = [];
  // Blocos de código primeiro, para que nada dentro deles seja reinterpretado.
  html = html.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/g, (_, inner) => {
    const code = decode(inner.replace(/<br\s*\/?>/g, "\n").replace(/<\/div>\s*<div[^>]*>/g, "\n").replace(/<[^>]+>/g, ""));
    blocks.push("\n```ts\n" + code.replace(/\n+$/, "") + "\n```\n");
    return `\u0000${blocks.length - 1}\u0000`;
  });

  html = html
    .replace(/<button[\s\S]*?<\/button>/g, "")
    .replace(/<nav[\s\S]*?<\/nav>/g, "")
    .replace(/<a [^>]*class="hash-link"[^>]*>[\s\S]*?<\/a>/g, "")
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g, (_, n, t) => `\n\n${"#".repeat(Number(n))} ${stripTags(t).trim()}\n\n`)
    .replace(/<tr[^>]*>([\s\S]*?)<\/tr>/g, (_, row) => {
      const cells = [...row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((m) =>
        m[1].replace(/<br\s*\/?>/g, " ").replace(/<\/(p|li)>/g, " ").replace(/\|/g, "\\|"),
      );
      return `\n| ${cells.join(" | ")} |`;
    })
    .replace(/<\/thead>/g, "\n|---|")
    .replace(/<table[^>]*>/g, "\n\n")
    .replace(/<\/table>/g, "\n\n")
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/g, (_, c) => "`" + stripTags(c) + "`")
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/g, "**$2**")
    .replace(/<(em|i)>([\s\S]*?)<\/\1>/g, "_$2_")
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (_, href, t) => {
      const url = href.startsWith("/") ? BASE + href : href;
      return `[${stripTags(t).trim()}](${url})`;
    })
    .replace(/<img [^>]*alt="([^"]*)"[^>]*>/g, (_, alt) => (alt ? `[imagem: ${alt}]` : ""))
    .replace(/<li[^>]*>/g, "\n- ")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<\/(p|div|ul|ol|header|section|blockquote|details|summary)>/g, "\n\n");

  let md = decode(html.replace(/<[^>]+>/g, ""));
  md = md.replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[Number(i)]);
  return md
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    // O separador do cabeçalho precisa ter uma coluna por célula da linha anterior.
    .map((l, i, lines) =>
      l === "|---|" ? `|${"---|".repeat(Math.max(1, (lines[i - 1].match(/(?<!\\)\|/g)?.length ?? 2) - 1))}` : l,
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractArticle(html) {
  const start = html.indexOf('<div class="theme-doc-markdown markdown">');
  if (start < 0) return null;
  const end = html.indexOf("</article>", start);
  return html.slice(start, end < 0 ? undefined : end);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const sitemap = await get(SITEMAP);
  let urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  urls = [...new Set(urls)].filter((u) => u.startsWith(`${BASE}/learn/`));
  if (!opts.all) urls = urls.filter((u) => u.includes("/api-reference/"));
  if (opts.filter) urls = urls.filter((u) => u.includes(opts.filter));
  console.log(`${urls.length} páginas → ${opts.out}`);

  const failed = [];
  let next = 0;
  async function worker() {
    while (next < urls.length) {
      const url = urls[next++];
      const rel = url.slice(`${BASE}/learn/`.length).replace(/\/$/, "/index") || "index";
      try {
        const article = extractArticle(await get(url));
        if (!article) throw new Error("conteúdo não encontrado");
        const md = toMarkdown(article);
        const file = join(opts.out, `${rel}.md`);
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, `<!-- Fonte: ${url} -->\n\n${md}\n`);
        process.stdout.write(".");
      } catch (e) {
        failed.push(`${url}: ${e.message.split("\n")[0]}`);
        process.stdout.write("x");
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // O índice cobre tudo o que está na pasta, inclusive páginas de execuções anteriores com --filter.
  const index = [];
  for (const entry of await readdir(opts.out, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "INDEX.md") continue;
    const file = join(entry.parentPath, entry.name);
    const title = (await readFile(file, "utf8")).match(/^# (.+)$/m)?.[1] ?? entry.name;
    index.push({ rel: relative(opts.out, file).slice(0, -3), title });
  }
  index.sort((a, b) => a.rel.localeCompare(b.rel));
  await writeFile(
    join(opts.out, "INDEX.md"),
    `# Documentação do Effect House\n\nBaixada de ${BASE}/learn em ${new Date().toISOString().slice(0, 10)}.\n\n` +
      index.map((p) => `- [${p.title}](${p.rel}.md)`).join("\n") +
      "\n",
  );
  console.log(`\n${urls.length - failed.length} páginas salvas, ${failed.length} falhas (${index.length} no índice).`);
  for (const f of failed) console.log(`  ${f}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
