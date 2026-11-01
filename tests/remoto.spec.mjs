import { test, expect, botao, campo, mestre, aba, assentar } from './auxiliares.mjs';

const MACROS = [
  { id: 'gelo', rotulo: 'Gelo', atmos: 'critico', sinal: 'pesado', som: 'alarme', glitchMs: 300, aviso: 'CONTRAMEDIDA' },
  { id: 'relogio', rotulo: 'Relógio', contagem: { ativa: true, seg: 300, final: 'desligar' } }
];
const NOS = [
  { id: 'a', nome: 'Cofre', texto: 'Dentro', protecao: { tipo: 'senha', codigo: 'segredo123' } },
  { id: 'b', nome: 'Armadilha', texto: 'Caiu', macro: 'relogio' }
];
async function geraLink(page) {
  await aba(page, 'Publicar');
  await botao(page, 'Copiar link para jogadores').click();
  const l = campo(page, 'Link para jogadores');
  await expect(l).toBeVisible();
  return l.inputValue();
}
async function jogadorRemoto(page, link) {
  const ctx = await page.context().browser().newContext();
  const j = await ctx.newPage();
  await j.goto(link);
  await expect(j.locator('.boot')).toHaveCount(0);
  return j;
}
const atmos = (p) => p.locator('html');
const painel = async (page) => { await aba(page, 'Ao vivo'); };
const dispara = (page, nome) => page.locator('.painel', { has: page.getByRole('heading', { name: 'Macros', exact: true }) }).getByRole('button', { name: nome, exact: true }).click();

test.describe('controle à distância', () => {
  test('macro do mestre chega a outro navegador e o mestre não precisa do link', async ({ page }) => {
    await mestre(page, NOS, { macros: MACROS });
    const j = await jogadorRemoto(page, await geraLink(page));
    await painel(page);
    await expect(page.locator('#rele-estado')).toHaveText('Ativo para quem abriu um link novo.');
    await dispara(page, 'Gelo');
    await expect(atmos(j)).toHaveAttribute('data-atmos', 'critico');
    await expect(j.getByText('CONTRAMEDIDA')).toBeVisible();
    expect(await j.evaluate(() => [prog.sinal, prog.som.nome])).toEqual(['pesado', 'alarme']);
    await expect(page.locator('#rele-estado')).toContainText('Último envio');
    await j.context().close();
  });
  test('atmosfera, aviso, contagem e terminal chegam ao jogador', async ({ page }) => {
    await mestre(page, NOS, { macros: MACROS });
    const j = await jogadorRemoto(page, await geraLink(page));
    await painel(page);
    await botao(page, 'Aviso').click();
    await expect(atmos(j)).toHaveAttribute('data-atmos', 'aviso');
    await page.getByRole('textbox', { name: 'Aviso', exact: true }).fill('ME OUÇA');
    await botao(page, 'Enviar').click();
    await expect(j.getByText('ME OUÇA')).toBeVisible();
    await botao(page, 'Iniciar').click();
    await expect(j.locator('#relogio')).toBeVisible();
    await botao(page, 'Pausar').click();
    await expect.poll(() => j.evaluate(() => prog.contagem && prog.contagem.resto)).not.toBeNull();
    await botao(page, 'Parar').click();
    await expect(j.locator('#relogio')).toHaveCount(0);
    await botao(page, 'Explodir').click();
    await expect.poll(() => j.evaluate(() => prog.terminal)).toBe('explodido');
    await botao(page, 'Religar').click();
    await expect.poll(() => j.evaluate(() => prog.terminal)).toBe('ok');
    await j.context().close();
  });
  test('comando do mestre não apaga a contagem que o jogador iniciou', async ({ page }) => {
    await mestre(page, NOS, { macros: MACROS });
    const j = await jogadorRemoto(page, await geraLink(page));
    await painel(page);
    await j.locator('.bloco', { hasText: 'Armadilha' }).click();
    await expect(j.locator('#relogio')).toBeVisible();
    await botao(page, 'Crítico').click();
    await expect(atmos(j)).toHaveAttribute('data-atmos', 'critico');
    await expect(j.locator('#relogio')).toBeVisible();
    await j.context().close();
  });
  test('quem entra depois recebe o estado atual sem repetir o aviso', async ({ page }) => {
    await mestre(page, NOS, { macros: MACROS });
    const link = await geraLink(page);
    await painel(page);
    await dispara(page, 'Gelo');
    await expect(page.locator('#rele-estado')).toContainText('Último envio');
    const j = await jogadorRemoto(page, link);
    await expect(atmos(j)).toHaveAttribute('data-atmos', 'critico');
    await expect(j.getByText('CONTRAMEDIDA')).toHaveCount(0);
    await j.reload();
    await assentar(j);
    await expect(atmos(j)).toHaveAttribute('data-atmos', 'critico');
    await j.context().close();
  });
  test('a mensagem não leva respostas nem a senha do mestre', async ({ page }) => {
    await mestre(page, NOS, { macros: MACROS });
    await geraLink(page);
    await painel(page);
    const envio = page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/rele/'));
    await dispara(page, 'Gelo');
    const corpo = (await envio).postData();
    expect(Object.keys(JSON.parse(corpo)).sort()).toEqual(['g', 'k', 'n', 't']);
    expect(corpo).not.toContain('segredo123');
    expect(corpo).not.toContain('Hash');
  });
  test('sem link gerado não envia nada e o painel avisa', async ({ page }) => {
    await mestre(page, NOS, { macros: MACROS });
    const envios = [];
    page.on('request', (r) => { if (r.url().includes('/rele/')) envios.push(r.url()); });
    await painel(page);
    await expect(page.locator('#rele-estado')).toHaveText('Desativado: gere o link em Publicar.');
    await dispara(page, 'Gelo');
    await assentar(page);
    expect(envios).toEqual([]);
  });
  test('religar alcança o jogador cujo terminal desligou só no aparelho dele', async ({ page }) => {
    await mestre(page, NOS, { macros: MACROS });
    const j = await jogadorRemoto(page, await geraLink(page));
    await painel(page);
    await j.evaluate(() => { prog.terminal = 'desligado'; commit(); render(); });
    await expect(j.getByText('SEM ENERGIA')).toBeVisible();
    await botao(page, 'Religar').click();
    await expect(j.getByText('SEM ENERGIA')).toHaveCount(0);
    await j.context().close();
  });
  test('resetar progresso limpa os efeitos do jogador à distância', async ({ page }) => {
    await mestre(page, NOS, { macros: MACROS });
    const j = await jogadorRemoto(page, await geraLink(page));
    await j.evaluate(() => { prog.terminal = 'desligado'; prog.atmos = 'critico'; commit(); render(); });
    await aba(page, 'Publicar');
    await botao(page, 'Resetar progresso').click();
    await botao(page, 'CONFIRMAR').click();
    await expect(j.getByText('SEM ENERGIA')).toHaveCount(0);
    await expect(atmos(j)).toHaveAttribute('data-atmos', 'normal');
    await j.context().close();
  });
  const publica = (page, sala, g, k = Object.keys(g)) => page.request.post('/rele/' + sala, { data: JSON.stringify({ t: Date.now(), k, g }) });
  const ESTADO = { atmos: null, sinal: null, crt: null, glitchAte: 0, glitchMs: null, contagem: null, terminal: 'ok', som: { seq: 0, nome: '' }, aviso: { seq: 0, txt: '' } };
  test('contagem vencida de um ensaio não derruba quem abre o link depois', async ({ page }) => {
    await mestre(page, NOS, { macros: MACROS });
    const link = await geraLink(page);
    const sala = await page.evaluate(() => cenario.sala);
    await publica(page, sala, { ...ESTADO, atmos: 'critico', contagem: { ate: Date.now() - 60000, resto: null, final: 'desligar' } });
    const j = await jogadorRemoto(page, link);
    await expect(atmos(j)).toHaveAttribute('data-atmos', 'critico');
    await assentar(j);
    await assentar(j);
    await expect(j.getByText('SEM ENERGIA')).toHaveCount(0);
    expect(await j.evaluate(() => prog.contagem)).toBeNull();
    await j.context().close();
  });
  test('contagem em andamento continua para quem entra depois', async ({ page }) => {
    await mestre(page, NOS, { macros: MACROS });
    const link = await geraLink(page);
    const sala = await page.evaluate(() => cenario.sala);
    await publica(page, sala, { ...ESTADO, contagem: { ate: Date.now() + 120000, resto: null, final: 'desligar' } });
    const j = await jogadorRemoto(page, link);
    await expect(j.locator('#relogio')).toBeVisible();
    await j.context().close();
  });
  test('o site sem link não obedece à sala, mesmo com mensagem guardada', async ({ page }) => {
    await mestre(page, NOS, { macros: MACROS });
    await geraLink(page);
    const sala = await page.evaluate(() => cenario.sala);
    await publica(page, sala, { ...ESTADO, terminal: 'desligado' });
    await botao(page, 'Sair para modo jogador').click();
    await assentar(page);
    await page.reload();
    await assentar(page);
    await expect(page.getByText('SEM ENERGIA')).toHaveCount(0);
  });
  test('a sala continua a mesma ao gerar um novo link', async ({ page }) => {
    await mestre(page, NOS, { macros: MACROS });
    await geraLink(page);
    const sala = await page.evaluate(() => cenario.sala);
    expect(sala).toMatch(/^nt-[0-9a-f]{32}$/);
    await geraLink(page);
    expect(await page.evaluate(() => cenario.sala)).toBe(sala);
  });
  test('falha no envio avisa o mestre e reenvia quando volta', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await mestre(page, NOS, { macros: MACROS });
    const j = await jogadorRemoto(page, await geraLink(page));
    await painel(page);
    await page.route('**/rele/**', (r) => r.abort());
    await dispara(page, 'Gelo');
    await expect(page.locator('#rele-estado')).toHaveText('Falha ao enviar. Tentando de novo.');
    await expect(page.getByText('Os jogadores não receberam o último comando. Tentando de novo.')).toBeVisible();
    await page.unroute('**/rele/**');
    await expect(atmos(j)).toHaveAttribute('data-atmos', 'critico', { timeout: 8000 });
    await j.context().close();
    await ctx.close();
  });
});

test.describe('botões dos nós à distância', () => {
  const NOS_NO = [
    { id: 'a', nome: 'Cofre', texto: 'Dentro', protecao: { tipo: 'senha', codigo: 'x', maxTentativas: 1, naFalha: 'travar' } },
    { id: 'c', nome: 'Cifrado', texto: 'Secreto', cripto: { ativo: true, rodadas: 2 } },
    { id: 'o', nome: 'Escondido', texto: 'Oculto', oculto: true }
  ];
  const acao = (page, no, nome) => page.locator('.vivo-no', { has: page.locator('b', { hasText: no }) }).getByRole('button', { name: nome, exact: true }).click();
  const preparar = async (page) => {
    await mestre(page, NOS_NO);
    const j = await jogadorRemoto(page, await geraLink(page));
    await painel(page);
    return j;
  };
  const statusNo = (j, id) => j.evaluate((i) => (prog.nos[i] || {}).status, id);
  test('jogador travado é destravado pelo Resetar do mestre', async ({ page }) => {
    const j = await preparar(page);
    await j.locator('.bloco', { hasText: 'Cofre' }).click();
    await campo(j, 'Senha').fill('errada');
    await botao(j, 'ENVIAR').click();
    await expect(j.getByText('TERMINAL TRAVADO')).toBeVisible();
    await acao(page, 'Cofre', 'Resetar');
    await expect(j.getByText('TERMINAL TRAVADO')).toHaveCount(0);
    await expect.poll(() => statusNo(j, 'a')).toBe('ativo');
    await j.context().close();
  });
  test('Liberar abre o nó, inclusive com o jogador na tela da senha', async ({ page }) => {
    const j = await preparar(page);
    await j.locator('.bloco', { hasText: 'Cofre' }).click();
    await expect(campo(j, 'Senha')).toBeVisible();
    await acao(page, 'Cofre', 'Liberar');
    await expect(j.getByText('Dentro')).toBeVisible();
    await j.context().close();
  });
  test('Travar, Quebrar, Decriptar e Revelar chegam ao jogador', async ({ page }) => {
    const j = await preparar(page);
    await acao(page, 'Cofre', 'Travar');
    await expect.poll(() => statusNo(j, 'a')).toBe('travado');
    await acao(page, 'Cofre', 'Quebrar');
    await expect.poll(() => statusNo(j, 'a')).toBe('quebrado');
    await acao(page, 'Cifrado', 'Decriptar');
    await expect.poll(() => j.evaluate(() => prog.nos.c.rodada)).toBe(2);
    await expect(j.locator('.bloco', { hasText: 'Escondido' })).toHaveCount(0);
    await acao(page, 'Escondido', 'Revelar');
    await expect(j.locator('.bloco', { hasText: 'Escondido' })).toBeVisible();
    await j.context().close();
  });
  test('Resetar progresso também limpa os nós do jogador', async ({ page }) => {
    const j = await preparar(page);
    await acao(page, 'Cofre', 'Quebrar');
    await expect.poll(() => statusNo(j, 'a')).toBe('quebrado');
    await aba(page, 'Publicar');
    await botao(page, 'Resetar progresso').click();
    await botao(page, 'CONFIRMAR').click();
    await expect.poll(() => statusNo(j, 'a')).toBe('ativo');
    await j.context().close();
  });
  test('quem abre o link pela primeira vez não recebe ação antiga de nó', async ({ page }) => {
    await mestre(page, NOS_NO);
    const link = await geraLink(page);
    await painel(page);
    await acao(page, 'Cofre', 'Quebrar');
    await expect(page.locator('#rele-estado')).toContainText('Último envio');
    const j = await jogadorRemoto(page, link);
    await assentar(j);
    await assentar(j);
    expect(await statusNo(j, 'a')).toBe('ativo');
    await j.context().close();
  });
  test('quem já estava conectado recebe a ação perdida ao voltar para a aba', async ({ page }) => {
    const j = await preparar(page);
    await botao(page, 'Aviso').click();
    await expect(atmos(j)).toHaveAttribute('data-atmos', 'aviso');
    await j.evaluate(() => releFonte.close());
    await acao(page, 'Cofre', 'Quebrar');
    await expect(page.locator('#rele-estado')).toContainText('Último envio');
    await j.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect.poll(() => statusNo(j, 'a')).toBe('quebrado');
    await j.context().close();
  });
});

test.describe('teste de conexão', () => {
  test('confirma que a mensagem foi e voltou', async ({ page }) => {
    await mestre(page, NOS, { macros: MACROS });
    await geraLink(page);
    await painel(page);
    await botao(page, 'Testar conexão').click();
    await expect(page.locator('#rele-estado')).toContainText('Conexão OK');
  });
  test('sem link pede para gerar antes', async ({ page }) => {
    await mestre(page, NOS, { macros: MACROS });
    await painel(page);
    await expect(botao(page, 'Testar conexão')).toHaveCount(0);
  });
  test('avisa quando o serviço não responde', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await mestre(page, NOS, { macros: MACROS });
    await geraLink(page);
    await painel(page);
    await page.route('**/rele/**', (r) => r.abort());
    await botao(page, 'Testar conexão').click();
    await expect(page.locator('#rele-estado')).toContainText('Sem resposta', { timeout: 10000 });
    await ctx.close();
  });
});

test.describe('avisos antes de publicar', () => {
  test('alerta sobre a senha padrão e some depois de trocar', async ({ page }) => {
    await mestre(page, NOS, { macros: MACROS });
    await aba(page, 'Publicar');
    await expect(page.getByText('Você ainda usa a senha padrão')).toBeVisible();
    await aba(page, 'Geral');
    await campo(page, 'Nova senha').fill('outra-senha');
    await botao(page, 'Trocar senha').click();
    await assentar(page);
    await aba(page, 'Publicar');
    await expect(page.getByText('Você ainda usa a senha padrão')).toHaveCount(0);
  });
});
