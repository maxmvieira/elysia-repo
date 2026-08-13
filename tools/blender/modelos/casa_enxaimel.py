"""
Casa de enxaimel — o primeiro modelo, e ele é um TESTE.

🔴 A pergunta que este arquivo existe para responder: **até onde chega modelo
gerado por script?** O dono mandou em 13/08 uma prancha de referência com casa
de enxaimel, base de pedra, telhado de duas águas e chaminé, e perguntou se dá
para chegar naquele nível. A resposta honesta é que **aquele nível é PINTURA,
não geometria** — o que faz a referência bonita é a madeira gasta, o musgo e o
reboco sujo, e nada disso é forma.

Então isto entrega a FORMA, com cor chapada, para o dono julgar a base antes de
qualquer investimento em textura. Se a silhueta e as proporções agradarem, o
caminho seguinte é textura. Se não agradarem, descobrimos com um arquivo.

⚠️ A FRENTE DA CASA FICA EM **−Y**, e o motivo é geométrico: o exportador
converte Z-up em Y-up com `(x, y, z) → (x, z, −y)`, então o **−Y do Blender vira
o +Z do Three**, que é o lado de onde a câmera fixa olha. Porta virada para +Y
sairia de costas para o jogador.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from comum import Construtor, main  # noqa: E402

# --- Medidas, em tiles ------------------------------------------------------
# A referência mostra a casa ocupando ~5 tiles de largura, com o personagem
# batendo pouco acima da metade da porta.

LARG = 4.6          # x
PROF = 3.6          # y
H_PEDRA = 0.75      # base de pedra
H_PAREDE = 3.45     # topo da parede (do chão) — DOIS andares
H_TELHADO = 1.25
BEIRA = 0.30        # o quanto o telhado avança além da parede

# 🔴 A PRIMEIRA TENTATIVA ERROU AQUI, e o erro só apareceu em tela.
#
# Com `H_PAREDE = 2.70` e `H_TELHADO = 1.55` a casa ficou com um andar e um
# telhado enorme — e a 52° a água do telhado fica quase de frente para a
# câmera, então ela ocupava a tela inteira e sobrava uma tira de enxaimel
# embaixo. Na referência a casa tem DOIS andares de parede e o telhado é mais
# baixo que eles.
#
# ⚠️ A regra que sai disso: **em câmera inclinada, altura de telhado custa mais
# tela que altura de parede.** Vale para toda estrutura que vier depois.
VIGA = 0.16         # espessura das madeiras aparentes
SALTO = 0.04        # o quanto a viga sobressai do reboco


def construir():
    c = Construtor()

    # --- base de pedra, um pouco mais larga que a parede ---------------------
    c.caixa((LARG + 0.14, PROF + 0.14, H_PEDRA), (0, 0, H_PEDRA / 2), "pedra")

    # --- corpo rebocado ------------------------------------------------------
    h_corpo = H_PAREDE - H_PEDRA
    c.caixa((LARG, PROF, h_corpo), (0, 0, H_PEDRA + h_corpo / 2), "reboco")

    # --- enxaimel ------------------------------------------------------------
    # As madeiras ficam à frente do reboco por `SALTO`, senão o z-fighting faz
    # a viga piscar contra a parede — é o mesmo problema de duas faces no mesmo
    # plano que já apareceu no composto do leste, em 12/08.
    frente = -PROF / 2 - SALTO
    tras = PROF / 2 + SALTO
    esq = -LARG / 2 - SALTO
    dir_ = LARG / 2 + SALTO

    def viga_v(x: float, y: float, z0: float, z1: float, eixo: str = "y") -> None:
        """Montante. `eixo` diz de que face ela sai."""
        h = z1 - z0
        tam = (VIGA, VIGA, h) if eixo == "y" else (VIGA, VIGA, h)
        c.caixa(tam, (x, y, z0 + h / 2), "madeira")

    def viga_h(y: float, z: float, comprimento: float, x: float = 0.0) -> None:
        c.caixa((comprimento, VIGA, VIGA), (x, y, z), "madeira")

    def viga_h_lado(x: float, z: float, comprimento: float) -> None:
        c.caixa((VIGA, comprimento, VIGA), (x, 0, z), "madeira")

    z_meio = H_PEDRA + h_corpo * 0.52

    for y in (frente, tras):
        # montantes: dois cantos e dois intermediários
        for x in (-LARG / 2 + VIGA / 2, -LARG / 6, LARG / 6, LARG / 2 - VIGA / 2):
            viga_v(x, y, H_PEDRA, H_PAREDE)
        # travessas: no pé, no meio e no topo
        for z in (H_PEDRA + VIGA / 2, z_meio, H_PAREDE - VIGA / 2):
            viga_h(y, z, LARG)
        # escoras em diagonal nos painéis das pontas — é o que faz ler como
        # enxaimel e não como grade
        for lado in (-1, 1):
            c.caixa(
                (LARG * 0.30, VIGA, VIGA),
                (lado * LARG * 0.33, y, (z_meio + H_PAREDE) / 2),
                "madeira",
                rot=(0.0, lado * 0.62, 0.0),
            )

    for x in (esq, dir_):
        for y_ in (-PROF / 2 + VIGA / 2, 0.0, PROF / 2 - VIGA / 2):
            c.caixa((VIGA, VIGA, h_corpo), (x, y_, H_PEDRA + h_corpo / 2), "madeira")
        for z in (H_PEDRA + VIGA / 2, z_meio, H_PAREDE - VIGA / 2):
            viga_h_lado(x, z, PROF)

    # --- porta, na frente ----------------------------------------------------
    l_porta, h_porta = 0.62, 1.30
    c.caixa((l_porta, 0.10, h_porta), (0, frente - 0.03, h_porta / 2), "madeira")
    # umbral e verga, um pouco maiores, para a porta ter moldura
    c.caixa((l_porta + 0.18, 0.07, VIGA), (0, frente - 0.01, h_porta + VIGA / 2), "madeira_clara")

    # --- janelas, um par por andar -------------------------------------------
    def janela(x: float, z: float) -> None:
        c.caixa((0.52, 0.08, 0.52), (x, frente - 0.02, z), "vidro")
        # caixilho em cruz
        c.caixa((0.60, 0.06, 0.07), (x, frente - 0.05, z), "madeira_clara")
        c.caixa((0.07, 0.06, 0.60), (x, frente - 0.05, z), "madeira_clara")

    z_terreo = H_PEDRA + h_corpo * 0.26
    z_superior = H_PEDRA + h_corpo * 0.74
    for x in (-LARG * 0.30, LARG * 0.30):
        janela(x, z_superior)
    # No térreo a porta ocupa o meio, então só as pontas ganham janela.
    for x in (-LARG * 0.34, LARG * 0.34):
        janela(x, z_terreo)
    # uma janela em cada lateral e por andar, para a casa não ser cega de perfil
    for x in (esq - 0.02, dir_ + 0.02):
        for z in (z_terreo, z_superior):
            c.caixa((0.08, 0.52, 0.52), (x, 0, z), "vidro")

    # --- telhado de duas águas ----------------------------------------------
    c.prisma_telhado(
        largura=LARG + BEIRA * 2,
        profundidade=PROF + BEIRA * 2,
        altura=H_TELHADO,
        base_z=H_PAREDE,
        mat_agua="telha",
        mat_empena="telha_escura",
        espessura=0.10,
    )
    # cumeeira: uma viga fina no topo, que marca a aresta e some o serrilhado
    c.caixa((LARG + BEIRA * 2, 0.12, 0.12), (0, 0, H_PAREDE + H_TELHADO), "telha_escura")

    # --- chaminé -------------------------------------------------------------
    x_cham = LARG / 2 - 0.62
    c.caixa((0.52, 0.52, 2.05), (x_cham, -0.35, H_PAREDE - 0.3 + 2.05 / 2), "pedra_escura")
    c.caixa((0.66, 0.66, 0.16), (x_cham, -0.35, H_PAREDE - 0.3 + 2.05), "pedra")

    return c.finaliza("casa_enxaimel")


main("casa_enxaimel", construir)
