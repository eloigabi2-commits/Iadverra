# Unfollowers para Instagram (extensão do Chrome)

Extensão que mostra quem você segue e não te segue de volta no Instagram e deixa de seguir as contas que você escolher, com whitelist, limite por rodada e pausas de segurança.

Tem visual escuro no estilo "PRO" (cabeçalho de perfil com avatar e contadores, grade de cards). Tudo roda no seu navegador, com a sessão do Instagram que já está logada: **nenhuma senha é pedida** e a extensão não tem servidor — as únicas requisições vão para `www.instagram.com`.

> As telas de "visitantes do perfil" e "admiradores secretos" de alguns apps não foram incluídas de propósito: o Instagram não fornece esses dados, então qualquer número ali seria inventado.

> **Atenção:** automatizar unfollows vai contra os termos de uso do Instagram. Exagerar pode gerar bloqueio temporário de ações ("feedback_required") ou pedido de verificação da conta. Mantenha as pausas padrão e não passe de ~100 unfollows por dia.

## Instalação (Chrome, Edge, Brave)

1. Baixe esta pasta (`instagram-unfollowers/`) para o computador.
2. Abra `chrome://extensions` (no Edge: `edge://extensions`).
3. Ligue o **Modo do desenvolvedor**, no canto superior direito.
4. Clique em **Carregar sem compactação** e selecione a pasta `instagram-unfollowers`.
5. Fixe a extensão na barra (ícone de quebra-cabeça → alfinete).

Não funciona no celular: navegadores móveis não aceitam extensões do Chrome.

## Como usar

1. Entre em [instagram.com](https://www.instagram.com) logado na sua conta.
2. Clique no ícone da extensão. O painel abre do lado direito. Se você estiver em outro site, o clique abre o Instagram.
3. **Escanear agora**: a extensão lê a sua lista de seguidores e depois a de seguindo. Contas grandes levam alguns minutos, por causa das pausas.
4. Na lista **Não te seguem**:
   - ☆ protege a conta (vai para a **Whitelist** e nunca entra na fila de unfollow);
   - a caixinha seleciona a conta para deixar de seguir;
   - busca e filtros (verificados, privados, sem foto) ajudam a revisar;
   - **Copiar** e **CSV** exportam a lista filtrada.
5. **Deixar de seguir (N)** processa a seleção respeitando as esperas e o limite por rodada. Dá para pausar ou parar a qualquer momento.

O último scan e a whitelist ficam salvos no navegador, separados por conta do Instagram. Use **⚙ → Whitelist → Exportar** para guardar um backup.

## Proteções

- **Scan incompleto bloqueia o unfollow.** Se o scan parar no meio (erro, limite ou você clicou em Parar), a lista pode ter contas que te seguem, então o botão fica desativado.
- **Bloqueio do Instagram para a fila.** Se o Instagram responder com `feedback_required`, `429` ou parecido, a fila para na hora.
- **Confirmação de cada unfollow.** Depois de cada pedido, a extensão confere se a conta saiu mesmo da sua lista de seguindo. Se não der para confirmar, aparece "Enviado, não confirmado".
- **Esperas com variação aleatória** entre páginas do scan e entre unfollows, além de pausas longas periódicas.

## Configurações padrão (⚙)

| Configuração | Padrão |
| --- | --- |
| Espera entre páginas do scan | 1,2 s |
| Pausa longa do scan | 10 s a cada 15 páginas |
| Espera entre unfollows | 5 s |
| Pausa de segurança | 5 min a cada 5 unfollows |
| Máximo por rodada | 100 contas |

## Arquivos

- `manifest.json`: manifesto da extensão (Manifest V3).
- `src/background.js`: abre ou fecha o painel quando você clica no ícone.
- `src/content.js`: painel, scan e fila de unfollow.
- `src/api.js`: chamadas à API web do Instagram (`/api/v1/friendships/...`).
- `src/storage.js`: configurações, whitelist e último scan (`chrome.storage.local`).
- `src/panel.css`: visual do painel (tema claro e escuro, isolado num Shadow DOM).

O Instagram muda a API web sem aviso. Se o scan ou o unfollow pararem de funcionar, o lugar a ajustar é `src/api.js`.
