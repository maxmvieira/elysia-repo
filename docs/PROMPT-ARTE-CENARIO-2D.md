# Prompts para gerar a arte 2D isométrica de cenário

Texto pronto para colar num gerador de imagem por IA (Midjourney, ChatGPT/GPT
Images, SDXL, etc.). Complementa o [`PROMPT-ARTE-CLASSES.md`](./PROMPT-ARTE-CLASSES.md),
que é o mesmo tipo de documento para as classes jogáveis.

> ⚠️ Prompts em **inglês de propósito** — gerador de imagem responde melhor em
> inglês. O texto ao redor é para você, o bloco de código é para colar.

---

## 🔴 Decisão de 13/08 — leia antes de colar qualquer coisa

O cenário (piso, parede, telhado, props) virou uma linha **separada** do
pipeline de personagem: cada peça é uma **imagem 2D isométrica isolada**,
gerada por IA de imagem — **sem modelagem 3D**. O Blender entra só depois,
para montar as peças já prontas como sprites, não para criar geometria.

A barra de qualidade é a de um gerador de imagem de verdade: grão de madeira
fotográfico, nós, rachaduras finas, pregos individuais, sombreamento crível.
Textura procedural (código) não chega nesse nível — por isso a peça é pedida
pronta à IA, não desenhada à mão.

**Isso é independente da câmera do jogo em si**, que continua `high top-down`
para personagem e criaturas (ver `HISTORICO.md`, blocos de 05/08 e 12/08). O
isométrico aqui vale só para os assets de cenário desta linha nova.

---

## O bloco de estilo fixo

Cole **sempre**, trocando só o `PIECE:` pela peça do momento. É o que mantém
piso, parede, telhado e props parecendo do mesmo jogo.

```
Single isolated game asset, 2D isometric scenery piece for a fantasy MMORPG,
in the visual tradition of Ragnarok Online but with much higher detail and
texture richness — hand-painted digital art, NOT a 3D render, NOT a photo,
NOT flat vector art.

Camera: true isometric projection, consistent with a 2:1 diamond-shaped tile
grid. The piece must read correctly as a floor/wall/roof tile in an isometric
game engine — do not tilt, rotate, or foreshorten it off-grid.

Lighting: soft directional light from the upper-left, warm and painterly,
with clearly defined but soft-edged shadows baked directly into the texture.
Consistent light direction across every piece of this set.

Material detail: rich hand-painted texture — visible wood grain with knots
and small cracks, or individual stone blocks with mortar and chips, or
individual roof shingles with tonal variation, depending on the material.
Small imperfections and weathering, not a clean/sterile surface.

Background: fully transparent (or flat plain white if transparent is not
possible). No ground, no other scenery, no characters, no monsters, no other
building pieces, no UI, no text, no watermark, no border.

Composition: the piece fills most of the frame, centered, with a small
margin. Only ONE piece in the image.

PIECE:
<<cole aqui o bloco da peça>>
```

⚠️ **Mande a imagem anterior junto quando gerar a próxima peça**, escrevendo:
*"same art style, same lighting direction, same level of detail and same
color palette as this reference image."* É o que evita a parede sair mais
escura ou mais lisa que o piso.

---

## Blocos de peça

### Piso de madeira (já aprovado como referência de nível — ver a imagem que o dono mandou em 13/08)

```
A medieval wooden floor tile, isometric rhombus shape. Wide wooden planks
running in one diagonal direction, laid in a staggered brick-like pattern.
Warm honey-to-dark-brown wood tones with visible grain, occasional knots,
hairline cracks along a few planks. A raised wooden trim beam frames all
four edges of the diamond, with a thicker corner post at each of the four
corners. Small dark metal nail heads visible along the plank seams.
```

### Parede de pedra (térreo)

```
A medieval stone wall panel, seen isometrically as a flat rectangular slab
(front-facing wall face, not a floor). Irregular hand-cut fieldstone blocks
of varying size, light grey to warm beige tones, visible mortar lines between
stones, some chipped edges and small moss or weathering stains near the
base. Slight bevel/relief so each stone reads as physically raised.
```

### Parede enxaimel (andar superior)

```
A medieval half-timbered wall panel (Tudor/fachwerk style), seen isometrically
as a flat rectangular slab. Cream-white lime plaster background, dark aged
oak timber frame with horizontal, vertical AND diagonal cross-brace beams
forming the traditional pattern. Visible wood grain on the beams, faint
texture and small stains on the plaster.
```

### Telhado (uma água / painel único)

```
A medieval roof panel, isometric rhombus or parallelogram shape matching a
sloped roof surface. Dense small clay or slate roof shingles in deep blue
tones, with tonal variation between shingles and soft shadow in the gaps
between rows for volume. A thicker wooden or stone ridge cap trim along the
top edge.
```

### Porta

```
A medieval wooden door with a rounded stone/wood arch frame, seen in
isometric front view. Dark aged oak planks, visible wood grain, wrought-iron
hinges and a round ring handle. A small stone step at the base. The frame
extends slightly beyond the door on all sides.
```

### Janela com veneziana

```
A medieval wooden window, isometric front view. Dark oak frame, small
blue-tinted glass panes with faint depth, hinged wooden shutters on both
sides, a small flower box with colorful flowers mounted just below the sill.
```

### Prop pequeno (barril, caixa, lanterna — troque o objeto)

```
A single medieval wooden barrel with dark iron bands, standing upright,
isometric view, resting on its own small shadow only.
```

---

## 🔴 O beco sem saída: a MOLDURA ARREDONDADA por baixo

**3 tentativas em 13/08, todas falharam do mesmo jeito.** Está aqui para
ninguém repetir.

Pedindo uma porta com arco, o `gpt-image-1` devolve **a moldura curvando por
baixo da porta**, como uma ferradura ou um escudo — em vez de duas colunas
retas descendo até o chão. A porta fica flutuando dentro de um U.

| Tentativa | O que o prompt dizia | Resultado |
|---|---|---|
| 1ª | `rounded stone arch frame` | ferradura |
| 2ª | + `must NOT curve inward at the bottom, it is not a horseshoe` | ferradura |
| 3ª | geometria em positivo, membro por membro: duas colunas verticais, arco em cima, base reta | ferradura |

⚠️ **A 2ª tentativa ensina a regra geral:** gerador de imagem **não obedece
negação**. Escrever *"não é uma ferradura"* põe a palavra *ferradura* no
prompt, e ele desenha uma. Nunca descreva pelo que a peça **não** é.

🔴 **E a 3ª mostra que positivo também não basta aqui.** Descrever a geometria
membro a membro ("duas colunas retas, arco apoiado em cima, base horizontal")
não venceu — o modelo tem um viés forte para arco em ferradura em contexto
medieval.

⚠️ **O defeito CONTAMINA as peças vizinhas.** Na mesma rodada a janela — que na
1ª tentativa tinha saído com base reta — voltou com **fundo arredondado de
escudo**, depois que o prompt dela passou a citar a `parede-pedra` e a andar
junto com o da porta.

### ✅ RESOLVIDO — e não foi por prompt melhor, foi por CONTEXTO

**A porta saiu certa na `folha`**, na primeira tentativa: arco apoiado em duas
colunas retas que descem até o chão, base horizontal, sem ferradura nenhuma.

🔴 **E o prompt da porta dentro da folha é mais CURTO que o das três tentativas
que falharam** — uma linha, sem nenhum aviso sobre ferradura. O que mudou foi o
contexto: pedida sozinha, a porta é um objeto solto e o modelo cai no viés de
"arco medieval decorativo"; pedida dentro de um kit modular, ela é **uma peça
que tem de encaixar numa parede**, e encaixar exige base reta.

⚠️ **A lição vale para as próximas peças:** quando uma peça sair com defeito
geométrico teimoso, antes de reescrever o prompt pela quarta vez, tente pedi-la
**dentro de um conjunto** onde a função dela force a geometria certa.

---

## ⚠️ As peças NÃO são mutuamente consistentes

Achado de 13/08, e é o que mais importa antes de tentar montar uma casa: cada
peça é boa sozinha e elas **não se encaixam entre si**.

- **Ângulo:** as duas paredes até se complementam (uma recua para a direita, a
  outra para a esquerda — as duas faces visíveis de uma casa isométrica), mas
  isso saiu por sorte, não por instrução. Porta e janela saíram em ângulos
  próprios.
- **Escala:** não existe grade comum. A janela é enorme em relação à parede em
  que deveria assentar.
- **Proporção do losango:** o piso saiu **1,53:1**, e o grid isométrico clássico
  é **2:1**. Corrigível com escala vertical na montagem, sem regerar.

🔴 **Consequência:** as sete peças soltas servem para julgar ESTILO, não para
montar casa.

### ✅ E a folha única resolveu — a hipótese estava certa

`node tools/cenario/gerar-peca.mjs folha` pede **11 peças numa geração só**, e
elas saem na **mesma grade, mesma escala e mesma luz**. É por isso que os sheets
de referência que o dono mandou são coerentes: o modelo mantém consistência
**dentro** de uma imagem, e não **entre** imagens.

⚠️ **O que a folha ainda não entrega**, e é honesto saber:

| | |
|---|---|
| **Espelhamento** | pedi cada parede em duas mãos (recuando para a esquerda E para a direita) e **todas vieram na mesma mão**. Há peças de canto em L, que resolvem esquina — mas não há painel plano espelhado |
| **Piso 2:1** | pedido explicitamente, e saiu quase quadrado. O 2:1 é a única coisa que a folha ignorou das que foram pedidas em número |
| **Telhado** | saiu como pirâmide de quatro águas, não como painel plano modular |
| **Textura** | ficou mais **simples** que a das peças soltas — o `piso.png` sozinho tem grão bem mais rico que o piso da folha. Parece haver troca entre coerência e detalhe |
| **Recorte** | fundo creme (não branco puro) e **sombra projetada** sob cada peça, então recortar exige mais que tirar o branco |

---

## Como me mandar

1. Manda o PNG direto no chat — eu cuido do recorte fino, alinhamento no grid
   isométrico e organização das peças.
2. Se a peça não vier com fundo transparente, avisa — eu removo o fundo
   branco antes de integrar.
3. Guardar as peças em `arte-fonte/cenario-iso/<peca>/` quando o conjunto
   crescer, mesma lógica de `arte-fonte/classes/` e `arte-fonte/pixellab/`.
