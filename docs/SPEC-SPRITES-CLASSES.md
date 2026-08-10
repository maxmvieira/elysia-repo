# Especificação de sprites — classes jogáveis

Como entregar a arte das quatro classes (`knight`, `sorcerer`, `archer`,
`assassin`) para ela entrar no jogo **sem código novo** e sem os defeitos que a
primeira leva tem.

> Irmão do [`SPEC-SPRITES-MONSTROS.md`](./SPEC-SPRITES-MONSTROS.md), que diz o
> mesmo para as criaturas. Escrito em **2026-08-10**, depois de medir os cinco
> packs que entraram em 09/08.

---

## 1. O que está errado na arte de hoje — meça antes de repetir

Os números abaixo saíram de medir a caixa de alpha dos PNGs dos packs atuais,
não de impressão:

| O que | Valor nos packs de 09/08 | O que devia ser |
|---|---|---|
| Quadro (PNG) | 60×60 | 96×96 |
| **Desenho dentro do quadro** | **25×29 px** (12×28 andando) | **~46×64 px** |
| Escala aplicada pelo motor | **2,133×** | **1,0×** |
| Linha dos pés | varia entre y=43 e y=45 | **fixa**, sempre a mesma |
| Quadros de caminhada | 4 | 6 a 8 |

🔴 **A escala não-inteira é o defeito que mais aparece.** `heroes.ts` desenha o
herói com 64 px de altura a partir de um conteúdo de 30 px — 2,133×, com
filtragem `nearest`. Numa escala fracionária, **um pixel do desenho vira 2 na
tela e o vizinho vira 3**, em faixas alternadas. É o que faz a silhueta parecer
picotada. Enquanto o conteúdo não crescer, a saída barata é `TARGET_H = 60`
(escala 2,0× exata).

🔴 **O segundo defeito é resolução, não estilo.** Um herói de 25×29 px tem ~400
pixels opacos e ~40 cores. Não há detalhe para ampliar: rosto, elmo e mão viram
dois ou três pixels cada. Qualquer retrabalho de estilo em cima desse tamanho é
desperdício.

⚠️ **Terceiro:** no pack atual o Knight tem 25 px de largura parado (espada e
escudo visíveis) e **12 px andando** — a silhueta some no ciclo de passos. Se o
gerador achatar de novo, o personagem "emagrece" ao andar.

---

## 2. O formato ideal

### Célula e conteúdo

| Item | Valor |
|---|---|
| Célula (quadro) | **96×96 px**, quadrada, **a mesma para todos os arquivos daquela classe** |
| Altura do corpo (topo da cabeça → sola do pé) | **64 px** |
| **Linha da sola do pé** | **y = 84**, IGUAL em todo quadro e toda direção |
| Centro horizontal do corpo | **x = 48**, IGUAL em todo quadro e toda direção |
| Formato | PNG **RGBA 8 bits** (o conversor recusa outro) |
| Fundo | transparente, **sem sombra embutida** — o motor desenha a sombra |

Isso deixa 20 px de folga acima da cabeça e 12 abaixo do pé, que é onde cabe a
espada erguida, a lança esticada e o corpo caindo na animação de morte. Arma
pode invadir essa folga à vontade; **o corpo, não**.

🔴 **"Sola do pé na mesma linha" é a regra que mais importa depois do tamanho.**
O carregador usa **uma âncora só** para as quatro direções e para todos os
quadros (`CONTENT_H`/`FEET_Y`/`CENTER_X` em `client/src/heroes.ts`). Se o pé
subir e descer entre quadros, o herói **treme**; se o centro andar entre
direções, ele **dá um pulinho lateral toda vez que vira**. É o que acontece
hoje, em pequena escala.

⚠️ O balanço vertical da caminhada, se você quiser, **desenhe no corpo** (ombro e
cabeça sobem) com o pé de apoio fixo. Não mova o personagem inteiro dentro do
quadro.

### Alternativa, se o gerador não passar de 60×60

Peça **corpo de 32 px de altura**, sola em **y = 44**, centro em **x = 30**.
Escala vira exatamente **2,0×** e o pixel fica uniforme. Fica menos detalhado que
a opção de 96, mas honesto: vira pixel-art de verdade em vez de render
espremido. **Nesse caso desenhe sem antialias** — pixel-art borrada ampliada 2×
fica pior que pixel duro.

Na opção de 96×96 (escala 1,0×) **antialias é bem-vindo**: nada é ampliado, e a
arte pintada combina com as árvores e cristais CraftPix que já estão no mundo.

### As linhas da folha

Quem entrega **quadros soltos** (o formato dos packs de hoje) não precisa montar
folha nenhuma — `tools/frames2strip.mjs` monta. A estrutura que ele lê é:

```
<pack>/Idle/animations/<Animacao>/<dir>/frame_000.png, frame_001.png, ...
<pack>/Idle/rotations/<dir>.png          (pose parada, uma por direção)
```

com `<dir>` ∈ `south` · `north` · `east` · `west`. Se vier folha pronta, ela é
**4 linhas × N colunas**:

```
linha 0 → SUL    (de frente, olhando para a câmera)
linha 1 → NORTE  (de costas)
linha 2 → LESTE  (direita)
linha 3 → OESTE  (esquerda)
```

⚠️ **8 direções não servem para nada.** O pack atual traz `north-east`,
`south-west` etc. em `rotations/`; o jogo move em 4 direções e ignora as
diagonais. Não gaste render nelas.

---

## 3. Os arquivos, e quantos quadros cada um

Um arquivo por animação, por classe. Nomes de saída (o conversor traduz do nome
do gerador por palavra-chave — ver `ANIMS` em `tools/frames2strip.mjs`):

| Arquivo | O que é | Quadros | Obrigatório? |
|---|---|---|---|
| `walk.png` | ciclo de passos | **6 a 8** | 🔴 **sim** — sem ele a classe cai no boneco MiniWorld |
| `pose.png` | 4 poses paradas, 1 quadro cada | 1 | sim (é o ícone da tela de criação) |
| `idle.png` | parado, respirando | 2 a 4 | não |
| `hurt.png` | levou dano | 2 a 3 | não — sem ele o motor pisca vermelho |
| `death.png` | caindo | 4 a 8 | não |
| `attack_sword.png` | golpe descendente | 4 a 9 | 🔴 é o fallback de todos os outros |
| `attack_dagger.png` | estocada curta | 4 a 9 | não |
| `attack_spear.png` | estocada longa | 4 a 9 | não |
| `attack_bow.png` | sacar e soltar a flecha | 4 a 9 | não |
| `attack_staff.png` | conjuração | 4 a 9 | não |

🔴 **Animação de ataque exige as QUATRO direções.** O conversor **pula** a tira
que não tiver as quatro (`req4`), de propósito: meia animação faria o
personagem virar para o sul no meio do golpe. `walk` e `idle` são a exceção —
direção faltante cai na pose parada, e o herói desliza sem mexer as pernas.

⚠️ `death` é **terminal**: o sprite congela no último quadro, que fica no chão
para sempre. Desenhe o último quadro pensando nisso.

⚠️ `hurt` **não interrompe o golpe** (regra do motor: só a morte interrompe), e o
golpe **fatal toca `death`, não `hurt`**.

### Quem precisa de qual ataque

`shared/src/heropose.ts` traduz os 8 tipos de arma nas 5 poses. Machado e maça
caem em `sword`; besta cai em `bow`. A cadeia de fallback termina sempre em
`sword` — por isso `attack_sword` é o único que toda classe precisa ter.

| Classe | Ataques que valem a pena | Por quê |
|---|---|---|
| `knight` | sword · spear · **bow e staff refeitos** | 🔴 hoje o arco e o cajado dele **mantêm espada e escudo na mão**. É o buraco mais visível dos cinco packs |
| `sorcerer` | staff · sword | é a classe de cajado |
| `archer` | bow · spear · sword | idem, para arco |
| `assassin` | dagger · sword · **`walk` nas 4 direções** | 🔴 o `walk` dele só tem sul: ele **desliza sem mexer as pernas** para cima e para os lados |

E, nos quatro: **`hurt` nas quatro direções**. Nenhum dos cinco packs tem — só
sul.

---

## 4. Sobre gerar com IA

O que produziu os packs atuais é um gerador **3D**: modelo criado por prompt,
animações da biblioteca Mixamo (`Breathing_Idle`, `Walking`, `Taking_Punch`,
`collapsing_backward…` são nomes de lá), renderizado de 8 ângulos e
**reduzido para 60×60 na exportação**. O pipeline está certo; o que está errado
é o tamanho da exportação.

🔴 **A coisa mais barata a fazer é reexportar os mesmos personagens com
resolução maior.** Um render 3D é consistente entre quadros e direções de graça
— é justamente o que gerador de imagem não consegue entregar.

⚠️ **Não peça a folha de sprite direto a um gerador de imagem** (ChatGPT/DALL·E,
Midjourney). Eles não mantêm o mesmo personagem entre 32 quadros: o elmo muda de
forma, a capa troca de cor e o corpo muda de altura de um quadro para o outro.
Sai mais caro consertar do que desenhar.

**Para o que eles servem bem**, e vale usar:

- **Concept art**: uma imagem grande por classe, de frente, corpo inteiro, fundo
  neutro — para servir de referência ao gerador 3D ou a um pixel-artista.
- **Folha de referência de cores** (paleta da armadura, da capa, do cabelo).
- **Retrato** para a tela de criação de personagem, que não é sprite e não tem
  nenhuma das restrições acima.

Caminho alternativo que dispensa gerador: pack pronto e coerente (CraftPix,
itch.io, ou o *Universal LPC Spritesheet Generator*, que monta o personagem por
camadas e já entrega 4 direções com o pé alinhado). Vale conferir a licença.

---

## 5. Como entregar, e o que eu faço com isso

1. Ponha o pack em `arte-fonte/classes/<nome-do-pack>/`, mesma estrutura de
   hoje. **É versionado** — a fonte fica no repositório junto com a saída.
2. Se o nome da pasta mudar, ajusto `PACKS` em `tools/frames2strip.mjs`.
3. `npm run sprites:build` regenera as tiras em
   `client/public/assets/classes/<classe>/`. ⚠️ **Essa pasta é gerada — não edite
   nada lá.**
4. Se a célula deixar de ser 60, mudo **`CELL`, `CONTENT_H`, `FEET_Y` e
   `CENTER_X`** em `client/src/heroes.ts`. São quatro constantes num arquivo.
5. Confira em **`http://localhost:5173/sprites-preview.html`** — as 4 classes ×
   4 direções × 8 animações, animadas, lendo as mesmas tiras que o jogo lê. É a
   primeira parada quando chega arte nova.

### O que me avisar ao mandar

Só duas coisas, que o código não consegue adivinhar:

- **o lado da célula** (uma folha de 4×4 células de 32 px tem exatamente as
  mesmas dimensões de uma de 2×2 de 64);
- **se o pé ficou numa linha fixa** ou não. Se não ficou, eu meço quadro a
  quadro e ancoro por medição — custa mais, mas não trava a entrega.

O resto (escala, âncora, contagem de quadros, velocidade) sai de medir o
arquivo.

---

## 6. Duas coisas que continuam fora do escopo

- **O sexo não troca o sprite.** Cada pack tem um corpo só. A escolha existe, é
  salva e viaja no snapshot, esperando variante feminina. Se um dia vier, é o
  mesmo formato desta página, em `arte-fonte/classes/<classe>-female/`.
- **Druida não é classe.** `PlayerClass` tem quatro. A arte do Druid fica em
  `arte-fonte/classes/Druid_class_hero_wears_leaf/` esperando decisão do dono.
