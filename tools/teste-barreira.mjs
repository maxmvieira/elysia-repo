/**
 * 🔥 **Prova a Muralha de Fogo CONTRA O SERVIDOR DE VERDADE, sem navegador.**
 *
 * 🔴 **Por que isto existe.** O fluxo que a ficha do dono chama de "teste mínimo"
 * — monstro tenta atravessar, apanha, é empurrado, gasta os contatos, contorna —
 * é a única parte da magia que NENHUM teste unitário alcança: ela mora na IA das
 * criaturas, que só roda dentro do laço do mundo. A primeira tentativa foi
 * pilotar o cliente pelo navegador, e falhou três vezes pelo mesmo motivo: entre
 * ver a tela e mandar o clique passam segundos, e nesses segundos o personagem
 * apanha de um chefe. O jogo não é lento; o controle remoto é.
 *
 * ✅ Aqui o cliente é um script. Ele fala o mesmo protocolo, anda tile a tile,
 * conjura com mira e LÊ cada mensagem que volta — e, o que importa mais, se cura
 * sozinho a cada snapshot. Morrer deixa de ser possível, e o que sobra é a
 * pergunta que interessa: o monstro tocou, doeu, voou, e parou de doer?
 *
 * ⚠️ **Só serve contra `npm run dev:test`**, porque depende do auto-login sem
 * senha (`ELYSIA_DEV_ACCOUNT`) e do `/heal`. Contra o servidor de verdade ele
 * não entra — e é assim que tem de ser.
 *
 * ## Uso
 *
 *     node tools/teste-barreira.mjs bloqueio   # fase 3: ela barra a passagem?
 *     node tools/teste-barreira.mjs contato    # fases 5-8: toca, dói, empurra, para
 *
 * Variáveis: `ELYSIA_CONTA` (padrão `Frank`), `ELYSIA_PERSONAGEM` (padrão
 * `Testedois`), `ELYSIA_NIVEL_MAGIA` (padrão `1` — ver a nota do nível).
 */

import { CREATURES } from '../shared/src/combat.ts';
import { startsFight } from '../shared/src/bestiary.ts';

/**
 * 🔴 **Quem PERSEGUE, pelo nome que chega no snapshot.**
 *
 * A primeira versao pegava a criatura mais perto, e ela foi um Slime Verde —
 * NEUTRO. Neutro esfria: some o interesse e volta a perambular, e a muralha
 * morreu de velhice esperando por ele. O que serve aqui e quem `startsFight`
 * diz que comeca briga sozinho.
 *
 * ⚠️ O nome do snapshot vem com o prefixo da VARIANTE ("Robusto Cogumelo
 * Escarlate"), entao a comparacao e por sufixo, nunca por igualdade.
 */
const PERSEGUEM = Object.values(CREATURES)
  .filter((c) => startsFight(c.behavior ?? "hostile"))
  .map((c) => ({ nome: c.name, str: c.strength, hp: c.maxHp }))
  .sort((a, b) => b.nome.length - a.nome.length);
const fichaDe = (nomeVisto) => PERSEGUEM.find((c) => nomeVisto.endsWith(c.nome));

const CONTA = process.env.ELYSIA_CONTA ?? 'Frank';
const PERSONAGEM = process.env.ELYSIA_PERSONAGEM ?? 'Testedois';
/**
 * ⚠️ **Nível 1 de propósito, e não o 10.** O que se quer VER aqui é o teto de
 * contatos sendo atingido, e no Lv.10 ele é 12 — doze quiques de 700 ms dentro
 * de uma parede que dura 14 s, o que enche o relatório e ainda pode não fechar.
 * No Lv.1 são TRÊS contatos e 5 s de parede: o teto chega em pouco mais de dois
 * segundos e o "parou de doer" aparece no mesmo relatório.
 */
const NIVEL = Number(process.env.ELYSIA_NIVEL_MAGIA ?? 1) || 1;
const CENA = process.argv[2] ?? 'contato';

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

const ws = new WebSocket('ws://localhost:8080');
const registra = (txt) => console.log(txt);

let meuId = null;
let eu = null;            // meu EntitySnapshot
let criaturas = new Map();
let seq = 1;
let curaEm = 0;
let t0 = Date.now();
const rel = () => `${String(((Date.now() - t0) / 1000).toFixed(2)).padStart(6)}s`;

/** Eventos que interessam, coletados enquanto a cena roda. */
const contatos = [];      // { ms, x, y }            — o `fx` da brasa
const golpes = [];        // { ms, alvo, dano, hp }  — o `hit` de verdade
let areaViva = null;      // { id, x, y, raioX, raioY, blocks, nasceuEm }

const manda = (m) => ws.send(JSON.stringify(m));

ws.onopen = () => manda({ t: 'auth', protocol: 1, mode: 'login', username: CONTA, password: 'x' });

ws.onmessage = (ev) => {
  const m = JSON.parse(String(ev.data));
  switch (m.t) {
    case 'authresult':
      if (!m.ok) { console.error('login recusado:', m.message); process.exit(1); }
      break;
    case 'charlist': {
      const p = m.characters.find((c) => c.name === PERSONAGEM);
      if (!p) { console.error(`personagem "${PERSONAGEM}" não está na conta`); process.exit(1); }
      manda({ t: 'hello', protocol: 1, characterId: p.id });
      break;
    }
    case 'welcome':
      meuId = m.playerId;
      break;
    case 'snapshot': {
      criaturas = new Map();
      for (const e of m.entities) {
        if (e.id === meuId) eu = e;
        else if (e.kind === 'creature') criaturas.set(e.id, e);
      }
      /*
       * 🩺 **A REDE DE SEGURANÇA, e ela é o motivo de este script existir.**
       * Curar a cada snapshot em que faltar vida tira a morte da equação — e foi
       * a morte que matou as três tentativas pelo navegador. Estrangulado em
       * 300 ms para não virar uma enxurrada de chat.
       */
      if (eu?.hp !== undefined && eu.maxHp && eu.hp < eu.maxHp * 0.9 && Date.now() > curaEm) {
        curaEm = Date.now() + 300;
        manda({ t: 'chat', text: '/heal' });
      }
      break;
    }
    case 'area':
      if (m.skill === 'fire_wall') {
        areaViva = { ...m, nasceuEm: Date.now() };
        registra(`${rel()}  🧱 muralha ${m.id} em (${m.x},${m.y}) · raioX ${m.raioX ?? m.radius}`
          + ` raioY ${m.raioY ?? m.radius} · blocks=${m.blocks === true} · ${m.durationMs} ms`);
      }
      break;
    case 'areagone':
      if (areaViva && m.id === areaViva.id) {
        registra(`${rel()}  🧱 muralha ${m.id} acabou`);
        areaViva = null;
      }
      break;
    case 'fx':
      if (m.kind === 'fire_wall_hit') {
        contatos.push({ ms: Date.now(), x: m.x, y: m.y });
        registra(`${rel()}  💥 CONTATO na célula (${m.x},${m.y})`);
      }
      break;
    case 'hit':
      if (m.attackerId === meuId || criaturas.has(m.targetId)) {
        golpes.push({ ms: Date.now(), alvo: m.targetId, dano: m.amount, hp: m.hp });
        if (m.amount > 0) {
          registra(`${rel()}  🩸 ${m.targetId} levou ${m.amount} (vida ${m.hp}/${m.maxHp})`);
        }
      }
      break;
    case 'denied':
      registra(`${rel()}  ⛔ recusado: ${m.reason}`);
      break;
    default:
      break;
  }
};
ws.onerror = () => { console.error('não consegui falar com ws://localhost:8080 — o dev:test está no ar?'); process.exit(1); };

/**
 * 🏃 Aproxima até ficar a `dist` tiles da criatura — dela AGORA, não de onde
 * ela estava.
 *
 * 🔴 Andar até um tile calculado uma vez só não serve: a criatura anda junto,
 * e a primeira volta gastou 40 segundos indo até um ponto que o bicho já tinha
 * deixado — terminando a NOVE tiles dele, fora do alcance da magia que ia
 * provocá-lo. Recalcular a cada passo custa uma linha e resolve.
 */
async function aproximarDe(id, dist, limite = 45) {
  for (let i = 0; i < limite; i++) {
    const c = criaturas.get(id);
    if (!c) return false;
    if (cheb(eu.tileX, eu.tileY, c.tileX, c.tileY) <= dist) return true;
    const dx = Math.sign(c.tileX - eu.tileX);
    const dy = Math.sign(c.tileY - eu.tileY);
    const antes = `${eu.tileX},${eu.tileY}`;
    manda({ t: 'move', seq: seq++, dx, dy });
    await espera(150);
    // Esbarrou em árvore ou pedra: desliza por um eixo só antes de insistir.
    if (`${eu.tileX},${eu.tileY}` === antes) {
      manda({ t: 'move', seq: seq++, dx, dy: 0 });
      await espera(150);
      if (`${eu.tileX},${eu.tileY}` === antes) {
        manda({ t: 'move', seq: seq++, dx: 0, dy });
        await espera(150);
      }
    }
  }
  const c = criaturas.get(id);
  return !!c && cheb(eu.tileX, eu.tileY, c.tileX, c.tileY) <= dist;
}

/** Espera até a condição virar verdade (ou desiste). */
async function ate(cond, ms = 8000, passo = 100) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) { if (cond()) return true; await espera(passo); }
  return false;
}

/* ------------------------------------------------------------------------- */

async function cenaBloqueio() {
  registra(`\n=== FASE 3 — ela barra a passagem? ===`);
  registra(`${rel()}  🧍 herói em (${eu.tileX},${eu.tileY})`);

  /*
   * 🔴 **Acha um rumo em que o herói ANDE DE VERDADE antes de pôr a parede.**
   *
   * Uma volta deste teste saiu com o herói parado e a parede três tiles à frente,
   * e sem esta busca o relatório teria dado a parede como culpada — quem
   * segurava era um bicho encostado. *"Não andou"* e *"a parede barrou"* são
   * coisas diferentes, e a única maneira de separá-las é medir o caminho VAZIO
   * primeiro.
   */
  const rumos = [
    { nome: 'leste',  dx: 1,  dy: 0 },
    { nome: 'oeste',  dx: -1, dy: 0 },
    { nome: 'norte',  dx: 0,  dy: -1 },
    { nome: 'sul',    dx: 0,  dy: 1 },
  ];
  let rumo = null;
  for (const r of rumos) {
    const antes = `${eu.tileX},${eu.tileY}`;
    manda({ t: 'move', seq: seq++, dx: r.dx, dy: r.dy });
    await espera(320);
    if (`${eu.tileX},${eu.tileY}` !== antes) { rumo = r; break; }
  }
  if (!rumo) { registra('⚠️ o herói não anda para lado nenhum — teste inválido'); return; }
  registra(`${rel()}  ✅ caminho aberto para ${rumo.nome}: andei até (${eu.tileX},${eu.tileY}) sem parede nenhuma`);

  // A mira no eixo do rumo faz a parede nascer ATRAVESSADA nele.
  const px = eu.tileX + rumo.dx * 3;
  const py = eu.tileY + rumo.dy * 3;
  manda({ t: 'cast', spell: 'fire_wall', tileX: px, tileY: py, level: NIVEL });
  if (!await ate(() => areaViva !== null, 6000)) {
    registra('❌ a muralha não nasceu — o cast foi recusado?');
    return;
  }

  // Seis passos no mesmo rumo, um por vez, contra a parede.
  registra(`${rel()}  ➡️ seis passos para ${rumo.nome}, contra a muralha em (${px},${py})`);
  const trilha = [];
  for (let i = 0; i < 6; i++) {
    manda({ t: 'move', seq: seq++, dx: rumo.dx, dy: rumo.dy });
    await espera(250);
    trilha.push(`${eu.tileX},${eu.tileY}`);
  }
  registra(`${rel()}  🧍 trilha: ${trilha.join(' → ')}`);

  // Quanto o herói avançou NO EIXO do rumo, contra onde a parede está.
  const meu = rumo.dx !== 0 ? eu.tileX : eu.tileY;
  const dela = rumo.dx !== 0 ? px : py;
  const passo = rumo.dx || rumo.dy;
  const passou = (meu - dela) * passo > 0;
  const colado = meu === dela - passo;
  registra(passou
    ? `❌ ATRAVESSOU: chegou a ${meu}, do outro lado da parede em ${dela}`
    : colado
      ? `✅ BARROU: parou COLADO em ${meu}, com a parede em ${dela}`
      : `⚠️ parou em ${meu} (parede em ${dela}) — não atravessou, mas nem encostou`);
}
async function cenaContato() {
  registra(`\n=== FASES 5-8 — toca, dói, empurra, e para de doer ===`);

  /*
   * 1. **Um que PERSEGUE**, e o mais perto entre eles. Pegar o vizinho mais
   *    próximo sem olhar a ficha rendeu um Slime Verde: neutro, esfriou, e a
   *    muralha morreu de velhice esperando.
   */
  const candidatos = [...criaturas.values()]
    /*
     * ⚠️ **Vida acima de 60 %**, e não apenas "vivo". Uma volta pegou um rato
     * com 12 de 260: ele morreria no primeiro contato e o teto de contatos
     * nunca apareceria. O teste precisa de um bicho que AGUENTE os três.
     */
    .filter((c) => fichaDe(c.name) && (c.hp === undefined || c.hp > (c.maxHp ?? 1) * 0.6))
    .map((c) => ({ c, ficha: fichaDe(c.name), d: cheb(c.tileX, c.tileY, eu.tileX, eu.tileY) }))
    .sort((a, b) => a.d - b.d);
  if (candidatos.length === 0) { registra('❌ nenhuma criatura hostil por perto'); return; }
  const { c: perto, ficha } = candidatos[0];
  const alvo = () => criaturas.get(perto.id);
  registra(`${rel()}  🎯 alvo: ${perto.name} (${perto.id}) em (${perto.tileX},${perto.tileY})`
    + ` · ${candidatos[0].d} tiles · ficha: ${ficha.hp} de vida, ${ficha.str} de força`);

  /*
   * 2. **Provoca à DISTÂNCIA, com Fire Bolt no nível 1.** Encostar para dar um
   *    soco falhou (o golpe nem saiu) e ainda põe o herói dentro do alcance de
   *    tudo que estiver em volta. O dano é o que importa: ele marca o alvo E
   *    estica a coleira para `COLEIRA_APOS_DANO`, então o bicho não desiste no
   *    meio do caminho como o neutro desistiu.
   */
  /*
   * ⚠️ **O Fire Bolt só alcança 6 tiles**, e a primeira volta deste script
   *    tentou provocar de 17 — o servidor recusou e o relatório saiu vazio.
   *    Então aproxima até 5, que é dentro do alcance e fora do corpo a corpo.
   */
  if (!await aproximarDe(perto.id, 5)) {
    registra('❌ não cheguei ao alcance da magia — obstáculo no caminho?');
    return;
  }
  registra(`${rel()}  🚶 cheguei a (${eu.tileX},${eu.tileY}), ${cheb(eu.tileX, eu.tileY, alvo().tileX, alvo().tileY)} tiles dele`);
  manda({ t: 'cast', spell: 'fire_bolt', targetId: perto.id, level: 1 });
  await espera(1500);
  registra(`${rel()}  🔥 provocado — ${alvo()?.hp}/${alvo()?.maxHp} de vida`);

  /*
   * 3. **Deixa ele CHEGAR A DOIS TILES antes de conjurar.**
   *
   * 🔴 A volta anterior conjurou com ele a quatro, e a parede errou o alvo por
   * TRÊS FILEIRAS: o bicho vinha na diagonal, e uma muralha de três células só
   * barra quem chega dentro daquela janela. A dois tiles não há diagonal que
   * escape — o tile entre nós é o único caminho, e é nele que a parede nasce.
   *
   * ⚠️ A distância também não pode ser 1: aí o tile do meio é o DELE, e a magia
   * nasceria em cima do bicho em vez de na frente dele.
   */
  /*
   * ⚠️ **Ele pode já estar COLADO**, e aí a distância nunca passa por 2 — foi o
   * que um Xamã Goblin a um tile fez. Quando isso acontece, quem recua é o
   * herói: um passo para trás devolve a janela de que o teste precisa.
   */
  let recuos = 0;
  const chegou = await ate(
    () => {
      const c = alvo();
      if (!c) return false;
      const d = cheb(c.tileX, c.tileY, eu.tileX, eu.tileY);
      if (d < 2) {
        /*
         * ⚠️ **A distância pode ser ZERO** — o snapshot já trouxe bicho e herói no
         * mesmo tile —, e aí o vetor de fuga é (0,0) e o passo não sai. Quando não
         * há direção "para longe", serve qualquer uma: o que importa é abrir espaço.
         */
        let fx = Math.sign(eu.tileX - c.tileX);
        let fy = Math.sign(eu.tileY - c.tileY);
        if (fx === 0 && fy === 0) { const r = [[1,0],[0,1],[-1,0],[0,-1]][recuos++ % 4]; fx = r[0]; fy = r[1]; }
        manda({ t: 'move', seq: seq++, dx: fx, dy: fy });
        return false;
      }
      return d === 2;
    },
    30000, 150,
  );
  if (!chegou) { registra('❌ ele não chegou a dois tiles — sem perseguição, não há o que medir'); return; }
  const a = alvo();
  registra(`${rel()}  🏃 ele está em (${a.tileX},${a.tileY}), a 2 tiles — conjurando`);

  /*
   * 4. **A mira é o tile ENTRE os dois**, e a parede nasce perpendicular à linha
   *    conjurador → mira — ou seja, atravessada exatamente no caminho dele.
   */
  const px = eu.tileX + Math.sign(a.tileX - eu.tileX);
  const py = eu.tileY + Math.sign(a.tileY - eu.tileY);
  const horizontal = Math.abs(a.tileX - eu.tileX) >= Math.abs(a.tileY - eu.tileY);
  /*
   * ⚠️ **Há uma recarga GLOBAL entre conjurações** (o servidor recusou com
   * *"Conjurando rápido demais (0.3s)"*), e o Fire Bolt que provocou o bicho
   * acabou de sair. Duas tentativas resolvem: a primeira quase sempre passa, e
   * a segunda cobre a corrida quando o bicho chegou rápido demais.
   */
  for (let tentativa = 0; tentativa < 2 && !areaViva; tentativa++) {
    if (tentativa > 0) await espera(1300);
    manda({ t: 'cast', spell: 'fire_wall', tileX: px, tileY: py, level: NIVEL });
    await ate(() => areaViva !== null, 3000);
  }
  if (!areaViva) { registra('❌ a muralha não nasceu'); return; }
  registra(`${rel()}  🧱 parede mirada em (${px},${py})`);
  // 5. Olha o que acontece, tile a tile, até a parede morrer.
  const inicio = Date.now();
  let anterior = null;
  while (areaViva && Date.now() - inicio < 20000) {
    const c = alvo();
    if (c) {
      const aqui = `${c.tileX},${c.tileY}`;
      if (aqui !== anterior) {
        const dist = horizontal ? Math.abs(c.tileX - px) : Math.abs(c.tileY - py);
        registra(`${rel()}  🐾 ${perto.id} em (${aqui})  ${dist === 0 ? '← DENTRO DA PAREDE' : `· ${dist} da parede`}`);
        anterior = aqui;
      }
    }
    await espera(120);
  }

  // 5b. Mais um tempo DEPOIS da parede cair: é quando o caminho tem de liberar.
  const depois = alvo();
  if (depois) {
    await espera(2500);
    const fim = alvo();
    if (fim) registra(`${rel()}  🚪 com a parede fora, ele está em (${fim.tileX},${fim.tileY})`);
  }
  // 6. O veredito, em números.
  const teto = NIVEL === 1 ? 3 : '?';
  /*
   * 🔴 **O teto é POR INIMIGO, e a primeira versão deste placar somava tudo.**
   *
   * Uma volta pegou DOIS ratos na mesma parede e o relatório acusou "4 contatos,
   * teto 3" — como se a regra tivesse falhado. Não tinha: um levou um contato e
   * morreu, o outro levou os três dele. A ficha do dono é explícita em *"não
   * compartilhar esse contador entre inimigos"*, então o placar tem de contar do
   * mesmo jeito que o servidor conta.
   *
   * ⚠️ Cada brasa (`fx`) casa com o `hit` que saiu junto dela — mesma chamada,
   * mesmo instante. É assim que se sabe DE QUEM foi o contato, porque o `fx` só
   * carrega a célula.
   */
  /*
   * 🔴 **Cada brasa consome UM golpe, e é por isso que há um `usados`.**
   *
   * A primeira versão usava `find` puro, e numa parede com quatro bichos dentro
   * as quatro brasas do mesmo tique casaram todas com o PRIMEIRO golpe — o placar
   * acusou "c69: 4 contatos, passou do teto" e intervalos de 0 ms. Não era o jogo
   * furando a regra: era a minha conta somando o mesmo golpe quatro vezes.
   */
  const usados = new Set();
  const donoDo = new Map();
  const porAlvo = new Map();
  for (const c of contatos) {
    const i = golpes.findIndex((x, k) => !usados.has(k) && Math.abs(x.ms - c.ms) <= 60 && x.dano > 0);
    const g = i >= 0 ? golpes[i] : null;
    if (i >= 0) usados.add(i);
    const quem = g ? g.alvo : '(sem dono)';
    donoDo.set(c, quem);
    const reg = porAlvo.get(quem) ?? { n: 0, dano: 0 };
    reg.n += 1;
    reg.dano += g ? g.dano : 0;
    porAlvo.set(quem, reg);
  }

  registra(`\n--- placar ---`);
  registra(`contatos, POR INIMIGO (teto da ficha no Lv.${NIVEL}: ${teto}):`);
  for (const [quem, reg] of porAlvo) {
    const marca = teto === '?' ? '' : reg.n === teto ? '  ✅ bateu o teto' : reg.n < teto ? '  · abaixo do teto' : '  ❌ PASSOU DO TETO';
    registra(`   ${quem}: ${reg.n} contato(s) · ${reg.dano} de dano somado${marca}`);
  }

  registra(`todos os golpes com dano:`);
  for (const g of golpes.filter((x) => x.dano > 0)) {
    const daParede = contatos.some((c) => Math.abs(c.ms - g.ms) <= 60);
    registra(`   ${((g.ms - inicio) / 1000).toFixed(2)}s · ${g.alvo} · ${g.dano} de dano`
      + ` · vida ${g.hp} ${daParede ? '← CONTATO da muralha' : '(queimadura ou magia)'}`);
  }

  /* O intervalo mínimo também é por alvo: comparar brasas de bichos diferentes
   * daria 1 ms e pareceria violação do `contatoMs`. */
  for (const [quem] of porAlvo) {
    const meus = contatos.filter((c) => donoDo.get(c) === quem);
    if (meus.length < 2) continue;
    const dts = meus.slice(1).map((c, i) => c.ms - meus[i].ms);
    registra(`intervalo entre contatos de ${quem}: ${dts.map((d) => `${d} ms`).join(', ')}`
      + `  (a ficha pede ≥ 700)`);
  }
}

/* ------------------------------------------------------------------------- */

(async () => {
  if (!await ate(() => eu !== null && eu.tileX !== undefined, 15000)) {
    console.error('não entrei no mundo a tempo');
    process.exit(1);
  }
  await espera(600);
  t0 = Date.now();
  registra(`entrei como ${PERSONAGEM} em (${eu.tileX},${eu.tileY}) · vida ${eu.hp}/${eu.maxHp}`);
  manda({ t: 'chat', text: '/heal' });
  await espera(400);

  if (CENA === 'bloqueio') await cenaBloqueio();
  else await cenaContato();

  await espera(500);
  ws.close();
  process.exit(0);
})();
