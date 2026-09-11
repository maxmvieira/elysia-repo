# Histórico de implementação — Elysia Online

Registro do que cada etapa concluída entregou, **onde mora no código** e quais
decisões de design ficaram travadas por teste.

> **Para uma sessão futura:** leia primeiro o bloco "📍 ONDE ESTAMOS" do
> [`ROADMAP-elysia.md`](./ROADMAP-elysia.md). Este arquivo é o detalhe — use
> quando precisar mexer em algo que já foi feito e entender o porquê.

---

## 2026-09-11 — O Meteoro ganha oito direções de entrada

**Onde mora:** `tools/meteoro2fx.mjs` · `METEORO_TRAJETO`/`RUMOS_QUEDA`/`FOLHAS_QUEDA`/
`rumoDaEntrada`/`spawnQuedaDaConjuracao`/`preRotacionada` em `client/src/main.ts` ·
`arte-fonte/fx/meteoro_<rumo>.png` → `client/public/assets/fx/`

### ☄️ Uma folha girada não cobre oito direções, e o argumento era meu

🔴 **Girar gira a FUMAÇA junto — e fumaça sobe.** A primeira versão tinha uma folha só,
girada pelo rumo, e o argumento parecia fechado: *"um meteoro é uma pedra com rastro
atrás; girar o conjunto continua certo em qualquer ângulo"*. Está errado na metade que
não é pedra. O rastro de fumaça é desenhado SUBINDO, e a 90° ele sai deitado. O dono viu
antes de mim e desenhou as oito variações.

✅ **O cliente escolhe a folha pelo rumo da VIAGEM VISTA**, e não pela linha conjurador →
alvo. São ângulos diferentes: a partida é o alvo recuado ao longo da linha **mais
`subida`**, então até um alvo a leste é atingido descendo uns 20°. `rumoDaEntrada` divide
esse ângulo por 45° e indexa `RUMOS_QUEDA` — sem escada de ifs, e os oito rumos puros
caem cada um no seu oitavo (conferido).

⚠️ **As oito entradas estão listadas mesmo antes de os arquivos existirem.** Faltando uma,
`Assets.load` falha calado, `folhaPara` devolve `null` e o rumo cai na folha GIRADA — o
efeito de ontem, não uma magia sem animação.

### 🔪 O cortador: três medidas que a folha não entrega de graça

O dono garantiu *"mesmo padrão visual, escala e sequência; mesmo número de frames"* para
as oito. Medidas, elas vieram com **24, 24, 24, 21, 21, 21, 21 e 24 quadros**, uma com a
fileira de voo escrita da direita para a esquerda, e uma (norte→sul) com **contagens
diferentes DENTRO da mesma folha**: 7 de voo, 6 de impacto, 8 de dissipação. Nada disso
dá erro — dá animação picotada, que só aparece jogando.

🔴 **A contagem de cada fileira sai por AUTOCORRELAÇÃO.** Contar ilhas não serve (no auge
as chamas se tocam: a mesma fileira de 8 quadros dá 2, 3 ou 6 ilhas), e usar a última
fileira para todas não serve desde a folha norte→sul. A fileira é periódica, e o passo
aparece no deslocamento de maior correlação — estejam os quadros grudados ou não. As
ilhas ficam como desempate, para quando `vão / passo` cai em 7,42 numa fileira de 8.

🔴 **A pedra é achada pelo MAIOR CÍRCULO INSCRITO, depois de um fechamento.** A rocha é
uma malha — tem veias de lava ACESAS atravessando —, então o círculo inscrito medido
direto cabia ENTRE duas veias: 24 px numa pedra de 82. Dilatar 9 px, medir e descontar
resolve. É o que também dá a âncora certa quando a pedra vem grudada nos estilhaços numa
mancha só, o que acontece em quatro das oito folhas.

⚠️ **E a âncora errada erra POR TRÁS.** Antes disso o cortador ancorava na mancha mais
LARGA, que é a casca de fumaça fria — 23 951 px contra 14 536 da pedra no último quadro.
Ancorar nela pendura o rastro no ponto interpolado e a pedra chega adiantada: o impacto
sai na frente do alvo. Mesmo defeito do relâmpago em 12/09, e de novo a causa estava uma
etapa ANTES do cliente.

🔴 **A sequência sai por programação dinâmica, com três amarras.** Varredura gulosa fica
presa na primeira bolha que couber. A DP maximiza a soma de `raio²` entre cadeias que
(1) não encolhem, (2) não põem dois quadros no mesmo x e (3) atravessam a fileira de
ponta a ponta. Cada amarra entrou por um defeito medido: sem (2) a folha norte→sul saiu
com quatro quadros contados duas vezes (pedra e fumaça, três pixels ao lado); sem (3) a
nordeste devolveu oito CACOS amontoados no canto.

⚠️ **E a escolha é pela NOTA, não pelo comprimento.** Na nordeste existe uma cadeia de
oito cacos, que fecha a contagem, e uma de sete pedras, que não fecha porque a mais
distante não aparece. A de cacos ganhava por um quadro.

### 🧱 Duas travas para o defeito não voltar calado

✅ **`quadros: 0` no cliente = conte pela TEXTURA.** As células do `meteoro2fx` são
quadradas, então a contagem é `largura ÷ altura`. Oito números copiados à mão seriam
oito chances de errar, e mais oito a cada folha regerada.

✅ **O cortador confere o contrato.** O voo é amarrado à média das duas fileiras de
estouro, e no fim ele verifica que a tira tem `3 × voo` quadros — porque
`fracaoQueda: 1/3` está escrito na ficha do cliente e lá não há como conferir.

---

## 2026-09-11 — Munição, aljava, e as duas tempestades virarem bombardeio

**Onde mora:** `arrow`/`bolt` e `quiver` em `shared/src/items.ts` · `ammo`/`splash`/
`queda`/`quedaFx`/`quedaMs`/`castMsAtLv10` em `SkillDef` · `gastaMunicao`, `Tempestade` e
`tickGolpesPendentes` em `server/src/index.ts` · `CORES_RISCO`/`FORMA_RISCO`/`setCasting` em `client/src/main.ts`

### 🏹 Munição: a flecha vira item, e a aljava vira slot

🔴 **A munição mora na ARMA, não em `attackType`.** É tentador dizer "todo ataque à
distância gasta flecha", e está errado: a **lança** tem alcance 2, logo é `ranged`, e é
arma de haste — pela regra fácil ela comeria a aljava do jogador. Quem declara é
`WEAPON_IDENTITY.ammo`: `arrow` no arco, `bolt` na besta.

⚠️ **O desarmado não gasta.** A flecha pertence ao arco; sem isso um arqueiro
recém-criado e sem ouro ficaria sem poder atacar.

**A aljava** tem duas medidas que são coisas diferentes: `capacity: 4` são os SLOTS
(quantos tipos lado a lado) e `ammoMax: 10000` são as UNIDADES somadas. Uma por vez —
"precisar de um segundo quiver" é carregar outro na mochila e trocar. Dois slots
dobrariam o teto de graça, e aí o teto não é teto.

⚠️ **Aljava com munição dentro não sai.** Despejar na mochila precisaria de quatro slots
livres, e sem eles a munição sumiria ou a troca falharia no meio.

✅ **Persistência sem migração:** `character_item.container` já era TEXT com três valores;
a aljava é o quarto.

🔥 **Dez munições** (comum + fogo, gelo, sagrada, sombria, nas duas famílias) e **nenhuma
tabela de bônus nova**: o elemento vira o `damageType` do golpe e a resistência do
monstro decide o resto — a mesma conta da magia.

⚠️ **Armadilha que quase passou:** `gastaMunicao` voltou a devolver objeto (para carregar
o elemento), e `if (!gastaMunicao(...))` compila, roda e **nunca bloqueia** — objeto é
sempre verdadeiro. O arqueiro atiraria sem flecha e nada acusaria.

### 🌠 A Chuva de Meteoros: sete rodadas de teste em tela

O GDD dizia *"Lv.10: 10 meteoros, área grande, ~4 s"*, e os ~4 s **nunca tinham sido
implementados**: `durationMs` era 0 e os dez impactos resolviam no mesmo tique.

**O estado final**, depois de sete rodadas de "testei, agora…":

| | |
|---|---|
| contagem | 6 → **18** no Lv.10 |
| janela | 2 s → **5,2 s** |
| cadência | ~290 ms entre meteoros |
| queda | **520 ms**, reta, rocha de raio 46 |
| respingo | **3×3** por impacto |

🔴 **Dois overrides conscientes do documento**, os dois do dono depois de jogar (contagem
e duração). Os testes deixaram de travar esses números e passaram a travar a **faixa** do
desvio — mais que o documento, sim; o dobro, não.

🔴 **Os meteoros caem em PONTOS SORTEADOS, não em criaturas.** O sorteio era de alvo, e o
efeito em tela era o oposto do `DD-SOR-010`: meteoro teleguiado. A fila de impactos
passou a ter duas maneiras de uma coisa cair — **perseguindo** (Fire Bolt, Cold Bolt) e
**em ponto fixo** (a Chuva). Consequência: a magia pode ser lançada em terreno vazio.

⚠️ **Sorteio em QUADRADO** (chebyshev), como o alcance. Ângulo+raio daria distribuição
circular numa área quadrada: concentraria no meio e nunca acertaria as quinas.

⚠️ **O respingo multiplica o dano em grupo**, e está anotado onde se mexe nele: antes eram
dez golpes distribuídos entre alvos sorteados; agora um bando colado leva perto de dezoito
golpes cada um. O `power` não foi mexido — balancear é decisão de dono.

### 🔴 O bug de três dias: toda magia de área desenhava no conjurador

Em 08/09 o centro da magia de área passou a ser a MIRA. O `fx` continuou saindo em
`player.tileX/tileY`, e ninguém corrigiu junto porque `cx`/`cy` viviam **dentro** do bloco
que monta os alvos — fora dele, a única posição à mão era a do jogador.

Por três dias o estouro foi desenhado em cima do conjurador enquanto o dano caía onde ele
apontou. Passou despercebido porque estouro dura meio segundo; o círculo da tempestade
durava quatro, e aí apareceu.

⚠️ **A lição:** eu tinha provado, no dia anterior, que o caster não podia ser ATINGIDO — e
estava certo, em três níveis. Ele não reclamou de dano, reclamou de DESENHO. Responder a
pergunta que não foi feita esconde a que foi.

### 🧪 O modo "risco": desenho por código no lugar da folha

Proposta trazida pelo dono, implementada atrás de **um interruptor só** (`QUEDA_RISCO`) e
aprovada em tela no mesmo dia. A descida virou um traço desenhado por código; a folha
entra só no ESTOURO.

⚠️ **A fração do impacto muda com a arte** — na folha do Fire Bolt a descida são 14 de 24
quadros, na do Cold Bolt 18 de 30. Cada folha declara a sua em `fracaoQueda`; cortar no
lugar errado mostra a bola caindo duas vezes ou come o começo da explosão.

⚠️ **O tremor é somado DEPOIS do arredondamento da câmera.** A suavização persegue o
herói, e empurrar o solavanco para dentro dela faria a câmera "aprender" o tremor.

### ✨ Conjuração visível a todos

O `casting` ia só para quem conjurava, e virou `broadcastFloor` com `casterId`. Não é
enfeite: os três segundos parado são a janela em que a magia pode ser **interrompida**, e
sem ver quem conjura o adversário não tem como reagir.

⚠️ **A pilha de rótulos cresce PARA CIMA**, e o cálculo importa: `nlabel` tem âncora
embaixo, então ocupa de `base − 11` até `base`. A barra de conjuração estava em `base − 7`
— dentro do nome. Ordem final: vida (`base+6`), nome (`base`), barra (`base−15`), nome da
magia (`base−17`).

⚠️ **Apagar o conjurador do mapa NÃO limpa o sprite.** O laço por quadro só mexe em quem
está no mapa; tirar de lá sem avisar a entidade deixava aura, barra e **pose** para sempre
— e a pose congelava o personagem no gesto.

### ❄️ A Nevasca deixa de ser área de chão e vira bombardeio

O dono trouxe a ficha do Ragnarok inteira e uma captura de tela: *"gostaria de algo mais
parecido com isso"* — cristais de gelo individuais caindo, não um vórtice girando.

🔴 **A ficha descreve bombardeio, e não área.** *"Cria uma intensa tempestade de bolas de
neve por 4,5 s numa área de 9×9… por caírem em células ALEATÓRIAS da área"*. Área de chão
dá dano uniforme em todo mundo dentro do quadrado, que é justamente o que a ficha **não**
diz. Então a Nevasca passou a usar a mesma máquina da Chuva de Meteoros: `queda`, pontos
sorteados, um `fx` por bola.

| | |
|---|---|
| área | 7×7 → **9×9** (`range: 4`), transbordando a **11×11** pelo respingo |
| bolas | **10**, sempre — o que cresce é o dano de cada uma |
| cadência | uma a cada **450 ms** (4,5 s ÷ 10) |
| dano | **120 % → 570 % de ATQM**, e o número da ficha é o TOTAL das dez |
| conjuração | 2,5 s → **6,3 s** |
| congelar | **70 % → 25 %** |

⚠️ **Os 570 % são de dez bolas, não de uma.** `power` neste motor sempre foi por impacto,
então o valor gravado é 0,57. Ler a ficha ao pé da letra daria 5,7 por bola e 57 de total —
dez vezes a suprema de fogo.

🔴 **A conjuração CRESCE com o nível, ao contrário de toda outra magia do jogo.** É de
propósito e é da ficha: a Nevasca se paga com tempo parado e interrompível, e quanto mais
forte, mais tempo. Entrou como `castMsAtLv10` — a única coisa no cálculo de conjuração que
olha o nível da habilidade.

⚠️ A base ficou nos 2,5 s que ela já tinha, e não nos 4,5 da ficha: 4,5 s **no Lv.1**
tornaria a magia inconjurável na prática, e a ficha pressupõe redutores de cast que aqui
saem da Destreza.

🔴 **E a chance de congelar CAI com o nível.** Parece erro de digitação e não é: o Lv.1 é
magia de PRENDER (70 %, dano pequeno) e o Lv.10 é magia de MATAR (570 %, 25 %). ✅ Isso
resolve sozinho a tensão com o `DD-SOR-012`, que existia para a Nevasca não ser controle
garantido — no nível máximo ela quase não congela.

**🔴 O defeito que a mudança criou, e que quase passou.** `empurraPorPulso` e
`congelaEmAcertos` eram lidos **num lugar só**: na criação da área de chão. Ao virar queda,
os dois campos continuaram na ficha, bonitos, e pararam de fazer efeito — a magia perdeu
empurrão e congelamento sem um erro de compilação, sem um teste vermelho e sem nada em tela
dizendo o que sumiu. As duas regras foram religadas na fila de impactos (`Tempestade`), e
existe teste travando que quem declara esses campos esteja num modo que o servidor lê.

⚠️ **O estado é UM objeto por conjuração, apontado pelas dez bolas.** *"O terceiro acerto
rola o congelamento"* precisa de um contador que atravesse as bolas; se cada uma levasse o
seu, o contador nunca passaria de um.

⚠️ **Quem congelou fica imune ao resto da tempestade** — obrigatório, não estético: aqui
dano quebra congelamento, então sem a imunidade a bola seguinte descongelaria o alvo 450 ms
depois de congelá-lo.

⚠️ **O empurrão agora sai do ponto onde AQUELA bola estourou**, e não do centro da área.
Com as bolas caindo espalhadas, empurrar todo mundo para longe de um centro imaginário
desmentiria o que a tela mostra.

✅ **Saíram 44 linhas de cliente**: o vórtice desenhado por código, o mapa `vortices`, o
laço de giro por quadro e o carregador solto da folha. A folha da nevasca (36 quadros)
continua, agora como o estouro de cada bola.

### ❄️ O emissor de partículas, e as duas regras invertidas para o RO

**Não precisamos de Unity, Godot nem Blender** (pergunta do dono, com um guia que mandava
usar os três). O cliente já era um motor de partículas sem ser usado como tal: mistura
aditiva, formas desenhadas por código, e um laço de vida com alfa por quadro já existiam.
Blender é a ferramenta errada porque **renderiza fora do jogo** — o que sai dele é uma
folha pré-cozida, que é o que já temos e do que o modo risco nos afastou.

Cada impacto cospe **três camadas** (`PARTICULAS` em `main.ts`), e cada uma faz um trabalho
diferente: **névoa** (5 elipses achatadas girando no chão) dá volume, **cristal** (6 pontas
de gelo nascendo a 180–260 px de altura e despencando) dá peso, **floco** (22 micro-cristais
subindo em espiral) dá turbulência. É a "sobreposição de camadas com transparências
acumuladas" do RO — uma folha sozinha toca sempre igual.

🔴 **Object pool: os nós são criados uma vez e reaproveitados.** Uma tempestade cospe ~500
partículas em 4,5 s; criar e destruir um `Graphics` para cada põe meio milhar de objetos por
conjuração no caminho do coletor, e o preço aparece como engasgo justamente quando a tela
está mais cheia. O nó só troca `x`, `y`, `alpha`, `scale` e `tint`.

⚠️ **Uma pilha de livres POR CAMADA.** Pilha única falha em silêncio: a geometria já está
desenhada, então um slot de névoa não vira cristal, e um slot da camada errada no topo
bloqueia o reaproveitamento das outras duas até alguém pedir aquela camada — o pool cresce
até o teto e o efeito começa a sumir sem nenhum erro.

⚠️ **O laço varre o pool inteiro, mortas incluídas.** Uma lista de vivas precisaria de
`splice` no meio, que é a alocação que o pool existe para evitar.

⚠️ **`z` é altura, e a projeção continua a do jogo** — grade reta, com `z` subtraído de `y`.
A fórmula isométrica 2:1 foi proposta em 11/09 e **não se aplica a este renderizador**:
`main.ts` desenha em `tileX * TS`, e adotá-la quebraria a posição de todo sprite. O eixo `z`
vale; a projeção 2:1, não.

⚠️ **Elipses e órbitas achatadas em `y` (× 0,5).** O chão é visto de viés; círculo lê como
bola de luz flutuando, elipse lê como névoa deitada.

**As formas desenhadas por código viraram FOLHAS** no fim do dia, quando o dono trouxe os
assets prontos em base64 (`tools/export_storm_gust_assets.mjs`) e os três atlas. As três
camadas agora são `AnimatedSprite` no mesmo pool.

🔴 **Vieram DUAS das três folhas.** O script grava `gelo_grande_sheet.png` e
`particulas_menores_sheet.png`; o atlas `nevoa_base.json` aponta para
`nevoa_base_sheet.png`, **que nenhum script gerava** — a camada de base sumiria em silêncio.
Ela passou a ser gerada por `tools/nevoa-nevasca.mjs`.

⚠️ **Névoa é gerada e não desenhada à mão, e o motivo é a borda.** As outras duas folhas são
formas duras com contorno; esta precisa do oposto, um borrão sem borda. Em 64×32 desenhada
à mão viraria um disco com degraus, e o degrau é o que denuncia o efeito.

⚠️ **Cinco lóbulos, e o número é aritmético.** Com três, a massa tem simetria de 120° e os
seis quadros a 60° de passo caem em cima de si mesmos — a folha inteira tem só DUAS formas
distintas, e em tela lê como uma seta piscando esquerda-direita, não como rodopio. Cinco
têm período de 72°, que não divide 60.

⚠️ **A grade sai do JSON, não de uma constante no código.** Repetir os retângulos criaria
duas verdades sobre o mesmo arquivo, e a errada cortaria os quadros pela metade sem erro.

⚠️ **O cristal é ancorado em `(0.5, 0.85)`.** A ponta é o que toca o chão; centrado, metade
do desenho afundaria no tile e o estilhaço sairia enterrado.

⚠️ **Na batida o relógio REINICIA.** A vida sorteada no nascimento media a queda; o estouro
precisa dos quatro quadros dele. Sem isso um cristal que caiu tarde estilhaçaria em meio
quadro. E o giro para — explosão que continua rodando lê como pião.

⚠️ **O cristal reciclado do pool volta para `falling`.** Ele pode ter morrido estilhaçado, e
sem trocar as texturas de volta nasceria já quebrado no ar.

### 🔬 O teste em tela, e dois erros que só ele pega

O dono abriu o jogo para eu testar direto na máquina dele. Duas coisas caíram na hora.

🔴 **A escala do cristal: 2,0–3,2 era um erro meu em cima de outro.** Quando ele sumiu em
tela eu subi a escala achando que era tamanho — não era, era a mistura aditiva comendo o
contorno. Com os dois "consertos" somados, a tempestade virou **lâminas azuis de cinco
tiles cada, empilhadas**: uma parede, não uma nevasca. Voltou para 0,7–1,2, e a contagem de
cristais caiu de 6 para 4 (com vida de 420–700 ms e uma bola a cada 450 ms, seis deixavam
quinze no ar ao mesmo tempo).

⚠️ **A largura enganava.** O gelo ocupa uns 10 px na célula de 48, o que parecia pedir
aumento — mas tem quase 40 px de ALTURA, e em escala 1 já é mais alto que um tile.

🔴 **A dica anunciava 2,5 s de conjuração e o jogador esperava mais de cinco.** A dica lia
`def.castMs` cru, que é o valor do **Lv.1**. Enquanto toda magia tinha conjuração fixa isso
dava no mesmo; a Nevasca quebrou a premissa (`castMsAtLv10`). Passou a sair de
`skillCastMs(def, efetivo, 0, 0)` — e agora mostra 6.3s no Lv.10.

⚠️ Maestria e Destreza entram como ZERO de propósito: como todo o resto da dica, o número é
o da HABILIDADE e não o do personagem que a lê. Misturar faria a mesma magia mostrar valores
diferentes para dois jogadores, e a dica deixaria de servir para comparar.

✅ **E o que o teste confirmou funcionando:** as três camadas aparecem, o `shatter` toca na
batida, o congelamento pinta o monstro de azul com o floco por cima, e a tempestade mata.

### ⚖️ A Nevasca troca TEMPO por MANA — override do dono sobre a ficha

Jogando, o veredito: *"o tempo de conjuração está muito demorado. O cooldown também"* — e,
na mesma conversa, o contrapeso: *"mas gaste mais mana para equilibrar"*.

| | antes (ficha do RO) | agora |
|---|---|---|
| conjuração Lv.10 | 6,3 s | **3,0 s** |
| recarga | 20 s | **13 s** |
| mana Lv.10 | 274 | **386** |

Em ritmo sustentado, contra as outras duas supremas:

| | conj/min | mana/min |
|---|---|---|
| **Nevasca** | **4,6** | **1 782** |
| Chuva de Meteoros | 4,0 | 1 208 |
| Ira de Thor | 3,3 | 867 |

A Nevasca virou a suprema **mais disponível e a mais cara** — o dano por minuto sobe ~53 %,
o consumo de mana mais que dobra. Quem quiser mantê-la no ar escolhe entre isso e ter mana
para o resto.

⚠️ **O que NÃO mudou é o formato: ela ainda CRESCE com o nível**, e é a única do jogo assim.
Encolheu a escala, não a ideia. Comprimir mais é decisão do dono; apagar o crescimento
descaracteriza a magia.

🔴 **E um teste foi REESCRITO por causa disto, o que vale mais que a mudança.** O teste das
supremas travava `cooldownMs >= 15000` e `castMs >= 2000` — números. Ele caiu, corretamente,
e a lição é que travar número transforma o teste num **veto a decisões de equilíbrio**, que
não é o trabalho dele. Passou a travar a intenção ("suprema não é botão de spam") como soma
de quatro condições: nível alto, conjuração madura interrompível, recarga que cobre uma
conjuração inteira, e **mana alta** — a trava nova, que é a que sustenta as outras. Sem ela,
o próximo a achar "a mana está alta" desfaz metade da troca e sobra a suprema barata e
rápida.

⚠️ A conjuração agora é medida com `skillCastMs(d, 10, 0, 0)` e não em `castMs` cru:
comparar a base puniria justamente a magia que fica mais lenta ao ficar forte.

🔴 **O congelamento foi INVERTIDO, e o argumento anterior estava certo sobre a regra e
errado sobre a magia.** A versão de ontem rolava uma vez e deixava o alvo imune ao resto da
tempestade, para o gelo não se quebrar sozinho. Mas o quique **é** a Nevasca: *"se sofrer
outro golpe, ele quebra o gelo, toma dano de novo e é empurrado outra vez"*. Agora rola a
cada 3º acerto (3º, 6º, 9º) e não há imunidade nenhuma.

🔴 **O empurrão também: duas células, em direção SORTEADA** (era uma, para longe do
impacto). Empurrar para fora varre o bando da tempestade em linha e a magia se esvazia
sozinha; sorteado, os monstros ricocheteiam dentro dela.

✅ **E a implementação em `golpeDeArea` foi APAGADA.** Os dois campos nasceram lá, ficaram
sem nenhuma ficha usando quando a Nevasca virou queda, e ao serem invertidos só a cópia
viva mudou — sobrariam duas versões da mesma regra discordando. O teste agora exige `queda`
e não aceita mais `kind: 'ground'`.

### ❄️ As bolas são o visual, o dano é da área (o conserto do 63 %)

Medido por simulação depois de a mecânica ficar pronta (200 mil tempestades, alvo parado):

| | acertos médios | chega ao 3º | dano no Lv.10 |
|---|---|---|---|
| **hoje** (10 bolas, respingo 3×3) | **1,11** | **7,7 %** | **63 %** de 570 % |
| respingo 5×5 | 3,08 | 65 % | 176 % |
| 18 bolas, respingo 5×5 | 5,55 | 97 % | 316 % |

São 81 células no 9×9 e 10 bolas cobrindo 9 células cada: 90 coberturas para 81 células, ou
**1,1 acerto por alvo**. E 28 % das vezes o alvo **não é tocado nenhuma vez**. Com isso o
congelamento dispara em ~2 % das conjurações no Lv.10 — o quique que acabou de ser
implementado é praticamente invisível.

🔴 **Nenhum ajuste de respingo ou contagem chega perto dos 570 %.** O que fecha a conta é o
modelo do RO de verdade: **o dano é da ÁREA, e as bolas são o visual**. O texto que o dono
trouxe diz isso — *"o motor cria uma área de 9×9 e começa a jogar aleatoriamente
mini-**sprites** de 3×3"*. A leitura de 11/09 ("bombardeio, não área") acertou o desenho e
errou o dano.

**Foi o que se fez** (`danoDaArea` na ficha). Cada bola continua sendo desenhada no ponto
sorteado dela; o golpe atinge todo mundo dentro do 11×11 — o raio é `range + splash`, que é
a frase da própria ficha (*"por caírem em células aleatórias da área de 9×9, a área pode
chegar a 11×11"*). Medido de novo, agora com o empurrão em cena:

| | acertos | dano no Lv.10 | congela (Lv.1 / Lv.10) | ileso |
|---|---|---|---|---|
| centro | 6,28 | **358 %** | 83 % / 39 % | 0 % |
| borda | 2,50 | 142 % | 23 % / 10 % | 0 % |

⚠️ **Os 570 % são o TETO, não a média, e quem tira a diferença é o próprio empurrão** —
duas células sorteadas por acerto tiram o alvo do 11×11 depois de ~6 bolas. É o contrajogo
da magia contra ela mesma, e é o que se vê nos GIFs: o monstro é cuspido para fora da
tempestade. Não é para "consertar" subindo o dano.

⚠️ **A área é uniforme: quem está na borda apanha igual a quem está no meio.** No RO a
borda apanha menos, porque lá as bolas são o dano. É simplificação assumida — o preço de
ter o desenho de um modelo com a conta do outro.

### 📌 PENDENTE que este dia deixou

- **O dano da Chuva precisa de uma passada.** Contagem (10→18) e respingo (1→3×3) entraram
  no mesmo dia e se multiplicam. No Lv.10 o poder total por alvo foi de 10,4 para 18,7,
  contra um bando colado. `DD-DRU-021` mede a suprema do Druida contra esse número.
- **A diagonal do meteoro foi tentada e recusada** no mesmo dia. Não voltar como ideia nova.
- **A dissipação da Nevasca (quadros 27–35) não toca.** A folha traz o fim da tempestade, e
  a bola some no estouro. Só volta a fazer sentido se a tempestade tiver um fim visível.
- **O spellcasting feminino não existe.** O autosprite só gerou o masculino.
- **O passo do personagem**: continua o pendente de 10/09 — se as cardinais ainda parecerem
  lentas contra o "para baixo", medir com `?passos=1` antes de mexer.

---

## 2026-09-10 — Fire Bolt e Cold Bolt: a queda do céu vira mecânica

**Onde mora:** `queda` em `SkillDef` (`shared/src/skills.ts`) · `ATRASO_IMPACTO_MS`
e `CUSTO_DIAGONAL` em `shared/src/constants.ts` · `tickGolpesPendentes` e
`marcaConjuracao` em `server/src/index.ts` · `FOLHAS_QUEDA`/`MAGIAS_QUE_CAEM` e
`fatorDiagonal` em `client/src/main.ts` · `tools/contato2fx.mjs`

### O `fx` deixou de ser um aviso por conjuração

🔴 **Um `fx` POR BOLT, mandado quando aquela bola nasce.** Era um aviso só, no
lançamento, com a contagem de bolts e a posição do alvo naquele instante — o
cliente abria dali as dez bolas. Consequência: elas caíam num PONTO FIXO e caíam
TODAS, mesmo depois de o monstro morrer ou sair andando.

As duas coisas que o dono pediu saem da mesma mudança: a bola nasce na posição
que a criatura tem NAQUELE momento (segue quem anda), e se a criatura morreu não
há aviso nenhum (a chuva para).

⚠️ **Cada bolt tem DOIS instantes.** `fxEm` (a bola começa a cair) e `quando`
(ela toca o chão e o dano sai), separados por `ATRASO_IMPACTO_MS` — 58 % de
`DUR_QUEDA_MS`, porque a folha de 24 quadros gasta os catorze primeiros na
descida. Antes o dano saía quando a animação COMEÇAVA: o número vermelho subia
com a bola ainda no céu. Com um bolt por vez ficou impossível de não ver.

⚠️ **O primeiro bolt também foi para a fila**, então o Fire Bolt não dá dano
nenhum no tique do lançamento. Meio segundo de espera é o preço de a bola e o
estrago acontecerem no mesmo lugar da tela.

### O mostrador de recarga mentia

🔴 O bloqueio nunca falhou: `marcaConjuracao` já guardava a recarga CALCULADA
(8,2 s no Lv.10 — a série inteira). Quem estava errado era o aviso `cast`, que
mandava `def.cooldownMs`, o número da FICHA: 1,5 s. O relógio do HUD zerava, o
jogador apertava e levava um `denied`.

`marcaConjuracao` passou a DEVOLVER a recarga aplicada, e os cinco pontos que
avisam o cliente mandam esse retorno. Uma fonte para os dois lados.

### Conjuração que encolhe com o NÍVEL DO PERSONAGEM

🔴 Eixo novo. Até aqui o único redutor de tempo era a Maestria de Conjuração, que
é escolha de pontos e não idade do personagem. `castLevelReduction` sobe
linearmente até 100 % no `NIVEL_CONJURACAO_INSTANTANEA = 250`, e SOMA com a
Maestria — quem gastou os pontos chega ao instantâneo por volta do 175.

🔴 `PISO_CONJURACAO_MS = 1000` existe por causa da Chuva de Meteoros. A redução
por nível chega a 100 % e sozinha apagaria a conjuração dela, cujo contrajogo É
poder ser interrompida. A regra: **só vira instantânea a magia cuja conjuração
base já cabe em um segundo.**

⚠️ `skillCastMs` ganhou um QUARTO parâmetro em vez de reaproveitar o terceiro.
Trocar o sentido de um parâmetro existente compilaria em silêncio nas chamadas
não atualizadas.

### O Cold Bolt virou o gêmeo de gelo

Pedido do dono: *"deveria ser igual a firebolt porém de gelo"*. Era `damage` de
um golpe só, instantânea, com `power` 1,15. Virou `multihit` 1→10, com os mesmos
800 ms de conjuração.

🔴 **O `power` teve de descer para 0,55.** Em `multihit` ele vale POR IMPACTO;
carregar o 1,15 para uma série de dez daria 15,4 de total no Lv.10 contra os 11,8
do Fire Bolt — 30 % a mais por duas de mana. Manter o número seria mudar o
equilíbrio em silêncio.

O que sobrou de identidade: dano de `ice`, `slow` no lugar do `burn`, duas de
mana a mais e o Lv.3 de requisito.

⚠️ As chances do `slow` ficaram como estavam apesar de a magia ter virado série:
o sorteio da condição é UM POR LANÇAMENTO, não por impacto.

### A bandeira `queda` consertou uma bola a mais

🔴 `executeSpell` mandava o `fx` genérico no lançamento para TODA magia de dano,
o Fire Bolt inclusive. Cada lançamento tinha **golpes + 1** bolas: as da série,
que seguem o alvo, e mais uma genérica parada no chão. Com dez sobrepostas
ninguém via; desde que elas passaram a cair uma por vez, virou a primeira coisa
que se nota.

A condição do servidor era `kind === 'multihit' && shape === 'target'`, o que
deixava o Cold Bolt de fora. Virou a bandeira `queda` da ficha — uma decisão de
desenho com consequência de regra, e por isso mora na ficha e não no cliente.

### As folhas de contato

⚠️ **O filtro de croma não dá conta do rótulo.** O recorte do fundo é por cor
(fundo preto e número cinza têm croma zero), mas há uma segunda porta pelo BRILHO
para salvar o núcleo branco do clarão — e o número é cinza claro. Passava por
ela. Agora o rótulo sai por POSIÇÃO: cabe todo num canto de 46×40 da célula, onde
a varredura acha de 0 a 2 pixels com cor por quadro.

🔴 **A grade é MEDIDA, não detectada.** A do Cold Bolt tem nove células nas duas
primeiras fileiras e seis nas duas últimas, e as duas de seis têm cortes
diferentes entre si. E detectar em tempo de corte não funciona: nos quadros de
dissipação o efeito já se quebrou em fagulhas, e o detector lê cada fagulha como
uma célula — na quarta fileira ele acha dez onde há seis.

✅ Regerar `firebolt24` com o conversor novo deu o arquivo byte a byte igual. Era
essa a conferência do refactor.

### O passo na diagonal

🔴 O servidor cobra `CUSTO_DIAGONAL` (1,5×) por um passo diagonal; o cliente
deslizava TODO passo em 1,0× do intervalo. O sprite chegava ao tile e ficava
parado o 0,5× restante, com a animação de caminhada desligada junto — uma
paradinha a cada tile, em tudo que não fosse reto. O dono leu isso como
velocidade: *"muito rápido para baixo e muito lento para todas as outras
direções"*.

O número foi para o `shared`, como `INTERVALO_BOLT_MS` e `DUR_QUEDA_MS`: é o tipo
de valor que precisa ser o MESMO nas duas pontas.

⚠️ **PENDENTE:** isto explica a diagonal, não o par cima/esquerda/direita. As
outras pontas foram varridas atrás de assimetria por direção e não há nenhuma — o
intervalo do servidor só distingue diagonal, o envio do teclado é simétrico,
`animationSpeed` é 0,18 fixo, e as oito fileiras da folha universal têm 16
quadros cada. Se as cardinais ainda parecerem lentas, o próximo passo é MEDIR o
intervalo real por direção no cliente.

---

## 2026-09-08 (noite) — A HUD do personagem, e o NÍVEL DE JOB

**Onde mora:** `#charhud` em `client/index.html` · `ligaPainelDoPersonagem` e
`updateHud` em `client/src/main.ts` · `JOB_MAX_LEVEL`/`jobXpToNext` em
`shared/src/combat.ts` · `grantJobXp` em `server/src/index.ts` · `SCHEMA_V11`

### O painel do personagem

🔴 **Reusa o emblema alado em vez de refazer.** Os ids são os MESMOS —
`portrait`, `charname`, `level`, `hpfill`, `hptext`, `manafill`, `manatext`,
`xpfill`, `xptext` — então o `updateHud` continuou valendo sem uma linha de
mudança. O emblema saiu do alto do mundo; o painel entrou no lugar dele.

⚠️ Ancorado no canto do **viewport**, não da janela: a coluna `#leftbar` ocupa a
esquerda da tela, e prender na janela poria o painel por cima dela.

⚠️ **HP e SP continuam visíveis no modo recolhido** — condição explícita do
dono. Some só o bloco de XP e os botões, que é o que ocupa altura. O estado vai
para o `localStorage`, como a posição da barra de magias.

⚠️ Dos sete atalhos, quatro abrem painel de verdade e três (Missões,
Conquistas, Correio) chamam uma função nomeada que avisa no chat, com um ponto
no canto do botão. **Botão que aceita o clique e não faz nada é pior que botão
ausente:** o jogador clica de novo achando que errou a mira.

### ⚒️ Nível de Job — e por que ele é seguro

Não existia. Decisão do dono: **"letra B" — o SP continua vindo do nível do
personagem.** Isso torna o Job puramente **aditivo**: nenhum personagem que já
jogou fica diferente por causa dele, e nenhum número de balanceamento muda.

| | |
|---|---|
| Teto | 50 (o do Ragnarok clássico) |
| XP | o **mesmo** tanto da base, da mesma morte |
| Curva | mais rasa que a de personagem |

🔴 **A diferença de ritmo vem da CURVA, não da quantidade.** Dar uma fração da
XP e usar a mesma curva daria o mesmo efeito com dois números para manter em vez
de um. Medido: Lv.1 custa 80 contra 150 da base; empatam perto do Lv.10; no
Lv.50 o job custa 13.114 contra 9.227. O job dispara na frente e a base o
alcança — que é como o Ragnarok se comporta.

⚠️ **Teto zera a XP acumulada.** Barra cheia parada no máximo é mais honesta que
uma barra que continua enchendo para nada. E o cliente trata `jobXpNext <= 0`:
sem a guarda, a divisão daria `Infinity` e a barra sumiria em vez de encher.

### ⚠️ A migração, e a armadilha que ela quase repetiu

`SCHEMA_V11` entra pelo mesmo portão das outras — `hasColumn`, nunca
`user_version`. É a regra que este projeto já pagou uma vez.

🔴 **Os testes do servidor quebraram na hora, e o erro era ilegível:**
*"Provided value cannot be bound to SQLite parameter 29"*. Os testes montam
personagem sem os campos novos, e a coluna é `NOT NULL`. O conserto foi no
STORE (`c.jobLevel ?? 1`), não nos testes: um chamador que esqueça o campo deve
gravar o padrão, não derrubar o INSERT inteiro com um erro que aponta para um
número de parâmetro em vez de um nome de campo.

---

## 2026-09-08 (tarde) — Nível por SLOT: o Fire Bolt 4 e o 10 em teclas diferentes

**Onde mora:** `C2S_Cast.level` em `shared/src/protocol.ts` · `castSpell` e
`executeSpell` em `server/src/index.ts` · `SlotDaBarra`, `nivelDoSlot`,
`spellSlots`, `numerosDoNivel` e o clique nos tracinhos em `client/src/main.ts`

Pedido do dono: o painel do Ragnarok — escolher **qual nível** da magia usar, ver
MP, dano, golpes e duração por nível, e arrastar aquele nível para a barra. E o
nível vale **só para aquele slot**.

### 🔴 O que quebrou a premissa antiga

O `spellSlots` era indexado **pela magia**, com um comentário dizendo que dois
atalhos da mesma magia eram "quase sempre engano". Com nível por slot isso deixa
de ser engano e passa a ser o ponto: Fire Bolt 4 para limpar bicho fraco sem
gastar mana, Fire Bolt 10 para o que interessa.

Indexado por id, o segundo slot sobrescreveria o primeiro e **um dos dois
pararia de acender o cooldown, sem erro nenhum**. Passou a ser indexado pelo
índice do slot, e o cooldown acende em todos os slots da mesma magia.

### As decisões

⚠️ **`0` no slot quer dizer "o aprendido"**, não "nível zero". Guardar o número
aprendido na hora de montar congelaria o atalho: subir a skill não mudaria nada.

⚠️ **O servidor LIMITA, não recusa.** Pedir 10 com 4 aprendidos lança em 4.
Recusar seria pior — a barra pode ter sido montada antes de um reset de skills,
e o jogador só veria a magia parar de sair.

⚠️ **A barra salva lê os DOIS formatos.** Antes cada posição era só o id
(`"fire_bolt"`), agora é `{id, nivel}`. Ler só o novo esvaziaria a barra de quem
já jogava, sem aviso.

⚠️ **O nível viaja num canal de arrasto separado** (`DND_NIVEL`), e não como
`id@nivel` dentro do `DND_SKILL`: aquele dado é lido como `SkillId` em mais de um
lugar, e um sufixo faria `SKILLS[novo]` virar indefinido no primeiro
esquecimento.

⚠️ **Clicar no tracinho já escolhido volta para "o aprendido".** Sem essa volta,
quem fixasse um nível não teria como voltar a acompanhar a própria evolução.

### Um defeito meu, pego antes de commitar

`nivelArmado` era gravado ao armar a magia e **nunca lido** no clique: mirar com
o Fire Bolt 4 lançaria o 10. É o mesmo tipo de furo do `atraso > 0` de ontem —
código que compila, roda e faz a coisa errada em silêncio.

---

## 2026-09-08 — Quatro ajustes de quem jogou: andar para lançar, queda mais lenta e o dobro nos monstros

**Onde mora:** `conjurarAoChegar` e `DUR_QUEDA` em `client/src/main.ts` ·
`MULT_CRIATURA` e `CREATURES_BASE` em `shared/src/combat.ts` ·
`shared/tests/combat.test.ts`

O dono testou a mira, aprovou, e trouxe quatro correções.

### 1. Longe demais? O herói anda até o alcance

Vale para os dois casos: na de alvo único ele se aproxima do monstro, na de área
do **ponto clicado**.

🔴 **Ele para assim que ENTRA no alcance, não ao chegar em cima.** O
`irParaPerto` traça a rota até o lado do alvo, mas o laço do tique interrompe no
primeiro tile de onde já dá para lançar. Um mago que caminhasse até encostar
perderia justamente a vantagem que a distância dá a ele.

⚠️ Três saídas, como o "pegar ao chegar" que já existia: entrou no alcance →
lança; rota acabou sem chegar → desiste calado; `Esc` ou clique para andar →
cancela, senão a magia sairia sozinha no meio de um caminho que o jogador mudou.

### 2. A queda ficou lenta

620 ms → **1000 ms**. ⚠️ Não é a cadência dos bolts (essa é do servidor): com a
queda mais longa que o intervalo de 140 ms, as bolas passam a se sobrepor no ar
— que é como uma rajada de dez deve parecer, chuva e não fila.

### 3. 🔴 O dobro de XP e status nos monstros

*"Estão muito fracos para um lvl 150."* Um `MULT_CRIATURA = 2` aplicado sobre a
tabela inteira.

**Mora num lugar só, e não nas 97 fichas.** Multiplicar entrada por entrada
daria 97 chances de errar uma, e desfazer exigiria as 97 de volta. Com a tabela
crua preservada em `CREATURES_BASE`, voltar atrás é trocar o número por 1.

Escala vida, força, defesa, defesa mágica e XP. **Não** escala ouro (o pedido
falou de XP e status), cadências (velocidade não é força) nem os poderes de
habilidade de CHEFE — um chefe com o dobro de vida e o mesmo golpe fica mais
demorado, não mais perigoso, e isso merece decisão própria.

### 4. ⚠️ E os testes de balanceamento, que quebraram na hora

Quatro testes das âncoras do documento (`DD-BAL-027`, `033/034/035`, `036`,
`055`) falharam no primeiro `npm test` — eles fixam os números canônicos do
Doc 3. O comentário de um deles já previa isto: *"se algum dia mudar, é decisão
do dono."*

✅ **A saída preserva as duas coisas:** as âncoras passaram a ler
`CREATURES_BASE`, então continuam guardando a curva do documento; o
multiplicador é um botão de dificuldade por cima, com **teste próprio**. Sem
esse teste novo, mexer no multiplicador deixaria a suíte inteira verde com o
jogo duas vezes mais fácil.

---

## 2026-09-08 — A MIRA: a magia passa a cair onde o cursor aponta

**Onde mora:** `castRange`/`castRangeEvery`, `skillCastRange` e `skillMiraNoChao`
em `shared/src/skills.ts` · `C2S_Cast` em `shared/src/protocol.ts` · `Mira`,
`castSpell`, `executeSpell` e `plantaArea` em `server/src/index.ts` ·
`magiaArmada`, `pintaMira` e `castSpellId` em `client/src/main.ts` ·
`#spellcursor` em `client/index.html`

Decisão do dono: *"o círculo seguindo o mouse"*. A tecla passa a **armar** a
magia; o clique manda o ponto.

### 🔴 O achado que mudou o desenho: `range` significa DUAS coisas

Nas magias de alvo único, `range` é a **distância de lançamento**. Nas de área,
é o **raio do estouro**. Enquanto a área saía centrada no mago os dois nunca se
encontraram — mas mirar exige os dois números ao mesmo tempo.

Sem um campo novo, uma Chuva de Meteoros de raio 2 só poderia ser mirada a 2
tiles: praticamente em cima do próprio mago. Daí `castRange`, com padrão **6** e
+1 a cada 3 níveis — o mesmo ritmo das bolas.

⚠️ O tooltip passou a mostrar **os dois**: *"raio 2 · lançar até 6"*. Mostrar só
um deixaria o jogador achando que a magia só pega o que está colado nele.

### A marca é um CÍRCULO, e o que isso custa

🔴 O jogo mede distância em **Chebyshev**: raio 2 pega um bloco 5×5, não um
disco. Desenhei o quadrado real primeiro e o dono preferiu o círculo mesmo
assim — decisão dele, registrada.

⚠️ **O custo, para quem for mexer:** os quatro CANTOS do bloco ficam de fora do
círculo e mesmo assim levam dano. O raio desenhado é `(raio + 0,5)` tiles — a
circunferência inscrita no quadrado, que toca o meio dos lados. É o desenho
mais próximo da verdade dentro da forma pedida.

Alvo único sempre foi círculo — lá é um tile só, e ele não mente.

### As decisões de borda

⚠️ **O tile mirado ganha do alvo travado.** Quem clicou num monstro com a magia
armada apontou para ELE. E a busca do alvo é no SERVIDOR, pelo tile: o cliente
manda a posição, não o id, e assim não dá para mirar algo que já morreu.

⚠️ **A mira é guardada com a conjuração**, não relida no fim. Uma magia de 2 s
apontada num ponto tem de cair NAQUELE ponto — reler o mouse no impacto deixaria
mover o estouro depois de já ter começado.

⚠️ **Os três campos do `cast` são opcionais.** Sem mira, o servidor volta ao
comportamento antigo: alvo travado para alvo único, os próprios pés para área.
Cliente desatualizado continua funcionando.

⚠️ **`self` e `party` continuam saindo na tecla** — não há para onde mirar, e
exigir um clique seria burocracia.

⚠️ O clique com magia armada vem **antes** do construtor e dos tiles clicáveis:
quem armou apontou para aquele ponto, e sair andando até lá seria o oposto. E
desarma mesmo se o servidor recusar, senão o clique seguinte conjuraria sem
querer.

---

## 2026-09-08 — As regras de conjuração: alcance por nível, cooldown global e bolt a bolt

**Onde mora:** `gcdUntil`, `GCD_MAGIA_MS`, `marcaConjuracao`, `golpesPendentes`,
`aplicaGolpeDeMagia` e `tickGolpesPendentes` em `server/src/index.ts` ·
`rangeEvery` das três magias de alvo em `shared/src/skills.ts` · `spawnQueda`
em `client/src/main.ts`

Três pedidos do dono, todos sobre a mesma coisa: o mago tem a distância como
vantagem, e ela precisa de limite e de ritmo.

### 1. O alcance cresce com o nível

**Nenhuma magia de alvo crescia.** As três tinham `rangeEvery: 0` — alcance
travado do nível 1 ao 10, enquanto as de área já cresciam (`every` 4, 5 e 6).

| | Lv.1 | Lv.5 | Lv.10 |
|---|---|---|---|
| Fire Bolt | 6 | 7 | **9** |
| Cold Bolt | 6 | 7 | **9** |
| Bola de Raio | 5 | 6 | **8** |

+1 tile a cada 3 níveis. O servidor **já recusava** alvo fora de alcance
(*"Alvo longe demais"*), então o limite não é novo — o que era novo é ele
acompanhar a habilidade.

### 2. 🔴 Cooldown GLOBAL de magia — 1 segundo

Não existia. Só havia cooldown **por habilidade**, então dava para encadear Fire
Bolt + Cold Bolt + Bola de Raio no mesmo instante e despejar três rajadas de uma
vez. Agora qualquer `magic: true` tranca as outras por 1 s.

⚠️ **Vale só para magia**, de propósito. Um cooldown global de verdade atingiria
o Knight e o Assassino, que ninguém pediu para mexer.

⚠️ **Marcado só depois de a magia SAIR.** Marcar antes puniria quem apertou a
tecla sem alvo válido: a habilidade nem sai, e o jogador ficaria um segundo
travado por um clique no vazio. Por isso os cinco pontos que gravavam cooldown
viraram um `marcaConjuracao()` só — acrescentar o global à mão em cinco lugares
fica certo em quatro e errado no quinto, sem dar erro.

### 3. 🔴 Bolt a bolt: dez impactos separados, não um acumulado

*"O dano é à medida que vão descendo os bolts do céu."* O multi-hit de alvo
único resolve **um impacto a cada 140 ms**; só o primeiro sai no tique do
lançamento, os outros esperam em `golpesPendentes`.

⚠️ **Cada bolt revalida ao cair.** Entre o lançamento e o décimo passa mais de
um segundo: a criatura pode morrer, o jogador pode morrer ou trocar de andar.
Nada disso pode virar dano fantasma.

⚠️ **Poder e crítico são capturados no LANÇAMENTO.** Se um buff caísse no meio
da rajada, os bolts da mesma conjuração bateriam diferente uns dos outros — e o
jogador não teria como entender por quê.

⚠️ Dez bolts levam **1,26 s**, dentro do cooldown de 1,5 s do Fire Bolt. Se
algum dia a contagem passar de dez, os dois números precisam ser revistos
juntos.

⚠️ O de ÁREA (Chuva de Meteoros) continua num tique só: lá os impactos já se
espalham entre alvos diferentes.

### E o cliente parou de espaçar

Havia defasagem dos dois lados por um momento, e os atrasos **se somavam** — a
última bola cairia quase um segundo depois do próprio dano. Quem espaça agora é
só o servidor; o cliente desenha o que chega.

---

## 2026-09-07 (madrugada) — A animação do Fire Bolt, e a folha que não é grade

**Onde mora:** `tools/fx2strip.mjs` (novo) · `arte-fonte/fx/firebolt.png` ·
`client/public/assets/fx/firebolt.png` · `quedas`, `spawnQueda` e o `case 'hit'`
em `client/src/main.ts`

### 🔴 A folha de origem NÃO é uma grade

É desenho gerado por IA: os quadros ficam lado a lado, mas cada um tem a sua
largura e o espaçamento muda ao longo da fita. Medido:

```
1774 x 887   larguras 38..131 px   espaçamento 88..151 px
```

Cortar por célula fixa — o que **todos** os outros conversores deste projeto
fazem — daria meio quadro por célula a partir do quinto.

### As três decisões que fazem a animação sobreviver ao corte

🔴 **1. Uma ESCALA só para todos os quadros.** A bola cresce enquanto cai, e o
impacto é largo. Normalizar cada quadro para preencher a célula apagaria
exatamente isso: a bola ficaria do mesmo tamanho do começo ao fim.

🔴 **2. Uma JANELA VERTICAL só, comum a todos.** A bola desce dentro do quadro —
é o que faz ler como queda. Recortar cada um na própria caixa e centralizar
mataria o movimento: a chama ficaria parada enquanto só a forma mudasse.

⚠️ **3. Faixas quase coladas são o MESMO quadro.** Na dissipação as brasas se
soltam da chama e abrem um vão DENTRO do quadro — o mesmo defeito que a flecha
do arco causou horas antes. Medido: vãos entre quadros de **21 a 57 px**, vão
interno de **2 px**. O corte ficou em 10, e a contagem fechou em 16.

Saída: `1024 x 64`, dezesseis células de 64.

### Uma queda por IMPACTO — a contagem sai de graça

O servidor manda um `hit` por impacto, e o `fire_bolt` solta um bolt por nível.
Então o cliente **não precisa saber o nível de ninguém**: golpe com
`element: 'fire'` faz cair uma bola sobre o alvo, e dez impactos fazem dez.

⚠️ Os impactos da mesma conjuração chegam no MESMO pacote. Sem defasagem as dez
bolas cairiam empilhadas e pareceriam uma — daí o contador de rajada, com 90 ms
entre bolas.

⚠️ Ancorada em baixo e no centro: nos últimos quadros a explosão fica na base da
célula, e é ela que tem de cair no tile. Ancorar no meio deixaria o estouro meio
tile acima do alvo.

⚠️ A tira é carregada **sem `await`**: é enfeite, e travar a entrada no mundo
por causa dela seria trocar efeito por tempo de carga. Faltando, nada anima e o
dano continua igual.

⚠️ **Não foi visto em jogo ainda** — exige conjurar com um Feiticeiro contra uma
criatura. O que está conferido é a tira (16 quadros, 1024×64) e que o cliente
compila e serve o arquivo.

---

## 2026-09-07 (madrugada) — Fire Bolt: um bolt por nível

**Onde mora:** `fire_bolt` em `shared/src/skills.ts`

🔴 **Decisão do dono:** *"1 hit lvl 1 … 10 hits lvl 10, sendo cada hit um novo
bolt que cai do céu."* Substitui o 2→4 que estava lá.

⚠️ **Os números antigos eram NOSSOS, não do documento.** O Doc 1 só diz *"alvo
único econômico, multi-hit"* (linha 629 do destilado) e não fixa contagem — não
há conflito com a fonte de verdade.

`porNivel` é linear entre `hits` e `hitsAtLv10`, e o intervalo 1..10 casa com os
dez níveis, então o número de impactos **é** o nível. Conferido rodando
`skillHits` de verdade, nível a nível:

```
Lv 1  bolts=1   power/impacto=0,55   total=0,55
Lv 5  bolts=5   power/impacto=0,83   total=4,15
Lv10  bolts=10  power/impacto=1,18   total=11,80
```

### 🔴 O dano total mudou muito, e o `power` NÃO foi mexido

| | antes | agora |
|---|---|---|
| Lv. 1 | 2 × 0,55 = **1,10** | 1 × 0,55 = **0,55** |
| Lv. 10 | 4 × 1,18 = **4,72** | 10 × 1,18 = **11,80** |

**Metade no nível 1 e 2,5× no nível 10.** É consequência direta da regra pedida,
não descuido. Nada foi compensado por conta própria: balancear o `power` é
decisão de dono, e o pedido foi sobre a contagem de bolts.

⚠️ **A ANIMAÇÃO ainda não entrou** — falta a tira crua de 16 quadros 64×64. Hoje
o Fire Bolt é dois círculos de `Graphics` voando do conjurador ao alvo em 180 ms,
e não existe tocador de FX de sprite para projétil. Ver o bloco do HANDOFF.

---

## 2026-09-07 (23h30) — O palco enche, e o cartão vira busto

**Onde mora:** `ZOOM_BUSTO` e `retratoDeClasseCss` em `client/src/heroes.ts` ·
`pintaPalco` em `client/src/main.ts`

O `#ccpalco` nasceu vazio em 02/09 com um comentário dizendo que era *"lugar
reservado, não esquecimento"* — o dono ainda estava fazendo o boneco. Desde
hoje os retratos existem, e é isto que ocupa o espaço.

### Dois enquadramentos do MESMO arquivo

| | Onde | Como |
|---|---|---|
| **`palco`** | meio da tela de criação | figura inteira, `contain`, ancorada embaixo |
| **`busto`** | cartão da lista de classes | cabeça e peito, ampliado 2,7×, ancorado em cima |

🔴 **Por que o busto precisa de ampliação.** O retrato é uma figura de proporção
~1:2. Numa caixa quadrada de 48 px, `contain` mostraria o corpo todo com **meia
caixa de largura** — o rosto sairia com uns 10 px e não se leria nada. Ampliando
2,7× a altura, a caixa passa a enquadrar o terço de cima.

⚠️ **A ampliação é fixa para as cinco classes, embora as larguras variem** (110
a 136 px). Fixar a AMPLIAÇÃO mantém as cinco cabeças do mesmo tamanho; fixar a
largura faria a classe mais estreita ter a cabeça maior que as outras.

⚠️ **Sem classe escolhida o palco fica vazio**, e é a escolha certa: um retrato
genérico ali daria a impressão de que já há uma classe selecionada — e o botão
diz "Escolha uma classe" justamente porque não há.

⚠️ É `background`, não `<img>`: o palco é caixa elástica (`flex: 1`) e `contain`
faz o retrato caber sozinho na altura que sobrar. Com `<img>` seria preciso
calcular essa altura na mão.

---

## 2026-09-07 (23h) — "Voltar ao login" na seleção de personagem

**Onde mora:** `#tologinbtn` em `client/index.html` · `setupCharSelectScreen`
em `client/src/main.ts`

Quem entrava na conta ficava preso na lista de personagens: para trocar de conta
só fechando a aba. O botão resolve.

### 🔴 Este NÃO recarrega a página — e o "Trocar personagem" recarrega

Os dois parecem o mesmo botão e não são. O "Trocar personagem" vive **dentro do
mundo**, onde as ~3.300 linhas de `startGame` já declararam o estado da partida
e não existe teardown; recarregar é o que dá estado limpo de graça.

Aqui o mundo **nunca foi montado** — só há a lista. Trocar de tela basta, e
evita rebaixar os **76 MB** do vídeo de fundo, que o Chromium se recusa a
cachear. Recarregar por simetria custaria um minuto de download por clique.

### O token é esquecido, e é a metade que faltaria

`esqueceToken()` antes de trocar de tela. Sem isso o token continuaria válido no
`sessionStorage` e a próxima recarga reabriria a lista da **conta antiga** — o
jogador teria pedido para sair e voltado ao mesmo lugar.

⚠️ **Re-autenticar no mesmo socket é suportado:** o servidor só sobrescreve
`player.accountId` e responde com um `charlist` novo (`case 'auth'`). Não é
preciso derrubar a conexão, e foi isso que dispensou a recarga.

⚠️ A senha é limpa, o usuário não — o campo já nasce preenchido pelo
`localStorage`, e apagá-lo faria redigitar quem só errou a senha.

---

## 2026-09-07 (22h30) — Os retratos ilustrados entram na tela de criação

**Onde mora:** `tools/retratos2card.mjs` (novo) · `COM_RETRATO`,
`temRetrato` e `retratoDeClasseCss` em `client/src/heroes.ts` · o cartão e o
botão de sexo em `client/src/main.ts` · `client/public/assets/retratos/`

O dono desenhou as cinco classes **nos dois sexos** e pediu que o cartão da tela
de criação mostrasse o desenho, não o boneco top-down. São dez retratos.

### 🔴 O fundo sai por ALAGAMENTO, não por cor

As ilustrações vêm com fundo — parte em cinza chapado **sem canal alfa**
(`colorType 2`), parte já em RGBA. Coladas como estão, cada cartão viraria um
quadrado cinza.

**Apagar "tudo que é cinza" comeria a cabeça do personagem:** o cabelo é
prateado, quase da cor do fundo. O alagamento parte da borda e só alcança o que
está ligado à moldura, então o cinza preso entre as mechas fica. Medido: 77 % a
87 % da imagem apagada, e o cabelo intacto.

⚠️ Tolerância folgada (32 por canal) porque o fundo tem gradiente e ruído de
compressão. Apertar deixa auréola clara no contorno, que em tela lê como
serrilhado sujo.

### ⚠️ `image-rendering` fica no AUTOMÁTICO — ao contrário de todo o resto

Estes são desenhos, não pixel art. `pixelated` numa ilustração reduzida de 256
para 48 px serrilha o contorno inteiro. A regra de escala inteira que rege os
sprites **não vale aqui**, e confundir as duas faria o cartão parecer quebrado.

O retrato é ancorado em `center bottom`: as alturas de conteúdo diferem um
pouco entre as cinco, e alinhar pelo pé mantém as cabeças na mesma faixa — a
mesma ideia do `GROUND_Y` dos sprites, feita em CSS.

### A cadeia de queda

`retrato ilustrado → sprite da classe → ícone MiniWorld`. Ela existe porque
**imagem de CSS que falta não dá erro**: sem a cadeia, um retrato ausente
deixaria o cartão vazio e silencioso. Por isso `COM_RETRATO` é uma lista
estática — declarar custa uma linha e falha alto; perguntar ao disco exigiria
carregar dez imagens antes de desenhar a tela.

⚠️ **O retrato do HUD (32 px) NÃO mudou.** Continua saindo da tira do sprite.
O pedido foi sobre a tela de criação, e o HUD tem um encaixe alado com miolo
vazado medido para o sprite — trocar a arte lá é outra conversa.

---

## 2026-09-07 (22h) — Arco e conjuração, e a terceira tentativa de ler a grade

**Onde mora:** `LOTES` e `grade()` em `tools/universal-fonte.mjs` · `ACOES` em
`tools/universal2strip.mjs` · `OneShot`, `castAnim` e `playAttack` em
`client/src/main.ts`

### As duas animações

O dono trouxe `bow atack` e `spellcasting` da personagem feminina, cinco
direções cada, e pediu: **arco equipado → gesto de arco; magia de ataque
(fire bolt, cold bolt, área) → gesto de conjurar.**

✅ **São as primeiras ações com AS CINCO DIREÇÕES.** O golpe de espada só tem
perfil — atacar para cima mostra o personagem de lado. Arco e magia não têm esse
defeito: cada direção vem da sua folha, a esquerda é o espelho, e saem 8.

⚠️ São **um disparo, não um ciclo**, então a amostragem vai do primeiro ao
**último** quadro: o fim do gesto (a flecha soltando) é o que importa. Ficaram
em 8 quadros dos 49 disponíveis, o mesmo do golpe de espada — o motor toca o
disparo em duração fixa, e mudar a contagem mudaria o ritmo do combate junto.

### 🔴 A grade: errei duas vezes antes de acertar

As folhas novas são **5376 × 5376**, e **oito** tamanhos de célula dividem esse
número. Só o desenho decide qual é.

1. **Contar faixas de conteúdo** (o método que funcionava até aqui) falhou **das
   duas maneiras possíveis na mesma folha**: o arco estendido encosta no quadro
   vizinho e funde duas faixas; a flecha se separa do corpo e abre um vão
   *dentro* do quadro, partindo uma faixa em duas. Deu "10 colunas", número que
   nem divide 5376.
2. **Exigir juntas vazias** falhou porque o arco **cruza a borda da célula**:
   nenhum tamanho passou de 50 % de juntas limpas, e o teste rejeitava a grade
   certa.
3. ✅ **O ESPAÇAMENTO entre os começos das faixas** funciona. Medido: 237, 1006,
   1775, 2542, 3309, 4077, 4845 — diferenças de 769, 769, 767, 767, 768, 768. A
   **mediana** dá 768, e as duas falhas de contagem viram ruído que ela ignora.

### O gatilho da magia

🔴 **`S2C_Hit.element` é o único sinal disponível.** O `hit` não diz qual
habilidade foi usada, mas fire bolt chega como `fire` e cold bolt como `ice`,
enquanto espadada chega como `physical` ou sem o campo. Projétil não serve: o
`kind` sai da CLASSE (`player.cls.projectile`), não da magia.

⚠️ **O gesto toca quando o dano CAI, não quando a conjuração começa.** Para
magia instantânea é igual; para uma que viaja, o gesto atrasa o tempo do voo.
Consertar de verdade exigiria o servidor dizer "fulano começou a conjurar" para
todo mundo — hoje `S2C_Casting` vai só para quem conjura.

⚠️ `castAnim` sai de `attacks.staff` **direto, sem `golpeDe`**: a cadeia de
fallback terminaria no golpe de espada, e conjurar viraria uma espadada em quem
está longe. Sem folha o campo fica `undefined` e o feitiço anima como golpe da
arma.

---

## 2026-09-07 (noite) — A personagem FEMININA entra, e o ciclo do passo deixa de ser constante

**Onde mora:** `tools/universal-fonte.mjs` (novo) · `tools/universal2strip.mjs`
(reescrito) · `universalDoSexo`, `packDe` e `loadHeroArt` em
`client/src/heroes.ts` · o sítio de desenho em `client/src/main.ts` ·
`arte-fonte/universal/{male,female}/` · `client/public/assets/classes-universal/{male,female}/`

### 🔴 O bug que quase entrou, e que não daria erro nenhum

O dono trouxe vinte folhas novas do autosprite — `idle` e `walk`, cinco
direções, **dois sexos**. O conversor tinha o ciclo do passo **cravado em
constante** (`CICLO = [0, 25]`), medido à mão numa folha de 56 quadros. As
folhas novas quebram essa premissa de três jeitos:

| | |
|---|---|
| A contagem de quadros varia por FOLHA | 29 ou 55 |
| Varia entre os SEXOS na mesma direção | `walk_down` tem 55 no masculino e 29 no feminino |
| Algumas trazem DOIS ciclos | 55 quadros = duas passadas |

🔴 **É o terceiro que mata.** Amostrar 16 quadros ao longo de uma folha de dois
ciclos daria **dois passos por tile** contra um passo do outro sexo — a
personagem feminina andaria com as pernas no dobro da frequência. Nada disso dá
erro: sai arte "quase certa".

### A medida que substituiu a constante

Uma passada tem **duas passagens** — o instante em que os pés se cruzam e a
abertura é mínima. Contando as passagens e dividindo por dois sai o número de
ciclos. Medido:

```
[male]   perfil: 29 quadros · 2 passagens → 1 ciclo · passada = 29,0 quadros
[female] perfil: 55 quadros · 4 passagens → 2 ciclos · passada = 27,5 quadros
```

⚠️ **Só o PERFIL serve para medir.** De lado a abertura vai de 42 a 110 px; **de
frente varia 9 px** (31 a 40), porque as pernas se movem em direção à câmera. As
outras quatro direções herdam o período do perfil, e cada folha calcula seus
próprios ciclos por `quadros / passada`.

### O passo de redução saiu da mão e virou ferramenta

`universal-fonte.mjs` é novo e existe porque **as folhas não vinham todas na
mesma célula**:

| folha | célula | grade |
|---|---|---|
| dezoito delas | 256 | 8 × n |
| `male idle_right` | **768** | 7 × 4 |
| `male idle_up` | 256 | 8 × 7, e em **PNG de PALETA** |

Escalar as vinte pelo mesmo fator deixaria uma com o personagem **três vezes
maior** — a versão adulta da armadilha que o HANDOFF já registrava ("a sola em
220 contra 110 é o sinal"). A grade agora é medida por arquivo, contando faixas
vazias de alpha: `2048/8 = 256` e `2048/16 = 128` são os dois inteiros, e só o
desenho diz qual é o certo.

### O sexo volta a trocar o desenho

O comentário que estava em `main.ts` dizia, desde agosto: *"o dia em que houver
variante feminina, é aqui que ela volta a trocar o desenho"*. Era hoje.

🔴 **É o sexo DA ENTIDADE (`e.gender`), nunca o do jogador local.** O campo já
existia no `EntitySnapshot` e já vinha resolvido três linhas acima do sítio de
desenho — só não era usado. Numa tela com dois jogadores, usar `selfGender`
desenharia o outro com o corpo errado.

⚠️ `loadHeroArt` passou a carregar **os dois sexos de uma vez**, e não sob
demanda, pelo mesmo motivo. O custo é pequeno porque o pack é `arteUnica`: são
duas tiras no total, não dez.

### O que NÃO entrou

- **A feminina não ataca.** O autosprite não gerou golpe para ela; o
  `fatiaOpcional` devolve `undefined` sem erro e o motor cai no pulinho de
  investida.
- **Nenhum dos dois morre.** Continua sem folha de morte.
- ✅ O golpe do masculino é herdado da folha de 07/09 de manhã, e **conferido em
  tela: é o mesmo boneco** da caminhada nova — cabelo prateado, roupa marrom.
  Era o risco que a reescrita deixou anotado, e não se confirmou.

---

## 2026-09-07 (noite) — As 8 direções voltam, e desta vez a causa foi consertada

**Onde mora:** `DIRECTIONS`, `CARDINAL_OF` e `directionFromDelta` em
`shared/src/constants.ts` · `DirAnim` em `client/src/miniworld.ts` · `framesFor`
e `PASSOS_RETOS` em `client/src/main.ts` · `fatia` em `heroes.ts` · a tabela
`FONTE` em `tools/universal2strip.mjs`.

### 🔴 Elas já existiram, e foram removidas por um bug que não era delas

Em agosto o dono relatou o personagem *"atravessando o mapa virado de lado"*, e
a rota foi cortada para 4 direções. **O culpado não era a diagonal:** era o
`dirFromDelta` do servidor decidindo por `Math.abs(dx) >= Math.abs(dy)` — num
passo diagonal os dois são iguais, o empate caía sempre em `right`.

Cortar a diagonal escondeu o sintoma por um mês. Agora a função mora no
`shared`, tem nome por combinação de sinais e não empata, e a rota pôde voltar.

### A decisão que evitou reescrever 51 pontos

`DirAnim` ganhou as quatro diagonais como campos **OPCIONAIS**. Toda a arte
anterior — 77 espécies do bestiário, MiniWorld, packs de classe — tem quatro
linhas e continua válida; quem não traz diagonal cai na cardinal em `framesFor`.

🔴 **A queda é para o eixo VERTICAL** (`up_right` → `up`), o oposto do que o
código fazia em agosto. Num jogo visto de cima o que se lê primeiro é se o
personagem vem ou vai, não para que lado — cair em `right` era exatamente o bug.

⚠️ **`CARDINAL_OF` mora no `shared`** porque o servidor decide a direção e o
cliente a desenha: se discordassem do que é "a cardinal de `up_right`", o sprite
olharia para um lado e andaria para outro.

### 4 linhas ou 8, decidido pela IMAGEM

`fatia` lê a altura da folha: 4 linhas → cardinais; 8 → com diagonais. Um pack
não declara nada, a imagem já diz o que tem.

### As cinco folhas dão as oito direções

O autosprite entrega só o lado direito, e é o suficiente: `left`, `up_left` e
`down_left` são espelhos exatos. Cinco folhas, oito direções — a tabela `FONTE`
no conversor.

⚠️ **O golpe continua só de perfil**, então as oito linhas dele saem da mesma
folha. Atacar para cima mostra o personagem de lado. Faltam as folhas de frente,
costas e as duas diagonais do golpe.

⚠️ **A diagonal ficou ~33 % mais rápida** que o caminho em L de antes (um passo
em vez de dois). É o normal de MMO em grade; se incomodar, o conserto é custo
1,41 na diagonal, não remover de novo.

---

## 2026-09-09 (noite) — O personagem universal entra nas CINCO classes

**Onde mora:** `tools/universal2strip.mjs` (novo) · `arte-fonte/universal/` ·
`client/public/assets/classes-universal/` · `PACK_UNIVERSAL` e
`HERO_ART_CLASSES` em `client/src/heroes.ts`.

O dono gerou um personagem base no autosprite.io e pediu para vê-lo no jogo
substituindo todas as classes.

### 🔴 O que entra é muito diferente do que o motor lê

| | autosprite | motor |
|---|---|---|
| Arquivo | **um por direção** (5) | **um** com 4 direções |
| Quadros | **56** de 128 px | **4** de 80 px |
| Direções | up, up-dir, dir, baixo-dir, down | down, up, right, left |

A ESQUERDA não vem no pacote: num conjunto de 8 direções ela é o espelho da
direita, e é assim que o conversor a produz.

### 🔴 Os 4 quadros não são quatro quaisquer — e isso quase passou batido

`main.ts` rege o passo pelo CHÃO, não por um relógio:

```js
sprite.gotoAndStop((paridade ? 0 : 2) + (contato ? 1 : 0));
```

A tira tem de ser **[passagem-A, contato-A, passagem-B, contato-B]**. Pegar
quatro quadros igualmente espaçados quebraria a sincronia — e o resultado é
exatamente o "deslize" que o dono já relatou jogando, em agosto.

⚠️ **Os índices foram MEDIDOS, não escolhidos.** A abertura dos pés no PERFIL
varia de 20 px a 57 px ao longo do ciclo:

```
contato  (pés abertos): 0 · 13 · 25 · 48
passagem (pés juntos):  9 · 19 · 32 · 42
```

Daí saem os quatro: **[19, 0, 9, 13]**, todos do primeiro ciclo para as pernas
casarem. ⚠️ A primeira tentativa mediu a ALTURA no quadro de frente e não deu em
nada: ela varia só 3 px em 93, porque de frente as pernas se movem em direção à
câmera. O perfil é o único ângulo em que o sinal é limpo.

### As três armadilhas que a implementação encontrou

1. **`HERO_ART_CLASSES` tinha quatro nomes.** Definir o pack do Druida não
   bastava: é essa lista que decide se a classe TEM arte, e sem o Druida nela
   ele continuaria no boneco verde do MiniWorld — com o pack configurado e nunca
   lido. Meia-implementação que não dá erro.
2. **O caminho é `${base}/${cls}/${nome}.png`**, com subpasta por classe. Como
   aqui a arte é uma só, entrou `arteUnica` no `Pack`. A alternativa era copiar
   350 KB de binário idêntico em cinco pastas.
3. **`heroIconCss` monta o retrato do cartão por CSS**, e imagem de CSS que
   falta **não dá erro** — o cartão só fica vazio. Precisou do mesmo
   `arteUnica` e de um `pose.png` no pack.

### A escala

As folhas foram reduzidas de 128 para 80 px por célula com ffmpeg
(`flags=lanczos`), OFFLINE e uma vez só. Isso leva o conteúdo de 93 px para 62 —
perto dos 58 das outras classes — e permite `targetH === contentH`, escala
**1,0×**, sem serrilhado em tempo de desenho.

### ⚠️ O que este pack NÃO tem

Só `walk`, `idle` e `pose`. **Sem golpe e sem morte:** atacar cai no pulinho de
investida e morrer não tomba. É pack de TESTE, e nada da arte antiga foi
apagado — `PACK_ANTIGO` e `PACK_PIXELLAB` continuam de pé, e voltar é trocar as
cinco linhas de `PACK_DA_CLASSE`.

⚠️ O som de passo que o dono mandou junto (`.mp3`, 2,3 s) **não entrou**: o jogo
não tem áudio no mundo, só a música da tela de entrada. É trabalho à parte.

---

## 2026-09-09 (fim da tarde) — Dois escurecedores empilhados, e um título por cima do outro

**Onde mora:** `#loginbg::after` e `#startmid` em `client/index.html`.

Dois defeitos, **os dois causados pela refatoração da camada compartilhada** de
minutos antes. Ficam registrados porque a causa é a mesma nos dois: quando um
fundo que era POR TELA vira COMPARTILHADO, tudo que cada tela desenhava por cima
dele passa a somar.

### 🔴 A tela de criação ficou quase preta

> *"o vídeo está escuro na tela de criação de personagem"*

Cada tela tinha o próprio escurecedor, de quando cada uma desenhava o próprio
fundo. Com a camada compartilhada, os dois passaram a **empilhar**:

| Camada | Topo | Base |
|---|---|---|
| `#loginbg::after` (compartilhado) | 0,55 | 0,82 |
| `#startbg::after` (da criação) | 0,62 | 0,86 |
| **Composto** — `1−(1−a)(1−b)` | **0,83** | **0,97** |

**0,97 é preto.** O `#startbg` inteiro saiu (o div já estava vazio depois da
refatoração), e o aviso ficou escrito no `#loginbg::after`: **não crie um
segundo escurecedor por tela.** Se uma tela precisar de mais contraste, o lugar
é o painel dela.

### 🔴 "CRIAR PERSONAGEM" saía por cima do "ELYSIA" do vídeo

O segundo defeito só apareceu depois de clarear o primeiro — estava escondido
pelo escuro.

O vídeo traz **"ELYSIA ONLINE" desenhado nele**, no alto e ao centro, que é
exatamente onde o cabeçalho da criação fica. Até hoje esta tela usava a arte
ANTIGA, que não tinha título, e os dois nunca se encontraram.

A correção foi uma **placa** atrás do `h2` e do subtítulo. Ela resolve dois
problemas de uma vez: separa os títulos e dá contraste ao subtítulo, que antes
se perdia no céu (e foi clareado de `#8a8272` para `#a89e8a`).

⚠️ **O escurecimento foi para o PAINEL, não para outra camada sobre o fundo** —
que é exatamente a armadilha do item anterior.

### ⚠️ Um efeito colateral do tamanho, que não é bug e não tem conserto barato

O console repete `net::ERR_CACHE_WRITE_FAILURE` a cada carregamento: o Chromium
**recusa cachear** um arquivo de 76 MB. Na prática o vídeo é rebaixado a cada
visita.

Isso não é consequência da refatoração — é do tamanho, e reforça o que já estava
anotado: quem quiser aliviar, o caminho é **1080p (13,1 MB)**, que caberia no
cache.

---

## 2026-09-09 (tarde) — O vídeo para de cortar, e passa a servir as três telas

**Onde mora:** `#loginbg`, `#loginvid` e as regras das três telas em
`client/index.html` · `tocaFundoDaTela` em `client/src/main.ts`.

Dois pedidos do dono, e o segundo revelou um problema de rede.

### 🔴 `cover` → `contain`: o corte tinha 10 %

> *"não está aparecendo ele todo, está cortando"*

O `object-fit: cover` foi escolha de 02/09 (*"quero que ele seja mais
estendido"*), e na época era defensável: o vídeo tinha 2544×1456 e o corte caía
fora da cena. O vídeo atual é **3840×2160 — 16:9 exato**, e a conta mudou.

Medido numa tela **1440×900** (16:10, o formato de notebook mais comum):
**cortava 10 % das laterais**, comendo o castelo da esquerda e as montanhas da
direita.

| Tela | Com `contain` |
|---|---|
| 1920×1080 (16:9) | preenche tudo, **zero faixa** |
| 1440×900 (16:10) | vídeo inteiro, 45 px de gradiente em cima e embaixo |

🔴 **A sobra não fica preta**: o `#loginbg` já tinha um gradiente radial embaixo,
escrito em 02/09 exatamente para isto.

⚠️ Quem trocar o vídeo por outro de proporção diferente deve reavaliar: `cover`
só serve quando a proporção é larga o bastante para o corte cair fora da cena.

### 🎬 O fundo virou camada compartilhada — e o motivo é medido

O dono pediu o vídeo também na tela de SELEÇÃO, e apontou o mesmo corte na de
CRIAÇÃO (que usava a imagem parada com `center / cover`).

**A primeira tentativa foi um `<video>` por tela, e durou vinte minutos.** A aba
de rede mostrou o custo na hora:

```
GET login-bg.mp4 → 206
GET login-bg.mp4 → 206 [FAILED: net::ERR_ABORTED]
GET login-bg.mp4 → 206 [FAILED: net::ERR_ABORTED]
```

🔴 **Três requisições do mesmo arquivo de 76 MB por carregamento.** Duas eram
abortadas, mas todas abriam conexão. E o console trazia
`net::ERR_CACHE_WRITE_FAILURE` — o Chromium **não consegue cachear** um arquivo
desse tamanho, então nem o cache resolveria as visitas seguintes.

A correção foi um **elemento único**, numa camada `position: fixed; z-index: 19`
atrás das três telas, que passaram a ter `background: transparent`. Uma
requisição, um decodificador.

⚠️ **`#startbg` continua no HTML mesmo esvaziado**, e apagá-lo seria um erro: o
`::after` dele é o escurecedor daquela tela, mais forte que o das outras porque
a criação tem muito mais texto por cima.

⚠️ A camada some no jogo (`showScreen('none')`). Não é economia de rede — o
arquivo já baixou — é de CPU/GPU: um vídeo 4K decodificando atrás do mundo custa
quadro a quadro para ninguém ver.

### A lição

🔴 **Reusar um `src` não é reusar um download.** A intuição de que "é o mesmo
arquivo, o navegador serve do cache" falha justamente onde mais dói: em arquivos
grandes, que são os que o cache recusa. Quando o mesmo recurso pesado precisa
aparecer em vários lugares, o elemento é que tem de ser um só.

---

## 2026-09-09 — Vídeo novo na tela de login, e o poster passa a ser o quadro 0

**Onde mora:** `client/public/assets/ui/login-bg.mp4` e `login-bg.png` · o
comentário do `<video>` em `client/index.html`.

O dono trouxe um vídeo melhor e pediu o mesmo tratamento: trocar e deixar em
loop.

### O mesmo problema, medido de novo

O vídeo novo é **outro zoom contínuo de câmera** — começa aberto e termina
perto. A emenda do loop media **13,1** numa escala de 0–255 (o anterior media
16,3). Mesma receita, e ela repetiu bem:

| | Antes | Depois |
|---|---|---|
| Emenda do loop | 13,1 | **0,21** |
| Emenda da virada | — | **0,46** |
| Duração | 4,74 s | **9,44 s** |
| Faixa de áudio | AAC 132 kbps | removida |

🔴 **A metade de IDA continua bit a bit idêntica à fonte.** Só a volta passou
por encoder, no bitrate da fonte (65 Mbps), e as duas foram unidas com
`-c copy`. A normalização de timebase (`-video_track_timescale 12288`) foi
aplicada desde o começo — foi a armadilha que custou uma tentativa da vez
anterior, e desta vez o `concat` acertou a duração de primeira.

### 🔴 O poster estava mentindo há cinco dias

Ao trocar o vídeo, o `poster` (a arte estática que aparece durante o
carregamento) ficou visivelmente errado — e a inspeção mostrou que ele **já
estava errado desde 04/09**, só que ninguém tinha olhado:

1. **A tela ficava ANÔNIMA durante o carregamento.** O poster velho não tinha o
   "ELYSIA ONLINE", e o título HTML (`#loginmark`) está `display: none`
   justamente porque o VÍDEO traz o dele. Com 76 MB, isso é cerca de um minuto
   de tela sem o nome do jogo numa conexão de 10 Mbps.
   ⚠️ O próprio comentário do CSS **previa este cenário** em 04/09 — *"se o
   poster for trocado por uma arte sem o nome, a tela de login fica anônima"* —
   e ninguém percebeu que ele já era o caso.
2. **Havia um salto** quando o vídeo começava: enquadramento diferente.

Agora o poster é o **quadro 0 do próprio vídeo**
(`ffmpeg -vf select=eq(n\,0)`): tem o título, e a transição poster→vídeo é
invisível. De quebra ficou menor (2,44 MB → 1,66 MB).

⚠️ **Quem trocar o vídeo tem de regerar o poster junto.** Está dito no HTML.

### ⚠️ 76,3 MB, e desta vez a alternativa foi medida antes

O arquivo passou dos 55,8 MB anteriores para **76,3 MB** — acima do limite de
50 MB que o GitHub avisa. Antes de instalar, o mesmo loop foi gerado em
**1080p: 13,1 MB**, seis vezes menos.

O argumento a favor do 1080p é forte e está registrado: é um vídeo de FUNDO
atrás do painel de login, e num monitor 1080p (a maioria) o navegador já reduz
o 4K de qualquer jeito. **O dono escolheu o 4K sabendo disso.**

⚠️ O histórico do repositório público passa a carregar ~190 MB de vídeo.

---

## 2026-09-05 (tarde) — Token de sessão, trava de saída e caveira por reincidência

**Onde mora:** `sessionTokens` e `case 'leave'` em `server/src/index.ts` ·
`whiteSkullDuration`/`logoutLockDuration` em `shared/src/pvp.ts` ·
`authWithToken` e `ultimoToken` em `client/src/net.ts`.

**634 testes** (eram 629). Três pedidos do dono, feitos durante o teste do jogo.

### 🔑 Trocar personagem não pede mais senha

O botão recarrega a página (não há teardown do jogo — ver o comentário dele), e
a recarga caía na tela de login porque **o cliente não guarda senha, de
propósito**. Era a pendência "token de sessão" que estava no HANDOFF desde 02/09.

O servidor passa a emitir um token a cada login. O cliente guarda em
`sessionStorage` — **não** em `localStorage**, e a diferença é a intenção:
`sessionStorage` morre quando a aba fecha, então o token vale para a sessão do
navegador em vez de virar um "lembrar de mim" que ninguém pediu.

🔴 **Uso único.** Cada entrada por token emite outro. Um token que vazou (log,
print, histórico) deixa de servir assim que o dono o usa.

⚠️ **Ele NÃO é uma senha:** só reabre a LISTA de personagens. Excluir personagem
continua pedindo a senha da conta à parte.

⚠️ **Um furo que quase passou:** a reconexão do `NetClient` refaz o login com
`username`, e quem entra por token não tem `username`. O socket cairia e nada
seria reenviado — "reconectando…" para sempre. Resolvido guardando o
`ultimoToken` em memória e reenviando-o no `onopen`.

### 🚪 Não dá para sair no meio da luta

> *"se estiver em batalha não consigo deslogar, somente após 60 segundos sem
> batalhar eu consigo deslogar, agora se for um player que me atacou esse tempo
> triplica"*

🔴 **O servidor passou a decidir.** Até aqui "Trocar personagem" era um
`location.reload()` puro: o servidor só descobria pela queda do socket, e sair
de um duelo perdido era de graça. Agora o cliente **pede** (`leave`) e o
servidor responde `leaveok` ou recusa dizendo quanto falta.

A trava vale nas duas direções — golpe dado ou recebido — e nos dois lados de
um PvP: travar só a vítima deixaria o agressor sumir depois de roubar o abate.

🔴 **PvE não rebaixa PvP.** Se um lobo acertar o jogador logo depois de um
duelo, a trava continua sendo a de 180 s. Sem isso, bastaria levar uma mordida
para escapar da trava de PvP.

⚠️ **Só alcança o BOTÃO, não o fechamento da aba.** Impedir de verdade exigiria
o personagem continuar no mundo depois da queda do socket — sistema que o jogo
não tem. Está no HANDOFF como pendência.

### ⚪ A caveira agora depende do que a pessoa fez

> *"se eu virei pk a duração mínima são 10 minutos caso eu continue atacando o
> player. caso tenha sido somente 1 ataque em um player, a caveira branca some
> com 60 segundos."*

Era um número só: **5 minutos** para qualquer agressão — e ele era
`⚠️ REFERÊNCIA`, porque o Doc 1 não fecha a duração da branca (só vermelha
7 dias e preta 30). Agora:

| Agressões na janela | Caveira |
|---|---|
| 1 | **60 s** |
| 2 ou mais | **10 min**, a partir da última |

🔴 **O que a regra compra:** encostar uma vez sem querer deixa de custar o mesmo
que caçar alguém pelo mapa.

A contagem zera junto com a caveira — quem parou e esperou volta a ser "primeira
vez". Sem esse zeramento, uma briga de meses atrás faria o próximo encostão
custar 10 minutos.

⚠️ O aviso de "você insistiu" sai **uma vez**, no golpe que muda a regra.
Repetir a cada golpe viraria spam no meio da briga, que é quando o jogador menos
lê o chat.

---

## 2026-09-05 — O loop vira vai-e-volta, e o botão de som morre

**Onde mora:** `client/public/assets/ui/login-bg.mp4` · o `<video>` e o CSS em
`client/index.html` · `tocaFundoDoLogin` em `client/src/main.ts`.

### 🔇 O botão de alto-falante saiu

Ele existia porque o vídeo de fundo tinha faixa de áudio, e o dono decidiu em
02/09 que a música só começaria por clique. Em 04/09 a faixa foi removida do
arquivo — então o botão passou a ligar o som de um vídeo que **não tem som**.

Um controle que não controla nada é pior do que nenhum. Saíram o botão, o CSS,
`ligaBotaoSom`, `atualizaBotaoSom`, `querSom` e a chave `elysia_login_som`.

⚠️ **`tocaFundoDoLogin` FICOU**, e quase foi junto por engano — o typecheck
pegou. Ela não tem nada a ver com som: `autoplay` não pega em elemento
escondido, e a tela de login nasce com `display: none`. Sem ela o jogador veria
só o poster.

⚠️ **Se um dia voltar música**, ela não deve voltar por aqui: o certo é um
`<audio>` próprio, separado do vídeo. Foi justamente esse acoplamento — trilha
dentro do vídeo de fundo — que derrubou o botão.

### 🔁 O loop não era imperfeito por acaso

O dono relatou que o loop "não está perfeito". A medição explicou por quê: o
vídeo é um **zoom contínuo de câmera**, começa aberto e termina perto, então
voltar ao quadro 0 é um salto de escala.

**Diferença média entre o último e o primeiro quadro: 16,3** numa escala de
0–255 (`blend=difference` + `signalstats`). Um loop perfeito fica perto de zero.

🔴 **Nenhum conserto era possível sem reencodar** — e o dono tinha pedido
qualidade máxima no dia anterior. O conflito foi posto na mesa antes de mexer,
e ele escolheu o vai-e-volta.

### A solução, e por que ela custou três tentativas

Concatenar o vídeo com ele mesmo invertido. Num zoom isso lê como **respiração**
(a câmera entra e sai), não como rebobinar — é o que torna a técnica adequada
aqui e inadequada em vídeo com movimento direcional.

| Tentativa | Resultado |
|---|---|
| `concat` com reencode CRF 15 | **80,3 MB** — reencodar 4K já comprimido infla |
| Só a volta, CRF 16 | 43,4 MB **só a metade** — mesmo problema |
| Só a volta, **no bitrate da fonte** (47 Mbps) | 28,6 MB ✅ |

🔴 **A lição:** CRF num vídeo já comprimido tenta preservar até o ruído de
compressão, e infla. Mirar o **bitrate da fonte** dá qualidade equivalente por
quadro pelo tamanho esperado.

Assim a **metade de IDA ficou bit a bit idêntica ao original** — só a de volta
passou por encoder, e as duas foram unidas com `-c copy`.

### ⚠️ E uma armadilha do `concat` que quase passou

A primeira união deu **232 quadros com duração de 4,75 s** — os tempos do
segundo trecho não foram deslocados. O culpado é o `time_base=1/24017802` da
fonte, que não casa com o timebase padrão do trecho codificado.

A correção foi normalizar o contêiner das duas partes
(`-c copy -video_track_timescale 12288`) antes de concatenar. **`-c copy` não
toca nos bytes de vídeo** — só reescreve o índice —, então a metade de ida
continua intacta.

Resultado: **9,66 s, 232 quadros, 55,8 MB**. Emenda do loop **0,37** (era 16,3)
e virada **1,20**, que é o movimento normal entre quadros vizinhos.

⚠️ **55,8 MB é alto de propósito:** dobrar a duração dobra os bytes. Quem quiser
aliviar deve ir para **1080p**, nunca reencodar em 4K de novo.

---

## 2026-09-04 (noite) — O áudio sai do vídeo sem tocar num pixel

**Onde mora:** `client/public/assets/ui/login-bg.mp4` e o comentário do
`<video>` em `client/index.html`.

O dono fechou o pedido do vídeo: *"quero qualidade máxima, porém sem áudio e em
loop"*.

### 🔴 Cópia de fluxo, não reencode

`ffmpeg -c:v copy -an -movflags +faststart`. O `-c:v copy` **não reencoda** — ele
copia o fluxo de vídeo bit a bit e descarta o de áudio. Conferido antes e
depois:

| | Antes | Depois |
|---|---|---|
| Codec | h264 High | h264 High |
| Resolução | 3840×2160 | 3840×2160 |
| Bitrate | 47.242.135 | **47.242.135** |
| Faixas | vídeo + AAC 132 kbps | só vídeo |

🔴 **Bitrate idêntico até o último dígito é a prova de que nada foi
reprocessado.** Era o que "qualidade máxima" exigia: reencodar 4K perde
qualidade a cada passagem, e uma passagem seria irreversível.

⚠️ **Tirar o áudio cortou 80 KB de 27 MB.** Quem espera que remover som deixe o
arquivo leve se engana — o peso é o vídeo. Continua sendo muito para uma tela
de login, e é decisão consciente do dono.

### O que veio de brinde

`+faststart` move o índice do MP4 (`moov`) para o começo do arquivo. Sem ele o
navegador precisa baixar os 27 MB antes do primeiro quadro; com ele começa a
tocar quase na hora. **Não custa qualidade nenhuma** — é só reordenar bytes.

### O loop já estava lá

`loop` é atributo do `<video>` desde que a tela nasceu. Conferido no navegador:
o vídeo dá a volta de 4,43 s para 0 sozinho.

⚠️ **E uma armadilha de diagnóstico:** o vídeo aparecia como `paused` nos
testes. Não era bug — o painel de navegador pausa mídia quando não está em
foco. `readyState: 4`, arquivo inteiro em buffer, `error: null` e avanço normal
ao chamar `play()` fecharam o diagnóstico. Vale lembrar disso antes de
"consertar" um vídeo que não está quebrado.

---

## 2026-09-04 (tarde) — AGI volta a ter dois usos, e duas fórmulas viviam em paralelo

**Onde mora:** `computeStats`, `moveIntervalAt` e `ATTRIBUTE_INFO` em
`shared/src/stats.ts` · `computeAccuracy` em `defense.ts` · o vídeo e o logo em
`client/index.html`.

**629 testes** (eram 627).

### 🔴 O pedido do dono era uma CORREÇÃO, não um override

Ele pediu: *"o atributo agilidade não influenciará mais na velocidade de
movimento do personagem. apenas na velocidade de ataque e chance de esquiva"*.

Antes de mexer, fui ao documento — e `DD-BAL-012` diz exatamente isso:
**"AGI = velocidade de ataque + esquiva"**.

⚠️ **E a tabela de conferência do próprio destilado marcava essa linha como
"✅ igual".** O código dava QUATRO usos a AGI (movimento, ataque, esquiva e
defesa) e a conferência não pegou, porque conferia *quais* stats vêm de AGI e
não a lista completa.

Então saíram dois:
- **Movimento** → passou para o NÍVEL.
- **Defesa** (`+0,2/ponto`) → o cap. 31 fecha *"DEF Física = VIT + armadura"*.
  O peso da VIT dobrou (0,15 → 0,3) para o tanque não perder na troca: quem tem
  VIT alta fica igual, quem tinha AGI alta perde a defesa que não devia ter.

### 🏃 Movimento pelo nível, e "pouco" medido

`480 ms` no nível 1, −0,35 ms por nível, piso em `380 ms`. São **~21 % ao longo
de 300 níveis**, contra os ~110 % que a AGI dava sozinha (`480 − AGI×5`, piso
150 — um Assassino andava ao DOBRO da velocidade de um Feiticeiro).

A filosofia do arquivo continua de pé — *"o NÍVEL sozinho quase não fortalece"*
— e a diferença de velocidade passa a vir de equipamento, buff (Bênção da
Agilidade, Concentração) e debuff (Maldição da Lentidão), que é onde ela custa
uma decisão em vez de sair de graça na criação.

### 🔴 A descoberta do dia: DUAS fórmulas de esquiva conviviam

`computeDodgeChance` está em `defense.ts` **desde a Etapa 8**, com o teto de
35 %, a curva assintótica e o comentário citando `DD-DEF-005` (*"retorno
decrescente e teto — nada de Assassin com 90 %"*). Tudo certo, tudo pronto.

⚠️ **E `computeStats` nunca a chamou.** A ficha ficou com a linear da Etapa 1 —
`AGI × 0,005` com `clamp` em 50 % — e as duas conviveram por meses: a curva
usada em teste, a linear usada no jogo. Um Assassino com AGI 100 esquivava
**metade** dos golpes, contra os 16 % que a curva dá.

Agora há uma fórmula só, e é a documentada.

### ⚠️ E o conserto quebrou outra coisa, que também foi consertada

A **precisão** entrou ontem LINEAR (`DEX × 0,004`), porque a esquiva também era
linear na época. Com a esquiva virando curva, a precisão passou a esmagá-la:

| AGI/DEX | esquiva (nova) | precisão (linear) |
|---|---|---|
| 20 | 5,0 % | 8,0 % |
| 100 | 15,9 % | **40,0 %** |
| 200 | 21,9 % | 50,0 % |

O desvio virava zero e ainda sobrava bônus — bem na hora em que AGI acabava de
perder movimento e defesa. `computeAccuracy` ganhou a **mesma curva**, com teto
de 30 % (abaixo dos 35 % da esquiva), então com investimento igual quem esquiva
continua esquivando alguma coisa.

🔴 **A lição:** duas estatísticas que se cancelam **precisam ter a mesma
forma**, senão a comparação entre elas troca de sinal no meio da progressão.

### 🎬 Vídeo novo na tela de login

Trocado a pedido do dono, **sem som**. O `<video>` já era `muted` (obrigatório
para o `autoplay`), então som nunca tocaria.

⚠️ **A faixa de áudio continua DENTRO do arquivo**, ocupando bytes, e voltaria a
tocar se alguém tirasse o `muted`. Removê-la de verdade exige ffmpeg, que não
está instalado.

⚠️ **27 MB para uma tela de login** (o anterior tinha 8,8): são 4 s em 4K a
45 Mbps. Numa conexão de 10 Mbps o jogador vê só o poster por ~22 s. Vale
reencodar para 1080p.

O logo `#loginmark` foi **escondido**, não apagado: o vídeo novo traz o título
desenhado nele e os dois ficavam sobrepostos. Se um dia o vídeo mudar para um
sem título, a volta é tirar o `display: none`.

---

## 2026-09-04 — O Arqueiro fecha o ciclo: as cinco classes têm árvore

**Onde mora:** as 12 fichas em `shared/src/skills.ts` · `accuracy` em
`stats.ts`/`effects.ts` · `AreaKind: 'trap'` em `areas.ts` · `disparaArmadilha`
e o filtro de visibilidade em `server/src/index.ts`.

**627 testes** (eram 604). Knight 8 · Druida 23 · Feiticeiro 18 · Assassino 14 ·
Arqueiro 12 = **75 habilidades**.

### ✅ A classe mais bem especificada das cinco

Ao contrário do cap. 68 (Assassino), o cap. 69 dá número para quase tudo:
cooldowns, percentuais por nível, teto de alvos, contagem de armadilhas. Por
isso `archer.test.ts` é majoritariamente **citação**, não balanceamento nosso —
quando um teste cair, a pergunta é "o doc mudou?", não "ajusto o teste?".

### 🔴 As quatro proibições, e por que cada uma virou teste

O cap. 69 define o Arqueiro mais pelo que ele NÃO tem do que pelo que tem, e
cada proibição é algo que alguém adicionaria de boa-fé:

| | O que alguém faria de errado |
|---|---|
| `DD-ARC-015` sem dash/backstep/teleporte | dar mobilidade a uma classe que "parece precisar" |
| `DD-ARC-013` distância não aumenta dano | premiar o sniper por ficar longe |
| `DD-ARC-019` munição elemental é ITEM | criar "Flecha de Fogo" na árvore |
| `DD-ARC-009` o Perfurante não atravessa | ler o NOME e implementar uma linha |

⚠️ E o doc avisa: **Flecha Explosiva ≠ Armadilha Explosiva — não fundir.**

### ⚠️ Um teste que nasceu errado, e o que ele ensinou

A primeira versão do teste do `DD-ARC-015` varria `name + desc` atrás de
"dash|backstep|teleporte". Caiu na hora: a descrição da Concentração diz *"é a
fuga do Arqueiro, que não tem dash"* — o regex não distingue a habilidade da
frase que a explica.

🔴 **Testar prosa pega o próprio comentário; testar `kind` pega o teleporte.** A
versão final olha a mecânica (`kind !== 'charge'`, o único tipo que reposiciona
o personagem) e confirma que a Concentração dá VELOCIDADE, que é a resposta
certa do doc.

### 🆕 `accuracy` — uma promessa de três meses cumprida

`ATTRIBUTE_INFO.dex` diz *"Dano de arco/besta · **precisão**"* desde o primeiro
dia, e precisão **não existia em `DerivedStats`**. Ninguém tinha notado porque
nenhuma habilidade a concedia — até o Olho de Águia e a Concentração, que dão
"+15 %" cada.

Agora DEX dá precisão, e ela **desconta da esquiva do alvo** (nunca vira bônus
de dano: o piso é zero).

⚠️ **Só morde em PvP hoje** — `creatureDefenseProfile` devolve `dodgeChance: 0`,
monstro não desvia. É coerente com o doc, que vende o Olho de Águia pelo
ALCANCE e a precisão como vantagem de duelo. No dia em que o bestiário ganhar
esquiva, ela passa a valer em PvE sem tocar em nada.

⚠️ A esquiva pesa mais por ponto (0,005 contra 0,004): quem investe em AGI para
desviar tem de vencer quem investe em DEX só para acertar, senão a esquiva vira
estatística morta no duelo.

### 🪤 Armadilhas: o quarto tipo de área

`AreaKind: 'trap'` — fica ARMADA, não pulsa, dispara uma vez e some (marca
`expiresAt = now` em vez de se remover no meio do laço que itera a lista).

🔴 **Oculta ao inimigo, visível à party — e o filtro é do SERVIDOR.** Mandar a
área para todos e esconder no cliente deixaria a posição de cada trapa
trafegando na rede, e qualquer cliente modificado a leria. Isso é o mesmo que a
armadilha não existir.

O descarte da 4ª reusa o `dropOldestOf` que a Muralha de Gelo já usava — o doc
pede a mesma cortesia nas duas.

### Dois campos novos na ficha

**`requiresWeapon`** — primeira vez que uma habilidade depende do que está na
mão. O Bash do Knight muda de SABOR conforme a arma; o Disparo Duplo é recusado
sem arco, e a mensagem nomeia a arma aceita.

**`maxTargets`** — a Chuva de Flechas pega "até 10". Ordena por DISTÂNCIA antes
de cortar: cortar na ordem em que o mapa devolve as criaturas escolheria alvos
pela ordem de spawn, e o jogador veria dez monstros no raio e a flecha
acertando os do outro lado.

⚠️ **A Azagaia não virou habilidade**, e não devia: o doc a trata como
configuração de ARMA (lança curta de arremesso que usa escudo, consumível), com
`DD-ARC-029` amarrando a perda ao Distance. É item e munição, e os dois ainda
não existem.

---

## 2026-09-03 (madrugada) — A barra virou 24 slots, e o Assassino ganhou árvore

**Onde mora:** `SKILL_BARS`/`SKILL_BAR_COLS` em `shared/src/skills.ts` · o
arrastar-e-soltar em `buildSpellBar`/`ligaArrastarNoSlot` no cliente · o Ataque
Duplo e a furtividade em `server/src/index.ts`.

**604 testes** (eram 579), typecheck limpo nos três pacotes.

### ⌨️ A barra: de 8 para 24 slots, e configurável

Pedido do dono, em duas partes: *"preciso de mais atalhos para colocar todas as
magias"* e *"se eu clicar e arrastar a magia para o slot do atalho ela tem que
substituir a que está nele"*.

🔴 **Oito era o número da época em que só o Knight tinha habilidades.** Com 21
conjuráveis no Druida, pedir que ele escolha 8 é escondê-lo do próprio
personagem. São **duas fileiras de doze**: F1–F12 em cima, **Shift**+F1–F12
embaixo.

⚠️ **Por que 12+12 e não 16 ou 20:** a fileira tem de casar com uma linha de
teclas de verdade. O teclado dá F1–F12, e Shift é o único modificador que não
briga com o sistema — Ctrl+F4 fecha aba, Alt+F4 fecha janela.

**As três regras de arraste, e o motivo de cada uma:**
- **Janela → slot** substitui, e **esvazia o slot antigo** se a magia já
  estivesse noutro. `spellSlots` é indexado por id: dois atalhos para a mesma
  magia fariam o segundo sobrescrever o primeiro, e um deles pararia de acender
  o cooldown sem nenhum erro.
- **Slot → slot** TROCA os dois. Copiar deixaria a magia em dois lugares e um
  buraco onde ela estava, obrigando o jogador a limpar a sobra na mão.
- **Botão direito** esvazia. É o par natural do arraste: sem ele não há como
  deixar um espaço em branco de propósito.

🔴 **Passiva não entra na barra** — confirmado pelo dono: *"as passivas não
precisa equipar para usar, elas ficam só dentro da árvore de habilidades"*. A
regra vale em três pontos, e os três têm teste: fora da barra padrão, linha não
arrastável, e `castSpell` recusando com "já está ativa".

⚠️ **Guardado no cliente**, por personagem (`localStorage`), na mesma escolha
que a POSIÇÃO da barra já fazia. Trocar de navegador devolve ao padrão — se um
dia incomodar, o lugar certo passa a ser uma coluna no personagem.

⚠️ **Duas armadilhas que morderam aqui:**
1. Remontar a barra com `textContent = ''` levava junto o `#spellgrip`, o
   pegador de arrastar — a barra ficaria presa no centro da tela para sempre,
   sem erro nenhum.
2. O regex das teclas era `F([1-9])`, que deixava **F10, F11 e F12 mudos** —
   justamente onde as magias grandes ficam no padrão novo.

### 🗡️ O Assassino: 14 habilidades, e a honestidade sobre elas

🔴 **O cap. 68 é o menos fechado das cinco classes**, e os três ramos existem
para tornar isso visível em vez de esconder:

| Ramo | Estado |
|---|---|
| 🗡️ Lâminas (5) | **canônico** |
| ⚔️ Espada Curta (4) | ⚠️ `DD-ASS-015` **PROPOSTA** |
| 🎯 Arremesso (5) | ⚠️ `DD-ASS-014` **PROPOSTA** |

⚠️ **A exceção de 30/07 não cobre estas.** "`PROPOSTA` não bloqueia" vale só
para os Docs 3 e 4; o cap. 68 é do Doc 1. Entraram a pedido do dono, com a regra
do projeto aplicada à risca: **estrutura sim, número inventado marcado**. E o
aviso "PROPOSTA no doc" vai no **tooltip do jogador**, não só no código — há
teste guardando o aviso, e o teste espelho garantindo que o ramo canônico
**não** se anuncie como provisório (marcar o Ataque Duplo como provisório faria
alguém "corrigir" a única tabela que o doc fecha).

⚠️ **Um nome é invenção nossa: "Ocultar".** O doc trata furtividade como
conceito e nunca nomeia a habilidade. Os outros treze são todos do documento.

**O que é canônico e entrou de verdade:** a tabela do **Ataque Duplo**
(35 %→80 %), escrita como TABELA e não como fórmula — `0,35 + 0,05×(n−1)` dá os
mesmos dez valores, mas quando um degrau mudar (e o doc já mudou o do
congelamento), a tabela aceita e a fórmula obriga a reescrever a regra.

🔴 **A anti-cascata do `DD-ASS-007` é estrutural, não uma flag:** a função do
Ataque Duplo **não chama a si mesma nem `playerAttack`**. Com 80 % de chance no
Lv.10, uma versão recursiva daria cinco golpes com frequência.

### 🔴 Empunhadura dupla não é equipável — e a regra dela está pronta

`DD-ASS-004/005` (duas adagas, extra de 50 % cada) está implementada e testada.
**Não tem como disparar em jogo:** `offhand` existe em `grip.ts` e **nenhum
código do projeto o preenche** — `EquipSlot` tem nove slots e nenhum é segunda
arma. O que funciona hoje é o `DD-ASS-003`: adaga com escudo, extra de 100 %.

Deixar assim é melhor que fingir. O dia em que o slot existir, o Ataque Duplo já
sabe o que fazer com ele. Está dito em `equippedForGrip`.

### ✨🥷 Um par que estava pela metade fechou

A **Chama de Revelação** do Feiticeiro nasceu ontem sem nada para revelar — a
furtividade não existia. Com o Assassino ela arranca o oculto da sombra, e
`70.42` fica de pé: *"não é detecção permanente — é **counter com
counterplay**"*.

⚠️ **Atacar quebra a furtividade, e essa regra é nossa** — o doc descreve o
combo (*"aproxima furtivo → ataca → recua"*) mas não a escreve. Sem ela o
Assassino atacaria para sempre de dentro da invisibilidade, e a Chama nunca
teria alvo.

### 🔴 A regra que este dia aprendeu: `magic` ≠ `damageType`

Os dois campos respondem perguntas diferentes — **de qual ATAQUE o poder sai** e
**contra qual DEFESA ele bate** — e o servidor roteava o dano pelo campo errado.
A Kunai Envenenada é física na origem e de veneno no dano, e passava pela
armadura física em vez da resistência a veneno.

O erro só apareceu porque o **Lançamento Fantasma** nasceu com `magic: true`,
o que o faria escalar com INT — e o Assassino tem **INT 3**. A habilidade
nasceria inútil com cara de implementada. Foi um teste que pegou, e virou dois:
um que proíbe habilidade mágica em classe física, outro específico do Fantasma.

---

## 2026-09-03 — As 41 magias entraram, e o motor que faltava embaixo delas

**Onde mora:** `shared/src/skills.ts` (as 49 fichas) · `shared/src/effects.ts` e
`shared/src/areas.ts` (**novos**) · `castSpell`/`executeSpell` e os quatro
`tick*` em `server/src/index.ts` · barra por classe, barra de conjuração,
chips de buff e os 41 ícones no cliente.

**Etapas 14 e 15 do roadmap, juntas.** 579 testes (eram 499), typecheck limpo
nos três pacotes.

### O que o levantamento achou antes de escrever uma linha

`castSpell` sabia fazer **uma** coisa: dano físico em criatura dentro do
alcance. Tudo que o Druida é — curar aliado, buffar party, derrubar o ATK de um
inimigo, plantar uma área que dura — não tinha caminho nenhum no código. Sete
buracos, e nenhum deles era "mais uma habilidade":

| Falta | Quem dependia |
|---|---|
| Dano mágico em skill (usava sempre `physAtk`) | o ramo Natureza e o Feiticeiro inteiro |
| Mirar em JOGADOR (só varria `creatures`) | Cura, todos os buffs, Santuário |
| Modificador temporário genérico | os 6 debuffs e os 6 buffs |
| Tempo de conjuração | Cura, Meteoro, Chuva de Meteoros |
| Área persistente no chão | 7 habilidades das duas classes |
| Cura ao longo do tempo | Regeneração, Santuário |
| Barra de atalhos por classe | 49 habilidades não cabem em 8 slots globais |

🔴 **E uma boa notícia grande: `conditions.ts` estava pronto e parado.**
Congelamento, Petrificação, Silêncio, Raiz, Veneno, Sangramento, Queimadura,
Lentidão e Knockback já existiam com diminishing returns, anti-cadeia e
imunidade — inclusive a regra que separa as duas classes (*dano quebra
Congelamento, dano **não** quebra Petrificação*). Nenhuma habilidade aplicava
nenhuma delas. Foi ligar fio, não construir sistema.

### 🔴 Por que `effects.ts` não virou parte de `conditions.ts`

Foi a decisão de arquitetura do dia, e a tentação era grande — os dois são
"coisa temporária em cima de alguém".

O GDD cap. 32 trata de CONDIÇÃO: estados que *impedem* ou *machucam*, com
contramedidas próprias. O que o Druida faz na maior parte do tempo é outra
coisa: *"não precisa causar dano se faz o inimigo causar menos e os aliados
causarem mais"* (cap. 71) — **número na ficha por um tempo**.

Juntá-los economizaria um arquivo e custaria a regra: a Pele de Carvalho
entraria na fila de DR do Congelamento, e **o quarto buff seguido duraria
metade**. Resistir a Congelamento passaria a proteger de −15 % de ataque.

As duas regras de acúmulo ficaram travadas por teste:
1. **Mesma habilidade renova, não soma** — vence a mais forte; empatou, a mais
   longa. É o *"dois círculos não acumulam"* de `70.47`, generalizado.
2. **Habilidades diferentes somam.** Enfraquecer + Praga = −25 % de ataque.

E há piso (20 %) e teto (3×): sem o piso, três debuffs de −40 % dariam dano
negativo e o "golpe" **curaria**.

### 🔴 Por que área persistente virou sistema (`areas.ts`)

Uma frase do doc decidiu: a Ira da Natureza *"ataca a região em ciclos
**enquanto o Druida continua curando e debuffando**"*. Se fosse um laço dentro
do lançamento, o Druida ficaria parado esperando — o contrário exato do texto.
A área tinha de viver FORA do turno de quem lançou.

⚠️ **Consequência deliberada:** a área sobrevive à morte do dono. O Druida cai e
a Ira continua até o tempo acabar — a magia já saiu. É o que dá ao grupo a
chance de terminar a luta que o healer não viu acabar.

Sete habilidades usam: Muralha de Fogo, Muralha de Gelo, Nevasca, Círculo
Arcano, Esporos, Santuário e a Ira. A Muralha de Gelo é a única que vira colisão
de verdade (`blocks`), e o limite de 1→3 paredes do doc caiu na mesma peça — ao
erguer a 4ª, a mais antiga cai.

### 🔴 O Feiticeiro parou de atirar de graça (`DD-PROG-028`)

A divergência anotada em 02/09 morreu aqui. Ele estava com `attackType: 'magic'`,
alcance 5 e um `firebolt` de 6 de mana no golpe COMUM, contra
*"ataque básico com cajado é FÍSICO (Sorcerer e Druid); dano mágico à distância
exige gastar uma habilidade e mana"*.

⚠️ **Este era o único momento em que a correção cabia**: antes de hoje, tirar o
firebolt teria deixado a classe sem NADA. Agora ela tem 18 magias.

A correção tem duas metades, e a segunda é a que quase passou batido: o **cajado**
(`WEAPON_IDENTITY.staff`) tinha `range: 4` e `magic: true`, e `recompute` lê isso
para decidir o tipo do ataque básico. Equipar um cajado devolveria o firebolt de
graça. Entrou `basicPhysical` para separar as duas perguntas que até hoje tinham
a mesma resposta: **"de onde sai o poder?"** (magia, `magicAtk`) e **"como é o
golpe comum?"** (bastonada, físico, alcance 1).

⚠️ Com STR 3, o golpe de cajado é quase simbólico. É a intenção: para causar
dano, o mago gasta mana.

### O que veio do documento e o que foi decidido aqui

🔴 **Quase todo número das 41 é CITAÇÃO**, e há teste conferindo linha por
linha — `shared/tests/druid.test.ts` (29 testes) e `sorcerer.test.ts` (27). A
tabela inteira de debuffs do cap. 71, os 8–12 % de congelamento da Nevasca
(`DD-SOR-012`), os 2→4 s do Círculo Arcano, as quatro resistências da Harmonia
Natural, o pré-requisito triplo da Chuva de Meteoros.

Dois travados por RELAÇÃO, não por valor:
- **Regeneração é mais eficiente em mana que a Cura** — o doc promete, e agora
  está medido nos três níveis.
- **`DD-DRU-021`: a Ira (6,52 de poder por alvo) fica abaixo da Chuva de
  Meteoros (10,4).** Mexeu num dos dois, o teste avisa.

⚠️ **O que NÃO veio do doc, e está marcado `⚠️ REFERÊNCIA` no código:**
- **As três últimas curas** (Cura em Área, Santuário e a 5ª de emergência). O
  cap. 71 avisa: *"não têm detalhes recuperados — nomes e números não
  confirmados"*. Entrou a ESTRUTURA, com números por proporção da Cura
  individual. O nome "Sopro Vital" é escolha nossa e é o primeiro a mudar.
- **Lv.7 como o "níveis altos"** em que as Raízes passam a petrificar. O doc diz
  "níveis altos" sem número.
- **O elemento das habilidades de Natureza.** O doc fala em "dano de natureza",
  mas `DD-ELM-002` fecha a lista em SETE elementos e natureza não é um deles.
  Tratamos "natureza" como o RAMO: estaca e lâmina ferem `physical`, esporo fere
  `poison`, e a passiva soma sobre o ramo. **Nenhum oitavo elemento entrou.**

### A regra que este dia aprendeu

🔴 **Condição de DoT sem `power` é a pior classe de bug que existe aqui: parece
funcionar.** Os Esporos Venenosos aplicavam "Veneno" no monstro — ícone certo,
duração certa — e tiravam **zero** de vida, porque `tickConditions` só causa
dano quando a parcela vem preenchida, e a área persistente passava `undefined`.

Achado antes de o código ser jogado, e por sorte: nada na assinatura obrigava a
copiar o campo. Virou teste (`skills.test.ts`) para a metade que é ficha, e
aviso no campo `condition` de `areas.ts` para a metade que é servidor — que é
onde o bug realmente estava.

### O que a UI ganhou, e por quê

- **Barra de atalhos POR CLASSE.** Era um array global de oito, de quando só o
  Knight tinha habilidades. Com 23 e 18, deixa de fechar por aritmética.
- **Janela de habilidades com a árvore inteira**, agrupada por ramo — varrer a
  barra esconderia 15 das 23 do Druida. O rodapé com "Resetar skills" passou a
  ficar parado: com 23 linhas ele subia para fora da vista.
- **Barra de conjuração** e **chips de buff com o tempo restante**. O tempo é o
  ponto: a Bênção da Natureza dura 90 s com 30 s de recarga, e sem ver quanto
  falta não há como decidir se dá para entrar no MVP com ela.
- **41 ícones**, por construtor de glifos (cor = ramo, silhueta = função) em vez
  de 41 desenhos à mão. As 8 do Knight continuam desenhadas uma a uma.

---

## 2026-08-13 (tarde) — O 3D foi explorado a fundo e ESTACIONADO

**Onde mora:** quatro páginas descartáveis em `client/espeto-*.html` +
`client/src/espeto*.ts` e `client/src/texturas.ts` · a pipeline do Blender em
`tools/blender/`.

🔴 **NADA DISTO ESTÁ LIGADO NO JOGO.** Nenhum dos arquivos fala com o servidor,
importa `main.ts` ou usa PixiJS, e nenhum é entrada do `vite build` (o Vite só
constrói `index.html`). São páginas separadas, feitas para **olhar e decidir**.
Apagá-las devolve o projeto ao estado anterior; o `three` está em
`devDependencies` justamente para nunca entrar no bundle do jogo.

### A pergunta, e por que ela foi levada a sério

O dono perguntou se dava para modelar o mundo em 3D mantendo personagens, NPCs,
monstros, magias e efeitos em 2D — a arquitetura do Ragnarok. A resposta técnica
é **sim**, e o custo se distribui de um jeito que surpreende:

| | Linhas | Destino num 3D |
|---|---|---|
| `server/` | 5.574 | **intacto** |
| `shared/` | 9.686 | **intacto** |
| `client/` | 8.389 | renderizador reescrito (Pixi → Three) |

O servidor é autoritativo e trabalha em **grade de tiles** — ele não sabe nem se
importa como o cliente desenha. Movimento, combate, loot, receitas, banco e os
466 testes não seriam tocados.

### Os quatro espetos, e o que cada um respondeu

| | Página | Resposta |
|---|---|---|
| 1 | `espeto-3d.html` | mundo em malha funciona; **as 4 direções quebram** com câmera girando |
| 2 | `espeto-3d-personagem.html` | 3D se comporta melhor, mas **a arte 2D não dá volume** |
| 3 | `espeto-3d-cenario.html` | com **câmera fixa**, os dois custos do 3D caem |
| 4 | `espeto-hd2d.html` | a infraestrutura presta, **a direção de arte não** |

### ✅ O achado que mais vale guardar

🔴 **Câmera FIXA derruba os dois argumentos contra o 3D de uma vez.**

1. **As 8 direções deixam de ser pré-requisito.** O gargalo só existia porque a
   câmera girava: o sprite é escolhido por `frente − yaw`, e com `yaw` variável
   as 4 direções do tipo `DirAnim { down, up, right, left }` não bastam. Travada
   a câmera, `yaw` é constante e a linha da tira é constante por personagem —
   exatamente o que o jogo 2D já faz.
2. **A nitidez volta.** Câmera fixa permite projeção **ortográfica**, que não
   encolhe o que está longe: a escala é igual em qualquer canto da tela e pode
   ser cravada em inteiro. `caixa = innerWidth / (2 · ZOOM_PX · 32)` dá **1 px de
   arte = 2 px de tela, sempre**. Visto de perto: pixel uniforme.

⚠️ Para isso o sprite **deita na câmera** (copia o quaternion dela) em vez de
girar só no eixo Y — carta em pé vista de 52° apareceria achatada em `cos(52°) =
0,62`, encolhendo o personagem a dois terços.

### 🔴 90° NÃO FUNCIONA com cenário 3D

No ângulo do Tibia de verdade a câmera só vê **telhado e copa** — não há fachada,
não há tronco, e o 3D vira um mapa de manchas. Cenário 3D **exige** câmera
inclinada: fixa como o Tibia no comportamento, inclinada como o Ragnarok no
ângulo. E quanto mais alta a câmera, **mais telhado e menos fachada** — 52°
mostra mais parede que 65°.

### ⚠️ As armadilhas medidas, para ninguém repetir

1. 🔴 **Escurecer três vezes o mesmo pixel.** Textura pintada escura "porque é
   noite", luz baixa pelo mesmo motivo e tone mapping filmico por cima — os três
   se **multiplicam**, e a tela ficou preta com uma fogueira no meio. **A textura
   guarda a cor do MATERIAL, não a hora do dia.** Quem escurece é a luz, porque
   só ela se desfaz sem repintar nada.
2. 🔴 **Névoa exponencial com câmera ortográfica afastada.** `FogExp2(0.021)` com
   a câmera a 60 unidades já dá **79 % de névoa no meio da cena** — a distância
   que a névoa mede é a da CÂMERA, não a fundura aparente.
3. **Misturar modelos de material.** O `GLTFLoader` cria `MeshStandardMaterial`
   (PBR) e o resto da cena era `MeshLambertMaterial`; sob as mesmas luzes o PBR
   divide a energia e sai muito mais escuro. A casa do Blender carregou quase
   preta e por um instante isso foi lido como "o modelo ficou ruim". **Um modelo
   de material só na cena inteira.**
4. **Bloom com limiar baixo pega tudo.** Com limiar 0,22 ele floresceu até os
   sprites (que usam `MeshBasicMaterial` e são desenhados em brilho cheio). O
   limiar alto é o que faz o bloom significar "isto emite luz".
5. **Botão que deduz o próprio estado.** O dia/noite decidia o lado com
   `intensity > 1`; quando as intensidades subiram na calibragem, ele inverteu.
6. **Em câmera inclinada, altura de telhado custa mais tela que altura de
   parede.** A primeira casa saiu com um andar e um telhado gigante.

### ❌ O que NÃO funcionou, e é honesto saber

**Derivar modelo 3D da arte 2D não presta.** O volume foi montado por interseção
de silhuetas (a vista do sul dá `(x,y)`, a do leste dá `(z,y)`). De frente
convence; a 45° desmancha — o escudo, que é uma mancha larga de frente, é
extrudado pela profundidade inteira e vira pilha de placas. **Duas silhuetas
dizem ONDE há corpo, nunca QUÃO FUNDO**; a profundidade não está na arte. O
`ACHATA_Z = 0,42` no gerador é chute declarado, sem nada a medir.

⚠️ E o `Walls.png` (1024×1024) **não serve como textura 3D**: as peças estão em
projeção **oblíqua**, com lado e topo já pintados. Do que o repositório tem, só
os retalhos sólidos do `Ground.png` funcionam em 3D.

### 🔴 A decisão, tomada pelo dono em 13/08

**Personagem em 2D venceu.** Câmera fixa, sem girar e sem zoom. Ele gostou do
cenário 3D, pediu vegetação e estruturas em 3D — e, depois de ver o resultado
com textura procedural e luz de Diablo, decidiu **parar o 3D e voltar ao jogo**.

**O motivo é honesto e vale registrar:** o alvo dele é a mistura de **Tibia**
(câmera e grade), **Ragnarok** (cenário 3D com herói 2D) e **Diablo I** (luz,
paleta e clima). Esse alvo é **direção de arte**, não geometria — o que faz a
referência bonita é madeira gasta, musgo e reboco sujo, tudo textura pintada. A
assistência entrega infraestrutura verificável e **não entrega gosto**; quatro
tentativas de calibragem não convergiram.

⚠️ **A pipeline do Blender fica no repositório**, funcionando: `comum.py` com as
convenções (escala 1 unidade = 1 tile = 32 px; origem na base por `assenta()`;
sRGB→linear), um gerador de exemplo e `npm run models:build`. Se o 3D voltar um
dia, o caminho está aberto e medido — e as convenções são a tradução 3D das
lições que o projeto já pagou em 2D.

---

## 2026-08-13 — A câmera aproxima, e a rotação fica decidida de fora

**Onde mora:** `ZOOM` e o bloco de câmera do ticker, em `client/src/main.ts`.

O dono estranhou que o herói no jogo era diferente do que via no preview, e o
diagnóstico já estava fechado desde 12/08: **era escala, não arte.** O herói era
desenhado a 58 px numa viewport de ~780 — cerca de metade do tamanho em que o
preview o mostra. `ZOOM` foi de **1,0× para 2,0×**, e o herói passou a 116 px.

✅ **A troca foi de uma linha porque o `ZOOM` já estava enfiado em todo lugar que
importa** — `atualizaChunks`, a conversão tela→tile, o alvo da câmera e o buraco
de luz da noite. Nada assumia `1`.

🔴 **O zoom tem que ser INTEIRO.** A filtragem é `nearest`: em escala
fracionária um pixel do desenho vira 2 na tela e o vizinho vira 3, em faixas
alternadas — é o serrilhado de 10/08. Em 2× cada pixel vira exatamente 4.

🔴 **E veio junto um conserto que ninguém tinha previsto: a câmera passou a
andar em pixel de tela inteiro.** A suavização (`* 0.2` por quadro) entregava
deslocamento fracionário, e `world.x/y` nunca era arredondado. A 1,0× isso já
desalinhava o texel; a 2× cada meio pixel de câmera vira um pixel de tela e o
cenário inteiro **cintilaria** enquanto o herói anda.

⚠️ **O float ficou guardado à parte de propósito** (`camX`/`camY`), e o
arredondamento acontece só na saída. Se a suavização lesse de volta o valor já
arredondado, um passo menor que meio pixel arredondaria para o mesmo lugar e a
câmera **empacaria** a poucos pixels do alvo, sem nunca chegar.

⚠️ Zoom maior mostra **menos** mundo — 24 → 12 tiles na vertical. O
`SNAPSHOT_RANGE = 32` do servidor, que era a preocupação anotada, sobra.

### 🔴 CÂMERA QUE GIRA: decidido NÃO fazer, e é para não reabrir

O dono perguntou por uma câmera como a do Ragnarok — que gira, aproxima e
afasta. **Aproximar e afastar cabe** (degraus inteiros, ver abaixo). **Girar
não**, e o obstáculo não é o código da rotação, que seria quase trivial: é que a
arte inteira pressupõe um ângulo só. Quatro razões, todas verificadas:

1. **Os sprites têm 4 direções no TIPO** — `DirAnim { down, up, right, left }`
   em `client/src/miniworld.ts:22`. Ragnarok tem **8 direções por sprite
   exatamente porque a câmera gira**: ele escolhe o quadro por `direção do
   personagem − ângulo da câmera`. Com 4, girar 45° faz todo mundo mostrar a
   face errada — o sprite da face certa não existe.
2. **As diagonais já foram tentadas e falharam, com número** (12/08): o sudeste
   saiu **mais largo** que o sul (30 contra 28 px) e o nordeste ficou mais
   estreito que o próprio perfil. E 8 direções cobrem 8 ângulos, não rotação
   livre.
3. **Tudo que é alto é billboard preso ao eixo da tela** — árvore, cristal, NPC
   e herói ancorados no pé (`anchor.set(0.5, 1)`). Girar o mundo **deita todos
   eles**; contra-girar cada um deixa o chão torto, e o chão é pixel art de
   32 px alinhada ao eixo. Girar pixel art destrói o desenho — é a mesma razão
   que deixou a arma de fora da animação de morte.
4. **O movimento do servidor é 4-direcional** (`[[dx,0],[0,dy]]`). O personagem
   nem anda em diagonal hoje.

🔴 **A diferença de fundo:** Ragnarok não é 2D com câmera girando. É **terreno
3D texturizado com personagens 2D em billboard** — o chão dele gira porque é
malha, não bitmap. Copiar isso é trocar o renderizador e regerar toda a arte.

⚠️ **Rotação em degraus de 90° é a única variante que fecharia** — 4 direções
remapeiam exato e girar bitmap em múltiplo de 90° é sem perda. O custo é o
resto: ordenação por profundidade, os pedaços de cenário, a inversa do clique, o
minimapa. E ela **contraria a referência declarada**: o dono apontou o Medivia
em 11/08, e Medivia e Tibia não giram a câmera. Em Ragnarok a rotação serve para
enxergar atrás de prédios 3D; numa grade vista de cima não há o que ela resolva.

⏳ **O que ficou disponível e não foi construído:** zoom em degraus inteiros
(1× / 2× / 3× na roda do mouse). É pequeno, porque o `ZOOM` já está threaded —
falta só o handler. O dono preferiu **manter o 2× fixo** por ora.

---

## 2026-08-12 (tarde) — A arma sai do corpo e vira camada

**Onde mora:** `tools/pixellab/desarmar.mjs` · `tools/pixellab/girar.mjs` ·
`shared/src/grip.ts` · `ItemDef.hands` em `shared/src/items.ts` · o `PACK` de
`tools/pixellab/gerar-classe.mjs`.

O dono listou 10 defeitos jogando, e eles tinham **uma causa só**: a arma
pintada dentro do sprite do corpo. Com ela ali, cada combinação classe×arma
precisa da folha inteira — e é por isso que o pack entrega **7 animações de
ataque onde o pack antigo entrega 16**, com `attackPoseFallback` empurrando 13
das 20 combinações para `attack_sword`.

**O desarme funciona, e preserva a identidade.** `inpaint` abrindo os dois lados
e preservando o miolo. A silhueta encolheu para largura de corpo puro (sul
`x 7..48 → 18..44`; leste `x 12..55 → 19..44`), com a mesma armadura, o mesmo
elmo e a mesma sobreveste. Isso evitou o caminho caro: gerar um cavaleiro novo
por texto e refazer golpe, morte e passo em cima dele.

🔴 **Apagar uma coisa de cada vez NÃO funciona.** Mascarar só o escudo devolveu
uma **garra disforme** no lugar dele. Os dois lados abrem juntos — o modelo
precisa de contexto simétrico para entender que os dois braços estão vazios;
com um lado só, ele inventa um objeto para preencher.

⚠️ **Medição e olho discordaram, e os dois eram necessários.** A caixa da
silhueta provou que o escudo saiu; ela era **cega** para uma lâmina fina que
sobrou junto ao quadril no sul, porque a lâmina cabia dentro da largura do
corpo. Quem a viu foi o olho. Trocar a seed (11 → 23) resolveu. Nenhuma das duas
ferramentas basta sozinha, e esta sessão é a prova.

🔴 **Tirado o escudo, o beco nº 4 deixa de valer para o Knight.** A máscara da
caminhada dele subiu ao quadril como nas outras classes, e o resultado é medido:
a banda do escudo ao sul ia de **23 → 69 → 87** px ao longo do ciclo (era o
"escudo fica redondo" que o dono viu); no corpo desarmado vai **4 → 0 → 13**. A
caixa da silhueta ficou **idêntica nos três quadros**, coisa que nunca tinha
acontecido no pack armado.

⚠️ **Por isso o desarme tinha que vir ANTES da caminhada.** Na ordem inversa, as
6 gerações do passo do Knight sairiam com a máscara baixa e teriam de ser
refeitas.

**`grip.ts` é o lado do código.** Com a arma por cima, o CORPO precisa de três
posturas — uma mão, duas mãos, duas armas — em vez de uma folha por combinação.
As regras são as do dono: escudo só se equipado, arma de duas mãos não usa
escudo, só a adaga pode ser dupla. `ItemDef.hands` entra junto porque **duas
mãos é propriedade do ITEM, não do TIPO**: o tipo não pode dizer que toda espada
é de uma mão, senão "Espada de Duas Mãos" não tem como existir. Duas regras que
já estavam escritas e nunca tinham tido efeito passam a ter — "duas mãos = sem
escudo" (estava em `weapons.ts`) e o slot `shield` mandar no desenho.

### ❌ As diagonais falharam, e vale registrar como

O dono pediu 8 direções. `girar.mjs` gira a cardinal mais próxima (45°, não
135°, porque o beco nº 6 ensinou que o erro cresce com o giro). O resultado
**não presta**, e a medida é clara: vista de três quartos tem que ser mais
estreita que a de frente, e o **sudeste saiu mais LARGO** (30 contra 28 do sul)
— quase não virou — com a paleta pulando de 62 para **111 cores**, assinatura do
beco nº 1. O **nordeste virou demais**: 23 px, mais estreito que o próprio
perfil (26).

🔴 **E há um problema anterior à arte: o movimento do jogo é 4-direcional.** O
passo do servidor é `[[dx,0],[0,dy]]`, um eixo por vez, então sprite diagonal
não tem como aparecer até o movimento mudar — e mudá-lo mexe em pathfinding,
colisão e na invariante de que "decoração nunca encosta em decoração". Tibia e
Medivia, a referência declarada, são 4-direcionais pelo mesmo motivo.

---

## 2026-08-12 — A máscara do passo sobe ao quadril, e passa a ser por classe

**Onde mora:** `TOPO_PERNAS` e `direcoes()` em `tools/pixellab/gerar-classe.mjs`.

**A máscara do passo virou por classe, pela mesma razão que o lado da arma já
tinha virado.** `FAIXA_PERNAS` era uma constante só, começando em `y = 50`, e o
50 existe por causa do **escudo do Knight**: subir devolve o escudo à região
redesenhada e o `inpaint` o perde (beco nº 4). O que ninguém tinha notado é que
o beco é **dele** — Feiticeiro, Arqueiro e Assassino não têm escudo, e estavam
pagando um preço que não era deles. Agora `TOPO_PERNAS` é `50` no Knight e `38`
nos outros três.

O preço que se pagava: 50 redesenha **14 px de 58**, pé e canela. Era o teto da
caminhada, e a razão de nem os 4 quadros nem o alinhamento pelo chão terem
bastado — o dono continuou vendo "deslize, não caminhada". A referência do jogo
é o **Medivia**, onde a perna inteira se move, do quadril para baixo.

**Medido no sul do Feiticeiro,** contra a pose parada: o redesenho passa de
`y=50` para `y=38` (de 11 para 23 linhas, de 181 para 434 px mudados) e a
silhueta passa de 28 para **32 px de largura** — a veste abre para fora ao
passo, coisa que 14 px de barra não conseguiam. A paleta ficou em **81 cores**
(o beco nº 1 é o pulo para ~1500) e o chão continua em `y=60`.

✅ **Um efeito colateral que ninguém tinha previsto:** a barra da veste tem 17 px
de vivo dourado na pose parada, e a máscara de tornozelo **apagava os 17** a cada
passo. A nova mantém 21. A máscara baixa não encurtava só o passo — ela comia o
acabamento da veste, e isso estava em tela desde 10/08 sem nome.

🔴 **O Feiticeiro era a classe ERRADA para testar a hipótese, e vale registrar
por quê.** Ele foi escolhido por ser o menor risco — sem escudo, sem aljava — e
foi mesmo: o resultado é bom e ficou. Mas ele usa **manto até o chão**, e não tem
perna visível em quadro nenhum. O que a máscara alta comprou nele foi a **barra
balançando**, não a perna se movendo. *Menor risco* e *melhor teste* não eram a
mesma coisa, e o handoff de 11/08 tratou como se fossem. Quem testa a hipótese do
Medivia é o **Arqueiro**, que tem perna à mostra.

⚠️ **Duas piscadas para conferir jogando:** o `passo` tem 21 px de dourado e o
`passo2` tem 1; e o `passo2` tem um roxo claro que os outros quadros não têm. Num
ciclo `parado → passo → parado → passo2`, ornamento presente em metade dos
quadros pisca. Pode não se ver a 64 px — mas isso é medição dizendo onde olhar,
não dizendo que está bom.

**`SO_DIRECOES` entrou junto, e não é conveniência.** O gerador sempre rodava
`south,north,east` de uma vez, então testar uma hipótese custava 3 gerações e
trocava duas direções boas por outra tirada no dado. Com ele, este teste custou
**2 gerações** (`passo` e `passo2` do sul) em vez de 6. 🔴 Ele é também a peça que
faltava para consertar o **cajado que boia na morte do Feiticeiro** a leste e
oeste: `SO_MORTE=1` regenerava as quatro direções, e o sul e o norte dele estão
bons — era regerar arte boa para consertar arte ruim. `west` não é aceito de
propósito: ele é escrito por espelhamento do leste.

⚠️ **Só o sul foi regerado.** Norte e leste do Feiticeiro continuam com a máscara
antiga, então as direções **não combinam entre si** até 4 gerações fecharem a
classe. Não foi visto em tela.

---

## 2026-08-11 — O herói parou de flutuar, e a câmera parou de nascer no canto

**Onde mora:** `tools/pixellab2strip.mjs` (alinhamento) · o bloco de câmera no
ticker de `client/src/main.ts` · `tools/pixellab/gerar-classe.mjs` (beco nº 7).

**A regra do chão discordava do olho.** O conversor media a sola como "última
linha com **≥3 px** opacos" (`MIN_PX_LINHA`). O olho vê a última linha com **≥1
px**. No `south-passo.png` do Arqueiro as duas discordavam — 56 contra 57 — e a
discordância tinha um efeito desproporcional: o desvio virava 4, estourava o
`ALIGN_MAX = 3` e o quadro era **rejeitado inteiro**, ficando 3 px acima do chão.
Como o outro quadro do ciclo era alinhado, ele **saltava 3 px a cada passo**,
e só indo para o sul. Feiticeiro e Assassino tinham a mesma discordância, de 1 px.

🔴 **`MIN_PX_LINHA` agora é 1, e não deve voltar a 3 "por robustez".** Quem
protege contra medição maluca é o `ALIGN_MAX`, que rejeita o deslocamento
inteiro; a constante só decide onde o desenho **acaba**, e para isso a resposta
certa é "onde o olho vê que acaba". Verificado depois: todos os quadros de
`walk`, `pose` e `attack`, 4 classes × 4 direções, fecham em `chao = 60`.

**A morte agora é alinhada pelo primeiro quadro.** Antes ela não era alinhada de
jeito nenhum, e havia razão: `chaoDe` acha a última linha com massa, e num corpo
**deitado** isso é o corpo, não o pé. Mas o preço era visível — o andar do
Arqueiro é alinhado e a morte não era, então no instante em que ele morria o
herói **pulava 3 px para cima** antes de tombar.

A saída é que o `dy` sai do **quadro 0**, o único que ainda está de pé e no qual
a medição quer dizer "sola", e vale para a sequência inteira. 🔴 **Cada quadro
leva só o quanto cabe:** o cadáver do Arqueiro já encosta no rodapé da célula, e
o que sai da célula está perdido (o `blit` descarta). Então o quadro em pé desce
3, o do meio desce 2 e o cadáver não desce. Encolher a queda em 3 px ao longo de
três quadros terminais ninguém vê; cortar o corpo, sim.

**A câmera nascia no canto do mundo.** `world` começa em (0,0) e o ticker só
sabia suavizar — 20% por quadro, atravessando o mapa inteiro até o herói, com
`atualizaChunks` montando e descartando cenário ao longo de todo o caminho,
porque é a câmera que decide o que existe. Pior: `app.screen.width` é **0**
enquanto o `#viewport` não tem tamanho (a lista de personagens aparece antes do
mundo), e alvo calculado com tela de largura 0 está errado.

Agora a câmera **salta** — e continua saltando — até o herói existir de verdade;
a suavização só começa depois, que é quando ela serve para o que foi feita.
⚠️ **Não foi visto em tela.** Isso elimina dois estados iniciais comprovadamente
errados, mas o sintoma relatado ("o herói não aparece até você clicar") só se
confirma jogando.

**O passo passou a ser regido pelo CHÃO, e a referência do jogo ficou conhecida.**

O dono insistiu, jogando: *"a animação não convence, parece mais um deslize do
que fazer o movimento de caminhar"* — mesmo depois dos 4 quadros. A causa que
sobrava era de **sincronia**: o `AnimatedSprite` avançava sozinho a
`animationSpeed` fixa (~0,37 s por ciclo) enquanto o tile é atravessado na
cadência que o **servidor** manda. Duas cadências diferentes é a definição de
patinar — o pé toca num ritmo e o chão passa em outro.

Agora o quadro sai de `t`, o mesmo progresso 0..1 que move o sprite: cada tile
consome meio ciclo (passagem → contato) e a perna alterna a cada tile. Um passo
por tile. ⚠️ Vale só para o ciclo de 4 quadros; arte de 1 ou 2 segue no caminho
de sempre, senão congelaria no quadro 0.

⚠️ Entrou junto um **bob de 1 px** no tronco (sobe na passagem, desce no
contato). 🔴 **Isso NÃO é Tibia** — ver abaixo — e é o primeiro candidato a sair
se o dono achar estranho.

### 🔴 A REFERÊNCIA DO JOGO É **MEDIVIA** (motor estilo Tibia 7.x)

O dono mandou o vídeo *"Tudo o que o Medivia tem de melhor"* dizendo que ele
**tem todas as referências que ele procura para o jogo**. Isso responde de uma
vez três discussões que vinham separadas:

| Assunto | O que Medivia/Tibia faz |
|---|---|
| **Caminhada** | ciclo avança **um quadro por tile** — o que acabou de ser implementado |
| **Corpo** | **não sobe nem desce**; quem trabalha é a perna |
| **Outfits** | paleta ampla, cor por região — confirma a direção do `PLANO-OUTFITS` |
| **Arma na mão** | a arma equipada **é desenhada**, por CAMADA sobre o corpo |

🔴 **E confirma onde está o teto da nossa caminhada, com número.** Naqueles
sprites **a perna inteira se move, do quadril para baixo**. A nossa máscara
(`FAIXA_PERNAS`) redesenha só de `y = 50` para baixo — **14 px de 58**, pé e
canela. Nenhum código inventa perna que o desenho não tem, e é por isso que nem
os 4 quadros nem a sincronia bastaram: era afinar o relógio de um passo que
quase não existe.

**Clicar numa pilha do chão passa a pegá-la, e item vence nó no mesmo tile.**
Dois pedidos do dono jogando, em 11/08.

O primeiro tapou um buraco que ninguém tinha notado: **item comum não tinha
clique nenhum**. Só bolsa e corpo eram interativos, e a única forma de recolher
uma pilha era arrastá-la até a mochila. Agora o item segue o mesmo par de gestos
do espólio e da coleta — perto pega na hora, longe anda até o lado e pega ao
chegar. ⚠️ `pointertap` só dispara sem arraste, então **empurrar a pilha de tile
em tile continua intacto**: arrastar empurra, clicar pega.

O segundo veio de um caso concreto: uma bolsa de monstro caiu **em cima de uma
moita de ervas**, o clique ia para a moita, e sem Foice a coleta era recusada —
o espólio ficava INALCANÇÁVEL, porque não havia outro gesto para chegar nele.

🔴 **Item no chão vence nó de recurso, e a razão não é arbitrária:** a bolsa
**expira em minutos**, o nó **renasce sempre**. Entre duas coisas no mesmo tile,
quem tem prazo vence quem não tem — perder espólio é irreversível, adiar
colheita não é.

⚠️ **O terceiro pedido não tinha o que consertar.** O dono pediu para o item
não ser pego "só de passar em cima". Procurado: o cliente inteiro manda `pickup`
em **um** lugar (o arraste até a mochila) e o servidor só apaga item no `pickup`
e na expiração — o handler de `move` não encosta em item. O que ele viu foi
provavelmente a **expiração** (3 min para o que o jogador solta). Não existe
auto-pegar, então nada foi removido.

**Arrastar item para o chão travava o personagem andando.** Relatado jogando:
*"fui jogar um item no chão, ele bugou e saiu andando pro lado esquerdo sem
parar"*.

🔴 **O código já documentava esta falha — a lista de guardas é que estava
incompleta.** O comentário do `releaseAllKeys` diz, desde antes: *"sem isto, um
keyup perdido (alt-tab) trava o personagem andando"*. Havia guarda para `blur` e
para aba oculta. Faltava o arraste: enquanto um drag-and-drop HTML5 está em
curso o navegador roda um **laço modal próprio e não entrega `keyup` à página**,
então a tecla de movimento segurada durante o gesto fica presa no `heldKeys`.

Agora `dragstart`, `dragend` e `drop` também soltam as teclas. Nas duas pontas,
porque a tecla pode já estar pressionada quando o arraste começa; e `dragend`
não basta sozinho, porque soltar fora da janela pode não entregá-lo.

⚠️ **`mouseup` NÃO entrou na lista**, e a primeira versão desta correção o
incluía. Clique comum entrega `keyup` normalmente, e limpar as teclas nele faria
quem segura W para andar parar toda vez que clicasse para atacar — trocaria um
bug raro por um constante.

**A caminhada deslizava, e a causa era a contagem de quadros.** O dono apontou
jogando: *"quando ele anda está deslizando"*. O `walk.png` tinha 2 quadros,
`parado` e `passo` — ou seja **sempre a mesma perna à frente**, alternando com a
pose em pé. Com um passo curto de pé e canela (o preço da máscara baixa que
protege o escudo, ver `FAIXA_PERNAS`), a 64 px isso não lê como caminhar.

Agora são **4 quadros**: `parado → perna A → parado → perna B`. A pose parada
entra duas vezes de propósito — faz o papel do quadro de passagem, que é o que
dá a alternância. ⚠️ **O segundo passo não pode ser o primeiro espelhado:**
espelhar troca o personagem de lado inteiro e a espada muda de mão. É geração
própria, com descrição e `seed` diferentes, na mesma máscara.

Medido na faixa das pernas: **15 das 16** combinações classe × direção alternam
de verdade. Melhor caso, Knight ao sul — os dois passos diferem **239 px** entre
si, mais do que cada um difere do parado (151). O mais fraco é o Assassino ao
sul, com 64 px: diferença real, mas tímida.

🔴 **O cliente não precisou de uma linha.** `fatia()` deriva a contagem de
quadros da **largura** da folha — decisão de 09/08, tomada exatamente para não
quebrar calado quando a arte mudasse de contagem. Pagou hoje.

⚠️ O gerador ganhou uma trava que **pula o que já existe no disco**: sem ela,
pedir só o `passo2` numa classe pronta regeraria o `passo` à toa, e geração
gasta não volta. `REFAZER=1` força.

**O golpe do Arqueiro e do Assassino resistiu a duas hipóteses** — as duas estão
inteiras no beco nº 7 de `gerar-classe.mjs`, com máscaras e prompts exatos.
Custaram 6 gerações e o saldo é conhecimento: abrir a máscara **destrói o
personagem** (voltou outro sujeito, de capa e espada, sem arco), e mudar o texto
do gesto **não move nada** (PNG diferente byte a byte, caixa de alpha idêntica
nas quatro direções). Se houver saída, é outro endpoint — não outro prompt.

---

## 2026-08-09 — Arte HD das quatro classes, e o golpe pela arma

**Onde mora:** `tools/frames2strip.mjs` (conversor) · `client/src/heroes.ts`
(carregador) · `shared/src/heropose.ts` (arma → animação) · `weaponType` em
`EntitySnapshot` · a escolha do sprite em `client/src/main.ts`.

**O problema de formato.** Os packs de herói vêm com um PNG por quadro, em pasta
por direção: 1.045 arquivos. Carregar solto seria uma requisição por quadro. A
saída foi a mesma do mapa: um passo de conversão do formato de **autoria** para
o formato do **jogo** — 843 quadros viraram 32 tiras e 376 KB. As tiras usam o
layout do MiniWorld (linha 0=sul, 1=norte, 2=leste, 3=oeste) de propósito, para
o corte ser o `sliceDirs` que já existia.

**Por que a regra arma→animação foi para `shared/`.** É lógica pura, e é onde os
testes rodam. O valor real do arquivo é o teste de exaustividade: o jogo tem 8
`WeaponType` e a arte entrega 5 poses, e sem o teste um nono tipo de arma faria
o herói parar de animar o golpe **em silêncio** — a classe de bug que só se acha
jogando. A cadeia de fallback termina sempre em `sword`, que os cinco packs têm,
porque nenhum golpe é pior que meio golpe: sem animação o motor volta ao
"pulinho" do placeholder, e um herói HD dando pulinho ao lado de outro que
golpeia de verdade fica pior do que golpear com a arma errada na mão.

**Por que `weaponType` precisou entrar no snapshot.** O cliente sabia a arma do
próprio jogador, não a dos outros — sem o campo, todo mundo golpearia de espada.
Sai do mesmo `equippedWeapon` que o combate usa: se divergissem, o herói
golpearia de arco com o dano saindo de espada.

**Meia animação é pior que nenhuma.** O `Taking_Punch` só veio em `south` nos
cinco packs. A tira de dano **não é gerada**: usar o quadro sul nas quatro
direções faria o personagem virar para a câmera no meio do golpe. O motor cai no
piscar vermelho, que é comportamento antigo e testado.

**Âncoras pelo bounding box de alpha, não pela moldura.** Medido nos cinco
packs: conteúdo em y 15..44 numa célula de 60, centro horizontal entre 27,5 e 32.
A âncora é uma só para as quatro direções porque `makeMiniActor` aceita um valor
só — usar a média espalha o erro em ±2,5 px, enquanto ancorar pela frente jogaria
os 5 px inteiros nas laterais e o personagem daria um pulinho ao virar.

**Bug pré-existente encontrado ao olhar:** o herói não é desenhado até a primeira
atualização de câmera. Confirmado por A/B (com a arte nova desligada o sintoma é
o mesmo), então não veio desta etapa. Registrado no `HANDOFF.md`.

Convenção: `#N` = número da mensagem em
[`../informacoes/conversa-gpt-elysia-historia-mmorpg.md`](../informacoes/conversa-gpt-elysia-historia-mmorpg.md).

---

## Etapa 1 — Ficha de personagem (2026-07-27)

**Arquivos:** `shared/src/stats.ts` · `server/src/index.ts` · `client/src/main.ts`
**Testes:** `shared/tests/ficha.test.ts`

- 7º atributo **LUK**; crítico migrou de DEX → LUK `#700`
- Todas as classes com **45 pontos-base** (só a distribuição muda) `#700`
- **10 pontos por nível** com custo crescente por faixa: 1–20 custa 2/ponto …
  201+ custa 20 (`attributeCost`) `#716`
- HP/mana do GDD no nível 1: Warrior 200/60 · Assassin 150/70 · Archer 120/80 ·
  Sorcerer 100/180 `#701`
- Papéis corrigidos: AGI = velocidade de ataque · WIS = regen de mana ·
  DEX arma o arqueiro · STR o guerreiro

**Por que importa:** era a base. Balanceamento feito sobre atributos errados
nasce errado.

## Etapa 2 — Skill Points e árvore (2026-07-27)

**Arquivos:** `shared/src/skills.ts` (novo) · servidor · painel novo no cliente
**Testes:** `shared/tests/skills.test.ts`

- Progressão **separada dos atributos** `#720`
- Habilidades Lv.1–10; **28 pontos** para maximizar (1-1-1-2-2-3-3-4-5-6) `#724`
- Renda por classe: Warrior 1,5/nível · Assassin e Archer 1,7 · Sorcerer 2,5 —
  calibrada para ~6 e ~9 skills máximas no nível 100 `#726`
- Marcos nos níveis 10/25/50/75/100 e a cada 50 `#726`
- **Cooldown nunca cai com o nível** (senão Lv.10 vira spam) `#720`
- Reset com custo progressivo 500 → 5.000 → 25.000 → teto 100.000 `#904`
- Painel na tecla **K**, mostrando o motivo de cada bloqueio

**Substituiu:** o desbloqueio por Inteligência da versão anterior.
`shared/src/spells.ts` foi **removido** — virou `skills.ts`.

## Etapa 3 — Warrior completo (2026-07-27)

**Arquivos:** `shared/src/skills.ts` · `server/src/index.ts` ·
`client/src/spellicons.ts`
**Testes:** `shared/tests/warrior.test.ts`

Oito habilidades, cada uma com função distinta `#746`:

| Tecla | Habilidade | Regra-chave |
|---|---|---|
| F1 | Golpe Poderoso | 1,5 s — quase extensão do ataque básico `#744` |
| F2 | Bash | 3,5 s, área; varia por tipo de arma `#742` |
| F3 | Investida | mobilidade; o valor é chegar no alvo `#746` |
| F4 | Ruptura | abre a defesa por 4 s, não acumula `#746` |
| F5 | Execução | multiplicador cresce com o alvo ferido; nunca mata na hora `#746` |
| F6 | Provocar | 2 s de recarga, alvo único `#764` |
| F7 | Postura Defensiva | alternável, com trava anti-abuso `#746` |
| F8 | Fúria de Batalha | vida ×2–×3, **não cancela**, para em 1 HP `#748`, `#750` |

**A Fúria é a mais delicada:** drenagem é perda direta (nenhuma defesa ou carta
reduz, senão alguém criaria Fúria permanente); cura funciona mas a drenagem
continua; especializar reduz a drenagem (1 %/s → 0,5 %/s) mas o dano recebido
**piora** — o risco nunca some.

**Ferramenta criada:** `npm run dev:test` + comandos de chat
(`server/src/dev.ts`).

## Etapa 4 — Armas e proficiência (2026-07-27)

**Arquivos:** `shared/src/weapons.ts` (novo) · `shared/src/items.ts` · servidor
**Testes:** `shared/tests/weapons.test.ts`

- **8 tipos** com identidade fixa; dano e velocidade se compensam `#262`
- Medido em jogo: adaga 24×1,62 · espada 37×0,97 · machado 46×0,78 — **DPS
  equivalente**. Um teste trava essa razão (`< 1,25` entre o melhor e o pior)
- **Duas mãos** expulsa o escudo e recusa reequipá-lo `#943`, `#945`
- **10 passivos** aleatórios, sem repetir no mesmo item `#262`, `#264`
- **7 raridades** definindo passivos, poder e faixa de slots `#422`
- Slots variam **dentro** da faixa: dois Épicos podem diferir `#262`
- **Proficiência sem teto**, desacelerando muito `#966`

**Bug corrigido durante a etapa:** o multiplicador da arma só afetava o bônus
dela, não o golpe inteiro — a adaga dava ~80 % mais DPS que o machado.

## Etapa 5 — Morte e loot (2026-07-27)

**Arquivos:** `shared/src/death.ts` (novo) · `server/src/index.ts` · cliente
**Testes:** `shared/tests/death.test.ts`

- **Corpo no chão** no local exato, saqueável por qualquer um, 15 min;
  vazio some em 1 min `#1002`, `#1004`
- Mochila cai **inteira** (com ouro); 8 % por peça equipada; Lendário+ resiste
  mais `#1001`
- Perder nível **zera a distribuição** e devolve os pontos `#140`
- **Sem ressurreição** `#471`

**⚠️ DECISÃO QUE SUBSTITUI A CONVERSA (2026-07-27):** a penalidade de XP da
mensagem `#154` (50 % / 100 % / 200–300 %) foi considerada alta demais pelo dono
— perder 2–3 níveis afasta o jogador. Vale agora: **20 % até o nv.20, 40 % até
o 100, subindo devagar até o teto de 100 %** (um nível, nunca mais). PvE custa
70 % do PvP. Há teste travando o teto.

**Ferramenta:** `/tp <x> <y>`.

## Etapa 6 — Monstros e bestiário (2026-07-27)

**Arquivos:** `shared/src/bestiary.ts` (novo) · `shared/src/combat.ts` ·
servidor · painel novo no cliente
**Testes:** `shared/tests/bestiary.test.ts`

- **6 comportamentos**: pacífico (foge), neutro (revida e esfria em 8 s),
  territorial, predador, hostil, fanático `#270`
- Fauna nova com sprite por código: **Coelho** (pacífico), **Javali** (neutro),
  **Aranha** (territorial, nunca foge `#971`)
- **Variantes de spawn** comum/incomum ("Robusto", 8 %, +20 % HP e dano) `#552`
- **Bestiário (tecla B)** revelando em patamares; chefe entrega 50 % no primeiro
  abate; **encontrar já conta**, mesmo sem matar `#564`
- **Chefe fica mais forte** ao aniquilar o grupo (+15 %, teto de 5) `#275`, `#277`

**Não verificado em jogo de forma isolada:** que o coelho foge e o javali só
revida — o mapa tem slimes agressivos demais para a medição limpa. Ambos têm
teste unitário e a integração foi revisada.

## Etapa 7 — Persistência e contas (2026-07-28)

**Arquivos:** `server/src/store/` (novo: `schema.ts`, `store.ts`, `serialize.ts`) ·
`shared/src/names.ts` e `towns.ts` (novos) · `client/src/net.ts` (reescrito) ·
protocolo, servidor e cliente
**Testes:** `server/tests/store.test.ts` (12) · `shared/tests/names.test.ts` (15)

- **Conta** com login/senha (scrypt + salt por conta). Senha errada e usuário
  inexistente devolvem a **mesma** mensagem — mensagens diferentes viram um
  enumerador de contas de graça.
- **Ficha inteira no banco:** atributos, skills, proficiências, bestiário,
  inventário, equipamento, depósito e posição.
- **Autosave** a cada 30 s, no disconnect, na morte e no Ctrl+C (SIGINT/SIGTERM).
- **Nome de personagem** (regra do dono): só letras, sem número, sem caractere
  especial, sem palavrão, único no servidor. Validado no cliente **e** no servidor.
- **Spawn no vilarejo** + respawn só em cidade que o personagem **visitou**.

**Escolha de banco — SQLite, não PostgreSQL.** A máquina não tem Postgres nem Docker;
exigir um deles faria o servidor parar de subir. O Node 24 traz `node:sqlite` embutido,
sem dependência. Tudo passa pela classe `Store` — trocar para Postgres é escrever um
segundo `Store`, sem tocar no servidor.

**A decisão estrutural da etapa** é a separação **conta × personagem**, do cap. 40 do GDD
(`DD-MAP-009`/`DD-MAP-010`): geografia e marcadores pendem da **conta**; nível, itens e
**ponto de respawn** pendem do **personagem**. Um Lv.300 revela o mapa para a conta toda,
mas o Lv.15 criado depois ainda precisa **andar** até a cidade para renascer lá.

**Bug pego por teste durante a etapa:** o filtro de palavrão rejeitava **"Rolando"**
(contém "rola") e **"Pintor"** (contém "pinto"). A regra de "termo com 4+ letras casa em
qualquer posição" era um palpite ruim — o que importa é se o termo é **ambíguo**, não seu
tamanho. Virou duas listas: `BLOCKED_ANYWHERE` e `BLOCKED_WORD`.

> ⚠️ **Asteria ainda não existe no mapa.** `shared/src/towns.ts` só tem **Valoria**, a vila
> que o mapa desenha de fato. A cidade principal é conteúdo da etapa 16.

**Rename `Warrior → Knight`** (decisão do dono) foi feito **antes** do schema, de propósito:
o id da classe vai para o banco, e renomear depois exigiria migração. Os caminhos de asset
(`.../human_warrior_for/`) **não** mudaram — são pastas reais no disco.

---

## Ajuste de movimentação (2026-07-27, depois da Etapa 6)

**Arquivos:** `shared/src/combat.ts` (cadências) · `client/src/main.ts`
(`CREATURE_GLIDE` e os 4 pontos de interpolação)

Pedido do dono, **não estava na conversa-fonte**. Os monstros andavam rápido
demais. O ajuste passou por três rodadas, e o aprendizado importa:

1. **Baixei as cadências** (`moveCooldownMs`). Piorou: o bicho passou a "saltar"
   de tile e congelar.
2. **A causa era o cliente:** ele só aceitava a medição do intervalo real
   `if (measured < 800)`. Com cadências acima disso, a medição era descartada e
   ele animava em 300 ms fixos — deslizava num piscar e esperava parado.
   Teto subiu para 2500 ms.
3. **Faltava desacoplar** "tempo parado" de "velocidade do passo". Introduzi
   `CREATURE_GLIDE = 0.6`: a criatura desliza em 60 % do intervalo e descansa
   40 %. **Jogadores usam 1.0** — quem segura a tecla espera movimento contínuo.

Valores atuais (intervalo total): coelho 900 · aranha 1150 · javali 1300 ·
slime 1500 · rotworm 1400 · snake 1100 · super_slime 620.
Noite: `NIGHT_SPEED_MULT` de 0.6 → **0.85** (a noite não pode desfazer o ajuste).

**Para calibrar depois:** `CREATURE_GLIDE` menor = passo mais rápido com pausa
maior; maior = mais deslizante. As cadências ficam em `combat.ts`.

> ⚠️ **Não edite `combat.ts` com script de PowerShell.** Uma tentativa de trocar
> os sete valores de uma vez corrompeu os acentos do arquivo (`ágil` →
> `Ã¡gil`). Use a ferramenta de edição.

---

## Ferramentas de desenvolvimento

`npm run dev:test` liga os comandos de chat (inertes no servidor normal):

| Comando | Uso |
|---|---|
| `/level <n>` | nível + pontos e SP correspondentes |
| `/sp <n>` | Skill Points avulsos |
| `/gold <n>` | define ouro |
| `/hp <n>` | define vida (testar morte, Execução, fim da Fúria) |
| `/tp <x> <y>` | teleporta |
| `/heal` | enche vida e mana |

## Zumbi e limpeza do bestiário do mapa (2026-07-28)

Primeira criatura com arte de terceiros no formato **LPC Universal Sprite
Sheet** (células de 64px), fora do padrão MiniWorld 16x16 do resto do jogo.

- `CreatureDef` `zombie`: hostil, 160 HP, força 15, aggro curto (4) e passo de
  **2000 ms** — o mais lento do mapa. A identidade do morto-vivo é essa: não te
  alcança se você andar, mas não desiste.
- `loadZombieAnim` lê as linhas 8–11 (andar: cima/esquerda/baixo/direita),
  quadros 1–8. O quadro 0 é a pose parada e fica de fora, senão o ciclo engasga.
- **Âncora e escala saíram de medição**, não de chute: o conteúdo ocupa
  x 17..46 / y 15..62 dentro da célula de 64px, daí `anchorX 31.5/64` e
  `anchorY 62/64`.
- `makeMiniActor` ganhou `animSpeed`: a folha LPC tem 8 quadros contra os 5 do
  MiniWorld, e no valor padrão o zumbi "corria parado".

**O idle foi gerado, não lido.** O `Zombie-alfa-idle.png` não contém animação:
são as 4 cabeças por direção recortadas do próprio sheet de andar (de y15 a y31
a contagem de pixels bate exatamente com a do corpo, e não há um pixel no idle
que o corpo já não tenha). `loadZombieIdleAnim` monta o balanço em canvas —
desenha o corpo parado, apaga a faixa da cabeça (linhas 0..31, porque os ombros
começam em y32) e redesenha a cabeça deslocada. Apagar é obrigatório: as cabeças
das direções têm larguras diferentes, e sobrepor deixaria a borda da original
aparecendo por trás.

O balanço só vai **para baixo** de propósito — subir abriria fresta na linha 31.
A cabeça de "cima" foi exportada 1px mais baixa que a do corpo e leva
`base: -1` para compensar.

Fauna removida a pedido: o mundo agora tem só **Slime, Zumbi e Super Slime**
(17 + 9 + 1 = 27). Coelho, Javali, Aranha, Snake e Rotworm seguem **DORMENTES** —
`CreatureDef` e desenho continuam no código, só não nascem mais.

### 🐛 Em aberto

**Andando para CIMA, um pedacinho do topo da cabeça é cortado.** Reportado pelo
dono, adiado por decisão dele. Só acontece na caminhada, que usa a folha crua —
o idle composto não tem o problema. Suspeita a investigar: nos quadros 1–8 da
linha 8 o conteúdo sobe acima de y15 (a medição da bbox foi feita na linha de
andar para BAIXO), e a diferença estoura o recorte da célula.

## Etapa 8 — Elementos, condições e defesa em camadas (2026-07-29)

Fundação de combate do cap. 31/32. **Só o pacote `shared`** — servidor e cliente
ainda não consomem nada disto. É de propósito: a Etapa 8 é pré-requisito de
cartas, Druid, Sorcerer, bestiário e PvP, e valia fechar as regras com teste
antes de mexer nos 84 KB de `server/src/index.ts`.

**Quatro módulos novos, 48 testes** (134 → 182):

| Arquivo | O que fecha |
|---|---|
| `shared/src/elements.ts` | os 7 tipos de dano (`DD-ELM-002`) e resistências |
| `shared/src/defense.ts` | o pipeline em camadas do cap. 31 |
| `shared/src/conditions.ts` | as 10 condições e as 3 contramedidas |
| `shared/src/pvp.ts` | flag PK ON/OFF (32.57–32.61) |

**Decisões que seguem o doc à risca:**

- 🔴 **Elemento ≠ Condição** (32.2). `elements.ts` só faz DANO; quem aplica
  ESTADO é `conditions.ts`, com chance própria. Dano de gelo não congela.
- 🔴 `DD-DEF-006` escudo **reduz**, nunca anula — o exemplo do doc (1.000 com
  25 % → 750) virou teste literal.
- 🔴 `DD-DEF-009` chance de bloqueio **não vem de atributo nenhum**. Por isso
  `fullBlockChance` e `shieldMitigation` entram como DADO no `DefenseProfile` e
  `computeStats` não os calcula.
- 🔴 `DD-ELM-003` resistência nunca zera dano — existe `RESISTANCE_CAP < 1`.
- 🔴 `DD-CC-009` imunidade é lista de **ids exatos**: imune a Congelamento não
  protege de Petrificação. Agrupar por categoria "controle" seria conveniente e
  quebraria a regra na primeira criatura imune.
- 🔴 Dano quebra Congelamento, **não** quebra Petrificação.
- 🔴 Com **PK OFF a ação nem existe** — `canHarm` tem de ser consultada antes do
  dano E antes da condição. Consultar só antes do dano deixaria passar
  queimadura e stun, que é o que o doc proíbe.

**As três pendências do doc foram implementadas como ESTRUTURA, não como número:**

- ⚠️ `31.56` **a ordem das camadas não está formalmente fechada**, mas a leitura
  mais atenta diz que **não há contradição** e nada precisa ser decidido agora.

  A frase que parecia conflitar com o diagrama — *"DEF corta o dano bruto
  primeiro; a redução % age sobre o que sobrou"* — não fala do escudo. Ela
  contrasta DEF com **outra categoria** de redução, que o próprio doc define na
  frase seguinte: *"reduções % fortes vêm de equipamento/skill/buff/carta"*.
  Essa categoria é o campo `flatReductionPct`, e ele já é a **última** coisa
  aplicada, bem depois da armadura:

  ```
  esquiva → escudo → ARMADURA → resistências → reduções % de buff/skill/carta
                        ↑                              ↑
                "DEF corta primeiro"       "a redução % age sobre o que sobrou"
  ```

  O diagrama do cap. 31 é respeitado e a frase também. `LayerOrder` continua no
  código com as duas ordens e teste para cada uma — não como pendência, e sim
  como escape caso o balanceamento peça. A diferença entre elas é sempre
  `armadura × %escudo`, então ela cresce justamente no Knight full equipado.
- ⚠️ `DD-CC-012` **durações de Congelamento × Petrificação em conflito.** Adotada
  a revisão **posterior** (Druid: 10 s e 6 s), aplicando a regra de ouro do
  roadmap. Registrado em `CONFLITO_DD_CC_012` para o dono confirmar ou reverter.
- ⚠️ `DD-CC-013/014` **anti-CC-chain não foi implementado** porque o doc não
  define o método. Reaplicar só renova a expiração (não empilha), e o ponto de
  plugar está marcado em `applyCondition`.

Valores marcados `REFERÊNCIA` (o doc não fecha): `RESISTANCE_CAP` 0,75 ·
`BLOCK_CAP` 0,25 · `WEAKNESS_FLOOR` −1,0 · `DODGE_HALF_AGI` 120.

**Esquiva ganhou retorno decrescente** (`DD-DEF-005`): `computeDodgeChance` é
assintótica com teto de 35 %, no lugar do `clamp` linear de teto 50 %. Resolve
também o ajuste pendente da Etapa 1 ("teto de 30–35 % vinda de AGI").
⚠️ `computeStats` **ainda não usa** — trocar lá mexe no balanceamento do jogo
rodando e merece ser feito junto da integração no servidor.

### Ligado ao servidor (mesmo dia)

Todo dano do jogo passa agora por `resolveDamage`. **A integração foi escrita
para NÃO mudar o balanceamento** — é troca de encanamento, não de números. Quem
garante isso são dois tradutores:

| Função | Traduz |
|---|---|
| `playerDefenseProfile` | o que o jogador já tinha (`defense`, `dodgeChance`, `magicResist`, `defenseMult`) |
| `creatureDefenseProfile` | `creatureDefense` com Ruptura e penetração; magia continua ignorando defesa de criatura |

Detalhes que valem lembrar:

- A `magicResist`, que era **um número só valendo para toda magia**, virou
  resistência nos **seis tipos não-físicos**. O resultado hoje é idêntico, mas
  agora um equipamento pode somar resistência só a fogo.
- `shieldMitigation` e `fullBlockChance` chegam **zerados** — `DD-DEF-009` manda
  que venham de escudo/equipamento/carta, que são as Etapas 10 e 11. Até lá as
  camadas rodam neutras, o que é diferente de não existirem.
- `damageTakenMult` entrou no `DefenseProfile` porque a Fúria de Batalha
  **aumenta** o dano sofrido, e "redução %" não expressa multiplicador acima de 1.
- 🆕 **Primeira fraqueza elemental do jogo:** o Zumbi leva **+50 % de dano
  Sagrado**. Vem do lore (morto-vivo é alma que não voltou ao Heart; Sagrado é
  energia vital), não de gosto. Só Sagrado — resistência a Veneno pareceria
  óbvia para um zumbi, mas o doc não fala nisso.
- ⚠️ `basicAttackType` chama o ataque básico mágico de **fogo**, o que é
  provisório: o roadmap da Etapa 14 diz que "ataque básico com cajado é FÍSICO".
  Reescrever isso é trabalho daquela etapa; aqui só demos tipo ao que já existe.

### Condições ligadas ao servidor (mesmo dia)

Jogador e criatura agora carregam `conditions: ActiveCondition[]`, e o
`gameTick` roda `tickConditionsAll` **antes** do `regen` — uma parcela de veneno
que mata não pode ser desfeita pela regeneração do mesmo tique.

- **DoT passa pelo pipeline de defesa completo**, não como dano puro. O tipo
  importa: Sangramento é físico e sofre a armadura, Queimadura é fogo e sofre
  resistência a fogo. Tratar DoT como dano cru anularia metade da etapa.
- **Quem plantou o DoT leva o crédito do abate** (`sourceId` → `damageCreature`).
  Sem isso, matar com veneno não daria XP nem loot a ninguém.
- `onDamaged` roda nos três caminhos onde HP cai e quebra **só** Congelamento.
- `restrictionsOf` bloqueia de verdade: movimento, ataque e conjuração no
  jogador; e a IA da criatura sob controle é **pulada inteira** — deixá-la
  "pensando" faria ela teleportar ao fim do controle.
- **Silêncio desarma as classes mágicas mas não o Knight**, porque o ataque
  básico delas é conjuração. É a assimetria que o doc pede.
- Lentidão soma com a Postura Defensiva no intervalo de movimento.
- O snapshot transmite os ids das condições, e só quando há alguma — array vazio
  em cada entidade a cada tique é peso de rede por nada.
- `S2C_Hit` ganhou `element` e `dot`, para o cliente colorir o número.

⚠️ **Ninguém tem resistência, redução ou imunidade a condição ainda.**
`applyConditionTo` passa `emptyConditionDefense()`, e isso é o estado correto:
nada no jogo as concede antes das cartas (Etapa 10) e do equipamento (Etapa 11).
O caminho está montado — o dia em que um item der "imune a Congelamento" é uma
linha, não uma reescrita.

⚠️ **Condição não persiste no banco, de propósito.** Sair envenenado e voltar
curado é melhor que voltar morrendo de um DoT que o jogador não pode responder.

Como testar: `npm run dev:test` e no chat `/cond poison`, `/cond freeze`,
`/cond silence`, `/uncond`. Sem esses comandos a etapa é intestável na mão,
porque **nenhuma habilidade aplica condição ainda**.

### Ícones e cores no cliente (mesmo dia) — Etapa 8 fechada no encanamento

- **Fita de condições** acima da barra de vida: um quadradinho por condição, na
  cor de `CONDITION_COLORS`. As cores ficam no `shared` pelo mesmo motivo de
  `ELEMENT_INFO.color` — é dado de jogo, e quando o bestiário ou o tooltip
  precisarem da mesma cor não vale ter duas listas para desincronizar.
- **A fita é anexada em `syncEntities`, não nas fábricas de sprite.** São quatro
  fábricas (jogador, criatura, item, NPC) e nenhuma delas precisa saber que
  condições existem. Criada **sob demanda**: a maioria das entidades nunca tem
  condição, e uma fita por sprite seria um `Container` e um `Graphics` à toa.
- **Números de dano saem na cor do elemento.** Precedência: crítico manda em
  tudo, depois o elemento, e o físico cai na regra antiga (vermelho em mim,
  branco nos outros).
- 🔴 **Parcela de DoT não toca animação.** Nem a de ataque (ninguém desferiu
  nada) nem a de dano — piscar o alvo a cada tique de veneno viraria epilepsia.

Sem arte ainda: o quadradinho colorido é placeholder. Quando houver ícone
desenhado, só o miolo de `makeConditionStrip().set` muda.

### O que AINDA falta na Etapa 8

- **Habilidades que aplicam condição.** É o que falta para sair do comando de
  teste e virar jogo — e depende das linhas de maestria da Etapa 13. Hoje só
  `/cond` aplica.
- **Resistência, redução e imunidade a condição** não existem em lugar nenhum:
  dependem das cartas (Etapa 10) e do equipamento (Etapa 11).
- **A flag PK (`canHarm`)** está pronta e sem uso: não há PvP implementado.
- **`DD-CC-013/014`** (anti-CC-chain) continua sem método definido no doc.

⚠️ `computeStats` **continua com a esquiva linear antiga**. `computeDodgeChance`
(retorno decrescente, teto 35 %) está pronto e testado, mas trocar lá muda o
balanceamento de quem já está jogando — merece ser feito de propósito, não de
carona numa troca de encanamento.

## Doc 3 recebido e triado (2026-07-29)

O Doc 3 chegou como `.docx` (398 KB, binário e ilegível por busca). Foi extraído
para `docs/doc3-lacunas-extraido.md` — 407 KB, 11.504 linhas, **759 decisões**.

Triagem completa em **[`DOC3-TRIAGEM.md`](./DOC3-TRIAGEM.md)**: o que o Doc 3
fecha, o que ele não resolve, os conflitos, e a ordem sugerida de implementação.
Comece por lá antes de mexer em qualquer coisa vinda do Doc 3.

**Autorização do dono:** *"tudo foi aprovado, mesmo como proposta, pode
implementar"*. O status `PROPOSTA` **não bloqueia** neste documento — diferente
do vocabulário do Doc 1, onde `PENDENTE` bloqueia.

**Aplicado nesta leva:** `DD-BAL-027` — o Slime virou **Slime Verde** e recebeu
os valores canônicos: **50 HP, força 5, defesa 1, XP 10**. Ele é a âncora de
balanceamento de todo o bestiário: nenhuma outra criatura tem XP definido
isoladamente. Isso **substitui** o balanceamento anterior (120/9/5/28), que
existia para o Slime durar ~3 golpes.

⚠️ **O resto do bestiário ficou desalinhado** em relação à âncora — o que é
esperado, porque `DD-BAL-038` manda balancear Tier por Tier e esse trabalho não
foi feito. As criaturas fora de escala estão DORMENTES (não nascem), **menos o
Zumbi**, que está ativo e ainda não tem Tier definido.

⚠️ **As quatro pendências que travam código continuam abertas** — nenhuma
aparece no Doc 3: `DD-CC-013/014`, `DD-DEF-012`, `DD-PROG-002`, `DD-DEATH-009`.

## Família Slime canônica — `DD-BAL-033` a `036` (2026-07-29)

Primeira família do bestiário com ficha oficial. Encerra a primeira etapa do
`PENDENTE 15` (balancear Tier I criatura por criatura).

| Criatura | HP | Dano | DEF | DEF Mág | XP |
|---|---|---|---|---|---|
| Slime Verde | 50 | 4–7 | 1 | 0 | 10 |
| Slime Azul 🆕 | 70 | 6–10 | 2 | 1 | 16 |
| Slime Vermelho 🆕 | 100 | 8–13 | 3 | 2 | 25 |
| Super Slime (MVP) | 500 | 18–28 | 8 | 5 | 250 |

**Três mudanças que alteram o jogo de verdade:**

1. 🔴 **O Slime Verde virou NEUTRO.** Era hostil. O doc é explícito: "permanece
   parado enquanto nenhum jogador se aproxima". O primeiro monstro do jogo não
   caça o jogador — ele revida. Muda a sensação da vila inicial.
2. 🔴 **O Super Slime caiu de 2.400 para 500 HP**, XP de 800 para 250, e a
   velocidade de "o mais rápido do mapa" (620 ms) para **baixa** (1500 ms).
   ⚠️ Efeito colateral consciente: **dá para fugir dele andando**. A lógica
   antiga era "corra para o centro, onde ele não entra" — `avoidCenter` continua
   ligado, mas deixou de ser a única saída.
3. 🔴 **Magia deixou de ignorar a defesa da criatura.** `magicDefense` entrou em
   `CreatureDef` e é usada de verdade. Antes era sempre 0 porque nenhuma criatura
   tinha o dado.

**Detalhes de implementação:**

- `strength` guarda o **ponto médio** da faixa do doc, porque `computeHit` aplica
  variância de ±15 % — mais estreita que "4–7". Reproduzir a faixa exata exigiria
  variância por criatura; o ponto médio preserva a curva entre espécies, que é o
  que `DD-BAL-027` protege.
- O chefe **continua `fanatic`**, não `hostile`. A ficha diz "Agressivo", mas a
  descrição de IA — "nunca abandona o combate enquanto houver um alvo na área" —
  é a definição de `fanatic` no código. Rótulo grosso perde para IA específica.
- Azul e Vermelho estão **DORMENTES**: definidos, sem nascer no mapa. O mundo
  segue com Slime Verde, Zumbi e Super Slime. Ligar é uma linha em
  `spawnInitialCreatures`.

### 🔴 Duas decisões esperando o dono

1. **Mecânicas do Super Slime.** A ficha pede **Salto Esmagador** (dano em área)
   e **fúria aos 50 % de vida** (só velocidade de ataque). Nenhuma das duas
   existe. O que existe é magia + invocação, que a ficha **não** lista. Manter os
   quatro, ou trocar? A potência da magia foi baixada de 34 para 14 junto com a
   ficha — com 500 HP, o dano antigo matava nível baixo em dois cuspes.
2. **Tier do Slime Azul.** O Doc 3 se contradiz: linha 1906 diz Tier II, a ficha
   na linha 3155 diz Tier I. Implementado como **Tier I** (a ficha é mais
   específica e traz os números).

## Zumbi vira Tier III — `DD-BAL-055` (2026-07-29)

O Doc 3 responde onde o Zumbi se encaixa, e não é no início do jogo. A linha
4427 põe a progressão dos mortos-vivos como **Esqueleto (Tier II) → Zumbi,
Esqueleto Guerreiro, Esqueleto Arqueiro e Múmia (Tier III)**.

| | Antes | Canônico |
|---|---|---|
| HP | 160 | **340** |
| Dano | ~15 | **20–28** |
| DEF | 6 | **8** |
| DEF Mágica | — | **4** |
| XP | 40 | **95** |

Identidade oficial: *"lento; extremamente resistente; pressão constante"* — que
é exatamente o que o passo de 2000 ms já entregava. A lentidão virou teste: o
Zumbi tem que continuar sendo a criatura mais lenta do jogo.

🔴 **Ele ficou muito mais perigoso e continua nascendo fora da muralha**, a 9
pontos do mapa. O de `(20,34)` está em linha reta ao sul do nascimento e hoje é
um encontro provavelmente fatal para personagem recém-criado. Isso é
**permitido** por `DD-BAL-039` (Tier não é bloqueio de acesso), então não é bug —
mas merece decisão consciente. Opções em `DOC3-TRIAGEM.md`. O spawn **não** foi
alterado: mapa é decisão do dono.

## Tier II e Tier III definidos — `DD-BAL-044` a `059` (2026-07-29)

**18 criaturas novas** com ficha canônica, todas **DORMENTES**. Mais o spawn dos
Zumbis afastado do eixo sul.

**Tier II:** Aranha da Floresta · Aranha de Teia · Formiga Soldado · Formiga
Cuspidora · Goblin Guerreiro · Goblin Arqueiro · Lobo Cinzento · Orc Jovem ·
Orc Guerreiro

**Tier III:** Esqueleto Guerreiro · Esqueleto Arqueiro · Minotauro · Urso Pardo ·
Lobo Negro · Aranha Gigante · Formiga Mística · Kobold Caçador · Troll

### 🔴 O gargalo virou ARTE

Nenhuma nasce no mapa, e o motivo **não é código nem espaço**. O cliente escolhe
o desenho por `creatureType` e cai em `drawSlime` para tipo desconhecido:
spawnar hoje encheria o mundo de bolhas idênticas com 140 a 480 de vida. O
jogador não distinguiria um Troll de um Slime antes de morrer para ele.

Opções em `DOC3-TRIAGEM.md`. O caminho barato é **placeholder por família** no
`drawBody` — destrava playtest sem esperar 18 sprites, e cada arte real
substitui o placeholder da sua espécie depois.

⚠️ **Expandir o mapa não foi necessário.** O 60×60 comporta muito mais que as 27
criaturas atuais; o aperto é de identificação visual, não de espaço.

### Decisões de tradução do doc para o código

- 🆕 **`SPEED`** traduz "Baixa/Média/Alta/Muito Alta" para ms por passo,
  ancorando na família Slime (que já valia 1500 e o doc chama de "Baixa").
  ⚠️ A velocidade-base do sistema segue **PENDENTE** no doc — isto é escala
  relativa, não canônica.
- **Criaturas à distância usam `spell`** com o `damageType` certo: flecha é
  física, ácido é Veneno. É o primeiro uso real do campo que entrou na Etapa 8.
- **Urso Pardo ficou `territorial` por INFERÊNCIA** — a ficha não dá
  comportamento, e territorial é a leitura defensável para fauna ("tanque
  natural", não caçador). Confirmar.
- `DD-BAL-049` virou **teste**: nas duplas tank/ranged da mesma família, o
  ranged tem que ser mais frágil E ter alcance. Impede que alguém acrescente
  espécie "só com número maior", que o doc proíbe.
- A curva entre Tiers virou teste: as faixas de XP **não podem se cruzar**.

### Comportamentos que a ficha descreve e a IA ainda não faz

Teia (Lentidão) · recuo do arqueiro · buff da Formiga Mística · armadilhas do
Kobold · alcateia do Lobo. Todos anotados no código, na criatura correspondente.
O primeiro depende de criaturas poderem aplicar condição — que ainda não podem.

## Super Slime ganha suas mecânicas — `DD-BAL-036` (2026-07-29)

O primeiro MVP passa a ter as duas mecânicas que a ficha canônica pede, e perde
as duas que ela não pede.

**🆕 Salto Esmagador** (`CreatureSlam`) — dano em ÁREA ao redor do chefe, sem
alvo escolhido: pega todo mundo no raio. É a lição de **posicionamento**. Não é
esquivável de propósito — esquivar de AoE tornaria a lição opcional.

**🆕 Fúria aos 50 %** (`CreatureEnrage`) — dispara **uma vez** ao cruzar o
limiar e dura 12 s. 🔴 Só acelera o **ataque**: o doc é explícito em "sem alterar
sua velocidade de deslocamento". Acelerar o passo transformaria a segunda fase
numa perseguição impossível, e a lição pretendida é aguentar pressão. É a lição
de **fases de combate**.

**🔴 Magia à distância e invocação REMOVIDAS.** A ficha lista a IA do chefe e
nenhuma das duas está lá. Quatro mecânicas num MVP de 500 HP cujo papel é
didático é ruído. Os sistemas (`CreatureSpell`, `CreatureSummon`) continuam
existindo e outra criatura pode usá-los — reverter neste chefe é uma linha.

### Ajustes de recarga a pedido do dono

| Habilidade | Antes | Agora | Porquê |
|---|---|---|---|
| **Salto Esmagador** | 6 s | **11 s** | a 6 s saía toda hora e virava pressão contínua em vez de um momento a ser lido |
| **Investida** (Knight F3) | 8 s | **13 s** | é MOBILIDADE, não rotação: a 8 s cabia no ciclo normal e apagava a decisão de guardá-la para alcançar quem foge |

O teste da Investida agora trava também que ela seja a recarga mais longa da
árvore depois da Fúria de Batalha — é isso que a mantém recurso, não ciclo.

### ⚠️ Por que a lore do Doc 3 NÃO virou código

As 76 decisões `DD-LOR` são canon narrativo, mas quase nada é implementável:
`DD-LOR-114` estabelece que **Asteria existe e é um grande centro**, e o mesmo
bloco **adia explicitamente** primeiro rei, primeira capital, impérios, guerras
e política dos reinos. Não há posição no mapa nem traçado da cidade.

Pôr Asteria em `TOWNS` hoje criaria uma cidade **invisível**: um raio de visita
em terreno vazio, com o sistema de respawn "funcionando" sobre nada. Isso é
inventar mapa. Fica para a Etapa 16, quando a cidade for desenhada — e aí é uma
entrada na tabela, como o comentário de `towns.ts` já previa.

## Crafting por Fragmentos — Doc 3 Bloco 01 e cap. 78 (2026-07-29)

`shared/src/crafting.ts` + 14 testes. **Só as regras**, sem UI e sem integração
com inventário — mesmo método da Etapa 8: fechar a lógica com teste antes de
mexer no servidor.

O ciclo que o doc chama de pilar da economia (`DD-PROF-027`):
**Exploração → Fragmentos → Craft → Marketplace → novas expedições.** Monstro
não dropa equipamento pronto com frequência; dropa **fragmentos**, e o jogador
escolhe o risco.

### As regras que o doc fecha

- **Chance proporcional à quantidade** (`DD-PROF-022`): 50 Comuns + 50 Incomuns
  → 50 % / 50 %. Os exemplos do doc viraram teste literal.
- 🔴 **Mínimo de fragmentos para entrar na tabela.** É a regra anti-exploit, e o
  doc explica com o caso concreto: sem ela, `1 Lendário + 99 Comuns` daria 1 %
  de Lendário por custo irrisório, e farmar Comum viraria a via barata para o
  item caro.
- 🔴 **Fragmento fraco nunca REBAIXA o resultado** — só deixa de contribuir. Por
  isso o que não atinge o mínimo some da conta em vez de puxar a média, e a
  proporção renormaliza. É o que garante o "crafting nunca gera item inútil":
  com Raro/Épico/Lendário na bancada, **é impossível** sair Comum.
- 🔴 `DD-PROF-028` **só existem DOIS Mestres Ferreiros no mundo**, e só eles
  fazem Mítico e Relíquia. Ferreiro comum para em Lendário. Há teste garantindo
  que nem o upgrade de profissão cruza essa fronteira — senão a decisão viraria
  letra morta.
- **Upgrade de profissão sobe UM degrau** e satura em 10 % (`DD-PROF-023`
  insiste em "pequena chance").
- **XP profissional decai** para receita muito abaixo do nível (`DD-PROF-024`),
  mas nunca chega a zero: trabalho feito é trabalho feito.

### ⚠️ Conflitos e leituras registradas

1. **`DD-PROF-021` tem duas versões.** O Bloco 01 fala em **cinco** categorias
   de fragmento; o **cap. 78 revisa para sete**, alinhando com as sete raridades
   que o jogo já tem. Vale o cap. 78 (o capítulo mais alto vence).
2. **O teto antigo "crafting alcança no máximo Lendário" NÃO foi contrariado** —
   foi refinado. Ferreiro comum para em Lendário; Mítico e Relíquia existem, mas
   passam pelos dois Mestres.
3. ⚠️ **A receita foi implementada como TETO.** `DD-PROF-022` diz que a raridade
   vem dos fragmentos e `DD-PROF-025` diz que a receita define a categoria, sem
   dizer como as duas convivem. Teto preserva as duas: fragmentos sorteiam, a
   receita limita. **Precisa de confirmação do dono.**

### Fragmentos entram no jogo (mesmo dia)

Os 7 fragmentos viraram **item de verdade** e **caem de monstro**. O elo
Exploração → Fragmentos existe; falta o resto do ciclo.

🔴 **O teto de raridade por fonte não foi inventado** — é a regra "raridade
máxima por fonte" já fechada no roadmap (Etapa 4), agora aplicada ao material:

| Fonte | Fragmento máximo |
|---|---|
| Monstro comum | Raro |
| Elite (variante Robusto/Raro) | Lendário |
| Boss | Mítico |
| World boss | Relíquia |

Se um monstro comum não pode dropar equipamento Lendário, também não pode
dropar o material que fabrica um. E isso dá **função extra às variantes de
spawn**: um exemplar Robusto passa a ser fonte de fragmento melhor, não só mais
HP e XP.

- **Chance alta (55 %)** de propósito: são 100 fragmentos por fabricação, e o
  doc faz do fragmento a via PRINCIPAL de equipamento. Na frequência de um
  equipamento inteiro, ninguém craftaria nunca.
- **Chefe larga 8 tentativas** de uma vez — é o que justifica organizar grupo.
- O **fragmento do teto é raro dentro da própria fonte** (teste garante menos de
  10 %), senão farmar a fonte difícil perderia a graça.
- **Fragmento de Relíquia não é vendável a NPC**: `DD-PROF-028` faz dele
  matéria-prima dos dois Mestres Ferreiros, e preço de balcão apagaria isso.

### O que falta para virar jogo

Receitas como consumível (`DD-PROF-024`: cada fabricação consome uma) ·
profissões e seus níveis · UI de bancada · o NPC Mestre Ferreiro. É a Etapa 12.

## Catálogo de equipamento — cap. 13–23 ganham NÚMEROS (2026-07-30)

**Arquivos:** `shared/src/equipcurve.ts` (novo) · `shared/src/catalog.ts` (novo) ·
`shared/src/models.ts` (reescrito em famílias) · `items.ts` · `weapons.ts` ·
servidor e bancada do cliente
**Testes:** `shared/tests/catalog.test.ts` (novo) · `models.test.ts`

Os 113 nomes canônicos viraram **113 itens jogáveis**. 104 são gerados; as 9
peças âncora continuam escritas à mão.

### A curva, e por que ela não é 178 números à mão

Cinco constantes em `equipcurve.ts` produzem `atk`, `def`, nível recomendado e
preço de todo modelo. Rebalancear o jogo inteiro é mudar uma delas.

🔴 **A tabela de defesa por slot não foi inventada — foi extraída.** Com o `atk`
das armas iniciais (8) como unidade, os `def` escolhidos a dedo no catálogo
antigo caem exatos em frações: Armadura 0,625 · Escudo 0,5 · Calça 0,375 · Elmo e
Botas 0,25 · Colar 0,125. `equipPower(1) = 8` reproduz o catálogo antigo peça por
peça, e há teste travando isso.

### 🔴 Ataque e defesa têm curvas SEPARADAS, e a assimetria é obrigatória

`resolveDamage` mitiga por **subtração plana** (`max(0, dano − def)`). Defesa não
tem retorno decrescente: a partir de um ponto ela **zera** o dano. E o teto do
bestiário é baixo — a criatura mais forte bate com **24**, enquanto o set de
couro de hoje já soma 17 de defesa. O jogo opera a 70 % do ponto de imunidade.

Por isso `DEF_COEF` (0,25) é **três vezes menor** que `ATK_COEF` (0,75). A
primeira tentativa usou a mesma curva para os dois e levava o topo a 100: uma
arma de Lv.20 saía com `atk: 31` — mais que a força de ataque inteira do monstro
mais perigoso do jogo.

⚠️ **Mesmo assim a curva cruza o teto no meio do jogo.** É limitação do
bestiário, não da curva: não há Tier IV para bater mais forte. Quando houver,
sobe-se `strength` das criaturas e `DEF_CURVE_MULT` junto. **A resposta não é
baixar `DEF_COEF`** — há teste explicando isso na mensagem de falha.

### 🔴 A trava que este commit teve que trazer junto

A bancada do Ferreiro listava **todo** item `equip` e o servidor aceitava
qualquer `kind`. Regra que funcionava com 13 peças, todas de nível 1 — com 113
modelos, um jogador recém-nascido fabricaria o Machado Primordial com uma Receita
Comum.

`CRAFT_TIER_CAP` amarra a raridade da receita ao tier do modelo (Comum/Incomum →
inicial · Raro/Épico → intermediário · Lendário+ → avançado). Reusa a escada de
raridade em vez de inventar requisito de nível novo, e faz a receita valer duas
coisas: a qualidade do resultado **e** o alcance do catálogo.

⚠️ A trava vale só para peça de catálogo. Mochila, bolsa e as de couro não são
modelos do Doc 4 e continuam fabricáveis como sempre foram.

### Decisões do dono (2026-07-30)

| Assunto | Decisão |
|---|---|
| Varinha (cap. 21) | família própria dentro de `staff` — **sem `WeaponType` novo** |
| Livro Arcano (cap. 22) | **foco de mão secundária**, slot `shield`, classe Veste |
| Escudo (cap. 23) | slot `shield`, sem classe de armadura |

O Livro no slot do escudo é o que deixa a build mágica completa (Cajado na mão
principal, Livro na secundária) — leitura natural do cap. 38, que lista Cajados
**e** Livros para o Sorcerer. ⚠️ A identidade dele está fina: o slot só soma
`def`, e `ItemDef` não tem campo de mana. Dar bônus mágico de equipamento é
decisão futura.

### Três coisas que o documento não fecha, achadas no caminho

1. **O cap. 13 não tem Tier Avançado.** A família Espadas para na Espada Anã —
   é a única sem Celestial/Primordial. Teste trava, para ninguém inventar os
   nomes que faltam.
2. **"Machado de Lenhador" aparece duas vezes**: arma no cap. 14 e ferramenta de
   profissão no cap. 35. Fica sendo a arma, que já existe no jogo.
3. **`ArmorClass` não tinha "Média"**, e o cap. 25 divide os peitorais em Leves /
   Médias / Pesadas / Vestes. `medium` entrou — com afinidade **vazia**, porque o
   cap. 38 não dá classe nenhuma que a priorize e inventar uma seria escolher
   identidade de classe por conta própria.

### A âncora fica no piso

As 9 peças escritas à mão têm `kind` em inglês, preço a dedo e balanceamento que
o dono aprovou jogando — e o `kind` está gravado em save. Elas não são geradas, e
ficam fixadas em Lv.1 mesmo quando o documento as lista no meio da escada inicial
(a Adaga Curta vem depois de Faca e Punhal no cap. 17). Mas **continuam ocupando
a posição delas** na distribuição dos outros: tirá-las da contagem fazia o
Machado de Ferro empatar em Lv.1 com o Lenhador e depois pular para Lv.20.

### Armadura e drop por nível — segunda parte (2026-07-30)

Mais **64 modelos** (cap. 24–27): 21 capacetes, 23 peitorais, 10 calças, 10
botas. O catálogo foi a **177 modelos**, com 13 âncoras.

🔴 **Os peitorais viraram QUATRO famílias**, não uma. O cap. 25 subdivide em
Leves / Médias / Pesadas / Vestes e ordena por poder **dentro de cada
subdivisão** — numa lista só, o tier desceria toda vez que uma subdivisão
recomeçasse. O cap. 42 até prevê "Subcategoria" como campo; aqui ela virou
família.

⚠️ **A classe de armadura de capacetes, calças e botas é INFERIDA do nome**, e a
regra é do português, não do documento: Capuz e Tecido → Veste · Couro e Élfico →
Leve · Capacete e Militar → Média · Elmo, Perneiras, Ferro, Aço e Anão → Pesada.
Só o cap. 25 diz a classe de cada peça.

**Mais dois nomes corrigidos para o canônico:** "Elmo de Couro" → **Capuz de
Couro** (cap. 24) e "Armadura de Couro" → **Colete de Couro** (cap. 25). O `kind`
não muda, então save continua válido.

**O "Tier Final" do cap. 24 não é um quarto degrau** — são os Artefatos Únicos do
cap. 40 (Coroa dos Primeiros Reis, Elmo do Primeiro Guardião, Coroa da Criação).
Entraram como `unique`: sem preço, fora do pool de drop e fora da bancada. Ainda
não há fonte de obtenção.

**Drop por nível.** `DROP_POOL_WEAPON`/`ARMOR` eram listas fixas de 13 peças.
Agora o pool sai do catálogo filtrado pela **XP da criatura** (`DROP_LEVEL_PER_XP
= 0,6`, ⚠️ REFERÊNCIA), na faixa da metade do nível até ele. A XP é o medidor de
dificuldade canônico do bestiário — o Slime Verde é a âncora do Doc 3 — e não
existe campo de nível na criatura. O Slime larga peça de Lv.6; o Zumbi, de Lv.57.

⚠️ **Existe um buraco de nível 2 a 4 no catálogo de arma**: o degrau era da
Espada Curta, que é âncora e ficou fixada no Lv.1. `dropPoolFor` cai no piso do
catálogo quando a faixa vem vazia, e há teste cobrindo criatura por criatura.

### Anéis e colares ficaram de fora, e o motivo importa

🔴 Acessório não é peça de proteção — a graça é o que ele **faz**. E os nomes do
cap. 30 são inteiramente sobre efeito: Anel da Vida, da Mana, do Crítico, da
Precisão, da Fortuna, e um para cada classe.

`ItemDef` só sabe expressar `atk` e `def`, e a curva de defesa é rasa de
propósito — então os 18 anéis sairiam todos com **`def: 1`**: dezoito itens
mecanicamente idênticos com nomes diferentes. É o mesmo problema dos 38 ícones
iguais que a sessão de 30/07 já corrigiu, e o que `DD-MAT-001` proíbe.

O que destrava os três de uma vez (anel, Veste e Livro Arcano): **bônus fixo de
equipamento** — vida, mana, poder mágico — em `ItemDef`, somado por `equipBonus`.

### O que falta

Os 41 modelos que exigem `EquipSlot` novo no paperdoll (cap. 28–29, 32–34:
luvas, capas, braceletes, cintos, broches) · anéis e colares, que esperam bônus
fixo de equipamento · fonte de obtenção para os três artefatos únicos.

## Etapa 9 (parte 1) — as regras de Party, sem fiação (2026-07-30)

**Arquivos:** `shared/src/party.ts` (novo)
**Testes:** `shared/tests/party.test.ts` (novo)

Só as regras: nada de rede, nada de estado de servidor. É o que permite testar
"um Lv.300 não rouba XP de um Lv.20" sem subir servidor e conectar dois clientes.

### As duas decisões que o documento deixou em aberto

1. **A faixa de nível é RELATIVA, não fixa.** `DD-PARTY-003/004` diz "faixa de
   aproximadamente 10 níveis", o que comporta as duas leituras. A fixa (1–10,
   11–20) cria um penhasco absurdo: um Lv.10 e um Lv.11 não poderiam jogar
   juntos, enquanto um Lv.1 e um Lv.10 poderiam. ⚠️ Interpretação registrada no
   código.
2. **`partyXpBonus = 1 + 0,10 × (n−1)`.** `DD-PARTY-010` deixa o percentual para
   balanceamento, mas o número não é livre — o roadmap fecha duas pontas que
   puxam em direções opostas: *"solo rende mais por monstro"* exige `bonus(n) <
   n`, e *"party rende mais no total"* exige `bonus(n) > 1`. Há teste conferindo
   as duas para grupos de 2 a 10.

### 🔴 A referência da faixa é o membro de MENOR nível

É o que faz `DD-PARTY-007` funcionar (*"um Lv.300 pode ajudar um Lv.20, mas não
divide XP com ele"*). Se a referência fosse o de maior nível, o **Lv.20** é que
ficaria de fora — o oposto do que o documento quer.

E o teste trava a outra metade da regra, que é fácil de perder: a parte do novato
**não diminui** por o veterano estar junto. Ajudar continua sendo ajudar, e nunca
vira roubo.

### O resto que entrou

Ordem do `DD-PARTY-009` (bônus **antes** da divisão) · participação e proximidade
como condições separadas (`DD-PARTY-008` — dá para bater e fugir) · os três modos
de loot · votação com maioria simples, empate mantendo e abstenção **não** valendo
como voto contra · trava da regra durante boss (`DD-PARTY-019`, anti-golpe:
sem ela o líder propõe "Loot do Líder" no instante antes de o chefe cair) ·
sorteio de loot de boss ponderado por dano, com **last hit valendo nada**
(`DD-PARTY-022`) e contribuição mínima de 5 % (⚠️ REFERÊNCIA, o doc adia).

### O que falta da Etapa 9

**Nada disto está ligado ao jogo ainda.** Faltam os dois commits seguintes:

- **Protocolo e servidor** — convite/aceite/saída/expulsão, estado da party, e a
  peça que a base não tem: **contribuição de dano por jogador na criatura** (hoje
  só existe `targetId`). Ela é pré-requisito de `DD-PARTY-008` e `021`.
- **Cliente** — painel de party, regra de loot sempre visível (`DD-PARTY-014`),
  prompt de votação, e um `/party` nos comandos de teste, porque validar isso
  sozinho exige dois clientes.

## Etapa 9 COMPLETA — Party, shared XP e loot (2026-07-30)

**Arquivos:** `shared/src/party.ts` · `protocol.ts` · `server/src/index.ts` ·
`client/src/main.ts` · `client/index.html`
**Testes:** `shared/tests/party.test.ts`

### A peça que a base não tinha

`Creature` ganhou **`damageBy: Map<playerId, dano>`**, acumulado por *vida* da
criatura e zerado ao renascer — sem isso, o dano de ontem daria direito ao loot
de hoje. Duas regras dependiam dela e não tinham como existir antes:
`DD-PARTY-008` (participação válida — entrar no grupo e ficar parado não rende
XP) e `DD-PARTY-021` (contribuição pondera o loot de chefe, com **last hit
valendo nada**).

### Loot escolhe DONO, nunca volume

`DD-PARTY-011/012`. `dropLoot` ganhou um `recipient` opcional e todas as entregas
passam por ele; `undefined` mantém o comportamento de sempre, que é cair no chão.

⚠️ **Mochila cheia cai no chão em vez de sumir.** Perder loot por falta de espaço
seria pior que a regra de loot não valer.

**Loot Livre é o padrão** de toda party nova, porque é exatamente o que o jogo já
fazia. Nascer em outra regra mudaria o comportamento de quem nunca abriu o painel.

### Decisões que o documento não fecha

| Assunto | Decisão | Por quê |
|---|---|---|
| Líder sai | liderança passa ao **membro mais antigo** | dissolver puniria o grupo pela desconexão de um |
| Party de 1 | **deixa de existir** | painel anunciando um grupo que não é grupo |
| Quem propõe | **já vota a favor** | propor é a forma mais clara de dizer "sou a favor" |
| Proximidade | **12 tiles** (`PARTY_XP_RANGE`, ⚠️ REFERÊNCIA) | pouco mais que a tela: exige a mesma briga, mas conta o arqueiro no fundo |
| Convite | por **nome**, não por id | o id é interno; o nome é o que o jogador consegue digitar |

### O chat age, o painel mostra

Os comandos de party **não** são de dev — valem em produção e vêm antes deles no
handler: `/convidar <nome>` · `/sim` · `/nao` · `/sairdogrupo` ·
`/expulsar <nome>` · `/loot <livre|lider|aleatorio>` · `/grupo`.

`/sim` e `/nao` servem para as duas respostas possíveis — convite e votação —
porque do ponto de vista do jogador são a mesma pergunta.

O painel some quando não há grupo (a barra tem 190 px), e mostra **"fora da
faixa"** em âmbar em quem não divide XP. É a informação que mais surpreende: sem
ela, a regra parece bug para quem chama um amigo de nível muito diferente.

## Balanceamento — armadura ganha teto (2026-07-30)

**Arquivos:** `shared/src/defense.ts` · `server/src/index.ts`
**Testes:** `shared/tests/defense.test.ts`

Pedido do dono: *"balanceie para não ficar fácil demais"*. Duas alavancas, as
duas `⚠️ REFERÊNCIA` — **as fichas `DD-BAL` das criaturas são canônicas e não
foram tocadas.**

### 🔴 `MIN_DAMAGE_AFTER_ARMOR = 0,25`

Corte plano não tem retorno decrescente. Quando a defesa passa do dano bruto, o
golpe cai para o piso de 1 e o jogador vira intocável — não é imunidade literal,
mas resolve o jogo do mesmo jeito. E deixou de ser teórico com o catálogo
completo: um set pesado de meio de jogo já soma mais que os **24** de força do
Zumbi.

O teto **não contradiz o cap. 31** ("corte plano no dano bruto"): o corte
continua plano, só não pode anular. E segue a filosofia que o próprio
`DD-DEF-012` estabeleceu para o bloqueio — defesa tem teto, e o teto é decisão
consciente.

⚠️ **Vale só para a camada de armadura.** Resistência elemental e redução de
skill agem depois e podem baixar mais (`DD-ELM-003`). Há teste garantindo que
resistir a fogo continua valendo mesmo com armadura enorme.

**E não muda nada do balanceamento de hoje:** set de couro (17 de defesa) contra
o Zumbi (24) já entrega 7 de dano, bem acima do teto — que nem entra em ação. É
grade de proteção, não nerf.

### `EQUIP_DROP_CHANCE`: 0,18 → 0,08

Antes havia 13 peças, todas de nível 1, e quase 1 em cada 5 abates largar
equipamento só enchia a mochila de repetição. Com 177 modelos escalonados por
nível, cada peça que cai pode ser melhor que a atual — a mesma frequência viraria
progressão de graça.

## Bônus fixo de equipamento — cap. 30 e 31 destravados (2026-07-30)

**Arquivos:** `shared/src/items.ts` (`ItemDef.bonus`) · `equipcurve.ts` ·
`models.ts` · `catalog.ts` · `server/src/index.ts` · `client/src/main.ts`
**Testes:** `shared/tests/catalog.test.ts`

O catálogo foi a **205 modelos** com os 18 anéis e 10 colares. Mas o que
importa é o mecanismo, porque ele resolveu **três** pendências que esperavam a
mesma coisa.

### 🔴 `ItemDef.bonus` reusa o vocabulário de `AFFIXES`

A alternativa era inventar campos (`hpBonus`, `manaBonus`, `critBonus`…) e, com
eles, uma segunda escala paralela à dos passivos rolados — duas tabelas dizendo
quanto vale +10 de vida, livres para se contradizer. Aqui a grandeza é a mesma; o
que muda é só a **origem**: passivo é sorteado quando o item nasce, bônus fixo é
característica do modelo e vem sempre igual.

**A magnitude também não é inventada:** `fixedBonusFor` interpola a faixa do
próprio passivo em `AFFIXES`. Lv.1 entrega o mínimo que aquele passivo pode
rolar, Lv.100 o máximo. Um anel de topo vale exatamente o que um passivo bem
rolado vale.

⚠️ **A raridade NÃO multiplica o bônus fixo.** `statMult` já multiplica
`atk`/`def`; aplicá-lo também aqui faria a raridade contar duas vezes num
acessório, cujo valor é quase todo bônus.

`somaAffix` no servidor virou fonte única da tradução "quais passivos são
percentuais e quais são absolutos" — duplicar isso era o caminho mais curto para
um bônus de velocidade virar +8 em vez de +8 %.

### As três pendências que caíram juntas

1. **Anéis (cap. 30).** Eram 18 nomes que sairiam todos com `def: 1` — itens
   mecanicamente idênticos, o que `DD-MAT-001` proíbe. Agora cada um faz o que o
   nome diz, que é a única mecânica que o capítulo oferece.
2. **Vestes.** Antes eram só armadura pior (robe multiplica a defesa por 0,75 e
   nada vinha em troca). Agora dão mana — o cap. 38 põe "Vestes" e "Mana" na
   mesma linha do Sorcerer.
3. **Livro Arcano.** Mesmo problema, mesma solução.

⚠️ **Dois nomes não tinham mecânica óbvia, e o encaixe é interpretação:**
**Fortuna → `crit_chance`** (fortuna é sorte, e neste jogo sorte tem endereço:
LUK dá crítico) e **Precisão → `armor_pen`** (acertar onde dói — é o encaixe
mais frouxo dos dezoito). O Anel do Crítico ficou com `crit_damage` para não
repetir a Fortuna: um dá a chance, o outro o tamanho do golpe.

### No tooltip, o bônus fixo vem ANTES e sem indentação

Num anel ele é a peça inteira, não um extra. Escondê-lo deixaria o Anel da Vida
indistinguível do Anel da Mana na mochila.

## Proficiência canônica — `DD-PROG-011` (2026-07-30)

**Arquivos:** `shared/src/proficiency.ts` (novo)
**Testes:** `shared/tests/proficiency.test.ts` (novo)

Camada **pura de leitura** sobre os `WeaponType` que já existem. Não toca em
save: `Proficiencies` continua indexada por `WeaponType`, e ligar de verdade é
migração.

### Por que era dívida

Quando o dono fechou que **Varinha e Livro Arcano não viram `WeaponType`**, o
argumento que sustentou a decisão foi que a proficiência mágica deles já estava
prevista no Magic Level. Só que **Magic Level não existia no código** — o Cajado
subia uma proficiência chamada `staff`, que é nome de arma, não de magia. A
decisão estava de pé sobre algo inexistente.

### 🔴 Os dois documentos discordam, e o dono decidiu

| Fonte | Lista |
|---|---|
| **Doc 1** (§61) | `1H` · `2H` · `Distance` · `Shield` · `Magic Level` |
| **Doc 4**, cap. 42 | `Sword` · `Axe` · `Club` · `Spear` · `Dagger` · `Distance` · `Fist` · `Magic Level` |

Não é redação: são modelos diferentes. O Doc 1 agrupa por **como se segura a
arma** — treinar espada treinaria machado junto. O Doc 4 mantém **uma
proficiência por família**, que é o que o código já fazia.

🔴 **Decisão do dono em 2026-07-30: vale o Doc 4.** É **override explícito da
regra de ouro** — pela hierarquia o Doc 1 venceria, e por isso está travado por
teste. Quem chegar lendo só o destilado vai achar que o código diverge do
documento; **não diverge, foi decidido contra ele.**

Os dois motivos que sustentam: preserva o que já está em save (o Doc 1 jogaria
fora a proficiência de todo mundo), e o próprio cap. 42 se apresenta como
*"conforme o sistema já consolidado"* — está descrevendo, não propondo.

### O que passou a existir

- **`magic`** — o Magic Level de verdade. É por `isMagicProficiency` que as
  magias vão perguntar requisito, e **não** por INT.
- **`fist`** — lutar sem arma passa a ter onde treinar. Antes o jogador batia e
  não melhorava, para sempre; o doc prevê Fist porque lutar sem arma é escolha
  válida, e escolha válida que não progride não é escolha.
- **`distance`** — arco e besta colapsam. ⚠️ O que se funde é o **treino**, não a
  arma: há teste garantindo que `WEAPON_IDENTITY` continua dando cadência e dano
  distintos aos dois.

`proficiencyMatchesIdentity` trava as duas tabelas juntas, com a **lança** como
caso de fronteira: ela alcança dois tiles, não o outro lado da tela.

## Ciclo dia/noite — três fases de tempo real (2026-07-30)

**Arquivos:** `shared/src/daynight.ts` (novo) · `protocol.ts` · servidor · cliente
**Testes:** `shared/tests/daynight.test.ts` (novo)

O ciclo dava a volta inteira em **2 minutos**. Era deliberado — o comentário
dizia *"acelerado para o usuário testar já"* — mas transformava a noite em
piscada e esvaziava o `NIGHT_DMG_MULT`: não dava tempo de a escolha de sair à
noite significar nada.

Decisão do dono: **1 h de dia · 30 min de tarde · 1 h de noite**, em tempo real.

### O mapa das fases na hora do relógio

```
 fase    tempo real     hora no jogo
 dia      1 h           06:00 → 17:00
 tarde   30 min         17:00 → 19:00
 noite    1 h           19:00 → 06:00
```

⚠️ **As faixas de hora não são proporcionais ao tempo real, de propósito.** A
tarde corre rápido (2 horas de relógio em 30 minutos) porque é transição — o
valor dela é o céu mudando de cor, não a duração. Dia e noite ficam com 11 horas
de relógio cada, o que mantém meio-dia e meia-noite nos extremos da curva de
escuridão que o cliente **já** desenhava por cosseno: nenhuma mudança foi
necessária no render.

### 🔴 A TARDE não conta como noite

É `night: boolean` que liga `NIGHT_DMG_MULT` e `NIGHT_SPEED_MULT` — criaturas
mais fortes e mais rápidas. Se a tarde valesse como noite seriam **1h30 de
perigo contra 1h de segurança**, e a tarde deixaria de ser o aviso que ela é: o
momento de decidir se volta para a vila ou encara. Teste trava isso.

A tarde ganhou **ícone próprio** no relógio (🌇). Sem marca visível, o jogador só
percebe a mudança quando já está escuro e as criaturas já estão mais fortes.

### Os comandos: `/dia` · `/tarde` · `/noite` · `/ciclo`

🔴 **Não congelam o relógio — deslocam a ORIGEM do ciclo.** Forçar `/noite` e
esperar faz amanhecer sozinho. Congelar esconderia justamente os bugs de
transição, que é o que se quer testar.

O efeito é **global**: o mundo é um só, então quem estiver jogando junto vê a
mesma coisa. `/ciclo` devolve ao horário natural.

## Coleta e mineração — as regras (2026-07-30)

**Arquivos:** `shared/src/gathering.ts` (novo) · `materials.ts` · `items.ts`
**Testes:** `shared/tests/gathering.test.ts` (novo) · `materials.test.ts`

### 🔴 Seis famílias de material estavam PROIBIDAS de existir

`materials.ts` diz que só material com forma de ser obtido entra, porque
`DD-MAT-001` proíbe o que "existe apenas para ocupar espaço". Minérios, Madeiras,
Ervas, Flores, Cogumelos, Cristais e Gemas não tinham origem — e a consequência
era dura: **o Ferreiro não tinha minério e o Alquimista não tinha erva.**

O cap. 44.1 dá a origem de cada uma numa linha (*"obtidos através da mineração"*,
*"obtidas através do corte de árvores"*, *"obtidas por coleta"*). Faltava o
sistema.

### O teste que bloqueava virou do avesso

Havia um teste em `materials.test.ts` proibindo essas famílias. Ele **não foi
apagado** — foi invertido: agora exige que todo material de coleta tenha um **nó
que o produza**. A regra não mudou, mudou o mundo. Material de coleta novo sem
nó continua sendo exatamente o erro que a versão anterior pegava.

### 🔴 A ferramenta de lenhador não precisou ser inventada

O cap. 35 lista "Machado de Lenhador" entre os equipamentos de profissão, e o
cap. 14 entre os machados. **Isto foi registrado como colisão do documento
quando o catálogo entrou — e não era.** É o mesmo objeto: cortar árvore exige um
machado equipado, e o machado inicial do jogo chama-se Machado de Lenhador. O
documento estava certo dos dois lados.

Picareta e Foice, essas sim, não existiam. Entraram, e saíram de
`PENDING_MODEL_CATEGORIES.ferramentas`. ⚠️ **Não ocupam slot** — basta tê-las na
mochila. Ferramenta que exigisse desequipar a arma transformaria coleta em ida e
volta de inventário.

### Decisões de desenho

| Assunto | Decisão | Por quê |
|---|---|---|
| Cogumelo | **sem ferramenta** | é a porta de entrada; quem nasceu agora não tem ferramenta, e coleta que exige compra é invisível para quem mais precisa dela |
| Cargas por nó | 2 a 3 (⚠️ REFERÊNCIA) | mais de uma para não caçar nó a cada item; poucas para o nó não virar torneira parada |
| Rendimento | **um por coleta**, nunca vários | nó de 3 cargas dá 3 itens em 3 ações — coleta é ritmo, não caixa de presente |
| Piso garantido | comum com `chance: 1` | 🔴 **coleta vazia é o que ensina o jogador a não coletar** |
| Cristal | 1 carga · 12 min · maior XP | as três pontas concordam, senão vira armadilha ou vira farm. Teste trava |

### O que falta

**Nada disto está no mundo ainda.** Faltam os nós como entidade no servidor
(spawn, cargas, respawn), a mensagem de coleta e o desenho no cliente.

⚠️ **Os nós serão ENTIDADES, não tiles.** O mapa é gerado deterministicamente
pelos dois lados e não trafega pela rede — mudar um tile ao cortar uma árvore
dessincronizaria cliente e servidor.

## Três pedidos do dono: mochila, pegar do chão e modo de combate (2026-07-30)

**Arquivos:** `protocol.ts` · `server/src/index.ts` · `client/src/main.ts` ·
`client/index.html`

### 1. Rearranjar a mochila arrastando (`C2S_MoveItem`)

Troca as duas posições, ou **funde** quando são do mesmo empilhável — arrastar 3
poções sobre 5 e ficar com 8 num slot só é o motivo de existir arrastar.

⚠️ **Fundir exige que NENHUM dos dois tenha `roll`.** Duas espadas de raridades
diferentes têm o mesmo `kind` e não são a mesma coisa; fundi-las apagaria os
passivos de uma delas.

🔴 O slot é alvo de soltura **mesmo vazio** — é justamente para o vazio que se
arrasta ao arrumar a mochila. Vale também dentro do Depósito (`dp:`), e o
prefixo diferente é o que impede arrastar de um para o outro por engano: a
travessia continua sendo o clique, que valida proximidade do baú.

### 2. Pegar do chão arrastando para a mochila (`C2S_PickUp`)

🔴 **Arraste feito à mão, não HTML5.** O item no chão é um sprite dentro do canvas
do Pixi, e `draggable` só existe em elemento do DOM — não há `dragstart` de lá.
Então: `mousedown` no tile agarra, um ícone fantasma segue o cursor, `mouseup`
sobre a mochila solta.

⚠️ O fantasma precisa de `pointer-events: none`. Sem isso ele fica debaixo do
cursor e o `mouseup` acerta o próprio fantasma em vez da mochila.

**O recolhimento automático ao pisar em cima CONTINUA valendo** — isto se soma a
ele. O alcance (`PICKUP_RANGE = 1`, ⚠️ REFERÊNCIA) é validado no **servidor**:
id de item é fácil de forjar, e sem a checagem daria para limpar o mapa parado
na vila.

### 3. Perseguir / Parado, como no Tibia

**Parado é o padrão**, e não por gosto: é o que o jogo já fazia. Quem nunca tocar
no botão não pode ver o personagem começar a andar sozinho — mudança silenciosa
de comportamento é a pior espécie.

⚠️ **100 % cliente.** Reusa a rota por BFS e os PASSOS que o clique-para-andar já
manda. Um "persiga o alvo X" no protocolo deixaria o cliente ditar posição — a
mesma razão pela qual o "Seguir" do menu de contexto também não virou mensagem.

Duas decisões que o modo forçou:

- 🔴 **A distância de parada é o ALCANCE DA ARMA, não 1.** Um arqueiro que
  colasse no monstro para atirar perderia a razão de ser arqueiro. Para o
  "Seguir" social, 1 continua certo — ali a intenção é ficar do lado da pessoa.
- 🔴 **"Teclado manda" passou a valer sem soltar o alvo.** Largar o alvo de
  ataque a cada tecla apertada acabaria com o combate; em vez disso o passo
  automático não roda enquanto houver tecla pressionada, e volta sozinho ao
  soltar.

## Soltar item no chão — a caçada ao bug (2026-07-30)

**Arquivos:** `server/src/index.ts` · `client/src/main.ts` · `client/index.html`

O dono relatou que soltar item **nunca funcionou**. Foram **duas** causas, e a
primeira estava escondida havia sessões.

### 🔴 Causa 1 (servidor): o item caía e voltava no mesmo tique

O `drop` põe a pilha no tile do **próprio jogador**. O laço de recolhimento
automático de `updatePlayers` pega qualquer item no tile do jogador. Os dois
rodam no mesmo tique — o item caía e era recolhido instantaneamente. De fora,
parecia que o botão direito não fazia nada.

**Correção:** `GroundItem.droppedBy` guarda quem acabou de soltar, e o
recolhimento automático o ignora enquanto essa pessoa estiver em cima. A marca se
apaga quando o jogador **sai do tile** — não por tempo. Prazo fixo teria o mesmo
problema em câmera lenta: quem ficasse parado veria o item pular de volta.

⚠️ Só bloqueia o recolhimento AUTOMÁTICO. Arrastar de volta funciona na hora, e
outro jogador recolhe normalmente (a marca é por id).

**Provado com cliente headless**, não por leitura: um script conecta, registra
conta nova, solta um item e confere que o slot esvazia e **não volta**. Está em
`docs/` como método, não no repositório — mas vale repetir quando algo "não
funciona em tela e passa nos testes".

### 🔴 Causa 2 (cliente): `contextmenu` em elemento `draggable`

Mesmo com o servidor correto, nenhuma mensagem de `drop` chegava. O gesto era
botão direito numa célula com `draggable = true` — combinação instável: no
Windows o `contextmenu` dispara no **release**, e o navegador pode engolir o
evento quando o mesmo elemento pode iniciar um arraste.

**Correção:** o caminho principal passou a ser **arrastar da mochila para o
mundo**, que usa o mesmo HTML5 drag que equipar/desequipar já usava e funciona.
O botão direito continua como atalho.

É o inverso exato do arraste do chão para a mochila: tirar da bolsa jogando no
mundo é o mesmo movimento ao contrário, e gesto simétrico não precisa ser
ensinado duas vezes.

⚠️ **Não foi confirmado em tela** — a extensão de automação do Chrome não estava
conectada e o dono precisou desligar. A causa 1 está provada; a causa 2 é
diagnóstico por eliminação, e o conserto é um caminho novo que não depende do
mecanismo suspeito.

## O mundo de 300×300 — Lumindale substitui Valoria (2026-08-02)

**Arquivos:** `shared/src/worldgen.ts` (reescrito) · `shared/src/worlddata.ts` ·
`shared/src/placement.ts` · `shared/data/world/*.json` · `shared/src/tiles.ts` ·
`shared/src/towns.ts` · `shared/src/gathering.ts` · `server/src/index.ts` ·
`client/src/main.ts`
**Testes:** `shared/tests/map.test.ts` (6 → 14)

É o **passo 2** do plano de mundo, o que estava marcado como próximo. O terreno
passou a ser gerado de `regions.ts`, e Valoria deixou de existir.

### O que o gerador faz, em ordem

1. Tudo começa **mar**. Cada tile pergunta a `regions.ts` quem o pinta.
2. **Praia** onde a terra encosta no mar (menos neve e vulcânico).
3. **Decoração** — árvore, penhasco, lava — por bioma, com PRNG de semente fixa.
4. As **10 cidades** ainda não desenhadas ganham praça, muralha e quatro portões.
5. **Lumindale** é desenhada à mão, por cima de tudo.

### 🔴 Três decisões que não são gosto

**Fronteira entortada por ruído (`RUIDO_FRONTEIRA = 9`).** Sem isso o mundo fica
com cara de colcha de retalhos: as regiões são retângulos — e precisam ser, para
`regionAt` responder em tempo constante — mas retângulo pintado direto dá borda
reta e canto de 90°, e o mapa do dono não tem uma linha reta. A correção não
mexe na tabela: o ponto é deslocado por ruído suave **antes** da pergunta. O que
fica torto é só a costura, inclusive a linha da costa. ⚠️ `regionAt` continua
respondendo pelo retângulo puro, então numa faixa de ~9 tiles o chão pode ser de
uma região e o pertencimento de outra — sem consequência, porque região decide
bicho e nível, não a cor do chão.

**Vão entre regiões pertence à vizinha mais próxima (`REGION_REACH = 14`).** A
regra do dono é "tile que ninguém reivindica é água". Tomada ao pé da letra com
retângulos que não ladrilham o plano, ela abriria um **canal cortando o
continente**: entre os Campos de Valdor (y≤186) e as Terras Amaldiçoadas (y≥192)
sobram 5 tiles de fresta. A regra continua de pé — o mar é o que sobra — mas o
que sobra passa a ser o oceano externo, não toda costura.

**Decoração nunca encosta em decoração** (vizinhança de 8). É o que mantém
floresta densa atravessável: com dois sólidos nunca adjacentes, sempre sobra
rota em volta. Baixar isso fecharia corredores e quebraria o BFS do
clique-para-andar sem aviso. Há teste travando, fora do raio das cidades.

### Spawn, NPC e nó viraram ARQUIVO

`shared/data/world/{npcs,creatures,nodes}.json`, carregados e **validados no
boot** por `worlddata.ts` — dado inválido derruba o servidor com o arquivo e o
índice, em vez de virar NPC mudo na praça.

🔴 O motivo é o **Elysia Map Editor** (passo 6): se essas três coisas ficassem em
TypeScript, a próxima geração do mundo apagaria em silêncio o que o dono
posicionasse à mão. O **terreno** continua em código, e não é incoerência — ele é
gerado pelos dois lados e não trafega pela rede, que é o que sustenta "nó é
entidade, não tile".

### O povoamento é rebase, e a fauna ainda não conhece as regiões

As 32 criaturas e os 21 nós são o povoamento de Valoria deslocado em bloco
(+130,+138), preservando a curva que o dono testou jogando. 🔴 **Consequência
registrada:** a 32 tiles do berço ainda mora Tier III, e `regions.ts` declara
aquele chão como Campos de Valdor, Lv. 1–15. Terreno e fauna discordam **de
propósito** — distribuir por `species` é o passo 4, e juntar as duas coisas faria
um commit que ninguém revisa.

### Dois consertos que vieram junto

**Posição salva que não existe mais.** Um personagem salvo em Valoria (20,20)
reabriria **no meio do oceano**, num tile sólido de onde nenhum clique funciona —
pior de diagnosticar que ficar preso. `applyStoredCharacter` agora confere se o
tile é andável e, se não for, devolve o personagem à cidade de renascimento. O
conserto é geral: vale também para quando uma árvore nascer em cima de quem
deslogou ali.

**Piso sob tile alto.** Era grama fixa; virou o chão do bioma (`chaoBaseEm`).
Com o mundo antigo dava no mesmo — agora poria um quadrado verde debaixo de cada
árvore do Northland.

**Teto de nó de madeira (`WOOD_MAX_DIST = 60`).** "Uma árvore a cada seis" dava
25 nós em Valoria; em Elysia daria milhares de entidades vivas em região sem
nem criatura.

## Armadilha conhecida

⚠️ Não edite `combat.ts` com script de PowerShell. Uma tentativa de trocar os
sete valores de uma vez corrompeu os acentos do arquivo (`ágil` → `Ã¡gil`). Use
a ferramenta de edição.

> **Histórico:** até a Etapa 7 o estado vivia só em memória e cada reinício do
> `tsx watch` apagava os personagens. Isso acabou — hoje tudo vai para o SQLite
> em `data/elysia.db`. O que **não** persiste são as criaturas: `spawnInitialCreatures`
> roda a cada boot, então mexer nos spawns exige reiniciar o servidor.
