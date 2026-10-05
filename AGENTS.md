<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Google Ads

Não existe conector do Google Ads nesta sessão: o acesso é feito pela API REST com as credenciais OAuth que estão nas variáveis de ambiente do ambiente cloud (`GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`). Use `scripts/google-ads.mjs` (sem dependências, roda com `node`):

- `node scripts/google-ads.mjs check` — confere as credenciais
- `node scripts/google-ads.mjs accounts` — contas acessíveis
- `node scripts/google-ads.mjs campaigns [dias]` — métricas por campanha
- `node scripts/google-ads.mjs query "SELECT ..."` — qualquer consulta GAQL (`--customer <id>` troca a conta)
- `node scripts/google-ads.mjs mutate ops.json` — valida alterações (lista de `MutateOperation`); com `--apply` aplica de verdade

Conta padrão: 2955725842 (Dra Jessica). MCC: 3069154123. Nunca imprima os valores das credenciais.

A skill `.claude/skills/google-ads-manager` (de thalesholleben/skill-google-ads, licença MIT) traz os roteiros de diagnóstico, criação de campanhas, lances, palavras-chave e relatórios. Rode as consultas GAQL dela com `scripts/google-ads.mjs query`. A conta é em reais (BRL). Alterações na conta mexem em dinheiro real: só aplique (`--apply`) com autorização explícita do usuário, e valide antes sem `--apply`.
