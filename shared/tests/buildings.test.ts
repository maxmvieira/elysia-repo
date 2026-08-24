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
import { ANDARES, achaNaPlanta } from '../src/buildings.js';

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

test('a porta é um VÃO andável, e NÃO um teleporte', () => {
  const terreo = ANDARES.find((a) => a.floor === 0)!;
  const porta = achaNaPlanta(terreo, 'e')!;

  assert.ok(
    isWalkable(map, porta.x, porta.y, 0),
    'porta sólida = casa sem entrada',
  );
  /*
   * 🔴 Sem link, e isto é o coração do jeito Tibia. Entrar não pode trocar o
   * mapa: o dono viu a versão com teleporte e cortou — entrar "mudava
   * totalmente o ambiente". Se alguém devolver um link aqui, a casa volta a
   * ficar estranha de entrar e este teste é quem avisa.
   */
  assert.ok(
    !floorLinkAt(map, porta.x, porta.y, 0),
    'a porta virou teleporte de novo; ela tem de ser só um vão na parede',
  );
});

test('todo tile livre da planta é alcançável — nada de cômodo ilhado', () => {
  for (const a of ANDARES) {
    const partida = a.floor === 0
      // No térreo se entra pelo VÃO da porta, andando.
      ? achaNaPlanta(a, 'e')!
      // Nos andares de cima se chega pela escada.
      : achaNaPlanta(a, '<')!;

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
  const porta = achaNaPlanta(terreo, 'e')!;
  const vistos = alcancaveis(porta.x, porta.y, terreo.floor);
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

test('andar de CIMA é ilha: fora da planta não se anda', () => {
  /*
   * ⚠️ Só vale para andar > 0, e a razão mudou em 16/08.
   *
   * Quando o interior inteiro morava num andar separado, fora da planta era
   * `VOID` e sair dela seria andar no nada. Com o térreo mudando para o andar 0
   * — o jeito Tibia —, **fora da casa é a rua**, e andar ali é justamente o que
   * tem de funcionar. O que segura o jogador dentro do térreo é a parede da
   * própria planta, e isso o teste de alcançabilidade já cobre.
   */
  for (const a of ANDARES) {
    if (a.floor === 0) continue;
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

test('o térreo é fechado por PAREDE — só se entra pela porta', () => {
  /*
   * O que o teste acima garantia por `VOID` no andar de cima, aqui tem de vir
   * da planta: se a borda tiver um buraco que não seja a porta, o jogador entra
   * atravessando a fachada e o telhado nem some.
   */
  const a = ANDARES.find((t) => t.floor === 0)!;
  const larg = a.planta[0]!.length, alt = a.planta.length;
  const aberturas: string[] = [];
  for (let ly = 0; ly < alt; ly++) {
    for (let lx = 0; lx < larg; lx++) {
      const naBorda = lx === 0 || ly === 0 || lx === larg - 1 || ly === alt - 1;
      if (!naBorda) continue;
      if (a.planta[ly]![lx] === 'e') continue; // a porta
      if (isWalkable(map, a.x0 + lx, a.y0 + ly, 0)) aberturas.push(`(${lx},${ly})`);
    }
  }
  assert.equal(aberturas.length, 0, `buraco na fachada em ${aberturas.join(' ')}`);
});
