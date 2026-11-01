import { test, expect, botao, campo, semear, semBoot, entrar, mestre, aba, estado, nosSalvos, assentar, noDaArvore, blocos, SENHA, iniciarHack } from './auxiliares.mjs';

const hack = (id, nome, puzzle = 'palavras', resto = {}) => ({ id, nome, tipo: 'nenhum', protecao: { tipo: 'hack', puzzle, ...resto } });

test.describe('acesso do mestre', () => {
  test('senha errada não abre e senha certa abre', async ({ page }) => {
    await semBoot(page);
    await entrar(page, 'errada');
    await expect(page.getByText('Senha incorreta.')).toBeVisible();
    await expect(page.getByRole('tablist')).toHaveCount(0);
    await campo(page, 'Senha de configuração').fill(SENHA);
    await botao(page, 'ENTRAR').click();
    await expect(page.getByRole('tablist')).toBeVisible();
  });
  test('engrenagem abre, F5 mantém e sair volta ao jogador', async ({ page }) => {
    await semBoot(page);
    await botao(page, 'Configuração').click();
    await campo(page, 'Senha de configuração').fill(SENHA);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('tablist')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('tablist')).toBeVisible();
    await botao(page, 'Sair para modo jogador').click();
    await expect(page.getByRole('tablist')).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('tablist')).toHaveCount(0);
  });
  test('jogador não vê nenhum campo de edição', async ({ page }) => {
    await semBoot(page);
    await expect(page.locator('input,select,textarea')).toHaveCount(0);
  });
  test('trocar senha recusa curta e vale após recarregar', async ({ page }) => {
    await mestre(page);
    await aba(page, 'Geral');
    await campo(page, 'Nova senha').fill('abc');
    await botao(page, 'Trocar senha').click();
    await expect(page.getByText('ao menos 4 caracteres')).toBeVisible();
    await campo(page, 'Nova senha').fill('cromo-2077');
    await botao(page, 'Trocar senha').click();
    await page.reload();
    await botao(page, 'Sair para modo jogador').click();
    await entrar(page, SENHA);
    await expect(page.getByText('Senha incorreta.')).toBeVisible();
    await campo(page, 'Senha de configuração').fill('cromo-2077');
    await botao(page, 'ENTRAR').click();
    await expect(page.getByRole('tablist')).toBeVisible();
  });
});

test.describe('construir o caminho', () => {
  test('cria nó e filho, salva e aparece ao jogador', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'Raiz', texto: 'x' }]);
    await botao(page, '+ Nó').click();
    await campo(page, 'Nome').fill('Portal');
    await campo(page, 'Texto').fill('Bem-vindo');
    await botao(page, '+ Filho').click();
    await campo(page, 'Nome').fill('Sala interna');
    await campo(page, 'Texto').fill('Segredo');
    await page.reload();
    await expect(noDaArvore(page, 'Portal')).toBeVisible();
    await expect(noDaArvore(page, 'Sala interna')).toBeVisible();
    await botao(page, 'Sair para modo jogador').click();
    await page.locator('.bloco', { hasText: 'Portal' }).click();
    await expect(page.getByText('Bem-vindo')).toBeVisible();
    await botao(page, 'Fechar').click();
    await expect(blocos(page).filter({ hasText: 'Sala interna' })).toBeVisible();
  });
  test('edição sobrevive a recarregar logo depois de digitar', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'Raiz' }]);
    await campo(page, 'Nome').fill('Nome novo');
    await page.reload();
    await expect(noDaArvore(page, 'Nome novo')).toBeVisible();
  });
  test('renomear atualiza a árvore na hora', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'Raiz' }]);
    await campo(page, 'Nome').fill('Outro');
    await expect(noDaArvore(page, 'Outro')).toBeVisible();
  });
  test('subir e descer reordena os irmãos', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }, { id: 'c', nome: 'C' }]);
    await noDaArvore(page, 'C').click();
    await botao(page, 'Subir').click();
    await expect(page.locator('.no-arv .nm')).toHaveText(['A', 'C', 'B']);
    await botao(page, 'Descer').click();
    await expect(page.locator('.no-arv .nm')).toHaveText(['A', 'B', 'C']);
  });
  test('duplicar copia a subárvore com novos ids', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'A' }, { id: 'f', pai: 'a', nome: 'Filho' }, { id: 'n', pai: 'f', nome: 'Neto' }]);
    await noDaArvore(page, 'A').first().click();
    await botao(page, 'Duplicar').click();
    await assentar(page);
    const { nos } = await nosSalvos(page);
    expect(nos.map((n) => n.nome).sort()).toEqual(['A', 'A (cópia)', 'Filho', 'Filho', 'Neto', 'Neto']);
    expect(new Set(nos.map((n) => n.id)).size).toBe(6);
    const copia = nos.find((n) => n.nome === 'A (cópia)');
    const filho = nos.find((n) => n.pai === copia.id);
    expect(nos.find((n) => n.pai === filho.id).nome).toBe('Neto');
  });
  test('excluir pede confirmação e leva os descendentes', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'A' }, { id: 'f', pai: 'a', nome: 'Filho' }, { id: 'b', nome: 'B' }]);
    await noDaArvore(page, 'A').click();
    await botao(page, 'Excluir').click();
    await expect(page.getByText('mais 1 nó(s)')).toBeVisible();
    await botao(page, 'CANCELAR').click();
    await expect(noDaArvore(page, 'Filho')).toBeVisible();
    await botao(page, 'Excluir').click();
    await botao(page, 'CONFIRMAR').click();
    await expect(page.locator('.no-arv .nm')).toHaveText(['B']);
  });
  test('excluir todos os nós não quebra e permite criar de novo', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'A' }]);
    await botao(page, 'Excluir').click();
    await botao(page, 'CONFIRMAR').click();
    await expect(page.getByText('Nenhum nó ainda')).toBeVisible();
    await botao(page, '+ Nó').click();
    await expect(noDaArvore(page, 'Novo nó')).toBeVisible();
  });
  test('mover para outro pai não oferece a si mesmo nem descendentes', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'A' }, { id: 'f', pai: 'a', nome: 'Filho' }, { id: 'b', nome: 'B' }]);
    await noDaArvore(page, 'A').click();
    await expect(campo(page, 'Fica dentro de').locator('option')).toHaveText(['(raiz)', 'B']);
    await campo(page, 'Fica dentro de').selectOption({ label: 'B' });
    await assentar(page);
    expect((await nosSalvos(page)).nos.find((n) => n.id === 'a').pai).toBe('b');
  });
  test('nó com filhos não pode virar título, senão os filhos somem', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'A' }, { id: 'f', pai: 'a', nome: 'Filho' }]);
    await noDaArvore(page, 'A').click();
    await expect(campo(page, 'Estrutura').locator('option[value=titulo]')).toBeDisabled();
  });
  test('árvore liga pais e filhos com conectores', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'A' }, { id: 'f', pai: 'a', nome: 'Filho' }, { id: 'g', pai: 'a', nome: 'Gama' }, { id: 'b', nome: 'B' }]);
    await expect(page.getByRole('tree')).toBeVisible();
    await expect(page.locator('[data-no=a] .guia.t')).toHaveCount(1);
    await expect(page.locator('[data-no=a] .icone.desce')).toHaveCount(1);
    await expect(page.locator('[data-no=f] .guia.v')).toHaveCount(1);
    await expect(page.locator('[data-no=f] .guia.t')).toHaveCount(1);
    await expect(page.locator('[data-no=g] .guia.l')).toHaveCount(1);
    await expect(page.locator('[data-no=b] .guia.l')).toHaveCount(1);
    await expect(page.locator('[data-no=b] .guia.v')).toHaveCount(0);
  });
  test('recolher ramo esconde descendentes, conta e lembra após recarregar', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'A' }, { id: 'f', pai: 'a', nome: 'Filho' }, { id: 'n', pai: 'f', nome: 'Neto' }]);
    await botao(page, 'Recolher A').click();
    await expect(noDaArvore(page, 'Filho')).toHaveCount(0);
    await expect(page.locator('[data-no=a] .qtd')).toHaveText('(2)');
    await page.reload();
    await expect(noDaArvore(page, 'Filho')).toHaveCount(0);
    await botao(page, 'Expandir A').click();
    await expect(noDaArvore(page, 'Neto')).toBeVisible();
    await botao(page, 'Recolher tudo').click();
    await expect(page.locator('.no-arv')).toHaveCount(1);
    await botao(page, 'Expandir tudo').click();
    await expect(page.locator('.no-arv')).toHaveCount(3);
  });
  test('recolher o ramo do nó selecionado seleciona o pai', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'A' }, { id: 'f', pai: 'a', nome: 'Filho' }]);
    await noDaArvore(page, 'Filho').click();
    await botao(page, 'Recolher A').click();
    await expect(campo(page, 'Nome')).toHaveValue('A');
  });
  test('criar filho em ramo recolhido abre o ramo', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'A' }, { id: 'f', pai: 'a', nome: 'Filho' }]);
    await botao(page, 'Recolher A').click();
    await botao(page, '+ Filho').click();
    await expect(noDaArvore(page, 'Novo nó')).toBeVisible();
    await expect(noDaArvore(page, 'Filho')).toBeVisible();
  });
  test('teclado navega como no Editor do Registro', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'A' }, { id: 'f', pai: 'a', nome: 'Filho' }, { id: 'b', nome: 'B' }]);
    await noDaArvore(page, 'A').click();
    await page.keyboard.press('ArrowDown');
    await expect(campo(page, 'Nome')).toHaveValue('Filho');
    await page.keyboard.press('ArrowLeft');
    await expect(campo(page, 'Nome')).toHaveValue('A');
    await page.keyboard.press('ArrowLeft');
    await expect(noDaArvore(page, 'Filho')).toHaveCount(0);
    await page.keyboard.press('ArrowRight');
    await expect(noDaArvore(page, 'Filho')).toBeVisible();
    await page.keyboard.press('End');
    await expect(campo(page, 'Nome')).toHaveValue('B');
  });
  test('etiquetas distinguem os minigames e a porta', async ({ page }) => {
    const hk = (id, puzzle) => ({ id, nome: id, tipo: 'nenhum', protecao: { tipo: 'hack', puzzle } });
    await mestre(page, [hk('p1', 'palavras'), hk('m1', 'memoria'), { id: 'd', nome: 'Porta', tipo: 'porta', protecao: { tipo: 'hack', puzzle: 'memoria' } }, { id: 'c', nome: 'Texto', texto: 'x', cripto: { ativo: true } }]);
    await expect(page.locator('.no-arv .tag')).toHaveText(['Palavras', 'Memória', 'Porta · Memória', 'Cifrado']);
  });
  test('alerta do nó aparece e some na árvore', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'A', protecao: { tipo: 'teclado', codigo: '' } }]);
    await expect(page.locator('[data-no=a] .aviso-no')).toBeVisible();
    await campo(page, 'Código (1 a 5 dígitos)').fill('12');
    await expect(page.locator('[data-no=a] .aviso-no')).toHaveCount(0);
  });
  test('título não aceita filhos', async ({ page }) => {
    await mestre(page, [{ id: 't', nome: 'Seção', estrutura: 'titulo' }]);
    await expect(botao(page, '+ Filho')).toBeDisabled();
  });
  test('campos mudam conforme o conteúdo', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'A' }]);
    await expect(campo(page, 'Texto')).toBeVisible();
    await campo(page, 'Conteúdo').selectOption('porta');
    await expect(campo(page, 'Texto atrás da porta')).toBeVisible();
    await expect(page.getByLabel('Começa trancada')).toBeVisible();
    await campo(page, 'Conteúdo').selectOption('nenhum');
    await expect(campo(page, 'Texto')).toHaveCount(0);
    await campo(page, 'Estrutura').selectOption('titulo');
    await expect(campo(page, 'Conteúdo')).toHaveCount(0);
  });
  test('campos mudam conforme a proteção e o minigame', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'A' }]);
    await campo(page, 'Tipo').selectOption('senha');
    await expect(campo(page, 'Senha')).toBeVisible();
    await campo(page, 'Tipo').selectOption('teclado');
    await expect(campo(page, 'Código (1 a 5 dígitos)')).toBeVisible();
    await campo(page, 'Tipo').selectOption('hack');
    for (const [puzzle, rotulo] of [['palavras', 'Senha a descobrir'], ['cripto', 'Frase secreta'], ['memoria', 'Repetições da sequência']]) {
      await campo(page, 'Minigame').selectOption(puzzle);
      await expect(campo(page, rotulo)).toBeVisible();
    }
    await campo(page, 'Se esgotar os erros').selectOption('travarTempo');
    await expect(campo(page, 'Tempo de trava (segundos)')).toBeVisible();
    await page.getByLabel('Permitir forçar acesso').check();
    await expect(campo(page, 'DV para forçar')).toBeVisible();
    await page.getByLabel('Teste de perícia antes do jogo').check();
    await expect(campo(page, 'DV do teste')).toBeVisible();
  });
  test('texto criptografado mostra os campos e salva', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'A', texto: 'oi' }]);
    await page.getByLabel('Mostrar embaralhado até decriptar').check();
    await campo(page, 'Camadas').fill('2');
    await campo(page, 'Dificuldade do teste (DV)').fill('9');
    await assentar(page);
    const c = (await nosSalvos(page)).nos[0].cripto;
    expect([c.ativo, c.rodadas, c.dv]).toEqual([true, 2, 9]);
  });
  test('código do teclado aceita só dígitos', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'A', protecao: { tipo: 'teclado', codigo: '1' } }]);
    await campo(page, 'Código (1 a 5 dígitos)').fill('12a4b');
    await assentar(page);
    expect((await nosSalvos(page)).nos[0].protecao.codigo).toBe('124');
  });
  test('avisa proteção impossível de abrir', async ({ page }) => {
    await mestre(page, [{ id: 'a', nome: 'A', protecao: { tipo: 'teclado', codigo: '' } }, { id: 'b', nome: 'B', protecao: { tipo: 'senha', codigo: '' } }, hack('c', 'C', 'palavras', { alvo: 'ABC' })]);
    await expect(page.locator('.alerta-no')).toContainText('sem código');
    await noDaArvore(page, 'B').click();
    await expect(page.locator('.alerta-no')).toContainText('sem senha');
    await noDaArvore(page, 'C').click();
    await expect(page.locator('.alerta-no')).toContainText('4 a 10 letras');
    await aba(page, 'Publicar');
    await expect(page.locator('.alerta-no')).toHaveCount(1);
    await expect(page.locator('.alerta-no')).toContainText('3 nó(s)');
  });
  for (const [puzzle, seletor] of [['palavras', '.dump'], ['breach', '.g-breach'], ['circuito', '.g-circ'], ['cripto', '.cifra'], ['memoria', '.g-mem']]) {
    test('testar puzzle ' + puzzle + ' não mexe no progresso', async ({ page }) => {
      await mestre(page, [hack('a', 'A', puzzle)]);
      await botao(page, 'Testar este puzzle').click();
      await expect(page.locator(seletor)).toBeVisible();
      await expect(page.getByText(/^Resposta:/)).toBeVisible();
      await botao(page, 'Gerar outro').click();
      await expect(page.locator(seletor)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#modal')).toBeEmpty();
      expect(await estado(page, 'a').then((s) => s && s.puzzle)).toBeFalsy();
    });
  }
  test('mudar o puzzle depois de gerado vale para o jogador', async ({ page }) => {
    await mestre(page, [hack('a', 'A', 'palavras', { alvo: 'NEON' })]);
    await botao(page, 'Sair para modo jogador').click();
    await page.locator('.bloco', { hasText: 'A' }).click();
    await botao(page, 'INICIAR HACK').click();
    await expect(page.locator('.dump')).toBeVisible();
    await page.keyboard.press('Escape');
    await entrar(page);
    await campo(page, 'Senha a descobrir').fill('CROMO');
    await assentar(page);
    await botao(page, 'Sair para modo jogador').click();
    await iniciarHack(page, 'A');
    expect((await estado(page, 'a')).puzzle.alvo).toBe('CROMO');
    await page.keyboard.press('Escape');
    await entrar(page);
    await campo(page, 'Minigame').selectOption('breach');
    await assentar(page);
    await botao(page, 'Sair para modo jogador').click();
    await iniciarHack(page, 'A');
    await expect(page.locator('.g-breach')).toBeVisible();
  });
  test('edição não se perde com janela do jogador ativa', async ({ page, context }) => {
    await mestre(page, [{ id: 'a', nome: 'A', texto: 't' }, { id: 'b', nome: 'B', texto: 'u' }]);
    const jogador = await context.newPage();
    await jogador.goto('/');
    await campo(page, 'Nome').fill('Primeira parte');
    await assentar(page);
    await jogador.locator('.bloco', { hasText: 'B' }).click();
    await page.waitForTimeout(150);
    await campo(page, 'Nome').fill('Segunda parte');
    await assentar(page);
    await page.reload();
    await expect(noDaArvore(page, 'Segunda parte')).toBeVisible();
  });
});

test.describe('aba geral', () => {
  test('título, subtítulo e tema chegam ao jogador', async ({ page }) => {
    await mestre(page);
    await aba(page, 'Geral');
    await campo(page, 'Título').fill('TORRE 9');
    await campo(page, 'Subtítulo').fill('Nível 3');
    await campo(page, 'Tema').selectOption('gelo');
    await botao(page, 'Sair para modo jogador').click();
    await expect(page.getByRole('heading', { name: 'TORRE 9' })).toBeVisible();
    await expect(page.getByText('Nível 3')).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--p'))).toBe('#8fd3ff');
  });
  test('o cabeçalho do mestre acompanha o título', async ({ page }) => {
    await mestre(page);
    await aba(page, 'Geral');
    await campo(page, 'Título').fill('TORRE 9');
    await expect(page.locator('.topo small')).toHaveText('TORRE 9');
  });
  test('volume fica entre 0 e 100', async ({ page }) => {
    await mestre(page);
    await aba(page, 'Geral');
    await campo(page, 'Volume (0 a 100)').fill('500');
    await assentar(page);
    expect((await nosSalvos(page)).volume).toBe(100);
    await campo(page, 'Volume (0 a 100)').fill('-3');
    await assentar(page);
    expect((await nosSalvos(page)).volume).toBe(0);
  });
  test('boot personalizado aparece ao jogador', async ({ page }) => {
    await mestre(page);
    await aba(page, 'Geral');
    await page.getByLabel('Mostrar boot ao abrir').check();
    await campo(page, 'Linhas').fill('LINHA UM\nLINHA DOIS');
    await campo(page, 'Frequência').selectOption('sempre');
    await assentar(page);
    await botao(page, 'Sair para modo jogador').click();
    await page.reload();
    await botao(page, 'CONECTAR').click();
    await expect(page.getByText('> LINHA DOIS')).toBeVisible();
  });
  test('sons desligados escondem os botões de som e não pedem CONECTAR', async ({ page }) => {
    await mestre(page);
    await aba(page, 'Geral');
    await page.getByLabel('Sons ligados').uncheck();
    await assentar(page);
    await botao(page, 'Sair para modo jogador').click();
    await expect(page.getByRole('button', { name: /^(SOM|AMBIENTE):/ })).toHaveCount(0);
  });
  test('sem ambiente esconde só o botão de ambiente', async ({ page }) => {
    await mestre(page);
    await aba(page, 'Geral');
    await campo(page, 'Ambiente contínuo').selectOption('off');
    await assentar(page);
    await botao(page, 'Sair para modo jogador').click();
    await expect(page.getByRole('button', { name: /^AMBIENTE:/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^SOM:/ })).toBeVisible();
  });
  test('botões de teste de som e ambiente funcionam', async ({ page }) => {
    await mestre(page);
    await aba(page, 'Geral');
    for (const nome of ['Alarme', 'Sirene', 'Glitch', 'Explosão', 'Ouvir ambiente (4s)']) await botao(page, nome).click();
    expect(await page.evaluate(() => audio.state)).toBe('running');
  });
  test('regras de rolagem são salvas', async ({ page }) => {
    await mestre(page);
    await aba(page, 'Geral');
    await page.getByLabel('Empate com o DV passa').check();
    await page.getByLabel('10 e 1 no d10 rolam mais um dado').uncheck();
    await assentar(page);
    expect((await nosSalvos(page)).rolagem).toEqual({ criticos: false, empatePassa: true });
  });
});

test.describe('macros', () => {
  test('cria, edita, dispara e exclui', async ({ page, context }) => {
    await mestre(page);
    const jogador = await context.newPage();
    await jogador.goto('/');
    await aba(page, 'Macros');
    await botao(page, '+ Macro').click();
    const f = page.locator('fieldset').last();
    await f.getByLabel('Nome', { exact: true }).fill('Blecaute');
    await f.getByLabel('Atmosfera', { exact: true }).selectOption('critico');
    await f.getByLabel('Aviso na tela', { exact: true }).fill('SEM ENERGIA');
    await f.getByLabel('Inicia contagem regressiva').check();
    await page.locator('fieldset').last().getByLabel('Segundos', { exact: true }).fill('90');
    await assentar(page);
    await page.locator('fieldset').last().getByRole('button', { name: 'Disparar agora' }).click();
    await expect(jogador.locator('html')).toHaveAttribute('data-atmos', 'critico');
    await expect(jogador.getByText('SEM ENERGIA')).toBeVisible();
    await expect(jogador.locator('#relogio')).toBeVisible();
    await page.locator('fieldset').last().getByRole('button', { name: 'Excluir' }).click();
    await botao(page, 'CONFIRMAR').click();
    await assentar(page);
    expect((await nosSalvos(page)).macros.some((m) => m.rotulo === 'Blecaute')).toBe(false);
  });
  test('título da macro acompanha o nome', async ({ page }) => {
    await mestre(page);
    await aba(page, 'Macros');
    const f = page.locator('fieldset').first();
    await f.getByLabel('Nome', { exact: true }).fill('Renomeada');
    await expect(f.locator('legend')).toHaveText('Renomeada');
  });
  test('macro aparece nos seletores do nó e dispara na falha', async ({ page }) => {
    const macros = [{ id: 'm1', rotulo: 'Pânico', atmos: 'critico' }];
    await mestre(page, [{ id: 'a', nome: 'A', protecao: { tipo: 'senha', codigo: 'x', macroFalha: 'm1' } }], { macros });
    await expect(campo(page, 'Macro na falha').locator('option:checked')).toHaveText('Pânico');
    await botao(page, 'Sair para modo jogador').click();
    await page.locator('.bloco', { hasText: 'A' }).click();
    await campo(page, 'Senha').fill('y');
    await botao(page, 'ENVIAR').click();
    await expect(page.locator('html')).toHaveAttribute('data-atmos', 'critico');
  });
  test('excluir macro limpa as referências nos nós', async ({ page }) => {
    const macros = [{ id: 'm1', rotulo: 'Pânico' }];
    await mestre(page, [{ id: 'a', nome: 'A', macro: 'm1', protecao: { tipo: 'senha', codigo: 'x', macroFalha: 'm1', macroSucesso: 'm1' } }], { macros });
    await aba(page, 'Macros');
    await botao(page, 'Excluir').click();
    await botao(page, 'CONFIRMAR').click();
    await assentar(page);
    const n = (await nosSalvos(page)).nos[0];
    expect([n.macro, n.protecao.macroFalha, n.protecao.macroSucesso]).toEqual(['', '', '']);
  });
});
