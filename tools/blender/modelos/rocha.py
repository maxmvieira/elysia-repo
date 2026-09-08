"""
Formação de rocha — o segundo modelo, e o primeiro que NÃO depende de textura.

🔴 POR QUE A ROCHA VEM ANTES DA ÁRVORE E DA CASA NOVA.

A `casa_enxaimel` provou a forma e esbarrou no limite honesto: o que faz a
referência bonita é pintura, não geometria. A rocha é a exceção da lista — pedra
não tem detalhe pintado que importe. Silhueta irregular, face chapada e sombra
projetada **já leem como pedra**, e é por isso que ela testa o pipeline inteiro
sem depender de ninguém saber desenhar.

📖 Medido no vídeo do mundo do Ragnarok (07/09, mapas de Payon): as formações de
rocha são **um modelo só**, repetido, girado e escalado. Não existe catálogo de
pedras — existe uma peça boa e um sistema que a espalha. Este arquivo entrega a
peça; espalhar é trabalho do cliente.

⚠️ SEM `bpy.ops`, como manda o `comum.py`: os vértices são montados na mão. Em
`--background` o contexto (objeto ativo, seleção) é fonte clássica de falha
silenciosa, e "recalcular normais pelo operador" é exatamente esse tipo de
armadilha. Aqui a normal de cada face é conferida por conta própria — ver
`_para_fora()`.

⚠️ DETERMINÍSTICO. `random.Random` com semente fixa, porque o modelo tem que
sair idêntico em toda máquina: `--factory-startup` protege contra a preferência
do usuário, e a semente protege contra o sorteio. Sem isso, dois `models:build`
dariam pedras diferentes e ninguém saberia qual está no `.glb` commitado.
"""

from __future__ import annotations

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from comum import Construtor, main  # noqa: E402

# --- Medidas, em tiles ------------------------------------------------------
#
# A referência do vídeo mostra o afloramento batendo entre a cintura e a cabeça
# do personagem, com as pedras menores encostadas na base. O herói tem 1,8125
# unidades (`comum.HEROI`), então 1,55 de altura é "na altura do ombro".

ALTURA = 1.55       # z do bloco principal
LARGURA = 2.30      # x
PROFUND = 1.75      # y

# ⚠️ ESTES NÚMEROS SÃO O NOMINAL, NÃO O RESULTADO. A ondulação multiplica o
# raio (chega a ~1,28), então o que sai é maior: 1,55 de altura vira 1,76, e a
# formação inteira mede 3,21 × 2,42 tiles por causa das pedras deslocadas.
# Confira sempre pela linha `ELYSIA tamanho_tiles` do `models:build` — mexer
# aqui às cegas é como chutar a âncora de um sprite.

#: Quantas faixas horizontais e quantos gomos. Poucos de propósito: face grande
#: e chapada é o que casa com o sprite de pixel art ao lado. Subir estes números
#: dá pedra lisa, que é justamente o que não se quer.
FAIXAS = 5
GOMOS = 9

SEMENTE = 20260907


def _para_fora(
    pontos: list[tuple[float, float, float]],
    centro: tuple[float, float, float],
) -> list[tuple[float, float, float]]:
    """
    🔴 Garante que a face aponta para FORA do miolo do sólido.

    Sem isto a rocha sai com faces invertidas e o Three — que desenha só a
    frente — mostra o interior dela. É o defeito que parece "o modelo sumiu".

    A conta é a normal pelo produto vetorial contra o vetor que sai do centro:
    se estiverem em sentidos opostos, a face está de costas e a ordem inverte.
    Vale para qualquer sólido em estrela, que é o caso de toda pedra daqui.
    """
    (ax, ay, az), (bx, by, bz), (cx, cy, cz) = pontos[0], pontos[1], pontos[2]
    u = (bx - ax, by - ay, bz - az)
    v = (cx - ax, cy - ay, cz - az)
    n = (
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
    )
    meio = (
        sum(p[0] for p in pontos) / len(pontos) - centro[0],
        sum(p[1] for p in pontos) / len(pontos) - centro[1],
        sum(p[2] for p in pontos) / len(pontos) - centro[2],
    )
    if n[0] * meio[0] + n[1] * meio[1] + n[2] * meio[2] < 0:
        return list(reversed(pontos))
    return pontos


def pedra(
    c: Construtor,
    centro: tuple[float, float, float],
    tamanho: tuple[float, float, float],
    mat: str,
    rng: random.Random,
    faixas: int = FAIXAS,
    gomos: int = GOMOS,
) -> None:
    """
    Um bloco de pedra: esfera de poucos gomos, amassada e achatada.

    O raio de cada vértice sai de uma função das DUAS coordenadas do vértice
    (faixa e gomo), nunca de um sorteio na hora — assim vértices vizinhos batem
    exatamente e a malha fecha sem fresta. O sorteio entra só no deslocamento
    do bloco inteiro, uma vez por pedra.
    """
    sx, sy, sz = (t / 2 for t in tamanho)
    # Um empurrão por vértice, estável: sorteado UMA vez e guardado.
    ruido = [[rng.uniform(-0.13, 0.13) for _ in range(gomos)] for _ in range(faixas + 1)]

    def vertice(i: int, j: int) -> tuple[float, float, float]:
        theta = math.pi * i / faixas          # 0 no topo, pi embaixo
        phi = 2 * math.pi * (j % gomos) / gomos
        # Ondulação suave: o que dá cara de rocha, e não de bola.
        r = (
            1.0
            + 0.17 * math.sin(3 * phi + 1.7 * theta)
            + 0.11 * math.sin(5 * theta + 0.6)
            + ruido[i][j % gomos]
        )
        return (
            centro[0] + sx * r * math.sin(theta) * math.cos(phi),
            centro[1] + sy * r * math.sin(theta) * math.sin(phi),
            centro[2] + sz * r * math.cos(theta),
        )

    topo = (centro[0], centro[1], centro[2] + sz * (1 + ruido[0][0]))
    base = (centro[0], centro[1], centro[2] - sz * (1 + ruido[faixas][0]))

    for i in range(faixas):
        for j in range(gomos):
            if i == 0:
                face = [topo, vertice(1, j), vertice(1, j + 1)]
            elif i == faixas - 1:
                face = [base, vertice(i, j + 1), vertice(i, j)]
            else:
                face = [
                    vertice(i, j),
                    vertice(i, j + 1),
                    vertice(i + 1, j + 1),
                    vertice(i + 1, j),
                ]
            c.poligono(_para_fora(face, centro), mat)


def construir():
    rng = random.Random(SEMENTE)
    c = Construtor()

    # --- o bloco principal ---------------------------------------------------
    pedra(c, (0.0, 0.0, ALTURA / 2), (LARGURA, PROFUND, ALTURA), "pedra", rng)

    # --- as pedras encostadas na base ---------------------------------------
    #
    # ⚠️ Elas ENTRAM no bloco principal de propósito. Pedra que só encosta deixa
    # uma linha de sombra reta na junta, e junta reta entrega que são dois
    # objetos. Afundar um terço faz as duas lerem como uma formação só.
    menores = [
        # (x, y, largura, profundidade, altura, material)
        (-1.05, 0.28, 1.15, 0.95, 0.78, "pedra_escura"),
        (0.92, -0.42, 0.95, 0.85, 0.62, "pedra"),
        (0.35, 0.72, 0.72, 0.62, 0.44, "pedra_escura"),
    ]
    for x, y, larg, prof, alt, mat in menores:
        pedra(
            c,
            (x, y, alt / 2 - alt * 0.18),
            (larg, prof, alt),
            mat,
            rng,
            faixas=4,
            gomos=7,
        )

    # --- a laje deitada -----------------------------------------------------
    #
    # Uma peça achatada e girada, que quebra a silhueta de "monte de bolas".
    # No vídeo do RO é o que aparece nas encostas: pedra chata caída de lado.
    pedra(
        c,
        (-0.55, -0.85, 0.16),
        (1.45, 1.05, 0.30),
        "pedra",
        rng,
        faixas=4,
        gomos=7,
    )

    return c.finaliza("rocha")


main("rocha", construir)
