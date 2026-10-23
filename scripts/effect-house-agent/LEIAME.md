# Agente do Effect House

Opera o Effect House no seu computador para montar e enviar os sorteios gerados
em `/efeitos/sorteios`, e para ler as estatísticas dos efeitos publicados. Usa
a ferramenta de computer use da API do Claude (`computer_toolset_20260801`,
modelo Claude Opus 5.5): o Claude vê capturas da sua tela e comanda mouse e
teclado.

## Antes de usar

- **Roda no computador onde está o Effect House** (Windows ou Mac), com o
  programa já logado na sua conta do TikTok.
- **Tem custo na API**, cobrado à parte da assinatura do Claude. Cada execução
  mostra no fim os tokens e o custo aproximado.
- **O agente vê a sua tela inteira.** Feche e-mails, bancos e qualquer coisa
  sensível antes de rodar, e não mexa no mouse enquanto ele trabalha.
- **Para parar:** leve o mouse ao canto superior esquerdo da tela, ou aperte
  Ctrl+C no terminal.
- **Antes do envio final o agente pergunta no terminal** e só envia com "s".
  `--sem-confirmar` tira essa pergunta; use só depois de ver alguns envios
  darem certo.

## Instalação (Windows)

1. Instale o Python 3.11 ou mais novo em https://www.python.org (marque
   "Add python.exe to PATH").
2. Crie uma chave de API em https://console.anthropic.com (Settings → API Keys)
   e coloque créditos na conta.
3. No PowerShell, dentro desta pasta:

   ```powershell
   py -m pip install -r requirements.txt
   setx ANTHROPIC_API_KEY "sua-chave-aqui"
   ```

   Feche e abra o PowerShell de novo para a chave valer.

No Mac é igual, com `python3 -m pip install -r requirements.txt` e
`export ANTHROPIC_API_KEY=...` no `~/.zshrc`. O Mac pede permissão de
**Gravação de Tela** e **Acessibilidade** para o Terminal na primeira vez.

## Uso

1. Baixe os pacotes em `/efeitos/sorteios` e descompacte o zip.
2. Abra o Effect House.
3. No terminal:

   ```powershell
   py agente.py publicar "C:\Users\voce\Downloads\sorteios-tiktok\fantasia-halloween"
   ```

   O agente espera 5 segundos (tempo de você soltar o mouse), cria o projeto a
   partir do modelo Randomizer 2D, importa as imagens, configura e, antes de
   clicar em Submit, mostra o resumo e pergunta se pode enviar. O projeto fica
   salvo em `projeto\` dentro da pasta do sorteio.

4. Para acompanhar os resultados:

   ```powershell
   py agente.py estatisticas
   ```

   Gera `estatisticas-AAAA-MM-DD.md` com uma tabela dos efeitos (status,
   vídeos, visualizações) e o progresso do selo. Mande esse arquivo para o
   Claude atualizar `docs/efeitos-acompanhamento.md` e decidir os próximos
   temas.

## Ritmo

O TikTok proíbe spam nas regras de efeitos. Envie poucos efeitos por dia,
todos diferentes, e espere a revisão (até um dia útil) dos primeiros antes de
acelerar.
