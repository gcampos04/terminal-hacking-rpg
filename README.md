# Terminal de hacking para RPG

Terminal cyberpunk para mesas de RPG. O mestre monta o caminho do hack, e os jogadores recebem um link pronto para jogar.

É um único arquivo, `index.html`, sem dependências nem build. Basta publicá-lo em qualquer hospedagem estática.

## Como usar

1. Abra a página e clique no ⚙ no canto inferior direito, ou use `Ctrl+Shift+M`.
2. Digite a senha de configuração.
3. Em **Geral**, troque a senha.
4. Em **Construir**, monte os nós, as proteções e os minigames.
5. Em **Publicar**, clique em **Copiar link para jogadores** e envie o link.

Depois de qualquer edição, gere um novo link. O progresso dos jogadores fica no navegador de cada um.

## Como o link funciona

O cenário vai comprimido depois do `#` da URL, então a hospedagem não recebe esse conteúdo e não é preciso banco de dados.

Quem tiver o link consegue extrair as respostas e o hash da senha com alguma técnica. A senha evita acesso casual à configuração, mas não é proteção real.

## Controle à distância

O site não tem servidor, então os comandos do mestre chegam aos jogadores pelo [ntfy.sh](https://ntfy.sh), um serviço público de mensagens. Ao gerar o link, o cenário ganha uma sala com nome aleatório, e todo link gerado depois usa a mesma sala.

Só quem abre um link de jogador ou o arquivo exportado escuta a sala. O site sem link é a área de trabalho do mestre e não recebe esses comandos.

Todos os comandos do painel **Ao vivo** chegam aos jogadores, inclusive Liberar e Resetar. O mestre não vê o progresso deles. O botão **Testar conexão** confirma se a mensagem vai e volta pelo serviço.

As mensagens levam apenas esse estado, nunca as respostas. Mesmo assim, quem souber o nome da sala pode ler e enviar comandos.

## Testes

Os testes de ponta a ponta usam Playwright e rodam contra uma cópia local da página.

```bash
npm install
npx playwright install chromium
npm run test:e2e
```
