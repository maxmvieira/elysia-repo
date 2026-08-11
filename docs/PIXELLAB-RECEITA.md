# PixelLab — a receita que funciona, e os quatro becos sem saída

Como gerar arte de classe pela API do PixelLab. Escrito em **2026-08-10**, depois
de 14 gerações de tentativa com o dono ao lado. Cada opção do
`tools/pixellab/gerar-classe.mjs` está lá por causa de um erro observado — este
documento é o registro desses erros, para ninguém repetir.

> Complementa a [`SPEC-SPRITES-CLASSES.md`](./SPEC-SPRITES-CLASSES.md), que diz o
> formato que o jogo consome.

---

## Por que este caminho

A arte de classe de hoje é um render 3D **reduzido a 25×29 px** dentro de um
quadro de 60. Não há detalhe para mostrar, e nenhum conserto de código inventa
resolução.

O PixelLab entrega, na primeira tentativa:

| | Arte atual | PixelLab |
|---|---|---|
| Célula | 60×60 | **64×64** |
| Corpo dentro dela | 25×29 px | **40×58 px** |
| Pixels opacos | ~400 | **~1200** |
| Fundo | transparente | transparente |
| Escala no jogo | 2,0× | **1,0× — sem ampliação nenhuma** |

🔴 **É pixel art de verdade, não render reduzido.** E `CameraView: 'high
top-down'` é exatamente o ângulo do jogo.

⚠️ **A célula é 64 e não é escolha:** o endpoint `animate-with-text` declara
`width` e `height` com `minimum` **e** `maximum` iguais a 64. Os outros
endpoints aceitam mais, mas misturar tamanhos entre animações do mesmo
personagem quebra o conversor.

---

## A receita

Três passos, `tools/pixellab/gerar-classe.mjs`. **8 gerações por classe.**

### 1. A pose sul — `generate-image-pixflux`

`view: 'high top-down'` · `no_background: true` ·
`outline: 'single color black outline'` · `detail: 'medium detail'`.

A descrição sai dos `blurb` de `shared/src/stats.ts`. Saiu bom de primeira.

### 2. As outras três direções — 🔴 **AINDA NÃO RESOLVIDO**

Esta é a parte que **não fechou**, e é honesto dizer antes de alguém confiar no
gerador. Duas formas foram testadas e **cada uma falha de um jeito**:

| Forma | O que dá certo | O que dá errado |
|---|---|---|
| `/rotate` (`to_direction` ou `direction_change: 90`) | norte sai **de costas de verdade** | **duplica a cabeça** em leste e oeste — sprite com dois elmos |
| `pixflux` com `direction` + `init_image` força 120 | figura **limpa**, personagem idêntico | 🔴 **as quatro direções colapsam em frontal** — o `init_image` vence o `direction`, e norte fica de frente com o escudo à mostra |

O `gerar-classe.mjs` está hoje na **segunda** forma, então **o pack que ele
produz tem quatro poses bonitas e só uma direção**. Serve para julgar
qualidade; **não serve para o jogo ainda**.

**O que tentar em seguida**, na ordem:

1. **Baixar `init_image_strength`** de 120 para ~40–60. A hipótese é que 120
   está travando a pose, não só o estilo.
2. **Híbrido:** norte pelo `/rotate` (que acerta), leste e oeste pelo `pixflux`.
3. Se leste sair limpo e oeste não, **espelhar** — a `SPEC-SPRITES-CLASSES.md`
   já permite entregar 3 linhas e espelhar a quarta.

⚠️ Mesmo na melhor tentativa, **leste e oeste saem em três quartos, não em
perfil**. Isso parece ser limite do modelo, não de parâmetro.

### 3. A caminhada — `inpaint` só na faixa das pernas

Máscara branca sobre a faixa das pernas, preta no resto. O que está fora da
máscara **não pode ser perdido**, e é essa a garantia que faz o método funcionar.

Resultado: **caminhada de 2 quadros** — parado e passo. Tibia clássico também
anda com 2.

---

## 🔴 Os quatro becos sem saída (não repita)

### 1. `animate-with-text` solto → o Knight cria ASAS

Primeira tentativa da caminhada. Descrição repetindo "longsword and shield", sem
paleta travada. Saiu um cavaleiro com **asas brancas nos ombros**, e a paleta
pulou de 80 para **~1500 cores**.

**Duas causas, e as duas viram regra:**

- **A arma vem da imagem de referência, NUNCA repetida no texto.** Foi o texto
  que virou asa — o modelo desenhou "espada" uma segunda vez, nas costas.
- **Passe a arte-base em `color_image`.** Ele trava a paleta. Foi o que derrubou
  de 1500 para ~70 cores.

### 2. `animate-with-text` amarrado → as pernas CONGELAM

Corrigindo o item 1 com `text_guidance_scale: 3` e um `negative_description`
longo, a arte ficou limpa (70 cores, chão alinhado nos 4 quadros) e **as pernas
pararam de se mexer**. Tirar o artefato tirou junto o passo. Os dois extremos
falham.

### 3. `animate-with-skeleton` → some o ESCUDO

Este chegou perto: as pernas **andam de verdade**, porque a pose vai ponto a
ponto (18 keypoints; `estimate-skeleton` extrai os do personagem).

Mas o modelo **regenera o corpo a partir do esqueleto**, e o escudo do Knight —
que é a marca da classe — desaparece nos três quadros.

⚠️ Tentei congelar os braços e subir `guidance_scale` de 4 para 9. **Não
resolveu.** O escudo não existe no esqueleto, então não há como pedir que ele
fique.

🔴 **É por isso que a caminhada é por `inpaint` e não por esqueleto.** Não é
preguiça: é a única das quatro formas em que a identidade do personagem é
garantida por construção, e não por sorte.

### 4. A máscara larga demais → volta o problema 3

A faixa da máscara **tem que parar antes do escudo** (no Knight, `x1 = 32`).
Mascarar a largura inteira devolve o escudo à região redesenhada, e ele se perde
igual. A perna que mora atrás do escudo não aparece de qualquer forma.

---

## Custo

Gerações, não dinheiro: a conta tem **2000 por mês**, e crédito pago em US$ 0,00
— estourar o limite **falha**, não cobra.

| | Gerações |
|---|---|
| Por classe (4 poses + 4 passos) | **8** |
| As quatro classes | **32** |
| Gasto na investigação de 10/08 | 14 |

⚠️ **O token é `PIXELLAB_TOKEN`, vem do ambiente, e NUNCA entra no
repositório.** Ele está em `pixellab.ai/account`, campo "Secret".

```bash
PIXELLAB_TOKEN=xxxx node tools/pixellab/gerar-classe.mjs knight
```

---

## Se um dia ligar no jogo: as quatro constantes

Medidas pelo `tools/pixellab2strip.mjs` no pack do Knight (ele imprime isto a
cada conversão). Em `client/src/heroes.ts`:

| Constante | Valor | Hoje (pack antigo) |
|---|---|---|
| `CELL` | **64** | 60 |
| `CONTENT_H` | **58** | 30 |
| `FEET_Y` | **60** | 44 |
| `CENTER_X` | **31.5** | 29.5 |
| `TARGET_H` | **58** | 60 |

🔴 `TARGET_H = CONTENT_H` faz a escala ser **1,0× exata**: o sprite é desenhado
no tamanho em que foi criado, sem ampliação nenhuma. É o melhor caso possível —
não existe serrilhado de escala quando não há escala.

⚠️ E `GROUND_Y` do `pixellab2strip.mjs` (60) tem que continuar igual ao `FEET_Y`.

## O que ainda não existe

A receita cobre **parado e andando**. Falta:

| Animação | Ideia |
|---|---|
| `attack_*` | `inpaint` na faixa do BRAÇO da arma, mesmo princípio da perna |
| `hurt` | provavelmente nem precisa — o motor pisca vermelho |
| `death` | o caso mais difícil: o corpo inteiro muda, então máscara não protege nada |

⚠️ **Enquanto não houver `attack` e `death`, o pack do PixelLab não substitui o
pack atual inteiro** — ele tem essas animações, mesmo feias. A troca é decisão do
dono, e provavelmente vale fazer por classe, não de uma vez.
