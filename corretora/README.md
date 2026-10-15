# Pregão Simulador

Plataforma de opções binárias em modo simulação, construída a partir do mapeamento
de um HAR da área logada de uma corretora (rotas, APIs, feature flags, catálogo de
ativos e eventos de WebSocket). Usa marca própria e não movimenta dinheiro real.

Site estático, sem dependências: abra `index.html` por um servidor qualquer
(`python3 -m http.server` dentro desta pasta) ou publique a pasta em qualquer
hospedagem estática.

## Funcionalidades

| No HAR original | Aqui |
| --- | --- |
| `config/assets` (156 ativos, payout, expirações, horários) | `data.js` com os 78 ativos ativos, payout, expirações, valores mín./máx. e horários por dia (UTC) |
| Pusher `AAPL-OTC` (tick a cada 500 ms) + `market-historic-api` | Cotações sintéticas com tick de 500 ms e 3 h de histórico por ativo |
| Gráfico | Candles, área e barras; 5s a 15m; zoom, arrastar, mira com OHLC, linha de expiração, marcadores das operações |
| `trade-api/op` | Acima/Abaixo, expirações de 30s (mínimo) a 1h, retorno por ativo, resultado com som e popup |
| `allow_sheduled_trade`, `allow_op_auto_trade` | Operações agendadas e auto-trade com stop de ganho/perda |
| `allow_op_norisk`, `roulettes` | Roleta Standard, Raspadinha secreta, operação sem risco, boost OTC, cupons |
| `wallet-api/balance` | Conta real e demo (R$ 50.000), troca de conta e recarga da demo |
| `deposit.methods.pix`, cupom `PRIMEIRODEPOSITO` | Depósito PIX simulado com cupons e bônus |
| `withdraw.methods.pix` | Saque PIX simulado (mínimo, 1 por dia, cancelamento) |
| `profile/calc` (meta R$ 2.500 em 30 dias) | Programa VIP Standard / Pro / VIP com bônus de retorno |
| `phone_verification` ("ganhe 1 giro") | Verificação de telefone e e-mail por código, envio de documento, 2FA |
| `tournaments`, `pages.ranking` | Torneio semanal demo e ranking diário/semanal |
| `theme.themes` e `backgrounds` | Temas Padrão, Black e Brasil e fundos do gráfico |
| `/faq` | Central de ajuda com busca e chat de suporte automático |
| `history` | Histórico de operações e transações com filtros |
| Sons `trade-*`, `deposit-*`, `welcome` | Sons sintetizados com Web Audio |

Atalhos: Shift + ↑ abre Acima, Shift + ↓ abre Abaixo.

Os dados (conta, saldos, histórico, prêmios) ficam no `localStorage` do navegador.
