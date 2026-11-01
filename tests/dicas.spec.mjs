import { test, expect, botao, campo, semear, mestre, aba, nosSalvos, assentar, iniciarHack } from './auxiliares.mjs';

const dica = (page, chave) => page.getByRole('button', { name: 'O que é ' + chave + '?', exact: true });
const balao = (page) => page.getByRole('tooltip');
const NO_HACK = { id: 'f', nome: 'Firewall', tipo: 'nenhum', protecao: { tipo: 'hack', puzzle: 'breach', teste: { ativo: true, dv: 13 }, force: { ativo: true, dv: 17 } } };

test.describe('informativo de termos', () => {
  test('clique abre, segundo clique, Esc e clique fora fecham', async ({ page }) => {
    await mestre(page);
    await aba(page, 'Geral');
    await dica(page, 'CRT').click();
    await expect(balao(page)).toContainText('monitor antigo');
    await dica(page, 'CRT').click();
    await expect(balao(page)).toHaveCount(0);
    await dica(page, 'CRT').click();
    await page.keyboard.press('Escape');
    await expect(balao(page)).toHaveCount(0);
    await expect(page.getByRole('tablist')).toBeVisible();
    await dica(page, 'CRT').click();
    await page.locator('h3').first().click();
    await expect(balao(page)).toHaveCount(0);
  });
  test('passar o mouse mostra e sair esconde', async ({ page }) => {
    await mestre(page);
    await aba(page, 'Geral');
    await dica(page, 'CRT').hover();
    await expect(balao(page)).toBeVisible();
    await page.locator('h3').first().hover();
    await expect(balao(page)).toHaveCount(0);
  });
  test('Esc com balão não fecha o modal do jogador', async ({ page }) => {
    await semear(page, [NO_HACK]);
    await page.locator('.bloco', { hasText: 'Firewall' }).click();
    await botao(page, 'TESTE DE PERÍCIA').click();
    await dica(page, 'DV').click();
    await page.keyboard.press('Escape');
    await expect(balao(page)).toHaveCount(0);
    await expect(botao(page, 'ROLAR D10')).toBeVisible();
  });
  test('o ? da caixa de seleção não muda a opção', async ({ page }) => {
    await mestre(page);
    await aba(page, 'Geral');
    const antes = (await nosSalvos(page))?.rolagem.empatePassa;
    await dica(page, 'Empate com o DV passa').click();
    await expect(balao(page)).toContainText('exatamente o DV');
    await assentar(page);
    expect((await nosSalvos(page))?.rolagem.empatePassa).toBe(antes);
    await page.keyboard.press('Escape');
    await page.getByLabel('Empate com o DV passa', { exact: true }).check();
    await assentar(page);
    expect((await nosSalvos(page)).rolagem.empatePassa).toBe(true);
  });
  test('todos os DV da configuração têm explicação', async ({ page }) => {
    await mestre(page, [{ ...NO_HACK, tipo: 'texto', cripto: { ativo: true, dv: 13, rodadas: 2 } }]);
    await page.locator('.no-arv').first().click();
    for (const c of ['DV do teste', 'DV para forçar', 'Dificuldade do teste (DV)']) await expect(dica(page, c)).toBeVisible();
  });
  test('jogador vê a regra da rolagem e o que é DV', async ({ page }) => {
    await semear(page, [NO_HACK]);
    await page.locator('.bloco', { hasText: 'Firewall' }).click();
    await botao(page, 'FORÇAR ACESSO').click();
    await expect(page.getByText('Rolagem: d10 + modificador. Precisa superar o DV')).toBeVisible();
    await dica(page, 'DV').click();
    await expect(balao(page)).toContainText('Valor de Dificuldade');
    await page.keyboard.press('Escape');
    await dica(page, 'Modificador').click();
    await expect(balao(page)).toContainText('ficha');
  });
  test('empate muda o texto da regra', async ({ page }) => {
    await semear(page, [NO_HACK], { rolagem: { criticos: true, empatePassa: true } });
    await page.locator('.bloco', { hasText: 'Firewall' }).click();
    await botao(page, 'FORÇAR ACESSO').click();
    await expect(page.getByText('Precisa igualar ou superar o DV')).toBeVisible();
  });
  test('minigame explica como jogar, BUFFER e sequência', async ({ page }) => {
    await semear(page, [{ ...NO_HACK, protecao: { ...NO_HACK.protecao, teste: { ativo: false } } }]);
    await iniciarHack(page, 'Firewall');
    await dica(page, 'Quebra de Protocolo').click();
    await expect(balao(page)).toContainText('linha e a coluna');
    await page.keyboard.press('Escape');
    await dica(page, 'BUFFER').click();
    await expect(balao(page)).toContainText('Memória temporária');
    await page.keyboard.press('Escape');
    await expect(dica(page, 'SEQ')).toHaveCount(1);
    await expect(page.locator('.fila', { hasText: 'SEQ 1' }).locator('.cod').first()).toBeVisible();
    await expect(page.locator('.fila', { hasText: 'SEQ 2' })).toBeVisible();
  });
  test('o balão cabe na tela do celular, mesmo no canto', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await mestre(page);
    await aba(page, 'Geral');
    const b = dica(page, '10 e 1 no d10 rolam mais um dado');
    await b.scrollIntoViewIfNeeded();
    await b.click();
    const r = await balao(page).boundingBox();
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.width).toBeLessThanOrEqual(320);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.y + r.height).toBeLessThanOrEqual(568);
  });
});
