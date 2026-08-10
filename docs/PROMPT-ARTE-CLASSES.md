# Prompts para gerar a arte das quatro classes

Texto pronto para colar. Complementa a
[`SPEC-SPRITES-CLASSES.md`](./SPEC-SPRITES-CLASSES.md), que diz o **formato**;
este diz **o que pedir**.

> ⚠️ Os prompts estão em **inglês de propósito** — gerador de imagem e gerador 3D
> respondem bem melhor em inglês, mesmo os que entendem português. O texto ao
> redor é para você, o que está em bloco de código é para colar.

---

## 🔴 Leia isto antes de colar qualquer coisa

Os packs de hoje vieram de um **gerador 3D**: um modelo criado por prompt,
animado com a biblioteca Mixamo (`Breathing_Idle`, `Walking`, `Taking_Punch`,
`collapsing_backward…` são nomes de lá) e renderizado de 8 ângulos. **Esse
pipeline está certo.** O que está errado é que ele exportou em 60×60, e dentro
desse quadro o personagem ocupa 25×29 px.

Então a ordem de esforço é esta, e não é opinião:

| Ordem | O quê | Ganho |
|---|---|---|
| **1º** | Reexportar os MESMOS personagens no gerador 3D, com resolução maior (Prompt C) | 🔴 resolve o problema inteiro |
| 2º | Personagens novos no gerador 3D, com aparência melhor (Prompt B) | resolve, mas recomeça a arte |
| 3º | GPT como **referência** para 1 ou 2 (Prompt A) | melhora o visual, não substitui os outros |

⚠️ **Não peça a folha de sprite completa ao GPT.** Gerador de imagem não segura o
mesmo personagem por 32 quadros: o elmo muda de forma, a capa troca de cor, a
altura do corpo varia de um quadro para o outro. Você vai receber 32 imagens
bonitas de 32 personagens diferentes, e não dá para consertar isso depois. O
Prompt A existe justamente para usar o GPT no que ele faz bem.

---

## Prompt A — GPT: folha de referência (1 imagem por classe)

**O que ele produz:** uma prancha do personagem visto de frente, de costas e dos
dois lados, grande e detalhada. **Uma classe por conversa** — não peça as quatro
juntas, elas saem parecidas demais entre si.

**Para que serve:** é a referência que você dá ao gerador 3D ("faça este
personagem"), e é o que me deixa gerar o `pose.png` novo — que já melhora os
quatro cartões da tela de criação de personagem, mesmo antes de haver animação.

Cole isto, **trocando só o bloco `CHARACTER`** pela classe que quiser:

```
Character reference sheet for a 2D top-down MMORPG, in the visual style of
classic Tibia: readable silhouette, saturated colors, strong dark outline,
painted shading (not flat vector, not cel-shaded anime).

Layout: one single image, four full-body views of THE SAME character in a row,
evenly spaced, all at the same height and standing on the same ground line:
front, back, right side, left side.

Camera: high three-quarter angle, looking DOWN at the character from about 50
degrees above the horizon — the viewer sees the top of the shoulders and the
top of the head, and the ground plane is visible. This is critical: it is a
top-down game, not a side-scroller. Do NOT use a straight eye-level view.

Proportions: slightly heroic-chibi — head about 1/5 of the body height, so the
face stays readable when the sprite is small. Sturdy, grounded stance.

Background: flat neutral mid-grey, completely empty. No shadow on the ground,
no scenery, no props, no text, no labels, no border, no watermark.

CHARACTER:
<<cole aqui o bloco da classe>>
```

### Os quatro blocos `CHARACTER`

Saíram dos `blurb` de `shared/src/stats.ts` e das cores de classe de
`client/src/miniworld.ts` — é a identidade que o jogo já usa, não invenção.

**Knight** (`knight`) — *"Especialista em combate corpo a corpo. Espadas,
machados, maças, escudos e armaduras pesadas."*

```
A heavily armored knight. Full polished steel plate armor with strong
blue-steel tones and darker blue accents. Closed helmet with a visor slit.
Broad shoulders, the heaviest and widest silhouette of the four classes.
Carries a longsword in the right hand and a large kite shield in the left.
The shield must stay clearly visible from every angle — it is the main
recognition cue for this class.
```

**Feiticeiro** (`sorcerer`) — *"Controla o Éter. Magias ofensivas à distância,
suporte, controle e invocações."*

```
A sorcerer channeling raw magic. Long flowing purple and deep-violet robes
with gold trim, a wide hood pulled back to show the face. Slender silhouette,
the frailest of the four. Holds a tall wooden staff topped with a glowing
violet crystal in the right hand. Faint magical glow at the fingertips of the
left hand. No armor at all.
```

**Arqueiro** (`archer`) — *"Especialista em combate à distância. Arcos, bestas,
armadilhas e muita mobilidade."*

```
An agile ranger. Light green and brown leather armor, a hooded short cloak,
tall boots, a quiver of arrows on the back. Lean and athletic silhouette,
built for speed rather than protection. Holds a curved longbow in the left
hand. The bow and the quiver must both stay visible from every angle.
```

**Assassino** (`assassin`) — *"Alta velocidade e adagas. Críticos, venenos e
furtividade — golpeia e some."*

```
A hooded assassin. Dark crimson and near-black leather, a deep hood that keeps
the upper face in shadow, cloth wraps on the forearms, a short torn cape.
Lean, low, crouched-forward silhouette. Holds a dagger in EACH hand, held in a
reverse grip. The two daggers and the deep hood are the recognition cues.
```

⚠️ **Os quatro têm que parecer da mesma família.** Se gerar um por vez, mande a
imagem anterior junto e escreva: *"same art style, same proportions, same
outline weight and same lighting as this reference"*.

---

## Prompt B — gerador 3D: personagem novo

No gerador que produziu os packs (o que cria o modelo e aplica as animações da
Mixamo). Cole o mesmo bloco `CHARACTER` do Prompt A, precedido de:

```
Full-body game character, T-pose friendly, symmetric, clean topology, suitable
for automatic rigging and Mixamo animation retargeting. Stylized fantasy RPG,
readable silhouette, saturated colors.
```

Se o gerador aceitar imagem de referência, mande a prancha do Prompt A junto.

---

## 🔴 Prompt C — o mais importante: a EXPORTAÇÃO

Isto não é prompt de texto, é a configuração de exportação — e é o que decide se
a arte fica boa. **Vale tanto para personagem novo quanto para reexportar os
cinco packs que já existem.**

| Ajuste | Valor | Por quê |
|---|---|---|
| **Resolução do quadro** | **96×96** (ou o maior que ele oferecer) | hoje é 60×60 e o corpo ocupa 25×29 — não há detalhe para mostrar |
| **Altura do corpo no quadro** | ~**64 px**, cabeça aos pés | faz a escala do jogo virar 1,0× |
| **Direções** | **4** — frente, costas, esquerda, direita | o jogo ignora as diagonais; render nelas é desperdício |
| **Ângulo da câmera** | o mesmo dos packs atuais (~50° acima do horizonte) | trocar isso faz a classe nova destoar das antigas |
| **Fundo** | transparente, **sem sombra** | o motor desenha a sombra |
| **Quadros por ciclo de caminhada** | **6 a 8** | hoje são 4, e a caminhada fica dura |

### As animações a exportar, por classe

| Animação Mixamo | Vira o arquivo | Direções |
|---|---|---|
| `Walking` | `walk.png` | 🔴 **4** |
| `Breathing Idle` | `idle.png` | 4 |
| `Taking Punch` | `hurt.png` | 🔴 **4** |
| `Falling Back Death` / `collapsing…` | `death.png` | 4 |
| golpe de espada (`longsword`/`short sword`) | `attack_sword.png` | 4 |
| estocada de adaga (`dagger`) | `attack_dagger.png` | 4 |
| estocada de lança (`spear`) | `attack_spear.png` | 4 |
| sacar arco (`bow`) | `attack_bow.png` | 4 |
| conjurar cajado (`staff`) | `attack_staff.png` | 4 |

🔴 **Animação de ataque sem as 4 direções é DESCARTADA pelo conversor.** Meia
animação faria o herói virar para o sul no meio do golpe.

### Os quatro buracos conhecidos — conserte estes primeiro

| Classe | O que está errado hoje |
|---|---|
| **Assassino** | 🔴 o `Walking` só tem **sul**. Ele desliza sem mexer as pernas para cima e para os lados |
| **Knight** | 🔴 nas animações de **arco e cajado** ele continua com **espada e escudo na mão** — o gerador não trocou o equipamento |
| **Todos os 4** | `Taking Punch` só tem **sul**, então `hurt.png` não existe e o motor pisca vermelho |
| **Todos os 4** | a caminhada tem 4 quadros e **achata a silhueta** — o Knight passa de 25 px de largura parado para 12 px andando |

---

## Como me mandar

1. Ponha o pack em `arte-fonte/classes/<nome-da-pasta>/`, com a mesma estrutura
   de hoje (`Idle/animations/<Animacao>/<dir>/frame_000.png` e
   `Idle/rotations/<dir>.png`). Se a estrutura vier diferente, **manda assim
   mesmo** — eu ajusto o conversor.
2. Me diga **duas coisas**, que são as únicas que o código não adivinha:
   - **o lado da célula** (uma folha de 4×4 células de 32 px tem exatamente as
     mesmas dimensões de uma de 2×2 de 64);
   - **se a sola do pé ficou numa linha fixa** em todos os quadros. Se não ficou,
     eu meço quadro a quadro e alinho — o conversor já faz isso.
3. Eu rodo `npm run sprites:build`, ajusto as constantes de `heroes.ts` se a
   célula mudou de tamanho, e a gente confere em
   `http://localhost:5173/sprites-preview.html`.

Se vier só a prancha de referência do Prompt A, também serve: dá para trocar o
`pose.png` das quatro classes e melhorar a tela de criação de personagem
sozinha, sem animação nenhuma.
