import { test, expect, botao, campo, semear, estado, iniciarHack, clicarPalavra, vencerPalavras, vencerBreach, vencerCircuito, vencerCripto, vencerMemoria } from './auxiliares.mjs';

const hack = (puzzle, resto = {}) => [{ id: 'a', nome: 'Alvo', texto: 'Liberado', protecao: { tipo: 'hack', puzzle, maxTentativas: 3, ...resto } }, { id: 'f', pai: 'a', nome: 'Filho', texto: 'y' }];
const vencer = { palavras: vencerPalavras, breach: vencerBreach, circuito: vencerCircuito, cripto: vencerCripto, memoria: vencerMemoria };

test.describe('minigames', () => {
  for (const dif of ['facil', 'normal', 'dificil', 'expert']) {
    for (const puzzle of Object.keys(vencer)) {
      test(`${puzzle} ${dif}: vencer libera conteúdo e filhos`, async ({ page }) => {
        await semear(page, hack(puzzle, { dificuldade: dif }));
        await iniciarHack(page, 'Alvo');
        await vencer[puzzle](page, 'a');
        await expect(page.getByText('Liberado')).toBeVisible({ timeout: 8000 });
        expect((await estado(page, 'a')).status).toBe('resolvido');
        await botao(page, 'Fechar').click();
        await expect(page.locator('.bloco', { hasText: 'Filho' })).toBeVisible();
      });
    }
  }
  test('palavras: errar conta tentativa e esgotar trava', async ({ page }) => {
    await semear(page, hack('palavras', { dificuldade: 'facil', maxTentativas: 2 }));
    await iniciarHack(page, 'Alvo');
    const p = (await estado(page, 'a')).puzzle;
    const erradas = p.palavras.filter((w) => w !== p.alvo);
    await clicarPalavra(page, erradas[0]);
    await expect(page.getByText('Tentativas: 1 de 2')).toBeVisible();
    await clicarPalavra(page, erradas[1]);
    await expect(page.getByText('TERMINAL TRAVADO')).toBeVisible();
  });
  test('breach: buffer cheio falha e permite tentar de novo', async ({ page }) => {
    await semear(page, hack('breach', { dificuldade: 'facil' }));
    await iniciarHack(page, 'Alvo');
    await page.evaluate(() => { prog.nos.a.puzzle.daemons = [['ZZ', 'ZZ']]; });
    await botao(page, 'Fechar').click();
    await page.locator('.bloco', { hasText: 'Alvo' }).click();
    await botao(page, 'INICIAR HACK').click();
    for (let i = 0; i < 5; i++) await page.locator('.g-breach button.ativo').first().click();
    await expect(page.getByText('BUFFER ESGOTADO')).toBeVisible();
    await botao(page, 'TENTAR DE NOVO').click();
    await expect(page.locator('.g-breach')).toBeVisible();
  });
  test('cripto: esgotar erros falha', async ({ page }) => {
    await semear(page, hack('cripto', { dificuldade: 'expert' }));
    await iniciarHack(page, 'Alvo');
    const p = (await estado(page, 'a')).puzzle;
    const mapa = {}; [...p.frase].forEach((c, i) => { if (c !== ' ') mapa[p.cifra[i]] = c; });
    for (let k = 0; k < p.erros; k++) {
      const b = page.locator('.cifra button:not(:disabled)').first();
      const cif = (await b.getAttribute('aria-label')).slice(-1);
      await b.click();
      const livre = await page.locator('.alfabeto button:not(:disabled)').allTextContents();
      await page.locator('.alfabeto button', { hasText: new RegExp('^' + livre.find((c) => c !== mapa[cif]) + '$') }).click();
    }
    await expect(page.getByText('CIFRA REJEITADA')).toBeVisible();
  });
  test('memória: limite de repetições some o botão', async ({ page }) => {
    await semear(page, hack('memoria', { dificuldade: 'facil', replays: 1 }));
    await iniciarHack(page, 'Alvo');
    await botao(page, 'INICIAR SEQUÊNCIA').click();
    await expect(page.getByRole('button', { name: /VER DE NOVO \(1\)/ })).toBeEnabled({ timeout: 8000 });
    await page.getByRole('button', { name: /VER DE NOVO/ }).click();
    await expect(page.getByRole('button', { name: /VER DE NOVO \(0\)/ })).toBeDisabled({ timeout: 8000 });
  });
  test('memória: errar conta tentativa', async ({ page }) => {
    await semear(page, hack('memoria', { dificuldade: 'facil' }));
    await iniciarHack(page, 'Alvo');
    const seq = (await estado(page, 'a')).puzzle.seq;
    await botao(page, 'INICIAR SEQUÊNCIA').click();
    await expect(page.locator('.g-mem button').first()).toBeEnabled({ timeout: 8000 });
    await page.locator('.g-mem button').nth((seq[0] + 1) % 9).click();
    await expect(page.getByText('PADRÃO INCORRETO')).toBeVisible();
    await expect(page.getByText('Tentativas: 2 de 3')).toBeVisible();
  });
  test('tempo esgotado aplica a consequência', async ({ page }) => {
    await semear(page, hack('breach', { tempo: 1, noTempo: 'quebrar' }));
    await iniciarHack(page, 'Alvo');
    await expect(page.getByText('SISTEMA DESTRUÍDO')).toBeVisible({ timeout: 4000 });
  });
  test('recarregar não zera o prazo', async ({ page }) => {
    await semear(page, hack('breach', { tempo: 1, noTempo: 'quebrar' }));
    await iniciarHack(page, 'Alvo');
    await page.reload();
    await expect(page.locator('.bloco', { hasText: 'OFFLINE' })).toBeVisible({ timeout: 4000 });
  });
  test('trava por tempo libera sozinha', async ({ page }) => {
    await semear(page, hack('palavras', { maxTentativas: 1, naFalha: 'travarTempo', travaSeg: 1 }));
    await iniciarHack(page, 'Alvo');
    const p = (await estado(page, 'a')).puzzle;
    await clicarPalavra(page, p.palavras.find((w) => w !== p.alvo));
    await expect(page.getByText('TERMINAL TRAVADO')).toBeVisible();
    await expect(botao(page, 'INICIAR HACK')).toBeVisible({ timeout: 4000 });
  });
  test('consequência novo puzzle zera tentativas', async ({ page }) => {
    await semear(page, hack('palavras', { maxTentativas: 1, naFalha: 'novo' }));
    await iniciarHack(page, 'Alvo');
    const p = (await estado(page, 'a')).puzzle;
    await clicarPalavra(page, p.palavras.find((w) => w !== p.alvo));
    await expect(botao(page, 'INICIAR HACK')).toBeVisible();
    await expect(page.getByText('Tentativas: 1 de 1')).toBeVisible();
  });
  test('forçar: sucesso abre e falha bloqueia', async ({ page }) => {
    const nos = [{ id: 'a', nome: 'Alvo', texto: 'Liberado', protecao: { tipo: 'senha', codigo: 'x', force: { ativo: true, dv: 10 } } }, { id: 'b', nome: 'Beta', texto: 'Outro', protecao: { tipo: 'teclado', codigo: '1', force: { ativo: true, dv: 10 } } }];
    await semear(page, nos);
    await page.locator('.bloco', { hasText: 'Alvo' }).click();
    await botao(page, 'FORÇAR ACESSO').click();
    await botao(page, 'NA MESA: PASSEI').click();
    await botao(page, 'CONTINUAR').click();
    await expect(page.getByText('Liberado')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('.bloco', { hasText: 'Beta' }).click();
    await botao(page, 'FORÇAR ACESSO').click();
    await botao(page, 'NA MESA: FALHEI').click();
    await botao(page, 'CONTINUAR').click();
    await expect(botao(page, 'FORÇA: FALHOU')).toBeDisabled();
  });
  test('teste de perícia ajusta a dificuldade', async ({ page }) => {
    await semear(page, hack('breach', { dificuldade: 'normal', teste: { ativo: true, dv: 10 } }));
    await page.locator('.bloco', { hasText: 'Alvo' }).click();
    await botao(page, 'TESTE DE PERÍCIA').click();
    await botao(page, 'NA MESA: FALHEI').click();
    await botao(page, 'CONTINUAR').click();
    await expect(page.getByText('Dificuldade: Difícil')).toBeVisible();
  });
  test('rolagem automática mostra a conta', async ({ page }) => {
    await semear(page, hack('breach', { force: { ativo: true, dv: 10 } }));
    await page.locator('.bloco', { hasText: 'Alvo' }).click();
    await botao(page, 'FORÇAR ACESSO').click();
    await campo(page, 'Modificador').fill('5');
    await botao(page, 'ROLAR D10').click();
    await expect(page.getByText(/contra 10/)).toBeVisible();
  });
});

test.describe('proteções e conteúdo', () => {
  test('senha ignora maiúsculas e esgotar trava', async ({ page }) => {
    await semear(page, [{ id: 'a', nome: 'Alvo', texto: 'Dentro', protecao: { tipo: 'senha', codigo: 'Zero', maxTentativas: 2 } }, { id: 'b', nome: 'Beta', protecao: { tipo: 'senha', codigo: 'x', maxTentativas: 1 } }]);
    await page.locator('.bloco', { hasText: 'Alvo' }).click();
    await campo(page, 'Senha').fill('errada');
    await botao(page, 'ENVIAR').click();
    await expect(page.getByText('SENHA INCORRETA')).toBeVisible();
    await campo(page, 'Senha').fill('zERO');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Dentro')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('.bloco', { hasText: 'Beta' }).click();
    await campo(page, 'Senha').fill('y');
    await botao(page, 'ENVIAR').click();
    await expect(page.getByText('TERMINAL TRAVADO')).toBeVisible();
  });
  test('teclado acerta, apaga e mostra erro', async ({ page }) => {
    await semear(page, [{ id: 'a', nome: 'Alvo', texto: 'Dentro', protecao: { tipo: 'teclado', codigo: '305', maxTentativas: 3 } }]);
    await page.locator('.bloco', { hasText: 'Alvo' }).click();
    for (const t of ['9', 'OK']) await botao(page, t).click();
    await expect(page.getByText('CÓDIGO INVÁLIDO')).toBeVisible();
    await expect(page.getByText('Tentativas: 2 de 3')).toBeVisible();
    for (const t of ['1', 'C', '3', '0', '5', 'OK']) await botao(page, t).click();
    await expect(page.getByText('Dentro')).toBeVisible();
  });
  test('texto criptografado revela em camadas', async ({ page }) => {
    await semear(page, [{ id: 'a', nome: 'Alvo', texto: 'Mensagem secreta completa', cripto: { ativo: true, rodadas: 2 } }]);
    await page.locator('.bloco', { hasText: 'Alvo' }).click();
    await expect(page.getByText('Mensagem secreta completa')).toHaveCount(0);
    for (const c of [1, 2]) {
      await botao(page, 'TENTAR DECRIPTAR').click();
      await botao(page, 'NA MESA: PASSEI').click();
      await botao(page, 'CONTINUAR').click();
      if (c === 1) await expect(page.getByText('camada 1 de 2')).toBeVisible();
    }
    await expect(page.getByText('Mensagem secreta completa')).toBeVisible();
  });
  test('porta protegida abre, mostra filhos e fecha', async ({ page }) => {
    await semear(page, [{ id: 'a', nome: 'Porta', tipo: 'porta', texto: 'Atrás dela', protecao: { tipo: 'senha', codigo: 'x' } }, { id: 'f', pai: 'a', nome: 'Sala', texto: 'y' }]);
    await page.locator('.bloco', { hasText: 'Porta' }).click();
    await campo(page, 'Senha').fill('x');
    await botao(page, 'ENVIAR').click();
    await expect(page.getByText('PORTA FECHADA')).toBeVisible();
    await botao(page, 'ABRIR PORTA').click();
    await expect(page.getByText('Atrás dela')).toBeVisible();
    await expect(page.locator('.bloco', { hasText: 'Sala' })).toHaveCount(1);
    await botao(page, 'FECHAR PORTA').click();
    await expect(page.locator('.bloco', { hasText: 'Sala' })).toHaveCount(0);
  });
  test('porta trancada sem proteção fica bloqueada', async ({ page }) => {
    await semear(page, [{ id: 'a', nome: 'Porta', tipo: 'porta', porta: { aberta: false, trancada: true } }]);
    await page.locator('.bloco', { hasText: 'Porta' }).click();
    await expect(page.getByText('PORTA TRANCADA')).toBeVisible();
    await expect(botao(page, 'ABRIR PORTA')).toBeDisabled();
  });
  test('recarregar mantém o progresso', async ({ page }) => {
    await semear(page, hack('palavras'));
    await iniciarHack(page, 'Alvo');
    await vencerPalavras(page, 'a');
    await expect(page.getByText('Liberado')).toBeVisible();
    await page.reload();
    await expect(page.locator('.bloco', { hasText: 'Filho' })).toBeVisible();
  });
});

test.describe('som do jogador', () => {
  test('ambiente começa desligado e liga pelo botão, sem afetar efeitos', async ({ page }) => {
    await page.goto('/');
    await botao(page, 'CONECTAR').click();
    await page.locator('.boot').click();
    expect(await page.evaluate(() => ambiente)).toBeNull();
    await botao(page, 'AMBIENTE: OFF').click();
    expect(await page.evaluate(() => ambiente && ambiente.tipo)).toBe('servidor');
    await page.reload();
    await expect(botao(page, 'AMBIENTE: ON')).toBeVisible();
    await botao(page, 'SOM: ON').click();
    await expect(botao(page, 'SOM: OFF')).toBeVisible();
  });
});
