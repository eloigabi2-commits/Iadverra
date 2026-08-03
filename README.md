# PokeTroca

Marketplace para colecionadores comprarem e venderem cartas avulsas e
pacotes/boosters de Pokémon entre si.

Qualquer pessoa pode criar uma conta, publicar anúncios (com foto,
especificações e preço) e organizar seus anúncios em pastas (ex: "Coleção
Base Set", "Pacotes lacrados"). Os anúncios e pastas ficam públicos para
outros usuários navegarem, buscarem e filtrarem — sem precisar de conta
para visualizar.

PokeTroca não tem vínculo com a Pokémon Company, Nintendo ou Game Freak.

## Stack

- Next.js (App Router) + TypeScript + Tailwind, com Server Actions para
  todas as mutações (cadastro/login, criar/editar/excluir pastas e
  anúncios)
- PostgreSQL + Prisma (com driver adapter `@prisma/adapter-pg`)
- Autenticação própria: sessão via cookie httpOnly assinado (JWT com
  `jose`) e senhas com hash `bcryptjs`
- Upload de imagem: a foto do anúncio é validada (JPEG/PNG/WebP, até 2MB)
  e guardada como `data:` URL no banco — não depende de nenhum serviço de
  storage externo

## Setup local

1. Suba um Postgres (local ou Docker), copie `.env.example` para `.env` e
   ajuste `DATABASE_URL` e `JWT_SECRET` se necessário.
2. Instale as dependências e aplique as migrations:

   ```bash
   npm install
   npx prisma migrate dev
   ```

3. Popule com alguns dados de exemplo (dois vendedores, uma pasta e três
   anúncios):

   ```bash
   npm run db:seed
   ```

4. Rode o app:

   ```bash
   npm run dev
   ```

## Deploy grátis (Vercel + Neon)

1. Crie um banco Postgres grátis em [neon.tech](https://neon.tech) (sem
   cartão) e copie a connection string (a variante *pooled*, com
   `?sslmode=require` no final).
2. Em [vercel.com](https://vercel.com), crie uma conta grátis com o GitHub
   e importe o repositório.
3. Em **Environment Variables**, adicione `DATABASE_URL` (connection
   string do Neon) e `JWT_SECRET` (um valor aleatório forte, por exemplo
   gerado com `openssl rand -base64 32`).
4. Clique em **Deploy**.

O script `vercel-build` (`prisma generate && prisma migrate deploy && npm
run db:seed && next build`) aplica as migrations e popula o banco com os
dados de exemplo automaticamente — é seguro rodar de novo em deploys
futuros, porque o seed pula a inserção se o banco já tiver dados.

## Estrutura

- `prisma/schema.prisma` — modelos `User`, `Folder` e `Listing`.
- `src/lib/auth.ts` — sessão (cookie assinado com JWT) e hash de senha.
- `src/proxy.ts` — protege as rotas `/painel/*`, redirecionando para
  `/entrar` quando não há sessão válida.
- `src/lib/actions/*` — Server Actions de autenticação, pastas e
  anúncios (toda mutação de dados passa por aqui, com verificação de
  dono).
- `src/lib/listings.ts` — busca/filtro de anúncios (`/`).
- `src/app/painel/*` — área logada: criar pasta, criar/editar anúncio,
  visão geral das pastas e anúncios do usuário.
- `src/app/anuncios/[id]`, `/vendedores/[id]`, `/pastas/[id]` — páginas
  públicas de anúncio, perfil de vendedor e pasta.

## Limitações conhecidas

- Não há sistema de mensagens interno; o contato com o vendedor é feito
  por WhatsApp (se ele informou telefone no cadastro) ou pelo perfil
  público do vendedor.
- A imagem do anúncio é guardada como `data:` URL no Postgres (limite de
  2MB). Para um volume grande de anúncios com fotos, vale migrar para um
  object storage (S3, Vercel Blob, etc.) no lugar da coluna de imagem.
