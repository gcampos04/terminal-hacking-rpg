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
