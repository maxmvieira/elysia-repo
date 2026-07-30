import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKPACK_SIZE,
  backpackSizeFor,
  CREATURES,
  CREATURE_FAMILY,
  DAMAGE_TYPES,
  NODES,
  FAMILY_MATERIALS,
  ITEMS,
  MATERIALS,
  getMaterial,
  materialsForUse,
  materialsOf,
  materialsOfFamily,
} from '../src/index.js';

test('as duas tabelas não se separam: todo material é um item de verdade', () => {
  // `MATERIALS` diz o que a coisa é como matéria-prima; `ITEMS` o que ela é como
  // objeto de inventário. Se um existir sem o outro, o material não pode cair no
  // chão ou o item não tem família — as duas quebram o sistema em silêncio.
  for (const kind of Object.keys(MATERIALS)) {
    const item = ITEMS[kind];
    assert.ok(item, `${kind} está em MATERIALS mas não em ITEMS`);
    assert.equal(item!.category, 'loot', `${kind} deveria ser categoria loot`);
    assert.equal(item!.stackable, true, `material precisa empilhar: ${kind}`);
  }
});

test('DD-MAT-001: todo material tem família, função e lore', () => {
  // "Nenhum material deve existir apenas para ocupar espaço."
  for (const m of Object.values(MATERIALS)) {
    assert.ok(m.family, `${m.kind} sem família`);
    assert.ok(m.origin, `${m.kind} sem origem`);
    assert.ok(m.use, `${m.kind} sem uso predominante`);
    assert.ok(m.lore.length > 20, `${m.kind} precisa de uma linha de lore de verdade`);
    assert.ok(m.stackMax > 0, `${m.kind} sem empilhamento`);
  }
});

test('afinidade de material usa os SETE tipos de dano, e nada além', () => {
  // Decisão do dono: vocabulário único. As 11 afinidades do 44.11 colapsam nos
  // 7 de DD-ELM-002. Este teste impede que um oitavo entre por descuido.
  for (const m of Object.values(MATERIALS)) {
    if (m.affinity) {
      assert.ok(
        DAMAGE_TYPES.includes(m.affinity),
        `${m.kind} usa afinidade inválida: ${m.affinity}`,
      );
    }
  }
});

test('DD-DROP-006: toda espécie tem família declarada', () => {
  // Sem isto, uma criatura nova entraria sem material característico e voltaria
  // a ser "monstro que só dá XP", que é o que DD-DROP-001 proíbe.
  for (const tipo of Object.keys(CREATURES)) {
    assert.ok(CREATURE_FAMILY[tipo], `a espécie ${tipo} não tem família`);
  }
});

test('DD-DROP-001: toda espécie ATIVA larga algum material próprio', () => {
  // As dormentes (Coelho, Javali) estão de fora de propósito: não nascem no
  // mapa, então não há jogador matando-as por XP pura.
  const dormentes = new Set(['rabbit', 'boar']);
  for (const tipo of Object.keys(CREATURES)) {
    if (dormentes.has(tipo)) continue;
    const mats = materialsOf(tipo);
    assert.ok(mats.length > 0, `${tipo} não larga material nenhum`);
  }
});

test('todo material de família existe no catálogo', () => {
  for (const [fam, lista] of Object.entries(FAMILY_MATERIALS)) {
    for (const entry of lista) {
      assert.ok(MATERIALS[entry.kind], `${fam} aponta para ${entry.kind}, que não existe`);
      assert.ok(entry.chance > 0 && entry.chance <= 1, `chance inválida em ${entry.kind}`);
    }
  }
});

test('material comum sai com mais frequência que material raro', () => {
  // `DD-DROP-002` chama o loot comum de "principal fonte de renda constante".
  // Se o raro saísse tão fácil, ele deixaria de ser evento.
  for (const lista of Object.values(FAMILY_MATERIALS)) {
    for (const entry of lista) {
      const m = MATERIALS[entry.kind]!;
      if (m.rarity === 'common') {
        assert.ok(entry.chance >= 0.4, `${entry.kind} é comum e sai pouco (${entry.chance})`);
      }
      if (m.rarity === 'rare') {
        assert.ok(entry.chance <= 0.45, `${entry.kind} é raro e sai demais (${entry.chance})`);
      }
    }
  }
});

test('a família é da criatura, não da espécie: lobos compartilham material', () => {
  // É o que faz a lição do jogador servir para o grupo inteiro. Matar Lobo
  // Cinzento ou Lobo Negro dá o mesmo tipo de couro.
  assert.deepEqual(materialsOf('grey_wolf'), materialsOf('black_wolf'));
  assert.deepEqual(materialsOf('skeleton_warrior'), materialsOf('zombie'));
  // E famílias diferentes dão coisas diferentes.
  assert.notDeepEqual(materialsOf('grey_wolf'), materialsOf('troll'));
});

test('as três famílias que o doc exemplifica batem com o que ele cita', () => {
  // Lobos -> couros, presas, pelos
  const lobo = FAMILY_MATERIALS.lobo.map((e) => e.kind);
  assert.deepEqual(lobo.sort(), ['wolf_fang', 'wolf_fur', 'wolf_hide']);
  // Aranhas -> teias, veneno, olhos
  const aranha = FAMILY_MATERIALS.aranha.map((e) => e.kind);
  assert.deepEqual(aranha.sort(), ['spider_eye', 'spider_venom', 'spider_web']);
  // Mortos-vivos -> ossos, cinzas, fragmentos espirituais
  const mv = FAMILY_MATERIALS['morto-vivo'].map((e) => e.kind);
  assert.deepEqual(mv.sort(), ['ashes', 'bone', 'spirit_fragment']);
});

test('mortos-vivos deixam material com marca de Sagrado e Sombrio', () => {
  // Coerência com a lore: morto-vivo é alma que não voltou ao Heart, e o Zumbi
  // já é fraco a Sagrado. As Cinzas são o que Sagrado deixa.
  assert.equal(MATERIALS.ashes!.affinity, 'holy');
  assert.equal(MATERIALS.spirit_fragment!.affinity, 'dark');
  assert.equal(MATERIALS.ashes!.origin, 'espiritual');
});

test('as consultas de família e uso funcionam (base das profissões)', () => {
  // `DD-DROP-013`: cada profissão usa grupos específicos de material.
  const couros = materialsOfFamily('couro');
  assert.ok(couros.length >= 5, 'deveria haver vários couros');
  assert.ok(couros.every((m) => m.family === 'couro'));

  const alquimia = materialsForUse('alquimia');
  assert.ok(alquimia.length >= 4, 'o alquimista precisa de matéria-prima');
  assert.ok(alquimia.some((m) => m.kind === 'troll_blood'));

  assert.equal(getMaterial('nao_existe'), undefined);
});

test('a escada de mochilas segue o roadmap: 20/40/60/80 compartimentos', () => {
  // Roadmap (Etapa 12): "Mochilas com peso E compartimentos: 200/20 · 500/40 ·
  // 1000/60 · 1500/80". Os slots estão implementados; o peso espera a
  // capacidade de carga (que deriva de STR e não existe).
  const caps = ['bag', 'backpack', 'large_backpack', 'traveler_pack']
    .map((k) => ITEMS[k]!.capacity);
  assert.deepEqual(caps, [10, 40, 60, 80]);
});

test('mochila maior custa mais: espaço é progressão, não item de primeiro dia', () => {
  const bp = ITEMS.backpack!;
  const grande = ITEMS.large_backpack!;
  const viajante = ITEMS.traveler_pack!;
  assert.ok(grande.buyPrice > bp.buyPrice * 5);
  assert.ok(viajante.buyPrice > grande.buyPrice * 3);
  // E toda mochila ocupa o slot de container, senão não dá para equipar.
  for (const m of [bp, grande, viajante]) {
    assert.equal(m.slot, 'container');
    assert.equal(m.stackable, false, 'recipiente é instância, não pilha');
  }
});

test('o tamanho da mochila vem do container equipado, não de constante', () => {
  // 🔴 Isto foi bug de verdade. O carregamento usava `BACKPACK_SIZE` (20) fixo, e
  // quando a Mochila subiu para 40 o personagem salvo voltava com 20 slots —
  // PERDENDO ACESSO aos itens dos slots 20 a 39, que ficavam no banco invisíveis.
  assert.equal(backpackSizeFor('bag'), 10);
  assert.equal(backpackSizeFor('backpack'), 40);
  assert.equal(backpackSizeFor('large_backpack'), 60);
  assert.equal(backpackSizeFor('traveler_pack'), 80);
  // Sem container: cai no padrão.
  assert.equal(backpackSizeFor(undefined), BACKPACK_SIZE);
  // Container inexistente não pode virar mochila de tamanho zero.
  assert.equal(backpackSizeFor('nao_existe'), BACKPACK_SIZE);
});

test('toda mochila do catálogo tem capacidade declarada', () => {
  // Container sem `capacity` cairia silenciosamente no padrão de 20, e o jogador
  // pagaria 1800 de ouro por uma mochila que não cresce.
  for (const def of Object.values(ITEMS)) {
    if (def.slot !== 'container') continue;
    assert.ok(def.capacity && def.capacity > 0, `${def.kind} sem capacidade`);
    assert.equal(backpackSizeFor(def.kind), def.capacity);
  }
});

test('🔴 nenhum material existe sem forma de obtê-lo — inclusive os de coleta', () => {
  // Este teste **bloqueava** as famílias de coleta até 2026-07-30: Ervas,
  // Flores, Cogumelos, Minérios, Madeiras, Cristais e Gemas não podiam existir
  // porque não havia como consegui-las, e `DD-MAT-001` proíbe material que só
  // ocupa espaço.
  //
  // A regra não mudou — mudou o mundo. `gathering.ts` deu origem a elas, então
  // o teste virou do avesso: em vez de proibir a família, agora exige que cada
  // material dela tenha um NÓ que o produza. Um material de coleta novo, sem nó,
  // continua sendo exatamente o erro que a versão anterior pegava.
  const deColeta = ['erva', 'flor', 'cogumelo', 'minerio', 'madeira', 'gema', 'cristal'];
  const colhiveis = new Set(
    Object.values(NODES).flatMap((n) => n.yields.map((y) => y.kind)),
  );
  for (const m of Object.values(MATERIALS)) {
    if (!deColeta.includes(m.family)) continue;
    assert.ok(
      colhiveis.has(m.kind),
      `${m.kind} é da família ${m.family} e nenhum nó de coleta o produz`,
    );
  }
});
