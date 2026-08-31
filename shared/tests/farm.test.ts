import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWorldMap,
  isWalkable,
  floorLinkAt,
  tileAt,
  getTileType,
  FARM_AREA,
  FARM_BICHOS,
  FARM_LIGACOES,
  FARM_INTERIORES,
  dentroDaFarm,
  farmDesenhaCelula,
  interiorEm,
  type GameMap,
} from '../src/index.js';
import { CREATURES } from '../src/combat.js';

const map = buildWorldMap();

/** Tudo que se alcança a pé a partir de uma célula, no mesmo andar. */
function alcancavel(m: GameMap, x0: number, y0: number, floor: number): Uint8Array {
  const vis = new Uint8Array(m.width * m.height);
  const fila = [y0 * m.width + x0];
  vis[fila[0]!] = 1;
  while (fila.length) {
    const i = fila.pop()!;
    const x = i % m.width;
    const y = (i / m.width) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= m.width || ny >= m.height) continue;
      const j = ny * m.width + nx;
      if (vis[j] || !isWalkable(m, nx, ny, floor)) continue;
      vis[j] = 1;
      fila.push(j);
    }
  }
  return vis;
}

const doSpawn = alcancavel(map, map.spawn.x, map.spawn.y, 0);

// ---------------------------------------------------------------------------
// Chegar lá
// ---------------------------------------------------------------------------

test('🔴 dá para chegar na fazenda a pé, do ponto de nascimento', () => {
  // A fazenda foi posta colada na praça justamente para isso. Se um dia ela
  // ficar cercada de água ou de árvore, este teste cai antes de alguém andar
  // dez minutos até descobrir.
  let algum = false;
  for (let y = FARM_AREA.y0; y <= FARM_AREA.y1 && !algum; y++) {
    for (let x = FARM_AREA.x0; x <= FARM_AREA.x1; x++) {
      if (doSpawn[y * map.width + x]) { algum = true; break; }
    }
  }
  assert.ok(algum, 'nenhuma célula da fazenda é alcançável a pé do nascimento');
});

test('🔴 nenhuma ÁREA de tamanho útil fica ilhada dentro da fazenda', () => {
  /*
   * 🔴 O que este teste protege é o defeito que já aconteceu duas vezes: uma
   * HORTA inteira murada pelos pomares, visível e sem rota. Foram 59 células na
   * primeira vez e 65 e 18 na segunda, quando as árvores ficaram sólidas.
   *
   * ⚠️ **Contar o total de células ilhadas não serve** — foi a primeira versão
   * deste teste e ela quebrou pelo motivo errado. Fica sempre algum recanto de
   * 2 a 4 células entre a cerca-viva e uma parede, e ninguém sente falta deles;
   * o que importa é que nenhum PEDAÇO GRANDE se solte.
   *
   * Então a medida é o tamanho da MAIOR ilha, e o limite fica logo acima do
   * maior curral (14 células, o da vaca) — que é fechado de propósito, pelo
   * portão sólido. Qualquer horta perdida passa de 16 e cai aqui.
   */
  const LIMITE = 16;
  const vistos = new Set<number>();
  for (let y = FARM_AREA.y0; y <= FARM_AREA.y1; y++) {
    for (let x = FARM_AREA.x0; x <= FARM_AREA.x1; x++) {
      const i0 = y * map.width + x;
      if (vistos.has(i0) || !isWalkable(map, x, y, 0) || doSpawn[i0]) continue;
      // Uma ilha nova: mede o tamanho dela inteira.
      const fila = [i0];
      vistos.add(i0);
      const cels: number[] = [];
      while (fila.length) {
        const i = fila.pop()!;
        cels.push(i);
        const cx = i % map.width;
        const cy = (i / map.width) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = cx + dx;
          const ny = cy + dy;
          const j = ny * map.width + nx;
          if (vistos.has(j) || !isWalkable(map, nx, ny, 0)) continue;
          vistos.add(j);
          fila.push(j);
        }
      }
      assert.ok(
        cels.length <= LIMITE,
        `${cels.length} células ilhadas em volta de (${x},${y})`
        + ' — uma área inteira da fazenda ficou sem rota',
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Os bichos
// ---------------------------------------------------------------------------

test('🔴 todo bicho do curral nasce em chão andável', () => {
  // Bicho carimbado em cima de cerca fica preso para sempre, sem nunca dar erro.
  for (const b of FARM_BICHOS) {
    assert.ok(
      isWalkable(map, b.x, b.y, 0),
      `${b.type} em (${b.x},${b.y}) não é chão andável`,
    );
  }
});

test('a espécie de todo bicho da fazenda existe em CREATURES', () => {
  // O servidor derruba o boot se não existir, que é o certo — mas descobrir
  // aqui é mais barato que descobrir subindo o jogo.
  for (const b of FARM_BICHOS) {
    assert.ok(CREATURES[b.type], `espécie "${b.type}" não existe em CREATURES`);
  }
});

test('🔴 os bichos ficam DENTRO do cercado, não soltos na fazenda', () => {
  /*
   * A razão de a cerca ser separada por TILE e não por camada: as cercas dos
   * currais moram na camada `beds`, junto com os canteiros da horta. Tratar a
   * camada inteira como chão deixava os três currais abertos dos quatro lados, e
   * os bichos sairiam andando no primeiro tick.
   *
   * O sinal de que estão presos: a área que cada um alcança a pé é PEQUENA. Solto
   * na fazenda, ele alcançaria mais de mil células.
   */
  for (const b of FARM_BICHOS) {
    const solta = alcancavel(map, b.x, b.y, 0);
    let n = 0;
    for (let i = 0; i < solta.length; i++) n += solta[i]!;
    assert.ok(n < 60, `${b.type} em (${b.x},${b.y}) alcança ${n} células — o curral está aberto`);
  }
});

// ---------------------------------------------------------------------------
// Entrar e sair
// ---------------------------------------------------------------------------

test('🔴 dá para ENTRAR em toda construção que tem interior', () => {
  for (const l of FARM_LIGACOES) {
    const chega = l.entradas.some((e) => doSpawn[e.y * map.width + e.x]);
    assert.ok(chega, `a porta do ${l.nome} não é alcançável a pé do nascimento`);
  }
});

test('🔴 toda porta é um gatilho de verdade, e leva para dentro', () => {
  for (const l of FARM_LIGACOES) {
    for (const e of l.entradas) {
      const link = floorLinkAt(map, e.x, e.y, 0);
      assert.ok(link, `(${e.x},${e.y}) do ${l.nome} não tem floorLink`);
      assert.equal(link.toFloor, l.pousoDentro.floor);
    }
  }
});

test('🔴 o pouso NUNCA é gatilho — senão entra e sai para sempre', () => {
  /*
   * O `FloorLink` do motor documenta que a célula de pouso "não é gatilho", e é
   * uma exigência: pousar em cima da própria porta faria o jogador saltar entre
   * os dois andares a cada quadro, sem conseguir parar.
   */
  for (const l of FARM_LIGACOES) {
    assert.equal(
      floorLinkAt(map, l.pousoDentro.x, l.pousoDentro.y, l.pousoDentro.floor),
      undefined,
      `o pouso de dentro do ${l.nome} é gatilho`,
    );
    assert.equal(
      floorLinkAt(map, l.pousoFora.x, l.pousoFora.y, l.pousoFora.floor),
      undefined,
      `o pouso de fora do ${l.nome} é gatilho`,
    );
  }
});

test('🔴 os dois pousos e a saída são chão andável', () => {
  for (const l of FARM_LIGACOES) {
    assert.ok(
      isWalkable(map, l.pousoDentro.x, l.pousoDentro.y, l.pousoDentro.floor),
      `o pouso de dentro do ${l.nome} é sólido — entrar prenderia o jogador na parede`,
    );
    assert.ok(
      isWalkable(map, l.saidaDentro.x, l.saidaDentro.y, l.saidaDentro.floor),
      `a saída do ${l.nome} é sólida — quem entrasse não sairia`,
    );
    assert.ok(
      isWalkable(map, l.pousoFora.x, l.pousoFora.y, l.pousoFora.floor),
      `o pouso de fora do ${l.nome} é sólido`,
    );
  }
});

test('🔴 do pouso dentro dá para chegar na saída, andando', () => {
  // Interior mobiliado demais pode trancar o jogador entre uma estante e a
  // parede. Aqui o caminho é conferido de verdade, não presumido.
  for (const l of FARM_LIGACOES) {
    const dentro = alcancavel(map, l.pousoDentro.x, l.pousoDentro.y, l.pousoDentro.floor);
    assert.ok(
      dentro[l.saidaDentro.y * map.width + l.saidaDentro.x],
      `no ${l.nome}, do pouso não se alcança a saída — o jogador ficaria preso lá dentro`,
    );
  }
});

test('a saída devolve o jogador para fora, no andar 0', () => {
  for (const l of FARM_LIGACOES) {
    const link = floorLinkAt(map, l.saidaDentro.x, l.saidaDentro.y, l.saidaDentro.floor);
    assert.ok(link, `a saída do ${l.nome} não tem floorLink`);
    assert.equal(link.toFloor, 0);
    assert.equal(link.toX, l.pousoFora.x);
    assert.equal(link.toY, l.pousoFora.y);
  }
});

// ---------------------------------------------------------------------------
// Geometria
// ---------------------------------------------------------------------------

test('os interiores não se sobrepõem no andar de cima', () => {
  for (const a of FARM_INTERIORES) {
    for (const b of FARM_INTERIORES) {
      if (a === b || a.andar !== b.andar) continue;
      const cruza = a.area.x0 <= b.area.x1 && a.area.x1 >= b.area.x0
        && a.area.y0 <= b.area.y1 && a.area.y1 >= b.area.y0;
      assert.equal(cruza, false, `os interiores "${a.nome}" e "${b.nome}" se sobrepõem`);
    }
  }
});

// ---------------------------------------------------------------------------
// Quem desenha o quê — a faixa preta de 30/08
// ---------------------------------------------------------------------------

test('🔴 nenhuma célula da fazenda fica sem ninguém para desenhar', () => {
  /*
   * 🔴 O defeito: o cliente desligava o desenho por regra em TODO o retângulo da
   * fazenda (`dentroDaFarm`), mas a arte assada não cobria o retângulo inteiro —
   * as camadas de bicho tinham tiles transparentes numa fileira que ninguém via,
   * e o bounding box crescia por causa deles. O resultado era uma **faixa preta**
   * em volta da fazenda.
   *
   * A invariante que sobrou: célula não coberta pela fazenda tem que ser
   * desenhável pelo motor, e o motor só sabe desenhar chão de tile — então ela
   * não pode ser sólida, ou ele poria um bloco 2.5D de madeira ali.
   */
  for (let y = FARM_AREA.y0; y <= FARM_AREA.y1; y++) {
    for (let x = FARM_AREA.x0; x <= FARM_AREA.x1; x++) {
      if (farmDesenhaCelula(x, y)) continue;
      assert.ok(
        isWalkable(map, x, y, 0),
        `(${x},${y}) não é desenhada pela fazenda E é sólida — o motor poria um bloco de madeira ali`,
      );
    }
  }
});

test('🔴 toda célula que o MOTOR desenha na fazenda está carimbada como grama', () => {
  /*
   * Onde a fazenda deixa buraco, quem pinta é o `desenhaChao` do cliente — e ele
   * escolhe a textura pelo TIPO DO TILE. Carimbar terra batida numa dessas
   * células poria um retalho marrom no meio do gramado da borda, que é o mesmo
   * remendo que o conserto de 30/08 veio desfazer.
   */
  for (let y = FARM_AREA.y0; y <= FARM_AREA.y1; y++) {
    for (let x = FARM_AREA.x0; x <= FARM_AREA.x1; x++) {
      if (farmDesenhaCelula(x, y)) continue;
      assert.equal(
        getTileType(tileAt(map, x, y, 0)).name,
        'grass',
        `(${x},${y}) é desenhada pelo motor mas não está carimbada como grama`,
      );
    }
  }
});

test('🔴 a borda da fazenda é GRAMADO, não terra batida', () => {
  /*
   * O sinal de que a costura com o campo continua de pé. A fazenda é cercada por
   * uma faixa de grama — repintada no `farm:build` com a textura do próprio
   * jogo. Se ela virar terra, a fazenda volta a ser um retângulo marrom colado
   * no meio do pasto, e no mapa da tecla M, uma mancha.
   */
  const larguraDaBorda = FARM_AREA.x1 - FARM_AREA.x0 + 1;
  let grama = 0;
  for (let x = FARM_AREA.x0; x <= FARM_AREA.x1; x++) {
    if (getTileType(tileAt(map, x, FARM_AREA.y0, 0)).name === 'grass') grama++;
  }
  assert.ok(
    grama > larguraDaBorda - 12,
    `só ${grama} de ${larguraDaBorda} células da fileira de cima são grama — a borda deixou de ser gramado`,
  );
});

test('a fazenda não invade a praça segura', () => {
  // A praça vai de 138 a 162 em volta de (150,158). A fazenda começa em 163 —
  // encostada, e é o que o dono pediu, mas sem carimbar por cima dos NPCs.
  assert.ok(FARM_AREA.x0 > 162, `a fazenda começa em x=${FARM_AREA.x0}, dentro da praça`);
});

test('dentroDaFarm e interiorEm concordam com as áreas declaradas', () => {
  assert.ok(dentroDaFarm(FARM_AREA.x0, FARM_AREA.y0));
  assert.ok(dentroDaFarm(FARM_AREA.x1, FARM_AREA.y1));
  assert.equal(dentroDaFarm(FARM_AREA.x0 - 1, FARM_AREA.y0), false);
  assert.equal(dentroDaFarm(FARM_AREA.x1 + 1, FARM_AREA.y1), false);
  for (const i of FARM_INTERIORES) {
    assert.equal(interiorEm(i.area.x0, i.area.y0, i.andar)?.nome, i.nome);
    // O mesmo ponto no andar 0 é fazenda ou campo, nunca interior.
    assert.equal(interiorEm(i.area.x0, i.area.y0, 0), undefined);
  }
});
