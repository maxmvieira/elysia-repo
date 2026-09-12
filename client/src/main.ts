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
  AnimatedSprite, Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture,
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
  creationCost,
  CREATION_POINTS,
  startingAttributes,
  checkAttributes,
  computeStats,
  type Attributes,
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
  skillBarFor,
  skillsOfClass,
  SKILL_BAR_COLS,
  SKILL_BAR_SLOTS,
  skillDuration,
  skillConditionChance,
  skillConditionDuration,
  skillGroundDuration,
  skillGroundMax,
  skillHits,
  skillImpactosEsperados,
  skillModifiers,
  hotTickMs,
  MODIFIER_KEYS,
  MODIFIER_LABEL,
  type SkillDef,
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
  CARDINAL_OF,
  type EntitySnapshot,
  type EquipSlot,
  type Gender,
  type ItemStack,
  type PlayerClass,
  attackPoseFor,
  resolveHold,
  executionMultiplier,
  furyStats,
  ruptureDefReduction,
  skillCastMs,
  skillManaCost,
  skillCooldown,
  skillPower,
  skillRange,
  skillCastRange,
  CUSTO_DIAGONAL,
  QUEDA_RISCO,
  ATRASO_IMPACTO_MS,
  INTERVALO_BOLT_MS,
  DUR_QUEDA_MS,
  skillMiraNoChao,
  REGIONS,
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
  CREATURE_FAMILY,
  ELEMENT_INFO,
  FARM_AREA,
  farmDesenhaCelula,
  interiorEm,
  dentroDaFarm,
  registraEdicoes,
  esqueceEdicao,
  aplicaEdicoes,
  type WorldEdit,
  type WorldDecal,
  type ConditionId,
  type SkullKind,
} from '@dominion/shared';
import { NetClient } from './net.js';
import { spellIconUrl } from './spellicons.js';
import FOLHAS_FX from './fx-folhas.json';
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
  classIconCss, loadClassAnims, loadNpcAnim, loadSlimeAnim,
  CREATURE_SHEETS, loadCreatureSheets, type CreatureSheets,
  type DirAnim,
} from './miniworld.js';
import { loadKnightSprites, knightIconCss, type KnightArt } from './knight.js';
import { retratoUrl } from './bestiario.js';
import {
  // ⚠️ `heroIconCss` e `retratoDeClasseCss` saíram do import em 10/09, quando
  // os cartões e o palco passaram a usar `heroIdleCss`. As duas CONTINUAM
  // exportadas pelo `heroes.ts` e a arte segue no disco — voltar atrás é
  // repor os nomes aqui e trocar as três chamadas.
  loadHeroArt, loadEquipArt, golpeDe, heroIdleCss, heroRostoCss, pecaDaArma, temCamada,
  HERO_ART_CLASSES,
  type HeroArt, type EquipArt, type EquipPiece, type ArtePorClasse,
} from './heroes.js';
import { loadTrees, treeTexFor, type ArvoreSprite } from './trees.js';
import { loadCrystals, crystalNodeSprite, crystalIconImage } from './crystals.js';
import { loadItemArt, itemArtImage, itemArtUrl } from './itemart.js';
import { carregaFarmArte } from './farmart.js';
import { criaEditor } from './editor.js';

const TS = TILE_SIZE;
const WALL_H = 18; // altura visual das paredes em pixels (efeito 2.5D)

/**
 * 🌀 **Os quadros do anel que orbita o conjurador, fatiados UMA VEZ.**
 *
 * ⚠️ Mora no módulo, e não dentro da entidade, porque toda entidade que conjura
 * usa os mesmos trinta quadros — fatiar por personagem criaria trinta `Texture`
 * novas a cada monstro que aparecesse na tela.
 *
 * ⚠️ E é PREGUIÇOSO: `makeEntity` roda muito antes de a folha terminar de
 * carregar, então quem pergunta é a primeira conjuração. Enquanto não houver
 * folha, devolve `undefined` e o anel simplesmente não aparece — a mesma
 * convenção do resto dos efeitos.
 */
const ANEL_CASTER_COLS = 6;
const ANEL_CASTER_QUADROS = 30;
let anelCasterCache: Texture[] | null = null;
function quadrosAnelCaster(): Texture[] | undefined {
  if (anelCasterCache) return anelCasterCache;
  const t = Assets.get<Texture>('/assets/fx/anel_caster.png');
  if (!t) return undefined;
  const lw = t.width / ANEL_CASTER_COLS;
  const lh = t.height / Math.ceil(ANEL_CASTER_QUADROS / ANEL_CASTER_COLS);
  anelCasterCache = Array.from({ length: ANEL_CASTER_QUADROS }, (_, i) => new Texture({
    source: t.source,
    frame: new Rectangle(
      (i % ANEL_CASTER_COLS) * lw,
      Math.floor(i / ANEL_CASTER_COLS) * lh,
      lw, lh,
    ),
  }));
  return anelCasterCache;
}

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
  // Identidade: retrato, nome e classe. Preenchidos uma vez, no `startGame` —
  // nenhum dos três muda enquanto o personagem está no mundo.
  charname: el('charname'), charclass: el('charclass'),
  hpfill: el('hpfill'), hptext: el('hptext'),
  manafill: el('manafill'), manatext: el('manatext'),
  xpfill: el('xpfill'), xptext: el('xptext'),
  // ⚔️ Painel do personagem (08/09): nível base, nível de job e a barra dele.
  chbaselv: el('chbaselv'), chjoblv: el('chjoblv'),
  jobfill: el('jobfill'), jobtext: el('jobtext'),
  death: el('death'), deathby: el('deathby'),
};

// ---------------------------------------------------------------------------
// ⚔️ Painel do personagem: recolher/expandir e os atalhos
//
// 🔴 **Estado próprio, independente do resto da HUD** — foi pedido explícito.
// Nenhum outro painel do jogo consulta isto, e recolher a ficha não encosta na
// barra de magias, no mapa nem no chat.
//
// ⚠️ Guardado em `localStorage`, como a posição da barra de magias: quem
// recolheu quer continuar recolhido na próxima sessão. É preferência de
// interface, não estado de jogo — não vai para o servidor.
// ---------------------------------------------------------------------------

const CHAVE_HUD_ABERTA = 'elysia.charhud.expandida';

// ---------------------------------------------------------------------------
// 🪟 Janelas do jogo
//
// Os painéis que moravam nas colunas laterais viraram janelas que flutuam sobre
// o mundo e abrem por um botão da HUD.
// ---------------------------------------------------------------------------

/**
 * Traz uma janela para a frente das outras.
 *
 * 🔴 **Por `z-index`, e NUNCA reanexando o elemento.** A primeira versão fazia
 * `appendChild` no `pointerdown`, e isso quebrou o botão de fechar: mover um nó
 * no DOM entre o `pointerdown` e o `click` cancela o clique, porque o navegador
 * exige que os dois caiam na mesma cadeia de elementos. O sintoma era o ✕ não
 * responder — e só na janela que acabara de receber o clique, que é a que tinha
 * sido movida.
 */
let zDaJanela = 10;
function janelaAoFrente(j: HTMLElement): void {
  j.style.zIndex = String((zDaJanela += 1));
}

/** Abre/fecha uma janela pelo id. */
function alternaJanela(id: string): () => void {
  return () => {
    const j = document.getElementById(id);
    if (!j) return;
    j.classList.toggle('aberta');
    // ⚠️ Sem isto, duas abertas ficariam na ordem do HTML para sempre, e a de
    // trás só voltaria ao topo fechando a da frente.
    if (j.classList.contains('aberta')) janelaAoFrente(j);
  };
}

/**
 * Liga o comportamento das janelas: fechar, arrastar e lembrar onde ficaram.
 *
 * ⚠️ A posição é guardada no `localStorage` como a da barra de magias, e pela
 * mesma razão: onde o jogador põe uma janela é preferência de interface, não
 * estado de jogo. Com a mesma consequência — trocar de máquina devolve tudo ao
 * lugar de fábrica.
 */
function ligaJanelas(): void {
  for (const j of document.querySelectorAll<HTMLElement>('.janela')) {
    /*
     * 🔴 **As quatro janelas ganharam a ALÇA de redimensionar** (10/09), pelo
     * pedido de "todos os menus". O arrasto delas continua sendo o daqui, que
     * já existia e já funcionava — `ligaMovelRedimensionavel` entra só pelo
     * tamanho, com o pegador apontado para a barra de título de sempre.
     *
     * ⚠️ **`mover: false` não é detalhe.** Dois ouvintes de arrasto na mesma
     * barra fariam a janela andar o DOBRO do mouse — e `stopPropagation` não
     * resolveria, porque ele não cala um irmão registrado no mesmo elemento.
     * A posição continua na chave antiga (`elysia.janela.<id>`), preservando o
     * que os jogadores já arrumaram; só o tamanho é novo.
     */
    ligaMovelRedimensionavel(j, { chave: j.id, minW: 220, minH: 140, mover: false });
    const chave = `elysia.janela.${j.id}`;
    try {
      const salvo = JSON.parse(localStorage.getItem(chave) ?? 'null') as { x: number; y: number } | null;
      if (salvo && Number.isFinite(salvo.x) && Number.isFinite(salvo.y)) {
        j.style.left = `${salvo.x}px`;
        j.style.top = `${salvo.y}px`;
      }
    } catch { /* armazenamento bloqueado: fica onde o HTML pôs */ }

    j.querySelector('.jfechar')?.addEventListener('click', () => j.classList.remove('aberta'));

    /*
     * ⚠️ Clicar em qualquer lugar da janela a traz para a frente — não só a
     * barra de título. É o que se espera de janela, e sai de graça aqui.
     */
    j.addEventListener('pointerdown', () => janelaAoFrente(j));

    const topo = j.querySelector<HTMLElement>('.jtopo');
    topo?.addEventListener('pointerdown', (ev) => {
      // Só o botão esquerdo, e nunca começando pelo botão de fechar.
      if (ev.button !== 0 || (ev.target as HTMLElement).closest('.jfechar')) return;
      ev.preventDefault();
      const caixa = j.getBoundingClientRect();
      const pai = j.parentElement!.getBoundingClientRect();
      const dx = ev.clientX - caixa.left;
      const dy = ev.clientY - caixa.top;
      const mover = (e: PointerEvent): void => {
        /*
         * ⚠️ Preso à área do mundo: uma janela arrastada para fora não teria
         * como voltar, porque a barra de título é o único pegador dela.
         */
        const x = Math.min(Math.max(0, e.clientX - pai.left - dx), pai.width - caixa.width);
        const y = Math.min(Math.max(0, e.clientY - pai.top - dy), pai.height - caixa.height);
        j.style.left = `${Math.round(x)}px`;
        j.style.top = `${Math.round(y)}px`;
      };
      const soltar = (): void => {
        window.removeEventListener('pointermove', mover);
        window.removeEventListener('pointerup', soltar);
        try {
          localStorage.setItem(chave, JSON.stringify({
            x: parseInt(j.style.left, 10), y: parseInt(j.style.top, 10),
          }));
        } catch { /* idem */ }
      };
      window.addEventListener('pointermove', mover);
      window.addEventListener('pointerup', soltar);
    });
  }
}

/**
 * 🔴 **MOVER E REDIMENSIONAR QUALQUER PAINEL DA HUD** — pedido do dono
 * (2026-09-10): *"Os menus de dentro do game, como, mapa que fica na parte de
 * cima, devem ser todos redimensionáveis (consigo aumentar e diminuir o tamanho
 * deles no game) e também devo conseguir reposicionar eles na tela. (igual é
 * com os menus onde ficam os atalhos de magias)."*
 *
 * ✅ **UMA função para os seis painéis, e não seis cópias.** Antes havia dois
 * sistemas de arrastar quase iguais e nenhum de redimensionar: `ligaJanelas`
 * (as quatro janelas, arrasta pela barra de título) e o pegador da barra de
 * magias (`#spellgrip`). Este generaliza os dois e acrescenta o tamanho.
 *
 * ⚠️ **O tamanho é gravado como CSS `width`/`height` no elemento**, o que
 * significa que ele passa a vencer o que a folha de estilo diz. É o
 * comportamento pretendido — o jogador mandou —, mas quer dizer que mudanças
 * futuras no CSS de tamanho não alcançam quem já redimensionou. O reset está no
 * duplo-clique da alça.
 *
 * 🔴 **`escala` existe porque nem todo painel é elástico.** O minimapa desenha
 * num `<canvas>` de tamanho fixo: esticar a caixa deixaria o mapa do mesmo
 * tamanho num quadro maior. Quem passa um `escala` recebe o fator de zoom e
 * decide o que fazer com ele — no minimapa, um `transform: scale`.
 *
 * @param elemento O painel.
 * @param opcoes.chave Sufixo do `localStorage`. Sem ele nada é lembrado.
 * @param opcoes.pegador Seletor do que arrasta. Ausente = cria uma faixa no topo.
 * @param opcoes.minW,minH Tamanho mínimo, para não sumir de vez.
 * @param opcoes.escala Chamado com o fator de tamanho a cada mudança.
 */
function ligaMovelRedimensionavel(
  elemento: HTMLElement,
  opcoes: {
    chave: string;
    pegador?: string;
    minW?: number;
    minH?: number;
    escala?: (fator: number) => void;
    /**
     * 🔴 `false` liga SÓ o redimensionar.
     *
     * É o caso das quatro `.janela`, que já tinham arrasto próprio em
     * `ligaJanelas` — com posição salva numa chave antiga que os jogadores já
     * têm. Ligar o daqui por cima poria DOIS ouvintes na mesma barra de título
     * (e `stopPropagation` não cala o irmão registrado no mesmo elemento: isso
     * é `stopImmediatePropagation`), então a janela andaria o dobro do mouse.
     */
    mover?: boolean;
  },
): void {
  const { chave, minW = 120, minH = 80, mover: podeMover = true } = opcoes;
  const armazem = `elysia.painel.${chave}`;
  elemento.classList.add('movivel');

  // O tamanho de fábrica, lido ANTES de qualquer restauração — é para ele que
  // o duplo-clique na alça volta, e é a base do fator de escala.
  const base = elemento.getBoundingClientRect();
  const baseW = base.width || minW;
  const baseH = base.height || minH;

  const aplicaEscala = (): void => {
    if (!opcoes.escala) return;
    const w = elemento.offsetWidth || baseW;
    opcoes.escala(w / baseW);
  };

  /*
   * ⚠️ **Prende na tela, mas pelo canto de cima-esquerda.** Prender a caixa
   * inteira impediria de encostar um painel grande na borda direita; prender só
   * a origem garante que sempre sobra pegador visível para trazer de volta.
   */
  const poe = (x: number, y: number): void => {
    const w = elemento.offsetWidth || baseW;
    const h = elemento.offsetHeight || baseH;
    /*
     * 🔴 **`left`/`top` são medidos a partir do PAI POSICIONADO, e o ponteiro
     * a partir da JANELA.** Os dois só coincidem quando o pai começa em (0,0), e
     * nenhum destes painéis está nessa situação: o minimapa e o painel do
     * personagem são filhos do `#viewport`. Sem descontar a origem do pai, o
     * painel salta para longe da mão no primeiro pixel de arrasto.
     */
    const pai = (elemento.offsetParent as HTMLElement | null)?.getBoundingClientRect();
    const ox = pai?.left ?? 0;
    const oy = pai?.top ?? 0;
    const larguraPai = pai?.width ?? window.innerWidth;
    const alturaPai = pai?.height ?? window.innerHeight;
    elemento.style.left = `${Math.round(Math.max(0, Math.min(larguraPai - Math.min(w, 80), x - ox)))}px`;
    elemento.style.top = `${Math.round(Math.max(0, Math.min(alturaPai - Math.min(h, 40), y - oy)))}px`;
    // 🔴 Zerar as âncoras opostas é obrigatório: o minimapa nasce ancorado à
    // direita e o painel do personagem à esquerda. Com `right` e `left` ao
    // mesmo tempo o elemento ESTICA em vez de andar.
    elemento.style.right = 'auto';
    elemento.style.bottom = 'auto';
    elemento.style.transform = 'none';
  };

  const grava = (): void => {
    try {
      localStorage.setItem(armazem, JSON.stringify({
        x: parseInt(elemento.style.left, 10) || 0,
        y: parseInt(elemento.style.top, 10) || 0,
        w: elemento.offsetWidth,
        h: elemento.offsetHeight,
      }));
    } catch { /* armazenamento bloqueado: vale só nesta sessão */ }
  };

  try {
    const salvo = JSON.parse(localStorage.getItem(armazem) ?? 'null') as
      { x: number; y: number; w: number; h: number } | null;
    if (salvo && Number.isFinite(salvo.w) && Number.isFinite(salvo.h)) {
      elemento.style.width = `${salvo.w}px`;
      elemento.style.height = `${salvo.h}px`;
      // ⚠️ Quem não move por aqui também não restaura posição por aqui: a das
      // janelas vive na chave antiga, e escrever as duas brigaria por ela.
      if (podeMover) poe(salvo.x, salvo.y);
      aplicaEscala();
    }
  } catch { /* preferência corrompida: fica onde o CSS pôs */ }

  /** Pegador de mover: o que foi pedido, ou uma faixa criada no topo. */
  let pegador: HTMLElement | null = null;
  if (podeMover) {
    pegador = opcoes.pegador ? elemento.querySelector<HTMLElement>(opcoes.pegador) : null;
    if (!pegador) {
      pegador = document.createElement('div');
      pegador.className = 'jmover';
      pegador.title = 'Arraste para mover · duplo-clique volta ao lugar';
      elemento.appendChild(pegador);
    }
  }

  const alca = document.createElement('div');
  alca.className = 'jresize';
  alca.title = 'Arraste para redimensionar · duplo-clique volta ao tamanho normal';
  elemento.appendChild(alca);

  /*
   * ⚠️ **`setPointerCapture` e não ouvintes no `window`.** Os dois funcionam,
   * mas com captura o arrasto sobrevive ao ponteiro passar por cima do canvas
   * do Pixi — que come eventos para andar e para mirar magia. Foi o que fazia o
   * painel "escapar" da mão no meio do movimento.
   */
  const arrasta = (
    disparador: HTMLElement,
    aoMover: (dx: number, dy: number) => void,
  ): void => {
    disparador.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      /*
       * 🔴 **Barra de título costuma ter BOTÃO dentro**, e o arrasto não pode
       * engoli-lo: o `#chtopo` traz o ✕ de recolher o painel e o `h3` do painel
       * de habilidades traz o de fechar. Com `preventDefault` no `pointerdown`
       * o clique deles nunca chegava a acontecer — o botão ficava morto e a
       * única pista era o painel não fechar mais.
       */
      if ((ev.target as HTMLElement).closest('button, input, select, a')) return;
      ev.preventDefault();
      ev.stopPropagation();
      const x0 = ev.clientX;
      const y0 = ev.clientY;
      disparador.setPointerCapture(ev.pointerId);
      elemento.classList.add('mexendo');
      const mover = (e: PointerEvent): void => aoMover(e.clientX - x0, e.clientY - y0);
      const soltar = (): void => {
        disparador.removeEventListener('pointermove', mover);
        disparador.removeEventListener('pointerup', soltar);
        disparador.removeEventListener('pointercancel', soltar);
        elemento.classList.remove('mexendo');
        grava();
      };
      disparador.addEventListener('pointermove', mover);
      disparador.addEventListener('pointerup', soltar);
      disparador.addEventListener('pointercancel', soltar);
    });
  };

  const caixaAoPegar = { x: 0, y: 0, w: 0, h: 0 };
  const lembra = (): void => {
    const r = elemento.getBoundingClientRect();
    caixaAoPegar.x = r.left; caixaAoPegar.y = r.top;
    caixaAoPegar.w = r.width; caixaAoPegar.h = r.height;
  };

  if (pegador) {
    pegador.addEventListener('pointerdown', lembra);
    arrasta(pegador, (dx, dy) => poe(caixaAoPegar.x + dx, caixaAoPegar.y + dy));
  }

  alca.addEventListener('pointerdown', lembra);
  arrasta(alca, (dx, dy) => {
    /*
     * 🔴 **A PROPORÇÃO É TRAVADA quando há `escala`.** O minimapa é quadrado e
     * o canvas dentro dele também; deixar esticar só a largura daria um mapa
     * oval. Quem não usa `escala` (as janelas) redimensiona nos dois eixos à
     * vontade, porque ali o conteúdo é texto e reflui.
     */
    if (opcoes.escala) {
      const lado = Math.max(minW, caixaAoPegar.w + Math.max(dx, dy));
      elemento.style.width = `${Math.round(lado)}px`;
      elemento.style.height = `${Math.round(lado * (caixaAoPegar.h / caixaAoPegar.w))}px`;
    } else {
      elemento.style.width = `${Math.round(Math.max(minW, caixaAoPegar.w + dx))}px`;
      elemento.style.height = `${Math.round(Math.max(minH, caixaAoPegar.h + dy))}px`;
    }
    aplicaEscala();
  });

  // Duplo-clique em qualquer um dos dois pegadores devolve o painel de fábrica.
  // ⚠️ É a única saída para quem encolheu um painel a ponto de não achar mais a
  // alça, e para quem o arrastou para um canto e trocou de resolução.
  const restaura = (): void => {
    elemento.style.width = '';
    elemento.style.height = '';
    elemento.style.left = '';
    elemento.style.top = '';
    elemento.style.right = '';
    elemento.style.bottom = '';
    elemento.style.transform = '';
    try { localStorage.removeItem(armazem); } catch { /* idem */ }
    aplicaEscala();
  };
  alca.addEventListener('dblclick', restaura);
  pegador?.addEventListener('dblclick', restaura);
}

/**
 * Liga os quatro estados de um botão de arte.
 *
 * ⚠️ **Uma função, e não quatro `setProperty` espalhados.** Os nomes dos
 * arquivos são convenção do conversor (`x.png`, `x_hover.png`, `x_press.png`,
 * `x_off.png`); repetir essa convenção em cada botão é o jeito de um deles
 * sair escrito errado e ninguém notar até alguém passar o mouse.
 */
function poeIcone(botao: HTMLElement, arte: string): void {
  const u = (sufixo: string): string => `url('/assets/hud/icones/${arte}${sufixo}.png')`;
  botao.style.setProperty('--ico', u(''));
  botao.style.setProperty('--ico-hover', u('_hover'));
  botao.style.setProperty('--ico-press', u('_press'));
  botao.style.setProperty('--ico-off', u('_off'));
}

function aplicaEstadoDoPainel(expandida: boolean): void {
  const painel = el('charhud');
  painel.classList.toggle('recolhido', !expandida);
  painel.classList.toggle('expandido', expandida);
  /*
   * 🔴 **RECOLHER MANDA NA ALTURA, e o redimensionar não pode brigar com ele.**
   *
   * A altura deste painel é do CONTEÚDO: recolhido ele esconde XP, Job e os sete
   * atalhos, e encolhe. Se o jogador tiver arrastado a alça, sobra uma altura
   * fixa no elemento — e aí recolher deixaria o painel do mesmo tamanho, com um
   * vão vazio embaixo, que é exatamente o defeito que o redimensionar veio
   * consertar.
   *
   * ⚠️ **Só a altura é largada; a LARGURA sobrevive**, e é a que o jogador
   * costuma querer mexer. Ele perde a altura escolhida ao recolher e expandir —
   * é o preço de o botão continuar fazendo o que promete.
   */
  painel.style.height = '';
  const b = el('chtoggle');
  /*
   * ⚠️ Troca a ARTE, não o texto — escrever `textContent` aqui deixaria um
   * caractere solto no lugar do botão inteiro. E troca as QUATRO de uma vez:
   * recolher e expandir são desenhos diferentes, então os estados de hover e
   * press também têm de trocar junto, senão o botão mostra um "−" parado e um
   * "+" ao passar o mouse.
   */
  poeIcone(b, expandida ? 'recolher' : 'expandir');
  const nome = expandida ? 'Recolher o painel' : 'Expandir o painel';
  b.title = nome;
  b.setAttribute('aria-label', nome);
}

function ligaPainelDoPersonagem(): void {
  let expandida = true;
  try {
    expandida = localStorage.getItem(CHAVE_HUD_ABERTA) !== '0';
  } catch { /* armazenamento bloqueado: começa expandida */ }
  aplicaEstadoDoPainel(expandida);
  ligaJanelas();

  /*
   * 🔴 **OS PAINÉIS DA HUD GANHARAM MOVER E REDIMENSIONAR** (10/09). Ver
   * `ligaMovelRedimensionavel`.
   *
   * ⚠️ **O minimapa precisa de `escala`, e os outros não.** O mapa é desenhado
   * num `<canvas>` de 130×130 fixos: esticar a caixa daria um quadro maior com
   * o mesmo mapinha no meio. O `transform: scale` no canvas é o que faz o
   * conteúdo crescer junto, e `transform-origin` no canto de cima-esquerda o
   * mantém colado onde a moldura o espera.
   *
   * ⚠️ **O canvas NÃO é redimensionado de verdade** (mexer em `width`/`height`
   * limparia o desenho a cada quadro de arrasto, e o minimapa é repintado pelo
   * laço do jogo). `scale` é aproximação de pixel, o que num minimapa de pixel
   * art é exatamente o que se quer.
   */
  const mapaCanvas = document.getElementById('minimap') as HTMLCanvasElement | null;
  const minimapaEl = document.getElementById('minimapa');
  if (minimapaEl) {
    ligaMovelRedimensionavel(minimapaEl, {
      chave: 'minimapa',
      pegador: '#mmtopo',
      minW: 120,
      minH: 120,
      escala: (f) => {
        if (!mapaCanvas) return;
        mapaCanvas.style.transformOrigin = 'top left';
        mapaCanvas.style.transform = `scale(${f})`;
      },
    });
  }

  // O painel do personagem arrasta pela própria barra de nome e nível.
  const charhudEl = document.getElementById('charhud');
  if (charhudEl) {
    ligaMovelRedimensionavel(charhudEl, { chave: 'charhud', pegador: '#chtopo', minW: 200, minH: 90 });
  }

  // O painel de habilidades já tinha barra de título com o ✕; reusa como pegador.
  const skillEl = document.getElementById('skillpanel');
  if (skillEl) ligaMovelRedimensionavel(skillEl, { chave: 'skillpanel', pegador: 'h3', minW: 240, minH: 200 });
  el('chtoggle').addEventListener('click', () => {
    expandida = !expandida;
    aplicaEstadoDoPainel(expandida);
    try {
      localStorage.setItem(CHAVE_HUD_ABERTA, expandida ? '1' : '0');
    } catch { /* idem */ }
  });

  /**
   * Os sete atalhos.
   *
   * 🔴 **Nenhum botão é enfeite.** Os que têm painel abrem o painel de verdade;
   * os que ainda não têm sistema (Quests, Conquistas, Correio) chamam uma função
   * nomeada que avisa no chat e fica pronta para receber a tela quando ela
   * existir. Botão que aceita o clique e não faz nada é pior que botão ausente:
   * o jogador clica de novo achando que errou a mira.
   *
   * ⚠️ Os que faltam ficam marcados com um ponto no canto (`futuro`), para a
   * diferença ser visível antes do clique.
   */
  const alterna = (id: string, modo: 'block' | 'flex' = 'block') => () => {
    const alvo = document.getElementById(id);
    if (!alvo) return;
    alvo.style.display = alvo.style.display === modo ? 'none' : modo;
    // ⚠️ Rola até o alvo se ele estiver fora da vista. Sobrou dos tempos das
    // colunas laterais, onde uma lista longa empurrava painel para fora da
    // tela; hoje só o painel de habilidades passa por aqui, e nele não custa.
    if (alvo.style.display === modo) alvo.scrollIntoView({ block: 'nearest' });
  };
  const porVir = (nome: string) => () => {
    logChat(`<b>${nome}</b> ainda não existe no jogo — o botão já está ligado e ` +
      'espera o sistema.', 'sys');
  };

  /*
   * 🔴 **Os ícones saíram do EMOJI e viraram arte** (08/09). Recortados das
   * folhas do dono por `tools/hud/icones2png.mjs`, que mede a fileira em vez de
   * cortar por célula fixa — as folhas são desenho gerado, não grade.
   *
   * ⚠️ O emoji ficava com a cara do SISTEMA OPERACIONAL: 🎒 no Windows não é o
   * mesmo desenho que no macOS, e nenhum dos dois combina com moldura dourada.
   */
  const ATALHOS: Array<{
    arte: string; nome: string; abre: () => void; futuro?: boolean; marca?: string;
  }> = [
    { arte: 'inventario', nome: 'Inventário', abre: alternaJanela('jan-inventario') },
    { arte: 'skills', nome: 'Habilidades (K)', abre: alterna('skillpanel', 'flex') },
    { arte: 'amigos', nome: 'Amigos', abre: alternaJanela('jan-amigos') },
    { arte: 'quests', nome: 'Missões', abre: porVir('O diário de missões'), futuro: true },
    { arte: 'conquistas', nome: 'Conquistas', abre: porVir('A janela de conquistas'), futuro: true },
    // ⚠️ `marca: 'ficha'` é como o repintor da carinha acha este botão depois
    // do login — ver o bloco em `startGame`. A arte `config` fica de reserva:
    // é o que aparece se a classe não tiver pack HD.
    { arte: 'config', nome: 'Personagem (C)', abre: alternaJanela('jan-personagem'), marca: 'ficha' },
    { arte: 'correio', nome: 'Correio', abre: porVir('O correio'), futuro: true },
  ];

  const caixa = el('chbtns');
  caixa.textContent = '';
  for (const a of ATALHOS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = a.nome;
    b.setAttribute('aria-label', a.nome);
    b.className = (a.futuro ? 'btnico futuro' : 'btnico') + (a.marca ? ' ' + a.marca : '');
    poeIcone(b, a.arte);
    b.addEventListener('click', a.abre);
    caixa.appendChild(b);
  }
}

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

/**
 * ---- O FUNDO DA TELA DE ENTRADA: VÍDEO E MÚSICA (02/09) -------------------
 *
 * 🔴 **Três coisas que o navegador impõe, e que este bloco existe para tratar:**
 *
 * 1. **`autoplay` não pega em elemento escondido.** A tela nasce
 *    `display: none`, então o vídeo carrega pausado. Quem manda tocar é o
 *    `showScreen`, quando a tela aparece de verdade.
 * 2. **Mídia com som NUNCA toca sozinha.** O vídeo é mudo — a única forma de
 *    autoplay permitida — e a música só entra num gesto do jogador, que é o que
 *    a política de mídia exige.
 * 3. **`play()` devolve uma promessa que pode rejeitar** (aba em segundo plano,
 *    mídia bloqueada por política). Sem o `.catch` isso vira erro não tratado no
 *    console — e nesta tela, um erro solto é exatamente o que produzia a página
 *    preta e muda que o irmão do dono caçou hoje.
 *
 * ---- A EMENDA DO LAÇO (02/09, noite) --------------------------------------
 *
 * 🔴 **As duas emendas são problemas DIFERENTES, e só uma se resolve em código.**
 *
 * - **Imagem — resolvida no ARQUIVO, não aqui.** O clipe era um empurrão de
 *   câmera de 5,17 s, e em laço ele pulava do enquadramento fechado de volta
 *   para o aberto. Dissolvência não salvava: cruzar um quadro aberto com um
 *   fechado sobrepõe duas escalas da mesma imagem e dá fantasma. O vídeo foi
 *   refeito em vai-e-volta (fecha e abre), então a emenda sumiu do arquivo e o
 *   `loop` nativo basta. **Foi por isso que a dissolvência de vídeo saiu daqui.**
 * - **Som — resolvido aqui, com dois elementos.** Num elemento só, o laço dava
 *   um talho; com a rampa descendo a zero, virou um buraco de silêncio. Agora o
 *   segundo entra do zero enquanto o primeiro toca a última ponta, e o som nunca
 *   cai para o silêncio (ver `cruzaMusica`).
 *
 * ⚠️ **E o que curou a música de verdade não foi nenhum dos dois: foi a FAIXA.**
 * Enquanto ela eram os 5,09 s da trilha do vídeo, nenhuma costura escondia a
 * repetição — o defeito era o material. Com "The Old Forest", de 10 minutos, a
 * travessia virou o que devia ser desde o começo: uma emenda que quase ninguém
 * vai chegar a ouvir.
 *
 * ---- O MERGE DE 03/09, e por que o botão continua vivo -------------------
 *
 * 🔴 **Este bloco quase foi apagado, e o motivo era um mal-entendido.** Na
 * mesma noite, o irmão do dono atacou o mesmo defeito por outro caminho: ele
 * refez o vídeo em vai-e-volta em 4K (55,8 MB — o arquivo que está no repo
 * agora) e tirou a faixa de áudio dele com `ffmpeg -an`. Como no lado dele o
 * som VINHA do vídeo, o alto-falante passou a ligar o som de um vídeo mudo, e
 * ele o removeu — corretamente, para o código que ele tinha à mão.
 *
 * ⚠️ **Só que ele não tinha este arquivo.** No comentário em que apagou o
 * botão, ele escreveu que, se a música voltasse, "o certo é um `<audio>`
 * próprio, separado do vídeo de fundo" — que é exatamente o que já existia
 * aqui. Então o merge ficou com as duas metades: o VÍDEO é dele, a MÚSICA é
 * desta seção, e o acoplamento que derrubou o botão dele nunca existiu aqui.
 *
 * 🔴 **Consequência prática: trocar o vídeo não encosta na trilha.** O arquivo
 * de fundo pode ser trocado, encolhido para 1080p ou substituído inteiro sem
 * que uma linha daqui mude. Se um dia a música precisar sumir, ela sai por
 * este bloco — nunca reencodando o vídeo.
 */
/** Onde fica gravado se o jogador quer a música. Padrão: NÃO. */
const CHAVE_SOM = 'elysia_login_som';
/** Onde fica gravado o volume da música, de 0 a 1. */
const CHAVE_VOL = 'elysia_login_vol';
/**
 * ⚠️ **Bem baixo de propósito**, a pedido do dono. Isto é fundo de tela de
 * entrada, não é a atração — quem quiser mais sobe no controle ao lado do
 * alto-falante.
 */
const VOLUME_PADRAO = 0.1;
/**
 * Teto da travessia entre as duas voltas da música, em segundos.
 *
 * ⚠️ **Travessia CUSTA duração de laço.** A volta começa `trav` segundos antes
 * do fim, então a música se repete a cada `duração − trav`. Com "The Old Forest"
 * isso é irrelevante — 0,9 s em 600 — mas foi o que ditou este número quando a
 * trilha aqui tinha cinco segundos, e continua ditando o corte em `duração / 4`:
 * numa faixa curtíssima a travessia comeria o laço inteiro.
 */
const FADE_MUSICA_S = 0.9;
/**
 * Onde a música é procurada, **na ordem**. A primeira que o navegador conseguir
 * carregar ganha.
 *
 * ✅ **`login-music.mp3` é "The Old Forest"**, que o dono trouxe em 02/09 —
 * 10 minutos, e é ela que toca. Para trocar a música, é só trocar esse arquivo.
 *
 * ⚠️ O `.m4a` é a reserva: são os 5,09 s arrancados da trilha do vídeo, de
 * quando não havia faixa nenhuma. Ele só entra se o `.mp3` sumir ou vier
 * corrompido — e aí a tela toca cinco segundos em laço em vez de ficar muda.
 *
 * 🔴 A trilha do vídeo virou arquivo próprio para a música **não arrastar o
 * vídeo junto**: antes o `<audio>` apontava para o `login-bg.mp4` e baixava
 * megabytes de imagem para tocar cinco segundos de som.
 *
 * ⚠️ Se um dia o `.mp3` faltar, o console mostra **um erro de mídia** — é a
 * tentativa que falha e cai para o `.m4a`. Em desenvolvimento ele não vira 404:
 * o Vite responde **200 com o `index.html`** a qualquer caminho que não exista,
 * e quem recusa é o `<audio>`, por formato. É por isso que a queda tem de ser
 * guiada pelo evento `error` do elemento, e não por olhar o status da resposta.
 */
const TRILHAS = ['/assets/ui/login-music.mp3', '/assets/ui/login-music.m4a'];
/**
 * Quanto antes da volta o segundo elemento começa a encher o buffer.
 *
 * 🔴 Ele nasce em `preload="none"` para não baixar a faixa inteira uma segunda
 * vez (ver o HTML). O preço disso é que, na hora da travessia, ele estaria com
 * zero byte carregado e entraria em silêncio — que é justamente o buraco que a
 * travessia existe para tapar. Vinte segundos é folga de sobra para encher.
 */
const APRONTA_ANTES_S = 20;

/** Volume que o jogador escolheu. A travessia multiplica ESTE valor. */
let volumeAtual = VOLUME_PADRAO;
/** Qual dos dois elementos de música está tocando a volta atual. */
let musNoAr = 0;
/**
 * O que o jogador PEDIU, que não é o mesmo que o que está tocando.
 *
 * 🔴 A trilha é escolhida por tentativa e erro (ver `escolheTrilha`), e a queda
 * do `.mp3` para o `.m4a` pode cair DEPOIS do clique — o arquivo só é buscado de
 * verdade quando a aba está à vista, então numa aba aberta em segundo plano a
 * primeira tentativa falha justamente na hora em que o jogador pediu música. O
 * `load()` da troca deixa o elemento parado, e sem esta lembrança o clique dele
 * simplesmente se perdia.
 */
let musicaPedida = false;
/** O `requestAnimationFrame` que costura a volta da música. 0 = parado. */
let vigiaFundo = 0;

function querSom(): boolean {
  try {
    return localStorage.getItem(CHAVE_SOM) === '1';
  } catch {
    // Aba anônima ou armazenamento bloqueado: cai no padrão, que é silêncio.
    return false;
  }
}

function volumeSalvo(): number {
  try {
    const bruto = localStorage.getItem(CHAVE_VOL);
    // 🔴 O teste do nulo vem ANTES da conversão: `Number(null)` é 0, e 0 é um
    // volume válido. Sem esta linha, quem nunca mexeu no controle entraria com
    // a música no mudo e acharia que o botão não funciona.
    if (bruto !== null) {
      const n = Number(bruto);
      if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
    }
  } catch { /* sem armazenamento: cai no padrão */ }
  return VOLUME_PADRAO;
}

function videoDoFundo(): HTMLVideoElement | null {
  return document.getElementById('loginvid') as HTMLVideoElement | null;
}

/**
 * Os DOIS elementos de música. São dois porque a volta é uma travessia: os dois
 * tocam junto durante ela, e é isso que impede o silêncio no meio.
 */
function musicasDoLogin(): [HTMLAudioElement, HTMLAudioElement] | null {
  const a = document.getElementById('loginmus') as HTMLAudioElement | null;
  const b = document.getElementById('loginmus2') as HTMLAudioElement | null;
  return a && b ? [a, b] : null;
}

function musicaTocando(): boolean {
  const ms = musicasDoLogin();
  return !!ms && ms.some((m) => !m.paused);
}

/**
 * A volta da música, e o volume dos dois lados dela a cada quadro.
 *
 * 🔴 **Nenhum dos dois elementos tem `loop`.** Com `loop`, a volta é instantânea
 * e não há como sobrepor o fim ao começo — o melhor que se consegue é descer o
 * volume até zero e subir de novo, e esse mergulho no silêncio é justamente o
 * "corte" que o dono continuava ouvindo. Quem reinicia é este bloco: o segundo
 * elemento começa do zero ENQUANTO o primeiro ainda toca a última ponta.
 *
 * ⚠️ Rodar isto num `timeupdate` não serviria: aquele evento sai a cada ~250 ms,
 * e um degrau de 250 ms no volume é um clique audível. Por isso é `rAF`.
 */
function cruzaMusica(): void {
  const ms = musicasDoLogin();
  if (!ms) return;
  const noAr = ms[musNoAr]!;
  const outro = ms[1 - musNoAr]!;
  const d = noAr.duration;
  // Enquanto os metadados não chegam, `duration` é NaN.
  if (noAr.paused || !Number.isFinite(d) || d <= 0) return;
  const trav = Math.min(FADE_MUSICA_S, d / 4);

  // Acorda o segundo com folga: ele dorme sem byte nenhum. Ver APRONTA_ANTES_S.
  if (outro.paused && noAr.currentTime >= d - trav - APRONTA_ANTES_S) {
    aprontaOutraMusica(outro, noAr);
  }

  // A troca. `outro.paused` é a trava: durante a travessia ele está tocando, e
  // sem ela a volta seria disparada de novo a cada quadro.
  if (outro.paused && noAr.currentTime >= d - trav) {
    outro.currentTime = 0;
    outro.volume = 0;
    outro.play().catch(() => {});
    musNoAr = 1 - musNoAr;
  }

  for (const m of ms) {
    if (m.paused) continue;
    const dm = m.duration;
    if (!Number.isFinite(dm) || dm <= 0) continue;
    const t = m.currentTime;
    const rampa = Math.min(1, t / trav, Math.max(0, (dm - t) / trav));
    // 🔴 Raiz, e não a rampa crua. Duas metades de música que se cruzam não são
    // o mesmo som: elas somam em POTÊNCIA, não em amplitude. Com a rampa direta
    // o meio da travessia afunda uns 3 dB — um vinco de volume bem no ponto que
    // este código existe para disfarçar.
    m.volume = Math.max(0, Math.min(1, volumeAtual * Math.sqrt(rampa)));
  }
  // Quem chegou ao fim se pausa sozinho (nenhum tem `loop`), e volta a ser o
  // "outro" livre para a próxima travessia.
}

/**
 * Deixa o segundo elemento pronto para a travessia, copiando a trilha que o
 * primeiro JÁ resolveu.
 *
 * 🔴 Copiar o `currentSrc` do que está tocando, em vez de repetir a busca da
 * `TRILHAS`, evita dois problemas de uma vez: o segundo não faz de novo o
 * pedido que falha, e não há como os dois acabarem em arquivos diferentes se um
 * dia a lista mudar debaixo deles.
 */
function aprontaOutraMusica(outro: HTMLAudioElement, noAr: HTMLAudioElement): void {
  if (outro.src === noAr.currentSrc && outro.readyState > 0) return;
  outro.src = noAr.currentSrc;
  outro.load();
}

function vigia(): void {
  vigiaFundo = requestAnimationFrame(vigia);
  cruzaMusica();
}

/**
 * Põe o `src` da música, tentando os arquivos de `TRILHAS` na ordem.
 *
 * 🔴 Isto NÃO dá para deixar a cargo de vários `<source>`: o navegador escolhe
 * por tipo suportado, não por arquivo existente. Ele ficaria no primeiro `.mp3`
 * mesmo com a resposta errada, e a música simplesmente não tocaria.
 */
function escolheTrilha(m: HTMLAudioElement): void {
  let i = 0;
  const tenta = (): void => {
    if (i >= TRILHAS.length) return; // sem trilha: a tela segue, só que muda.
    m.src = TRILHAS[i]!;
    i += 1;
    m.load();
    // Retoma o pedido que a troca de arquivo engoliu. Ver `musicaPedida`.
    // ⚠️ O `musNoAr` vai junto: quem resolve a trilha é sempre o elemento 0, e
    // sem isto a travessia poderia considerar no ar o que não está tocando.
    if (musicaPedida && !musicaTocando()) {
      musNoAr = 0;
      m.currentTime = 0;
      m.volume = 0;
      m.play().then(atualizaBotaoSom).catch(() => {});
    }
  };
  m.addEventListener('error', tenta);
  tenta();
}

/** O canto do som: o alto-falante que liga a música e o volume ao lado dele. */
function ligaControlesDeSom(): void {
  const caixa = document.getElementById('loginaudio');
  const b = document.getElementById('loginsom');
  const vol = document.getElementById('loginvol') as HTMLInputElement | null;
  const ms = musicasDoLogin();
  if (!caixa || !b || !vol || !ms) return;

  volumeAtual = volumeSalvo();
  vol.value = String(Math.round(volumeAtual * 100));
  // 🔴 Só o PRIMEIRO procura a trilha. O segundo dorme em `preload="none"`, e
  // ali um `error` nunca chegaria a disparar — a busca por tentativa e erro
  // simplesmente não funciona nele. Ele copia do primeiro, já resolvido, quando
  // for acordado (ver `aprontaOutraMusica`).
  escolheTrilha(ms[0]);

  // ⚠️ `input`, e não `change`: o volume tem de acompanhar o arrasto. Só ouvir
  // o resultado depois de soltar é regular às cegas.
  vol.oninput = () => {
    volumeAtual = Number(vol.value) / 100;
    // Vale já; no próximo quadro a travessia reassume por cima deste valor.
    for (const m of ms) if (!m.paused) m.volume = volumeAtual;
    try {
      localStorage.setItem(CHAVE_VOL, String(volumeAtual));
    } catch { /* sem armazenamento: vale só nesta sessão */ }
  };

  b.onclick = () => {
    musicaPedida = !musicaPedida;
    if (musicaPedida) {
      const m = ms[musNoAr]!;
      m.currentTime = 0;
      m.volume = 0; // 🔴 entra pela rampa, nunca de supetão
      m.play().catch(() => {
        // Recusado pelo navegador: o pedido tem de cair junto, senão o botão
        // fica dizendo 🔊 sobre um silêncio.
        musicaPedida = false;
        atualizaBotaoSom();
      });
      if (!vigiaFundo) vigiaFundo = requestAnimationFrame(vigia);
    } else {
      for (const m of ms) m.pause();
    }
    try {
      localStorage.setItem(CHAVE_SOM, musicaPedida ? '1' : '0');
    } catch { /* sem armazenamento: a escolha vale só nesta sessão */ }
    atualizaBotaoSom();
  };

  // ⚠️ A preferência gravada muda só o RÓTULO, não liga o som: sem um gesto
  // nesta página, `play()` com áudio seria recusado pelo navegador.
  if (querSom()) b.title = 'Ligar a música (clique — o navegador exige)';
  atualizaBotaoSom();
}

function atualizaBotaoSom(): void {
  const caixa = document.getElementById('loginaudio');
  const b = document.getElementById('loginsom');
  if (!caixa || !b) return;
  // ⚠️ O rótulo segue o PEDIDO, não o `paused` do elemento. Entre o clique e o
  // som existe uma janela (carregar o arquivo, cair para a trilha reserva) em
  // que nada toca e o jogador já pediu — ali o 🔇 seria mentira, e ele clicaria
  // de novo, desligando o que estava prestes a começar.
  const tocando = musicaPedida;
  b.textContent = tocando ? '🔊' : '🔇';
  // É esta classe que abre o controle de volume: desligada, ele não teria o que
  // controlar, e mais um controle morto no canto só polui.
  caixa.classList.toggle('tocando', tocando);
  if (!querSom() || tocando) {
    b.title = tocando ? 'Desligar a música' : 'Ligar a música';
  }
}

function tocaFundoDoLogin(): void {
  const v = videoDoFundo();
  if (!v) return;
  /*
   * 🎬 A camada `#loginbg` saiu de dentro do `#login` em 09/09 e virou o fundo
   * COMPARTILHADO das três telas de fora do jogo. Como ela nasce
   * `display: none`, é preciso acendê-la aqui.
   *
   * ⚠️ Ela é uma só de propósito: um `<video>` por tela disparava três
   * requisições do mesmo arquivo de 76 MB, e o navegador nem consegue cachear
   * um arquivo desse tamanho. Ver o comentário do `#loginbg` no HTML.
   */
  const camada = document.getElementById('loginbg');
  if (camada) camada.style.display = 'block';
  v.play().catch(() => {
    // Bloqueado por política de mídia: o poster fica, e a tela funciona.
  });
  if (!vigiaFundo && musicaTocando()) vigiaFundo = requestAnimationFrame(vigia);
}

/**
 * @param comMusica Também calar a música. A seleção de personagem ainda é
 *   antessala, e lá a música segue tocando — quem entra no MUNDO é que leva o
 *   silêncio.
 */
function paraFundoDoLogin(comMusica: boolean): void {
  const v = videoDoFundo();
  // ⚠️ Escondido, o vídeo continuaria decodificando quadro a quadro atrás do jogo.
  if (v) v.pause();
  // 🎬 E a camada compartilhada sai da frente: no mundo ela não tem o que fazer.
  const camada = document.getElementById('loginbg');
  if (camada) camada.style.display = 'none';
  if (comMusica) {
    musicaPedida = false;
    const ms = musicasDoLogin();
    if (ms) for (const m of ms) m.pause();
    atualizaBotaoSom();
  }
  // 🔴 O vigia só morre quando não sobrou nada para vigiar. Com a música ainda
  // tocando na seleção de personagem, é ele que faz a travessia da volta —
  // desligar aqui devolveria o corte a ela.
  if (vigiaFundo && !musicaTocando()) {
    cancelAnimationFrame(vigiaFundo);
    vigiaFundo = 0;
  }
}

function showScreen(which: keyof typeof screens | 'none'): void {
  for (const [nome, get] of Object.entries(screens)) {
    get().style.display = nome === which ? 'flex' : 'none';
  }
  /*
   * 🔴 **O vídeo de fundo toca nas TRÊS telas** desde 2026-09-09 (entrada,
   * seleção e criação) — antes era só na de entrada.
   *
   * ⚠️ A MÚSICA continua com a regra do irmão, e ela é diferente: só cala ao
   * entrar no MUNDO — a seleção ainda é antessala. Por isso
   * `paraFundoDoLogin` só é chamado no `none`, e com `true`.
   *
   * ⚠️ `autoplay` não pega em elemento escondido — é por isso que quem manda
   * tocar é aqui, e não o atributo.
   */
  if (which === 'none') paraFundoDoLogin(true);
  else tocaFundoDoLogin();
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
      // 🔑 Guarda o token ANTES de tratar o resultado: é ele que faz a próxima
      // troca de personagem cair na lista em vez da tela de senha.
      if (msg.ok && msg.token) guardaToken(msg.token);
      else if (!msg.ok) esqueceToken();
      onAuthResult(msg.ok, msg.message);
      return;
    case 'charlist':
      renderCharList(msg.characters, msg.error);
      return;
    case 'leaveok':
      // 🚪 O servidor liberou: agora sim recarrega e volta para a lista.
      aoLiberarSaida?.();
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
        // ⚠️ `.catch` e NÃO `.then`: o comentário acima continua valendo — o
        // `welcome` segue caindo na fila, não é entregue aqui. Isto só evita que
        // uma rejeição vire tela preta muda.
        startGame(
          escolhido?.name ?? 'Herói',
          escolhido?.charClass ?? 'knight',
          escolhido?.gender ?? 'male',
        ).catch((err: unknown) => mostraFalhaFatal('startGame', err));
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
/**
 * Conta que o cliente tenta logar sozinho. **Vazio = desligado**, e vazio é o
 * padrão.
 *
 * 🔴 **O `?? 'maxmurtesvieira'` que estava aqui era o bug.** Ele ligava o
 * auto-login em QUALQUER `npm run dev`, enquanto o servidor só aceita entrada
 * sem senha com `ELYSIA_DEV_ACCOUNT` preenchida — que ninguém preenche. As duas
 * metades discordavam, e a discordância produzia os dois defeitos que o dono
 * relatou em 02/09:
 *
 * 1. **"ao logar ele já vai direto pro último personagem"** — com este valor
 *    truthy, o bloco de auto-entrada em `renderCharList` disparava depois de
 *    QUALQUER login, inclusive o digitado à mão, e entrava no primeiro da lista.
 * 2. **"trocar personagem volta pra tela de login"** — a recarga disparava um
 *    `auth` automático com senha vazia, o servidor recusava (porque a metade
 *    dele estava desligada), e sobrava a tela de senha com "Usuário ou senha
 *    inválidos" antes de o jogador tocar em nada.
 *
 * ⚠️ Agora é **adesão explícita**: quem quiser o atalho põe `VITE_DEV_ACCOUNT`
 * no cliente E `ELYSIA_DEV_ACCOUNT` no servidor. Uma sem a outra não faz nada —
 * que é bem melhor que meia coisa funcionando.
 */
const DEV_AUTOLOGIN: string = import.meta.env.DEV
  ? (import.meta.env.VITE_DEV_ACCOUNT ?? '')
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

// ---------------------------------------------------------------------------
// 🔑 Token de sessão
//
// 🔴 **`sessionStorage`, não `localStorage`, e a diferença é a intenção.** O
// token existe para sobreviver a UMA recarga — a do botão "Trocar personagem".
// Em `localStorage` ele viraria um "lembrar de mim" que ninguém pediu e que
// deixaria a conta aberta no computador depois de fechar o navegador.
//
// ⚠️ O token não é senha: ele só reabre a LISTA de personagens. Excluir
// personagem continua pedindo a senha da conta, à parte.
// ---------------------------------------------------------------------------

const CHAVE_TOKEN = 'elysia_sessao';

function guardaToken(token: string): void {
  try {
    sessionStorage.setItem(CHAVE_TOKEN, token);
  } catch { /* sem armazenamento: a troca volta a pedir senha, e só */ }
}

function leToken(): string {
  try {
    return sessionStorage.getItem(CHAVE_TOKEN) ?? '';
  } catch {
    return '';
  }
}

function esqueceToken(): void {
  try {
    sessionStorage.removeItem(CHAVE_TOKEN);
  } catch { /* idem */ }
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

  /**
   * Voltar à tela de login — trocar de conta sem fechar a aba.
   *
   * 🔴 **NÃO recarrega a página, ao contrário do "Trocar personagem".** Aquele
   * botão recarrega porque o mundo já está montado e não existe teardown para
   * as ~3.300 linhas de `startGame`. Aqui o mundo **nunca foi montado**: só há
   * a lista de personagens, então trocar de tela basta — e evita rebaixar os
   * 76 MB do vídeo de fundo, que o Chromium se recusa a cachear.
   *
   * 🔴 **O token de sessão é esquecido.** Sem isso o token continuaria válido
   * no `sessionStorage` e a próxima recarga reabriria a lista da conta antiga
   * — o jogador teria pedido para sair e voltado ao mesmo lugar.
   *
   * ⚠️ Re-autenticar no MESMO socket é suportado: o servidor só sobrescreve o
   * `player.accountId` e responde com um `charlist` novo (ver `case 'auth'` em
   * `server/src/index.ts`). Não é preciso derrubar a conexão.
   *
   * ⚠️ A senha é limpa, o usuário não. O campo de usuário já nasce preenchido
   * pelo `localStorage`, e apagá-lo obrigaria a redigitar mesmo quem só errou a
   * senha.
   */
  (el('tologinbtn') as HTMLButtonElement).onclick = () => {
    esqueceToken();
    selectedChar = null;
    (el('passin') as HTMLInputElement).value = '';
    el('loginerr').textContent = '';
    el('charhint').textContent = '';
    showScreen('login');
  };
}

/** Redesenha a lista de personagens da conta. */
/**
 * A caixa de confirmação da exclusão.
 *
 * 🔴 **Pede a senha da conta, com a sessão já autenticada.** Passado o prazo,
 * isto destrói progresso sem volta — é a única ação do jogo assim. O servidor
 * confere de novo; esta caixa existe para o jogador PARAR e ler, não para
 * validar.
 *
 * ⚠️ Escrever o nome do personagem seria mais cerimonioso, mas não protege de
 * quem senta no computador destravado — e é justamente esse o caso que a senha
 * cobre.
 */
function pedeExclusao(c: CharacterSlot): void {
  const senha = window.prompt(
    `Excluir ${c.name} (nível ${c.level})?\n\n`
    + 'Ele fica 24 horas na lista, e você pode desistir a qualquer momento nesse '
    + 'prazo. Passadas as 24 horas, some para sempre.\n\n'
    + 'Digite a senha da sua conta para confirmar:',
  );
  // Cancelar na caixa devolve null; senha vazia não vale a viagem até o servidor.
  if (!senha) return;
  net.send({ t: 'deletechar', characterId: c.id, password: senha });
}

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
    /*
     * ---- EXCLUSÃO MARCADA (02/09) -----------------------------------------
     *
     * 🔴 O personagem CONTINUA na lista com o prazo correndo, e essa é a razão
     * de a exclusão ter prazo: some da lista e o jogador não tem de onde
     * desistir. A linha muda de cara e troca "Excluir" por "Cancelar".
     */
    const marcado = typeof c.deleteAt === 'number';
    row.className = 'charrow' + (c.id === selectedChar ? ' sel' : '') + (marcado ? ' marcado' : '');
    const restante = marcado ? Math.max(0, c.deleteAt! - Date.now()) : 0;
    const horas = Math.floor(restante / 3_600_000);
    const minutos = Math.floor((restante % 3_600_000) / 60_000);
    const prazo = marcado
      ? `<small class="prazo">Excluindo em ${horas}h${String(minutos).padStart(2, '0')}</small>`
      : '';
    row.innerHTML =
      `<div class="cicon" style="${HERO_ART_CLASSES.has(c.charClass)
        ? heroIdleCss(c.charClass, 52)
        : classIconCss(c.charClass, 52)}"></div>` +
      `<div class="cnome"><b>${c.name}</b><small>${def?.name ?? c.charClass} · nível ${c.level}</small>${prazo}</div>` +
      `<button class="cdel">${marcado ? 'Cancelar' : 'Excluir'}</button>`;
    row.onclick = () => {
      selectedChar = c.id;
      renderCharList(charSlots);
    };
    row.ondblclick = () => {
      selectedChar = c.id;
      enterBtn.click();
    };
    const btn = row.querySelector<HTMLButtonElement>('.cdel')!;
    btn.onclick = (ev) => {
      // Sem isto o clique no botão também SELECIONA a linha, e o duplo-clique
      // acidental entraria no mundo com o personagem que se quer apagar.
      ev.stopPropagation();
      if (marcado) {
        net.send({ t: 'canceldelete', characterId: c.id });
        return;
      }
      pedeExclusao(c);
    };
    row.style.setProperty('--i', String(chars.indexOf(c)));
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
      // 🔴 O ÍCONE VOLTOU A MUDAR COM O SEXO (07/09). O comentário que estava
      // aqui dizia "o dia em que houver variante feminina, é aqui que ela volta
      // a trocar o desenho" — e é hoje: o universal tem os dois corpos.
      //
      // ⚠️ Todos os cartões com arte HD são repintados, não só o do Knight: as
      // cinco classes apontam para o mesmo pack universal, então as cinco
      // mudam junto. Quem não tem pack HD segue no ícone MiniWorld.
      for (const [cls, card] of cards) {
        const css = HERO_ART_CLASSES.has(cls) ? heroIdleCss(cls, 56, g) : null;
        if (css) card.querySelector('.cicon')?.setAttribute('style', css);
      }
      if (knightIcon) knightIcon.setAttribute('style', knightIconCss(gender, 48));
      // O palco mostra o mesmo personagem, e o sexo o troca junto.
      pintaPalco();
    };
    genderBar.appendChild(btn);
  });
  // O gênero é o passo 2 e tem lugar próprio na tela desde 02/09 — antes era
  // enfiado logo acima da grade de classes.
  (document.getElementById('ccgender') ?? classesEl).appendChild(genderBar);

  /**
   * O PALCO — o retrato inteiro no meio da tela, sem fundo.
   *
   * 🔴 O `#ccpalco` nasceu vazio em 02/09 com um comentário dizendo que era
   * "lugar reservado, não esquecimento": o dono ainda estava fazendo o boneco.
   * Desde 07/09 os retratos existem, e é isto que ocupa o espaço.
   *
   * ⚠️ **Sem classe escolhida o palco fica VAZIO, e é a escolha certa.** Pôr um
   * retrato genérico ali daria a impressão de que uma classe já está
   * selecionada — o botão `playbtn` diz "Escolha uma classe" justamente porque
   * nada está.
   *
   * ⚠️ A imagem é `background`, não `<img>`: o palco é uma caixa elástica
   * (`flex: 1`) e `contain` faz o retrato caber sozinho na altura que sobrar,
   * sem esticar. Com `<img>` seria preciso calcular essa altura na mão.
   */
  /*
   * 🔴 **O PALCO PASSOU A MOSTRAR O SPRITE DO JOGO, RESPIRANDO** (10/09). O
   * dono pediu: *"Tire os personagens que estão lá hoje... coloque os bandidos
   * que usamos hoje. (pode deixar a animação dele parado respirando, se
   * houver...)"* — e há: a tira `idle.png` do pack tem doze quadros.
   *
   * ⚠️ **O boneco virou um FILHO do palco, e não o `background` dele.** O
   * `::before` e o `::after` do palco desenham o halo giratório e o chão de
   * luz; com o sprite no fundo do próprio palco ele ficaria ATRÁS dos dois.
   *
   * ⚠️ `retratoDeClasseCss` continua exportada e a arte segue em
   * `/assets/retratos/` — trocar de volta é uma linha, e por isso nada foi
   * apagado.
   */
  function pintaPalco(): void {
    const palco = document.getElementById('ccpalco');
    if (!palco) return;
    palco.textContent = '';
    if (!chosen) return;
    const boneco = document.createElement('div');
    boneco.className = 'palcoboneco';
    boneco.setAttribute('style', heroIdleCss(chosen, 256, gender));
    palco.appendChild(boneco);
  }

  // A ordem da arte de referência que o dono trouxe. As CINCO desde 02/09.
  const order: PlayerClass[] = ['knight', 'sorcerer', 'assassin', 'archer', 'druid'];
  const cards = new Map<PlayerClass, HTMLElement>();
  let knightIcon!: HTMLElement;
  for (const id of order) {
    const def = CLASSES[id];
    const card = document.createElement('div');
    card.className = 'classcard';
    // O cartão mostra o MESMO boneco que vai andar no mundo — escolher a classe
    // por uma arte e receber outra em tela é o tipo de surpresa que não vale.
    // Classe sem pack HD cai no ícone MiniWorld, como antes.
    // 🔴 O RETRATO ILUSTRADO ganha do sprite (07/09, pedido do dono): o cartão
    // mostra o desenho da classe, não o boneco top-down. Classe sem retrato cai
    // no sprite, e classe sem pack HD cai no ícone MiniWorld — a cadeia inteira
    // existe porque imagem de CSS que falta não dá erro, só cartão vazio.
    /*
     * 🔴 **O SPRITE DO JOGO ganhou do retrato ilustrado** (10/09, pedido do
     * dono). O cartão mostra o mesmo boneco que vai andar no mundo, respirando
     * — que era, aliás, a intenção original de 02/09, antes de os retratos
     * existirem. Classe sem pack HD ainda cai no ícone do MiniWorld: imagem de
     * CSS que falta não dá erro, só cartão vazio.
     */
    const iconStyle = HERO_ART_CLASSES.has(id)
      ? heroIdleCss(id, 56, gender)
      : classIconCss(id, 56);
    card.innerHTML =
      `<div class="cicon" style="${iconStyle}"></div>` +
      `<div class="cinfo"><b>${def.name.toUpperCase()}</b><p>${def.blurb}</p></div>`;
    if (id === 'knight' && !HERO_ART_CLASSES.has(id)) knightIcon = card.querySelector('.cicon')!;
    card.onclick = () => {
      chosen = id;
      for (const c of cards.values()) c.classList.remove('sel');
      card.classList.add('sel');
      pintaPalco();
      // Repinta em vez de so chamar refresh: a previa muda com a classe.
      pintaAtributos();
    };
    // `--i` escalona a entrada: os cinco cartoes surgem em cascata, nao juntos.
    card.style.setProperty('--i', String(order.indexOf(id)));
    classesEl.appendChild(card);
    cards.set(id, card);
  }
  if (chosen && cards.has(chosen)) cards.get(chosen)!.classList.add('sel');
  genderBtns[gender].classList.add('sel');
  // Estado inicial: quem volta à tela com uma classe já escolhida vê o palco
  // preenchido de cara, sem precisar clicar de novo no cartão.
  pintaPalco();

  const errEl = el('nameerr');

  /*
   * ---- DISTRIBUIÇÃO DE ATRIBUTOS (02/09) ---------------------------------
   *
   * 🔴 **A classe deixou de decidir os atributos.** Todo atributo nasce em 1 e o
   * jogador reparte `CREATION_POINTS` (38) como quiser — a regra e a validação
   * moram em `shared/src/stats.ts`, e o servidor roda a MESMA função.
   *
   * ⚠️ Trocar de classe **não zera** a distribuição, de propósito: quem montou
   * uma build e foi comparar as classes perderia o trabalho a cada clique. O que
   * muda ao trocar é só a prévia de vida e mana.
   */
  const atributos = startingAttributes();
  const attrBox = el('ccattrs');
  const attrLeft = el('ccattrs-left');
  const attrList = el('ccattrs-list');
  const attrPrev = el('ccattrs-prev');
  const linhas = new Map<string, {
    val: HTMLElement; custo: HTMLElement; mais: HTMLButtonElement; menos: HTMLButtonElement;
  }>();

  for (const key of ATTRIBUTE_KEYS) {
    const row = document.createElement('div');
    row.className = 'ccrow';
    row.innerHTML =
      `<button class="menos" title="-1">−</button>`
      + `<span class="av"></span>`
      + `<button class="mais" title="+1">+</button>`
      + `<span class="ac"></span>`
      + `<span class="an">${ATTRIBUTE_INFO[key].name}</span>`
      + `<span class="ae">${ATTRIBUTE_INFO[key].effects}</span>`;
    const mais = row.querySelector<HTMLButtonElement>('.mais')!;
    const menos = row.querySelector<HTMLButtonElement>('.menos')!;
    // 🔴 O clique custa o preço do DEGRAU atual, não 1. Ver `creationCost`.
    mais.onclick = () => {
      if (sobrando() >= attributeCost(atributos[key])) { atributos[key]++; pintaAtributos(); }
    };
    // ⚠️ O piso é 1, o mesmo que o `checkAttributes` exige — não 0.
    menos.onclick = () => { if (atributos[key] > 1) { atributos[key]--; pintaAtributos(); } };
    attrList.appendChild(row);
    linhas.set(key, {
      val: row.querySelector('.av')!, custo: row.querySelector('.ac')!, mais, menos,
    });
  }

  /** Quanto do orçamento ainda não foi gasto, pela tabela de custo. */
  function sobrando(): number {
    return CREATION_POINTS - creationCost(atributos as Attributes);
  }

  /* ---- 🕸️ O TEIA DE ATRIBUTOS ---------------------------------------
   *
   * 🔴 Pedido do dono (10/09): *"Coloque 1 gráfico montando os atributos, tipo
   * o do ragnarok mesmo, quando vc coloca Strength, ele puxa pro lado dele.. e
   * vai equilibrando (tipo o do ragnarok mesmo)."*
   *
   * ⚠️ **São SETE vértices, não seis como no jogo de referência.**
   * `ATTRIBUTE_KEYS` traz STR, VIT, AGI, DEX, INT, WIS e LUK — o Ragnarok não
   * tem WIS separado. O polígono sai do `.length`, então nada aqui precisa
   * saber o número: um atributo a mais ou a menos redesenha a figura inteira
   * sozinho, incluindo eixos, rótulos e a área.
   *
   * 🔴 **"Vai equilibrando" é a parte que o gráfico faz e os números não.** O
   * orçamento é fechado (`CREATION_POINTS`) e o degrau encarece
   * (`attributeCost`), então subir um atributo é sempre tirar de outro. Na lista
   * de números isso é aritmética; no polígono é uma ponta esticando enquanto as
   * outras encolhem, que é a leitura que o dono descreveu.
   */
  const radarEl = document.getElementById('ccradar');

  /** Raio da moldura. Casa com o `viewBox` de −130..130, com folga p/ rótulo. */
  const RADAR_R = 88;
  /**
   * 🔴 **O TETO DA ESCALA, e por que ele não é o maior atributo do momento.**
   *
   * Escalar pelo maior valor faria o polígono ficar do MESMO tamanho sempre:
   * gastar todos os pontos em Strength daria a mesma figura de não gastar
   * nenhum, só girada. O teto é fixo para a área crescer quando o jogador
   * investe — é o gráfico dizer "você está mais forte", não só "mais torto".
   *
   * ⚠️ O valor é o maior que a tela de criação alcança na prática: todo o
   * orçamento num atributo só. Passar disso é impossível aqui, então o
   * polígono nunca vaza a moldura.
   */
  const RADAR_MAX = (() => {
    let v = 1, gasto = 0;
    while (gasto + attributeCost(v) <= CREATION_POINTS) { gasto += attributeCost(v); v++; }
    return v;
  })();

  /** Vértice `i` de `ATTRIBUTE_KEYS.length`, a uma fração `f` do raio. Topo = 0. */
  const radarPonto = (i: number, f: number): [number, number] => {
    // −90° põe o primeiro vértice no TOPO; sem isso o polígono nasce deitado.
    const a = (Math.PI * 2 * i) / ATTRIBUTE_KEYS.length - Math.PI / 2;
    return [Math.cos(a) * RADAR_R * f, Math.sin(a) * RADAR_R * f];
  };

  const svgEl = (nome: string, attrs: Record<string, string>): SVGElement => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', nome);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };

  /** Os pontos de um anel, no formato que o `points` do polígono quer. */
  const radarAnel = (f: number): string =>
    ATTRIBUTE_KEYS.map((_, i) => radarPonto(i, f).map((n) => n.toFixed(1)).join(',')).join(' ');

  /** A área preenchida e as bolinhas — o que se move. Preenchidos por `pintaRadar`. */
  let radarArea: SVGElement | null = null;
  const radarBolas: SVGElement[] = [];
  const radarValores: SVGElement[] = [];

  function montaRadar(): void {
    if (!radarEl) return;
    radarEl.textContent = '';
    // Quatro anéis de referência, como o papel milimetrado do gráfico do RO.
    for (const f of [0.25, 0.5, 0.75, 1]) {
      radarEl.appendChild(svgEl('polygon', { class: 'grade', points: radarAnel(f) }));
    }
    ATTRIBUTE_KEYS.forEach((key, i) => {
      const [x, y] = radarPonto(i, 1);
      radarEl.appendChild(svgEl('line', {
        class: 'eixo', x1: '0', y1: '0', x2: x.toFixed(1), y2: y.toFixed(1),
      }));
      /*
       * ⚠️ O rótulo sai 26 % ALÉM do vértice, e o `text-anchor` acompanha o
       * lado: à direita do centro ancora no começo, à esquerda no fim. Ancorar
       * tudo no meio faria os rótulos das quinas invadirem a moldura.
       */
      const [rx, ry] = radarPonto(i, 1.26);
      const ancora = Math.abs(rx) < 1 ? 'middle' : rx > 0 ? 'start' : 'end';
      const rot = svgEl('text', {
        class: 'rot', x: rx.toFixed(1), y: ry.toFixed(1),
        'text-anchor': ancora, 'dominant-baseline': 'middle',
      });
      // Três letras: o nome inteiro não cabe na quina e o jogo já os abrevia.
      rot.textContent = ATTRIBUTE_INFO[key].name.slice(0, 3).toUpperCase();
      radarEl.appendChild(rot);

      const val = svgEl('text', {
        class: 'rotval', x: rx.toFixed(1), y: (ry + 12).toFixed(1),
        'text-anchor': ancora, 'dominant-baseline': 'middle',
      });
      radarEl.appendChild(val);
      radarValores.push(val);
    });
    radarArea = svgEl('polygon', { class: 'area', points: radarAnel(0) });
    radarEl.appendChild(radarArea);
    ATTRIBUTE_KEYS.forEach(() => {
      const c = svgEl('circle', { class: 'ponto', cx: '0', cy: '0', r: '3' });
      radarEl.appendChild(c);
      radarBolas.push(c);
    });
  }

  /**
   * 🔴 **O VALOR 1 NÃO DESENHA UM PONTO NO CENTRO, e é escolha, não erro.**
   *
   * O orçamento de criação é grande (`CREATION_POINTS`), então um atributo
   * recém-nascido vale 1 num teto de dezenas: proporcional puro daria uma teia
   * do tamanho de um grão, e os primeiros cliques do jogador — justamente os
   * que ele está tentando comparar — não moveriam nada visível.
   *
   * ✅ O piso reserva os primeiros 18 % do raio para a base comum e distribui o
   * resto pelo que foi INVESTIDO. A figura nasce como um heptágono pequeno e
   * regular (que é a verdade: os sete começam iguais) e cada ponto gasto
   * empurra uma ponta de um tanto que se enxerga.
   */
  const PISO_RADAR = 0.18;

  function pintaRadar(): void {
    if (!radarArea) return;
    const pontos: string[] = [];
    ATTRIBUTE_KEYS.forEach((key, i) => {
      const investido = (atributos[key] - 1) / Math.max(1, RADAR_MAX - 1);
      const f = Math.min(1, PISO_RADAR + (1 - PISO_RADAR) * investido);
      const [x, y] = radarPonto(i, f);
      pontos.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      radarBolas[i]?.setAttribute('cx', x.toFixed(1));
      radarBolas[i]?.setAttribute('cy', y.toFixed(1));
      const v = radarValores[i];
      if (v) v.textContent = String(atributos[key]);
    });
    radarArea.setAttribute('points', pontos.join(' '));
  }

  montaRadar();

  function pintaAtributos(): void {
    const resta = sobrando();
    attrLeft.textContent = String(resta);
    attrLeft.classList.toggle('pronto', resta === 0);
    for (const key of ATTRIBUTE_KEYS) {
      const l = linhas.get(key)!;
      const custo = attributeCost(atributos[key]);
      l.val.textContent = String(atributos[key]);
      /*
       * ⚠️ O preço do próximo ponto fica VISÍVEL, e não só no tooltip. Sem ele,
       * o botão desligado vira mistério: o jogador tem 2 pontos sobrando, vê o
       * "+" apagado num atributo caro e não tem como saber por quê.
       */
      l.custo.textContent = '−' + custo;
      l.mais.disabled = resta < custo;
      l.mais.title = `+1 custa ${custo} ponto(s)`;
      l.menos.disabled = atributos[key] <= 1;
    }
    /*
     * 🔴 A PRÉVIA DE VIDA E MANA é o que impede a surpresa cruel: elas saem de
     * VIT e INT, então um Knight que ignora VIT nasce com 128 de vida em vez de
     * 200 — e o nome já é definitivo quando ele descobrir jogando.
     */
    if (chosen) {
      const cls = CLASSES[chosen];
      const d = computeStats(cls, atributos as Attributes, 1, {
        kind: cls.skill, level: 1, progress: 0,
      });
      attrPrev.innerHTML =
        `No nível 1: <b>${d.maxHp}</b> de vida · <b>${d.maxMana}</b> de mana`;
    }
    pintaRadar();
    refresh();
  }

  function refresh(): void {
    // Valida o nome NA HORA, com a mesma função que o servidor usa. O jogador
    // descobre o problema enquanto digita, não depois de clicar.
    const bruto = nameIn.value.trim();
    const check = bruto ? checkName(bruto) : null;
    errEl.textContent = check && !check.ok ? (check.message ?? '') : '';

    const nomeOk = !!check?.ok;
    // A caixa de atributos só faz sentido depois da classe: a prévia depende dela.
    attrBox.style.display = chosen ? '' : 'none';
    const attrOk = checkAttributes(atributos as Attributes);
    playBtn.disabled = !chosen || !nomeOk || !attrOk.ok;
    playBtn.textContent = !chosen
      ? 'Escolha uma classe'
      : !attrOk.ok
        // ⚠️ A mensagem vem do `shared`, a mesma que o servidor devolveria —
        // duas redações para a mesma regra é como elas passam a divergir.
        ? attrOk.message
        : 'Criar personagem';
  }
  nameIn.addEventListener('input', refresh);
  pintaAtributos();

  (el('backbtn') as HTMLButtonElement).onclick = () => showScreen('charselect');

  playBtn.onclick = () => {
    const check = checkName(nameIn.value.trim());
    if (!chosen || !check.ok) return;
    localStorage.setItem('dominion_class', chosen);
    localStorage.setItem('elysia_gender', gender);
    // O servidor responde com um `charlist` novo (com o personagem criado) ou
    // com o mesmo `charlist` mais um erro — quem troca de tela é o handler.
    net.send({
      t: 'createchar', name: check.name, charClass: chosen, gender,
      attributes: atributos as Attributes,
    });
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

/**
 * Pinta uma falha fatal NA TELA, em vez de deixar o jogador com o preto.
 *
 * 🔴 O motivo de existir: `startGame` é disparada com `void` logo depois de
 * `showScreen('none')`. Se ela rejeitar, as telas JÁ foram escondidas e não
 * sobra nada para ver — a página fica preta e muda, e o erro vive só no console
 * de quem está jogando. Com um jogador remoto isso é um beco: de cá não há como
 * saber o que quebrou, e do lado de lá ninguém tem por que saber abrir o F12.
 *
 * ⚠️ Reaproveita o mesmo elemento a cada chamada de propósito: erro dentro do
 * laço de render dispara a cada quadro, e criar um painel por quadro travaria o
 * navegador em cima de um problema que já é ruim.
 */
function mostraFalhaFatal(origem: string, err: unknown): void {
  console.error(`[Elysia] falha fatal em ${origem}`, err);
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  const pilha = err instanceof Error && err.stack ? err.stack : '';
  let painel = document.getElementById('falha-fatal');
  if (!painel) {
    painel = document.createElement('div');
    painel.id = 'falha-fatal';
    painel.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99999',
      'background:#140d0d', 'color:#e8d8c8',
      'font:13px/1.6 ui-monospace,Consolas,monospace',
      'padding:24px', 'overflow:auto', 'white-space:pre-wrap',
    ].join(';');
    document.body.appendChild(painel);
  }
  painel.textContent = [
    'O jogo não conseguiu abrir.',
    '',
    `onde: ${origem}`,
    msg,
    '',
    pilha,
    '',
    'Mande um print desta tela para quem cuida do servidor.',
  ].join('\n');
}

/*
 * 🔴 EXTENSÃO DO NAVEGADOR NÃO É FALHA DO JOGO.
 *
 * MetaMask, carteiras e afins injetam script DENTRO da página, então o que eles
 * quebram chega aos nossos ouvintes globais como se fosse nosso. O caso real: a
 * `inpage.js` do MetaMask solta "Failed to connect to MetaMask" a cada carga, e
 * o painel fatal cobria o jogo inteiro com um erro que não é nosso e que o
 * jogador não tem como consertar.
 *
 * O sinal é o ESQUEMA na pilha (`chrome-extension://` e primos). Sem pilha não
 * dá para saber de quem é — nesse caso o painel aparece, que é o lado seguro:
 * esconder falha nossa é pior que mostrar falha alheia.
 */
const ESQUEMA_DE_EXTENSAO = /(?:chrome|moz|safari-web|ms-browser)-extension:\/\//;
function ehDeExtensao(err: unknown): boolean {
  const pilha = err instanceof Error && err.stack ? err.stack : '';
  return ESQUEMA_DE_EXTENSAO.test(pilha);
}

/*
 * Redes de segurança para o que escapar do `catch` do `startGame`: erro solto
 * no laço de render e promessa rejeitada em qualquer canto.
 *
 * ⚠️ O `instanceof ErrorEvent` NÃO é enfeite: o evento 'error' da janela também
 * dispara para RECURSO que não carregou (um PNG 404), e esses chegam como
 * `Event` puro. Sem a checagem, um sprite faltando cobriria o jogo inteiro com
 * um painel de erro fatal — trocaria um bug pequeno por um grande.
 */
window.addEventListener('error', (e) => {
  if (!(e instanceof ErrorEvent)) return;
  const err = e.error ?? e.message;
  if (ehDeExtensao(err) || ESQUEMA_DE_EXTENSAO.test(e.filename ?? '')) {
    console.warn('[Elysia] erro de extensão do navegador, ignorado', err);
    return;
  }
  mostraFalhaFatal('erro não tratado', err);
});
window.addEventListener('unhandledrejection', (e) => {
  if (ehDeExtensao(e.reason)) {
    console.warn('[Elysia] promessa rejeitada por extensão do navegador, ignorada', e.reason);
    return;
  }
  mostraFalhaFatal('promessa rejeitada', e.reason);
});

async function startGame(playerName: string, charClass: PlayerClass, gender: Gender): Promise<void> {
  await app.init({
    background: '#0c0b0a',
    resizeTo: viewportEl,
    antialias: false,
  });
  viewportEl.appendChild(app.canvas);

  /*
   * 🔬 **JANELA DE DEPURAÇÃO — só em `dev`.**
   *
   * 🔴 **Existe porque quase todo o trabalho deste projeto é VFX julgado em
   * tela, e até 12/09 a única ferramenta era o dono olhar e descrever.** Isso
   * funciona para *"está muito grande"* e não funciona para *"o estouro cresce
   * cedo demais"* — coisa de 40 ms que ninguém vê a olho nu. Com o `app` na mão
   * dá para EXTRAIR quadro a quadro e olhar devagar.
   *
   * ⚠️ **`import.meta.env.DEV` some no build**, então isto não vai para o
   * cliente publicado — o Vite elimina o bloco inteiro. Não é uma porta aberta
   * em produção, e não pode virar uma: nada aqui deve ser lido pelo jogo.
   */
  if (import.meta.env.DEV) {
    (window as unknown as { elysia: unknown }).elysia = {
      app,
      /**
       * O contêiner do mundo — serve para converter ponto de tela em ponto de
       * mundo.
       *
       * ⚠️ **Acessador, e não valor.** `objects` nasce depois deste bloco; lido
       * agora seria `undefined` congelado. Lido na hora do uso, é o de verdade.
       */
      get mundo() { return objects; },
      /**
       * Toca o efeito de QUEDA de uma magia num ponto do mundo, sem servidor,
       * sem SP e sem recarga.
       *
       * ⚠️ **É o efeito, e não a magia**: não há dano, não há alvo, e o servidor
       * não fica sabendo. Serve para olhar a animação quantas vezes for preciso
       * — que é o gargalo real de ajustar VFX, porque a conjuração de verdade
       * tem 0,8 s de cast e segundos de recarga entre uma olhada e a seguinte.
       */
      efeito(
        magia: string, wx: number, wy: number,
        opts: { raioDano?: number; bolts?: number; quedaMs?: number } = {},
      ): void {
        spawnQuedaDaConjuracao(
          magia, wx, wy, opts.bolts ?? 1, undefined, opts.quedaMs ?? 520, opts.raioDano ?? 2,
        );
      },
      /**
       * Toca um efeito de FOLHA (buff, cura, Explosão Glacial) num tile.
       *
       * ⚠️ **Recebe TILE, e não pixel, porque é assim que o servidor manda.** O
       * `fx` traz `x`/`y` em tiles e o cliente converte com `+TS/2` no eixo X e
       * `+TS` no Y — o rodapé do tile. Reproduzir a conversão aqui é o que faz o
       * ensaio cair no mesmo lugar que a magia de verdade; receber pixel
       * convidaria a errar meio tile e a "consertar" a âncora por causa disso.
       */
      feitio(nome: string, tileX: number, tileY: number): void {
        tocaEfeito(nome, tileX * TS + TS / 2, tileY * TS + TS);
      },
      /**
       * O tile do herói local, para o ensaio cair EM CIMA dele.
       *
       * ⚠️ **Medir centragem exige o tile exato, não o centro da tela.** A câmera
       * segue o herói com folga, então usar o meio da tela como se fosse ele
       * introduz justamente o erro de meio tile que se está tentando medir.
       */
      get heroi() {
        const v = myId ? sprites.get(myId) : undefined;
        if (!v) return undefined;
        return { tileX: Math.round(v.container.x / TS), tileY: Math.round(v.container.y / TS) };
      },
    };
  }

  // ---- Identidade no HUD: nome e classe -----------------------------------
  //
  // ⚠️ **Não há mais retrato.** O medalhão é só o anel, com o miolo vazio — foi
  // pedido do dono em 09/09. O que morava ali era o sprite do herói a 32 px,
  // dimensionado para um quadrado de 44 do painel lateral antigo, e dentro do
  // anel de 66 ele ficava perdido no meio do vão.
  hud.charname.textContent = playerName;
  hud.charname.title = playerName; // o nome é cortado por `ellipsis` se for longo
  hud.charclass.textContent = CLASSES[charClass].name;

  /*
   * 🔴 **A ENGRENAGEM VIROU A CARINHA DO PERSONAGEM** (10/09, pedido do dono:
   * *"esse ícone deve ser trocado por um ícone tipo da carinha do
   * personagem"*).
   *
   * O botão nunca abriu configuração nenhuma — ele abre a ficha do personagem
   * (atributos, vitais, battle, PvP), e a engrenagem prometia a coisa errada.
   * Agora ele mostra o SEU boneco, respirando.
   *
   * ⚠️ **A troca acontece AQUI, e não em `ligaPainelDoPersonagem`**, que é onde
   * o botão nasce: aquela função roda no bootstrap, antes do login, quando a
   * classe e o sexo ainda não existem. Repintar depois é o único momento em que
   * há o que pintar.
   *
   * ⚠️ Zera as quatro variáveis de arte do `poeIcone`. Sem isso o `--ico` da
   * engrenagem continuaria desenhado por cima do sprite — os dois são
   * `background` no mesmo botão.
   */
  const botaoFicha = document.querySelector<HTMLElement>('#chbtns .btnico.ficha');
  if (botaoFicha && HERO_ART_CLASSES.has(charClass)) {
    /*
     * 🔴 **O ROSTO É UM FILHO, e a MOLDURA continua sendo a do botão.** Foi o
     * conserto do que entrei em 10/09, que trocava o `background` do próprio
     * botão: aquilo apagava a arte de estado (`--ico`, `--ico-hover`,
     * `--ico-press`) e a carinha ficava sendo o único dos sete atalhos sem
     * moldura e sem reação ao mouse. O dono viu e pediu *"dentro do
     * enquadramento igual aos demais menus"*.
     *
     * Assim o botão segue idêntico aos irmãos — mesma moldura, mesmo hover,
     * mesmo afundar no clique — e só o miolo mudou de desenho.
     *
     * ⚠️ O fundo escuro do `.rosto` (no CSS) não é enfeite: sem ele a
     * engrenagem que a arte `config` traz desenhada apareceria por trás da
     * silhueta do personagem, que é vazada.
     */
    botaoFicha.classList.add('carinha');
    const rosto = document.createElement('i');
    rosto.className = 'rosto';
    rosto.setAttribute('style', heroRostoCss(charClass, 26, gender));
    botaoFicha.appendChild(rosto);
  }

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
  // Folhas de monstro no formato de SPEC-SPRITES-MONSTROS.md: 4 direções com
  // andar/parado/ataque/dano/morte. Só carrega as espécies listadas em
  // `CREATURE_SHEETS` — as outras seguem no blob placeholder e nem tentam
  // requisitar arquivo. Ver o comentário da lista para o porquê.
  const creatureSheets = new Map<string, CreatureSheets>();
  for (const [type, cfg] of Object.entries(CREATURE_SHEETS)) {
    const sheets = await loadCreatureSheets(type, cfg.cell);
    if (sheets) creatureSheets.set(type, sheets);
  }
  // Knight em arte HD (masculino/feminino) — sobrepõe o MiniWorld p/ knight.
  const knightArt = await loadKnightSprites();
  // Arte HD das 4 classes (tiras de `frames2strip`). Sobrepõe TUDO acima para a
  // classe que tiver pack; quem não tiver segue no MiniWorld.
  const heroArt = await loadHeroArt();
  // Equipamento em camada, para as classes cujo corpo vem desarmado. Vazio para
  // as outras, e aí o herói é desenhado como sempre foi.
  //
  // ⚠️ A guarda do `temCamada` evita 16 buscas de tira que ninguém desenharia:
  // com `COM_CAMADA` vazio (ver `heroes.ts`) o Knight voltou ao corpo armado, e
  // a camada só volta a carregar quando ele voltar para a lista.
  const equipArt = temCamada('knight') ? await loadEquipArt('knight') : {};
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
  await loadItemArt();

  const world = new Container(); // a "câmera"
  /*
   * 🔴 O ZOOM TEM QUE SER INTEIRO, e é a razão de ele ser 2 e não 1,5.
   *
   * A filtragem é `nearest`. Em escala fracionária um pixel do desenho vira 2 na
   * tela e o vizinho vira 3, em faixas alternadas — é o serrilhado que picotava
   * a silhueta e que já custou uma sessão inteira em 10/08. Em 2× cada pixel do
   * desenho vira exatamente 4, sempre.
   *
   * A 1,0× o herói é desenhado a 58 px numa viewport de ~780 — cerca de metade
   * do tamanho em que o preview o mostra. A 2× ele ia a 116 px.
   *
   * 🔴 **DE VOLTA A 1,0× em 2026-08-29, por decisão do dono: a 2× a câmera
   * ficou perto demais.** O 2× durou de 13/08 até aqui. O conserto que veio
   * junto dele — a câmera andando em pixel de tela inteiro, com o float em
   * `camX/camY` — **fica**: ele não custa nada a 1× e é o que impede o cenário
   * de cintilar se alguém voltar a aproximar.
   *
   * ⚠️ **1,0× é o piso do que é bonito.** O próximo degrau inteiro para baixo
   * seria 0,5×, e aí dois pixels de arte viram um de tela — o desenho perde
   * metade da informação e o herói fica com 29 px. Para ver mais mundo sem isso,
   * o caminho é viewport maior, não zoom menor.
   *
   * ⚠️ `atualizaChunks` monta cenário pelo retângulo que a tela cobre, então
   * zoom menor mostra MAIS mundo (12 → 24 tiles na vertical) — e agora o
   * `SNAPSHOT_RANGE = 32` do servidor volta a ser o limite que importa.
   */
  const ZOOM = 1.0;
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
   * 🔴 **As três alturas do construtor de mapas** (`WorldDecal.camada`). Elas não
   * são um número escolhido: são os três lugares que já existiam nesta pilha, e
   * cada um atende um pedido diferente do dono.
   *
   *   floorRoot  →  decChao  →  fazenda(baixo)  →  objects  →  fazenda(acima)  →  decAcima
   *                                                  ↑ decBaixo entra aqui
   *
   * - `chao`  remendo de terreno que fica SOB a arte da fazenda;
   * - `baixo` o caso comum: objeto no chão, o herói passa na frente;
   * - `acima` sobre tudo, inclusive o herói — *"a hélice por cima dos objetos"*.
   */
  const decChao = new Container();
  decChao.eventMode = 'none';
  world.addChild(decChao);

  /*
   * 🚜 **A FAZENDA.** Duas camadas, e a posição delas na pilha é o conteúdo da
   * decisão: `farmBaixo` entra logo depois do piso e antes de `objects`, então
   * o chão desenhado, as construções e as cercas ficam sob os personagens;
   * `farmAcima` entra depois de `objects`, então a copa das árvores e o
   * corrimão das cercas ficam sobre eles.
   *
   * ⚠️ Se a arte não estiver gerada, `carregaFarmArte` devolve null e o jogo
   * segue — a fazenda aparece como o que a colisão diz que ela é: terra batida
   * com paredes de madeira. Quem clonar o repositório sem rodar
   * `npm run farm:build` tem que conseguir jogar.
   */
  const farmArte = await carregaFarmArte(FARM_AREA.x0, FARM_AREA.y0);
  if (farmArte) {
    world.addChild(farmArte.baixo);
    /*
     * ⚠️ Os interiores entram AQUI, antes de `objects`, e não depois — o quarto
     * inteiro fica **sob** o jogador. Postos depois, a cama e o tapete eram
     * desenhados por cima dele e o personagem sumia dentro da própria casa.
     * Não há nada num cômodo que deva passar na frente de quem anda nele; a
     * camada `acima` existe para folhagem e corrimão, que são coisas de fora.
     */
    world.addChild(farmArte.interiores);
  }

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
  const decBaixo = new Container();
  decBaixo.eventMode = 'none';
  world.addChild(decBaixo);

  world.addChild(objects);

  // A metade de cima da fazenda: copa de árvore e corrimão, sobre quem passa.
  if (farmArte) world.addChild(farmArte.acima);

  const decAcima = new Container();
  decAcima.eventMode = 'none';
  world.addChild(decAcima);

  const sprites = new Map<string, EntityView>();
  /** Fitas de ícone de condição, por id de entidade (criadas sob demanda). */
  const condStrips = new Map<string, ReturnType<typeof makeConditionStrip>>();
  /** ⚪ Caveira sobre o personagem, por id (também sob demanda — é raríssima). */
  const skullMarks = new Map<string, ReturnType<typeof makeSkullMark>>();

  // ---- Mover por clique: marcadores no chão ------------------------------
  //
  // Dois retângulos desenhados por cima do piso e por baixo de tudo o mais
  // (zIndex negativo): o tile sob o mouse e o destino clicado.
  /**
   * 🎯 **O MARCADOR DE DESTINO — era um quadrado verde, virou animação** (dono,
   * 12/09: *"quero substituir o quadrado verde padrão"*).
   *
   * 🔴 **A LÓGICA DE MOVIMENTO NÃO MUDOU UMA LINHA, e isso é o ponto.** O
   * quadrado tinha exatamente quatro usos — aparecer ao traçar a rota, aparecer
   * ao perseguir um alvo, sumir ao cancelar e sumir ao chegar. Trocar o DESENHO
   * é trocar esses quatro pontos por `marcaDestino`/`limpaDestino`; rota,
   * pathfinding, passo e autoridade do servidor ficam onde estavam. A ficha
   * pedia isso com todas as letras, e é também o jeito de não introduzir bug de
   * movimentação num pedido que é de arte.
   *
   * ⚠️ **O último quadro CONGELA sozinho** — `AnimatedSprite` com `loop = false`
   * para no último e continua visível. É o comportamento que a ficha pede
   * ("HOLDING_LAST_FRAME"), e escrevê-lo à mão só criaria um segundo lugar onde
   * o congelamento pode divergir. Quem remove o marcador é a CHEGADA, nunca o
   * fim da animação.
   *
   * 🔴 **E o mesmo tile NÃO reinicia a animação.** Não é capricho: a perseguição
   * (`aproximaDe`) recalcula a rota toda vez que o alvo anda e chama isto de
   * novo com o MESMO destino. Sem a guarda, o marcador renasceria a cada
   * recálculo e o losango ficaria caindo em loop no chão. É a diferença entre
   * "clicou em outro ponto" e "o código pediu de novo o mesmo ponto".
   */
  const MARCADOR = {
    folha: 'marcador_destino',
    /**
     * ⚠️ **0,70 é MEDIDO pelo cortador, não escolhido aqui.** É onde o
     * `marcador2fx` põe a linha do chão dentro da célula — ver a nota lá sobre a
     * folha vir com as duas fileiras desalinhadas. Mexer num sem o outro faz o
     * marcador flutuar acima do tile.
     */
    ancoraY: 0.70,
    /**
     * ⚠️ **0,98, e a elipse tem 89 px na célula de 96** — 2,78 tiles a escala 1.
     * A 0,98 ela fica com 87 px, ou **2,7 tiles**.
     *
     * 🔴 **Foi 0,5 → 0,65 → 0,98 em três rodadas de tela, e a direção foi sempre
     * a mesma: MAIOR.** Vale registrar por que eu errei para baixo todas as
     * vezes. Eu ancorei no quadrado verde, que marcava UM tile exato, e tratei a
     * precisão como o valor a preservar. Mas o quadrado precisava ser exato
     * porque era a única marca na tela; um círculo de brilho difuso não é uma
     * medida, é uma MIRA — e mira some no chão muito antes de ficar imprecisa.
     * O tile marcado continua sendo o do centro, por maior que fique o brilho.
     */
    escala: 0.98,
    /**
     * ⚠️ **400 ms, e eram 600** (dono: *"e ela seja mais rápida também"*). São 12
     * quadros a 33 ms — a mesma cadência dos outros efeitos do jogo.
     *
     * ⚠️ **O que encurta é a ANIMAÇÃO, não o marcador.** O último quadro fica
     * congelado até o herói chegar, então correr mais aqui não faz o destino
     * sumir antes: faz o losango cair mais rápido, que é o que o dono vê.
     */
    dur: 400,
  };

  let marcador: { node: AnimatedSprite; tileX: number; tileY: number } | undefined;
  /**
   * O destino que foi pedido ANTES de a folha terminar de carregar.
   *
   * 🔴 **As folhas de FX carregam sem `await`**, e nos primeiros instantes de
   * mundo o mapa delas está vazio — está escrito em `MAGIAS_QUE_CAEM`, que
   * existe pelo mesmo motivo. O quadrado verde era geometria e nascia pronto;
   * uma folha não. Sem isto, clicar logo depois de entrar no jogo daria um
   * caminho SEM marcador nenhum, uma vez a cada tantas entradas — o tipo de
   * falha que só aparece na máquina de quem tem disco lento.
   */
  let marcadorPendente: { tileX: number; tileY: number } | undefined;

  function limpaDestino(): void {
    marcador?.node.destroy();
    marcador = undefined;
    marcadorPendente = undefined;
  }

  function marcaDestino(tx: number, ty: number): void {
    if (marcador && marcador.tileX === tx && marcador.tileY === ty) return;
    limpaDestino();
    const quadros = folhasEfeito.get(MARCADOR.folha);
    if (!quadros || quadros.length === 0) {
      // ⚠️ Guarda o pedido; o carregador toca assim que a folha chegar.
      marcadorPendente = { tileX: tx, tileY: ty };
      return;
    }
    const s = new AnimatedSprite(quadros);
    s.loop = false;
    s.anchor.set(0.5, MARCADOR.ancoraY);
    s.scale.set(MARCADOR.escala);
    /*
     * ⚠️ **`TS - 2` no eixo Y, igual ao anel de alvo que havia aqui.** É a linha onde o
     * personagem PISA dentro do tile, e é onde todo anel de chão deste jogo é
     * desenhado. Centrar no meio do tile poria o círculo dois pixels acima dos
     * pés de quem chegasse ali.
     */
    s.x = tx * TS + TS / 2;
    s.y = ty * TS + TS - 2;
    s.zIndex = -0.8;
    s.eventMode = 'none';
    s.animationSpeed = quadros.length / (MARCADOR.dur / (1000 / 60));
    objects.addChild(s);
    s.play();
    marcador = { node: s, tileX: tx, tileY: ty };
  }

  // Anel de alvo (sob o inimigo selecionado) e camada de efeitos (números).
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
  /*
   * ⚠️ `Container` e não `Graphics`: desde 12/09 há projétil com FOLHA (a Esfera
   * Elétrica é um `AnimatedSprite`), e o laço de voo só mexe em posição, giro e
   * destruição — coisas que todo `Container` tem.
   */
  const projectiles: Array<{
    node: Container; fromX: number; fromY: number; toX: number; toY: number; t: number; dur: number;
    /**
     * Escala no começo e no fim do voo, quando o projétil cresce pelo caminho.
     * ⚡ A Esfera Elétrica usa: sai pequena da mão e chega carregada.
     */
    cresce?: { de: number; ate: number };
    /** Projétil que NÃO gira para o rumo do tiro. Bola redonda não tem frente. */
    semGiro?: boolean;
  }> = [];
  // Efeitos de magia (giro do Vendaval, corte do Dash): expandem e somem.
  const spellFx: Array<{ node: Container; t: number; dur: number; kind: string }> = [];

  /**
   * 🔥 **FIRE BOLT — bolas de fogo caindo do céu.**
   *
   * 🔴 **É queda, não projétil, e a diferença é de desenho de jogo.** Até
   * 07/09 o Fire Bolt era um círculo voando da mão do conjurador até o alvo em
   * 180 ms. A arte que o dono trouxe é a do Ragnarok: a bola aparece no céu,
   * cai, estoura no chão e dissipa. Por isso ela nasce ACIMA do alvo e não tem
   * origem no conjurador.
   *
   * 🔴 **UM `fx` POR BOLT, mandado quando aquela bola nasce** (10/09). Era um
   * aviso por CONJURAÇÃO, com a contagem de bolts em `n`, e o cliente abria
   * dali as dez bolas — todas no mesmo ponto do chão, e todas mesmo depois de o
   * alvo morrer. Agora cada bola chega com a posição da criatura NAQUELE
   * instante e com o `targetId` para persegui-la.
   *
   * ⚠️ O caminho de `n > 1` continua vivo: é ele que faria a folha de dez bolas
   * voltar a funcionar, e ela está pronta em disco (ver `folhasQueda`).
   *
   * 🔴 **A queda por impacto foi removida.** Ela vivia no `hit` com elemento de
   * fogo; mantê-la junto com esta faria a bola aparecer duas vezes.
   *
   * ⚠️ **O dano continua vindo dos `hit`, um por bolt, espaçados pelo
   * servidor.** Este bloco só desenha. É por isso que `INTERVALO_BOLT_MS` mora
   * no `shared`: o espaçamento das bolas na tela tem de ser o MESMO do
   * espaçamento do dano, senão a última cai depois do próprio estrago.
   */
  const quedas: Array<{
    node: AnimatedSprite; atraso: number; morto: boolean;
    /** Que coisa está caindo. Decide a força da batida — ver `TREMOR`. */
    magia: string;
    /** A criatura que esta bola persegue, quando o servidor disse qual é. */
    alvo?: string;
    /**
     * 💥 Quando a arte encosta no chão, para quem NÃO tem risco desenhado por
     * código. É o gatilho do tremor, dos estilhaços e do clarão. Ver `spawnQueda`.
     */
    batida?: {
      em: number; t: number; feita: boolean;
      /** Raio de dano em TILES, quando o servidor mandou. Ver o anel do impacto. */
      raioDano?: number;
    };
    /**
     * 🌫️ Apagar por alfa depois do último quadro, em vez de sumir de estalo.
     * `t` corre só depois que a animação termina. Ver `desvanece`.
     */
    apaga?: { em: number; t: number };
    /** 💥 O pulo de escala no instante da batida. Ver o gatilho em `batida`. */
    tranco?: { t: number; dur: number; base: number };
    /**
     * Raio de dano em TILES, quando o servidor mandou. É ele que dá tamanho ao
     * anel e às rachaduras — o desenho da folha tem o tamanho que tem.
     */
    raioDano?: number;
    /**
     * 🧪 **MODO RISCO** (ver `QUEDA_RISCO`): o traço desenhado por código que
     * cai antes do estouro. Ausente no modo folha, em que a própria animação já
     * contém a descida — e **apagado no impacto**, para não sobreviver a ele.
     */
    /**
     * 🧪 A coisa CAINDO, desenhada por código (um traço/rocha) ou pelos quadros
     * de voo da própria folha. Ver `trajetoria` em `FOLHAS_QUEDA`.
     */
    risco: {
      node: Container; t: number; deX: number; deY: number; dur: number;
      cresce?: readonly [number, number];
    } | undefined;
  }> = [];

  /**
   * 🧪 **Tremor de tela do impacto** — pedido no teste do Fire Bolt "risco".
   *
   * ⚠️ Somado à câmera DEPOIS do arredondamento dela, e não escrito em
   * `world.x`: o laço da câmera reescreve `world.x` todo quadro, então tremer
   * ali seria apagado no quadro seguinte. Ver o bloco da câmera.
   */
  let tremorAte = 0;
  /** Força do tremor em curso, em pixels. Ver `TREMOR`. */
  let tremorPx = 0;
  /** Duração do tremor em curso, para a queda ser proporcional. */
  let tremorDur = 1;

  /**
   * 💥 **A BATIDA DE CADA COISA QUE CAI.** Pixels e milissegundos.
   *
   * ⚠️ A rocha da Chuva sacode MUITO mais que a lança de um bolt, e tem de ser
   * assim: com 46 px de raio caindo, um tremor de 3 px passa despercebido e o
   * impacto lê como fraco — foi a queixa do dono (*"o impacto no chão ainda
   * pode ser um pouco mais forte"*).
   *
   * ⚠️ Mas não muito mais LONGO. São 18 meteoros a cada ~290 ms; um tremor de
   * meio segundo se emendaria no seguinte e a tela viraria borrão contínuo —
   * que é enjoo, não impacto. A força sobe, a duração quase não.
   */
  const TREMOR: Record<string, { px: number; ms: number }> = {
    meteor_fall: { px: 8, ms: 160 },
    /*
     * 🌠 **O avulso sacode mais que os da Chuva, pela mesma razão do relâmpago:**
     * lá são dezoito por conjuração e o tremor se emenda; aqui cai UM.
     */
    /*
     * ⚠️ **22 px, e eram 13** — *"mais forte o impacto"* (dono, 13/09, depois de
     * ver em tela). O tremor é o que diz PESO; o clarão diz onde. Treze pixels
     * num meteoro de nove tiles de largura lê como um tropeço.
     */
    meteor_solo: { px: 22, ms: 380 },
    /*
     * ❄️ A bola de neve mal sacode: são dez em 4,5 s, e o peso dela é o de uma
     * bola de neve. Tremor de meteoro aqui deixaria a tela em convulsão por
     * quatro segundos e meio.
     */
    snowball: { px: 2, ms: 70 },
    /*
     * ⛈️ **O relâmpago sacode MAIS que o meteoro, e é o único caso em que isso
     * se justifica.** Pedido do dono em 12/09: *"quero um impacto mais forte no
     * chão"*. A rocha da Chuva cai dezoito vezes por conjuração e um tremor
     * grande ali vira convulsão; o raio cai UMA vez, e a tela pode levar o
     * baque inteiro.
     *
     * ⚠️ **14 px, e eram 11.** Subiu na segunda passada do impacto (*"o toque do
     * raio no solo não está perfeito... dando sensação de impacto"*), junto com
     * o clarão em duas camadas e o tranco na escala. O tremor sozinho não
     * resolvia: ele avisa que bateu, mas não mostra ONDE.
     */
    lightning_fall: { px: 14, ms: 260 },
  };
  const TREMOR_PADRAO = { px: 3, ms: 90 };

  /**
   * As folhas disponíveis, por quantos bolts cada uma DESENHA.
   *
   * 🔴 É o que faz a arte por nível encaixar sem regra especial: chega a folha
   * de 10, entra na lista, e o nível 10 passa a usá-la sozinho. Enquanto ela
   * não existe, o nível 10 toca dez cópias da folha de 1 — que é exatamente o
   * que já estava no ar. **Degrada para o comportamento de ontem**, em vez de
   * degradar para uma bola só.
   */
  interface FolhaDeQueda {
    bolts: number; frames: Texture[];
    /** Onde a DESCIDA acaba dentro da tira. Ver `FOLHAS_QUEDA`. */
    fracaoQueda: number;
    /** Quanto o ESTOURO dura, em ms. `0` = o que sobrar de `DUR_QUEDA`. */
    duracaoEstouro: number;
    /** Como a folha se mistura ao mundo. Ver `mistura` em `FOLHAS_QUEDA`. */
    mistura: 'add' | 'normal';
    /** Quantos quadros do COMEÇO tocar. Ausente = a tira inteira. */
    quadrosUsados?: number;
    /** Quanto tempo o desenho leva para apagar depois do último quadro. */
    desvanece?: number;
    /** Desenha ACIMA das entidades, e não na camada do chão. Ver `porCima`. */
    porCima?: boolean;
    /**
     * Onde, na altura do quadro, fica o ponto que tem de cair NO TILE.
     * Ausente = 1 (o rodapé). Ver `ancoraY` em `FOLHAS_QUEDA`.
     */
    ancoraY?: number;
    /**
     * ☄️ **A DESCIDA desenhada pelos quadros da própria folha, na vertical.**
     *
     * `queda` é de quantos pixels acima do alvo a coisa nasce, e `cresce` a
     * escala do começo ao fim do mergulho. Ausente = a descida é o traço
     * desenhado por código (ver `FORMA_RISCO`).
     *
     * ⚠️ **Havia também uma versão DIAGONAL disto**, com `dist` e um giro
     * medido a partir do rumo nativo da arte; saiu em 13/09 quando o dono
     * trocou as oito folhas por direção por uma queda vertical só. O histórico
     * guarda o que ela fazia e o git guarda o código.
     */
    trajetoria?: { queda: number; cresce: readonly [number, number] };
  }
  const folhasQueda = new Map<string, FolhaDeQueda[]>();

  /**
   * Duração de uma queda inteira, do céu à dissipação.
   *
   * ⚠️ Quarto valor: 620 ms (rápido demais), 1000, 1600, agora **2400** — o
   * dono pediu mais lento em cada uma das três vezes que jogou. É o tempo de
   * UMA bola, do céu ao chão.
   *
   * 🔴 A 2400 a bola dura bem mais que o intervalo de 140 ms entre uma e outra,
   * então as dez do nível 10 ficam quase todas no ar ao mesmo tempo — que é o
   * efeito de chuva de meteoros que a arte quer.
   *
   * 🔴 Isto **não** é a cadência dos bolts (`INTERVALO_BOLT_MS`, no `shared`).
   * Com a queda bem mais longa que o intervalo, as cópias se sobrepõem no ar —
   * chuva, não fila.
   *
   * ⚠️ O número mora no `shared` desde 09/09: o servidor usa o mesmo para
   * calcular até quando a magia fica em recarga.
   */
  const DUR_QUEDA = DUR_QUEDA_MS;

  /*
   * ⚠️ Carregadas em paralelo, sem `await`: são enfeite, e travar a entrada no
   * mundo por causa delas seria trocar efeito por tempo de carga. Faltando
   * todas, nada anima e o dano continua igual — que é o que importa.
   *
   * ⚠️ A de 10 ainda NÃO EXISTE no disco. Está listada de propósito: o dia em
   * que o arquivo chegar, ela entra sem tocar em código. `catch` silencioso é o
   * que permite isso.
   */
  /*
   * 🔴 **A folha de 10 saiu da lista em 08/09 — o dono não gostou dela em
   * tela.** *"Vamos manter igual estava antes."*
   *
   * ⚠️ **O arquivo e o conversor continuam**, de propósito: `firebolt10.png`
   * está gerado e commitado, e voltar a usá-lo é acrescentar uma linha aqui.
   * Apagar tudo faria a próxima tentativa recomeçar do zero — e a conversão
   * dela custou três erros medidos (ver o HISTORICO de 08/09).
   *
   * Com só a folha de 1, o nível 10 volta a tocar dez cópias dela, que é
   * exatamente o que estava no ar antes.
   */
  /*
   * ⚠️ **A contagem de quadros vem NA ENTRADA, e não de uma constante.** Era
   * `QUADROS_FX = 16` fixo, o que valia enquanto havia uma folha só; a arte de
   * 09/09 tem 24 e a do Cold Bolt tem 30, e um número fixo cortaria a tira no
   * lugar errado — sem erro, só com a animação picotada. É a mesma lição do
   * manifesto das folhas de buff.
   *
   * 🔴 **AGORA É POR MAGIA** (10/09): a chave `magia` é o `kind` que chega no
   * `fx`, e é ela que decide se a habilidade cai do céu ou desenha o efeito
   * geométrico. Enquanto havia uma folha só, "cai do céu" podia ser o literal
   * `'fire_bolt'` no meio do tratador; com a segunda, isso viraria uma lista de
   * ifs que envelhece a cada folha nova.
   */
  const FOLHAS_QUEDA = [
    /*
     * ⚠️ `fracaoQueda` é onde a DESCIDA acaba dentro da tira, e ela é MEDIDA em
     * cada folha — não é a mesma nas duas. No modo risco só o estouro é usado, e
     * cortar no lugar errado ou mostraria a bola caindo de novo (corte cedo
     * demais) ou comeria o começo da explosão (corte tarde demais).
     */
    {
      magia: 'fire_bolt', arquivo: 'firebolt24', bolts: 1, quadros: 24,
      fracaoQueda: 14 / 24, duracaoEstouro: 0,
    },
    /*
     * ❄️ O Cold Bolt (10/09). Trinta quadros: dezoito de descida em duas
     * fileiras de nove, e doze de estouro em duas de seis. Um golpe só na
     * ficha, então `bolts: 1` não é escolha — é o que a magia é.
     */
    {
      magia: 'cold_bolt', arquivo: 'coldbolt30', bolts: 1, quadros: 30,
      fracaoQueda: 18 / 30, duracaoEstouro: 0,
    },
    /*
     * 🌠 **O METEORO ganhou folha PRÓPRIA em 11/09.** Até então ele reusava a do
     * Fire Bolt ampliada 5,2× — e era exatamente isso que se via em tela: uma
     * explosão de bolt esticada, com o pixel cinco vezes maior que o do resto do
     * jogo. A folha nova tem 40 quadros desenhados no tamanho certo.
     *
     * ⚠️ **16 de queda e 24 de impacto**, daí a fração. No modo risco os 16
     * primeiros não tocam (a descida é o risco desenhado por código), mas ficam
     * na tira: no dia em que o risco sair, a queda já está pronta.
     *
     * ⚠️ **`duracaoEstouro` explícito, e 520 ms é um MEIO-TERMO medido em
     * tela.** Sem ele o estouro herdaria `DUR_QUEDA − quedaMs`, que no modo
     * risco dá o piso de 160 ms — 24 quadros em 160 ms são 7 ms por quadro, um
     * borrão. Mas 1100 ms, a primeira tentativa, foi pior: com 18 meteoros a
     * cada ~290 ms, quatro estouros ficam vivos ao mesmo tempo e a tela inteira
     * vira uma parede de fogo, sem se distinguir um impacto do outro.
     *
     * 🔴 A regra que sai disto: **o estouro não pode durar muito mais que o
     * intervalo entre meteoros**, senão a chuva deixa de ler como chuva. 520 ms
     * deixa dois no ar — o bastante para parecer contínuo, pouco para embolar.
     *
     * ⚠️ `meteor_fall` é um nome só desta queda, e não o `fx` do Meteoro avulso
     * (`meteor`). Reusar aquele faria mexer na chuva mudar a magia menor junto.
     */
    {
      magia: 'meteor_fall', arquivo: 'meteoro40', bolts: 1, quadros: 40,
      fracaoQueda: 16 / 40, duracaoEstouro: 520,
    },
    /*
     * 🌠 **O METEORO AVULSO, e ele é a MESMA folha da Chuva com outro uso.**
     *
     * Pedido do dono em 12/09: *"um meteoro veio de longe e atingiu esse
     * inimigo em cheio"* — e o contrário do que se quer, na frase dele: *"uma
     * pedra apareceu em cima do inimigo e explodiu"*.
     *
     * 🔴 **Duas entradas para um arquivo só, e é de propósito.** Na Chuva caem
     * dezoito por conjuração e cada uma é pequena; aqui cai UM, e ele é o
     * assunto da tela inteira. Mesma arte, escalas e tempos opostos — separar
     * por NOME é o que permite mexer num sem mexer no outro, e o comentário de
     * 11/09 já avisava disso.
     *
     * ⚠️ **`trajetoria` é o que diferencia os dois modos.** Com ela, os 16
     * quadros de voo da folha desenham a descida, em diagonal, crescendo. Sem
     * ela (a Chuva), a descida continua sendo a rocha desenhada por código.
     *
     * ⚠️ **A DIREÇÃO não mora aqui: ela sai da linha conjurador → alvo**, em
     * `spawnQueda`. Estes dois números dizem só a FORMA da entrada.
     *
     * ⚠️ **`dist` 420: o quanto ele recua ao longo dessa linha.** Treze tiles —
     * longe o bastante para ler como distância, perto o bastante para caber na
     * janela na maior parte dos lançamentos. A 620 (a primeira tentativa) ele
     * passava mais de meio mergulho fora da tela, e o dono pede que ele APAREÇA
     * pequeno e distante, não que só surja no fim.
     *
     * ⚠️ **`subida` 160: a altura EXTRA, somada em qualquer direção.** É ela que
     * garante que ele venha sempre do alto — sem isso, um alvo a leste faria o
     * meteoro entrar rasante, de lado, como se rolasse pelo chão.
     *
     * ⚠️ **Cresce de 0,25 a 1,15**, e o topo era 1,5 — *"reduza só um pouco o
     * tamanho do meteoro"*. Continua sendo quatro vezes e meia de crescimento,
     * que é o que dá a profundidade: uma pedra que atravessa a tela do mesmo
     * tamanho lê como adesivo deslizando.
     *
     * ⚠️ **1400 ms de estouro, e eram 900** — *"aproveite todos os frames do
     * sprite"*. São 24 quadros: a 900 ms cada um durava 37 ms, e as duas últimas
     * fileiras (a fumaça esfriando) passavam antes de serem vistas. A 1400 são
     * 58 ms por quadro, e a dissipação inteira aparece.
     */
    /*
     * ☄️ **A FOLHA VERTICAL, e ela substitui as oito por rumo** (13/09).
     *
     * 🔴 **Uma animação só para as oito direções, e a decisão é do dono**: *"vou
     * usar a mesma animação para todas as direções; o meteoro vai cair de cima da
     * área de conjuração"*. As oito folhas direcionais funcionaram e foram
     * cortadas — o histórico de 13/09 guarda o que elas custaram —, mas oito
     * desenhos é oito coisas para manter, e a queda vertical lê igual de qualquer
     * lado do mapa.
     *
     * 🔴 **A FOLHA NÃO TEM GRADE, e o cortador reenquadra quadro a quadro.** Ver
     * `tools/meteoro-grade2fx.mjs`: as fileiras da arte derivam, então cada
     * desenho é achado sozinho e ancorado pelo RODAPÉ. Com isso a descida sai do
     * desenho — cada quadro mostra o meteoro parado — e quem move é a
     * `trajetoria` daqui.
     *
     * ⚠️ **A folha foi TROCADA em 13/09, depois de a primeira rodar em tela**:
     * *"essa sprite ficou melhor, substitua a antiga por essa"*. A nova é 3×3 com
     * fundo PRETO (a anterior era 5×5 sobre cinza) e saiu limpa de primeira — o
     * cortador ganhou os dois casos, e o leitor de PNG ganhou RGB sem alfa.
     *
     * 🔴 **São 9 quadros, e só UM é de impacto.** A folha anterior tinha quatro.
     * O estouro passou a ser um quadro SEGURADO e apagando (`desvanece`), com o
     * peso vindo de fora: tremor, clarão, rachaduras e 28 estilhaços. Se o dono
     * achar o impacto curto, é aqui que se vê o porquê — não há mais desenho.
     *
     * ⚠️ **`queda: 640` são VINTE tiles de altura** — 430, 540 e agora 640, os
     * três pedidos do dono no mesmo dia (*"mais alto"*).
     *
     * 🔴 **E a TELA é o teto disto.** A 1,0× de zoom a janela mostra uns 24 tiles
     * na vertical, com o jogador no meio: sobram cerca de doze tiles (384 px)
     * acima do alvo. A 640, **40 % do mergulho acontece fora do quadro** — 208 ms
     * dos 520. A pedra entra em cena já em movimento, o que a esta velocidade lê
     * como *"veio de muito alto"*; o preço é que o começo da animação, onde a
     * nuvem se forma, o jogador não vê.
     *
     * ⚠️ **Daqui para cima o número deixa de comprar altura e passa a comprar só
     * espera.** Quem quiser mais céu de verdade precisa de mais JANELA — zoom
     * menor ou viewport maior —, não de mais pixels aqui.
     *
     * ⚠️ **`ancoraY: 0.88` é MEDIDO pelo cortador**, e é o mesmo nos DOIS sprites
     * — é ele que faz a pedra e a cratera caírem no mesmo ponto. O rodapé puro
     * (1) subiria o impacto quase dois tiles, que foi o defeito do relâmpago em
     * 12/09.
     *
     * ⚠️ **O estouro não tem sincronia para acertar à mão**: o dano chega quando
     * a pedra toca o chão, que é o fim do mergulho (`quedaMs`), e os dois lados
     * usam o mesmo número.
     *
     * 🌫️ **A NUVEM É APAGADA NO CORTE** (dono, 12/09: *"remove as nuvens do
     * terceiro em diante"*). Quem faz isso é o `veuFumaca` do
     * `meteoro-grade2fx`, e ele precisa saber onde a queda acaba — os quadros do
     * estouro têm de 28 a 40 % da massa acima da mesma linha, e essa nuvem é o
     * efeito. **O 14 do `fracaoQueda` abaixo é o mesmo número**, e vai na linha
     * de comando do cortador.
     *
     * ⚠️ **O TERCEIRO quadro guarda um resto de nuvem, e é limitação de método.**
     * O cortador ancora cada desenho pelo RODAPÉ dele, e nos dois primeiros
     * quadros não existe pedra: o rodapé é a própria nuvem. Um corte medido de
     * baixo para cima — que é o que mantém a rocha parada no tile — não alcança
     * uma nuvem que ESTÁ no rodapé. Do quarto em diante o céu sai limpo. Na
     * prática ninguém vê: 40 % do mergulho acontece fora da tela.
     *
     * 🔴 **E a FONTE muda a cada folha.** A quarta (`meteoro_vertical4.png`,
     * 7×4) substituiu a terceira (6×5). Recortar da errada não dá erro — dá
     * outro número de quadros, e foi assim que uma tira de 17 quase entrou no
     * lugar de uma de 27. Refazer o asset é:
     *
     *     node tools/meteoro-grade2fx.mjs arte-fonte/fx/meteoro_vertical4.png meteoro_queda 14 7 4
     */
    {
      magia: 'meteor_solo', arquivo: 'meteoro_queda', bolts: 1, quadros: 27,
      fracaoQueda: 14 / 27, duracaoEstouro: 560, desvanece: 180, ancoraY: 0.88,
      /*
       * ☄️ **A pedra já ENTRA grande, e cresce pouco.** Pedido do dono em 13/09:
       * *"pode ser o meteoro um pouco menor e a animação já saindo um meteoro
       * grande das nuvens"*.
       *
       * ⚠️ **O crescimento vem de dois lados, e na folha nova a arte quase não
       * cresce**: medida, a largura desenhada vai de 1,05 a 0,90 da célula — o
       * que cresce ali é a ALTURA do rastro (83 para 218 px). Então o pouco de
       * aproximação que se vê vem daqui.
       *
       * ✅ 0,55 a 0,75 são FRAÇÕES DO ESTOURO: a pedra entra com 55 % do tamanho
       * da explosão e chega com 75 %. São 1,4× do começo ao fim — longe dos 3,7×
       * que fizeram o dono reclamar de *"crescendo muito no final"*.
       *
       * 🔴 **É AQUI que se mexe quando a queixa é sobre a QUEDA**, e não em
       * `ESCALA_IMPACTO`. *"Estou achando ele muito grande na queda"* (dono,
       * 13/09) fala da pedra viajando, não da explosão: os dois compartilham a
       * régua desde que o degrau foi consertado, mas `cresce` é o que separa um
       * do outro. Baixar a régua encolheria a cratera junto, que ele já aprovou.
       */
      trajetoria: { queda: 640, cresce: [0.55, 0.75] },
      /*
       * 🔴 **MISTURA NORMAL, e é a segunda folha do jogo com ela.**
       *
       * O dono viu em tela: *"ele está muito transparente… aparecendo as nuvens
       * que mandei também"*. As duas queixas são a MESMA: soma aditiva só sabe
       * CLAREAR. A pedra é escura e a fumaça é cinza — somadas à grama, quase não
       * mudam nada, e o que sobra é o contorno aceso. Era o mesmo defeito da
       * nuvem do relâmpago, em 12/09.
       *
       * ⚠️ O preço é o recorte ficar exposto: em soma, um alfa mal medido só
       * clareia de leve; em mistura normal, ele TAPA o mundo. É por isso que a
       * chave do cortador mudou junto — ver `meteoro-grade2fx.mjs`.
       */
      mistura: 'normal' as const,
    },
    /*
     * ❄️ A BOLA DE NEVE da Nevasca. A folha do dono é uma coluna de gelo que
     * cresce (0–8), gira (9–26) e some (27–35).
     *
     * ⚠️ `fracaoQueda: 0` porque NENHUM quadro dela é queda: a bola descendo é o
     * risco desenhado por código, e a folha inteira é o que acontece DEPOIS que
     * ela toca o chão. Nas outras duas folhas a descida vem desenhada, e é por
     * isso que lá a fração corta.
     *
     * ⚠️ E ela precisa de mais tempo em cena que um estouro: uma coluna de gelo
     * que sobe e some em 160 ms não se lê. Ver `duracaoEstouro`.
     */
    {
      magia: 'snowball', arquivo: 'nevasca36', bolts: 1, quadros: 36,
      fracaoQueda: 0, duracaoEstouro: 900,
    },
    /*
     * ⛈️ **O RELÂMPAGO da Descarga Elétrica**, 24 quadros em 3 fileiras.
     *
     * 🔴 **A folha conta a magia INTEIRA, e o dono mandou olhar isso:** *"observe
     * desde o início do sprite, a formação da nuvem e do raio até a descarga
     * final"*. São três atos, e os tempos abaixo existem para cada um ser visto:
     *
     *   quadros  1–8   a NUVEM se juntando, com o raio ainda preso dentro dela
     *   quadros  9–15  a DESCARGA, do céu ao chão, com o estouro no solo
     *   quadros 16–24  a DISSIPAÇÃO
     *
     * 🔴 **`fracaoQueda: 0` porque nenhum quadro se descarta.** Não há "descida"
     * separada do "estouro" para cortar: os 24 são a coisa toda, em ordem.
     *
     * ⚠️ É o mesmo `0` da bola de neve por motivos OPOSTOS: lá nenhum quadro é
     * queda porque a descida é o risco desenhado por código; aqui nenhum é
     * descartado porque a descida está desenhada e o risco não existe. Ver
     * `FORMA_RISCO`.
     *
     * ⚠️ **1200 ms, e eram 900.** Com 900 a nuvem se formava em 300 ms — rápido
     * demais para o ato que o dono mandou observar. A 1200 ela leva 400 ms, a
     * descarga fica no ar de 400 a 750, e a dissipação tem os 450 que faltavam
     * para não sumir de estalo.
     *
     * ⚠️ **O raio toca o chão no quadro 9 de 24**, ou 33 % da animação. É daí
     * que sai o `quedaMs: 400` da ficha — o dano sai quando ele encosta, e nem
     * um instante antes.
     */
    /*
     * 🔴 **`mistura: 'normal'`, e é a única folha do jogo assim.**
     *
     * Defeito relatado pelo dono em 12/09: *"está ruim as nuvens"*. A causa foi
     * medida, e é a mistura ADITIVA: a nuvem desta arte tem cor média
     * `rgb(52,75,122)` — azul-escuro —, e somar isso ao gramado `rgb(63,90,52)`
     * dá `rgb(115,165,174)`. Uma nuvem de tempestade escura vira um **borrão
     * cinza-claro**, e não há como ser diferente: soma só clareia.
     *
     * ✅ Em mistura normal ela fica `rgb(53,77,113)` — escura, como foi
     * desenhada. E o raio não perde nada: o núcleo branco continua branco, e o
     * brilho azul já vem pintado na folha.
     *
     * ⚠️ **As outras folhas continuam aditivas de propósito**, e a nota de 09/09
     * explica por quê: elas foram recortadas com alfa CHEIO (`contato2fx`), e
     * desenhá-las por cima traria o próprio preto junto. Esta chegou com alfa de
     * verdade — é o que permite a exceção.
     */
    /*
     * 🔴 **SÓ OS 15 PRIMEIROS QUADROS TOCAM, e os 9 do fim ficam na folha.**
     *
     * Defeito relatado pelo dono em 12/09: *"pouco antes da magia terminar o
     * raio começa a ficar menor; não precisa, assim que ele cair pode
     * desaparecer naturalmente, sem precisar encolher"*.
     *
     * A causa está na ARTE: a terceira fileira da folha (a dissipação) está
     * desenhada em cerca de METADE do tamanho — medido, a distância da nuvem ao
     * chão cai de ~404 px para ~200. Alinhada pelo chão, como tem de ser, ela
     * encolhe em tela. Não é erro de corte: é o que a folha desenha.
     *
     * ✅ A animação para no fim da descarga (quadro 15) e o desenho APAGA por
     * alfa em 350 ms. É o *"desaparecer naturalmente"* — some sem retrair.
     *
     * ⚠️ **Os nove quadros continuam no arquivo, de propósito.** É a mesma
     * decisão do `firebolt10.png` em 08/09: voltar a usá-los é acrescentar uma
     * linha aqui, e apagar a arte faria a próxima tentativa recomeçar do zero.
     *
     * ⚠️ **1050 ms para 15 quadros**, e eram 750 — *"pode durar um pouco mais a
     * queda e os danos"* (dono, 12/09). Dá 70 ms por quadro, contra os 50
     * anteriores. O raio encosta no chão no quadro 9, ou **560 ms**, e é esse o
     * `quedaMs` da ficha: os dois números são a mesma decisão em dois lados.
     *
     * 🔴 **`porCima`: este é o único efeito de queda desenhado ACIMA das
     * entidades.** Ver a nota em `spawnQueda` — a regra de baixo foi tomada para
     * o meteoro, que é um estouro largo no chão; aqui é uma coluna de 16 tiles
     * de altura, e por baixo qualquer bicho ao norte do impacto a cortava ao
     * meio. *"O raio tem que atravessar os inimigos."*
     */
    {
      magia: 'lightning_fall', arquivo: 'relampago24', bolts: 1, quadros: 24,
      fracaoQueda: 0, duracaoEstouro: 1050, mistura: 'normal',
      quadrosUsados: 15, desvanece: 350, porCima: true,
      /*
       * 🔴 **0,885, e o padrão (1) punha o impacto DOIS TILES no ar.**
       *
       * Defeito relatado pelo dono em 12/09, com foto: *"quero que o toque
       * atravesse esse inimigo e acerte o solo"* — o estouro aparecia flutuando
       * acima do monstro.
       *
       * A âncora de toda queda é o RODAPÉ do quadro, e isso vale enquanto o
       * desenho termina onde ele bate. Aqui não termina: medido na saída, o
       * núcleo branco do impacto fica a **88,5 % da altura**, e os 11,5 % de
       * baixo são o BRILHO ESPALHANDO no chão. Ancorado no rodapé, o núcleo
       * subia 68 px — dois tiles.
       *
       * ⚠️ **O tremor, os estilhaços e o anel já estavam no lugar certo**: os
       * três usam a posição da ÂNCORA, que sempre foi o tile. Quem estava fora
       * era só a arte — e é por isso que o impacto "não batia" mesmo com as
       * quatro camadas de peso que entraram antes.
       */
      ancoraY: 0.885,
    },
  ] as const;

  /**
   * As magias que CAEM DO CÉU, declaradas.
   *
   * ⚠️ **Não dá para perguntar ao mapa `folhasQueda`**, e a diferença é de
   * tempo: as folhas carregam sem `await`, então nos primeiros segundos de
   * mundo o mapa está vazio. Um `fx` que chegasse nessa janela cairia no
   * desenho geométrico — a magia certa, com o efeito da errada, uma vez a cada
   * vinte. O conjunto é estático e não tem essa janela.
   */
  const MAGIAS_QUE_CAEM = new Set<string>(FOLHAS_QUEDA.map((f) => f.magia));

  for (const folha of FOLHAS_QUEDA) {
    void Assets.load<Texture>(`/assets/fx/${folha.arquivo}.png`)
      .then((tex) => {
        /*
         * ⚠️ **`linear`, e não `nearest`.** Era `nearest` quando a folha vinha
         * do conversor no tamanho exato da tela (64 px desenhados em 64). A
         * arte de 09/09 é recortada em 128 para guardar detalhe e desenhada
         * menor — e vizinho-mais-próximo num ENCOLHIMENTO come metade das
         * fagulhas, que têm um pixel de largura.
         */
        tex.source.scaleMode = 'linear';
        /*
         * 🔴 **A CÉLULA NÃO É 64×64 EM TODAS.** A folha do nível 10 é 64×256:
         * o quadro de origem é alto e estreito, e espremê-lo num quadrado
         * transformava as três bolas num borrão de 5 px (ver `fx2strip.mjs`).
         *
         * 🔴 Por isso a leitura é **pela contagem, não pelo tamanho**: a
         * largura da célula sai de dividir a tira pelo número de quadros
         * declarado na entrada, e a altura é a da imagem. Dividir por 64 aqui
         * cortaria a folha alta em quatro fatias de personagem nenhum.
         */
        /*
         * ☄️ **`quadros: 0` = conte pela TEXTURA, não pela ficha.**
         *
         * 🔴 As folhas direcionais do Meteoro saem com contagens diferentes umas
         * das outras — medidas, 24, 24, 24 e 21 nas quatro primeiras, porque o
         * gerador não repete o número de quadros entre as variações. Declarar
         * cada uma à mão seria oito números copiados, e mais oito a cada folha
         * regerada; e um número errado aqui não dá erro: corta a tira no lugar
         * errado e a animação sai picotada, em silêncio.
         *
         * ✅ O `meteoro2fx` emite sempre células QUADRADAS, então a contagem é
         * `largura ÷ altura`. É a única folha do jogo com essa garantia, e é por
         * isso que a opção existe em vez de valer para todas.
         */
        const quantos = folha.quadros > 0
          ? folha.quadros
          : Math.max(1, Math.round(tex.width / tex.height));
        const cw = Math.max(1, Math.round(tex.width / quantos));
        const ch = tex.height;
        const lista = folhasQueda.get(folha.magia) ?? [];
        lista.push({
          bolts: folha.bolts,
          fracaoQueda: folha.fracaoQueda,
          duracaoEstouro: folha.duracaoEstouro,
          mistura: 'mistura' in folha ? folha.mistura : 'add',
          ...('quadrosUsados' in folha ? { quadrosUsados: folha.quadrosUsados } : {}),
          ...('desvanece' in folha ? { desvanece: folha.desvanece } : {}),
          ...('porCima' in folha ? { porCima: folha.porCima } : {}),
          ...('ancoraY' in folha ? { ancoraY: folha.ancoraY } : {}),
          ...('trajetoria' in folha ? { trajetoria: folha.trajetoria } : {}),
          frames: Array.from({ length: quantos }, (_, i) => new Texture({
            source: tex.source,
            frame: new Rectangle(i * cw, 0, cw, ch),
          })),
        });
        // Maior primeiro: `folhaPara` pega a primeira que couber.
        lista.sort((a, b) => b.bolts - a.bolts);
        folhasQueda.set(folha.magia, lista);
      })
      .catch(() => { /* folha ausente: o registro simplesmente não a tem */ });
  }

  /**
   * 🖼️ **AS FOLHAS DE EFEITO DO PACOTE DE BUFFS** (09/09).
   *
   * ⚠️ **A contagem de quadros vem do MANIFESTO, não de uma constante.** A tira
   * do Fire Bolt podia assumir `QUADROS_FX` colunas fixas porque era uma só;
   * aqui três efeitos têm dezesseis quadros e três têm doze, e um número fixo
   * cortaria metade dos arquivos no lugar errado — sem erro nenhum, só com a
   * animação picotada.
   */
  const folhasEfeito = new Map<string, Texture[]>();
  for (const [nome, quadros] of Object.entries(FOLHAS_FX)) {
    void Assets.load<Texture>(`/assets/fx/${nome}.png`)
      .then((tex) => {
        const cw = Math.max(1, Math.round(tex.width / quadros));
        folhasEfeito.set(nome, Array.from({ length: quadros }, (_, i) => new Texture({
          source: tex.source,
          frame: new Rectangle(i * cw, 0, cw, tex.height),
        })));
        /*
         * 🎯 O destino pedido enquanto esta folha ainda carregava. Ver
         * `marcadorPendente`: sem isto, um clique nos primeiros instantes de
         * mundo andaria sem marcador algum.
         */
        if (nome === MARCADOR.folha && marcadorPendente) {
          const p = marcadorPendente;
          marcadorPendente = undefined;
          marcaDestino(p.tileX, p.tileY);
        }
      })
      .catch(() => { /* folha ausente: o efeito simplesmente não toca */ });
  }

  /** Quanto dura a animação de um efeito de buff, do primeiro quadro ao último. */
  const DUR_EFEITO = 900;

  /**
   * Toca uma folha de efeito num ponto do mundo.
   *
   * ⚠️ Ancorada em `0.5, 0.72` e NÃO no rodapé: o desenho tem um anel no chão e
   * asas subindo acima dele, e o anel — que é o que tem de cair nos pés — está a
   * 72% da altura do quadro (medido: y=64..110 num quadro de 120). Ancorar na
   * base jogaria o anel 26 px acima do personagem.
   */
  /**
   * ❄️ **As folhas que NÃO são de buff**, com âncora, escala e tempo próprios.
   *
   * A tabela existe porque os seis efeitos originais são todos do mesmo pacote —
   * mesmo tamanho, mesmo anel no chão, mesma duração — e a Explosão Glacial não
   * é: ela é uma explosão radial de 192 px que tem de cobrir cinco tiles e
   * estourar em 700 ms.
   */
  const FOLHA_FEITIO: Record<
    string, {
      ancoraY: number;
      /**
       * ⚠️ **Âncora em X, e o padrão 0,5 não serve para toda arte.** Na folha dos
       * espinhos o PÉ da explosão não fica no meio da célula: fica a 0,287 dela,
       * porque os cristais crescem para um lado só. Centrar no meio poria o
       * personagem fora da própria explosão.
       */
      ancoraX?: number;
      escala: number;
      dur: number;
      sobeY?: number;
      /**
       * ⚠️ **Desenha na camada do CHÃO, sob as entidades.** Pedido da ficha
       * (*"abaixo do personagem, acima do terreno"*) e é o certo para uma
       * explosão que nasce do solo: por cima, ela taparia o mago que está no
       * meio dela.
       */
      noChao?: boolean;
    }
  > = {
    /*
     * ⚠️ **Âncora 0,5 na vertical, e não 0,72.** O cortador (`nova2fx`) centra
     * cada quadro no NÚCLEO do estouro — o clarão —, então o ponto que tem de
     * cair nos pés do mago é o meio do quadro. Os 0,72 dos buffs existem porque
     * lá o anel fica a 72 % da altura; aqui isso jogaria o gelo para cima.
     *
     * 🔴 **Escala 0,95, e era 1,7.** A folha foi trocada em 13/09 por um ANEL, e
     * o pedido veio com ela: *"ela deve ser só em volta do personagem"*. A arte
     * velha era um estouro que se justificava grande; a nova tem um buraco no
     * meio por onde o mago aparece, e esse buraco só funciona se o anel couber
     * perto dele.
     *
     * ⚠️ 182 px são 5,7 tiles, contra os 5×5 (160 px) que a magia machuca — a
     * margem de drama de sempre, e nada além dela. A 1,7 o anel tinha dez tiles:
     * o mago ficava perdido dentro de um círculo de gelo do tamanho da tela.
     *
     * ⚠️ **A escala sobreviveu a TRÊS trocas de folha porque o BURACO é medido.**
     * O anel tinha vão de raio 38–41 px em quadros de 192; os cristais que
     * vieram depois medem de 41 a 55. A 0,95 isso dá de 2,4 a 3,3 tiles de
     * diâmetro livre, e o herói tem 38 px desenhados. Toda folha nova precisa
     * dessa medida ANTES de mexer na escala; a escala aqui é razão entre arte e
     * tile, e não quer dizer nada sozinha.
     *
     * ⚠️ **`dur` anda junto com a CONTAGEM, não sozinho:** 800 ms para 24
     * quadros são 33 ms cada. Se a folha mudar de contagem, este número muda
     * também, senão as últimas fileiras — aqui, a névoa que sobra do gelo —
     * passam antes de serem vistas. Foi a queixa do dono no estouro do Meteoro
     * (*"aproveite todos os frames"*).
     */
    /*
     * 🔴 **`sobeY` existe porque "centro do personagem" NÃO é onde ele pisa.**
     *
     * Dono, 12/09, com a magia já rodando: *"ainda não está no centro do
     * personagem"*. O efeito chegava centrado onde devia — o `fx` traz o TILE do
     * conjurador, e `tocaEfeito` recebia o rodapé dele. Só que o herói é
     * desenhado PARA CIMA a partir dos pés, então um anel centrado nos pés fica
     * com o corpo todo na metade de cima do buraco.
     *
     * ✅ **16 px são MEDIDOS, não arredondados por sorte:** a célula da folha de
     * classe é 16 px (`CELL`, `miniworld.ts`), a escala do herói é 2,4 e a âncora
     * dele é 0,92 — 38,4 px desenhados, dos quais 0,42 ficam acima do ponto de
     * apoio. Dá 16,1 px, e o meio tile é a mesma coisa até o pixel.
     *
     * ⚠️ **Quem mudar o tamanho do herói invalida este número.** Ele é uma razão
     * entre o desenho do personagem e o tile — a mesma família de `ESCALA_IMPACTO`,
     * que já perseguiu cinco folhas do Meteoro. Se o herói crescer, isto cresce.
     *
     * 🔴 **FOI A ZERO E VOLTOU, e o caminho vale mais que o número.**
     *
     * Com os cristais novos (*"esfinges que saem do chão"*, *"têm que sair
     * diretamente do chão para parecer que são forjadas na magia"*) eu zerei
     * isto: um círculo de cristais é CHÃO, e a base deles tem de encostar onde o
     * mago pisa. O raciocínio estava certo e a conclusão, errada — porque eu
     * tinha respondido a pergunta errada.
     *
     * ✅ **MEDIDO em 12/09, capturando o jogo quadro a quadro:** a roda sai
     * centrada nos pés com erro de **1 px** (caixa do gelo 62–239 × 77–255, centro
     * 150,5/166,0 contra 150/166 dos pés). Ou seja: a magia SEMPRE esteve
     * centrada onde o dono pisa. O que não está centrado é o HERÓI — ele é
     * desenhado para cima a partir dos pés, ocupa de −35 a +3 px, e o meio do
     * corpo dele fica 16 px acima do meio da roda. *"Centralizada no personagem"*
     * e *"centrada no tile"* são dois lugares diferentes, e o dono pede o
     * primeiro.
     *
     * ⚠️ **E os 16 px nunca tinham chegado à tela.** Eu os pus, a arte mudou
     * minutos depois, e eu os tirei antes que ele visse — então a queixa que veio
     * a seguir era sobre o mesmo defeito de antes, não sobre o conserto.
     *
     * ⚠️ **O preço é meio tile, e é invisível:** a roda tem 2,75 tiles de raio, e
     * subir 16 px desloca o círculo de chão meio tile ao norte. Num jogo visto de
     * cima, sem perspectiva, isso não lê como "o gelo nasceu no ar" — lê como o
     * mago no meio da roda, que é o pedido.
     */
    /**
     * ❄️ **ESPINHOS DE GELO — a quarta arte da Glacial, e a primeira que NASCE do
     * chão de verdade** (ficha do dono, 12/09). As três anteriores eram anéis
     * vistos de cima; esta é uma explosão que brota do solo e se abre.
     *
     * 🔴 **ÂNCORA NO PÉ, medida pelo cortador: 0,287 / 0,946.** Não é o meio da
     * célula, e não podia ser: os cristais crescem para UM lado, então o halo do
     * chão — o ponto que fica sob o mago — vive a 29 % da largura. Ver
     * `espinhos2fx`, que mede isso quadro a quadro porque na folha o pé anda de
     * 82 a 123 px dentro de cada desenho.
     *
     * ⚠️ **`sobeY: 0` e `noChao`.** Explosão que sai do solo pertence à camada do
     * solo, e o mago fica em pé DENTRO dela — era o pedido literal da ficha
     * ("abaixo do personagem", "sem esconder o personagem"). É também o oposto
     * do anel anterior, que flutuava e por isso subia meio tile.
     *
     * 🔴 **E o `geloDoChao` FOI EMBORA com ela.** Aquelas fendas desenhadas por
     * código existiam porque o anel anterior não encostava no chão; esta arte
     * traz o próprio halo. Somar as duas seria desenhar duas vezes a mesma
     * ideia — as "partículas exageradas" que a ficha proíbe —, e deixar a função
     * sem quem a chame seria pior: código que ninguém executa é a família de
     * defeito que mais se repete neste projeto.
     *
     * ⚠️ **Escala 0,75, MEDIDA nos quadros e não estimada na célula.** O alcance
     * do desenho a partir do pé vai a 182 px no quadro do ápice, mas os quadros
     * TÍPICOS ficam em 116 — e é por eles que a magia é vista, não pelo pico. A
     * 0,5 o típico dava 1,8 tile e sumia atrás do mago; a 0,75 dá 2,7, com o
     * ápice em 4,3.
     *
     * 🔴 **E a direção do erro é conhecida:** o marcador de destino foi
     * 0,5 → 0,65 → 0,98 em três rodadas, sempre para cima, porque arte de CHÃO
     * parece maior na folha do que fica em tela. Aqui já entrou corrigida.
     *
     * ⚠️ O raio do DANO continua vindo da ficha da skill — 2 tiles —, nunca do
     * tamanho da imagem. São dois números de propósito, como a ficha pede.
     *
     * ⚠️ **1000 ms para 17 quadros** (59 ms cada), que é o ritmo sugerido na
     * ficha — e são 17, não 14: a folha foi medida, não contada no olho.
     */
    glacial_burst: {
      ancoraX: 0.287, ancoraY: 0.946, escala: 0.75, dur: 1000, sobeY: 0, noChao: true,
    },
  };

  function tocaEfeito(nome: string, wx: number, wy: number): void {
    const frames = folhasEfeito.get(nome);
    if (!frames) return;
    const feitio = FOLHA_FEITIO[nome];
    const node = new AnimatedSprite(frames);
    node.loop = false;
    node.anchor.set(feitio?.ancoraX ?? 0.5, feitio?.ancoraY ?? 0.72);
    if (feitio) node.scale.set(feitio.escala);
    node.x = wx;
    // ⚠️ `sobeY` sobe o efeito dos PÉS para o meio do corpo. Ver `FOLHA_FEITIO`.
    node.y = wy - (feitio?.sobeY ?? 0);
    // ⚠️ Chão: sob as entidades, como o estouro do Meteoro. Ver `noChao`.
    node.zIndex = feitio?.noChao ? -0.55 : 9997;
    node.animationSpeed = frames.length / ((feitio?.dur ?? DUR_EFEITO) / (1000 / 60));
    (feitio?.noChao ? objects : fxLayer).addChild(node);
    /*
     * ⚠️ Entra na MESMA lista das quedas, com atraso zero. O laço de lá já
     * dispara o `play()` e destrói no fim; uma lista própria seria uma segunda
     * cópia da mesma limpeza, e é assim que uma delas fica sem varrer.
     */
    node.visible = false;
    // ⚠️ Efeito de folha (buff, cura): entra na mesma lista, mas não cai nem
    // sacode a tela. `magia` vazio cai no tremor padrão, que nunca é acionado
    // porque não há `risco` para tocar o chão.
    const q = { node, atraso: 0, morto: false, magia: '', risco: undefined };
    node.onComplete = () => { q.morto = true; };
    quedas.push(q);
  }

  /** A folha desta magia que melhor representa `n` bolts, ou a menor que há. */
  function folhaPara(
    magia: string, n: number,
  ): FolhaDeQueda | null {
    const lista = folhasQueda.get(magia);
    if (!lista || lista.length === 0) return null;
    return lista.find((f) => f.bolts <= n) ?? lista[lista.length - 1]!;
  }

  /**
   * Solta uma bola de fogo caindo sobre um ponto do mundo.
   *
   * ⚠️ Ancorada em BAIXO e no centro (`anchor(0.5, 1)`): nos últimos quadros a
   * explosão fica na base da célula, e é ela que tem de cair no tile. Ancorar
   * no meio deixaria o estouro meio tile acima do alvo.
   */
  /**
   * Quanto do quadro aparece na tela.
   *
   * ⚠️ O quadro é recortado com 128 px de largura — quatro tiles — para a arte
   * caber com folga na tira. Desenhado assim ele cobriria um quarto da tela;
   * a 0,625 ele fica com 80 px, dois tiles e meio, que é a altura do
   * personagem. A folga extra do recorte vira nitidez, não tamanho.
   */
  const ESCALA_QUEDA = 0.625;

  /**
   * 🧪 **A COR DO RISCO, por magia.** Três tons do mais externo ao núcleo.
   *
   * ⚠️ **O núcleo é quase branco nas duas, e é de propósito.** Na mistura
   * aditiva o que dá a sensação de "quente" ou "frio" é a BORDA; um núcleo
   * colorido só faz o traço perder o brilho de coisa incandescente. O Cold Bolt
   * fica gelado pelo azul das bordas, não por um miolo azul.
   *
   * ⚠️ Magia sem entrada aqui cai no fogo. É o que existia antes de haver
   * tabela, e é melhor que um traço invisível.
   */
  const CORES_RISCO: Record<string, [number, number, number]> = {
    fire_bolt: [0xd8501a, 0xffa03c, 0xfff2d0],
    cold_bolt: [0x1a58d8, 0x5ac8ff, 0xeaf8ff],
    // 🌠 Meteoro: mais vermelho e mais escuro que o bolt — é pedra em brasa,
    // não chama pura.
    meteor_fall: [0xa03010, 0xff7a20, 0xffe0a0],
    // ❄️ Bola de neve: azul-gelo com núcleo branco, como a folha da Nevasca.
    snowball: [0x2a6ad0, 0x8fd8ff, 0xf2fbff],
  };

  /**
   * 🌠 **A FORMA do que cai — e são duas coisas diferentes.**
   *
   * - `lanca`: o risco fino do Fire Bolt e do Cold Bolt. Um traço vertical.
   * - `esfera`: o meteoro. Uma ROCHA EM CHAMAS — cabeça redonda com rastro
   *   atrás, e não um traço grosso.
   *
   * 🔴 **Engrossar a lança não faz um meteoro.** Foi a primeira tentativa (um
   * fator de espessura de 2,2) e o resultado se lê como raio gordo: o olho
   * procura um CORPO caindo, e um retângulo não tem corpo por mais largo que
   * seja. O que dá volume é a cabeça circular com o rastro afinando atrás.
   */
  const FORMA_RISCO: Record<string, 'lanca' | 'esfera' | 'nenhuma'> = {
    meteor_fall: 'esfera',
    // ❄️ Bola de neve é bola: cabeça redonda com rastro curto.
    snowball: 'esfera',
    /*
     * ⚡ **`nenhuma`: o Relâmpago não tem risco porque ELE É o risco.**
     *
     * O traço desenhado por código existe para suprir a falta de arte de
     * descida — foi o que o Fire Bolt e o meteoro precisaram. A folha do
     * relâmpago já traz a coluna caindo, quadro a quadro, e é o desenho
     * principal da magia. Somar uma lança por cima seria desenhar duas quedas
     * no mesmo lugar.
     */
    lightning_fall: 'nenhuma',
    /*
     * ☄️ **O Meteoro avulso não aparece aqui, e é de propósito**: quem desenha a
     * descida dele é a `trajetoria` da folha, e esse caminho é testado ANTES
     * desta tabela. A Chuva (`meteor_fall`) continua com a rocha de código, e
     * não é descuido — lá caem dezoito por conjuração e cada uma é pequena; a
     * folha nova desenha UM meteoro ocupando a tela.
     */
  };

  /**
   * Raio da cabeça do meteoro, em pixels de mundo.
   *
   * ⚠️ **Terceiro valor: 15 → 34.** Os 15 pareciam grandes na conta (quase um
   * tile de diâmetro) e pequenos EM TELA, e o motivo é a comparação: a rocha
   * não é lida contra o tile, é lida contra o CÍRCULO DA TEMPESTADE, que tem
   * 4 tiles de raio. Ao lado de 144 px de círculo, 15 px de rocha somem.
   *
   * A 34 o diâmetro é ~68 px — pouco menos da metade do raio do círculo, que é
   * a proporção em que uma rocha lê como rocha e não como fagulha.
   */
  const RAIO_METEORO = 46;

  /**
   * Raio da cabeça de cada coisa esférica que cai. Ausente = `RAIO_METEORO`.
   *
   * ⚠️ A bola de neve é bem menor que a rocha: ela cobre 3×3 células, contra as
   * ~5×5 do meteoro, e o risco que cai tem de anunciar esse tamanho.
   */
  const RAIO_ESFERA: Record<string, number> = {
    snowball: 20,
    /*
     * 🌠 **24, e o padrão era 46 — metade.** Mudou quando o meteoro ganhou folha
     * própria (11/09). A rocha desenhada por código tinha cabeça de 92 px e
     * rastro de 230 (`R × 5`); com dezoito caindo juntas, o que se via em tela
     * era uma parede de riscos amarelos, e a explosão nova ficava por baixo
     * deles.
     *
     * 🔴 **O risco existia para SUPRIR a falta de arte de queda, e agora ela
     * existe** — são os 16 primeiros quadros da folha, hoje sem uso. Encolher é
     * o remendo; ver o pendente no handoff sobre trocá-lo pela arte.
     */
    meteor_fall: 24,
  };

  /**
   * Quanto o ESTOURO de cada magia é maior que o padrão da folha.
   *
   * ⚠️ Escala isotrópica (o mesmo fator em x e y), e isto importa: escalar só
   * um eixo é o que deixa a explosão OVAL, que foi a queixa do dono.
   */
  const ESCALA_IMPACTO: Record<string, number> = {
    /**
     * 🌠 **2,0, e era 5,2 — mas a conta não é a que parece.**
     *
     * A célula CRESCEU (a folha do Fire Bolt tinha 128 px de largura, a nova tem
     * 192), então só para manter a pegada antiga bastaria 3,45 — `0,625 × 3,45 ×
     * 192` dá os mesmos 414 px de antes. Foi o que entrou primeiro, e em tela
     * ficou claro que a pegada antiga era o problema.
     *
     * 🔴 **O respingo do meteoro é raio 2, ou 160 px.** A 414 px a explosão era
     * dois vezes e meia maior que a área que ela machuca — exatamente a queixa
     * que o dono já tinha feito de outro jeito: *"são bem grandes, mas parece
     * que acertam somente um pequeno ponto ao tocar o solo"*. A arte esticada
     * escondia isso; a arte de verdade deixou à vista.
     *
     * ⚠️ 2,0 dá 240 px: uma vez e meia o quadrado de dano. Sobra drama sem
     * mentir sobre onde o golpe pega.
     */
    meteor_fall: 2.0,
    /*
     * 🌠 **O Meteoro avulso estoura MAIOR que os da Chuva**, e a conta é a área:
     * ele pega um bloco 7×7 (224 px) contra o respingo 5×5 (160 px) de cada
     * rocha da chuva.
     *
     * 🔴 **A CÉLULA ENCOLHEU junto com a folha nova, e o número teve de mudar.**
     * O 2,1 antigo valia para células de 192 px de largura; a folha vertical de
     * 13/09 tem 144, e os mesmos 2,1 passaram a dar 189 px de estouro contra os
     * 252 de antes — menor que o próprio quadrado de dano. É por isso que o
     * número mora aqui e não na folha: ele é uma razão entre a arte e o TILE, e
     * toda folha nova o desatualiza em silêncio.
     *
     * ⚠️ **1,55 dá 174 px, cinco tiles e meio — bem MENOS que o quadrado de
     * dano** (7×7 tiles, 224 px). O caminho foram cinco cortes seguidos do dono
     * em tela: 3,4 no *"faça ele ser maior"*, depois 2,8, 2,45, 1,75 e 1,55. O
     * número ainda mudou de escala no meio, quando a folha foi trocada e a célula
     * passou de 144 para 180 px — **o tamanho na TELA é o que importa, e é por
     * isso que este número não significa nada sozinho.**
     *
     * ✅ **Quem passou a contar a área é a TEIA DE RACHADURAS**, que abre no raio
     * de dano cheio. Com o desenho menor que o golpe, é ela que diz ao jogador
     * onde a magia pega — e foi por isso que o dono pediu mais rachaduras na
     * mesma frase em que pediu o meteoro menor.
     *
     * 🔴 **E este número agora governa os DOIS sprites**, o do mergulho e o do
     * estouro — antes de 13/09 o do voo tinha régua própria, e era isso que fazia
     * a pedra dobrar de tamanho no instante do impacto. Ver `trajetoria`.
     */
    meteor_solo: 2.18,
    /*
     * ❄️ A célula da folha da Nevasca tem 160 px de largura para 3 tiles (96 px)
     * de área de dano. 0,62 põe a coluna de gelo no tamanho da cratera dela.
     */
    snowball: 0.62,
    /**
     * ⛈️ **2,20, e o caminho até aqui foi 0,80 → 1,30 → 2,20.**
     *
     * 🔴 **O 0,80 saiu de uma conta que a correção do dono inverteu.** Eu
     * dimensionei o clarão para não passar muito da célula, porque a magia era
     * de ALVO ÚNICO e uma queixa antiga dele dizia *"são bem grandes, mas parece
     * que acertam somente um pequeno ponto ao tocar o solo"*. Em tela ele pediu
     * o oposto — *"o raio está meio pequeno demais"* — e corrigiu o resto junto:
     * a magia é de ÁREA.
     *
     * ✅ Com a área, a conta inverte de vez: quem manda no tamanho é o BLOCO DE
     * DANO, não a célula.
     *
     * ⚠️ **2,90, e a escada foi 0,80 → 1,30 → 1,80 → 2,40 → 2,90.** A última
     * subida é do dono em 12/09: *"aumente o tamanho dele, pode vir um pouco
     * mais de cima"*. Dá 290 × 591 px em tela, ou **9,1 × 18,5 tiles**, com o
     * estouro do chão em ~180 px (5,7 tiles).
     *
     * ⚠️ **A altura pulou de 522 para 591 sem esta escala mudar**, e não é
     * engano: o quadro da folha passou de 288 para 326 px quando o corte deixou
     * de decepar a nuvem. O vão da nuvem ao chão continua ocupando a mesma
     * fatia do quadro, então **o raio tem exatamente o mesmo tamanho de antes** —
     * o que entrou foi o topo da nuvem, que estava faltando.
     *
     * 🔴 **"Vir mais de cima" e "maior" são o MESMO botão**, e é por isso que os
     * dois pedidos viraram um número só: a nuvem fica no alto do quadro, então
     * crescer o desenho é exatamente afastá-la do chão. Não há como atender um
     * sem o outro sem redesenhar a arte.
     *
     * ⚠️ **Dezesseis tiles de altura numa janela de ~18.** A nuvem passa a nascer
     * fora da tela em quase todo lançamento, e ela ENTRA descendo — que é o que
     * "vir de cima" quer dizer. Está registrado porque é o efeito colateral
     * óbvio e foi pedido de propósito, não um descuido.
     *
     * ⚠️ **Isotrópica, e a arte não permite outra coisa.** A coluna ficaria mais
     * fiel estreita e alta, mas esticar só um eixo deixa o estouro do chão OVAL
     * — a regra que já vale para o meteoro e para a Nevasca.
     */
    lightning_fall: 2.90,
  };

  /**
   * ❄️ **A TEMPESTADE EM TRÊS CAMADAS, com pool.**
   *
   * 🔴 **É o que separa a nossa Nevasca da do Ragnarok.** A do RO nunca foi uma
   * animação só; ela joga dezenas de mini-sprites com vida própria, e a
   * transparência ACUMULADA de vários no mesmo ponto é o que faz a tempestade
   * parecer contínua. Uma folha sozinha toca sempre igual — dez bolas dariam
   * dez cópias do mesmo desenho.
   *
   * 🔴 **ERAM TRÊS CAMADAS E VIROU UMA** (dono, 11/09, vendo em tela): névoa
   * girando no chão, cristais caindo e micro-cristais subindo em espiral. O
   * veredito: *"o problema foi que dividimos a magia em 3 camadas e tentamos
   * aplicar rotações e turbulências complexas, o que resultou num visual
   * confuso... esqueça o vórtice na base e as turbulências espirais"*.
   *
   * ✅ **E ele está certo sobre o Ragnarok.** Lá o efeito não vem de camadas que
   * se completam — vem de QUANTIDADE caindo reto e rápido. O brilho acumulado de
   * muitos projéteis no mesmo lugar é o efeito; o vórtice era enfeite meu que
   * disputava a leitura com o que importava.
   *
   * ⚠️ A névoa e o floco foram REMOVIDOS, e não zerados na tabela. Campo que
   * ninguém preenche é o defeito que já custou uma rodada hoje
   * (`empurraPorPulso` mudo por um dia). A folha `nevoa_base` e a
   * `particulas_menores` continuam no repositório — se um dia voltarem, voltam
   * com código novo, não com código adormecido.
   *
   * ⚠️ **Só existe para quem declara em `PARTICULAS`.** O Fire Bolt e a Chuva
   * não cospem nada: já estouram numa folha grande, e enfeitar tudo é o caminho
   * curto para a tela virar sopa.
   */
  type CamadaP = 'cristal';

  /**
   * ⚠️ **`z` É ALTURA, e a projeção daqui é a do jogo: chão em `x`/`y`, altura
   * subtraída de `y`.**
   *
   * 🔴 Não é isométrica. O mundo é desenhado em grade reta (`tileX * TS`), e a
   * fórmula 2:1 (`(wx - wy) * TS/2`) quebraria a posição de TODO sprite se
   * entrasse aqui — foi proposto em 11/09 e não se aplica a este renderizador.
   * O eixo `z`, esse sim, vale: é o mesmo truque da bola caindo, que sobe o
   * desenho sem mexer no lugar onde ela vai bater.
   */
  interface Particula {
    node: AnimatedSprite;
    camada: CamadaP;
    /** ❄️ O cristal já bateu no chão e está tocando `shatter`? */
    estilhacando: boolean;
    /** O próprio índice no pool. Guardado para a morte não custar um `indexOf`. */
    idx: number;
    /** Onde ela cai no chão. `z` é ALTURA, subtraída de `y` na hora de desenhar. */
    x: number; y: number; z: number;
    /*
     * ⚠️ **Só `vz`.** Havia `vx`/`vy` e um par de órbita (`ang`/`raioOrb`) para
     * a névoa que deslizava e o floco que subia em espiral; as duas camadas
     * saíram em 11/09 e os campos saíram junto. Campo que ninguém escreve é o
     * defeito que já custou uma rodada hoje.
     */
    vz: number;
    giro: number;
    t: number; dur: number;
    escala: number;
    viva: boolean;
  }

  /**
   * 🔴 **POOL: os nós são criados UMA VEZ e reaproveitados.**
   *
   * Uma tempestade cospe **~160 cristais em 4,5 s** (16 por impacto, dez
   * impactos). Criar e destruir um `AnimatedSprite` para cada um põe centenas
   * de objetos por conjuração no caminho do coletor de lixo — e o preço aparece
   * como engasgo, justamente quando a tela está mais cheia. Aqui o nó só troca
   * de `x`, `y`, `alpha`, `scale`, `tint` e textura.
   *
   * ⚠️ **`visible = false` no lugar de `removeChild`.** Tirar e repor no palco
   * refaz a lista de filhos do `fxLayer` a cada partícula, que é o custo que o
   * pool existe para evitar.
   *
   * ⚠️ **O teto é para VÁRIOS feiticeiros, não para um.** Com vida de ~700 ms
   * mais 260 de estouro e um impacto a cada 450 ms, uma tempestade sozinha
   * mantém ~34 cristais no ar. Setecentos cobrem meia dúzia de conjuradores no
   * mesmo andar sem o pool precisar crescer no meio da luta.
   */
  const TETO_PARTICULAS = 700;
  const particulas: Particula[] = [];
  /**
   * Índices de slots livres, **UMA PILHA POR CAMADA**.
   *
   * ⚠️ **Uma pilha POR CAMADA, mesmo havendo uma camada só hoje.** A geometria
   * fica desenhada no nó, então um slot livre de uma camada não pode virar
   * outra; com pilha única, um slot da camada errada no topo bloquearia o
   * reaproveitamento das demais até alguém pedir aquela camada — o pool cresce
   * até o teto e o efeito some sem erro nenhum. O formato fica porque é o certo,
   * e não porque sobrou de quando eram três.
   */
  const livres: Record<CamadaP, number[]> = { cristal: [] };

  /** A forma UNITÁRIA de cada camada, desenhada uma vez por nó. */
  /**
   * ❄️ **AS FOLHAS DAS TRÊS CAMADAS**, fatiadas pelos atlas de
   * `client/public/assets/spells/`.
   *
   * ⚠️ **A grade sai do JSON, e não de uma constante daqui.** Os atlas vieram
   * junto com as folhas; repetir os retângulos no código criaria duas verdades
   * sobre o mesmo arquivo, e a que estivesse errada cortaria pela metade sem
   * dar erro nenhum.
   *
   * ⚠️ **Folha ausente = a camada não nasce.** Mesma convenção de
   * `folhasQueda`: sem `catch` barulhento, sem meia-tempestade travando o resto
   * do jogo.
   */
  const folhasP = new Map<string, Texture[]>();

  interface Atlas {
    frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
    animations: Record<string, string[]>;
    meta: { image: string };
  }

  function carregaAtlas(nome: string): void {
    /*
     * ⚠️ **Barra na frente.** Todo o resto do arquivo carrega de `/assets/…`, e
     * caminho relativo aqui resolveria contra a rota da PÁGINA — funciona na
     * raiz e some em qualquer sub-rota, sem erro nenhum, porque o `catch`
     * abaixo engole. Duas convenções no mesmo arquivo é a receita para isso.
     */
    fetch(`/assets/spells/${nome}.json`)
      .then((r) => r.json() as Promise<Atlas>)
      .then(async (atlas) => {
        const tex = await Assets.load<Texture>(`/assets/spells/${atlas.meta.image}`);
        for (const [anim, quadros] of Object.entries(atlas.animations)) {
          folhasP.set(anim, quadros.map((q) => {
            const f = atlas.frames[q]!.frame;
            return new Texture({
              source: tex.source,
              frame: new Rectangle(f.x, f.y, f.w, f.h),
            });
          }));
        }
      })
      /*
       * ⚠️ **Este aviso não é ruído.** A camada some em silêncio quando o atlas
       * falha, e em 11/09 isso custou uma rodada de teste — o dono relatou *"não
       * apareceu"* e não havia nada, nem no console, dizendo por quê. O jogo
       * segue rodando; o que muda é ter onde olhar.
       */
      .catch((e: unknown) => console.warn(`[fx] atlas ${nome} não carregou:`, e));
  }
  /*
   * ⚠️ Só o atlas do gelo é carregado. `nevoa_base` e `particulas_menores`
   * continuam no repositório, mas ninguém os pede desde que as três camadas
   * viraram uma — carregá-los "por precaução" gastaria rede e memória por uma
   * camada que não existe.
   */
  carregaAtlas('gelo_grande');
  /*
   * 🧊 O bloco de gelo do congelado é uma imagem solta, sem atlas — um quadro
   * só. Carregado aqui e lido depois por `Assets.get` lá no sprite da entidade,
   * que não tem como esperar: o congelamento chega no meio de um quadro.
   */
  void Assets.load<Texture>('/assets/spells/frozen_status_overlay.png')
    .catch((e: unknown) => console.warn('[fx] bloco de gelo não carregou:', e));
  // 🌀 O anel que orbita o conjurador. Fatiado sob demanda — ver `quadrosAnelCaster`.
  void Assets.load<Texture>('/assets/fx/anel_caster.png')
    .catch((e: unknown) => console.warn('[fx] anel do conjurador não carregou:', e));
  /*
   * ⚡ **A Esfera Elétrica chega em DUAS tiras, e não numa folha só.** A bola
   * (que voa e depois pulsa no alvo, em laço) e o estouro da descarga (uma vez
   * por choque) têm ritmos diferentes, e um `AnimatedSprite` só tem uma
   * velocidade — a mesma lição do meteoro, em 11/09. Cortadas por
   * `tools/esfera2fx.mjs`; fatiadas sob demanda, ver `quadrosOrbe`.
   */
  void Assets.load<Texture>('/assets/fx/esfera_orbe.png')
    .catch((e: unknown) => console.warn('[fx] orbe da esfera não carregou:', e));
  void Assets.load<Texture>('/assets/fx/esfera_choque.png')
    .catch((e: unknown) => console.warn('[fx] choque da esfera não carregou:', e));

  /** Qual animação cada camada usa ao nascer. */
  const ANIM_DA_CAMADA: Record<CamadaP, string> = { cristal: 'falling' };

  function nasceParticula(camada: CamadaP): Particula | undefined {
    const quadros = folhasP.get(ANIM_DA_CAMADA[camada]);
    if (!quadros) return undefined;
    const i = livres[camada].pop();
    if (i !== undefined) {
      const p = particulas[i]!;
      p.viva = true;
      p.estilhacando = false;
      p.node.visible = true;
      // ⚠️ O cristal reciclado pode ter morrido ESTILHAÇADO — volta para a
      // animação de queda, senão ele nasce já quebrado no ar.
      if (camada === 'cristal') {
        p.node.textures = quadros;
        p.node.loop = true;
        p.node.gotoAndPlay(0);
      }
      return p;
    }
    /*
     * ⚠️ **Estourou o teto: a partícula simplesmente NÃO NASCE.** Perder alguns
     * flocos numa tela que já tem setecentos não se vê; engasgar, sim. O pool
     * se estabiliza depois da primeira tempestade e daí em diante quase nunca
     * chega aqui.
     */
    if (particulas.length >= TETO_PARTICULAS) return undefined;
    const g = new AnimatedSprite(quadros);
    /*
     * 🔴 **O CRISTAL NÃO É ADITIVO, e as outras duas são.**
     *
     * Descoberto testando a folha isolada em 11/09: a arte do `gelo_grande` é
     * pixel art OPACA, com contorno azul-escuro, e é o contorno que lhe dá
     * corpo. Em soma aditiva o escuro acrescenta quase nada ao chão — sobra só
     * o miolo claro, e o cristal vira um fiapo pálido que o dono não viu cair.
     *
     * ⚠️ Névoa e centelha continuam somando, e devem: as duas são BRILHO, não
     * objeto. Névoa em mistura normal taparia o chão com um borrão cinza.
     */
    g.blendMode = camada === 'cristal' ? 'normal' : 'add';
    /*
     * ⚠️ **O cristal é ancorado em 0,85 e não no meio.** A ponta dele é o que
     * toca o chão; ancorado no centro, metade do desenho afundaria no tile no
     * instante da batida e o estilhaço sairia enterrado.
     */
    g.anchor.set(0.5, 0.85);
    g.animationSpeed = 0.35;
    g.loop = true;
    g.play();
    g.zIndex = 10000;
    fxLayer.addChild(g);
    const p: Particula = {
      node: g, camada, idx: particulas.length, x: 0, y: 0, z: 0, vz: 0,
      giro: 0, t: 0, dur: 1, escala: 1, viva: true,
      estilhacando: false,
    };
    particulas.push(p);
    return p;
  }

  const naFaixa = ([a, b]: [number, number]): number => a + Math.random() * (b - a);

  /** Quantos cristais cada impacto solta, e em que raio eles se espalham. */
  const PARTICULAS: Record<
    string, { cristais: number; espalha: number; cor?: number }
  > = {
    /*
     * ❄️ **DEZESSEIS POR IMPACTO, e são dez impactos: ~160 na tempestade.**
     *
     * 🔴 Eram 4, somados a névoa e flocos. O dono: *"o segredo não é o vórtice
     * girando na base, mas a QUANTIDADE MASSIVA de projéteis caindo direto e
     * rápido, criando um efeito cumulativo de brilho e impacto"*. Está certo —
     * no Ragnarok o efeito vem de densidade, não de camadas que se completam.
     *
     * ⚠️ **`espalha` é o que faz isto virar chuva em vez de buquê.** Os
     * dezesseis nascem num raio de 1,5 tile em volta do ponto do impacto; sem
     * isso eles cairiam empilhados no mesmo pixel e a densidade viraria um
     * borrão só. Como os dez impactos já são sorteados pelo servidor dentro do
     * 9×9, o espalhamento por impacto cobre a área sem o cliente precisar saber
     * onde a tempestade começa e acaba.
     */
    snowball: { cristais: 16, espalha: 48 },
    /*
     * ⛈️ **O relâmpago não tinha entrada aqui, e por isso não cuspia NADA.**
     * `cospeEstilhacos` sai na primeira linha quando a magia não está na tabela;
     * como o gatilho do impacto dele também não existia até hoje, ninguém tinha
     * como notar. Dois silêncios somados.
     *
     * ⚠️ **Vinte e dois num raio de 2 tiles, contra os dezesseis em 1,5 da
     * Nevasca.** O relâmpago cai UMA vez por conjuração e a Nevasca dez; o que
     * lá seria excesso, aqui é o único momento em que há o que ver. E o raio
     * maior é porque o clarão dele tem 3,6 tiles: estilhaço dentro de um clarão
     * some.
     */
    lightning_fall: { cristais: 22, espalha: 64 },
    /*
     * ☄️ **O METEORO SAIU DESTA TABELA em 12/09, e a entrada fica registrada
     * aqui como aviso.** Ele teve `{ cristais: 28, espalha: 80, cor: 0xffb066 }`
     * por um dia, e em tela isso era um campo de espinhos de gelo BEGE fincados
     * na grama, em pé, todos iguais.
     *
     * 🔴 **O defeito era de SILHUETA, e cor não conserta silhueta.** A tinta de
     * brasa foi uma tentativa honesta de fazer gelo virar pedra, e não tinha como
     * dar certo: o que o olho lê primeiro é a forma. Hoje o Meteoro tem escombros
     * próprios, desenhados — ver `ESCOMBROS` e `escombrosDeImpacto`.
     *
     * ⚠️ **As outras duas magias continuam aqui de propósito.** A Nevasca É gelo,
     * e no contato com a Muralha o estilhaço é pequeno e some em 400 ms — nos
     * dois casos a folha serve. Trocar por trocar seria refazer o que funciona.
     */
    /*
     * 🔥 **O contato com a Muralha, e ele é o MENOR da tabela.** Oito num raio de
     * meio tile: o contato acontece toda vez que um bicho encosta, e um bando
     * inteiro batendo na parede com vinte estilhaços cada viraria uma cortina de
     * brasa em cima da muralha que o jogador está tentando ler.
     */
    fire_wall_hit: { cristais: 8, espalha: 16, cor: 0xffb066 },
  };

  /**
   * ❄️ Cospe a rajada de cristais de UM impacto.
   *
   * ⚠️ **Uma camada só.** Havia névoa no chão e micro-cristais em espiral; o
   * dono viu em tela e cortou as duas (*"esqueça o vórtice na base e as
   * turbulências espirais"*). Ver a nota longa em `CamadaP`.
   */
  function cospeEstilhacos(magia: string, x: number, y: number): void {
    const cfg = PARTICULAS[magia];
    if (!cfg) return;
    for (let i = 0; i < cfg.cristais; i++) {
      const p = nasceParticula('cristal');
      if (!p) break;
      p.x = x + (Math.random() - 0.5) * cfg.espalha * 2;
      // ⚠️ Metade do espalhamento em `y`: o chão é visto de viés, e um círculo
      // deitado projeta uma elipse. Igual nos dois eixos leria como bola.
      p.y = y + (Math.random() - 0.5) * cfg.espalha;
      // 🔴 Nasce NO ALTO e despenca — é o que dá peso à tempestade.
      p.z = naFaixa([200, 300]);
      /*
       * ⚠️ **Rápido, e a faixa é larga de propósito.** Velocidade igual para
       * todos faria os dezesseis tocarem o chão juntos, e dezesseis estilhaços
       * no mesmo quadro leem como uma piscada só. Espalhados no tempo, viram
       * chuva.
       */
      p.vz = -naFaixa([1.3, 2.0]);
      p.giro = (Math.random() - 0.5) * 0.02;
      p.node.rotation = Math.random() * Math.PI * 2;
      /*
       * ⚠️ **Tinta quase branca, por padrão.** A folha já vem colorida, e tingir
       * de azul-médio uma arte que já é azul escurece duas vezes — some no chão.
       * Quem precisa de outro tom declara em `PARTICULAS.cor`: é o caso da brasa
       * do Meteoro, que de branco-azulado leria como gelo.
       */
      p.node.tint = cfg.cor ?? 0xdff2ff;
      /*
       * 🔴 **0,7–1,2, e o caminho até aqui vale registrar.** Quando o cristal
       * sumiu em tela, subi a escala para 2,0–3,2 achando que era tamanho. Não
       * era: era a MISTURA ADITIVA comendo o contorno. Com os dois "consertos"
       * juntos, o teste mostrou lâminas azuis de cinco tiles cada, empilhadas.
       *
       * ⚠️ **A largura engana e a altura é que manda.** O gelo ocupa uns 10 px
       * de largura na célula de 48, o que parecia pedir aumento; mas tem quase
       * 40 px de ALTURA, e em escala 1 já é mais alto que um tile.
       */
      p.escala = naFaixa([0.7, 1.2]);
      p.t = 0; p.dur = naFaixa([420, 700]);
    }
  }

  /**
   * ⚠️ **Recebe a FICHA da folha, e não dez parâmetros soltos.** Eram dez
   * posicionais quando a mistura e o desvanecimento entraram, e mais um teria
   * passado dos onze — a essa altura trocar dois de lugar na chamada não dá erro
   * de tipo nenhum (são quase todos `number`). Com um único chamador, o
   * argumento nomeado sai de graça.
   */
  function spawnQueda(
    magia: string, wx: number, wy: number, folha: FolhaDeQueda, atraso: number,
    alvo?: string, quedaMs?: number, raioDano?: number,
    deOnde?: { x: number; y: number },
  ): void {
    const { fracaoQueda, duracaoEstouro, mistura, desvanece, porCima } = folha;
    /*
     * ⚠️ **`quadrosUsados` corta o FIM da tira, e `fracaoQueda` corta o começo.**
     * São duas perguntas diferentes: uma é *"onde a descida acaba"*, a outra é
     * *"até onde vale a pena tocar"*. Ver `quadrosUsados` em `FOLHAS_QUEDA`.
     */
    const frames = folha.quadrosUsados
      ? folha.frames.slice(0, folha.quadrosUsados)
      : folha.frames;
    const node = new AnimatedSprite(frames);
    node.loop = false;
    /*
     * 🔴 **MISTURA ADITIVA** (09/09): a cor do efeito é SOMADA à do mundo, em
     * vez de tapá-lo. É como fogo se comporta — ele ilumina o que está atrás,
     * não recorta um buraco. Sem isto o dono viu *"a animação muito escura"*:
     * desenhada por cima, a arte trazia junto o próprio preto.
     *
     * ⚠️ É por causa disto que o recorte sai com alfa CHEIO (ver
     * `tools/contato2fx.mjs`). Na soma, o preto já não acrescenta nada.
     *
     * ⚠️ **Menos numa folha: a do relâmpago.** Ela é a única que chegou com alfa
     * de verdade e com desenho ESCURO (a nuvem), e soma não sabe escurecer. Ver
     * `mistura` em `FOLHAS_QUEDA`.
     */
    node.blendMode = mistura;
    // ⚠️ `set(v)` com UM argumento escala os dois eixos igualmente. Passar dois
    // valores diferentes aqui é o que deixaria o estouro oval.
    node.scale.set(ESCALA_QUEDA * (ESCALA_IMPACTO[magia] ?? 1));
    /*
     * ⚠️ **A âncora em Y é o ponto do desenho que tem de cair NO TILE**, e nem
     * sempre é o rodapé do quadro. Ver `ancoraY` em `FOLHAS_QUEDA`: no relâmpago
     * os 11 % de baixo são brilho espalhando no chão, e ancorar no rodapé subia
     * o impacto dois tiles.
     */
    node.anchor.set(0.5, folha.ancoraY ?? 1);
    node.x = wx;
    node.y = wy;
    // ⚠️ Sobrescrito logo abaixo: o estouro desce para a camada do chão.
    node.visible = false;

    /*
     * 🧪 **MODO RISCO.** No teste de 11/09 a DESCIDA deixa de sair da folha e
     * vira um traço desenhado por código; a folha entra só no ESTOURO.
     *
     * ⚠️ Por isso a animação toca só a segunda metade dos 24 quadros. Tocar a
     * tira inteira mostraria a bola caindo DE NOVO, depois de o traço já ter
     * caído — duas quedas por bolt.
     */
    const usados = QUEDA_RISCO ? frames.slice(Math.round(frames.length * fracaoQueda)) : frames;
    node.textures = usados;
    // Quadros por tique de 60 Hz para a animação inteira durar o que sobra.
    /*
     * ⚠️ A DESCIDA pode ser mais longa que o padrão — a rocha da Chuva leva 280
     * ms contra os 120 de uma lança. O estouro toca no que sobra da animação, e
     * nunca em menos de 160 ms: com uma queda muito longa, `DUR_QUEDA − queda`
     * ficaria negativo e a explosão sairia em um quadro só.
     */
    const tempoQueda = quedaMs ?? ATRASO_IMPACTO_MS;
    /*
     * ⚠️ A folha pode PEDIR o próprio tempo de estouro. É o caso da coluna de
     * gelo da Nevasca: ela sobe, gira e some, e o que sobra de `DUR_QUEDA`
     * (160 ms) não dá nem para ela nascer.
     */
    const dur = duracaoEstouro > 0
      ? duracaoEstouro
      : QUEDA_RISCO ? Math.max(160, DUR_QUEDA - tempoQueda) : DUR_QUEDA;
    node.animationSpeed = usados.length / (dur / (1000 / 60));
    /*
     * 🔴 **O ESTOURO FICA POR BAIXO DOS MONSTROS** — dono, 11/09: *"está passando
     * por cima dos monstros, deveria ficar por baixo deles... a mesma coisa o
     * meteoro."*
     *
     * ⚠️ E o RISCO não desce junto, de propósito: ele é a coisa CAINDO, está no
     * ar, e passar por trás de uma árvore no meio da queda seria o erro
     * simétrico. O estouro acontece no chão, onde os bichos pisam.
     *
     * ✅ O que isto compra é leitura: com 240 px de fogo por cima, o jogador
     * perdia de vista o que estava acertando. Por baixo, o monstro fica em pé
     * dentro da explosão — que é o que se quer ver.
     *
     * ⚠️ `objects` ordena por `zIndex` e as marcas de chão vivem no negativo
     * (o marcador de destino −0,8). O estouro entra
     * entre elas e as entidades.
     *
     * 🔴 **MENOS O RELÂMPAGO, e a regra de 11/09 continua certa para o resto.**
     * Dono, 12/09: *"o raio tem que atravessar os inimigos"*. A decisão antiga
     * foi tomada olhando para o METEORO — 240 px de fogo espalhados no chão, em
     * que o monstro sumia dentro da explosão. O relâmpago é o caso oposto: uma
     * coluna estreita de 16 tiles de ALTURA, e por baixo das entidades qualquer
     * bicho ao norte do impacto era desenhado por cima dela, cortando o raio ao
     * meio. Ver `porCima` em `FOLHAS_QUEDA`.
     */
    if (porCima) {
      node.zIndex = 9998;
      fxLayer.addChild(node);
    } else {
      node.zIndex = -0.6;
      objects.addChild(node);
    }

    let risco: {
      node: Container; t: number; deX: number; deY: number; dur: number;
      /** Escala no começo e no fim do mergulho, quando a arte cresce vindo de longe. */
      cresce?: readonly [number, number];
    } | undefined;

    if (QUEDA_RISCO && folha.trajetoria) {
      /*
       * ☄️ **A QUEDA DESENHADA PELA FOLHA, e ela reusa a máquina do risco.**
       *
       * O `risco` já nasce escondido, aparece no fim do atraso, interpola de um
       * ponto de partida até o alvo e ao chegar se destrói soltando o estouro.
       * Tudo isso fica. O que muda é QUEM desenha a descida: em vez do traço de
       * código, os quadros de voo da própria folha, crescendo pelo caminho.
       *
       * 🔴 **São dois sprites, o do voo e o do estouro**, e não um. Um
       * `AnimatedSprite` tem uma velocidade só, e os dois ritmos são diferentes:
       * onze quadros em 1,1 s de mergulho contra cinco em 300 ms de explosão.
       *
       * ⚠️ **A âncora é a MESMA nos dois** (`ancoraY`), e é isso que faz a pedra
       * e a cratera caírem no mesmo ponto. O cortador ancora todo quadro pelo
       * rodapé do desenho justamente para isto: no meteoro caindo o rodapé é a
       * pedra, no estouro é o chão.
       */
      const corte = Math.round(frames.length * fracaoQueda);
      const voo = new AnimatedSprite(frames.slice(0, corte));
      voo.anchor.set(0.5, folha.ancoraY ?? 1);
      voo.blendMode = mistura;
      voo.loop = false;
      voo.animationSpeed = corte / (tempoQueda / (1000 / 60));
      voo.play();
      voo.zIndex = 9999;
      fxLayer.addChild(voo);
      /*
       * 🔴 **`cresce` é FRAÇÃO DO ESTOURO, e não escala absoluta.**
       *
       * O laço do risco escreve `scale.set(...)` direto, então o que ele recebe
       * é a escala final — e o sprite do voo, criado aqui, nunca passou pelo
       * `ESCALA_QUEDA × ESCALA_IMPACTO` que o estouro recebe. Resultado medido: a
       * pedra terminava o mergulho com 144 px e o estouro abria com 306, o dobro,
       * no mesmo instante. Era a queixa do dono — *"está crescendo muito no
       * final"* — e não era a curva, era o degrau entre dois sprites que deviam
       * ter a mesma régua.
       *
       * ✅ Multiplicando aqui, `cresce` passa a dizer "que fração do estouro a
       * pedra tem", que é a pergunta que alguém ajustando em tela realmente faz.
       * Mudar o tamanho da magia volta a ser UM número (`ESCALA_IMPACTO`).
       */
      const escala = ESCALA_QUEDA * (ESCALA_IMPACTO[magia] ?? 1);
      risco = {
        node: voo, t: 0, deX: 0, deY: folha.trajetoria.queda,
        dur: tempoQueda,
        cresce: [folha.trajetoria.cresce[0] * escala, folha.trajetoria.cresce[1] * escala],
      };
    } else if (QUEDA_RISCO && FORMA_RISCO[magia] !== 'nenhuma') {
      /*
       * A LANÇA: um traço vertical fino, claro no núcleo e alaranjado na
       * borda, com a mesma mistura aditiva do resto do efeito. Desenhado uma
       * vez e movido — não redesenhado por quadro.
       */
      const [fora, meio, nucleo] = CORES_RISCO[magia] ?? CORES_RISCO.fire_bolt!;
      const g = new Graphics();
      if ((FORMA_RISCO[magia] ?? 'lanca') === 'esfera') {
        /*
         * 🌠 **ROCHA EM CHAMAS: cabeça redonda + rastro.**
         *
         * O rastro é desenhado ANTES da cabeça para ficar atrás dela, e afina
         * subindo — largura cheia junto da rocha, um terço lá em cima. É essa
         * conicidade que dá a direção; um rastro de largura constante lê como
         * poste, não como coisa em movimento.
         *
         * ⚠️ **Círculos, e nunca elipse.** `circle()` com um raio só garante
         * que a rocha seja redonda em qualquer escala — foi a queixa do dono,
         * *"esféricos e perfeitamente redondos, não ovais"*.
         */
        const R = RAIO_ESFERA[magia] ?? RAIO_METEORO;
        /*
         * ⚠️ A CAUDA é medida em R, não em pixels fixos: com a cabeça em 34 px,
         * um rastro de 120 px de altura fixa ficaria curto e atarracado. Assim
         * ela cresce junto e a silhueta continua a mesma em qualquer tamanho.
         */
        const cauda = R * 5;
        g.poly([-R, 0, R, 0, R * 0.34, -cauda, -R * 0.34, -cauda])
          .fill({ color: fora, alpha: 0.4 });
        g.poly([-R * 0.62, 0, R * 0.62, 0, R * 0.2, -cauda * 0.87, -R * 0.2, -cauda * 0.87])
          .fill({ color: meio, alpha: 0.7 });
        g.circle(0, 0, R).fill({ color: fora, alpha: 0.95 });
        g.circle(0, -R * 0.12, R * 0.68).fill({ color: meio, alpha: 1 });
        g.circle(0, -R * 0.22, R * 0.34).fill({ color: nucleo, alpha: 1 });
      } else {
        g.rect(-5, -110, 10, 110).fill({ color: fora, alpha: 0.55 });
        g.rect(-2.5, -104, 5, 104).fill({ color: meio, alpha: 0.9 });
        g.rect(-1, -98, 2, 98).fill({ color: nucleo, alpha: 1 });
      }
      g.blendMode = 'add';
      g.x = wx;
      g.zIndex = 9999;
      g.visible = false;
      fxLayer.addChild(g);
      // 350 px acima do alvo: a altura que o prompt do teste pediu.
      /*
       * ⚠️ **A QUEDA É RETA, e a diagonal foi TENTADA e recusada** (11/09). O
       * dono pediu (*"pode cair meio na diagonal, seria mais bonito"*), viu em
       * tela e desfez (*"pode cair direto mesmo"*). Ficou o registro para não
       * voltar como ideia nova: inclinar espalha o ponto de entrada e, com
       * dezoito rochas, a leitura de ONDE cada uma vai bater se perde.
       */
      const deY = FORMA_RISCO[magia] === 'esfera' ? 420 : 350;
      risco = { node: g, t: 0, dur: tempoQueda, deX: 0, deY };
    }

    /*
     * 💥 **A BATIDA DE QUEM NÃO TEM RISCO.**
     *
     * 🔴 Defeito achado lendo o código, e é o que o dono sentiu como *"quero um
     * impacto mais forte no chão"*: o tremor de tela e os estilhaços eram
     * disparados DENTRO do bloco do risco, no instante em que o traço desenhado
     * por código tocava o solo. O relâmpago não tem risco (a descida está na
     * folha), então ele **nunca sacudia a tela e nunca cuspia estilhaço** — ele
     * era a única magia que caía em silêncio.
     *
     * ✅ Aqui a batida passa a ser agendada por TEMPO, e não pelo fim do traço:
     * `quedaMs` já é o instante em que a arte encosta no chão, e é o mesmo
     * número que o servidor usa para soltar o dano.
     */
    const q: (typeof quedas)[number] = {
      node, atraso, morto: false, magia, alvo, risco,
      ...(risco ? {} : { batida: { em: tempoQueda, t: 0, feita: false, raioDano } }),
      ...(raioDano !== undefined ? { raioDano } : {}),
      ...(desvanece ? { apaga: { em: desvanece, t: 0 } } : {}),
    };
    /*
     * ⚠️ **Com desvanecimento, o fim da animação não mata o desenho: começa o
     * apagar.** Ver `desvanece` em `FOLHAS_QUEDA` — é o *"desaparecer
     * naturalmente"* que o dono pediu em 12/09, no lugar dos quadros que
     * encolhiam.
     */
    node.onComplete = () => { if (!q.apaga) q.morto = true; };
    quedas.push(q);
  }

  /**
   * 💥 **O CLARÃO DO IMPACTO: um anel branco que abre e apaga no chão.**
   *
   * Pedido do dono em 12/09, na Descarga Elétrica: *"quero um impacto mais forte
   * no chão"*. Ele soma ao tremor — o tremor diz que bateu, o clarão diz ONDE.
   *
   * ⚠️ Desenhado por código e não com arte nova: é um anel de 200 ms que aparece
   * uma vez por conjuração, e uma folha para isso seria arte para dois piscares.
   *
   * ⚠️ Vai na camada do CHÃO (`objects`, zIndex negativo) junto com o estouro,
   * pelo mesmo motivo dele: com o monstro por baixo, o jogador perde de vista o
   * que está acertando.
   */
  /**
   * 🌠 **RACHADURAS: o chão que se abre onde o meteoro bateu.**
   *
   * Pedido do dono em 12/09, na ficha do Meteoro: *"nascer exatamente do ponto
   * de impacto, espalhar-se irregularmente, brilho vermelho/laranja,
   * desaparecer gradualmente. Não criar um círculo perfeito. Não transformar o
   * chão em lava."*
   *
   * 🔴 **Desenhadas por código, e é o caminho certo aqui.** A folha do meteoro
   * já traz brasas no chão nos últimos quadros, mas elas formam uma MANCHA —
   * e o que o dono descreveu é o oposto de mancha: linhas que saem do ponto e
   * se ramificam. Arte nova para isso seria uma folha inteira; oito polilinhas
   * com uma quebra no meio dizem a mesma coisa e ainda saem sempre diferentes.
   *
   * ⚠️ **O ângulo é sorteado dentro de cada fatia, não em volta do círculo.** As
   * oito rachaduras dividem os 360° em fatias iguais e cada uma sorteia dentro
   * da sua: sorteio livre agrupa duas ou três do mesmo lado e deixa metade do
   * chão liso, que lê como erro em vez de acaso.
   *
   * ⚠️ **Na camada do CHÃO, por baixo das entidades.** Rachadura é marca no
   * solo; passar por cima do monstro seria desenhá-la no ar.
   */
  function rachaduras(wx: number, wy: number, raioPx: number): void {
    const g = new Graphics();
    g.blendMode = 'add';
    g.x = wx;
    g.y = wy;
    g.zIndex = -0.57;
    objects.addChild(g);

    /*
     * 🔴 **Dezoito fendas COM BIFURCAÇÃO, e eram oito retas.**
     *
     * Pedido do dono em 13/09: *"faça mais rachaduras no chão"*. Só aumentar o
     * número de raios não resolve — vinte traços saindo todos do mesmo ponto leem
     * como ESTRELA, não como chão partido. O que dá a leitura é a RAMIFICAÇÃO:
     * chão rachado de verdade abre uma fenda que se divide no meio do caminho.
     *
     * ⚠️ Por isso cada linha guarda uma sequência de pontos e um ATRASO. A
     * bifurcação nasce no meio da fenda-mãe e começa a abrir depois dela — é o
     * que faz a trinca parecer que se PROPAGA em vez de aparecer pronta.
     */
    const N = 18;
    const linhas: Array<{ pts: Array<[number, number]>; atraso: number }> = [];
    // ⚠️ Achatado em Y (0,55): o chão é visto de viés, e uma teia redonda lê como
    // desenho de pé. É a mesma correção dos estilhaços da Nevasca.
    const ACHATA = 0.55;
    const ponto = (
      a: number, d: number,
    ): [number, number] => [Math.cos(a) * d, Math.sin(a) * d * ACHATA];
    for (let i = 0; i < N; i++) {
      const a = ((i + 0.15 + Math.random() * 0.7) / N) * Math.PI * 2;
      const compr = raioPx * (0.4 + Math.random() * 0.6);
      const quebra = 0.35 + Math.random() * 0.3;
      const desvio = (Math.random() - 0.5) * 0.7;
      const meio = ponto(a, compr * quebra);
      /*
       * ⚠️ **A fenda não começa no centro EXATO, e sim um pouco fora.** Com
       * dezoito saindo do mesmo pixel, o miolo vira um nó aceso — e o miolo é
       * justamente onde a explosão está desenhada, então o nó não acrescenta
       * nada e suja. Sair de 5 a 18 % do caminho deixa o centro respirar.
       */
      linhas.push({
        pts: [ponto(a, compr * (0.05 + Math.random() * 0.13)), meio, ponto(a + desvio, compr)],
        atraso: 0,
      });
      /*
       * ⚠️ Só uma parte bifurca, e é sorteio: se todas se dividissem, a teia
       * voltaria a ficar regular — trocaria uma estrela de dezoito pontas por uma
       * de trinta e seis.
       */
      if (Math.random() < 0.55) {
        const ramo = a + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5);
        const ate = ponto(ramo, compr * (0.5 + Math.random() * 0.35));
        linhas.push({
          pts: [meio, [meio[0] + ate[0] * 0.6, meio[1] + ate[1] * 0.6]],
          atraso: 0.35,
        });
      }
    }

    const nasceu = performance.now();
    const DUR = 1400;
    const passo = (): void => {
      const r = (performance.now() - nasceu) / DUR;
      if (r >= 1) { g.destroy(); app.ticker.remove(passo); return; }
      g.clear();
      /*
       * ⚠️ **Abrem depressa e apagam devagar.** A abertura leva 18 % do tempo —
       * é a colisão. O resto é brasa esfriando, e é ela que o dono pediu que
       * sumisse "gradualmente".
       */
      const vive = 1 - Math.max(0, (r - 0.18) / 0.82) ** 1.5;
      /*
       * Desenha o começo da fenda, até a fração `f` do comprimento dela. Andar
       * pelos segmentos (em vez de escalar os pontos) é o que deixa a trinca
       * AVANÇAR com velocidade constante mesmo quando os trechos têm tamanhos
       * diferentes — e é o que permite a bifurcação, que não começa na origem.
       */
      const traca = (pts: Array<[number, number]>, f: number): void => {
        let total = 0;
        for (let i = 1; i < pts.length; i++) {
          total += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
        }
        let resta = total * f;
        g.moveTo(pts[0]![0], pts[0]![1]);
        for (let i = 1; i < pts.length && resta > 0; i++) {
          const [x0, y0] = pts[i - 1]!;
          const [x1, y1] = pts[i]!;
          const d = Math.hypot(x1 - x0, y1 - y0) || 1;
          const t = Math.min(1, resta / d);
          g.lineTo(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
          resta -= d;
        }
      };
      for (const l of linhas) {
        // A abertura leva 18 % do ciclo; a bifurcação usa o que sobra do atraso.
        const f = Math.min(1, Math.max(0, (r - 0.18 * l.atraso) / (0.18 * (1 - l.atraso))));
        if (f <= 0) continue;
        // Duas passadas: um miolo claro sobre um traço largo e alaranjado.
        traca(l.pts, f);
        g.stroke({ width: 4.5, color: 0xff5a10, alpha: vive * 0.55 });
        traca(l.pts, f);
        g.stroke({ width: 1.8, color: 0xffd070, alpha: vive * 0.9 });
      }
    };
    app.ticker.add(passo);
  }

  /**
   * 🪨 **ESCOMBROS: pedra, fagulha e poeira do impacto.**
   *
   * 🔴 **Nasceu porque o jogo só tinha UMA espécie de partícula.** Até 12/09,
   * `nasceParticula` conhecia a camada `'cristal'` e nada mais — a folha de gelo
   * da Nevasca, reusada tingida por todas as magias. No Meteoro isso punha 28
   * espinhos de gelo BEGE fincados na grama, em pé, todos do mesmo tamanho. O
   * dono viu e pediu *"mais realista esse impacto no chão e a explosão também"*.
   * Tingir arte de gelo nunca ia virar pedra: a silhueta é a informação, e
   * silhueta não se conserta com cor.
   *
   * ✅ **Três materiais, porque um impacto real tem três tempos:** a pedra que
   * voa e CAI (e fica no chão), a fagulha que risca o ar e some, e a poeira que
   * se abre rente ao solo e é a única coisa que sobra. Sem a poeira o estouro
   * parece acontecer num vidro; ela é o que dá chão ao efeito.
   *
   * 🔴 **E a mistura é DIFERENTE por material, o que obriga a dois `Graphics`.**
   * Pedra e poeira são ESCUROS e vão em mistura normal — soma não sabe
   * escurecer, lição que este projeto já pagou duas vezes (a nuvem do relâmpago
   * e a fumaça do Meteoro). Fagulha é luz e vai em aditiva. Um `Graphics` só
   * obrigaria a escolher, e a escolha erraria metade.
   *
   * ⚠️ **Pedra e fagulha ficam na camada do AR; a poeira, na do chão.** É a
   * regra que o `risco` já segue: o que está no ar não passa atrás de árvore. A
   * poeira está no solo, e ali ficar sob as entidades é o certo — é o mesmo
   * motivo pelo qual o estouro do Meteoro é desenhado embaixo dos monstros.
   *
   * ⚠️ **Tudo achatado em 0,55 no eixo Y**, como as rachaduras e os estilhaços da
   * Nevasca: o chão é visto de viés, e um espalhamento redondo lê como desenho
   * de pé.
   */
  const ESCOMBROS: Record<string, { pedras: number; fagulhas: number; poeira: number }> = {
    /*
     * ⚠️ **18 pedras para um estouro de nove tiles.** Eram 28 cristais, e o
     * número não veio junto: cristal de gelo é fino e alto, pedra é um caco
     * largo. Vinte e oito cacos no raio de 2,5 tiles fecham o chão e tapam a
     * cratera que as rachaduras acabaram de abrir.
     */
    meteor_solo: { pedras: 18, fagulhas: 44, poeira: 7 },
  };

  function escombrosDeImpacto(magia: string, wx: number, wy: number, raioPx: number): void {
    const cfg = ESCOMBROS[magia];
    if (!cfg) return;

    const ACHATA = 0.55;
    const chao = new Graphics();
    chao.x = wx; chao.y = wy; chao.zIndex = -0.55;
    objects.addChild(chao);
    const solido = new Graphics();
    solido.x = wx; solido.y = wy; solido.zIndex = 9996;
    fxLayer.addChild(solido);
    const aceso = new Graphics();
    aceso.blendMode = 'add';
    aceso.x = wx; aceso.y = wy; aceso.zIndex = 9996;
    fxLayer.addChild(aceso);

    const sorte = (a: number, b: number): number => a + Math.random() * (b - a);

    /*
     * ⚠️ **A pedra guarda o PERFIL dela, sorteado uma vez.** Redesenhar um
     * polígono novo a cada quadro faria o caco TREMELICAR — vira ruído, não
     * rocha. O que muda por quadro é só a posição e o giro.
     */
    const pedras = Array.from({ length: cfg.pedras }, () => {
      const lados = 5;
      const raio = sorte(2.5, 6.5);
      return {
        ang: Math.random() * Math.PI * 2,
        dist: raioPx * sorte(0.3, 1.05),
        alto: sorte(38, 92),
        voo: sorte(360, 620),
        giro: sorte(-0.06, 0.06),
        rot: Math.random() * Math.PI * 2,
        // ⚠️ Um terço sai INCANDESCENTE: é uma pedra que acabou de atravessar o
        // céu. Todas acesas leriam como fogo de artifício; nenhuma, como entulho.
        quente: Math.random() < 0.34,
        perfil: Array.from({ length: lados }, (_, i) => {
          const a = (i / lados) * Math.PI * 2;
          const r = raio * sorte(0.55, 1.35);
          return [Math.cos(a) * r, Math.sin(a) * r * 0.8] as [number, number];
        }),
      };
    });

    const fagulhas = Array.from({ length: cfg.fagulhas }, () => ({
      ang: Math.random() * Math.PI * 2,
      dist: raioPx * sorte(0.5, 1.6),
      alto: sorte(30, 130),
      voo: sorte(240, 520),
      tam: sorte(0.9, 2.3),
      cor: [0xffe6a0, 0xff9a30, 0xff5a12][(Math.random() * 3) | 0]!,
    }));

    /*
     * ⚠️ **A poeira nasce DESLOCADA do centro, e cada sopro tem o seu.** Sete
     * elipses concêntricas seriam um alvo de tiro; deslocadas, viram nuvem. É a
     * mesma correção que as chamas da muralha precisaram.
     */
    const poeira = Array.from({ length: cfg.poeira }, () => ({
      ox: sorte(-0.35, 0.35) * raioPx,
      oy: sorte(-0.2, 0.2) * raioPx * ACHATA,
      r0: raioPx * sorte(0.12, 0.3),
      r1: raioPx * sorte(0.75, 1.3),
      atraso: sorte(0, 0.22),
      dur: sorte(520, 900),
      sobe: sorte(4, 16),
    }));

    const nasceu = performance.now();
    const DUR = 1250;
    const passo = (): void => {
      const t = performance.now() - nasceu;
      if (t >= DUR) {
        chao.destroy(); solido.destroy(); aceso.destroy();
        app.ticker.remove(passo);
        return;
      }
      chao.clear(); solido.clear(); aceso.clear();

      for (const p of poeira) {
        const f = (t - p.atraso * DUR) / p.dur;
        if (f <= 0 || f >= 1) continue;
        const r = p.r0 + (p.r1 - p.r0) * (1 - (1 - f) * (1 - f));
        /*
         * ⚠️ **Sobe até um terço e some o resto do caminho.** Poeira que aparece
         * cheia e apaga linear lê como fumaça de desenho animado; a de verdade
         * ainda está engrossando quando já começou a rarear.
         */
        const a = (f < 0.33 ? f / 0.33 : 1 - (f - 0.33) / 0.67) * 0.26;
        chao.ellipse(p.ox, p.oy - p.sobe * f, r, r * ACHATA);
        chao.fill({ color: 0x7d6b57, alpha: Math.max(0, a) });
      }

      for (const p of pedras) {
        const f = t / p.voo;
        // ⚠️ Desacelera saindo (1−(1−f)²): pedra arremessada perde velocidade no
        // ar. Linear leria como peça deslizando em trilho.
        const avanco = f >= 1 ? 1 : 1 - (1 - f) * (1 - f);
        const x = Math.cos(p.ang) * p.dist * avanco;
        const y = Math.sin(p.ang) * p.dist * ACHATA * avanco;
        // Parábola: sobe e volta ao chão no fim do voo. Depois fica parada.
        const z = f >= 1 ? 0 : p.alto * 4 * f * (1 - f);
        const rot = p.rot + p.giro * Math.min(t, p.voo) * 0.35;
        /*
         * ⚠️ **Some no FIM da vida inteira, não no fim do voo.** O caco que
         * pousa e desaparece no mesmo quadro desmente o impacto; ele tem de
         * ficar ali um instante, como entulho, antes de sumir.
         */
        const vive = t < DUR * 0.62 ? 1 : 1 - (t - DUR * 0.62) / (DUR * 0.38);
        const cos = Math.cos(rot);
        const sen = Math.sin(rot);
        solido.poly(p.perfil.map(([px, py]) => ({
          x: x + px * cos - py * sen,
          y: y - z + px * sen + py * cos,
        })));
        solido.fill({ color: p.quente ? 0x4a2a1c : 0x352f2a, alpha: vive });
        if (p.quente) {
          // O miolo aceso da pedra que ainda está quente, esfriando no voo.
          const brasa = Math.max(0, 1 - f * 0.85) * vive;
          aceso.circle(x, y - z, 2.4);
          aceso.fill({ color: 0xff7a24, alpha: brasa * 0.75 });
        }
      }

      for (const p of fagulhas) {
        const f = t / p.voo;
        if (f >= 1) continue;
        const avanco = 1 - (1 - f) * (1 - f);
        const x = Math.cos(p.ang) * p.dist * avanco;
        const y = Math.sin(p.ang) * p.dist * ACHATA * avanco;
        const z = p.alto * 4 * f * (1 - f);
        /*
         * ⚠️ **Fagulha é RISCO, não ponto.** Um ponto de 2 px a esta velocidade
         * pisca e some; o traço na direção do próprio movimento é o que o olho lê
         * como faísca voando. O rabo encurta conforme ela perde velocidade.
         */
        const rabo = (1 - f) * 9;
        aceso.moveTo(x - Math.cos(p.ang) * rabo, y - z - Math.sin(p.ang) * rabo * ACHATA);
        aceso.lineTo(x, y - z);
        aceso.stroke({ width: p.tam, color: p.cor, alpha: (1 - f) * 0.95 });
      }
    };
    app.ticker.add(passo);
  }

  function clarãoDeImpacto(wx: number, wy: number, raioPx: number): void {
    /*
     * 🔴 **DUAS CAMADAS, e é isso que dá a sensação de impacto** — dono, 12/09:
     * *"quero um toque forte no solo, atravessando os inimigos que estiverem
     * nele"*.
     *
     * A primeira versão desenhava um anel só, na camada do CHÃO. Ele marcava a
     * área certa e não batia: passava por trás de quem estava em cima dele, e um
     * clarão que fica atrás do bicho não ilumina o bicho.
     *
     *  - **`chao`** (sob as entidades): o anel que ABRE, marcando onde pegou.
     *    É a informação — o raio verdadeiro do dano.
     *  - **`estouro`** (sobre as entidades): um disco branco que some em 120 ms.
     *    É a sensação — ele lava quem está dentro, e é a luz atravessando os
     *    inimigos que o dono pediu.
     *
     * ⚠️ O disco é MUITO mais curto que o anel (120 contra 260 ms). Luz de
     * impacto que demora a sair lê como fogo, não como raio.
     */
    const chao = new Graphics();
    chao.blendMode = 'add';
    chao.x = wx;
    chao.y = wy;
    chao.zIndex = -0.58;
    objects.addChild(chao);

    const estouro = new Graphics();
    estouro.blendMode = 'add';
    estouro.x = wx;
    estouro.y = wy;
    estouro.zIndex = 9999;
    fxLayer.addChild(estouro);

    const nasceu = performance.now();
    const DUR = 260;
    const FLASH = 120;
    const passo = (): void => {
      const t = performance.now() - nasceu;
      const r = t / DUR;
      if (r >= 1) {
        chao.destroy();
        estouro.destroy();
        app.ticker.remove(passo);
        return;
      }
      chao.clear();
      /*
       * ⚠️ **Abre depressa e freia** (raiz quadrada), em vez de linear. Uma onda
       * de choque é rápida no começo; linear lê como um círculo crescendo, que
       * é desenho de aura e não de batida.
       */
      const R = raioPx * (0.2 + Math.sqrt(r) * 0.8);
      chao.circle(0, 0, R).stroke({ width: 4 + r * 7, color: 0xeafaff, alpha: (1 - r) * 0.9 });
      chao.circle(0, 0, R * 0.55).stroke({ width: 2 + r * 3, color: 0x9fd8ff, alpha: (1 - r) * 0.55 });

      estouro.clear();
      if (t < FLASH) {
        const f = 1 - t / FLASH;
        // Achatado no eixo Y: é luz deitada no chão, não uma bola de luz.
        estouro.ellipse(0, 0, raioPx * (0.35 + (1 - f) * 0.5), raioPx * (0.18 + (1 - f) * 0.26))
          .fill({ color: 0xffffff, alpha: f * 0.75 });
      }
    };
    app.ticker.add(passo);
  }

  /**
   * A queda inteira de UMA conjuração de `n` bolts.
   *
   * 🔴 **Quantas cópias**: `ceil(n / bolts da folha)`. Com a folha de 1 e dez
   * bolts, dez cópias — o comportamento de ontem. Com a folha de 10, uma só.
   * A conta é a mesma nos dois casos, e é o que faz a arte por nível entrar sem
   * caso especial.
   *
   * ⚠️ As cópias são espaçadas por `INTERVALO_BOLT_MS`, **o mesmo número que o
   * servidor usa para espaçar o dano**. É o que mantém bola e estrago juntos.
   */
  function spawnQuedaDaConjuracao(
    magia: string, wx: number, wy: number, n: number, alvo?: string, quedaMs?: number,
    raioDano?: number, deOnde?: { x: number; y: number },
  ): void {
    const folha = folhaPara(magia, n);
    if (!folha) return;
    const copias = Math.max(1, Math.ceil(n / folha.bolts));
    for (let i = 0; i < copias; i++) {
      spawnQueda(magia, wx, wy, folha, i * INTERVALO_BOLT_MS, alvo, quedaMs, raioDano, deOnde);
    }
  }

  let myId: string | null = null;
  let myFloor = map.spawn.floor;
  /**
   * ✨ **QUEM ESTÁ CONJURANDO, e até quando.** Por id de entidade.
   *
   * 🔴 O servidor manda o COMEÇO e o FIM; a fração no meio é contada aqui. A
   * alternativa seria o servidor mandar progresso a cada tique — trinta
   * pacotes por conjuração, para uma barra que o cliente sabe desenhar
   * sozinho.
   */
  const conjurando = new Map<string, { ate: number; total: number; nome: string }>();

  let myTileX = map.spawn.x;
  let myTileY = map.spawn.y;

  /**
   * 🔬 **A RÉGUA DO PASSO** — ligada por `?passos=1` na URL.
   *
   * Existe porque a mesma queixa voltou três vezes (*"muito lento para os lados,
   * para baixo parece que está correndo"*) e três varreduras de código não
   * acharam assimetria nenhuma: o intervalo do servidor só distingue diagonal, o
   * envio do teclado é simétrico, `animationSpeed` é fixo, e as oito fileiras da
   * folha universal têm 16 quadros com dois passos cada.
   *
   * ⚠️ Quando ler o código não resolve, MEÇA. Isto cronometra o intervalo REAL
   * entre duas mudanças de tile do herói, separado por direção, e imprime a
   * mediana de cada uma. Se as oito baterem, o problema não é o passo — é a
   * leitura da animação, e o próximo lugar a olhar é outro.
   *
   * Uso: abrir `localhost:5173/?passos=1`, andar uns dez tiles em cada direção,
   * e chamar `passos()` no console.
   */
  const REGUA_PASSO = new URLSearchParams(location.search).has('passos');
  const amostras = new Map<string, number[]>();
  let ultimoPassoEm = 0;
  function anotaPasso(dx: number, dy: number, agora: number): void {
    if (ultimoPassoEm > 0) {
      const dir = `${dy < 0 ? 'N' : dy > 0 ? 'S' : ''}${dx < 0 ? 'O' : dx > 0 ? 'L' : ''}`;
      const lista = amostras.get(dir) ?? [];
      lista.push(agora - ultimoPassoEm);
      amostras.set(dir, lista);
    }
    ultimoPassoEm = agora;
  }
  if (REGUA_PASSO) {
    (window as unknown as { passos: () => void }).passos = () => {
      for (const [dir, lista] of amostras) {
        const ord = [...lista].sort((a, b) => a - b);
        const mediana = ord[Math.floor(ord.length / 2)] ?? 0;
        // eslint-disable-next-line no-console
        console.log(`[passo] ${dir.padEnd(2)} n=${String(ord.length).padStart(3)} `
          + `mediana=${Math.round(mediana)}ms  min=${ord[0]}  max=${ord[ord.length - 1]}`);
      }
    };
  }
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

  /**
   * Vizinhos considerados pela rota — **as OITO desde 2026-09-09**.
   *
   * 🔴 **Elas já estiveram aqui e foram removidas**, e a diferença agora é que
   * a CAUSA foi consertada. O bug era o `dirFromDelta` do servidor empatar em
   * `|dx| === |dy|` e devolver sempre `right`: o personagem atravessava o mapa
   * virado de lado. Cortar a diagonal escondia o sintoma. Com oito direções de
   * verdade não há empate, e a rota pode voltar a usá-las.
   *
   * ⚠️ **A diagonal fica ~33 % mais rápida** que o caminho em L de antes (um
   * passo em vez de dois). É o comportamento normal de MMO em grade, e muda a
   * sensação de andar — se incomodar, o conserto é custo 1,41 na diagonal, não
   * remover de novo.
   */
  const PASSOS_RETOS: Array<[number, number]> = [
    [0, -1], [0, 1], [-1, 0], [1, 0],
    [1, -1], [-1, -1], [1, 1], [-1, 1],
  ];

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
    limpaDestino();
  }

  function irPara(tx: number, ty: number): void {
    const rota = rotaAte(myTileX, myTileY, tx, ty);
    if (rota.length === 0) {
      cancelarRota();
      return;
    }
    caminho = rota;
    passoPedidoEm = 0;
    marcaDestino(tx, ty);
  }

  /**
   * Mira um alvo — ou LARGA o que já estava mirado, se for o mesmo.
   *
   * 🔴 **O segundo clique no mesmo alvo cancela**, e isso entrou em 2026-08-29
   * depois de o dono ficar preso batendo no irmão: *"eu clico novamente, mas
   * fica o círculo vermelho e continuo atacando infinitamente"*. O
   * `clearTarget` já existia e já funcionava — o servidor trata `cancel` desde
   * sempre — mas só estava ligado ao **Esc** e à própria morte. Quem joga de
   * mouse não tinha como parar, e no PvP isso é grave: não dá para desistir de
   * um golpe que rende ⚪ Caveira Branca.
   *
   * ⚠️ É toggle, e não "clicar fora cancela": clicar no chão é ANDAR, e no modo
   * Perseguir andar é justamente o que o alvo faz o jogador fazer. Cancelar ali
   * tiraria o alvo toda vez que alguém se movesse.
   */
  function setTarget(id: string): void {
    if (id === targetId) { clearTarget(); return; }
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
    net.send({ t: 'cancel' });
  }

  /**
   * ⚠️ `px` existe para o cartaz de LEVEL UP: `big` dá 20, que é o tamanho de
   * um acerto crítico, e o cartaz precisa ser maior que qualquer número que
   * apareça numa luta — senão ele se perde no meio deles.
   */
  function spawnFloater(
    wx: number, wy: number, text: string, color: number, big: boolean, px?: number,
  ): void {
    const node = new Text({
      text,
      style: {
        fill: color,
        fontSize: px ?? (big ? 20 : 14),
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
  /**
   * Famílias de efeito visual. Agrupadas por SENSAÇÃO, não por habilidade: o
   * jogador não precisa distinguir Pele de Carvalho de Bênção Espiritual pelo
   * brilho — precisa saber, de relance, se aquilo foi bom ou ruim para ele.
   */
  const FX_CURA = new Set(['heal', 'regeneration', 'area_heal', 'emergency_heal']);
  const FX_BUFF = new Set([
    'buff_agility', 'buff_oak', 'buff_spirit', 'buff_strength', 'buff_nature',
    'buff_amplify', 'reveal', 'magic_protection',
  ]);
  const FX_DEBUFF = new Set([
    'debuff_weaken', 'debuff_vulnerability', 'debuff_slow', 'debuff_curse',
    'silence', 'plague',
  ]);

  /**
   * 🖼️ Qual folha do pacote toca em cada família.
   *
   * ⚠️ **Por família, e não por habilidade**, e é a mesma razão que já governa
   * os conjuntos acima: o jogador não precisa distinguir Pele de Carvalho de
   * Bênção Espiritual pelo brilho — precisa saber de relance se aquilo foi bom
   * ou ruim para ele. Cinco animações dão conta disso; setenta e cinco só
   * dariam trabalho.
   *
   * ⚠️ Duas escapam da família porque a folha existe e é melhor: Proteção
   * Mágica é a `immunity` (o escudo), e Amplificação Mágica é a
   * `mana_recovery` (a onda de mana). Sem elas, essas duas folhas ficariam
   * cortadas e sem uso.
   */
  function folhaDoFx(kind: string): string | null {
    // ❄️ A Explosão Glacial tem folha própria, com nome igual ao do `fx`.
    if (kind === 'glacial_burst') return 'glacial_burst';
    if (kind === 'magic_protection') return 'immunity';
    if (kind === 'buff_amplify') return 'mana_recovery';
    if (FX_CURA.has(kind)) return 'life_recovery';
    if (FX_BUFF.has(kind)) return 'strength_buff';
    if (FX_DEBUFF.has(kind)) return 'debuff';
    return null;
  }

  function spawnSpellFx(
    kind: string, tileX: number, tileY: number, radius: number, alvo?: string,
  ): void {
    const node = new Container();
    node.x = tileX * TS + TS / 2;
    node.y = tileY * TS + TS / 2;
    node.zIndex = 9998;

    /*
     * 💥 **O CONTATO COM A MURALHA DE FOGO** — dono, 13/09: *"os monstros
     * precisam ter impacto ao tocarem nela"*.
     *
     * 🔴 O empurrão de dois tiles já existia e era INVISÍVEL: o monstro aparecia
     * mais atrás no quadro seguinte, sem nada dizendo por quê. O que faltava era
     * o instante — o clarão de onde ele bateu.
     *
     * ⚠️ **Nasce e some em 260 ms**, mais curto que qualquer outro efeito do
     * arquivo. Um contato acontece toda vez que um bicho encosta, e num bando
     * inteiro batendo na parede um efeito longo viraria um borrão aceso
     * cobrindo a muralha que o jogador quer ver.
     */
    if (kind === 'fire_wall_hit') {
      const g = new Graphics();
      g.blendMode = 'add';
      node.addChild(g);
      // 🔥 Estilhaços de brasa, com a mesma tabela dos outros impactos.
      cospeEstilhacos('fire_wall_hit', node.x, node.y);
      const nasceu = performance.now();
      const DUR = 260;
      const passo = (): void => {
        const r = (performance.now() - nasceu) / DUR;
        if (r >= 1) { node.destroy({ children: true }); app.ticker.remove(passo); return; }
        g.clear();
        /*
         * ⚠️ **Abre depressa e apaga devagar**, como as rachaduras do meteoro: é
         * o perfil que lê como BATIDA. Linear nos dois lados lê como pulsar.
         */
        const abre = Math.min(1, r / 0.25);
        const vive = 1 - Math.max(0, (r - 0.25) / 0.75) ** 1.4;
        // Anel achatado: o chão é visto de viés, e um círculo redondo lê de pé.
        g.ellipse(0, 0, TS * (0.35 + abre * 0.7), TS * (0.16 + abre * 0.32))
          .stroke({ width: 3, color: 0xffb347, alpha: vive * 0.85 });
        g.ellipse(0, 0, TS * 0.3 * abre, TS * 0.14 * abre)
          .fill({ color: 0xffe9b0, alpha: vive * 0.5 });
      };
      app.ticker.add(passo);
      fxLayer.addChild(node);
      return;
    }

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
    } else if (FX_CURA.has(kind)) {
      // 💚 Cura: partículas SUBINDO. O sentido do movimento é o que separa
      // cura de dano à primeira vista — dano cai, cura sobe.
      const halo = new Graphics();
      halo.circle(0, 0, TS * 0.55).stroke({ width: 3, color: 0x8fffb0, alpha: 0.85 });
      node.addChild(halo);
      for (let i = 0; i < 7; i++) {
        const p = new Graphics();
        p.circle(0, 0, 3).fill({ color: i % 2 ? 0xd8ffe6 : 0x5fe08a, alpha: 0.95 });
        p.x = (Math.random() - 0.5) * TS * 1.1;
        p.y = TS * 0.4 - Math.random() * TS * 0.9;
        node.addChild(p);
      }
    } else if (FX_BUFF.has(kind)) {
      // 🌟 Buff: anel duplo pulsando, em azul. Deliberadamente discreto — ele
      // acontece o tempo todo e não pode competir com o combate.
      for (const [r, cor] of [[TS * 0.7, 0xa8d8ff], [TS * 0.45, 0xdbeeff]] as const) {
        const anel = new Graphics();
        anel.circle(0, 0, r).stroke({ width: 2.5, color: cor, alpha: 0.85 });
        node.addChild(anel);
      }
    } else if (FX_DEBUFF.has(kind)) {
      // ☠️ Debuff: setas para BAIXO, roxas. O oposto visual do buff.
      for (let i = 0; i < 5; i++) {
        const seta = new Graphics();
        seta.poly([0, 0, -4, -9, 4, -9]).fill({ color: 0xc9a4ff, alpha: 0.9 });
        seta.x = (i - 2) * 10;
        seta.y = -6 + (i % 2) * 8;
        node.addChild(seta);
      }
    } else if (kind === 'earth_spike' || kind === 'roots') {
      // 🌿 Estacas saindo do chão, marrom-esverdeadas.
      for (let i = 0; i < 5; i++) {
        const e = new Graphics();
        e.poly([0, 8, -4, -14, 4, -12]).fill({ color: i % 2 ? 0x7a5a2a : 0x5aa02a, alpha: 0.95 });
        e.x = (i - 2) * 9;
        node.addChild(e);
      }
    } else if (kind === 'wind_blades') {
      // Lâminas em arco, cobrindo o raio real.
      const R = (radius + 0.5) * TS;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const l = new Graphics();
        l.poly([0, -3, 16, 0, 0, 3]).fill({ color: 0xd6f0b0, alpha: 0.85 });
        l.x = Math.cos(a) * R * 0.75;
        l.y = Math.sin(a) * R * 0.75;
        l.rotation = a;
        node.addChild(l);
      }
    } else if (kind === 'fire_bolt' || kind === 'meteor' || kind === 'meteor_storm') {
      // 🔥 Estouro laranja, com o raio da área quando há.
      const R = kind === 'fire_bolt' ? TS * 0.5 : (radius + 0.5) * TS;
      const bola = new Graphics();
      bola.circle(0, 0, R).fill({ color: 0xff6a1a, alpha: 0.35 });
      bola.circle(0, 0, R * 0.55).fill({ color: 0xffc74a, alpha: 0.6 });
      bola.circle(0, 0, R * 0.25).fill({ color: 0xfff3c8, alpha: 0.9 });
      node.addChild(bola);
      /*
       * ⚠️ `cold_bolt` saiu daqui em 10/09: ele passou a cair do céu com folha
       * própria (ver `MAGIAS_QUE_CAEM`), e o `fx` dele nunca mais chega neste
       * caminho. A Explosão Glacial continua sendo desenhada por código.
       */
    } else if (kind === 'glacial_burst') {
      // ❄️ Cristais irradiando. Área: o raio é o da explosão.
      const R = (radius + 0.5) * TS;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const c = new Graphics();
        c.poly([0, -3, R * 0.9, 0, 0, 3]).fill({ color: i % 2 ? 0x9fe4ff : 0xdcf6ff, alpha: 0.9 });
        c.rotation = a;
        node.addChild(c);
      }
    } else if (kind === 'electric_sphere' && alvo && pulsaOrbe(alvo)) {
      /*
       * ⚡ **O choque da Esfera não desenha um estouro novo: PULSA a esfera que
       * já está no alvo.** Ver `orbes`. Se não houver alvo vivo para pulsar, cai
       * no ziguezague de código logo abaixo — é o que acontece quando o efeito
       * chega sem `targetId`.
       */
      return;
    } else if (kind === 'electric_sphere' && quadrosChoque()) {
      /*
       * ⚡ **CADA CHOQUE usa a tira de IMPACTO**, e não o ziguezague desenhado
       * por código. Este caminho é o de reserva: só roda quando o efeito chega
       * sem `targetId` vivo para receber o orbe.
       *
       * ⚠️ **O giro é sorteado**: a tira tem um sentido só, e doze estouros na
       * mesma orientação denunciam a repetição.
       */
      const q = quadrosChoque()!;
      const choque = new AnimatedSprite(q);
      choque.anchor.set(0.5);
      choque.blendMode = 'add';
      choque.scale.set(0.34);
      choque.rotation = Math.random() * Math.PI * 2;
      choque.loop = false;
      choque.animationSpeed = q.length / (260 / (1000 / 60));
      choque.play();
      node.addChild(choque);
    } else if (kind === 'electric_sphere' || kind === 'discharge' || kind === 'thor_wrath') {
      // ⚡ Ziguezagues amarelos saindo do centro.
      const R = kind === 'electric_sphere' ? TS * 0.6 : (radius + 0.5) * TS;
      const raios = new Graphics();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        raios.moveTo(0, 0);
        raios.lineTo(Math.cos(a) * R * 0.45 + 6, Math.sin(a) * R * 0.45 - 5);
        raios.lineTo(Math.cos(a) * R, Math.sin(a) * R);
      }
      raios.stroke({ width: 2.5, color: 0xffe96a, alpha: 0.95 });
      node.addChild(raios);
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

  // -------------------------------------------------------------------------
  // 🌿 Áreas persistentes no chão
  //
  // ⚠️ Elas NÃO são `spellFx`: efeito visual some sozinho em meio segundo, e
  // estas ficam até o servidor mandar apagar. Um jogador que não vê onde a
  // nevasca está não tem como sair dela — e a magia vira punição arbitrária.
  // -------------------------------------------------------------------------

  const groundAreaNodes = new Map<string, Container>();
  /**
   * Qual barreira cada nó desenha, para a QUEBRA saber que folha tocar.
   *
   * ⚠️ O `areagone` só traz o id — a magia que criou a área não volta com ele.
   * Sem esta memória, o cliente tocaria os quadros de dissipação do fogo numa
   * parede de gelo, ou (pior) não tocaria nenhum e a parede sumiria piscando.
   */
  const muralhaDoNo = new Map<string, string>();



  /** Cor de cada área, pela habilidade que a criou. */
  const CORES_AREA: Record<string, [number, number]> = {
    fire_wall: [0xff6a1a, 0xffc74a],
    ice_wall: [0x6fd0ff, 0xdcf6ff],
    blizzard: [0x3aa8d8, 0xdcf6ff],
    arcane_circle: [0x8a5ad8, 0xefe6ff],
    spores: [0x6aa02a, 0xd6f0b0],
    sanctuary: [0x3fbf6a, 0xd8ffe6],
    nature_wrath: [0x5aa02a, 0xe6ffcf],
  };

  /**
   * 🔥 **As chamas da Muralha de Fogo, uma por CÉLULA ocupada.**
   *
   * 🔴 **Por célula, e não uma só esticada** — e a razão é a orientação. A
   * muralha pode nascer deitada (3×1) ou de pé (1×3); a arte é uma parede
   * horizontal de chamas, e esticá-la para cobrir uma coluna a deitaria. Chama
   * deitada é a coisa que o olho mais rejeita num efeito de fogo.
   *
   * ⚠️ **Nada é igual entre duas cópias** — fase, velocidade e espelhamento —, e é
   * isso que impede o *"aspecto completamente estático"* que a ficha do dono pede
   * para evitar. Ver `acende`.
   *
   * A folha tem três atos — a chama nascendo (1–6), a parede acesa (7–12) e a
   * dissipação (13–18) —, e eles são tocados como a barreira vive: nasce uma vez,
   * ARDE em laço enquanto durar, e só apaga quando o servidor manda.
   */
  /**
   * 🧱 **As barreiras de chão que têm FOLHA, e o que cada uma pede.**
   *
   * 🔴 Duas magias, um desenho só: a de fogo e a de gelo são a mesma coisa em
   * tela — uma fileira de algo que cresce do chão, arde/brilha enquanto dura e se
   * desfaz no fim. O que muda são números, e é por isso que eles moram numa
   * tabela em vez de num ramo por magia.
   *
   * ⚠️ **O ESTICÃO é 1 no gelo e 1,45 no fogo**, e a diferença não é gosto:
   * cristal esticado vira estalactite torta (a forma dele é rígida e o olho
   * conhece), enquanto chama esticada ainda lê como chama até certo ponto. Foi o
   * dono quem encontrou o limite do fogo em tela: a 3× virou vela.
   */
  const MURALHAS: Record<string, {
    folha: string; nasce: number; arde: number; larguraTiles: number; estica: number;
  }> = {
    // 🔥 18 quadros: nasce (1–12), arde em laço (6–12), dissipa (13–18).
    fire_wall: { folha: 'muralha18', nasce: 12, arde: 5, larguraTiles: 2.3, estica: 1.45 },
    /*
     * ❄️ 25 quadros, e a ficha do dono descreve as três fases: formação (1–15),
     * parede ativa (11–20) e destruição (21–25). O laço da parede ativa começa
     * ANTES do fim da formação de propósito — os cristais continuam crescendo um
     * pouco depois de a parede já bloquear, e é isso que tira o ar de desenho
     * parado que a ficha pede para evitar.
     */
    ice_wall: { folha: 'gelo25', nasce: 15, arde: 10, larguraTiles: 1.9, estica: 1 },
  };
  function chamasDaMuralha(node: Container, raioX: number, raioY: number, fx: string): void {
    const receita = MURALHAS[fx];
    if (!receita) return;
    const quadros = folhasEfeito.get(receita.folha);
    if (!quadros || quadros.length <= receita.nasce) return;
    const { nasce: NASCE, arde: ARDE } = receita;
    const deitada = raioX > raioY;
    const comprimento = (deitada ? raioX : raioY) * 2 + 1;

    /*
     * 🔥 **A BRASA NO CHÃO, e ela é SOMADA em vez de pintada.**
     *
     * Dono, 13/09: *"não parece que está vivo no chão"*. A primeira versão punha
     * uma elipse escura de chamuscado por baixo da luz, e em tela ela virou uma
     * MANCHA MARROM — o olho leu pedra, não brasa. Fogo não escurece o chão
     * enquanto arde: ele o ILUMINA.
     *
     * ✅ Duas elipses, as duas em mistura aditiva, achatadas porque o chão é
     * visto de viés. Só isso já prende a muralha ao piso.
     */
    const brasa = new Graphics();
    brasa.blendMode = 'add';
    for (let dy = -raioY; dy <= raioY; dy++) {
      for (let dx = -raioX; dx <= raioX; dx++) {
        const cx = dx * TS;
        const cy = dy * TS + TS / 4;
        brasa.ellipse(cx, cy, TS * 0.8, TS * 0.34).fill({ color: 0xff5a12, alpha: 0.30 });
        brasa.ellipse(cx, cy, TS * 0.42, TS * 0.18).fill({ color: 0xffc46b, alpha: 0.40 });
      }
    }
    node.addChild(brasa);

    /*
     * 🔴 **DUAS FILEIRAS DE CHAMA, e é isso que faz a parede parecer viva.**
     *
     * A versão anterior esticava UM desenho 3× na vertical para ficar alta. Em
     * tela o dono viu o que isso faz: *"parece que não está vivo"*. Esticar não
     * cria fogo — cria VELA. A chama desenhada tem uma proporção, e o movimento
     * dela (as pontas que sobem e somem) só lê nessa proporção; ao triplicar a
     * altura, cada lambida vira um risco vertical lento.
     *
     * ✅ Altura se constrói com CAMADAS, não com escala: uma fileira de trás,
     * maior e mais apagada, e uma da frente, na proporção natural. Juntas passam
     * de quatro tiles e continuam se mexendo como fogo.
     *
     * ⚠️ **E nada é igual entre duas cópias**: cada uma tem velocidade própria,
     * fase própria e metade delas está ESPELHADA. Era a mesma arte repetida no
     * mesmo ritmo — seis chamas idênticas lado a lado, que é o que o olho lê como
     * papel de parede em vez de fogo.
     */
    const ESTICA = receita.estica;
    const copias = comprimento;
    const largura = receita.larguraTiles * (deitada ? 1 : 0.8) * TS;
    const altura = (largura / 160) * 128 * ESTICA;

    const acende = (
      i: number, atras: boolean,
    ): void => {
      const off = i - (comprimento - 1) / 2;
      const s = new AnimatedSprite(quadros.slice(0, NASCE));
      /*
       * ⚠️ **Âncora 0,99: o PÉ da chama, medido.** O recorte alinha as fileiras
       * pelo chão e o desenho termina em 0,984–0,992 da altura do quadro.
       */
      s.anchor.set(0.5, 0.99);
      const escala = atras ? 1.3 : 1;
      s.x = (deitada ? off * TS : 0) + (atras ? (i % 2 ? 5 : -5) : 0);
      // A fileira de trás sobe um pouco: é o que dá profundidade sem esticar.
      s.y = (deitada ? 0 : off * TS) + TS / 4 - (atras ? TS * 0.55 : 0);
      /*
       * ⚠️ O espelhamento é no SINAL da escala, e alterna por cópia. Sem ele a
       * mesma língua de fogo aparece no mesmo lugar de cada célula, e a repetição
       * salta aos olhos antes da animação.
       */
      const espelha = (i + (atras ? 1 : 0)) % 2 === 0 ? 1 : -1;
      s.scale.set((largura / 160) * escala * espelha, (altura / 128) * escala);
      s.alpha = atras ? 0.55 : 1;
      /*
       * ⚠️ **Velocidade PRÓPRIA por cópia** (±18 %). Com todas no mesmo ritmo, as
       * fases se realinham a cada volta do laço e a parede volta a pulsar junto —
       * o defeito reaparece uns segundos depois de nascer, que é pior do que
       * nascer errado.
       */
      const ritmo = 0.82 + ((i * 7 + (atras ? 3 : 0)) % 5) * 0.09;
      s.animationSpeed = (NASCE / (700 / (1000 / 60))) * ritmo;
      s.currentFrame = (i * 3 + (atras ? 5 : 0)) % NASCE;
      s.loop = false;
      s.onComplete = () => {
        // Nasceu: passa a ARDER, em laço, até o servidor mandar apagar.
        s.textures = quadros.slice(ARDE, NASCE);
        s.loop = true;
        s.animationSpeed = ((NASCE - ARDE) / (600 / (1000 / 60))) * ritmo;
        s.gotoAndPlay((i * 2 + (atras ? 3 : 0)) % (NASCE - ARDE));
      };
      s.play();
      node.addChild(s);
    };

    // ⚠️ Trás primeiro: quem é desenhado depois fica na frente.
    for (let i = 0; i < copias; i++) acende(i, true);
    for (let i = 0; i < copias; i++) acende(i, false);
  }

  function addGroundArea(
    id: string, fx: string, tileX: number, tileY: number, radius: number, durationMs: number,
    raioX?: number, raioY?: number,
  ): void {
    removeGroundArea(id); // substituição (a 4ª muralha) reusa o mesmo caminho
    const [corte, brilho] = CORES_AREA[fx] ?? [0x8a5ad8, 0xefe6ff];
    const node = new Container();
    node.x = tileX * TS + TS / 2;
    node.y = tileY * TS + TS / 2;
    // Abaixo das entidades: a área é CHÃO, e cobrir o monstro que está dentro
    // dela seria esconder justamente o que o jogador precisa mirar.
    node.zIndex = 100;

    /*
     * 🔥 **A muralha desenha só as CHAMAS — sem retângulo, sem cantos.** A ficha
     * do dono é explícita (*"não adicionar círculo mágico, não adicionar aura"*),
     * e aqui a moldura seria pior que enfeite: a área dela É visível, são as
     * chamas. O retângulo continua para as outras seis, onde o efeito é discreto
     * e sem ele ninguém sabe onde a magia pega.
     */
    if (MURALHAS[fx] && folhasEfeito.has(MURALHAS[fx]!.folha)) {
      chamasDaMuralha(node, raioX ?? radius, raioY ?? radius, fx);
      muralhaDoNo.set(id, fx);
      fxLayer.addChild(node);
      groundAreaNodes.set(id, node);
      setTimeout(() => removeGroundArea(id), durationMs + 1500);
      return;
    }

    const lado = (radius * 2 + 1) * TS;
    const g = new Graphics();
    g.rect(-lado / 2, -lado / 2, lado, lado).fill({ color: corte, alpha: 0.22 });
    g.rect(-lado / 2, -lado / 2, lado, lado).stroke({ width: 2, color: brilho, alpha: 0.65 });
    node.addChild(g);
    // Marcas nos cantos: com opacidade baixa, a borda sozinha some no chão
    // claro da cidade.
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      const c = new Graphics();
      c.circle(0, 0, 3).fill({ color: brilho, alpha: 0.9 });
      c.x = (sx * lado) / 2;
      c.y = (sy * lado) / 2;
      node.addChild(c);
    }
    /*
     * ⚠️ **A NEVASCA NÃO PASSA MAIS POR AQUI** (11/09). Ela deixou de ser área
     * de chão e virou queda de bolas de neve — cada uma cai num ponto sorteado
     * e traz a própria coluna de gelo. Ver `snowball` em `FOLHAS_QUEDA`.
     *
     * O vórtice desenhado por código e a folha carregada aqui saíram junto: sem
     * remetente, viravam código morto.
     */

    fxLayer.addChild(node);
    groundAreaNodes.set(id, node);
    // Rede de segurança: se o `areagone` se perder, a área some sozinha um
    // pouco depois do previsto em vez de ficar pintada para sempre.
    setTimeout(() => removeGroundArea(id), durationMs + 1500);
  }

  function removeGroundArea(id: string): void {
    const node = groundAreaNodes.get(id);
    if (!node) return;
    groundAreaNodes.delete(id);
    /*
     * 🔥 **A muralha APAGA em vez de sumir.** A folha tem seis quadros de
     * dissipação, e cortá-los faria a parede piscar para fora — que é o defeito
     * que o `desvanece` das quedas existe para evitar. Os filhos são
     * `AnimatedSprite`; qualquer outra área cai no `destroy` de sempre.
     */
    const receita = MURALHAS[muralhaDoNo.get(id) ?? ''];
    muralhaDoNo.delete(id);
    const quadros = receita ? folhasEfeito.get(receita.folha) : undefined;
    const chamas = quadros
      ? node.children.filter((c): c is AnimatedSprite => c instanceof AnimatedSprite)
      : [];
    if (!quadros || !receita || chamas.length === 0) {
      node.destroy({ children: true });
      return;
    }
    const quebra = quadros.slice(receita.nasce);
    for (const s of chamas) {
      s.textures = quebra;
      s.loop = false;
      s.animationSpeed = quebra.length / (500 / (1000 / 60));
      s.gotoAndPlay(0);
    }
    // ⚠️ Um relógio só para o nó inteiro: `onComplete` por chama destruiria o
    // contêiner na primeira que acabasse, levando as outras junto pela metade.
    setTimeout(() => node.destroy({ children: true }), 520);
  }

  /**
   * ⚡ **A ESFERA ELÉTRICA é o primeiro projétil com FOLHA**, e não desenhado
   * por código.
   *
   * 🔴 **A folha original tinha grade IRREGULAR, e o cliente a fatiava em
   * dezesseis colunas iguais.** Era a causa do *"está dando muitas pontas nos
   * quadros da magia"* (dono, 12/09): as células vão de 159 a 247 px, o erro
   * acumulava, e do quinto quadro em diante cada fatia mostrava o fim de uma
   * esfera junto com o começo da seguinte — duas bolas e dois rastros no mesmo
   * desenho. Ver `tools/esfera2fx.mjs`, que corta pelos separadores de verdade.
   *
   * ⚠️ Fatiado sob demanda e guardado: `spawnProjectile` pode ser chamado várias
   * vezes por segundo, e refatiar as `Texture` a cada tiro seria lixo novo no
   * caminho do coletor.
   */
  const QUADROS_ORBE = 10;
  const QUADROS_CHOQUE = 6;

  /**
   * ⚡ **A ESFERA FICA NO ALVO, PULSANDO** — pedido do dono em 12/09: *"é para
   * ser uma esfera que vai até o alvo e fica pulsando nele; se ele morrer antes
   * da magia acabar, ela some"*.
   *
   * 🔴 **Antes, cada choque desenhava um estouro novo e a esfera sumia na
   * chegada.** Doze estouros em sequência no mesmo lugar leem como doze magias
   * pequenas, não como uma só — que é exatamente o que a spec pedia para evitar
   * (*"deve parecer UMA ÚNICA MAGIA contínua"*).
   *
   * ⚠️ **Um orbe por ALVO, e não por conjuração.** Dois feiticeiros na mesma
   * criatura compartilham a bola; é simplificação assumida, e a alternativa
   * (uma por lançador) empilharia duas esferas no mesmo pixel.
   *
   * ⚠️ **Ele expira sozinho**, e é isso que resolve o "se morrer, some": o
   * servidor para de mandar choques quando a criatura morre, ninguém renova o
   * prazo, e a bola apaga. Sem depender de um pacote de "acabou" que pode não
   * chegar.
   */
  const orbes = new Map<string, {
    node: AnimatedSprite;
    /** A coluna de luz que envolve o alvo a cada descarga. Ver `pulsaOrbe`. */
    coluna: Sprite;
    ate: number;
    pulso: number;
  }>();

  /**
   * Acende ou renova a esfera no alvo. Devolve `false` quando não há como —
   * folha ausente ou alvo que saiu da tela —, e aí o efeito cai no desenho
   * por código.
   */
  function pulsaOrbe(alvoId: string): boolean {
    const q = quadrosOrbe();
    const qc = quadrosChoque();
    const view = sprites.get(alvoId);
    if (!q || !qc || !view) return false;
    let orbe = orbes.get(alvoId);
    if (!orbe) {
      /*
       * ⚡ **NO ALVO ELA FICA DE FRENTE, e não de lado** — pedido do dono em
       * 12/09, com a folha na mão: *"a primeira [célula] a viagem até o alvo,
       * do segundo em diante quando acertou fica pulsando dessa forma"*.
       *
       * 🔴 São **duas vistas do mesmo desenho**, e essa era a peça que faltava.
       * Os quadros do voo mostram a esfera **de perfil**: bola de um lado,
       * cauda do outro — é o desenho de uma coisa que atravessa a tela. Os
       * quadros do impacto mostram a MESMA esfera **de frente**: os raios saem
       * para todos os lados em volta de um núcleo, porque agora ela está vindo
       * na sua direção. Pousar a vista de perfil em cima do monstro era o que o
       * dono via como "de lado".
       *
       * ⚠️ **Vaivém, e não laço simples.** Os quadros do impacto vão do estouro
       * cheio até quase apagar; em laço direto, a volta do último para o
       * primeiro seria um salto do apagado para o cheio a cada ciclo — uma
       * piscada, não um pulsar.
       */
      const node = new AnimatedSprite([qc[0]!, qc[1]!, qc[2]!, qc[3]!, qc[2]!, qc[1]!]);
      node.anchor.set(0.5);
      node.blendMode = 'add';
      // ⚠️ Seis quadros em ~420 ms: um pouco mais rápido que o intervalo entre
      // descargas, para a esfera nunca ficar parada esperando a próxima.
      node.animationSpeed = 6 / (420 / (1000 / 60));
      node.play();
      node.zIndex = 10000;
      fxLayer.addChild(node);
      /*
       * ⚡ **A COLUNA DE LUZ é o que o dono mostrou na referência** (o Trovão de
       * Júpiter do RO, 12/09): no impacto o alvo é envolvido por uma coluna
       * violeta que acende e apaga a cada descarga, e não por um estouro novo
       * em cima do anterior.
       *
       * ⚠️ **Ela reaproveita o PRIMEIRO quadro do orbe, esticado e tingido.** É
       * de propósito, e não preguiça: um degradê vertical desenhado por código
       * teria borda reta, e arte nova para isto seria uma folha inteira para um
       * efeito que aparece 120 ms de cada vez. Esticado, o halo redondo vira
       * exatamente o fuso de luz que a referência mostra.
       */
      const coluna = new Sprite(q[0]);
      coluna.anchor.set(0.5, 1);
      coluna.blendMode = 'add';
      coluna.tint = 0xb98cff;
      coluna.zIndex = 9999;
      fxLayer.addChild(coluna);
      orbe = { node, coluna, ate: 0, pulso: 0 };
      orbes.set(alvoId, orbe);
    }
    /*
     * ⚠️ **O prazo é renovado a cada choque, e sobra pouco depois do último.**
     * 320 ms é mais que o intervalo entre choques (140) e menos que o tempo que
     * o olho leva para achar que a bola ficou presa ali.
     */
    orbe.ate = performance.now() + 320;
    orbe.pulso = 1;
    return true;
  }
  /** Fatia uma tira de N quadros de largura igual. Agora É igual — ver acima. */
  function fatiaTira(arq: string, n: number, cache: { v: Texture[] | null }): Texture[] | undefined {
    if (cache.v) return cache.v;
    const t = Assets.get<Texture>(arq);
    if (!t) return undefined;
    const cw = t.width / n;
    cache.v = Array.from({ length: n }, (_, i) => new Texture({
      source: t.source,
      frame: new Rectangle(i * cw, 0, cw, t.height),
    }));
    return cache.v;
  }
  const orbeCache: { v: Texture[] | null } = { v: null };
  const choqueCache: { v: Texture[] | null } = { v: null };
  const quadrosOrbe = (): Texture[] | undefined =>
    fatiaTira('/assets/fx/esfera_orbe.png', QUADROS_ORBE, orbeCache);
  const quadrosChoque = (): Texture[] | undefined =>
    fatiaTira('/assets/fx/esfera_choque.png', QUADROS_CHOQUE, choqueCache);

  function spawnProjectile(fromWX: number, fromWY: number, toTileX: number, toTileY: number, kind: string): void {
    const quadros = kind === 'electric_sphere' ? quadrosOrbe() : undefined;
    if (quadros) {
      const esfera = new AnimatedSprite(quadros);
      esfera.anchor.set(0.5);
      esfera.blendMode = 'add';
      /*
       * ⚠️ **0,62 de escala, e era 0,40 sobre um quadro de 192 px.** A tira nova
       * tem 128 px de lado e a bola ocupa quase tudo (o recorte em disco tirou o
       * rastro, que era metade da largura antiga). 0,62 × 128 ≈ 80 px, ou dois
       * tiles e meio — o mesmo tamanho em tela que o dono aprovou, num quadro
       * menor.
       */
      esfera.scale.set(0.62);
      /*
       * ⚠️ **Em LAÇO, e antes tocava uma vez só.** A bola não tem mais fases de
       * formação para percorrer: a tira é a MESMA bola crepitando, em vaivém. O
       * "nascer como fagulha e chegar carregada" passou a ser a ESCALA, logo
       * abaixo — que é como a referência do dono faz, com uma bola de tamanho
       * constante deslizando e o brilho subindo.
       */
      esfera.loop = true;
      esfera.animationSpeed = QUADROS_ORBE / (600 / (1000 / 60));
      esfera.play();
      esfera.zIndex = 10000;
      fxLayer.addChild(esfera);
      projectiles.push({
        node: esfera,
        fromX: fromWX + TS / 2, fromY: fromWY + TS / 2,
        toX: toTileX * TS + TS / 2, toY: toTileY * TS + TS / 2,
        // ⚡ Bate com o `projetilMs` da ficha: o dano do servidor sai quando a
        // esfera chega. Os dois números são a mesma decisão, em dois lados.
        t: 0, dur: 380,
        // ⚡ Cresce ao longo da viagem: sai da mão pequena e chega carregada.
        cresce: { de: 0.34, ate: 0.62 },
        semGiro: true,
      });
      return;
    }
    const node = new Graphics();
    if (kind === 'firebolt') {
      node.circle(0, 0, 5).fill(0xff8c2a);
      node.circle(0, 0, 3).fill(0xffe08a);
    } else if (kind === 'icebolt') {
      node.circle(0, 0, 5).fill(0x6fd0ff);
      node.circle(0, 0, 3).fill(0xe0f6ff);
    } else {
      /*
       * 🏹 **A flecha estava pequena demais para ser vista.** O dono: *"o
       * arqueiro não está atirando flechas"* — ela era desenhada, mas com 12 px
       * de haste num tile de 32, cruzando a tela em 180 ms. No tempo de olhar,
       * já tinha acabado.
       *
       * Agora tem 22 px, ponta de metal clara contra a haste escura e uma
       * empena atrás, que é o que dá o sentido de direção. Ver também a duração
       * do voo, logo abaixo.
       */
      node.rect(-11, -1, 20, 2).fill(0x6b4f2f);           // haste
      node.poly([9, -4, 15, 0, 9, 4]).fill(0xdfe7f2);      // ponta
      node.poly([-11, -4, -5, 0, -11, 4]).fill(0xd8d0c0);  // empena
    }
    fxLayer.addChild(node);
    projectiles.push({
      node,
      fromX: fromWX + TS / 2, fromY: fromWY + TS / 2,
      toX: toTileX * TS + TS / 2, toY: toTileY * TS + TS / 2,
      /*
       * ⚠️ 260 ms, e não os 180 de antes. O voo continua rápido — é uma flecha —
       * mas 180 ms num alcance de 5 tiles era um borrão de dois quadros a 60 Hz.
       */
      t: 0, dur: 260,
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
        /*
         * 🔴 **Onde a fazenda desenha, o desenho por regra é DESLIGADO.**
         *
         * Ali o chão, as paredes e as árvores vêm dos PNGs assados do
         * `Farm.tmx` (`client/src/farmart.ts`), que são arte de verdade. Deixar
         * este laço rodar junto poria blocos 2.5D marrons por CIMA do moinho e
         * do celeiro — `objects` é desenhado acima da camada da fazenda.
         *
         * 🔴 **A pergunta é `farmDesenhaCelula`, e NÃO `dentroDaFarm`** — trocar
         * uma pela outra foi o que criou a faixa preta em volta da fazenda que o
         * dono relatou em 30/08. O retângulo da fazenda é maior que a arte dela,
         * e ela **deixa buracos de propósito**: onde o pack só pintava grama
         * chapada, quem desenha é este laço, com a textura de todo o resto do
         * mundo. É o que costura a fazenda ao campo em vez de colá-la em cima.
         *
         * ⚠️ A colisão NÃO é afetada: ela lê os tiles, que continuam lá. Só o
         * desenho sai de cena.
         */
        if (renderedFloor === 0 ? farmDesenhaCelula(x, y) : interiorEm(x, y, renderedFloor)) continue;
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

  /**
   * 🔴 **Aplica as edições de cenário do `/remove`** — a metade do cliente.
   *
   * O servidor já mudou o tile no mapa dele; aqui o mesmo tile muda no mapa
   * daqui, e três coisas precisam acontecer **nesta ordem**:
   *
   * 1. registrar a edição, porque `farmDesenhaCelula` consulta a tabela e é ela
   *    que manda o motor voltar a pintar o chão dentro da fazenda;
   * 2. escrever o tile na camada;
   * 3. **remontar o pedaço**, que é o passo que se esquece: `montaChunk` assou
   *    os sprites daquele retângulo uma vez, e sem jogá-los fora a árvore
   *    apagada continua na tela até o jogador andar 16 tiles.
   *
   * ⚠️ **Limite conhecido:** reconectar sem recarregar a página não desfaz
   * edição nenhuma que tenha sido restaurada enquanto este cliente estava fora.
   * A lista `inteira` do login soma, não substitui o mapa já pintado. Para uma
   * ferramenta de autoria isso é aceitável — F5 resolve — e consertar de
   * verdade exigiria guardar o terreno original de cada célula no cliente.
   */
  function aplicaEdicoesDoServidor(
    edits: WorldEdit[],
    desfeitas?: { floor: number; x: number; y: number }[],
  ): void {
    for (const d of desfeitas ?? []) esqueceEdicao(d.floor, d.x, d.y);
    registraEdicoes(edits.filter((e) => !(desfeitas ?? []).some(
      (d) => d.floor === e.floor && d.x === e.x && d.y === e.y,
    )));
    aplicaEdicoes(map.floors, map.width, map.height, edits);

    for (const e of edits) {
      /*
       * A metade visual, e são dois casos opostos no mesmo laço:
       * - com `arte` → o /paste: carimba os pixels da célula de origem;
       * - sem `arte` → o /remove: fura o PNG e o motor volta a pintar o chão.
       * Só o andar 0 tem fazenda desenhada.
       */
      if (e.floor === 0 && dentroDaFarm(e.x, e.y)) {
        if (e.arte) farmArte?.copiaCelula(e.arte.x, e.arte.y, e.x, e.y);
        else farmArte?.apagaCelula(e.x, e.y);
      }
      if (e.floor !== renderedFloor) continue;
      const k = `${Math.floor(e.x / CHUNK)},${Math.floor(e.y / CHUNK)}`;
      const v = chunksVivos.get(k);
      if (v) {
        descartaChunk(v);
        chunksVivos.delete(k);
      }
    }
    // `atualizaChunks` só trabalha quando a FAIXA muda, e ela não mudou —
    // então o pedaço descartado precisa ser pedido de volta na marra.
    chunkRangeAtual = '';
    atualizaChunks();
  }

  // ---- Construtor de mapas (tecla E) --------------------------------------

  const editor = await criaEditor(() => enviaOk());
  const decalContainers = { chao: decChao, baixo: decBaixo, acima: decAcima };
  /** Sprite de cada decalque vivo, por id — para o `/undo` saber o que tirar. */
  const decalSprites = new Map<number, Sprite>();

  /**
   * Desenha (ou apaga) os objetos que o construtor posicionou.
   *
   * ⚠️ **A âncora é o CENTRO da célula**, e é o que faz o giro funcionar: com a
   * âncora no canto, girar 90° jogaria o sprite para fora do tile em vez de
   * rodá-lo no lugar.
   *
   * ⚠️ Só desenha os do andar em que se está. Andar é troca de cena inteira
   * (`rebuildFloor`), e um decalque do térreo pendurado dentro da casa seria um
   * fantasma.
   */
  function aplicaDecalques(decals: WorldDecal[], removidos?: number[], inteira?: boolean): void {
    if (inteira) {
      for (const s of decalSprites.values()) s.destroy();
      decalSprites.clear();
    }
    for (const id of removidos ?? []) {
      decalSprites.get(id)?.destroy();
      decalSprites.delete(id);
    }
    for (const d of decals) {
      decalSprites.get(d.id)?.destroy();
      const tex = editor?.textura(d.paleta);
      if (!tex) continue;
      const sp = new Sprite(tex);
      sp.anchor.set(0.5);
      sp.x = d.x * TS + TS / 2;
      sp.y = d.y * TS + TS / 2;
      sp.angle = d.rot;
      sp.visible = d.floor === renderedFloor;
      (decalContainers[d.camada] ?? decBaixo).addChild(sp);
      decalSprites.set(d.id, sp);
      decalGuardados.set(d.id, d);
    }
  }
  /** A lista crua, para reavaliar a visibilidade quando o andar muda. */
  const decalGuardados = new Map<number, WorldDecal>();

  function enviaOk(): void {
    const sel = editor?.selecao();
    if (!sel) {
      logChat('Construtor: escolha um sprite na paleta antes do /ok.', 'sys');
      return;
    }
    net.send({ t: 'decal', ...sel });
  }

  function rebuildFloor(floor: number): void {
    limpaChunks();
    renderedFloor = floor;
    // A fazenda é do andar 0; os interiores dela, do 1. Só um dos dois aparece.
    farmArte?.mostraAndar(floor);
    for (const [id, sp] of decalSprites) {
      sp.visible = decalGuardados.get(id)?.floor === floor;
    }
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
        case 'worldedit':
          aplicaEdicoesDoServidor(msg.edits, msg.desfeitas);
          break;
        case 'decals':
          aplicaDecalques(msg.decals, msg.removidos, msg.inteira);
          break;
        case 'stats':
          myAttackRange = msg.attackRange;
          /*
           * Velocidade autoritativa do herói, como o servidor a manda.
           *
           * 🔴 **Aqui havia um arredondamento para cima ao tique de 15 Hz**, com
           * a justificativa de que o servidor testaria a liberação do passo uma
           * vez por tique. **A premissa é falsa:** `handleMessage` roda na
           * CHEGADA do pacote (`socket.on('message')`), não no laço do mundo —
           * o `case 'move'` compara `now - lastMoveAt` no instante em que o
           * pedido chega. Não há quantização de tique nenhuma no passo do
           * jogador.
           *
           * ⚠️ O arredondamento acrescentava até um tique inteiro (67 ms) de
           * deslize a mais que o passo real. Isso NÃO congelava — congelar é o
           * contrário —, mas fazia o ciclo de pernas ser cortado antes do fim a
           * cada tile: a fase saltava de ~0,85 de volta para 0, todo passo. Um
           * pulinho por tile, que é metade da sensação de "travando".
           *
           * ✅ Quem cobre a diferença entre o intervalo nominal e o que se vê na
           * tela é `stepDurationFor`, e por um motivo medido — ver lá.
           */
          heroiStepMs = msg.moveIntervalMs;
          updateHud(msg);
          updateAttrHud(msg);
          updateSpellBar(msg);
          updateSkillPanel(msg);
          updateBestiary(msg);
          break;
        case 'cast':
          onCastAccepted(msg.spell as SkillId, msg.cooldownMs);
          break;
        case 'fx':
          if (msg.floor !== myFloor) break;
          /*
           * 🔥 O Fire Bolt tem folha própria e cai do céu; não é um `spellFx`
           * geométrico como o giro do Vendaval. O `n` é a contagem de bolts,
           * que decide a folha e quantas cópias tocam.
           */
          if (MAGIAS_QUE_CAEM.has(msg.kind)) {
            /*
             * ⚠️ **Chega UM `fx` POR BOLT desde 10/09**, e não mais um por
             * conjuração com `n` bolts. Quem espaça as bolas no tempo agora é o
             * servidor, que só anuncia cada uma quando ela nasce — é o que faz
             * a chuva parar quando o monstro morre.
             *
             * O caminho de `n > 1` continua aqui de propósito: é ele que faria
             * a folha de dez bolas voltar a funcionar, e ela está pronta em
             * disco (ver `folhasQueda`).
             */
            spawnQuedaDaConjuracao(
              msg.kind, msg.x * TS + TS / 2, msg.y * TS + TS, msg.n ?? 1,
              msg.targetId, msg.quedaMs, msg.radius,
              /*
               * 🌠 Quantos tiles o ALVO está à direita de quem conjurou. É o
               * SINAL disso que decide por onde o meteoro entra — ver `lado` em
               * `spawnQueda`. Ausente quando o servidor não mandou o `fromX`,
               * e aí a trajetória cai no lado padrão.
               */
              msg.fromX === undefined || msg.fromY === undefined
                ? undefined
                : { x: msg.x - msg.fromX, y: msg.y - msg.fromY },
            );
            break;
          }
          {
            /*
             * ⚠️ A folha vem ANTES do desenho por código: onde há arte, é ela
             * que toca. O `spawnSpellFx` continua atendendo as outras sessenta
             * e poucas habilidades, e é para onde cai tudo que não tem folha.
             */
            const folha = folhaDoFx(msg.kind);
            if (folha) tocaEfeito(folha, msg.x * TS + TS / 2, msg.y * TS + TS);
            else spawnSpellFx(msg.kind, msg.x, msg.y, msg.radius ?? 1, msg.targetId);
          }
          break;
        case 'heal': {
          // Cura é número VERDE e para cima, nunca vermelho: o jogador tem de
          // distinguir "levei 40" de "recebi 40" com o olho, não com a leitura.
          const view = sprites.get(msg.targetId);
          if (view) {
            spawnFloater(view.container.x, view.container.y - 12, `+${msg.amount}`, 0x6ee06e, false);
          }
          break;
        }
        case 'casting':
          /*
           * ⚠️ **Sem caso especial para o jogador local.** Ele vê a própria
           * conjuração do mesmo jeito que vê a dos outros: sobre a cabeça. A
           * barra do HUD que existia para ele saiu — ver a nota lá embaixo.
           */
          if (msg.spell === null) {
            /*
             * ⚠️ **Apagar do mapa NÃO limpa o sprite.** O laço por quadro só
             * mexe em quem ESTÁ no mapa; tirando de lá sem avisar a entidade,
             * a aura, a barra e a pose segurada ficavam para sempre — e a pose
             * é a pior das três, porque o personagem congelava no gesto.
             */
            conjurando.delete(msg.casterId);
            sprites.get(msg.casterId)?.setCasting?.(null);
            // ⭕ *"Quando a magia soltar ele pode sumir."*
            marcaConjuracao(msg.casterId);
          } else {
            // ⭕ O círculo só nasce quando o servidor manda o ponto — ou seja,
            // só em magia que mira o chão. Ver `S2C_Casting`.
            marcaConjuracao(
              msg.casterId,
              msg.x !== undefined && msg.y !== undefined
                ? { x: msg.x, y: msg.y, raio: msg.raio ?? 0 }
                : undefined,
            );
            conjurando.set(msg.casterId, {
              ate: performance.now() + msg.ms,
              total: msg.ms,
              // ⚠️ O nome vem da FICHA, não do servidor: ele já manda o id, e
              // mandar o nome junto seria a mesma string trafegando a cada
              // conjuração para algo que o cliente sabe traduzir.
              nome: SKILLS[msg.spell as SkillId]?.name ?? '',
            });
          }
          break;
        case 'area':
          if (msg.floor === myFloor) {
            addGroundArea(
              msg.id, msg.fx, msg.x, msg.y, msg.radius, msg.durationMs,
              msg.raioX, msg.raioY,
            );
          }
          break;
        case 'areagone':
          removeGroundArea(msg.id);
          break;
        case 'hit': {
          // Quem bateu toca a animação de ataque; quem levou (e não esquivou)
          // toca a de dano — feedback visual casado com o combate autoritativo.
          // Parcela de DoT não é golpe: ninguém desferiu nada, então nem a
          // animação de ataque nem a de dano devem tocar. Piscar o alvo a cada
          // tique de veneno viraria epilepsia.
          // 🔴 Elemento mágico = feitiço, e o gesto é o de conjurar. É o único
          // sinal disponível: o `hit` não diz qual habilidade foi usada, mas
          // fire bolt chega como `fire` e cold bolt como `ice`, enquanto uma
          // espadada chega como `physical` (ou sem o campo).
          if (!msg.dot) {
            const magia = msg.element !== undefined && msg.element !== 'physical';
            /*
             * ⚠️ `semGesto`: as magias que caem do céu mandam um `hit` por
             * bola, e o gesto de conjurar é UM por conjuração. Ver o campo no
             * protocolo. O alvo continua piscando e o número continua saindo —
             * só o gesto de quem conjurou fica de fora.
             */
            if (!msg.semGesto) sprites.get(msg.attackerId)?.playAttack?.(magia);
            /*
             * 🔥 Golpe de FOGO faz cair uma bola do céu sobre o alvo. Um `hit`
             * = uma bola, então a contagem do Fire Bolt (um bolt por nível)
             * sai sozinha, sem o cliente saber o nível de ninguém.
             *
             * ⚠️ Os impactos da mesma conjuração chegam no MESMO pacote. Sem
             * defasagem as dez bolas cairiam empilhadas e pareceriam uma só —
             * daí o contador de rajada, que zera quando passa tempo demais
             * entre dois golpes para serem a mesma.
             */
            /*
             * ⚠️ **A queda NÃO nasce mais aqui.** Até 08/09 cada `hit` de fogo
             * soltava uma bola; agora a animação é uma por CONJURAÇÃO e vem
             * pelo `fx`, que traz a contagem de bolts. Manter as duas faria a
             * bola aparecer duas vezes por impacto.
             */
          }
          /*
           * ⚔️ **DANO CONFIRMADO: é ISTO que revela a barra de vida.** A ficha é
           * taxativa sobre o que NÃO vale — passar o mouse, clicar, selecionar,
           * errar, ser bloqueado, o servidor recusar. Aqui só entra o que o
           * servidor já cobrou de alguém: esquiva fora, dano zero fora.
           *
           * ⚠️ **DoT conta.** Veneno e queimadura são dano real, e a ficha só
           * exclui o que não machucou. O que o `dot` evita é o GESTO de ataque,
           * mais acima — coisa diferente.
           */
          if (!msg.dodged && msg.amount > 0 && msg.targetId === targetId) {
            jaSangrou.add(msg.targetId);
          }
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
          /*
           * 🔴 **A MESMA mensagem serve às duas progressões**, e o `kind` é o
           * que as separa. Ausente vale `base`: a mensagem existia antes de o
           * Job Level existir.
           */
          const job = msg.kind === 'job';
          const me = myId ? sprites.get(myId) : undefined;
          if (me) {
            tocaEfeito('revival', me.container.x + TS / 2, me.container.y + TS);
            /*
             * ⚠️ O cartaz sobe MAIS ALTO que o número de dano (-52 contra -30):
             * a animação ocupa a altura do personagem, e a 30 px o texto caía
             * dentro das asas.
             */
            spawnFloater(
              me.container.x, me.container.y - 52,
              job ? 'JOB LEVEL UP!' : 'LEVEL UP!',
              job ? 0x8fd8ff : 0xffd97a,
              true, 26,
            );
          }
          logChat(
            job
              ? `Seu <b>Job Level</b> subiu para <b>${msg.level}</b>!`
              : `Você subiu para o <b>nível ${msg.level}</b>!`,
            'sys',
          );
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
  const janDeposito = el('jan-deposito');
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
    /*
     * 🏹 A aljava fecha a grade numa décima posição. As nove primeiras são o
     * paperdoll clássico do Tibia e não se mexem — quem já jogou procura a
     * armadura no meio, e mover tudo para centralizar a peça nova custaria mais
     * do que a simetria vale.
     */
    'quiver', null, null,
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
      case 'quiver': {
        // Um cilindro com três hastes saindo, que é o desenho universal de aljava.
        poly([cx - 4, 9, cx + 4, 9, cx + 3, S - 3, cx - 3, S - 3]);
        g.lineWidth = 1.2;
        for (const ox of [-3, 0, 3]) {
          g.beginPath(); g.moveTo(cx + ox, 9); g.lineTo(cx + ox * 1.6, 2); g.stroke();
        }
        break;
      }
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
    /*
     * 🖼️ Arte da folha, quando o item tem uma (09/09). Vem ANTES do cristal e
     * do desenho por código: onde há desenho do dono, é ele que manda.
     *
     * ⚠️ Desenhada com suavização LIGADA, ao contrário do cristal logo abaixo —
     * aquele é pixel art de 16 px que borra se filtrado; esta é ilustração de
     * 130 px sendo reduzida para 64, e sem filtro serrilharia.
     */
    const arte = itemArtImage(kind);
    if (arte) {
      g.drawImage(arte, 0, 0, S, S);
      itemIconCanvasCache.set(kind, cv);
      return cv;
    }

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
    } else if (def?.category === 'ammo') {
      // 🏹 Um feixe de três flechas, apontando para cima. Desenhado por código
      // como o resto do espólio: é um item de sistema, não de arte curada.
      for (const ox of [-5, 0, 5]) {
        const x = S / 2 + ox;
        g.strokeStyle = hx(shade(color, 0.55)); g.lineWidth = 2;
        g.beginPath(); g.moveTo(x, 6); g.lineTo(x, S - 4); g.stroke();
        g.fillStyle = '#cdd3da'; // ponta de metal
        g.beginPath(); g.moveTo(x, 2); g.lineTo(x - 3, 8); g.lineTo(x + 3, 8); g.closePath(); g.fill();
        g.fillStyle = hx(color); // empena
        g.fillRect(x - 3, S - 10, 6, 3);
      }
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
    // ⚠️ Arte ilustrada vai direto, em tamanho cheio — ver `itemArtUrl`.
    const arte = itemArtUrl(kind);
    if (arte) return arte;
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

  /**
   * Canal de arraste que carrega o **tipo** do item, para os itens rápidos.
   *
   * ⚠️ Canal próprio, e não o `text/plain` que a mochila já usa: aquele leva
   * `bp:7`, uma POSIÇÃO, e é o que faz o rearranjo funcionar. Os dois viajam
   * juntos no mesmo arraste, e cada destino lê o que sabe usar — a mochila, a
   * posição; o slot rápido, o tipo. Enfiar os dois num campo só obrigaria os
   * dois lados a decodificar o do outro.
   */
  const DND_ITEM = 'application/x-elysia-item';

  function makeItemCell(stack: ItemStack | null, onClick: () => void, dragData?: string): HTMLElement {
    const cell = document.createElement('div');
    cell.className = stack ? 'islot' : 'islot empty';
    if (stack) {
      const img = document.createElement('img');
      img.src = itemIconUrl(stack.kind);
      // ⚠️ Só a arte ilustrada foge do `pixelated` — ver o CSS de `.arte`.
      if (itemArtUrl(stack.kind)) img.className = 'arte';
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
        cell.addEventListener('dragstart', (e) => {
          e.dataTransfer?.setData('text/plain', dragData);
          /*
           * ⚠️ Só da MOCHILA. Do depósito o tipo também viajaria, e o slot
           * ficaria montado com uma poção que o jogador não carrega — um botão
           * que nunca funciona até ele voltar ao banco e sacar.
           */
          if (dragData.startsWith('bp:')) e.dataTransfer?.setData(DND_ITEM, stack.kind);
        });
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
        if (!prefOrigem || !prefDestino) return;

        /*
         * 🏹 **MOCHILA ↔ ALJAVA, e era o bug que o dono relatou em 2026-09-11:**
         * *"eu compro flechas e tento colocar dentro do Aljava, mas elas não
         * entram."*
         *
         * 🔴 A causa era a linha que exigia `prefOrigem === prefDestino`.
         * Arrastar `bp:3` para `qv:0` tem prefixos diferentes, então a função
         * **saía calada** — sem mensagem, sem recusa, sem nada. O jogador larga
         * a flecha em cima da aljava e o jogo simplesmente ignora, que é o pior
         * jeito de dizer "não".
         *
         * ⚠️ A trava existia por um bom motivo (não misturar mochila com
         * depósito, que tem caminho próprio com validação de proximidade). Ela
         * continua valendo — o que entrou foi a exceção da aljava, que o
         * servidor JÁ sabia tratar por `equip`/`unquiver`. Nenhuma mensagem
         * nova de rede foi criada.
         */
        if (prefOrigem === 'bp' && prefDestino === 'qv') {
          net.send({ t: 'equip', index: Number(iOrigem) });
          return;
        }
        if (prefOrigem === 'qv' && prefDestino === 'bp') {
          net.send({ t: 'unquiver', index: Number(iOrigem) });
          return;
        }

        if (prefOrigem !== prefDestino) return;

        /*
         * 🔴 **ARRASTAR DENTRO DA ALJAVA MEXIA NO DEPÓSITO.** Achado ao
         * consertar o de cima, e nunca relatado porque o estrago é invisível:
         * `where` saía de `prefOrigem === 'bp' ? 'backpack' : 'depot'`, um
         * ternário escrito quando só existiam essas duas listas. Com a aljava,
         * `qv` caía no `else` — e reordenar duas flechas TROCAVA dois slots do
         * depósito, enquanto as flechas ficavam paradas.
         *
         * ✅ Agora a lista é nomeada, e prefixo desconhecido não manda nada.
         */
        const where = prefOrigem === 'bp' ? 'backpack' : prefOrigem === 'dp' ? 'depot' : null;
        if (!where) return;
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
    /*
     * 🏹 Munição usa o MESMO comando de equipar: para o jogador, clicar numa
     * flecha e ela ir para a aljava é o mesmo gesto de clicar numa espada e ela
     * ir para a mão. Quem separa os dois casos é o servidor.
     */
    else if (def?.category === 'equip' || def?.category === 'ammo') {
      net.send({ t: 'equip', index: i });
    }
  }

  const bpSubhead = el('bpsubhead');
  const qvSubhead = el('qvsubhead');
  const qvGrid = el('qvgrid');

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
    /*
     * 🏹 A ALJAVA. Some inteira quando não há uma equipada — cabeçalho e grade —
     * porque um bloco vazio permanente na barra lateral custa altura a todo
     * mundo por uma coisa que só o arqueiro usa.
     */
    const aljava = currentInv.equipment.quiver;
    const temAljava = !!aljava && currentInv.quiver.length > 0;
    qvSubhead.hidden = !temAljava;
    qvGrid.hidden = !temAljava;
    if (temAljava) {
      const total = currentInv.quiver.reduce((n, x) => n + (x?.amount ?? 0), 0);
      const teto = getItem(aljava.kind)?.ammoMax ?? 0;
      qvSubhead.textContent = `🏹 ${getItem(aljava.kind)?.name} · ${total}/${teto}`;
      qvGrid.innerHTML = '';
      currentInv.quiver.forEach((stack, i) => {
        /*
         * Clicar devolve a munição para a mochila. É o mesmo gesto do
         * paperdoll (clicar na peça equipada a tira), e por isso reusa
         * `unequip` — o servidor sabe que slot de aljava é esse pelo índice.
         */
        qvGrid.appendChild(makeItemCell(
          stack,
          () => { if (stack) net.send({ t: 'unquiver', index: i }); },
          `qv:${i}`,
        ));
      });
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
    /*
     * 🔴 **A proximidade só FECHA a janela do Depósito — quem ABRE é o clique
     * no Banqueiro.**
     *
     * A primeira versão abria pela zona, e ficava aberta o tempo todo: a zona do
     * Depósito cobre a praça inteira, então "estar nela" é o estado normal de
     * quem passa pela cidade, não um gesto.
     *
     * ⚠️ Fechar continua sendo por zona, e é o que faz a janela não viajar pelo
     * mapa junto com o jogador. O servidor reenvia o inventário ao sair (ver
     * `wasAtDepot`), então este toque acontece sozinho.
     */
    if (!currentInv.atDepot) janDeposito.classList.remove('aberta');
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

  /** Item comum clicado de longe, a pegar quando o herói chegar. */
  let pegarAoChegar: string | null = null;

  /**
   * Pegar uma pilha do chão CLICANDO nela — o mesmo par de gestos do espólio e
   * da coleta: perto pega na hora, longe anda até o lado e pega ao chegar.
   *
   * 🔴 Antes o item comum não tinha clique NENHUM: só bolsa e corpo eram
   * clicáveis, e a única forma de pegar uma pilha era arrastá-la até a mochila.
   * Pedido do dono em 11/08, jogando.
   */
  function pegarItem(id: string): void {
    const alvo = porId.get(id);
    if (!alvo) return;
    if (distDoHeroi(alvo.tileX, alvo.tileY) <= 1) {
      pegarAoChegar = null;
      net.send({ t: 'pickup', itemId: id });
      return;
    }
    pegarAoChegar = id;
    irParaPerto(alvo.tileX, alvo.tileY);
  }

  function gatherNode(id: string): void {
    const alvo = porId.get(id);
    if (!alvo) return;
    // 🔴 ITEM NO CHÃO VENCE NÓ DE RECURSO no mesmo tile — relatado jogando em
    // 11/08: uma bolsa de monstro caiu em cima de uma moita de ervas, e o clique
    // ia para a moita. Sem Foice, a coleta era recusada e o espólio ficava
    // INALCANÇÁVEL, porque não havia outro gesto para chegar nele.
    //
    // A precedência é do item, e não é arbitrária: a bolsa **expira em minutos**
    // e o nó **renasce sempre**. Entre duas coisas no mesmo tile, quem tem prazo
    // vence quem não tem — perder o espólio é irreversível, adiar a colheita não é.
    const item = itensPorTile.get(alvo.tileY * map.width + alvo.tileX);
    if (item) {
      if (item.itemKind === 'corpse' || item.itemKind === 'lootbag') openCorpse(item.id);
      else pegarItem(item.id);
      return;
    }
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

  /* =======================================================================
   * 🧪 ITENS RÁPIDOS — quatro slots no canto inferior direito.
   * ======================================================================= */

  const ITENS_RAPIDOS = 4;

  /*
   * 🔴 **O SLOT GUARDA O TIPO DO ITEM, NÃO A POSIÇÃO NA MOCHILA.**
   *
   * O protocolo de usar (`{ t: 'use', index }`) fala em índice, e é a coisa
   * mais natural do mundo guardar esse índice aqui. Seria um bug silencioso:
   * índice muda toda vez que uma pilha acaba, que um item é vendido ou que a
   * mochila é arrumada — e aí a tecla 1, que era poção de vida, passa a beber o
   * que tiver caído naquela posição. No meio de uma luta, ninguém entende.
   *
   * ✅ Guardando o TIPO, o índice é resolvido na hora do clique. A ligação
   * sobrevive a rearranjo, a acabar e comprar de novo, e a trocar de mochila.
   */
  let itensRapidos: (string | null)[] = new Array(ITENS_RAPIDOS).fill(null);
  /** De qual personagem é a arrumação carregada agora. */
  let itensCarregadosDe: string | null = null;
  const iqEl = el('itensrapidos');

  /**
   * Onde a arrumação fica.
   *
   * ⚠️ No cliente, pelo mesmo motivo da barra de magias: arrumação de HUD é
   * preferência de interface, não estado de jogo. E com a mesma consequência —
   * trocar de máquina devolve os slots vazios.
   */
  function chaveDosItens(): string {
    return `elysia.quickitems.${net.charId ?? 'anon'}`;
  }

  function salvaItensRapidos(): void {
    try {
      localStorage.setItem(chaveDosItens(), JSON.stringify(itensRapidos));
    } catch { /* armazenamento cheio ou bloqueado — só não persiste */ }
  }

  /**
   * Lê a arrumação guardada.
   *
   * ⚠️ Cada tipo é revalidado: um `kind` que saiu do catálogo, ou que deixou de
   * ser consumível, viraria um slot que não faz nada e não explica por quê.
   */
  function carregaItensRapidos(): void {
    itensRapidos = new Array(ITENS_RAPIDOS).fill(null);
    let bruto: unknown;
    try {
      bruto = JSON.parse(localStorage.getItem(chaveDosItens()) ?? 'null');
    } catch { return; }
    if (!Array.isArray(bruto)) return;
    for (let i = 0; i < ITENS_RAPIDOS; i++) {
      const k: unknown = bruto[i];
      itensRapidos[i] = typeof k === 'string' && getItem(k)?.category === 'consumable' ? k : null;
    }
  }

  /**
   * Quantas unidades deste tipo há na mochila.
   *
   * ⚠️ Soma TODAS as pilhas em vez de olhar a primeira: poção empilha até um
   * teto e o excedente abre pilha nova, então quem tem 120 costuma tê-las em
   * duas ou três posições. Mostrar só a primeira diria "60" para quem tem 120.
   */
  function quantoTem(kind: string): number {
    let n = 0;
    for (const s of currentInv?.backpack ?? []) if (s && s.kind === kind) n += s.amount;
    return n;
  }

  function usaItemRapido(i: number): void {
    const kind = itensRapidos[i];
    if (!kind || !currentInv) return;
    const idx = currentInv.backpack.findIndex((s) => s?.kind === kind);
    if (idx < 0) {
      logChat(`Acabou <b>${getItem(kind)?.name ?? kind}</b>.`, 'sys');
      return;
    }
    net.send({ t: 'use', index: idx });
  }

  function pintaItensRapidos(): void {
    iqEl.textContent = '';
    for (let i = 0; i < ITENS_RAPIDOS; i++) {
      const kind = itensRapidos[i];
      const n = kind ? quantoTem(kind) : 0;
      const cel = document.createElement('div');
      /*
       * ⚠️ Três estados, e os três já existem na arte dos slots: montado,
       * montado-mas-acabou (`locked`, o quadro apagado) e vazio.
       */
      cel.className = `sslot iq${kind ? (n === 0 ? ' locked' : '') : ' vazio'}`;
      cel.title = kind
        ? `${getItem(kind)?.name ?? kind} — ${n} na mochila · tecla ${i + 1} · botão direito tira daqui`
        : `Vazio — arraste um consumível da mochila para cá · tecla ${i + 1}`;
      if (kind) {
        const img = document.createElement('img');
        img.src = itemIconUrl(kind);
        img.draggable = false;
        cel.appendChild(img);
        const q = document.createElement('span');
        q.className = 'lv';
        q.textContent = String(n);
        cel.appendChild(q);
      }
      const tecla = document.createElement('span');
      tecla.className = 'sk';
      tecla.textContent = String(i + 1);
      cel.appendChild(tecla);

      cel.onclick = (): void => usaItemRapido(i);
      // Botão direito esvazia — o mesmo gesto que já solta item na mochila.
      cel.oncontextmenu = (ev): void => {
        ev.preventDefault();
        itensRapidos[i] = null;
        salvaItensRapidos();
        pintaItensRapidos();
      };
      cel.addEventListener('dragover', (ev) => {
        if (!ev.dataTransfer?.types.includes(DND_ITEM)) return;
        ev.preventDefault();
        cel.classList.add('dropok');
      });
      cel.addEventListener('dragleave', () => cel.classList.remove('dropok'));
      cel.addEventListener('drop', (ev) => {
        ev.preventDefault();
        cel.classList.remove('dropok');
        const k = ev.dataTransfer?.getData(DND_ITEM);
        /*
         * 🔴 Só consumível. Arrastar uma espada para cá montaria um botão que
         * nunca faz nada — equipar tem gesto próprio, e misturar os dois aqui
         * daria um slot cujo comportamento depende do que está dentro.
         */
        if (!k || getItem(k)?.category !== 'consumable') return;
        itensRapidos[i] = k;
        salvaItensRapidos();
        pintaItensRapidos();
      });
      iqEl.appendChild(cel);
    }
  }

  pintaItensRapidos();

  function onInventory(msg: S2C_Inventory): void {
    currentInv = msg;
    renderInventory();
    /*
     * ⚠️ A arrumação é carregada aqui, e não no login: a chave depende do
     * `charId`, que só existe depois de o personagem entrar. Recarregar a cada
     * inventário seria desperdício — daí o `itensCarregadosDe`.
     */
    const id = String(net.charId ?? 'anon');
    if (itensCarregadosDe !== id) {
      itensCarregadosDe = id;
      carregaItensRapidos();
    }
    pintaItensRapidos();
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
  /*
   * ⚠️ Fechar o Banco fecha o Depósito junto. Ele foi aberto POR ali — a única
   * porta para ele é o botão de dentro do Banco —, então deixá-lo para trás
   * seria abandonar uma janela que o jogador não sabe de onde veio.
   */
  el('bank-close').onclick = () => {
    bankEl.style.display = 'none';
    janDeposito.classList.remove('aberta');
  };

  function openBank(): void {
    renderBank();
    bankEl.style.display = 'flex';
    bankAmount.focus();
  }

  /*
   * 🔴 **O Depósito é uma OPÇÃO dentro do Banco, e não abre junto.**
   *
   * Houve uma versão que abria os dois no mesmo clique, e ela decidia pelo
   * jogador: quem vai ao banqueiro guardar ouro ganhava uma grade de quarenta
   * células na frente sem ter pedido. Como botão, quem quer os itens pede.
   *
   * ⚠️ O botão não some quando o Depósito está aberto: ele é a única forma de
   * trazer a janela de volta se o jogador a fechar sem sair do banco.
   */
  el('bank-depot').onclick = () => {
    janDeposito.classList.add('aberta');
    janelaAoFrente(janDeposito);
  };
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

  /**
   * 🔴 **O clique só é do MUNDO se caiu no CANVAS.**
   *
   * O painel do personagem, o minimapa e os itens rápidos são filhos de
   * `#viewport`, porque é nele que se ancoram nos cantos. A consequência é que
   * um clique num botão deles SOBE até o ouvinte do viewport — e o dono viu o
   * personagem sair andando ao apertar o botão de recolher.
   *
   * ✅ A regra é "o alvo é o canvas", e não uma lista de painéis a ignorar.
   * Lista envelhece: o próximo painel que alguém ancorar aqui esqueceria de
   * entrar nela, e o bug voltaria sem ninguém ligar uma coisa à outra.
   */
  const ehCliqueNoMundo = (ev: Event): boolean => ev.target === app.canvas;

  viewportEl.addEventListener('mousedown', (ev) => {
    if (ev.button !== 0 || !ehCliqueNoMundo(ev)) return;
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
    // ⚠️ `alvo === app.canvas`, e não "está dentro do viewport": soltar em
    // cima do painel do personagem empurraria a pilha para o tile que está
    // ESCONDIDO atrás dele.
    if (alvo === app.canvas) {
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

  /*
   * Seções retráteis: clicar em QUALQUER lugar do cabeçalho (`.phead`) recolhe a
   * seção — menos nos botões de +atributo, que têm ação própria.
   *
   * 🔴 **O sistema de REORDENAR painéis saiu daqui** (09/09). Ele arrastava
   * painel pelo cabeçalho para trocar a ordem dentro das colunas laterais, e
   * guardava essa ordem por coluna. Com as colunas fora, ele não tinha o que
   * ordenar: `BARS` apontava para `#sidebar` e `#leftbar`, que deixaram de
   * existir, e o jogo quebrava no `startGame` lendo `children` de `null`.
   *
   * ⚠️ O que ele fazia agora é das JANELAS, que arrastam pela barra de título e
   * guardam a própria posição. Junto com ele foi embora o `lastDragEnd`, que só
   * existia para o clique do fim de um arraste não recolher o painel sem querer.
   */
  for (const head of Array.from(document.querySelectorAll<HTMLElement>('.phead'))) {
    head.addEventListener('click', (ev) => {
      const tgt = ev.target as HTMLElement;
      if (tgt.tagName === 'BUTTON' && !tgt.classList.contains('pt')) return; // ex.: +/− de atributo
      const panel = head.closest('.panel');
      if (!panel) return;
      const collapsed = panel.classList.toggle('collapsed');
      const pt = head.querySelector<HTMLElement>('.pt');
      if (pt) pt.textContent = collapsed ? '+' : '−';
    });
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
  /**
   * 🔍 **NÍVEIS DE ZOOM, em tiles visíveis de lado.**
   *
   * 🔴 O último é o mapa INTEIRO, que era o ÚNICO modo até 08/09 — e num
   * mundo de 300 tiles isso dava menos de meio pixel por tile. Os degraus
   * abaixo é que tornam o mapa legível; o "tudo" virou o último passo, e não
   * mais a única opção.
   */
  const ZOOMS = [40, 80, 150, MW];
  let zoomMini = 1;
  /** Última região desenhada, para não reescrever o nome a cada quadro. */
  let regiaoMostrada = '';

  function nomeDaRegiao(x: number, y: number): string {
    /*
     * ⚠️ Busca linear nas ~12 regiões, de propósito: um índice espacial para
     * doze retângulos custaria mais para manter do que economiza. Roda uma vez
     * por quadro do minimapa, não por tile.
     */
    for (const r of REGIONS) {
      const b = r.bounds;
      if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return r.name;
    }
    // 🔴 Tile que nenhuma região reivindica é MAR — a regra mora no regions.ts.
    return 'Mar Aberto';
  }

  /**
   * Desenha o minimapa na janela de zoom atual, centrada no jogador.
   *
   * ⚠️ A janela é PRESA às bordas do mundo: sem isso, andar perto da beirada
   * mostraria metade do quadro em vazio, e o ponto do jogador sairia do centro
   * sem explicação nenhuma.
   */
  function drawMinimap(): void {
    if (baseFloor !== myFloor) renderMinimapBase(myFloor);
    const lado = ZOOMS[zoomMini] ?? MW;
    const x0 = Math.max(0, Math.min(MW - lado, Math.round(myTileX - lado / 2)));
    const y0 = Math.max(0, Math.min(MH - lado, Math.round(myTileY - lado / 2)));
    miniCtx.imageSmoothingEnabled = false;
    miniCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
    miniCtx.drawImage(
      baseCanvas, x0, y0, lado, lado, 0, 0, miniCanvas.width, miniCanvas.height,
    );
    const s = miniCanvas.width / lado;
    const px = (myTileX - x0) * s;
    const py = (myTileY - y0) * s;
    miniCtx.fillStyle = '#000';
    miniCtx.fillRect(px - 1, py - 1, s + 2, s + 2);
    miniCtx.fillStyle = '#5fd15f';
    miniCtx.fillRect(px, py, Math.max(1, s), Math.max(1, s));

    const reg = nomeDaRegiao(myTileX, myTileY);
    if (reg !== regiaoMostrada) {
      regiaoMostrada = reg;
      el('mmregiao').textContent = reg;
      el('mgnome').textContent = reg;
    }
    el('mmpos').textContent = `${myTileX}, ${myTileY}`;
  }

  /** Redesenha o mapa grande com o mundo inteiro do andar atual. */
  function desenhaMapaGrande(): void {
    if (baseFloor !== myFloor) renderMinimapBase(myFloor);
    const c = el('mgcanvas') as HTMLCanvasElement;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(baseCanvas, 0, 0, c.width, c.height);
    const s = c.width / MW;
    ctx.fillStyle = '#000';
    ctx.fillRect(myTileX * s - 2, myTileY * s - 2, s + 4, s + 4);
    ctx.fillStyle = '#5fd15f';
    ctx.fillRect(myTileX * s, myTileY * s, Math.max(2, s), Math.max(2, s));
  }

  function abreMapaGrande(abrir: boolean): void {
    const g = el('mapagrande');
    g.style.display = abrir ? 'flex' : 'none';
    // ⚠️ Só desenha ao ABRIR. O mundo inteiro em 600 px a cada quadro seria
    // desperdício por uma janela que passa quase todo o tempo fechada.
    if (abrir) desenhaMapaGrande();
  }

  /** Liga zoom, mapa grande e o fechar. Chamado uma vez. */
  function ligaMinimapa(): void {
    const mais = el('mmmais') as HTMLButtonElement;
    const menos = el('mmmenos') as HTMLButtonElement;
    const pinta = () => {
      mais.disabled = zoomMini <= 0;
      menos.disabled = zoomMini >= ZOOMS.length - 1;
      drawMinimap();
    };
    // Índice menor = janela menor = mais perto. O "+" aproxima.
    mais.onclick = () => { zoomMini = Math.max(0, zoomMini - 1); pinta(); };
    menos.onclick = () => { zoomMini = Math.min(ZOOMS.length - 1, zoomMini + 1); pinta(); };
    el('mmgrande').onclick = () => abreMapaGrande(true);
    el('mgfechar').onclick = () => abreMapaGrande(false);
    // Clicar fora da caixa fecha — o padrão das outras sobreposições do jogo.
    el('mapagrande').addEventListener('click', (ev) => {
      if (ev.target === el('mapagrande')) abreMapaGrande(false);
    });
    pinta();
  }
  ligaMinimapa();

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
    /*
     * 🔴 **Quanto FALTA, e não só quanto tem** (dono, 08/09). "XP 1.240 / 4.800"
     * obriga a fazer a subtração de cabeça a cada monstro; o que o jogador quer
     * saber é se dá para subir antes de dormir.
     *
     * ⚠️ **Não existe "job level" neste jogo.** No Ragnarok a segunda barra é a
     * de classe/job, com XP e pontos próprios; aqui os Skill Points vêm do
     * NÍVEL do personagem (`skillPointsAtLevel`), então há uma barra só. Criar
     * a segunda é sistema novo — está anotado no HANDOFF.
     */
    const pct = s.xpNext > 0 ? (s.xp / s.xpNext) * 100 : 0;
    hud.chbaselv.textContent = String(s.level);
    // ⚠️ Porcentagem no painel, e o "faltam" completo no tooltip da barra: a
    // linha tem 38 px, e "faltam 3.560" não cabe sem espremer a barra.
    hud.xptext.textContent = `${pct.toFixed(1)}%`;
    const falta = Math.max(0, s.xpNext - s.xp);
    hud.xptext.title =
      `XP ${s.xp.toLocaleString('pt-BR')} / ${s.xpNext.toLocaleString('pt-BR')}` +
      ` · faltam ${falta.toLocaleString('pt-BR')}`;

    /*
     * ⚒️ **NÍVEL DE JOB** — a segunda barra, entregue em 08/09.
     *
     * ⚠️ **Não dá Skill Point** (decisão do dono, "letra B"): o SP continua
     * vindo do nível do personagem. Esta barra é progresso visível, e é o que
     * a torna aditiva — nada do que já existia mudou de comportamento.
     *
     * ⚠️ No teto o servidor manda `jobXpNext` zerado; sem a guarda, a divisão
     * daria `Infinity` e a barra sumiria em vez de ficar cheia.
     */
    const noTeto = s.jobXpNext <= 0;
    const pctJob = noTeto ? 100 : (s.jobXp / s.jobXpNext) * 100;
    hud.chjoblv.textContent = String(s.jobLevel);
    (hud.jobfill as HTMLElement).style.width = `${Math.min(100, pctJob)}%`;
    hud.jobtext.textContent = noTeto ? 'MAX' : `${pctJob.toFixed(1)}%`;
    hud.jobtext.title = noTeto
      ? 'Job no máximo.'
      : `Job ${s.jobXp.toLocaleString('pt-BR')} / ${s.jobXpNext.toLocaleString('pt-BR')}`;
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

  // ---- Barra de habilidades flutuante (estilo Ragnarok) -------------------
  // Uma linha de quadrados atalhados em F1, F2, … Cada quadrado é uma skill.
  // A barra flutua sobre o mundo e pode ser arrastada pelo "pegador" da esquerda
  // (a posição fica salva no navegador).
  const spellBarEl = el('spellbar');
  const buffBarEl = el('buffbar');
  /** Efeitos ativos, com o instante em que cada um vence (relógio do cliente). */
  let meusEfeitos: { id: string; nome: string; bom: boolean; fim: number }[] = [];

  /**
   * Recebe a lista de efeitos do servidor e converte "quanto falta" em "quando
   * acaba".
   *
   * ⚠️ A conversão é o ponto: o servidor manda `remainingMs` a cada tique, e
   * redesenhar só nesses instantes daria uma contagem aos solavancos. Guardando
   * o INSTANTE final, a contagem escorre suave entre um tique e outro, e o
   * próximo pacote a corrige se houver deriva.
   */
  function atualizaEfeitos(lista: S2C_Stats['effects']): void {
    const agora = performance.now();
    meusEfeitos = lista.map((e) => ({
      id: e.id, nome: e.name, bom: e.good, fim: agora + e.remainingMs,
    }));
    desenhaEfeitos(agora);
  }

  /**
   * 🖼️ O medalhão da ficha, do pacote de buffs.
   *
   * 🔴 **O mapa é por SIGNIFICADO, não por cor nem por ramo.** São cinco
   * desenhos para uma vintena de efeitos, então a pergunta não é "de que magia
   * veio" e sim "o que isto está fazendo comigo agora":
   *
   *   - a cruz verde é VIDA, e por isso veste a Pele de Carvalho, que é o único
   *     buff do jogo que dá vida máxima;
   *   - o escudo é PROTEÇÃO, e veste as três que absorvem dano em vez de somar
   *     poder — Bênção Espiritual, Proteção Mágica e Postura Defensiva;
   *   - a gema é MANA, e veste a Amplificação Mágica;
   *   - o halter é PODER, e é para onde cai todo o resto que é bom.
   *
   * ⚠️ O ruim cai todo no mesmo desenho de propósito. É a mesma regra que já
   * governa as famílias de efeito visual: o jogador não precisa distinguir
   * Enfraquecer de Vulnerabilidade pelo ícone — precisa ver, de relance, que
   * tem coisa ruim em cima dele. O nome está escrito ao lado.
   */
  function medalhaoDoEfeito(id: string, bom: boolean): string {
    if (!bom) return 'debuff';
    if (id === 'oak_skin') return 'life_recovery';
    if (id === 'spirit_blessing' || id === 'magic_protection' || id === 'defensive_stance') {
      return 'immunity';
    }
    if (id === 'magic_amplify') return 'mana_recovery';
    return 'strength_buff';
  }

  function desenhaEfeitos(agora: number): void {
    buffBarEl.textContent = '';
    for (const e of meusEfeitos) {
      const falta = Math.max(0, e.fim - agora);
      if (falta <= 0) continue;
      const chip = document.createElement('div');
      chip.className = `buffchip ${e.bom ? 'good' : 'bad'}`;
      const ico = document.createElement('img');
      ico.src = `/assets/hud/buffs/${medalhaoDoEfeito(e.id, e.bom)}.png`;
      /*
       * ⚠️ `alt` vazio e não o nome do efeito: o nome já vem escrito no `<span>`
       * ao lado, e repeti-lo faria o leitor de tela dizer tudo duas vezes.
       */
      ico.alt = '';
      ico.draggable = false;
      chip.appendChild(ico);
      const nome = document.createElement('span');
      nome.textContent = e.nome;
      const tempo = document.createElement('span');
      tempo.className = 't';
      tempo.textContent = falta >= 10000
        ? `${Math.ceil(falta / 1000)}s`
        : `${(falta / 1000).toFixed(1)}s`;
      chip.append(nome, tempo);
      buffBarEl.appendChild(chip);
    }
  }

  /*
   * 🔴 **A BARRA DE CONJURAÇÃO DO HUD FOI REMOVIDA** — dono, 11/09: *"essa
   * barra de magia que aparece embaixo pode ser colocada em cima, no nome do
   * personagem"*.
   *
   * Ela morava acima da barra de magias e mostrava nome + progresso. Quando a
   * conjuração passou a aparecer SOBRE A CABEÇA de quem conjura (e para todo
   * mundo, não só para o próprio), o jogador local ficou com DUAS barras
   * dizendo a mesma coisa — e a de baixo era a que tirava o olho do mundo.
   *
   * ⚠️ Saiu inteira: função, tique, os três elementos e o CSS. O que ela fazia
   * agora é `setCasting`, no ator.
   */
  const spellGripEl = el('spellgrip');
  interface SpellSlot {
    id: SkillId;
    /** Nível escolhido PARA ESTE SLOT. Ver `barraAtual`. */
    nivel: number;
    cell: HTMLElement;
    cd: HTMLElement;
    cdText: HTMLElement;
    lvl: HTMLElement;
    tip: HTMLElement;
  }
  /**
   * 🔴 **Indexado pelo ÍNDICE DO SLOT, não pela magia** (08/09).
   *
   * Enquanto cada magia só podia estar num lugar, indexar por id bastava. Com o
   * nível por slot — Fire Bolt 4 num atalho e Fire Bolt 10 noutro — a mesma
   * magia ocupa dois slots de propósito, e a chave por id faria o segundo
   * sobrescrever o primeiro: um dos dois pararia de acender o cooldown, sem
   * erro nenhum.
   */
  const spellSlots = new Map<number, SpellSlot>();
  /** Fim do cooldown (performance.now) e duração, por habilidade. */
  const spellCooldowns = new Map<SkillId, { until: number; dur: number }>();
  let skillLevels: Record<string, number> = {};
  let currentMana = 0;
  /** Maestrias de arma, para o tooltip do item mostrar a sua. */
  let myProficiencies: Record<string, { level: number; progress: number }> = {};

  /**
   * Monta a barra de atalhos da CLASSE do personagem.
   *
   * 🔴 Passou a ser por classe em 03/09. Antes era um array global de oito,
   * montado uma vez no arranque, de quando só o Knight tinha habilidades — o
   * cliente filtrava por classe em cima dele. Com 23 do Druida e 18 do
   * Feiticeiro isso deixa de fechar por aritmética, e o Druida ficaria com a
   * barra do Knight quase toda vazia.
   */
  /**
   * A barra: magia **e nível** por slot.
   *
   * 🔴 O nível vale **só para aquele slot** — decisão do dono em 08/09, no
   * modelo do Ragnarok. Fire Bolt 4 gasta menos mana e serve para limpar bicho
   * fraco; Fire Bolt 10 fica noutra tecla para o que interessa.
   */
  interface SlotDaBarra { id: SkillId; nivel: number }
  let barraAtual: (SlotDaBarra | null)[] = [];
  /** Classe cuja barra está montada agora. `null` = ainda não montou nenhuma. */
  let classeDaBarra: S2C_Stats['charClass'] | null = null;
  /**
   * Rótulo da tecla de um slot. Índices 0–11 são F1–F12; 12–23 são Shift+F1–F12.
   *
   * ⚠️ O teclado só tem doze teclas de função. A segunda fileira precisava de
   * um modificador, e Shift é o único que o navegador entrega sem brigar com
   * atalhos do sistema (Ctrl+F4 fecha aba, Alt+F4 fecha janela).
   */
  function teclaDoSlot(i: number): string {
    const f = `F${(i % SKILL_BAR_COLS) + 1}`;
    return i < SKILL_BAR_COLS ? f : `⇧${f}`;
  }

  /** Onde a arrumação da barra deste personagem é guardada. */
  function chaveDaBarra(cls: S2C_Stats['charClass']): string {
    const id = net.charId;
    return `elysia.spellbar.slots.${id ?? `cls-${cls}`}`;
  }

  /**
   * Guarda a arrumação da barra.
   *
   * ⚠️ **No cliente, e não no servidor.** É a mesma escolha que a POSIÇÃO da
   * barra já fazia (`elysia.spellbar.pos`): arrumação de HUD é preferência de
   * interface, não estado de jogo, e mandá-la para o banco exigiria migração de
   * schema para guardar algo que não afeta regra nenhuma.
   *
   * ⚠️ **A consequência é real e vale saber:** trocar de navegador ou de
   * máquina devolve a barra ao padrão da classe. Se um dia isso incomodar, o
   * lugar certo passa a ser uma coluna no personagem.
   */
  function salvaBarra(cls: S2C_Stats['charClass']): void {
    try {
      localStorage.setItem(chaveDaBarra(cls), JSON.stringify(barraAtual));
    } catch { /* armazenamento cheio ou bloqueado — a barra só não persiste */ }
  }

  /**
   * Lê a arrumação guardada, se houver e se ainda fizer sentido.
   *
   * 🔴 **Cada id é revalidado contra a CLASSE.** Uma barra salva pode ter
   * sobrevivido a um rename de habilidade, a um reset de skill ou — o caso que
   * realmente acontece — a uma troca de personagem que reusou a chave. Um id
   * inválido viraria `SKILLS[id]` indefinido e derrubaria a montagem inteira da
   * barra, deixando o jogador sem nenhuma tecla.
   */
  function carregaBarra(cls: S2C_Stats['charClass']): (SlotDaBarra | null)[] | null {
    let bruto: unknown;
    try {
      bruto = JSON.parse(localStorage.getItem(chaveDaBarra(cls)) ?? 'null');
    } catch { return null; }
    if (!Array.isArray(bruto)) return null;
    const out: (SlotDaBarra | null)[] = [];
    for (let i = 0; i < SKILL_BAR_SLOTS; i++) {
      const item = bruto[i];
      /*
       * ⚠️ **Lê os DOIS formatos.** Antes de 08/09 cada posição era só o id
       * (`"fire_bolt"`); agora é `{id, nivel}`. Uma barra salva ontem tem de
       * continuar valendo — ler só o formato novo esvaziaria a barra de quem
       * já jogava, sem aviso nenhum.
       */
      const id = typeof item === 'string'
        ? item
        : (item && typeof item === 'object' && typeof (item as SlotDaBarra).id === 'string'
          ? (item as SlotDaBarra).id
          : null);
      const def = id ? SKILLS[id as SkillId] : undefined;
      if (!def || !def.classes.includes(cls) || def.kind === 'passive') { out.push(null); continue; }
      const n = typeof item === 'object' && item ? (item as SlotDaBarra).nivel : undefined;
      // Nível 0 ou ausente = "o que estiver aprendido", resolvido no desenho.
      out.push({ id: id as SkillId, nivel: typeof n === 'number' && n > 0 ? n : 0 });
    }
    return out;
  }

  function buildSpellBar(cls: S2C_Stats['charClass']): void {
    barraAtual = carregaBarra(cls)
      ?? skillBarFor(cls).map((id) => (id ? { id, nivel: 0 } : null));
    desenhaSpellBar(cls);
  }

  /**
   * O nível que este slot realmente usa.
   *
   * ⚠️ `0` no slot quer dizer "o aprendido", e é o padrão de quem nunca
   * escolheu — inclusive das barras salvas no formato antigo. Guardar o número
   * aprendido na hora de montar seria pior: ele congelaria, e subir a skill não
   * mudaria o atalho.
   */
  function nivelDoSlot(s: SlotDaBarra): number {
    const aprendido = skillLevels[s.id] ?? 0;
    if (s.nivel <= 0) return aprendido;
    return Math.max(1, Math.min(aprendido, s.nivel));
  }

  function desenhaSpellBar(cls: S2C_Stats['charClass']): void {
    // ⚠️ Só os SLOTS saem. `spellBarEl.textContent = ''` levaria junto o
    // `#spellgrip`, que é o pegador de arrastar — e a barra ficaria presa no
    // meio da tela para sempre, sem nenhuma mensagem de erro.
    for (const velho of Array.from(spellBarEl.querySelectorAll('.sgrid'))) velho.remove();
    spellSlots.clear();

    // As duas fileiras vivem num grid próprio, ao lado do pegador.
    const grid = document.createElement('div');
    grid.className = 'sgrid';

    barraAtual.forEach((item, i) => {
      const id = item?.id;
      const cell = document.createElement('div');
      cell.className = id ? 'sslot' : 'sslot free';
      cell.dataset.slot = String(i);
      const label = document.createElement('span');
      label.className = 'sk';
      label.textContent = teclaDoSlot(i);
      cell.appendChild(label);
      if (id && item) {
        const def = SKILLS[id];
        const img = document.createElement('img');
        img.src = spellIconUrl(id);
        img.alt = def.name;
        img.draggable = false; // quem arrasta é a CÉLULA, não a imagem
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
        // O clique lança NO NÍVEL DO SLOT, não no aprendido.
        cell.onclick = () => castSpellId(id, undefined, nivelDoSlot(item));
        spellSlots.set(i, { id, nivel: item.nivel, cell, cd, cdText, lvl, tip });
      }
      ligaArrastarNoSlot(cell, i, cls);
      grid.appendChild(cell);
    });
    spellBarEl.appendChild(grid);
  }

  // -------------------------------------------------------------------------
  // Arrastar-e-soltar na barra
  //
  // Duas origens caem no mesmo alvo: a linha da JANELA de habilidades (colocar)
  // e outro SLOT (mover ou trocar). O `dataTransfer` carrega qual das duas é,
  // e o `drop` decide pela presença do índice de origem.
  //
  // ⚠️ HTML5 drag-and-drop, e não pointerdown/pointermove como o arrastar da
  // barra inteira. O `dragstart` nativo é o que dá a imagem-fantasma seguindo o
  // cursor de graça, e aqui isso importa: sem ela o jogador não vê o que está
  // carregando entre 24 slots parecidos.
  // -------------------------------------------------------------------------

  const DND_SKILL = 'application/x-elysia-skill';
  const DND_SLOT = 'application/x-elysia-slot';
  /**
   * O NÍVEL que vem junto na arrastada.
   *
   * ⚠️ Canal separado, e não `id@nivel` dentro do `DND_SKILL`: o tipo do
   * `DND_SKILL` é lido como `SkillId` em mais de um lugar, e enfiar um sufixo
   * ali faria `SKILLS[novo]` virar indefinido no primeiro esquecimento.
   */
  const DND_NIVEL = 'application/x-elysia-nivel';

  function ligaArrastarNoSlot(cell: HTMLElement, i: number, cls: S2C_Stats['charClass']): void {
    const item = barraAtual[i];
    if (item) {
      cell.draggable = true;
      cell.addEventListener('dragstart', (ev) => {
        ev.dataTransfer?.setData(DND_SKILL, item.id);
        // O nível viaja junto: arrastar o Fire Bolt 4 para outro slot leva o 4.
        ev.dataTransfer?.setData(DND_NIVEL, String(item.nivel));
        ev.dataTransfer?.setData(DND_SLOT, String(i));
        // Mesma regra da janela: o que segue o cursor é o ícone, não a célula
        // inteira com tecla, cooldown e cadeado por cima.
        const ic = cell.querySelector('img');
        if (ic) ev.dataTransfer?.setDragImage(ic, 16, 16);
        cell.classList.add('dragging');
      });
      cell.addEventListener('dragend', () => cell.classList.remove('dragging'));
    }
    cell.addEventListener('dragover', (ev) => {
      if (!ev.dataTransfer?.types.includes(DND_SKILL)) return;
      ev.preventDefault(); // sem isto o navegador recusa o drop
      cell.classList.add('dropok');
    });
    cell.addEventListener('dragleave', () => cell.classList.remove('dropok'));
    cell.addEventListener('drop', (ev) => {
      cell.classList.remove('dropok');
      const novo = ev.dataTransfer?.getData(DND_SKILL) as SkillId | undefined;
      if (!novo || !SKILLS[novo]) return;
      // Ausente ou 0 = "o nível aprendido", que é o padrão de sempre.
      const nivel = Number(ev.dataTransfer?.getData(DND_NIVEL) ?? '0') || 0;
      ev.preventDefault();
      const origem = ev.dataTransfer?.getData(DND_SLOT);
      if (origem !== undefined && origem !== '') {
        /*
         * Veio de outro slot: TROCA os dois em vez de duplicar. Copiar deixaria
         * a mesma habilidade em dois lugares e um buraco onde ela estava — e o
         * jogador que só queria reordenar teria de limpar a sobra na mão.
         */
        const de = Number(origem);
        if (de === i) return;
        const antes = barraAtual[i] ?? null;
        barraAtual[i] = { id: novo, nivel };
        barraAtual[de] = antes;
      } else {
        /*
         * Veio da janela: SUBSTITUI o que estava no slot. E se a habilidade já
         * estivesse noutro slot, o antigo é esvaziado — dois atalhos para a
         * mesma magia era quase sempre engano.
         *
         * 🔴 **Deixou de ser engano em 08/09**: com nível por slot, ter Fire
         * Bolt 4 e Fire Bolt 10 em teclas diferentes é o ponto do recurso. Só
         * some o slot antigo quando o NÍVEL também é o mesmo — aí sim é
         * duplicata.
         */
        const jaEstava = barraAtual.findIndex((b) => b?.id === novo && b.nivel === nivel);
        if (jaEstava >= 0) barraAtual[jaEstava] = null;
        barraAtual[i] = { id: novo, nivel };
      }
      salvaBarra(cls);
      desenhaSpellBar(cls);
      if (ultimoStats) updateSpellBar(ultimoStats);
    });
    /*
     * Botão direito esvazia o slot. É o par natural do arrastar: sem ele, tirar
     * uma habilidade da barra exigiria arrastar outra por cima, e não haveria
     * como deixar um espaço em branco de propósito.
     */
    cell.addEventListener('contextmenu', (ev) => {
      if (!barraAtual[i]) return;
      ev.preventDefault();
      barraAtual[i] = null;
      salvaBarra(cls);
      desenhaSpellBar(cls);
      if (ultimoStats) updateSpellBar(ultimoStats);
    });
  }

  /** Texto do tooltip com os números REAIS do nível atual da habilidade. */
  function skillTipHtml(id: SkillId, nivel: number, tecla: string): string {
    const def = SKILLS[id];
    const efetivo = Math.max(1, nivel);
    const alvo = def.shape === 'self'
      ? 'Em você mesmo'
      // ⚠️ Área mostra os DOIS números, e eles são coisas diferentes: o raio é
      // o tamanho do estouro, o alcance é até onde dá para mirar. Mostrar só um
      // deixaria o jogador achando que a magia só pega o que está colado nele.
      : def.shape === 'area'
        ? `Área · raio ${skillRange(def, efetivo)} · lançar até ${skillCastRange(def, efetivo)}`
        : def.shape === 'ally'
          ? `Um aliado · alcance ${skillRange(def, efetivo)}`
          : def.shape === 'party'
            ? `Você e os aliados · raio ${skillRange(def, efetivo)}`
            : def.shape === 'ground'
              ? `No chão · raio ${skillRange(def, efetivo)} · lançar até ${skillCastRange(def, efetivo)}`
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
    } else if (def.kind === 'heal') {
      // Cura mostra POTÊNCIA relativa, não valor absoluto: o número real depende
      // do WIS de quem lança, e prometer "cura 240" seria mentira na ficha alheia.
      efeito = `Cura ${(skillPower(def, efetivo) * 100).toFixed(0)}% do seu poder de cura`;
    } else if (def.kind === 'hot') {
      const pulsos = Math.round(skillDuration(def, efetivo) / hotTickMs(def, efetivo));
      efeito =
        `Cura ${(skillPower(def, efetivo) * 100).toFixed(0)}% por pulso · ${pulsos} pulsos<br>` +
        `Total ${(skillPower(def, efetivo) * pulsos * 100).toFixed(0)}% em ` +
        `${(skillDuration(def, efetivo) / 1000).toFixed(0)}s`;
    } else if (def.kind === 'buff' || def.kind === 'debuff' || def.kind === 'passive') {
      efeito = modsHtml(def, efetivo);
      if (def.kind !== 'passive') {
        efeito += `<br>Dura ${(skillDuration(def, efetivo) / 1000).toFixed(0)}s`;
      }
    } else if (def.kind === 'condition' && def.applies) {
      const chance = skillConditionChance(def, efetivo);
      efeito =
        `${CONDITIONS[def.applies.id].name} · ` +
        `${(chance * 100).toFixed(0)}% de chance · ` +
        `${(skillConditionDuration(def, efetivo) / 1000).toFixed(1)}s`;
    } else if (def.kind === 'ground') {
      const dur = skillGroundDuration(def, efetivo);
      const pulsos = Math.round(dur / (def.ground?.tickMs ?? 1000));
      efeito = def.ground?.kind === 'wall'
        ? `Bloqueia a passagem por ${(dur / 1000).toFixed(0)}s · ` +
          `até ${skillGroundMax(def, efetivo)} simultânea(s)`
        : def.ground?.kind === 'ward'
          ? `Anula TODO o dano físico de quem estiver dentro por ${(dur / 1000).toFixed(1)}s`
          : `${def.ground?.kind === 'heal' ? 'Cura' : 'Dano'} ` +
            `${(skillPower(def, efetivo) * 100).toFixed(0)}% a cada ` +
            `${((def.ground?.tickMs ?? 1000) / 1000).toFixed(1)}s · ` +
            `${pulsos} pulsos em ${(dur / 1000).toFixed(0)}s`;
    } else if (def.kind === 'multihit') {
      const golpes = skillHits(def, efetivo);
      const poder = skillPower(def, efetivo);
      /*
       * 🔴 **O TOTAL É O QUE O ALVO LEVA, não a soma dos golpes.**
       *
       * A Chuva de Meteoros anunciava *"Total 1872 %"* — 18 meteoros × 104 %.
       * Mas eles caem em pontos SORTEADOS de um 13×13 e cada um só pega 5×5 em
       * volta: um alvo leva 2,7 deles, ou ~277 %. A dica prometia quase sete
       * vezes o que a magia entrega, e o número chegou a virar base de uma
       * decisão de equilíbrio no histórico. Ver `skillImpactosEsperados`.
       *
       * ⚠️ Quando os dois números batem (Fire Bolt, Nevasca — todo golpe acerta)
       * a segunda linha não aparece: repetir "18 de 18" só ocuparia espaço.
       */
      const esperados = skillImpactosEsperados(def, efetivo);
      const espalha = esperados < golpes - 0.05;
      efeito =
        `${golpes} impactos de ${(poder * 100).toFixed(0)}%<br>`
        + (espalha
          ? `~${esperados.toFixed(1)} acertam cada alvo · <b>~${(poder * esperados * 100).toFixed(0)}%</b>`
          : `Total ${(poder * golpes * 100).toFixed(0)}%`);
    } else {
      efeito = `Dano ${(skillPower(def, efetivo) * 100).toFixed(0)}%`;
    }

    // A condição que vem DE BRINDE com um golpe (queimadura do Fire Bolt, raiz
    // das Raízes) entra numa linha própria — misturá-la com o dano esconderia
    // a metade da habilidade que muitas vezes é a mais importante.
    if (def.applies && def.kind !== 'condition') {
      efeito +=
        `<br><span class="req">${(skillConditionChance(def, efetivo) * 100).toFixed(0)}% de ` +
        `${CONDITIONS[def.applies.id].name} (${(skillConditionDuration(def, efetivo) / 1000).toFixed(1)}s)</span>`;
    }
    /*
     * ⚠️ **A conjuração sai de `skillCastMs`, e não de `def.castMs` cru.**
     *
     * 🔴 `def.castMs` é o valor do **Lv.1**. Enquanto toda magia tinha
     * conjuração fixa isso dava no mesmo; a Nevasca quebrou a premissa
     * (`castMsAtLv10`: 2,5 s no Lv.1 e 6,3 s no Lv.10). A dica anunciava 2,5 s e
     * o jogador esperava mais de cinco — pego testando em tela em 11/09.
     *
     * ⚠️ Maestria e Destreza entram como ZERO de propósito: como todo o resto
     * da dica, este número é o da HABILIDADE, não o do personagem que a lê.
     * Misturar os dois faria a mesma magia mostrar valores diferentes para dois
     * jogadores, e a dica deixaria de servir para comparar.
     */
    const castMs = skillCastMs(def, efetivo, 0, 0);
    const cast = castMs > 0 ? `Conjuração ${(castMs / 1000).toFixed(1)}s · ` : '';

    const custo = skillManaCost(def, efetivo);
    return (
      `${cabecalho}<br>${escapeHtml(def.desc)}<br>` +
      `${alvo}<br>${efeito}<br>` +
      `${cast}${custo > 0 ? `Mana ${custo} · ` : ''}` +
      (def.kind === 'passive'
        ? '<span class="req">Passiva — sempre ativa</span>'
        // ⚠️ `skillCooldown` e não o campo cru: a Esfera Elétrica encurta a
        // recarga com o nível, e a dica é justamente onde essa mentira apareceria.
        : `Recarga ${(skillCooldown(def, efetivo) / 1000).toFixed(1)}s`) +
      '<br>' +
      (req.length ? `<span class="req">Requer ${req.join(' · ')}</span>` : '')
    );
  }

  /** Lista legível dos modificadores de um buff/debuff/passiva. */
  function modsHtml(def: SkillDef, nivel: number): string {
    const mods = skillModifiers(def, nivel);
    const linhas: string[] = [];
    for (const k of MODIFIER_KEYS) {
      const v = mods[k];
      if (v === undefined || Math.abs(v) < 0.0005) continue;
      const pct = (v * 100).toFixed(0);
      // Debuff em vermelho-apagado (a classe `req`), buff em texto normal — é a
      // mesma convenção que a Postura já usa para a penalidade dela.
      linhas.push(v < 0
        ? `<span class="req">${MODIFIER_LABEL[k]} ${pct}%</span>`
        : `${MODIFIER_LABEL[k]} +${pct}%`);
    }
    return linhas.length ? linhas.join('<br>') : 'Sem efeito de ficha';
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

  // ---- 🎯 MIRA DE MAGIA (08/09) -------------------------------------------
  //
  // 🔴 Antes, apertar a tecla CONJURAVA na hora: o servidor usava o alvo já
  // travado e as áreas estouravam centradas no próprio mago. Agora a tecla
  // ARMA a magia, o marcador segue o mouse, e o clique manda o ponto.
  //
  // ⚠️ Magia de si mesmo (`self`) e de grupo (`party`) continuam saindo na
  // tecla: não há para onde mirar, e obrigar um clique seria burocracia.

  /** Id da magia armada, esperando o clique. */
  let magiaArmada: SkillId | null = null;
  const miraLabel = el('spellcursor');
  const miraMarca = new Graphics();
  miraMarca.zIndex = -0.75;
  miraMarca.visible = false;
  objects.addChild(miraMarca);

  /**
   * ⭕ **O CÍRCULO DE CONJURAÇÃO** — pedido do dono em 11/09: *"esse círculo vai
   * demarcar onde vou jogar a magia... consegue fazer ele ficar girando
   * lentamente durante a conjuração? Quando a magia soltar ele pode sumir."*
   *
   * 🔴 **Não confundir com o círculo que foi REMOVIDO em 11/09.** Aquele
   * marcava a área da Nevasca enquanto a tempestade caía, e o dono o tirou
   * (*"remova o círculo agora"*) porque os meteoros caindo já diziam onde ela
   * estava, e melhor: em movimento. Este é o oposto no tempo — existe ANTES do
   * golpe, enquanto não há nada em tela dizendo onde ele vai cair, e some no
   * instante em que o efeito começa. Um informa o que ainda não se vê; o outro
   * repetia o que já se via.
   *
   * ⚠️ **Um nó só para o andar inteiro.** A conjuração de área é rara e curta;
   * um sprite por conjurador seria alocação por evento — e, com a chave por
   * `casterId`, dois magos conjurando ao mesmo tempo simplesmente disputam o
   * mesmo círculo. É simplificação assumida: se um dia houver duelo de áreas,
   * vira um mapa de nós, como os `castBar`.
   */
  const circuloConj = new AnimatedSprite([Texture.EMPTY]);
  circuloConj.anchor.set(0.5);
  circuloConj.blendMode = 'add';
  circuloConj.zIndex = -0.73;
  circuloConj.visible = false;
  objects.addChild(circuloConj);

  /**
   * ⭕ **O MESMO ANEL, agora também na MIRA** — pedido do dono em 11/09:
   * *"substitua a área quando vou selecionar onde vou jogar a magia"*.
   *
   * 🔴 **É o mesmo desenho nos dois momentos, e é isso que o torna útil.** Antes
   * a mira era um traço laranja e a conjuração era o anel: duas linguagens para
   * a mesma pergunta ("onde isto vai cair?"). Agora o jogador vê a MESMA marca
   * enquanto escolhe e enquanto a magia carrega — o que ele mirou é literalmente
   * o que ficou no chão.
   *
   * ⚠️ **Nó separado do de conjuração de propósito.** Os dois quase nunca
   * coexistem (mirar acaba no clique, conjurar começa nele), mas compartilhar
   * um nó acoplaria o `tint` e a rotação de dois estados diferentes — e o
   * primeiro quadro depois do clique mostraria o anel da mira com a cor errada.
   */
  const circuloMira = new AnimatedSprite([Texture.EMPTY]);
  circuloMira.anchor.set(0.5);
  circuloMira.blendMode = 'add';
  circuloMira.zIndex = -0.74;
  circuloMira.visible = false;
  objects.addChild(circuloMira);
  /** Quem é o dono do círculo agora. Sem isto, um `casting: null` de OUTRO mago apagaria o círculo deste. */
  let circuloDe: string | null = null;
  /*
   * ⭕ **O ANEL É ANIMADO** (11/09): 30 quadros de 256×256 numa tira, com o
   * brilho varrendo a circunferência. Substituiu a imagem estática de uma hora
   * antes — *"ficou mais bonito que o que está implementado"*.
   *
   * ⚠️ **A animação e a rotação por código CONVIVEM, e fazem coisas
   * diferentes.** A folha varre o BRILHO em volta do anel sem mexer no desenho;
   * a rotação vira o desenho inteiro, estrelas e losangos junto. Uma sozinha lê
   * como luz piscando, a outra como adesivo girando.
   */
  const QUADROS_ANEL = 30;
  /**
   * ⚠️ **A folha é uma GRADE de 6 colunas, e não uma tira.** Trinta quadros de
   * 384 em fila dariam 11 520 px de largura, acima do teto de 8 192 que placas
   * mais modestas impõem — e uma textura larga demais não carrega, deixando o
   * anel sumir sem erro nenhum. O número tem de bater com o `COLS` do
   * `tools/anel2fx.mjs`.
   */
  const COLUNAS_ANEL = 6;
  void Assets.load<Texture>('/assets/fx/anel_conjuracao.png')
    .then((t) => {
      const lado = t.width / COLUNAS_ANEL;
      const quadros = Array.from({ length: QUADROS_ANEL }, (_, i) => new Texture({
        source: t.source,
        frame: new Rectangle(
          (i % COLUNAS_ANEL) * lado,
          Math.floor(i / COLUNAS_ANEL) * lado,
          lado, lado,
        ),
      }));
      for (const a of [circuloConj, circuloMira]) {
        a.textures = quadros;
        /*
         * ⚠️ **0,2 = os 30 quadros em ~2,5 s** (`animationSpeed` é quadros por
         * tique de 60 Hz: 30 ÷ 150 tiques). Mais rápido vira estroboscópio num
         * desenho cheio de linha fina; mais lento não se percebe numa
         * conjuração de três segundos.
         */
        a.animationSpeed = 0.2;
        a.play();
      }
    })
    .catch((e: unknown) => console.warn('[fx] anel de conjuração não carregou:', e));

  /** ⭕ Mostra o círculo no ponto e no tamanho da área, ou o esconde. */
  function marcaConjuracao(
    casterId: string, ponto?: { x: number; y: number; raio: number },
  ): void {
    /*
     * ⭕ **SÓ MAGIA DE ÁREA** — dono, 11/09: *"ajuste o tamanho conforme a área
     * das magias em área somente"*.
     *
     * 🔴 `raio 0` não é "um círculo pequeno": é magia que NÃO tem área. O
     * servidor manda o ponto para tudo que mira o chão, e sem esta guarda uma
     * magia de ponto desenharia um anel de um tile — que mente sobre o alcance
     * do golpe e ainda some debaixo do próprio personagem.
     */
    if (!ponto || ponto.raio <= 0) {
      // ⚠️ Só o DONO do círculo pode apagá-lo.
      if (circuloDe === casterId) { circuloConj.visible = false; circuloDe = null; }
      return;
    }
    circuloDe = casterId;
    circuloConj.x = ponto.x * TS + TS / 2;
    circuloConj.y = ponto.y * TS + TS / 2;
    /*
     * ⚠️ **O diâmetro é `(raio × 2 + 1)` tiles, o QUADRADO real do dano.** O
     * jogo mede alcance em Chebyshev, então raio 4 é um bloco 9×9 — e o
     * círculo inscrito nele toca o meio dos lados e deixa as quinas de fora.
     * É a mesma aproximação que a marca da mira já usava desde 08/09, e a nota
     * de lá vale aqui: as quinas apanham mesmo estando fora do desenho.
     */
    const lado = (ponto.raio * 2 + 1) * TS;
    /*
     * 🔴 **QUADRADO, e a primeira versão errou aqui.** A arte chegou desenhada
     * em perspectiva e eu mantive a proporção dela, achando que elipse era o que
     * "deitado no chão" queria dizer. O dono viu em tela: *"está torto e não está
     * no chão"*. O chão deste jogo NÃO tem perspectiva — a marca de mira sempre
     * foi um círculo perfeito —, e pior: **elipse girando em 2D lê como anel
     * INCLINADO mudando de inclinação**, não como disco rodando. A arte foi
     * reesticada para redonda (`tools/anel2fx.mjs`) e aqui os dois eixos são
     * iguais.
     */
    circuloConj.width = lado;
    circuloConj.height = lado;
    circuloConj.rotation = 0;
    circuloConj.alpha = 0;
    circuloConj.visible = true;
  }

  /*
   * ❄️ **`emVolta` entra aqui junto com `self` e `party`**, e é o que faz a tecla
   * DISPARAR em vez de armar: a Explosão Glacial estoura nos pés de quem lançou,
   * então pedir um clique seria pedir que o jogador apontasse para si mesmo —
   * com um monstro em cima, no segundo em que ele precisa da magia.
   */
  const precisaMira = (def: SkillDef): boolean =>
    def.shape !== 'self' && def.shape !== 'party' && !def.emVolta;

  /**
   * Teto da perseguição para conjurar.
   *
   * ⚠️ Existe porque o herói e o monstro andam à MESMA velocidade nominal, e um
   * bicho fugindo em linha reta nunca entraria no alcance. Sem prazo, um clique
   * errado viraria uma caminhada até a borda do mapa. Doze segundos é bem mais
   * que a travessia de uma tela e bem menos que o tempo em que o jogador ainda
   * lembra do que clicou.
   */
  const PERSEGUIR_MAX_MS = 12000;

  /**
   * Magia clicada longe demais, a lançar quando o herói chegar ao alcance.
   *
   * 🔴 **`alvoId` existe porque o alvo ANDA** — defeito relatado pelo dono em
   * 12/09: *"se o monstro andar para fora da área ele não solta a magia"*. Antes
   * este registro guardava só um TILE, o do bicho no instante do clique. O
   * monstro dava dois passos, o herói caminhava até o tile vazio, media a
   * distância contra esse fantasma e a magia nunca saía.
   *
   * ✅ Com o id, o tile é recalculado a cada tique a partir de onde a criatura
   * ESTÁ. Quem persegue, persegue o bicho — não a pegada.
   *
   * ⚠️ `tileX`/`tileY` continuam aqui e não são redundantes: magia de ÁREA mira
   * o chão, e chão não anda. Eles são o alvo quando não há `alvoId`.
   */
  let conjurarAoChegar:
    {
      id: SkillId;
      tileX: number;
      tileY: number;
      nivel?: number;
      alvoId?: string | null;
      /** Último tile para onde a rota foi traçada — só se retraça quando muda. */
      rotaPara: number;
      /** Prazo da perseguição, para não caçar um bicho mais rápido para sempre. */
      ate: number;
    } | null = null;
  /** Nível pedido pela magia armada — vem do slot da barra que a armou. */
  let nivelArmado: number | undefined;

  function desarmaMagia(): void {
    magiaArmada = null;
    miraLabel.style.display = 'none';
    miraMarca.visible = false;
    // ⭕ O anel da mira some junto: ele é a MESMA marca, e deixar um sem o
    // outro mostraria meia mira no chão.
    circuloMira.visible = false;
    alvoAssistido = null;
    // ⚠️ Esc cancela também a caminhada para conjurar. Sem isto o herói
    // continuaria andando e soltaria a magia sozinho, depois de o jogador já
    // ter desistido dela.
    conjurarAoChegar = null;
    nivelArmado = undefined;
  }

  /**
   * Redesenha a marca da mira no tile apontado.
   *
   * 🔴 **CÍRCULO também na área — decisão do dono (08/09)**, depois de eu
   * apontar que o jogo mede distância em **Chebyshev**: raio 2 pega um bloco
   * 5×5, não um disco.
   *
   * ⚠️ O que isso custa, para quem for mexer aqui: os **quatro cantos** do
   * bloco ficam de fora do círculo e mesmo assim levam dano. O raio desenhado é
   * `(raio + 0,5)` tiles — a circunferência inscrita no quadrado real, que toca
   * o meio dos lados. É o desenho mais próximo da verdade dentro da forma
   * pedida; a versão fiel seria o quadrado, e está no histórico de 08/09.
   */
  /**
   * 🎯 **ASSISTENTE DE MIRA** — pedido do dono em 11/09: *"quando coloco a
   * single target, ela puxa a mira para o monstro que estou movendo o mouse
   * próximo, para eu não clicar errado, castar a magia e nada acontecer."*
   *
   * 🔴 **O sintoma vinha de uma lacuna real no cliente, não de falta de
   * pontaria.** O `cast` sempre pôde levar `targetId`, e o servidor sempre o
   * honrou (`mira.targetId ?? player.targetId`) — mas o cliente **nunca mandava
   * esse campo**. Em magia de alvo único ele mandava um TILE, e o servidor caía
   * no alvo selecionado: se não houvesse nenhum, a mana e a recarga iam embora e
   * não acontecia nada. O ímã resolve a pontaria; mandar o `targetId` resolve a
   * causa.
   *
   * ⚠️ **Dois tiles de alcance, e não mais.** O ímã existe para perdoar o erro
   * de um tile ou dois com o alvo em movimento; puxando de longe ele passa a
   * decidir pelo jogador, e a magia sai em quem ele não queria — que é pior que
   * errar, porque errar pelo menos avisa.
   *
   * ⚠️ **Desempate pela distância REAL ao cursor, e não pelo tile.** Dois
   * monstros a um tile de distância empatam na conta de tiles, e sem o segundo
   * critério o escolhido seria o primeiro do mapa — ou seja, sorteio. Com ele, é
   * o que está visivelmente mais perto do ponteiro.
   */
  const RAIO_ASSIST = 2;

  function alvoPerto(tx: number, ty: number): EntitySnapshot | undefined {
    let melhor: EntitySnapshot | undefined;
    let melhorTile = Infinity;
    let melhorPx = Infinity;
    for (const e of porId.values()) {
      if (e.kind !== 'creature' || e.floor !== myFloor) continue;
      // ⚠️ Corpo tem `hp` zerado e continua no mapa; mirar nele gastaria a magia
      // exatamente como o clique errado que este ímã existe para evitar.
      if ((e.hp ?? 0) <= 0) continue;
      const dTile = Math.max(Math.abs(e.tileX - tx), Math.abs(e.tileY - ty));
      if (dTile > RAIO_ASSIST) continue;
      const dPx = (e.tileX - tx) ** 2 + (e.tileY - ty) ** 2;
      if (dTile < melhorTile || (dTile === melhorTile && dPx < melhorPx)) {
        melhor = e;
        melhorTile = dTile;
        melhorPx = dPx;
      }
    }
    return melhor;
  }

  /** O alvo que o ímã escolheu, para o clique mandar o id e não só o tile. */
  let alvoAssistido: string | null = null;

  function pintaMira(clientX: number, clientY: number, tx: number, ty: number): void {
    if (!magiaArmada) return;
    const def = SKILLS[magiaArmada];
    const nivel = Math.max(1, skillLevels[magiaArmada] ?? 1);
    const limite = skillCastRange(def, nivel);

    /*
     * 🎯 **O ÍMÃ só vale para ALVO ÚNICO.** Em magia de área o ponto clicado é a
     * escolha do jogador — puxar o centro da tempestade para cima do bicho mais
     * próximo estragaria justamente a decisão de onde colocá-la.
     */
    const soAlvo = !skillMiraNoChao(def);
    const preso = soAlvo ? alvoPerto(tx, ty) : undefined;
    alvoAssistido = preso?.id ?? null;
    if (preso) { tx = preso.tileX; ty = preso.tileY; }

    const dist = Math.max(Math.abs(tx - myTileX), Math.abs(ty - myTileY));
    const fora = dist > limite;

    miraLabel.style.left = `${clientX + 14}px`;
    miraLabel.style.top = `${clientY + 18}px`;
    miraLabel.innerHTML = fora
      ? `${def.name} <span class="fora">· longe demais</span>`
      : `${def.name}`;

    const raio = skillMiraNoChao(def) ? skillRange(def, nivel) : 0;
    /**
     * 🔴 **O anel deixou de ser ÂMBAR** — dono, 12/09: *"está dando muita borda
     * amarela, melhora a qualidade"*.
     *
     * `0xffc46b` era herança do TRAÇO laranja que existia antes do anel
     * desenhado (11/09). Num traço fino, laranja é cor de mira e funciona; num
     * selo arcano de nove tiles em mistura aditiva, ele tinge o chão inteiro de
     * bege e o desenho lê como mancha, não como runa.
     *
     * ⚠️ **O vermelho do "longe demais" FICA**, e é o ponto: era a única das
     * duas cores que carregava informação. Agora que a normal é neutra, o aviso
     * salta em vez de ser um tom de âmbar um pouco diferente do outro.
     */
    const cor = fora ? 0xff7a68 : 0xcfe8ff;
    const px = tx * TS;
    const py = ty * TS;
    miraMarca.clear();
    /*
     * 🔥 **A MURALHA MOSTRA A ORIENTAÇÃO ANTES DE SAIR.**
     *
     * A barreira nasce perpendicular à linha conjurador → mira, e o jogador
     * precisa VER isso antes de gastar a magia: com o anel quadrado de sempre,
     * ele descobriria a direção depois de a parede estar no chão, e a decisão
     * tática inteira da habilidade acontece antes do clique.
     *
     * ⚠️ A conta é a MESMA do servidor (eixo dominante, empate na parede de pé).
     * Duas contas diferentes aqui e lá seriam uma prévia que mente.
     */
    if (def.ground?.linha) {
      circuloMira.visible = false;
      const deitada = Math.abs(ty - myTileY) > Math.abs(tx - myTileX);
      const larg = (deitada ? raio * 2 + 1 : 1) * TS;
      const alt = (deitada ? 1 : raio * 2 + 1) * TS;
      miraMarca
        .rect(px + TS / 2 - larg / 2, py + TS / 2 - alt / 2, larg, alt)
        .fill({ color: cor, alpha: 0.16 })
        .stroke({ width: 2, color: cor, alpha: 0.85 });
      miraMarca.visible = true;
      return;
    }
    if (raio > 0) {
      /*
       * ⭕ **O DISCO DE PREENCHIMENTO SAIU** — dono, 12/09, comparando as duas
       * telas: *"ainda está com bordas demais antes de lançar a magia; depois
       * que lanço ficou perfeito"*.
       *
       * 🔴 A diferença entre mirar e conjurar era exatamente ele: um disco de
       * alfa 0,12 cobrindo a área inteira, por baixo do anel. Ele foi herdado do
       * traço laranja de 11/09 e tinha uma razão — *dizer que a área é CHEIA e
       * não só uma borda*.
       *
       * ✅ Essa razão morreu quando o anel virou ARTE do tamanho da área. O
       * desenho tem estrelas, correntes e losangos do centro à beirada: ele já
       * mostra o miolo. O disco virou um véu chapado com borda visível em cima
       * de um desenho que não precisava dele — e é o mesmo defeito que o âmbar
       * tinha, só que em forma em vez de cor.
       *
       * ⚠️ E a informação do `fora` não se perde: o `tint` do anel continua
       * carregando o "longe demais", e ele é o mesmo anel inteiro em vermelho.
       */
      const lado = (raio * 2 + 1) * TS;
      circuloMira.x = px + TS / 2;
      circuloMira.y = py + TS / 2;
      circuloMira.width = lado;
      circuloMira.height = lado;
      circuloMira.tint = cor;
      /*
       * ⚠️ Mais discreto que a primeira versão (0,8 / 0,5), a pedido do dono:
       * o anel fica em cena o tempo todo em que se está mirando, e opaco demais
       * ele competia com o cenário em vez de só marcar o chão.
       */
      circuloMira.alpha = fora ? 0.32 : 0.5;
      circuloMira.visible = true;
    } else {
      circuloMira.visible = false;
      // Alvo único: círculo pequeno no tile, como o dono pediu.
      miraMarca
        .circle(px + TS / 2, py + TS / 2, TS * 0.42)
        .stroke({ color: cor, width: 2, alpha: 0.9 });
      /*
       * 🎯 **O ÍMÃ PRECISA SE MOSTRAR.** Um marcador que pula sozinho para o
       * lado, sem dizer por quê, lê como bug de mira. O segundo anel, mais
       * largo, é o que transforma o pulo em "travou naquele ali" — e é ele que
       * dá ao jogador a chance de perceber que travou no monstro ERRADO antes
       * de gastar a magia.
       */
      if (preso) {
        miraMarca
          .circle(px + TS / 2, py + TS / 2, TS * 0.62)
          .stroke({ color: cor, width: 1, alpha: 0.5 });
      }
    }
    miraMarca.visible = true;
  }

  /** Manda a intenção de usar. Quem valida (mana/cooldown/alvo) é o servidor. */
  function castSpellId(
    id: SkillId,
    mira?: { tileX: number; tileY: number; targetId?: string | null },
    nivel?: number,
  ): void {
    if ((skillLevels[id] ?? 0) <= 0) {
      logChat(`Você ainda não aprendeu <b>${SKILLS[id].name}</b> — abra as Skills (tecla K).`, 'sys');
      return;
    }
    const def = SKILLS[id];
    if (!mira && precisaMira(def)) {
      // Apertar a tecla da magia já armada desarma — é o jeito de desistir sem
      // tirar a mão do teclado.
      if (magiaArmada === id) { desarmaMagia(); return; }
      magiaArmada = id;
      // ⚠️ O nível vem do SLOT que armou, e tem de sobreviver até o clique:
      // sem isto, mirar com o Fire Bolt 4 lançaria o 10 ao soltar o mouse.
      nivelArmado = nivel;
      miraLabel.style.display = 'block';
      miraLabel.textContent = def.name;
      /*
       * ⚠️ **A CRUZ DO SISTEMA SAIU TAMBÉM** (dono, 12/09: *"está aparecendo uma
       * cruz branca no meu jogo ainda"*). Ela marcava o modo de mira, mas era o
       * `crosshair` do navegador — a única coisa na tela que ainda não era arte
       * do jogo, e num jogo com ponteiro desenhado isso lê como bug.
       *
       * ✅ **O modo de mira não ficou sem sinal:** continuam o rótulo com o nome
       * da magia, o círculo de conjuração e a marca no chão sob o cursor. São
       * três avisos, e nenhum deles é um cursor emprestado do sistema.
       */
      return;
    }
    /*
     * 🔴 **LONGE DEMAIS: anda até o alcance e lança ao chegar** (dono, 08/09).
     * Vale para os dois casos — na de alvo único o herói se aproxima do
     * monstro, na de área se aproxima do PONTO clicado.
     *
     * ⚠️ Ele para assim que ENTRA no alcance, não ao chegar em cima: o
     * `irParaPerto` traça a rota até o lado do alvo, mas o laço do tique
     * interrompe no primeiro tile de onde já dá para lançar. Um mago que
     * caminhasse até encostar perderia justamente a vantagem que a distância
     * dá a ele.
     */
    if (mira) {
      const nivel = Math.max(1, skillLevels[id] ?? 1);
      const limite = skillCastRange(def, nivel);
      if (distDoHeroi(mira.tileX, mira.tileY) > limite) {
        conjurarAoChegar = {
          id, tileX: mira.tileX, tileY: mira.tileY, nivel,
          // 🎯 O id do alvo viaja junto com a intenção: é ele que permite
          // recalcular o tile a cada tique, e é ele que o `cast` vai mandar ao
          // chegar. Sem isso o servidor cairia no alvo SELECIONADO — ou em
          // nenhum, e a magia sairia no vazio depois de toda a caminhada.
          alvoId: mira.targetId ?? null,
          rotaPara: mira.tileY * map.width + mira.tileX,
          ate: performance.now() + PERSEGUIR_MAX_MS,
        };
        irParaPerto(mira.tileX, mira.tileY);
        return;
      }
      conjurarAoChegar = null;
    }
    /*
     * 🔴 **CONJURAR PARA DE ANDAR** — defeito relatado pelo dono em 12/09: *"se
     * eu clicar para ele ir para algum lugar e soltar a magia, ele está andando
     * e cancelando a magia antes de soltar"*.
     *
     * Andar interrompe conjuração (é o contrajogo das magias grandes, e tem de
     * continuar sendo). Mas quem clicou no chão e DEPOIS apertou a magia não
     * está mudando de ideia sobre a magia — está mudando de ideia sobre o
     * passeio. O cliente seguia mandando os passos da rota antiga e o servidor,
     * corretamente, derrubava a conjuração.
     *
     * ⚠️ O caminho "andar até o alcance e conjurar" já cancelava a rota antes de
     * lançar (ver `conjurarAoChegar`); o que faltava era o caso simples — rota
     * em andamento, magia apertada agora.
     */
    cancelarRota();
    net.send({
      t: 'cast', spell: id,
      ...(mira ? { tileX: mira.tileX, tileY: mira.tileY } : {}),
      /*
       * 🎯 **O `targetId` do ímã.** O campo existe no protocolo desde 08/09 e o
       * servidor sempre o honrou, mas o cliente nunca o mandava — em magia de
       * alvo único ele mandava só o tile, e o servidor caía no alvo
       * SELECIONADO. Sem nenhum selecionado, a magia saía no vazio: mana e
       * recarga gastas, nada acontecendo. Era o defeito que o dono descreveu.
       */
      ...(mira?.targetId ? { targetId: mira.targetId } : {}),
      ...(nivel === undefined ? {} : { level: nivel }),
    });
  }

  /**
   * Último pacote de stats recebido. Guardado porque a barra pode ser
   * redesenhada FORA de um pacote — quando o jogador arrasta um slot — e ela
   * precisa dos níveis e da mana para repintar o que acabou de montar.
   */
  let ultimoStats: S2C_Stats | null = null;

  /** Repinta os slots (nível, sem mana, não aprendida) a cada S2C_Stats. */
  function updateSpellBar(s: S2C_Stats): void {
    ultimoStats = s;
    skillLevels = s.skillLevels;
    currentMana = s.mana;
    myProficiencies = s.proficiencies;
    myProfessions = s.professions;
    // Se a bancada está aberta, o nível novo aparece na hora — fabricar sobe
    // profissão, e ver o número mudar é metade da recompensa.
    if (craftEl.style.display !== 'none') renderCraft();
    // A barra é remontada quando a classe muda — trocar de personagem troca as
    // oito teclas inteiras, não só os ícones.
    if (s.charClass !== classeDaBarra) {
      classeDaBarra = s.charClass;
      buildSpellBar(s.charClass);
    }
    // A barra só existe para quem tem alguma habilidade na classe (o Arqueiro e
    // o Assassino ainda não têm árvore — Etapa 13).
    atualizaEfeitos(s.effects);
    const usable = barraAtual.some((item) => item !== null);
    spellBarEl.style.display = usable ? 'flex' : 'none';
    for (const [i, slot] of spellSlots) {
      const id = slot.id;
      const aprendido = skillLevels[id] ?? 0;
      // O nível DESTE slot, limitado ao aprendido. 0 no slot = usa o aprendido.
      const nivel = slot.nivel <= 0 ? aprendido : Math.max(1, Math.min(aprendido, slot.nivel));
      const naoAprendida = aprendido <= 0;
      slot.cell.classList.toggle('locked', naoAprendida);
      slot.cell.classList.toggle(
        'nomana',
        !naoAprendida && currentMana < skillManaCost(SKILLS[id], nivel),
      );
      slot.lvl.textContent = naoAprendida ? '' : String(nivel);
      // ⚠️ Marca o slot que NÃO usa o nível cheio: sem isto, dois atalhos da
      // mesma magia ficariam idênticos e o jogador teria de adivinhar qual é
      // o barato.
      slot.cell.classList.toggle('travado', !naoAprendida && slot.nivel > 0 && nivel < aprendido);
      // Fúria e Postura ficam ACESAS enquanto estão em efeito.
      const ligada =
        (id === 'battle_fury' && s.furyActive) || (id === 'defensive_stance' && s.stanceActive);
      slot.cell.classList.toggle('active', ligada);
      slot.tip.innerHTML = skillTipHtml(id, nivel, teclaDoSlot(i));
    }
  }

  /** Anima o cooldown do slot: setor escuro girando + segundos restantes. */
  function tickSpellCooldowns(now: number): void {
    for (const slot of spellSlots.values()) {
      // ⚠️ O cooldown é da MAGIA, não do slot: dois atalhos do mesmo Fire Bolt
      // recarregam juntos, porque o servidor guarda um tempo por habilidade.
      const cd = spellCooldowns.get(slot.id);
      if (!cd) continue;
      const left = cd.until - now;
      if (left <= 0) {
        spellCooldowns.delete(slot.id);
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
    // ⚠️ Acende TODOS os slots dessa magia: com nível por slot, ela pode estar
    // em mais de um, e os dois recarregam juntos.
    const slots = [...spellSlots.values()].filter((s) => s.id === id);
    if (slots.length === 0) return;
    spellCooldowns.set(id, { until: performance.now() + cooldownMs, dur: cooldownMs });
    for (const s of slots) {
      s.cell.classList.add('cooling', 'cast');
      setTimeout(() => s.cell.classList.remove('cast'), 400);
    }
  }

  // ---- Painel de habilidades (tecla K) ------------------------------------
  // A árvore: cada habilidade mostra o nível atual, o custo do próximo ponto e,
  // quando travada, POR QUE está travada (nível, pré-requisito ou pontos).
  /** Emoji de cada ramo da árvore — o mesmo dos documentos e do `skills.ts`. */
  const RAMO_ICONE: Record<string, string> = {
    cura: '💚', buff: '🌟', debuff: '☠️', natureza: '🌿',
    fogo: '🔥', gelo: '❄️', raio: '⚡', arcano: '✨',
  };

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
    /** Números do nível escolhido (mana, dano, golpes…). */
    num: HTMLElement;
    /** Botões − / + do nível a usar. `null` nas passivas, que não vão à barra. */
    menos: HTMLButtonElement | null;
    mais: HTMLButtonElement | null;
    usarLv: HTMLElement | null;
    /**
     * 🔴 **O nível que será ARRASTADO para a barra.** `0` = o aprendido.
     *
     * É o recurso do Ragnarok que o dono pediu em 08/09: clicar no tracinho 4
     * e arrastar leva o Fire Bolt **4** para o atalho, com a mana e o dano do
     * nível 4. Zero é o padrão e quer dizer "acompanha o que eu aprender" — um
     * número fixo congelaria o atalho quando a skill subisse.
     */
    sel: number;
  }

  /**
   * Linha compacta com o que muda de nível para nível.
   *
   * ⚠️ Cada tipo mostra o que importa para ELE. "Dano 0%" numa Postura
   * Defensiva não ajuda ninguém, e é o mesmo critério do tooltip da barra.
   */
  function numerosDoNivel(def: SkillDef, n: number): string {
    const p: string[] = [`<b>Lv.${n}</b>`];
    const mana = skillManaCost(def, n);
    if (mana > 0) p.push(`${mana} MP`);
    if (def.power > 0) p.push(`dano ${(skillPower(def, n) * 100).toFixed(0)}%`);
    const golpes = skillHits(def, n);
    if (golpes > 1) p.push(`${golpes} golpes`);
    if (def.shape !== 'self') {
      /*
       * ❄️ **A que estoura em volta mostra só o RAIO**, sem o "até": não há
       * distância de mira para informar, e escrever "alcance 2" diria ao jogador
       * que ele pode lançá-la a dois tiles de distância — que é o contrário do
       * que ela faz.
       */
      if (def.emVolta) p.push(`raio ${skillRange(def, n)} · ao seu redor`);
      else {
        p.push(skillMiraNoChao(def)
          ? `raio ${skillRange(def, n)} · até ${skillCastRange(def, n)}`
          : `alcance ${skillRange(def, n)}`);
      }
    }
    const dur = skillDuration(def, n);
    if (dur > 0) p.push(`${(dur / 1000).toFixed(1)}s`);
    const cd = skillCooldown(def, n);
    if (cd > 0) p.push(`recarga ${(cd / 1000).toFixed(1)}s`);
    return p.join(' · ');
  }
  const skillRows = new Map<SkillId, SkillRow>();

  function buildSkillPanel(cls: S2C_Stats['charClass']): void {
    skListEl.textContent = '';
    skillRows.clear();
    // 🔴 A janela lista a árvore INTEIRA da classe, não só os oito atalhos.
    // Enquanto o Knight tinha 8 habilidades e 8 slots as duas listas eram a
    // mesma; do Druida em diante, varrer a barra esconderia 15 das 23.
    let ramoAtual: string | null = null;
    for (const def of skillsOfClass(cls)) {
      const id = def.id;
      // Cabeçalho a cada troca de ramo. 23 linhas seguidas sem separação são
      // uma lista; separadas em 💚/🌟/☠️/🌿 são uma ÁRVORE, que é o que o
      // jogador precisa enxergar para escolher um arquétipo.
      const ramo = def.branch ?? null;
      if (ramo && ramo !== ramoAtual) {
        ramoAtual = ramo;
        const h = document.createElement('div');
        h.className = 'skbranch';
        h.textContent = `${RAMO_ICONE[ramo] ?? ''} ${ramo}`.trim();
        skListEl.appendChild(h);
      }
      const row = document.createElement('div');
      row.className = 'skrow';

      /*
       * 🔴 A linha é ARRASTÁVEL para a barra de atalhos — menos as passivas.
       *
       * Passiva não tem o que atalhar: o slot dela seria um botão que responde
       * "já está ativa". Deixá-la arrastável e recusar no `drop` seria pior —
       * o jogador arrastaria, veria o cursor aceitar, e nada aconteceria.
       */
      if (def.kind !== 'passive') {
        row.draggable = true;
        row.title = 'Arraste para um slot da barra de atalhos';
        row.addEventListener('dragstart', (ev) => {
          ev.dataTransfer?.setData(DND_SKILL, id);
          // 🔴 Leva o NÍVEL ESCOLHIDO nos botões − / +, não o aprendido.
          ev.dataTransfer?.setData(DND_NIVEL, String(skillRows.get(id)?.sel ?? 0));
          /*
           * 🔴 **A imagem que segue o cursor é SÓ O ÍCONE** (dono, 08/09).
           *
           * O padrão do navegador é um fantasma da linha INTEIRA — nome,
           * descrição, tracinhos e botões —, uma mancha de 300 px que tapa
           * justamente os slots para onde se está arrastando.
           *
           * ⚠️ `setDragImage` exige um elemento JÁ NO DOM e VISÍVEL no
           * instante da chamada; um `new Image()` solto sai em branco no
           * Chromium. Por isso a fonte é o próprio `img` da linha, que já está
           * na tela — e o deslocamento centra o ícone no ponteiro.
           */
          const icone = row.querySelector('img');
          if (icone) ev.dataTransfer?.setDragImage(icone, 16, 16);
          row.classList.add('dragging');
        });
        row.addEventListener('dragend', () => row.classList.remove('dragging'));
      }

      const top = document.createElement('div');
      top.className = 'top';
      const img = document.createElement('img');
      img.src = spellIconUrl(id);
      img.draggable = false;
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

      /*
       * 🔴 **OS BOTÕES − / + DO NÍVEL A USAR** (dono, 08/09, no lugar do clique
       * no tracinho: *"faça um botão de − e + das skills"*).
       *
       * ⚠️ **Não confundir com o `+` da linha de cima**, que é outro botão e
       * gasta Skill Point: aquele SOBE a habilidade, estes só escolhem em que
       * nível ela vai para o atalho. Por isso ficam noutra linha, com o número
       * entre eles e a palavra "usar" na frente.
       *
       * ⚠️ **Passiva não tem.** Ela não vai para a barra — o bloco inteiro só
       * é montado para quem é arrastável, a mesma regra do `draggable`.
       */
      const num = document.createElement('div');
      num.className = 'sknum';
      let menos: HTMLButtonElement | null = null;
      let mais: HTMLButtonElement | null = null;
      let usarLv: HTMLElement | null = null;
      if (def.kind !== 'passive') {
        const linha = document.createElement('div');
        linha.className = 'skuse';
        const rot = document.createElement('span');
        rot.className = 'rot';
        rot.textContent = 'usar';
        menos = document.createElement('button');
        menos.textContent = '−';
        menos.title = 'Um nível abaixo';
        usarLv = document.createElement('b');
        mais = document.createElement('button');
        mais.textContent = '+';
        mais.title = 'Um nível acima';
        /*
         * 🔴 Chegar no topo volta a `0`, que quer dizer "acompanha o que eu
         * aprender". Sem esse estado, quem subisse a skill continuaria preso no
         * número velho e teria de mexer no botão a cada ponto gasto.
         */
        const mexe = (d: number) => {
          const r = skillRows.get(id);
          if (!r) return;
          const aprendido = ultimoStats?.skillLevels[id] ?? 0;
          if (aprendido <= 0) return;
          const atual = r.sel > 0 ? r.sel : aprendido;
          const alvo = atual + d;
          r.sel = alvo >= aprendido || alvo < 1 ? 0 : alvo;
          if (ultimoStats) updateSkillPanel(ultimoStats);
        };
        menos.onclick = () => mexe(-1);
        mais.onclick = () => mexe(1);
        linha.append(rot, menos, usarLv, mais, num);
        row.append(linha);
      }

      const why = document.createElement('div');
      why.className = 'why';

      // ⚠️ A ordem importa: `skuse` já foi acrescentada acima para as ativas,
      // então aqui entram só as partes que TODA linha tem.
      row.prepend(top, dsc, bar);
      row.append(why);
      skListEl.appendChild(row);
      skillRows.set(id, { row, lv, btn, why, bar: pips, num, sel: 0, menos, mais, usarLv });
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
      /*
       * 🔴 Os tracinhos passaram a dizer DUAS coisas: `on` é o que já foi
       * aprendido, `sel` é o nível escolhido para arrastar. Sem a segunda
       * marca, clicar num tracinho não daria retorno visual nenhum e o jogador
       * não saberia o que está prestes a levar para a barra.
       */
      const escolhido = r.sel > 0 ? Math.min(r.sel, nivel) : nivel;
      for (let i = 0; i < r.bar.length; i++) {
        r.bar[i]!.classList.toggle('on', i < nivel);
        // O tracinho do nível escolhido continua marcado — é a leitura rápida.
        r.bar[i]!.classList.toggle('sel', r.sel > 0 && i === escolhido - 1);
      }
      if (r.usarLv) {
        r.usarLv.textContent = nivel > 0 ? String(escolhido) : '—';
        r.usarLv.classList.toggle('fixo', r.sel > 0);
      }
      // ⚠️ Desativados nas pontas: o `−` no 1 e o `+` no aprendido não têm
      // para onde ir, e um botão que aceita o clique sem fazer nada é pior que
      // um apagado.
      if (r.menos) r.menos.disabled = nivel <= 0 || escolhido <= 1;
      if (r.mais) r.mais.disabled = nivel <= 0 || escolhido >= nivel;
      r.num.innerHTML = nivel > 0 ? numerosDoNivel(def, escolhido) : '';

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
  const bestGrid = el('best-grid');
  const bestFicha = el('best-ficha');
  el('best-close').onclick = () => (bestPanel.style.display = 'none');

  /**
   * Espécie aberta na página da direita.
   *
   * ⚠️ Mora fora do `updateBestiary` porque as stats chegam a cada tique e
   * redesenham o painel: guardar a seleção dentro da função a perderia a cada
   * atualização, e o livro voltaria sozinho para a primeira criatura enquanto o
   * jogador estivesse lendo a ficha de outra.
   */
  let bestSel: string | null = null;
  /** Últimas stats vistas, para redesenhar a ficha ao clicar num encaixe. */
  let bestStats: S2C_Stats | null = null;
  /**
   * Assinatura da grade desenhada — mesmo padrão do `myCondKey` das condições.
   *
   * 🔴 **Sem isto a grade era reconstruída a cada `stats`**, e `stats` chega a
   * cada abate, cada item fabricado, cada ponto gasto. Reconstruir troca os
   * `<button>` por nós novos, e um clique cujo `mousedown` cai num nó que
   * desaparece antes do `mouseup` **não vira `click` nenhum** — foi o
   * *"clico no monstro e ele não carrega as informações"* de 29/08.
   */
  let bestKey = '';

  /**
   * O retrato da espécie: pintado quando existe, ícone de código quando não.
   *
   * 🔴 8 das 28 espécies têm retrato — ver `bestiario.ts` para o porquê e para a
   * alternativa que foi descartada (empurrar retrato parecido para espécie
   * errada). A mistura aparece, e foi decidida sabendo disso.
   */
  function bestImg(tipo: string, alt: string): HTMLImageElement {
    const img = document.createElement('img');
    img.src = retratoUrl(tipo) ?? creatureIconUrl(tipo);
    img.alt = alt;
    return img;
  }

  /** Realça na grade o encaixe da espécie aberta. */
  function marcaSelecionado(): void {
    for (const filho of bestGrid.children) {
      filho.classList.toggle('sel', (filho as HTMLElement).dataset.tipo === bestSel);
    }
  }

  /*
   * 🔴 **Uma escuta só, no contêiner — não uma por botão.** A grade é
   * reconstruída quando a lista muda, e handler preso a cada `<button>` morre
   * junto com ele. Delegado, o clique continua funcionando por cima de qualquer
   * redesenho, e não há N closures presas a nós que já saíram do documento.
   */
  bestGrid.addEventListener('click', (ev) => {
    const slot = (ev.target as HTMLElement | null)?.closest<HTMLElement>('.bslot');
    const tipo = slot?.dataset.tipo;
    if (!tipo) return;
    bestSel = tipo;
    marcaSelecionado();
    renderFicha(); // só a página da direita muda; nada a pedir ao servidor
  });

  /** Uma linha da ficha, sobre a plaquinha do kit. `???` sai em itálico. */
  function bestLinha(texto: string): HTMLDivElement {
    const d = document.createElement('div');
    d.className = texto.startsWith('???') ? 'bplate locked' : 'bplate';
    d.textContent = texto;
    return d;
  }

  /** Desenha a página da DIREITA: a ficha da espécie selecionada. */
  function renderFicha(): void {
    bestFicha.textContent = '';
    const s = bestStats;
    const tipo = bestSel;
    const e = s && tipo ? s.bestiary[tipo] : undefined;
    const def = tipo ? CREATURES[tipo] : undefined;
    if (!e || !def) {
      const dica = document.createElement('div');
      dica.className = 'bvazio';
      dica.textContent = 'Escolha uma criatura na página ao lado.';
      bestFicha.appendChild(dica);
      return;
    }

    const boss = !!def.boss;
    const pct = bestiaryPercent(e.kills, boss);
    const tier = bestiaryTier(e.kills, boss);

    const topo = document.createElement('div');
    topo.className = 'bficha-topo';
    topo.appendChild(bestImg(tipo!, def.name));
    const nome = document.createElement('div');
    nome.className = 'bficha-nome';
    nome.textContent = def.name;
    const pc = document.createElement('div');
    pc.className = 'bficha-pct';
    pc.textContent = `${pct}% conhecido · ${e.kills} abate${e.kills === 1 ? '' : 's'}`;

    const bar = document.createElement('div');
    bar.className = 'bestbar';
    const fill = document.createElement('i');
    fill.style.width = `${pct}%`;
    bar.appendChild(fill);

    bestFicha.append(topo, nome, pc, bar);

    // Cada patamar libera um bloco. O que não foi revelado sai como "???" — é o
    // incentivo para continuar caçando, e é a regra que já existia.
    bestFicha.appendChild(bestLinha(
      tier >= 1 ? `Vida ${def.maxHp} · XP ${def.xpReward}` : '??? vida e experiência',
    ));
    bestFicha.appendChild(bestLinha(
      tier >= 2 ? `Ataque ${def.strength} · Defesa ${def.defense}` : '??? ataque e defesa',
    ));
    bestFicha.appendChild(bestLinha(
      tier >= 3
        ? `${BEHAVIOR_LABEL[def.behavior ?? 'hostile']} · ouro ${def.goldMin}–${def.goldMax}`
        : '??? comportamento e loot',
    ));
    bestFicha.appendChild(bestLinha(
      tier >= 4 ? `Aggro ${def.aggroRange} tiles · ficha completa` : '??? alcance de aggro',
    ));
    if (e.variants.length > 1) {
      bestFicha.appendChild(bestLinha(`Variantes vistas: ${e.variants.length}`));
    }
  }

  function updateBestiary(s: S2C_Stats): void {
    bestStats = s;
    const entradas = Object.entries(s.bestiary)
      .filter(([, e]) => e.encountered)
      .sort((a, b) => b[1].kills - a[1].kills);

    if (entradas.length === 0) {
      if (bestKey !== 'vazio') {
        bestKey = 'vazio';
        bestGrid.textContent = '';
        const vazio = document.createElement('div');
        vazio.className = 'bvazio';
        vazio.textContent = 'Nenhuma criatura encontrada ainda.';
        bestGrid.appendChild(vazio);
      }
      bestSel = null;
      renderFicha();
      return;
    }

    // A seleção some se a espécie sair da lista (não sai hoje, mas some se um
    // save antigo for carregado). Sem isto a ficha ficaria presa num fantasma.
    if (!bestSel || !entradas.some(([t]) => t === bestSel)) bestSel = entradas[0]![0];

    // 🔴 Só redesenha quando a LISTA muda. Ver `bestKey` para o porquê — é o
    // conserto do clique que não pegava.
    const chave = entradas.map(([t, e]) => `${t}:${e.kills}`).join('|');
    if (chave !== bestKey) {
      bestKey = chave;
      bestGrid.textContent = '';
      for (const [tipo, e] of entradas) {
        const def = CREATURES[tipo];
        if (!def) continue;
        const pct = bestiaryPercent(e.kills, !!def.boss);

        const slot = document.createElement('button');
        slot.type = 'button';
        slot.className = 'bslot';
        // O clique é resolvido por DELEGAÇÃO, na escuta única lá em cima: o
        // tipo viaja no dataset em vez de num closure por botão.
        slot.dataset.tipo = tipo;
        slot.title = `${def.name} — ${pct}% conhecido`;

        const moldura = document.createElement('div');
        moldura.className = 'moldura';
        moldura.appendChild(bestImg(tipo, def.name));

        const nm = document.createElement('div');
        nm.className = 'nm';
        nm.textContent = def.name;

        slot.append(moldura, nm);
        bestGrid.appendChild(slot);
      }
    }
    marcaSelecionado();
    renderFicha();
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
          classAnims, slimeAnim, slimeVariants, creatureSheets,
          knightArt, heroArt, equipArt, npcAnim,
          selfClass: charClass, selfGender: gender, openShop, openBank, openCraft, openCorpse,
          gatherNode, pegarItem,
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
      /*
       * ❄️ **CONGELADO**: corpo azulado e animação parada. Ver `setFrozen`.
       *
       * ⚠️ Lido da lista de condições que já vem no snapshot — não há pacote
       * novo para isto. O servidor já manda quem está congelado; faltava o
       * cliente fazer alguma coisa com a informação além do ícone.
       */
      view.setFrozen?.(!!e.conditions?.includes('freeze'));
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
        if (REGUA_PASSO && (e.tileX !== myTileX || e.tileY !== myTileY)) {
          anotaPasso(e.tileX - myTileX, e.tileY - myTileY, performance.now());
        }
        myTileX = e.tileX;
        myTileY = e.tileY;
      }
    }
    for (const [id, view] of sprites) {
      if (!seen.has(id)) {
        /*
         * ⚔️ **Morreu ou sumiu: a seleção vai junto.** A ficha pede que nada
         * fique preso onde o monstro estava — e como o `destroy` logo abaixo
         * leva nome, barra e contorno, basta soltar o alvo. Ver
         * `atualizaUiDasEntidades`, que limpa a memória de dano no mesmo quadro.
         */
        if (id === targetId) targetId = null;
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
    // ⚠️ Esc desarma a magia ANTES de largar o alvo: com uma magia na mão, o
    // que o jogador quer cancelar é ela, não a mira de ataque básico.
    if (ev.key === 'Escape') {
      if (magiaArmada) desarmaMagia();
      else clearTarget();
    }
    if (ev.code === 'KeyC') alternaJanela('jan-personagem')();
    if (ev.code === 'KeyK') {
      // `flex`, não `block`: o painel virou coluna flex para o rodapé ficar
      // parado enquanto a lista de 23 habilidades rola.
      skPanelEl.style.display = skPanelEl.style.display === 'flex' ? 'none' : 'flex';
    }
    if (ev.code === 'KeyE') editor?.alterna();
    // R gira, mas só com o painel aberto: fora dele a tecla continua livre.
    if (ev.code === 'KeyR' && editor?.aberto()) editor.gira();
    // 🗺️ M abre e fecha o mapa grande, como o botão do minimapa.
    if (ev.code === 'KeyM') {
      abreMapaGrande(el('mapagrande').style.display !== 'flex');
    }
    if (ev.code === 'KeyB') {
      bestPanel.style.display = bestPanel.style.display === 'block' ? 'none' : 'block';
    }
    /*
     * Atalhos da barra: **F1–F12 na fileira de cima, Shift+F1–F12 na de baixo**.
     *
     * ⚠️ `F([1-9])` não bastava mais — pegava F1..F9 e deixava F10, F11 e F12
     * mudos, que é exatamente onde as habilidades grandes ficam no padrão novo.
     */
    /*
     * 🧪 1–4 usam os itens rápidos.
     *
     * ⚠️ `ev.code`, não `ev.key`: em teclado com acento morto e em layouts que
     * põem símbolo no lugar do número, `key` devolve outra coisa. `code` é a
     * tecla física, que é o que o jogador aperta.
     */
    const dig = /^Digit([1-4])$/.exec(ev.code);
    if (dig) {
      ev.preventDefault();
      usaItemRapido(Number(dig[1]) - 1);
    }
    const fn = /^F(\d{1,2})$/.exec(ev.code);
    if (fn) {
      const coluna = Number(fn[1]) - 1;
      if (coluna >= 0 && coluna < SKILL_BAR_COLS) {
        const id = barraAtual[coluna + (ev.shiftKey ? SKILL_BAR_COLS : 0)];
        // O preventDefault vale mesmo com o slot vazio: F1 abre a ajuda do
        // navegador e F11 põe em tela cheia, e ambos no meio de uma luta são
        // pior do que não fazer nada.
        ev.preventDefault();
        if (id) castSpellId(id.id, undefined, nivelDoSlot(id));
      }
    }
  });
  window.addEventListener('keyup', (ev) => heldKeys.delete(ev.code));

  chatInputEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      const text = chatInputEl.value.trim();
      /*
       * 🔴 O `/ok` é o único comando resolvido no CLIENTE, e tem de ser: o que ele
       * manda (sprite, giro, camada) é estado da interface, que o servidor não
       * tem como conhecer. Todo o resto continua indo como texto.
       */
      if (text.toLowerCase() === '/ok') {
        enviaOk();
        chatInputEl.value = '';
        chatInputEl.blur();
        ev.stopPropagation();
        return;
      }
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

  /*
   * 🖱️ **O CONTORNO DE CAMINHADA SAIU** (dono, 12/09: *"remova esse quadrado
   * transparente toda vez que passo o mouse sobre o chão"*).
   *
   * ⚠️ **Ele não era enfeite: prometia onde o clique ANDA** — só acendia em tile
   * caminhável e fora de monstro ou NPC. O que o aposentou foi o ponteiro novo.
   * Enquanto o cursor era a seta do sistema, o quadrado era a única resposta do
   * jogo ao mouse; com uma seta desenhada seguindo o cursor, a resposta já
   * existe, e duas marcas no mesmo tile viram ruído.
   *
   * ⚠️ **O laço ficou, e agora só serve à MIRA.** Sem magia armada ele sai na
   * primeira linha — não calcula tile nem consulta `podeAndar` a cada pixel de
   * movimento do mouse. O `mouseleave` foi junto: ele só escondia o quadrado.
   */
  /**
   * ⚔️ **O ESTADO DO CURSOR** (ficha do dono, 12/09).
   *
   * 🔴 **Dois estados e nada mais.** A ficha previa um terceiro, `INVALID_TARGET`,
   * e mandava fazê-lo "voltar para o padrão ou usar o estado inválido já
   * existente". Não existe estado inválido neste jogo — clicar fora de alcance
   * anda até lá e ataca —, então o terceiro estado seria um nome sem
   * comportamento próprio: exatamente o tipo de campo que fica escrito e nunca
   * é lido. Se um dia houver alvo inválido de verdade, ele entra aqui com
   * desenho próprio.
   *
   * ⚠️ **Troca por CLASSE no `body`, e só quando o estado muda.** Escrever
   * `style.cursor` a cada `mousemove` faria o navegador reavaliar o ponteiro
   * dezenas de vezes por segundo; a guarda no início é o que a ficha pede com
   * *"não criar um novo cursor a cada movimento do mouse"*.
   */
  type EstadoCursor = 'padrao' | 'ataque';
  let cursorAtual: EstadoCursor = 'padrao';
  let mouseNoMapa = false;
  /** A entidade sob o mouse — espécie e id —, ou `undefined`. */
  let entidadeSobOMouse: { especie: string; id: string } | undefined;

  function cursorDoJogo(estado: EstadoCursor): void {
    if (estado === cursorAtual) return;
    cursorAtual = estado;
    document.body.classList.toggle('mira-monstro', estado === 'ataque');
  }

  /**
   * Decide o cursor a partir do que está sob o mouse.
   *
   * ⚠️ **Com MAGIA ARMADA o cursor volta ao padrão**, mesmo sobre um monstro. O
   * vermelho promete ATAQUE, e com magia armada o clique conjura — prometer a
   * ação errada é pior que não prometer nada. É a mesma razão pela qual o antigo
   * contorno de caminhada também se apagava ao armar.
   *
   * ⚠️ **É chamada TODO QUADRO, e não só no `mousemove`.** O monstro pode morrer
   * ou andar para fora do tile com o mouse parado, e a ficha pede que o cursor
   * volte ao padrão nesses casos. Custa um `Map.has`, e o `cursorDoJogo` sai na
   * primeira linha quando nada mudou.
   */
  function avaliaCursor(): void {
    entidadeSobOMouse = undefined;
    if (!mouseNoMapa || magiaArmada) { cursorDoJogo('padrao'); return; }
    /*
     * 🔴 **Quem responde "o que está sob o mouse" é o PRÓPRIO TESTE DE ACERTO do
     * Pixi**, e não um mapa por tile como na primeira versão. A diferença não é
     * de estilo: o clique de ataque usa esse mesmo teste, então perguntar a ele
     * é a única forma de o cursor prometer exatamente o que o clique cumpre.
     * Por tile, um monstro de quatro tiles de altura acendia só no tile dos pés
     * — que era a queixa do dono.
     */
    const p = app.renderer.events.pointer.global;
    let n = app.renderer.events.rootBoundary.hitTest(p.x, p.y) as Container | null;
    while (n && !(typeof n.label === 'string' && n.label.startsWith('ent:'))) {
      n = n.parent as Container | null;
    }
    const partes = n ? String(n.label).split(':') : [];
    entidadeSobOMouse = partes.length === 3 ? { especie: partes[1]!, id: partes[2]! } : undefined;
    // ⚠️ Só CRIATURA acende o vermelho: bolsa e NPC não se atacam.
    cursorDoJogo(entidadeSobOMouse?.especie === 'creature' ? 'ataque' : 'padrao');
  }

  /**
   * ⚔️ **O CONTROLADOR DA UI DO MAPA** — nome, vida e contorno.
   *
   * 🔴 **Um lugar só decide, e ele roda TODO QUADRO.** A alternativa seria mexer
   * na UI em cada evento — entrou o mouse, clicou, bateu, morreu — e é assim que
   * se esquece um caminho e fica uma barra de vida presa em cima de um monstro
   * morto. Aqui o estado é RECALCULADO: quem não está na lista deste quadro é
   * apagado, sem precisar que alguém se lembre de apagá-lo.
   *
   * ⚠️ **A memória de dano morre junto com a seleção.** `jaSangrou` é limpo no
   * mesmo passo em que a UI se apaga, então trocar de alvo e voltar ao anterior
   * faz a vida esconder de novo até o próximo dano — que é o que a ficha pede
   * em "limpar o estado de dano do alvo anterior".
   */
  const jaSangrou = new Set<string>();
  const uiAtiva = new Set<string>();

  function atualizaUiDasEntidades(): void {
    const novos = new Set<string>();
    const sel = targetId ?? undefined;
    if (sel) {
      const v = sprites.get(sel);
      // ⚠️ A vida só entra se houve dano CONFIRMADO. Ver o `case 'hit'`.
      if (v?.mostraUi) {
        v.mostraUi({ nome: true, vida: jaSangrou.has(sel), contorno: true });
        novos.add(sel);
      }
    }
    const sob = entidadeSobOMouse?.id;
    if (sob && sob !== sel) {
      // ⚠️ Sob o mouse e não selecionado: SÓ o nome. Sem vida, sem contorno.
      const v = sprites.get(sob);
      if (v?.mostraUi) { v.mostraUi({ nome: true, vida: false, contorno: false }); novos.add(sob); }
    }
    for (const id of uiAtiva) {
      if (novos.has(id)) continue;
      sprites.get(id)?.mostraUi?.({ nome: false, vida: false, contorno: false });
      jaSangrou.delete(id);
    }
    uiAtiva.clear();
    for (const id of novos) uiAtiva.add(id);
  }

  viewportEl.addEventListener('mousemove', (ev) => {
    const t = tileDoEvento(ev);
    mouseNoMapa = true;
    avaliaCursor();
    if (!magiaArmada) return;
    const dentro = t.x >= 0 && t.y >= 0 && t.x < map.width && t.y < map.height;
    if (dentro) pintaMira(ev.clientX, ev.clientY, t.x, t.y);
    else { miraMarca.visible = false; circuloMira.visible = false; }
  });
  // ⚠️ Saiu do mapa: não há tile sob o mouse, então não há ataque a prometer.
  viewportEl.addEventListener('mouseleave', () => {
    mouseNoMapa = false;
    avaliaCursor();
  });

  // Botão esquerdo no CHÃO = ir até lá.
  //
  // 🔴 O clique numa entidade tem que sair por aqui sem andar. O sprite dela tem
  // `pointertap` próprio (atacar, abrir loja, saquear), mas o clique nativo do DOM
  // continua subindo até o viewport — então antes o personagem atacava o monstro
  // E ia andando até o tile dele. Checar o tile é mais confiável que tentar
  // cancelar a propagação do Pixi, porque não depende da ordem em que os dois
  // sistemas de evento disparam.
  viewportEl.addEventListener('click', (ev) => {
    if (ev.button !== 0 || !ehCliqueNoMundo(ev)) return;
    // Acabou de arrastar item pelo chão: este clique é o rabo do gesto, não uma
    // ordem de caminhada. Ver `fimDoArrasteDeChao`.
    if (performance.now() - fimDoArrasteDeChao < 250) return;
    const t = tileDoEvento(ev);
    if (t.x < 0 || t.y < 0 || t.x >= map.width || t.y >= map.height) return;
    /*
     * 🔴 **Magia armada: o clique CONJURA e não anda.** Tem de vir antes de
     * tudo, inclusive do construtor e dos tiles clicáveis — quem armou a magia
     * apontou para aquele ponto, e sair andando até lá seria o oposto.
     *
     * ⚠️ Desarma mesmo quando o servidor recusar (longe demais, sem mana): a
     * recusa chega por `denied` e o jogador vê a mensagem. Manter a magia
     * armada depois do clique faria o próximo clique conjurar sem querer.
     */
    if (magiaArmada) {
      const id = magiaArmada;
      // ⚠️ O nível do slot que armou tem de sobreviver ao `desarmaMagia`, que
      // o zera — daí a cópia antes.
      const nivel = nivelArmado;
      /*
       * 🎯 **O ÍMÃ DECIDE AQUI, no clique — e não guarda a decisão do hover.**
       *
       * 🔴 Defeito relatado pelo dono em 12/09: *"o assistente de mira não
       * funciona direito"*. `alvoAssistido` só era escrito por `pintaMira`, que
       * roda no MOVIMENTO do mouse. Clicar sem mexer (ou com o ponteiro parado
       * desde antes de armar) deixava a variável velha ou vazia, e o clique
       * saía sem `targetId` — a magia então ia pelo TILE, e o tile da criatura
       * já não era aquele. Perguntar de novo no clique custa uma varredura e
       * acaba com a categoria inteira de defeito.
       *
       * ⚠️ E o TILE mandado é o do alvo preso, não o do cursor. O servidor
       * procura criatura no tile antes de olhar o `targetId`; mandar o tile do
       * clique fazia essa busca achar nada — ou, pior, achar OUTRO bicho que
       * estivesse ali.
       */
      const preso = !skillMiraNoChao(SKILLS[id]) ? alvoPerto(t.x, t.y) : undefined;
      /*
       * 🔴 **Magia de alvo único sem alvo NÃO SAI, e não vira caminhada.**
       *
       * *"Quando clica no chão ele anda e não solta nada"*: `castSpellId` via um
       * tile longe, mandava o herói andar até lá e só então o servidor recusava
       * por falta de alvo. Recusar aqui é honesto — a magia precisa de um bicho,
       * e o chão não é um.
       */
      if (!skillMiraNoChao(SKILLS[id]) && !preso) {
        logChat(`<b>${SKILLS[id].name}</b> precisa de um alvo — clique no monstro.`, 'sys');
        desarmaMagia();
        return;
      }
      desarmaMagia();
      castSpellId(
        id,
        preso
          ? { tileX: preso.tileX, tileY: preso.tileY, targetId: preso.id }
          : { tileX: t.x, tileY: t.y },
        nivel,
      );
      return;
    }
    /*
     * 🔴 **Com o construtor ABERTO, o clique vira conta-gotas e não caminhada.**
     *
     * É modal de propósito. A alternativa seria um modificador (Shift+clique),
     * e ela é pior aqui: quem está consertando cenário clica em tile atrás de
     * tile procurando a peça certa, e segurar uma tecla o tempo todo cansa. Com
     * o painel aberto você está editando; para andar, WASD continua valendo, e
     * fechar com **E** devolve o clique-para-andar na hora.
     */
    if (editor?.aberto()) {
      const n = editor.aponta(t.x - FARM_AREA.x0, t.y - FARM_AREA.y0);
      if (n === 0) logChat(`Construtor: (${t.x}, ${t.y}) não tem arte da fazenda.`, 'sys');
      else if (n > 1) logChat(`Construtor: ${n} peças empilhadas aqui — clique de novo para descer.`, 'sys');
      return;
    }
    if (tilesClicaveis.has(t.y * map.width + t.x)) return; // é interação, não caminhada
    // ⚠️ Clicar para andar cancela a magia que esperava alcance: o jogador
    // mudou de ideia, e a magia sairia sozinha no meio do caminho novo.
    conjurarAoChegar = null;
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
    marcaDestino(fim.x, fim.y);
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
    /*
     * 🔴 **Se ELE já é o alvo, o botão vira "Parar de atacar"** — e sem
     * confirmação nenhuma. Parar não custa caveira; a confirmação existe para
     * proteger de COMEÇAR uma briga, e exigi-la para desistir seria o contrário
     * do que ela serve. Também não há motivo de recusa que impeça parar: mesmo
     * que o `motivoAtacar` diga "está no seu grupo", largar o alvo é válido.
     */
    const jaMirado = alvo.id === targetId;
    const custaCaveira = !alvo.skull && !jaMirado;
    const btnAtacar = itemMenu(
      jaMirado ? '🛑 Parar de atacar' : alvo.skull ? '⚔️ Atacar (⚪ alvo livre)' : '⚔️ Atacar',
      jaMirado ? null : motivoAtacar,
      () => setTarget(alvo.id), // toggle: com `jaMirado`, isto cancela
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
  /*
   * A posição REAL da câmera, em ponto flutuante. O que vai para `world.x/y` é
   * ela arredondada — ver o bloco de câmera dentro do ticker.
   *
   * 🔴 Guardar o float aqui não é preciosismo: se a suavização lesse de volta o
   * valor já arredondado, um passo menor que meio pixel arredondaria para o
   * mesmo lugar e a câmera EMPACARIA a poucos pixels do alvo, sem nunca chegar.
   */
  let camX = 0;
  let camY = 0;

  // Loop de render ---------------------------------------------------------
  app.ticker.add((ticker) => {
    if (myFloor !== renderedFloor) rebuildFloor(myFloor);

    // ⚔️ O monstro pode morrer ou sair do tile com o mouse parado. Ver `avaliaCursor`.
    avaliaCursor();

    const now = performance.now();

    /*
     * 🚜 A fazenda anda sozinha: a água corre, o peixe nada, as pás do moinho
     * giram, e a porta abre quando o herói encosta. Uma chamada só, e ela não
     * faz nada quando o herói está longe da fazenda — os sprites nem estão em
     * tela, mas o relógio deles continua barato.
     */
    if (farmArte) {
      farmArte.tick(now, ticker.deltaMS);
      farmArte.heroiEm(myTileX, myTileY);
    }
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

    /*
     * 🔴 **ENTROU NO ALCANCE? LANÇA. AINDA NÃO? CONTINUA ANDANDO** — pedido do
     * dono em 12/09: *"ele precisa andar e conjurar a magia no alvo, mesmo se
     * ele andar um pouco e ficar fora de alcance; ele precisa ir andando até
     * conseguir conjurar"*.
     *
     * Este bloco NÃO segue o molde dos três irmãos acima (abrir, coletar,
     * pegar), e a diferença é de propósito: lá o alvo é um corpo, um nó ou uma
     * pilha, e nenhum deles anda. Aqui o alvo é um bicho vivo.
     *
     * As duas mudanças, contra a versão que desistia calada:
     *
     * 1. **O tile vem do alvo, não da memória.** `alvo.tileX/Y` era o tile do
     *    clique; agora só vale como chão quando não há criatura.
     * 2. **Rota acabar não é desistir.** Era a saída `caminho.length === 0`, e
     *    era o defeito: o bicho anda, a rota termina no lugar antigo e o herói
     *    parava a dois passos do alcance, calado. Agora ela RETRAÇA.
     *
     * ⚠️ A retraçada é disparada por MUDANÇA DE TILE, não por quadro. `rotaAte`
     * é uma BFS de até quatro mil nós; chamá-la sessenta vezes por segundo
     * enquanto se persegue seria pagar uma busca inteira por quadro para redesenhar
     * quase sempre o mesmo caminho.
     */
    if (conjurarAoChegar) {
      const alvo = conjurarAoChegar;
      const vivo = alvo.alvoId ? porId.get(alvo.alvoId) : undefined;
      const morreu = alvo.alvoId !== null && alvo.alvoId !== undefined
        && (!vivo || (vivo.hp ?? 0) <= 0 || vivo.floor !== myFloor);
      const tx = vivo ? vivo.tileX : alvo.tileX;
      const ty = vivo ? vivo.tileY : alvo.tileY;
      const nivel = Math.max(1, skillLevels[alvo.id] ?? 1);
      const limite = skillCastRange(SKILLS[alvo.id], nivel);
      if (morreu) {
        // O alvo morreu ou sumiu no meio da caminhada. Desiste calado e para de
        // andar: seguir até o tile dele agora seria andar até um cadáver.
        conjurarAoChegar = null;
        cancelarRota();
      } else if (distDoHeroi(tx, ty) <= limite) {
        conjurarAoChegar = null;
        cancelarRota();
        castSpellId(
          alvo.id,
          { tileX: tx, tileY: ty, targetId: alvo.alvoId },
          alvo.nivel,
        );
      } else if (now >= alvo.ate) {
        conjurarAoChegar = null;
        cancelarRota();
        logChat('Não deu para alcançar o alvo a tempo.', 'sys');
      } else {
        const chave = ty * map.width + tx;
        if (chave !== alvo.rotaPara || caminho.length === 0) {
          alvo.rotaPara = chave;
          irParaPerto(tx, ty);
          // ⚠️ Rota impossível (alvo cercado, ou do outro lado de um muro sem
          // volta) devolve caminho vazio. Desistir AQUI, e não no quadro
          // seguinte, evita o laço de retraçar para sempre parado no lugar.
          if (caminho.length === 0) conjurarAoChegar = null;
        }
      }
    }

    // Chegou à pilha que se clicou de longe? Pega. Mesmas três saídas.
    if (pegarAoChegar) {
      const alvo = porId.get(pegarAoChegar);
      if (!alvo) {
        pegarAoChegar = null; // expirou, ou outro jogador levou
      } else if (distDoHeroi(alvo.tileX, alvo.tileY) <= 1) {
        const id = pegarAoChegar;
        pegarAoChegar = null;
        pegarItem(id);
      } else if (caminho.length === 0) {
        pegarAoChegar = null;
      }
    }

    // Consome a rota, um passo por vez, na MESMA cadência do teclado — então
    // andar por clique e por tecla tem exatamente a mesma velocidade.
    if (caminho.length > 0 && now - lastSentAt > INTERVALO_PEDIDO_MS) {
      const proximo = caminho[0]!;
      if (proximo.x === myTileX && proximo.y === myTileY) {
        caminho.shift();
        passoPedidoEm = 0;
        // 🎯 A CHEGADA é quem apaga o marcador — nunca o fim da animação.
        if (caminho.length === 0) limpaDestino();
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

    if (now - lastSentAt > INTERVALO_PEDIDO_MS && heldKeys.size > 0) {
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

    /*
     * ✨ **A CONJURAÇÃO DE CADA UM**: aura, barra e pose. A fração é contada
     * aqui a partir do começo e do fim que o servidor mandou.
     *
     * ⚠️ Varre o mapa de quem CONJURA, e não a lista de sprites: são no máximo
     * um punhado por andar, contra dezenas de entidades.
     *
     * ⚠️ Limpa sozinho quando o prazo passa. O servidor manda o fim, mas o
     * pacote pode se perder ou a entidade sair da tela no meio — e aura presa
     * em alguém que já lançou é exatamente o tipo de sujeira que fica.
     */
    for (const [id, cj] of conjurando) {
      const view = sprites.get(id);
      const resta = cj.ate - now;
      if (resta <= 0) {
        conjurando.delete(id);
        view?.setCasting?.(null);
        /*
         * ⭕ **O círculo também some por AQUI, e não só pelo pacote do
         * servidor.** Este ramo existe porque o `casting: null` pode se perder
         * ou a entidade sair da tela no meio — a mesma razão que já limpava a
         * aura e a pose. Sem a limpeza local, um círculo ficaria girando no
         * chão para sempre, e ele é grande demais para passar despercebido.
         */
        marcaConjuracao(id);
        continue;
      }
      view?.setCasting?.(1 - resta / cj.total, cj.nome);
    }

    /*
     * ⭕ **O CÍRCULO GIRA DEVAGAR enquanto a magia carrega.**
     *
     * ⚠️ **0,0008 rad/ms: uma volta a cada ~8 s.** Comecei em 0,00035 (~30 s por
     * volta) achando que *"girando LENTAMENTE"* pedia o mínimo possível — e em
     * tela isso não gira: a conjuração dura ~3 s, e 30 s por volta dão 36° no
     * total, que o olho lê como parado. A 8 s por volta são ~135° durante o
     * carregamento, o bastante para ver o anel andar.
     *
     * ⚠️ E o teto continua valendo pelo outro lado: num anel cheio de
     * estrelinhas, volta rápida vira cintilação — o olho lê piscada, não
     * rotação. O número certo é o que cabe DENTRO de uma conjuração.
     *
     * ⚠️ **Ele nasce e morre em FADE.** Aparecer de uma vez, no tamanho cheio,
     * lê como erro de desenho; 180 ms de entrada bastam para o olho entender
     * que aquilo foi conjurado ali.
     *
     * ⚠️ **Para em 0,55, e era 0,85** (dono, 11/09: *"gostaria dele mais
     * transparente um pouco"*). O anel cobre a área inteira da magia, então
     * quanto mais opaco, mais ele esconde o chão e os bichos que estão lá — que
     * é justamente o que se quer olhar enquanto a magia carrega.
     */
    if (circuloConj.visible) {
      // ⚠️ Lê o relógio direto: este bloco roda ANTES de o `dt` do laço ser
      // declarado, e mover o bloco para depois dele separaria o círculo da
      // varredura de quem conjura, que é onde ele nasce e morre.
      const dtC = app.ticker.deltaMS;
      circuloConj.rotation += dtC * 0.0008;
      circuloConj.alpha = Math.min(0.55, circuloConj.alpha + dtC / 180 * 0.55);
    }

    atualizaUiDasEntidades();

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
    // Redesenha os chips de buff a cada quadro: a contagem escorre em vez de
    // pular de segundo em segundo quando o pacote do servidor chega.
    if (meusEfeitos.length > 0) desenhaEfeitos(now);

    // Projéteis (flechas/feitiços) voando até o alvo.
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]!;
      p.t += dt;
      const r = Math.min(1, p.t / p.dur);
      p.node.x = p.fromX + (p.toX - p.fromX) * r;
      p.node.y = p.fromY + (p.toY - p.fromY) * r;
      /*
       * ⚠️ **Bola redonda não gira.** A flecha precisa apontar para onde vai; a
       * Esfera Elétrica, não — e girar uma bola cheia de arcos faz o crepitar
       * inteiro rodar junto, que lê como a esfera CAPOTANDO em vez de deslizar.
       */
      if (!p.semGiro) p.node.rotation = Math.atan2(p.toY - p.fromY, p.toX - p.fromX);
      if (p.cresce) {
        const s = p.cresce.de + (p.cresce.ate - p.cresce.de) * r;
        p.node.scale.set(s);
      }
      p.node.zIndex = 9999;
      if (r >= 1) {
        p.node.destroy();
        projectiles.splice(i, 1);
      }
    }

    // Bolas de fogo caindo. O atraso é o que abre o leque entre uma e outra.
    for (let i = quedas.length - 1; i >= 0; i--) {
      const q = quedas[i]!;
      /*
       * 🔴 A guarda é `!visible`, NÃO `atraso > 0`, e a diferença apagou a
       * animação inteira no primeiro teste: a PRIMEIRA bola de cada rajada
       * nasce com atraso ZERO, então `atraso > 0` era falso já na entrada, o
       * `play()` nunca era chamado e ela ficava invisível para sempre. Com
       * Fire Bolt nível 1 — uma bola só — não aparecia nada.
       */
      if (!q.node.visible) {
        q.atraso -= dt;
        if (q.atraso <= 0) {
          /*
           * 🧪 **MODO RISCO: primeiro o traço, o estouro só depois.** No modo
           * folha os dois são a mesma animação e ela começa aqui.
           */
          if (q.risco && q.risco.t < q.risco.dur) {
            q.risco.node.visible = true;
          } else {
            q.node.visible = true;
            q.node.play();
          }
        }
      }

      /*
       * 🧪 A COISA CAINDO. Interpolação de `(deX, deY)` até o alvo, no tempo de
       * queda DESTA unidade. Ao tocar o chão ela some e o estouro começa — o
       * dano do servidor chega neste mesmo instante, porque é o mesmo número
       * dos dois lados.
       *
       * ⚠️ **`deX` é zero em tudo menos no Meteoro**, e é ele que faz a
       * diferença entre cair e ATRAVESSAR a cena. Ver `trajetoria`.
       */
      if (q.risco && q.node.visible === false && q.atraso <= 0) {
        const r = q.risco;
        r.t += dt;
        const frac = Math.min(1, r.t / r.dur);
        /*
         * ⚠️ **A fração é acelerada quando há diagonal.** Um meteoro que vem de
         * longe tem de parecer que GANHA velocidade ao se aproximar; linear lê
         * como adesivo deslizando.
         *
         * ⚠️ **Expoente 1,6, e a primeira tentativa foi 2.** Ao quadrado, na
         * metade do tempo ele tinha andado só 25 % do caminho — e a 480 px de
         * partida isso o deixava FORA DA TELA durante mais de meio mergulho. O
         * dono pediu o contrário: *"o meteoro aparece pequeno e distante, deve
         * ocupar inicialmente uma pequena parte da tela"*. Com 1,6 ele já entrou
         * em cena na metade do tempo e ainda acelera no fim.
         */
        const p = r.deX !== 0 ? frac ** 1.6 : frac;
        r.node.x = q.node.x + r.deX * (1 - p);
        r.node.y = q.node.y - r.deY * (1 - p);
        if (r.cresce) {
          const [de, ate] = r.cresce;
          (r.node as AnimatedSprite).scale.set(de + (ate - de) * p);
        }
        if (frac >= 1) {
          /*
           * 🔴 **O RISCO É DESTRUÍDO AQUI, e não junto com o estouro.**
           *
           * Ele vivia até `morto`, que depende do `onComplete` da animação de
           * impacto. Qualquer caminho em que esse `onComplete` não chegasse
           * deixava um FEIXE VERTICAL parado em cima da entidade, para sempre —
           * e como o risco persegue o alvo, ele ficava colado nele. O dono viu:
           * *"remova qualquer feixe vertical estático que fique travado sobre
           * entidades"*.
           *
           * ✅ Destruir no toque do chão fecha a porta: o traço não tem mais
           * nada a fazer depois do impacto, então não há estado em que ele
           * deva sobreviver.
           */
          r.node.destroy();
          q.risco = undefined;
          q.node.visible = true;
          q.node.play();
          // ❄️ E os estilhaços saem AQUI, no toque do chão — o mesmo instante
          // do tremor e do dano. Ver `PARTICULAS`.
          cospeEstilhacos(q.magia, q.node.x, q.node.y);
          // 💥 A batida é por magia — ver `TREMOR`.
          const forca = TREMOR[q.magia] ?? TREMOR_PADRAO;
          tremorAte = now + forca.ms;
          tremorPx = forca.px;
          tremorDur = forca.ms;
          /*
           * 🌠 **O ANEL e as RACHADURAS, para quem cai em diagonal.**
           *
           * ⚠️ Só aqui, e não em toda queda: a Chuva solta dezoito por
           * conjuração, e dezoito anéis mais dezoito teias de rachadura viram um
           * tapete aceso em vez de dezoito impactos. O Meteoro avulso cai UMA
           * vez e é o assunto da tela — nele o peso cabe.
           */
          if (q.raioDano !== undefined) {
            clarãoDeImpacto(q.node.x, q.node.y, (q.raioDano + 0.5) * TS);
            rachaduras(q.node.x, q.node.y, (q.raioDano + 0.5) * TS);
            // 🪨 E os escombros: pedra, fagulha e poeira. Ver `ESCOMBROS`.
            escombrosDeImpacto(q.magia, q.node.x, q.node.y, (q.raioDano + 0.5) * TS);
          }
        }
      }

      /*
       * 💥 **A BATIDA DA MAGIA QUE NÃO TEM RISCO.** Ver `batida` em `spawnQueda`:
       * o relâmpago desenha a própria descida, então ninguém disparava o tremor
       * por ele. Agora o relógio dispara.
       */
      if (q.batida && !q.batida.feita && q.node.visible) {
        q.batida.t += dt;
        if (q.batida.t >= q.batida.em) {
          q.batida.feita = true;
          const forca = TREMOR[q.magia] ?? TREMOR_PADRAO;
          tremorAte = now + forca.ms;
          tremorPx = forca.px;
          tremorDur = forca.ms;
          cospeEstilhacos(q.magia, q.node.x, q.node.y);
          /*
           * 🔴 **O anel abre no raio de DANO, e não na largura do desenho.**
           *
           * Era a largura do sprite, e isso valia enquanto os dois batiam. Do
           * Lv.7 da Descarga em diante o bloco de dano tem 11 tiles e a arte
           * tem 9 — a arte não pode crescer (esticaria a coluna para fora da
           * tela), então quem conta a verdade é o anel.
           *
           * ⚠️ `(raio + 0,5)` tiles é a mesma conta do círculo da mira: o bloco
           * de dano é um quadrado em Chebyshev, e o círculo inscrito nele toca o
           * meio dos lados. As quinas ficam de fora do desenho e apanham — está
           * registrado desde 08/09, e a alternativa fiel seria desenhar o
           * quadrado.
           */
          const R = q.batida.raioDano !== undefined
            ? (q.batida.raioDano + 0.5) * TS
            : q.node.width * 0.45;
          clarãoDeImpacto(q.node.x, q.node.y, R);
          /*
           * 💥 **O TRANCO no próprio desenho.** Um pulo de 6 % na escala que
           * volta em 120 ms: é o que faz o raio parecer que BATEU, em vez de
           * ter sido apoiado no chão. Ver `tranco`.
           *
           * ⚠️ Seis por cento é pouco de propósito. Mais que isso e a coluna
           * inteira — dezesseis tiles dela — visivelmente incha, e o olho lê
           * elástico em vez de impacto.
           */
          q.tranco = { t: 0, dur: 120, base: q.node.scale.x };
        }
      }
      /*
       * 🔴 **A BOLA SEGUE O ALVO.** Entre o nascimento dela e o estouro passa
       * quase um segundo, e o monstro anda nesse tempo. Sem isto o dono via o
       * fogo cair no chão vazio e o número vermelho sair dois tiles ao lado.
       *
       * ⚠️ Segue o sprite JÁ SUAVIZADO (`container`), não o tile: é a posição
       * que o jogador enxerga. Perseguir o tile faria a bola andar aos saltos.
       *
       * ⚠️ `+ TS/2` e `+ TS` porque o container de uma entidade é ancorado no
       * canto do tile, e a queda é ancorada embaixo e no meio — mesmo ponto que
       * `msg.x * TS + TS / 2` calcula na chegada do `fx`.
       *
       * ⚠️ Sumido o alvo (morreu, saiu da tela), a bola FICA onde estava e
       * termina de estourar. Fazê-la sumir junto cortaria o efeito no meio.
       */
      if (q.alvo) {
        const alvo = sprites.get(q.alvo);
        if (alvo) {
          q.node.x = alvo.container.x + TS / 2;
          q.node.y = alvo.container.y + TS;
          /*
           * 🧪 O traço persegue junto: ele mira onde a bola vai cair.
           *
           * ⚠️ **Sem atropelar a diagonal.** Quem cai em diagonal tem um `deX`
           * que o laço de cima usa para posicionar; cravar `x` aqui apagaria a
           * trajetória e o meteoro desceria reto. Hoje nenhuma queda tem as duas
           * coisas (a diagonal é de ponto fixo, e só ponto móvel persegue), mas
           * a guarda é barata e o defeito seria mudo.
           */
          if (q.risco && q.risco.deX === 0) q.risco.node.x = q.node.x;
        }
      }
      /*
       * 🌫️ **O APAGAR.** Ver `desvanece`: a folha do relâmpago para no fim da
       * descarga e some por alfa, em vez de tocar os quadros que encolhem.
       *
       * ⚠️ O relógio só corre depois do ÚLTIMO quadro (`playing` falso), e não
       * junto com a animação: apagar em paralelo deixaria a descarga pálida
       * justamente quando ela tem de estar no auge.
       */
      /*
       * 💥 **O TRANCO.** Meia senoide: sobe até 6 % na metade do tempo e volta.
       * Escalar e voltar em linha reta faria um pico anguloso, que lê como
       * falha de quadro.
       */
      if (q.tranco) {
        q.tranco.t += dt;
        const r = Math.min(1, q.tranco.t / q.tranco.dur);
        q.node.scale.set(q.tranco.base * (1 + Math.sin(r * Math.PI) * 0.06));
        if (r >= 1) q.tranco = undefined;
      }
      if (q.apaga && !q.node.playing && q.node.visible) {
        q.apaga.t += dt;
        q.node.alpha = Math.max(0, 1 - q.apaga.t / q.apaga.em);
        if (q.apaga.t >= q.apaga.em) q.morto = true;
      }
      if (q.morto) {
        q.node.destroy();
        q.risco?.node.destroy();
        quedas.splice(i, 1);
      }
    }

    /*
     * ⚡ **AS ESFERAS PULSANDO NOS ALVOS.** Ver `orbes`: elas seguem o sprite,
     * dão um tranco a cada choque e apagam quando ninguém renova o prazo — que
     * é o que acontece assim que a criatura morre.
     */
    for (const [id, orbe] of orbes) {
      const view = sprites.get(id);
      /*
       * ⚠️ **Sem sprite, sem orbe.** A criatura saiu da tela ou foi removida do
       * mapa; deixar a bola no último lugar conhecido é o tipo de sujeira que
       * fica para sempre — foi o que aconteceu com o feixe vertical do Fire Bolt
       * em 10/09.
       */
      if (!view || now >= orbe.ate) {
        orbe.node.destroy();
        orbe.coluna.destroy();
        orbes.delete(id);
        continue;
      }
      const cx = view.container.x + TS / 2;
      orbe.node.x = cx;
      orbe.node.y = view.container.y + TS * 0.55;
      /*
       * ⚠️ O tranco decai rápido e a bola volta ao tamanho de repouso. É ele que
       * transforma "uma bola parada" em "uma bola levando descarga" — sem o
       * pulso, doze choques passariam sem nada mudar em tela.
       */
      orbe.pulso = Math.max(0, orbe.pulso - dt / 160);
      /*
       * ⚠️ **A escala é outra porque o quadro é outro.** O do impacto tem 256 px
       * de lado (contra 128 do voo), porque os raios de frente saem muito além
       * do núcleo e precisavam de margem. 0,26 dá 67 px de desenho com um núcleo
       * de pouco mais de um tile — do tamanho do bicho, com as pontas passando
       * por fora dele.
       */
      orbe.node.scale.set(0.26 + orbe.pulso * 0.12);
      orbe.node.alpha = 0.70 + orbe.pulso * 0.30;
      /*
       * ⚡ **A coluna acende com o tranco e apaga junto.** Ela nasce no CHÃO do
       * alvo (âncora embaixo) e sobe além da cabeça — é o fuso de luz da
       * referência, e é o que faz a descarga parecer que atravessa o bicho em
       * vez de estourar na frente dele.
       *
       * ⚠️ **Medida no alvo, e não escolhida no olho:** 0,42 × 0,62 sobre o
       * quadro de 128 px dá 54 × 79 px — pouco mais larga que o monstro e cerca
       * de uma vez e meia a altura dele, que é a proporção da referência. A
       * primeira tentativa (1,5 de altura) dava 192 px, SEIS tiles: um pilar
       * saindo da tela, não uma descarga.
       */
      orbe.coluna.x = cx;
      orbe.coluna.y = view.container.y + TS * 0.95;
      orbe.coluna.scale.set(0.42, 0.62);
      orbe.coluna.alpha = orbe.pulso * 0.6;
      orbe.coluna.visible = orbe.pulso > 0.02;
    }

    /*
     * ❄️ **A CHUVA DE CRISTAIS.** Um laço só, varrendo o pool: cada partícula
     * carrega a própria física e aqui só se integra e se apaga.
     *
     * ⚠️ **Varre TODO o pool, inclusive as mortas**, e não uma lista de vivas.
     * É de propósito: a lista de vivas precisaria de `splice` no meio, que é
     * justamente a alocação que o pool existe para evitar. Um `if` sobre setecentos
     * slots por quadro não custa nada perto disso.
     */
    for (const p of particulas) {
      if (!p.viva) continue;
      p.t += dt;
      const r = Math.min(1, p.t / p.dur);

      p.z += p.vz * dt;
      p.node.x = p.x;
      p.node.y = p.y - Math.max(0, p.z);
      p.node.scale.set(p.escala);
      /*
       * 💥 **A BATIDA: o cristal trava no chão e toca `shatter`.**
       *
       * ⚠️ Zerar o `vz` é o que impede a batida de disparar de novo no quadro
       * seguinte — sem isso um cristal parado no chão ficaria reiniciando o
       * estouro para sempre, e a tempestade não acabaria mais.
       *
       * ⚠️ O relógio é REINICIADO aqui (`t = 0`): a vida sorteada no nascimento
       * media a QUEDA, e o estouro precisa dos quatro quadros dele. Sem isto um
       * cristal que caiu tarde estilhaçaria em meio quadro.
       *
       * ⚠️ E o giro para. Uma explosão que continua rodando lê como pião, não
       * como gelo se partindo no chão.
       */
      if (p.z <= 0 && p.vz < 0) {
        p.vz = 0;
        p.z = 0;
        p.estilhacando = true;
        p.node.rotation = 0;
        const quebra = folhasP.get('shatter');
        if (quebra) {
          p.node.textures = quebra;
          p.node.loop = false;
          p.node.gotoAndPlay(0);
        }
        p.t = 0;
        p.dur = 260;
      } else if (!p.estilhacando) {
        p.node.rotation += p.giro * dt;
      }
      // ⚠️ Caindo, o cristal fica CHEIO — desbotar no ar faria a queda parecer
      // um erro de desenho. Só o estilhaço desaparece.
      p.node.alpha = p.estilhacando ? 1 - r * r : 1;

      if (r >= 1) {
        p.viva = false;
        p.node.visible = false;
        livres[p.camada].push(p.idx);
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
        camX += (targetX - camX) * 0.2;
        camY += (targetY - camY) * 0.2;
      } else {
        camX = targetX;
        camY = targetY;
        cameraSeguindo = !!self; // o herói apareceu: a partir daqui, suaviza
      }
      /*
       * 🔴 A CÂMERA ANDA EM PIXEL DE TELA INTEIRO, e isto é irmão do zoom ser
       * inteiro.
       *
       * A suavização entrega um deslocamento fracionário, e com filtragem
       * `nearest` a fração decide de que lado do texel cada pixel do sprite cai.
       * A 1,0× isso já desalinhava; a 2× cada meio pixel de câmera vira um pixel
       * de tela, e o cenário inteiro CINTILA enquanto o herói anda — um pixel
       * saltando para lá e para cá em linhas que deveriam estar paradas.
       *
       * Arredondar aqui, e só aqui, mantém a suavização intacta (ela vive em
       * `camX/camY`) e garante que a grade de pixels da tela nunca fique meio
       * texel fora da grade do desenho.
       */
      /*
       * 🧪 **TREMOR DE TELA** (teste do Fire Bolt "risco", 11/09).
       *
       * ⚠️ Somado DEPOIS do arredondamento, e não escrito em `camX/camY`: a
       * suavização da câmera persegue o herói, e empurrar o tremor para dentro
       * dela faria a câmera "aprender" o solavanco e voltar devagar. Aqui ele é
       * puro deslocamento de desenho — acaba e sai, sem deixar rastro.
       *
       * ⚠️ E é INTEIRO, pelo mesmo motivo que a câmera é: meio pixel de
       * deslocamento com filtragem `nearest` faz o cenário inteiro cintilar.
       */
      const resta = tremorAte - now;
      const shake = resta > 0
        ? Math.round(Math.sin(now * 0.09) * tremorPx * (resta / tremorDur))
        : 0;
      world.x = Math.round(camX) + shake;
      world.y = Math.round(camY) + (shake ? 1 : 0);
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
  /**
   * ⚔️ Liga nome, vida e contorno de MONSTRO. Ausente em quem não é monstro —
   * jogador e NPC mostram o nome sempre, e não têm alvo nem contorno.
   */
  mostraUi?: (ui: { nome: boolean; vida: boolean; contorno: boolean }) => void;
  setDirection: (dir: Direction) => void;
  setTarget: (x: number, y: number) => void;
  setHp: (hp?: number, maxHp?: number) => void;
  update: () => void;
  /** Toca a animação de ataque uma vez (atores com sprite animado). */
  playAttack?: (magia?: boolean) => void;
  /**
   * ✨ Liga/desliga a CONJURAÇÃO: aura no chão, barra em cima do nome e a pose
   * de carregamento. `null` desliga.
   *
   * ⚠️ Opcional porque nem todo ator a tem — item, nó de recurso e os
   * fallbacks antigos não conjuram.
   */
  setCasting?: (frac: number | null, nome?: string) => void;
  /**
   * ❄️ Liga/desliga o CONGELAMENTO: o corpo fica azulado e a animação para.
   *
   * ⚠️ Opcional pelo mesmo motivo de `setCasting`: item e nó de recurso não
   * congelam.
   */
  setFrozen?: (gelado: boolean) => void;
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

/**
 * 🔴 **DE QUANTO EM QUANTO O CLIENTE PEDE UM PASSO.**
 *
 * Ele não decide quando anda — pede, e o servidor concede a cada
 * `moveIntervalMs` (~480 ms no nível 1). Como os dois relógios não são o mesmo,
 * o pedido que abre a janela chega com um atraso qualquer entre 0 e este número.
 *
 * ⚠️ **Era 120, e esse era o travamento.** O intervalo REAL entre dois passos
 * concedidos é `moveIntervalMs + atraso`, sorteado a cada passo; o cliente
 * deslizava por `moveIntervalMs` cravado. Resultado: o sprite chegava ao tile e
 * CONGELAVA por 0 a 120 ms, de novo a cada tile e sempre num tempo diferente. O
 * dono: *"acho que ele está travando ainda a movimentação."*
 *
 * ✅ 60 corta o sorteio pela metade, e o deslize passou a durar
 * `intervalo + metade deste número` (ver `stepDurationFor`) — aí o erro fica em
 * ±30 ms, contra os ±120 de antes.
 *
 * ⚠️ Baixar mais tem custo de rede com ganho cada vez menor: o que sobra já está
 * dentro do que a folga do deslize absorve.
 */
const INTERVALO_PEDIDO_MS = 60;

/** Piso do deslize: abaixo disto o passo vira teleporte. */
const STEP_MS_FLOOR = 90;

/**
 * 🔴 **O DESLIZE DA DIAGONAL DURA MAIS, porque o passo dela dura mais.**
 *
 * O servidor cobra `CUSTO_DIAGONAL` a mais para um passo na diagonal (√2 de
 * distância). O cliente não sabia disso e deslizava todo passo em 1,0× do
 * intervalo: o sprite chegava ao tile e ficava PARADO o 0,5× restante, com a
 * animação de caminhada desligada junto (`movingUntil`). Uma paradinha a cada
 * tile, em tudo que não fosse reto — e o dono leu isso como velocidade:
 * *"ele está muito rápido para baixo e muito lento para todas as outras
 * direções."* O reto é contínuo; o resto anda-para-anda-para.
 *
 * ⚠️ **Só para JOGADOR.** Criatura não paga diagonal no servidor, e aplicar aqui
 * a faria deslizar mais devagar do que anda. É o mesmo motivo de `isCreature`
 * existir em `stepDurationFor`.
 *
 * ⚠️ A comparação é em PIXEL e com folga de meio tile: `setTarget` recebe o
 * destino em pixels de mundo, e um passo diagonal move exatamente um tile nos
 * dois eixos.
 */
function fatorDiagonal(dx: number, dy: number, ehJogador: boolean): number {
  if (!ehJogador) return 1;
  const meio = TS * 0.5;
  return Math.abs(dx) > meio && Math.abs(dy) > meio ? CUSTO_DIAGONAL : 1;
}

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
  /*
   * Herói local: o servidor já disse a velocidade dele. Ver `heroiStepMs`.
   *
   * 🔴 **Mais METADE de `INTERVALO_PEDIDO_MS`**, e o número sai de uma conta,
   * não do gosto.
   *
   * O servidor CONCEDE um passo a cada `heroiStepMs`. Mas ele não anda sozinho:
   * espera um pedido, e o cliente pede a cada `INTERVALO_PEDIDO_MS`. Então o
   * intervalo que o jogador VÊ é `heroiStepMs + atraso`, com o atraso sorteado
   * uniformemente entre 0 e `INTERVALO_PEDIDO_MS` a cada passo — o relógio de
   * quem pede não é o de quem concede.
   *
   * Os dois erros possíveis são diferentes, e por isso a folga é a MÉDIA e não o
   * pior caso:
   *
   *   - deslize CURTO demais → o sprite chega e congela até o próximo passo. É
   *     a travadinha por tile que o dono relatou;
   *   - deslize LONGO demais → o passo seguinte chega com o ciclo de pernas pela
   *     metade, e a fase salta para trás. É um pulinho por tile.
   *
   * ✅ Com metade, o erro fica limitado a `INTERVALO_PEDIDO_MS / 2` para
   * qualquer lado — 30 ms em 480, ou 6 %. Somar o pior caso inteiro trocaria
   * todo o congelamento por todo o pulinho, e não é melhor: seria só o outro
   * defeito.
   *
   * ⚠️ O atraso não acumula: cada `setTarget` reancora `fromX/fromY` na posição
   * atual do sprite.
   */
  if (isSelf && heroiStepMs !== null) {
    return Math.max(STEP_MS_FLOOR, heroiStepMs + INTERVALO_PEDIDO_MS / 2);
  }
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
  /*
   * 🏷️ **A ETIQUETA identifica a placa de NOME entre os filhos do contêiner.**
   * Sem ela, esconder "o nome" viraria procurar "algum `Text`" — e a pilha de
   * itens tem um `Text` que é a QUANTIDADE, que não é nome nenhum e tem de
   * continuar visível. Procurar por tipo apagaria o número junto.
   */
  label.label = 'nome';
  return label;
}

/** Recursos de sprite resolvidos uma vez em startGame e passados adiante. */
interface MiniAssets {
  classAnims: Record<PlayerClass, DirAnim> | null;
  slimeAnim: Texture[] | null;
  /** Slime Azul e Vermelho: a arte do Verde recolorida, por `creatureType`. */
  slimeVariants: Record<string, AnimSet> | null;
  /**
   * Folhas no formato de `SPEC-SPRITES-MONSTROS.md`, por `creatureType`. Vazio
   * enquanto a arte não chega — quem não está no mapa cai no blob placeholder.
   */
  creatureSheets: Map<string, CreatureSheets>;
  knightArt: Record<Gender, KnightArt> | null;
  /**
   * Arte HD por SEXO e por classe. Classe ausente do mapa cai no MiniWorld — é
   * o que segura o jogo de pé enquanto uma classe não tem pack.
   *
   * 🔴 O sexo é o de CADA ENTIDADE (`e.gender`), não o do jogador local: num
   * mundo multijogador os dois corpos aparecem na mesma tela.
   */
  heroArt: Record<Gender, ArtePorClasse>;
  /** Peças de equipamento desenhadas por cima do corpo desarmado. */
  equipArt: Partial<Record<EquipPiece, EquipArt>>;
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
  /** Pega uma pilha do chão clicando nela (anda até lá antes, se for preciso). */
  pegarItem: (id: string) => void;
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

/**
 * 🏷️ **Esconde o NOME de uma entidade até o mouse encostar.**
 *
 * 🔴 Dono, 12/09: *"o nome das bolsas que os monstros dropam também devem ficar
 * invisíveis, o nome dos NPCs todos serão assim também"*. O que começou como
 * regra de monstro virou regra do MAPA: nada anuncia o próprio nome sozinho.
 *
 * ⚠️ **É um envoltório, e não um campo em cada construtor.** Bolsa, corpo, nó de
 * recurso e NPC são montados por quatro funções diferentes, cada uma com os seus
 * ramos; entrar em todas para passar um sinalizador seria mexer em muito código
 * para dizer a mesma coisa. Aqui a placa é achada pela etiqueta `nome` e
 * escondida — os construtores não precisam saber que isto existe.
 *
 * ⚠️ **Só o NOME.** Estas entidades não têm vida nem contorno, e a `mostraUi`
 * delas ignora os outros dois campos de propósito: um dia um item selecionável
 * pode querer contorno, e aí o lugar de pôr é aqui, não no controlador.
 */
function nomeSoNoMouse(v: EntityView): EntityView {
  const placa = v.container.children.find((c) => c.label === 'nome') as Text | undefined;
  if (!placa) return v;
  placa.visible = false;
  return { ...v, mostraUi: (ui) => { placa.visible = ui.nome; } };
}

function makeEntity(
  e: EntitySnapshot,
  isSelf: boolean,
  tex: CharacterTextures,
  anims: CharacterAnims | null,
  onTargetClick: (id: string) => void,
  mini: MiniAssets,
): EntityView {
  if (e.kind === 'creature') {
    const v = makeCreatureView(e, anims, onTargetClick, mini);
    /*
     * ⚔️ **A ETIQUETA é o que o cursor procura.** `makeMiniActor` também monta
     * jogador e NPC, então não dá para perguntar ao construtor: quem sabe que
     * isto é criatura é este `if`, e é aqui que a marca tem de ser posta.
     */
    v.container.label = `ent:creature:${e.id}`;
    return v;
  }
  /*
   * 🏷️ **Bolsa, corpo, pilha e nó: nome só sob o mouse.** A etiqueta
   * `ent:<espécie>:<id>` é o que o cursor e o controlador de UI leem — o
   * cursor de ataque olha a espécie, o nome vale para todas.
   */
  if (e.kind === 'item') {
    const v = nomeSoNoMouse(makeItemView(e, mini.itemTexture, mini.openCorpse, mini.pegarItem));
    v.container.label = `ent:item:${e.id}`;
    return v;
  }
  if (e.kind === 'node') {
    const v = nomeSoNoMouse(makeNodeView(e, mini.gatherNode, mini.chaoEm));
    v.container.label = `ent:node:${e.id}`;
    return v;
  }
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
    const v = nomeSoNoMouse(makeMiniActor({
      e, anim: mini.npcAnim ?? mini.classAnims?.archer ?? { down: [], up: [], right: [], left: [] },
      scale: 2.4,
      nameColor: cor,
      tint: e.npcRole === 'vendor' ? undefined : cor,
      onClick: abre,
    }));
    v.container.label = `ent:npc:${e.id}`;
    return v;
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
  // 🔴 O SEXO TROCA O SPRITE desde 07/09. O `gender` já vinha resolvido logo
  // acima (do snapshot, ou o local quando é o próprio jogador) e só não era
  // usado aqui — os packs antigos tinham um corpo só. O universal tem dois.
  //
  // ⚠️ É o sexo DA ENTIDADE, nunca `mini.selfGender`: numa tela com dois
  // jogadores, usar o local desenharia o outro com o corpo errado.
  const hero = mini.heroArt[gender][cls];
  if (hero) {
    // 🔴 EQUIPAMENTO EM CAMADA. Só para as classes cujo corpo vem DESARMADO —
    // desenhar a espada recortada sobre um corpo que já a tem pintada daria duas
    // espadas. `temCamada` e `COM_CAMADA` (em `heroes.ts`) mantêm as duas
    // decisões no mesmo lugar.
    //
    // ⚠️ O escudo ainda não entra: `EntitySnapshot` não diz se há um equipado, e
    // a regra do dono é "escudo só aparece se estiver equipado". Desenhá-lo
    // sempre seria inventar equipamento; o campo é o mesmo padrão do
    // `weaponType`, e é a próxima peça.
    const layers: ActorLayer[] = [];
    if (temCamada(cls)) {
      const peca = pecaDaArma(resolveHold({ weapon: e.weaponType }));
      const arte = peca ? mini.equipArt[peca] : undefined;
      if (arte) layers.push(arte);
    }
    return makeMiniActor({
      e, anim: hero.walk, scale: hero.scale,
      anchorX: hero.anchorX, anchorY: hero.anchorY, labelTop: hero.labelTop,
      idleAnim: hero.idle,
      attackAnim: golpeDe(hero, attackPoseFor(e.weaponType)),
      // 🔴 Direto de `attacks.staff`, NÃO por `golpeDe`: a cadeia de fallback
      // terminaria no golpe de espada, e conjurar viraria uma espadada. Sem a
      // folha de conjuração o campo fica `undefined`, que é o que faz o
      // `playAttack` cair no golpe da arma.
      castAnim: hero.attacks.staff,
      hurtAnim: hero.hurt,
      deathAnim: hero.death,
      layers,
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
/**
 * Uma camada desenhada POR CIMA do corpo — arma, escudo.
 *
 * 🔴 **Não há deslocamento a aplicar.** Ele vem assado na tira, quadro a quadro,
 * por `tools/armas2strip.mjs`: as colunas da arma são as mesmas do corpo, na
 * mesma ordem. Duas animações com a mesma contagem de quadros, a mesma
 * velocidade e o mesmo instante de partida ficam alinhadas sozinhas.
 *
 * ⚠️ Sem `death` de propósito: o corpo tomba girando, e girar pixel art de 20 px
 * destrói o desenho. A arma some ao morrer, até alguém implementá-la CAINDO.
 */
interface ActorLayer {
  walk: DirAnim;
  pose: DirAnim;
  attack: DirAnim;
  /** Respiração: a arma sobe com o tronco, senão descola do corpo parado. */
  idle: DirAnim;
}

/**
 * ⚔️ **A UI DE MONSTRO: nome, vida e contorno — escondidos por padrão.**
 *
 * 🔴 Ficha do dono (12/09). O que havia era o oposto: nome e barra de vida
 * SEMPRE visíveis em toda criatura, mais um anel vermelho no chão sob o alvo. A
 * tela de caça virava uma parede de placas.
 *
 * ✅ Agora o padrão é o monstro sozinho; o nome aparece sob o mouse, o contorno
 * quando ele é o alvo, e a VIDA só depois de dano confirmado.
 *
 * 🔴 **O contorno é um SPRITE-SOMBRA atrás do original, tingido de vermelho e um
 * pouco maior.** Das cinco opções da ficha é a única que não precisa de filtro
 * nem de shader — o renderizador atual não tem nenhum carregado, e puxar uma
 * biblioteca de contorno para desenhar uma silhueta seria pagar caro por pouco.
 * Ele copia a TEXTURA do sprite a cada quadro, então acompanha sozinho a
 * animação, a direção e o espelhamento, sem saber nada sobre eles.
 *
 * ⚠️ **A vida passa a ser guardada aqui.** `setHp` chega do servidor a 15 Hz e
 * não pode mais pintar a barra direto: se pintasse, a vida apareceria no
 * primeiro snapshot e a ficha inteira cairia. O valor é lembrado e só vira
 * desenho quando `mostraUi` autoriza.
 *
 * ⚠️ **Sem sprite (as bolhas de placeholder), o contorno é um anel desenhado em
 * volta do corpo** — no ar, à altura da bolha, e não no chão. Não é o anel
 * antigo de volta: aquele era uma elipse deitada no solo, esta é a silhueta do
 * bicho.
 */
function uiDeMonstro(opts: {
  c: Container;
  sprite?: Sprite;
  label: Text;
  hpbar: { node: Container; set: (hp?: number, maxHp?: number) => void };
}): {
  mostraUi: (ui: { nome: boolean; vida: boolean; contorno: boolean }) => void;
  setHp: (hp?: number, maxHp?: number) => void;
} {
  const { c, sprite, label, hpbar } = opts;
  label.visible = false;
  hpbar.node.visible = false;
  let vidaVisivel = false;
  let hpAtual: number | undefined;
  let hpMax: number | undefined;

  /*
   * 🔴 **O CONTORNO SÃO OITO CÓPIAS DESLOCADAS, e era UMA cópia inchada.**
   *
   * Dono, 12/09, vendo em tela: *"está bem grosseira"*. E estava: uma cópia a
   * 1,12× não é um contorno, é uma SOMBRA MAIOR — ela cresce a partir da âncora,
   * então sobra muito de um lado e nada do outro, e o vermelho vaza em bloco nas
   * partes largas do desenho.
   *
   * ✅ Oito cópias a 2 px em volta, todas por trás, desenham a silhueta REAL: o
   * vermelho só aparece onde o desenho tem borda, com a mesma espessura em toda
   * a volta. É o truque clássico de contorno sem shader, e aqui ele cabe porque
   * só existe UM monstro selecionado por vez — oito sprites, não oitenta.
   */
  const RAIO = 2;
  const VOLTAS = 8;
  const copias: Sprite[] = [];
  const contorno = sprite ? new Container() : new Graphics();
  contorno.visible = false;
  if (sprite) {
    for (let i = 0; i < VOLTAS; i++) {
      const a = (i / VOLTAS) * Math.PI * 2;
      const copia = new Sprite();
      copia.tint = 0xff2a2a;
      copia.anchor.set(sprite.anchor.x, sprite.anchor.y);
      copia.x = Math.cos(a) * RAIO;
      copia.y = Math.sin(a) * RAIO;
      copias.push(copia);
      (contorno as Container).addChild(copia);
    }
    c.addChildAt(contorno, c.getChildIndex(sprite));
  } else {
    (contorno as Graphics).circle(TS / 2, TS - 12, TS * 0.55)
      .stroke({ width: 2, color: 0xff2a2a, alpha: 0.9 });
    c.addChildAt(contorno, 0);
  }

  function setHp(hp?: number, maxHp?: number): void {
    hpAtual = hp;
    hpMax = maxHp;
    if (vidaVisivel) hpbar.set(hp, maxHp);
    else hpbar.node.visible = false;
  }

  function mostraUi(ui: { nome: boolean; vida: boolean; contorno: boolean }): void {
    label.visible = ui.nome;
    vidaVisivel = ui.vida;
    if (ui.vida) hpbar.set(hpAtual, hpMax);
    else hpbar.node.visible = false;
    contorno.visible = ui.contorno;
    if (ui.contorno && sprite) {
      // ⚠️ O grupo fica no lugar do sprite; cada cópia guarda o próprio desvio.
      contorno.x = sprite.x;
      contorno.y = sprite.y;
      for (const copia of copias) {
        copia.texture = sprite.texture;
        // ⚠️ Preserva o SINAL da escala: é ele que espelha o bicho ao virar.
        copia.scale.set(sprite.scale.x, sprite.scale.y);
      }
    }
  }

  return { mostraUi, setHp };
}

interface MiniActorOpts {
  e: EntitySnapshot;
  anim: DirAnim;
  scale: number;
  nameColor: number;
  /** Equipamento desenhado sobre o corpo, na ordem da lista (o último por cima). */
  layers?: ActorLayer[];
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
  /**
   * Gesto de CONJURAR, tocado quando o golpe traz elemento mágico.
   *
   * ⚠️ Ausente na maioria dos packs — só a universal feminina tem, por
   * enquanto. Sem ele o feitiço anima como golpe da arma.
   */
  castAnim?: DirAnim;
  hurtAnim?: DirAnim;
  deathAnim?: DirAnim;
  onClick?: (id: string) => void;
  /**
   * ⚔️ É um MONSTRO: nome e vida escondidos por padrão, contorno no alvo.
   *
   * ⚠️ Precisa ser dito de fora porque este construtor também monta jogador e
   * NPC, e nesses o nome tem de continuar sempre visível.
   */
  monstro?: boolean;
}

/**
 * ⚔️ **A ÁREA CLICÁVEL DE UM ATOR: O DESENHO INTEIRO, nunca menor que o tile.**
 *
 * 🔴 Dono, 12/09: *"esses monstros maiores só muda o mouse quando eu passo na
 * bolinha preta embaixo dele, gostaria que fosse no monstro inteiro"*. E o
 * cursor estava sendo HONESTO: a área de acerto era `Rectangle(0, -8, TS, TS+12)`
 * — um tile — em toda criatura, do slime ao chefe. No monstro grande o desenho
 * cobre três ou quatro tiles, mas só a sombra nos pés respondia ao clique. Não
 * era defeito do cursor novo; era um defeito velho que o cursor novo tornou
 * VISÍVEL, porque agora existe um aviso na tela que denuncia a discordância.
 *
 * ✅ A caixa sai do sprite JÁ ESCALADO, com a âncora dele — o mesmo desenho que o
 * jogador enxerga. E a UNIÃO com o tile é de propósito: bicho menor que um tile
 * (o rato, o morcego) continua com a área mínima de sempre, senão o conserto dos
 * grandes encolheria os pequenos.
 */
/**
 * 🎯 **A SILHUETA de uma textura, numa grade grosseira de 24×24.**
 *
 * 🔴 Dono, 12/09: *"o monstro pequeno quando passa próximo de um grande não
 * consigo selecionar mais"*. A causa é o RETÂNGULO: o cogumelo tem 2,5 tiles de
 * altura e quase metade da caixa dele é ar — e esse ar roubava o clique de quem
 * passasse por trás. Aumentar a área para o desenho inteiro foi certo; usar um
 * retângulo para representá-lo, não.
 *
 * ✅ **A máscara é lida da própria imagem**, uma vez por textura e guardada. Não
 * há leitura de GPU: a folha já está na memória como imagem, e desenhá-la
 * reduzida num canvas de 24×24 dá a silhueta com precisão de sobra para decidir
 * cliques — o erro máximo é um vigésimo quarto do desenho.
 *
 * ⚠️ **Por TEXTURA, não por ator.** Vinte criaturas da mesma espécie dividem a
 * mesma medida; e como a chave é a textura do quadro atual, a silhueta acompanha
 * a animação sem ninguém precisar avisá-la.
 */
const MASCARAS = new Map<number, { n: number; m: Uint8Array } | null>();
function silhuetaDa(tex: Texture): { n: number; m: Uint8Array } | null {
  const achada = MASCARAS.get(tex.uid);
  if (achada !== undefined) return achada;
  let r: { n: number; m: Uint8Array } | null = null;
  try {
    const fonte = (tex.source as unknown as { resource?: CanvasImageSource }).resource;
    const N = 24;
    if (fonte) {
      const cv = document.createElement('canvas');
      cv.width = N; cv.height = N;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      const f = tex.frame;
      if (ctx) {
        ctx.drawImage(fonte, f.x, f.y, f.width, f.height, 0, 0, N, N);
        const d = ctx.getImageData(0, 0, N, N).data;
        const m = new Uint8Array(N * N);
        for (let i = 0; i < N * N; i++) m[i] = (d[i * 4 + 3] ?? 0) > 24 ? 1 : 0;
        r = { n: N, m };
      }
    }
  } catch {
    // Textura de origem inacessível (canvas sujo por CORS): cai no retângulo.
    r = null;
  }
  MASCARAS.set(tex.uid, r);
  return r;
}

/**
 * 🎯 **A ÁREA CLICÁVEL DE UM ATOR: o TILE sempre, mais a silhueta do desenho.**
 *
 * ⚠️ **O tile entra por baixo, incondicionalmente.** É o mínimo histórico e o
 * que garante que bicho pequeno, ou bicho cuja arte não pôde ser medida, continue
 * clicável onde ele PISA. Sem isso, um erro na leitura da imagem deixaria um
 * monstro impossível de selecionar, que é pior que um clique folgado.
 *
 * ⚠️ **Fora do tile, vale o desenho — e só onde ele é opaco.** É isto que
 * devolve ao monstro pequeno o clique que o grande havia tomado.
 */
function areaDoAtor(sprite: AnimatedSprite): { contains: (x: number, y: number) => boolean } {
  const tile = new Rectangle(0, -8, TS, TS + 12);
  return {
    contains(x: number, y: number): boolean {
      if (tile.contains(x, y)) return true;
      const w = Math.abs(sprite.width);
      const h = Math.abs(sprite.height);
      if (w <= 0 || h <= 0) return false;
      const esq = sprite.x - sprite.anchor.x * w;
      const topo = sprite.y - sprite.anchor.y * h;
      let u = (x - esq) / w;
      const v = (y - topo) / h;
      if (u < 0 || u > 1 || v < 0 || v > 1) return false;
      // ⚠️ Espelhado ao virar para a esquerda: a silhueta vira junto.
      if (sprite.scale.x < 0) u = 1 - u;
      const sil = silhuetaDa(sprite.texture);
      if (!sil) return true; // sem medida, o desenho inteiro vale
      const cx = Math.min(sil.n - 1, Math.max(0, Math.floor(u * sil.n)));
      const cy = Math.min(sil.n - 1, Math.max(0, Math.floor(v * sil.n)));
      return sil.m[cy * sil.n + cx] === 1;
    },
  };
}

function makeMiniActor(opts: MiniActorOpts): EntityView {
  const { e, anim, scale, nameColor, alwaysAnimate, onClick } = opts;
  const c = new Container();
  if (onClick) {
    c.eventMode = 'static';
    /*
     * ⚠️ **SEM `cursor` aqui, de propósito.** O Pixi escreve o valor desta
     * propriedade no canvas assim que o mouse entra no contêiner, e isso
     * ATROPELA o ponteiro do jogo: era um `crosshair` do sistema — a cruz branca
     * que o dono viu em 12/09 — aparecendo justamente sobre monstro, que é onde
     * o cursor de ataque devia estar. Sem a propriedade, o Pixi aplica
     * `inherit` e quem manda volta a ser o `body`. Ver `cursorDoJogo`.
     */
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
  // ⚔️ Agora que o sprite existe e está escalado, a área de acerto é ELE.
  if (onClick) c.hitArea = areaDoAtor(sprite);

  /**
   * As camadas de equipamento: um sprite irmão por peça, com a MESMA âncora,
   * posição e escala do corpo.
   *
   * ⚠️ Entram entre o corpo e a barra de vida, para ficarem por cima do corpo e
   * por baixo da interface. E são criadas aqui, e não dentro do `applyState`,
   * porque criar sprite a cada troca de estado vazaria um por passo dado.
   */
  const camadas = (opts.layers ?? []).map((l) => {
    const s = new AnimatedSprite(l.pose.down);
    s.anchor.set(opts.anchorX ?? 0.5, opts.anchorY ?? 0.92);
    s.x = TS / 2;
    s.y = baseY;
    s.scale.set(scale);
    c.addChild(s);
    return { s, l };
  });

  const hpbar = makeHpBar();
  const nlabel = nameLabel(e.name, nameColor);
  if (opts.labelTop !== undefined) {
    hpbar.node.y = opts.labelTop + 6;
    nlabel.y = opts.labelTop;
  }
  c.addChild(hpbar.node);
  c.addChild(nlabel);
  // ⚔️ Só monstro esconde nome e vida por padrão. Ver `uiDeMonstro`.
  const ui = opts.monstro ? uiDeMonstro({ c, sprite, label: nlabel, hpbar }) : undefined;

  /**
   * ✨ **A AURA DE CONJURAÇÃO** — anéis no chão, sob os pés de quem conjura.
   *
   * Pedido do dono em 11/09: *"gostaria de uma aura em torno do personagem
   * enquanto ele está anunciando a magia"*.
   *
   * ⚠️ **Desenhada ATRÁS do corpo** (entra na lista antes do sprite não daria:
   * o sprite já foi adicionado). `addChildAt(…, 1)` a põe logo depois da
   * sombra e antes de tudo o mais — aura por cima taparia o personagem justo
   * quando ele precisa ser visto.
   *
   * ⚠️ Mistura ADITIVA e no CHÃO (elipse achatada, não círculo): a câmera é de
   * cima com leve perspectiva, e um círculo perfeito lê como disco flutuando.
   */
  const castAura = new Graphics();
  castAura.blendMode = 'add';
  castAura.visible = false;
  c.addChildAt(castAura, 1);

  /**
   * 🌀 **O ANEL QUE ORBITA O CONJURADOR** — pedido do dono em 11/09: *"esse
   * círculo será em torno do personagem enquanto ele realiza a conjuração, fica
   * girando em torno dele, e depois que castar some imediatamente."*
   *
   * ⚠️ **É o irmão do anel do chão, e as duas artes discordam de propósito.** O
   * do chão é redondo, porque o chão deste jogo não tem perspectiva. Este é uma
   * ELIPSE achatada, porque orbita o corpo e é visto quase de lado — e por isso
   * o conversor o deixa em paz (ver `redondo` em `tools/anel2fx.mjs`).
   *
   * 🔴 **E por isso ele NÃO gira por código.** Girar uma elipse em 2D foi o
   * defeito que custou duas rodadas hoje: lê como anel inclinado mudando de
   * inclinação, não como coisa orbitando. O giro aqui vem da própria folha, que
   * é o que ela desenha — 30 quadros do anel varrendo em volta.
   *
   * ⚠️ Entra ATRÁS do corpo (`addChildAt(…, 1)`, junto da aura): o anel passa em
   * volta do personagem, e desenhá-lo por cima o esconderia justamente no meio
   * da conjuração, que é quando se quer olhar para ele.
   */
  const anelCaster = new AnimatedSprite([Texture.EMPTY]);
  anelCaster.anchor.set(0.5);
  anelCaster.blendMode = 'add';
  anelCaster.visible = false;
  anelCaster.alpha = 0.75;
  c.addChildAt(anelCaster, 1);
  let anelPronto = false;

  /** Fatia a folha na primeira conjuração — antes disso ela pode nem ter chegado. */
  function preparaAnel(): boolean {
    if (anelPronto) return true;
    const tex = quadrosAnelCaster();
    if (!tex) return false;
    anelCaster.textures = tex;
    anelCaster.animationSpeed = 0.25;
    anelCaster.play();
    /*
     * ⚠️ A largura casa com o CORPO e não com o tile: o anel envolve o
     * personagem, e um tamanho fixo ficaria apertado num chefe e frouxo num
     * goblin.
     *
     * 🔴 **0,95, e era 1,45** (dono, 11/09: *"círculo muito grande"*). Em 1,45 o
     * anel passava bem fora dos ombros e, num mago parado, lia como área de
     * magia e não como aura de quem conjura.
     */
    const larg = sprite.width * 0.95;
    anelCaster.width = larg;
    anelCaster.height = larg * (tex[0]!.height / tex[0]!.width);
    anelCaster.x = sprite.x;
    /*
     * 🔴 **NO CHÃO, aos pés** — decisão do dono, contra o que eu tinha posto.
     *
     * Eu o havia deixado na altura do peito, argumentando que nos pés ele
     * disputaria leitura com o anel da ÁREA. O argumento não se sustentou em
     * tela: o anel da área fica onde a magia vai CAIR, que quase nunca é em
     * cima do conjurador — e um anel flutuando no meio do corpo lê como
     * argola presa no personagem, não como círculo mágico.
     */
    /*
     * ⚠️ **A LINHA DOS PÉS não é `baseY`.** O corpo tem âncora 0,92 em y, ou
     * seja 8 % dele fica ABAIXO de `baseY` — é onde os pés realmente pisam.
     * `baseY` sozinho deixava o anel flutuando um palmo acima do chão, que foi
     * o *"ainda não está totalmente no chão"* de 11/09.
     */
    anelCaster.y = baseY + sprite.height * 0.06;
    anelPronto = true;
    return true;
  }

  /**
   * ⏳ **A BARRA DE CONJURAÇÃO, em cima do nome.**
   *
   * ⚠️ Fica acima do NOME, e o nome já está acima da barra de vida: é a ordem
   * de urgência. Vida se lê o tempo todo; conjuração é um evento de três
   * segundos que precisa saltar aos olhos enquanto dura.
   */
  /**
   * A base da pilha de rótulos: a MESMA que o nome do personagem usa.
   *
   * ⚠️ `nameLabel` cai em `-WALL_H + 2` quando não há `labelTop`, e usar outro
   * padrão aqui empilharia as coisas em alturas diferentes conforme o ator.
   */
  const baseRotulo = opts.labelTop ?? (-WALL_H + 2);

  /**
   * ⏳ **A BARRA DE CONJURAÇÃO — a mesma que ficava no rodapé, agora aqui.**
   *
   * Dono, 11/09: *"essa barra de magia que aparece embaixo pode ser colocada em
   * cima, no nome do personagem"* e, logo depois, *"você vai tirar a de cima e
   * passar a de baixo para cima"*. Ou seja: não era só mudar de lugar — é a
   * APARÊNCIA da barra do HUD que subiu, e a versão anterior daqui (traço fino
   * azul com o nome solto por cima) foi descartada.
   *
   * Herdou do rodapé: fundo escuro com borda preta, preenchimento roxo em
   * degradê e o nome da magia CENTRADO DENTRO da barra.
   *
   * ⚠️ **−17, e o número sai do NOME.** `nlabel` tem âncora embaixo, então
   * ocupa de `base − 11` (fonte 11) até `base`. Pôr a barra mais abaixo a
   * enfiava dentro do nome — o que o dono pediu para não acontecer.
   */
  const castBar = new Graphics();
  castBar.visible = false;
  /*
   * ⚠️ **−26, e o número acompanha a ALTURA da barra.** Ela cresceu de 12 para
   * 20 px; mantendo o −17, a borda de baixo invadiria o nome do personagem —
   * que é o que o dono pediu para não acontecer.
   */
  castBar.y = baseRotulo - 26;
  c.addChild(castBar);

  /**
   * 🔮 O nome da magia, DENTRO da barra — como era no rodapé.
   *
   * ⚠️ Sem contorno preto: ele fica sobre o roxo, não sobre o mundo. O
   * contorno existia na versão solta, quando o texto flutuava sobre o cenário.
   */
  const castName = new Text({
    text: '',
    style: {
      /*
       * ⚠️ **14, contra os 9 de antes.** O dono: *"aumenta o tamanho do nome da
       * magia e a HUD de carregamento dela, está muito pequeno no jogo"*. Os 9
       * vinham de um rótulo que se queria discreto ao lado do nome do
       * personagem; como barra única, ele É o elemento e tem de ser lido de
       * longe. Fica MAIOR que o nome do personagem (11), e é o certo: o nome se
       * lê o tempo todo, a conjuração é um evento de segundos.
       */
      fill: 0xf0e6ff, fontSize: 14, fontFamily: 'Segoe UI, sans-serif',
    },
  });
  castName.anchor.set(0.5, 0.5);
  castName.visible = false;
  c.addChild(castName);

  /** Fração 0..1 da conjuração em curso, ou `null` quando não há. */
  let castFrac: number | null = null;
  /**
   * 🎭 **Onde o gesto de conjurar PARA enquanto carrega**, como fração da folha.
   *
   * O dono descreveu o comportamento exato: *"começa a conjurar — animação vai
   * até 50 % e para — termina de conjurar — animação vai até 100 % e volta para
   * idle"*. Metade é o ponto natural: nas folhas do autosprite é ali que os
   * braços estão recolhidos, antes do arremesso.
   */
  const POSE_CARREGANDO = 0.5;
  /**
   * Quando verdadeiro, o próximo `cast` RETOMA de onde a pose parou em vez de
   * recomeçar do zero. Ver `setCasting(null)`.
   */
  let retomaCast = false;

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
  /**
   * Qual perna vai à frente NESTE tile. Alterna a cada passo, e é o que faz o
   * ciclo de 4 quadros virar caminhada em vez do mesmo pé repetido.
   *
   * ⚠️ Derivado de `moveStart` mudar, e não de um gancho no `setTarget`, porque
   * existem três `setTarget` neste arquivo e só ESTE ator anda em 4 quadros.
   * Observar o início do passo mantém a mudança dentro de quem a usa.
   */
  let paridade = false;
  let ultimoPasso = moveStart;

  /**
   * Os quadros de uma direção, com queda para a cardinal quando a arte não tem
   * a diagonal.
   *
   * 🔴 **A queda é para o eixo VERTICAL** (`up_right` → `up`), e é o oposto do
   * que o código fazia em agosto. Naquela versão a diagonal caía em
   * `right`/`left`, e o resultado foi o bug que o dono relatou: o personagem
   * atravessava o mapa **virado de lado**. Num jogo visto de cima, o que se lê
   * primeiro é se ele vem ou vai — não para que lado.
   *
   * ⚠️ A tabela mora no `shared` (`CARDINAL_OF`) porque o servidor decide a
   * direção e o cliente a desenha: se as duas pontas discordassem do que é
   * "a cardinal de up_right", o sprite olharia para um lado e andaria para
   * outro.
   */
  function framesFor(d: Direction, set: DirAnim): Texture[] {
    return set[d] ?? set[CARDINAL_OF[d]];
  }
  /**
   * Estado de DISPARO ÚNICO ativo, se houver. Tem precedência sobre andar/parado
   * e volta sozinho ao terminar — exceto `death`, que é terminal: o bicho morreu,
   * não volta a andar.
   */
  type OneShot = 'attack' | 'cast' | 'hurt' | 'death';
  let oneShot: OneShot | null = null;

  function oneShotAnim(k: OneShot): DirAnim | undefined {
    if (k === 'attack') return opts.attackAnim;
    // 🔴 `cast` é o gesto de CONJURAR, e não segue a cadeia de fallback do
    // golpe: sem folha própria ele não existe, e o chamador cai no golpe da
    // arma. Cair no golpe de espada ao lançar uma bola de fogo seria pior que
    // não animar — mostraria o personagem batendo em quem está longe.
    if (k === 'cast') return opts.castAnim;
    return k === 'hurt' ? opts.hurtAnim : opts.deathAnim;
  }

  /**
   * Põe as camadas de equipamento no mesmo estado do corpo.
   *
   * 🔴 A sincronia é por CONSTRUÇÃO, não por relógio: as tiras de arma têm a
   * mesma contagem de quadros na mesma ordem que as do corpo, e aqui elas
   * recebem a mesma velocidade e o mesmo `gotoAndPlay(0)`. Duas animações
   * iguais partindo juntas avançam juntas — o Pixi adianta as duas com o mesmo
   * delta.
   *
   * `qual = null` esconde a camada. É o caso da MORTE, que não tem arte de arma:
   * esconder é o certo até alguém implementar a arma caindo no chão.
   */
  function aplicaCamadas(qual: keyof ActorLayer | null, speed: number, loop: boolean, tocar: boolean): void {
    for (const { s, l } of camadas) {
      s.visible = qual !== null;
      if (qual === null) { s.stop(); continue; }
      s.textures = framesFor(dir, l[qual]);
      s.animationSpeed = speed;
      s.loop = loop;
      if (tocar) s.gotoAndPlay(0); else s.gotoAndStop(0);
    }
  }

  function applyState(): void {
    /*
     * ✨ **CARREGANDO: a pose fica SEGURA no meio do gesto.**
     *
     * Vem antes do disparo único porque quem está conjurando não está andando
     * nem golpeando — e depois, quando a magia sai, o `playAttack` normal toca
     * a animação inteira e o movimento se completa.
     *
     * ⚠️ **`gotoAndStop`, não `play`.** Repetir o gesto em laço por três
     * segundos leria como tique nervoso; parar num quadro de acumulação lê como
     * força sendo juntada. O quadro escolhido é o do MEIO da folha — é onde os
     * braços estão recolhidos, antes do arremesso.
     *
     * ⚠️ Sem folha de conjuração (`castAnim`), cai para a de golpe e, sem essa,
     * não faz nada: aura e barra sozinhas já contam a história.
     */
    if (castFrac !== null && !oneShot) {
      const a = opts.castAnim ?? opts.attackAnim;
      if (a) {
        const f = framesFor(dir, a);
        sprite.textures = f;
        sprite.gotoAndStop(Math.floor(f.length * POSE_CARREGANDO));
        aplicaCamadas('attack', 0, false, false);
        return;
      }
    }
    // Disparo único vence tudo: quem está no meio do golpe não volta a andar
    // antes de o golpe terminar.
    if (oneShot) {
      const a = oneShotAnim(oneShot);
      if (a) {
        sprite.textures = framesFor(dir, a);
        // Mais rápido que a caminhada: golpe é um evento, não um ciclo.
        const speed = oneShot === 'death' ? 0.14 : 0.22;
        sprite.animationSpeed = speed;
        sprite.loop = false;
        /*
         * 🎭 **RETOMA do meio quando o gesto já estava segurado.**
         *
         * Sem isto, soltar a magia rebobinava: o personagem recolhia os braços
         * de novo antes de arremessar, e o gesto de três segundos terminava com
         * um solavanco para trás. Ver `retomaCast`.
         */
        const inicio = retomaCast ? Math.floor(sprite.textures.length * POSE_CARREGANDO) : 0;
        retomaCast = false;
        sprite.gotoAndPlay(inicio);
        // ⚠️ `hurt` usa a pose: levar dano não tem arte de arma própria, e a
        // alternativa (sumir com a espada ao apanhar) seria pior que repeti-la.
        aplicaCamadas(
          oneShot === 'death' ? null
            : oneShot === 'attack' || oneShot === 'cast' ? 'attack' : 'pose',
          speed, false, true,
        );
        return;
      }
    }
    if (base === 'walk' || alwaysAnimate) {
      sprite.textures = framesFor(dir, anim);
      const speed = opts.animSpeed ?? 0.18;
      sprite.animationSpeed = speed;
      sprite.loop = true;
      sprite.gotoAndPlay(0);
      aplicaCamadas('walk', speed, true, true);
      return;
    }
    if (opts.idleAnim) {
      sprite.textures = framesFor(dir, opts.idleAnim);
      const speed = opts.idleSpeed ?? 0.05;
      sprite.animationSpeed = speed;
      sprite.loop = true;
      sprite.gotoAndPlay(0);
      aplicaCamadas('idle', speed, true, true);
      return;
    }
    sprite.textures = framesFor(dir, anim);
    sprite.gotoAndStop(0);
    aplicaCamadas('pose', 0, false, false);
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
    if (k === 'hurt' && (oneShot === 'attack' || oneShot === 'cast')) return;
    /*
     * 🎭 **Um `cast` em andamento não recomeça.** Quem solta a magia já está
     * completando o gesto desde a pose segurada; o `hit` que chega logo depois
     * mandaria o corpo de volta ao quadro zero, e o arremesso apareceria duas
     * vezes.
     *
     * ⚠️ Vale só para `cast`. Golpe repetido DEVE reiniciar — é assim que o
     * ataque rápido se lê como vários golpes e não como um só.
     */
    if (k === 'cast' && oneShot === 'cast') return;
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
      stepMs = stepDurationFor(e, !!opts.creatureTint, cadence, now - moveStart)
        * fatorDiagonal(x - fromX, y - fromY, !opts.creatureTint);
      movingUntil = now + stepMs + 80;
    }
    moveStart = now;
  }

  function update(): void {
    const now = performance.now();
    const t = Math.min(1, (now - moveStart) / stepMs);
    c.x = fromX + (toX - fromX) * t;
    c.y = fromY + (toY - fromY) * t;
    // ❄️ Congelado não muda de base: ele fica onde parou. Ver `setFrozen`.
    if (!gelado) setBase(now < movingUntil ? 'walk' : 'idle');

    /*
     * 🔴 O PASSO É REGIDO PELO CHÃO, NÃO POR UM RELÓGIO PRÓPRIO.
     *
     * Relatado jogando, duas vezes: *"parece mais um deslize do que fazer o
     * movimento de caminhar"*. A primeira tentativa foi dar ao ciclo o quadro da
     * perna oposta (4 quadros em vez de 2) — necessário, e insuficiente.
     *
     * A causa que sobrou é de SINCRONIA: o `AnimatedSprite` avançava sozinho a
     * `animationSpeed` fixa (~0,37 s por ciclo) enquanto o tile é atravessado na
     * cadência que o SERVIDOR manda. Duas cadências diferentes = o pé toca o
     * chão num ritmo e o chão passa em outro, que é a definição de patinar.
     *
     * Agora o quadro sai de `t`, o mesmo progresso 0..1 que move o sprite: cada
     * tile atravessado consome MEIO ciclo (pose de passagem -> contato), e o
     * `paridade` alterna a perna a cada tile. Um passo por tile, como no Tibia.
     *
     * ⚠️ Só vale para o ciclo de 4 quadros. Arte com 1 ou 2 quadros (packs
     * antigos, criaturas) segue no caminho de sempre — `applyState` continua
     * dono dela, e mexer aqui a deixaria congelada no quadro 0.
     */
    if (moveStart !== ultimoPasso) {
      ultimoPasso = moveStart;
      paridade = !paridade;
    }
    let bob = 0;
    /**
     * 🔴 **Quantas poses cabem num tile depende de quantas a ARTE tem.**
     *
     * Com 4 quadros (packs antigos) o tile só comporta DUAS: passagem e
     * contato. Era o que havia, e ficava picado — o dono viu jogando em 09/09:
     * *"faça a movimentação mais fluida"*.
     *
     * Com uma tira de ciclo inteiro (o personagem universal traz 16), o mesmo
     * `t` que move o sprite varre a metade do ciclo **continuamente**. A
     * sincronia não muda em nada: continua sendo **meio ciclo por tile** e uma
     * perna por `paridade`. O que muda é a resolução — de 2 poses por tile para
     * `metade`.
     *
     * ⚠️ O caminho de 4 quadros ficou intacto de propósito: os packs antigos e
     * as criaturas dependem dele, e generalizá-los sem arte nova só deixaria a
     * animação igual com mais contas.
     */
    const nQuadros = sprite.textures.length;
    if (base === 'walk' && !oneShot && nQuadros >= 4 && nQuadros % 2 === 0) {
      const metade = nQuadros / 2;
      if (metade === 2) {
        // Ciclo curto (4 quadros): duas poses por tile, como sempre foi.
        const contato = t >= 0.5;                     // pé batendo no chão
        sprite.gotoAndStop((paridade ? 0 : 2) + (contato ? 1 : 0));
        bob = contato ? 0 : 1;
      } else {
        /*
         * Ciclo longo: o quadro sai direto de `t`.
         *
         * ⚠️ `Math.min` em vez de `%` no `dentro`: com `t` chegando a 1,0 exato
         * no fim do tile, o módulo daria a volta para o quadro 0 da metade — um
         * piscão de um quadro para trás bem na hora da pisada.
         *
         * 🔴 **A FASE JÁ VEM ALINHADA NA TIRA**, e por isso aqui não há
         * deslocamento nenhum. Houve: uma tabela `CONTATO_NO_QUADRO` por
         * direção viveu aqui por um dia. Ela quebrou assim que chegaram folhas
         * novas, porque o quadro do contato **não cai no mesmo lugar no
         * masculino e no feminino** — a fase é propriedade da ARTE, não do
         * motor. Quem gira agora é `universal2strip.mjs`, no corte.
         */
        const dentro = Math.min(metade - 1, Math.floor(t * metade));
        sprite.gotoAndStop((paridade ? 0 : metade) + dentro);
        /*
         * O tronco sobe quando as pernas se cruzam e desce quando o pé bate. É
         * 1 px, e é o que separa "andando" de "recorte deslizando" — a escala é
         * 1,0×, então 1 px de arte é 1 px de tela.
         *
         * 🔴 Aqui ele acompanha a CURVA, não o degrau: a metade do ciclo vai de
         * contato a contato, com as pernas cruzadas no meio, então o seno bate
         * exatamente onde o tronco deve estar mais alto.
         *
         */
        bob = Math.round(Math.sin(t * Math.PI));
      }
    }

    // Investida de ataque (pequeno salto pra frente da direção).
    const hop = now < attackUntil ? Math.sin(((attackUntil - now) / 140) * Math.PI) : 0;
    sprite.y = baseY - hop * 3 - bob;
    const monstroNoturno = !!opts.creatureTint && nightMode;
    /*
     * ❄️ O gelo vence a noite e a cor da variante, mas NÃO o flash de dano: quem
     * está apanhando precisa piscar mesmo congelado, senão o jogador não vê que
     * o gelo está sendo quebrado — e dano quebra o gelo (`DD-SOR-012`).
     */
    sprite.tint = now < hurtUntil
      ? 0xff6a6a
      : gelado ? 0x88ccff : monstroNoturno ? 0xff5a4a : (opts.tint ?? 0xffffff);
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

  /**
   * 🔴 **A RESSURREIÇÃO MORA AQUI, e não numa mensagem de rede.**
   *
   * O ator entrava em `death` e não saía nunca: `startOneShot` recusa qualquer
   * coisa quando `oneShot === 'death'`, e o `onComplete` também volta cedo, de
   * propósito — o corpo tem que ficar caído no último quadro. Faltava quem
   * DESFIZESSE isso, e ninguém fazia: o servidor manda `respawn` só para o
   * próprio morto, e o handler dele apenas escondia o aviso de morte na tela.
   * O resultado, relatado jogando: o jogador renascia e andava **rastejando**,
   * com o sprite congelado na pose de tombado.
   *
   * ⚠️ **O gatilho é a VIDA voltando, e não uma mensagem nova**, porque só isso
   * conserta os dois lados de uma vez: quem morreu vê a si mesmo de pé, e quem
   * matou vê o outro de pé. Uma mensagem `respawn` só chega a quem morreu — foi
   * exatamente essa assimetria que criou o defeito.
   *
   * ⚠️ `hp` ausente NÃO ressuscita ninguém: `undefined` quer dizer "esta
   * entidade não tem barra de vida" (item, nó de recurso), não "está viva".
   */
  function setHp(hp?: number, maxHp?: number): void {
    if (oneShot === 'death' && hp !== undefined && hp > 0) {
      oneShot = null;
      applyState();
    }
    (ui ? ui.setHp : hpbar.set)(hp, maxHp);
  }

  /**
   * ✨ Estado de conjuração deste ator. Chamado a cada quadro enquanto dura.
   *
   * 🔴 **Também segura a POSE.** O dono: *"a animação de lançar fica travada
   * antes dele lançar; quando ele lançar, termina de executar a animação."* Ou
   * seja: durante o carregamento o corpo fica no gesto de acumular, e o
   * disparo é que completa o movimento. Sem isso, três segundos de conjuração
   * eram três segundos de personagem parado como se nada fizesse.
   */
  function setCasting(frac: number | null, nome?: string): void {
    const mudou = (frac === null) !== (castFrac === null);
    castFrac = frac;
    castAura.visible = frac !== null;
    /*
     * 🌀 **Some IMEDIATAMENTE ao soltar** — foi o pedido, e é a mesma regra do
     * anel do chão. Sem desvanecer: o que marca o fim da conjuração é a magia
     * saindo, e um anel apagando devagar por cima dela competiria com o efeito.
     */
    anelCaster.visible = frac !== null && preparaAnel();
    castBar.visible = frac !== null;
    castName.visible = frac !== null;
    if (nome !== undefined && castName.text !== nome) castName.text = nome;
    if (frac === null) {
      /*
       * 🎭 **Soltar a pose COMPLETA o gesto, não o cancela.**
       *
       * Quem estava segurando a pose lança agora: o corpo tem de terminar o
       * movimento de onde parou e só então voltar ao repouso. Devolver direto
       * ao `applyState` mandaria o personagem para o idle no mesmo quadro em
       * que a magia sai — e a magia sairia de um boneco parado.
       *
       * ⚠️ Só quando havia folha de conjuração para segurar. Sem ela nada foi
       * segurado, e não há o que completar.
       */
      if (mudou) {
        const tinhaPose = !!(opts.castAnim ?? opts.attackAnim);
        if (tinhaPose && !oneShot) {
          retomaCast = true;
          startOneShot(opts.castAnim ? 'cast' : 'attack');
        } else {
          applyState();
        }
      }
      return;
    }
    if (mudou) applyState();

    /*
     * ⚠️ A aura PULSA e cresce um pouco até o fim: é o que dá a sensação de
     * carga acumulando. Redesenhada por quadro porque muda de tamanho — é uma
     * elipse, custa nada.
     */
    const t2 = performance.now() * 0.008;
    const R = TS * (0.42 + frac * 0.30);
    const brilho = 0.32 + 0.18 * Math.abs(Math.sin(t2));
    castAura.clear();
    castAura.ellipse(TS / 2, TS - 3, R, R * 0.42).fill({ color: 0x4a86d8, alpha: brilho * 0.5 });
    castAura.ellipse(TS / 2, TS - 3, R * 0.66, R * 0.28).fill({ color: 0x9fd0ff, alpha: brilho });

    /*
     * A barra herdada do rodapé: fundo escuro, borda preta, preenchimento roxo.
     *
     * ⚠️ **A largura sai do TEXTO**, com um piso: nome curto não merece barra
     * de 220 px sobre a cabeça, e nome longo não pode transbordar dela. O
     * `castName.width` só é confiável depois de o texto estar posto — por isso
     * o nome é atribuído no topo desta função.
     */
    // ⚠️ Cresceu junto com a fonte: 80 de piso e 20 de altura, contra 56 e 12.
    const L = Math.max(80, Math.ceil(castName.width) + 18);
    const H = 20;
    const x0 = TS / 2 - L / 2;
    castBar.clear();
    castBar.roundRect(x0, 0, L, H, 3).fill({ color: 0x14110c, alpha: 0.92 });
    castBar.roundRect(x0, 0, L, H, 3).stroke({ width: 1, color: 0x000000, alpha: 0.9 });
    /*
     * ⚠️ O preenchimento é recortado 1 px para dentro da borda, senão ele a
     * cobre nos cantos e a barra perde o contorno justo quando está cheia.
     */
    if (frac > 0) {
      castBar.roundRect(x0 + 1, 1, (L - 2) * frac, H - 2, 2)
        .fill({ color: 0x8a5fd0, alpha: 0.95 });
    }
    castName.x = TS / 2;
    castName.y = castBar.y + H / 2;
  }

  /**
   * ❄️ **CONGELADO: azul e PARADO.**
   *
   * Pedido do dono em 11/09: *"o sprite do inimigo fica azulado e a animação de
   * corrida/ataque pausa"*.
   *
   * 🔴 **Parar a animação é mais importante que a cor.** Congelado não anda,
   * não ataca e não conjura (`DD-SOR-012`) — e um bicho azul continuando a
   * correr no lugar diz ao jogador que a magia não pegou. A cor confirma; o
   * congelamento do movimento é o que INFORMA.
   *
   * ⚠️ O `tint` é guardado e devolvido, e não zerado para branco: monstro
   * noturno tem aura vermelha e as variantes de slime têm cor própria. Zerar
   * apagaria a identidade deles ao descongelar.
   */
  /**
   * 🧊 **O BLOCO DE GELO por cima de quem congelou** (pedido do dono, 11/09).
   *
   * ⚠️ **Criado por preguiça (só no primeiro congelamento) e nunca destruído.**
   * A esmagadora maioria das entidades nunca congela; um `Sprite` por bicho no
   * mapa seria desperdício puro. Depois de criado, fica escondido — recriar a
   * cada gelo daria alocação no meio da luta, que é o que o pool das partículas
   * existe para evitar.
   *
   * ⚠️ **Âncora e posição copiadas do CORPO**, e não centradas no tile: o
   * sprite pode ter âncora própria (`anchorY` 0,92 nos humanos, 1 em outros) e
   * escala própria. Centrar no tile poria o bloco nos pés de uns e na cabeça de
   * outros.
   */
  let geloNode: Sprite | undefined;
  function mostraGelo(v: boolean): void {
    if (!v && !geloNode) return;
    if (!geloNode) {
      const tex = Assets.get<Texture>('/assets/spells/frozen_status_overlay.png');
      // ⚠️ Folha ausente = sem bloco, e o resto do congelamento (cor e animação
      // parada) continua valendo. É a convenção do arquivo inteiro.
      if (!tex) return;
      geloNode = new Sprite(tex);
      geloNode.anchor.set(sprite.anchor.x, sprite.anchor.y);
      geloNode.x = sprite.x;
      geloNode.y = sprite.y;
      /*
       * ⚠️ A altura do bloco é casada com a do CORPO, não com a do tile: o
       * desenho tem 72 px para um sprite que em tela tem `sprite.height`. Sem
       * isso ele cobriria metade de um goblin e um terço de um chefe.
       */
      geloNode.scale.set((sprite.height * 1.12) / geloNode.texture.height);
      geloNode.alpha = 0.9;
      c.addChild(geloNode);
    }
    geloNode.visible = v;
  }

  let gelado = false;
  function setFrozen(v: boolean): void {
    if (v === gelado) return;
    gelado = v;
    mostraGelo(v);
    if (v) {
      sprite.stop();
      for (const { s: camada } of camadas) camada.stop();
    } else {
      // `applyState` decide o que ele volta a fazer — andar, parado ou golpe.
      applyState();
    }
  }

  return {
    container: c,
    setDirection,
    setTarget,
    setHp,
    update,
    setCasting,
    setFrozen,
    mostraUi: ui?.mostraUi,
    // Com folha de ataque, toca a animação; sem ela, cai no pulinho de sempre.
    // Os dois efeitos coexistem de propósito: o pulinho continua dando peso ao
    // golpe mesmo quando há animação.
    /**
     * 🔴 `magia` vem do ELEMENTO do golpe (`S2C_Hit.element`), que é o único
     * sinal que o cliente tem para saber que aquilo foi feitiço e não pancada.
     * Fire bolt chega como `fire`, cold bolt como `ice`; espada chega como
     * `physical` ou sem campo.
     *
     * ⚠️ Sem folha de conjuração o gesto cai no golpe da arma — é o mesmo
     * princípio do `attackPoseFallback`: animar errado é melhor que não animar,
     * desde que o errado ainda seja um ataque.
     */
    playAttack: (magia?: boolean) => {
      attackUntil = performance.now() + 140;
      startOneShot(magia && opts.castAnim ? 'cast' : 'attack');
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
  /** ⚔️ É um MONSTRO — ver `monstro` em `MiniActorOpts`. */
  monstro?: boolean;
}

function makeSpriteActor(opts: SpriteActorOpts): EntityView {
  const { e, anim, cfg, nameColor, onClick } = opts;
  const c = new Container();
  if (onClick) {
    c.eventMode = 'static';
    /*
     * ⚠️ **SEM `cursor` aqui, de propósito.** O Pixi escreve o valor desta
     * propriedade no canvas assim que o mouse entra no contêiner, e isso
     * ATROPELA o ponteiro do jogo: era um `crosshair` do sistema — a cruz branca
     * que o dono viu em 12/09 — aparecendo justamente sobre monstro, que é onde
     * o cursor de ataque devia estar. Sem a propriedade, o Pixi aplica
     * `inherit` e quem manda volta a ser o `body`. Ver `cursorDoJogo`.
     */
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
  // ⚔️ Agora que o sprite existe e está escalado, a área de acerto é ELE.
  if (onClick) c.hitArea = areaDoAtor(sprite);

  const hpbar = makeHpBar();
  c.addChild(hpbar.node);
  const nlabel = nameLabel(e.name, nameColor);
  c.addChild(nlabel);
  // ⚔️ Só monstro esconde nome e vida por padrão. Ver `uiDeMonstro`.
  const ui = opts.monstro ? uiDeMonstro({ c, sprite, label: nlabel, hpbar }) : undefined;

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
    setHp: ui ? ui.setHp : hpbar.set,
    update,
    mostraUi: ui?.mostraUi,
    playAttack: (_magia?: boolean) => { if (oneShot !== 'attack') playOnce('attack'); },
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
      stepMs = stepDurationFor(e, false, cadence, now - moveStart, isSelf)
        * fatorDiagonal(x - fromX, y - fromY, true);
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
    /*
     * 🔴 A escala e as âncoras saem do `CREATURE_SHEETS`, não de um número fixo
     * aqui. Era `scale: 2` para todo mundo, o que só servia enquanto todas as
     * folhas tivessem a mesma célula — e a fauna da CraftPix vem em três
     * tamanhos (16, 32 e 64). Um 2× cravado poria o cavalo a 124 px de altura,
     * o dobro do herói.
     */
    const cfg = CREATURE_SHEETS[e.creatureType!]!;
    return makeMiniActor({
      // ⚔️ É monstro: nome e vida escondidos por padrão, contorno no alvo.
      monstro: true,
      e,
      anim: folhas.walk,
      scale: cfg.scale,
      anchorX: cfg.anchorX,
      anchorY: cfg.anchorY,
      labelTop: cfg.labelTop,
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
      // ⚔️ É monstro: nome e vida escondidos por padrão, contorno no alvo.
      monstro: true,
      e, anim: anims.slime, cfg: BOSS_SLIME_CFG, nameColor: 0xc46bff,
      creatureTint: true, tint: 0xa657ff, onClick: onTargetClick,
    });
  }
  if (isBoss && mini.slimeAnim) {
    const s = mini.slimeAnim;
    return makeMiniActor({
      // ⚔️ É monstro: nome e vida escondidos por padrão, contorno no alvo.
      monstro: true,
      e, anim: { down: s, up: s, right: s, left: s }, scale: 3.6,
      nameColor: 0xc46bff, alwaysAnimate: true, creatureTint: true, tint: 0xa657ff, onClick: onTargetClick,
    });
  }

  /*
   * 🔴 **O ZUMBI SAIU DAQUI EM 01/09, e o caminho especial dele morreu junto.**
   *
   * Ele era a única criatura desenhada por um ramo próprio: uma folha LPC de
   * 64 px com duas animações (andar e um balanço de cabeça parado), com âncora e
   * escala escritas à mão neste arquivo. Agora ele entra pelo caminho de todo
   * mundo, o `CREATURE_SHEETS`, com as CINCO animações do pack da CraftPix.
   *
   * ⚠️ Isso apagou de uma vez: um ramo especial no desenho, dois carregadores
   * usados por uma espécie só, e a ÚNICA arte do repositório com licença
   * *share-alike* — que o `docs/LICENCAS-DE-ARTE.md` marcava como risco por
   * contaminar o derivado.
   *
   * ⚠️ `loadZombieAnim` e `loadZombieIdleAnim` continuam exportados em
   * `miniworld.ts`, sem uso. Não apaguei junto para o diff não misturar troca de
   * arte com faxina de módulo.
   */

  // SLIME AZUL e VERMELHO: a arte do Verde com o matiz rotacionado, gerada no
  // carregamento (ver `loadSlimeVariants`). Decisão do dono: reusar o corpo do
  // Verde em vez de desenhar sprite novo — são a mesma criatura um degrau acima.
  //
  // O nome sai na cor da espécie que já estava na tabela de placeholder, então a
  // leitura no mapa não muda: azul continua lendo azul.
  const slimeVariant = e.creatureType ? mini.slimeVariants?.[e.creatureType] : undefined;
  if (slimeVariant) {
    return makeSpriteActor({
      // ⚔️ É monstro: nome e vida escondidos por padrão, contorno no alvo.
      monstro: true,
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
      // ⚔️ É monstro: nome e vida escondidos por padrão, contorno no alvo.
      monstro: true,
      e, anim: anims.slime, cfg: SLIME_CFG, nameColor: 0xa0e0a0, creatureTint: true, onClick: onTargetClick,
    });
  }
  // Fallback: Slime MiniWorld (hop simples), se o pack FreeChars faltar.
  if (isSlime && mini.slimeAnim) {
    const s = mini.slimeAnim;
    return makeMiniActor({
      // ⚔️ É monstro: nome e vida escondidos por padrão, contorno no alvo.
      monstro: true,
      e, anim: { down: s, up: s, right: s, left: s }, scale: 2.2,
      nameColor: 0xa0e0a0, alwaysAnimate: true, creatureTint: true, onClick: onTargetClick,
    });
  }

  const c = new Container();
  c.eventMode = 'static';
  /*
   * ⚠️ **SEM `cursor` aqui, de propósito.** O Pixi escreve o valor desta
   * propriedade no canvas assim que o mouse entra no contêiner, e isso
   * ATROPELA o ponteiro do jogo: era um `crosshair` do sistema — a cruz branca
   * que o dono viu em 12/09 — aparecendo justamente sobre monstro, que é onde
   * o cursor de ataque devia estar. Sem a propriedade, o Pixi aplica
   * `inherit` e quem manda volta a ser o `body`. Ver `cursorDoJogo`.
   */
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
  const nlabel = nameLabel(e.name, nameCol);
  c.addChild(nlabel);
  // ⚔️ Sem sprite: o contorno vira um anel em volta da bolha. Ver `uiDeMonstro`.
  const ui = uiDeMonstro({ c, label: nlabel, hpbar });

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
    setHp: ui.setHp,
    update,
    mostraUi: ui.mostraUi,
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
    /*
     * 🔴 **A SILHUETA SAI DA FAMÍLIA, e a cor da espécie.**
     *
     * Antes esta perna final desenhava um **blob verde de Slime para todo mundo
     * que não fosse um dos seis casos escritos à mão** — 22 das 28 espécies. No
     * bestiário, que mostra todas lado a lado, o resultado era uma página de
     * gosmas verdes idênticas com nomes diferentes, e foi o que o dono relatou
     * jogando em 29/08: *"o ícone de cada monstro tá quase todos a mesma foto"*.
     *
     * Não é arte — continua sendo andaime, como o comentário do
     * `CREATURE_PLACEHOLDER_COLORS` diz. Mas andaime que DISTINGUE: seis
     * silhuetas por família mais a cor da espécie separam lobo de formiga sem
     * pedir um único desenho novo.
     *
     * ⚠️ Espécie sem cor na tabela cai na cor da FAMÍLIA, e não num cinza
     * genérico: a fauna de pasto inteira entrou em 29/08 sem passar por lá, e
     * um padrão neutro devolveria o problema que este bloco existe para
     * resolver.
     */
    const fam = CREATURE_FAMILY[key];
    const CorDaFamilia: Record<string, number> = {
      slime: 0x5fae5f, aranha: 0x6a4a7a, formiga: 0xa06a3a, goblin: 0x7aa04a,
      lobo: 0x9a9a9a, orc: 0x6a8a4a, 'morto-vivo': 0xd8d0b8, minotauro: 0x8a4a3a,
      urso: 0x7a5a3a, kobold: 0xb08a4a, troll: 0x5a7a5a, serpente: 0x4f8a3a,
      fauna: 0xb59a72, ave: 0xe8e2d6,
    };
    const cor = CREATURE_PLACEHOLDER_COLORS[key]
      ?? (fam ? CorDaFamilia[fam] : undefined)
      ?? 0x5fae5f;
    const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
    const escurece = (n: number, f: number): string => hex(
      (Math.round(((n >> 16) & 0xff) * f) << 16)
      | (Math.round(((n >> 8) & 0xff) * f) << 8)
      | Math.round((n & 0xff) * f),
    );
    const claro = hex(cor);
    const escuro = escurece(cor, 0.5);
    g.fillStyle = claro;
    g.strokeStyle = escuro;
    g.lineWidth = 1.2;
    const chao = S - 3;
    const olhos = (x: number, y: number, r: number): void => {
      g.fillStyle = '#12100c';
      g.beginPath();
      g.arc(x - r, y, 0.9, 0, Math.PI * 2);
      g.arc(x + r, y, 0.9, 0, Math.PI * 2);
      g.fill();
    };
    const elipse = (x: number, y: number, rx: number, ry: number): void => {
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    };

    if (fam === 'fauna' || fam === 'lobo' || fam === 'urso') {
      // QUADRÚPEDE: tronco deitado, cabeça à frente, quatro patas.
      g.strokeStyle = escuro;
      g.lineWidth = 1.6;
      for (const px of [-4, -1.5, 2, 4.5]) {
        g.beginPath(); g.moveTo(cxp + px, chao - 5); g.lineTo(cxp + px, chao); g.stroke();
      }
      g.lineWidth = 1.2;
      elipse(cxp - 0.5, chao - 7, 6, 3.6);
      elipse(cxp + 5.5, chao - 9.5, 3, 2.6);
      olhos(cxp + 5.8, chao - 10, 1.3);
    } else if (fam === 'ave') {
      // AVE: corpo em gota, pescoço alto, bico.
      g.strokeStyle = escuro;
      g.lineWidth = 1.6;
      for (const px of [-1.5, 1.5]) {
        g.beginPath(); g.moveTo(cxp + px, chao - 4); g.lineTo(cxp + px, chao); g.stroke();
      }
      g.lineWidth = 1.2;
      elipse(cxp, chao - 6, 5, 4);
      elipse(cxp + 2, chao - 12, 2.4, 2.6);
      g.fillStyle = '#e8a23a';
      g.beginPath();
      g.moveTo(cxp + 4, chao - 12.5); g.lineTo(cxp + 7.5, chao - 11.5);
      g.lineTo(cxp + 4, chao - 10.5); g.closePath(); g.fill();
      olhos(cxp + 2.2, chao - 12.6, 1);
    } else if (fam === 'morto-vivo') {
      // CAVEIRA: crânio com órbitas fundas e mandíbula.
      elipse(cxp, chao - 9, 5.5, 5);
      g.fillStyle = claro;
      g.beginPath(); g.rect(cxp - 3, chao - 5.5, 6, 3.5); g.fill(); g.stroke();
      g.fillStyle = '#12100c';
      g.beginPath();
      g.ellipse(cxp - 2.2, chao - 10, 1.7, 2, 0, 0, Math.PI * 2);
      g.ellipse(cxp + 2.2, chao - 10, 1.7, 2, 0, 0, Math.PI * 2);
      g.fill();
    } else if (fam === 'formiga' || fam === 'aranha') {
      // ARTRÓPODE: três segmentos e pernas em leque.
      g.strokeStyle = escuro;
      g.lineWidth = 1.1;
      for (let i = 0; i < 3; i++) {
        const dy = -2 + i * 2.4;
        g.beginPath(); g.moveTo(cxp, chao - 7); g.lineTo(cxp - 7, chao - 7 + dy); g.stroke();
        g.beginPath(); g.moveTo(cxp, chao - 7); g.lineTo(cxp + 7, chao - 7 + dy); g.stroke();
      }
      elipse(cxp - 2.5, chao - 6, 3.4, 3);
      elipse(cxp + 2.5, chao - 8, 3, 2.6);
      olhos(cxp + 3, chao - 8.5, 1.1);
    } else if (fam === 'goblin' || fam === 'orc' || fam === 'kobold'
      || fam === 'troll' || fam === 'minotauro') {
      // HUMANOIDE: cabeça, tronco, braços e pernas.
      g.strokeStyle = escuro;
      g.lineWidth = 1.6;
      for (const px of [-2.2, 2.2]) {
        g.beginPath(); g.moveTo(cxp + px, chao - 4); g.lineTo(cxp + px, chao); g.stroke();
      }
      g.beginPath(); g.moveTo(cxp - 5.5, chao - 7); g.lineTo(cxp + 5.5, chao - 7); g.stroke();
      g.lineWidth = 1.2;
      elipse(cxp, chao - 7, 4, 3.6);
      elipse(cxp, chao - 12, 3.4, 3);
      // Chifres para o minotauro — a única silhueta que pede assinatura própria.
      if (fam === 'minotauro') {
        g.strokeStyle = '#efe8d8';
        g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(cxp - 3, chao - 14); g.lineTo(cxp - 5.5, chao - 16); g.stroke();
        g.beginPath(); g.moveTo(cxp + 3, chao - 14); g.lineTo(cxp + 5.5, chao - 16); g.stroke();
      }
      olhos(cxp, chao - 12.4, 1.4);
    } else {
      // SLIME e qualquer família nova: o blob de sempre, agora com a cor certa.
      // O chefe é maior — é a única diferença de porte no ícone.
      const boss = key === 'super_slime';
      const w = boss ? 18 : 15;
      const h = boss ? 15 : 12;
      const x = cxp - w / 2;
      const y = chao - h;
      const r = boss ? 6 : 5;
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
      g.fillStyle = claro;
      g.fill();
      g.lineWidth = 1.5;
      g.strokeStyle = escuro;
      g.stroke();
      olhos(cxp, y + h * 0.42, 3);
    }
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
  onPickup?: (id: string) => void,
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
  /*
   * 🔴 CLIQUE PEGA A PILHA. Até 11/08 o item comum não tinha clique nenhum — só
   * bolsa e corpo eram interativos —, e a única forma de recolher uma pilha era
   * arrastá-la até a mochila. Pedido do dono, jogando.
   *
   * ⚠️ `pointertap` só dispara se o ponteiro não tiver arrastado, então o gesto
   * de EMPURRAR a pilha de tile em tile (o `mousedown`/`mouseup` do viewport)
   * continua intacto: arrastar empurra, clicar pega.
   */
  c.eventMode = 'static';
  c.cursor = 'pointer';
  c.hitArea = new Rectangle(0, 0, TS, TS);
  c.on('pointertap', soBotaoEsquerdo(() => onPickup?.(e.id)));
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
// 🔴 O som NÃO se liga sozinho — decisão do dono em 02/09, depois de ouvir.
// A música fica parada e só toca se o jogador clicar no alto-falante.
ligaControlesDeSom();

net = new NetClient(routeServerMessage, (connected) => {
  statusEl.innerHTML = connected
    ? 'Servidor: <span class="on">conectado</span>'
    : 'Servidor: <span class="off">reconectando…</span>';
  /*
   * 🔴 O status na TELA DE ENTRADA sai daqui, do socket de verdade.
   *
   * A arte de referência trazia sete servidores com "Online / Alto" escritos à
   * mão. Um rótulo fixo mentiria exatamente quando o jogador mais precisa da
   * verdade — com o servidor fora do ar, ele ficaria tentando entrar e culpando
   * a própria senha.
   */
  const srv = document.getElementById('srvstatus');
  if (srv) {
    srv.textContent = connected ? 'Online' : 'Offline';
    srv.className = 'srvstatus ' + (connected ? 'on' : 'off');
  }
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
  /**
   * 🔑 **Sessão anterior: volta direto para a lista de personagens.**
   *
   * Vem ANTES do auto-login de desenvolvimento porque resolve o mesmo problema
   * para todo mundo, inclusive em produção — enquanto o `DEV_AUTOLOGIN` só
   * existe nesta máquina e com duas variáveis ligadas.
   *
   * ⚠️ Se o token estiver vencido ou já usado, o servidor responde "sessão
   * expirada" e a tela de login aparece normalmente. O jogador nunca fica preso.
   */
  if (connected && !autoAuthEnviado && leToken()) {
    autoAuthEnviado = true;
    const token = leToken();
    // Esquece na hora: o token é de uso único, e o servidor manda outro na
    // resposta. Guardar o velho faria a próxima troca falhar.
    esqueceToken();
    window.setTimeout(() => net.authWithToken(token), 0);
    return;
  }
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
  /**
   * 🚪 **Pede antes de sair.** O servidor recusa quem está em combate — 60 s
   * sem lutar, ou 180 s quando a briga foi com jogador.
   *
   * ⚠️ O botão é reabilitado na recusa, senão uma negativa o deixaria morto
   * para o resto da sessão e o jogador teria de recarregar na mão — que é
   * justamente o que a trava existe para evitar.
   */
  btn.onclick = () => {
    btn.disabled = true; // clique duplo não dispara dois pedidos
    net.send({ t: 'leave' });
    // Rede de segurança: se a resposta nunca vier (socket caiu no meio), o
    // botão volta a funcionar em vez de ficar travado para sempre.
    window.setTimeout(() => { btn.disabled = false; }, 5000);
  };
  aoLiberarSaida = () => {
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

/** O que fazer quando o servidor autoriza a saída. Preenchido pelo botão. */
let aoLiberarSaida: (() => void) | null = null;

setupLoginScreen();
setupCharSelectScreen();
setupStartScreen();
setupSwitchCharButton();
// ⚔️ O painel do personagem vive fora da partida: ligar aqui faz o botão −/+
// funcionar já na primeira tela, e não só depois de entrar no mundo.
ligaPainelDoPersonagem();
showScreen('login');
