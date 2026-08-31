import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWorldMap,
  chaoBaseEm,
  registraEdicoes,
  esqueceEdicao,
  aplicaEdicoes,
  foiEditada,
  foiApagada,
  arteCopiadaEm,
  edicoesConhecidas,
  farmDesenhaCelula,
  dentroDaFarm,
  FARM_AREA,
  TILE_TYPES,
} from '../src/index.js';

/**
 * ⚠️ **A tabela de edições é MÓDULO COM ESTADO**, como a da fazenda. Um teste
 * que registra e não limpa contamina o seguinte — e pior, contamina os testes de
 * OUTRO arquivo, porque `farmDesenhaCelula` consulta a mesma tabela.
 */
function limpa(...celulas: Array<[number, number, number]>): void {
  for (const [f, x, y] of celulas) esqueceEdicao(f, x, y);
}

test('a edição carimba o tile e some da tabela quando esquecida', () => {
  const map = buildWorldMap();
  const x = 40, y = 40;
  const antes = map.floors[0]![y * map.width + x]!;

  assert.equal(foiEditada(0, x, y), false, 'nada editado no começo');

  registraEdicoes([{ floor: 0, x, y, tile: 2, antes }]);
  const n = aplicaEdicoes(map.floors, map.width, map.height, [{ floor: 0, x, y, tile: 2 }]);

  assert.equal(n, 1);
  assert.equal(map.floors[0]![y * map.width + x], 2, 'o tile virou terra');
  assert.equal(foiEditada(0, x, y), true);

  esqueceEdicao(0, x, y);
  assert.equal(foiEditada(0, x, y), false, 'o /restaura tira da tabela');
  limpa([0, x, y]);
});

/**
 * 🔴 O teste que protege o boot. Uma edição gravada quando o mundo tinha outro
 * tamanho não pode derrubar o servidor por causa de um tile — ela é ignorada.
 */
test('edição fora do mapa ou em andar inexistente é ignorada, não estoura', () => {
  const map = buildWorldMap();
  const n = aplicaEdicoes(map.floors, map.width, map.height, [
    { floor: 0, x: -1, y: 10, tile: 1 },
    { floor: 0, x: 10, y: 99999, tile: 1 },
    { floor: 77, x: 10, y: 10, tile: 1 },
  ]);
  assert.equal(n, 0, 'nenhuma das três entrou');
});

/**
 * 🔴 **O acoplamento que faz o `/remove` funcionar dentro da fazenda.**
 *
 * Sem ele o tile mudaria (a colisão sumiria) e a arte assada continuaria
 * desenhando a árvore: um fantasma atravessável e visível. Este teste é o que
 * impede alguém de "simplificar" `farmDesenhaCelula` de volta.
 */
test('célula editada faz a fazenda parar de desenhar, e o motor volta a pintar', () => {
  // Uma célula que a fazenda DESENHA hoje — o teste não vale nada sem isso.
  let alvo: { x: number; y: number } | undefined;
  for (let y = FARM_AREA.y0; y <= FARM_AREA.y1 && !alvo; y++) {
    for (let x = FARM_AREA.x0; x <= FARM_AREA.x1; x++) {
      if (farmDesenhaCelula(x, y)) { alvo = { x, y }; break; }
    }
  }
  assert.ok(alvo, 'a fazenda desenha alguma célula');
  assert.ok(dentroDaFarm(alvo.x, alvo.y));

  registraEdicoes([{ floor: 0, x: alvo.x, y: alvo.y, tile: chaoBaseEm(alvo.x, alvo.y) }]);
  assert.equal(
    farmDesenhaCelula(alvo.x, alvo.y), false,
    'apagada, a fazenda entrega a célula de volta ao motor',
  );

  esqueceEdicao(alvo.x !== undefined ? 0 : 0, alvo.x, alvo.y);
  assert.equal(farmDesenhaCelula(alvo.x, alvo.y), true, 'restaurada, a arte volta');
});

/**
 * O substituto do `/remove` é `chaoBaseEm`, e não `grass` fixo. A diferença já
 * foi um bug de verdade neste projeto — árvore com quadrado de areia por baixo,
 * documentado no `worldgen.ts`. Aqui só se garante que o substituto é um chão
 * ANDÁVEL: remover uma árvore não pode deixar uma parede no lugar.
 */
test('o chão que substitui o removido é sempre andável', () => {
  for (const [x, y] of [[10, 10], [150, 158], [250, 40], [FARM_AREA.x0 + 5, FARM_AREA.y0 + 5]] as const) {
    const t = TILE_TYPES[chaoBaseEm(x, y)];
    assert.ok(t, `(${x},${y}) devolve um tipo de tile conhecido`);
    assert.equal(t.solid, false, `(${x},${y}) vira chão andável, não parede`);
  }
});

test('edicoesConhecidas devolve o que foi registrado', () => {
  registraEdicoes([{ floor: 0, x: 7, y: 7, tile: 1 }]);
  assert.ok(edicoesConhecidas().some((e) => e.x === 7 && e.y === 7));
  esqueceEdicao(0, 7, 7);
  assert.equal(edicoesConhecidas().some((e) => e.x === 7 && e.y === 7), false);
});

/**
 * 🔴 **A distinção que o `/paste` introduziu, e a mais fácil de quebrar.**
 *
 * "Editada" e "apagada" não são a mesma coisa. Célula que RECEBEU arte copiada
 * está editada e continua sendo desenhada pela fazenda; célula do `/remove` está
 * editada e some. Trocar `foiApagada` por `foiEditada` no `farmDesenhaCelula`
 * apagaria justamente o que se acabou de colar — e em silêncio.
 */
test('célula com arte colada continua sendo desenhada; célula apagada, não', () => {
  let alvo: { x: number; y: number } | undefined;
  for (let y = FARM_AREA.y0; y <= FARM_AREA.y1 && !alvo; y++) {
    for (let x = FARM_AREA.x0; x <= FARM_AREA.x1; x++) {
      if (farmDesenhaCelula(x, y)) { alvo = { x, y }; break; }
    }
  }
  assert.ok(alvo, 'a fazenda desenha alguma célula');

  const origem = { x: alvo.x + 1, y: alvo.y };

  // /paste: editada COM arte -> a fazenda continua desenhando
  registraEdicoes([{ floor: 0, x: alvo.x, y: alvo.y, tile: 2, arte: origem }]);
  assert.equal(foiEditada(0, alvo.x, alvo.y), true, 'está editada');
  assert.equal(foiApagada(0, alvo.x, alvo.y), false, 'mas NÃO está apagada');
  assert.equal(
    farmDesenhaCelula(alvo.x, alvo.y), true,
    '🔴 a fazenda continua desenhando — os pixels colados moram nela',
  );
  assert.deepEqual(arteCopiadaEm(0, alvo.x, alvo.y), origem);

  // /remove: editada SEM arte -> a fazenda entrega a célula ao motor
  registraEdicoes([{ floor: 0, x: alvo.x, y: alvo.y, tile: 1 }]);
  assert.equal(foiApagada(0, alvo.x, alvo.y), true);
  assert.equal(farmDesenhaCelula(alvo.x, alvo.y), false);
  assert.equal(arteCopiadaEm(0, alvo.x, alvo.y), undefined);

  esqueceEdicao(0, alvo.x, alvo.y);
  assert.equal(farmDesenhaCelula(alvo.x, alvo.y), true, 'desfeito, a arte original volta');
});
