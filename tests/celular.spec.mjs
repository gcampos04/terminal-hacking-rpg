import { test, expect, semear, botao } from './auxiliares.mjs';

for (const largura of [320, 375]) {
  test('criptograma com palavras longas cabe em ' + largura + 'px', async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 640 });
    await semear(page, [{ id: 'f', nome: 'Alvo', tipo: 'nenhum', protecao: { tipo: 'hack', puzzle: 'cripto', alvo: 'CYBERSPACE DECRIPTADO SUBSISTEMAS' } }]);
    await page.locator('.bloco', { hasText: 'Alvo' }).click();
    await botao(page, 'INICIAR HACK').click();
    const estouro = await page.locator('.caixa .corpo').evaluate((e) => e.scrollWidth - e.clientWidth);
    expect(estouro).toBeLessThanOrEqual(1);
  });
}
