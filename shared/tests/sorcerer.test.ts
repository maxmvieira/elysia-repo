/**
 * 🔮 As 18 habilidades do Feiticeiro — Doc 1, cap. 70.
 *
 * ⚠️ `70.60`: o Feiticeiro **não sofreu reformulação posterior**. Ao contrário
 * do Archer, a V1 é a versão atual — não há revisão escondida que justifique
 * "corrigir" um número daqui sem o doc mudar.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SKILLS,
  CLASSES,
  CONDITIONS,
  MAX_SKILL_LEVEL,
  skillsOfClass,
  branchesOfClass,
  skillHits,
  skillEmpurrao,
  skillImpactosEsperados,
  skillRange,
  INTERVALO_BOLT_MS,
  DUR_QUEDA_MS,
  skillDuration,
  skillGroundDuration,
  skillGroundMax,
  skillConditionChance,
  skillConditionDuration,
  skillPower,
  skillCooldown,
  IMPULSO_MAGICO,
  skillManaCost,
  skillCastMs,
  castDexReduction,
  DEX_CONJURACAO_INSTANTANEA,
  PISO_CONJURACAO_MS,
  skillModifiers,
  castMasteryReduction,
  magicProtectionShare,
  manaRegenBonus,
  WEAPON_IDENTITY,
  type SkillDef,
} from '../src/index.js';

const magos = (): SkillDef[] => skillsOfClass('sorcerer');

// ---------------------------------------------------------------------------
// A contagem
// ---------------------------------------------------------------------------

test('o Feiticeiro tem exatamente 18 habilidades em 4 escolas', () => {
  assert.equal(magos().length, 18);
  assert.deepEqual(branchesOfClass('sorcerer'), ['fogo', 'gelo', 'raio', 'arcano']);
});

test('as escolas têm 4 · 4 · 3 · 7', () => {
  const conta = (ramo: string): number => magos().filter((d) => d.branch === ramo).length;
  assert.equal(conta('fogo'), 4, '🔥 fogo');
  assert.equal(conta('gelo'), 4, '❄️ gelo');
  // "Só 3, de propósito" — o doc diz isso com todas as letras.
  assert.equal(conta('raio'), 3, '⚡ raio');
  assert.equal(conta('arcano'), 7, '✨ arcano');
});

// ---------------------------------------------------------------------------
// 🔴 DD-PROG-028 — o ataque básico com cajado é FÍSICO
// ---------------------------------------------------------------------------

test('DD-PROG-028: o cajado bate de perto e não conjura de graça', () => {
  // A correção de 03/09. Se alguém devolver `attackType: 'magic'` à classe, o
  // Feiticeiro volta a atirar firebolt sem gastar habilidade — que é
  // exatamente o que o doc proíbe.
  assert.equal(CLASSES.sorcerer.attackType, 'melee');
  assert.equal(CLASSES.sorcerer.attackRange, 1);
  assert.equal(CLASSES.sorcerer.spellCost, 0);
  assert.equal(CLASSES.sorcerer.projectile, undefined);
});

test('o cajado canaliza magia, mas o golpe dele é físico', () => {
  // As duas coisas convivem: `magic` manda o poder da arma para `magicAtk`, e
  // `basicPhysical` mantém o golpe comum como bastonada corpo a corpo.
  const cajado = WEAPON_IDENTITY.staff;
  assert.equal(cajado.magic, true, 'o cajado ainda aumenta poder mágico');
  assert.equal(cajado.basicPhysical, true, 'mas o golpe básico é físico');
  assert.equal(cajado.range, 1, 'e de perto');
});

test('o Feiticeiro precisa de MANA para causar dano à distância', () => {
  // O outro lado de `DD-PROG-028`: "dano mágico à distância exige gastar uma
  // habilidade e mana". Toda ofensiva dele custa mana e tem alcance.
  const ofensivas = magos().filter((d) => d.power > 0);
  assert.ok(ofensivas.length >= 8);
  for (const d of ofensivas) {
    assert.ok(d.manaCost > 0, `${d.id} teria dano de graça`);
    assert.equal(d.magic, true, `${d.id} deveria escalar com poder mágico`);
  }
});

// ---------------------------------------------------------------------------
// 🔥 Fogo
// ---------------------------------------------------------------------------

test('Chuva de Meteoros: pré-requisito Fire Bolt 5 + Fire Wall 5 + Meteoro 5', () => {
  // Citação literal do cap. 70.
  const req = SKILLS.meteor_storm.requires ?? [];
  assert.equal(req.length, 3);
  const mapa = new Map(req.map((r) => [r.skill, r.level]));
  assert.equal(mapa.get('fire_bolt'), 5);
  assert.equal(mapa.get('fire_wall'), 5);
  assert.equal(mapa.get('meteor'), 5);
});

test('Chuva de Meteoros: cast de 3 s, CD de 15 s e MP altíssimo no Lv.10', () => {
  // "Lv.10: 10 meteoros, área grande, ~4 s, cast ~3 s, CD ~15 s, MP altíssimo."
  //
  // ⚠️ **A contagem saiu deste teste em 11/09.** O documento diz dez; o dono
  // subiu para dezoito depois de jogar, e a razão está no nome da magia: a
  // dez ela lia como bombardeio espaçado, não como CHUVA. O que este teste
  // guarda continua sendo o que o documento cravou e ninguém contestou — o
  // preço de lançar (cast, cooldown, mana). Ver o teste da progressão.
  const c = SKILLS.meteor_storm;
  assert.equal(c.castMs, 3000);
  assert.equal(c.cooldownMs, 15000);
  assert.ok(c.manaCost >= 100, 'MP altíssimo');
});

test('Fire Bolt é multi-hit e econômico — o "Golpe Poderoso do mago"', () => {
  const fb = SKILLS.fire_bolt;
  assert.equal(fb.kind, 'multihit');
  assert.ok(skillHits(fb, 10) > skillHits(fb, 1));
  // Econômico: é a magia mais barata da classe.
  const maisBarata = Math.min(...magos().filter((d) => d.manaCost > 0).map((d) => d.manaCost));
  assert.equal(fb.manaCost, maisBarata);
});

test('a série do Fire Bolt dura MAIS que a recarga — e isso é intencional', () => {
  /*
   * 🔴 **A regra virou do avesso em 11/09**, e o teste registra as duas pontas.
   *
   * Em 09/09 o dono pediu *"o cooldown da magia deveria ser até terminar o
   * último impacto dela"*, e a recarga passou a ser esticada até a última bola
   * cair. Em 11/09 ele pediu o contrário: *"o cooldown deve ser mais curto para
   * lançar a magia novamente."* A recarga voltou a ser a da ficha.
   *
   * O que mudou entre um pedido e o outro foi o resto do sistema. A recarga
   * longa existia porque as bolas nasciam TODAS de um aviso só, num ponto fixo
   * do chão — duas conjurações viravam um borrão de vinte bolas sem dono. Hoje
   * cada bola nasce do seu próprio `fx`, na posição do alvo e seguindo ele, e
   * duas séries se lêem como duas séries.
   *
   * ⚠️ Então este teste NÃO trava mais "recarga ≥ série". Ele trava o
   * contrário, para o dia em que alguém achar que a sobreposição é bug: a série
   * do Lv.10 dura MESMO mais que a recarga, e mais de uma delas no ar ao mesmo
   * tempo é o desenho, não um descuido. O contrapeso é a mana e o carregamento.
   */
  const fb = SKILLS.fire_bolt;
  const serie = (golpes: number): number =>
    (golpes - 1) * INTERVALO_BOLT_MS + DUR_QUEDA_MS;

  assert.ok(
    serie(skillHits(fb, 10)) > fb.cooldownMs,
    `a série do Lv.10 (${serie(skillHits(fb, 10))} ms) passa da recarga de ficha `
    + `(${fb.cooldownMs} ms): mais de uma série no ar é ESPERADO desde 11/09`,
  );
  // E cresce com o nível: mais bolts, mais tempo no ar.
  assert.ok(serie(skillHits(fb, 10)) > serie(skillHits(fb, 1)));
  // A queda de UMA bola é o piso, mesmo no nível 1, que solta uma só.
  assert.equal(serie(skillHits(fb, 1)), DUR_QUEDA_MS);
});

// ---------------------------------------------------------------------------
// ❄️ Gelo
// ---------------------------------------------------------------------------

test('Ice Wall: 1 parede no Lv.1, 3 no Lv.10, durando de 20 s a 60 s', () => {
  // Citação: "1→3 paredes simultâneas, 20 s→60 s".
  const w = SKILLS.ice_wall;
  assert.equal(skillGroundMax(w, 1), 1);
  assert.equal(skillGroundMax(w, 10), 3);
  assert.equal(skillGroundDuration(w, 1), 20000);
  assert.equal(skillGroundDuration(w, 10), 60000);
  assert.equal(w.ground?.blocks, true, 'é barreira física de verdade');
});

test('a Ice Wall é a ÚNICA magia que bloqueia passagem', () => {
  // Muralha de Fogo controla espaço tornando-o caro, não impedindo-o. Confundir
  // as duas apagaria a diferença entre as escolas.
  for (const d of Object.values(SKILLS)) {
    if (d.id === 'ice_wall') continue;
    assert.ok(!d.ground?.blocks, `${d.id} não deveria bloquear passagem`);
  }
});

test('❄️ Nevasca no modelo do RO: congela a cada 3º acerto, e o quique é a magia', () => {
  /*
   * 🔴 **A REGRA DE CONGELAR MUDOU DUAS VEZES EM 11/09**, e a segunda desfez
   * metade da primeira. O registro fica porque a versão do meio parecia a
   * certa e não era.
   *
   * 1. Antes de tudo: rolagem baixa (8–12 %) a CADA pulso, do `DD-SOR-012`.
   * 2. No meio: rolagem alta UMA VEZ, no 3º acerto, com o alvo virando IMUNE ao
   *    resto da tempestade. O argumento era que, como dano quebra gelo aqui, sem
   *    a imunidade a bola seguinte descongelaria o alvo 450 ms depois.
   * 3. Agora: rolagem alta a CADA 3º acerto (3º, 6º, 9º), sem imunidade nenhuma.
   *
   * 🔴 **O argumento da imunidade estava certo sobre a regra e errado sobre a
   * MAGIA.** O gelo de fato não dura dentro da tempestade — e é esse o efeito:
   * *"se sofrer outro golpe, ele quebra o gelo, toma dano de novo e é empurrado
   * outra vez"*. Congela, quebra, empurra, congela de novo. O quique É a
   * Nevasca; é o que aparece em vinte anos de GIF. Com a imunidade o monstro
   * congelava uma vez e a tempestade parava de tocá-lo — mais arrumado, e não
   * era Ragnarok. Decisão do dono.
   *
   * ⚠️ Consequência assumida: os 10 s de gelo quase nunca são cumpridos DENTRO
   * da tempestade. Eles valem para quem congelou perto do fim dela — e é aí que
   * o combo do `DD-SOR-012` vive.
   */
  const n = SKILLS.blizzard;

  // 1. O acúmulo: três acertos antes de cada rolagem.
  assert.equal(n.congelaEmAcertos, 3);

  /*
   * 🔴 **O alvo tem de PODER rolar mais de uma vez por tempestade.** É o que
   * separa o modelo de agora do que ele substituiu: com 10 bolas e uma rolagem
   * a cada 3 acertos, o melhor caso — o alvo apanhando de todas — são três
   * rolagens (3º, 6º, 9º). Se a contagem de bolas cair para menos de 6, o
   * modelo silenciosamente vira "uma chance por tempestade", que é exatamente a
   * versão descartada, de volta sem ninguém decidir.
   *
   * ⚠️ Isto é o TETO, não a média. Quantas bolas de fato pegam um alvo depende
   * de sorteio e do empurrão — ver o pendente do dia sobre a cobertura da área.
   */
  const rolagens = Math.floor(skillHits(n, 10) / n.congelaEmAcertos!);
  assert.ok(rolagens >= 3, `só ${rolagens} rolagem(ns) por tempestade — o quique some`);

  /*
   * 2. A rolagem, que só acontece naquele acerto — e ela CAI com o nível.
   *
   * 🔴 **70 % no Lv.1 e 25 % no Lv.10.** Parece erro e é a ficha do Ragnarok: a
   * Nevasca troca controle por dano à medida que sobe. O Lv.1 é magia de
   * PRENDER (dano pequeno, congela quase sempre) e o Lv.10 é magia de MATAR
   * (570 % de ATQM, congela pouco). Quem quer congelar mantém a habilidade
   * baixa — é decisão de build, e é o que dá duas leituras à mesma magia.
   *
   * ✅ E resolve sozinho a tensão com o `DD-SOR-012`, que existia para a Nevasca
   * não ser controle garantido: no nível máximo ela quase não congela.
   */
  assert.ok(Math.abs(skillConditionChance(n, 1) - 0.70) < 1e-9);
  assert.ok(Math.abs(skillConditionChance(n, 10) - 0.25) < 1e-9);
  assert.ok(
    skillConditionChance(n, 10) < skillConditionChance(n, 1),
    'a chance de congelar CAI com o nível — ver a nota acima',
  );

  /*
   * 3. 🔴 **E o gelo quebra com dano — inclusive com o dela mesma.**
   *
   * Parecia a peça que contradizia as outras duas. É a que as faz funcionar: é
   * porque a própria Nevasca quebra o gelo que ela quica, e é porque ela rola
   * de novo três acertos depois que o quique se repete. Trocar isto para
   * `false` não "conserta" a duração — desliga a magia.
   *
   * O combo do documento sobrevive — *"congela → abre distância → prepara
   * Meteoro → impacto quebra o gelo"* —, valendo para quem sai da tempestade
   * congelado.
   */
  assert.equal(CONDITIONS.freeze.brokenByDamage, true);

  /*
   * 4. 🌬️ **O empurrão: duas células, e ele é PARTE do congelamento.**
   *
   * Sem empurrão o alvo fica no mesmo tile e o modelo ainda funciona; com ele,
   * o alvo é jogado para outra célula do 9×9 a cada acerto, e é o vaivém que
   * dá o efeito. O número é da ficha do RO.
   */
  assert.equal(n.empurraPorPulso, 2);

  // O que o documento crava e ninguém mexeu: dez segundos de gelo.
  assert.equal(skillConditionDuration(n, 10), 10000);
  assert.equal(CONDITIONS.freeze.referenceDurationMs, 10000);

  /*
   * ⚠️ A cadência agora sai da própria tempestade: dez bolas em 4,5 s dá uma a
   * cada 450 ms, que é o número da ficha. E o alvo tem de conseguir levar três
   * antes de ela acabar, senão a regra nunca dispara.
   */
  const passo = n.durationMs / skillHits(n, 1);
  assert.ok(Math.abs(passo - 450) < 1, `cadência de ${passo} ms, e a ficha diz 450`);
  assert.ok(
    passo * n.congelaEmAcertos! < n.durationMs,
    'a tempestade acaba antes do terceiro acerto — a regra nunca roda',
  );
});

test('🌠 o dano da Chuva por ALVO é 2,7 impactos, e não 18', () => {
  /*
   * 🔴 **ESTE TESTE EXISTE PORQUE UM NÚMERO ERRADO SOBREVIVEU UM DIA E QUASE
   * VIROU DECISÃO DE EQUILÍBRIO.**
   *
   * Dois comentários da ficha afirmavam que um bando colado levava
   * *"praticamente TODOS os 18 meteoros, cada um"*, e o histórico de 11/09
   * abriu um pendente de rebalanceamento com base nisso — *"o poder total por
   * alvo foi de 10,4 para 18,7"*.
   *
   * Ninguém tinha feito a conta geométrica. Os meteoros caem em pontos
   * SORTEADOS de um 13×13 (169 células) e cada um pega 5×5 (25): são **2,66
   * acertos por alvo**. O "18,7" nunca existiu, e o pendente se desfez sozinho
   * quando a conta apareceu.
   *
   * ⚠️ O que este teste trava NÃO é o 2,66 — é a RELAÇÃO: o que um alvo leva
   * tem de ser muito menor que a soma dos golpes, sempre que a magia espalha
   * impactos por uma área. No dia em que alguém trocar o respingo ou o alcance,
   * é aqui que a conta é refeita.
   */
  const c = SKILLS.meteor_storm;
  const golpes = skillHits(c, 10);
  const esperados = skillImpactosEsperados(c, 10);

  assert.equal(golpes, 18, 'a contagem de meteoros mudou — refaça a conta abaixo');
  assert.ok(
    esperados < golpes / 4,
    `um alvo leva ${esperados.toFixed(2)} de ${golpes} meteoros — se isto se aproximar `
    + 'do total, a magia virou outra coisa e o `power` precisa de revisão',
  );

  /*
   * ⚠️ A fórmula fechada tem de bater com a geometria, senão ela é só outro
   * número inventado: golpes × células do respingo ÷ células da área.
   */
  const raio = skillRange(c, 10);
  const conta = (golpes * (2 * c.splash! + 1) ** 2) / ((2 * raio + 1) ** 2);
  assert.ok(Math.abs(esperados - conta) < 1e-9);

  /*
   * 🔴 **E `danoDaArea` é a exceção, por definição.** Na Nevasca cada bola fere
   * todo mundo dentro da área, então todo golpe conta — se esta linha cair,
   * alguém aplicou a diluição onde ela não vale e a Nevasca perdeu 80 % do dano
   * na dica sem perder nada no servidor.
   */
  const n = SKILLS.blizzard;
  assert.equal(skillImpactosEsperados(n, 10), skillHits(n, 10));

  /*
   * ⚠️ E magia que não espalha impacto nenhum não é diluída: o Fire Bolt
   * persegue o alvo, e os dez bolts dele acertam os dez.
   */
  const fb = SKILLS.fire_bolt;
  assert.equal(skillImpactosEsperados(fb, 10), skillHits(fb, 10));
});

test('❄️ a Nevasca troca TEMPO por MANA — o override do dono sobre a ficha', () => {
  /*
   * 🔴 **OVERRIDE CONSCIENTE, registrado aqui porque o número da ficha do
   * Ragnarok dizia outra coisa** (11/09, depois de jogar): *"melhore o tempo de
   * conjuração, está muito demorado. O cooldown também"* e, na mesma conversa,
   * *"mas gaste mais mana para equilibrar"*.
   *
   * | | antes (ficha do RO) | agora (dono) |
   * |---|---|---|
   * | conjuração Lv.10 | 6,3 s | 3,0 s |
   * | recarga | 20 s | 13 s |
   * | mana Lv.10 | 274 | 386 |
   *
   * Em conjurações por minuto: de ~2,3 para ~3,7. Em mana por minuto: de 630
   * para ~1 430. O dano sobe uns 60 %, o custo mais que dobra — é essa a troca,
   * e é ela que este teste guarda.
   */
  const n = SKILLS.blizzard;

  /*
   * 1. 🔴 **A conjuração continua CRESCENDO com o nível.** Isto é o desenho da
   * Nevasca e não um número: ela é a única magia do jogo assim, e o que o dono
   * encolheu foi a ESCALA, não a ideia. Comprimir mais é decisão dele; apagar o
   * crescimento descaracteriza a magia.
   */
  assert.ok(
    skillCastMs(n, 10, 0, 0) > skillCastMs(n, 1, 0, 0),
    'a conjuração da Nevasca tem de crescer com o nível — é o contrajogo dela',
  );

  /*
   * 2. A FAIXA, e não o número exato. O dono pode voltar a mexer; o que não
   * pode voltar é a magia suprema do gelo passar mais tempo parada que a do
   * fogo por margem larga, que foi a queixa.
   */
  const cast10 = skillCastMs(n, 10, 0, 0);
  assert.ok(
    cast10 >= 2000 && cast10 <= 3500,
    `conjuração de ${cast10} ms no Lv.10, e a faixa combinada é 2000–3500`,
  );
  assert.ok(
    cast10 <= skillCastMs(SKILLS.meteor_storm, 10, 0, 0),
    'a Nevasca não pode conjurar mais devagar que a Chuva de Meteoros',
  );

  /*
   * 3. 🔴 **O PREÇO DA PRESSA: a mais cara das supremas.** É a metade da troca
   * que equilibra a outra. Se um dia alguém baixar a mana "porque está alta"
   * sem devolver o tempo, a Nevasca vira a melhor magia do jogo de graça.
   */
  for (const rival of ['meteor_storm', 'thor_wrath'] as const) {
    assert.ok(
      skillManaCost(n, 10) > skillManaCost(SKILLS[rival], 10),
      `a Nevasca tem de custar mais mana que ${SKILLS[rival].name} — ela é a mais rápida`,
    );
  }

  /*
   * 4. ⚠️ **A recarga ainda tem de impedir duas tempestades no ar.** Uma
   * conjuração ocupa cast + duração; recarga menor que isso deixaria a segunda
   * Nevasca começar antes de a primeira acabar, e o empurrão de duas
   * tempestades sobrepostas não tem leitura nenhuma em tela.
   */
  assert.ok(
    n.cooldownMs > cast10 + n.durationMs,
    `recarga de ${n.cooldownMs} ms não cobre os ${cast10 + n.durationMs} ms de uma conjuração`,
  );
});

test('❄️ na Nevasca as bolas são o VISUAL e o dano é da área', () => {
  const n = SKILLS.blizzard;

  /*
   * 🔴 **Medido, não estimado** (11/09, 200 mil tempestades simuladas). Com o
   * dano saindo do respingo de cada bola, a Nevasca entregava 63 % dos 570 %
   * que a ficha promete, e em 28 % das conjurações o alvo não era tocado
   * nenhuma vez — porque são 81 células no 9×9 e 10 bolas cobrindo 9 células
   * cada, ou 1,11 acerto por alvo.
   *
   * ⚠️ E não era calibragem: respingo 5×5 dava 176 %, e 18 bolas com respingo
   * 5×5 davam 316 %. Nenhum ajuste chegava perto.
   *
   * ✅ O modelo do Ragnarok é o que fecha: *"o motor cria uma área de 9×9 e
   * começa a jogar aleatoriamente mini-SPRITES de 3×3"*. As bolas dizem ONDE a
   * tempestade está; a área diz QUEM apanha. Com isto, 358 % no Lv.10 para quem
   * fica no meio — o resto some porque o empurrão tira o alvo de dentro, que é
   * o contrajogo da própria magia.
   */
  assert.equal(n.danoDaArea, true, 'sem isto a Nevasca entrega 63 % da ficha');

  /*
   * ⚠️ **11×11, e o número sai de `range + splash`.** É a frase da ficha: *"por
   * caírem em células aleatórias da área de 9×9, [as bolas de 3×3 fazem] a área
   * chegar a 11×11 células"*. Se um dia o respingo deixar de entrar no raio, a
   * área encolhe para 9×9 sem ninguém decidir isso.
   */
  const lado = 2 * (skillRange(n, 10) + n.splash!) + 1;
  assert.equal(lado, 11, `a área do dano deu ${lado}×${lado}, e a ficha diz 11×11`);

  /*
   * 🔴 **E o dano total volta a bater com a ficha.** Dez bolas, todas atingindo
   * quem está na área: 10 × 0,57 = 570 %. É o TETO — o alvo que aguentar a
   * tempestade inteira sem ser empurrado para fora.
   *
   * ⚠️ **A conta é sobre a FICHA, e o `IMPULSO_MAGICO` entra explícito.** A
   * primeira versão comparava `skillPower` com 5,7 cravado, e o impulso geral
   * de 12/09 a derrubou — uma decisão de equilíbrio vetada por um número
   * copiado para dentro do teste. Agora o teste diz o que quer dizer: a ficha
   * promete 570 %, e o efetivo é isso vezes o impulso, seja ele qual for.
   */
  const daFicha = skillHits(n, 10) * (n.power + n.powerPerLevel * 9);
  assert.ok(Math.abs(daFicha - 5.7) < 1e-9, `ficha de ${(daFicha * 100).toFixed(0)} %, e ela diz 570 %`);
  const total = skillHits(n, 10) * skillPower(n, 10);
  assert.ok(
    Math.abs(total - 5.7 * IMPULSO_MAGICO) < 1e-9,
    `teto efetivo de ${(total * 100).toFixed(0)} %, esperado ${(570 * IMPULSO_MAGICO).toFixed(0)} %`,
  );

  /*
   * ⚠️ `danoDaArea` MULTIPLICA: cada unidade passa a bater em todos, em vez de
   * distribuir. Ligar numa magia de alvo único não faria sentido nenhum — não
   * há área para atingir —, e numa que não cai não há unidade para desenhar.
   */
  for (const def of Object.values(SKILLS)) {
    if (!def.danoDaArea) continue;
    assert.equal(def.shape, 'area', `${def.id}: dano de área sem área`);
    assert.equal(def.queda, true, `${def.id}: dano de área sem unidade caindo`);
  }
});

test('🌬️ empurrão e acúmulo só existem em modo que o servidor LÊ', () => {
  /*
   * 🔴 **Este teste nasceu de um defeito real, em 11/09.**
   *
   * `empurraPorPulso` e `congelaEmAcertos` eram lidos num lugar só: na criação
   * da área de chão. Quando a Nevasca deixou de ser área e virou queda, os dois
   * campos continuaram na ficha, bonitos, e pararam de fazer efeito — a magia
   * perdeu empurrão e congelamento sem UM erro de compilação, sem um teste
   * vermelho, e sem nada na tela dizendo o que sumiu.
   *
   * ⚠️ O teste não prova que o servidor aplica os campos (isso ele não alcança
   * daqui). Prova a única coisa que dá para provar da ficha: que a habilidade
   * está num dos DOIS modos onde existe código para lê-los. Mover a magia para
   * um terceiro modo — que é exatamente o que aconteceu — cai aqui.
   */
  for (const def of Object.values(SKILLS)) {
    if (def.empurraPorPulso === undefined && def.congelaEmAcertos === undefined) continue;
    /*
     * ⚠️ **Só `queda`.** A área de chão sabia ler os dois campos e essa cópia
     * foi APAGADA em 11/09, quando as regras foram invertidas para o RO e só a
     * cópia viva mudou — sobraram duas versões da mesma regra discordando. Se
     * uma magia de chão precisar de empurrão, o caminho é chamar
     * `empurraAoAcaso`, e não ressuscitar a leitura aqui.
     */
    assert.equal(
      def.queda, true,
      `${def.id} declara empurrão/acúmulo sem ser queda — os campos ficariam mortos`,
    );
    // ⚠️ E o acúmulo sem condição nenhuma é um contador que não rola nada.
    if (def.congelaEmAcertos !== undefined) {
      assert.ok(def.applies, `${def.id}: acúmulo sem condição para rolar`);
    }
  }
});

test('o combo do doc funciona: dano quebra o Congelamento, não a Petrificação', () => {
  // "Congela → abre distância → prepara Meteoro → impacto quebra o gelo."
  // É a tensão que o doc quer, e ela mora em `conditions.ts`.
  assert.equal(CONDITIONS.freeze.brokenByDamage, true);
  assert.equal(CONDITIONS.petrify.brokenByDamage, false);
});

test('Explosão Glacial é 360° ao redor de si — a resposta a quem colou', () => {
  const g = SKILLS.glacial_burst;
  assert.equal(g.shape, 'area');
  assert.ok(g.range <= 2, 'curta: serve para descolar, não para farmar');
});

// ---------------------------------------------------------------------------
// ⚡ Raio
// ---------------------------------------------------------------------------

test('⚡ Esfera Elétrica: a ficha da Jupitel Thunder', () => {
  /*
   * ⚡ **Ficha trazida pelo dono em 12/09** (`WZ_JUPITEL`), copiada quase
   * inteira. O que este teste guarda são os números que vieram dela e a FORMA
   * do crescimento, que é o que a distingue das outras.
   */
  const lb = SKILLS.electric_sphere;

  // 3 → 12 choques, e 9 células de alcance fixo.
  assert.equal(skillHits(lb, 1), 3);
  assert.equal(skillHits(lb, 10), 12);
  assert.equal(skillRange(lb, 10), 9);

  /*
   * 🔴 **O PODER É FIXO e quem cresce é a CONTAGEM** — *"100 % do seu ATQM por
   * choque"*. É o oposto da Nevasca (contagem fixa, poder crescente), e as duas
   * formas existem de propósito: uma magia fica mais forte ficando mais densa,
   * a outra ficando mais longa. Se alguém puser `powerPerLevel` aqui, a Esfera
   * deixa de ser a Jupitel e vira mais um Fire Bolt.
   */
  assert.equal(skillPower(lb, 1), skillPower(lb, 10));
  // ⚠️ A ficha diz 100 %; o efetivo carrega o impulso geral. Ver a nota gêmea
  // na Nevasca: o número da ficha e o número em jogo são duas perguntas.
  assert.equal(lb.powerPerLevel, 0, 'a ficha da Jupitel não tem poder por nível');
  assert.ok(Math.abs(lb.power - 1.0) < 1e-9, '100 % de ATQM por choque na ficha');
  assert.ok(
    Math.abs(skillPower(lb, 10) - 1.0 * IMPULSO_MAGICO) < 1e-9,
    'o efetivo é a ficha vezes o impulso geral',
  );

  /*
   * ⚡ **1 → 3 tiles de arremesso, e é o TOTAL do lançamento.** Se fosse por
   * choque, o Lv.10 mandaria o alvo a 36 tiles — a ficha tem doze choques e o
   * empurrão tem coluna própria.
   *
   * 🔴 **A ficha do RO diz 2 → 7, e aqui é METADE** — decisão do dono em 12/09,
   * jogando: *"está empurrando o monstro muito para trás"*. A régua de lá tem
   * célula menor em tela que os 32 px daqui, e sete tiles tiravam o alvo do
   * campo de visão.
   */
  assert.equal(skillEmpurrao(lb, 1), 1);
  assert.equal(skillEmpurrao(lb, 10), 3);

  /*
   * ⚡ **A RECARGA CAI COM O NÍVEL — e ela é a ÚNICA do jogo assim.** Decisão do
   * dono em 12/09: 2 s no Lv.1, 1,2 s no Lv.10.
   *
   * 🔴 A segunda metade do teste é a que importa. A régua do jogo é *subir de
   * nível deixa mais forte, não mais frequente*; se um dia outra habilidade
   * ganhar `cooldownAtLv10` sem essa conversa, alguém tem de ser obrigado a
   * abrir este teste e defender a exceção, em vez de ela entrar de carona.
   */
  assert.equal(skillCooldown(lb, 1), 2000);
  assert.equal(skillCooldown(lb, 10), 1200);
  const comRecargaPorNivel = Object.values(SKILLS)
    .filter((d) => d.cooldownAtLv10 !== undefined)
    .map((d) => d.id);
  assert.deepEqual(
    comRecargaPorNivel, ['electric_sphere'],
    `só a Esfera encurta a recarga com o nível; achei ${comRecargaPorNivel.join(', ')}`,
  );

  /*
   * ⚠️ **A recarga NÃO é o que manda no ritmo no Lv.10: o GCD das magias é.**
   * Está travado aqui porque é a armadilha óbvia de quem for mexer nisto de
   * novo — baixar a recarga abaixo do GCD não acelera nada, e a tentação é
   * baixar mais ainda achando que o número não pegou.
   */
  assert.ok(
    skillCooldown(lb, 10) < 1000 + 500,
    'a recarga do Lv.10 já está na vizinhança do GCD de 1 s — ver a ficha',
  );

  /*
   * ⚡ **E a conjuração CRESCE com o nível** (2,5 s → 4,3 s), a segunda magia do
   * jogo assim depois da Nevasca. É o contrajogo: quanto mais forte, mais tempo
   * parado e interrompível.
   */
  assert.ok(skillCastMs(lb, 10, 0, 0) > skillCastMs(lb, 1, 0, 0));
  assert.equal(skillCastMs(lb, 1, 0, 0), 2000);
  assert.equal(skillCastMs(lb, 10, 0, 0), 3800);
});

test('o empurrão é tratado SEPARADO do dano', () => {
  // "Resistir ao empurrão não evita o dano." No código isso é automático: a
  // condição pode falhar e o golpe entra igual. O que o teste trava é que a
  // habilidade tenha AS DUAS coisas — dano próprio e condição à parte.
  const lb = SKILLS.electric_sphere;
  assert.ok(lb.power > 0);
  assert.equal(lb.applies?.id, 'knockback');
});

test('DD-SOR-018: a Descarga Elétrica não atordoa e não empurra', () => {
  // A ficha dela é a ausência: nenhuma condição, de propósito.
  const d = SKILLS.electric_discharge;
  assert.equal(d.applies, undefined);
  assert.ok(d.power > 0, 'mas ela causa dano');

  /*
   * 🔴 **ELA É DE ÁREA, e este `assert` existe por causa de um erro meu.**
   *
   * Em 12/09 a especificação da arte nova pedia alvo único, três vezes, e eu
   * segui — anotando no commit que isso contrariava o `GDD-doc1` (*"AoE
   * rápida"*) em vez de perguntar. O dono testou e desfez na mesma tarde: *"a
   * magia é em área também, não é alvo único"*.
   *
   * ⚠️ A lição não é sobre esta magia: **o que está no `docs/` não muda por
   * causa de um prompt.** Divergência entre o pedido e o documento é pergunta,
   * não decisão. O `assert` fica para o caso de a mesma especificação voltar.
   */
  assert.equal(d.shape, 'area', 'a Descarga é a AoE do ramo do raio — GDD-doc1');
});

test('⚡ a Tempestade de Raios reparte o dano sem mudar o TOTAL por alvo', () => {
  /*
   * 🔴 O dano saiu de um golpe para 3 → 6 raios, e isso foi mudança de DESENHO,
   * não de equilíbrio: o dono quis ver os números aparecendo enquanto os raios
   * caem.
   *
   * ⚠️ **`danoDaArea` é o que faz a conta fechar por multiplicação simples.**
   * Cada raio castiga TODA a área, então quem está dentro leva os seis — e o
   * total por alvo é `golpes × poder`, sem a diluição geométrica da Chuva de
   * Meteoros. É a mesma decisão da Nevasca.
   *
   * O teste trava o total de antes: 1,05 no Lv.1 e 2,22 no Lv.10, os mesmos de
   * quando ela era um golpe só. Se alguém mexer no `power` achando que reparte
   * de novo, o número aparece aqui.
   *
   * ⚠️ A conta é sobre a FICHA, sem o `IMPULSO_MAGICO` — é a comparação com o
   * valor histórico, e o impulso veio depois e vale para todas.
   */
  const d = SKILLS.electric_discharge;
  assert.equal(d.danoDaArea, true, 'sem isto a geometria come parte do dano');
  const daFicha = (nv: number): number =>
    skillImpactosEsperados(d, nv) * (d.power + d.powerPerLevel * (nv - 1));
  assert.ok(Math.abs(daFicha(1) - 1.05) < 0.01, `Lv.1 deu ${daFicha(1).toFixed(3)}, era 1,05`);
  assert.ok(Math.abs(daFicha(10) - 2.22) < 0.01, `Lv.10 deu ${daFicha(10).toFixed(3)}, era 2,22`);

  /*
   * ⚠️ **O dano de cada raio tem de cair DENTRO do desenho dele.** A folha dura
   * 840 ms e o estrago sai aos `quedaMs` — *"os danos vão aparecendo enquanto
   * ele cai"*. Travado porque `quedaMs` é um número solto na ficha e nada mais
   * no código sabe quanto a folha dura.
   */
  assert.ok((d.quedaMs ?? 0) < 840, 'o dano sairia com o raio já apagado');

  /*
   * 🔴 **E os raios não podem se empilhar.** A regra saiu do meteoro em 11/09: o
   * desenho de uma unidade não pode durar muito mais que o intervalo entre
   * elas, senão a chuva deixa de ler como chuva e vira uma parede acesa.
   *
   * ⚠️ Aqui o intervalo é `duração / golpes`, e não o fixo dos bolts — é o que
   * a magia de ÁREA usa. Subir `hits` sem subir `durationMs` aperta a
   * tempestade sem nenhum erro de compilação.
   */
  const intervalo = skillDuration(d, 10) / skillHits(d, 10);
  assert.ok(840 / intervalo < 3, `${(840 / intervalo).toFixed(1)} raios vivos ao mesmo tempo`);
});

test('Ira de Thor atordoa pouco, e o anti-cadeia é o do jogo inteiro', () => {
  const t = SKILLS.thor_wrath;
  assert.equal(t.applies?.id, 'stun');
  assert.ok(skillConditionChance(t, 10) <= 0.15, '"pequena chance de stun por impacto"');
});

// ---------------------------------------------------------------------------
// ✨ Arcano
// ---------------------------------------------------------------------------

test('DD-SOR-023/024: o Círculo Arcano dura 2 s → 4 s, com CD de 45 s', () => {
  // Citação: "Lv.1 2,0 s → Lv.10 4,0 s, CD 45 s".
  const c = SKILLS.arcane_circle;
  assert.equal(skillGroundDuration(c, 1), 2000);
  assert.equal(skillGroundDuration(c, 10), 4000);
  assert.equal(c.cooldownMs, 45000);
  assert.equal(c.ground?.kind, 'ward');
});

test('o ramo arcano não causa dano nenhum — ele faz o Feiticeiro funcionar', () => {
  for (const d of magos().filter((x) => x.branch === 'arcano')) {
    assert.equal(d.power, 0, `${d.id} não deveria causar dano`);
  }
});

test('a árvore arcana é RAMIFICADA, não linear', () => {
  // "Aprimoramento → Amplificação (Lv.5) e Maestria (Lv.3) · Regeneração de
  // Mana → Proteção Mágica (Lv.3)." Duas raízes sem pré-requisito, e cada uma
  // com filhos próprios.
  assert.equal(SKILLS.magic_enhance.requires, undefined);
  assert.equal(SKILLS.mana_regen.requires, undefined);
  assert.deepEqual(SKILLS.magic_amplify.requires, [{ skill: 'magic_enhance', level: 5 }]);
  assert.deepEqual(SKILLS.cast_mastery.requires, [{ skill: 'magic_enhance', level: 3 }]);
  assert.deepEqual(SKILLS.magic_protection.requires, [{ skill: 'mana_regen', level: 3 }]);
});

test('Proteção Mágica liga e desliga, e converte no máximo metade do dano', () => {
  // "Converte parte do dano recebido em consumo de MP; liga e desliga."
  assert.equal(SKILLS.magic_protection.kind, 'toggle');
  assert.equal(SKILLS.magic_protection.durationMs, 0, 'alternável não tem duração');
  assert.ok(magicProtectionShare(10) <= 0.5, 'acima de 50 % viraria imortalidade com mana');
  assert.ok(magicProtectionShare(10) > magicProtectionShare(1));
  assert.equal(magicProtectionShare(0), 0, 'não aprendida não converte nada');
});

test('a Maestria de Conjuração encurta o CAST, e nunca o cooldown', () => {
  // O GDD proíbe cooldown cair com o nível. Cast é outro eixo — e é o único
  // que pode encolher.
  const chuva = SKILLS.meteor_storm;
  assert.ok(skillCastMs(chuva, 10, 10, 1) < skillCastMs(chuva, 10, 0, 1));
  assert.ok(castMasteryReduction(10) <= 0.30, 'teto de −30 %');
  assert.equal(castMasteryReduction(0), 0);
  // A maior magia do jogo continua interrompível: nunca abaixo de ~2 s.
  assert.ok(skillCastMs(chuva, 10, 10, 1) >= 2000);
});

test('a Maestria não inventa cast em quem não tem', () => {
  // Reduzir 30 % de zero não pode virar número negativo nem ligar uma barra de
  // conjuração fantasma. `emergency_heal` é uma das sem `castMs` na ficha.
  assert.equal(SKILLS.emergency_heal.castMs, undefined, 'a ficha mudou; escolha outra');
  assert.equal(skillCastMs(SKILLS.emergency_heal, 10, 10, 300), 0);
});

test('❄️ o Cold Bolt é o Fire Bolt de gelo: mesma mecânica, outro elemento', () => {
  /*
   * Pedido do dono em 10/09: "a magia cold bolt deveria ser igual a firebolt
   * porém de gelo."
   *
   * O teste guarda o GÊMEO: tudo que faz a magia se comportar igual tem de
   * bater, e o que a torna gelo tem de diferir. Sem ele, mexer numa e esquecer
   * a outra não dá erro nenhum — as duas continuam funcionando, só que
   * diferentes.
   */
  const fogo = SKILLS.fire_bolt;
  const gelo = SKILLS.cold_bolt;
  for (const campo of [
    'kind', 'shape', 'hits', 'hitsAtLv10', 'castMs', 'cooldownMs',
    'power', 'powerPerLevel', 'range', 'rangeEvery', 'queda', 'magic',
  ] as const) {
    assert.deepEqual(gelo[campo], fogo[campo], `o Cold Bolt divergiu em "${campo}"`);
  }
  // E o que sobrou de identidade de gelo:
  assert.equal(gelo.damageType, 'ice');
  assert.equal(fogo.damageType, 'fire');
  assert.equal(gelo.applies?.id, 'slow');
  assert.equal(fogo.applies?.id, 'burn');
  assert.ok(gelo.manaCost > fogo.manaCost, 'o slow custa mana a mais');
  assert.ok(gelo.reqLevel > fogo.reqLevel, 'gelo abre depois de fogo');
  // Mesmo total de dano no Lv.10 — é o que "igual" quer dizer aqui.
  assert.equal(
    skillHits(gelo, 10) * skillPower(gelo, 10),
    skillHits(fogo, 10) * skillPower(fogo, 10),
  );
});

test('🔴 magia que CAI DO CÉU: alvo único cadenciado, ou área com JANELA', () => {
  /*
   * A bandeira `queda` custa três coisas ao servidor: o `fx` vai um por
   * impacto (em vez do genérico no lançamento), a queda é agendada, e o dano
   * espera o estouro.
   *
   * 🔴 **A REGRA MUDOU EM 11/09, e a versão anterior deste teste dizia o
   * contrário**: "queda é sempre de alvo único". Era verdade enquanto só o Fire
   * e o Cold Bolt caíam, e o motivo escrito era que os impactos de área se
   * espalham entre alvos diferentes. Só que o GDD sempre pediu ~4 s de
   * tempestade para a Chuva de Meteoros, e espalhar no TEMPO é justamente o
   * que faltava.
   *
   * ✅ O que separa os dois casos é a CADÊNCIA, não a forma: alvo único usa
   * `INTERVALO_BOLT_MS` cravado; área divide a própria duração pelo número de
   * impactos. Por isso a regra nova é: **queda de área OBRIGA duração.** Sem
   * ela, a divisão daria zero e os meteoros voltariam a cair todos no mesmo
   * tique — o defeito que a mudança veio corrigir, de volta em silêncio.
   */
  /*
   * 🔴 **`queda` DEIXOU DE SIGNIFICAR "cai do céu" em 12/09.** O que a bandeira
   * compra é a FILA: golpes espaçados no tempo, perseguindo o alvo, cada um
   * revalidado no instante em que cai. A queda do céu é um USO disso, não o
   * significado.
   *
   * A Esfera Elétrica entrou na lista por causa do tempo — os doze choques dela
   * têm de chegar em sequência — e **não é desenhada caindo**: o cliente só
   * trata como queda o que estiver em `FOLHAS_QUEDA` (ver `MAGIAS_QUE_CAEM`), e
   * ela não está.
   *
   * ⚠️ A lista continua cravada de propósito. A pergunta que ela força mudou:
   * não é mais "o cliente sabe desenhar a queda?", é **"esta magia quer a
   * cadência, e o cliente sabe o que desenhar a cada golpe?"**.
   */
  const caem = Object.values(SKILLS).filter((d) => d.queda);
  assert.deepEqual(
    caem.map((d) => d.id).sort(),
    [
      'blizzard', 'cold_bolt', 'electric_discharge', 'electric_sphere',
      'fire_bolt', 'meteor_storm',
    ],
    'mudou a lista? confira o que o cliente desenha a cada golpe da magia nova',
  );
  /*
   * ⚡ **E a resposta da Descarga Elétrica a essa pergunta é `lightning_fall`**
   * (12/09): cada raio da tempestade anuncia o próprio `fx`, e o cliente desenha
   * uma coluna caindo para cada um — que é o que faz vários deles no ar lerem
   * como tempestade.
   */
  for (const d of caem) {
    assert.ok(
      d.shape === 'target' || d.shape === 'area',
      `${d.id}: queda só faz sentido em alvo ou área`,
    );
    if (d.shape === 'area') {
      assert.ok(
        skillDuration(d, 10) > 0 && skillDuration(d, 1) > 0,
        `${d.id} cai em área e PRECISA de duração — é ela que espaça os impactos`,
      );
    }
  }
});

test('🌠 a Chuva de Meteoros: o que o dono mudou do documento, e o quanto', () => {
  /*
   * Citação do GDD: *"Lv.10: 10 meteoros, área grande, ~4 s, cast ~3 s,
   * CD ~15 s, MP altíssimo."*
   *
   * ⚠️ Este teste nasceu travando os números do documento. Hoje ele trava o
   * TAMANHO DO DESVIO: o dono mudou dois deles jogando, e o registro do que
   * mudou (e de quanto) vale mais que fingir que o documento ainda manda neles.
   * Os que ele NÃO contestou continuam cravados no teste acima.
   */
  const c = SKILLS.meteor_storm;
  assert.equal(c.castMs, 3000);
  assert.equal(c.cooldownMs, 15000);

  /*
   * 🔴 **DOIS OVERRIDES CONSCIENTES DO DOCUMENTO NESTA MAGIA**, os dois do
   * dono, os dois depois de jogar. O GDD diz "10 meteoros, ~4 s".
   *
   *   contagem  10 → 18   *"deve ser uma chuva de meteoros"*
   *   duração  4 s → 5,2 s *"aumente um pouco mais a duração"*
   *
   * O teste trava a FAIXA, não o número: mais que o documento, sim; o dobro,
   * não. Se um dia aparecer 40 meteoros ou 12 s, a magia virou outra coisa e
   * isto cai — que é o ponto.
   */
  assert.ok(
    skillHits(c, 10) > 10 && skillHits(c, 10) <= 24,
    `contagem do Lv.10 fora da faixa: ${skillHits(c, 10)}`,
  );
  assert.ok(skillHits(c, 10) > skillHits(c, 1), 'a contagem cresce com o nível');

  /*
   * ⚠️ **A DURAÇÃO É A ÚNICA QUE PASSOU DO DOCUMENTO, e por decisão do dono.**
   * O GDD diz "~4 s"; ele pediu mais depois de jogar (*"aumente um pouco mais a
   * duração dela também"*). O teste trava a FAIXA em vez do número: mais que o
   * documento, sim, mas não o dobro — se um dia alguém puser 12 s, a magia vira
   * outra coisa e isto cai.
   */
  assert.ok(
    skillDuration(c, 10) > 4000 && skillDuration(c, 10) <= 6000,
    `duração do Lv.10 fora da faixa: ${skillDuration(c, 10)}`,
  );
  assert.ok(skillDuration(c, 10) > skillDuration(c, 1), 'cresce com o nível');

  /*
   * 🔴 **E a queimadura continua sendo a condição dela.** A mesma proposta
   * sugeria acrescentar STUN por impacto. Stun é a identidade do ramo RAIO —
   * o GDD o dá à Ira de Thor ("pequena chance de stun por impacto") e o PROÍBE
   * na Descarga Elétrica (`DD-SOR-018`). Pôr stun na suprema de fogo tomaria a
   * identidade da suprema de raio.
   */
  assert.equal(c.applies?.id, 'burn');
});

test('💥 cada meteoro respinga numa CRATERA — e isso multiplica o dano em grupo', () => {
  /*
   * Pedido do dono em 11/09, jogando: *"se ele pegar em dois monstros juntos,
   * ambos devem tomar dano dele, afinal de contas é uma magia em área."*
   *
   * 🔴 **Este teste existe para o número não sumir sem alguém notar.** O
   * respingo é a maior alavanca de dano da magia: antes, dez meteoros eram dez
   * golpes DISTRIBUÍDOS entre os alvos sorteados; com respingo 1, um bando
   * colado leva perto de dez golpes CADA UM. Quem for reequilibrar a Chuva
   * começa por aqui, não pelo `power`.
   */
  const c = SKILLS.meteor_storm;
  /*
   * ⚠️ **Faixa, e não número cravado.** O respingo já foi 1 (3×3) e é 2 (5×5),
   * porque o dono ajusta isso olhando a tela — a rocha desenhada cobre ~4 tiles
   * e o dano tem de bater com o que o olho promete. O que o teste protege é o
   * teto: acima de 3 a cratera cobre quase toda a área da tempestade e o
   * sorteio de posições deixa de significar coisa alguma.
   */
  assert.ok(
    c.splash !== undefined && c.splash >= 1 && c.splash <= 3,
    `respingo fora da faixa: ${c.splash}`,
  );

  /*
   * ⚠️ **`splash` e `range` são coisas diferentes**, e confundi-los é o erro
   * fácil: `range` é o raio da TEMPESTADE (onde os meteoros podem cair) e
   * `splash` é o raio de UM impacto. A nuvem e a cratera.
   */
  assert.ok(c.range > c.splash, 'a tempestade tem de ser maior que a cratera');

  /*
   * ⚠️ Quem mais respinga: a Nevasca, desde 11/09 — a bola de neve tem 3×3
   * células na ficha do Ragnarok. A lista é travada para respingo não virar
   * enfeite que se acrescenta sem pensar: cada um multiplica o dano em grupo.
   */
  const comSplash = Object.values(SKILLS).filter((d) => d.splash !== undefined);
  assert.deepEqual(comSplash.map((d) => d.id).sort(), ['blizzard', 'meteor_storm']);
});

test('🔴 o carregamento do Fire Bolt desce por DESTREZA, numa curva côncava', () => {
  /*
   * Pedido do dono em 11/09: "o tempo de conjuração deve seguir uma curva
   * descendente à medida que o personagem vai adicionando mais atributo de
   * destreza."
   *
   * O teste guarda a FORMA da curva, não os números: existe carregamento sem
   * destreza, ele desce a cada ponto, o ganho é MAIOR no fim que no começo
   * (côncava), e o instantâneo só chega no topo da escala.
   */
  const bolt = SKILLS.fire_bolt;
  const semDex = skillCastMs(bolt, 10, 0, 1);
  assert.ok(semDex > 0, 'sem destreza tem de haver carregamento');

  // Desce, e nunca sobe.
  let anterior = semDex;
  for (let dex = 10; dex <= DEX_CONJURACAO_INSTANTANEA; dex += 10) {
    const agora = skillCastMs(bolt, 10, 0, dex);
    assert.ok(agora <= anterior, `subiu de DEX ${dex - 10} para ${dex}`);
    anterior = agora;
  }
  assert.equal(anterior, 0, 'no topo da escala vira instantânea');

  /*
   * CÔNCAVA: os vinte primeiros pontos de destreza valem MENOS que os vinte
   * últimos. Numa reta os dois trechos cortariam o mesmo tanto, e conjurar
   * rápido sairia barato demais no começo da progressão.
   */
  const alvo = DEX_CONJURACAO_INSTANTANEA;
  const ganhoInicio = castDexReduction(21) - castDexReduction(1);
  const ganhoFim = castDexReduction(alvo) - castDexReduction(alvo - 20);
  assert.ok(ganhoFim > ganhoInicio * 3, 'a curva tinha de ser bem mais íngreme no fim');
});

test('🔴 o piso de 1 s: magia longa nunca vira instantânea, por mais destreza que se tenha', () => {
  /*
   * A redução por nível chega a 100 %, e sozinha ela apagaria a conjuração da
   * Chuva de Meteoros — cujo contrajogo é justamente poder ser interrompida.
   * A regra: só vira instantânea a magia cuja conjuração base já cabe em 1 s.
   */
  const chuva = SKILLS.meteor_storm;
  assert.ok((chuva.castMs ?? 0) > PISO_CONJURACAO_MS);
  assert.equal(skillCastMs(chuva, 10, 10, 9999), PISO_CONJURACAO_MS);
  assert.equal(castDexReduction(1), 0, 'destreza 1 não ganha desconto nenhum');
  assert.equal(castDexReduction(9999), 1, 'a redução satura em 100 %');
});

test('Aprimoramento e Regeneração de Mana são passivas de verdade', () => {
  for (const id of ['magic_enhance', 'cast_mastery', 'mana_regen'] as const) {
    assert.equal(SKILLS[id].kind, 'passive', `${id} deveria ser passiva`);
    assert.equal(SKILLS[id].manaCost, 0);
  }
  assert.ok(manaRegenBonus(10) > manaRegenBonus(1));
  assert.equal(manaRegenBonus(0), 0);
});

test('Amplificação Mágica é janela CURTA e cara — não é buff permanente', () => {
  const a = SKILLS.magic_amplify;
  assert.ok(skillDuration(a, 10) <= 20000, 'janela de burst, não estado normal');
  assert.ok(a.cooldownMs > skillDuration(a, 10), 'o CD tem de ser maior que a duração');
  assert.ok((skillModifiers(a, 10).magicAtk ?? 0) > 0.3);
});

// ---------------------------------------------------------------------------
// Higiene
// ---------------------------------------------------------------------------

test('todo pré-requisito do Feiticeiro aponta para outra magia dele', () => {
  const ids = new Set(magos().map((d) => d.id));
  for (const d of magos()) {
    for (const r of d.requires ?? []) {
      assert.ok(ids.has(r.skill), `${d.id} exige ${r.skill}, que não é do Feiticeiro`);
      assert.ok(r.level >= 1 && r.level <= MAX_SKILL_LEVEL);
    }
  }
});

test('as supremas são caras, lentas e de nível alto — nenhuma é spam', () => {
  /*
   * 🔴 **ESTE TESTE FOI REESCRITO EM 11/09, e o motivo importa mais que o
   * conteúdo.** Ele travava `cooldownMs >= 15000` e `castMs >= 2000`, e caiu
   * quando o dono encurtou os dois da Nevasca pagando em mana. Travar o NÚMERO
   * fazia dele um veto a decisões de equilíbrio — que não é o trabalho dele.
   *
   * ✅ O que ele guarda agora é a INTENÇÃO: "suprema não é botão de spam". Isso
   * não é um só número; é a soma de quatro travas, e uma magia pode ser barata
   * em tempo desde que seja cara em mana (foi o caminho que o dono escolheu).
   */
  for (const id of ['meteor_storm', 'blizzard', 'thor_wrath'] as const) {
    const d = SKILLS[id];
    assert.ok(d.reqLevel >= 50, `${id} deveria exigir nível alto`);

    /*
     * ⚠️ **A conjuração é medida no Lv.10, e não em `castMs` cru.** A Nevasca
     * cresce com o nível (`castMsAtLv10`), então a base dela é a do Lv.1 —
     * comparar a base puniria justamente a magia que fica mais lenta quando
     * fica forte. O que precisa ser verdade é que a suprema MADURA dê tempo de
     * reação ao adversário.
     */
    const cast = skillCastMs(d, 10, 0, 0);
    assert.ok(cast >= 2000, `${id} no Lv.10 deveria ser interrompível (${cast} ms)`);

    // Recarga: longa o bastante para não virar rotação, mesmo depois do corte.
    assert.ok(d.cooldownMs >= 12000, `${id} deveria ter CD longo`);

    /*
     * 🔴 **E CARA.** Esta trava é nova, e é ela que sustenta as outras: foi
     * aceitando pagar mais mana que a Nevasca ganhou o direito de ser rápida.
     * Sem ela, o próximo a achar "a mana está alta" desfaz a troca pela metade
     * e sobra a magia suprema barata E rápida.
     */
    assert.ok(
      skillManaCost(d, 10) >= 250,
      `${id} custa ${skillManaCost(d, 10)} de mana no Lv.10 — suprema tem de doer`,
    );

    /*
     * ⚠️ **E nunca duas da mesma no ar.** A recarga tem de cobrir a conjuração
     * mais a duração do efeito; abaixo disso a segunda começa antes de a
     * primeira acabar, e área sobre área não tem leitura em tela.
     */
    assert.ok(
      d.cooldownMs > cast + (d.durationMs ?? 0),
      `${id}: a recarga não cobre uma conjuração inteira`,
    );
  }
});
