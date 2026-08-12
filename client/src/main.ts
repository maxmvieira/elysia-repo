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

import {
  AnimatedSprite, Application, Container, Graphics, Rectangle, Sprite, Text, Texture,
  type FederatedPointerEvent,
} from 'pixi.js';
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
  SELL_PRICE_FACTOR,
  sellPriceOf,
  SERVER_TICK_MS,
  SKILLS,
  SKILL_BAR,
  TILE_SIZE,
  VENDOR_STOCK,
  buildWorldMap,
  chaoBaseEm,
  getItem,
  getTileType,
  isWalkable,
  NODES,
  PROFESSION_NAME,
  TILE_TYPES,
  type AttributeKey,
  type Direction,
  type EntitySnapshot,
  type EquipSlot,
  type Gender,
  type ItemStack,
  type PlayerClass,
  attackPoseFor,
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
  affixDamageType,
  composeItemName,
  getMaterial,
  rarityChances,
  ARMOR_CLASS_AFFINITY,
  WEAPON_CLASS_AFFINITY,
  FRAGMENT_ITEM,
  FRAGMENTS_PER_CRAFT,
  MIN_FRAGMENTS_FOR_CHANCE,
  RARITIES,
  RECIPE_ITEM,
  // --- Vindos do merge de 2026-07-30 (catálogo do Doc 4 + distribuição de party)
  MODEL_INDEX,
  craftableModel,
  LOOT_RULE_LABEL,
  PHASE_LABEL,
  PROFICIENCY_LABEL,
  proficiencyFor,
  type AffixId,
  type DayPhase,
  type ProficiencyKind,
  type Professions,
  type Rarity,
  PARTY_MAX,
  chebyshev,
  type S2C_Party,
  type S2C_Friends,
  CONDITIONS,
  CONDITION_COLORS,
  CREATURE_PLACEHOLDER_COLORS,
  ELEMENT_INFO,
  type ConditionId,
  type SkullKind,
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
  CREATURE_SHEETS, loadCreatureSheets, type CreatureSheets,
  type DirAnim,
} from './miniworld.js';
import { loadKnightSprites, knightIconCss, type KnightArt } from './knight.js';
import { loadHeroArt, golpeDe, heroIconCss, HERO_ART_CLASSES, type HeroArt } from './heroes.js';
import { loadTrees, treeTexFor, type ArvoreSprite } from './trees.js';
import { loadCrystals, crystalNodeSprite, crystalIconImage } from './crystals.js';

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
const chatlogEl = document.querySelector<HTMLDivElement>('#chatlog')!;
const chatInputEl = document.querySelector<HTMLInputElement>('#chatinput')!;
const viewportEl = document.querySelector<HTMLDivElement>('#viewport')!;
const el = (id: string) => document.getElementById(id)!;
const hud = {
  // Sem `gold`: o contador ao lado do nível saiu a pedido do dono. O ouro do
  // personagem se vê nas moedas da mochila e no Banco.
  level: el('level'),
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

const map = buildWorldMap();

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

/**
 * Mensagens que chegaram DEPOIS do `welcome` e ANTES de o mundo terminar de
 * carregar.
 *
 * 🔴 Isto conserta um bug real: o inventário nunca aparecia ao entrar.
 *
 * `startGame()` é assíncrono (Pixi, folhas de sprite, tiles do chão) e só
 * instala o `gameHandler` no fim. Mas o servidor manda `welcome`, `inventory`,
 * `stats` e `towns` no MESMO tique do join — tudo isso chegava com
 * `gameHandler` ainda `null` e caía no `?.()`, silenciosamente descartado.
 *
 * O que mascarava o bug: `stats` e `snapshot` são reenviados a cada tique, então
 * vida, atributos e battle list se recuperavam sozinhos. `inventory` é mensagem
 * de UMA VEZ SÓ — só volta quando o inventário muda. Resultado: equipamento e
 * mochila ficavam vazios até o jogador pegar ou soltar algo, o que parecia
 * "a mochila não abre".
 *
 * Enfileirar preserva a ORDEM original do servidor, que importa: `welcome`
 * define `myId`, e quem chega depois já conta com ele.
 */
const pendingGameMessages: ServerMessage[] = [];

/**
 * Só depois disto o handler pode receber mensagem.
 *
 * 🔴 Não basta ter `gameHandler` instalado. `setGameHandler` é chamado no MEIO
 * de `startGame` (linha ~1009), e o corpo dela segue declarando estado que os
 * handlers usam — `goldEmMao` (~2044) e `myCondKey` (~2907) entre outros.
 * Entregar mensagem nesse intervalo bate na zona morta temporal do `const`/`let`
 * e estoura com *"Cannot access 'goldEmMao' before initialization"*.
 *
 * Antes isso nunca acontecia por acidente: as mensagens chegavam pela rede, ou
 * seja, sempre DEPOIS de o corpo inteiro ter rodado.
 */
let gameReady = false;

function setGameHandler(fn: (msg: ServerMessage) => void): void {
  gameHandler = fn;
}

/**
 * Libera a partida e entrega o que chegou durante o carregamento, na ordem.
 * Chamada no FIM de `startGame`, quando todo o estado já existe.
 */
function flushPendingGameMessages(): void {
  gameReady = true;
  const fila = pendingGameMessages.splice(0, pendingGameMessages.length);
  for (const m of fila) gameHandler?.(m);
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
        // Sem `.then(...)` para entregar o `welcome`: ele cai na fila abaixo
        // como qualquer outra, e `setGameHandler` a drena na ordem certa. Antes,
        // o `welcome` era o ÚNICO entregue — o que vinha logo atrás dele
        // (inventário!) morria no `gameHandler?.()` com o handler ainda nulo.
        void startGame(
          escolhido?.name ?? 'Herói',
          escolhido?.charClass ?? 'knight',
          escolhido?.gender ?? 'male',
        );
      }
      break;
    default:
      break;
  }
  // `gameReady` e não só `gameHandler`: entre instalar o handler e terminar o
  // corpo de `startGame` há estado ainda não inicializado. Ver `gameReady`.
  if (gameReady && gameHandler) {
    gameHandler(msg);
    return;
  }
  // Ainda carregando o mundo: guarda em vez de descartar. Só depois do
  // `welcome` — antes disso o servidor não manda mensagem de partida, e
  // enfileirar lixo de uma sessão anterior seria pior que perdê-lo.
  if (gameStarted) pendingGameMessages.push(msg);
}

/*
 * 🔴 AUTO-LOGIN DE DESENVOLVIMENTO — TEMPORÁRIO
 *
 * Pula a tela de login e entra direto no primeiro personagem da conta. Existe
 * porque o Vite recarrega a página a cada edição, e redigitar a senha a cada
 * recarga inviabiliza testar a interface.
 *
 * A senha vai VAZIA de propósito: quem libera a entrada é o servidor de
 * desenvolvimento, comparando o nome com `ELYSIA_DEV_ACCOUNT`. O cliente não
 * guarda, não conhece e não manda senha nenhuma.
 *
 * Travas: `import.meta.env.DEV` (some no build de produção) e a conta precisar
 * estar nomeada aqui. Para desligar, ponha `VITE_DEV_ACCOUNT=` vazio.
 */
const DEV_AUTOLOGIN: string = import.meta.env.DEV
  ? (import.meta.env.VITE_DEV_ACCOUNT ?? 'maxmurtesvieira')
  : '';
/** Já disparou o auto-login? Evita repetir a cada `charlist` que chegar. */
let autoLoginFeito = false;

/**
 * Chave que o botão "Trocar personagem" deixa antes de recarregar a página.
 *
 * 🔴 Por que a troca passa por RECARREGAR e não por desmontar o jogo: o corpo de
 * `startGame` tem ~3.300 linhas e declara, ao longo delas, o estado que os
 * handlers da partida usam (foi o que causou o *"Cannot access 'goldEmMao'
 * before initialization"* de 01/08). Não existe teardown, e escrever um só para
 * este botão seria trocar um problema resolvido por uma classe inteira de bugs
 * de estado meio-desmontado. Recarregar dá estado limpo de graça, e o servidor
 * salva o personagem na queda do socket — que é o mesmo caminho de sempre
 * quando alguém fecha a aba.
 *
 * `sessionStorage` e não `localStorage`: a intenção vale para ESTA recarga, não
 * para sempre. E é consumida na leitura, senão o auto-login pareceria ter
 * quebrado nas recargas seguintes.
 */
const CHAVE_TROCA = 'elysia_trocar_personagem';

/**
 * O jogador pediu para trocar de personagem? Consome a marca ao ler.
 *
 * ⚠️ Só o auto-ENTRADA é pulado; o auto-AUTENTICAÇÃO continua valendo. É essa
 * separação que faz o botão cair na lista de personagens em vez da tela de
 * senha — e o agente não digita senha.
 */
const pediuTrocarPersonagem: boolean = (() => {
  try {
    if (sessionStorage.getItem(CHAVE_TROCA) !== '1') return false;
    sessionStorage.removeItem(CHAVE_TROCA);
    return true;
  } catch {
    return false; // sessionStorage bloqueado (aba anônima restrita): segue o fluxo normal
  }
})();

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

  // 🔴 TEMPORÁRIO: com auto-login, entra no primeiro personagem sem passar pela
  // seleção. `autoLoginFeito` impede laço se o servidor reenviar a lista.
  //
  // ⚠️ `pediuTrocarPersonagem` tem que vencer aqui: sem isto o botão "Trocar
  // personagem" recarregaria e o auto-login devolveria o jogador ao MESMO
  // personagem, que é exatamente o que ele estava tentando deixar.
  if (!pediuTrocarPersonagem && DEV_AUTOLOGIN && !gameStarted && !autoLoginFeito && chars.length > 0) {
    autoLoginFeito = true;
    selectedChar = chars[0]!.id;
    console.warn(`[DEV] auto-login: entrando como "${chars[0]!.name}"`);
    showScreen('none');
    net.enterGame(selectedChar);
    return;
  }

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
      // ⚠️ O ícone não muda mais com o sexo: a arte HD nova tem um corpo só por
      // classe. A escolha continua valendo (é salva e viaja no snapshot) — o dia
      // em que houver variante feminina, é aqui que ela volta a trocar o desenho.
      if (knightIcon) knightIcon.setAttribute('style', knightIconCss(gender, 48));
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
    // O cartão mostra o MESMO boneco que vai andar no mundo — escolher a classe
    // por uma arte e receber outra em tela é o tipo de surpresa que não vale.
    // Classe sem pack HD cai no ícone MiniWorld, como antes.
    const iconStyle = HERO_ART_CLASSES.has(id) ? heroIconCss(id, 48) : classIconCss(id, 48);
    card.innerHTML =
      `<div class="cicon" style="${iconStyle}"></div>` +
      `<div class="cinfo"><b>${def.name}</b><p>${def.blurb}</p></div>`;
    if (id === 'knight' && !HERO_ART_CLASSES.has(id)) knightIcon = card.querySelector('.cicon')!;
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
  // Folhas de monstro no formato de SPEC-SPRITES-MONSTROS.md: 4 direções com
  // andar/parado/ataque/dano/morte. Só carrega as espécies listadas em
  // `CREATURE_SHEETS` — as outras seguem no blob placeholder e nem tentam
  // requisitar arquivo. Ver o comentário da lista para o porquê.
  const creatureSheets = new Map<string, CreatureSheets>();
  for (const [type, cell] of Object.entries(CREATURE_SHEETS)) {
    const sheets = await loadCreatureSheets(type, cell);
    if (sheets) creatureSheets.set(type, sheets);
  }
  // Knight em arte HD (masculino/feminino) — sobrepõe o MiniWorld p/ knight.
  const knightArt = await loadKnightSprites();
  // Arte HD das 4 classes (tiras de `frames2strip`). Sobrepõe TUDO acima para a
  // classe que tiver pack; quem não tiver segue no MiniWorld.
  const heroArt = await loadHeroArt();
  // Sprite do NPC comerciante.
  const npcAnim = await loadNpcAnim();
  // Sprites de árvore (CraftPix), sorteados por bioma. 0 => desenho por código.
  await loadTrees();
  /*
   * Sprites de cristal/minério. Carregados AQUI, antes de o mundo ser montado e
   * antes de qualquer ícone de mochila ser desenhado — `itemIconCanvas` cacheia
   * por `kind`, então um ícone desenhado antes da carga congelaria o
   * placeholder de código e o sprite nunca apareceria naquela sessão.
   */
  await loadCrystals();

  const world = new Container(); // a "câmera"
  const ZOOM = 1.0; // câmera afastada (visão ampla, como no início)
  world.scale.set(ZOOM);
  app.stage.addChild(world);

  const floorRoot = new Container(); // pisos (sprites reais ou placeholder)
  /*
   * 🔴 O piso é ordenado por PEDAÇO (chunk), não pela ordem de inserção.
   *
   * O tile do tileset é de 64 px numa célula de 32, então cada linha se
   * sobrepõe obliquamente à de trás — o efeito depende de as linhas do norte
   * serem desenhadas ANTES. Com os pedaços entrando e saindo conforme a câmera
   * anda, a ordem de inserção deixa de acompanhar a geografia: um pedaço ao
   * norte carregado depois cobriria o do sul. O `zIndex` por linha de pedaço
   * devolve a ordem que o desenho pressupõe.
   */
  floorRoot.sortableChildren = true;
  world.addChild(floorRoot);

  /*
   * ⚠️ **A praça segura NÃO tem marca no chão** (o dono removeu o círculo azul
   * em 2026-08-05, no mesmo dia em que pediu para desenhá-lo).
   *
   * Consequência que vale registrar: a regra ficou **invisível**. Monstro não
   * entra, monstro não ataca e PvP não vale ali dentro, mas nada na tela diz
   * onde isso começa — e é justamente na borda que o jogador fugindo aposta a
   * vida. Enquanto Lumindale tinha muralha, a parede fazia esse trabalho.
   *
   * O plano acordado é que as **casas do vilarejo** voltem a marcá-la quando
   * forem construídas. Se por algum motivo elas não cobrirem o raio inteiro,
   * isto aqui volta a fazer falta.
   */

  // Paredes, árvores E entidades convivem aqui, ordenados por profundidade (y).
  const objects = new Container();
  objects.sortableChildren = true;
  world.addChild(objects);

  const sprites = new Map<string, EntityView>();
  /** Fitas de ícone de condição, por id de entidade (criadas sob demanda). */
  const condStrips = new Map<string, ReturnType<typeof makeConditionStrip>>();
  /** ⚪ Caveira sobre o personagem, por id (também sob demanda — é raríssima). */
  const skullMarks = new Map<string, ReturnType<typeof makeSkullMark>>();

  // ---- Mover por clique: marcadores no chão ------------------------------
  //
  // Dois retângulos desenhados por cima do piso e por baixo de tudo o mais
  // (zIndex negativo): o tile sob o mouse e o destino clicado.
  const hoverMark = new Graphics();
  hoverMark.rect(1, 1, TS - 2, TS - 2).stroke({ width: 1, color: 0xd8e8d8, alpha: 0.5 });
  hoverMark.zIndex = -0.9;
  hoverMark.visible = false;
  hoverMark.eventMode = 'none';
  objects.addChild(hoverMark);

  const destMark = new Graphics();
  destMark.rect(1, 1, TS - 2, TS - 2)
    .fill({ color: 0x5fd15f, alpha: 0.16 })
    .stroke({ width: 2, color: 0x6cf06c, alpha: 0.95 });
  destMark.zIndex = -0.8;
  destMark.visible = false;
  destMark.eventMode = 'none';
  objects.addChild(destMark);

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

  // ---- Mover por clique ---------------------------------------------------
  //
  // O servidor continua a autoridade: ele só entende PASSO (`{t:'move',dx,dy}`),
  // e é isso que continuamos mandando. O clique só decide a SEQUÊNCIA de passos.
  // Nada de "andar até (x,y)" no protocolo — seria abrir a porta para o cliente
  // ditar posição.
  //
  // Rota por BFS e não A*: a grade é 60×60 (3.600 nós no pior caso, e sempre
  // menos por causa do teto abaixo), roda uma vez por clique, e BFS já dá o
  // caminho MAIS CURTO em grade de custo uniforme. A* aqui seria heurística sem
  // ganho mensurável.
  let caminho: Array<{ x: number; y: number }> = [];
  /** Quando o passo atual foi pedido, para detectar rota travada. */
  let passoPedidoEm = 0;

  /** Teto de nós visitados. Clique no outro canto do mapa não pode travar o frame. */
  const PATH_MAX_NOS = 4000;
  /** Sem sair do lugar por este tempo, a rota é recalculada (algo entrou na frente). */
  const PASSO_TRAVADO_MS = 700;

  /**
   * Tiles que a rota tem que DESVIAR, como `y * largura + x`.
   *
   * Espelha o `tileOccupied` do servidor: criatura viva e outro jogador. Sem
   * isso a rota planejaria atravessar monstro, e desde que monstro ganhou colisão
   * o personagem andaria até encostar nele e ficaria empurrando parede.
   */
  const tilesBloqueados = new Set<number>();

  /**
   * Tiles onde clicar significa INTERAGIR, não andar: monstro (atacar), NPC
   * (abrir loja/banco), corpo no chão (saquear), outro jogador.
   *
   * 🔴 Existe por um bug real: o sprite da entidade tem `pointertap` próprio, mas
   * o clique nativo do DOM **continua subindo** até o `viewport` e disparava a
   * caminhada também. Clicar num monstro atacava E mandava andar até o tile dele
   * — que é justamente o que o dono não quer ("estou atacando, não indo até ele").
   *
   * Separado de `tilesBloqueados` porque as duas listas não são a mesma coisa:
   * NPC e corpo não bloqueiam passagem, mas o clique neles não é ordem de andar.
   */
  const tilesClicaveis = new Set<number>();

  /** Outros JOGADORES por tile — quem o botão direito abre o menu. */
  const jogadoresPorTile = new Map<number, EntitySnapshot>();
  /**
   * Itens no chão, por tile — para o arraste saber o que foi agarrado.
   *
   * Um tile pode ter várias pilhas; guarda-se a ÚLTIMA do snapshot, que é a que
   * o render desenha por cima. Pegar o que se está vendo é a única regra que não
   * surpreende.
   */
  const itensPorTile = new Map<number, EntitySnapshot>();
  /** Último snapshot indexado por id: a ficha do menu sai daqui, sem ida ao servidor. */
  const porId = new Map<string, EntitySnapshot>();

  function podeAndar(x: number, y: number): boolean {
    if (!isWalkable(map, x, y, myFloor)) return false;
    return !tilesBloqueados.has(y * map.width + x);
  }

  /** Vizinhos considerados pela rota: 4 direções, sem diagonal (ver `rotaAte`). */
  const PASSOS_RETOS: Array<[number, number]> = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  /**
   * Menor caminho de (sx,sy) até (tx,ty), sem incluir a origem. `[]` se não há
   * rota — e aí a caminhada é cancelada em vez de o personagem ficar tentando.
   *
   * Destino ocupado também devolve `[]`: um tile com monstro em cima não é
   * caminhável (é a regra de colisão), e insistir nele faria o personagem empurrar
   * parede no fim da rota. Clique EM monstro nem chega aqui — é interação, não
   * caminhada (ver `tilesClicaveis`).
   */
  function rotaAte(sx: number, sy: number, tx: number, ty: number): Array<{ x: number; y: number }> {
    if (sx === tx && sy === ty) return [];
    if (!podeAndar(tx, ty)) return [];
    const largura = map.width;
    const anterior = new Map<number, number>();
    const key = (x: number, y: number) => y * largura + x;
    const fila: number[] = [key(sx, sy)];
    const visto = new Set<number>(fila);
    let cabeca = 0;
    while (cabeca < fila.length && visto.size < PATH_MAX_NOS) {
      const atual = fila[cabeca++]!;
      const ax = atual % largura;
      const ay = Math.floor(atual / largura);
      if (ax === tx && ay === ty) {
        // Reconstrói de trás para frente.
        const saida: Array<{ x: number; y: number }> = [];
        let no = atual;
        while (no !== key(sx, sy)) {
          saida.push({ x: no % largura, y: Math.floor(no / largura) });
          no = anterior.get(no)!;
        }
        return saida.reverse();
      }
      // 🔴 **4 direções, sem diagonal — e isto é o conserto de um bug real.**
      //
      // Com 8 direções a rota saía quase toda diagonal (é o menor número de
      // passos em distância de Chebyshev). Só que o servidor resolve a direção do
      // sprite por `dirFromDelta`, e num passo diagonal `|dx| === |dy|` cai no
      // empate `abs(dx) >= abs(dy)` → sempre 'right'/'left'. Resultado: o
      // personagem atravessava o mapa inteiro **virado de lado**, exatamente como
      // o dono relatou.
      //
      // Sem diagonal, cada passo tem um eixo só, a direção do sprite é sempre a
      // do movimento, e andar por clique fica idêntico a andar por tecla — que é
      // a referência que o jogador tem.
      //
      // ⚠️ Custo consciente: diagonal pura fica ~33 % mais lenta (2n passos de
      // custo 1 em vez de n passos de custo 1,5), e a rota vira escada/L. Preferir
      // velocidade à leitura é voltar este laço para 8 direções — mas aí o sprite
      // volta a andar de lado, então antes conserte o empate de `dirFromDelta`.
      for (const [dx, dy] of PASSOS_RETOS) {
        const nx = ax + dx;
        const ny = ay + dy;
        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
        const k = key(nx, ny);
        if (visto.has(k)) continue;
        if (!podeAndar(nx, ny)) continue;
        visto.add(k);
        anterior.set(k, atual);
        fila.push(k);
      }
    }
    return [];
  }

  function cancelarRota(): void {
    caminho = [];
    destMark.visible = false;
  }

  function irPara(tx: number, ty: number): void {
    const rota = rotaAte(myTileX, myTileY, tx, ty);
    if (rota.length === 0) {
      cancelarRota();
      return;
    }
    caminho = rota;
    passoPedidoEm = 0;
    destMark.x = tx * TS;
    destMark.y = ty * TS;
    destMark.visible = true;
  }

  function setTarget(id: string): void {
    targetId = id;
    net.send({ t: 'attack', targetId: id });
    // Em modo Perseguir, mirar já começa a andar — senão o jogador teria que
    // clicar em atacar E depois clicar no chão, que é exatamente o trabalho que
    // o modo existe para poupar.
    //
    // `followUltimoTile` é zerado para forçar o recálculo: o alvo pode estar
    // parado no mesmo tile de antes, e sem isso o `tickFollow` acharia que nada
    // mudou e não traçaria rota nenhuma.
    followUltimoTile = -1;
    tickFollow();
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

  /**
   * Id do piso desenhado embaixo de tile alto (árvore, muro). Ver `montaChunk`.
   *
   * 🔴 Sai do BIOMA daquele tile, não é grama fixa. Com o mundo de 300×300, a
   * grama fixa poria um quadrado verde debaixo de cada árvore do Northland e de
   * cada penhasco do deserto.
   */
  const chaoSobTileAlto = (x: number, y: number): number => chaoBaseEm(x, y);

  /** Um tile de piso na posição, do tileset quando há sprite, ou cor chapada. */
  function desenhaChao(pai: Container, x: number, y: number, tileId: number): void {
    const tex = ground?.byId.get(tileId);
    if (tex) {
      // Sprite real do tileset (64px), com sobreposição oblíqua.
      const s = new Sprite(tex);
      s.x = x * TS;
      s.y = y * TS - groundOverhang;
      s.width = ground!.cell;
      s.height = ground!.cell;
      pai.addChild(s);
      return;
    }
    // Placeholder: retângulo colorido.
    const g = new Graphics();
    g.rect(x * TS, y * TS, TS, TS).fill(getTileType(tileId).color);
    g.rect(x * TS, y * TS, TS, TS).stroke({ width: 1, color: 0x000000, alpha: 0.12 });
    pai.addChild(g);
  }

  /*
   * ==========================================================================
   * CENÁRIO POR PEDAÇOS (chunks)
   * ==========================================================================
   *
   * 🔴 **Só existe na tela o que está PERTO da câmera.** Antes, `rebuildFloor`
   * montava o andar INTEIRO de uma vez: um sprite por tile, mais um objeto por
   * parede e por árvore. Com Valoria (60×60 = 3.600 tiles) isso passava sem
   * ninguém notar.
   *
   * O mundo de Elysia tem **300×300 = 90.000 tiles**. Vinte e cinco vezes mais
   * objetos, montados de uma vez, no carregamento — não é lentidão, é a aba
   * morrendo. Este é o pré-requisito do mapa grande, e é por isso que ele veio
   * antes de gerar o terreno novo.
   *
   * O que muda: o mapa é cortado em quadrados de `CHUNK` tiles, e só os que
   * cruzam a tela (mais uma margem) ficam montados. O custo passa a ser o
   * TAMANHO DA TELA, não o tamanho do mundo — 300×300 e 3000×3000 pesam igual.
   */
  const CHUNK = 16;

  /**
   * Margem, em pedaços, montada além do que a tela mostra.
   *
   * ⚠️ REFERÊNCIA. Com `0`, o pedaço nasceria exatamente quando entrasse no
   * quadro e o jogador veria o cenário aparecer na borda. Com `1` ele já está
   * pronto um pedaço antes — e é também a histerese que impede o liga-desliga
   * de quem anda em cima da divisa.
   */
  const CHUNK_MARGEM = 1;

  interface ChunkView {
    /** Container do piso; sai inteiro de uma vez. */
    piso: Container;
    /**
     * Paredes e árvores.
     *
     * 🔴 Ficam SOLTAS em `objects`, e não num container do pedaço, porque
     * precisam ser ordenadas por `y` **junto com as entidades** — é o que faz o
     * jogador passar por trás de uma árvore. Agrupá-las por pedaço as ordenaria
     * entre si e depois o grupo inteiro contra os personagens, e aí um monstro
     * dois tiles à frente da árvore apareceria atrás dela.
     */
    altos: Container[];
  }

  const chunksVivos = new Map<string, ChunkView>();
  let chunkRangeAtual = '';

  function montaChunk(cx: number, cy: number, layer: number[]): ChunkView {
    const piso = new Container();
    // Ver o comentário de `floorRoot.sortableChildren`: a linha do pedaço é o
    // que devolve a sobreposição oblíqua entre pedaços vizinhos.
    piso.zIndex = cy;
    const altos: Container[] = [];

    const x1 = Math.min(map.width, (cx + 1) * CHUNK);
    const y1 = Math.min(map.height, (cy + 1) * CHUNK);
    for (let y = cy * CHUNK; y < y1; y++) {
      for (let x = cx * CHUNK; x < x1; x++) {
        const t = getTileType(layer[y * map.width + x]!);
        if (t.name === 'void') continue;

        /*
         * 🔴 O CHÃO É DESENHADO SEMPRE, inclusive debaixo de tile ALTO.
         *
         * Bug relatado pelo dono: **toda árvore ficava com um quadrado preto em
         * volta.** A causa era o laço antigo: só tile de `height === 0` ganhava
         * piso, e árvore tem altura 1. Para muro isso nunca apareceu, porque a
         * face 2.5D cobre o tile inteiro; a árvore é só tronco e copa, então o
         * fundo da página aparecia nos cantos — e "fundo da página" é preto.
         *
         * O piso usado embaixo do tile alto é o CHÃO DO BIOMA daquele tile
         * (`chaoBaseEm`): neve no Northland, areia no deserto, rocha na
         * montanha. Onde a escolha poderia estar errada (parede de casa sobre
         * terra batida), o bloco cobre o tile inteiro e ninguém vê.
         */
        /*
         * O chão embaixo do tile alto serve a DUAS coisas, e por isso sai numa
         * variável: ele é o piso desenhado, e é o que diz a que bioma a árvore
         * pertence (areia → palmeira, neve → conífera). Ver `treeTexFor`.
         */
        const chaoId = t.height === 0 ? t.id : chaoSobTileAlto(x, y);
        desenhaChao(piso, x, y, chaoId);

        if (t.height === 0) continue;
        const arvore = t.name === 'tree' ? treeTexFor(chaoId, x, y) : null;
        if (arvore) {
          altos.push(makeTree(x, y, arvore));
        } else {
          // Parede (e árvore sem sprite) desenhadas por código (2.5D).
          altos.push(makeBlock(x, y, t.name, t.color));
        }
      }
    }

    floorRoot.addChild(piso);
    for (const a of altos) objects.addChild(a);
    return { piso, altos };
  }

  function descartaChunk(view: ChunkView): void {
    view.piso.destroy({ children: true });
    for (const a of view.altos) a.destroy();
  }

  /** Joga fora todos os pedaços montados (troca de andar). */
  function limpaChunks(): void {
    for (const v of chunksVivos.values()) descartaChunk(v);
    chunksVivos.clear();
    chunkRangeAtual = '';
  }

  /**
   * Monta o que entrou na tela e joga fora o que saiu.
   *
   * Roda a cada quadro, mas só faz trabalho quando a **faixa de pedaços** muda —
   * ou seja, uma vez a cada 16 tiles andados, não 60 vezes por segundo.
   */
  function atualizaChunks(): void {
    const layer = map.floors[renderedFloor];
    if (!layer) return;

    // Retângulo do mundo que a tela cobre, em tiles. `world.x/y` é o
    // deslocamento da câmera e `ZOOM` a escala — o inverso de `tileDoEvento`.
    const tx0 = Math.floor(-world.x / ZOOM / TS);
    const ty0 = Math.floor(-world.y / ZOOM / TS);
    const tx1 = Math.ceil((-world.x + app.screen.width) / ZOOM / TS);
    const ty1 = Math.ceil((-world.y + app.screen.height) / ZOOM / TS);

    const cx0 = Math.max(0, Math.floor(tx0 / CHUNK) - CHUNK_MARGEM);
    const cy0 = Math.max(0, Math.floor(ty0 / CHUNK) - CHUNK_MARGEM);
    const cx1 = Math.min(Math.ceil(map.width / CHUNK) - 1, Math.floor(tx1 / CHUNK) + CHUNK_MARGEM);
    const cy1 = Math.min(Math.ceil(map.height / CHUNK) - 1, Math.floor(ty1 / CHUNK) + CHUNK_MARGEM);

    const assinatura = `${renderedFloor}:${cx0},${cy0},${cx1},${cy1}`;
    if (assinatura === chunkRangeAtual) return;
    chunkRangeAtual = assinatura;

    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const k = `${cx},${cy}`;
        if (!chunksVivos.has(k)) chunksVivos.set(k, montaChunk(cx, cy, layer));
      }
    }
    for (const [k, v] of chunksVivos) {
      const [cx, cy] = k.split(',').map(Number) as [number, number];
      if (cx < cx0 || cx > cx1 || cy < cy0 || cy > cy1) {
        descartaChunk(v);
        chunksVivos.delete(k);
      }
    }
  }

  function rebuildFloor(floor: number): void {
    limpaChunks();
    renderedFloor = floor;
    if (!map.floors[floor]) return;
    atualizaChunks();
  }

  /** Árvore com sprite HD: base no rodapé do tile, copa subindo, oclusão por y. */
  /**
   * Desenha a árvore de (x,y). A largura vem do próprio sprite (`ArvoreSprite`),
   * porque ela varia por espécie — ver o comentário de `LARGURA` em `trees.ts`.
   */
  function makeTree(x: number, y: number, arv: ArvoreSprite): Container {
    const { tex, largura, base, centro, cheia } = arv;
    const c = new Container();
    const px = x * TS + TS / 2;
    const py = y * TS + TS - 2; // o pé da árvore, um respiro acima do rodapé
    // Largura pedida ÷ quanto da moldura o desenho ocupa: assim `largura` vale
    // para a copa, e não para a transparência em volta dela.
    const escala = (TS * largura) / (tex.width * cheia);

    /*
     * Sombra desenhada por CÓDIGO, e não a do pack.
     *
     * O acabamento `Trees_shadow` da CraftPix traz uma elipse CLARA, feita para
     * fundo claro; sobre a grama escura de Elysia ela vira um borrão
     * esbranquiçado. Uma elipse preta translúcida assenta a árvore em qualquer
     * chão — areia, neve ou grama — e é a mesma que o `makeBlock` já usava.
     */
    const sombra = new Graphics();
    // A sombra acompanha a copa: árvore grande projeta sombra grande.
    sombra.ellipse(px, py, (TS * largura) / 4.5, (TS * largura) / 14)
      .fill({ color: 0x000000, alpha: 0.24 });

    const s = new Sprite(tex);
    /*
     * 🔴 Âncora na CAIXA MEDIDA do desenho, não na moldura do PNG.
     *
     * Com `anchor.set(0.5, 1)` o ponto de apoio era o rodapé e o meio do
     * arquivo, e em vários destes PNGs isso é só transparência: a árvore boiava
     * acima da própria sombra (o bug do "grid errado") e saía do eixo quando o
     * desenho não estava centrado. Ver `ArvoreSprite`.
     */
    s.anchor.set(centro, base);
    s.scale.set(escala);
    s.x = px;
    s.y = py; // agora o PÉ do desenho assenta exatamente onde a sombra está
    c.addChild(sombra, s);

    c.zIndex = y; // profundidade: linhas da frente cobrem as de trás
    return c;
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
          updateDayNight(msg.hour, msg.night, msg.phase);
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
          /*
           * Velocidade autoritativa do herói, arredondada para CIMA ao tique.
           *
           * O servidor só libera um passo quando `now - lastMove >= moveInterval`,
           * e ele testa isso uma vez por tique de 15 Hz. Então o intervalo que
           * chega na tela não é o nominal: é o nominal subido ao próximo múltiplo
           * do tique. Com 278 ms e tique de 66,7 ms, o passo real sai a cada
           * ~333 ms.
           *
           * Arredondar é mais exato que somar um tique cheio de folga: acerta a
           * duração em vez de ficar sempre um pouco longa, e deslize longo demais
           * deixa o sprite arrastando atrás da posição real.
           */
          heroiStepMs = Math.ceil(msg.moveIntervalMs / SERVER_TICK_MS) * SERVER_TICK_MS;
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
            } else if (msg.fatal) {
              // Golpe fatal toca MORTE, não dano. Piscar de dor e cair ao mesmo
              // tempo lê como bug; e a morte é terminal, então não faz sentido
              // gastar a animação de dano antes dela.
              view.playDeath?.();
              const elemento = msg.element && msg.element !== 'physical'
                ? ELEMENT_INFO[msg.element].color
                : undefined;
              spawnFloater(
                view.container.x, view.container.y - 12, String(msg.amount),
                msg.crit ? 0xffcf3f : elemento ?? 0xffffff, msg.crit,
              );
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
        case 'gathered': {
          // O ganho sobe DO NÓ, e não do rodapé do chat: é onde os olhos do
          // jogador estão no instante em que ele coleta, e é a mesma gramática
          // do número de dano subindo do monstro.
          const nome = getItem(msg.itemKind)?.name ?? msg.itemKind;
          spawnFloater(msg.x * TS, msg.y * TS - 8, `+${msg.amount} ${nome}`, 0xa9e0a0, false);
          if (msg.levelUp) {
            spawnFloater(
              msg.x * TS, msg.y * TS - 30,
              `${PROFESSION_NAME[msg.profession]} ${msg.levelUp}!`, 0xffd97a, true,
            );
          }
          logChat(
            `Você coletou <b>${escapeHtml(nome)}</b> `
            + `(+${msg.xp} de ${escapeHtml(PROFESSION_NAME[msg.profession])})`
            + `${msg.depleted ? ' — e o recurso se esgotou.' : '.'}`,
          );
          break;
        }
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
        case 'party':
          party = msg.party;
          renderParty();
          break;
        case 'partyinvite':
          mostrarConvite(msg.fromId, msg.fromName, msg.expiresAt);
          break;
        case 'friends':
          friends = msg.list;
          renderFriends();
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
  /**
   * Ícone de item de LOOT, por identidade — fragmento, receita ou material.
   *
   * 🔴 Antes, todo `loot` era a MESMA elipse mudando só de cor. Com os 38 itens
   * novos (7 fragmentos + 7 receitas + 24 materiais), a mochila virou uma parede
   * de bolinhas coloridas: Fragmento Comum, Gosma de Slime e Receita Rara eram
   * visualmente a mesma coisa.
   *
   * Cor sozinha não resolve — é o mesmo motivo dos ícones de condição: ninguém
   * memoriza 38 tons, e quem tem daltonismo não distingue nenhum. A FORMA é o que
   * carrega a identidade, e a cor passa a ser o detalhe.
   */
  function drawLootShape(g: CanvasRenderingContext2D, kind: string, color: number): void {
    const c = hx(color);
    const escuro = hx(shade(color, 0.5));
    const meio = S / 2;
    const contorno = (): void => { g.lineWidth = 1.4; g.strokeStyle = escuro; g.stroke(); };
    const brilho = (x: number, y: number): void => {
      g.fillStyle = 'rgba(255,255,255,0.28)';
      g.beginPath(); g.ellipse(x, y, 2.2, 1.5, 0, 0, Math.PI * 2); g.fill();
    };

    // FRAGMENTO: lasca angular. É "pedaço de equipamento quebrado", então tem que
    // parecer quebrado — arestas retas e irregulares, nada de curva orgânica.
    if (kind.startsWith('fragment_')) {
      g.beginPath();
      g.moveTo(meio - 6, meio + 6); g.lineTo(meio - 3, meio - 6);
      g.lineTo(meio + 5, meio - 3); g.lineTo(meio + 2, meio + 2);
      g.lineTo(meio + 6, meio + 6); g.closePath();
      g.fillStyle = c; g.fill(); contorno();
      brilho(meio - 2, meio - 2);
      return;
    }

    // RECEITA: pergaminho enrolado. Retângulo claro com dois rolos nas pontas e
    // linhas de escrita — lê como "papel" mesmo a 24 px.
    if (kind.startsWith('recipe_')) {
      g.fillStyle = '#e8dcc0';
      g.fillRect(meio - 6, 5, 12, S - 10);
      g.lineWidth = 1.2; g.strokeStyle = '#8a7a5a';
      g.strokeRect(meio - 6, 5, 12, S - 10);
      // Rolos: a cor da raridade fica aqui, e não no papel, para o papel
      // continuar reconhecível como papel.
      g.fillStyle = c;
      g.fillRect(meio - 7, 3, 14, 3);
      g.fillRect(meio - 7, S - 6, 14, 3);
      g.fillStyle = '#8a7a5a';
      for (let i = 0; i < 3; i++) g.fillRect(meio - 4, 9 + i * 3, 8, 1);
      return;
    }

    // MATERIAL: forma por FAMÍLIA. A taxonomia do cap. 44 já classifica tudo, e
    // usá-la aqui é o que faz o ícone dizer "isto é osso" e não só "isto é loot".
    const fam = getMaterial(kind)?.family;
    switch (fam) {
      case 'osso': // dois nós e uma haste
        g.fillStyle = c;
        g.beginPath(); g.arc(meio - 5, meio - 4, 3, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(meio + 5, meio + 4, 3, 0, Math.PI * 2); g.fill();
        g.lineWidth = 3.5; g.strokeStyle = c;
        g.beginPath(); g.moveTo(meio - 4, meio - 3); g.lineTo(meio + 4, meio + 3); g.stroke();
        break;

      case 'couro': // pele esticada, quadrilátero irregular
        g.beginPath();
        g.moveTo(meio - 7, meio - 4); g.lineTo(meio + 5, meio - 6);
        g.lineTo(meio + 7, meio + 5); g.lineTo(meio - 5, meio + 6);
        g.closePath();
        g.fillStyle = c; g.fill(); contorno();
        brilho(meio - 2, meio - 1);
        break;

      case 'tecido': // pano dobrado
        g.fillStyle = c;
        g.beginPath();
        g.moveTo(meio - 7, meio + 5); g.lineTo(meio - 7, meio - 3);
        g.quadraticCurveTo(meio, meio - 8, meio + 7, meio - 3);
        g.lineTo(meio + 7, meio + 5);
        g.quadraticCurveTo(meio, meio + 1, meio - 7, meio + 5);
        g.closePath();
        g.fill(); contorno();
        break;

      case 'escama': // três escamas sobrepostas
        g.fillStyle = c;
        for (const [ox, oy] of [[-4, 1], [4, 1], [0, -4]] as const) {
          g.beginPath();
          g.arc(meio + ox, meio + oy + 2, 4, Math.PI, 0);
          g.closePath(); g.fill();
          g.lineWidth = 1; g.strokeStyle = escuro; g.stroke();
        }
        break;

      case 'presa':
      case 'garra':
      case 'chifre': // ponta curva
        g.beginPath();
        g.moveTo(meio - 5, meio + 7);
        g.quadraticCurveTo(meio - 2, meio - 5, meio + 6, meio - 7);
        g.quadraticCurveTo(meio + 1, meio + 1, meio - 1, meio + 7);
        g.closePath();
        g.fillStyle = c; g.fill(); contorno();
        break;

      case 'sangue': // frasco com líquido
        g.fillStyle = '#cfc8b6'; g.fillRect(meio - 2, 3, 4, 3); // tampa
        g.beginPath();
        g.moveTo(meio - 5, 7); g.lineTo(meio + 5, 7);
        g.lineTo(meio + 5, S - 4); g.lineTo(meio - 5, S - 4); g.closePath();
        g.fillStyle = hx(shade(color, 0.4)); g.fill();
        g.fillStyle = c; g.fillRect(meio - 5, 12, 10, S - 16);
        g.lineWidth = 1.2; g.strokeStyle = '#0a0908'; g.stroke();
        break;

      case 'essencia': // orbe com faísca — o que é mágico brilha
        g.beginPath(); g.arc(meio, meio, 6.5, 0, Math.PI * 2);
        g.fillStyle = c; g.fill();
        g.lineWidth = 1.2; g.strokeStyle = escuro; g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(meio, meio - 8); g.lineTo(meio, meio + 8);
        g.moveTo(meio - 8, meio); g.lineTo(meio + 8, meio);
        g.stroke();
        break;

      default: // blob orgânico — o antigo, para o que não é material catalogado
        g.beginPath(); g.ellipse(meio, meio + 1, 8, 7, 0, 0, Math.PI * 2);
        g.fillStyle = c; g.fill(); contorno();
        brilho(meio - 2, meio - 2);
    }
  }

  /**
   * O desenho do item, em canvas — **fonte única do ícone**.
   *
   * A mochila consome como data URL (`itemIconUrl`) e o chão consome como
   * textura do Pixi (`itemTexture`). Os dois têm que sair daqui: enquanto o
   * chão desenhava por conta própria, ele desenhava **três círculos dourados
   * para qualquer item** — poção solta no chão parecia pilha de ouro, e o
   * jogador concluía (com razão) que tinha soltado a coisa errada.
   */
  const itemIconCanvasCache = new Map<string, HTMLCanvasElement>();
  function itemIconCanvas(kind: string): HTMLCanvasElement {
    const hit = itemIconCanvasCache.get(kind);
    if (hit) return hit;
    const def = getItem(kind);
    const color = def?.color ?? 0x999999;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const g = cv.getContext('2d')!;

    /*
     * Sprite de cristal/minério, quando o pack está presente.
     *
     * Usa o PNG de **16×16 que o artista desenhou**, ampliado com
     * `imageSmoothingEnabled = false`, e não o de 64 reduzido: encolher pixel
     * art borra o contorno e apaga o brilho, que é justamente o que faz o
     * cristal ser reconhecível num slot pequeno.
     */
    const cristal = crystalIconImage(kind);
    if (cristal) {
      g.imageSmoothingEnabled = false;
      const m = 1; // respiro de 1 px para o ícone não colar na borda do slot
      g.drawImage(cristal, m, m, S - m * 2, S - m * 2);
      itemIconCanvasCache.set(kind, cv);
      return cv;
    }

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
      drawLootShape(g, kind, color);
    }
    itemIconCanvasCache.set(kind, cv);
    return cv;
  }

  function itemIconUrl(kind: string): string {
    const c = itemIconCache.get(kind);
    if (c) return c;
    const url = itemIconCanvas(kind).toDataURL();
    itemIconCache.set(kind, url);
    return url;
  }

  /**
   * O mesmo ícone como textura do Pixi, para o item no chão.
   *
   * Cacheado por `kind`: sem isto, cada pilha caída no mapa criaria uma textura
   * nova, e o vazamento seria proporcional ao chão sujo — que é justamente o
   * cenário de uma caçada longa.
   */
  const itemTexCache = new Map<string, Texture>();
  function itemTexture(kind: string): Texture {
    let t = itemTexCache.get(kind);
    if (!t) {
      t = Texture.from(itemIconCanvas(kind));
      itemTexCache.set(kind, t);
    }
    return t;
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
    // Cap. 46: o nome do item carrega os modificadores —
    // "Espada Longa Feroz do Dragão". É o que faz duas peças do mesmo modelo se
    // distinguirem antes de o jogador ler os passivos.
    const nome = composeItemName(def.name, stack.roll?.prefix, stack.roll?.suffix);
    linhas.push(rar ? `${nome} [${rar.name}]` : nome);

    // O elemento vem do prefixo e muda o TIPO do dano, não só o número — por
    // isso ganha linha própria em vez de virar mais um passivo na lista.
    const elem = affixDamageType(stack.roll?.prefix);
    if (elem && elem !== 'physical') {
      linhas.push(`Dano de ${ELEMENT_INFO[elem].name}`);
    }

    // Para quem a peça foi feita (cap. 38). É recomendação, não restrição — o
    // doc diz "prioriza". Resolve o problema real de hoje: não havia como saber
    // que cajado é coisa de Feiticeiro.
    const afinidade = def.weaponType
      ? WEAPON_CLASS_AFFINITY[def.weaponType]
      : def.armorClass ? ARMOR_CLASS_AFFINITY[def.armorClass] : undefined;
    if (afinidade?.length) {
      const nomes = afinidade.map((c) => CLASSES[c as PlayerClass]?.name ?? c);
      linhas.push(`Recomendado: ${nomes.join(', ')}`);
    }

    if (def.weaponType) {
      const w = WEAPON_IDENTITY[def.weaponType];
      linhas.push(`${w.name} · ${w.hands === 2 ? 'duas mãos' : 'uma mão'} · alcance ${w.range}`);
      linhas.push(w.blurb);
      // A maestria é da PROFICIÊNCIA, não do tipo de arma: um Cajado mostra o
      // Magic Level, e arco e besta mostram a mesma Distância.
      const kind = proficiencyFor(def.weaponType);
      const prof = myProficiencies[kind];
      linhas.push(`${PROFICIENCY_LABEL[kind]}: ${prof?.level ?? 0}`);
    }
    const mult = rar ? rar.statMult : 1;
    if (def.atk) linhas.push(`Ataque ${Math.round(def.atk * mult)}`);
    if (def.def) linhas.push(`Defesa ${Math.round(def.def * mult)}`);
    // 🔴 O bônus FIXO do modelo vem antes dos sorteados, e sem indentação: num
    // anel ele é a peça inteira, não um extra. Esconder isso deixaria o Anel da
    // Vida indistinguível do Anel da Mana na mochila.
    //
    // ⚠️ Sem `mult`: a raridade não multiplica o bônus fixo (ver `equipBonus` no
    // servidor). Mostrar multiplicado aqui prometeria o que o cálculo não entrega.
    for (const [id, valor] of Object.entries(def.bonus ?? {})) {
      linhas.push(affixText({ id: id as AffixId, value: valor }));
    }
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
    // 🔴 O slot é alvo de soltura mesmo VAZIO — é justamente para o vazio que se
    // arrasta ao arrumar a mochila. Por isso o `dragover` fica fora do `if
    // (stack)`: célula vazia não tem ícone, mas tem posição.
    if (dragData) {
      const destino = dragData; // ex.: "bp:7" ou "dp:3"
      cell.addEventListener('dragover', (e) => {
        // Só aceita origem da MESMA lista: mochila com mochila, depósito com
        // depósito. Cruzar as duas é o que o botão do Depósito já faz, e por um
        // caminho que valida proximidade.
        e.preventDefault();
      });
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation(); // senão a grade também trata e vira desequipar
        const d = e.dataTransfer?.getData('text/plain') ?? '';
        const [prefOrigem, iOrigem] = d.split(':');
        const [prefDestino, iDestino] = destino.split(':');
        if (!prefOrigem || prefOrigem !== prefDestino) return;
        const where = prefOrigem === 'bp' ? 'backpack' : 'depot';
        net.send({
          t: 'moveitem',
          from: Number(iOrigem),
          to: Number(iDestino),
          where,
        });
      });
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
      const cell = makeItemCell(stack, () => onBackpackClick(i, stack), `bp:${i}`);
      // SOLTAR NO CHÃO com o botão direito. Escolhido em vez de um botão na
      // interface porque o gesto tem que ser rápido: a função dele é despachar
      // excesso durante a caça, e parar para clicar num botão por item anula o
      // ganho. O clique esquerdo continua sendo usar/equipar, então não há
      // conflito de gesto.
      if (stack) {
        cell.oncontextmenu = (ev): void => {
          ev.preventDefault();
          // Shift solta a pilha inteira; sem shift, uma unidade. Empilhável
          // costuma ser o que mais entope a mochila, e soltar 300 fragmentos por
          // engano com um clique seria irreversível.
          const tudo = ev.shiftKey || stack.amount === 1;
          net.send({ t: 'drop', slot: i, ...(tudo ? {} : { amount: 1 }) });
        };
      }
      bpGrid.appendChild(cell);
    });
    // Depósito (só aparece dentro do DP).
    depotBox.style.display = currentInv.atDepot ? 'block' : 'none';
    if (currentInv.atDepot) {
      dpGrid.innerHTML = '';
      currentInv.depot.forEach((stack, i) => {
        dpGrid.appendChild(
          // `dp:` habilita o rearranjo dentro do próprio Depósito, pelo mesmo
          // caminho da mochila. O prefixo diferente é o que impede arrastar de
          // um para o outro por engano — a travessia entre os dois continua
          // sendo o clique, que valida proximidade do baú.
          makeItemCell(
            stack,
            () => { if (stack) net.send({ t: 'store', index: i, to: 'backpack' }); },
            `dp:${i}`,
          ),
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

  /**
   * Corpo/bolsa que o jogador clicou de LONGE e quer abrir quando chegar lá.
   *
   * Antes, clicar de longe só devolvia "Aproxime-se do corpo" — e obrigava o
   * jogador a fazer à mão o que o jogo sabia fazer: andar até lá. Matar à
   * distância e ter que caminhar manualmente até o espólio é atrito puro.
   */
  let abrirAoChegar: string | null = null;

  /** Distância de Chebyshev do herói até um tile. */
  const distDoHeroi = (x: number, y: number): number =>
    Math.max(Math.abs(x - myTileX), Math.abs(y - myTileY));

  function openCorpse(id: string): void {
    const alvo = porId.get(id);
    // Perto o bastante (ou sumiu do snapshot): tenta abrir agora. O servidor
    // continua sendo quem decide — aqui só se evita a ida inútil.
    if (!alvo || distDoHeroi(alvo.tileX, alvo.tileY) <= 1) {
      abrirAoChegar = null;
      openCorpseId = id;
      net.send({ t: 'opencorpse', corpseId: id });
      return;
    }
    // Longe: anda até AO LADO e abre ao chegar. Parar em cima do corpo era o que
    // acontecia antes; é a mesma regra da coleta (ver `irParaPerto`) e vale para
    // tudo que se clica no chão — ninguém saqueia pisando no morto.
    abrirAoChegar = id;
    irParaPerto(alvo.tileX, alvo.tileY);
  }

  // ---- Coleta e mineração ------------------------------------------------
  //
  // Mesmo par de gestos do espólio: clique perto coleta na hora, clique de longe
  // anda até lá e coleta ao chegar. É de propósito que seja o mesmo — para o
  // jogador, "clicar naquilo ali" é um gesto só, e ele não deveria precisar
  // saber se aquilo é uma bolsa ou um veio de minério para prever o que acontece.

  /** Nó clicado de longe, a coletar quando o herói chegar. */
  let coletarAoChegar: string | null = null;

  /**
   * Anda até ficar AO LADO de (tx,ty) — nunca em cima.
   *
   * 🔴 **Parar ao lado é o comportamento, não um detalhe da rota.** Decisão do
   * dono, vendo em tela: clicar numa moita de ervas levava o personagem para
   * dentro do tile dela, e ele ficava plantado por cima do que estava colhendo.
   * Quem colhe fica ao lado do que colhe — e isso vale para tudo que se clica
   * no chão para interagir, não só para o nó de recurso.
   *
   * 🔴 Também é o que faz a MADEIRA funcionar: o nó de madeira mora em cima do
   * tile de árvore, que é **sólido**. `irPara` devolveria rota vazia e o clique
   * na árvore não faria nada — o jogador clicaria, veria o personagem parado e
   * concluiria que cortar árvore não funciona.
   *
   * Tenta os vizinhos do mais perto ao mais longe e fica no primeiro que tem
   * rota de verdade: o mais próximo em linha reta pode estar do outro lado de um
   * muro, e nesse caso a distância mente.
   */
  function irParaPerto(tx: number, ty: number): void {
    const candidatos: Array<{ x: number; y: number }> = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const x = tx + dx;
        const y = ty + dy;
        if (podeAndar(x, y)) candidatos.push({ x, y });
      }
    }
    candidatos.sort((a, b) => distDoHeroi(a.x, a.y) - distDoHeroi(b.x, b.y));
    for (const c of candidatos) {
      const rota = rotaAte(myTileX, myTileY, c.x, c.y);
      if (rota.length === 0) continue;
      irPara(c.x, c.y);
      return;
    }
    cancelarRota();
  }

  function gatherNode(id: string): void {
    const alvo = porId.get(id);
    if (!alvo) return;
    if (distDoHeroi(alvo.tileX, alvo.tileY) <= 1) {
      coletarAoChegar = null;
      net.send({ t: 'gather', nodeId: id });
      return;
    }
    coletarAoChegar = id;
    irParaPerto(alvo.tileX, alvo.tileY);
  }

  function renderCorpse(msg: S2C_CorpseContents): void {
    // Bolsa de monstro esvaziada: o servidor já a apagou do mundo, então fechar
    // a janela é a única leitura honesta — deixá-la aberta e vazia sugeriria que
    // ainda há um recipiente ali para voltar.
    if (msg.source === 'creature' && msg.items.every((s) => !s)) {
      corpseWin.style.display = 'none';
      openCorpseId = null;
      return;
    }
    openCorpseId = msg.corpseId;
    corpseWin.style.display = 'block';
    corpseTitle.textContent = msg.source === 'creature'
      ? `🎒 Bolsa de ${msg.owner}`
      : `☠️ Corpo de ${msg.owner}`;
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
    // A aba Vender É a mochila: sem isto, o item vendido continuaria listado até
    // o jogador trocar de aba, e um segundo clique tentaria vender um slot vazio.
    if (shopEl.style.display !== 'none' && shopTab === 'sell') renderShop();
  }

  // ---- Loja do comerciante: abas Comprar / Vender ------------------------
  //
  // Decisão do dono: NÃO é um NPC novo. É o mesmo comerciante, com duas abas —
  // uma para o estoque fixo dele (`VENDOR_STOCK`) e uma para a mochila do
  // jogador. Um NPC só mantém o "lojas são permanentes" do Doc 3 e evita mandar
  // o jogador procurar outra pessoa para se livrar do loot.
  type ShopTab = 'buy' | 'sell';
  let shopTab: ShopTab = 'buy';
  const shopHint = el('shophint');
  const shopTabBuy = el('shoptab-buy');
  const shopTabSell = el('shoptab-sell');

  /** Uma linha da loja. Serve às duas abas: só muda o rótulo e o que o botão faz. */
  function shopRow(opts: {
    kind: string;
    nome: string;
    preco: number;
    /** Quantidade da pilha, quando faz sentido mostrar (aba Vender). */
    qtd?: number;
    tooltip?: string;
    botoes: Array<{ texto: string; classe?: string; acao: () => void }>;
  }): HTMLElement {
    const row = document.createElement('div');
    row.className = 'shoprow';
    if (opts.tooltip) row.title = opts.tooltip;
    const img = document.createElement('img');
    img.src = itemIconUrl(opts.kind);
    const nm = document.createElement('span');
    nm.className = 'sn';
    nm.textContent = opts.nome;
    if (opts.qtd !== undefined && opts.qtd > 1) {
      const q = document.createElement('span');
      q.className = 'sq';
      q.textContent = ` ×${opts.qtd}`;
      nm.appendChild(q);
    }
    const pr = document.createElement('span');
    pr.className = 'sp';
    pr.textContent = `${opts.preco} 🪙`;
    row.append(img, nm, pr);
    for (const b of opts.botoes) {
      const btn = document.createElement('button');
      btn.textContent = b.texto;
      if (b.classe) btn.className = b.classe;
      btn.onclick = b.acao;
      row.appendChild(btn);
    }
    return row;
  }

  function renderShop(): void {
    shopTabBuy.classList.toggle('on', shopTab === 'buy');
    shopTabSell.classList.toggle('on', shopTab === 'sell');
    shopList.innerHTML = '';

    if (shopTab === 'buy') {
      shopHint.textContent = 'Compra com ouro. Fique perto do comerciante.';
      for (const kind of VENDOR_STOCK) {
        const def = ITEMS[kind];
        if (!def) continue;
        shopList.appendChild(shopRow({
          kind, nome: def.name, preco: def.buyPrice,
          botoes: [{ texto: 'Comprar', acao: () => net.send({ t: 'buy', kind }) }],
        }));
      }
      return;
    }

    // Aba VENDER: a mochila, sem os itens que ele não compra (moeda, receita,
    // fragmento sem preço). Esconder é melhor que mostrar desabilitado — a lista
    // fica curta e só com o que rende ouro.
    shopHint.textContent = `O comerciante paga ${Math.round(SELL_PRICE_FACTOR * 100)}% do preço de loja. Raridade vale mais.`;
    let vendavel = 0;
    (currentInv?.backpack ?? []).forEach((stack, index) => {
      if (!stack) return;
      const unit = sellPriceOf(stack.kind, stack.roll);
      if (unit <= 0) return;
      vendavel++;
      const def = getItem(stack.kind);
      const rar = stack.roll ? RARITY[stack.roll.rarity] : null;
      const botoes = [{
        texto: 'Vender', classe: 'sell',
        acao: () => net.send({ t: 'sell', index }),
      }];
      // "Tudo" só em pilha: 30 Gosmas de Slime uma a uma seria castigo, não jogo.
      if (stack.amount > 1) {
        botoes.push({
          texto: `Tudo (${unit * stack.amount})`, classe: 'sell',
          acao: () => net.send({ t: 'sell', index, amount: stack.amount }),
        });
      }
      shopList.appendChild(shopRow({
        kind: stack.kind,
        nome: rar ? `${def?.name ?? stack.kind} [${rar.name}]` : def?.name ?? stack.kind,
        preco: unit,
        qtd: stack.amount,
        tooltip: itemTooltip(stack),
        botoes,
      }));
    });
    if (vendavel === 0) {
      const vazio = document.createElement('div');
      vazio.className = 'hint';
      vazio.textContent = 'Nada na mochila que ele compre.';
      shopList.appendChild(vazio);
    }
  }

  function openShop(): void {
    renderShop();
    shopEl.style.display = 'flex';
  }

  // ---- Bancada do Ferreiro (Doc 4, cap. 44-46) ----------------------------
  //
  // O jogador escolhe a peça e a proporção de fragmentos. A PROPORÇÃO é o que
  // define a chance de cada raridade (`DD-PROF-022`), então a tabela de
  // probabilidade aparece antes de confirmar: é uma aposta informada, não uma
  // caixa-surpresa. Sem mostrar as chances, o jogador não teria como decidir
  // entre arriscar agora ou juntar fragmento melhor.
  const craftEl = el('craft');
  const craftKind = document.querySelector<HTMLSelectElement>('#craft-kind')!;
  const craftRecipe = document.querySelector<HTMLSelectElement>('#craft-recipe')!;
  const craftFrags = el('craft-frags');
  const craftOdds = el('craft-odds');
  const craftHint = el('craft-hint');
  const craftProf = el('craft-prof');

  /** Quanto o jogador tem de um `kind` na mochila. */
  function haveInBag(kind: string): number {
    let n = 0;
    for (const s of currentInv?.backpack ?? []) if (s?.kind === kind) n += s.amount;
    return n;
  }

  /**
   * Níveis de profissão. Vem no `stats`, e é lido aqui em vez de numa variável
   * lá embaixo porque a bancada é declarada antes do bloco de stats.
   */
  let myProfessions: Professions = {};

  /** Campos de fragmento por raridade, criados uma vez. */
  function buildFragRows(): void {
    craftFrags.replaceChildren();
    for (const r of RARITIES) {
      const item = ITEMS[FRAGMENT_ITEM[r]]!;
      const tem = haveInBag(item.kind);
      const row = document.createElement('div');
      row.className = 'fragrow';

      const nome = document.createElement('span');
      nome.textContent = item.name;
      nome.style.color = `#${RARITY[r].color.toString(16).padStart(6, '0')}`;

      const have = document.createElement('span');
      have.className = 'have';
      have.textContent = `tem ${tem}`;

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = String(tem);
      input.step = '1';
      input.value = '0';
      input.dataset.rarity = r;
      // Recalcula as chances a cada digitação: o jogador precisa ver o efeito
      // de mover 10 fragmentos de uma raridade para outra.
      input.addEventListener('input', renderCraftOdds);

      row.append(nome, have, input);
      craftFrags.appendChild(row);
    }
  }

  /** O que está digitado na bancada agora. */
  function currentBundle(): Partial<Record<Rarity, number>> {
    const out: Partial<Record<Rarity, number>> = {};
    for (const input of craftFrags.querySelectorAll<HTMLInputElement>('input')) {
      const r = input.dataset.rarity as Rarity;
      const n = Math.max(0, Math.floor(Number(input.value) || 0));
      if (n > 0) out[r] = n;
    }
    return out;
  }

  function renderCraftOdds(): void {
    const bundle = currentBundle();
    const total = RARITIES.reduce((s, r) => s + (bundle[r] ?? 0), 0);
    const receita = craftRecipe.value as Rarity;
    const chances = rarityChances(bundle);
    const entradas = (Object.entries(chances) as Array<[Rarity, number]>)
      // A receita é TETO: fragmento acima dela não entra no sorteio.
      .filter(([r]) => RARITIES.indexOf(r) <= RARITIES.indexOf(receita));

    craftOdds.replaceChildren();
    if (entradas.length === 0) {
      craftOdds.textContent = total < FRAGMENTS_PER_CRAFT
        ? `Faltam ${FRAGMENTS_PER_CRAFT - total} fragmentos.`
        : `Nenhuma raridade alcançou os ${MIN_FRAGMENTS_FOR_CHANCE} fragmentos mínimos.`;
      return;
    }
    const soma = entradas.reduce((s, [, p]) => s + p, 0);
    for (const [r, p] of entradas) {
      const linha = document.createElement('div');
      linha.textContent = `${RARITY[r].name}: ${Math.round((p / soma) * 100)}%`;
      linha.style.color = `#${RARITY[r].color.toString(16).padStart(6, '0')}`;
      craftOdds.appendChild(linha);
    }
  }

  /**
   * As peças que a receita SELECIONADA alcança.
   *
   * 🔴 Depende da receita, então tem que rodar depois de a lista de receitas
   * existir — e de novo a cada troca. Antes do catálogo do Doc 4 a lista era fixa
   * (13 peças, todas de nível 1) e a ordem não importava; com 205 modelos, listar
   * tudo colocaria o Machado Primordial ao alcance de uma Receita Comum.
   *
   * ⚠️ Peça que **não é modelo de catálogo** (mochila, bolsa) continua sempre
   * listada: elas nunca estiveram sujeitas a tier, e escondê-las tiraria do jogo
   * algo que já funcionava.
   */
  function renderCraftKinds(): void {
    const raridade = (craftRecipe.value || 'common') as Rarity;
    const escolhido = craftKind.value;
    craftKind.replaceChildren();
    for (const def of Object.values(ITEMS)) {
      if (def.category !== 'equip') continue;
      const entry = MODEL_INDEX[def.kind];
      if (entry && !craftableModel(def.kind, raridade)) continue;
      const opt = document.createElement('option');
      opt.value = def.kind;
      // O nível recomendado no rótulo é o que deixa a escada visível: sem ele, a
      // lista é um monte de nome sem ordem aparente.
      opt.textContent = entry ? `${def.name} — Lv.${entry.level}` : def.name;
      craftKind.appendChild(opt);
    }
    if (escolhido && ITEMS[escolhido] && craftableModel(escolhido, raridade)) {
      craftKind.value = escolhido;
    }
  }

  function renderCraft(): void {
    const nivel = myProfessions.blacksmith?.level ?? 1;
    craftProf.textContent = `Ferreiro ${nivel}`;

    // Receitas: só as que o jogador tem em mão.
    craftRecipe.replaceChildren();
    let alguma = false;
    for (const r of RARITIES) {
      const tem = haveInBag(RECIPE_ITEM[r]);
      if (tem <= 0) continue;
      alguma = true;
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = `${ITEMS[RECIPE_ITEM[r]]!.name} (${tem})`;
      craftRecipe.appendChild(opt);
    }
    craftHint.textContent = alguma
      ? 'A receita define o teto da raridade. Fragmentos acima dela não contam.'
      : 'Você não tem nenhuma receita. Elas caem de monstros e chefes.';

    // Depois das receitas, porque a lista de peças depende da que está escolhida.
    renderCraftKinds();

    buildFragRows();
    renderCraftOdds();
  }

  function openCraft(): void {
    renderCraft();
    craftEl.style.display = 'flex';
  }

  el('craft-close').onclick = (): void => {
    craftEl.style.display = 'none';
  };
  craftRecipe.addEventListener('change', () => {
    // Trocar de receita muda o alcance do catálogo, não só as probabilidades.
    renderCraftKinds();
    renderCraftOdds();
  });
  el('craft-do').onclick = (): void => {
    net.send({
      t: 'craft',
      kind: craftKind.value,
      recipeRarity: craftRecipe.value as Rarity,
      fragments: currentBundle(),
    });
  };

  // ---- Banco (só ouro) ----------------------------------------------------
  //
  // NPC próprio, não uma aba do Comerciante: o Doc 3 lista Comerciante e Banco
  // como FUNÇÕES separadas de NPC. E guarda só ouro — quem guarda item é o
  // Depósito, que o cap. 19 do Doc 1 separa do Banco ("CASA ≠ BANCO").
  const bankEl = el('bank');
  const bankHand = el('bank-hand');
  const bankVault = el('bank-vault');
  const bankAmount = document.querySelector<HTMLInputElement>('#bank-amount')!;

  /** Último saldo conhecido, para os botões "tudo" e para redesenhar. */
  let goldEmMao = 0;
  let goldGuardado = 0;

  function renderBank(): void {
    bankHand.textContent = String(goldEmMao);
    bankVault.textContent = String(goldGuardado);
  }

  function bankSend(op: 'deposit' | 'withdraw', amount: number): void {
    if (amount <= 0) return;
    net.send({ t: 'bank', op, amount });
    bankAmount.value = '';
  }
  /** Quantia digitada. Vazio ou inválido = 0, e aí o clique não faz nada. */
  const bankDigitado = (): number => Math.max(0, Math.floor(Number(bankAmount.value) || 0));

  el('bank-dep').onclick = () => bankSend('deposit', bankDigitado());
  el('bank-wit').onclick = () => bankSend('withdraw', bankDigitado());
  el('bank-dep-all').onclick = () => bankSend('deposit', goldEmMao);
  el('bank-wit-all').onclick = () => bankSend('withdraw', goldGuardado);
  el('bank-close').onclick = () => { bankEl.style.display = 'none'; };

  function openBank(): void {
    renderBank();
    bankEl.style.display = 'flex';
    bankAmount.focus();
  }
  shopTabBuy.onclick = () => { shopTab = 'buy'; renderShop(); };
  shopTabSell.onclick = () => { shopTab = 'sell'; renderShop(); };
  el('shop-close').onclick = () => { shopEl.style.display = 'none'; };

  // ---- Arrastar do CHÃO para a mochila -------------------------------------
  //
  // 🔴 **Arraste feito à mão, não HTML5.** O item no chão é um sprite dentro do
  // canvas do Pixi, e `draggable` só existe em elemento do DOM — não há como
  // iniciar um `dragstart` de lá. Então: `mousedown` no tile do item agarra,
  // um ícone fantasma segue o cursor, e `mouseup` sobre a mochila solta.
  //
  // O recolhimento automático ao pisar em cima CONTINUA valendo. Isto se soma a
  // ele: quem quer correr por cima do loot corre, quem quer escolher, arrasta.

  /** Item do chão sendo arrastado agora. */
  let arrastandoDoChao: EntitySnapshot | null = null;
  /**
   * Quando terminou o último arraste de item do chão.
   *
   * O `mouseup` de um arraste que começa E termina dentro do viewport gera um
   * `click` logo atrás — e o clique no mundo é "ande até aqui". Sem isto,
   * empurrar uma pilha um tile ao lado também faria o personagem caminhar até
   * lá, que é o oposto de mover a coisa sem sair do lugar.
   */
  let fimDoArrasteDeChao = 0;
  const fantasma = document.createElement('img');
  fantasma.id = 'dragghost';
  fantasma.style.display = 'none';
  document.body.appendChild(fantasma);

  function pararArrasteDoChao(): void {
    arrastandoDoChao = null;
    fantasma.style.display = 'none';
  }

  viewportEl.addEventListener('mousedown', (ev) => {
    if (ev.button !== 0) return;
    const t = tileDoEvento(ev);
    const item = itensPorTile.get(t.y * map.width + t.x);
    if (!item) return;
    // Corpo e bolsa NÃO se arrastam: são recipientes, e o gesto neles é abrir.
    // Sem isto, o arraste roubaria o clique e o espólio ficaria inacessível.
    if (item.itemKind === 'corpse' || item.itemKind === 'lootbag') return;
    arrastandoDoChao = item;
    fantasma.src = itemIconUrl(item.itemKind ?? '');
    fantasma.style.display = 'block';
    fantasma.style.left = `${ev.clientX + 8}px`;
    fantasma.style.top = `${ev.clientY + 8}px`;
    // Impede que o mesmo gesto também vire caminhada até o tile.
    ev.preventDefault();
  });

  window.addEventListener('mousemove', (ev) => {
    if (!arrastandoDoChao) return;
    fantasma.style.left = `${ev.clientX + 8}px`;
    fantasma.style.top = `${ev.clientY + 8}px`;
  });

  window.addEventListener('mouseup', (ev) => {
    if (!arrastandoDoChao) return;
    const item = arrastandoDoChao;
    pararArrasteDoChao();
    fimDoArrasteDeChao = performance.now();
    // Soltou sobre a mochila (ou sobre qualquer slot dela)? Então pega.
    const alvo = ev.target as HTMLElement | null;
    if (alvo && (bpGrid.contains(alvo) || alvo === bpGrid)) {
      net.send({ t: 'pickup', itemId: item.id });
      return;
    }
    // Soltou sobre o MUNDO? Empurra a pilha para aquele tile — o gesto do
    // Tibia, que permite ir levando o item de tile em tile sem pegá-lo.
    if (alvo && (viewportEl.contains(alvo) || alvo === viewportEl)) {
      const destino = tileDoEvento(ev);
      net.send({ t: 'movegrounditem', itemId: item.id, tileX: destino.x, tileY: destino.y });
      return;
    }
    // Soltar em qualquer outro lugar simplesmente cancela — sem mensagem de
    // erro, porque arrastar e desistir é gesto normal, não engano.
  });

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

  // ---- Soltar no chão ARRASTANDO para o mundo ------------------------------
  //
  // 🔴 **Este é o caminho principal, e o botão direito virou atalho.** O motivo é
  // prático: o dono relatou que soltar item não funcionava, e o `contextmenu` num
  // elemento com `draggable = true` é instável — no Windows ele dispara no
  // RELEASE, e o navegador pode engolir o evento quando o mesmo elemento pode
  // iniciar um arraste. Um gesto essencial não pode depender disso.
  //
  // E é o inverso exato do arraste do chão para a mochila, que já existe: tirar
  // da bolsa jogando no mundo é o mesmo movimento ao contrário. Gesto simétrico
  // não precisa ser ensinado duas vezes.
  viewportEl.addEventListener('dragover', allowDrop);
  viewportEl.addEventListener('drop', (e) => {
    e.preventDefault();
    const d = e.dataTransfer?.getData('text/plain') ?? '';
    if (!d.startsWith('bp:')) return;
    const slot = Number(d.slice(3));
    const stack = currentInv?.backpack[slot];
    if (!stack) return;
    // Shift solta a pilha inteira; sem shift, uma unidade. Mesma regra do botão
    // direito — soltar 300 fragmentos por engano com um gesto seria irreversível.
    const tudo = e.shiftKey || stack.amount === 1;
    // 🔴 O item cai ONDE O MOUSE SOLTOU, não aos pés do jogador (como no Tibia).
    // `DragEvent` estende `MouseEvent`, então a mesma conversão tela->tile do
    // clique-para-andar serve aqui.
    const alvo = tileDoEvento(e);
    net.send({
      t: 'drop',
      slot,
      ...(tudo ? {} : { amount: 1 }),
      tileX: alvo.x,
      tileY: alvo.y,
    });
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
  // Havia aqui uma "caixa de baixo" fixa (posição + atalhos de teclado) que servia
  // de âncora: os painéis arrastados eram inseridos ANTES dela. O dono mandou
  // removê-la em 30/07, então a barra passou a ser só painéis e o fim da lista é o
  // fim da barra — `insertBefore(x, null)` é exatamente `appendChild`.
  //
  // Desde o layout de três regiões são DUAS barras de painel. Cada uma guarda a
  // própria ordem, com chave própria, e o arraste acontece dentro da barra de
  // origem: as duas têm a mesma largura, mas deixar o painel pular de coluna no
  // meio do gesto tornaria o alvo do arraste ambíguo.
  type Bar = { el: HTMLElement; key: string };
  const BARS: readonly Bar[] = [
    { el: el('sidebar'), key: 'elysia_panel_order' },
    { el: el('leftbar'), key: 'elysia_panel_order_left' },
  ];
  const reorderable = (bar: HTMLElement): HTMLElement[] =>
    Array.from(bar.children).filter(
      (c): c is HTMLElement => c instanceof HTMLElement && !!c.querySelector(':scope > .phead'),
    );
  // Restaura a ordem salva reanexando os painéis na ordem gravada. O teste
  // `parentElement === bar.el` é o que protege de ordem antiga: um id que mudou
  // de barra (o layout mudou em 01/08) simplesmente não casa, e o painel fica
  // onde o HTML o pôs em vez de migrar de volta para a coluna errada.
  for (const bar of BARS) {
    try {
      const saved = JSON.parse(localStorage.getItem(bar.key) ?? 'null') as string[] | null;
      if (saved) {
        for (const id of saved) {
          const p = document.getElementById(id);
          if (p && p.parentElement === bar.el) bar.el.appendChild(p);
        }
      }
    } catch { /* ordem inválida — ignora */ }
  }
  const saveOrder = (bar: Bar): void => {
    localStorage.setItem(
      bar.key,
      JSON.stringify(reorderable(bar.el).map((p) => p.id).filter(Boolean)),
    );
  };

  let dragPanel: HTMLElement | null = null;
  let dragBar: Bar | null = null;
  let dragStartY = 0;
  let dragMoved = false;
  const panelAfter = (bar: HTMLElement, y: number): HTMLElement | null => {
    let closest: HTMLElement | null = null;
    let closestOffset = -Infinity;
    for (const p of reorderable(bar)) {
      if (p === dragPanel) continue;
      const r = p.getBoundingClientRect();
      const offset = y - (r.top + r.height / 2);
      if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = p; }
    }
    return closest;
  };
  document.addEventListener('pointermove', (e) => {
    if (!dragPanel || !dragBar) return;
    if (!dragMoved) {
      if (Math.abs(e.clientY - dragStartY) < 6) return;
      dragMoved = true;
      dragPanel.classList.add('dragging');
    }
    e.preventDefault();
    const after = panelAfter(dragBar.el, e.clientY);
    if (after) dragBar.el.insertBefore(dragPanel, after);
    else dragBar.el.appendChild(dragPanel);
  });
  document.addEventListener('pointerup', () => {
    if (!dragPanel) return;
    if (dragMoved) {
      dragPanel.classList.remove('dragging');
      lastDragEnd = performance.now(); // suprime o clique-minimizar que segue
      if (dragBar) saveOrder(dragBar);
    }
    dragPanel = null;
    dragBar = null;
    dragMoved = false;
  });
  for (const bar of BARS) {
    for (const p of reorderable(bar.el)) {
      const head = p.querySelector<HTMLElement>(':scope > .phead')!;
      head.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        dragPanel = p;
        dragBar = bar;
        dragStartY = e.clientY;
        dragMoved = false;
      });
    }
  }

  // ---- Altura da doca de chat --------------------------------------------
  //
  // O chat saiu da coluna esquerda e foi para o rodapé, como no Tibia. Quanto
  // de tela ele merece é preferência pessoal (quem conversa quer mais, quem caça
  // quer menos), então a altura é arrastável e fica salva.
  //
  // O arraste escreve em `--chat-h` no <html>: o CSS já deriva a altura da doca
  // dessa variável, e o Pixi tem `resizeTo: viewportEl`, então o mundo se
  // reajusta sozinho. Nenhum dos dois precisa saber que houve um arraste.
  {
    const dockEl = el('chatdock');
    const gripEl = el('chatgrip');
    const CHAT_H_KEY = 'elysia_chat_h';
    const CHAT_MIN = 74; // cabeçalho + uma linha de log + a caixa de digitar
    // Teto de 55 % da janela: sem ele dá para arrastar até o mundo sumir, e a
    // única forma de voltar seria limpar o localStorage.
    const clampH = (h: number): number =>
      Math.max(CHAT_MIN, Math.min(Math.round(window.innerHeight * 0.55), Math.round(h)));
    const applyH = (h: number): void => {
      document.documentElement.style.setProperty('--chat-h', `${clampH(h)}px`);
    };

    /*
     * 🔴 O Pixi PRECISA ser avisado — `resizeTo` não observa o elemento.
     *
     * `resizeTo: viewportEl` só reage a `window.resize`. Mudar a altura da doca
     * encolhe o `#viewport` sem a janela mudar de tamanho, então o canvas ficava
     * com a altura antiga e transbordava 46 px por cima do chat. Era o "chat
     * sumindo atrás do jogo".
     *
     * Um `ResizeObserver` no próprio viewport cobre TODAS as causas de uma vez:
     * arrastar a doca, minimizar o chat, minimizar painel, redimensionar a
     * janela. Melhor que espalhar `app.resize()` por cada uma delas e esquecer
     * da próxima.
     */
    const observador = new ResizeObserver(() => app.resize());
    observador.observe(viewportEl);
    const savedH = Number(localStorage.getItem(CHAT_H_KEY));
    if (Number.isFinite(savedH) && savedH > 0) applyH(savedH);

    let resizing = false;
    let startY = 0;
    let startH = 0;
    gripEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      resizing = true;
      startY = e.clientY;
      startH = dockEl.getBoundingClientRect().height;
      dockEl.classList.add('resizing');
      gripEl.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    gripEl.addEventListener('pointermove', (e) => {
      // Arrastar para CIMA aumenta: a doca cresce a partir do rodapé.
      if (resizing) applyH(startH + (startY - e.clientY));
    });
    const endResize = (): void => {
      if (!resizing) return;
      resizing = false;
      dockEl.classList.remove('resizing');
      localStorage.setItem(CHAT_H_KEY, String(Math.round(dockEl.getBoundingClientRect().height)));
    };
    gripEl.addEventListener('pointerup', endResize);
    gripEl.addEventListener('pointercancel', endResize);
    // Janela encolheu: reaplica o teto para a doca não engolir o mundo.
    window.addEventListener('resize', () => applyH(dockEl.getBoundingClientRect().height));
  }

  // ---- Ciclo dia/noite + relógio -----------------------------------------
  function updateDayNight(hour: number, night: boolean, phase?: DayPhase): void {
    nightMode = night;
    const h = Math.floor(hour) % 24;
    const m = Math.floor((hour - Math.floor(hour)) * 60);
    // 🔴 A tarde tem ícone PRÓPRIO. Ela é curta (30 min reais) e é o aviso de
    // que a noite vem — sem marca visível, o jogador só percebe quando já está
    // escuro e as criaturas já estão mais fortes.
    //
    // `phase` é opcional no protocolo (cliente antigo contra servidor novo), daí
    // o fallback pelo booleano de sempre.
    const icon = phase === 'dusk' ? '🌇' : night ? '🌙' : '☀️';
    clockEl.textContent = `${icon} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    clockEl.classList.toggle('night', night); // pisca no menu à noite
    clockEl.title = phase ? PHASE_LABEL[phase] : night ? 'Noite' : 'Dia';
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
    // O Banco não tem mensagem própria: o saldo chega junto das stats, e o painel
    // se redesenha se estiver aberto (é assim que "Depositar tudo" fica correto
    // logo depois de um depósito).
    goldEmMao = s.gold;
    goldGuardado = s.bankGold;
    if (bankEl.style.display !== 'none') renderBank();
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
      // ⚠️ A chave passou a ser `ProficiencyKind`, não `WeaponType` — "Cajado"
      // virou "Magic Level" e arco/besta viraram "Distância". Usar
      // `WEAPON_IDENTITY` aqui mostraria o nome antigo ou nada.
      .map(([tipo, p]) => `${PROFICIENCY_LABEL[tipo as ProficiencyKind] ?? tipo} <b>${p.level}</b>`)
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
    myProfessions = s.professions;
    // Se a bancada está aberta, o nível novo aparece na hora — fabricar sobe
    // profissão, e ver o número mudar é metade da recompensa.
    if (craftEl.style.display !== 'none') renderCraft();
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

  const myCondEl = el('mycond');
  /** Última lista desenhada, para não reconstruir o DOM a cada tique. */
  let myCondKey = '';

  function renderMyConditions(ids?: ConditionId[]): void {
    const lista = ids ?? [];
    const chave = lista.join(',');
    if (chave === myCondKey) return;
    myCondKey = chave;

    myCondEl.replaceChildren();
    for (const id of lista) {
      const def = CONDITIONS[id];
      if (!def) continue;
      const tag = document.createElement('span');
      tag.className = 'cond';
      tag.textContent = def.name;
      // `currentColor` na borda: define a cor uma vez e a borda acompanha.
      tag.style.color = hx(CONDITION_COLORS[id] ?? 0xffffff);
      // O tooltip explica o efeito — é onde o jogador aprende que Silêncio
      // bloqueia só magia, e que dano quebra Congelamento mas não Petrificação.
      const efeitos: string[] = [];
      if (!def.blocksMove) efeitos.push('anda');
      if (!def.blocksAttack) efeitos.push('ataca');
      if (!def.blocksCast) efeitos.push('conjura');
      tag.title = efeitos.length
        ? `Ainda consegue: ${efeitos.join(', ')}`
        : 'Sem ação até passar';
      myCondEl.appendChild(tag);
    }
  }

  function syncEntities(entities: EntitySnapshot[]): void {
    const seen = new Set<string>();
    // Guarda os OUTROS jogadores por tile, para o botão direito saber em quem
    // clicou sem varrer a lista inteira a cada clique. Reconstruído a cada
    // snapshot, como `tilesClicaveis` logo abaixo, e pelo mesmo motivo: é
    // exatamente isso que muda de um snapshot para o outro.
    jogadoresPorTile.clear();
    itensPorTile.clear();
    porId.clear();
    // Reconstruídos a cada snapshot porque é exatamente isso que muda de um para
    // o outro: monstro andou, monstro morreu, corpo apareceu.
    tilesBloqueados.clear();
    tilesClicaveis.clear();
    for (const e of entities) {
      seen.add(e.id);
      porId.set(e.id, e);
      const tile = e.tileY * map.width + e.tileX;
      if (e.id !== myId) {
        // Bloqueia só o que o SERVIDOR bloqueia (ver `tileOccupied` lá).
        if (e.kind === 'creature' || e.kind === 'player') tilesBloqueados.add(tile);
        tilesClicaveis.add(tile);
        if (e.kind === 'player') jogadoresPorTile.set(tile, e);
        if (e.kind === 'item') itensPorTile.set(tile, e);
      }
      const isSelf = e.id === myId;
      let view = sprites.get(e.id);
      if (!view) {
        view = makeEntity(e, isSelf, isSelf ? selfTex : otherTex, anims, setTarget, {
          classAnims, slimeAnim, slimeVariants, zombieAnim, zombieIdleAnim, creatureSheets,
          knightArt, heroArt, npcAnim,
          selfClass: charClass, selfGender: gender, openShop, openBank, openCraft, openCorpse,
          gatherNode,
          chaoEm: (x, y) => {
            const layer = map.floors[renderedFloor];
            const id = layer?.[y * map.width + x] ?? 0;
            // Nó em cima de tile alto (madeira, na árvore): o bioma é o do piso.
            return getTileType(id).height === 0 ? id : chaoSobTileAlto(x, y);
          },
          itemTexture,
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
      // ⚪ Caveira Branca. Mesmo padrão da fita, e pela mesma razão: quase
      // ninguém tem uma, e um Graphics por sprite seria desperdício puro.
      let skull = skullMarks.get(e.id);
      if (!skull && e.skull) {
        skull = makeSkullMark();
        skullMarks.set(e.id, skull);
        view.container.addChild(skull.node);
      }
      skull?.set(e.skull);
      if (isSelf) {
        // Condições do próprio jogador no HUD, com NOME. O ícone sobre o sprite
        // dá a leitura de relance; o nome é o que ensina o que o símbolo quer
        // dizer. Sem isto, dez glifos de 9 px seriam adivinhação.
        renderMyConditions(e.conditions);
        // O flag de PK vem do SERVIDOR, não do clique no botão: assim o botão
        // reflete o estado real mesmo quando o servidor recusa desligar (trava
        // de combate) — e não fica mentindo "desligado" enquanto o jogador
        // segue atacável.
        const pkAgora = e.pkEnabled === true;
        if (pkAgora !== pkOn) { pkOn = pkAgora; renderPk(); }
        myFloor = e.floor;
        myTileX = e.tileX;
        myTileY = e.tileY;
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
        skullMarks.delete(id);
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

  // 🔴 ARRASTAR TAMBÉM PERDE O `keyup` — e este foi relatado JOGANDO, em 11/08:
  // *"fui jogar um item no chão, ele bugou e saiu andando pro lado esquerdo sem
  // parar"*.
  //
  // Enquanto um arraste HTML5 está em curso o navegador roda um laço modal
  // PRÓPRIO e não entrega `keyup` à página. Uma tecla de movimento segurada
  // durante o gesto fica presa no `heldKeys`, e o personagem anda naquela
  // direção para sempre — exatamente a falha que os dois guardas acima já
  // existiam para evitar, entrando por uma porta que eles não cobriam.
  //
  // ⚠️ Solta nas DUAS pontas de propósito: no `dragstart` porque a tecla pode já
  // estar pressionada quando o arraste começa (e aí o `keyup` dela nunca chega),
  // e no fim porque pode ter sido pressionada durante o gesto. `dragend` não é
  // suficiente sozinho: soltar FORA da janela dispara `drop` em outro documento
  // e o `dragend` pode não chegar.
  //
  // 🔴 **Só eventos de ARRASTE.** `mouseup` NÃO entra aqui: clique comum entrega
  // `keyup` normalmente, e limpar as teclas nele faria quem segura W para andar
  // parar de andar toda vez que clicasse para atacar — trocaria um bug raro por
  // um constante. O arraste de item DO CHÃO usa mouse comum, não `DragEvent`, e
  // por isso também não precisa de guarda.
  for (const ev of ['dragstart', 'dragend', 'drop'] as const) {
    window.addEventListener(ev, releaseAllKeys);
  }

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

  // ---- Mouse: destacar o tile sob o cursor e andar até o clicado ----------
  //
  // Converter tela -> tile é o inverso da câmera: `world.x/y` é o deslocamento e
  // `ZOOM` a escala.
  function tileDoEvento(ev: MouseEvent): { x: number; y: number } {
    const r = viewportEl.getBoundingClientRect();
    const wx = (ev.clientX - r.left - world.x) / ZOOM;
    const wy = (ev.clientY - r.top - world.y) / ZOOM;
    return { x: Math.floor(wx / TS), y: Math.floor(wy / TS) };
  }

  viewportEl.addEventListener('mousemove', (ev) => {
    const t = tileDoEvento(ev);
    const dentro = t.x >= 0 && t.y >= 0 && t.x < map.width && t.y < map.height;
    // Só destaca onde clicar REALMENTE anda: o contorno prometendo caminhada num
    // tile de parede, de monstro ou de NPC seria mentira visual.
    hoverMark.visible = dentro
      && podeAndar(t.x, t.y)
      && !tilesClicaveis.has(t.y * map.width + t.x);
    hoverMark.x = t.x * TS;
    hoverMark.y = t.y * TS;
  });
  viewportEl.addEventListener('mouseleave', () => { hoverMark.visible = false; });

  // Botão esquerdo no CHÃO = ir até lá.
  //
  // 🔴 O clique numa entidade tem que sair por aqui sem andar. O sprite dela tem
  // `pointertap` próprio (atacar, abrir loja, saquear), mas o clique nativo do DOM
  // continua subindo até o viewport — então antes o personagem atacava o monstro
  // E ia andando até o tile dele. Checar o tile é mais confiável que tentar
  // cancelar a propagação do Pixi, porque não depende da ordem em que os dois
  // sistemas de evento disparam.
  viewportEl.addEventListener('click', (ev) => {
    if (ev.button !== 0) return;
    // Acabou de arrastar item pelo chão: este clique é o rabo do gesto, não uma
    // ordem de caminhada. Ver `fimDoArrasteDeChao`.
    if (performance.now() - fimDoArrasteDeChao < 250) return;
    const t = tileDoEvento(ev);
    if (t.x < 0 || t.y < 0 || t.x >= map.width || t.y >= map.height) return;
    if (tilesClicaveis.has(t.y * map.width + t.x)) return; // é interação, não caminhada
    irPara(t.x, t.y);
  });
  // ---- Social: menu de contexto, grupo, amigos e PK ----------------------
  //
  // Tudo o que o botão direito em outro jogador destrava. O servidor continua
  // dono das decisões: aqui só se pinta o estado e se manda intenção.

  const ctxEl = el('ctxmenu');
  const ctxNameEl = ctxEl.querySelector('.ctxname') as HTMLElement;
  const partyBox = el('partybox');
  const partyListEl = el('partylist');
  const partyLootEl = el('partyloot');
  const partyVoteEl = el('partyvote');
  const friendListEl = el('friendlist');
  const pkBtn = el('pk-toggle') as HTMLButtonElement;
  const inviteEl = el('partyinvite');
  const inviteTextEl = el('pi-text');

  /** Grupo atual, como o servidor mandou. `null` = sem grupo. */
  let party: S2C_Party['party'] = null;
  /** Lista de amigos da conta. */
  let friends: S2C_Friends['list'] = [];
  /** Espelho local do flag de PK, só para pintar o botão. O servidor decide. */
  let pkOn = false;
  /** Quem convidou, enquanto o convite está na tela. */
  let convitePendente: { fromId: string; fromName: string } | null = null;

  /**
   * Alvo do "Seguir".
   *
   * 🔴 **Follow é 100 % cliente, de propósito.** Ele não é uma mensagem nova:
   * reusa a mesma rota por BFS e os mesmos PASSOS que o clique-para-andar já
   * manda. Criar um "siga o jogador X" no protocolo seria deixar o cliente
   * ditar posição — exatamente o que a nota do `C2S_MoveIntent` proíbe.
   */
  let followId: string | null = null;
  /** Último tile para o qual se traçou rota, p/ não recalcular a cada frame. */
  let followUltimoTile = -1;

  function pararFollow(silencioso = false): void {
    if (!followId) return;
    const alvo = porId.get(followId);
    followId = null;
    followUltimoTile = -1;
    cancelarRota();
    if (!silencioso && alvo) logChat(`Você parou de seguir ${alvo.name}.`, 'sys');
  }

  /**
   * Refaz a rota até o alvo quando ele muda de tile.
   *
   * Mira um tile VIZINHO, não o do alvo: o tile de outro jogador é bloqueado
   * (é a regra de colisão de 30/07), então pedir rota até ele devolveria `[]`
   * sempre e o follow nunca sairia do lugar.
   */
  /**
   * Modo de combate, como no Tibia: **Perseguir** anda atrás do alvo,
   * **Parado** deixa você onde está.
   *
   * 🔴 **Parado é o padrão**, e não é preferência minha: é o que o jogo já fazia.
   * Quem nunca abrir esse botão não deve ver o personagem começar a andar
   * sozinho — mudança silenciosa de comportamento é a pior espécie.
   *
   * ⚠️ Isto é 100 % CLIENTE, e de propósito. Reusa a mesma rota por BFS e os
   * mesmos PASSOS que o clique-para-andar já manda. Criar um "persiga o alvo X"
   * no protocolo seria deixar o cliente ditar posição — a mesma razão pela qual
   * o "Seguir" do menu de contexto também não virou mensagem.
   */
  let chaseMode = false;

  /**
   * Quem a perseguição deve alcançar: o alvo de ataque quando o modo está
   * ligado, senão o "Seguir" do menu de contexto.
   *
   * O alvo de ataque tem precedência porque é o mais recente e o mais urgente —
   * quem mandou atacar quer chegar perto daquilo, não do que estava seguindo
   * antes.
   */
  function alvoDePerseguicao(): string | null {
    if (chaseMode && targetId) return targetId;
    return followId;
  }

  function tickFollow(): void {
    const id = alvoDePerseguicao();
    if (!id) return;
    const alvo = porId.get(id);
    // Sumiu do snapshot: saiu do andar, deslogou ou morreu.
    if (!alvo) {
      if (id === followId) pararFollow();
      return;
    }
    const tile = alvo.tileY * map.width + alvo.tileX;
    if (tile === followUltimoTile) return;
    followUltimoTile = tile;
    // 🔴 A distância de parada é o ALCANCE DA ARMA, não 1. Um arqueiro que
    // colasse no monstro para atirar perderia a razão de ser arqueiro — e o
    // mago também. Para o "Seguir" social, 1 continua sendo o certo: ficar do
    // lado da pessoa.
    const parar = id === targetId ? Math.max(1, myAttackRange) : 1;
    if (chebyshev(myTileX, myTileY, alvo.tileX, alvo.tileY) <= parar) {
      cancelarRota(); // já está no alcance; não fica trombando
      return;
    }
    let melhor: Array<{ x: number; y: number }> = [];
    for (const [dx, dy] of PASSOS_RETOS) {
      const nx = alvo.tileX + dx;
      const ny = alvo.tileY + dy;
      const rota = rotaAte(myTileX, myTileY, nx, ny);
      if (rota.length === 0) continue;
      if (melhor.length === 0 || rota.length < melhor.length) melhor = rota;
    }
    if (melhor.length === 0) return; // sem caminho agora; tenta de novo quando ele andar
    caminho = melhor;
    passoPedidoEm = 0;
    const fim = melhor[melhor.length - 1]!;
    destMark.x = fim.x * TS;
    destMark.y = fim.y * TS;
    destMark.visible = true;
  }

  // ---- Menu de contexto ---------------------------------------------------

  function fecharMenu(): void {
    ctxEl.style.display = 'none';
  }

  /** Um item do menu. `motivo` presente = desabilitado, com o porquê no tooltip. */
  function itemMenu(rotulo: string, motivo: string | null, acao: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = rotulo;
    if (motivo) {
      b.disabled = true;
      b.title = motivo;
    } else {
      b.onclick = (): void => { fecharMenu(); acao(); };
    }
    return b;
  }

  /** Este personagem é de uma conta que está na minha lista? (ver `S2C_Friends`) */
  function ehAmigo(nome: string): boolean {
    return friends.some((f) => f.charName === nome);
  }

  function abrirMenu(alvo: EntitySnapshot, x: number, y: number): void {
    const eu = myId ? porId.get(myId) : undefined;
    const noMeuGrupo = party?.members.some((m) => m.id === alvo.id) ?? false;
    const souLider = party?.leaderId === myId;
    const amigo = ehAmigo(alvo.name);

    ctxNameEl.textContent = `${alvo.name} — Nv ${alvo.level ?? '?'}`;
    // Recriar os botões a cada abertura em vez de escondê-los: o que aparece
    // depende do alvo (líder vê "Expulsar", amigo vê "Remover"), e alternar
    // visibilidade de oito botões daria mais código que recriar quatro.
    while (ctxEl.children.length > 1) ctxEl.lastChild!.remove();

    // 🔴 **"Informações" vem PRIMEIRO, e "Atacar" vai para o fim.** A ordem não é
    // estética: o menu abre logo abaixo do cursor, então o primeiro item é o que
    // um clique apressado acerta. Inspecionar é a ação segura e frequente;
    // atacar é a rara e irreversível — quem paga o preço de um clique errado não
    // pode ser quem só queria olhar.
    //
    // Este era o bug relatado pelo dono em 2026-07-30: *"clico para inspecionar
    // e a ação sai em atacar direto se o PK estiver ativo"*. Com "Atacar" no topo
    // e o menu nascendo sob o ponteiro, ele estava a um clique de distância —
    // e no Windows o `contextmenu` dispara no RELEASE do botão direito, então o
    // menu já aparece com o cursor em cima.
    ctxEl.appendChild(itemMenu('📋 Informações', null, () => mostrarInfo(alvo)));

    ctxEl.appendChild(itemMenu(
      followId === alvo.id ? '🚶 Parar de seguir' : '🚶 Seguir',
      null,
      () => {
        if (followId === alvo.id) { pararFollow(); return; }
        followId = alvo.id;
        followUltimoTile = -1;
        logChat(`Seguindo ${alvo.name}. Ande com o teclado para parar.`, 'sys');
        tickFollow();
      },
    ));

    if (noMeuGrupo) {
      if (souLider && alvo.id !== myId) {
        ctxEl.appendChild(itemMenu('👑 Passar liderança', null, () => {
          net.send({ t: 'party', action: 'promote', targetId: alvo.id });
        }));
        ctxEl.appendChild(itemMenu('🚫 Expulsar do grupo', null, () => {
          net.send({ t: 'party', action: 'kick', targetId: alvo.id });
        }));
      }
    } else {
      const motivoConvite = alvo.partyId
        ? `${alvo.name} já está em outro grupo.`
        : party && !souLider
          ? 'Só o líder do grupo pode convidar.'
          : party && party.members.length >= PARTY_MAX
            ? `O grupo já está cheio (${PARTY_MAX}).`
            : null;
      ctxEl.appendChild(itemMenu('👥 Convidar para o grupo', motivoConvite, () => {
        net.send({ t: 'party', action: 'invite', targetId: alvo.id });
      }));
    }

    ctxEl.appendChild(itemMenu(
      amigo ? '💔 Remover dos amigos' : '🤝 Adicionar aos amigos',
      null,
      () => net.send({ t: 'friend', action: amigo ? 'remove' : 'add', name: alvo.name }),
    ));

    // --- Atacar, por último e separado ---------------------------------------
    //
    // O motivo da recusa é calculado aqui só para o TOOLTIP. Quem decide de
    // verdade é o `canHarm` do servidor, e ele recusa de novo.
    //
    // 🔴 O PK do ALVO não entra na conta: ele não protege ninguém. O que abre a
    // exceção é a caveira dele, que dispensa o atacante de ligar o próprio PK.
    const motivoAtacar = noMeuGrupo
      ? 'Está no seu grupo.'
      : !pkOn && !alvo.skull
        ? 'Ligue o seu PK para atacar outro jogador.'
        : null;

    const sep = document.createElement('div');
    sep.className = 'ctxsep';
    ctxEl.appendChild(sep);

    // 🔴 **Atacar quem NÃO tem caveira pede confirmação.** O golpe rende ⚪
    // Caveira Branca por 5 minutos, e durante ela qualquer um que esteja vendo
    // pode revidar sem punição. Uma ação com esse preço não pode custar um
    // clique — e o alvo com caveira é a exceção justamente porque atacá-lo já
    // não custa nada (`17.38`).
    const custaCaveira = !alvo.skull;
    const btnAtacar = itemMenu(
      alvo.skull ? '⚔️ Atacar (⚪ alvo livre)' : '⚔️ Atacar',
      motivoAtacar,
      () => setTarget(alvo.id),
    );
    if (!motivoAtacar && custaCaveira) {
      btnAtacar.classList.add('ctxdanger');
      btnAtacar.title = 'Isto te dá ⚪ Caveira Branca por 5 min — clique duas vezes.';
      let armado = false;
      btnAtacar.onclick = (): void => {
        if (!armado) {
          armado = true;
          btnAtacar.textContent = '⚔️ Confirmar — dá Caveira Branca';
          return;
        }
        fecharMenu();
        setTarget(alvo.id);
      };
    }
    ctxEl.appendChild(btnAtacar);

    // Posiciona e só então mede: com `display: none` o menu não tem tamanho, e
    // a correção de borda mediria zero.
    ctxEl.style.display = 'block';
    ctxEl.style.left = '0px';
    ctxEl.style.top = '0px';
    const r = ctxEl.getBoundingClientRect();
    // 🔴 **Deslocado do cursor, não colado nele.** Com o canto exatamente em
    // (x, y) o primeiro item nasce SOB o ponteiro, e no Windows o `contextmenu`
    // dispara no release do botão direito — ou seja, o menu já aparece com o
    // mouse em cima de um item, a um clique de executá-lo. Foi metade do bug do
    // "atacar sozinho"; a outra metade era "Atacar" ser o primeiro item.
    const CURSOR_GAP = 6;
    // Encosta na borda -> abre para dentro, senão o último item fica fora da tela.
    const px = Math.min(x + CURSOR_GAP, window.innerWidth - r.width - 4);
    const py = Math.min(y + CURSOR_GAP, window.innerHeight - r.height - 4);
    ctxEl.style.left = `${Math.max(4, px)}px`;
    ctxEl.style.top = `${Math.max(4, py)}px`;
    void eu; // (a ficha do próprio jogador ainda não muda o menu)
  }

  /**
   * "Informações básicas" — montada do snapshot, sem ida ao servidor.
   *
   * Sai no chat em vez de numa janela: é informação de uma linha, e uma janela
   * modal para três dados exigiria fechar algo antes de voltar a jogar.
   */
  function mostrarInfo(alvo: EntitySnapshot): void {
    const cls = alvo.charClass ? CLASSES[alvo.charClass]?.name ?? alvo.charClass : '—';
    const vida = alvo.hp !== undefined && alvo.maxHp !== undefined
      ? `${Math.round((alvo.hp / alvo.maxHp) * 100)}%`
      : '—';
    const partes = [
      `<b>${alvo.name}</b>`,
      `Nível ${alvo.level ?? '?'}`,
      cls,
      `Vida ${vida}`,
      alvo.pkEnabled ? 'PK ligado' : 'PK desligado',
    ];
    // Antes do grupo e dos amigos: é o dado que muda o que dá para fazer AGORA.
    if (alvo.skull) partes.push('⚪ <b>Caveira Branca</b> — pode ser atacado sem punição');
    if (alvo.partyId) partes.push(alvo.partyId === party?.id ? 'no seu grupo' : 'em um grupo');
    if (ehAmigo(alvo.name)) partes.push('seu amigo');
    logChat(partes.join(' · '), 'sys');
  }

  // Um clique em qualquer lugar fecha o menu. `mousedown` e não `click` para
  // fechar antes de o clique virar caminhada por baixo do menu aberto.
  window.addEventListener('mousedown', (ev) => {
    if (!ctxEl.contains(ev.target as Node)) fecharMenu();
  });
  window.addEventListener('blur', fecharMenu);

  // ---- Grupo --------------------------------------------------------------

  function renderParty(): void {
    if (!party) {
      partyBox.style.display = 'none';
      partyListEl.textContent = '';
      return;
    }
    partyBox.style.display = '';
    partyListEl.textContent = '';
    for (const m of party.members) {
      const row = document.createElement('div');
      row.className = m.nearby ? 'prow' : 'prow far';
      row.title = m.nearby ? '' : 'Longe demais do grupo';
      const nome = document.createElement('span');
      nome.className = 'pname';
      nome.textContent = m.name;
      if (m.id === party.leaderId) {
        const coroa = document.createElement('span');
        coroa.className = 'plead';
        coroa.textContent = '👑';
        coroa.title = 'Líder do grupo';
        row.appendChild(coroa);
      }
      const nv = document.createElement('span');
      nv.textContent = `Nv${m.level}`;
      const barra = document.createElement('div');
      barra.className = 'phpbar';
      const fill = document.createElement('i');
      fill.style.width = `${Math.max(0, Math.min(100, (m.hp / Math.max(1, m.maxHp)) * 100))}%`;
      barra.appendChild(fill);
      barra.title = `${m.hp}/${m.maxHp}`;
      row.append(nome, nv, barra);
      // 🔴 `DD-PARTY-007` na tela. Sem isto, quem chama um amigo de nível muito
      // diferente não entende por que não ganha XP — e a regra parece bug.
      // Âmbar, não vermelho: é aviso sobre como a regra funciona, não erro que o
      // jogador cometeu.
      if (!m.sharesXp) {
        const fora = document.createElement('span');
        fora.className = 'pxpwarn';
        fora.textContent = '≠XP';
        fora.title = 'Diferença de nível grande demais para dividir XP';
        row.appendChild(fora);
      }
      partyListEl.appendChild(row);
    }

    // `DD-PARTY-014`: a regra ativa tem que estar visível aos membros. É o tipo
    // de coisa que o jogador só descobre que precisava saber depois de perder um
    // item.
    partyLootEl.textContent = LOOT_RULE_LABEL[party.lootRule];

    if (!party.vote) {
      partyVoteEl.style.display = 'none';
      return;
    }
    partyVoteEl.style.display = '';
    const v = party.vote;
    partyVoteEl.innerHTML = `<div class="hint">Proposta: ${escapeHtml(LOOT_RULE_LABEL[v.proposal])}`
      + `<br>${v.favor} a favor · ${v.contra} contra</div>`;
    if (v.pending) {
      const sim = document.createElement('button');
      sim.textContent = 'A favor';
      sim.onclick = (): void => net.send({ t: 'party', action: 'vote', agree: true });
      const nao = document.createElement('button');
      nao.textContent = 'Contra';
      nao.onclick = (): void => net.send({ t: 'party', action: 'vote', agree: false });
      partyVoteEl.append(sim, nao);
    }
  }

  el('party-leave').addEventListener('click', () => net.send({ t: 'party', action: 'leave' }));

  /** Conta regressiva do convite na tela; limpa junto com a caixa. */
  let conviteTimer: number | undefined;

  function mostrarConvite(fromId: string, fromName: string, expiresAt: number): void {
    convitePendente = { fromId, fromName };
    inviteEl.style.display = 'block';
    // A caixa some sozinha quando o convite expira no SERVIDOR. Deixá-la na
    // tela depois disso ofereceria um "Aceitar" que já seria recusado.
    const tick = (): void => {
      const seg = Math.ceil((expiresAt - Date.now()) / 1000);
      if (seg <= 0) { esconderConvite(); return; }
      inviteTextEl.innerHTML = `<b>${fromName}</b> convidou você para um grupo. <span class="hint">(${seg}s)</span>`;
      conviteTimer = window.setTimeout(tick, 250);
    };
    window.clearTimeout(conviteTimer);
    tick();
  }
  function esconderConvite(): void {
    convitePendente = null;
    inviteEl.style.display = 'none';
    window.clearTimeout(conviteTimer);
  }
  el('pi-accept').addEventListener('click', () => {
    if (!convitePendente) return;
    net.send({ t: 'party', action: 'accept', targetId: convitePendente.fromId });
    esconderConvite();
  });
  el('pi-decline').addEventListener('click', () => {
    if (!convitePendente) return;
    net.send({ t: 'party', action: 'decline', targetId: convitePendente.fromId });
    esconderConvite();
  });

  // ---- Amigos -------------------------------------------------------------

  function renderFriends(): void {
    friendListEl.textContent = '';
    if (friends.length === 0) {
      const vazio = document.createElement('div');
      vazio.className = 'hint';
      vazio.textContent = 'Nenhum amigo ainda.';
      friendListEl.appendChild(vazio);
      return;
    }
    // Online primeiro: é a informação pela qual se abre a lista.
    const ordenada = [...friends].sort(
      (a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name),
    );
    for (const f of ordenada) {
      const row = document.createElement('div');
      row.className = f.online ? 'frow on' : 'frow';
      const dot = document.createElement('span');
      dot.className = 'fdot';
      const nome = document.createElement('span');
      nome.className = 'fname';
      // Mostra o nome com que foi adicionado; se ele está online com OUTRO
      // personagem da mesma conta, o de agora vai entre parênteses — senão o
      // jogador veria "offline" alguém que está bem ali na frente dele.
      nome.textContent = f.online && f.charName && f.charName !== f.name
        ? `${f.name} (${f.charName})`
        : f.name;
      nome.title = f.online ? 'Online' : 'Offline';
      const x = document.createElement('button');
      x.className = 'fx';
      x.textContent = '✕';
      x.title = `Remover ${f.name}`;
      x.onclick = (): void => { net.send({ t: 'friend', action: 'remove', name: f.name }); };
      row.append(dot, nome, x);
      friendListEl.appendChild(row);
    }
  }

  // ---- Flag de PK ---------------------------------------------------------

  function renderPk(): void {
    pkBtn.textContent = pkOn ? 'PK: LIGADO' : 'PK: desligado';
    pkBtn.classList.toggle('on', pkOn);
  }
  // Modo de combate. Não vai ao servidor: é decisão de como o CLIENTE anda.
  const chaseBtn = el('chase-toggle') as HTMLButtonElement;
  chaseBtn.addEventListener('click', () => {
    chaseMode = !chaseMode;
    chaseBtn.textContent = chaseMode ? '🏃 Perseguir' : '🧍 Parado';
    chaseBtn.classList.toggle('on', chaseMode);
    if (chaseMode) {
      followUltimoTile = -1;
      tickFollow(); // liga e já sai andando, se houver alvo
    } else {
      // Desligar PARA na hora. Continuar a rota depois de pedir para ficar
      // parado seria o oposto do que o botão promete.
      cancelarRota();
    }
  });

  pkBtn.addEventListener('click', () => net.send({ t: 'pk', on: !pkOn }));
  renderPk();
  renderFriends();

  // Botão direito: em cima de outro jogador abre o menu; no vazio, cancela a
  // caminhada — que era o comportamento antigo e continua sendo o padrão.
  viewportEl.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    const t = tileDoEvento(ev);
    const alvo = jogadoresPorTile.get(t.y * map.width + t.x);
    if (alvo) {
      abrirMenu(alvo, ev.clientX, ev.clientY);
      return;
    }
    fecharMenu();
    cancelarRota();
  });

  /**
   * A câmera já travou no herói? Enquanto for `false` ela SALTA para o alvo em
   * vez de suavizar — ver o bloco de câmera dentro do ticker.
   */
  let cameraSeguindo = false;

  // Loop de render ---------------------------------------------------------
  app.ticker.add(() => {
    if (myFloor !== renderedFloor) rebuildFloor(myFloor);

    const now = performance.now();
    // TECLADO MANDA: se o jogador tocou numa tecla de direção, a rota do clique
    // morre. Duas fontes de movimento disputando o mesmo personagem é a receita
    // do "meu boneco anda sozinho".
    //
    // Vale para o Seguir também, e com mais força: uma rota cancelada volta no
    // frame seguinte enquanto o alvo estiver marcado, então sem soltar o
    // `followId` o teclado perderia a disputa para sempre.
    //
    // 🔴 Vale para o modo PERSEGUIR também, e por lá não dá para soltar o alvo:
    // largar o alvo de ataque a cada tecla apertada acabaria com o combate. Em
    // vez disso, o passo automático simplesmente não roda enquanto houver tecla
    // pressionada — quem está dirigindo é quem manda, e ao soltar a tecla a
    // perseguição volta sozinha.
    if (heldKeys.size > 0) {
      if (followId) pararFollow();
      if (caminho.length > 0) cancelarRota();
    } else {
      tickFollow();
    }

    // Chegou perto do corpo/bolsa que se clicou de longe? Abre. Ver `openCorpse`.
    if (abrirAoChegar) {
      const alvo = porId.get(abrirAoChegar);
      if (!alvo) {
        abrirAoChegar = null; // expirou ou outro jogador levou
      } else if (distDoHeroi(alvo.tileX, alvo.tileY) <= 1) {
        const id = abrirAoChegar;
        abrirAoChegar = null;
        openCorpse(id);
      } else if (caminho.length === 0) {
        // A rota acabou (ou foi cancelada) sem chegar: desiste em silêncio, em
        // vez de ficar com uma intenção pendurada esperando para sempre.
        abrirAoChegar = null;
      }
    }

    // Chegou ao nó que se clicou de longe? Coleta. Mesmas três saídas do bloco
    // acima — sumiu, chegou, ou a rota morreu no caminho.
    if (coletarAoChegar) {
      const alvo = porId.get(coletarAoChegar);
      if (!alvo) {
        coletarAoChegar = null; // esgotou, ou outro jogador levou a última carga
      } else if (distDoHeroi(alvo.tileX, alvo.tileY) <= 1) {
        const id = coletarAoChegar;
        coletarAoChegar = null;
        gatherNode(id);
      } else if (caminho.length === 0) {
        coletarAoChegar = null;
      }
    }

    // Consome a rota, um passo por vez, na MESMA cadência do teclado — então
    // andar por clique e por tecla tem exatamente a mesma velocidade.
    if (caminho.length > 0 && now - lastSentAt > 120) {
      const proximo = caminho[0]!;
      if (proximo.x === myTileX && proximo.y === myTileY) {
        caminho.shift();
        passoPedidoEm = 0;
        if (caminho.length === 0) destMark.visible = false;
      } else {
        const dx = Math.sign(proximo.x - myTileX);
        const dy = Math.sign(proximo.y - myTileY);
        // Passo pedido e nada aconteceu: algo entrou na frente (monstro andou,
        // outro jogador parou ali). Recalcula uma vez; se não houver rota, desiste
        // em vez de ficar empurrando parede para sempre.
        if (passoPedidoEm && now - passoPedidoEm > PASSO_TRAVADO_MS) {
          const destino = caminho[caminho.length - 1]!;
          const rota = rotaAte(myTileX, myTileY, destino.x, destino.y);
          if (rota.length === 0) cancelarRota();
          else { caminho = rota; passoPedidoEm = 0; }
        } else {
          moveSeq++;
          net.send({ t: 'move', seq: moveSeq, dx, dy });
          lastSentAt = now;
          if (!passoPedidoEm) passoPedidoEm = now;
        }
      }
    }

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
    // 🔴 A ENTRADA NÃO PODE SER SUAVIZADA, e são dois motivos separados.
    //
    // 1. `world` nasce em (0,0), que é o CANTO DO MUNDO, não o herói. Suavizar a
    //    partir dali é atravessar o mapa inteiro a 20% por quadro — e enquanto
    //    isso `atualizaChunks` monta e joga fora cenário ao longo de todo o
    //    caminho, porque é a câmera que decide o que existe.
    // 2. Pior: `app.screen.width` é 0 enquanto o `#viewport` ainda não tem
    //    tamanho (a lista de personagens aparece antes do mundo). Alvo calculado
    //    com tela de largura 0 está errado, e suavizar até ele grava o erro.
    //
    // Por isso a câmera SALTA — e continua saltando — até o herói existir de
    // verdade; a suavização só começa depois disso, que é quando ela serve para
    // o que foi feita: acompanhar quem anda.
    if (app.screen.width > 0 && app.screen.height > 0) {
      if (cameraSeguindo) {
        world.x += (targetX - world.x) * 0.2;
        world.y += (targetY - world.y) * 0.2;
      } else {
        world.x = targetX;
        world.y = targetY;
        cameraSeguindo = !!self; // o herói apareceu: a partir daqui, suaviza
      }
    }

    // Cenário sob demanda: monta o que entrou na tela, joga fora o que saiu.
    // Depois da câmera de propósito — é a posição DELA que decide o que existe.
    atualizaChunks();

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

  // 🔴 ÚLTIMA LINHA DE `startGame`, e tem que continuar sendo.
  //
  // Só aqui todo o estado da partida existe. Libera a entrega de mensagens e
  // despeja o que chegou enquanto o mundo carregava — em especial o
  // `inventory`, que o servidor manda uma única vez, no join, e que antes se
  // perdia (equipamento e mochila ficavam vazios até o primeiro item mudar).
  flushPendingGameMessages();
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
  /**
   * Toca a animação de morte. **Terminal:** o sprite fica no último quadro, que
   * é a pose de morto — não volta a andar.
   *
   * O gatilho é a mensagem `hit` com `fatal: true`, que o servidor já manda.
   */
  playDeath?: () => void;
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
/**
 * Desenha o SÍMBOLO de uma condição num quadrado de lado `s`, na origem dada.
 *
 * 🔴 Antes eram quadrados coloridos e nada mais: dez estados diferentes com a
 * mesma forma, distinguíveis só pela cor. Cor sozinha não serve — o jogador não
 * memoriza dez tons, e quem tem daltonismo não distingue nenhum.
 *
 * Cada condição ganhou uma FORMA reconhecível. São desenhos vetoriais e não arte,
 * porque a 9 px nenhum sprite legível caberia; a forma é o que carrega o
 * significado nesse tamanho.
 */
function drawConditionGlyph(
  g: Graphics, id: ConditionId, ox: number, oy: number, s: number,
): void {
  const cor = CONDITION_COLORS[id] ?? 0xffffff;
  const cx = ox + s / 2;
  const cy = oy + s / 2;
  const r = s * 0.42;
  const linha = Math.max(1, s * 0.16);

  switch (id) {
    // Congelamento: cristal de gelo — três eixos cruzados.
    case 'freeze':
      for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
        g.moveTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r);
        g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      g.stroke({ width: linha, color: cor });
      break;

    // Petrificação: pedra — polígono angular e maciço.
    case 'petrify':
      g.poly([
        cx - r, cy + r * 0.5, cx - r * 0.5, cy - r,
        cx + r * 0.6, cy - r * 0.7, cx + r, cy + r * 0.3, cx + r * 0.2, cy + r,
      ]).fill(cor);
      break;

    // Atordoamento: tontura — anel aberto com um ponto, como as estrelinhas.
    case 'stun':
      g.arc(cx, cy, r, 0.6, Math.PI * 1.7).stroke({ width: linha, color: cor });
      g.circle(cx + r * 0.7, cy - r * 0.7, linha * 0.9).fill(cor);
      break;

    // Silêncio: círculo cortado — o "proibido" universal.
    case 'silence':
      g.circle(cx, cy, r).stroke({ width: linha, color: cor });
      g.moveTo(cx - r * 0.7, cy + r * 0.7);
      g.lineTo(cx + r * 0.7, cy - r * 0.7);
      g.stroke({ width: linha, color: cor });
      break;

    // Veneno: bolhas — três círculos, distinto da gota do sangramento.
    case 'poison':
      g.circle(cx - r * 0.45, cy + r * 0.35, r * 0.4).fill(cor);
      g.circle(cx + r * 0.45, cy + r * 0.25, r * 0.32).fill(cor);
      g.circle(cx, cy - r * 0.5, r * 0.45).fill(cor);
      break;

    // Sangramento: gota caindo.
    case 'bleed':
      g.poly([cx, cy - r, cx + r * 0.75, cy + r * 0.45, cx, cy + r, cx - r * 0.75, cy + r * 0.45])
        .fill(cor);
      break;

    // Queimadura: chama — triângulo com a base ondulada sugerida.
    case 'burn':
      g.poly([cx, cy - r, cx + r * 0.8, cy + r * 0.8, cx - r * 0.8, cy + r * 0.8]).fill(cor);
      g.circle(cx, cy + r * 0.3, r * 0.3).fill(0x000000);
      break;

    // Lentidão: ampulheta — tempo escorrendo.
    case 'slow':
      g.poly([cx - r * 0.7, cy - r, cx + r * 0.7, cy - r, cx, cy]).fill(cor);
      g.poly([cx - r * 0.7, cy + r, cx + r * 0.7, cy + r, cx, cy]).fill(cor);
      break;

    // Empurrão: seta para a direita.
    case 'knockback':
      g.poly([cx - r * 0.3, cy - r * 0.7, cx + r * 0.8, cy, cx - r * 0.3, cy + r * 0.7]).fill(cor);
      g.rect(cx - r, cy - linha / 2, r * 0.6, linha).fill(cor);
      break;

    // Aprisionamento: raízes cruzadas prendendo os pés.
    case 'root':
      g.moveTo(cx - r, cy + r);
      g.lineTo(cx + r * 0.4, cy - r);
      g.moveTo(cx + r, cy + r);
      g.lineTo(cx - r * 0.4, cy - r);
      g.moveTo(cx - r, cy);
      g.lineTo(cx + r, cy);
      g.stroke({ width: linha, color: cor });
      break;
  }
}

/**
 * ⚪ Caveira sobre o personagem — a marca de "alvo livre".
 *
 * Desenhada com `Graphics` e não com o emoji 💀 por um motivo prático: emoji
 * renderiza colorido e em fonte do sistema, então a caveira mudaria de cara
 * conforme a máquina e não daria para distinguir a branca da vermelha e da preta
 * quando elas chegarem (Etapa 17). Aqui a cor é um parâmetro.
 *
 * Fica **acima** da fita de condição (que senta em y=-20), à direita, para não
 * cobrir o nome nem a barra de vida.
 */
function makeSkullMark(): { node: Container; set: (kind?: SkullKind) => void } {
  const node = new Container();
  const g = new Graphics();
  node.addChild(g);
  node.x = TS / 2 + 8;
  node.y = -30;
  let anterior: SkullKind | undefined;

  function set(kind?: SkullKind): void {
    if (kind === anterior) return;
    anterior = kind;
    g.clear();
    node.visible = kind !== undefined;
    if (!kind) return;

    const cor = 0xf2f2f2; // vermelha/preta entram aqui na Etapa 17
    // Crânio + mandíbula, com contorno escuro: sem o contorno, uma caveira
    // branca sobre a neve ou sobre pedra clara simplesmente some.
    g.circle(0, 0, 5).fill({ color: cor }).stroke({ width: 1, color: 0x1a1a1a });
    g.rect(-2.5, 3.5, 5, 3.5).fill({ color: cor }).stroke({ width: 1, color: 0x1a1a1a });
    // Órbitas: os dois pontos são o que faz o disco virar caveira a 10 px.
    g.circle(-1.9, -0.6, 1.5).fill(0x1a1a1a);
    g.circle(1.9, -0.6, 1.5).fill(0x1a1a1a);
  }

  return { node, set };
}

function makeConditionStrip(): { node: Container; set: (ids?: ConditionId[]) => void } {
  // 9 px em vez dos 5 de antes: a 5 px nenhum símbolo é legível, e sem símbolo a
  // fita volta a ser dez quadrados iguais.
  const S = 9;
  const GAP = 2;
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
    node.y = -20;
    lista.forEach((id, i) => {
      const x = i * (S + GAP);
      // Fundo escuro atrás de cada símbolo: sem ele, glifo de cor clara sobre
      // piso claro desaparece.
      g.roundRect(x - 1, -1, S + 2, S + 2, 2).fill({ color: 0x0a0806, alpha: 0.85 });
      drawConditionGlyph(g, id, x, 0, S);
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
 * Intervalo entre passos do HERÓI LOCAL, como o SERVIDOR calculou — não medido.
 *
 * 🔴 Conserta o "anda um tile, dá uma paradinha, anda outro" do próprio
 * personagem. Era o mesmo problema que as criaturas já tinham tido, e a solução
 * é a mesma: **parar de adivinhar quando dá para saber.**
 *
 * A cadência aprendida (`makeStepCadence`) trava no intervalo MAIS RÁPIDO já
 * visto, porque acelerar entra na hora e desacelerar entra por rampa. Basta um
 * par de passos chegar junto — rajada de rede, dois tiques do servidor caindo no
 * mesmo quadro — para a cadência descer abaixo do intervalo real. A partir daí
 * TODO deslize termina antes do próximo passo, e a fresta entre os dois é a
 * paradinha.
 *
 * O servidor manda `moveIntervalMs` em `stats` desde sempre; só ninguém o usava
 * para o deslize. Medir continua certo para os OUTROS jogadores, cuja velocidade
 * este cliente não conhece.
 */
let heroiStepMs: number | null = null;

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
  isSelf = false,
): number {
  const doBestiario = creatureStepMs(e);
  if (doBestiario !== null) return doBestiario;
  // Herói local: o servidor já disse a velocidade dele. Ver `heroiStepMs`.
  if (isSelf && heroiStepMs !== null) return Math.max(STEP_MS_FLOOR, heroiStepMs);
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
  /**
   * Folhas no formato de `SPEC-SPRITES-MONSTROS.md`, por `creatureType`. Vazio
   * enquanto a arte não chega — quem não está no mapa cai no blob placeholder.
   */
  creatureSheets: Map<string, CreatureSheets>;
  knightArt: Record<Gender, KnightArt> | null;
  /**
   * Arte HD por classe (`tools/frames2strip.mjs`). Classe ausente do mapa cai no
   * MiniWorld — é o que segura o jogo de pé enquanto uma classe não tem pack.
   */
  heroArt: Partial<Record<PlayerClass, HeroArt>>;
  npcAnim: DirAnim | null;
  selfClass: PlayerClass;
  selfGender: Gender;
  /** Abre a loja do comerciante (clicar no NPC). */
  openShop: () => void;
  /** Abre o Banco (clicar no Banqueiro). */
  openBank: () => void;
  openCraft: () => void;
  /** Abre o espólio de um corpo no chão. */
  openCorpse: (id: string) => void;
  /** Coleta de um nó de recurso (anda até lá antes, se for preciso). */
  gatherNode: (id: string) => void;
  /**
   * Id do tile de chão em (x,y).
   *
   * Existe para o nó de recurso saber em que bioma nasceu e escolher a cor da
   * pedra — ver `crystalNodeSprite`. Vem por aqui porque `makeNodeView` é uma
   * função de módulo e o mapa mora no fecho de `startGame`.
   */
  chaoEm: (x: number, y: number) => number;
  /**
   * Ícone do item como textura, para desenhar a pilha caída no chão.
   *
   * É a MESMA função que gera o ícone da mochila. O jogador precisa reconhecer
   * no chão o que acabou de soltar — quando não reconhece, ele conclui que o
   * jogo soltou outra coisa.
   */
  itemTexture: (kind: string) => Texture;
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
  if (e.kind === 'item') return makeItemView(e, mini.itemTexture, mini.openCorpse);
  if (e.kind === 'node') return makeNodeView(e, mini.gatherNode, mini.chaoEm);
  if (e.kind === 'npc') {
    // Clicar abre o painel da FUNÇÃO do NPC. Cada um tem cor própria: os três
    // ficam na mesma praça e usam o MESMO sprite placeholder, então a cor é a
    // única pista visual de quem é quem.
    const cor = e.npcRole === 'bank'
      ? 0x9fc7e8 // banqueiro: azul-prata
      : e.npcRole === 'blacksmith'
        ? 0xd98a4a // ferreiro: laranja de forja
        : 0xe8c24a; // comerciante: dourado
    const abre = e.npcRole === 'bank'
      ? mini.openBank
      : e.npcRole === 'blacksmith'
        ? mini.openCraft
        : mini.openShop;
    return makeMiniActor({
      e, anim: mini.npcAnim ?? mini.classAnims?.archer ?? { down: [], up: [], right: [], left: [] },
      scale: 2.4,
      nameColor: cor,
      tint: e.npcRole === 'vendor' ? undefined : cor,
      onClick: abre,
    });
  }
  // A classe/sexo vêm do snapshot (todos os jogadores); para o próprio, o escolhido.
  const cls = e.charClass ?? (isSelf ? mini.selfClass : 'knight');
  const gender: Gender = e.gender ?? (isSelf ? mini.selfGender : 'male');
  const nameColor = isSelf ? 0xbfe0ff : 0xe0c9a3;
  // ARTE HD DE CLASSE — o caminho principal desde 09/08. Vem das tiras geradas
  // por `tools/frames2strip.mjs`, com andar, parado, golpe e morte em 4 direções.
  //
  // 🔴 O golpe sai da ARMA EQUIPADA (`e.weaponType`, que o servidor manda no
  // snapshot): arco na mão dispara, cajado conjura, adaga estoca. Sem o campo —
  // desarmado, ou jogador de um servidor antigo — cai no golpe de espada, que
  // toda classe tem.
  //
  // ⚠️ O sexo NÃO troca o sprite aqui: os packs vieram com um corpo só por
  // classe. A escolha continua existindo, salva e viajando no snapshot, para o
  // dia em que houver variante feminina — só não desenha diferente ainda.
  const hero = mini.heroArt[cls];
  if (hero) {
    return makeMiniActor({
      e, anim: hero.walk, scale: hero.scale,
      anchorX: hero.anchorX, anchorY: hero.anchorY, labelTop: hero.labelTop,
      idleAnim: hero.idle,
      attackAnim: golpeDe(hero, attackPoseFor(e.weaponType)),
      hurtAnim: hero.hurt,
      deathAnim: hero.death,
      nameColor, onClick: onTargetClick,
    });
  }
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
  /**
   * Animações de DISPARO ÚNICO, por direção (`SPEC-SPRITES-MONSTROS.md`).
   *
   * 🔴 Era o gargalo que o handoff apontava como item #1: até aqui **nenhum
   * monstro conseguia ter 4 direções E animação de ataque**. `makeMiniActor`
   * tinha as direções mas só andar/parado (`playAttack` dava um pulinho e
   * `playHurt` piscava vermelho); `makeSpriteActor` tinha ataque/dano/morte mas
   * era vista frontal única, espelhada.
   *
   * Todas opcionais: a spec permite entrega em partes, e sem a folha o motor cai
   * no comportamento antigo. Quem tem `attackAnim` ganha o golpe animado; quem
   * não tem continua com o pulinho.
   */
  attackAnim?: DirAnim;
  hurtAnim?: DirAnim;
  deathAnim?: DirAnim;
  onClick?: (id: string) => void;
}

function makeMiniActor(opts: MiniActorOpts): EntityView {
  const { e, anim, scale, nameColor, alwaysAnimate, onClick } = opts;
  const c = new Container();
  if (onClick) {
    c.eventMode = 'static';
    c.cursor = 'crosshair';
    c.hitArea = new Rectangle(0, -8, TS, TS + 12);
    c.on('pointertap', soBotaoEsquerdo(() => onClick(e.id)));
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
  /**
   * Estado de DISPARO ÚNICO ativo, se houver. Tem precedência sobre andar/parado
   * e volta sozinho ao terminar — exceto `death`, que é terminal: o bicho morreu,
   * não volta a andar.
   */
  type OneShot = 'attack' | 'hurt' | 'death';
  let oneShot: OneShot | null = null;

  function oneShotAnim(k: OneShot): DirAnim | undefined {
    return k === 'attack' ? opts.attackAnim : k === 'hurt' ? opts.hurtAnim : opts.deathAnim;
  }

  function applyState(): void {
    // Disparo único vence tudo: quem está no meio do golpe não volta a andar
    // antes de o golpe terminar.
    if (oneShot) {
      const a = oneShotAnim(oneShot);
      if (a) {
        sprite.textures = framesFor(dir, a);
        // Mais rápido que a caminhada: golpe é um evento, não um ciclo.
        sprite.animationSpeed = oneShot === 'death' ? 0.14 : 0.22;
        sprite.loop = false;
        sprite.gotoAndPlay(0);
        return;
      }
    }
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

  // Fim do disparo único: volta ao estado-base. `death` não volta — o sprite fica
  // no último quadro, que é a pose de morto.
  sprite.onComplete = (): void => {
    if (!oneShot || oneShot === 'death') return;
    oneShot = null;
    applyState();
  };

  applyState();

  /**
   * Começa um disparo único. `hurt` NÃO interrompe `attack`: um monstro que
   * apanha no meio do golpe continua golpeando, senão bastaria bater sem parar
   * para desarmar qualquer inimigo — e a morte, sim, interrompe tudo.
   */
  function startOneShot(k: OneShot): void {
    if (oneShot === 'death') return;
    if (k === 'hurt' && oneShot === 'attack') return;
    if (!oneShotAnim(k)) return; // sem folha: o chamador cai no efeito antigo
    oneShot = k;
    applyState();
  }

  function setDirection(d: Direction): void {
    if (d === dir) return;
    dir = d;
    applyState();
  }
  function setBase(next: 'idle' | 'walk'): void {
    if (next === base) return;
    base = next;
    // Trocar de base no meio de um golpe só guarda a intenção: `applyState`
    // continua mostrando o golpe, e o `onComplete` resolve depois.
    if (!oneShot) applyState();
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
    // Com folha de ataque, toca a animação; sem ela, cai no pulinho de sempre.
    // Os dois efeitos coexistem de propósito: o pulinho continua dando peso ao
    // golpe mesmo quando há animação.
    playAttack: () => {
      attackUntil = performance.now() + 140;
      startOneShot('attack');
    },
    playHurt: () => {
      hurtUntil = performance.now() + 220;
      startOneShot('hurt');
    },
    playDeath: () => { startOneShot('death'); },
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
    c.on('pointertap', soBotaoEsquerdo(() => onClick(e.id)));
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
  // Herói local usa a velocidade autoritativa; outros jogadores, a medida.
  let stepMs = stepDurationFor(e, false, cadence, 0, isSelf);
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
      stepMs = stepDurationFor(e, false, cadence, now - moveStart, isSelf);
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
  // Folha completa no formato de `SPEC-SPRITES-MONSTROS.md`: 4 direções COM
  // ataque, dano e morte. É o caminho que a arte nova usa, e vem primeiro porque
  // tem precedência sobre tudo — se a espécie foi desenhada, é assim que aparece.
  const folhas = e.creatureType ? mini.creatureSheets.get(e.creatureType) : undefined;
  if (folhas) {
    return makeMiniActor({
      e,
      anim: folhas.walk,
      scale: 2,
      nameColor: lighten(CREATURE_PLACEHOLDER_COLORS[e.creatureType!] ?? 0xa0e0a0, 0.45),
      creatureTint: true,
      idleAnim: folhas.idle,
      attackAnim: folhas.attack,
      hurtAnim: folhas.hurt,
      deathAnim: folhas.death,
      onClick: onTargetClick,
    });
  }

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
  c.on('pointertap', soBotaoEsquerdo(() => onTargetClick(e.id)));

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
function makeItemView(
  e: EntitySnapshot,
  itemTexture: (kind: string) => Texture,
  onCorpseClick?: (id: string) => void,
): EntityView {
  const c = new Container();
  c.x = e.tileX * TS;
  c.y = e.tileY * TS;
  const g = new Graphics();

  if (e.itemKind === 'lootbag') {
    /*
     * Bolsa de loot da criatura: saquinho de couro amarrado, com sombra.
     *
     * Desenhada diferente do corpo (ossos) de propósito — o jogador precisa
     * distinguir de longe "aqui tem meu espólio" de "alguém morreu aqui".
     */
    g.ellipse(TS / 2, TS - 4, 8, 3).fill({ color: 0x000000, alpha: 0.38 });
    // Corpo do saco, mais largo embaixo.
    g.moveTo(TS / 2 - 7, TS - 6);
    g.quadraticCurveTo(TS / 2 - 9, TS - 15, TS / 2 - 4, TS - 17);
    g.lineTo(TS / 2 + 4, TS - 17);
    g.quadraticCurveTo(TS / 2 + 9, TS - 15, TS / 2 + 7, TS - 6);
    g.quadraticCurveTo(TS / 2, TS - 3, TS / 2 - 7, TS - 6);
    g.fill(0x9a6a3a).stroke({ width: 1, color: 0x4a3018 });
    // Cordinha da boca do saco.
    g.rect(TS / 2 - 5, TS - 19, 10, 3).fill(0x6a4a24).stroke({ width: 1, color: 0x3a2410 });
    c.addChild(g);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.hitArea = new Rectangle(0, 0, TS, TS);
    c.on('pointertap', soBotaoEsquerdo(() => onCorpseClick?.(e.id)));
    c.addChild(nameLabel(e.name, 0xd9b26a));
    c.zIndex = c.y / TS + 0.25;
    return {
      container: c,
      setDirection: () => {},
      setTarget: (x, y) => { c.x = x; c.y = y; },
      setHp: () => {},
      update: () => {},
    };
  }

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
    c.on('pointertap', soBotaoEsquerdo(() => onCorpseClick?.(e.id)));
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

  /*
   * 🔴 BUG CORRIGIDO (01/08): aqui havia TRÊS CÍRCULOS DOURADOS FIXOS
   *
   *   for (const [ox, oy] of [[-4,2],[4,2],[0,-1]])
   *     g.circle(...).fill(0xf4c542)
   *
   * desenhados para QUALQUER item, ignorando `e.itemKind`. O dono soltou poções
   * e viu uma pilha de ouro no chão — e concluiu que soltar item estava soltando
   * a coisa errada. Não estava: o `drop` sempre funcionou, o DESENHO é que
   * mentia. Um bug de render que se disfarça de bug de lógica custa caro, então
   * o desenho agora sai da mesma função que faz o ícone da mochila.
   *
   * O ouro continua parecendo ouro — `itemIconCanvas` desenha pilha de moedas
   * para `category: 'currency'`. A diferença é que agora só o ouro parece ouro.
   */
  // Sombra elíptica: sem ela o ícone flutua, em vez de estar caído no tile.
  g.ellipse(TS / 2, TS - 5, 9, 3.5).fill({ color: 0x000000, alpha: 0.38 });
  c.addChild(g);
  const icon = new Sprite(itemTexture(e.itemKind ?? ''));
  icon.width = TS - 8;
  icon.height = TS - 8;
  icon.x = (TS - icon.width) / 2;
  icon.y = TS - 4 - icon.height; // assenta a base do ícone no chão do tile
  c.addChild(icon);
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

/**
 * Nó de recurso no chão: veio, árvore marcada, moita, cogumelos, cristal.
 *
 * Desenhado por código, como o resto do mundo enquanto a arte não chega — mas
 * com uma exigência a mais que o placeholder de criatura não tem: **os cinco
 * precisam ser distinguíveis à primeira vista**, senão o jogador anda até o
 * outro lado do mapa para descobrir que aquilo pedia uma picareta que ele não
 * tem. Por isso cada um tem FORMA própria, e não só a cor do `NODES[kind].color`
 * — a mesma lição dos ícones de condição: cor sozinha não serve.
 *
 * O nome só aparece ao passar o mouse. São ~50 nós no mapa; rótulo fixo em todos
 * cobriria o bosque inteiro de texto.
 */
function makeNodeView(
  e: EntitySnapshot,
  onGather: (id: string) => void,
  chaoEm: (x: number, y: number) => number,
): EntityView {
  const c = new Container();
  c.x = e.tileX * TS;
  c.y = e.tileY * TS;
  const g = new Graphics();
  const kind = e.nodeKind ?? 'ore';
  const cor = NODES[kind]?.color ?? 0x9a8a7a;
  const cx = TS / 2;
  const base = TS - 4;

  /*
   * Sprite de cristal/minério, quando o pack está presente. A COR sai do bioma
   * (o chão embaixo do nó) e o TAMANHO da caixa medida do desenho — os dois
   * consertos vieram de ver em tela. Ver `crystals.ts` e `spritebox.ts`.
   *
   * Sem o arquivo, `crystalNodeSprite` devolve null e cai no desenho por código
   * logo abaixo, que continua inteiro.
   */
  const arte = crystalNodeSprite(kind, chaoEm(e.tileX, e.tileY));
  if (arte) {
    const s = new Sprite(arte.tex);
    s.anchor.set(arte.centro, arte.base); // pé do desenho, não rodapé da moldura
    s.scale.set((TS * arte.largura) / (arte.tex.width * arte.cheia));
    s.x = cx;
    s.y = base;
    // Sombra por baixo, para o cristal não parecer flutuando sobre a areia.
    g.ellipse(cx, base, TS * arte.largura * 0.28, TS * arte.largura * 0.1)
      .fill({ color: 0x000000, alpha: 0.28 });
    c.addChild(g, s);
    return finalizaNodeView(c, e, onGather);
  }

  if (kind === 'wood') {
    /*
     * 🔴 A árvore JÁ está desenhada — este tile é um tile de árvore. O que se
     * desenha aqui é a MARCA de que ela pode ser cortada: um machado fincado no
     * tronco. Desenhar outra árvore por cima da árvore seria dizer duas vezes a
     * mesma coisa e esconder a informação nova.
     *
     * Fica por cima do tronco porque o `zIndex` de entidade (y + fração) vence o
     * do tile de árvore (y inteiro).
     */
    g.moveTo(cx + 1, base - 2).lineTo(cx + 9, base - 12)
      .stroke({ width: 2.5, color: 0x6b4a2a });
    g.moveTo(cx + 7, base - 15).lineTo(cx + 13, base - 9).lineTo(cx + 8, base - 7)
      .closePath().fill(0xc9ccd4).stroke({ width: 1, color: 0x5a5f68 });
    // Lasca cortada, no pé do tronco: a marca de que já bateram ali.
    g.ellipse(cx - 4, base - 3, 3, 1.6).fill({ color: 0xe0c48a, alpha: 0.9 });
  } else if (kind === 'ore') {
    // Pedra baixa com veios expostos.
    g.ellipse(cx, base, 11, 4).fill({ color: 0x000000, alpha: 0.32 });
    g.moveTo(cx - 11, base).lineTo(cx - 8, base - 11).lineTo(cx - 1, base - 15)
      .lineTo(cx + 8, base - 10).lineTo(cx + 11, base)
      .closePath().fill(0x5f5a54).stroke({ width: 1, color: 0x33302c });
    for (const [ox, oy, r] of [[-4, -4, 2], [2, -7, 2.4], [5, -3, 1.8]] as const) {
      g.circle(cx + ox, base + oy, r).fill(cor);
    }
  } else if (kind === 'crystal') {
    // Cacho de cristais, com brilho: o nó mais valioso tem que puxar o olho de
    // longe — é o que justifica atravessar território de Tier III para chegar.
    g.ellipse(cx, base, 10, 3.5).fill({ color: 0x000000, alpha: 0.3 });
    g.circle(cx, base - 9, 11).fill({ color: cor, alpha: 0.16 });
    for (const [ox, alt, larg] of [[-5, 11, 3], [0, 17, 4], [5, 13, 3.2]] as const) {
      g.moveTo(cx + ox - larg, base).lineTo(cx + ox, base - alt).lineTo(cx + ox + larg, base)
        .closePath().fill({ color: cor, alpha: 0.92 }).stroke({ width: 1, color: 0xdff6fb });
    }
  } else if (kind === 'herb') {
    // Moita de folhas longas com duas flores.
    g.ellipse(cx, base, 9, 3).fill({ color: 0x000000, alpha: 0.28 });
    for (const [ox, alt] of [[-6, 10], [-2, 15], [3, 13], [7, 9]] as const) {
      g.moveTo(cx, base).quadraticCurveTo(cx + ox * 1.6, base - alt * 0.6, cx + ox, base - alt)
        .stroke({ width: 2, color: cor });
    }
    g.circle(cx - 2, base - 16, 2.2).fill(0xe8e2a0);
    g.circle(cx + 4, base - 13, 1.8).fill(0xe8e2a0);
  } else {
    // Cogumelos: dois chapéus com pintas. É o nó que não pede ferramenta, e o
    // desenho mais amigável do conjunto de propósito.
    g.ellipse(cx, base, 9, 3).fill({ color: 0x000000, alpha: 0.28 });
    const cogumelo = (ox: number, escala: number): void => {
      g.rect(cx + ox - 1.5, base - 7 * escala, 3, 7 * escala).fill(0xe8dfc8);
      g.ellipse(cx + ox, base - 7 * escala, 6 * escala, 4 * escala)
        .fill(cor).stroke({ width: 1, color: 0x5f3a5a });
      g.circle(cx + ox - 2 * escala, base - 8 * escala, 1.1).fill({ color: 0xf4e8f2, alpha: 0.9 });
      g.circle(cx + ox + 2 * escala, base - 7 * escala, 0.9).fill({ color: 0xf4e8f2, alpha: 0.9 });
    };
    cogumelo(-5, 1);
    cogumelo(4, 0.75);
  }

  c.addChild(g);
  return finalizaNodeView(c, e, onGather);
}

/**
 * O que todo nó tem em comum, desenhado por código ou por sprite: área de
 * clique, rótulo no hover e profundidade.
 *
 * Extraído quando os sprites de cristal entraram — as duas saídas do
 * `makeNodeView` precisam disto igual, e duplicar significaria que um dia o nó
 * com sprite deixaria de ser clicável sem ninguém notar.
 */
function finalizaNodeView(
  c: Container,
  e: EntitySnapshot,
  onGather: (id: string) => void,
): EntityView {
  const cor = NODES[e.nodeKind ?? 'ore']?.color ?? 0x9a8a7a;

  c.eventMode = 'static';
  c.cursor = 'pointer';
  /*
   * 🔴 A área de clique é o TILE, não o sprite. O cristal de 64 px transborda
   * para cima e invadiria o tile de trás; quem clicasse ali pediria para
   * minerar sem estar mirando a célula que o servidor valida por distância.
   */
  c.hitArea = new Rectangle(0, 0, TS, TS);
  c.on('pointertap', soBotaoEsquerdo(() => onGather(e.id)));

  // Rótulo sob demanda: as cargas restantes entram porque são o que decide se
  // vale a pena andar até lá.
  const rotulo = nameLabel(
    e.charges && e.charges > 1 ? `${e.name} (${e.charges})` : e.name,
    cor,
  );
  rotulo.visible = false;
  c.addChild(rotulo);
  c.on('pointerover', () => { rotulo.visible = true; });
  c.on('pointerout', () => { rotulo.visible = false; });

  c.zIndex = c.y / TS + 0.3;
  return {
    container: c,
    setDirection: () => {},
    setTarget: (x, y) => { c.x = x; c.y = y; },
    setHp: () => {},
    update: () => {},
  };
}

/**
 * Envolve um clique de entidade para que **só o botão ESQUERDO** conte.
 *
 * 🔴 Conserta um bug real: clicar com o botão DIREITO num monstro atacava.
 *
 * O `pointertap` do Pixi dispara para qualquer botão, não só o primário — então
 * o mesmo gesto que deveria abrir o menu de contexto também mandava `attack`.
 * Atacar sem querer é caro: em PvP dá ⚪ Caveira Branca, e num monstro forte
 * começa uma luta que o jogador não escolheu.
 *
 * Vale para tudo que é clicável no mundo (monstro, jogador, NPC, corpo, bolsa):
 * o botão direito fica reservado ao menu, em todos.
 */
function soBotaoEsquerdo(fn: () => void): (ev: FederatedPointerEvent) => void {
  return (ev) => {
    if (ev.button === 0) fn();
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch,
  );
}

// ---- Bootstrap -------------------------------------------------------------
// A conexão é criada ANTES de qualquer tela: o login já precisa dela.
let autoAuthEnviado = false;
net = new NetClient(routeServerMessage, (connected) => {
  statusEl.innerHTML = connected
    ? 'Servidor: <span class="on">conectado</span>'
    : 'Servidor: <span class="off">reconectando…</span>';
  /*
   * 🔴 TEMPORÁRIO: autentica sozinho quando o socket abre pela PRIMEIRA vez.
   * Senha vazia — quem autoriza é o servidor de desenvolvimento, pelo nome da
   * conta.
   *
   * O `setTimeout` NÃO é frescura. Este callback roda dentro do `onopen` do
   * NetClient, ANTES da linha `if (this.username) this.sendAuth('login')` que
   * existe para refazer o login em reconexão. Autenticando aqui de forma
   * síncrona, `username` já estaria preenchido quando aquela linha rodasse — e
   * o login sairia DUAS vezes. Dois `authresult` viram dois `enterGame` (o
   * NetClient reentra sozinho quando já tem `characterId`), e o personagem
   * entrava duas vezes no mundo, chegando sem estado nenhum.
   *
   * Adiando para o próximo tique, o `onopen` termina com `username` ainda vazio
   * e só o nosso login acontece.
   */
  if (connected && DEV_AUTOLOGIN && !autoAuthEnviado) {
    autoAuthEnviado = true;
    console.warn(`[DEV] auto-login ligado para "${DEV_AUTOLOGIN}" — tela de login pulada`);
    window.setTimeout(() => net.auth('login', DEV_AUTOLOGIN, ''), 0);
  }
});
net.connect();

/**
 * Botão "⇦ Trocar personagem" — sai do mundo e volta para a lista da conta.
 *
 * Três coisas acontecem, nesta ordem, e cada uma tem motivo:
 *
 * 1. `net.leaveCharacter()` limpa o `characterId` do NetClient. Sem isso, se o
 *    socket reconectasse antes da recarga, o cliente REENTRARIA sozinho no
 *    personagem — o `NetClient` reentra por conta própria quando já tem um id.
 * 2. A marca em `sessionStorage` diz ao próximo boot para parar na lista em vez
 *    de deixar o auto-login de desenvolvimento entrar no primeiro personagem.
 * 3. `location.reload()` derruba o socket, e é a queda do socket que faz o
 *    servidor SALVAR e tirar o personagem do mundo. É o mesmo caminho de quem
 *    fecha a aba, ou seja, o mais exercitado que existe aqui.
 *
 * ⚠️ Sem o auto-login de desenvolvimento (produção, ou `VITE_DEV_ACCOUNT=`
 * vazio), a recarga cai na tela de LOGIN e pede a senha de novo — o cliente não
 * guarda senha, de propósito. Voltar direto para a lista sem redigitar exigiria
 * sessão persistente (um token), que o jogo ainda não tem.
 */
function setupSwitchCharButton(): void {
  const btn = document.getElementById('switchchar') as HTMLButtonElement | null;
  if (!btn) return;
  btn.onclick = () => {
    btn.disabled = true; // clique duplo não dispara duas recargas
    net.leaveCharacter();
    try {
      sessionStorage.setItem(CHAVE_TROCA, '1');
    } catch {
      // sessionStorage bloqueado: a recarga ainda tira o jogador do mundo, mas
      // o auto-login o devolve ao mesmo personagem. Melhor avisar do que fingir.
      console.warn('[troca] sessionStorage indisponível — o auto-login pode reentrar.');
    }
    location.reload();
  };
}

setupLoginScreen();
setupCharSelectScreen();
setupStartScreen();
setupSwitchCharButton();
showScreen('login');
