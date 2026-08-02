import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CITIES,
  CREATURES,
  DUNGEONS,
  DUNGEON_FLOORS,
  REGIONS,
  WORLD_SIZE,
  WORLD_SPAWN,
  cityById,
  distanceFromSpawn,
  regionAt,
  regionById,
  regionCenter,
} from '../src/index.js';

test('ids e nomes são únicos em regiões, cidades e dungeons', () => {
  // Id repetido não estoura em lugar nenhum: só faz a segunda entrada sumir,
  // silenciosamente, quando alguém buscar pela primeira.
  for (const lista of [REGIONS, CITIES, DUNGEONS] as Array<Array<{ id: string; name: string }>>) {
    assert.equal(new Set(lista.map((e) => e.id)).size, lista.length);
    assert.equal(new Set(lista.map((e) => e.name)).size, lista.length);
  }
});

test('toda região cabe no mundo e tem faixa de nível coerente', () => {
  for (const r of REGIONS) {
    assert.ok(r.bounds.x0 >= 0 && r.bounds.y0 >= 0, `${r.id} começa fora do mundo`);
    assert.ok(r.bounds.x1 < WORLD_SIZE && r.bounds.y1 < WORLD_SIZE, `${r.id} passa da borda`);
    assert.ok(r.bounds.x0 < r.bounds.x1 && r.bounds.y0 < r.bounds.y1, `${r.id} tem retângulo vazio`);
    assert.ok(r.level.min >= 1 && r.level.min <= r.level.max, `${r.id} tem faixa invertida`);
  }
});

test('🔴 nenhuma região é engolida por outra', () => {
  // `regionAt` devolve a PRIMEIRA que contém o tile. Uma região listada depois
  // de outra que a cobre inteira existiria na tabela e não no mundo — e o jeito
  // de descobrir seria um bioma que nunca aparece.
  for (const r of REGIONS) {
    const c = regionCenter(r);
    assert.equal(regionAt(c.x, c.y)?.id, r.id, `${r.id} não aparece nem no próprio centro`);
  }
});

test('🔴 os Campos de Valdor são um bolsão MANSO dentro das planícies', () => {
  // É a regra que protege quem acabou de nascer: Lumindale fica aqui, e a
  // região que o cerca é de Lv. 30–50.
  const campos = regionAt(WORLD_SPAWN.x, WORLD_SPAWN.y);
  assert.equal(campos?.id, 'campos_valdor');
  assert.ok(campos!.level.min <= 5, 'o berço não pode começar acima do nível 5');
  const veridia = regionById('planicies_veridia')!;
  assert.ok(veridia.level.min > campos!.level.max, 'a região ao redor tem que ser mais dura');
});

test('🔴 COERÊNCIA DO MUNDO: perto é manso, duro é longe', () => {
  // Pedido explícito do dono: o jogador de nível baixo não pode sair da cidade e
  // encontrar bicho de nível alto. Não se exige o inverso — uma floresta fácil
  // longe é legítima (`bioma não determina nível`), e é por isso que a trava é
  // de um lado só.
  const PERTO = 40;
  const DURO = 70;
  for (const r of REGIONS) {
    const d = distanceFromSpawn(r);
    if (d <= PERTO) {
      assert.ok(r.level.min <= 30, `${r.name} está a ${d} do berço e começa no Lv.${r.level.min}`);
    }
    if (r.level.min >= DURO) {
      assert.ok(d >= 60, `${r.name} é Lv.${r.level.min}+ e fica a só ${d} do berço`);
    }
  }
});

test('🔴 toda espécie citada numa região EXISTE no bestiário', () => {
  // `species` é o que pode nascer hoje; `wanted` é o que ainda não existe. Se um
  // id vazasse de um lado para o outro, a região nasceria vazia sem avisar.
  for (const r of REGIONS) {
    for (const s of r.species) {
      assert.ok(CREATURES[s], `${r.name} pede "${s}", que não está em CREATURES`);
    }
  }
});

test('nenhuma espécie aparece como pendente E como existente', () => {
  const existentes = new Set(Object.keys(CREATURES));
  for (const r of REGIONS) {
    for (const w of r.wanted) {
      assert.equal(existentes.has(w), false, `${r.name} lista "${w}" como pendente, mas ela existe`);
    }
  }
});

test('toda cidade fica na região que declara', () => {
  for (const c of CITIES) {
    const r = regionById(c.region);
    assert.ok(r, `${c.name} aponta para a região "${c.region}", que não existe`);
    assert.equal(regionAt(c.x, c.y)?.id, c.region, `${c.name} caiu fora de ${c.region}`);
  }
});

test('🔴 há exatamente uma capital e um vilarejo de partida', () => {
  assert.equal(CITIES.filter((c) => c.kind === 'capital').length, 1);
  assert.equal(CITIES.filter((c) => c.kind === 'village').length, 1);
  // E o nascimento é no vilarejo, não na capital: o roadmap fecha que o
  // personagem nasce num vilarejo AO REDOR de uma cidade principal.
  const berco = CITIES.find((c) => c.kind === 'village')!;
  assert.equal(berco.id, 'lumindale');
  assert.equal(berco.x, WORLD_SPAWN.x);
  assert.equal(berco.y, WORLD_SPAWN.y);
  assert.equal(cityById('arcadia')?.kind, 'capital');
});

test('🔴 cada dungeon tem os seis andares, com nomes distintos', () => {
  // Decisão do dono: descer é a progressão. Seis andares, e os quatro nomes que
  // o mapa dá ocupam o miolo — nenhum se perde e nenhum é inventado a mais.
  for (const d of DUNGEONS) {
    assert.equal(d.floors.length, DUNGEON_FLOORS, `${d.name} não tem ${DUNGEON_FLOORS} andares`);
    assert.equal(new Set(d.floors).size, DUNGEON_FLOORS, `${d.name} repete nome de andar`);
    for (const nome of d.floors) assert.ok(nome.length > 0);
  }
});

test('toda dungeon abre dentro da região que declara', () => {
  for (const d of DUNGEONS) {
    const r = regionById(d.region);
    assert.ok(r, `${d.name} aponta para "${d.region}", que não existe`);
    assert.equal(regionAt(d.x, d.y)?.id, d.region, `a entrada de ${d.name} caiu fora de ${d.region}`);
    assert.ok(d.level.min <= d.level.max);
  }
});

test('dungeon é mais dura que o campo aberto em volta', () => {
  // Se descer não valesse mais que andar por fora, ninguém desceria.
  for (const d of DUNGEONS) {
    const r = regionById(d.region)!;
    assert.ok(
      d.level.max >= r.level.max,
      `${d.name} termina no Lv.${d.level.max} e a região já vai até ${r.level.max}`,
    );
  }
});

test('nenhuma cidade nasce em cima de outra, nem de uma entrada de dungeon', () => {
  const pontos = [
    ...CITIES.map((c) => ({ nome: c.name, x: c.x, y: c.y })),
    ...DUNGEONS.map((d) => ({ nome: d.name, x: d.x, y: d.y })),
  ];
  for (let i = 0; i < pontos.length; i++) {
    for (let j = i + 1; j < pontos.length; j++) {
      const a = pontos[i]!;
      const b = pontos[j]!;
      const dist = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
      assert.ok(dist > 8, `${a.nome} e ${b.nome} estão a ${dist} tiles um do outro`);
    }
  }
});
