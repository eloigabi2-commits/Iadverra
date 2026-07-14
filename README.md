# Iadverra

Plataforma para filtrar donos (sócios) de empresas brasileiras por CNAE,
usando os Dados Abertos do CNPJ da Receita Federal como fonte.

Você pesquisa um ou mais CNAEs, opcionalmente filtra por UF, e a plataforma
mostra quantos sócios existem nas empresas correspondentes, com nome,
empresa, CNPJ, CNAE, localização e contato disponível — com opção de
exportar para CSV.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- PostgreSQL + Prisma (com driver adapter `@prisma/adapter-pg`)

## Setup local

1. Suba um Postgres (local ou Docker), copie `.env.example` para `.env` e
   ajuste `DATABASE_URL` se necessário.
2. Instale as dependências e aplique as migrations:

   ```bash
   npm install
   npx prisma migrate dev
   ```

3. Popule com dados fictícios para desenvolver sem depender do download da
   base completa:

   ```bash
   npm run db:seed
   ```

4. Rode o app:

   ```bash
   npm run dev
   ```

## Deploy grátis (Vercel + Neon)

Sobe uma versão pública da plataforma sem custo, populada com os dados
fictícios do seed (dados reais da Receita Federal continuam sendo um passo
separado — veja a próxima seção).

1. Crie um banco Postgres grátis em [neon.tech](https://neon.tech) (sem
   cartão) e copie a connection string (a variante *pooled*, com
   `?sslmode=require` no final).
2. Em [vercel.com](https://vercel.com), crie uma conta grátis com o GitHub,
   clique em **Add New Project** e importe o repositório `Iadverra`
   (branch `claude/business-owner-filter-platform-infd0x`, ou `main` depois
   do merge).
3. Em **Environment Variables**, adicione `DATABASE_URL` com a connection
   string do Neon.
4. Clique em **Deploy**.

Não precisa rodar nenhum comando manualmente: o script `vercel-build`
(`prisma generate && prisma migrate deploy && npm run db:seed && next build`)
gera o client do Prisma, aplica as migrations e popula o banco
automaticamente a cada deploy — e é seguro
rodar de novo em deploys futuros, porque o seed pula a inserção se o banco
já tiver dados (`prisma/seed.ts` verifica isso antes de inserir).

## Importando os dados reais da Receita Federal

Os dados fictícios do seed servem só para desenvolver a interface. Para usar
dados reais:

```bash
npm run db:import-rfb
```

O script (`scripts/import-rfb.ts`):

1. Descobre o período mais recente disponível em
   `https://dadosabertos.rfb.gov.br/CNPJ/` (ou use `RFB_PERIOD=2026-06` para
   fixar um período).
2. Baixa e extrai os arquivos de Empresas, Estabelecimentos, Sócios, CNAEs,
   Naturezas Jurídicas e Municípios.
3. Carrega tudo no Postgres em lotes.

**Importante:**

- Os dumps completos somam dezenas de GB descompactados e o processo pode
  levar horas. Se você só precisa de alguns CNAEs, defina
  `RFB_CNAE_FILTER=6201500,4711302` (códigos separados por vírgula) para
  importar somente as empresas desses CNAEs — o script faz uma pré-varredura
  local dos Estabelecimentos para descobrir quais empresas baixar, sem
  precisar reduzir o download em si.
- Isso precisa rodar em um ambiente com acesso de rede irrestrito e disco
  suficiente (não roda dentro de sandboxes com rede bloqueada).
- Rodar de novo é seguro: arquivos já baixados/extraídos são reaproveitados
  e os inserts usam `skipDuplicates`.

## Limitações importantes dos dados públicos

- O dataset da Receita Federal **não traz telefone/e-mail pessoal do
  sócio** — apenas o telefone/e-mail cadastrado pelo **estabelecimento**
  (a empresa). É esse contato que a plataforma mostra como "contato" do
  dono; nem toda empresa preenche esse campo.
- O CPF do sócio vem **mascarado** pela própria Receita Federal
  (ex: `***123456**`), por exigência legal — não é possível obter o CPF
  completo a partir desses dados.
- A busca por CNAE (`/api/cnaes`) é sensível a acentuação (usa `contains`
  do Postgres); busque sem preocupação de maiúsculas, mas com acentos
  corretos (ex: "Comércio", não "Comercio").

## Uso responsável / LGPD

Os Dados Abertos do CNPJ são públicos e sua publicação é amparada por lei.
Ainda assim, ao usar os nomes e contatos aqui filtrados para prospecção
(ligações, e-mails, WhatsApp), a responsabilidade pelo tratamento desses
dados pessoais é de quem os usa: respeite a LGPD (finalidade legítima,
opt-out em contatos comerciais, não usar para spam em massa) e, se o
volume de prospecção for grande, vale consultar um jurídico para adequar o
processo à LGPD antes de operar em escala.

## Estrutura

- `prisma/schema.prisma` — modelo de dados (Empresa, Estabelecimento,
  Socio, Cnae, Municipio, NaturezaJuridica).
- `prisma/seed.ts` — dados fictícios para desenvolvimento.
- `scripts/import-rfb.ts` — importação dos dados reais da Receita Federal.
- `src/lib/owners.ts` — consultas de filtro/contagem/listagem de donos.
- `src/app/api/*` — endpoints REST (`/api/cnaes`, `/api/owners`,
  `/api/owners/summary`, `/api/owners/export`).
- `src/components/CnaeFilterDashboard.tsx` — UI de filtro.
