/**
 * 🌊 **Prova a Firewave contra o servidor de verdade, sem navegador.**
 *
 * 🔴 Mesma razão do `teste-barreira.mjs`, e o mesmo esqueleto: o que interessa
 * aqui — a onda nasce, avança, acerta cada inimigo UMA vez, empurra e some — só
 * acontece dentro do laço do mundo, e pilotar o cliente por screenshot é lento
 * demais para ver isso sem morrer no meio.
 *
 * ✅ O que ele mede, que é o teste mínimo da ficha (§21):
 *
 *   - a onda avança: os `fx` saem em tiles SEGUIDOS, afastando-se do mago;
 *   - o rumo é o mirado;
 *   - quem está no caminho apanha;
 *   - **cada inimigo apanha uma vez só** — é a regra que mais fácil se quebra,
 *     porque os passos se sobrepõem de propósito;
 *   - o alvo é empurrado.
 *
 * ## Uso
 *
 *     node --import tsx tools/teste-firewave.mjs
 */

import { CREATURES } from '../shared/src/combat.ts';
import { startsFight } from '../shared/src/bestiary.ts';

const CONTA = process.env.ELYSIA_CONTA ?? 'Frank';
const PERSONAGEM = process.env.ELYSIA_PERSONAGEM ?? 'Testedois';

const PERSEGUEM = Object.values(CREATURES)
  .filter((c) => startsFight(c.behavior ?? 'hostile'))
  .map((c) => ({ nome: c.name }))
  .sort((a, b) => b.nome.length - a.nome.length);
const ehHostil = (nome) => PERSEGUEM.some((c) => nome.endsWith(c.nome));

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

const ws = new WebSocket('ws://localhost:8080');
const registra = (t) => console.log(t);

let meuId = null;
let eu = null;
let criaturas = new Map();
let seq = 1;
let curaEm = 0;
let t0 = Date.now();
const rel = () => `${String(((Date.now() - t0) / 1000).toFixed(2)).padStart(6)}s`;

const passos = [];   // { ms, x, y, rumo, radius }
const golpes = [];   // { ms, alvo, dano }
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
      if (!p) { console.error(`sem "${PERSONAGEM}" na conta`); process.exit(1); }
      manda({ t: 'hello', protocol: 1, characterId: p.id });
      break;
    }
    case 'welcome': meuId = m.playerId; break;
    case 'snapshot': {
      criaturas = new Map();
      for (const e of m.entities) {
        if (e.id === meuId) eu = e;
        else if (e.kind === 'creature') criaturas.set(e.id, e);
      }
      // 🩺 A mesma rede de segurança do outro teste: morrer sai da equação.
      if (eu?.hp !== undefined && eu.maxHp && eu.hp < eu.maxHp * 0.9 && Date.now() > curaEm) {
        curaEm = Date.now() + 300;
        manda({ t: 'chat', text: '/heal' });
      }
      break;
    }
    case 'fx':
      if (m.kind === 'firewave') {
        passos.push({ ms: Date.now(), x: m.x, y: m.y, rumo: m.rumo, radius: m.radius });
        registra(`${rel()}  🌊 frente em (${m.x},${m.y})`
          + ` · rumo ${m.rumo !== undefined ? (m.rumo * 180 / Math.PI).toFixed(0) + '°' : '?'}`
          + ` · meia-largura ${m.radius}`);
      }
      break;
    case 'hit':
      if (criaturas.has(m.targetId) && m.amount > 0) {
        golpes.push({ ms: Date.now(), alvo: m.targetId, dano: m.amount });
        registra(`${rel()}  🩸 ${m.targetId} levou ${m.amount}`);
      }
      break;
    case 'denied': registra(`${rel()}  ⛔ ${m.reason}`); break;
    default: break;
  }
};
ws.onerror = () => { console.error('sem servidor em ws://localhost:8080'); process.exit(1); };

async function ate(cond, ms = 8000, passo = 100) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) { if (cond()) return true; await espera(passo); }
  return false;
}

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

(async () => {
  if (!await ate(() => eu !== null && eu.tileX !== undefined, 15000)) {
    console.error('não entrei no mundo'); process.exit(1);
  }
  await espera(600);
  t0 = Date.now();
  registra(`entrei como ${PERSONAGEM} em (${eu.tileX},${eu.tileY})`);
  manda({ t: 'chat', text: '/heal' });
  await espera(400);

  const alvo = [...criaturas.values()]
    .filter((c) => ehHostil(c.name) && (c.hp === undefined || c.hp > (c.maxHp ?? 1) * 0.5))
    .sort((a, b) => cheb(a.tileX, a.tileY, eu.tileX, eu.tileY) - cheb(b.tileX, b.tileY, eu.tileX, eu.tileY))[0];
  if (!alvo) { registra('❌ nenhum hostil por perto'); ws.close(); process.exit(0); }
  registra(`${rel()}  🎯 alvo: ${alvo.name} (${alvo.id})`);

  // 3 tiles é o alcance da onda no Lv.1 — dentro dele, e sem corpo a corpo.
  if (!await aproximarDe(alvo.id, 2)) { registra('❌ não cheguei perto'); ws.close(); process.exit(0); }
  const c = criaturas.get(alvo.id);
  registra(`${rel()}  🚶 eu em (${eu.tileX},${eu.tileY}), ele em (${c.tileX},${c.tileY})`);

  const antesX = c.tileX;
  const antesY = c.tileY;
  const origemX = eu.tileX;
  const origemY = eu.tileY;
  // A mira só dá o RUMO: aponto para o tile dele.
  manda({ t: 'cast', spell: 'firewave', tileX: c.tileX, tileY: c.tileY, level: 1 });
  await espera(2500);

  const depois = criaturas.get(alvo.id);
  registra(`\n--- placar ---`);
  registra(`passos da onda: ${passos.length}`);
  for (const p of passos) {
    registra(`   (${p.x},${p.y}) · ${((p.ms - passos[0].ms)).toFixed(0)} ms depois do primeiro`);
  }
  /*
   * ⚠️ **Só contam os golpes que saem JUNTO com um passo da onda.** A magia
   * aplica queimadura, e a parcela dela cai segundos depois — contar tudo fazia o
   * placar acusar "acertou duas vezes" quando o segundo número era o DoT. É a
   * mesma armadilha do teste da barreira: ferramenta de medição errada acusa
   * código certo.
   */
  const daOnda = (g) => passos.some((q) => Math.abs(q.ms - g.ms) <= 80);
  const meus = golpes.filter((g) => g.alvo === alvo.id && daOnda(g));
  const dot = golpes.filter((g) => g.alvo === alvo.id && !daOnda(g));
  registra(`golpes NELE: ${meus.length}  ${meus.length === 1 ? '✅ uma vez só, como a ficha pede' : meus.length === 0 ? '⚠️ não acertou' : '❌ acertou mais de uma vez'}`);
  for (const g of meus) registra(`   ${g.dano} de dano`);
  if (dot.length > 0) registra(`queimadura depois: ${dot.map((g) => g.dano).join(', ')}`);
  if (depois) {
    const andou = cheb(antesX, antesY, depois.tileX, depois.tileY);
    const afastou = cheb(origemX, origemY, depois.tileX, depois.tileY) - cheb(origemX, origemY, antesX, antesY);
    registra(`empurrão: (${antesX},${antesY}) → (${depois.tileX},${depois.tileY})`
      + ` · ${andou} tile(s), ${afastou >= 0 ? 'para LONGE' : 'para PERTO'} do mago`);
  } else {
    registra('empurrão: não dá para medir — ele morreu');
  }
  await espera(300);
  ws.close();
  process.exit(0);
})();
