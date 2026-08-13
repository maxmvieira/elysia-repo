"""
Convenções do Elysia para modelos 3D — o módulo que todo gerador importa.

🔴 ESTE ARQUIVO É O QUE IMPEDE OS BUGS QUE O PROJETO JÁ PAGOU EM 2D.

Três deles vão acontecer de novo em 3D se ninguém travar a regra aqui:

1. **A ESCALA.** 1 unidade do Blender = 1 tile do jogo = 32 px de arte. O herói
   tem 58 px de altura, logo 1,8125 unidades. Modelar "no olho" e escalar
   depois é como o `TARGET_H` fracionário de 10/08: some o motivo, fica o
   número errado.
2. **A ORIGEM.** Todo modelo sai com a BASE em z=0 e centrado em x/y. É a
   lição do `spritebox.ts` (05/08): tratar a moldura como se fosse a arte fez a
   árvore boiar acima da própria sombra. Em 3D o mesmo erro põe a casa enterrada
   ou flutuando, e o conserto tem que ser por construção — `assenta()` — não por
   lembrança de quem exportou.
3. **O EIXO.** Blender é Z-up; glTF e Three.js são Y-up. O exportador converte
   quando `export_yup=True`. Errar isso deita o mundo inteiro de lado, e o
   sintoma parece problema do carregador.

⚠️ Verificado contra a API real (sonda de 13/08): Blender 5.2.0 LTS,
Python 3.13. `export_scene.gltf` existe e aceita `export_format`, `export_yup`,
`export_apply` e `export_materials`.
"""

from __future__ import annotations

import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

# ---------------------------------------------------------------------------
# Medidas do jogo — os mesmos números de `shared/constants.ts` e `heroes.ts`
# ---------------------------------------------------------------------------

#: Lado do tile lógico, em px de arte. `shared/src/constants.ts`.
TILE_PX = 32
#: Altura do corpo do herói, em px. `CONTENT_H` de `client/src/heroes.ts`.
HEROI_PX = 58
#: Altura do herói em unidades do Blender. Referência de escala de tudo.
HEROI = HEROI_PX / TILE_PX  # 1.8125


def tiles(n: float) -> float:
    """Converte tiles em unidades. Existe para o gerador falar em tiles."""
    return n


def px(n: float) -> float:
    """Converte px de arte em unidades. Útil para detalhe fino."""
    return n / TILE_PX


# ---------------------------------------------------------------------------
# Paleta — puxada das cores que o jogo já usa
# ---------------------------------------------------------------------------

#: sRGB 0..1. ⚠️ O Blender trabalha em linear; `_srgb_para_linear` converte.
PALETA: dict[str, tuple[float, float, float]] = {
    "pedra": (0.478, 0.494, 0.510),
    "pedra_escura": (0.361, 0.380, 0.400),
    "reboco": (0.851, 0.796, 0.682),
    "madeira": (0.302, 0.204, 0.129),
    "madeira_clara": (0.482, 0.345, 0.216),
    "telha": (0.435, 0.204, 0.157),
    "telha_escura": (0.318, 0.145, 0.114),
    "vidro": (0.192, 0.271, 0.310),
    "folha": (0.290, 0.478, 0.227),
    "folha_escura": (0.208, 0.361, 0.176),
    "tronco": (0.420, 0.290, 0.184),
}


def _srgb_para_linear(c: float) -> float:
    """🔴 Sem isto toda cor sai LAVADA no jogo — o Blender guarda em linear."""
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def material(nome: str) -> bpy.types.Material:
    """Material fosco e liso, do jeito que casa com pixel art ao lado."""
    existente = bpy.data.materials.get(nome)
    if existente is not None:
        return existente
    cor = PALETA.get(nome, (1.0, 0.0, 1.0))  # magenta = cor que faltou na paleta
    mat = bpy.data.materials.new(nome)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is not None:
        lin = tuple(_srgb_para_linear(c) for c in cor)
        bsdf.inputs["Base Color"].default_value = (*lin, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.92
        bsdf.inputs["Metallic"].default_value = 0.0
    return mat


# ---------------------------------------------------------------------------
# Construtor — uma malha só, montada em Python
# ---------------------------------------------------------------------------


class Construtor:
    """
    Acumula peças e emite UMA malha no fim.

    🔴 Por que uma malha só, e não vários objetos com `join`: `bpy.ops.*` depende
    de contexto (objeto ativo, seleção), e em `--background` o contexto é uma
    fonte clássica de falha silenciosa. Montando os vértices na mão o resultado
    é determinístico e não depende de estado nenhum do Blender.
    """

    def __init__(self) -> None:
        self.verts: list[tuple[float, float, float]] = []
        self.faces: list[tuple[int, ...]] = []
        self.mat_da_face: list[int] = []
        self.materiais: list[str] = []

    def _slot(self, nome: str) -> int:
        if nome not in self.materiais:
            self.materiais.append(nome)
        return self.materiais.index(nome)

    def caixa(
        self,
        tamanho: tuple[float, float, float],
        centro: tuple[float, float, float],
        mat: str,
        rot: tuple[float, float, float] = (0.0, 0.0, 0.0),
    ) -> None:
        """Uma caixa, opcionalmente girada (radianos, XYZ)."""
        sx, sy, sz = (t / 2 for t in tamanho)
        locais = [
            (-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz),
            (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz),
        ]
        m = Matrix.Translation(Vector(centro)) @ (
            Matrix.Rotation(rot[2], 4, "Z")
            @ Matrix.Rotation(rot[1], 4, "Y")
            @ Matrix.Rotation(rot[0], 4, "X")
        )
        base = len(self.verts)
        for v in locais:
            self.verts.append(tuple(m @ Vector(v)))
        slot = self._slot(mat)
        for f in [
            (0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1),
            (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0),
        ]:
            self.faces.append(tuple(base + i for i in f))
            self.mat_da_face.append(slot)

    def poligono(self, pontos: list[tuple[float, float, float]], mat: str) -> None:
        """Uma face avulsa. Serve para água de telhado e empena."""
        base = len(self.verts)
        self.verts.extend(pontos)
        self.faces.append(tuple(range(base, base + len(pontos))))
        self.mat_da_face.append(self._slot(mat))

    def prisma_telhado(
        self,
        largura: float,
        profundidade: float,
        altura: float,
        base_z: float,
        mat_agua: str,
        mat_empena: str,
        espessura: float = 0.0,
    ) -> None:
        """
        Telhado de duas águas, cumeeira no eixo X.

        ⚠️ `ConeGeometry` de 4 lados dá PIRÂMIDE, que serve para torre e não
        para casa de vila. Duas águas tem cumeeira, e cumeeira é uma aresta, não
        um ponto — por isso o prisma é montado à mão.
        """
        ml = largura / 2
        mp = profundidade / 2
        topo = base_z + altura
        # águas
        self.poligono([(-ml, mp, base_z), (ml, mp, base_z), (ml, 0, topo), (-ml, 0, topo)], mat_agua)
        self.poligono([(ml, -mp, base_z), (-ml, -mp, base_z), (-ml, 0, topo), (ml, 0, topo)], mat_agua)
        # empenas (os triângulos das pontas)
        self.poligono([(-ml, -mp, base_z), (-ml, mp, base_z), (-ml, 0, topo)], mat_empena)
        self.poligono([(ml, mp, base_z), (ml, -mp, base_z), (ml, 0, topo)], mat_empena)
        if espessura > 0:
            self.caixa((largura, profundidade, espessura), (0, 0, base_z - espessura / 2), mat_agua)

    def finaliza(self, nome: str) -> bpy.types.Object:
        malha = bpy.data.meshes.new(nome)
        malha.from_pydata(self.verts, [], [f for f in self.faces])
        malha.update()
        for m in self.materiais:
            malha.materials.append(material(m))
        for i, pol in enumerate(malha.polygons):
            pol.material_index = self.mat_da_face[i]
            # 🔴 Sombreado PLANO: suave briga com o sprite de pixel art ao lado.
            pol.use_smooth = False
        obj = bpy.data.objects.new(nome, malha)
        bpy.context.scene.collection.objects.link(obj)
        return obj


# ---------------------------------------------------------------------------
# Cena, origem e exportação
# ---------------------------------------------------------------------------


def limpa_cena() -> None:
    """Cena vazia de verdade — `--factory-startup` ainda traz cubo, luz e câmera."""
    for bloco in (bpy.data.objects, bpy.data.meshes, bpy.data.materials):
        for item in list(bloco):
            bloco.remove(item)


def assenta(obj: bpy.types.Object) -> tuple[float, float, float]:
    """
    🔴 A CONVENÇÃO QUE NÃO PODE SER ESQUECIDA: base em z=0, centro em x/y.

    Move os VÉRTICES, não o objeto — assim a origem certa vai junto no `.glb` e
    o cliente pode fazer `obj.position.set(x, alturaDoTerreno, z)` sem correção
    nenhuma. É o equivalente 3D do conversor que desce cada quadro para a sola
    cair em `GROUND_Y`, e existe pelo mesmo motivo: quadro cuja âncora é chutada
    treme, e modelo cuja origem é chutada boia.

    Devolve o tamanho (x, y, z) em unidades, para o gerador poder conferir.
    """
    malha = obj.data
    if not malha.vertices:
        return (0.0, 0.0, 0.0)
    xs = [v.co.x for v in malha.vertices]
    ys = [v.co.y for v in malha.vertices]
    zs = [v.co.z for v in malha.vertices]
    dx = (min(xs) + max(xs)) / 2
    dy = (min(ys) + max(ys)) / 2
    dz = min(zs)
    for v in malha.vertices:
        v.co.x -= dx
        v.co.y -= dy
        v.co.z -= dz
    return (max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs))


def raiz_do_repo() -> str:
    """A raiz do repositório, a partir deste arquivo: tools/blender/comum.py."""
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def destino(nome: str) -> str:
    pasta = os.path.join(raiz_do_repo(), "client", "public", "assets", "models3d")
    os.makedirs(pasta, exist_ok=True)
    return os.path.join(pasta, f"{nome}.glb")


def exporta(nome: str) -> str:
    """
    Exporta a cena inteira como `.glb`.

    ⚠️ `export_yup=True` é o que converte Z-up (Blender) em Y-up (glTF/Three).
    ⚠️ `export_apply=True` aplica modificadores; sem ele o que aparece na
    viewport não é o que sai no arquivo.
    """
    caminho = destino(nome)
    bpy.ops.export_scene.gltf(
        filepath=caminho,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
        export_normals=True,
        export_animations=False,
        use_selection=False,
    )
    return caminho


def relata(nome: str, tamanho: tuple[float, float, float], obj: bpy.types.Object) -> None:
    """Imprime o que o runner lê. Prefixo `ELYSIA` para o `.mjs` filtrar."""
    tx, ty, tz = tamanho
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    print(f"ELYSIA modelo={nome}")
    print(f"ELYSIA tamanho_tiles={tx:.2f}x{ty:.2f}x{tz:.2f}")
    print(f"ELYSIA altura_em_herois={tz / HEROI:.2f}")
    print(f"ELYSIA triangulos={tris}")


def main(nome: str, construir) -> None:
    """
    O esqueleto que todo gerador usa: limpa, constrói, assenta, relata, exporta.

    Centralizado de propósito — gerador que esquece de `assenta()` produz modelo
    que boia, e o defeito só aparece no jogo.
    """
    limpa_cena()
    obj = construir()
    tamanho = assenta(obj)
    relata(nome, tamanho, obj)
    caminho = exporta(nome)
    print(f"ELYSIA saida={caminho}")
    sys.stdout.flush()
