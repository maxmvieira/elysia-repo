/**
 * Testes das PLANTAS da casa.
 *
 * 🔴 Existem por causa de um bug que passou por typecheck, por 466 testes e por
 * uma revisão minha, e só apareceu quando o dono jogou: eu escrevi a coluna 8 da
 * planta do térreo como parede em TODAS as linhas, e a escada ficou murada —
 * metade da casa inalcançável. Escrevi a planta errada **duas vezes seguidas**,
 * do mesmo jeito.
 *
 * O que salva disso não é ler com mais atenção, é um teste que ande pela planta.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildWorldMap } from '../src/worldgen.js';
import { isWalkable, floorLinkAt } from '../src/tiles.js';
import { ANDARES, PORTA_DA_CASA, achaNaPlanta } from '../src/buildings.js';

const map = buildWorldMap();

/** Tiles alcançáveis a pé (4 direções) a partir de um ponto, num andar. */
function alcancaveis(x: number, y: number, floor: number): Set<string> {
  const vistos = new Set<string>([`${x},${y}`]);
  const fila = [{ x, y }];
  while (fila.length) {
    const p = fila.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = p.x + dx, ny = p.y + dy, k = `${nx},${ny}`;
      if (vistos.has(k) || !isWalkable(map, nx, ny, floor)) continue;
      vistos.add(k);
      fila.push({ x: nx, y: ny });
    }
  }
  return vistos;
}

test('a soleira da casa é andável e tem link — senão a porta nunca abre', () => {
  assert.ok(
    isWalkable(map, PORTA_DA_CASA.x, PORTA_DA_CASA.y, 0),
    'o servidor barra o passo ANTES de olhar o link; soleira sólida = porta morta',
  );
  assert.ok(floorLinkAt(map, PORTA_DA_CASA.x, PORTA_DA_CASA.y, 0));
});

test('todo tile livre da planta é alcançável — nada de cômodo ilhado', () => {
  for (const a of ANDARES) {
    const partida = a.floor === 1
      // No térreo, entra-se pela porta.
      ? (() => { const l = floorLinkAt(map, PORTA_DA_CASA.x, PORTA_DA_CASA.y, 0)!; return { x: l.toX, y: l.toY }; })()
      // Nos outros, chega-se pela escada.
      : (() => { const d = achaNaPlanta(a, '<')!; return d; })();

    const vistos = alcancaveis(partida.x, partida.y, a.floor);

    const ilhados: string[] = [];
    for (let ly = 0; ly < a.planta.length; ly++) {
      for (let lx = 0; lx < a.planta[ly]!.length; lx++) {
        const x = a.x0 + lx, y = a.y0 + ly;
        if (!isWalkable(map, x, y, a.floor)) continue;
        if (!vistos.has(`${x},${y}`)) ilhados.push(`(${lx},${ly})`);
      }
    }
    assert.equal(
      ilhados.length, 0,
      `${a.arquivo}: ${ilhados.length} tiles livres inalcançáveis — ${ilhados.slice(0, 8).join(' ')}`,
    );
  }
});

test('a escada é alcançável de dentro da casa — o bug de 14/08', () => {
  const terreo = ANDARES.find((a) => a.arquivo === 'terreo')!;
  const porta = floorLinkAt(map, PORTA_DA_CASA.x, PORTA_DA_CASA.y, 0)!;
  const vistos = alcancaveis(porta.toX, porta.toY, terreo.floor);
  const escada = achaNaPlanta(terreo, '>')!;
  assert.ok(
    vistos.has(`${escada.x},${escada.y}`),
    'a escada ficou murada: dá para entrar na casa mas não para subir',
  );
});

test('pouso de link nunca é gatilho — senão vira porta giratória', () => {
  for (const l of map.floorLinks) {
    assert.ok(
      !floorLinkAt(map, l.toX, l.toY, l.toFloor),
      `o link de (${l.x},${l.y}) pousa em cima de outro gatilho`,
    );
    assert.ok(
      isWalkable(map, l.toX, l.toY, l.toFloor),
      `o link de (${l.x},${l.y}) pousa em tile sólido — o jogador ficaria preso`,
    );
  }
});

test('em volta da planta o andar continua sólido — não se sai voando', () => {
  for (const a of ANDARES) {
    const larg = a.planta[0]!.length, alt = a.planta.length;
    for (let lx = -1; lx <= larg; lx++) {
      for (const ly of [-1, alt]) {
        assert.ok(
          !isWalkable(map, a.x0 + lx, a.y0 + ly, a.floor),
          `${a.arquivo}: dá para andar fora da planta em (${lx},${ly})`,
        );
      }
    }
  }
});
