/**
 * Ponto de entrada do cliente.
 *
 * Renderiza o mapa "Valoria" com PixiJS numa câmera top-down estilo Tibia:
 *  - chão de tiles + paredes/árvores em 2.5D (altura falsa, oclusão por profundidade);
 *  - herói local sempre centralizado na viewport;
 *  - troca de andar (o cliente redesenha o andar atual);
 *  - outros jogadores vêm dos snapshots autoritativos do servidor.
 *
 * O mapa é gerado pela MESMA função do servidor (determinístico), então não
 * precisa trafegar pela rede. Movimento continua autoritativo.
 */

import { AnimatedSprite, Application, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import {
  affixText,
  ATTRIBUTE_INFO,
  BEHAVIOR_LABEL,
  bestiaryPercent,
  bestiaryTier,
  CREATURES,
  ATTRIBUTE_KEYS,
  attributeCost,
  CLASSES,
  RARITY,
  WEAPON_IDENTITY,
  EQUIP_SLOT_LABEL,
  ITEMS,
  MAX_SKILL_LEVEL,
  NIGHT_SPEED_MULT,
  SERVER_TICK_MS,
  SKILLS,
  SKILL_BAR,
  TILE_SIZE,
  VENDOR_STOCK,
  buildStarterMap,
  getItem,
  getTileType,
  type AttributeKey,
  type Direction,
  type EntitySnapshot,
  type EquipSlot,
  type Gender,
  type ItemStack,
  type PlayerClass,
  executionMultiplier,
  furyStats,
  ruptureDefReduction,
  skillManaCost,
  skillPower,
  skillRange,
  skillUpgradeCost,
  stanceDamagePenalty,
  stanceDamageReduction,
  STANCE_SLOW,
  type S2C_CorpseContents,
  type S2C_Inventory,
  type S2C_Stats,
  type SkillId,
  type WeaponType,
  checkName,
  type CharacterSlot,
  type ServerMessage,
  CONDITION_COLORS,
  CREATURE_PLACEHOLDER_COLORS,
  ELEMENT_INFO,
  type ConditionId,
} from '@dominion/shared';
import { NetClient } from './net.js';
import { spellIconUrl } from './spellicons.js';
import {
  generateCharacterTextures,
  PALETTE_OTHER,
  PALETTE_SELF,
  type CharacterTextures,
} from './character.js';
import { loadGroundTiles, type GroundTiles } from './tileset.js';
import {
  loadCharacterAnims,
  loadSlimeVariants,
  BOSS_SLIME_CFG,
  PLAYER_CFG,
  SLIME_CFG,
  type AnimSet,
  type CharacterAnims,
  type SpriteCfg,
} from './sprites.js';
import {
  classIconCss, loadClassAnims, loadNpcAnim, loadSlimeAnim, loadZombieAnim, loadZombieIdleAnim,
  type DirAnim,
} from './miniworld.js';
import { loadKnightSprites, knightIconCss, type KnightArt } from './knight.js';
import { loadTrees, treeIndexFor } from './trees.js';

const TS = TILE_SIZE;
const WALL_H = 18; // altura visual das paredes em pixels (efeito 2.5D)

/**
 * Fração do intervalo entre passos que a CRIATURA gasta deslizando, para o caso
 * em que o cliente **não sabe** a velocidade dela (`creatureType` desconhecido).
 * O resto ela passa parada.
 *
 * 🔴 Quem tem ficha no bestiário NÃO passa por aqui — usa `creatureStepMs`, que
 * é exato. Este 0.6 era o padrão de todas as criaturas e era ele que dava o
 * "anda um tile, para, anda outro, para" na perseguição.
 */
const CREATURE_GLIDE_DESCONHECIDA = 0.6;

/**
 * Folga somada à duração do deslize de uma criatura, em ms.
 *
 * O servidor decide os passos no tique de 15 Hz: um `moveCooldownMs` de 1500 vira,
 * na prática, um passo a cada 1500–1566 ms, e a entrega do snapshot ainda soma
 * jitter. Deslizar 1500 cravado terminaria alguns milissegundos ANTES do próximo
 * passo chegar, e essa fresta é exatamente o engasgo por tile que se quer matar.
 * Um tique de folga cobre a granularidade e o deslize emenda no passo seguinte.
 */
const CREATURE_STEP_SLACK_MS = SERVER_TICK_MS;

// Trava o zoom do navegador (Ctrl+scroll e Ctrl +/−/0) — estava bugando o layout.
window.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0', '_'].includes(e.key)) e.preventDefault();
});
// Arte HD do Knight (masc/fem) desligada por ora — usa MiniWorld. Ver makeEntity.
const USE_KNIGHT_HD = false;

// ---- Elementos de UI (DOM) -------------------------------------------------
const statusEl = document.querySelector<HTMLElement>('#conn')!;
const clockEl = document.querySelector<HTMLElement>('#clock')!;
const coordsEl = document.querySelector<HTMLDivElement>('#coords')!;
const chatlogEl = document.querySelector<HTMLDivElement>('#chatlog')!;
const chatInputEl = document.querySelector<HTMLInputElement>('#chatinput')!;
const viewportEl = document.querySelector<HTMLDivElement>('#viewport')!;
const el = (id: string) => document.getElementById(id)!;
const hud = {
  level: el('level'), gold: el('gold'),
  hpfill: el('hpfill'), hptext: el('hptext'),
  manafill: el('manafill'), manatext: el('manatext'),
  xpfill: el('xpfill'), xptext: el('xptext'),
  death: el('death'), deathby: el('deathby'),
};

function logChat(html: string, cls = ''): void {
  const line = document.createElement('div');
  if (cls) line.className = cls;
  line.innerHTML = html;
  chatlogEl.appendChild(line);
  chatlogEl.scrollTop = chatlogEl.scrollHeight;
}

const map = buildStarterMap();

/**
 * Rede. Criada uma vez e usada pelas três telas (login -> seleção -> jogo),
 * porque a conexão é a MESMA — o que muda é em que ponto do fluxo estamos.
 */
let net: NetClient;
/** Personagens da conta, como o servidor mandou por último. */
let charSlots: CharacterSlot[] = [];
let selectedChar: number | null = null;
/** True depois que o mundo foi montado — evita inicializar o Pixi duas vezes. */
let gameStarted = false;

const screens = {
  login: () => el('login'),
  charselect: () => el('charselect'),
  create: () => el('start'),
};

function showScreen(which: keyof typeof screens | 'none'): void {
  for (const [nome, get] of Object.entries(screens)) {
    get().style.display = nome === which ? 'flex' : 'none';
  }
}

/**
 * Handler da PARTIDA. Fica vazio até o mundo ser montado; a partir daí recebe
 * tudo que não for de login/seleção.
 */
let gameHandler: ((msg: ServerMessage) => void) | null = null;
function setGameHandler(fn: (msg: ServerMessage) => void): void {
  gameHandler = fn;
}

/** Cidades visitadas por este personagem, e onde ele renasce hoje. */
let visitedTowns: string[] = [];
let respawnTown = '';
function onTowns(visited: string[], respawn: string): void {
  visitedTowns = visited;
  respawnTown = respawn;
}

/**
 * Roteador único de mensagens do servidor.
 *
 * As de conta/seleção são tratadas aqui e NÃO chegam ao jogo; o resto é
 * repassado. Isso deixa o fluxo de login funcionando antes de o Pixi existir.
 */
function routeServerMessage(msg: ServerMessage): void {
  switch (msg.t) {
    case 'authresult':
      onAuthResult(msg.ok, msg.message);
      return;
    case 'charlist':
      renderCharList(msg.characters, msg.error);
      return;
    case 'welcome':
      // Primeira entrada: monta o mundo. Nas reconexões o jogo já existe e a
      // mensagem só segue para o handler da partida.
      if (!gameStarted) {
        gameStarted = true;
        const escolhido = charSlots.find((c) => c.id === selectedChar);
        showScreen('none');
        void startGame(
          escolhido?.name ?? 'Herói',
          escolhido?.charClass ?? 'knight',
          escolhido?.gender ?? 'male',
        ).then(() => gameHandler?.(msg));
        return;
      }
      break;
    default:
      break;
  }
  gameHandler?.(msg);
}

// ---- Tela 1: login / criação de conta --------------------------------------
function setupLoginScreen(): void {
  const userIn = el('userin') as HTMLInputElement;
  const passIn = el('passin') as HTMLInputElement;
  const errEl = el('loginerr');
  const loginBtn = el('loginbtn') as HTMLButtonElement;
  const regBtn = el('regbtn') as HTMLButtonElement;

  userIn.value = localStorage.getItem('elysia_user') ?? '';

  const submit = (mode: 'login' | 'register') => () => {
    const user = userIn.value.trim();
    const pass = passIn.value;
    if (!user || !pass) {
      errEl.textContent = 'Preencha usuário e senha.';
      return;
    }
    errEl.textContent = '';
    loginBtn.disabled = regBtn.disabled = true;
    localStorage.setItem('elysia_user', user);
    net.auth(mode, user, pass);
    // Reabilita depois de um instante: se o servidor recusar, o jogador tenta
    // de novo sem precisar recarregar a página.
    window.setTimeout(() => {
      loginBtn.disabled = regBtn.disabled = false;
    }, 800);
  };
  loginBtn.onclick = submit('login');
  regBtn.onclick = submit('register');
  passIn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });
}

/** Chamado quando o servidor responde ao `auth`. */
function onAuthResult(ok: boolean, message?: string): void {
  const errEl = el('loginerr');
  if (!ok) {
    errEl.textContent = message ?? 'Não foi possível entrar.';
    return;
  }
  errEl.textContent = '';
  // A lista de personagens chega logo em seguida, num `charlist`.
}

// ---- Tela 2: seleção de personagem -----------------------------------------
function setupCharSelectScreen(): void {
  const enterBtn = el('enterbtn') as HTMLButtonElement;
  const newBtn = el('newcharbtn') as HTMLButtonElement;

  enterBtn.onclick = () => {
    if (selectedChar === null) return;
    showScreen('none');
    net.enterGame(selectedChar);
  };
  newBtn.onclick = () => {
    el('nameerr').textContent = '';
    showScreen('create');
  };
}

/** Redesenha a lista de personagens da conta. */
function renderCharList(chars: CharacterSlot[], error?: string): void {
  charSlots = chars;
  const listEl = el('charlist');
  const enterBtn = el('enterbtn') as HTMLButtonElement;
  const hintEl = el('charhint');
  listEl.innerHTML = '';

  if (chars.length === 0) {
    const vazio = document.createElement('div');
    vazio.className = 'charempty';
    vazio.textContent = 'Nenhum personagem ainda. Crie o primeiro.';
    listEl.appendChild(vazio);
  }

  // Se o personagem selecionado sumiu da lista, limpa a seleção.
  if (selectedChar !== null && !chars.some((c) => c.id === selectedChar)) {
    selectedChar = null;
  }

  for (const c of chars) {
    const def = CLASSES[c.charClass];
    const row = document.createElement('div');
    row.className = 'charrow' + (c.id === selectedChar ? ' sel' : '');
    row.innerHTML =
      `<div class="cicon" style="${classIconCss(c.charClass, 36)}"></div>` +
      `<div><b>${c.name}</b><small>${def?.name ?? c.charClass} · nível ${c.level}</small></div>`;
    row.onclick = () => {
      selectedChar = c.id;
      renderCharList(charSlots);
    };
    row.ondblclick = () => {
      selectedChar = c.id;
      enterBtn.click();
    };
    listEl.appendChild(row);
  }

  enterBtn.disabled = selectedChar === null;
  hintEl.textContent = error ?? '';
  hintEl.style.color = error ? '#d98a7a' : '#7d7466';

  // Só troca de tela se o jogo ainda não começou — um `charlist` que chegue
  // durante a partida (após criar personagem noutra aba) não pode expulsar
  // o jogador do mundo.
  if (!gameStarted) showScreen('charselect');
}

// ---- Tela 3: criação de personagem (nome + classe) -------------------------
function setupStartScreen(): void {
  const startEl = el('start');
  const nameIn = el('namein') as HTMLInputElement;
  const classesEl = el('classes');
  const playBtn = el('playbtn') as HTMLButtonElement;
  nameIn.value = localStorage.getItem('dominion_name') ?? '';
  // Migra escolhas salvas de nomes de classe antigos. A classe voltou a se
  // chamar `knight` (decisão do dono, 2026-07-28) — `warrior` era o nome do
  // meio do caminho e ainda pode estar no localStorage de quem já jogou.
  const legacy: Record<string, PlayerClass> = { warrior: 'knight', druid: 'assassin' };
  const saved = localStorage.getItem('dominion_class');
  let chosen: PlayerClass | null =
    (saved && (legacy[saved] ?? (saved as PlayerClass))) || null;
  let gender: Gender = localStorage.getItem('elysia_gender') === 'female' ? 'female' : 'male';

  // Seletor de sexo (masculino/feminino). Por ora só o Knight tem arte
  // distinta por sexo; as demais classes usam o mesmo sprite MiniWorld.
  const genderBar = document.createElement('div');
  genderBar.id = 'genderbar';
  const genderBtns: Record<Gender, HTMLButtonElement> = {
    male: document.createElement('button'),
    female: document.createElement('button'),
  };
  genderBtns.male.textContent = '♂ Masculino';
  genderBtns.female.textContent = '♀ Feminino';
  (['male', 'female'] as Gender[]).forEach((g) => {
    const btn = genderBtns[g];
    btn.className = 'genderbtn';
    btn.onclick = () => {
      gender = g;
      genderBtns.male.classList.toggle('sel', g === 'male');
      genderBtns.female.classList.toggle('sel', g === 'female');
      knightIcon.setAttribute('style', knightIconCss(gender, 48));
    };
    genderBar.appendChild(btn);
  });
  classesEl.before(genderBar);

  const order: PlayerClass[] = ['knight', 'sorcerer', 'archer', 'assassin'];
  const cards = new Map<PlayerClass, HTMLElement>();
  let knightIcon!: HTMLElement;
  for (const id of order) {
    const def = CLASSES[id];
    const card = document.createElement('div');
    card.className = 'classcard';
    // O Knight mostra a cabeça do sprite HD (varia com o sexo escolhido).
    const iconStyle = id === 'knight' ? knightIconCss(gender, 48) : classIconCss(id, 48);
    card.innerHTML =
      `<div class="cicon" style="${iconStyle}"></div>` +
      `<div class="cinfo"><b>${def.name}</b><p>${def.blurb}</p></div>`;
    if (id === 'knight') knightIcon = card.querySelector('.cicon')!;
    card.onclick = () => {
      chosen = id;
      for (const c of cards.values()) c.classList.remove('sel');
      card.classList.add('sel');
      refresh();
    };
    classesEl.appendChild(card);
    cards.set(id, card);
  }
  if (chosen && cards.has(chosen)) cards.get(chosen)!.classList.add('sel');
  genderBtns[gender].classList.add('sel');

  const errEl = el('nameerr');

  function refresh(): void {
    // Valida o nome NA HORA, com a mesma função que o servidor usa. O jogador
    // descobre o problema enquanto digita, não depois de clicar.
    const bruto = nameIn.value.trim();
    const check = bruto ? checkName(bruto) : null;
    errEl.textContent = check && !check.ok ? (check.message ?? '') : '';

    const nomeOk = !!check?.ok;
    playBtn.disabled = !chosen || !nomeOk;
    playBtn.textContent = !chosen ? 'Escolha uma classe' : 'Criar personagem';
  }
  nameIn.addEventListener('input', refresh);
  refresh();

  (el('backbtn') as HTMLButtonElement).onclick = () => showScreen('charselect');

  playBtn.onclick = () => {
    const check = checkName(nameIn.value.trim());
    if (!chosen || !check.ok) return;
    localStorage.setItem('dominion_class', chosen);
    localStorage.setItem('elysia_gender', gender);
    // O servidor responde com um `charlist` novo (com o personagem criado) ou
    // com o mesmo `charlist` mais um erro — quem troca de tela é o handler.
    net.send({ t: 'createchar', name: check.name, charClass: chosen, gender });
    startEl.style.display = 'none';
  };
}

// Modo noite (atualizado a cada snapshot): monstros ficam avermelhados/rápidos
// e o mundo escurece. Lido pelas funções de desenho das criaturas.
let nightMode = false;

// ---- Cores auxiliares ------------------------------------------------------
function shade(color: number, factor: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) * factor);
  const g = Math.min(255, ((color >> 8) & 0xff) * factor);
  const b = Math.min(255, (color & 0xff) * factor);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

// ---- Setup do PixiJS -------------------------------------------------------
const app = new Application();

async function startGame(playerName: string, charClass: PlayerClass, gender: Gender): Promise<void> {
  await app.init({
    background: '#0c0b0a',
    resizeTo: viewportEl,
    antialias: false,
  });
  viewportEl.appendChild(app.canvas);

  // Sprites de personagem gerados uma vez (você = azul, outros = vermelho).
  const selfTex = generateCharacterTextures(app.renderer, PALETTE_SELF);
  const otherTex = generateCharacterTextures(app.renderer, PALETTE_OTHER);

  // Tileset de terreno (sprites reais, se estiverem em /assets).
  const ground: GroundTiles | null = await loadGroundTiles();

  // Animações de personagem (player + slime). Null => cai no desenho por código.
  const anims: CharacterAnims | null = await loadCharacterAnims();
  // Slime Azul e Vermelho: mesma arte do Verde, matiz rotacionado (ver sprites.ts).
  const slimeVariants = await loadSlimeVariants();

  // Sprites MiniWorld: 4 direções por classe + slime. Estilo unificado do mundo.
  const classAnims = await loadClassAnims();
  const slimeAnim = await loadSlimeAnim();
  // Zumbi: folha LPC 64px, fora do padrão MiniWorld (ver miniworld.ts).
  const zombieAnim = await loadZombieAnim();
  const zombieIdleAnim = await loadZombieIdleAnim();
  // Knight em arte HD (masculino/feminino) — sobrepõe o MiniWorld p/ knight.
  const knightArt = await loadKnightSprites();
  // Sprite do NPC comerciante.
  const npcAnim = await loadNpcAnim();
  // Sprites de árvore (HD). Vazio => cai no desenho por código.
  const treeTex = await loadTrees();

  const world = new Container(); // a "câmera"
  const ZOOM = 1.0; // câmera afastada (visão ampla, como no início)
  world.scale.set(ZOOM);
  app.stage.addChild(world);

  const floorRoot = new Container(); // pisos (sprites reais ou placeholder)
  world.addChild(floorRoot);

  // Paredes, árvores E entidades convivem aqui, ordenados por profundidade (y).
  const objects = new Container();
  objects.sortableChildren = true;
  world.addChild(objects);

  const wallSprites: Container[] = [];
  const sprites = new Map<string, EntityView>();
  /** Fitas de ícone de condição, por id de entidade (criadas sob demanda). */
  const condStrips = new Map<string, ReturnType<typeof makeConditionStrip>>();

  // Anel de alvo (sob o inimigo selecionado) e camada de efeitos (números).
  const targetRing = new Graphics();
  targetRing.ellipse(TS / 2, TS - 2, TS / 2 - 1, TS / 4);
  targetRing.stroke({ width: 2, color: 0xff4040, alpha: 0.9 });
  targetRing.zIndex = -0.5;
  targetRing.visible = false;
  objects.addChild(targetRing);
  const fxLayer = new Container();
  world.addChild(fxLayer);

  // Overlay de NOITE: escurece a tela toda com um BURACO DE LUZ ao redor do
  // herói (você só enxerga um círculo; o resto fica bem escuro). Desenhado num
  // canvas com `destination-out` (buraco suave) e enviado como textura ao Pixi.
  const nightCanvas = document.createElement('canvas');
  const nightCtx = nightCanvas.getContext('2d')!;
  nightCanvas.width = 2;
  nightCanvas.height = 2;
  let nightTexture = Texture.from(nightCanvas);
  const nightOverlay = new Sprite(nightTexture);
  nightOverlay.eventMode = 'none';
  app.stage.addChild(nightOverlay);
  let nightDarkness = 0; // 0 (dia) .. ~0.92 (meia-noite)

  const floaters: Array<{ node: Text; life: number; max: number }> = [];
  const projectiles: Array<{
    node: Graphics; fromX: number; fromY: number; toX: number; toY: number; t: number; dur: number;
  }> = [];
  // Efeitos de magia (giro do Vendaval, corte do Dash): expandem e somem.
  const spellFx: Array<{ node: Container; t: number; dur: number; kind: string }> = [];

  let myId: string | null = null;
  let myFloor = map.spawn.floor;
  let myTileX = map.spawn.x;
  let myTileY = map.spawn.y;
  let renderedFloor = -999;
  let moveSeq = 0;
  let targetId: string | null = null;
  // Alcance de ataque do meu personagem (tiles). Vem do S2C_Stats; a Battle list
  // só mostra monstros dentro desse raio + uma margem de aproximação.
  let myAttackRange = 1;

  function setTarget(id: string): void {
    targetId = id;
    net.send({ t: 'attack', targetId: id });
  }
  function clearTarget(): void {
    if (!targetId) return;
    targetId = null;
    targetRing.visible = false;
    net.send({ t: 'cancel' });
  }

  function spawnFloater(wx: number, wy: number, text: string, color: number, big: boolean): void {
    const node = new Text({
      text,
      style: {
        fill: color,
        fontSize: big ? 20 : 14,
        fontFamily: 'Segoe UI, sans-serif',
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 3 },
      },
    });
    node.anchor.set(0.5, 1);
    node.x = wx + TS / 2;
    node.y = wy;
    fxLayer.addChild(node);
    floaters.push({ node, life: 800, max: 800 });
  }

  /**
   * Efeito visual de uma magia, centrado num tile. O servidor manda o `kind`
   * junto com o ponto — o cliente só desenha.
   */
  function spawnSpellFx(kind: string, tileX: number, tileY: number, radius: number): void {
    const node = new Container();
    node.x = tileX * TS + TS / 2;
    node.y = tileY * TS + TS / 2;
    node.zIndex = 9998;

    if (kind === 'bash') {
      // Anel de corte + lâminas girando para fora, cobrindo o raio real da magia.
      const R = (radius + 0.5) * TS;
      const ring = new Graphics();
      ring.circle(0, 0, R).stroke({ width: 3, color: 0xffd24a, alpha: 0.9 });
      ring.circle(0, 0, R * 0.62).stroke({ width: 2, color: 0xdfe7f2, alpha: 0.6 });
      node.addChild(ring);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const blade = new Graphics();
        blade.poly([0, -4, 18, 0, 0, 4]).fill({ color: i % 2 ? 0xdfe7f2 : 0xffd24a, alpha: 0.95 });
        blade.x = Math.cos(a) * R * 0.7;
        blade.y = Math.sin(a) * R * 0.7;
        blade.rotation = a;
        node.addChild(blade);
      }
    } else if (kind === 'fury') {
      // Fúria: labaredas subindo ao redor do Knight.
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const chama = new Graphics();
        chama.poly([0, 0, -5, -16, 0, -24, 5, -16]).fill({ color: i % 2 ? 0xffc74a : 0xff6a1a, alpha: 0.9 });
        chama.x = Math.cos(a) * TS * 0.7;
        chama.y = Math.sin(a) * TS * 0.45;
        node.addChild(chama);
      }
    } else if (kind === 'taunt') {
      // Provocar: ondas de som abrindo a partir da criatura.
      for (const r of [12, 20, 28]) {
        const onda = new Graphics();
        onda.circle(0, 0, r).stroke({ width: 2.5, color: 0xffd24a, alpha: 0.85 });
        node.addChild(onda);
      }
    } else if (kind === 'rupture') {
      // Ruptura: rachadura vermelha estourando no alvo.
      const crack = new Graphics();
      for (const ang of [0.4, 1.9, 3.3, 4.8]) {
        crack.moveTo(0, 0);
        crack.lineTo(Math.cos(ang) * 24, Math.sin(ang) * 24);
      }
      crack.stroke({ width: 3, color: 0xff3b30, alpha: 0.95 });
      node.addChild(crack);
    } else if (kind === 'stance') {
      // Postura: cúpula azulada assentando sobre o Knight.
      const dome = new Graphics();
      dome.circle(0, 0, TS * 0.8).stroke({ width: 3, color: 0x9fb6cc, alpha: 0.9 });
      node.addChild(dome);
    } else {
      // Golpe Poderoso / Investida / Execução: talho de espada.
      const cor = kind === 'execution' ? 0xff5a5a : 0xffd24a;
      const slash = new Graphics();
      slash.poly([-20, 16, -12, 22, 22, -14, 14, -20]).fill({ color: cor, alpha: 0.95 });
      slash.poly([-14, 20, -10, 22, 20, -12, 16, -16]).fill({ color: 0xfff3c8, alpha: 0.9 });
      node.addChild(slash);
      const burst = new Graphics();
      burst.circle(0, 0, 10).fill({ color: 0xff5a3a, alpha: 0.55 });
      node.addChildAt(burst, 0);
    }

    fxLayer.addChild(node);
    // Durações alongadas a pedido do dono: a 320 ms o talho mal era percebido,
    // e efeito que o jogador não vê não ensina nada. Área dura mais que golpe
    // porque cobre um espaço que precisa ser LIDO antes de reagir.
    const dur = kind === 'bash' || kind === 'fury' ? 800 : 520;
    spellFx.push({ node, t: 0, dur, kind });
  }

  function spawnProjectile(fromWX: number, fromWY: number, toTileX: number, toTileY: number, kind: string): void {
    const node = new Graphics();
    if (kind === 'firebolt') {
      node.circle(0, 0, 5).fill(0xff8c2a);
      node.circle(0, 0, 3).fill(0xffe08a);
    } else if (kind === 'icebolt') {
      node.circle(0, 0, 5).fill(0x6fd0ff);
      node.circle(0, 0, 3).fill(0xe0f6ff);
    } else {
      // flecha
      node.rect(-6, -1, 12, 2).fill(0xd9b37a);
      node.poly([6, -3, 11, 0, 6, 3]).fill(0x8a6a3a);
    }
    fxLayer.addChild(node);
    projectiles.push({
      node,
      fromX: fromWX + TS / 2, fromY: fromWY + TS / 2,
      toX: toTileX * TS + TS / 2, toY: toTileY * TS + TS / 2,
      t: 0, dur: 180,
    });
  }

  // Quanto o tile de 64px "sobe" na tela sobre a célula lógica de 32px.
  const groundOverhang = ground ? ground.cell - TS : 0;

  function rebuildFloor(floor: number): void {
    // Limpa o andar anterior.
    for (const w of wallSprites) w.destroy();
    wallSprites.length = 0;
    for (const c of floorRoot.removeChildren()) c.destroy();

    const layer = map.floors[floor];
    if (!layer) return;

    // Desenha os pisos de baixo para cima: linhas da frente sobrepõem as de trás.
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const t = getTileType(layer[y * map.width + x]!);
        if (t.name === 'void') continue;

        if (t.height === 0) {
          const tex = ground?.byId.get(t.id);
          if (tex) {
            // Sprite real do tileset (64px), com sobreposição oblíqua.
            const s = new Sprite(tex);
            s.x = x * TS;
            s.y = y * TS - groundOverhang;
            s.width = ground!.cell;
            s.height = ground!.cell;
            floorRoot.addChild(s);
          } else {
            // Placeholder: retângulo colorido.
            const g = new Graphics();
            g.rect(x * TS, y * TS, TS, TS);
            g.fill(t.color);
            g.rect(x * TS, y * TS, TS, TS);
            g.stroke({ width: 1, color: 0x000000, alpha: 0.12 });
            floorRoot.addChild(g);
          }
        } else if (t.name === 'tree' && treeTex.length) {
          // Árvore com sprite HD (variante estável por célula).
          wallSprites.push(makeTree(x, y, treeTex[treeIndexFor(x, y, treeTex.length)]!));
        } else {
          // Parede (e árvore sem sprite) desenhadas por código (2.5D).
          wallSprites.push(makeBlock(x, y, t.name, t.color));
        }
      }
    }
    for (const w of wallSprites) objects.addChild(w);
    renderedFloor = floor;
  }

  /** Árvore com sprite HD: base no rodapé do tile, copa subindo, oclusão por y. */
  function makeTree(x: number, y: number, tex: Texture): Sprite {
    const s = new Sprite(tex);
    s.anchor.set(0.5, 1); // base-centro
    s.scale.set((TS * 1.05) / tex.width); // largura ~1 tile (menos "emenda" entre árvores)
    s.x = x * TS + TS / 2;
    s.y = y * TS + TS + 2; // base assenta no rodapé do tile
    s.zIndex = y; // profundidade: linhas da frente cobrem as de trás
    return s;
  }

  /** Árvore, muro de pedra (tijolos) ou de madeira (tábuas), em 2.5D. */
  function makeBlock(x: number, y: number, name: string, color: number): Graphics {
    const g = new Graphics();
    const px = x * TS;
    const py = y * TS;
    g.zIndex = y; // profundidade: linhas de baixo desenham por cima

    if (name === 'tree') {
      const cx = px + TS / 2;
      g.ellipse(cx, py + TS - 3, TS / 3, TS / 9).fill({ color: 0x000000, alpha: 0.22 });
      // Tronco.
      g.rect(cx - 3, py + TS - 17, 6, 16).fill(0x6b4a2a).stroke({ width: 1, color: 0x3a2614 });
      // Copa em camadas (folhagem).
      const cy = py + TS - 22;
      g.circle(cx - 8, cy, 10).fill(0x2f6b2a);
      g.circle(cx + 8, cy, 10).fill(0x2f6b2a);
      g.circle(cx, cy - 7, 12).fill(0x367a30);
      g.circle(cx - 4, cy - 3, 7).fill(0x4f9646);
      g.circle(cx + 5, cy - 5, 5).fill(0x5aa650);
      return g;
    }

    const face = shade(color, 0.58);
    const topEdge = py - WALL_H;
    // Face frontal (mais escura) e topo (cor cheia).
    g.rect(px, topEdge, TS, TS + WALL_H).fill(face);
    g.rect(px, topEdge, TS, TS).fill(color);

    if (name === 'wall_stone') {
      // Argamassa: fiadas de tijolos deslocadas no topo e na face.
      const mortar = { width: 1, color: shade(color, 0.4), alpha: 0.9 };
      for (let ry = 0; ry <= TS; ry += 8) {
        g.moveTo(px, topEdge + ry).lineTo(px + TS, topEdge + ry).stroke(mortar);
      }
      for (let ry = 0; ry < TS; ry += 8) {
        const off = (ry / 8) % 2 === 0 ? 0 : TS / 2;
        g.moveTo(px + off, topEdge + ry).lineTo(px + off, topEdge + ry + 8).stroke(mortar);
        g.moveTo(px + (off + TS / 2) % TS, topEdge + ry).lineTo(px + (off + TS / 2) % TS, topEdge + ry + 8).stroke(mortar);
      }
      // Fiadas na face frontal.
      for (let fy = py; fy < py + WALL_H + TS; fy += 8) {
        g.moveTo(px, fy).lineTo(px + TS, fy).stroke({ width: 1, color: shade(color, 0.35), alpha: 0.7 });
      }
    } else if (name === 'wall_wood') {
      // Tábuas verticais no topo + traves horizontais na face.
      const seam = { width: 1, color: shade(color, 0.45), alpha: 0.9 };
      for (let rx = 6; rx < TS; rx += 8) {
        g.moveTo(px + rx, topEdge).lineTo(px + rx, topEdge + TS).stroke(seam);
      }
      g.moveTo(px, py).lineTo(px + TS, py).stroke({ width: 2, color: shade(color, 0.4), alpha: 0.8 });
      for (let fx = 6; fx < TS; fx += 8) {
        g.moveTo(px + fx, py).lineTo(px + fx, py + WALL_H + TS).stroke({ width: 1, color: shade(color, 0.42), alpha: 0.6 });
      }
    }
    g.rect(px, topEdge, TS, TS).stroke({ width: 1, color: 0x000000, alpha: 0.25 });
    return g;
  }

  // Rede -------------------------------------------------------------------
  // A conexão já existe desde o login (`net`, no escopo do módulo). Aqui o
  // jogo só ASSUME o roteamento das mensagens de partida.
  setGameHandler(
    (msg) => {
      switch (msg.t) {
        case 'welcome':
          myId = msg.playerId;
          logChat(`Bem-vindo, <b>${playerName}</b>! Você é ${msg.playerId}.`, 'sys');
          break;
        case 'towns':
          onTowns(msg.visited, msg.respawn);
          break;
        case 'snapshot':
          updateDayNight(msg.hour, msg.night);
          syncEntities(msg.entities);
          updateBattleList(msg.entities);
          drawMinimap();
          break;
        case 'chat':
          logChat(`<b>${escapeHtml(msg.from)}:</b> ${escapeHtml(msg.text)}`);
          break;
        case 'denied':
          logChat(`Ação negada: ${escapeHtml(msg.reason)}`, 'sys');
          break;
        case 'stats':
          myAttackRange = msg.attackRange;
          updateHud(msg);
          updateAttrHud(msg);
          updateCharPanel(msg);
          updateSpellBar(msg);
          updateSkillPanel(msg);
          updateBestiary(msg);
          break;
        case 'cast':
          onCastAccepted(msg.spell as SkillId, msg.cooldownMs);
          break;
        case 'fx':
          if (msg.floor === myFloor) spawnSpellFx(msg.kind, msg.x, msg.y, msg.radius ?? 1);
          break;
        case 'hit': {
          // Quem bateu toca a animação de ataque; quem levou (e não esquivou)
          // toca a de dano — feedback visual casado com o combate autoritativo.
          // Parcela de DoT não é golpe: ninguém desferiu nada, então nem a
          // animação de ataque nem a de dano devem tocar. Piscar o alvo a cada
          // tique de veneno viraria epilepsia.
          if (!msg.dot) sprites.get(msg.attackerId)?.playAttack?.();
          const view = sprites.get(msg.targetId);
          if (view) {
            const iAmTarget = msg.targetId === myId;
            if (msg.dodged) {
              spawnFloater(view.container.x, view.container.y - 12, 'esquiva', 0xbfbfbf, false);
            } else {
              if (!msg.dot) view.playHurt?.();
              // Cor: crítico manda em tudo; depois o elemento (Etapa 8); e o
              // físico cai na regra antiga de vermelho-em-mim/branco-nos-outros.
              const elemental = msg.element && msg.element !== 'physical'
                ? ELEMENT_INFO[msg.element].color
                : undefined;
              const color = msg.crit
                ? 0xffcf3f
                : elemental ?? (iAmTarget ? 0xff5a5a : 0xffffff);
              spawnFloater(view.container.x, view.container.y - 12, String(msg.amount), color, msg.crit);
            }
            // Golpe que matou a criatura E foi o MEU: mostra a XP ganha sobre ela,
            // um pouco acima do número de dano, em verde-dourado.
            if (msg.fatal && msg.xp && msg.attackerId === myId) {
              spawnFloater(view.container.x, view.container.y - 30, `+${msg.xp} EXP`, 0x8fe36b, true);
            }
          }
          break;
        }
        case 'projectile': {
          if (msg.floor !== myFloor) break;
          const from = sprites.get(msg.fromId);
          const fx = from ? from.container.x : msg.toX * TS;
          const fy = from ? from.container.y : msg.toY * TS;
          spawnProjectile(fx, fy, msg.toX, msg.toY, msg.kind);
          break;
        }
        case 'died': {
          hud.death.style.display = 'flex';
          const perdas = [`XP −${msg.xpLost}`];
          if (msg.levelsLost > 0) {
            perdas.push(`${msg.levelsLost} nível${msg.levelsLost > 1 ? 'is' : ''} perdido${msg.levelsLost > 1 ? 's' : ''}`);
          }
          hud.deathby.textContent = `Derrotado por ${msg.by} · ${perdas.join(' · ')}`;
          logChat(
            `Você morreu para <b>${escapeHtml(msg.by)}</b>. Perdeu ${msg.xpLost} de XP` +
            (msg.levelsLost > 0 ? ` e ${msg.levelsLost} nível(is) — redistribua seus pontos` : '') +
            `. Seu corpo ficou em (${msg.corpseX}, ${msg.corpseY}).`,
            'sys',
          );
          corpseWin.style.display = 'none';
          openCorpseId = null;
          clearTarget();
          break;
        }
        case 'corpse':
          renderCorpse(msg);
          break;
        case 'respawn':
          hud.death.style.display = 'none';
          break;
        case 'levelup': {
          const me = myId ? sprites.get(myId) : undefined;
          if (me) spawnFloater(me.container.x, me.container.y - 30, `Nível ${msg.level}!`, 0x9fe0a3, true);
          logChat(`Você subiu para o <b>nível ${msg.level}</b>!`, 'sys');
          break;
        }
        case 'inventory':
          onInventory(msg);
          break;
        case 'pong':
          break;
      }
    },
  );

  // ---- Inventário / Equipamento / Loja / Depósito ------------------------
  const bpGrid = el('bpgrid');
  const equipGrid = el('equipgrid');
  const depotBox = el('depotbox');
  const dpGrid = el('dpgrid');
  const invHint = el('invhint');
  const shopEl = el('shop');
  const shopList = el('shoplist');
  let currentInv: S2C_Inventory | null = null;

  // Paperdoll clássico do Tibia: colar/elmo/mochila em cima, arma/armadura/
  // escudo no meio, anel/calça/botas embaixo.
  const PAPERDOLL: (EquipSlot | null)[] = [
    'necklace', 'helmet', 'container',
    'weapon', 'armor', 'shield',
    'ring', 'pants', 'boots',
  ];
  const hx = (color: number): string => `#${(color >>> 0).toString(16).padStart(6, '0').slice(-6)}`;
  const S = 28; // resolução dos ícones (desenhados por código, escalados nítidos)

  /** Silhueta de um tipo de equipamento, preenchida com `fill`/`stroke`. */
  function drawEquipShape(g: CanvasRenderingContext2D, slot: EquipSlot, fill: string, stroke: string): void {
    const cx = S / 2;
    g.fillStyle = fill;
    g.strokeStyle = stroke;
    g.lineWidth = 1.4;
    g.lineJoin = 'round';
    const poly = (pts: number[]): void => {
      g.beginPath();
      g.moveTo(pts[0]!, pts[1]!);
      for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!);
      g.closePath();
      g.fill();
      g.stroke();
    };
    switch (slot) {
      case 'weapon': // espada
        poly([cx, 3, cx + 3, 8, cx + 2, S - 9, cx - 2, S - 9, cx - 3, 8]);
        g.fillStyle = stroke;
        g.fillRect(cx - 5, S - 9, 10, 2);
        g.fillRect(cx - 1.5, S - 7, 3, 5);
        break;
      case 'shield':
        g.beginPath();
        g.moveTo(cx, 4); g.lineTo(S - 6, 7); g.lineTo(S - 7, S / 2 + 2);
        g.quadraticCurveTo(cx + 3, S - 4, cx, S - 3);
        g.quadraticCurveTo(cx - 3, S - 4, 7, S / 2 + 2); g.lineTo(6, 7);
        g.closePath(); g.fill(); g.stroke();
        break;
      case 'helmet':
        g.beginPath();
        g.arc(cx, S / 2, S / 2 - 5, Math.PI, 0);
        g.lineTo(S - 6, S / 2 + 4); g.lineTo(6, S / 2 + 4);
        g.closePath(); g.fill(); g.stroke();
        g.fillStyle = stroke; g.fillRect(cx - 1, 5, 2, S / 2 - 3);
        break;
      case 'armor':
        poly([cx - 8, 6, cx - 3, 4, cx + 3, 4, cx + 8, 6, cx + 7, S - 5, cx - 7, S - 5]);
        g.strokeStyle = stroke; g.beginPath(); g.moveTo(cx, 5); g.lineTo(cx, S - 6); g.stroke();
        break;
      case 'pants':
        poly([cx - 6, 5, cx + 6, 5, cx + 6, S - 4, cx + 1, S - 4, cx + 1, 12, cx - 1, 12, cx - 1, S - 4, cx - 6, S - 4]);
        break;
      case 'boots':
        poly([cx - 5, 5, cx - 1, 5, cx - 1, S - 8, S - 6, S - 8, S - 6, S - 4, cx - 5, S - 4]);
        break;
      case 'necklace':
        g.beginPath(); g.arc(cx, S / 2 - 2, 6, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
        poly([cx - 3, S / 2 + 2, cx + 3, S / 2 + 2, cx, S - 5]);
        break;
      case 'ring':
        g.lineWidth = 2.6; g.beginPath(); g.arc(cx, S / 2 + 2, 5, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.arc(cx, S / 2 - 4, 2.6, 0, Math.PI * 2); g.fill(); g.stroke();
        break;
      case 'container': // mochila/bolsa
        poly([cx - 7, 10, cx + 7, 10, cx + 8, S - 4, cx - 8, S - 4]);
        g.beginPath(); g.arc(cx, 10, 5, Math.PI, 0); g.stroke();
        g.fillStyle = stroke; g.fillRect(cx - 3, S / 2 + 1, 6, 4);
        break;
    }
  }

  const itemIconCache = new Map<string, string>();
  function itemIconUrl(kind: string): string {
    const c = itemIconCache.get(kind);
    if (c) return c;
    const def = getItem(kind);
    const color = def?.color ?? 0x999999;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const g = cv.getContext('2d')!;
    if (def?.category === 'currency') {
      // Pilha de moedas na cor da denominação (gold/silver/blue/white).
      for (const [ox, oy] of [[-3, 2], [3, 2], [0, -1]] as const) {
        g.beginPath();
        g.arc(S / 2 + ox, S / 2 + oy + 2, 6, 0, Math.PI * 2);
        g.fillStyle = hx(color); g.fill();
        g.lineWidth = 1; g.strokeStyle = hx(shade(color, 0.6)); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.4)';
        g.beginPath(); g.arc(S / 2 + ox - 1.5, S / 2 + oy, 1.6, 0, Math.PI * 2); g.fill();
      }
    } else if (def?.category === 'consumable') {
      g.fillStyle = '#cfc8b6'; g.fillRect(S / 2 - 2, 3, 4, 4); // rolha
      g.beginPath();
      g.moveTo(S / 2 - 5, 9); g.lineTo(S / 2 + 5, 9);
      g.lineTo(S / 2 + 6, S - 3); g.lineTo(S / 2 - 6, S - 3); g.closePath();
      g.fillStyle = hx(shade(color, 0.5)); g.fill();
      g.fillStyle = hx(color); g.fillRect(S / 2 - 5, 13, 10, S - 3 - 13); // líquido
      g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(S / 2 - 4, 14, 2, S - 18); // brilho
      g.lineWidth = 1; g.strokeStyle = '#0a0908'; g.stroke();
    } else if (def?.category === 'equip' && def.slot) {
      drawEquipShape(g, def.slot, hx(color), hx(shade(color, 0.5)));
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(6, 6, S - 12, 2); // brilho topo
    } else {
      // Loot: blob orgânico.
      g.beginPath(); g.ellipse(S / 2, S / 2 + 1, 8, 7, 0, 0, Math.PI * 2);
      g.fillStyle = hx(color); g.fill();
      g.lineWidth = 1.4; g.strokeStyle = hx(shade(color, 0.5)); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.beginPath(); g.ellipse(S / 2 - 2, S / 2 - 2, 2.5, 1.8, 0, 0, Math.PI * 2); g.fill();
    }
    const url = cv.toDataURL();
    itemIconCache.set(kind, url);
    return url;
  }

  /** Silhueta fraca (cinza) para o slot de equipamento vazio. */
  const slotIconCache = new Map<EquipSlot, string>();
  function slotIconUrl(slot: EquipSlot): string {
    const c = slotIconCache.get(slot);
    if (c) return c;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const g = cv.getContext('2d')!;
    drawEquipShape(g, slot, '#3a352d', '#2a251e');
    const url = cv.toDataURL();
    slotIconCache.set(slot, url);
    return url;
  }

  /**
   * Descrição completa de um item para o tooltip: identidade da arma, raridade
   * e os passivos que ESTE exemplar rolou. É aqui que dois itens iguais no nome
   * se revelam diferentes.
   */
  function itemTooltip(stack: ItemStack): string {
    const def = getItem(stack.kind);
    if (!def) return stack.kind;
    const linhas: string[] = [];
    const rar = stack.roll ? RARITY[stack.roll.rarity] : null;
    linhas.push(rar ? `${def.name} [${rar.name}]` : def.name);

    if (def.weaponType) {
      const w = WEAPON_IDENTITY[def.weaponType];
      linhas.push(`${w.name} · ${w.hands === 2 ? 'duas mãos' : 'uma mão'} · alcance ${w.range}`);
      linhas.push(w.blurb);
      const prof = myProficiencies[def.weaponType];
      if (prof) linhas.push(`Sua maestria: ${prof.level}`);
    }
    const mult = rar ? rar.statMult : 1;
    if (def.atk) linhas.push(`Ataque ${Math.round(def.atk * mult)}`);
    if (def.def) linhas.push(`Defesa ${Math.round(def.def * mult)}`);
    for (const a of stack.roll?.affixes ?? []) linhas.push(`  ${affixText(a)}`);
    if (stack.roll) linhas.push(`Slots de carta: ${stack.roll.slots}`);
    return linhas.join('\n');
  }

  function makeItemCell(stack: ItemStack | null, onClick: () => void, dragData?: string): HTMLElement {
    const cell = document.createElement('div');
    cell.className = stack ? 'islot' : 'islot empty';
    if (stack) {
      const img = document.createElement('img');
      img.src = itemIconUrl(stack.kind);
      cell.appendChild(img);
      if (stack.amount > 1) {
        const a = document.createElement('span');
        a.className = 'amt';
        a.textContent = String(stack.amount);
        cell.appendChild(a);
      }
      // Moldura na cor da raridade — dá para bater o olho na mochila e ver
      // que aquele item é diferente.
      if (stack.roll) {
        const cor = RARITY[stack.roll.rarity].color;
        cell.style.boxShadow = `inset 0 0 0 2px ${hx(cor)}, inset 0 1px 2px rgba(0,0,0,0.85)`;
      }
      cell.title = itemTooltip(stack);
      cell.onclick = onClick;
      if (dragData) {
        cell.draggable = true;
        cell.addEventListener('dragstart', (e) => e.dataTransfer?.setData('text/plain', dragData));
      }
    }
    return cell;
  }

  function onBackpackClick(i: number, stack: ItemStack | null): void {
    if (!stack || !currentInv) return;
    if (currentInv.atDepot) { net.send({ t: 'store', index: i, to: 'depot' }); return; }
    const def = getItem(stack.kind);
    if (def?.category === 'consumable') net.send({ t: 'use', index: i });
    else if (def?.category === 'equip') net.send({ t: 'equip', index: i });
  }

  const bpSubhead = el('bpsubhead');

  function renderInventory(): void {
    if (!currentInv) return;
    // Equipamento (paperdoll). Arrasta item da mochila pra cá pra equipar.
    equipGrid.innerHTML = '';
    for (const slot of PAPERDOLL) {
      const cell = document.createElement('div');
      cell.className = slot ? 'eslot' : 'eslot corner';
      if (!slot) { equipGrid.appendChild(cell); continue; }
      const eq = currentInv.equipment[slot];
      if (eq) {
        const img = document.createElement('img');
        img.src = itemIconUrl(eq.kind);
        cell.appendChild(img);
        const b = getItem(eq.kind);
        const bonus = [
          b?.atk ? `+${b.atk} atq` : '',
          b?.def ? `+${b.def} def` : '',
          b?.capacity ? `${b.capacity} slots` : '',
        ].filter(Boolean).join(' · ');
        cell.title = `${EQUIP_SLOT_LABEL[slot]}: ${b?.name}${bonus ? ` (${bonus})` : ''} — clique/arraste p/ tirar`;
        cell.draggable = true;
        cell.addEventListener('dragstart', (e) => e.dataTransfer?.setData('text/plain', `eq:${slot}`));
        cell.onclick = () => net.send({ t: 'unequip', slot });
      } else {
        const img = document.createElement('img');
        img.className = 'ph';
        img.src = slotIconUrl(slot);
        cell.appendChild(img);
        cell.title = EQUIP_SLOT_LABEL[slot];
      }
      equipGrid.appendChild(cell);
    }
    // Mochila (itens arrastáveis). O tamanho vem do container equipado.
    const cont = currentInv.equipment.container;
    const used = currentInv.backpack.filter(Boolean).length;
    bpSubhead.textContent = cont
      ? `🎒 ${getItem(cont.kind)?.name} · ${used}/${currentInv.backpack.length}`
      : '🎒 Sem mochila';
    bpGrid.innerHTML = '';
    currentInv.backpack.forEach((stack, i) => {
      bpGrid.appendChild(makeItemCell(stack, () => onBackpackClick(i, stack), `bp:${i}`));
    });
    // Depósito (só aparece dentro do DP).
    depotBox.style.display = currentInv.atDepot ? 'block' : 'none';
    if (currentInv.atDepot) {
      dpGrid.innerHTML = '';
      currentInv.depot.forEach((stack, i) => {
        dpGrid.appendChild(
          makeItemCell(stack, () => { if (stack) net.send({ t: 'store', index: i, to: 'backpack' }); }),
        );
      });
    }
    invHint.textContent = currentInv.atDepot
      ? 'No Depósito: clique um item da mochila p/ guardar; clique no baú p/ retirar.'
      : currentInv.nearVendor
        ? 'Perto do comerciante — clique nele p/ abrir a loja.'
        : 'Clique: usar poção ou equipar item. Loot do chão vai pra mochila.';
  }

  // ---- Espólio do corpo --------------------------------------------------
  // Clicar num cadáver abre o que ficou nele. Qualquer jogador pode saquear —
  // é o que cria a corrida de voltar ao local antes que outro chegue.
  const corpseWin = el('corpsewin');
  const corpseGrid = el('corpse-grid');
  const corpseTitle = el('corpse-title');
  const corpseHint = el('corpse-hint');
  let openCorpseId: string | null = null;
  el('corpse-close').onclick = () => {
    corpseWin.style.display = 'none';
    openCorpseId = null;
  };

  function openCorpse(id: string): void {
    openCorpseId = id;
    net.send({ t: 'opencorpse', corpseId: id });
  }

  function renderCorpse(msg: S2C_CorpseContents): void {
    openCorpseId = msg.corpseId;
    corpseWin.style.display = 'block';
    corpseTitle.textContent = `☠️ Corpo de ${msg.owner}`;
    corpseGrid.textContent = '';
    let vazio = true;
    msg.items.forEach((stack, i) => {
      if (stack) vazio = false;
      corpseGrid.appendChild(
        makeItemCell(stack, () => {
          if (stack) net.send({ t: 'loot', corpseId: msg.corpseId, index: i });
        }),
      );
    });
    const min = Math.floor(msg.secondsLeft / 60);
    const seg = msg.secondsLeft % 60;
    corpseHint.textContent = vazio
      ? 'Vazio. O corpo some em instantes.'
      : `Clique para recolher · some em ${min}m${String(seg).padStart(2, '0')}s`;
  }

  function onInventory(msg: S2C_Inventory): void {
    currentInv = msg;
    renderInventory();
  }

  function openShop(): void {
    shopList.innerHTML = '';
    for (const kind of VENDOR_STOCK) {
      const def = ITEMS[kind];
      if (!def) continue;
      const row = document.createElement('div');
      row.className = 'shoprow';
      const img = document.createElement('img');
      img.src = itemIconUrl(kind);
      const nm = document.createElement('span');
      nm.className = 'sn';
      nm.textContent = def.name;
      const pr = document.createElement('span');
      pr.className = 'sp';
      pr.textContent = `${def.buyPrice} 🪙`;
      const btn = document.createElement('button');
      btn.textContent = 'Comprar';
      btn.onclick = () => net.send({ t: 'buy', kind });
      row.append(img, nm, pr, btn);
      shopList.appendChild(row);
    }
    shopEl.style.display = 'flex';
  }
  el('shop-close').onclick = () => { shopEl.style.display = 'none'; };

  // Arrastar-e-soltar: mochila -> paperdoll (equipar) e paperdoll -> mochila
  // (desequipar). O servidor valida e recalcula o dano/defesa.
  const allowDrop = (e: DragEvent): void => e.preventDefault();
  equipGrid.addEventListener('dragover', allowDrop);
  equipGrid.addEventListener('drop', (e) => {
    e.preventDefault();
    const d = e.dataTransfer?.getData('text/plain') ?? '';
    if (d.startsWith('bp:')) net.send({ t: 'equip', index: Number(d.slice(3)) });
  });
  bpGrid.addEventListener('dragover', allowDrop);
  bpGrid.addEventListener('drop', (e) => {
    e.preventDefault();
    const d = e.dataTransfer?.getData('text/plain') ?? '';
    if (d.startsWith('eq:')) net.send({ t: 'unequip', slot: d.slice(3) as EquipSlot });
  });

  // Momento do último arraste de painel (para não minimizar no clique que segue).
  let lastDragEnd = 0;

  // Painéis retráteis: clicar em QUALQUER lugar do cabeçalho (.phead) minimiza
  // o painel (menos nos botões de +atributo, que têm ação própria). O botão .pt
  // só mostra o estado (+/−).
  for (const head of Array.from(document.querySelectorAll<HTMLElement>('.phead'))) {
    head.addEventListener('click', (ev) => {
      if (performance.now() - lastDragEnd < 250) return; // foi arraste, não clique
      const tgt = ev.target as HTMLElement;
      if (tgt.tagName === 'BUTTON' && !tgt.classList.contains('pt')) return; // ex.: +/− de atributo
      const panel = head.closest('.panel');
      if (!panel) return;
      const collapsed = panel.classList.toggle('collapsed');
      const pt = head.querySelector<HTMLElement>('.pt');
      if (pt) pt.textContent = collapsed ? '+' : '−';
    });
  }

  // ---- Reordenar painéis arrastando pelo cabeçalho -----------------------
  // Clique curto = minimiza; arrastar (>6px) = reordena. A ordem fica salva.
  const sidebarEl = el('sidebar');
  const ORDER_KEY = 'elysia_panel_order';
  const bottomAnchor = el('coords').closest('.box'); // caixa de posição/dicas fica embaixo
  const reorderable = (): HTMLElement[] =>
    Array.from(sidebarEl.children).filter(
      (c): c is HTMLElement => c instanceof HTMLElement && !!c.querySelector(':scope > .phead'),
    );
  // Restaura a ordem salva (move cada painel salvo para antes da caixa de baixo).
  try {
    const saved = JSON.parse(localStorage.getItem(ORDER_KEY) ?? 'null') as string[] | null;
    if (saved && bottomAnchor) {
      for (const id of saved) {
        const p = document.getElementById(id);
        if (p && p.parentElement === sidebarEl) sidebarEl.insertBefore(p, bottomAnchor);
      }
    }
  } catch { /* ordem inválida — ignora */ }
  const saveOrder = (): void => {
    localStorage.setItem(ORDER_KEY, JSON.stringify(reorderable().map((p) => p.id).filter(Boolean)));
  };

  let dragPanel: HTMLElement | null = null;
  let dragStartY = 0;
  let dragMoved = false;
  const panelAfter = (y: number): HTMLElement | null => {
    let closest: HTMLElement | null = null;
    let closestOffset = -Infinity;
    for (const p of reorderable()) {
      if (p === dragPanel) continue;
      const r = p.getBoundingClientRect();
      const offset = y - (r.top + r.height / 2);
      if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = p; }
    }
    return closest;
  };
  document.addEventListener('pointermove', (e) => {
    if (!dragPanel) return;
    if (!dragMoved) {
      if (Math.abs(e.clientY - dragStartY) < 6) return;
      dragMoved = true;
      dragPanel.classList.add('dragging');
    }
    e.preventDefault();
    const after = panelAfter(e.clientY);
    if (after) sidebarEl.insertBefore(dragPanel, after);
    else if (bottomAnchor) sidebarEl.insertBefore(dragPanel, bottomAnchor);
    else sidebarEl.appendChild(dragPanel);
  });
  document.addEventListener('pointerup', () => {
    if (!dragPanel) return;
    if (dragMoved) {
      dragPanel.classList.remove('dragging');
      lastDragEnd = performance.now(); // suprime o clique-minimizar que segue
      saveOrder();
    }
    dragPanel = null;
    dragMoved = false;
  });
  for (const p of reorderable()) {
    const head = p.querySelector<HTMLElement>(':scope > .phead')!;
    head.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragPanel = p;
      dragStartY = e.clientY;
      dragMoved = false;
    });
  }

  // ---- Ciclo dia/noite + relógio -----------------------------------------
  function updateDayNight(hour: number, night: boolean): void {
    nightMode = night;
    const h = Math.floor(hour) % 24;
    const m = Math.floor((hour - Math.floor(hour)) * 60);
    const icon = night ? '🌙' : '☀️';
    clockEl.textContent = `${icon} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    clockEl.classList.toggle('night', night); // pisca no menu à noite
    // Escuridão-alvo: máxima à meia-noite, nula ao meio-dia. Bem escuro à noite.
    const darkness = (1 + Math.cos((hour / 24) * Math.PI * 2)) / 2;
    nightDarkness = darkness * 0.92;
  }

  // ---- Minimapa -----------------------------------------------------------
  const miniCanvas = el('minimap') as HTMLCanvasElement;
  const miniCtx = miniCanvas.getContext('2d')!;
  const MW = map.width;
  const MH = map.height;
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = MW;
  baseCanvas.height = MH;
  const baseCtx = baseCanvas.getContext('2d')!;
  let baseFloor = -1;
  function renderMinimapBase(floor: number): void {
    const layer = map.floors[floor];
    if (!layer) return;
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        const t = getTileType(layer[y * MW + x]!);
        baseCtx.fillStyle = `#${t.color.toString(16).padStart(6, '0')}`;
        baseCtx.fillRect(x, y, 1, 1);
      }
    }
    baseFloor = floor;
  }
  function drawMinimap(): void {
    if (baseFloor !== myFloor) renderMinimapBase(myFloor);
    miniCtx.imageSmoothingEnabled = false;
    miniCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
    miniCtx.drawImage(baseCanvas, 0, 0, miniCanvas.width, miniCanvas.height);
    const s = miniCanvas.width / MW;
    // Ponto do jogador (com contorno).
    miniCtx.fillStyle = '#000';
    miniCtx.fillRect(myTileX * s - 1, myTileY * s - 1, s + 2, s + 2);
    miniCtx.fillStyle = '#5fd15f';
    miniCtx.fillRect(myTileX * s, myTileY * s, s, s);
  }

  function updateHud(s: S2C_Stats): void {
    hud.level.textContent = String(s.level);
    hud.gold.textContent = String(s.gold);
    (hud.hpfill as HTMLElement).style.width = `${(s.hp / s.maxHp) * 100}%`;
    hud.hptext.textContent = `${s.hp} / ${s.maxHp}`;
    (hud.manafill as HTMLElement).style.width = `${(s.mana / s.maxMana) * 100}%`;
    hud.manatext.textContent = `${s.mana} / ${s.maxMana}`;
    (hud.xpfill as HTMLElement).style.width = `${(s.xp / s.xpNext) * 100}%`;
    hud.xptext.textContent = `XP ${s.xp} / ${s.xpNext}`;
  }

  // Resumo dos stats derivados (ataque, defesa, VELOCIDADE de movimento/ataque…).
  // Usado tanto no painel C quanto na barra lateral, dentro dos atributos.
  function derivedHtml(s: S2C_Stats): string {
    const skillName = s.skillKind === 'magic' ? 'Magic Level' : s.skillKind === 'distance' ? 'Distance' : 'Melee';
    // Maestrias de arma: só as que o jogador já começou a treinar.
    const profs = Object.entries(s.proficiencies)
      .filter(([, p]) => p.level > 0 || p.progress > 0)
      .map(([tipo, p]) => `${WEAPON_IDENTITY[tipo as WeaponType]?.name ?? tipo} <b>${p.level}</b>`)
      .join(' · ');
    return (
      `${skillName}: <b>${s.skillLevel}</b> (${s.skillProgress}/${s.skillThreshold})<br>` +
      (profs ? `Maestrias: ${profs}<br>` : '') +
      `Ataque físico: ${s.physAtk} · mágico: ${s.magicAtk}<br>` +
      `Crítico: ${(s.critChance * 100).toFixed(0)}% · Defesa: ${s.defense}<br>` +
      `Resist. mágica: ${(s.magicResist * 100).toFixed(0)}% · Esquiva: ${(s.dodgeChance * 100).toFixed(0)}%<br>` +
      `Vel. movimento: ${(1000 / s.moveIntervalMs).toFixed(1)} tiles/s · ataque: ${(1000 / s.attackCooldownMs).toFixed(2)}/s`
    );
  }

  // ---- Atributos na barra lateral (estilo Tibia) -------------------------
  // Mostra os atributos abaixo de vida/mana/exp, com um "+" para gastar os
  // pontos ganhos a cada nível e um botão +/− para expandir/recolher a lista.
  // Os stats derivados (velocidade etc.) vêm logo abaixo, na mesma seção.
  const attrPointsEl = el('attr-points');
  const attrListEl = el('attrlist');
  const sideAttrRows = new Map<
    AttributeKey,
    { val: HTMLElement; btn: HTMLButtonElement; cost: HTMLElement }
  >();
  for (const key of ATTRIBUTE_KEYS) {
    const row = document.createElement('div');
    row.className = 'arow';
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = ATTRIBUTE_INFO[key].name;
    const v = document.createElement('span');
    v.className = 'v';
    v.textContent = '0';
    // Custo crescente: o jogador precisa VER que +1 aqui está ficando caro.
    const cost = document.createElement('span');
    cost.className = 'c';
    cost.textContent = '—';
    const btn = document.createElement('button');
    btn.textContent = '+';
    btn.disabled = true;
    btn.onclick = () => net.send({ t: 'allocate', attr: key });
    row.append(n, v, cost, btn);
    attrListEl.appendChild(row);
    sideAttrRows.set(key, { val: v, btn, cost });
  }
  const attrDerivedEl = document.createElement('div');
  attrDerivedEl.id = 'attrderived';
  attrListEl.appendChild(attrDerivedEl);

  function updateAttrHud(s: S2C_Stats): void {
    attrPointsEl.textContent = String(s.unspentPoints);
    attrPointsEl.classList.toggle('has', s.unspentPoints > 0);
    for (const key of ATTRIBUTE_KEYS) {
      const r = sideAttrRows.get(key)!;
      const custo = attributeCost(s.attributes[key]);
      r.val.textContent = String(s.attributes[key]);
      r.cost.textContent = `${custo}p`;
      r.cost.classList.toggle('ok', s.unspentPoints >= custo);
      r.btn.disabled = s.unspentPoints < custo;
      r.btn.title = `+1 ${ATTRIBUTE_INFO[key].name} custa ${custo} pontos`;
    }
    attrDerivedEl.innerHTML = derivedHtml(s);
  }

  // Painel de personagem (tecla C): atributos + alocação de pontos.
  const cpEl = el('charpanel');
  const cpSummary = el('cp-summary');
  const cpAttrs = el('cp-attrs');
  const cpDerived = el('derived');
  const attrRows = new Map<AttributeKey, { val: HTMLElement; btn: HTMLButtonElement }>();
  for (const key of ATTRIBUTE_KEYS) {
    const info = ATTRIBUTE_INFO[key];
    const row = document.createElement('div');
    row.className = 'attrrow';
    const val = document.createElement('span');
    val.className = 'av';
    val.textContent = '0';
    const btn = document.createElement('button');
    btn.textContent = '+';
    btn.disabled = true;
    btn.onclick = () => net.send({ t: 'allocate', attr: key });
    const nm = document.createElement('span');
    nm.className = 'an';
    nm.textContent = info.name;
    const eff = document.createElement('small');
    eff.textContent = info.effects;
    row.append(nm, val, btn, eff);
    cpAttrs.appendChild(row);
    attrRows.set(key, { val, btn });
  }
  el('cp-close').onclick = () => (cpEl.style.display = 'none');

  function updateCharPanel(s: S2C_Stats): void {
    const clsName = CLASSES[s.charClass].name;
    cpSummary.innerHTML =
      `<b>${clsName}</b> · Nível ${s.level}<br>` +
      `Pontos de atributo: <b style="color:${s.unspentPoints > 0 ? '#8fe08f' : '#a89f8f'}">${s.unspentPoints}</b>` +
      ` · Talentos: ${s.talentPoints}`;
    for (const key of ATTRIBUTE_KEYS) {
      const r = attrRows.get(key)!;
      const custo = attributeCost(s.attributes[key]);
      r.val.textContent = String(s.attributes[key]);
      r.btn.disabled = s.unspentPoints < custo;
      r.btn.title = `+1 custa ${custo} pontos`;
    }
    cpDerived.innerHTML = derivedHtml(s);
  }

  // ---- Barra de habilidades flutuante (estilo Ragnarok) -------------------
  // Uma linha de quadrados atalhados em F1, F2, … Cada quadrado é uma skill.
  // A barra flutua sobre o mundo e pode ser arrastada pelo "pegador" da esquerda
  // (a posição fica salva no navegador).
  const spellBarEl = el('spellbar');
  const spellGripEl = el('spellgrip');
  interface SpellSlot {
    id: SkillId;
    cell: HTMLElement;
    cd: HTMLElement;
    cdText: HTMLElement;
    lvl: HTMLElement;
    tip: HTMLElement;
  }
  const spellSlots = new Map<SkillId, SpellSlot>();
  /** Fim do cooldown (performance.now) e duração, por habilidade. */
  const spellCooldowns = new Map<SkillId, { until: number; dur: number }>();
  let skillLevels: Record<string, number> = {};
  let currentMana = 0;
  /** Maestrias de arma, para o tooltip do item mostrar a sua. */
  let myProficiencies: Record<string, { level: number; progress: number }> = {};

  SKILL_BAR.forEach((id, i) => {
    const key = `F${i + 1}`;
    const cell = document.createElement('div');
    cell.className = id ? 'sslot' : 'sslot free';
    const label = document.createElement('span');
    label.className = 'sk';
    label.textContent = key;
    cell.appendChild(label);
    if (id) {
      const def = SKILLS[id];
      const img = document.createElement('img');
      img.src = spellIconUrl(id);
      img.alt = def.name;
      const lock = document.createElement('span');
      lock.className = 'lock';
      lock.textContent = '🔒';
      const cd = document.createElement('span');
      cd.className = 'cd';
      const cdText = document.createElement('span');
      cdText.className = 'cdt';
      // Nível da habilidade no canto — é o dado que mais muda com a build.
      const lvl = document.createElement('span');
      lvl.className = 'lv';
      const tip = document.createElement('span');
      tip.className = 'tip';
      cell.append(img, lock, cd, cdText, lvl, tip);
      cell.onclick = () => castSpellId(id);
      spellSlots.set(id, { id, cell, cd, cdText, lvl, tip });
    }
    spellBarEl.appendChild(cell);
  });

  /** Texto do tooltip com os números REAIS do nível atual da habilidade. */
  function skillTipHtml(id: SkillId, nivel: number, tecla: string): string {
    const def = SKILLS[id];
    const efetivo = Math.max(1, nivel);
    const alvo = def.shape === 'self'
      ? 'Em você mesmo'
      : def.shape === 'area'
        ? `Área · raio ${skillRange(def, efetivo)}`
        : `Alvo único · alcance ${skillRange(def, efetivo)}`;
    const req: string[] = [];
    if (def.reqLevel > 1) req.push(`nível ${def.reqLevel}`);
    for (const r of def.requires ?? []) req.push(`${SKILLS[r.skill].name} Lv.${r.level}`);
    const cabecalho = nivel > 0
      ? `<b>${def.name}</b> Lv.${nivel}/${MAX_SKILL_LEVEL} · ${tecla}`
      : `<b>${def.name}</b> · ${tecla} <span class="req">(não aprendida)</span>`;

    // Cada tipo mostra o número que importa para ELE — mostrar "Dano 0%" numa
    // Postura Defensiva não ajudaria ninguém.
    let efeito: string;
    if (def.kind === 'fury') {
      const f = furyStats(efetivo);
      efeito =
        `Vida ×${f.hpMult.toFixed(1)} · Dano +${(f.damageBonus * 100).toFixed(0)}%<br>` +
        `Ataque +${(f.attackSpeedBonus * 100).toFixed(0)}% · ` +
        `<span class="req">Dano recebido +${(f.damageTakenBonus * 100).toFixed(0)}%</span><br>` +
        `<span class="req">Drena ${(f.drainPerSecond * 100).toFixed(2)}% da vida por segundo — não dá para cancelar</span>`;
    } else if (def.kind === 'stance') {
      efeito =
        `Dano recebido −${(stanceDamageReduction(efetivo) * 100).toFixed(0)}%<br>` +
        `<span class="req">Seu dano −${(stanceDamagePenalty(efetivo) * 100).toFixed(0)}% · ` +
        `movimento −${(STANCE_SLOW * 100).toFixed(0)}%</span>`;
    } else if (def.kind === 'taunt') {
      efeito = 'Puxa o aggro da criatura para você';
    } else if (def.kind === 'rupture') {
      efeito =
        `Dano ${(skillPower(def, efetivo) * 100).toFixed(0)}% · ` +
        `abre −${(ruptureDefReduction(efetivo) * 100).toFixed(0)}% da defesa por ` +
        `${(def.durationMs / 1000).toFixed(0)}s`;
    } else if (def.kind === 'execution') {
      efeito =
        `Dano ${(skillPower(def, efetivo) * 100).toFixed(0)}% · ` +
        `até ×${executionMultiplier(efetivo, 0).toFixed(1)} contra alvo quase morto`;
    } else {
      efeito = `Dano ${(skillPower(def, efetivo) * 100).toFixed(0)}%`;
    }

    const custo = skillManaCost(def, efetivo);
    return (
      `${cabecalho}<br>${escapeHtml(def.desc)}<br>` +
      `${alvo}<br>${efeito}<br>` +
      `${custo > 0 ? `Mana ${custo} · ` : ''}Recarga ${(def.cooldownMs / 1000).toFixed(1)}s<br>` +
      (req.length ? `<span class="req">Requer ${req.join(' · ')}</span>` : '')
    );
  }

  // Posição arrastável, lembrada entre sessões.
  const SPELLBAR_POS_KEY = 'elysia.spellbar.pos';
  const applyBarPos = (left: number, top: number): void => {
    const w = spellBarEl.offsetWidth || 300;
    const h = spellBarEl.offsetHeight || 56;
    spellBarEl.style.left = `${Math.max(0, Math.min(window.innerWidth - w, left))}px`;
    spellBarEl.style.top = `${Math.max(0, Math.min(window.innerHeight - h, top))}px`;
    spellBarEl.style.bottom = 'auto';
    spellBarEl.style.transform = 'none';
  };
  try {
    const saved = JSON.parse(localStorage.getItem(SPELLBAR_POS_KEY) ?? 'null') as
      | { left: number; top: number }
      | null;
    if (saved) applyBarPos(saved.left, saved.top);
  } catch { /* posição inválida — mantém o padrão (centro embaixo) */ }

  let barDrag: { dx: number; dy: number } | null = null;
  spellGripEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const r = spellBarEl.getBoundingClientRect();
    barDrag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    spellBarEl.classList.add('dragging');
    e.preventDefault();
  });
  document.addEventListener('pointermove', (e) => {
    if (!barDrag) return;
    applyBarPos(e.clientX - barDrag.dx, e.clientY - barDrag.dy);
  });
  document.addEventListener('pointerup', () => {
    if (!barDrag) return;
    barDrag = null;
    spellBarEl.classList.remove('dragging');
    const r = spellBarEl.getBoundingClientRect();
    localStorage.setItem(SPELLBAR_POS_KEY, JSON.stringify({ left: r.left, top: r.top }));
  });

  /** Manda a intenção de usar. Quem valida (mana/cooldown/alvo) é o servidor. */
  function castSpellId(id: SkillId): void {
    if ((skillLevels[id] ?? 0) <= 0) {
      logChat(`Você ainda não aprendeu <b>${SKILLS[id].name}</b> — abra as Skills (tecla K).`, 'sys');
      return;
    }
    net.send({ t: 'cast', spell: id });
  }

  /** Repinta os slots (nível, sem mana, não aprendida) a cada S2C_Stats. */
  function updateSpellBar(s: S2C_Stats): void {
    skillLevels = s.skillLevels;
    currentMana = s.mana;
    myProficiencies = s.proficiencies;
    // A barra só existe para quem tem alguma habilidade na classe.
    const usable = SKILL_BAR.some((id) => id && SKILLS[id].classes.includes(s.charClass));
    spellBarEl.style.display = usable ? 'flex' : 'none';
    for (const [id, slot] of spellSlots) {
      const nivel = skillLevels[id] ?? 0;
      const naoAprendida = nivel <= 0;
      slot.cell.classList.toggle('locked', naoAprendida);
      slot.cell.classList.toggle(
        'nomana',
        !naoAprendida && currentMana < skillManaCost(SKILLS[id], nivel),
      );
      slot.lvl.textContent = naoAprendida ? '' : String(nivel);
      // Fúria e Postura ficam ACESAS enquanto estão em efeito.
      const ligada =
        (id === 'battle_fury' && s.furyActive) || (id === 'defensive_stance' && s.stanceActive);
      slot.cell.classList.toggle('active', ligada);
      const tecla = `F${SKILL_BAR.indexOf(id) + 1}`;
      slot.tip.innerHTML = skillTipHtml(id, nivel, tecla);
    }
  }

  /** Anima o cooldown do slot: setor escuro girando + segundos restantes. */
  function tickSpellCooldowns(now: number): void {
    for (const [id, slot] of spellSlots) {
      const cd = spellCooldowns.get(id);
      if (!cd) continue;
      const left = cd.until - now;
      if (left <= 0) {
        spellCooldowns.delete(id);
        slot.cell.classList.remove('cooling');
        continue;
      }
      const frac = left / cd.dur; // 1 -> 0
      slot.cd.style.background =
        `conic-gradient(rgba(6,8,14,0.72) ${frac * 360}deg, transparent 0deg)`;
      // Abaixo de 1s mostra uma casa decimal (0.4), acima só o inteiro (3).
      slot.cdText.textContent = (left / 1000).toFixed(left < 1000 ? 1 : 0);
    }
  }

  function onCastAccepted(id: SkillId, cooldownMs: number): void {
    const slot = spellSlots.get(id);
    if (!slot) return;
    spellCooldowns.set(id, { until: performance.now() + cooldownMs, dur: cooldownMs });
    slot.cell.classList.add('cooling', 'cast');
    setTimeout(() => slot.cell.classList.remove('cast'), 400);
  }

  // ---- Painel de habilidades (tecla K) ------------------------------------
  // A árvore: cada habilidade mostra o nível atual, o custo do próximo ponto e,
  // quando travada, POR QUE está travada (nível, pré-requisito ou pontos).
  const skPanelEl = el('skillpanel');
  const skListEl = el('sp-list');
  const skPointsEl = el('sp-points');
  const skResetBtn = el('sp-reset') as HTMLButtonElement;
  const skResetInfo = el('sp-resetinfo');
  el('sp-close').onclick = () => (skPanelEl.style.display = 'none');
  skResetBtn.onclick = () => net.send({ t: 'skillreset' });

  interface SkillRow {
    row: HTMLElement;
    lv: HTMLElement;
    btn: HTMLButtonElement;
    why: HTMLElement;
    bar: HTMLElement[];
  }
  const skillRows = new Map<SkillId, SkillRow>();

  function buildSkillPanel(cls: S2C_Stats['charClass']): void {
    skListEl.textContent = '';
    skillRows.clear();
    for (const id of SKILL_BAR) {
      if (!id) continue;
      const def = SKILLS[id];
      if (!def.classes.includes(cls)) continue;
      const row = document.createElement('div');
      row.className = 'skrow';

      const top = document.createElement('div');
      top.className = 'top';
      const img = document.createElement('img');
      img.src = spellIconUrl(id);
      const nm = document.createElement('span');
      nm.className = 'nm';
      nm.textContent = def.name;
      const lv = document.createElement('span');
      lv.className = 'lv';
      const btn = document.createElement('button');
      btn.textContent = '+';
      btn.onclick = () => net.send({ t: 'skillup', skill: id });
      top.append(img, nm, lv, btn);

      const dsc = document.createElement('div');
      dsc.className = 'dsc';
      dsc.textContent = def.desc;

      // Dez tracinhos = os dez níveis possíveis da habilidade.
      const bar = document.createElement('div');
      bar.className = 'skbar';
      const pips: HTMLElement[] = [];
      for (let i = 0; i < MAX_SKILL_LEVEL; i++) {
        const pip = document.createElement('i');
        bar.appendChild(pip);
        pips.push(pip);
      }

      const why = document.createElement('div');
      why.className = 'why';

      row.append(top, dsc, bar, why);
      skListEl.appendChild(row);
      skillRows.set(id, { row, lv, btn, why, bar: pips });
    }
  }

  function updateSkillPanel(s: S2C_Stats): void {
    if (skillRows.size === 0) buildSkillPanel(s.charClass);
    skPointsEl.textContent = String(s.skillPoints);
    for (const [id, r] of skillRows) {
      const def = SKILLS[id];
      const nivel = s.skillLevels[id] ?? 0;
      const noMaximo = nivel >= MAX_SKILL_LEVEL;
      const custo = noMaximo ? 0 : skillUpgradeCost(nivel);
      r.lv.textContent = noMaximo ? 'MAX' : `Lv.${nivel} → ${custo} SP`;
      r.row.classList.toggle('locked', nivel <= 0);
      for (let i = 0; i < r.bar.length; i++) r.bar[i]!.classList.toggle('on', i < nivel);

      // Espelha a mesma regra do servidor para explicar o bloqueio na hora.
      const faltaNivel = s.level < def.reqLevel;
      const faltaPreReq = (def.requires ?? []).find(
        (req) => (s.skillLevels[req.skill] ?? 0) < req.level,
      );
      const faltaPontos = !noMaximo && s.skillPoints < custo;
      r.btn.disabled = noMaximo || faltaNivel || !!faltaPreReq || faltaPontos;
      r.why.textContent = noMaximo
        ? ''
        : faltaNivel
          ? `Requer nível ${def.reqLevel} (você tem ${s.level}).`
          : faltaPreReq
            ? `Requer ${SKILLS[faltaPreReq.skill].name} Lv.${faltaPreReq.level}.`
            : faltaPontos
              ? `Faltam ${custo - s.skillPoints} Skill Points.`
              : '';
    }
    const custoReset = s.skillResets < 3 ? [500, 5000, 25000][s.skillResets]! : 100000;
    skResetInfo.textContent = `Custa ${custoReset} de ouro (${s.skillResets}º reset feito).`;
    skResetBtn.disabled = s.gold < custoReset;
  }

  // ---- Bestiário (tecla B) ------------------------------------------------
  // Cada criatura revela a ficha aos poucos: quanto mais você caça, mais sabe.
  // Chefe é diferente — a primeira morte já entrega metade, porque exigir
  // centenas de abates de algo raro não faria sentido.
  const bestPanel = el('bestiary');
  const bestList = el('best-list');
  el('best-close').onclick = () => (bestPanel.style.display = 'none');

  function updateBestiary(s: S2C_Stats): void {
    const entradas = Object.entries(s.bestiary)
      .filter(([, e]) => e.encountered)
      .sort((a, b) => b[1].kills - a[1].kills);
    bestList.textContent = '';
    if (entradas.length === 0) {
      const vazio = document.createElement('div');
      vazio.className = 'hint';
      vazio.textContent = 'Nenhuma criatura encontrada ainda.';
      bestList.appendChild(vazio);
      return;
    }
    for (const [tipo, e] of entradas) {
      const def = CREATURES[tipo];
      if (!def) continue;
      const boss = !!def.boss;
      const pct = bestiaryPercent(e.kills, boss);
      const tier = bestiaryTier(e.kills, boss);

      const row = document.createElement('div');
      row.className = 'brow2';
      const top = document.createElement('div');
      top.className = 'top';
      const img = document.createElement('img');
      img.src = creatureIconUrl(tipo);
      const nm = document.createElement('span');
      nm.className = 'nm';
      nm.textContent = def.name;
      const pc = document.createElement('span');
      pc.className = 'pc';
      pc.textContent = `${pct}%`;
      top.append(img, nm, pc);

      // Cada patamar libera um bloco de informação. O que ainda não foi
      // revelado aparece como "???" — é o incentivo para continuar caçando.
      const kn = document.createElement('div');
      kn.className = 'kn';
      const linhas: string[] = [`Abates: ${e.kills}`];
      linhas.push(tier >= 1 ? `Vida ${def.maxHp} · XP ${def.xpReward}` : '??? vida e experiência');
      linhas.push(tier >= 2 ? `Ataque ${def.strength} · Defesa ${def.defense}` : '??? ataque e defesa');
      linhas.push(
        tier >= 3
          ? `${BEHAVIOR_LABEL[def.behavior ?? 'hostile']} · ouro ${def.goldMin}–${def.goldMax}`
          : '??? comportamento e loot',
      );
      if (tier >= 4) linhas.push(`Alcance de aggro ${def.aggroRange} tiles · ficha completa`);
      if (e.variants.length > 1) linhas.push(`Variantes vistas: ${e.variants.length}`);
      kn.innerHTML = linhas
        .map((l) => (l.startsWith('???') ? `<span class="locked">${l}</span>` : l))
        .join('<br>');

      const bar = document.createElement('div');
      bar.className = 'bestbar';
      const fill = document.createElement('i');
      fill.style.width = `${pct}%`;
      bar.appendChild(fill);

      row.append(top, kn, bar);
      bestList.appendChild(row);
    }
  }

  function syncEntities(entities: EntitySnapshot[]): void {
    const seen = new Set<string>();
    for (const e of entities) {
      seen.add(e.id);
      const isSelf = e.id === myId;
      let view = sprites.get(e.id);
      if (!view) {
        view = makeEntity(e, isSelf, isSelf ? selfTex : otherTex, anims, setTarget, {
          classAnims, slimeAnim, slimeVariants, zombieAnim, zombieIdleAnim, knightArt, npcAnim,
          selfClass: charClass, selfGender: gender, openShop, openCorpse,
        });
        sprites.set(e.id, view);
        objects.addChild(view.container);
      }
      // Define o destino (o servidor manda a posição real; nós deslizamos até ela).
      view.setTarget(e.tileX * TS, e.tileY * TS);
      view.setDirection(e.direction);
      view.setHp(e.hp, e.maxHp);
      // Ícones de condição (Etapa 8). Criados sob demanda: a esmagadora maioria
      // das entidades nunca tem condição alguma, e criar a fita para todas seria
      // um Container e um Graphics por sprite à toa.
      let strip = condStrips.get(e.id);
      if (!strip && e.conditions?.length) {
        strip = makeConditionStrip();
        condStrips.set(e.id, strip);
        view.container.addChild(strip.node);
      }
      strip?.set(e.conditions);
      if (isSelf) {
        myFloor = e.floor;
        myTileX = e.tileX;
        myTileY = e.tileY;
        coordsEl.textContent = `Posição: (${e.tileX}, ${e.tileY}) — andar ${e.floor}`;
      }
    }
    for (const [id, view] of sprites) {
      if (!seen.has(id)) {
        if (id === targetId) {
          targetId = null;
          targetRing.visible = false;
        }
        view.container.destroy();
        sprites.delete(id);
        // A fita morre junto: o destroy do container já leva o nó, mas deixar a
        // entrada no mapa vazaria memória em servidor de vida longa.
        condStrips.delete(id);
      }
    }
  }

  // ---- Battle list (estilo Tibia) ----------------------------------------
  // Lista só os monstros DENTRO DO ALCANCE (attackRange + margem de aproximação),
  // ordenados por distância (mais perto primeiro). Clicar numa linha vira o alvo.
  const BATTLE_RANGE_MARGIN = 2; // tiles a mais que o attackRange (aproximação).
  const battleListEl = el('battlelist');
  battleListEl.addEventListener('click', (ev) => {
    const row = (ev.target as HTMLElement).closest('.brow') as HTMLElement | null;
    if (row?.dataset.id) setTarget(row.dataset.id);
  });

  let lastBattleSig = '';
  function updateBattleList(entities: EntitySnapshot[]): void {
    const me = entities.find((e) => e.id === myId);
    const cx = me ? me.tileX : map.spawn.x;
    const cy = me ? me.tileY : map.spawn.y;
    const reach = myAttackRange + BATTLE_RANGE_MARGIN;
    const mobs = entities
      .filter((e) => e.kind === 'creature')
      .map((e) => ({ e, d: Math.max(Math.abs(e.tileX - cx), Math.abs(e.tileY - cy)) }))
      .filter((m) => m.d <= reach)
      .sort((a, b) => a.d - b.d || a.e.id.localeCompare(b.e.id));

    // Só redesenha quando algo visível muda (evita churn a 15Hz).
    const sig = mobs.map((m) => `${m.e.id}:${m.d}:${m.e.hp}:${m.e.id === targetId ? 1 : 0}`).join('|');
    if (sig === lastBattleSig) return;
    lastBattleSig = sig;

    battleListEl.textContent = '';
    if (mobs.length === 0) {
      const empty = document.createElement('div');
      empty.id = 'battle-empty';
      empty.textContent = 'Nenhum monstro por perto';
      battleListEl.appendChild(empty);
      return;
    }
    for (const { e, d } of mobs) {
      const row = document.createElement('div');
      row.className = e.id === targetId ? 'brow tgt' : 'brow';
      row.dataset.id = e.id;
      const icon = document.createElement('img');
      icon.className = 'bi';
      icon.src = creatureIconUrl(e.creatureType);
      icon.alt = '';
      const name = document.createElement('span');
      name.className = 'bn';
      name.textContent = e.name;
      const bar = document.createElement('span');
      bar.className = 'bhp';
      const fill = document.createElement('i');
      const r = e.maxHp && e.hp !== undefined ? Math.max(0, Math.min(1, e.hp / e.maxHp)) : 1;
      fill.style.width = `${r * 100}%`;
      fill.style.background = r > 0.5 ? '#5fbf5f' : r > 0.25 ? '#d0b040' : '#c0473f';
      bar.appendChild(fill);
      const dist = document.createElement('span');
      dist.className = 'bd';
      dist.textContent = String(d);
      row.append(icon, name, bar, dist);
      battleListEl.appendChild(row);
    }
  }

  // Input ------------------------------------------------------------------
  // Usamos ev.code (tecla física) em vez de ev.key: evita divergência entre
  // keydown/keyup por causa de Shift/CapsLock/layout, que "prendia" a tecla.
  const heldKeys = new Set<string>();
  let lastSentAt = 0;
  // Cada tecla vira um vetor (dx, dy). Segurar uma horizontal + uma vertical
  // resulta em passo DIAGONAL (estilo Tibia). O numpad também dá diagonal direto.
  const CODE_TO_VEC: Record<string, { dx: number; dy: number }> = {
    ArrowUp: { dx: 0, dy: -1 }, ArrowDown: { dx: 0, dy: 1 },
    ArrowLeft: { dx: -1, dy: 0 }, ArrowRight: { dx: 1, dy: 0 },
    KeyW: { dx: 0, dy: -1 }, KeyS: { dx: 0, dy: 1 },
    KeyA: { dx: -1, dy: 0 }, KeyD: { dx: 1, dy: 0 },
    Numpad8: { dx: 0, dy: -1 }, Numpad2: { dx: 0, dy: 1 },
    Numpad4: { dx: -1, dy: 0 }, Numpad6: { dx: 1, dy: 0 },
    Numpad7: { dx: -1, dy: -1 }, Numpad9: { dx: 1, dy: -1 },
    Numpad1: { dx: -1, dy: 1 }, Numpad3: { dx: 1, dy: 1 },
  };

  // Solta todas as teclas quando a janela perde foco / aba fica oculta / chat
  // abre. Sem isto, um keyup perdido (alt-tab) trava o personagem andando.
  const releaseAllKeys = (): void => heldKeys.clear();
  window.addEventListener('blur', releaseAllKeys);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseAllKeys();
  });

  window.addEventListener('keydown', (ev) => {
    if (document.activeElement === chatInputEl) return;
    if (ev.code in CODE_TO_VEC) {
      heldKeys.add(ev.code);
      ev.preventDefault();
    }
    if (ev.key === 'Enter' && document.activeElement !== chatInputEl) {
      releaseAllKeys(); // para de andar ao abrir o chat
      chatInputEl.focus();
      ev.preventDefault();
    }
    if (ev.key === 'Escape') clearTarget();
    if (ev.code === 'KeyC') cpEl.style.display = cpEl.style.display === 'block' ? 'none' : 'block';
    if (ev.code === 'KeyK') {
      skPanelEl.style.display = skPanelEl.style.display === 'block' ? 'none' : 'block';
    }
    if (ev.code === 'KeyB') {
      bestPanel.style.display = bestPanel.style.display === 'block' ? 'none' : 'block';
    }
    // Atalhos da barra de habilidades: F1..F6 conforme SKILL_BAR.
    const fn = /^F([1-9])$/.exec(ev.code);
    if (fn) {
      const id = SKILL_BAR[Number(fn[1]) - 1];
      if (id) {
        castSpellId(id);
        ev.preventDefault(); // F1 abriria a ajuda do navegador
      }
    }
  });
  window.addEventListener('keyup', (ev) => heldKeys.delete(ev.code));

  chatInputEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      const text = chatInputEl.value.trim();
      if (text) net.send({ t: 'chat', text });
      chatInputEl.value = '';
      chatInputEl.blur();
    } else if (ev.key === 'Escape') {
      chatInputEl.blur();
    }
    ev.stopPropagation();
  });

  // Loop de render ---------------------------------------------------------
  app.ticker.add(() => {
    if (myFloor !== renderedFloor) rebuildFloor(myFloor);

    const now = performance.now();
    if (now - lastSentAt > 120 && heldKeys.size > 0) {
      let dx = 0;
      let dy = 0;
      for (const code of heldKeys) {
        const v = CODE_TO_VEC[code];
        if (v) { dx += v.dx; dy += v.dy; }
      }
      dx = Math.sign(dx); // opostos se cancelam; sobra -1/0/1
      dy = Math.sign(dy);
      if (dx !== 0 || dy !== 0) {
        moveSeq++;
        net.send({ t: 'move', seq: moveSeq, dx, dy });
        lastSentAt = now;
      }
    }

    // Interpolação + animação de caminhada de todas as entidades.
    for (const view of sprites.values()) view.update();

    // Anel de alvo sob o inimigo selecionado.
    const tgt = targetId ? sprites.get(targetId) : undefined;
    if (tgt) {
      targetRing.visible = true;
      targetRing.x = tgt.container.x;
      targetRing.y = tgt.container.y;
      targetRing.zIndex = tgt.container.zIndex - 0.01;
    } else {
      targetRing.visible = false;
    }

    // Números de dano flutuantes (sobem e desaparecem).
    const dt = app.ticker.deltaMS;
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i]!;
      f.life -= dt;
      f.node.y -= dt * 0.03;
      f.node.alpha = Math.max(0, f.life / f.max);
      if (f.life <= 0) {
        f.node.destroy();
        floaters.splice(i, 1);
      }
    }

    // Efeitos de magia: o Vendaval gira e se abre; o corte do Dash estica e some.
    for (let i = spellFx.length - 1; i >= 0; i--) {
      const f = spellFx[i]!;
      f.t += dt;
      const r = Math.min(1, f.t / f.dur);
      if (f.kind === 'bash') {
        f.node.scale.set(0.35 + r * 0.75);
        f.node.rotation = r * Math.PI * 1.4;
      } else if (f.kind === 'taunt' || f.kind === 'stance') {
        // Ondas/cúpula: abrem para fora sem girar.
        f.node.scale.set(0.4 + r * 1.1);
      } else if (f.kind === 'fury') {
        // Labaredas sobem e se afastam do corpo.
        f.node.scale.set(0.5 + r * 0.7);
        f.node.y -= dt * 0.02;
      } else {
        f.node.scale.set(0.6 + r * 0.9);
        f.node.rotation = r * 0.5;
      }
      f.node.alpha = 1 - r * r;
      if (r >= 1) {
        f.node.destroy({ children: true });
        spellFx.splice(i, 1);
      }
    }

    // Cooldown dos atalhos de magia (setor escuro + contagem regressiva).
    tickSpellCooldowns(now);

    // Projéteis (flechas/feitiços) voando até o alvo.
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]!;
      p.t += dt;
      const r = Math.min(1, p.t / p.dur);
      p.node.x = p.fromX + (p.toX - p.fromX) * r;
      p.node.y = p.fromY + (p.toY - p.fromY) * r;
      p.node.rotation = Math.atan2(p.toY - p.fromY, p.toX - p.fromX);
      p.node.zIndex = 9999;
      if (r >= 1) {
        p.node.destroy();
        projectiles.splice(i, 1);
      }
    }

    // Câmera: centraliza o herói local usando sua posição já suavizada.
    const self = myId ? sprites.get(myId) : undefined;
    const cx = self ? self.container.x : map.spawn.x * TS;
    const cy = self ? self.container.y : map.spawn.y * TS;
    const targetX = app.screen.width / 2 - (cx + TS / 2) * ZOOM;
    const targetY = app.screen.height / 2 - (cy + TS / 2) * ZOOM;
    world.x += (targetX - world.x) * 0.2;
    world.y += (targetY - world.y) * 0.2;

    // Overlay de noite: escurece a tela com um buraco de luz seguindo o herói.
    if (nightDarkness <= 0.02) {
      nightOverlay.visible = false;
    } else {
      nightOverlay.visible = true;
      const W = Math.max(2, Math.ceil(app.screen.width));
      const H = Math.max(2, Math.ceil(app.screen.height));
      if (nightCanvas.width !== W || nightCanvas.height !== H) {
        nightCanvas.width = W;
        nightCanvas.height = H;
        // Recria a textura no novo tamanho (evita clipping ao redimensionar).
        nightTexture.destroy();
        nightTexture = Texture.from(nightCanvas);
        nightOverlay.texture = nightTexture;
      }
      // Escuridão sólida.
      nightCtx.globalCompositeOperation = 'source-over';
      nightCtx.clearRect(0, 0, W, H);
      nightCtx.fillStyle = `rgba(5,7,15,${nightDarkness})`;
      nightCtx.fillRect(0, 0, W, H);
      // Buraco de luz na posição do herói (mundo + câmera). Sem tocha a luz é
      // MUITO fraca (~10%) e o raio pequeno; com Tocha fica bem mais clara e
      // maior. Gradiente começa no centro (0) e desvanece até 0 na borda, sem
      // núcleo chapado -> bordas beeem suaves (nada de "lanterna").
      const px = world.x + (cx + TS / 2) * ZOOM;
      const py = world.y + (cy + TS / 2) * ZOOM;
      const hasTorch = !!currentInv?.backpack.some((s) => s?.kind === 'torch');
      const strength = hasTorch ? 0.75 : 0.1; // quanto da escuridão a luz remove
      const R = TS * ZOOM * (hasTorch ? 6 : 3.2); // raio em px de tela (escala c/ zoom)
      nightCtx.globalCompositeOperation = 'destination-out';
      const grad = nightCtx.createRadialGradient(px, py, 0, px, py, R);
      grad.addColorStop(0.0, `rgba(0,0,0,${strength})`);
      grad.addColorStop(0.4, `rgba(0,0,0,${strength * 0.55})`);
      grad.addColorStop(0.72, `rgba(0,0,0,${strength * 0.2})`);
      grad.addColorStop(1.0, 'rgba(0,0,0,0)');
      nightCtx.fillStyle = grad;
      nightCtx.fillRect(px - R, py - R, R * 2, R * 2);
      nightCtx.globalCompositeOperation = 'source-over';
      nightTexture.source.update();
    }
  });
}

// ---- Entidades (jogador / criatura / item) ---------------------------------
interface EntityView {
  container: Container;
  setDirection: (dir: Direction) => void;
  setTarget: (x: number, y: number) => void;
  setHp: (hp?: number, maxHp?: number) => void;
  update: () => void;
  /** Toca a animação de ataque uma vez (atores com sprite animado). */
  playAttack?: () => void;
  /** Toca a animação de dano uma vez. */
  playHurt?: () => void;
}

/** Barra de vida flutuante sobre uma entidade. */
function makeHpBar(): { node: Container; set: (hp?: number, maxHp?: number) => void } {
  const W = TS * 0.8;
  const H = 4;
  const node = new Container();
  node.x = (TS - W) / 2;
  node.y = -8;
  const bg = new Graphics();
  bg.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
  const fg = new Graphics();
  node.addChild(bg, fg);
  function set(hp?: number, maxHp?: number): void {
    if (hp === undefined || maxHp === undefined || maxHp <= 0) {
      node.visible = false;
      return;
    }
    node.visible = true;
    const r = Math.max(0, Math.min(1, hp / maxHp));
    const col = r > 0.5 ? 0x5fbf5f : r > 0.25 ? 0xd0b040 : 0xc0473f;
    fg.clear();
    fg.rect(0, 0, W * r, H).fill(col);
  }
  return { node, set };
}

/**
 * Fita de ícones de condição, logo acima da barra de vida.
 *
 * Sem arte ainda: cada condição é um quadradinho na sua cor (`CONDITION_COLORS`),
 * com borda preta para destacar contra o cenário. Quando houver ícones
 * desenhados, só o miolo do `set` muda — a posição e a lógica de sincronia
 * continuam valendo.
 *
 * Fica anexada ao container da entidade em `syncEntities`, e não dentro das
 * fábricas de sprite: são quatro fábricas diferentes (jogador, criatura, item,
 * NPC) e nenhuma delas precisa saber que condições existem.
 */
function makeConditionStrip(): { node: Container; set: (ids?: ConditionId[]) => void } {
  const S = 5; // lado do quadradinho
  const GAP = 1;
  const node = new Container();
  const g = new Graphics();
  node.addChild(g);
  let anterior = '';

  function set(ids?: ConditionId[]): void {
    const lista = ids ?? [];
    // Redesenhar a cada tique seria desperdício: o normal é a lista não mudar.
    const chave = lista.join(',');
    if (chave === anterior) return;
    anterior = chave;

    g.clear();
    node.visible = lista.length > 0;
    if (lista.length === 0) return;

    const largura = lista.length * S + (lista.length - 1) * GAP;
    // Centraliza sobre o tile e senta acima da barra de vida (que fica em y=-8).
    node.x = (TS - largura) / 2;
    node.y = -15;
    lista.forEach((id, i) => {
      const x = i * (S + GAP);
      g.rect(x - 0.5, -0.5, S + 1, S + 1).fill({ color: 0x000000, alpha: 0.8 });
      g.rect(x, 0, S, S).fill(CONDITION_COLORS[id] ?? 0xffffff);
    });
  }

  set();
  return { node, set };
}

/**
 * Salto de até quantos tiles ainda conta como MOVIMENTO (e desliza) em vez de
 * teleporte (e pisca). A Investida alcança 5; acima de 8 é troca de andar,
 * renascimento ou correção de posição — aí piscar é o certo.
 */
const DASH_MAX_TILES = 8;

/**
 * Duração do deslize por tile percorrido. A 90 ms/tile, uma Investida de 5
 * tiles leva ~450 ms: dá para VER o personagem atravessar, que é o ponto.
 * Menos que isso volta a parecer teleporte.
 */
const DASH_MS_PER_TILE = 90;

/**
 * Acima disto o intervalo entre dois passos não é cadência nenhuma — é o ator
 * simplesmente parado. Nem a criatura mais lenta do jogo (Zumbi, 2000 ms) chega
 * perto.
 */
const STEP_MS_CEILING = 2500;

/**
 * Quanto a cadência pode PIORAR de um passo para o outro (+12 %).
 *
 * 🔴 É isto que conserta o bug de "fico lentíssimo andando logo depois de
 * atacar". A duração do deslize é aprendida de `agora − último passo`, e essa
 * medida inclui o tempo PARADO: quem ataca, ou mata o alvo e fica um instante
 * sem andar, media 1–2 s no primeiro passo seguinte e adotava isso como cadência
 * — o personagem passava a rastejar um tile por segundo até o passo seguinte.
 *
 * Ficar mais RÁPIDO é sempre plausível (buff, item de velocidade) e entra na
 * hora. Ficar mais LENTO é ambíguo: pode ser Postura Defensiva ou condição
 * Lentidão de verdade, mas pode ser só pausa — e as duas são indistinguíveis num
 * único passo. Então a piora entra por rampa: uma pausa isolada mal move a
 * agulha, e uma lentidão real, porque se repete a cada passo, é alcançada em
 * poucos passos.
 */
const STEP_MS_SLOWER_RAMP = 1.12;

/**
 * Chute inicial da cadência de um JOGADOR, e ele é **pesado de propósito**.
 *
 * O servidor calcula `moveIntervalMs = max(150, 480 − agi×5)`, então 480 é o mais
 * LENTO que um personagem consegue ser. Como acelerar entra na hora e desacelerar
 * entra por rampa (`STEP_MS_SLOWER_RAMP`), começar pelo pior caso faz o primeiro
 * passo real ser adotado **exato**, sem rampa nenhuma. Começar otimista (250)
 * daria o contrário: alguns segundos de passo engasgado até a rampa alcançar.
 */
const PLAYER_STEP_MS_SEED = 480;

/**
 * Cadência de passo aprendida do servidor, para o deslize durar exatamente o
 * intervalo entre um passo e o próximo (sem isso o sprite ou patina, ou salta o
 * tile e congela).
 *
 * Serve para quem o cliente NÃO tem tabela: jogadores, e criatura de espécie
 * desconhecida. Criatura com ficha no bestiário não chega aqui — ver
 * `stepDurationFor`. Guarda o intervalo cru; quem desliza só uma fração dele
 * aplica o fator na hora de usar. Ver `STEP_MS_SLOWER_RAMP` para o porquê do
 * filtro ser assimétrico.
 */
function makeStepCadence(initial: number) {
  let cadence = initial;
  return {
    get value(): number {
      return cadence;
    },
    /** Registra o intervalo real medido entre dois passos e devolve a cadência. */
    observe(measured: number): number {
      if (measured > 0 && measured < STEP_MS_CEILING) {
        cadence = measured < cadence
          ? measured
          : Math.min(measured, cadence * STEP_MS_SLOWER_RAMP);
      }
      return cadence;
    },
  };
}

/**
 * Chute inicial da cadência. A criatura tem a dela no bestiário, então não há
 * por que aprender do zero: o PRIMEIRO passo já sai na duração certa, e a rampa
 * de `STEP_MS_SLOWER_RAMP` fica só para o que o cliente não sabe (Lentidão,
 * variante, buff).
 */
function initialCadence(e: EntitySnapshot, fallback: number): number {
  return creatureStepMs(e) ?? fallback;
}

/**
 * Quanto uma CRIATURA leva para deslizar um tile, ou `null` se o cliente não
 * conhece a espécie.
 *
 * Sai do bestiário, **não de medição do relógio** — e essa troca é o conserto de
 * dois problemas relatados como bug:
 *
 * 1. *"Alguns Slimes Verdes se movem muito rápido e outros normais."* Perambulando,
 *    o servidor só dá um passo a cada `moveCd × 2` **e ainda por sorteio de 30 %**
 *    (`updateCreatures`): o intervalo é irregular por natureza. Aprender dele fazia
 *    cada indivíduo travar num número diferente, e dois bichos idênticos deslizavam
 *    em velocidades visivelmente distintas. Medir estava certo para o jogador, cuja
 *    cadência o cliente não conhece, e errado aqui, onde ele conhece.
 * 2. *"Anda um tile, para, anda outro, para."* Perseguindo, o servidor dá um passo
 *    a cada `moveCd` **cravado**, então o deslize tem que durar o intervalo INTEIRO
 *    para a perseguição sair contínua. O antigo `CREATURE_GLIDE = 0.6` gastava só
 *    60 % dele e transformava os outros 40 % em pausa, a cada tile.
 *
 * Perambular continua parecendo perambular, de graça: o passo vem a cada 2×, o
 * deslize dura 1×, e a criatura descansa a diferença sozinha. Ou seja, a pausa
 * some da perseguição sem sumir da vida cotidiana do bicho.
 *
 * `nightMode` entra aqui e não no cache do ator porque a noite cai no meio do
 * jogo, e é o servidor que manda o horário.
 */
function creatureStepMs(e: EntitySnapshot): number | null {
  const def = e.creatureType ? CREATURES[e.creatureType] : undefined;
  if (!def) return null;
  return def.moveCooldownMs * (nightMode ? NIGHT_SPEED_MULT : 1) + CREATURE_STEP_SLACK_MS;
}

type StepCadence = ReturnType<typeof makeStepCadence>;

/** Piso do deslize: abaixo disto o passo vira teleporte. */
const STEP_MS_FLOOR = 90;

/**
 * Quanto o deslize até o próximo tile deve durar, para qualquer ator.
 *
 * Uma porta só, com duas respostas conforme o cliente saiba ou não a velocidade
 * do dono do sprite:
 *
 * - **criatura com ficha** → valor exato do bestiário (`creatureStepMs`), sem
 *   aprender nada do relógio;
 * - **jogador, ou criatura de espécie desconhecida** → cadência medida
 *   (`makeStepCadence`), que é o único caminho possível quando não há tabela.
 *
 * `measured = 0` significa "ainda não houve passo": `observe` ignora e devolve o
 * chute inicial.
 */
function stepDurationFor(
  e: EntitySnapshot,
  isCreature: boolean,
  cadence: StepCadence,
  measured: number,
): number {
  const doBestiario = creatureStepMs(e);
  if (doBestiario !== null) return doBestiario;
  const glide = isCreature ? CREATURE_GLIDE_DESCONHECIDA : 1;
  return Math.max(STEP_MS_FLOOR, cadence.observe(measured) * glide);
}

/** Escurece uma cor 0xRRGGBB por uma fração (0..1). Usado no contorno do blob. */
function darken(color: number, amount: number): number {
  const f = 1 - Math.max(0, Math.min(1, amount));
  const r = Math.round(((color >> 16) & 0xff) * f);
  const g = Math.round(((color >> 8) & 0xff) * f);
  const b = Math.round((color & 0xff) * f);
  return (r << 16) | (g << 8) | b;
}

/** Clareia uma cor 0xRRGGBB. O nome precisa ler bem sobre o cenário escuro. */
function lighten(color: number, amount: number): number {
  const f = Math.max(0, Math.min(1, amount));
  const mix = (c: number): number => Math.round(c + (255 - c) * f);
  return (mix((color >> 16) & 0xff) << 16)
    | (mix((color >> 8) & 0xff) << 8)
    | mix(color & 0xff);
}

function nameLabel(text: string, color: number): Text {
  const label = new Text({
    text,
    style: { fill: color, fontSize: 11, fontFamily: 'Segoe UI, sans-serif', stroke: { color: 0x000000, width: 3 } },
  });
  label.anchor.set(0.5, 1);
  label.x = TS / 2;
  label.y = -WALL_H + 2;
  return label;
}

/** Recursos de sprite resolvidos uma vez em startGame e passados adiante. */
interface MiniAssets {
  classAnims: Record<PlayerClass, DirAnim> | null;
  slimeAnim: Texture[] | null;
  /** Slime Azul e Vermelho: a arte do Verde recolorida, por `creatureType`. */
  slimeVariants: Record<string, AnimSet> | null;
  zombieAnim: DirAnim | null;
  zombieIdleAnim: DirAnim | null;
  knightArt: Record<Gender, KnightArt> | null;
  npcAnim: DirAnim | null;
  selfClass: PlayerClass;
  selfGender: Gender;
  /** Abre a loja do comerciante (clicar no NPC). */
  openShop: () => void;
  /** Abre o espólio de um corpo no chão. */
  openCorpse: (id: string) => void;
}

function makeEntity(
  e: EntitySnapshot,
  isSelf: boolean,
  tex: CharacterTextures,
  anims: CharacterAnims | null,
  onTargetClick: (id: string) => void,
  mini: MiniAssets,
): EntityView {
  if (e.kind === 'creature') return makeCreatureView(e, anims, onTargetClick, mini);
  if (e.kind === 'item') return makeItemView(e, mini.openCorpse);
  if (e.kind === 'npc') {
    return makeMiniActor({
      e, anim: mini.npcAnim ?? mini.classAnims?.archer ?? { down: [], up: [], right: [], left: [] },
      scale: 2.4, nameColor: 0xe8c24a, onClick: () => mini.openShop(),
    });
  }
  // A classe/sexo vêm do snapshot (todos os jogadores); para o próprio, o escolhido.
  const cls = e.charClass ?? (isSelf ? mini.selfClass : 'knight');
  const gender: Gender = e.gender ?? (isSelf ? mini.selfGender : 'male');
  const nameColor = isSelf ? 0xbfe0ff : 0xe0c9a3;
  // Knight com arte HD detalhada (masc/fem). DESLIGADO por ora (usuário achou
  // feia); volta a MiniWorld até chegarem os sprites animados novos. Religar =
  // USE_KNIGHT_HD = true (a infra de gênero + knight.ts seguem prontas).
  if (USE_KNIGHT_HD && cls === 'knight' && mini.knightArt) {
    const art = mini.knightArt[gender];
    return makeMiniActor({
      e, anim: art.anim, scale: art.scale,
      anchorX: art.anchorX, anchorY: art.anchorY, labelTop: art.labelTop,
      nameColor, onClick: onTargetClick,
    });
  }
  // Knight usa o SOLDADO 96px animado do pack FreeChars (escolha do usuário).
  // As outras 3 classes seguem MiniWorld.
  if (cls === 'knight' && anims) {
    return makeSpriteActor({
      e, anim: anims.player, cfg: PLAYER_CFG, nameColor, onClick: onTargetClick,
    });
  }
  // Demais classes: sprite MiniWorld (4 direções), se o pack estiver carregado.
  if (mini.classAnims) {
    return makeMiniActor({
      e, anim: mini.classAnims[cls], scale: 2.4, nameColor, onClick: onTargetClick,
    });
  }
  // Fallbacks antigos: Soldier 96px animado, ou desenho por código.
  if (anims) {
    return makeSpriteActor({
      e, anim: anims.player, cfg: PLAYER_CFG,
      nameColor: isSelf ? 0xbfe0ff : 0xe0c9a3,
    });
  }
  return makePlayerView(e, isSelf, tex);
}

/**
 * Ator MiniWorld com 4 direções DE VERDADE (baixo/cima/direita/esquerda),
 * cada uma sua própria linha de quadros. Máquina simples: parado mostra o
 * quadro 0 da direção atual; andando toca o ciclo. Ataque = pequena investida;
 * dano = flash vermelho. Serve para jogadores (por classe) e para o Slime.
 */
interface MiniActorOpts {
  e: EntitySnapshot;
  anim: DirAnim;
  scale: number;
  nameColor: number;
  /** Sempre animar (ex.: Slime que "pula" mesmo parado). */
  alwaysAnimate?: boolean;
  /** Criatura: fica avermelhada à noite (nightMode). Jogadores/NPC = false. */
  creatureTint?: boolean;
  /** Tonalidade-base do sprite (ex.: roxo do chefe). Padrão: branco. */
  tint?: number;
  /** Âncora do sprite (fração). Padrão MiniWorld: centro-x, quase-pés. */
  anchorX?: number;
  anchorY?: number;
  /** Y (container) para nome/barra de vida — acima da cabeça em sprites altos. */
  labelTop?: number;
  /**
   * Velocidade do ciclo de passos. Padrão 0.18, calibrado para as folhas de 5
   * quadros do MiniWorld. Folhas com mais quadros (LPC = 8) precisam de um valor
   * MENOR, senão o ciclo termina antes do passo e o bicho "corre parado".
   */
  animSpeed?: number;
  /**
   * Quadros para quando o ator está PARADO. Sem isto ele congela no quadro 0 da
   * direção — o padrão do MiniWorld, cujas folhas não têm idle.
   */
  idleAnim?: DirAnim;
  /** Velocidade do idle. Bem mais lenta que a caminhada. */
  idleSpeed?: number;
  onClick?: (id: string) => void;
}

function makeMiniActor(opts: MiniActorOpts): EntityView {
  const { e, anim, scale, nameColor, alwaysAnimate, onClick } = opts;
  const c = new Container();
  if (onClick) {
    c.eventMode = 'static';
    c.cursor = 'crosshair';
    c.hitArea = new Rectangle(0, -8, TS, TS + 12);
    c.on('pointertap', () => onClick(e.id));
  }

  const shadow = new Graphics();
  shadow.ellipse(TS / 2, TS - 2, TS / 3.4, TS / 9).fill({ color: 0x000000, alpha: 0.25 });
  c.addChild(shadow);

  // Aura vermelha neon das criaturas à noite (desenhada atrás do sprite).
  const glow = new Graphics();
  glow.blendMode = 'add';
  c.addChild(glow);

  const sprite = new AnimatedSprite(anim.down);
  sprite.anchor.set(opts.anchorX ?? 0.5, opts.anchorY ?? 0.92); // centro-x, quase-pés em y
  sprite.x = TS / 2;
  const baseY = TS + 2;
  sprite.y = baseY;
  sprite.scale.set(scale);
  sprite.loop = true;
  c.addChild(sprite);

  const hpbar = makeHpBar();
  const nlabel = nameLabel(e.name, nameColor);
  if (opts.labelTop !== undefined) {
    hpbar.node.y = opts.labelTop + 6;
    nlabel.y = opts.labelTop;
  }
  c.addChild(hpbar.node);
  c.addChild(nlabel);

  // Movimento: mesma interpolação linear sincronizada à cadência do servidor.
  let fromX = e.tileX * TS;
  let fromY = e.tileY * TS;
  let toX = fromX;
  let toY = fromY;
  const cadence = makeStepCadence(initialCadence(e, PLAYER_STEP_MS_SEED));
  let stepMs = stepDurationFor(e, !!opts.creatureTint, cadence, 0);
  let moveStart = performance.now();
  let movingUntil = 0;
  c.x = fromX;
  c.y = fromY;

  let dir: Direction = e.direction;
  let base: 'idle' | 'walk' = 'idle';
  let hurtUntil = 0;
  let attackUntil = 0;

  function framesFor(d: Direction, set: DirAnim): Texture[] {
    return d === 'up' ? set.up : d === 'left' ? set.left : d === 'right' ? set.right : set.down;
  }
  function applyState(): void {
    if (base === 'walk' || alwaysAnimate) {
      sprite.textures = framesFor(dir, anim);
      sprite.animationSpeed = opts.animSpeed ?? 0.18;
      sprite.loop = true;
      sprite.gotoAndPlay(0);
      return;
    }
    if (opts.idleAnim) {
      sprite.textures = framesFor(dir, opts.idleAnim);
      sprite.animationSpeed = opts.idleSpeed ?? 0.05;
      sprite.loop = true;
      sprite.gotoAndPlay(0);
      return;
    }
    sprite.textures = framesFor(dir, anim);
    sprite.gotoAndStop(0);
  }
  applyState();

  function setDirection(d: Direction): void {
    if (d === dir) return;
    dir = d;
    applyState();
  }
  function setBase(next: 'idle' | 'walk'): void {
    if (next === base) return;
    base = next;
    applyState();
  }

  function setTarget(x: number, y: number): void {
    if (x === toX && y === toY) return;
    const now = performance.now();
    const dTiles = Math.max(Math.abs(x - toX), Math.abs(y - toY)) / TS;
    const far = dTiles > 1.5;
    // INVESTIDA e afins: salto de vários tiles que é MOVIMENTO, não teleporte.
    // Antes caía no mesmo caminho da troca de andar e o sprite simplesmente
    // PISCAVA no destino — daí a sensação de "rápido demais": não havia
    // animação nenhuma. Agora desliza, com duração proporcional à distância.
    const dash = far && dTiles <= DASH_MAX_TILES;
    fromX = far && !dash ? x : c.x;
    fromY = far && !dash ? y : c.y;
    toX = x;
    toY = y;
    if (dash) {
      stepMs = Math.round(dTiles * DASH_MS_PER_TILE);
      movingUntil = now + stepMs + 80;
      moveStart = now;
      return;
    }
    if (!far) {
      // A CRIATURA desliza só uma fração do intervalo e descansa o resto; o
      // JOGADOR usa o intervalo inteiro, porque quem segura a tecla espera
      // movimento contínuo.
      stepMs = stepDurationFor(e, !!opts.creatureTint, cadence, now - moveStart);
      movingUntil = now + stepMs + 80;
    }
    moveStart = now;
  }

  function update(): void {
    const now = performance.now();
    const t = Math.min(1, (now - moveStart) / stepMs);
    c.x = fromX + (toX - fromX) * t;
    c.y = fromY + (toY - fromY) * t;
    setBase(now < movingUntil ? 'walk' : 'idle');
    // Investida de ataque (pequeno salto pra frente da direção).
    const hop = now < attackUntil ? Math.sin(((attackUntil - now) / 140) * Math.PI) : 0;
    sprite.y = baseY - hop * 3;
    const monstroNoturno = !!opts.creatureTint && nightMode;
    sprite.tint = now < hurtUntil ? 0xff6a6a : monstroNoturno ? 0xff5a4a : (opts.tint ?? 0xffffff);
    // Aura neon pulsante à noite.
    if (monstroNoturno) {
      const pulse = 0.55 + 0.25 * Math.sin(now * 0.006);
      glow.clear();
      glow.ellipse(TS / 2, TS - 8, TS * 0.55, TS * 0.5).fill({ color: 0xff2010, alpha: 0.18 * pulse });
      glow.ellipse(TS / 2, TS - 8, TS * 0.35, TS * 0.32).fill({ color: 0xff4030, alpha: 0.22 * pulse });
    } else if (glow.visible) {
      glow.clear();
    }
    c.zIndex = c.y / TS + 0.5;
  }

  return {
    container: c,
    setDirection,
    setTarget,
    setHp: hpbar.set,
    update,
    playAttack: () => { attackUntil = performance.now() + 140; },
    playHurt: () => { hurtUntil = performance.now() + 220; },
  };
}

/**
 * Ator com sprite animado real (pack FreeCharacters). Serve tanto para o
 * jogador quanto para criaturas com arte (ex.: Slime). Sprites de frente única:
 * a direção só espelha horizontalmente. Máquina de estados: idle/walk contínuos
 * + attack/hurt em disparo único (voltam ao estado-base ao terminar).
 */
interface SpriteActorOpts {
  e: EntitySnapshot;
  anim: AnimSet;
  cfg: SpriteCfg;
  nameColor: number;
  /** Criatura: fica avermelhada à noite (nightMode). */
  creatureTint?: boolean;
  /** Tonalidade-base do sprite (ex.: roxo do chefe). Padrão: branco (sem tinta). */
  tint?: number;
  onClick?: (id: string) => void;
}

function makeSpriteActor(opts: SpriteActorOpts): EntityView {
  const { e, anim, cfg, nameColor, onClick } = opts;
  const c = new Container();
  if (onClick) {
    c.eventMode = 'static';
    c.cursor = 'crosshair';
    c.hitArea = new Rectangle(0, -8, TS, TS + 12);
    c.on('pointertap', () => onClick(e.id));
  }

  const sprite = new AnimatedSprite(anim.idle);
  sprite.anchor.set(cfg.anchorX, cfg.anchorY); // centro do conteúdo em x, pés em y
  sprite.x = TS / 2;
  sprite.y = TS - 2; // linha do chão ~ base do tile
  sprite.scale.set(cfg.scale); // scale.x é reaplicado no flip
  sprite.loop = true;
  c.addChild(sprite);

  const hpbar = makeHpBar();
  c.addChild(hpbar.node);
  c.addChild(nameLabel(e.name, nameColor));

  // Movimento: mesma interpolação linear sincronizada à cadência do servidor.
  let fromX = e.tileX * TS;
  let fromY = e.tileY * TS;
  let toX = fromX;
  let toY = fromY;
  const cadence = makeStepCadence(initialCadence(e, PLAYER_STEP_MS_SEED));
  let stepMs = stepDurationFor(e, !!opts.creatureTint, cadence, 0);
  let moveStart = performance.now();
  let movingUntil = 0;
  c.x = fromX;
  c.y = fromY;

  // Estados de animação.
  const SPEED: Record<string, number> = { idle: 0.1, walk: 0.18, attack: 0.3, hurt: 0.22 };
  let flip = 1; // 1 = direita, -1 = esquerda
  let base: 'idle' | 'walk' = 'idle';
  let oneShot: 'attack' | 'hurt' | null = null;

  function apply(state: 'idle' | 'walk' | 'attack' | 'hurt'): void {
    sprite.textures = anim[state];
    sprite.animationSpeed = SPEED[state] ?? 0.15;
    sprite.scale.x = cfg.scale * flip;
  }
  sprite.onComplete = () => {
    if (!oneShot) return;
    oneShot = null;
    apply(base);
    sprite.loop = true;
    sprite.gotoAndPlay(0);
  };

  function setBase(next: 'idle' | 'walk'): void {
    if (next === base) return;
    base = next;
    if (!oneShot) {
      apply(base);
      sprite.loop = true;
      sprite.gotoAndPlay(0);
    }
  }

  function playOnce(state: 'attack' | 'hurt'): void {
    oneShot = state;
    apply(state);
    sprite.loop = false;
    sprite.gotoAndPlay(0);
  }

  function setDirection(dir: Direction): void {
    const nf = dir === 'left' ? -1 : dir === 'right' ? 1 : flip;
    if (nf === flip) return;
    flip = nf;
    sprite.scale.x = cfg.scale * flip;
  }
  setDirection(e.direction);
  apply('idle');
  sprite.play();

  function setTarget(x: number, y: number): void {
    if (x === toX && y === toY) return;
    const now = performance.now();
    const dTiles = Math.max(Math.abs(x - toX), Math.abs(y - toY)) / TS;
    const far = dTiles > 1.5;
    // INVESTIDA e afins: salto de vários tiles que é MOVIMENTO, não teleporte.
    // Antes caía no mesmo caminho da troca de andar e o sprite simplesmente
    // PISCAVA no destino — daí a sensação de "rápido demais": não havia
    // animação nenhuma. Agora desliza, com duração proporcional à distância.
    const dash = far && dTiles <= DASH_MAX_TILES;
    fromX = far && !dash ? x : c.x;
    fromY = far && !dash ? y : c.y;
    toX = x;
    toY = y;
    if (dash) {
      stepMs = Math.round(dTiles * DASH_MS_PER_TILE);
      movingUntil = now + stepMs + 80;
      moveStart = now;
      return;
    }
    if (!far) {
      // A CRIATURA desliza só uma fração do intervalo e descansa o resto; o
      // JOGADOR usa o intervalo inteiro, porque quem segura a tecla espera
      // movimento contínuo.
      stepMs = stepDurationFor(e, !!opts.creatureTint, cadence, now - moveStart);
      movingUntil = now + stepMs + 80;
    }
    moveStart = now;
  }

  function update(): void {
    const now = performance.now();
    const t = Math.min(1, (now - moveStart) / stepMs);
    c.x = fromX + (toX - fromX) * t;
    c.y = fromY + (toY - fromY) * t;
    setBase(now < movingUntil ? 'walk' : 'idle');
    // Avermelhado à noite; fora disso usa a tonalidade-base (roxo do chefe, se houver).
    sprite.tint = opts.creatureTint && nightMode ? 0xff5a4a : (opts.tint ?? 0xffffff);
    c.zIndex = c.y / TS + 0.5;
  }

  return {
    container: c,
    setDirection,
    setTarget,
    setHp: hpbar.set,
    update,
    playAttack: () => { if (oneShot !== 'attack') playOnce('attack'); },
    playHurt: () => { if (!oneShot) playOnce('hurt'); },
  };
}

/** Herói/jogador: sprite animado + nome + barra de vida. */
function makePlayerView(e: EntitySnapshot, isSelf: boolean, tex: CharacterTextures): EntityView {
  const c = new Container();
  const shadow = new Graphics();
  shadow.ellipse(TS / 2, TS - 3, TS / 3, TS / 7).fill({ color: 0x000000, alpha: 0.28 });
  c.addChild(shadow);

  const sprite = new AnimatedSprite(tex.down);
  sprite.anchor.set(0.5, 1);
  sprite.x = TS / 2;
  sprite.y = TS + 3;
  sprite.animationSpeed = 0.18;
  sprite.loop = true;
  sprite.gotoAndStop(0);
  c.addChild(sprite);

  const hpbar = makeHpBar();
  c.addChild(hpbar.node);
  c.addChild(nameLabel(e.name, isSelf ? 0xbfe0ff : 0xe0c9a3));

  // Deslize LINEAR sincronizado à cadência de passos do servidor: em vez de uma
  // fração fixa por frame (que fazia "dash + pausa"), interpolamos com velocidade
  // constante ao longo de stepMs — o intervalo real medido entre um passo e o
  // próximo. Assim o herói está sempre deslizando: movimento fluido, tipo Tibia.
  let fromX = e.tileX * TS;
  let fromY = e.tileY * TS;
  let toX = fromX;
  let toY = fromY;
  const cadence = makeStepCadence(initialCadence(e, PLAYER_STEP_MS_SEED));
  let stepMs = stepDurationFor(e, false, cadence, 0); // jogador: sempre medido
  let moveStart = performance.now();
  let movingUntil = 0;
  c.x = fromX;
  c.y = fromY;
  let moving = false;
  let curDir: Direction | null = null;

  function setDirection(dir: Direction): void {
    if (dir === curDir) return;
    curDir = dir;
    let arr = tex.down;
    let flip = 1;
    if (dir === 'up') arr = tex.up;
    else if (dir === 'right') arr = tex.right;
    else if (dir === 'left') { arr = tex.right; flip = -1; }
    const wasPlaying = sprite.playing;
    sprite.textures = arr;
    sprite.scale.x = flip;
    if (wasPlaying) sprite.play();
    else sprite.gotoAndStop(0);
  }
  setDirection(e.direction);

  function setTarget(x: number, y: number): void {
    if (x === toX && y === toY) return; // snapshot sem mudança de tile: ignora
    // Pulo grande (troca de andar/teleporte): salta direto, sem deslizar o mapa.
    const far = Math.abs(x - toX) > TS * 1.5 || Math.abs(y - toY) > TS * 1.5;
    const now = performance.now();
    fromX = far ? x : c.x;
    fromY = far ? y : c.y;
    toX = x;
    toY = y;
    if (!far) {
      // Duração do deslize = intervalo real entre passos (sincroniza com o
      // servidor). Jogador desliza o intervalo INTEIRO: quem segura a tecla
      // espera movimento contínuo, sem pausa entre um tile e outro.
      stepMs = stepDurationFor(e, false, cadence, now - moveStart);
      movingUntil = now + stepMs + 80; // segue animando entre passos consecutivos
    }
    moveStart = now;
  }

  function update(): void {
    const now = performance.now();
    const t = Math.min(1, (now - moveStart) / stepMs);
    c.x = fromX + (toX - fromX) * t;
    c.y = fromY + (toY - fromY) * t;
    const isMoving = now < movingUntil;
    if (isMoving && !moving) { moving = true; sprite.play(); }
    else if (!isMoving && moving) { moving = false; sprite.gotoAndStop(0); }
    c.zIndex = c.y / TS + 0.5;
  }

  return {
    container: c,
    setDirection,
    setTarget,
    setHp: hpbar.set,
    update,
  };
}

/** Criatura clicável para virar alvo. Slime usa sprite animado real (se o pack
 * estiver carregado); Rotworm segue desenhado por código. */
function makeCreatureView(
  e: EntitySnapshot,
  anims: CharacterAnims | null,
  onTargetClick: (id: string) => void,
  mini: MiniAssets,
): EntityView {
  // CHEFE Super Slime: mesmo sprite do Slime, porém MAIOR e com tonalidade roxa
  // (e nome roxo) para não confundir com os Slimes comuns.
  const isBoss = e.creatureType === 'super_slime';
  if (isBoss && anims) {
    return makeSpriteActor({
      e, anim: anims.slime, cfg: BOSS_SLIME_CFG, nameColor: 0xc46bff,
      creatureTint: true, tint: 0xa657ff, onClick: onTargetClick,
    });
  }
  if (isBoss && mini.slimeAnim) {
    const s = mini.slimeAnim;
    return makeMiniActor({
      e, anim: { down: s, up: s, right: s, left: s }, scale: 3.6,
      nameColor: 0xc46bff, alwaysAnimate: true, creatureTint: true, tint: 0xa657ff, onClick: onTargetClick,
    });
  }

  // ZUMBI: folha LPC 64px. Os números abaixo saem da MEDIÇÃO do bounding box
  // do conteúdo dentro da célula (x 17..46, y 15..62), não de chute:
  //   anchorX = 31.5/64 -> centro real do corpo
  //   anchorY = 62/64   -> linha dos pés
  //   scale   = 40/48   -> ~40px de altura na tela (o conteúdo tem 48px)
  if (e.creatureType === 'zombie' && mini.zombieAnim) {
    return makeMiniActor({
      e, anim: mini.zombieAnim, scale: 0.85,
      anchorX: 31.5 / 64, anchorY: 62 / 64, labelTop: -34,
      animSpeed: 0.09, // 8 quadros + passo de 2 s = arrastar de morto-vivo
      // Parado ele não congela: a cabeça balança (ver loadZombieIdleAnim).
      idleAnim: mini.zombieIdleAnim ?? undefined,
      idleSpeed: 0.035,
      nameColor: 0x9fbf7f, creatureTint: true, onClick: onTargetClick,
    });
  }

  // SLIME AZUL e VERMELHO: a arte do Verde com o matiz rotacionado, gerada no
  // carregamento (ver `loadSlimeVariants`). Decisão do dono: reusar o corpo do
  // Verde em vez de desenhar sprite novo — são a mesma criatura um degrau acima.
  //
  // O nome sai na cor da espécie que já estava na tabela de placeholder, então a
  // leitura no mapa não muda: azul continua lendo azul.
  const slimeVariant = e.creatureType ? mini.slimeVariants?.[e.creatureType] : undefined;
  if (slimeVariant) {
    return makeSpriteActor({
      e, anim: slimeVariant, cfg: SLIME_CFG, creatureTint: true,
      nameColor: lighten(CREATURE_PLACEHOLDER_COLORS[e.creatureType!] ?? 0x5fae5f, 0.45),
      onClick: onTargetClick,
    });
  }

  // Só o slime tem sprite pronto; os demais são desenhados por código abaixo.
  const isSlime = e.creatureType === 'slime' || e.creatureType === undefined;
  // Slime com a arte 96px ANIMADA do pack FreeChars (idle/walk/attack/hurt/
  // death) — escolha do usuário. Avermelha à noite (creatureTint).
  if (isSlime && anims) {
    return makeSpriteActor({
      e, anim: anims.slime, cfg: SLIME_CFG, nameColor: 0xa0e0a0, creatureTint: true, onClick: onTargetClick,
    });
  }
  // Fallback: Slime MiniWorld (hop simples), se o pack FreeChars faltar.
  if (isSlime && mini.slimeAnim) {
    const s = mini.slimeAnim;
    return makeMiniActor({
      e, anim: { down: s, up: s, right: s, left: s }, scale: 2.2,
      nameColor: 0xa0e0a0, alwaysAnimate: true, creatureTint: true, onClick: onTargetClick,
    });
  }

  const c = new Container();
  c.eventMode = 'static';
  c.cursor = 'crosshair';
  c.hitArea = new Rectangle(0, -8, TS, TS + 12);
  c.on('pointertap', () => onTargetClick(e.id));

  const isRotworm = e.creatureType === 'rotworm';
  const isSnake = e.creatureType === 'snake';

  const shadow = new Graphics();
  shadow.ellipse(TS / 2, TS - 3, TS / 3.2, TS / 8).fill({ color: 0x000000, alpha: 0.28 });
  c.addChild(shadow);

  const glow = new Graphics();
  glow.blendMode = 'add';
  c.addChild(glow);
  const body = new Graphics();
  c.addChild(body);
  const hpbar = makeHpBar();
  c.addChild(hpbar.node);
  // Cor da bolha desta espécie. Toda criatura sem arte própria cai aqui, e sem
  // a cor elas seriam 18 blobs verdes idênticos com 140 a 480 de vida.
  const blobColor = CREATURE_PLACEHOLDER_COLORS[e.creatureType ?? 'slime'] ?? 0x5fae5f;
  const nameCol = isSnake ? 0x9ab84a : isRotworm ? 0xd08a6a : lighten(blobColor, 0.45);
  c.addChild(nameLabel(e.name, nameCol));

  // Blob que "respira" (squash), na cor da espécie. Olhos escuros.
  // Continua sendo placeholder: quando a criatura ganhar sprite, ela deixa de
  // passar por aqui, como já acontece com o Zumbi.
  function drawSlime(squash: number): void {
    const h = 18 * (1 - squash * 0.12);
    const w = 24 * (1 + squash * 0.1);
    const baseY = TS - 3;
    body.clear();
    body.roundRect(TS / 2 - w / 2, baseY - h, w, h, 7)
      .fill(blobColor)
      .stroke({ width: 2, color: darken(blobColor, 0.45) });
    body.circle(TS / 2 - 5, baseY - h * 0.6, 2).fill(0x0a1a0a);
    body.circle(TS / 2 + 5, baseY - h * 0.6, 2).fill(0x0a1a0a);
  }

  // Rotworm: verme marrom/avermelhado estilo Tibia. Corpo redondo com anéis e
  // uma bocarra central de dentes (goela vermelha) que ABRE E FECHA — `open`
  // controla o quanto os dentes recuam mostrando a goela.
  function drawRotworm(pulse: number): void {
    const cx = TS / 2;
    const cy = TS * 0.55;
    const open = pulse; // 0 (fechado) .. 1 (bem aberto)
    body.clear();
    // Corpo (blob marrom) com leve respiração.
    const bw = 13 * (1 + pulse * 0.05);
    const bh = 11 * (1 + pulse * 0.05);
    body.ellipse(cx, cy, bw, bh).fill(0x8a5a34).stroke({ width: 2, color: 0x4a2f18 });
    // Anéis/segmentos avermelhados.
    body.ellipse(cx, cy, bw - 2.5, bh - 2.5).stroke({ width: 1.5, color: 0xa8402f });
    body.ellipse(cx, cy, bw - 5, bh - 5).stroke({ width: 1, color: 0x8a3020 });
    // Goela vermelha (fundo da boca).
    const rim = 6;
    body.circle(cx, cy, rim).fill(0x5a140c);
    body.circle(cx, cy, rim - 1.5).fill(0x8a1f14);
    // Anel de dentes brancos que convergem ao centro quando FECHADO e recuam
    // (mostrando a goela) quando ABERTO.
    const teeth = 9;
    const rTip = 1 + open * 4; // ponta perto do centro (fechado) -> recuada (aberto)
    const half = 0.30;
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const x1 = cx + Math.cos(a - half) * rim;
      const y1 = cy + Math.sin(a - half) * rim;
      const x2 = cx + Math.cos(a + half) * rim;
      const y2 = cy + Math.sin(a + half) * rim;
      const xt = cx + Math.cos(a) * rTip;
      const yt = cy + Math.sin(a) * rTip;
      body.poly([x1, y1, x2, y2, xt, yt]).fill(0xf0e6d2);
    }
  }

  // Snake: serpente verde enrolada com cabeça e língua bífida. `wig` faz o corpo
  // ondular (slither) e a língua piscar. Vista de cima, estilo Tibia.
  function drawSnake(wig: number): void {
    const cx = TS / 2;
    const cy = TS * 0.56;
    body.clear();
    // Corpo em espiral: vários segmentos que oscilam.
    const rings = 5;
    for (let i = rings; i >= 1; i--) {
      const r = 4 + i * 1.7;
      const off = Math.sin(wig * Math.PI * 2 + i) * 1.6;
      const green = i % 2 === 0 ? 0x4f8a3a : 0x6bb04a;
      body.ellipse(cx + off, cy + (rings - i) * 0.6, r, r * 0.82).fill(green).stroke({ width: 1, color: 0x2f5a22 });
    }
    // Cabeça (à frente, oscilando lateralmente).
    const hx = cx + Math.sin(wig * Math.PI * 2) * 5;
    const hy = cy - 8;
    body.ellipse(hx, hy, 5.5, 4.5).fill(0x77bd52).stroke({ width: 1, color: 0x2f5a22 });
    body.circle(hx - 2, hy - 1, 1).fill(0x0a1a0a);
    body.circle(hx + 2, hy - 1, 1).fill(0x0a1a0a);
    // Língua bífida piscando.
    if (wig > 0.5) {
      body.poly([hx, hy - 4, hx - 1.5, hy - 8, hx, hy - 6, hx + 1.5, hy - 8]).fill(0xd23b3b);
    }
  }

  /** Coelho: bolinha branca com orelhas compridas, sempre de prontidão. */
  function drawRabbit(t: number): void {
    const cx = TS / 2;
    const cy = TS * 0.62;
    const hop = Math.abs(Math.sin(t * Math.PI * 2)) * 2;
    body.clear();
    body.ellipse(cx, cy - hop, 9, 7).fill(0xe8e2d6).stroke({ width: 1, color: 0x9a9184 });
    body.ellipse(cx - 6, cy - 5 - hop, 5, 4.5).fill(0xf2ece0).stroke({ width: 1, color: 0x9a9184 });
    // Orelhas.
    body.ellipse(cx - 7, cy - 12 - hop, 1.8, 5.5).fill(0xf2ece0).stroke({ width: 1, color: 0x9a9184 });
    body.ellipse(cx - 3.5, cy - 12.5 - hop, 1.8, 6).fill(0xf2ece0).stroke({ width: 1, color: 0x9a9184 });
    body.circle(cx - 8, cy - 5.5 - hop, 0.9).fill(0x2a2620);
    body.circle(cx + 8, cy - 1 - hop, 2.6).fill(0xfffaf0); // rabinho
  }

  /** Javali: massa marrom baixa com presas — não procura briga, mas aguenta. */
  function drawBoar(t: number): void {
    const cx = TS / 2;
    const cy = TS * 0.6;
    const bob = Math.sin(t * Math.PI * 2) * 1.2;
    body.clear();
    body.ellipse(cx, cy + bob, 12, 8).fill(0x6a5240).stroke({ width: 1.2, color: 0x3a2c22 });
    body.ellipse(cx - 10, cy + 1 + bob, 6, 5.5).fill(0x5a4434).stroke({ width: 1.2, color: 0x3a2c22 });
    // Crina eriçada.
    for (let i = -6; i <= 6; i += 3) {
      body.poly([cx + i, cy - 7 + bob, cx + i + 1, cy - 12 + bob, cx + i + 2, cy - 7 + bob]).fill(0x3a2c22);
    }
    body.circle(cx - 12, cy + 0.5 + bob, 0.9).fill(0xd8b020); // olho
    // Presas.
    body.poly([cx - 14, cy + 3 + bob, cx - 17, cy - 1 + bob, cx - 13, cy + 1 + bob]).fill(0xefe8d8);
  }

  /** Aranha: corpo escuro e oito pernas que se mexem. Sempre agressiva. */
  function drawSpider(t: number): void {
    const cx = TS / 2;
    const cy = TS * 0.58;
    const step = Math.sin(t * Math.PI * 2) * 2;
    body.clear();
    for (let i = 0; i < 4; i++) {
      const dy = -4 + i * 3.2;
      const flex = i % 2 === 0 ? step : -step;
      body.moveTo(cx, cy).lineTo(cx - 11 - flex, cy + dy).stroke({ width: 1.6, color: 0x241a26 });
      body.moveTo(cx, cy).lineTo(cx + 11 + flex, cy + dy).stroke({ width: 1.6, color: 0x241a26 });
    }
    body.ellipse(cx, cy + 2, 8, 7).fill(0x3a2a40).stroke({ width: 1.2, color: 0x1a1020 });
    body.ellipse(cx, cy - 5, 5, 4).fill(0x4a3652).stroke({ width: 1.2, color: 0x1a1020 });
    body.circle(cx - 2, cy - 6, 1.1).fill(0xd83b3b);
    body.circle(cx + 2, cy - 6, 1.1).fill(0xd83b3b);
  }

  const drawBody =
    e.creatureType === 'rabbit' ? drawRabbit
      : e.creatureType === 'boar' ? drawBoar
        : e.creatureType === 'spider' ? drawSpider
          : isSnake ? drawSnake : isRotworm ? drawRotworm : drawSlime;

  let fromX = e.tileX * TS;
  let fromY = e.tileY * TS;
  let toX = fromX;
  let toY = fromY;
  // O fallback é alto porque as criaturas se movem devagar — um valor baixo
  // faria o PRIMEIRO passo saltar. Na prática quase nunca é usado: toda criatura
  // tem `creatureType`, e aí a cadência vem exata do bestiário.
  const cadence = makeStepCadence(initialCadence(e, 500));
  let stepMs = stepDurationFor(e, true, cadence, 0);
  let moveStart = performance.now();
  c.x = fromX;
  c.y = fromY;
  const phase = Math.random() * Math.PI * 2;

  function setTarget(x: number, y: number): void {
    if (x === toX && y === toY) return;
    const now = performance.now();
    const dTiles = Math.max(Math.abs(x - toX), Math.abs(y - toY)) / TS;
    const far = dTiles > 1.5;
    // INVESTIDA e afins: salto de vários tiles que é MOVIMENTO, não teleporte.
    // Antes caía no mesmo caminho da troca de andar e o sprite simplesmente
    // PISCAVA no destino — daí a sensação de "rápido demais": não havia
    // animação nenhuma. Agora desliza, com duração proporcional à distância.
    const dash = far && dTiles <= DASH_MAX_TILES;
    fromX = far && !dash ? x : c.x;
    fromY = far && !dash ? y : c.y;
    toX = x;
    toY = y;
    // Esta variante não controla estado de "andando" (não tem animação de
    // caminhada), então só ajusta a duração do deslize.
    if (dash) {
      stepMs = Math.round(dTiles * DASH_MS_PER_TILE);
      moveStart = now;
      return;
    }
    if (!far) {
      stepMs = stepDurationFor(e, true, cadence, now - moveStart);
    }
    moveStart = now;
  }

  function update(): void {
    const t = Math.min(1, (performance.now() - moveStart) / stepMs);
    c.x = fromX + (toX - fromX) * t;
    c.y = fromY + (toY - fromY) * t;
    const now = performance.now();
    const squash = (Math.sin(now * 0.006 + phase) + 1) / 2;
    drawBody(squash);
    body.tint = nightMode ? 0xff5a4a : 0xffffff; // avermelhado à noite
    if (nightMode) {
      const pulse = 0.55 + 0.25 * Math.sin(now * 0.006);
      glow.clear();
      glow.ellipse(TS / 2, TS * 0.55, TS * 0.55, TS * 0.5).fill({ color: 0xff2010, alpha: 0.18 * pulse });
      glow.ellipse(TS / 2, TS * 0.55, TS * 0.35, TS * 0.32).fill({ color: 0xff4030, alpha: 0.22 * pulse });
    } else {
      glow.clear();
    }
    c.zIndex = c.y / TS + 0.5;
  }
  drawBody(0);

  return {
    container: c,
    setDirection: () => {},
    setTarget,
    setHp: hpbar.set,
    update,
  };
}

/**
 * Ícone (data URL) de uma criatura para a Battle list — desenhado num canvas
 * com as mesmas cores do sprite do mapa. Cacheado por tipo (não muda em runtime).
 */
const creatureIconCache = new Map<string, string>();
function creatureIconUrl(type: string | undefined): string {
  const key = type ?? 'slime';
  const cached = creatureIconCache.get(key);
  if (cached) return cached;

  const S = 20;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const g = cv.getContext('2d')!;
  const cxp = S / 2;

  // Sombra.
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.ellipse(cxp, S - 3, 6, 2, 0, 0, Math.PI * 2);
  g.fill();

  if (key === 'rabbit') {
    const cyc = S - 7;
    g.fillStyle = '#e8e2d6';
    g.strokeStyle = '#9a9184';
    g.lineWidth = 1;
    g.beginPath(); g.ellipse(cxp + 1, cyc, 5, 4, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(cxp - 3, cyc - 3, 3, 2.6, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(cxp - 4, cyc - 8, 1.1, 3.2, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(cxp - 1.5, cyc - 8.5, 1.1, 3.4, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#2a2620';
    g.beginPath(); g.arc(cxp - 4.5, cyc - 3.5, 0.7, 0, Math.PI * 2); g.fill();
  } else if (key === 'boar') {
    const cyc = S - 7;
    g.fillStyle = '#6a5240';
    g.strokeStyle = '#3a2c22';
    g.lineWidth = 1;
    g.beginPath(); g.ellipse(cxp + 1, cyc, 6.5, 4.5, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(cxp - 5, cyc + 0.5, 3.4, 3, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#3a2c22';
    for (let i = -3; i <= 3; i += 3) {
      g.beginPath();
      g.moveTo(cxp + i, cyc - 4); g.lineTo(cxp + i + 0.8, cyc - 7); g.lineTo(cxp + i + 1.6, cyc - 4);
      g.closePath(); g.fill();
    }
    g.fillStyle = '#efe8d8';
    g.beginPath();
    g.moveTo(cxp - 7, cyc + 2); g.lineTo(cxp - 9, cyc - 0.5); g.lineTo(cxp - 6.5, cyc + 0.5);
    g.closePath(); g.fill();
  } else if (key === 'spider') {
    const cyc = S - 8;
    g.strokeStyle = '#241a26';
    g.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const dy = -2 + i * 2.6;
      g.beginPath(); g.moveTo(cxp, cyc); g.lineTo(cxp - 7, cyc + dy); g.stroke();
      g.beginPath(); g.moveTo(cxp, cyc); g.lineTo(cxp + 7, cyc + dy); g.stroke();
    }
    g.fillStyle = '#3a2a40';
    g.strokeStyle = '#1a1020';
    g.beginPath(); g.ellipse(cxp, cyc + 1.5, 4.5, 4, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(cxp, cyc - 3, 3, 2.4, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#d83b3b';
    g.beginPath(); g.arc(cxp - 1.2, cyc - 3.5, 0.8, 0, Math.PI * 2);
    g.arc(cxp + 1.2, cyc - 3.5, 0.8, 0, Math.PI * 2); g.fill();
  } else if (key === 'snake') {
    // Snake: serpente verde enrolada com cabecinha.
    const cyc = S - 8;
    for (let i = 4; i >= 1; i--) {
      const r = 2.5 + i * 1.4;
      g.beginPath();
      g.ellipse(cxp, cyc + (4 - i) * 0.5, r, r * 0.82, 0, 0, Math.PI * 2);
      g.fillStyle = i % 2 === 0 ? '#4f8a3a' : '#6bb04a';
      g.fill();
      g.lineWidth = 1;
      g.strokeStyle = '#2f5a22';
      g.stroke();
    }
    g.beginPath();
    g.ellipse(cxp + 3, cyc - 5, 3.2, 2.6, 0, 0, Math.PI * 2);
    g.fillStyle = '#77bd52';
    g.fill();
    g.strokeStyle = '#2f5a22';
    g.stroke();
    g.fillStyle = '#0a1a0a';
    g.beginPath();
    g.arc(cxp + 2, cyc - 6, 0.8, 0, Math.PI * 2);
    g.arc(cxp + 4.4, cyc - 6, 0.8, 0, Math.PI * 2);
    g.fill();
  } else if (key === 'rotworm') {
    // Rotworm: blob marrom com goela vermelha central e dentes brancos ao redor.
    const cyc = S - 8;
    // Corpo marrom.
    g.beginPath();
    g.ellipse(cxp, cyc, 7.5, 6.5, 0, 0, Math.PI * 2);
    g.fillStyle = '#8a5a34';
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = '#4a2f18';
    g.stroke();
    // Anel avermelhado.
    g.beginPath();
    g.ellipse(cxp, cyc, 5.5, 4.8, 0, 0, Math.PI * 2);
    g.lineWidth = 1;
    g.strokeStyle = '#a8402f';
    g.stroke();
    // Goela vermelha.
    g.beginPath();
    g.arc(cxp, cyc, 3.2, 0, Math.PI * 2);
    g.fillStyle = '#8a1f14';
    g.fill();
    // Dentes (anel de triângulos apontando ao centro).
    g.fillStyle = '#f0e6d2';
    const teeth = 8;
    const rim = 3.2;
    const half = 0.34;
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      g.beginPath();
      g.moveTo(cxp + Math.cos(a - half) * rim, cyc + Math.sin(a - half) * rim);
      g.lineTo(cxp + Math.cos(a + half) * rim, cyc + Math.sin(a + half) * rim);
      g.lineTo(cxp + Math.cos(a) * 1.1, cyc + Math.sin(a) * 1.1);
      g.closePath();
      g.fill();
    }
  } else if (key === 'zombie') {
    // Zumbi: cabeça humanoide esverdeada, mandíbula caída e olhos vazios. É um
    // ícone desenhado à mão como os outros — o sprite LPC é grande demais para
    // servir de miniatura recortada.
    const cyc = S - 9;
    g.beginPath();
    g.ellipse(cxp, cyc, 5.6, 6.4, 0, 0, Math.PI * 2);
    g.fillStyle = '#7d9c68';
    g.fill();
    g.lineWidth = 1.4;
    g.strokeStyle = '#3c4f30';
    g.stroke();
    // Olhos encovados.
    g.fillStyle = '#1a2414';
    g.beginPath();
    g.ellipse(cxp - 2.2, cyc - 1.6, 1.5, 1.8, 0, 0, Math.PI * 2);
    g.ellipse(cxp + 2.2, cyc - 1.6, 1.5, 1.8, 0, 0, Math.PI * 2);
    g.fill();
    // Boca escancarada.
    g.beginPath();
    g.ellipse(cxp, cyc + 3.4, 2.1, 1.5, 0, 0, Math.PI * 2);
    g.fillStyle = '#2a1414';
    g.fill();
    // Rasgo escuro na testa.
    g.strokeStyle = '#4a2222';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(cxp - 3.4, cyc - 4.4);
    g.lineTo(cxp + 0.6, cyc - 5.2);
    g.stroke();
  } else {
    // Slime: blob verde (#5fae5f/#2f5f2f). Super Slime (chefe): roxo e maior.
    const boss = key === 'super_slime';
    const w = boss ? 18 : 15;
    const h = boss ? 15 : 12;
    const x = cxp - w / 2;
    const y = S - 3 - h;
    const r = boss ? 6 : 5;
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
    g.fillStyle = boss ? '#a657ff' : '#5fae5f';
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = boss ? '#5a2f8a' : '#2f5f2f';
    g.stroke();
    // Olhos.
    g.fillStyle = '#0a1a0a';
    g.beginPath();
    g.arc(cxp - 3, y + h * 0.42, 1.4, 0, Math.PI * 2);
    g.arc(cxp + 3, y + h * 0.42, 1.4, 0, Math.PI * 2);
    g.fill();
  }

  const url = cv.toDataURL();
  creatureIconCache.set(key, url);
  return url;
}

/** Item no chão (ouro): pilha brilhante + quantidade. */
function makeItemView(e: EntitySnapshot, onCorpseClick?: (id: string) => void): EntityView {
  const c = new Container();
  c.x = e.tileX * TS;
  c.y = e.tileY * TS;
  const g = new Graphics();

  if (e.itemKind === 'corpse') {
    // Corpo de jogador: monte de ossos com uma poça escura. Clicável para
    // abrir o espólio — é o ponto de tensão de voltar ao local da morte.
    g.ellipse(TS / 2, TS - 6, TS / 2.6, TS / 5).fill({ color: 0x3a1418, alpha: 0.75 });
    g.roundRect(TS / 2 - 9, TS - 15, 18, 7, 3).fill(0xd8d0bc).stroke({ width: 1, color: 0x6a6252 });
    g.circle(TS / 2 - 6, TS - 17, 4.5).fill(0xe4dcc8).stroke({ width: 1, color: 0x6a6252 });
    g.circle(TS / 2 - 7.5, TS - 18, 1.2).fill(0x2a2620);
    g.circle(TS / 2 - 4.5, TS - 18, 1.2).fill(0x2a2620);
    c.addChild(g);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.hitArea = new Rectangle(0, 0, TS, TS);
    c.on('pointertap', () => onCorpseClick?.(e.id));
    c.addChild(nameLabel(e.name, 0xd8a0a0));
    c.zIndex = c.y / TS + 0.25;
    return {
      container: c,
      setDirection: () => {},
      setTarget: (x, y) => { c.x = x; c.y = y; },
      setHp: () => {},
      update: () => {},
    };
  }

  for (const [ox, oy] of [[-4, 2], [4, 2], [0, -1]] as const) {
    g.circle(TS / 2 + ox, TS - 8 + oy, 4).fill(0xf4c542).stroke({ width: 1, color: 0x8a6a10 });
  }
  c.addChild(g);
  if (e.amount && e.amount > 1) {
    const t = new Text({
      text: String(e.amount),
      style: { fill: 0xffe08a, fontSize: 10, fontFamily: 'Segoe UI, sans-serif', stroke: { color: 0x000000, width: 3 } },
    });
    t.anchor.set(0.5, 1);
    t.x = TS / 2;
    t.y = TS - 14;
    c.addChild(t);
  }
  c.zIndex = c.y / TS + 0.2; // itens ficam abaixo dos personagens no mesmo tile
  return {
    container: c,
    setDirection: () => {},
    setTarget: (x, y) => { c.x = x; c.y = y; },
    setHp: () => {},
    update: () => {},
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch,
  );
}

// ---- Bootstrap -------------------------------------------------------------
// A conexão é criada ANTES de qualquer tela: o login já precisa dela.
net = new NetClient(routeServerMessage, (connected) => {
  statusEl.innerHTML = connected
    ? 'Servidor: <span class="on">conectado</span>'
    : 'Servidor: <span class="off">reconectando…</span>';
});
net.connect();

setupLoginScreen();
setupCharSelectScreen();
setupStartScreen();
showScreen('login');
