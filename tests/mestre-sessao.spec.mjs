import fs from 'node:fs/promises';
import { test, expect, botao, campo, semear, mestre, entrar, aba, estado, nosSalvos, assentar, noVivo, noDaArvore, blocos, SENHA, temporario, iniciarHack, vencerPalavras } from './auxiliares.mjs';

const CENARIO = [
  { id: 'a', nome: 'Senha', texto: 'Dentro', protecao: { tipo: 'senha', codigo: 'x' } },
  { id: 'h', nome: 'Hack', tipo: 'nenhum', protecao: { tipo: 'hack', puzzle: 'palavras', alvo: 'NEON' } },
  { id: 't', nome: 'Livre', texto: 'Texto livre' },
  { id: 'c', nome: 'Cifrado', texto: 'Texto secreto', cripto: { ativo: true, rodadas: 2, travaNaFalha: true } },
  { id: 'o', nome: 'Escondido', texto: 'Oculto', oculto: true }
];
async function duasJanelas(page, context, nos = CENARIO) {
  await mestre(page, nos);
  await aba(page, 'Ao vivo');
  const jogador = await context.newPage();
  await jogador.goto('/');
  return jogador;
}
const acao = (page, no, nome) => noVivo(page, no).getByRole('button', { name: nome, exact: true }).click();

test.describe('painel ao vivo', () => {
  test('liberar abre o nó na tela do jogador', async ({ page, context }) => {
    const j = await duasJanelas(page, context);
    await acao(page, 'Senha', 'Liberar');
    await j.locator('.bloco', { hasText: 'Senha' }).click();
    await expect(j.getByText('Dentro')).toBeVisible();
    await expect(noVivo(page, 'Senha').locator('.pill')).toHaveText('LIBERADO');
  });
  test('travar e resetar nó protegido', async ({ page, context }) => {
    const j = await duasJanelas(page, context);
    await acao(page, 'Senha', 'Travar');
    await j.locator('.bloco', { hasText: 'Senha' }).click();
    await expect(j.getByText('TERMINAL TRAVADO')).toBeVisible();
    await acao(page, 'Senha', 'Resetar');
    await expect(j.getByText('Este nó exige uma senha.')).toBeVisible();
  });
  test('nó sem proteção travado ou quebrado pode ser resetado', async ({ page, context }) => {
    const j = await duasJanelas(page, context);
    await acao(page, 'Livre', 'Travar');
    await acao(page, 'Livre', 'Resetar');
    await acao(page, 'Livre', 'Quebrar');
    await expect(noVivo(page, 'Livre').locator('.pill')).toHaveText('QUEBRADO');
    await acao(page, 'Livre', 'Resetar');
    await j.locator('.bloco', { hasText: 'Livre' }).click();
    await expect(j.getByText('Texto livre')).toBeVisible();
  });
  test('quebrar mostra destruído ao vivo com o modal aberto', async ({ page, context }) => {
    const j = await duasJanelas(page, context);
    await j.locator('.bloco', { hasText: 'Hack' }).click();
    await j.getByRole('button', { name: 'INICIAR HACK' }).click();
    await expect(j.locator('.dump')).toBeVisible();
    await acao(page, 'Hack', 'Quebrar');
    await expect(j.getByText('SISTEMA DESTRUÍDO')).toBeVisible();
  });
  test('novo puzzle reinicia o jogo aberto', async ({ page, context }) => {
    const j = await duasJanelas(page, context);
    await j.locator('.bloco', { hasText: 'Hack' }).click();
    await j.getByRole('button', { name: 'INICIAR HACK' }).click();
    await expect(j.locator('.dump')).toBeVisible();
    await acao(page, 'Hack', 'Novo puzzle');
    await expect(j.getByRole('button', { name: 'INICIAR HACK' })).toBeVisible();
  });
  test('mostra a resposta do puzzle gerado e envia aos jogadores', async ({ page, context }) => {
    const j = await duasJanelas(page, context);
    await j.locator('.bloco', { hasText: 'Hack' }).click();
    await j.getByRole('button', { name: 'INICIAR HACK' }).click();
    await expect(noVivo(page, 'Hack').locator('.resp')).toHaveText('NEON');
    await acao(page, 'Hack', 'Enviar resposta');
    await expect(j.getByText('DICA: NEON')).toBeVisible();
  });
  test('ocultar e revelar', async ({ page, context }) => {
    const j = await duasJanelas(page, context);
    await expect(blocos(j).filter({ hasText: 'Escondido' })).toHaveCount(0);
    await acao(page, 'Escondido', 'Revelar');
    await expect(blocos(j).filter({ hasText: 'Escondido' })).toBeVisible();
    await acao(page, 'Escondido', 'Ocultar');
    await expect(blocos(j).filter({ hasText: 'Escondido' })).toHaveCount(0);
  });
  test('decriptar e resetar decriptação travada', async ({ page, context }) => {
    const j = await duasJanelas(page, context);
    await j.locator('.bloco', { hasText: 'Cifrado' }).click();
    await j.getByRole('button', { name: 'TENTAR DECRIPTAR' }).click();
    await j.getByRole('button', { name: 'NA MESA: FALHEI' }).click();
    await j.getByRole('button', { name: 'CONTINUAR' }).click();
    await expect(noVivo(page, 'Cifrado').locator('.pill')).toHaveText('TRAVADO');
    await acao(page, 'Cifrado', 'Resetar');
    await expect(noVivo(page, 'Cifrado').locator('.pill')).toHaveText('ATIVO');
    await acao(page, 'Cifrado', 'Decriptar');
    await j.keyboard.press('Escape');
    await j.locator('.bloco', { hasText: 'Cifrado' }).click();
    await expect(j.getByText('Texto secreto')).toBeVisible();
  });
  test('o resto de ações da atmosfera e do terminal chega ao jogador', async ({ page, context }) => {
    const j = await duasJanelas(page, context);
    const html = j.locator('html');
    await botao(page, 'Crítico').click();
    await expect(html).toHaveAttribute('data-atmos', 'critico');
    await botao(page, 'Aviso').click();
    await expect(html).toHaveAttribute('data-atmos', 'aviso');
    await botao(page, 'Limpar efeitos').click();
    await expect(html).toHaveAttribute('data-atmos', 'normal');
    await botao(page, 'Glitch').click();
    await expect(html).toHaveAttribute('data-glitch', '1');
    await botao(page, 'Desligar').click();
    await expect(j.getByText('SEM ENERGIA')).toBeVisible();
    await botao(page, 'Religar').click();
    await expect(j.getByText('SEM ENERGIA')).toHaveCount(0);
    await botao(page, 'Corromper').click();
    await expect(j.getByText('SISTEMA CORROMPIDO')).toBeVisible();
    await botao(page, 'Religar').click();
    await botao(page, 'Explodir').click();
    await expect(j.getByText('SINAL PERDIDO')).toBeVisible();
    await botao(page, 'Religar').click();
  });
  test('digitação do jogador não é apagada por ações do mestre', async ({ page, context }) => {
    const j = await duasJanelas(page, context);
    await j.locator('.bloco', { hasText: 'Senha' }).click();
    await j.getByRole('textbox', { name: 'Senha' }).fill('quase');
    await botao(page, 'Crítico').click();
    await expect(j.locator('html')).toHaveAttribute('data-atmos', 'critico');
    await expect(j.getByRole('textbox', { name: 'Senha' })).toHaveValue('quase');
  });
  test('teste de puzzle do mestre não reinicia com ações do jogador', async ({ page, context }) => {
    await mestre(page, [{ id: 'h', nome: 'Hack', protecao: { tipo: 'hack', puzzle: 'breach' } }, { id: 't', nome: 'Livre', texto: 'x' }]);
    const j = await context.newPage();
    await j.goto('/');
    await botao(page, 'Testar este puzzle').click();
    await page.locator('.g-breach button.ativo').first().click();
    await j.locator('.bloco', { hasText: 'Livre' }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('.g-breach button.usado')).toHaveCount(1);
  });
  test('contagem: iniciar, pausar, continuar, parar', async ({ page, context }) => {
    const j = await duasJanelas(page, context);
    await page.getByRole('spinbutton', { name: 'Segundos' }).fill('120');
    await botao(page, 'Iniciar').click();
    await expect(j.locator('#relogio')).toBeVisible();
    await botao(page, 'Pausar').click();
    const parado = await j.locator('#relogio').textContent();
    await j.waitForTimeout(1300);
    await expect(j.locator('#relogio')).toHaveText(parado);
    await botao(page, 'Continuar').click();
    await expect(j.locator('#relogio')).not.toHaveText(parado, { timeout: 2500 });
    await botao(page, 'Parar').click();
    await expect(j.locator('#relogio')).toHaveCount(0);
  });
  test('contagem zerada aplica o resultado escolhido', async ({ page, context }) => {
    const j = await duasJanelas(page, context);
    await page.getByRole('spinbutton', { name: 'Segundos' }).fill('1');
    await page.getByRole('combobox', { name: 'Ao zerar' }).selectOption('corromper');
    await botao(page, 'Iniciar').click();
    await expect(j.getByText('SISTEMA CORROMPIDO')).toBeVisible();
  });
  test('digitar no painel não é apagado por ações do jogador', async ({ page, context }) => {
    const j = await duasJanelas(page, context);
    await campo(page, 'Aviso').fill('Mensagem pela metade');
    await page.getByRole('spinbutton', { name: 'Segundos' }).fill('45');
    await page.getByRole('combobox', { name: 'Ao zerar' }).selectOption('explodir');
    await j.locator('.bloco', { hasText: 'Livre' }).click();
    await expect(page.getByText('Jogadores em: Livre')).toBeVisible();
    await expect(campo(page, 'Aviso')).toHaveValue('Mensagem pela metade');
    await expect(page.getByRole('spinbutton', { name: 'Segundos' })).toHaveValue('45');
    await expect(page.getByRole('combobox', { name: 'Ao zerar' })).toHaveValue('explodir');
  });
  test('mostra onde os jogadores estão', async ({ page, context }) => {
    const j = await duasJanelas(page, context);
    await j.locator('.bloco', { hasText: 'Livre' }).click();
    await expect(page.getByText('Jogadores em: Livre')).toBeVisible();
  });
});

test.describe('publicar', () => {
  test('exporta e importa o cenário em JSON', async ({ page }, info) => {
    await mestre(page, CENARIO);
    await aba(page, 'Publicar');
    const baixa = page.waitForEvent('download');
    await botao(page, 'Exportar cenário (.json)').click();
    const arquivo = temporario(info, 'c.json');
    await (await baixa).saveAs(arquivo);
    const dados = JSON.parse(await fs.readFile(arquivo, 'utf8'));
    expect(dados.nos).toHaveLength(5);
    dados.titulo = 'IMPORTADO';
    await fs.writeFile(arquivo, JSON.stringify(dados));
    await campo(page, 'Importar cenário').setInputFiles(arquivo);
    await expect(page.getByText('Substituir o cenário atual por "IMPORTADO"')).toBeVisible();
    await botao(page, 'CONFIRMAR').click();
    await expect(page.locator('.topo small')).toHaveText('IMPORTADO');
    await assentar(page);
    expect((await nosSalvos(page)).titulo).toBe('IMPORTADO');
  });
  test('importar arquivo inválido avisa e mantém o cenário', async ({ page }, info) => {
    await mestre(page, CENARIO);
    await aba(page, 'Publicar');
    for (const [nome, conteudo] of [['ruim.json', 'não é json'], ['sem-nos.json', '{"titulo":"x"}'], ['ciclo.json', '{"nos":[{"id":"a","pai":"b"},{"id":"b","pai":"a"}]}']]) {
      const arquivo = temporario(info, nome);
      await fs.writeFile(arquivo, conteudo);
      await campo(page, 'Importar cenário').setInputFiles(arquivo);
      await expect(page.getByText(/^Arquivo inválido/).last()).toBeVisible();
    }
    expect(await page.evaluate(() => cenario.nos.length)).toBe(5);
  });
  test('reimportar o mesmo arquivo funciona', async ({ page }, info) => {
    await mestre(page, CENARIO);
    await aba(page, 'Publicar');
    const arquivo = temporario(info, 'c.json');
    await fs.writeFile(arquivo, JSON.stringify({ titulo: 'DE NOVO', nos: [{ id: 'z', nome: 'Z' }] }));
    await campo(page, 'Importar cenário').setInputFiles(arquivo);
    await botao(page, 'CANCELAR').click();
    await campo(page, 'Importar cenário').setInputFiles(arquivo);
    await expect(page.getByText('Substituir o cenário atual por "DE NOVO"')).toBeVisible();
  });
  test('importar arquivo sem senha mantém a senha atual', async ({ page }, info) => {
    await mestre(page, CENARIO);
    await aba(page, 'Geral');
    await campo(page, 'Nova senha').fill('nova-senha');
    await botao(page, 'Trocar senha').click();
    await aba(page, 'Publicar');
    const arquivo = temporario(info, 'c.json');
    await fs.writeFile(arquivo, JSON.stringify({ titulo: 'X', nos: [{ id: 'z', nome: 'Z' }] }));
    await campo(page, 'Importar cenário').setInputFiles(arquivo);
    await botao(page, 'CONFIRMAR').click();
    await botao(page, 'Sair para modo jogador').click();
    await entrar(page, 'nova-senha');
    await expect(page.getByRole('tablist')).toBeVisible();
  });
  test('carregar exemplo funciona e o som continua válido', async ({ page }) => {
    await mestre(page, CENARIO);
    await aba(page, 'Publicar');
    await botao(page, 'Carregar exemplo').click();
    await botao(page, 'CONFIRMAR').click();
    await assentar(page);
    expect(await nosSalvos(page)).toMatchObject({ titulo: 'HELIX-9 // REDE CORPORATIVA', volume: 70, ambiente: 'servidor' });
    await aba(page, 'Geral');
    await expect(campo(page, 'Volume (0 a 100)')).toHaveValue('70');
    await botao(page, 'Alarme').click();
  });
  test('resetar progresso zera nós e efeitos', async ({ page, context }) => {
    const j = await duasJanelas(page, context);
    await acao(page, 'Senha', 'Liberar');
    await botao(page, 'Crítico').click();
    await aba(page, 'Publicar');
    await botao(page, 'Resetar progresso').click();
    await botao(page, 'CONFIRMAR').click();
    await expect(j.locator('html')).toHaveAttribute('data-atmos', 'normal');
    await aba(page, 'Ao vivo');
    await expect(noVivo(page, 'Senha').locator('.pill')).toHaveText('ATIVO');
  });
  test('link leva cenário e senha, e o mestre continua editando', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await mestre(page, CENARIO);
    await aba(page, 'Geral');
    await campo(page, 'Título').fill('POR LINK');
    await campo(page, 'Nova senha').fill('senha-link');
    await botao(page, 'Trocar senha').click();
    await aba(page, 'Publicar');
    await botao(page, 'Copiar link para jogadores').click();
    await expect(campo(page, 'Link para jogadores')).toBeVisible();
    const link = await campo(page, 'Link para jogadores').inputValue();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
    const outro = await (await context.browser().newContext()).newPage();
    await outro.goto(link);
    await expect(outro.getByRole('heading', { name: 'POR LINK' })).toBeVisible();
    await expect(outro.locator('.bloco')).toHaveCount(4);
    await outro.keyboard.press('Control+Shift+M');
    await outro.getByLabel('Senha de configuração', { exact: true }).fill('senha-link');
    await outro.getByRole('button', { name: 'ENTRAR', exact: true }).click();
    await outro.getByLabel('Nome', { exact: true }).fill('Editado no link');
    await outro.waitForTimeout(350);
    await outro.reload();
    await expect(outro.locator('.no-arv').filter({ hasText: 'Editado no link' })).toBeVisible();
    await outro.context().close();
  });
  test('link quebrado mostra erro e permite sair', async ({ page }) => {
    await page.goto('/#c=lixo');
    await expect(page.getByText('incompleto ou corrompido')).toBeVisible();
    await botao(page, 'Descartar e abrir o terminal padrão').click();
    await expect(page.locator('.bloco').first()).toBeVisible();
  });
  test('arquivo HTML exportado abre sozinho como jogador', async ({ page }, info) => {
    await mestre(page, CENARIO);
    await aba(page, 'Publicar');
    const baixa = page.waitForEvent('download');
    await botao(page, 'Exportar arquivo HTML').click();
    const arquivo = temporario(info, 'j.html');
    await (await baixa).saveAs(arquivo);
    const outro = await (await page.context().browser().newContext()).newPage();
    await outro.goto('file:///' + arquivo.replace(/\\/g, '/'));
    await outro.locator('.boot button').click({ timeout: 1500 }).catch(() => {});
    await expect(outro.locator('.bloco')).toHaveCount(4);
    await expect(outro.getByRole('tablist')).toHaveCount(0);
    await outro.locator('.bloco', { hasText: 'Livre' }).click();
    await expect(outro.getByText('Texto livre')).toBeVisible();
    await outro.context().close();
    await fs.rm(arquivo);
  });
  test('painéis do mestre não se sobrepõem em janela estreita', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 600 });
    await mestre(page, Array.from({ length: 24 }, (_, i) => ({ id: 'n' + i, nome: 'Nó ' + i })));
    const [a, b] = await page.locator('.m-corpo > .painel').evaluateAll((l) => l.map((p) => { const r = p.getBoundingClientRect(); return { fim: r.bottom, topo: r.top, alto: r.height, cheio: p.scrollHeight }; }));
    expect(a.alto).toBeGreaterThanOrEqual(a.cheio - 1);
    expect(b.topo).toBeGreaterThanOrEqual(a.fim);
  });
  test('layout do mestre não estoura no celular', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 760 });
    await mestre(page, CENARIO);
    for (const nome of ['Construir', 'Geral', 'Macros', 'Ao vivo', 'Publicar']) {
      await aba(page, nome);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), nome).toBe(true);
    }
  });
});
