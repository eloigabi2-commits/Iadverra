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

## Envio de documentos pelo cliente

Link simples, pensado para idosos, para o lead mandar as fotos da frente e do
verso do RG e do comprovante de endereço fora do WhatsApp, com a identidade da
Esclarece Assessoria (`public/marca/`). Cada lead recebe um link único; as fotos
ficam no Postgres e cada atendente vê só os clientes dela em `/painel`.

No painel a atendente cria o link (nome + WhatsApp) e toca em "Enviar link pelo
WhatsApp", que abre a conversa do cliente com a mensagem pronta. Os envios
chegam em "Para conferir" (a lista se atualiza sozinha); em cada foto há
"Pedir de novo", que apaga só aquela e faz o cliente cair direto nela ao abrir
o link de novo, e "Conferi, está tudo certo" move o cliente para "Conferidos".

Cada link guarda a atendente que recebeu o cliente na distribuição (campo
`atendente` da API, vindo da coluna "Atendente" da planilha do bancário). Cada
atendente entra pelo link pessoal dela, `/a/<chave>`, sem senha, e o painel
mostra só os clientes com o nome dela: a lista, o detalhe, as fotos e as ações
são conferidos no servidor, então abrir o endereço de um cliente de outra
atendente dá "não encontrado". O gestor entra com `PAINEL_SENHA`, vê todas e
em `/painel/atendentes` copia, troca ou tira o link de cada uma (trocar o link
derruba na hora quem entrou pelo antigo). As atendentes iniciais são
cadastradas pelo seed (`prisma/seed.ts`), e o nome que chega da planilha é
gravado com a grafia cadastrada ("vitória" vira "Vitoria Vechetin").

Fluxo do cliente (`/documentos/<token>`), feito para quem não sabe ler: cada
tela é explicada em voz alta, os documentos aparecem desenhados e cada tela tem
um botão principal só. Toque no alto-falante (ouve a explicação, incluindo o
uso dos dados) → joinha verde "Começar" (registra o aceite) → para cada
documento, botão azul da câmera → conferência com "De novo" (laranja) ou
"Enviar" (verde) → "Pronto!". O alto-falante no canto repete a fala da tela.
As fotos são reduzidas no celular antes do envio (lado maior de 1800 px), e
quem fecha a página no meio continua de onde parou ao abrir o link de novo.

As falas usam a voz "eloisa" do Inworld, a mesma do fluxo de direito
bancário no n8n. Os textos ficam em `src/lib/falas-documentos.ts`; para gravar
(ou regravar depois de mudar um texto) os MP3 em `public/audio/`:

```bash
INWORLD_API_KEY="Basic ..." npx tsx scripts/gerar-audios.ts        # todas
INWORLD_API_KEY="Basic ..." npx tsx scripts/gerar-audios.ts fim    # só uma
```

A chave é o valor do header `Authorization` do nó HTTP do Inworld no n8n.
Sem os MP3, o celular lê os textos com a voz dele.

### Configuração (variáveis de ambiente na Vercel)

| Variável | Para quê |
| --- | --- |
| `PAINEL_SENHA` | senha do gestor no `/painel` (as atendentes entram pelo link pessoal) |
| `DOCUMENTOS_API_KEY` | chave para a IA/n8n gerar links |
| `APP_URL` | domínio usado nos links (ex.: `https://docs.seuescritorio.com.br`) |
| `NOME_ESCRITORIO` | nome mostrado ao cliente e na política |
| `CONTATO_PRIVACIDADE` | e-mail/telefone para pedidos da LGPD (opcional) |

A migration é aplicada sozinha pelo `vercel-build`.

### Gerando o link pela IA

```bash
curl -X POST https://seu-dominio/api/solicitacoes \
  -H "Authorization: Bearer $DOCUMENTOS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"nome": "Maria da Silva", "telefone": "11999998888", "referencia": "id-do-lead"}'
# → {"id": "...", "url": "https://seu-dominio/documentos/abc...", "status": "aguardando"}
```

Todos os campos são opcionais. Se já existir um link aguardando para a mesma
`referencia` (ou, sem ela, o mesmo `telefone`), a API devolve esse link em vez
de criar outro. As consultoras também podem gerar links à mão no painel.

O texto de `/privacidade` é um modelo: revise com a equipe jurídica antes de
usar.

## Cobranças (Pix e cartão pelo Asaas)

O painel (`/painel/cobrancas`) cria a cobrança informando nome, CPF/CNPJ, valor
e uma descrição. O cliente recebe um link curto (`/pagar/nome-xxxxxx`), escolhe
Pix ou cartão de crédito e paga na hora. O valor só existe de verdade depois
que o cliente escolhe a forma: o pagamento é criado na API do Asaas no
momento do Pix (QR Code) ou do envio do cartão.

- O link é estável: pode ser reenviado pelo WhatsApp quantas vezes precisar.
- O Pix gerado fica em cache no banco até expirar, para o cliente não pagar
  duas vezes; ao trocar de forma de pagamento, a tentativa pendente anterior é
  removida no Asaas.
- A tela consulta o servidor a cada 6 s e mostra "Pago" quando o webhook (ou a
  consulta) confirma.
- O número e o CVV do cartão passam direto para o Asaas e não são gravados; no
  banco ficam só os 4 últimos dígitos e a bandeira.
- O cartão exige CPF, e-mail, CEP, número e telefone do titular (exigência do
  Asaas). Parcelamento em até 12x, com parcela mínima de R$ 5,00.
- Cancelar pelo painel apaga a cobrança pendente no Asaas e invalida o link.
  "Recebi fora do site" marca como paga uma cobrança recebida em dinheiro.

| Variável | Para quê |
| --- | --- |
| `ASAAS_API_KEY` | chave de API da conta Asaas (sem ela, a tela avisa que o pagamento não está configurado) |
| `ASAAS_WEBHOOK_TOKEN` | token que o Asaas envia no header `asaas-access-token`; sem ele o webhook responde 503 |
| `ASAAS_SANDBOX` | `true` para usar `https://api-sandbox.asaas.com` |
| `ASAAS_BASE_URL` | opcional; sobrepõe o endereço da API |

No Asaas, em **Integrações > Webhooks**, cadastre
`https://SEU-DOMINIO/api/cobrancas/webhook`, selecione os eventos de cobrança e
informe o mesmo valor de `ASAAS_WEBHOOK_TOKEN`. Cada evento é gravado em
`asaas_evento` pelo id (reenvio não altera nada duas vezes) e o status do
pagamento é conferido na API antes de atualizar a cobrança.

Mínimo de R$ 5,00 por cobrança. A conta é em reais (BRL); a `ASAAS_API_KEY`
precisa ser de uma conta que possa receber cobranças (não serve a chave do
sandbox em produção, nem o contrário).

## Portal de crédito (/credito)

O cliente cria a conta em `/credito/cadastro` com nome, e-mail, WhatsApp e uma
senha individual (hash scrypt no banco) e entra em `/credito` com e-mail e senha.
O cookie assinado (`CREDITO_SESSAO_KEY`) lembra dele por 180 dias. Cada conta vê
somente os próprios pedidos e valores. Em `/credito/adicionar` ele informa valor,
CPF, forma de pagamento (Pix ou cartão) e prazo. O pedido cria uma cobrança do
Asaas com atendente "Crédito", envia os dados para o n8n e já abre o pagamento:

- Pix: o QR Code e o código copia-e-cola são gerados automaticamente, com o
  valor pedido, e a página mostra também o link público `/pagar/<codigo>`.
- Cartão: o formulário já vem com e-mail, telefone e CPF do pedido; o número e
  o CVV continuam indo direto para o Asaas, sem serem gravados.
- Se o webhook do n8n falhar, o pedido fica como "Não enviado" e a página
  oferece **Enviar de novo**. O pagamento só é liberado depois do envio.
- Quando o Asaas confirma, a cobrança e o pedido viram "Pago".

O n8n recebe exatamente:

```json
{
  "contratante": { "nome": "...", "email": "...", "telefone": "5511999999999" },
  "servico": {
    "valor_implementacao": 1000,
    "forma_pagamento": "pix",
    "prazo": "Imediato"
  }
}
```

| Variável | Para quê |
| --- | --- |
| `CREDITO_SESSAO_KEY` | string longa e aleatória que assina o cookie do portal; trocá-la desconecta todos; se ausente, usa `PAINEL_SENHA` |
| `CREDITO_WEBHOOK_URL` | opcional; padrão `https://n8n.srv1288686.hstgr.cloud/webhook/credito` |

O webhook do n8n é síncrono: a página espera até 20 s pela resposta. O CPF não
fica guardado na conta do portal; ele é gravado apenas na cobrança, como nas
demais cobranças do Asaas.

## Instagram: quem não segue de volta e prováveis bloqueios

`/instagram` é o app **Espelho** (instalável como PWA). O Instagram não tem API
oficial para listar seguidores de conta pessoal. O caminho principal é o login
dentro do app:

1. O usuário digita @ e senha em `/instagram`. A senha é usada uma única vez para
   abrir a sessão no Instagram e **não é gravada**.
2. O servidor guarda a sessão (cookies `sessionid`/`csrf`) criptografada com
   AES-256-GCM no campo `instagram_conexao.cookies`. A chave vem de
   `INSTAGRAM_SESSION_KEY` (ou, sem ela, de `DATABASE_URL`); trocar a chave
   derruba as sessões salvas.
3. Depois do login, o app lê seguidores e seguindo pela API web do Instagram,
   pagina as listas, e mostra os perfis públicos. O identificador da conexão vai
   num cookie HttpOnly assinado com HMAC.
4. Se o Instagram pedir 2FA, o app guarda o estado pendente por 15 minutos e
   pede o código na mesma tela. Se pedir verificação/challenge, o usuário aprova
   no app do Instagram e tenta de novo.

Cada sincronização vira um snapshot (`instagram_snapshot`) e o diff é feito no
servidor: não te seguem de volta, você não segue de volta, quem deixou de seguir
e prováveis bloqueios. Para os que sumiram, o app abre o perfil pela sessão: se
o Instagram responde 404, entra como inacessível — o mesmo sinal de conta
desativada ou excluída. Trate como suspeita, não como certeza.

A API web do Instagram não é documentada: pode pedir verificação, limitar
consultas ou mudar sem aviso. O app pausa entre páginas, limita a leitura a 20
mil perfis por lista e limita o login por IP. Sessões expiram; nesse caso o app
pede o login de novo. "Sair" apaga a conexão e todos os snapshots.

A extensão (`instagram-ponte/` ou `/instagram-ponte.zip`) e o upload do `.zip`
exportado pelo Instagram continuam disponíveis nos bastidores para quem usa o
código de conexão (`/api/instagram/{conectar,importar,exportar,pendentes}`), mas
não aparecem mais na tela principal. O upload aceita até 25 MB; em serverless
(Vercel) o corpo fica em ~4,5 MB.

Rotas do login: `/api/instagram/{entrar,verificar,sincronizar,sair,dados}`.
Configure `INSTAGRAM_SESSION_KEY` (recomendado) e `APP_URL`. A migration
`20261026170000_instagram` entra sozinha no `vercel-build`.

O PWA vive em `public/espelho/` (manifest e ícones) e `public/sw.js` (service
worker registrado com escopo `/instagram`).

## Estrutura

- `prisma/schema.prisma` — modelo de dados (Empresa, Estabelecimento,
  Socio, Cnae, Municipio, NaturezaJuridica).
- `prisma/seed.ts` — dados fictícios para desenvolvimento.
- `scripts/import-rfb.ts` — importação dos dados reais da Receita Federal.
- `src/lib/owners.ts` — consultas de filtro/contagem/listagem de donos.
- `src/app/api/*` — endpoints REST (`/api/cnaes`, `/api/owners`,
  `/api/owners/summary`, `/api/owners/export`).
- `src/components/CnaeFilterDashboard.tsx` — UI de filtro.
- `src/app/documentos/[token]` + `src/components/EnvioDocumentos.tsx` — tela
  de envio de documentos do cliente.
- `src/app/painel` — painel das consultoras; `src/app/api/documentos/*`,
  `src/app/api/solicitacoes` e `src/app/api/painel/*` — endpoints do envio.
- `src/app/instagram` + `src/components/InstagramPainel.tsx` — painel do
  Instagram; `src/lib/instagram/` — conexão, diff e tipos.
- `instagram-ponte/` — extensão Chrome (MV3) que lê as listas no navegador do
  usuário; `public/instagram-ponte.zip` é o pacote para download.
- `public/espelho/` + `public/sw.js` — manifest, ícones e service worker do PWA.
