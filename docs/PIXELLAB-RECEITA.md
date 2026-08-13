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

## 🔴🔴 EXISTE UM PRODUTO "CHARACTERS" NO PIXELLAB, E ELE É MUITO MELHOR QUE ESTA RECEITA

**Descoberto em 12/08, tarde, quando o dono mandou o link.** Tudo o que está
escrito abaixo nesta receita foi construído em cima da **API crua**
(`generate-image-pixflux` + `/rotate` + `inpaint` + `animate-with-skeleton`). O
PixelLab tem também um produto de personagem em `pixellab.ai/create-character`,
e ele entrega, de fábrica, coisas que a API crua **não entregou em ~44 gerações
de tentativa**:

| | esta receita (API crua) | Characters |
|---|---|---|
| Direções | **4** (o `/rotate` não faz 45° — ver abaixo) | **8** |
| Animações | 1–2 quadros, montadas à mão | **8 animações, 9 quadros cada** |
| Estados | não existe | `Idle` + "Create State" |
| Vista | `high top-down` | `low top-down` |

🔴 **E é quase certo que os packs de 09/08 vieram dali.** O Knight de lá é
`60×60px`, e o `CELL` do pack antigo (`client/public/assets/classes/`) é
**exatamente 60**. A descrição gravada é *"Knight class hero, wears polished
steel plate armor with a blue tabard, carries a longsword and a tower shield"* —
o mesmo sujeito. O `HISTORICO.md` os trata como se tivessem saído de um gerador
3D; isso está errado.

⚠️ **Isso derruba conclusões desta mesma receita**, tiradas na tarde de 12/08:

- *"8 direções não saem deste gerador"* — saem, pelo Characters.
- *"o `/rotate` não faz 45°"* — continua verdade **para a API crua**, e é por isso
  que a conclusão foi tirada; mas ela não vale para a ferramenta certa.
- Boa parte dos becos abaixo é sobre **montar à mão** o que o Characters já faz.

### ✅ As três perguntas que decidiam tudo, respondidas pelo dono em 12/08

| pergunta | resposta | o que isso destrava |
|---|---|---|
| Exporta em **64×64**? | **sim** | bate com o `CELL` do pipeline atual — o conversor e as cinco constantes de `heroes.ts` continuam valendo |
| Gera corpo **sem arma**? | **sim** | 🔴 **o sistema de camada de 12/08 sobrevive inteiro** — e ganha 8 direções de graça |
| O `Export` entrega o quê? | **tudo** | tira ou quadro solto, os dois conversores já sabem ler |

🎯 **O caminho passa a ser este, e ele torna quase tudo de 12/08 mais barato:**

1. Gerar as 4 classes no **Characters**, em `64×64`, **sem arma**, 8 direções.
2. As armas continuam vindo do jeito de 12/08 — recorte por subtração de um
   corpo armado, ou desenho — e entram como **camada**, que já funciona.
3. `grip.ts`, `maos.mjs`, `compor.mjs`, `armas2strip.mjs` e o desenho em camadas
   no cliente **continuam valendo como estão**. O que muda é a origem do corpo.

⚠️ **O que fica obsoleto:** `desarmar.mjs` (não é mais preciso desarmar o que já
nasce desarmado), `girar.mjs` (o Characters entrega as 8 direções), e o passo/
golpe/respiração montados à mão — o Characters traz 8 animações de 9 quadros.
Nada disso deve ser apagado antes de o pack novo estar em tela: é o que segura o
jogo de pé enquanto a troca não acontece.

⚠️ Continua valendo o custo em créditos (`⚡39` por estado na tela) — medir antes
de gerar as quatro classes.

## 🔴 ISOMÉTRICO: o gerador não faz, e isso está medido (12/08)

O dono viu mockups isométricos, gostou, e perguntou se dava. **Não dá por este
gerador**, e a resposta custou 2 gerações mais uma sondagem de graça.

**1. A API não tem ângulo isométrico.** `view` aceita exatamente
`'side'`, `'low top-down'` e `'high top-down'` — o 422 devolve a lista. Não há o
que pedir.

**2. E o ângulo que um jogo isométrico precisa é a DIAGONAL, que o `/rotate` não
faz.** Num mundo isométrico as 4 direções de movimento aparecem na tela como 4
diagonais, então os sprites necessários são NE, SE, SO, NO — não N, S, L, O.

Três tentativas de sudeste, cobrindo `image_guidance_scale` de 3 a 8, falharam
**do mesmo jeito**:

| | largura | cores |
|---|---|---|
| sul (frente) | 28 | **62** |
| sudeste, guidance 5 | 30 | 111 |
| sudeste, guidance 8 | **32** | **123** |
| sudeste, guidance 3 | 30 | 104 |
| leste (perfil, 90°) | 26 | 85 |

🔴 **As três saíram mais LARGAS que a vista de frente** — o que uma vista de três
quartos não pode ser — e **as três dobraram a paleta**, que é a assinatura do
beco nº 1: o modelo redesenha em vez de girar. O `/rotate` entrega 90° (o leste é
perfil de verdade) e não entrega 45°.

⚠️ **Consequência para a decisão de projeção.** O motivo escrito em 05/08 para
descartar isométrico era que *os packs isométricos traziam personagem de uma
direção só*. Esse motivo tinha enfraquecido, porque as classes deixaram de vir de
pack e passaram a ser geradas — mas o motivo novo é mais forte: **o gerador não
produz personagem isométrico de jeito nenhum**. Ir para isométrico significa
abandonar este pipeline para personagem e comprar ou encomendar a arte.

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

## O golpe — mesmo truque do passo, e duas armadilhas novas

`inpaint` na faixa da **arma**, em vez da perna. Funciona, e a garantia é a
mesma: o que está fora da máscara não pode ser perdido.

### 🔴 A máscara tem que conter o DESTINO, não só a origem

A primeira tentativa mascarou `y 18..58` — exatamente onde o braço já estava — e
**a espada não subiu**. Óbvio depois: "espada erguida" precisa de pixel **acima
do ombro**, e ali não havia máscara. O modelo só desenha dentro dela.

Com `y` começando em **0**, a espada sobe. É a faixa que está no gerador.

⚠️ E ela para em **x=22** porque o elmo mora em x 22..32. Alargar para 26 fez a
espada sair **solta no ar, sem braço segurando**.

### 🔴 O lado da arma é POR CLASSE — supor um só custou 12 gerações

A primeira versão mascarou a esquerda para todo mundo, porque é onde o Knight
segura a espada. **Deu certo no Knight e falhou nas outras três**: o cajado do
Feiticeiro nasce na **direita** da tela, e Arqueiro e Assassino usam os **dois**
braços. Golpe fora da máscara simplesmente não acontece — as três saíram
idênticas ao quadro parado.

| Classe | Lado | Arquivo |
|---|---|---|
| `knight` | esquerda | `attack_sword` |
| `sorcerer` | **direita** | `attack_staff` |
| `archer` | **ambos** | `attack_bow` |
| `assassin` | **ambos** | `attack_dagger` |

No **norte** (vista de costas) o lado **espelha**.

🔴 **Toda classe grava também `attack_sword`**, mesmo o Feiticeiro:
`attackPoseFallback` (`shared/src/heropose.ts`) termina a cadeia em `sword`, e
classe sem esse arquivo perde o golpe inteiro e volta ao "pulinho" de investida.
**O nome do arquivo é o SLOT, não a arma desenhada.**

⚠️ **Honestidade sobre o resultado:** o Knight ergue a espada e lê muito bem. O
Feiticeiro não levanta muito o cajado, mas **o cristal acende** (violeta →
dourado), o que funciona como conjuração. Arqueiro e Assassino são os mais
fracos — o gesto muda pouco.

### `SO_GOLPE=1` refaz só o golpe

```bash
SO_GOLPE=1 PIXELLAB_TOKEN=xxxx node tools/pixellab/gerar-classe.mjs sorcerer
```

Existe porque o lado da máscara foi o que mais precisou de tentativa, e regerar
as poses junto trocaria arte já aprovada por outra tirada no dado.

## A morte — o único lugar onde o ESQUELETO é a ferramenta certa

`animate-with-skeleton`, o mesmo endpoint descartado na caminhada. 🔴 **E o
motivo de ele servir aqui é exatamente o motivo de não servir lá:** ele
**regenera o corpo** a partir da pose. Na caminhada isso apagava o escudo, numa
animação que roda o tempo todo. Na morte o corpo **tem** que mudar inteiro, e a
animação é **terminal** — acaba num monte no chão, congelado para sempre.
Regenerar deixa de ser defeito e vira o que se quer.

⚠️ **E `inpaint` NÃO serve aqui**, pelo mesmo motivo invertido: não existe região
a preservar. É o oposto exato do que faz o passo e o golpe funcionarem.

**Como é feito:** `estimate-skeleton` na pose parada, e o esqueleto inteiro
**tomba girando em torno dos pés** — 3 quadros, a 0, 0,55 e 1,35 radianos, com o
corpo afundando um pouco. O último é o cadáver.

### 🔴 Duas armadilhas

**1. O corpo caído SAI DO QUADRO.** Girar em torno dos pés desloca o tronco quase
o comprimento do corpo, e a célula tem 64 px — na primeira tentativa o cavaleiro
caiu metade para fora, pela direita. Por isso cada pose é **recentrada em x**
depois de girada.

**2. `z_index` tem que ser INTEIRO.** O `estimate-skeleton` às vezes devolve
`-0.5`, e aí a API responde **422**. Aconteceu no Assassino, e o efeito é cruel:
a classe fica com **morte pela metade** (sul e norte gravados, leste não), porque
o erro só aparece na direção em que o estimador resolveu usar meio nível.
`Math.round` no `z_index` resolve.

⚠️ **A tira de morte NÃO é alinhada pelo chão** no conversor. `chaoDe` mede a
última linha com massa, e num corpo **deitado** isso é o corpo inteiro, não o pé
— alinhar por ele empurraria o cadáver para fora do tile.

```bash
SO_MORTE=1 PIXELLAB_TOKEN=xxxx node tools/pixellab/gerar-classe.mjs assassin
```

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
