import os from 'node:os';
import path from 'node:path';
import { test as base, expect } from '@playwright/test';

export const SENHA = 'netrunner';
export const temporario = (info, nome) => path.join(os.tmpdir(), info.testId + '-' + nome);

export const test = base.extend({
  page: async ({ page }, use) => {
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
    await use(page);
    const texto = await page.locator('body').innerText({ timeout: 1000 }).catch(() => '');
    expect(texto, 'objeto impresso como texto').not.toContain('[object ');
    expect(erros, 'erros no console da página').toEqual([]);
  }
});
export { expect };

export async function baixar(page, clicar, arquivo) {
  for (let i = 0; ; i++) {
    const espera = page.waitForEvent('download');
    await clicar();
    const d = await espera;
    if (await d.failure() !== 'canceled' || i === 2) { await d.saveAs(arquivo); return; }
  }
}
export const botao = (page, nome) => page.getByRole('button', { name: nome, exact: true });
export const campo = (page, nome) => page.getByLabel(nome, { exact: true });

export async function semear(page, nos, extra = {}) {
  await page.goto('/');
  await page.evaluate(({ nos, extra }) => {
    localStorage.setItem('nt.base.cenario', JSON.stringify({ ...cenario, boot: { ...cenario.boot, ativo: false }, ...extra, nos }));
    localStorage.removeItem('nt.base.prog');
  }, { nos, extra });
  await page.reload();
}
export async function semBoot(page) {
  await semear(page, await pegaNos(page));
}
async function pegaNos(page) {
  await page.goto('/');
  return page.evaluate(() => cenario.nos);
}
export async function entrar(page, senha = SENHA) {
  await page.keyboard.press('Control+Shift+M');
  await campo(page, 'Senha de configuração').fill(senha);
  await botao(page, 'ENTRAR').click();
}
export async function mestre(page, nos, extra) {
  if (nos) await semear(page, nos, extra); else await semBoot(page);
  await entrar(page);
  await expect(page.getByRole('tablist')).toBeVisible();
}
export const aba = (page, nome) => page.getByRole('tab', { name: nome, exact: true }).click();
export const estado = (page, id) => page.evaluate((i) => prog.nos[i] || null, id);
export const nosSalvos = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('nt.base.cenario') || 'null'));
export const assentar = (page) => page.waitForTimeout(350);
export const noDaArvore = (page, nome) => page.locator('.no-arv').filter({ has: page.locator('.nm').getByText(nome, { exact: true }) });
export const noVivo = (page, nome) => page.locator('.vivo-no').filter({ has: page.locator('b', { hasText: nome }) });
export const blocos = (page) => page.locator('.bloco .nm');

export async function iniciarHack(page, nome) {
  await page.locator('.bloco', { hasText: nome }).click();
  await botao(page, 'INICIAR HACK').click();
}
export async function clicarPalavra(page, palavra) {
  const i = await page.evaluate((w) => [...document.querySelectorAll('.dump .tok')].map((t) => t.textContent).join('').indexOf(w), palavra);
  await page.locator('.dump .tok').nth(i).click();
}
export async function vencerPalavras(page, id) {
  await clicarPalavra(page, (await estado(page, id)).puzzle.alvo);
}
export async function vencerBreach(page, id) {
  const p = (await estado(page, id)).puzzle;
  for (const [r, c] of p.caminho) {
    if (await page.locator('.grande.ok').count()) break;
    await page.locator('.g-breach button').nth(r * p.n + c).click();
  }
}
export async function vencerCircuito(page, id) {
  const p = (await estado(page, id)).puzzle;
  for (const [i, c] of p.celulas.entries()) {
    if (c.fixo) continue;
    for (let k = 0; k < (4 - c.r) % 4; k++) {
      if (await page.locator('.grande.ok').count()) return;
      await page.locator('.g-circ button').nth(i).click();
    }
  }
}
export async function vencerCripto(page, id) {
  const p = (await estado(page, id)).puzzle;
  const mapa = {}; [...p.frase].forEach((c, i) => { if (c !== ' ') mapa[p.cifra[i]] = c; });
  while (await page.locator('.cifra button:not(:disabled)').count()) {
    const b = page.locator('.cifra button:not(:disabled)').first();
    const cif = (await b.getAttribute('aria-label')).slice(-1);
    await b.click();
    await page.locator('.alfabeto button', { hasText: new RegExp('^' + mapa[cif] + '$') }).click();
  }
}
export async function vencerMemoria(page, id) {
  const p = (await estado(page, id)).puzzle;
  await botao(page, 'INICIAR SEQUÊNCIA').click();
  await expect(page.locator('.g-mem button').first()).toBeEnabled({ timeout: 8000 });
  for (const i of p.seq) await page.locator('.g-mem button').nth(i).click();
}
