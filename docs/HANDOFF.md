# Handoff — estado do projeto em 2026-09-03 (noite)

## ⏸️ ONDE PARAMOS — o Druida e o Feiticeiro têm magia

> Typecheck limpo nos 3 pacotes, **579 testes** (eram 499). `npm run dev` →
> `localhost:5173`.
>
> ⚠️ **NADA disto foi jogado por uma pessoa** — e desta vez a lista é grande.
> Eu não entro com senha; validei por unidade, por typecheck e conferindo os 49
> ícones no navegador. Ver o bloco final.

### 🌿🔮 AS 41 MAGIAS ENTRARAM — e o motor que faltava embaixo delas

**Etapas 14 e 15 do roadmap, juntas.** 23 habilidades do Druida em 4 ramos, 18
do Feiticeiro em 4 escolas.

🔴 **A parte grande não foram as habilidades, foi o que faltava embaixo.**
`castSpell` sabia fazer uma coisa só: dano físico em criatura no alcance. Curar
aliado, buffar party, derrubar o ATK de um inimigo, plantar área que dura —
nada disso tinha caminho no código. Sete sistemas novos:

| Entrou | Onde |
|---|---|
| Dano mágico em habilidade | `executeSpell`, campo `magic` da ficha |
| Mirar em JOGADOR (aliado/party) | `lancaEmAliados` |
| Buff/debuff com modificador de ficha | `shared/src/effects.ts` **(novo)** |
| Tempo de conjuração, interrompível | `castSpell` + `tickCasting` |
| Área persistente no chão | `shared/src/areas.ts` **(novo)** |
| Cura ao longo do tempo | `ActiveHot` + `tickHots` |
| Barra de atalhos por classe | `SKILL_BARS` / `skillBarFor` |

✅ **`conditions.ts` estava pronto e parado** — Congelamento, Petrificação,
Silêncio, Raiz, Veneno, Queimadura e Knockback já existiam com DR, anti-cadeia e
imunidade. Foi ligar fio, não construir.

### ✅ O FEITICEIRO PAROU DE ATIRAR DE GRAÇA

A divergência anotada em 02/09 morreu. Ele estava com `attackType: 'magic'` e um
firebolt de 6 de mana no golpe COMUM, contra `DD-PROG-028`. Agora: **cajado bate
físico, corpo a corpo, alcance 1**, e magia exige habilidade e mana.

⚠️ **A segunda metade quase passou batido:** o próprio CAJADO
(`WEAPON_IDENTITY.staff`) tinha `range: 4` e `magic: true`, e `recompute` lê isso
para decidir o ataque básico — equipar um cajado devolveria o firebolt. Entrou
`basicPhysical`, que separa *"de onde sai o poder"* (magia) de *"como é o golpe
comum"* (bastonada).

⚠️ Com STR 3 o golpe dele é quase simbólico. É a intenção.

### 🔴 As decisões que não são minhas — onde procurar se discordar

- **`effects.ts` não é `conditions.ts`**, de propósito: juntá-los faria a Pele
  de Carvalho entrar na fila de diminishing returns do Congelamento, e o quarto
  buff seguido duraria metade.
- **A área sobrevive à morte do dono.** O Druida cai e a Ira da Natureza
  continua — a magia já saiu.
- **Não entrou um oitavo elemento.** O doc fala em "dano de natureza", mas
  `DD-ELM-002` fecha a lista em sete. "Natureza" virou o RAMO: estaca e lâmina
  ferem `physical`, esporo fere `poison`, e a passiva soma sobre o ramo.

### ⚠️ O QUE É `REFERÊNCIA` E NÃO CITAÇÃO

Quase todo número das 41 veio do doc **e tem teste conferindo** (`druid.test.ts`
29 · `sorcerer.test.ts` 27). O que **não** veio, e está marcado no código:

1. **As três últimas curas** — Cura em Área, Santuário e a 5ª de emergência. O
   cap. 71 avisa que os detalhes não foram recuperados. Entrou a estrutura, com
   números por proporção da Cura individual. **O nome "Sopro Vital" é invenção
   nossa** e é o primeiro a mudar quando o texto aparecer.
2. **Lv.7** como o "níveis altos" em que as Raízes passam a petrificar.
3. **O elemento de cada habilidade de Natureza** (ver acima).

---

## 🎯 A PRÓXIMA COISA

1. 🔴 **Jogar isto.** É o item 1 e não é formalidade — ver a lista abaixo.
2. ⏳ **`DD-DRU-032` merece uma passada**: "cura como arma" (energia vital fere
   morto-vivo, vampiro e demônio) está na Etapa 15 do roadmap e **não entrou** —
   exige uma etiqueta de família em `CreatureDef`, que hoje não existe. São 77
   espécies para classificar.
3. ⏳ **Archer (12 skills) e Assassin** — Etapa 13. A fundação agora está pronta;
   o trabalho é ficha e munição, não motor. ⚠️ As skills de Shuriken/Kunai e
   Espada Curta são `PROPOSTA` no Doc 1 e ficaram de fora de propósito.
4. ⏳ **O sprite universal** do palco da criação — o dono está fazendo.
5. ⏳ **Sprites base masculina e feminina** (CraftPix 419402 e 555940), em
   `~/Downloads`, fora do repo.
6. ⏳ **Token de sessão** — fecha o "trocar personagem volta pro login".
7. ⏳ **O sistema de GUARDA**, parado desde 02/09 esperando o servidor saber
   criatura-ataca-criatura.

## ⚠️ O QUE PRECISA DE UMA PASSADA HUMANA

Isto é grande e nada foi jogado. Em ordem de risco:

- **Criar um Druida e um Feiticeiro** e subir habilidade na janela nova — ela
  agora lista a árvore inteira agrupada por ramo, e rola.
- **Curar alguém.** É o caminho mais novo de todos (`lancaEmAliados`): sem alvo
  aliado escolhido, a Cura cai em você mesmo, de propósito.
- **Conjurar algo com cast** (Cura, 1 s · Meteoro, 1,8 s · Chuva, 3 s) e
  **andar no meio** — tem de cancelar, com aviso no chat.
- **Plantar uma Muralha de Gelo e tentar atravessar.** É a única magia do jogo
  que vira colisão, e vale para monstro e jogador.
- **Esporos Venenosos num monstro:** conferir que o veneno TIRA VIDA. Foi
  exatamente aqui que apareceu um bug silencioso (ver `HISTORICO.md`).
- **Um debuff num monstro** — Enfraquecer/Vulnerabilidade — e ver se o dano dele
  cai e o seu sobe. Os chips com o tempo restante aparecem acima da barra.
- **O golpe básico do Feiticeiro com cajado:** tem de ser corpo a corpo, sem
  gastar mana, e fraco.
- **A barra de atalhos ao trocar de personagem entre classes** — ela é remontada
  do zero, e o pegador de arrastar (`#spellgrip`) tinha de sobreviver a isso.

---

# Handoff — estado do projeto em 2026-09-03

## ⏸️ ONDE PARAMOS — as cinco classes existem

> Typecheck limpo nos 3 pacotes, **499 testes**. `npm run dev` → `localhost:5173`.
>
> ⚠️ **Nada do que entrou ontem à noite e hoje foi jogado por uma pessoa.** Eu
> não entro com senha, então validei por unidade e no navegador com a tela
> forçada. Ver a lista do que precisa de passada humana, no fim deste bloco.

### 🌿 O DRUIDA ENTROU — o bestiário de classes fechou

🔴 **Todos os números vieram do GDD, não de arbítrio.** E vale saber ONDE, porque
o lugar óbvio engana: a tabela de atributos-base (65.20) marca o Druid como
**`DD-BAL-029` PENDENTE**, o que faz parecer que os números não existem. Eles
existem, no **cap. 71** — a "Ficha V1 do Druid":

> HP **140** · MP **150** · STR 4 · VIT 7 · AGI 5 · DEX 5 · INT 9 · **WIS 11** · LUK 4

Ela soma exatamente os **45 pontos-base**, como as outras quatro. E o teste
confirma que é internamente consistente: `computeStats` com esses atributos
devolve **exatamente** 140 de vida e 150 de mana no nível 1. Número arbitrado não
fecharia assim.

**As três decisões que o documento ditou:**

| | |
|---|---|
| `attackType: 'melee'`, alcance 1, mana 0 | `DD-PROG-028`: *"ataque básico com cajado é FÍSICO (Sorcerer e Druid)"*. O cajado bate, não conjura |
| `skill: 'magic'` mesmo assim | o doc mapeia **cajado → Magic Level**. O que ele TREINA é magia; o que o bastão faz no golpe é dano físico |
| WIS 11 contra INT 9 | `DD-PROG-024/025`: **WIS é o principal, não INT**, e é WIS que escala cura |

Mais **2,0 SP/nível** (`DD-PROG-008/009`), entre as físicas (1,5–1,7) e o
Feiticeiro (2,5).

⚠️ **Ele não tem NENHUMA habilidade.** O doc descreve **23**, em quatro ramos
(cura 5 · buff 6 · debuff 6 · natureza 6). A classe é jogável pelo golpe básico, e
a árvore é provavelmente o maior trabalho que sobrou no projeto.

⚠️ **A arte é placeholder** — o mago VERDE do MiniWorld. O roxo já é do
Feiticeiro; verde separa os dois de relance.

🔴 **Uma divergência anterior que NÃO consertei junto**, para a mudança não virar
duas: o **Feiticeiro está com `attackType: 'magic'`** e um firebolt de 6 de mana,
o que contraria o mesmo `DD-PROG-028` que o Druida agora segue. As duas classes
de cajado estão em modelos diferentes. Está anotado no código.

---

## 🎯 A PRÓXIMA COISA

1. ⏳ **As 23 habilidades do Druida**, e as magias das outras classes. O dono
   pediu as magias junto com a tela de criação e ficou para depois.
2. ⏳ **O sprite universal** do palco da tela de criação — o dono está fazendo.
   O lugar já está reservado e dimensionado; é só preencher `#ccpalco`.
3. ⏳ **Sprites base masculina e feminina** (CraftPix 419402 e 555940). Os packs
   estão em `~/Downloads`, **fora do repo**.
4. ⏳ **Token de sessão** — fecha o "trocar personagem volta pro login". Ver o
   bloco de 02/09.
5. ⏳ **O sistema de GUARDA**, parado desde 02/09 de manhã esperando o servidor
   saber criatura-ataca-criatura.

## ⚠️ O QUE PRECISA DE UMA PASSADA HUMANA

Nada disto foi jogado de verdade — a lista é curta e vale meia hora:

- **Criar personagem** com o Druida e com outra classe, e conferir na ficha se os
  atributos distribuídos chegaram certos.
- **Distribuir os 76 pontos**: o custo é escalonado, então concentrar num só
  atributo rende bem menos (45 espalhado × 32 concentrado).
- **Excluir personagem**: senha errada recusa, a linha fica riscada com a
  contagem, o cancelar volta, e excluir o personagem em que se está logado é
  recusado.
- **As telas** em janelas de tamanhos diferentes — abaixo de 1100 px a criação
  vira uma coluna, e abaixo de 900 px a de entrada também.

---

# Handoff — estado do projeto em 2026-09-02 (noite)

## ⏸️ ONDE PARAMOS — três coisas novas na porta de entrada

> Typecheck limpo nos 3 pacotes, **497 testes**. `npm run dev` → `localhost:5173`.
>
> ⚠️ **Nada aqui foi testado por um jogador de verdade ainda.** Eu não entro com
> senha, então validei por unidade e no navegador com a tela forçada. Os três
> fluxos abaixo precisam de uma passada humana.

### 1. 🔴 A CLASSE NÃO DECIDE MAIS OS ATRIBUTOS

Todo atributo nasce em **1** e o jogador reparte **76 pontos** na criação. A
regra mora em `shared/src/stats.ts` e o **servidor revalida** com a mesma função
(`checkAttributes`) — quem monta o `createchar` é o cliente, e atributo é
permanente.

🔴 **O custo é o MESMO da subida de nível** (`ATTRIBUTE_COST_TABLE`: 2 pontos por
+1 até o valor 20, 3 dali até 40, e assim por diante), a pedido do dono. É o que
faz especializar doer.

⚠️ **76 não é número escolhido, é MEDIDO**: é exatamente o que custa sair de sete
atributos em 1 e montar a distribuição sugerida de qualquer uma das quatro
classes. Há teste travando isso — mexeu na tabela de custo ou na base de uma
classe, ele avisa.

⚠️ **O orçamento mudou junto com o custo, e tinha de mudar.** A primeira versão
era 38 com ponto plano; com o custo escalonado, 38 compraria só 19 aumentos e o
personagem nasceria com **26 de atributo em vez de 45** — bem mais fraco do que o
dono já tinha decidido preservar.

O efeito medido, com o mesmo orçamento: **espalhado rende 45** de atributo,
**concentrado num só rende 32** (STR chega a 33 e para).

🔴 **`ClassDef.base` não morreu** — virou a distribuição *sugerida*. Ela continua
sendo a âncora de `hpAt1`/`manaAt1` no `computeStats`, e é o que o teste confere.

⚠️ A tela mostra **prévia de vida e mana ao vivo**, e ela não é enfeite: o mesmo
Knight vai de **128 a 432 de vida** conforme a distribuição. Descobrir isso
jogando, com o nome já definitivo, seria cruel.

### 2. 🔴 EXCLUSÃO DE PERSONAGEM, COM 24 H PARA DESISTIR

| | |
|---|---|
| Banco | migração **v10**: coluna `delete_at`. Nulo = vivo |
| Senha | reconferida no servidor, com a sessão já autenticada |
| Prazo | `DELETE_GRACE_MS` no `shared` — a tela mostra a contagem |
| Quem apaga | `varreExcluidos`, comparando com o relógio |

🔴 **Nada é apagado na hora: o pedido só grava o instante.** É isso que faz o
prazo sobreviver a reinício do servidor — não depende de nenhum `setTimeout` ter
ficado vivo. O varredor **roda no boot**, e esse é o caso que mais importa:
servidor desligado a noite inteira acorda com prazos vencidos.

⚠️ O personagem **continua na lista** com o prazo correndo, riscado, e o botão
vira **Cancelar**. Some da lista e o jogador não teria de onde desistir.

Duas travas: personagem **em jogo não pode ser marcado** (o prazo venceria com
alguém dentro dele), e o `account_id` entra no `WHERE` — sem ele, qualquer conta
autenticada marcaria o personagem alheio mandando um id qualquer.

### 3. AS TELAS DE ENTRADA E DE CRIAÇÃO

Três colunas — lore, login, servidor — sobre um vídeo em loop. **Os ids não
mudaram** (`userin`, `passin`, `loginbtn`…), então a tela foi trocada sem tocar em
uma linha da lógica de autenticação.

⚠️ **UM servidor só**, por decisão do dono. E o **status é real**: sai do
websocket. Um "Online" fixo mentiria justamente quando o servidor caiu — o
jogador ficaria tentando entrar e culpando a própria senha.

🔴 **Três imposições do navegador tratadas no vídeo**, e a terceira liga no bug
que o irmão caçou hoje:

1. `autoplay` **não pega em elemento escondido** — a tela nasce `display: none`,
   então quem manda tocar é o `showScreen`.
2. **Vídeo com som nunca toca sozinho.** Começa mudo.
3. **`play()` pode rejeitar**, e sem `.catch` isso vira erro solto — que nesta
   tela é exatamente o que produzia a página preta e muda.

🔴 **A TELA DE CRIAÇÃO foi remontada** no desenho que o dono trouxe: classes à
esquerda com a marca em cima, o palco do personagem no meio, gênero e nome
embaixo, e os pontos numa coluna à direita.

⚠️ **O meio está VAZIO de propósito** — é o lugar do boneco, e o dono avisou que
ainda está fazendo o sprite universal. A altura está reservada para a tela não se
remontar no dia em que ele entrar.

⚠️ **O DRUIDA aparece APAGADO, com "EM BREVE".** Ele existe no GDD (são cinco
classes) e na arte de referência, mas **não existe no código** — está na etapa 15
do roadmap. Esconder faria a tela discordar do documento; deixar clicável criaria
personagem de uma classe que o servidor não conhece.

🔴 **Três regras de CSS antigas venciam as novas por cascata** e desmontavam a
tela — a grade de `#classes` em 2×260, a largura fixa de 532 px do painel de
atributos, e a lista de atributos em duas colunas. A terceira era a causa de uma
**barra de rolagem horizontal na página inteira**: numa coluna estreita, duas
colunas de atributo empurram o conteúdo para fora. Saíram.

### 4. 🔴 O AUTO-LOGIN DE DESENVOLVIMENTO ESTAVA MEIO LIGADO

O cliente tinha `VITE_DEV_ACCOUNT ?? 'maxmurtesvieira'` — o `??` com nome de
conta cravado **ligava o auto-login em qualquer `npm run dev`**, enquanto o
servidor só aceita entrada sem senha com `ELYSIA_DEV_ACCOUNT` preenchida, que
ninguém preenche. As duas metades discordavam, e a discordância produzia dois
defeitos que o dono relatou:

1. **"ao logar ele já vai direto pro último personagem"** — o bloco de
   auto-entrada disparava depois de QUALQUER login, inclusive o digitado à mão.
2. **"trocar personagem volta pra tela de login"** — a recarga mandava um `auth`
   com senha vazia, o servidor recusava, e sobrava a tela de senha com
   "Usuário ou senha inválidos" antes de o jogador tocar em nada.

Agora é **adesão explícita**: quem quiser o atalho põe `VITE_DEV_ACCOUNT` no
cliente E `ELYSIA_DEV_ACCOUNT` no servidor. Uma sem a outra não faz nada.

⚠️ **O sintoma 2 melhora mas não some**, e isso é falta de recurso, não bug: o
botão funciona RECARREGANDO a página, e a recarga não tem como retomar a sessão
porque o cliente não guarda senha, de propósito. As duas saídas de verdade são um
**token de sessão** (o servidor emite no login, o cliente guarda em
`sessionStorage`, a recarga reautentica com ele) ou **não recarregar** — que
esbarra em `startGame` não ter teardown. O token é o caminho barato.

🔴 **O som NÃO se liga sozinho**, decisão do dono depois de ouvir. A única forma
é o alto-falante no canto. ⚠️ Mesmo com a preferência gravada, o navegador não
deixa a música voltar sozinha na visita seguinte: a política de mídia exige um
gesto por carregamento. O que a preferência muda é só o rótulo do botão.

---

## 🎯 A PRÓXIMA COISA

1. ⏳ **Magias das outras classes.** O dono pediu junto com a tela de criação e
   ficou para depois. Hoje só o Feiticeiro tem `spellCost` > 0.
2. ⏳ **Sprites base masculina e feminina.** Os dois packs (CraftPix 419402 e
   555940) estão em `~/Downloads`, **não entraram no repo ainda**.
3. ⏳ **O sistema de GUARDA** continua parado no mesmo lugar — ver o bloco de
   02/09 (manhã). A arte está pronta, os seis guardas estão na ficha **sem
   spawn**, e falta o servidor saber criatura-ataca-criatura.

## ⚠️ Peso

A tela de entrada somou **11 MB** ao repositório (vídeo 8,4 + imagem 2,5). É a
primeira coisa que baixa quem abre o jogo. O `.webp` da imagem e um vídeo mais
curto cortariam isso muito, se um dia incomodar.

---

# Handoff — 2026-09-02, sessão da noite (o link para jogar de fora)

## ⏸️ ONDE PARAMOS — a TELA PRETA do jogador remoto, ainda em aberto

> Escrito para o irmão do dono. O dono publicou um link para jogar de casa, e o
> que a sessão inteira virou foi caçar por que a tela dele fica preta. **Não
> fechei o caso** — deixei o instrumento pronto e o próximo passo é de uma linha.
> Typecheck limpo nos 3 pacotes, **493 testes** (465 shared + 28 server).

### O que entrou

| | |
|---|---|
| 🆕 **`/lvl`** | sozinho sobe UM nível; com número é o `/level` de sempre |
| 🔴 **Auto-login consertado** | o link público entrava na conta do DONO |
| 🩺 **Falha fatal vira TEXTO** | tela preta muda agora mostra o erro escrito |

---

## 🔴 A PRÓXIMA COISA: ler o que o painel de erro disser

### O que já sabemos, medido

O jogador remoto **entra**: o servidor registrou `[auth] frank (conta 9)` e
`[join] Xddd — Arqueiro nv.1`. Login, WebSocket e join funcionam. O que não
acontece é o **desenho**.

Descartado com medição, para ninguém repetir:

| hipótese | como caiu |
|---|---|
| banda / assets pesados | `client/public` inteiro tem **12 MB** |
| o túnel | `GET /` dá 200 e `/ws` dá **101 Switching Protocols** |
| login | o `[join]` dele está no log do servidor |
| **é noite no jogo** | calculei a fase: era **dia, 11:48**. O overlay de noite chega a `nightDarkness` 0,92 e deixa a tela quase toda preta com um buraco de luz no herói — vale lembrar dele em relatos futuros de "está escuro", mas não era o caso |

### 🔴 A mecânica que PRODUZ o preto (isto é o achado)

Em `client/src/main.ts`, na entrada do jogo:

```ts
showScreen('none');
void startGame(...);   // promessa solta
```

`showScreen('none')` esconde **todas** as telas e só então `startGame` dispara,
com `void`. Se ela rejeitar, ninguém trata: as telas já sumiram, o mundo não
montou, e o que sobra é **página preta e muda** com o erro vivendo só no console
de quem está jogando.

⚠️ **Com um jogador remoto isso é um beco sem saída**: de cá não se vê o console
dele, e do lado de lá ninguém tem por que saber abrir o F12. É por isso que o
conserto foi instrumentar antes de adivinhar.

### O instrumento: `mostraFalhaFatal`

`void` virou `.catch`, mais dois laços de segurança (`error` e
`unhandledrejection`). Qualquer falha agora pinta um painel legível por cima da
página. Testado disparando um erro de propósito: o painel aparece.

⚠️ **O `instanceof ErrorEvent` no laço de `error` não é enfeite**: o evento
'error' da janela também dispara para RECURSO que não carregou (um PNG 404), e
esses chegam como `Event` puro. Sem a checagem, um sprite faltando cobriria o
jogo inteiro com um painel de erro fatal — trocaria um bug pequeno por um grande.

⚠️ **O painel reaproveita o mesmo elemento** a cada chamada, de propósito: erro
dentro do laço de render dispara a cada quadro, e criar um painel por quadro
travaria o navegador em cima de um problema que já é ruim.

**O próximo passo é só isto:** o jogador recarrega com Ctrl+Shift+R e lê a tela.
Se vier texto, a causa está nele. Se continuar preto de verdade, não é exceção —
é o canvas não desenhando, e aí a suspeita passa a ser WebGL da máquina dele.

---

## 🔴 O auto-login entrava na conta do DONO — consertado na configuração

Abrindo o link público, eu caí **logado como `maxmurtesvieira` sem digitar
nada**. No console:

```
[DEV] auto-login ligado para "maxmurtesvieira" — tela de login pulada
```

🔴 **A trava do cliente é `import.meta.env.DEV`, que é verdadeiro em QUALQUER
`npm run dev`** — não só no `dev:test`. A do servidor é outra e mais estreita
(`ELYSIA_DEV` **e** `ELYSIA_DEV_ACCOUNT`), então a entrada de fato era recusada.
O efeito visível não era invasão: era o visitante ser recebido por uma tela de
login **já com "Usuário ou senha inválidos" em vermelho**, antes de tocar em nada.

⚠️ **As duas metades do auto-login estão em travas DIFERENTES**, e é isso que
engana: desligar o servidor não desliga o cliente. Para subir com os comandos DEV
e sem nenhum atalho de senha:

```bash
ELYSIA_DEV_ACCOUNT= VITE_DEV_ACCOUNT= npm run dev:test
```

Os dois vazios importam: `dev.ts` usa `?? 'maxmurtesvieira'`, e string vazia
**não** é nullish — por isso ela desliga em vez de cair no padrão. Conferido pelo
túnel: a tela de login vem limpa, sem o aviso e sem o erro.

---

## 🌐 Como publicar o link (funcionou de primeira)

```bash
cloudflared tunnel --url http://localhost:5173
```

**Um túnel só resolve site + multiplayer**, e isso já estava preparado no
repositório — não foi preciso mexer em nada:

| onde | o que já fazia |
|---|---|
| `client/vite.config.ts` | `allowedHosts: true` e proxy de `/ws` → `ws://localhost:8080` |
| `client/src/net.ts` | monta a URL a partir do `location.host`; em https usa `wss` sozinho |

Por isso não há "mixed content" nem porta separada: o WebSocket sai pela mesma
origem do site. Conferido de fora: `200` no site e `101 Switching Protocols` no
`/ws`.

⚠️ **O endereço é sorteado e morre com o processo.** Fechou o terminal, o link
acabou; o próximo sai com outro nome.

### 🔴 Um link público com `dev:test` entrega o EDITOR DE MUNDO

Com `ELYSIA_DEV=1`, qualquer um que abrir a URL tem `/lvl`, `/gold`, `/tp` — e
também `/remove` e o construtor da tecla **E**. O `/remove` grava no banco e
apaga cenário **para todo mundo**, porque é autoria de mundo e não progresso de
personagem. Enquanto for família, tudo bem; a URL não é para espalhar.

---

## 🆕 `/lvl`

| | |
|---|---|
| `/lvl` | **sobe um nível** |
| `/lvl 30` | idêntico a `/level 30` |

Pedido do dono para o irmão ir subindo sem farmar. É apelido do `case 'level'`,
não comando novo: o laço que reconstrói a ficha é o mesmo.

⚠️ **Só sobe.** O `/level` nunca desceu de nível — o laço vai de baixo para cima
— e o atalho não mudou isso. `/lvl 3` estando no 10 não rebaixa; só zera o XP,
que é o comportamento que já existia.

🔴 **Não funciona no `npm run dev`.** `handleDevCommand` devolve `false` sem
`ELYSIA_DEV=1`, e o comando vira mensagem de chat comum. Foi o que aconteceu na
primeira tentativa desta sessão — subi o servidor errado e o comando ficou inerte.

---

## ⚠️ Achado solto, NÃO consertado: criar personagem sem estar logado

Abrindo o link em aba nova, o cliente mostra a tela **"NOVO PERSONAGEM"** sem ter
autenticado. Conferido nos dois lados: o servidor registra `[conn]` e **nenhum
`[auth]`**, e o `localStorage`/`sessionStorage` do navegador estão **vazios** —
não é sessão restaurada.

Visto duas vezes, em abas limpas. Pode ser o que fez o jogador remoto criar
`Xdd` e depois `Xddd`: a tela pede um personagem que a conta ainda não tem como
ter. **Fica para quem pegar** — pode inclusive ser a mesma raiz da tela preta.

---

# Handoff — estado do projeto em 2026-09-02

## ⏸️ ONDE PARAMOS — bestiário fechado, GUARDAS pendentes

> Escrito para o irmão do dono, que vai pegar daqui. Typecheck limpo nos 3
> pacotes, **493 testes**. `npm run dev` → `localhost:5173`.

### O que entrou hoje

| | |
|---|---|
| 🐉 **77 espécies com arte** | eram 51 ontem. Quatro levas de pack: slimes, lich, golens, caça, bandidos e guardas |
| ⚔️ **Bestiário reequilibrado** | o topo era plano e os lentos eram esponja sem ameaça |
| 💪 **Atributos dobrados** | vida, força e defesa × 2 em 63 monstros, a pedido do dono |
| 🛡️ **Guardas e bandidos** | os primeiros inimigos HUMANOS do jogo |

---

## 🔴 A PRÓXIMA COISA: o sistema de GUARDA

**O dono pediu, a arte está pronta, e o servidor não sabe fazer.** Isto é o item
1 da fila e é a maior mudança de servidor em muito tempo.

### O que ele pediu, nas palavras dele

> *"os guardas de cidade e vilarejo são para proteger os player comuns e não PK.
> além dos NPCs que criaremos, eles devem patrulhar a região das cidades e
> vilarejos. os mais fortes ficarão na cidade, os outros são do vilarejo, eles
> devem aguentar matar monstros e pk's. podem morrer para ambos e dar XP para
> eles."*

### 🔴 Por que não dá para configurar: criatura não ataca criatura

`creature.targetId` guarda **id de JOGADOR**, sempre. Todo o combate de criatura
no `server/src/index.ts` é criatura → player; não existe monstro brigando com
monstro em lugar nenhum do código. Guarda que caça monstro é **sistema novo**.

⚠️ **Os seis guardas estão definidos em `CREATURES` mas SEM SPAWN, de propósito.**
Estão marcados `territorial` como medida de segurança, não porque seja o certo.
Um guarda solto hoje atacaria justamente o jogador que deveria proteger.

### O que falta construir, em ordem

1. **`targetId` de criatura pode apontar para criatura.** É a base de todo o
   resto, e o que dá mais trabalho: mexe em mira, dano, morte e limpeza de alvo
   (hoje há vários `if (c.targetId === player.id) c.targetId = null`).
2. **Facção.** Guarda ataca monstro e jogador **com caveira**; ignora jogador
   limpo. ✅ **Esta metade já existe**: o sistema de caveira está em
   `shared/src/pvp.ts` (`SkullKind`), e o `skull` já trafega no protocolo.
3. **Patrulha.** Andar por uma região em vez de esperar aggro parado.
4. **Morte e XP.** Guarda morto dá XP a quem matou; monstro morto por guarda não
   dá XP a ninguém. É o item que mais muda o "sentimento" do sistema.
5. **Respawn de guarda** — sem ele, a cidade fica indefesa para sempre depois do
   primeiro PK organizado.

Os números dos guardas já estão dimensionados para o papel: o **Capitão da
Cidade** (2000 de vida, força 84) aguenta os monstros de topo; o **Guarda do
Vilarejo** (700) não aguenta. A patente decide onde ele sobrevive.

---

## 🔴 As regras que este dia aprendeu

**1. A linha do pé não é o pixel mais baixo.** O dono viu goblins, ratos e
demônios *flutuando*. Nesta projeção, "mais baixo no desenho" quer dizer "mais ao
sul no chão": o rabo do rato e os punhais do goblin encostam no chão ATRÁS do
bicho. Ancorando no pixel mais baixo, quem ia para o tile do jogador era a ponta
do rabo — e o corpo subia 18 px nos demônios. O `monstros2strip.mjs` agora separa
por **massa** (10 % do pico de pixels por linha), não por altura.

⚠️ `animals2strip.mjs` e `golem2strip.mjs` seguem medindo pelo pixel mais baixo.
A conta diz que ganhariam 1–2 px — não mexi em arte já aprovada em tela.

**2. O nome do arquivo muda em cada pack, e casar "por continha" erra calado.**
Já apareceram: `Rat2_Walk_`, `Walk0_` (sem prefixo), `Imp2_Hurt__` (underscore a
mais), `Gnoll_Death_` (sem o número), `Boar_Walk` (sem sufixo), `Fox_walk`
(minúscula) e `lvl7_attack_normal_` (apelido). O casamento é por **nome inteiro**,
insensível a caixa, com prefixo de lista fechada — senão `Run_Attack0` entra no
lugar de `Attack0` e o bicho ataca correndo parado.

**3. As linhas 2 e 3 vêm TROCADAS em todo pack CraftPix.** Conferido olhando a
arte em cada um dos 17 packs. Nada no typecheck ou nos testes pega isso.

**4. Escala quebrada serrilha.** Vários bichos passaram por 1,5× e voltaram para
valores inteiros quando o dono viu de perto. Hoje ainda há exceções — todas
decididas em tela e anotadas no conversor.

---

## ⚠️ O que contraria documento ou decisão anterior

1. **O teto de dano do bestiário foi ultrapassado de propósito.** A criatura mais
   forte foi de 39 para 88; o set completo de Lv.100 soma 46 de defesa. O teste
   `a defesa de um set completo não pode zerar o dano do bestiário` era um
   termômetro e teve a **asserção invertida** — o porquê inteiro está em
   `shared/tests/catalog.test.ts`. Resumo: com dano 39 contra armadura 46, o
   Lv.100 levava o mínimo de todo golpe do jogo, do cogumelo ao chefe. A armadura
   não protegia, trivializava. **Não subi o `DEF_COEF`** porque isso desfaria o
   pedido do dono.

2. **Cinco criaturas NÃO dobraram, porque o GDD fixa os números delas**: os três
   Slimes (`DD-BAL-027`, `033/034/035`), o Super Slime (`DD-BAL-036`) e o Zumbi
   (`DD-BAL-055`). Há teste citando cada um. ⚠️ **Isso deixa a família Slime fora
   da curva**: o doc a chama de "âncora canônica do bestiário" e o resto dobrou em
   volta dela. Se o dono quiser a âncora acompanhando, **muda o DOCUMENTO**, não o
   código — e os testes `DD-BAL` mudam junto.

3. **XP e ouro não dobraram.** Recompensa não é atributo, e dobrá-la quebrava a
   curva de tiers do `DD-BAL-040`.

4. **A hierarquia de tamanho não segue mais a de força.** O dono pediu o Senhor
   Demônio com o dobro do Golem, depois o Golem igual a ele (152 px), depois os
   chefes de gnoll/lagarto/cogumelo/observador maiores ainda. Campeão Lagarto
   (164) e Observador do Vazio (171) são hoje os maiores desenhos do jogo.

5. **O Senhor Demônio deixou de ser o mais forte** (78) — o Observador do Vazio
   tem 88. Foi consequência de "os chefes destes monstros mais fortes".

---

## 🗺️ Onde tudo nasce

Um spawn por espécie (o dono cortou lista por *"tem muuuito monstro"* em 05/08).
Dificuldade sobe com a distância da vila (150,158):

| Distância | Zona | Quem |
|---|---|---|
| 16–20 | (134,166) · (144,138) · (158,138) | **Bandidos** · Slimes · **Caça** |
| 18–22 | (138,176) · (132,152) · (168,178) · (128,140) | Cogumelos · Fantasmas · Diabretes · Ents |
| 24–26 | (176,142) · (166,132) | Ratos · Acampamento goblin |
| 30–34 | (120,168) · (142,190) · (152,188) · (116,186) | Observadores · Gnolls · Lagartos · **Golens** |
| 36–46 | (186,176) · (189,157) · (192,167) · (196,190) | Vampiros · Esqueletos · Zumbis · **Demônios** |
| 50 | (199,149) | **Lich** — o ponto mais distante povoado |

---

## 🎨 Arte de monstro

```bash
npm run monstros:build
```

Lê `assets/monstros-craftpix/` e escreve
`client/public/assets/monsters/<tipo>/{walk,idle,attack,hurt,death}.png`, e
imprime o bloco pronto do `CREATURE_SHEETS`.

🔴 **Não edite âncora e `labelTop` à mão** — rode o conversor e cole a saída.

### Faltam 16 espécies sem arte

Lobos (2) · Aranhas (4) · Formigas (3) · Orcs (2) · Minotauro · Troll · Urso
Pardo · Kobold Caçador.

🔴 E os dois **arqueiros** (Goblin e Esqueleto): **nenhum pack que entrou tem
arco**. Precisa de pack com arqueiro — forçar um corpo-a-corpo neles daria um
arqueiro sem arma, que é pior que a bolha colorida.

---

## 🔴 LICENÇA — cresceu de novo

Entraram mais **17 packs CraftPix** hoje, num repositório **público**. O
levantamento pack a pack de 24/08 segue parado na branch `cenario-iso-2d` como
`docs/LICENCAS-DE-ARTE.md`. **Vale trazer** — o problema só aumenta.

---

# Handoff — estado do projeto em 2026-09-01

## ⏸️ ONDE PARAMOS — o dia dos MONSTROS e do HUD

> Escrito para quem **não acompanhou** a sessão — inclusive o irmão do dono, que
> trabalhou na `main` em paralelo. Typecheck limpo nos 3 pacotes, **493 testes**.

### O que entrou

| | |
|---|---|
| 🐉 **60 espécies com arte** | eram 27 de manhã. Treze packs CraftPix, 39 criaturas convertidas |
| 🦅 **HUD com emblema alado** | retrato, nome e as três barras flutuando no alto do mundo |
| 🧟 **O Zumbi trocou de arte** | e com ela saiu a última licença *share-alike* do repositório |

### 🎯 A PRÓXIMA COISA

1. ⏳ **Faltam 17 espécies sem arte.** `goblin_archer`, `skeleton_archer`, os dois
   lobos, quatro aranhas, três formigas, dois orcs, minotauro, troll, urso,
   kobold e super slime.

   🔴 **Os dois arqueiros são caso à parte**: os packs de goblin e de esqueleto
   que entraram hoje são TODOS corpo a corpo. Arqueiro sem arco é pior que a
   bolha colorida — precisa de pack com arco, não de remendo.

2. ⏳ **Licença.** Ver abaixo; é decisão do dono, não trabalho de código.
3. ⏳ **Balancear os bichos novos.** Os números saíram da progressão que já
   estava na tabela, não de documento. Ninguém jogou contra eles ainda.

### 🔴 As quatro regras que este dia aprendeu

Cada uma custou pelo menos uma volta, e nenhuma dá erro — dá arte errada em
silêncio.

**1. A linha do pé NÃO é o pixel mais baixo.** Foi o defeito que o dono viu:
*"goblins parecem estar flutuando, ratos também, os demônios também"*. Nesta
projeção "mais baixo no desenho" quer dizer "mais ao sul no chão" — o rabo do
rato, os punhais do goblin e o tridente do demônio encostam no chão ATRÁS do
bicho. Ancorando no pixel mais baixo, quem ia para o tile era a ponta do rabo, e
o corpo subia: 18 px nos demônios, 15 nos ratos, 10,5 nos goblins. O conserto
separa por MASSA (10 % do pico de pixels por linha), não por altura.

**2. As linhas 2 e 3 dos packs CraftPix vêm TROCADAS.** Linha 2 é o bicho com a
cabeça à esquerda, linha 3 à direita; o jogo espera `down, up, right, left`.
Conferido olhando a arte em **todos** os treze packs, não deduzido do nome.

**3. O nome do arquivo muda de pack para pack.** Três variações já apareceram:
`Rat2_Walk_`, `Walk0_` (sem prefixo) e `Imp2_Hurt__` (underscore a mais). E o
pack de goblin traz `Run_Attack0_` e `Walk_attack_` — golpear andando, que o jogo
não tem. Casar "por continha" pegava `Run_Attack0` no lugar do `Attack0`. A
âncora é o NOME INTEIRO, com prefixo de lista fechada.

**4. Escala de pixel art quebrada serrilha, e não tem conserto.** O HUD passou
por 1,5 → 1,35 → 1,25 → 1,15 até o dono ver de perto e pedir para consertar o
serrilhado. Não havia como: os únicos valores limpos são 1, 2 e 3. Voltou para
1×. ⚠️ **As criaturas, porém, USAM escala quebrada** (1,5× em lagartos,
cogumelos, gnolls, fantasmas, diabretes e goblins; 1,75/2/3,25 nos demônios) —
todas por decisão do dono vendo em tela, todas registradas no conversor.

### ⚠️ Duas coisas que contrariam o que estava escrito

1. **Os demônios PASSAM o Golem.** A regra era "nada passa os 76 px do chefe". O
   dono pediu Demônio no tamanho do Golem, Carmesim um pouco maior e **Senhor
   Demônio o dobro** — 152,8 px, quase cinco tiles, o maior desenho do jogo. A
   silhueta e a ficha (680 de vida contra 900 do Golem) discordam de propósito.
2. **A caixa de clique não cresce com o desenho** (é do tamanho do tile, em
   `makeSpriteActor`). O Senhor Demônio se acerta pelo PÉ, não pelo corpo.

### 🗺️ Onde os bichos novos nascem

Um spawn de cada — o dono já cortou lista por *"tem muuuito monstro"* em 05/08.
A dificuldade sobe com a distância da vila (150,158):

| Distância | Zona | Quem |
|---|---|---|
| 18 | (138,176) · (132,152) | Cogumelos · Fantasmas |
| 20–22 | (168,178) · (128,140) | Diabretes · Ents |
| 24–26 | (176,142) · (166,132) | Ratos · **Acampamento goblin** |
| 30–32 | (120,168) · (142,190) · (152,188) | Observadores · Gnolls · Lagartos |
| 36–42 | (186,176) · (189,157) · (192,167) | Vampiros · Esqueletos · Zumbis |
| 46 | (196,190) | **Demônios** — o Senhor Demônio está aqui |

Toda posição foi conferida com `isWalkable` no mapa gerado: tile de água ou
dentro da praça segura deixaria a criatura travada.

### 🎨 Gerar/ajustar arte de monstro

```bash
npm run monstros:build
```

`tools/monstros2strip.mjs` lê `assets/monstros-craftpix/` e escreve
`client/public/assets/monsters/<tipo>/{walk,idle,attack,hurt,death}.png`, além de
imprimir o bloco pronto do `CREATURE_SHEETS`.

🔴 **Não edite âncora e `labelTop` à mão** — rode o conversor e cole a saída. Os
números saem de medição; foi assim que o "flutuando" foi consertado.

⚠️ `animals2strip.mjs` e `golem2strip.mjs` (do irmão) continuam medindo pelo
pixel mais baixo. A conta diz que golem, ganso e coelho ganhariam 1–2 px — não
mexi em arte que já foi aprovada em tela.

### 🔴 LICENÇA — decisão do dono, e ficou MAIOR hoje

Entraram **catorze packs CraftPix** num dia (13 de monstro, 1 de HUD), todos com
um `License.txt` de uma linha apontando para <https://craftpix.net/file-licenses/>.
O repositório **é público** e versiona toda essa arte.

✅ O único ganho do dia: a folha **LPC do Zumbi saiu do jogo** — era a única arte
com licença *share-alike*, que contamina o derivado. Os PNGs continuam no disco
sem uso; apagá-los fecha a questão.

⚠️ Existe um levantamento pack a pack, com veredito de cada licença, feito em
24/08 e **parado na branch `cenario-iso-2d`** como `docs/LICENCAS-DE-ARTE.md`.
Ele não veio para a `main` porque o dono optou por seguir só com o trabalho do
irmão. **Vale trazer** — o problema que ele descreve cresceu hoje.

### 📌 O que ficou parado na `cenario-iso-2d`

A branch tem **20 commits** que a `main` não tem: a casa com interior, os móveis,
o conserto de medida de 24/08, o levantamento de licenças e
`tools/resetar-senha.mjs`. O dono decidiu em 31/08 seguir só com a `main`.

🔴 **Um merge de teste mostrou que juntar é BARATO**: dois arquivos em conflito
(`client/src/main.ts` e `docs/HANDOFF.md`) e **um único bloco** de conflito, que
é só comentário — os dois lados chegaram no mesmo `const ZOOM = 1.0` por
caminhos diferentes. Se um dia a casa voltar a interessar, o custo é esse.

---

# Handoff — estado do projeto em 2026-08-31

## 📌 LEIA ISTO PRIMEIRO (resumo da virada de 30–31/08)

> Este bloco existe para quem chega **frio** ao projeto — pessoa ou IA. Os
> blocos abaixo dele são o diário detalhado, em ordem de assunto; volte a eles
> quando precisar do *porquê* de alguma decisão.

**Estado:** typecheck limpo nos 3 pacotes · **493 testes** (465 shared + 28
server) · `npm run dev` → `localhost:5173`.

### O que entrou nesta virada

| | |
|---|---|
| 🚜 **A fazenda** | o **primeiro mapa autoral** de Elysia no mundo. 45×32 tiles colados na praça segura, em (163,141). Lago com peixe, moinho girando, portas que abrem, 2 interiores no andar 1, e porco/vaca/galinha como criatura de verdade. |
| 🧰 **Ferramentas de autoria** | `/remove`, `/clone`, `/paste`, `/undo` — editar o cenário **enquanto se joga**. |
| 🧱 **Construtor de mapas** | tecla **E**: paleta de 871 sprites, giro de 90°, três alturas de desenho e três modos de colisão. |

### Como a fazenda funciona (o desenho central)

O `Farm.tmx` do pack é convertido por `npm run farm:build` em **duas saídas
separadas**, e essa separação é o que faz tudo o resto funcionar:

| Para o motor | Para os olhos |
|---|---|
| `shared/data/world/farm.json` | `client/public/assets/farm/*` |
| colisão, portas, spawn de bicho | 2 PNGs assados + folha de animação + paleta |
| **lido pelos DOIS lados** | **só o cliente** |

🔴 É isso que preserva a invariante do `worldgen.ts`: *terreno não trafega pela
rede; os dois lados calculam o mesmo mundo.* O servidor carimba `WALL_WOOD` e
`WATER` e **nem sabe que existe um moinho desenhado ali**.

### As ferramentas, em uma tabela

Todas atrás de `DEV_MODE` — só com `npm run dev:test`.

| | |
|---|---|
| `/remove` | apaga o tile de frente (item → nó de coleta → tile, nessa ordem) |
| `/clone` · `/paste` | Ctrl+C / Ctrl+V de tile **e** da arte assada da fazenda |
| `/clone solido` · `/paste livre` | força a colisão da cópia (`solido`/`livre`/`passa`/`abre`) |
| **E** | abre o construtor: escolhe sprite, **R** gira, camada, colisão, e `/ok` põe |
| clique com o painel aberto | **conta-gotas**: acha a peça daquele tile na paleta |
| `/undo` | desfaz a última coisa — decalque ou edição de tile, o que veio por último |
| `aqui` | sufixo em qualquer posição: age no tile **sob** o boneco |

**Onde isso mora:** `shared/src/worldedit.ts` (o modelo e o *porquê* de não
violar a invariante) · `server/src/store/schema.ts` (migrações **v6 a v9**) ·
`client/src/editor.ts` (o painel) · `client/src/farmart.ts` (a arte da fazenda).

### 🔴 As cinco lições desta virada (as que custaram caro)

1. **`acima` não é sobre vegetação, é sobre ALTURA.** A camada que fica sobre o
   jogador acumulou telhado, varanda, copa e hélice; ler a regra como "folhagem"
   produziu três bugs seguidos no moinho.
2. **Mato pintado na mesma célula de um prédio fica ATRÁS do prédio.** É a única
   decisão de profundidade que não é sobre o jogador — é entre duas artes.
3. **Conferir animação por amostra de quadro é conferir por sorte.** O bug das
   pás quase não existia no quadro 0 e era enorme no 3; eu renderizei justamente
   os quadros em que ele não aparecia. Meça em TODOS os quadros.
4. **Quando todas as medições dizem "está certo", o errado é a leitura do
   relato.** Perdi duas rodadas procurando nas pás o que estava no telhado.
   Ampliar a captura antes de teorizar teria resolvido.
5. **"Editada" e "apagada" não são a mesma pergunta.** Célula que recebeu arte
   colada continua sendo desenhada; célula do `/remove` some. Confundir as duas
   apaga em silêncio o que se acabou de colar.

### ⚠️ O que está pendente, e é conhecido

- 🔴 **As pás do moinho são SÓLIDAS** célula a célula, no formato do X do quadro
  0 — há parede invisível no ar em volta dele. É pré-existente. Agora dá para
  abrir com o construtor (`🚪 abre passagem`) sem tocar no conversor.
- ⚠️ **Moinho e galinheiro têm porta que abre e não leva a lugar nenhum** — o
  `farm:build` avisa. Faltam os dois interiores.
- ⚠️ **Galinha (36 px) está maior que o Ganso (26 px)**, e ganso é maior que
  galinha. Packs de autores diferentes; o ganso foi encolhido à mão em 30/08.
  **Decisão de arte, quer ser vista em tela.**
- ⚠️ **O Golem tem 76 px em pé**, não os 142 que o handoff de 29/08 registrou —
  aquele número era medida inflada pelo quadro de ataque.
- ⚠️ O construtor **não substitui o Tiled**: o `Farm.tmx` segue sendo a fonte da
  fazenda, e o que se põe pelo painel é uma camada de remendos por cima.

### 🎯 A PRÓXIMA COISA

1. **Consertar as arestas da fazenda com o construtor** — é para isso que ele
   existe, e é o trabalho que estava em curso quando esta sessão terminou.
2. Depois disso, **as 7 skills do Guerreiro**, que continua sendo o trabalho
   escolhido pelo dono em 13/08. Ver o bloco daquele dia, mais abaixo.

---

## Diário da virada — os blocos por assunto

## ⏸️ ONDE PARAMOS — 31/08, a varanda que engolia o herói

Typecheck limpo nos 3 pacotes, **483 testes** (459 shared + 24 server).
`npm run dev` → `localhost:5173`. ⚠️ **Nada disto foi visto em tela ainda** — a
conferência é a próxima coisa a fazer.

### 🚜 A FAZENDA (feita em 30/08, e NÃO estava registrada aqui)

O primeiro mapa autoral de Elysia entrou no mundo, cumprindo a regra de 03/08
(*cidade é mapa do Tiled, não retângulo procedural*). 45×32 tiles colados na
praça segura, em (163,141). Tudo ainda **sem commit**.

| Onde | O quê |
|---|---|
| `tools/farm/` | o conversor `Farm.tmx` → jogo. `npm run farm:build` |
| `shared/src/farm.ts` + `shared/data/world/farm.json` | a COLISÃO, lida pelos dois lados |
| `client/public/assets/farm/` | a ARTE: dois PNGs assados + folha de animação |
| `client/src/farmart.ts` | quem desenha, anima e abre porta |

🔴 **A divisão é o miolo do desenho:** o servidor carimba `WALL_WOOD`/`WATER` e
não sabe que existe um moinho desenhado ali. Assim a invariante do `worldgen.ts`
(*terreno não trafega pela rede*) fica de pé. Tem lago com peixe, moinho com pás
girando, porta que abre, dois interiores (casa e celeiro) no andar 1, e porco,
vaca e galinha como criatura de verdade — o pack os tinha pintado como enfeite
parado.

### 🔴 Os dois consertos de hoje, e os dois vinham da sessão de 30/08 parada no meio

**1. O herói sumia na porta da casa** — é a captura `erros/00-erro-fazenda.png`,
com a seta vermelha do dono. Só as botas e a ponta da espada apareciam por baixo
do deck da varanda.

A camada `porch_roof` do pack guarda **duas coisas que querem lados opostos do
jogador**: o telhado (y 3–7, tem que ficar SOBRE ele) e a varanda com escada
(y 9–10, é chão que se PISA). A camada inteira estava marcada `acima`, e essas
6 células andáveis são justamente o único caminho até a porta.

Conserto: a profundidade passou a ser decidida **por tile e não por camada** —
`desenhaAcima` + `VARANDA_HOUSES` em `tools/farm/layers.mjs`, o mesmo remédio
que `CERCA_GGB` já dava para a camada `beds`.

⚠️ **O que se perde:** parado na varanda, o herói passa NA FRENTE do corrimão em
vez de atrás. É o lado certo de errar.

**2. A troca da grama estava escrita e nunca tinha sido assada.** O
`tools/farm/build.mjs` estava **quebrado** desde 30/08 às 18h51 —
`SyntaxError: Identifier 'GRAMA_DO_JOGO' has already been declared`. A sessão
anterior trocou a repintura de grama de POR CÉLULA para POR PIXEL (que é o
conserto de *"a borda está bugada, com os canteiros de graminha todos errados"*)
e não chegou a apagar o bloco antigo. Os PNGs no disco eram os de antes.

Terminei a refatoração: o bloco velho saiu, e o que sobrou dele virou
`ehGramadoLimpo` — que agora pergunta *"esta célula É a grama do jogo?"* sobre o
resultado, em vez de *"é uma cor verde só?"* sobre a arte do pack. É o que marca
`g` no mapa e pinta o gramado no minimapa.

### 🆕 O relatório do `farm:build` ganhou a linha que denuncia esse bug

```
camadas "acima" sobre células andáveis (o jogador passa ATRÁS delas): Trees (pomar)(120) Trees2 (pomar)(100)
```

⚠️ **Número alto não é erro** — as duas do pomar escondem ~220 células de
propósito. A linha não julga: ela obriga a olhar e perguntar, por linha, *"é
folhagem ou é chão?"*. Chão em `acima` é o bug. Com a varanda quebrada ela
mostrava `porch_roof(6)`; conferido que aparece e que some.

🔴 **Um detector automático foi TENTADO e descartado**, e vale saber por quê: nem
"célula sem arte no `baixo`" nem "`acima` 100% opaco" separam varanda de copa de
árvore — as duas têm a mesma forma. A diferença é semântica, e semântica é o que
a tabela escrita à mão do `layers.mjs` existe para guardar.

### 🔴 Segunda rodada de 31/08 — três bugs vistos em tela pelo dono

Captura: `erros/01-erro-fazenda.png`, com quatro setas amarelas. Os três têm
causa diferente e nenhuma delas era onde parecia.

**1. *"O personagem está passando embaixo do pé das árvores."*** As duas camadas
do pomar eram `acima` inteiras, então o herói parado rente ao tronco sumia atrás
das raízes.

⚠️ **A regra óbvia — "a fileira de baixo da mancha", a mesma que a colisão usa
para o tronco — NÃO serve aqui**, e foi a primeira tentativa. No pomar as copas
se tocam de propósito (é o que impede as hortas de ficarem ilhadas), então as
árvores formam colunas contínuas: só **26 de 222** células são fim de mancha.

A regra que ficou é pela ARTE, e é descoberta, não digitada: tile do pomar cujos
pixels opacos são majoritariamente MARROM é raiz. A separação é limpa — os 8
tiles de raiz dão de **87% a 100%** de marrom e o primeiro tile de copa depois
deles dá **23%**. Ver `PES_DO_POMAR` no `build.mjs`. A copa continua `acima`:
andar ATRÁS da folhagem é o efeito pedido; atrás do PÉ é que era o bug.

**2. *"O catavento está girando todo quebrado, faltando partes."*** Não faltava
parte nenhuma. O cliente começa cada célula animada num **quadro sorteado** — é o
que faz o lago cintilar em vez de piscar todo junto, e é certo para água e peixe.
As pás do moinho são **77 células de UMA hélice só**: sorteadas, cada uma mostrava
um instante diferente do giro.

Agora o conversor marca a faixa como `sincrona` (`ANIMACAO_EM_BLOCO`) e o
cliente começa essas no quadro 0. Como todas avançam no mesmo laço, com o mesmo
`agora` e as mesmas durações, ficam travadas juntas sem relógio global.

**3. *"As bordas estão todas erradas — algumas grids que deveriam seguir viradas
para a esquerda estão viradas pra direita, e aí quebra o caminho da borda."***
Estava exatamente isso, e a causa é de uma linha: 🔴 **o `tmx.mjs` APAGAVA os
flip flags do gid** (`& ~FLIP`). São **37 células espelhadas** no `Farm.tmx`, e
25 delas são a cerca-viva (`Hill`) e a grama da borda — o autor desenhou meia
curva e espelhou a outra metade, que é como se trabalha no Tiled.

Agora `resolveGid` devolve `flipH/flipV/flipD` e o compositor desespelha na
ordem do Tiled (V, H, e a **diagonal por último** — trocar a ordem só estraga
tiles rotacionados, que são D+H, e passaria despercebido). Para as 9 células
animadas espelhadas, o espelho entra na CHAVE da faixa e a tira é assada já
virada: o cliente não precisa saber que espelho existe.

---

### 🔴 O moinho, terceira vez: era o TELHADO, não as pás

Relato: *"a parte de cima do catavento ainda está por baixo"* —
`erros/03-erro-fazenda.png`.

⚠️ **Eu procurei no lugar errado por duas rodadas**, e vale registrar como: li
"catavento" como *as pás* e fui atrás delas. Ampliando a captura a 14×, a ponta
da pá aparece **inteira, com contorno escuro** — ela nunca esteve cortada nesta
rodada. O que estava decapitado era o **telhado do moinho**.

Quem cobria: `Trees_outside2` — a cerca-viva da borda NORTE — que é `acima` e
tem **27 células em cima do moinho**, a fileira y=3 inteira.

**A regra nova:** *mato pintado na MESMA célula de um prédio fica ATRÁS do
prédio.* As camadas de construção ganharam `construcao: true`, as de vegetação
`vegetacao: true`, e o `build.mjs` faz uma pré-passada marcando as células com
prédio.

🔴 **É a primeira decisão de `acima` que NÃO é sobre o jogador, e é isso que a
torna segura.** Todas as outras perguntam *"o herói passa na frente ou atrás?"*.
Esta é entre duas ARTES: o autor pintou a fileira de mato e plantou o moinho em
cima — o mato está atrás do prédio no mundo, e desenhá-lo por cima é errado com
jogador ou sem. Não há caso em que a troca piore algo, e célula de prédio é
sempre sólida, então nenhuma oclusão de personagem muda.

#### ⚠️ Três becos sem saída, para ninguém repetir

1. **"A arte do pack está cortada."** Falso. O `Sails_animation.png` é 160×864 =
   6 blocos de 10×9 tiles, e o conteúdo de cada bloco cabe com folga (medido:
   `y 4..141` no pior). Renderizei a hélice recortada no bloco e ela *parecia*
   serrada — era o meu crop, não a arte.
2. **"É cache do navegador."** Falso. `curl` no Vite mostrou `Cache-Control:
   no-cache` e o JSON servido já com `acima: true` nas 77 células; e o log do
   dev server mostrou a página recarregando depois do rebuild.
3. **"É a ordem das camadas no cliente."** Falso. `farmArte.acima` é o último
   filho do mundo depois de `objects`, e `world.sortableChildren` é `false`.

A lição das três: **quando as medições todas dizem "está certo", o errado é a
minha leitura do relato, não os dados.** Ampliar a captura antes de teorizar
teria poupado duas rodadas.

---

### 🔴 O moinho, segunda vez: as pás passavam por baixo do cenário

Relato do dono: *"o catavento está passando por baixo de alguns elementos
(árvores, grids do chão)"* — captura `erros/02-erro-fazenda.png`.

As pás nasciam na camada `baixo`, junto do chão. A hélice tem **10×9 células**:
ela transborda o moinho e cruza a cerca-viva ao norte, que é `acima`. As pontas
sumiam atrás do mato e a hélice parecia serrada.

Conserto: a camada `Sails` (45) virou `acima`.

🔴 **A regra da camada `acima` não é sobre vegetação, é sobre ALTURA.** Tudo o
que estava lá até agora era folhagem e corrimão, e é fácil ler a regra errado. A
pergunta certa é *"está acima da cabeça?"*: uma hélice a três tiles do chão não
pode ser encoberta por um arbusto ao nível do solo. Isto também põe as pás sobre
o JOGADOR, que é o certo — passa-se por baixo do catavento.

#### ⚠️ A lição de verificação, que vale mais que o conserto

Eu tinha "conferido" o moinho na rodada anterior renderizando três quadros — e
passou. Medindo depois, quadro a quadro, quantos pixels de pá caíam sob o
`acima` assado:

| quadro | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| pixels tapados | **20** | 480 | 1488 | **1596** | 624 | 108 |

O defeito quase não existe no quadro 0 e é enorme no 3. **Renderizei justamente
os quadros em que ele não aparece.** Conferir animação por amostra de quadro é
conferir por sorte; o certo é medir a sobreposição em TODOS os quadros, que é o
que a tabela acima faz.

#### ⚠️ Fica pendente, e é decisão de mapa

**As pás são SÓLIDAS**, célula a célula, no formato do X do quadro 0 — há parede
invisível no ar em volta do moinho. É pré-existente e não foi mexido: tirar a
solidez abriria passagem nova e mudaria as ilhas andáveis. Quer ser visto em tela.

---

### 🆕 Construtor de mapas na tecla **E**

Pedido do dono em 31/08, depois de o `/clone` + `/paste` se mostrarem lentos:
*"escolher os sprites, girar 90°, posicionar... escolher o nível que quero
colocar o objeto"*.

⚠️ **NÃO foi visto em tela.** Typecheck limpo, 493 testes.

**Fluxo:** `E` abre o painel → escolhe o sprite na paleta → `R` gira 90° →
escolhe a camada → **`/ok`** no chat (ou o botão "pôr") → o objeto entra no tile
**de frente** para o boneco. `/undo` desfaz. O painel é arrastável pelo título.

#### A paleta: 871 sprites, assados

Só entram os tiles que a fazenda **realmente usa** — 871 de mais de 10.000 nos 24
tilesets do pack. Despejar tudo daria uma paleta impossível de percorrer; o que o
autor usou é o vocabulário visual desta fazenda, e é com ele que se conserta uma
aresta sem inventar estilo novo.

🔴 **Assar é o único jeito de eles existirem no cliente:** os tilesets moram em
`assets/`, fora de `client/public`, e o navegador não os alcança.

⚠️ **O índice na paleta é o que vai para o banco.** Reordenar a paleta troca o
desenho de tudo que já foi posicionado — grupos novos entram sempre no FIM.

#### As três camadas, e por que exatamente três

Não são um número escolhido: são os três lugares que **já existiam** na pilha de
containers do cliente.

```
floorRoot → decChao → fazenda(baixo) → decBaixo → objects → fazenda(acima) → decAcima
```

| `camada` | para quê |
|---|---|
| `chao` | remendar terreno sem cobrir o que está em cima |
| `baixo` | o caso comum: objeto no chão, o herói passa na frente |
| `acima` | sobre tudo, inclusive o herói — *"a hélice por cima dos objetos"* |

#### 🔴 Duas decisões que valem saber

**1. Tabela separada da `world_edit`, e a razão é a CHAVE.** Uma edição de tile é
única por célula (um tile tem um tipo). Um decalque é o contrário: o valor dele é
poder **empilhar** — uma pedra sobre a grama, a hélice sobre a pedra. Chave por
célula mataria exatamente o que o comando existe para fazer. Então `world_decal`
(schema v8) tem id próprio e a célula é só mais uma coluna; a ordem de desenho
dentro da mesma célula é a de inserção.

**2. `/undo` tem DUAS pilhas e um comando só.** O editor grava em duas tabelas, e
o dono não tem por que saber disso: ele desfez a última coisa que fez. O comando
compara os dois carimbos de tempo e desfaz o mais recente. ⚠️ Sem isso, pôr um
objeto e apertar `/undo` desfaria a REMOÇÃO de dez minutos atrás e deixaria o
objeto lá — o pior tipo de desfazer, o que mexe no que você não estava olhando.

⚠️ **`/ok` é o ÚNICO comando resolvido no cliente**, e tem de ser: o que ele manda
(sprite, giro, camada) é estado de interface, que o servidor não conhece. O
`chatInputEl` intercepta e envia `C2S_Decal`; a célula-alvo continua sendo
calculada no servidor, como em todos os outros.

⚠️ **Não substitui o Tiled.** O `Farm.tmx` segue sendo a fonte da fazenda; isto é
uma camada de remendos por cima. Refazer 4.400 células à mão aqui seria desfazer
a razão de o conversor existir.

---

#### 🆕 Colisão também no `/clone` e no `/paste` (31/08)

Relato: *"estou copiando coisas e passando por cima delas e não pode"*.

| palavra | o que a célula colada vira |
|---|---|
| (nenhuma) | **herda a colisão da ORIGEM** — o Ctrl+V honesto, e o padrão |
| `solido` | `WALL_WOOD`: ninguém passa |
| `livre` · `passa` · `abre` | o chão do bioma: passa-se por cima |

Vale nos dois: `/clone solido` **guarda a escolha na área de transferência** e
todas as colagens seguintes saem iguais — é o que torna consertar uma cerca
inteira suportável. `/paste solido` sobrepõe só naquela colagem.

⚠️ **`aqui` agora vale em qualquer posição** (`/paste solido aqui`). Antes só o
primeiro argumento era lido, e `/paste solido aqui` teria mirado no tile da
frente calado.

🔴 **Sem modificador NÃO é "andável": é o que a origem era.** Clonar uma parede e
colar tem de dar uma parede, senão o Ctrl+V mentiria. Foi a decisão mais fácil de
errar aqui — o reflexo é fazer o padrão ser "decoração".

⚠️ **`passa` e `abre` são a mesma coisa na colagem, e no construtor NÃO são.** Lá
o decalque é desenho puro, então "passa por cima" quer dizer *não mexa no tile* e
"abre passagem" quer dizer *derrube a parede que já existia* — dois efeitos. Na
colagem o tile é SEMPRE escrito, então as duas viram a mesma ordem. As três
palavras são aceitas para quem vem do painel não ter de lembrar de qual lado da
fronteira está.

---

#### 🆕 Colisão no construtor (31/08)

Relato do dono: *"tem peças que eu coloco que o herói atravessa, tipo uma parede
ou um barranco"*. E atravessava — **decalque é desenho, e desenho não para
ninguém**: a colisão do mundo mora no TIPO DE TILE, num lugar completamente
separado do que se vê.

O seletor novo, ao lado do de camada:

| opção | o que faz no tile |
|---|---|
| **passa por cima** (padrão) | nada — a peça é só enfeite |
| 🧱 **sólido** | vira `WALL_WOOD`: ninguém passa, e o mapa da tecla M mostra |
| 🚪 **abre passagem** | vira o chão do bioma: tira parede invisível de onde sobrou |

⚠️ **`abre passagem` não é enfeite da lista.** É como se remove a parede invisível
que sobrou de arte antiga — o caso das pás sólidas do moinho, ainda pendente.

🔴 **A colisão é uma `WorldEdit` GÊMEA**, gravada junto do decalque na mesma
célula. É o mesmo mecanismo do `/remove`, reaproveitado: "esta parede bloqueia"
não é uma propriedade nova do mundo, é o tile daquela célula mudando.

⚠️ **Dentro da fazenda a edição gêmea leva `arte` apontando para a PRÓPRIA
célula**, e sem isso a colisão apagaria o desenho: `farmDesenhaCelula` devolve
`false` para célula editada **sem** arte (é o `/remove`), e a fazenda pararia de
pintar ali. Apontando para si mesma, a célula continua desenhada com os pixels
originais — a colagem vira um no-op visual e só a colisão muda.

⚠️ **O `/undo` desfaz as duas de uma vez.** Tirar o desenho e deixar a colisão é o
pior resultado possível: sobra parede invisível e nada em tela denuncia o que
ficou. A coluna `colisao` (schema v9) existe só para isso — não para desenhar.

---

#### 🆕 Segunda rodada do construtor (31/08, mesmo dia)

**Redimensionar e zoom.** O painel virou flex em coluna com `resize: both`; quem
cresce é a GRADE, não o cabeçalho. O zoom tem cinco degraus (0,5× a 3×) e a grade
usa `repeat(auto-fill, var(--ed-cell))` — é isso que faz zoom e redimensionamento
conversarem sem número de colunas fixo em lugar nenhum.

⚠️ **Os degraus são inteiros e meio, nunca arbitrários.** A arte é de 16 px a 2×;
ampliar por fator quebrado devolve o serrilhado em faixas que assombra este
projeto desde 10/08. 1,5× cai em 48 px, múltiplo inteiro de 16 — por isso ele
entra e 1,25× não.

🔴 **Tamanho, posição e zoom sobrevivem à recarga** (`localStorage`), e isso não é
enfeite: o fluxo é *mexe → Ctrl+Shift+R → olha*, dezenas de vezes seguidas. Sem
guardar, cada recarga devolvia o painel ao canto e à peça de 32 px.

**Conta-gotas: clicar no jogo acha a peça.** Pedido do dono: *"clicar no grid que
quero no game e ele localiza o grupo dele, vai ajudar a encontrar os 'parentes'
de cada área"*. Caçar uma cerca específica entre 871 peças é procurar agulha;
apontar para a que já está no mapa acha na hora.

O `farm:build` passou a emitir `paleta.celulas`: **1.408 células** mapeadas para a
pilha de peças que as compõem.

⚠️ **É uma LISTA por célula, não uma peça só**, e é aí que está o valor: uma
célula da fazenda costuma ter três ou quatro camadas (chão + mato + cerca).
Guardar só a de cima esconderia justamente o chão que se quer copiar. Clicar de
novo na mesma célula desce um degrau.

🔴 **A ordem é por COBERTURA, não por camada — e a primeira versão foi por camada,
que estava errada.** O dono relatou: *"ele localiza vários que não têm nada a
ver"*. E localizava: **a camada mais alta de uma célula quase nunca é o que se
vê**. No telhado da casa a peça de cima é a HERA (um galho de ~20 pixels opacos)
sobre o telhado inteiro; no moinho é um farelo de pá; no lago, um peixe. Clicar
no telhado devolvia a hera.

A pergunta certa é *"o que ocupa mais esta célula?"*, e ela se responde contando
pixel opaco no conversor. Empate desempata pela camada mais alta — o critério
antigo virou desempate em vez de regra. Conferido em seis células conhecidas
(telhado, porta, moinho, lago, pomar, grama): o primeiro clique agora entrega
exatamente o que está na tela.

🔴 **Com o painel aberto o clique vira conta-gotas e NÃO caminhada** — modal de
propósito. A alternativa (Shift+clique) é pior aqui: quem conserta cenário clica
em tile atrás de tile procurando a peça, e segurar tecla o tempo todo cansa. Para
andar, WASD; fechar com `E` devolve o clique-para-andar na hora.

⚠️ O `farm.json` do cliente foi de 30 KB para **93 KB** por causa do mapa de
células. É asset local de desenvolvimento e paga o preço; se um dia incomodar, o
caminho é emitir só as células com mais de uma peça.

---

### 🆕 `/remove` — a ferramenta de AUTORIA de cenário

Pedido do dono em 31/08: *"eu logado no servidor, coloco /remove e você remove a
árvore/item/plantação/textura do grid que estiver de FRENTE para o meu boneco"*.

⚠️ **NÃO foi visto em tela ainda.** Typecheck limpo, 491 testes.

| comando | o que faz |
|---|---|
| `/remove` | apaga o que está no tile para onde o boneco está VIRADO |
| `/clone` | copia esse tile (Ctrl+C) |
| `/paste` | carimba o copiado no tile de frente (Ctrl+V) |
| `/undo` | desfaz a última edição (LIFO). `/restaura` é o mesmo |

Os três primeiros aceitam `aqui` (`/clone aqui`) para agir sobre o tile **sob** o
boneco em vez do de frente.

#### 🔴 O `/clone` copia DUAS coisas, e a diferença é tudo

| | de onde vem | quem desenha |
|---|---|---|
| **o tile** | `map.floors` — grama, terra, árvore, parede | o motor |
| **a arte** | o PNG assado da fazenda | o cliente, copiando pixels |

Fora da fazenda só existe a primeira: o mundo é 16 tipos de tile e o que se vê É
o tipo. Dentro da fazenda existem as duas, **independentes** — colisão do tile,
desenho do PNG. Por isso `/clone` guarda o tile sempre e a origem da arte só
dentro da fazenda; colar arte de fazenda fora dela é recusado com aviso (não há
PNG lá para receber os pixels).

⚠️ **Não copia o que está VIVO**: bicho, item no chão, nó de coleta, água
correndo e as pás do moinho são entidades ou sprites animados, não pixels
assados. Clonar uma célula do lago copia o fundo parado. O destino PERDE os
sprites vivos dele — senão a água correria sobre a arte nova.

🔴 **A fonte dos pixels é o PNG ORIGINAL, não o canvas em uso**, e isso não é
detalhe: copiar do canvas faria o resultado depender da ORDEM em que as edições
foram aplicadas — colar de uma célula que depois foi apagada daria coisas
diferentes para quem chega agora e para quem já estava online. Lendo do original,
a mesma lista de edições dá sempre a mesma fazenda.

#### ⚠️ "Editada" e "apagada" NÃO são a mesma pergunta

É a armadilha que o `/paste` criou, e há teste travando as duas:

- **sem `arte`** → célula APAGADA: a fazenda para de desenhar, o motor pinta o
  chão do bioma. É o `/remove`.
- **com `arte`** → célula COLADA: a fazenda continua desenhando, com os pixels
  copiados. É o `/paste`.

`farmDesenhaCelula` pergunta `foiApagada`, nunca `foiEditada` — trocar uma pela
outra apagaria em silêncio justamente o que se acabou de colar. E a origem da
arte é PERSISTIDA (colunas `arte_x`/`arte_y`, schema v7): sem elas, no restart
seguinte toda colagem viraria remoção.

Só em `DEV_MODE` (`npm run dev:test`), junto de `/level`, `/tp` e `/gold`.

**A ordem em que as três coisas são tentadas é o conteúdo do comando**, porque
num mesmo tile pode haver as três e apagar a errada é frustrante:

1. **item no chão** — some sozinho, não vira edição gravada (é só largar outro);
2. **nó de coleta** — também não grava: nós renascem, e gravar "não existe aqui"
   brigaria com o respawn na próxima vez que ele acontecesse;
3. **o TILE** — o único que vira edição gravada, porque é o único que o mundo
   recria igual a cada boot. O substituto é `chaoBaseEm(x,y)`, não `grass` fixo:
   grama fixa plantaria um quadrado verde na neve, que é um bug real já
   documentado no `worldgen.ts`.

⚠️ **Criatura não entra na lista, de propósito.** Bicho anda: mirar nele é mirar
em algo que pode não estar mais lá quando o comando roda, e ele renasce em 45 s.

#### 🔴 As duas decisões que valem saber

**1. Isto NÃO viola a invariante do `worldgen`.** *"Terreno não trafega pela
rede; os dois lados calculam o mesmo mundo"* continua valendo — `buildWorldMap()`
segue determinístico e as edições são uma **lista curta carimbada por cima**, do
mesmo jeito que a fazenda é. O mundo tem 90.000 tiles; a lista tem dezenas.
⚠️ Se um dia ela crescer para milhares, a decisão precisa ser revista, e o lugar
de revisá-la é o cabeçalho de `shared/src/worldedit.ts`.

**2. A lista mora no BANCO (`world_edit`, migração v6), NÃO em `shared/data/`.**
O vizinho natural seria um `edits.json` ao lado do `farm.json` — e não funciona:
aquele diretório está sob o observador do `tsx watch` e do Vite. **Foi visto em
tela nesta mesma sessão**, regravar o `farm.json` derrubou e subiu o servidor e
recarregou a página. Com o arquivo lá, cada `/remove` custaria um restart e a
queda de quem estivesse online — num comando cujo propósito é ajustar o cenário
*enquanto se joga*.

🔴 É a primeira tabela do banco que **não pende de conta nem de personagem**:
apagar uma árvore apaga para todo mundo, porque é autoria de cenário e não
progresso de ninguém.

#### O que foi preciso mexer

| arquivo | o quê |
|---|---|
| `shared/src/worldedit.ts` | 🆕 a tabela de edições e o carimbo, lidos pelos dois lados |
| `shared/src/farm.ts` | `farmDesenhaCelula` devolve `false` na célula apagada |
| `shared/src/protocol.ts` | `S2C_WorldEdit` (lista inteira no login, delta ao vivo) |
| `server/src/store/schema.ts` · `store.ts` | v6 `world_edit` + os três métodos |
| `server/src/index.ts` | os comandos, e o carimbo no boot ANTES de spawnar nada |
| `client/src/main.ts` | aplica, e **remonta o pedaço** — o passo que se esquece |
| `client/src/farmart.ts` | `apagaCelula`: fura os PNGs assados |

⚠️ **Dentro da fazenda são DUAS metades e as duas são obrigatórias:** o
`farmDesenhaCelula` manda o motor voltar a pintar o chão, e o `apagaCelula` fura
o PNG. Só a primeira deixaria a árvore desenhada por cima do chão novo; só a
segunda deixaria um buraco preto. Para poder furar, os dois PNGs da fazenda
passaram a entrar como **canvas** em vez de textura de `<img>`.

⚠️ **Limite conhecido:** reconectar sem recarregar a página não desfaz edição
restaurada enquanto o cliente estava fora. F5 resolve. Está anotado no código.

---

### 🎯 A PRÓXIMA COISA

1. 🔴 **Ver a fazenda em tela** — a porta da casa (herói visível), o pé das
   árvores do pomar, o moinho girando inteiro e as duas bordas das setas.
   ⚠️ **Ctrl+Shift+R**: os PNGs são reassados e o navegador guarda os antigos.
2. ⚠️ **Duas decisões de arte que ficaram esperando tela**, as duas anotadas em
   `client/src/miniworld.ts`: a **Galinha (36px) está maior que o Ganso (26px)**,
   e ganso é maior que galinha (packs de autores diferentes, e o ganso foi
   encolhido à mão a pedido do dono em 30/08). E o **Golem tem 76px em pé**, não
   os 142 que este handoff registrou em 29/08 — aquele número era medida inflada
   pelo quadro de ataque.
3. ⚠️ **Moinho e galinheiro têm porta que abre e não leva a lugar nenhum** — o
   `farm:build` avisa. Faltam os dois interiores.
4. Depois disso, **as 7 skills do Guerreiro**, que continua sendo o trabalho
   escolhido — ver o bloco de 13/08 mais abaixo, que segue valendo inteiro.

---

# Handoff — estado do projeto em 2026-08-29

## ⏸️ ONDE PARAMOS — 29/08, o dia dos BICHOS

**Tudo abaixo foi visto em tela pelo dono e aprovado.** Typecheck limpo nos 3
pacotes, **466 testes**. `npm run dev` → `localhost:5173`.

### O que entrou

| | |
|---|---|
| 🐐 **Fauna de pasto** | 8 espécies novas da CraftPix (cabra, ganso, cavalo, coelho + os 4 filhotes), 4 direções, andar e parado. `npm run animals:build` |
| 🗿 **Golem de Pedra** | 2º chefe do jogo. **Único com as 5 animações** (andar/parado/golpe/dano/morte). Um só, em (128,196). `npm run golem:build` |
| 📖 **Bestiário virou LIVRO** | Kit CraftPix: página esquerda = grade, direita = ficha. Tecla **B**. `npm run bestiario:build` |
| 🎥 **Câmera** | `ZOOM` voltou de 2× para **1×** — decisão do dono, achou perto demais |
| ⚔️ **Knight** | Voltou ao pack ANTIGO (`/assets/classes`), o dos **cinco golpes**. `COM_CAMADA` está vazio |

### 🔴 Quatro bugs consertados, e três eram antigos

1. **Moonwalk da fauna** (`server/src/index.ts`, ramo de fuga): a direção era
   calculada **depois** de mover, então o delta dava sempre zero. Só apareceu
   agora porque **fugir é exclusividade do pacífico**, e não havia nenhum no mapa.
2. **Rastejar depois de renascer**: o ator entrava em `death` e não saía. O
   gatilho do conserto é a **vida voltando no snapshot**, não uma mensagem nova —
   `respawn` só chega a quem morreu, e foi essa assimetria que criou o defeito.
3. **Não dava para parar de atacar**: `clearTarget` só existia no **Esc**. Agora
   clicar de novo no mesmo alvo cancela, e o menu vira "🛑 Parar de atacar".
4. **Clique no bestiário não pegava**: a grade era refeita a cada `stats`, e
   clique cujo `mousedown` cai num nó que some não vira `click`. Agora só
   redesenha quando a lista muda, e a escuta é delegada.

### ⚠️ O que saber antes de mexer

- 🔴 **ESCALA DE PIXEL ART É SEMPRE INTEIRA.** Fracionária devolve o serrilhado
  em faixas de 10/08. Foi o que travou "todos do tamanho do cavalo": a faixa é
  50–63 px, não um número.
- 🔴 **A ordem das linhas do pack NÃO é padrão.** A fauna veio na ordem do jogo;
  o **Golem veio com as linhas 2 e 3 TROCADAS**. Olhe a arte antes de converter —
  errar aqui dá moonwalk.
- ⚠️ **Só 8 das 28 espécies têm retrato no bestiário.** O kit traz 20 monstros
  genéricos que não são os nossos. As outras 20 usam ícone desenhado por código
  (agora com silhueta por família, não mais o blob verde de todo mundo).
- ⚠️ **`assets/Farm/` entrou no repo e NÃO foi implementada.** Ninguém pediu.

### 🎯 A PRÓXIMA COISA

Continua sendo **as 7 skills do Guerreiro** — plano fechado, ⚠️ **falta a
aprovação do dono** e as duas decisões dele sobre a hotbar. Ver o bloco de 13/08
mais abaixo, que segue valendo inteiro.

---

# Handoff — 13/08 (bloco anterior)

## ⏸️ ONDE PARAMOS — retomar 14/08

### 🎯 A PRÓXIMA COISA: as 7 habilidades que faltam ao Guerreiro

**O dono escolheu isto em 13/08**, e o plano já está fechado. ⚠️ Só **falta a
aprovação dele** para escrever código — a granularidade combinada é por sistema.

🔴 **Corrigindo uma impressão que é fácil de ter: a árvore de habilidades NÃO
falta — ela existe e funciona.** `shared/src/skills.ts` (489 linhas) tem o motor
inteiro, ligado de ponta a ponta: protocolo (`skillup`, `skillreset`), validação
no servidor, persistência no banco e interface no cliente. Custo
**1-1-1-2-2-3-3-4-5-6 = 28 SP**, SP/nível por classe, marcos, pré-requisitos,
reset por gold, hotbar F1–F8, tecla **K**.

**O que falta mesmo:**
1. 🔧 **As 7 skills do Guerreiro** — é o trabalho escolhido. Todas com número no
   [`ROADMAP-elysia.md`](./ROADMAP-elysia.md), Etapa 13.
2. 🔴 **Três das quatro classes têm árvore VAZIA** — as 8 skills existentes são
   todas `classes: ['knight']`. Quem cria Arqueiro, Assassino ou Feiticeiro não
   tem onde gastar ponto.
3. 🔴 **O GDD se corrige:** o cap. 67.N diz que *"'WARRIOR V1 = FECHADO COM 15
   SKILLS' não representa mais a estrutura mais recente"*. A estrutura atual é
   **Habilidades Gerais + linhas de maestria por família de arma (1H/2H)**. As 8
   implementadas estão certas — mudam de lugar, não são jogadas fora.

**O plano das 7, já levantado contra o código:** são **3 ativas** (Grito de
Guerra 30 s · Contra-Ataque 6 s · Segundo Fôlego 45 s) e **4 passivas** (Pele de
Ferro · Resistência · Maestria de Armadura Pesada · Última Resistência).

⚠️ **Passiva é maquinaria que o motor NÃO tem** — `SkillEffectKind` só conhece
`damage · charge · rupture · execution · taunt · stance · fury`. ✅ Mas o padrão
existe: a Postura Defensiva usa funções puras no `shared`
(`stanceDamagePenalty`) chamadas nos pontos certos do servidor. As passivas
seguem isso.

**Onde cada uma encaixa**, e nenhuma pede mecanismo novo:

| Skill | Ponto de encaixe |
|---|---|
| Pele de Ferro (+12 % DEF) · Maestria de Armadura Pesada | `recompute()` |
| Resistência (−20 % controle) | `ccDurationFactor()`, `shared/src/conditions.ts` |
| Última Resistência · Contra-Ataque | caminho de dano recebido |
| Segundo Fôlego (15 % HP) · Grito de Guerra | ativa direta / party |

✅ **Duas armadilhas do `ROADMAP` já estão resolvidas no código, e é bom saber
antes de começar:**
- *"HP **normal**, não o inflado pela Fúria"* — o servidor já guarda
  `player.fury.hpNormal` (`server/src/index.ts:343`) exatamente para isso.
- *"controle ≠ debuff"* — `conditions.ts` já separa `ConditionCategory:
  'control' | 'restriction' | 'dot' | 'partial'`. A Resistência filtra por
  `'control'`.

🔴 **DUAS DECISÕES DO DONO ESTÃO PENDENTES:**
1. **A hotbar tem 8 slots e o Guerreiro passa a ter 15 skills.** O `SKILL_BAR` é
   constante fixa hoje. O doc `14.54` quer que o jogador *"escolha quais levar"*
   — ou seja, barra **configurável**, que é sistema próprio (protocolo +
   persistência + arrastar). **Proposta:** por ora as passivas ficam fora da
   barra por construção e a barra segue fixa; barra configurável vira sistema
   separado. **Não fazer por conta.**
2. **O que o doc não dá vai marcado `⚠️ REFERÊNCIA`:** custo de mana, nível
   mínimo, pré-requisitos e curva por nível. Efeitos e cooldowns o doc dá.

---

### 🔴 13/08 — O 3D FOI EXPLORADO E ESTACIONADO. Decisão do dono.

**Personagem em 2D venceu. Câmera fixa, sem girar e sem zoom.** Depois de quatro
páginas de teste, o dono decidiu **parar o 3D e voltar ao jogo**.

⚠️ **Nada disso está ligado no jogo** — quatro páginas descartáveis
(`client/espeto-*.html`) que não falam com o servidor, não importam `main.ts` e
não entram no build. O `three` está em `devDependencies`.

📖 **O relato inteiro, com os números e as seis armadilhas medidas, está no
[`HISTORICO.md`](./HISTORICO.md), bloco de 13/08 (tarde).** Vale ler antes de
qualquer um reabrir o assunto. Os dois achados que mais importam:

- 🔴 **Câmera FIXA derrubaria os dois custos do 3D** — as 8 direções deixam de
  ser pré-requisito (com `yaw` constante, as 4 atuais bastam) e a nitidez volta
  (ortográfica + escala inteira = 1 px de arte para 2 px de tela, cravado).
- 🔴 **Mas 90° não funciona com cenário 3D** — no ângulo do Tibia só se vê
  telhado e copa. Cenário 3D exige câmera inclinada.

**Por que parou, e é honesto:** o alvo do dono é a mistura de **Tibia** (câmera e
grade) + **Ragnarok** (cenário 3D, herói 2D) + **Diablo I** (luz e clima). Isso é
**direção de arte, não geometria** — o que faz a referência bonita é textura
pintada, e a assistência entrega infraestrutura verificável, não gosto.

⚠️ **A pipeline do Blender fica no repositório e funciona** (`tools/blender/`,
`npm run models:build`), com as convenções travadas em `comum.py`. Se o 3D
voltar, o caminho está aberto e medido.

---

### ✅ 13/08 — A CÂMERA APROXIMOU, e a rotação está decidida

**`ZOOM` foi de 1,0× para 2,0×** em `client/src/main.ts`. O herói era desenhado
a 58 px numa viewport de ~780, cerca de metade do tamanho do preview; agora vai
a **116 px**. Typecheck limpo, **466 testes**.

🔴 **Veio junto um conserto que não estava previsto: a câmera passou a andar em
pixel de tela inteiro.** A suavização entregava deslocamento fracionário e
`world.x/y` nunca era arredondado — a 2× cada meio pixel de câmera vira um pixel
de tela, e o cenário **cintilaria** enquanto o herói anda. O float agora mora em
`camX`/`camY` e o arredondamento acontece só na saída. ⚠️ **Guardar o float à
parte não é preciosismo:** se a suavização lesse de volta o valor arredondado, um
passo menor que meio pixel arredondaria para o mesmo lugar e a câmera
**empacaria** perto do alvo.

⚠️ **O `SNAPSHOT_RANGE = 32` sobra** — zoom maior mostra *menos* mundo (24 → 12
tiles na vertical), o contrário do que a nota de 12/08 temia.

🔴 **CÂMERA QUE GIRA (Ragnarok): decidido NÃO fazer em 13/08 — não reabra sem
ler o porquê.** Girar exige 8 direções por sprite (o tipo tem 4:
`DirAnim { down, up, right, left }`, `client/src/miniworld.ts:22`), e as
diagonais já falharam com número em 12/08. Todo objeto alto é billboard ancorado
no pé, então girar o mundo os deita. Ragnarok é **terreno 3D com billboards**, não
2D girando. E Medivia — a referência declarada em 11/08 — não gira. 📖 As quatro
razões estão inteiras no [`HISTORICO.md`](./HISTORICO.md), bloco de 13/08.

⏳ **Disponível e não construído:** zoom em degraus inteiros (1×/2×/3× na roda do
mouse). É pequeno — o `ZOOM` já está threaded, falta o handler. O dono preferiu
**manter o 2× fixo** por ora. 🔴 Se for feito, **os degraus têm que ser
inteiros**: escala fracionária traz de volta o serrilhado de 10/08.

---

## ⏸️ O bloco de 12/08, que abriu esta retomada

🔴 **A DESCOBERTA MAIS IMPORTANTE DE ONTEM, e ela vem por último de propósito:
existe um produto de PERSONAGEM no PixelLab** (`pixellab.ai/create-character`).
Ele faz **8 direções, 8 animações de 9 quadros e estados**, exporta em **64×64**,
gera corpo **sem arma**, e o `Export` entrega tudo. O dia inteiro foi construído
em cima da **API crua**, que não faz nada disso.

🔴 **NÃO GERE MAIS PERSONAGEM PELA API CRUA ANTES DE AVALIAR O CHARACTERS.**
📖 O que muda e o que fica obsoleto está no topo de
[`PIXELLAB-RECEITA.md`](./PIXELLAB-RECEITA.md).

✅ **E o trabalho de ontem sobrevive.** Como o Characters gera corpo sem arma, o
sistema de camada continua valendo inteiro — `grip.ts`, `maos.mjs`, `compor.mjs`,
`armas2strip.mjs` e o desenho em camadas no cliente. **Só muda de onde vem o
corpo**, e ele passa a vir com 8 direções.

### 🎯 A PRÓXIMA COISA, em ordem

1. **Gerar UMA classe no Characters** — 64×64, sem arma, 8 direções — e medir o
   custo em créditos (a tela mostra `⚡39` por estado). Uma classe responde se o
   caminho vale, antes de gastar nas quatro.
2. ✅ **O ZOOM DA CÂMERA — FEITO em 13/08.** Está 2×. Ver o bloco do topo.
3. **As seis armas que faltam** — machado, maça e cajado, 1M e 2M.
4. **O escudo no snapshot** — `hasShield?: boolean`, no mesmo padrão do
   `weaponType`. O `grip.ts` já tem a regra testada e a arte já está recortada.

### ✅ O que ficou pronto ontem (12/08)

**~33 gerações, 22 commits, tudo empurrado.** Typecheck limpo, **466 testes**.

| | |
|---|---|
| Feiticeiro | 4 direções na máscara do quadril; o dourado da veste parou de sumir |
| Knight desarmado | espada e escudo saíram do sprite, identidade preservada |
| `grip.ts` + `ItemDef.hands` | escudo só se equipado, 2 mãos sem escudo, só adaga dupla |
| Camada | corpo + espada + escudo **remonta o Knight**, com o leão |
| Ponto de mão | a arma segue o braço no golpe |
| **No jogo** | o Knight já segura o que equipou |
| Respiração | `idle` construído, não gerado — 1 px de tórax, pés fixos |
| HUD | retrato + nome + classe no bloco de vitais |

### ⚠️ O que NÃO ficou bom, e está medido

- **O golpe do norte e do oeste não existe** — a mão não se move um pixel. Três
  abordagens falharam. Provado por duas medidas independentes.
- **As diagonais pela API crua não prestaram** — e o Characters as faz.
- **Isométrico**: o dono gostou dos mockups, e a decisão foi **ficar na grade**.
- **Arma sem arte desenha mão vazia**, de propósito — ver o item 3.

---

## 🗡️ 12/08 (tarde) — A ARMA SAIU DO CORPO. Leia isto antes de tudo.

O dono jogou, listou 10 defeitos e virou o rumo: **a arma deixa de ser pintada
no sprite e passa a ser CAMADA desenhada por cima**. Escopo dado por ele:
**Knight primeiro, testar, depois o Sorcerer**, com **8 direções**.

### 🔴 Os 10 defeitos tinham 1 causa só

Adaga que não existe para três classes; lança, arco e cajado do Knight que
"parecem a espada dele"; espada sumindo e escudo virando redondo na caminhada;
e "trocar de arma tem que aparecer andando". Tudo isso é **a arma estar dentro
do corpo**: cada combinação classe×arma exigiria a folha inteira dela.

**O número que ninguém tinha escrito:** o pack PixelLab entrega **7 animações de
ataque onde o pack antigo entrega 16**, e o `attackPoseFallback` esconde isso
empurrando **13 das 20** combinações para `attack_sword`. Por isso o Knight faz
o mesmo gesto com qualquer arma.

### ✅ O que ficou pronto (22 gerações)

| | O quê | Onde |
|---|---|---|
| ✅ | **Knight desarmado**, 4 direções | `arte-fonte/pixellab/_desarmado/knight/` |
| ✅ | A ferramenta de desarme | `tools/pixellab/desarmar.mjs` |
| ✅ | **Postura, escudo e adaga dupla** viraram regra testada | `shared/src/grip.ts` |
| ✅ | `ItemDef.hands` — o que faz "Espada de Duas Mãos" existir | `shared/src/items.ts` |
| ✅ | **Caminhada do Knight desarmado**, máscara no quadril | `_desarmado/knight/*-passo*.png` |
| ⚠️ | As 4 diagonais — saíram, mas **ruins** (ver abaixo) | idem |

🔴 **O desarme preserva a IDENTIDADE**, e era essa a dúvida cara. A silhueta
encolheu para largura de corpo puro — sul `x 7..48 → 18..44`, leste
`x 12..55 → 19..44` — com a mesma armadura, o mesmo elmo e a mesma sobreveste.
Não foi preciso gerar um cavaleiro novo e refazer golpe, morte e passo nele.

🔴 **A caminhada melhorou porque o corpo esvaziou.** Sem escudo no sprite, o
beco nº 4 não vale para o Knight, e a máscara subiu ao quadril. Medido: a banda
do escudo ao sul ia de **23 → 69 → 87** px no ciclo (o "escudo fica redondo"); no
corpo desarmado vai **4 → 0 → 13**. E a caixa da silhueta ficou **idêntica nos
três quadros** (`x 18..45`), coisa que nunca tinha acontecido.

### ⚠️ O que NÃO ficou bom, e é honesto saber

1. **As diagonais não prestam ainda.** Vista de três quartos tem que ser mais
   estreita que a de frente. O **sudeste saiu mais LARGO** (30 contra 28 do sul)
   — ou seja, quase não virou — e a paleta dele pulou de 62 para **111 cores**,
   que é a assinatura do beco nº 1. O **nordeste virou demais**: 23 px, mais
   estreito que o próprio perfil (26), o que é geometricamente errado. O
   `/rotate` a 45° não está entregando. Ferramenta em `tools/pixellab/girar.mjs`.
2. 🔴 **E o movimento do jogo é 4-direcional.** O passo do servidor é
   `[[dx,0],[0,dy]]` — um eixo por vez. **Sprite diagonal não tem como aparecer**
   até o movimento mudar, e mudá-lo mexe em pathfinding, colisão e na invariante
   de que "decoração nunca encosta em decoração". Tibia e Medivia, a referência
   declarada, são 4-direcionais pelo mesmo motivo.
3. **O norte do Knight tem sobreveste CIANO**, mais clara que o azul das outras
   três direções. Duas seeds deram o mesmo. Não bloqueia; está ali.
4. **Nada disso está ligado no jogo.** `_desarmado/` é pasta separada, e o
   conversor pula pasta começada por `_`. O jogo continua com o pack armado.

### ✅ A MORTE do corpo desarmado entrou — e o GOLPE só pela metade

**A morte funciona.** Mesmo `animate-with-skeleton` de sempre: o corpo tomba e
termina deitado no chão, nas quatro direções, e nenhuma arma reapareceu.

🔴 **O golpe é o problema difícil deste projeto, e agora tem três provas.** O
`inpaint` lateral falhou pela terceira vez: no corpo desarmado o gesto mexeu
**41 px no norte e 70 no leste** (o passo mexe 328–397), e no sul a única
mudança relevante foi o modelo **inventar uma espada** — num corpo cujo
propósito é não ter uma.

✅ **A saída era outro endpoint, e o desarme a destravou.** O beco nº 3 baniu
`animate-with-skeleton` porque ele **regenera o corpo e some com o escudo**. Sem
escudo no sprite, o motivo do banimento sumiu — é o beco nº 4 acontecendo de
novo. Desarmar o corpo destravou **duas** coisas, não uma.

⚠️ **E mesmo assim só o sul ficou bom:**

| | `inpaint` | **esqueleto** | lê como golpe? |
|---|---|---|---|
| sul | 145 px | **3949** | ✅ braço erguido junto à cabeça |
| norte | 41 px | 497 | ❌ mudou, mas não ergue o braço |
| leste | 70 px | 899 | ❌ idem |

⚠️ **O esqueleto não segue keypoint fino a 64 px.** Foram pedidos três quadros
distintos (armar, bater, terminar) com o cotovelo e a mão em posições bem
diferentes; voltaram **três quadros quase idênticos**, todos com o braço erguido.
Ele entrega "braço levantado" genérico, não o arco descrito. Por isso o **golpe
de cima para baixo que o dono pediu não saiu** — o que existe é a armada.

⚠️ Custo do esqueleto: o corpo é regenerado, e isso cobra. No sul as cores caem
de **62 para 51** e a silhueta estreita de 28 para 25 px.

🆕 Os três quadros ficam no disco como `<dir>-golpe0/1/2.png`; o do meio vira o
`-golpe.png` que o pipeline de hoje espera. Quando o motor souber tocar golpe de
vários quadros, a arte já está lá.

### ✅ A CAMADA FUNCIONA — corpo + espada + escudo remonta o Knight

🔴 **É a prova de ponta a ponta do rumo.** Três arquivos separados, compostos em
ordem, devolvem o cavaleiro armado **com o leão dourado do escudo no lugar**.

E as armas **não precisaram ser desenhadas**: elas já estavam no pack, grudadas
no corpo. O que existe no armado e não no desarmado é, por definição, o
equipamento. `tools/pixellab/extrair-arma.mjs` recorta os dois **sem gastar
geração nenhuma**; `tools/pixellab/compor.mjs` remonta.

⚠️ O alpha sozinho deixava o escudo **oco** (145 px, só o aro): onde ele cobre o
peito, o desarmado também é opaco. Mas ali quem está à vista no armado **é o
escudo** — ele está na frente. O critério que entrou cresce a partir do aro para
vizinhos que **discordam** do desarmado, e para onde os dois voltam a concordar,
que é onde o corpo reaparece. **145 → 547 px**, e o leão voltou junto.

⚠️ **Só existem espada e escudo**, porque só eles estavam desenhados. As outras
**nove** variantes que o dono listou — machado 1M e 2M, espada 2M, maça 1M e 2M,
adaga 1M, adaga dupla, cajado 1M e 2M — não existem em pack nenhum neste estilo,
e o recorte não as inventa. Elas são geração ou desenho à mão.

⚠️ Dois defeitos, e nenhum é do recorte: o elmo do corpo desarmado perdeu a
fresta escura da viseira, e o composto do leste tem um artefato preto entre o
corpo e o escudo.

### ✅ O PONTO DE MÃO, e a arte já virou tira

🔴 **A simplificação que fez fechar:** como a arma foi recortada da pose parada,
o ponto de empunhadura dela **é**, por construção, a mão daquele quadro. Não há
ponto a adivinhar — o deslocamento é `mão(quadro) − mão(pose)`, e a pose parada
sai exata com deslocamento zero. `tools/pixellab/maos.mjs` mede pelo
`estimate-skeleton`, com rótulos **anatômicos** (`RIGHT ARM` é a mão da arma do
Knight em qualquer direção — o lado da TELA troca de costas, o rótulo não).

**Duas coisas que a medição revelou, e nenhuma estava prevista:**

1. **A mão não se move na caminhada** — sul fica `[21,33]` nos três quadros. É
   por construção: a máscara do passo só redesenha de `y=38` para baixo. O caso
   que parecia o mais trabalhoso saiu de graça.
2. **O golpe se confirmou por caminho independente:** no sul a mão sobe 21 px;
   no **norte fica idêntica** e no oeste move 1 px. As duas direções que não
   viraram gesto agora têm prova numérica vinda de outra medida.

⚠️ **A morte fica de fora de propósito.** O corpo tomba girando em torno dos pés;
a arma teria de girar junto, e girar pixel art de 20 px destrói o desenho. O
caminho certo é a arma **cair** e virar item no chão, como no Tibia — e isso é
decisão de jogo, não de arte.

✅ **A arte já está em tira**, em `client/public/assets/classes-layered/knight/`:
corpo (`walk`, `pose`, `attack_sword`, `death`), quatro armas (`espada`,
`espada2m`, `adaga`, `escudo`) e o `offsets.json`.

🔴 **Um bug quase embarcou aqui, e vale a lição.** A primeira versão do
`armas2strip.mjs` **travava** se um quadro do corpo não tivesse a sola em
`GROUND_Y` — e a trava disparou de cara: o `north-passo` vem com o chão em 58 e o
conversor do corpo o desce 2 px. A arma não passa por esse conversor. Sem tratar,
a espada sairia 2 px fora do lugar **só ao andar para o norte**. O conserto não
foi travar, foi **somar**: o deslocamento que vai para o cliente junta o
movimento da mão **e** o alinhamento do quadro. ⚠️ A regra do `ALIGN_MAX = 3` é
copiada do conversor do corpo, e os dois arquivos **têm que concordar**.

### 🎯 De onde continuar

0. 🔴🔴 **PRIMEIRO DE TUDO: o PixelLab tem um produto de PERSONAGEM**
   (`pixellab.ai/create-character`), e ele é muito melhor que a API crua que
   este projeto vem usando — **8 direções, 8 animações de 9 quadros, estados**.
   O dono confirmou em 12/08 que ele exporta em **64×64**, gera corpo **sem
   arma** e o `Export` entrega tudo. 📖 Detalhes e o que fica obsoleto em
   [`PIXELLAB-RECEITA.md`](./PIXELLAB-RECEITA.md), no topo.
   🔴 **Não gere mais personagem pela API crua antes de avaliar isto.**
   ✅ O sistema de camada abaixo **sobrevive** — só muda de onde vem o corpo.
1. 🔴 **LIGAR NO CLIENTE — é o que falta para virar jogo.** `makeMiniActor` (em
   `client/src/main.ts`) recebe **um** `anim` e desenha um sprite só. Desenhar em
   camadas é fazê-lo aceitar uma lista, aplicando o offset por quadro. O
   `grip.ts` já sabe **decidir** o que desenhar; falta quem **desenhe**.
   ⚠️ É o arquivo de 3.300 linhas que já causou o *"Cannot access 'goldEmMao'
   before initialization"* — comece com espaço para terminar.
2. ⏳ **As seis armas que faltam:** machado, maça e cajado, 1M e 2M. Nelas a
   ponta é **outro objeto**, e nem o recorte nem a derivação inventam isso.
   ⚠️ A `espada2m` hoje é **cópia declarada** da espada: a 64 px o que separa as
   duas é o punho e a POSTURA, e postura é do corpo.
3. ⏳ **O golpe do norte e do oeste**, que não têm gesto — e que agora sabemos
   medir de duas formas independentes.
4. ⏳ **Decidir sobre as diagonais** — hoje são arte ruim que o motor não mostra.

---

## ⏸️ ONDE PARAMOS — 12/08 pela manhã (o bloco anterior)

🔴 **A DESCOBERTA MAIS IMPORTANTE DE ONTEM: a referência do jogo é o MEDIVIA**
(motor estilo Tibia 7.x). O dono mandou o vídeo dizendo que ele *"tem todas as
referências que eu procuro para o nosso game"*. Isso decide três discussões de
uma vez — ver o bloco de 11/08 no [`HISTORICO.md`](./HISTORICO.md).

### ✅ A MÁSCARA SUBIU ATÉ O QUADRIL — feito no sul do Feiticeiro, 2 gerações

**O mecanismo funciona.** `TOPO_PERNAS` em `tools/pixellab/gerar-classe.mjs` é
agora **por classe**, como o `LADO_ARMA` já era: `38` (quadril) para Feiticeiro,
Arqueiro e Assassino, e **`50` para o Knight, que não pode subir** — o escudo
mora acima e o `inpaint` o perde. É o beco nº 4, e ele continua de pé nele.

Medido no sul do Feiticeiro, contra a pose parada:

| | redesenha a partir de | linhas | px mudados | largura | cores |
|---|---|---|---|---|---|
| máscara antiga (y=50) | y=50 | 11 | 181 | 28 | 79 |
| **máscara nova (y=38)** | **y=38** | **23** | **434** | **32** | 81 |

🔴 **Sem os becos conhecidos:** a paleta ficou em 81 cores (o beco nº 1 é o pulo
para ~1500) e o chão continua em `y=60` — o alinhamento de 11/08 não quebrou.

✅ **Um ganho que não estava previsto:** a barra da veste tem **17 px de vivo
dourado** na pose parada, e a máscara de tornozelo **apagava todos** a cada passo
(0). A nova mantém 21. A máscara baixa não encurtava só o passo — comia o
acabamento da veste.

🔴 **MAS O FEITICEIRO ERA A CLASSE ERRADA PARA TESTAR A HIPÓTESE.** Ele foi
escolhido por ser o menor risco (sem escudo, sem aljava) e é: o que voltou é bom
e ficou. Só que ele usa **manto até o chão** — não tem perna visível em quadro
nenhum. O que a máscara alta comprou nele foi a **barra da veste balançando**,
não a perna se movendo. A hipótese do Medivia — *perna inteira, do quadril para
baixo* — continua **sem teste de verdade**, e quem a testa é o **ARQUEIRO**, que
tem perna à mostra.

⚠️ **Duas piscadas para olhar em tela**, achadas na medição do par: o `passo` tem
21 px de dourado e o `passo2` tem **1**; e o `passo2` tem um roxo mais claro que
os outros dois quadros não têm. Num ciclo `parado → passo → parado → passo2`,
ornamento que só existe em metade dos quadros **pisca**. Pode não se ver a 64 px
— mas é olhando que se sabe, não medindo.

**Estado:** só o **sul** foi regerado. Norte e leste do Feiticeiro continuam com
a máscara antiga, então **as direções não combinam entre si** — 4 gerações
fecham a classe. Arqueiro e Assassino ainda são 6 cada.

🆕 **`SO_DIRECOES=south` existe agora** no gerador, e foi o que fez este teste
custar 2 gerações em vez de 6. ⚠️ Ele também é a peça que faltava para consertar
**o cajado que boia na morte do Feiticeiro** a leste e oeste (item 2 do "não foi
consertado"): agora dá para escopar sem apostar o sul e o norte, que estão bons.

**Depois disso**, na ordem combinada com o dono:
1. **Outfits passo 3c** — a escolha na criação, com **paleta ampla** (aprovado)
2. **Rosto do Feiticeiro** — ele não tem rosto em direção nenhuma; o capuz é um
   vazio quase-preto, e como quase-preto é grupo 0, **outfit não conserta**
3. **Aparência por tier de equipamento**, reusando os grupos de outfit — barato
4. **Arma na mão por camadas** — o caro, e Medivia confirma que é esse o caminho

---

## Estado de 2026-08-11 — três consertos, NENHUM visto em tela

🔴 **PRIMEIRA COISA: subir o jogo e olhar.** Os três consertos abaixo foram
verificados por **medição** e por 445 testes, e nenhuma das duas coisas prova
nada em arte — foi a lição da sessão inteira de 10/08. O dono disse que testaria
depois.

```bash
ELYSIA_DEV_ACCOUNT=Frank VITE_DEV_ACCOUNT=Frank npm run dev:test
# jogo:    http://localhost:5173
# arte:    http://localhost:5173/sprites-preview.html
```

⚠️ **Backup do banco antes de entrar.** Existe um de 10/08 23:48 em
`server/data/elysia-backup-20260810-2348.db`.

**O que olhar, e o que deveria ter mudado:**

| O quê | Antes | Agora | Visto? |
|---|---|---|---|
| Arqueiro andando **para o sul** | saltava 3 px a cada passo | pé cravado no chão | ⏳ |
| Feiticeiro e Assassino andando | tremiam 1 px | idem | ⏳ |
| Qualquer classe **morrendo** | o Arqueiro pulava 3 px ao morrer | tomba sem pulo | ⏳ |
| **Entrar no mundo** | herói fora do enquadramento | câmera já nasce nele | ⏳ |
| **Qualquer classe andando** | deslizava — 2 quadros, mesma perna | 4 quadros, pernas alternando | ⏳ |
| **Arrastar item para o chão** | travava o personagem andando sem parar | para normalmente | ✅ dono |
| **Clicar numa pilha no chão** | não fazia nada — só arrastar pegava | pega (anda até lá se preciso) | ✅ dono |
| **Bolsa em cima de moita** | clique ia para a moita, espólio inalcançável | item vence nó | ✅ dono |

### 🎨 O sistema de OUTFITS começou — passos 1 e 2 de 4

📖 O plano inteiro está em [`PLANO-OUTFITS.md`](./PLANO-OUTFITS.md). Resumo do
que já existe:

| | O quê | Onde |
|---|---|---|
| ✅ 1 | Grupos coloríveis por classe, 3 cada | `tools/outfit-grupos.mjs` → `grupos.json` |
| ✅ 2 | O cliente recolore, preservando o sombreado | `client/src/heroes.ts` |
| ✅ 3a | Tipo, peneira e campo do snapshot | `shared/src/outfit.ts` |
| ✅ 3b | Banco (schema **v5**) e o outfit no snapshot | `server/src/store/` |
| ⏳ **3c** | **A escolha na criação de personagem** | **é o que falta** |

🔴 **O cano está inteiro entre o banco e o desenho — falta só a torneira.** Um
personagem com `outfit` gravado já viaja no snapshot e já seria desenhado
colorido. O que **ninguém consegue** é escolher: não há interface.

**O que o 3c precisa:**
1. Seletor de cores na tela de criação (o Doc 1 já prevê "Customização visual"
   entre sexo e nome). As cores e a quantidade são `⚠️ REFERÊNCIA`.
2. O `create-character` do protocolo carregando o outfit, passado por
   `sanitizeOutfit` **no servidor** — o cliente nunca é confiável.
3. `makeEntity` usar `e.outfit` do snapshot em vez do `?outfit=` da URL.

⚠️ **Trocar cor DEPOIS continua PENDENTE** no Doc 1 — não invente barbeiro.
⚠️ **`13.10`: aparência nunca altera estatística.** Está escrito em quatro
lugares do código; se o outfit aparecer dentro de `recompute` ou `combat`, é bug.

🔴 **Para VER o passo 2 agora**, sem nada mais existir:
`http://localhost:5173/?outfit=8c2f2f,2f2f38,d8c070`. Sem o parâmetro o jogo
desenha **exatamente como antes** — recolorir é opt-in até haver escolha.

🔴 **O modelo do Tibia (cabeça/tronco/pernas/pés) NÃO transfere**, e está medido:
o cinza da armadura do Knight vai de `y=4` a `y=59` — elmo, peito e greva são a
mesma cor, e nele não existe "cor da perna". O que separa é o **matiz**, então
cada classe tem os **seus** grupos. Não tente dividir por altura de novo.

**O que falta no passo 3**, e as armadilhas que ele já tem nome:
- `EntitySnapshot` precisa carregar o outfit, **pela mesma razão do
  `weaponType`**: o cliente sabe o do próprio jogador, não o dos outros.
- Colunas novas no personagem. 🔴 **A migração confere o SCHEMA, não o
  `user_version`** — armadilha nº 3 do projeto, use `Store.hasColumn()`.
- A escolha entra na criação de personagem, onde o Doc 1 já prevê
  "Customização visual". ⚠️ **Trocar depois continua PENDENTE** — não invente
  barbeiro. E `13.10`: aparência **nunca** altera estatística.

### 🔴 O que NÃO foi consertado, e por quê

1. **Golpe fraco do Arqueiro e do Assassino.** Duas hipóteses testadas, 6
   gerações gastas, as duas falharam — estão inteiras no **beco nº 7** de
   `tools/pixellab/gerar-classe.mjs`. Abrir a máscara **destrói o personagem**
   (voltou outro sujeito, de capa e espada, sem arco); mudar o texto do gesto
   **não move nada**. Se houver saída, é **outro endpoint, não outro prompt** —
   não gaste geração repetindo prompt.
2. **O cajado do Feiticeiro boia no ar** na morte para leste e oeste. Está
   gravado no PNG de origem, então nenhum conversor desfaz. ⚠️ `SO_MORTE=1`
   regenera **as quatro direções**, e o sul e o norte dele estão bons — regerar
   sem escopar aposta arte boa para consertar arte ruim. Escopar exige um
   `SO_DIRECOES` no gerador.
3. **`idle` e `hurt`** continuam faltando no pack, com as quedas conhecidas.

### 🔴 O REPOSITÓRIO É PÚBLICO — e os documentos assumem que não

Verificado em 11/08 pela API do GitHub **sem autenticação**: `private: False`,
desde 29/07. O `.gitignore` deste repositório diz, em texto, que os assets são
versionados *"de propósito: ele é PRIVADO, então versioná-los não é
redistribuição pública"*, e traz um aviso — *"se algum dia este repositório
virar PÚBLICO, revise as licenças ANTES"* — que **já venceu**.

O `CREDITS.md` lista dois packs, e os dois têm restrição escrita: o tile set da
redspark é **"não revender"**, o pack de 100 árvores é **"Não redistribuir"**. E
está desatualizado — não lista os cinco packs de classe, os cristais/árvores da
CraftPix nem o MiniWorld.

⚠️ **O conserto barato é tornar o repositório privado**, o que restaura a
premissa sem custo de trabalho. A decisão é do dono e do irmão. Enquanto isso:
**nunca commitar segredo aqui** — não existe "privado" para cair de volta.

⚠️ **O token do PixelLab mora em `.env` na raiz** (ignorado pelo git, linha 5).
Carregue **dentro do mesmo comando**, porque o shell não guarda estado entre
chamadas:

```powershell
$env:PIXELLAB_TOKEN = ((Get-Content .env | Select-String '^PIXELLAB_TOKEN=') -replace '^PIXELLAB_TOKEN=',''); node tools/pixellab/gerar-classe.mjs archer
```

💳 **397 de 2000 gerações** usadas em agosto.

---

## 🎨 10/08 (noite) — NASCEU UMA LINHAGEM DE ARTE NOVA. Leia isto antes de tudo.

As quatro classes têm um pack **novo, em pixel art de verdade**, gerado pelo
**PixelLab**. Ele está pronto para julgar e **NÃO está ligado no jogo** — o
porquê está três parágrafos abaixo, e é a coisa mais importante desta seção.

| | Arte em uso hoje | Pack PixelLab |
|---|---|---|
| Célula | 60×60 | **64×64** |
| Corpo dentro dela | **25×29 px** (12 de largura andando!) | **~58 px de altura** |
| Pixels opacos | ~400 | **~1200** |
| Escala no jogo | 2,0× | **1,0× — sem ampliação nenhuma** |

🔴 **É pixel art autoral, não render 3D reduzido**, com transparência nativa e no
ângulo `high top-down`, que é o do jogo.

### ✅ O GOLPE ENTROU — mesmo truque do passo, na faixa da ARMA

`inpaint` mascarando o lado da arma. As quatro classes têm `attack_*` agora:
`sword` (Knight), `staff` (Feiticeiro), `bow` (Arqueiro), `dagger` (Assassino) —
e **todas gravam também `attack_sword`**, porque `attackPoseFallback` termina a
cadeia nele e classe sem esse arquivo perde o golpe inteiro. **O nome do arquivo
é o SLOT, não a arma desenhada.**

🔴 **Duas armadilhas novas, e as duas custaram caro:**

- **A máscara tem que conter o DESTINO, não só a origem.** Mascarei `y 18..58`,
  exatamente onde o braço já estava, e **a espada não subiu** — não havia máscara
  acima do ombro para ela ocupar. Começando em `y = 0`, sobe.
- **O lado da arma é POR CLASSE.** Mascarei a esquerda para todos, porque é onde
  o Knight segura a espada: deu certo **nele** e falhou nas outras três. O cajado
  do Feiticeiro nasce na **direita**; Arqueiro e Assassino usam os **dois**
  braços. Golpe fora da máscara não acontece.

⚠️ **Resultado honesto:** o Knight ergue a espada e lê muito bem; o Feiticeiro não
levanta muito o cajado, mas **o cristal acende** e funciona; Arqueiro e Assassino
são os mais fracos, com gesto curto.

### ✅ A MORTE ENTROU — e o esqueleto voltou, agora no lugar certo

`animate-with-skeleton`, o endpoint descartado na caminhada. 🔴 **O motivo de ele
servir aqui é o mesmo de não servir lá:** ele **regenera o corpo**. Na caminhada
isso apagava o escudo, numa animação que roda o tempo todo; na morte o corpo
**tem** que mudar inteiro, e a animação é **terminal** — acaba num monte no chão,
congelado para sempre. E `inpaint` não serviria: não há região a preservar.

O esqueleto **tomba girando em torno dos pés**, em 3 quadros. Visto no Knight: em
pé → cambaleando → **corpo deitado** (a altura cai de 58 para 24 px, a largura vai
a 58). O último quadro é o cadáver.

🔴 **Duas armadilhas:** o corpo caído **sai do quadro** se a pose não for
recentrada em x (girar em torno dos pés desloca o tronco quase o corpo inteiro), e
**`z_index` tem que ser inteiro** — o `estimate-skeleton` devolveu `-0.5` no
Assassino e a API respondeu 422, deixando a classe com **morte pela metade**, com
o erro aparecendo só na direção em que o estimador usou meio nível.

### 🔴 A ARTE NOVA ESTÁ LIGADA NO JOGO (decisão do dono, 10/08)

`client/src/heroes.ts` aponta para **`/assets/classes-pixellab`**, e as cinco
constantes foram trocadas juntas:

| | pack antigo | **em uso** |
|---|---|---|
| `CELL` | 60 | **64** |
| `CONTENT_H` | 30 | **58** |
| `FEET_Y` | 44 | **60** |
| `CENTER_X` | 29.5 | **31.5** |
| `TARGET_H` | 60 | **58** |

🔴 **`TARGET_H === CONTENT_H` → escala 1,0×.** O sprite é desenhado no tamanho em
que foi criado: **não existe serrilhado de escala quando não há escala.** Era o
defeito nº 1 desta sessão, e ele deixou de existir em vez de ser atenuado.

⚠️ **As cinco andam juntas.** Trocar a pasta sem trocar os números (ou o
contrário) enterra ou levanta as quatro classes de uma vez. O pack antigo
continua versionado em `/assets/classes` para voltar atrás.

⚠️ **Falta `idle` e `hurt`, e os dois têm queda conhecida:** sem `idle` o motor
congela no quadro 0 do `walk`, que é justamente a pose parada; sem `hurt` ele
pisca vermelho, como sempre fez. Nada quebra.

🔴 **NÃO FOI VISTO EM TELA.** Typecheck limpo e 445 testes passando não provam
nada aqui — é arte, e esta sessão inteira é a prova de que o que quebra em arte
só aparece jogando. **Primeira coisa a fazer:** subir o `dev:test` e abrir
`http://localhost:5173/sprites-preview.html`, depois entrar no mundo.

### 🆕 O que existe

| Onde | O quê |
|---|---|
| `tools/pixellab/gerar-classe.mjs` | gera o pack — 4 direções + o 2º quadro do passo. **6 gerações por classe** |
| `tools/pixellab2strip.mjs` | converte em `walk.png` + `pose.png`, mesmo layout do `frames2strip` |
| `arte-fonte/pixellab/<classe>/` | o pack cru das 4 classes, versionado |
| `client/public/assets/classes-pixellab/` | as tiras prontas |
| 📖 `docs/PIXELLAB-RECEITA.md` | 🔴 **leia antes de mexer** — a receita e os seis becos sem saída |

**Se um dia ligar**, as constantes de `client/src/heroes.ts` ficam: `CELL` 64 ·
`CONTENT_H` 58 · `FEET_Y` 60 · `CENTER_X` 31.5 · `TARGET_H` **58**.
`TARGET_H = CONTENT_H` faz a escala ser **1,0×** — não existe serrilhado de
escala quando não há escala.

### ⚠️ Os seis becos — ~44 gerações, para ninguém repetir

Inteiros em `docs/PIXELLAB-RECEITA.md`. Os que mais custaram:

1. **`animate-with-text` solto → o Knight criou ASAS**, e a paleta pulou de 80
   para ~1500 cores. **A arma vem da imagem de referência, NUNCA repetida no
   texto** — foi o texto que virou asa. E **`color_image` trava a paleta**.
2. **Amarrado demais → as pernas congelam.** Tirar o artefato tirou o passo
   junto. Os dois extremos falham.
3. **`animate-with-skeleton` anima as pernas de verdade** (18 keypoints), **mas o
   escudo do Knight some** — o modelo regenera o corpo a partir do esqueleto, e
   escudo não existe nele. Congelar braços e subir o guidance não resolveu.
4. 🔴 **Por isso a caminhada é `inpaint` só na faixa das pernas:** o que está
   fora da máscara **não pode** ser perdido. É a única forma em que a identidade
   é garantida por construção, e não por sorte. **2 quadros**, como o Tibia
   clássico. A máscara tem que ficar **abaixo de y=50** — mais alto, o escudo
   volta para a região redesenhada e se perde igual.
5. **`generate-image-pixflux` NÃO vira o personagem.** `direction` é *weakly
   guiding* e na prática é ignorado: pedir `north` devolve o mesmo sujeito de
   frente. **Só o `/rotate` vira.** Foi o erro que fez a 1ª versão do gerador
   entregar quatro poses bonitas e **uma direção só**.
6. **No `/rotate` os números são por tentativa:** `guidance 7.5` acerta o norte;
   no leste ele **duplica a cabeça** (dois elmos), e `guidance 5, seed 5` sai
   limpo. **O oeste é ESPELHADO do leste** — não gasta geração e garante simetria.

⚠️ **Leste e oeste saem em três quartos, não em perfil**, e **o norte só ficou
costas de verdade no Knight** (os números foram afinados nele). Parece limite do
modelo, não de parâmetro.

💳 **Conta:** 2000 gerações/mês, crédito pago em **US$ 0,00** — estourar
**falha, não cobra**. Token em `PIXELLAB_TOKEN`, **nunca no repositório**.

### 📋 E o que o ChatGPT entregou

O dono gerou 13 imagens. **Uma presta** — a prancha de referência do Knight, que
virou o design do pack novo. As outras 12 são tentativas de folha de animação e
não servem: **sem canal alpha**, quadros quase idênticos, linhas em
"frontal/lateral/3-4" em vez das 4 direções do jogo, personagem trocando de arma
entre folhas, e **texto queimado dentro do PNG**. É limite de gerador de imagem,
não erro de prompt — ver `docs/PROMPT-ARTE-CLASSES.md`.

### 🎯 De onde continuar

1. ⏳ **Olhar `classes-pixellab/` e decidir se troca.** É a decisão que destrava
   o resto.
2. ⏳ **`attack_*` pelo mesmo truque do passo:** `inpaint` na faixa do **braço**
   da arma, em vez da perna. É o próximo passo natural e o mais provável de dar
   certo.
3. ⏳ **`death` é o caso difícil** — o corpo inteiro muda, então máscara não
   protege nada. Pode continuar vindo do pack antigo.

---

## 🔍 10/08 — A ARTE DE CLASSE FOI MEDIDA, e dois defeitos saíram sem arte nova

O dono disse que os personagens estavam feios. Foi medida a caixa de alpha de
todos os quadros dos cinco packs, e o "feio" tem três causas separadas — duas
delas eram do CÓDIGO, não da arte, e já estão corrigidas.

⚠️ **NÃO VISTO EM TELA.** Testes e medição confirmam; abrir
`http://localhost:5173/sprites-preview.html` é o que falta.

### ✅ 1. A escala deixou de ser fracionária

`TARGET_H` em `client/src/heroes.ts` era **64** para um conteúdo de 30 px →
**2,133×** com filtragem `nearest`. Nessa escala **um pixel do desenho vira 2 na
tela e o vizinho vira 3**, em faixas alternadas: é o que picotava a silhueta.
Agora é **60**, ou seja **2,0× exato**. Custa 4 px de altura de herói.

🔴 **`TARGET_H` tem que continuar sendo múltiplo inteiro de `CONTENT_H`.**

### ✅ 2. O pé parou de tremer

O chão vinha entre **y=42 e y=45** conforme o quadro, a direção e a classe, mas o
carregador ancora num valor fixo (`FEET_Y = 44`) — o herói tremia ~1 px de quadro,
2 px de tela depois da escala.

`tools/frames2strip.mjs` agora **mede o chão de cada quadro e desloca o quadro
inteiro** para a sola cair em `GROUND_Y = 44`. Resultado medido: **Δ0 em 30 das
32 tiras**.

🔴 **As duas exceções são de propósito, e é a parte que importa entender.** No
`attack_staff` do Knight e do Assassino a conjuração desenha um efeito mágico
**abaixo dos pés**, e o chão medido cai para 47..52. Alinhar por ele levantaria o
herói até 8 px no meio do golpe. Por isso o deslocamento é **rejeitado** (dy = 0)
quando passa de `ALIGN_MAX = 3` — quadro cuja medição não é confiável fica como
veio. Rejeitar, não clampar: corrigir pela metade seria pior que não corrigir.

⚠️ **`GROUND_Y` do conversor e `FEET_Y` do `heroes.ts` são o MESMO número em dois
arquivos.** Mudar um sem o outro enterra ou levanta as quatro classes de uma vez.

### ❌ 3. O que NÃO foi corrigido, e por quê

**O centro horizontal continua sendo média medida** (`CENTER_X = 29.5`). Ele
varia 3 a 5 px dentro do ciclo de passos, mas essa variação **é a perna
alternando** — normalizá-la como se fosse erro congelaria a caminhada. O valor
atual bate com o medido (28..32).

**E a causa raiz continua de pé: a arte é pequena demais.** O herói é um desenho
de **25×29 px** (12 px de largura no meio da caminhada), ~400 pixels opacos e ~40
cores, ampliado 2×. Não há detalhe para mostrar. Os dois consertos acima tiram o
serrilhado e o tremor; **não inventam resolução**.

📖 **O formato a pedir para a arte nova está em
[`SPEC-SPRITES-CLASSES.md`](./SPEC-SPRITES-CLASSES.md)** — célula 96×96, corpo de
64 px, sola sempre na mesma linha (escala vira 1,0×), mais o que pedir ao gerador
3D que produziu estes packs e por que **não** pedir folha de sprite a gerador de
imagem.

---

# Handoff — estado do projeto em 2026-08-09

## 🗡️ 09/08 — AS QUATRO CLASSES TÊM CORPO. Leia isto antes de tudo.

O dono enviou cinco packs de herói (Knight, Sorcerer, Archer, Druid e um
*Human rogue* que virou o Assassino). As quatro classes jogáveis saíram dos
bonecos 16x16 e ganharam arte HD com andar, parado, golpe e morte nas quatro
direções.

### 🚀 Para quem for continuar — os 60 segundos

```bash
git pull
npm install                 # nenhuma dependência nova foi adicionada
npm run typecheck           # limpo nos 3 pacotes
npm test                    # 457 em 12/08 (433 shared + 24 server). Eram 445 em 09/08
ELYSIA_DEV_ACCOUNT=suaconta VITE_DEV_ACCOUNT=suaconta npm run dev:test
```

Depois abra **`http://localhost:5173/sprites-preview.html`** antes do jogo: é a
página de conferência da arte, e mostra em 10 segundos o que 445 testes não
mostram.

⚠️ **As duas variáveis são obrigatórias** — o servidor lê `ELYSIA_DEV_ACCOUNT`, o
cliente lê `VITE_DEV_ACCOUNT`. Só a primeira faz a tela de login responder
"Usuário ou senha inválidos", que parece problema de conta e não é.

⚠️ **Backup do banco antes de entrar no mundo:** `server/data/elysia.db`. Já
existe um de 09/08 na mesma pasta.

**Três coisas prontas para você pegar, em ordem de tamanho:**

| O quê | Onde começar | Tamanho |
|---|---|---|
| `tileset.ts`: areia, terra e piso de pedra apontam para o **mesmo retalho** do `Ground.png` | `client/src/tileset.ts` | pequeno |
| Devolver espécies ao mundo — hoje osso, escama, chifre, garra e presa **não têm origem**, e receitas do Doc 4 ficam sem insumo | `_removidos` dentro de `shared/data/world/creatures.json` | médio |
| A câmera não nasce centrada no herói (ver abaixo) | inicialização da câmera em `client/src/main.ts` | desconhecido |

🔴 **O que NÃO pegar sem falar com o dono:** montar o vilarejo (ele traz os packs
de casa) e mexer no `SAFE_ZONE_RADIUS`, que depende das casas.

### 🔴 Se você só for ler três coisas

1. **Os packs chegam com UM PNG POR QUADRO** — 1.045 arquivos. Existe um
   conversor, `tools/frames2strip.mjs` (`npm run sprites:build`), que os
   transforma em **tiras**, uma por animação, com uma linha por direção. É o
   mesmo formato do MiniWorld de propósito: o corte é o código que já existia.
   Fonte em `arte-fonte/classes/`, saída em `client/public/assets/classes/`.
   **Não edite a saída** — ela é gerada.
2. **O golpe segue a ARMA EQUIPADA.** `EntitySnapshot` ganhou `weaponType`, e
   `shared/src/heropose.ts` traduz os 8 tipos de arma nas 5 animações que a arte
   entrega. Tem teste de exaustividade: adicionar um nono tipo de arma sem arte
   quebra o teste, em vez de o herói parar de animar em silêncio.
3. **A arte HD vence tudo**: `client/src/heroes.ts` entra antes do `knight.ts` e
   do MiniWorld em `main.ts`. Classe sem pack cai no MiniWorld, como antes.

### 🐛 BUG PRÉ-EXISTENTE ACHADO AO OLHAR (não é da arte nova)

🔴 **A câmera não nasce centrada no herói.** Entrando no jogo, o mundo aparece e
o personagem quase sempre **não** — ele está desenhado, só que fora do
enquadramento. Basta clicar para andar que a câmera salta para ele e nunca mais
erra.

⚠️ A primeira leitura foi "o sprite não é desenhado", e estava errada: numa das
entradas o herói apareceu em tela, mas **no canto**, com a viewport centrada em
outro ponto. O sintoma varia com a posição salva do personagem — perto da borda
do enquadramento ele aparece, longe some.

**Foi confirmado por A/B que NÃO é da arte nova:** com `COM_ARTE` esvaziado em
`heroes.ts`, caindo no sprite antigo, o sintoma é idêntico. Ou seja, já estava
lá antes de 09/08 e ninguém tinha visto — é mais um da família "só aparece
jogando". Não investiguei a causa; fica registrado.

### ⚠️ O que a animação por arma REALMENTE faz

Ela troca a **postura**, e nos packs bons troca também a arma desenhada. O
Archer com arco desenha o arco, com lança desenha a lança; o Sorcerer conjura
com efeito mágico; o Assassino estoca com adaga.

⚠️ **O Knight é a exceção:** as animações de arco e de cajado dele mantêm
**espada e escudo na mão** — o gerador não trocou o equipamento nesse pack. Um
Knight de arco vai fazer o gesto de sacar a flecha segurando a espada. É
limitação da arte, não do código: reexportar o pack do Knight conserta sem tocar
em uma linha.

### 🆕 Botão "⇦ Trocar personagem"

No topo da barra direita. Sai do mundo e volta para a **lista de personagens**,
onde dá para entrar com outro ou criar um novo — era a única forma de ver as
outras três classes andando no mundo, já que só havia knights no banco.

🔴 **Ele RECARREGA a página, e isso é decisão, não preguiça.** Não existe
teardown do jogo: `startGame` tem ~3.300 linhas e vai declarando, ao longo delas,
o estado que os handlers usam — foi o que causou o *"Cannot access 'goldEmMao'
before initialization"* de 01/08. Escrever um teardown só para este botão trocaria
um problema resolvido por uma classe inteira de bugs de estado meio-desmontado.
A recarga dá estado limpo de graça, e o servidor salva na queda do socket, que é
o mesmo caminho de quem fecha a aba.

Três passos, e cada um tem motivo: `net.leaveCharacter()` (senão o `NetClient`
reentra sozinho no mesmo personagem, porque ele guarda o `characterId`), uma
marca em `sessionStorage` (para o próximo boot parar na lista em vez de o
auto-login entrar no primeiro personagem), e o `reload`.

⚠️ **Sem o auto-login de desenvolvimento, o botão cai na tela de LOGIN** e pede
senha de novo — o cliente não guarda senha, de propósito. Voltar direto para a
lista exigiria sessão persistente (token), que o jogo não tem.

✅ **Visto em tela:** botão → lista de personagens → "Novo personagem" → os
quatro cartões com a arte HD nova.

### 📋 A página de conferência

`client/public/sprites-preview.html` — abre em `http://localhost:5173/sprites-preview.html`
e mostra as 4 classes × 4 direções × 8 animações, animadas, lendo **as mesmas
tiras que o jogo lê**. Foi assim que os buracos abaixo foram achados. Quando
chegar arte nova, é a primeira parada.

### ⚠️ Buracos dos packs, e como estão tapados

| Buraco | Como está |
|---|---|
| `Taking_Punch` (dano) só tem **sul** nos cinco packs | a tira **não é gerada**; o motor pisca vermelho, como sempre fez |
| Idle do Knight e do Assassino só tem **sul** | direções que faltam usam a **pose parada** daquela direção |
| 🔴 **`Walking` do Assassino só tem sul** | ele **desliza sem mexer as pernas** para cima/lados. Reexportar o pack conserta |
| Assassino não tem lança; ninguém além dele tem adaga | cai no golpe de espada (`attackPoseFallback`) |
| Archer veio com a pasta de lança duplicada | o conversor fica com a que tem mais direções |

### ⚠️ Duas coisas que NÃO mudaram, de propósito

- **O sexo não troca o sprite.** Os packs têm um corpo só por classe. A escolha
  continua existindo, salva e viajando no snapshot, esperando variante feminina.
  O ícone da tela de criação parou de mudar com o sexo por isso.
- **Druid não virou classe.** `PlayerClass` tem quatro, e druida não está nos
  docs. A arte fica em `arte-fonte/classes/Druid_class_hero_wears_leaf/`,
  esperando decisão — sem virar asset morto.

### 🎯 De onde continuar

1. ⏳ **Reexportar o `Walking` do Assassino** com as 4 direções (e, se der, o
   `Taking_Punch` de todos). É só rodar `npm run sprites:build` depois.
2. ⏳ Reexportar o Knight com arco/cajado segurando a arma certa.
3. ⏳ O bug do herói invisível na entrada.
4. ⏳ O que já estava na fila de 06/08: montar o vilarejo, devolver espécies ao
   mundo, e o `tileset.ts` (areia/terra/pedra no mesmo retalho).

⚠️ **`npm test` agora tem que dar 445** (425 shared + 20 server).

---

# Handoff — estado do projeto em 2026-08-05

## 🎨 05/08 — A ARTE ENTROU, E O VILAREJO SAIU. Leia isto antes de tudo.

Sessão inteira de **arte vista em tela**, com o dono ao lado corrigindo a cada
passo. Quase nada aqui saiu de roadmap; saiu de olhar e ajustar.

### 🔴 Se você só for ler três coisas

1. **Tibia NÃO é isométrico.** É grade quadrada vista de cima, com deslocamento
   2.5D nos objetos altos — que é exatamente o que este motor já faz. Dois packs
   isométricos foram baixados e descartados por isso (o Godot Starter Kit e os
   dois Kenney *miniature*). Não recomece essa investigação: o custo real não é
   o código da projeção, é a ARTE — herói e as 23 criaturas ficariam em estilo
   conflitante, e o pack Kenney traz personagem de **uma direção só**, sem
   ataque nem morte.
2. **`MUNDO_SO_CAMPO = true`** em `shared/src/worldgen.ts` — o mundo virou
   **campo verde inteiro**. Sem mar, sem deserto, sem neve, sem as 11 cidades.
   É **temporário e reversível numa linha**: `regions.ts` está intacto com as 12
   regiões, 11 cidades e 6 dungeons. ⚠️ **Dois lugares leem a chave**
   (`pintaBiomas` e `chaoBaseEm`); esquecer o segundo já causou bug.
3. **O vilarejo de Lumindale foi APAGADO** — muralha, portões, praça de pedra e
   as sete casas. Sobrou grama e uma **praça segura** de raio 12 no meio, com os
   três NPCs. O vilarejo vai ser remontado com packs de casa.

### ✅ O que entrou de arte

| O quê | Onde | Detalhe |
|---|---|---|
| **Cristais/minério** (CraftPix) | `client/src/crystals.ts` | 8 cores, **cor pelo BIOMA** |
| **Árvores** (CraftPix) | `client/src/trees.ts` | conjunto por bioma, tamanho variado |
| **Medição de sprite** | `client/src/spritebox.ts` | 🔴 leia abaixo |
| **Conversor Tiled → jogo** | `tools/tmx2world.mjs` | `npm run map:build` |

🔴 **`spritebox.ts` é a peça que mais importa entender.** Os packs deixam muita
transparência em volta do desenho, e a sobra é **diferente em cada arquivo**.
Tratar a moldura do PNG como se fosse a arte causou dois bugs que só apareceram
em tela: a árvore **boiava acima da própria sombra** (o dono descreveu como
"sombra um grid abaixo"), e **tudo saía com metade do tamanho pedido** — três
ajustes de tamanho seguidos erraram o alvo por isso. Agora o carregador mede a
caixa de alpha, e "largura em tiles" vale para o que se vê.

⚠️ **Não use `Assets.load` do Pixi para estes PNGs**: ele renderiza a
transparência como PRETO. Passe pelo canvas 2D do `spritebox`. E `loadImage` usa
`onload`, nunca `img.decode()` — em aba oculta o `decode()` não resolve nunca e o
jogo trava na tela preta.

### 🔢 Baseline visual APROVADO — não mexa sem o dono pedir

Custou ~6 rodadas de ajuste com ele vendo cada uma:

| Item | Valor |
|---|---|
| Árvore grande / pequena / arbusto | **4.2 / 2.8 / 1.2** tiles de copa |
| Veio de minério / de cristal | **0.65 / 0.7** tile |
| Densidade da planície | **0.008** (era 0.05 — a copa larga cobre 9× mais chão) |
| Praça segura (`SAFE_ZONE_RADIUS`) | **12** |
| Respawn de criatura | **45 s** (era 8 s) |

### 🔴 A praça segura, e o que ela substituiu

Enquanto havia muralha, a **arquitetura** protegia o novato. Agora a regra é a
única proteção: dentro do raio 12, **monstro não entra, monstro não ataca e
jogador não fere jogador**. Vale para TODA criatura, não só chefes com
`avoidCenter`.

⚠️ **Ela é INVISÍVEL.** Cheguei a desenhar um círculo e o dono pediu para tirar.
O plano é as **casas** marcarem o limite quando o vilarejo for montado — se não
cobrirem o raio inteiro, o marcador volta a fazer falta.

⚠️ Quando as casas entrarem, o raio 12 provavelmente precisa **encolher**: vila
inteira sem PvP é refúgio, não vila.

### ⚠️ O que se perdeu junto, e é honesto saber

- **A única escada do mundo aberto.** O Depósito tinha segundo andar e era o
  único lugar que exercitava `floors` + `floorLinks` — o mesmo mecanismo das
  dungeons. Os dois testes dele foram reescritos sobre um **mapa sintético**
  para o motor não ficar sem cobertura, mas nada no mundo o usa.
- **17 espécies de criatura.** A lista caiu de 32 spawns/21 espécies para
  **10 spawns/4 espécies** (Slime Verde, Slime Azul, Zumbi, Super Slime longe).
  Com elas foi a única origem de osso, escama, chifre, garra e presa — receita
  do Doc 4 que dependa disso fica sem insumo. **Nada foi perdido**: a lista
  antiga está em `_removidos`, dentro do próprio `creatures.json`.
- **As 10 cidades genéricas** (praça + muralha do `marcaCidade`). A função
  continua no arquivo, sem chamador, como documentação executável.

### 🆕 O Tiled virou o editor de mapa

`tools/tmx2world.mjs` lê um `.tmx` e escreve o JSON que os dois lados importam.

🔴 **Por que há um passo de conversão** em vez de o jogo ler o `.tmx`: o terreno
**não trafega pela rede** — cliente e servidor *calculam* o mesmo mundo, e é isso
que sustenta "nó de recurso é ENTIDADE, não tile". Ler `.tmx` no navegador em
runtime quebraria essa invariante. Então o `.tmx` é o formato de **autoria** e o
JSON é o que o jogo importa, versionado.

Duas decisões dele que valem: a tradução é **`(camada, gid) → tile`**, não
`gid → tile` — o mesmo gid é parede na `Buildings` e marcador na `Collision`; e a
camada **`Collision` é CONFERIDA, não aplicada**, porque solidez vem do tipo do
tile nos dois lados, e duas fontes de verdade fariam o jogador atravessar parede
no cliente e travar no servidor.

### 🎯 De onde continuar (06/08)

1. ⏳ **Montar o vilarejo** dentro da praça — o dono traz packs de casa.
2. ⏳ Reavaliar `SAFE_ZONE_RADIUS` quando as casas marcarem o limite.
3. ⏳ Devolver espécies ao mundo (o `_removidos` do `creatures.json`).
4. ⏳ `tileset.ts`: areia, terra e piso de pedra ainda apontam para o **mesmo
   retalho** do `Ground.png` — por isso o deserto parecia terra.

⚠️ **Antes de tudo:** `npm test` tem que dar **438** (418 shared + 20 server).

---

# Handoff — estado do projeto em 2026-08-02 (noite)

Resumo para quem for continuar o trabalho. Sete sessões registradas: **29/07**
(Etapa 8, bestiário do Doc 3, crafting), **30/07 manhã** (aba Vender, colisão,
clique para andar, banco, curva de nível), **30/07 noite** (as 4 pendências que
travavam código, Doc 4: Affix/Material/Drop Bible, fabricação completa),
**30/07 madrugada** (o catálogo de equipamento inteiro ganhou números, e as
regras de Party), **01/08** (layout, e a primeira leva de bugs achados JOGANDO)
**02/08 tarde** (coleta e mineração ligadas no mundo, e o mapa virou tabela) e
**02/08 noite** (a sessão abaixo: **o mundo de 300×300 existe, e Valoria acabou**).

---

## 🌍 02/08 (noite) — O MUNDO EXISTE. Leia isto antes de tudo.

O **passo 2** do plano de mundo está feito: o terreno de 300×300 é gerado de
`regions.ts` e **Lumindale substituiu Valoria** como vilarejo inicial.

### 🔴 A PRIMEIRA COISA A FAZER: entrar no jogo e olhar

**O mundo novo continua sem conferência em tela.** O servidor sobe (32 criaturas,
97 nós), o cliente carrega sem erro de console e 436 testes passam — mas isso não
é o mesmo que funcionar.

O que aconteceu: o agente não digita senha, e o auto-login de `dev:test` estava
preso à conta `maxmurtesvieira`, que não existe no banco daquela máquina. O jogo
chegou a ser aberto pelo dono no fim da sessão (com
`ELYSIA_DEV_ACCOUNT=Frank`), mas **ele não chegou a percorrer a lista abaixo** —
então nenhum dos quatro itens tem resposta.

🔴 **Comece por aqui, e não por código.** É a sessão de 01/08 que ensina o porquê:
sete bugs saíram de jogar, e nenhum deles tinha teste que pudesse tê-los pego —
todos moravam entre a rede, o navegador e o desenho.

O que precisa de olho, em ordem de risco:

1. **Os pedaços entrando e saindo.** O cenário é montado por chunks de 16×16
   conforme a câmera anda. Em Valoria isso nunca foi exercitado de verdade —
   3.600 tiles cabiam inteiros na memória. Ande longe, em linha reta, e veja se
   aparece buraco, emenda ou engasgo.
2. **O piso debaixo das árvores**, agora que ele sai do bioma e não é mais grama
   fixa. É o mesmo caminho do bug do quadrado preto.
3. **Sair de Lumindale pelos quatro portões** e voltar.
4. **Coletar** — os 21 nós à mão e as 76 árvores marcadas mudaram de lugar.

⚠️ **Backup do banco antes:** `server/data/elysia.db`. Já existe um de
2026-08-02 22:03 na mesma pasta.

⚠️ **Personagem antigo nasce em Lumindale, não onde parou.** A posição salva era
de Valoria e não existe mais; `applyStoredCharacter` devolve para a cidade de
renascimento e escreve uma linha no log do servidor dizendo isso. Se um
personagem aparecer em outro lugar, **é bug** — não é o comportamento novo.

**Como subir com auto-login na sua conta:**

```bash
ELYSIA_DEV_ACCOUNT=seuusuario npm run dev:test   # depois: http://localhost:5173
```

### ✅ O que o gerador faz

Tudo começa **mar**; cada tile pergunta a `regions.ts` quem o pinta; praia onde a
terra encosta no mar; decoração por bioma com PRNG de semente fixa; as 10 cidades
ainda não desenhadas ganham praça, muralha e portões; **Lumindale é desenhada à
mão** por cima de tudo, traduzida do `vilarejo-inicial.png`.

Sete tiles novos (ids 9–15: neve, rocha, cinza, selva, pântano, corrupção, lava).
Nenhum tem arte — caem no desenho por cor, como as criaturas-bolha.

### 🔴 Três coisas que parecem detalhe e não são

| O quê | Por que existe |
|---|---|
| **`RUIDO_FRONTEIRA = 9`** | sem ele o mundo é uma **colcha de retalhos**: região é retângulo, e retângulo pintado dá borda reta. O ruído entorta só a costura, inclusive a costa. `regionAt` continua respondendo pelo retângulo puro |
| **`REGION_REACH = 14`** | "tile que ninguém reivindica é água" ao pé da letra abriria um **canal cortando o continente** — sobram frestas de 5 tiles entre regiões vizinhas. O mar continua sendo o que sobra; o que sobra é o oceano externo |
| **Decoração nunca encosta em decoração** | é o que mantém floresta densa **atravessável**. Com dois sólidos nunca adjacentes, sempre há rota em volta. Baixar isso quebra o BFS do clique-para-andar sem aviso. Há teste travando |

### 🆕 Spawn, NPC e nó viraram ARQUIVO

`shared/data/world/{npcs,creatures,nodes}.json`, validados no boot — dado
inválido **derruba o servidor** com nome de arquivo e índice, em vez de virar NPC
mudo na praça.

🔴 É o que o **Elysia Map Editor** (passo 6) vai escrever. Em código, a próxima
geração do mundo apagaria em silêncio o que o dono posicionasse à mão. O
**terreno** continua em código de propósito: é gerado pelos dois lados e não
trafega pela rede, que é o que sustenta "nó é entidade, não tile".

### ⚠️ A fauna ainda não conhece as regiões

As 32 criaturas e os 21 nós são o povoamento de Valoria **deslocado em bloco**
(+130,+138) — a curva que o dono testou jogando, intacta. Consequência: a 32
tiles do berço ainda mora Tier III, e `regions.ts` declara aquele chão como
Campos de Valdor, **Lv. 1–15**. Terreno e fauna discordam de propósito;
distribuir por `species` é o **passo 4**.

### ✅ Dois consertos que vieram junto

- **Personagem salvo em Valoria não vai mais parar no oceano.**
  `applyStoredCharacter` confere se o tile salvo é andável e, se não for, devolve
  o personagem à cidade de renascimento. Vale para sempre, não só para esta
  virada.
- **O piso sob tile alto** virou o chão do bioma (`chaoBaseEm`), não mais grama
  fixa.

### 🎯 De onde continuar

1. ✅ ~~Motor aguentar mundo grande~~
2. ✅ ~~Gerador 300×300 + Lumindale~~ — **feito, não visto em tela**
3. ⏳ **Tecla M** — mapa-múndi com zoom, nomes e "você está aqui". Sai direto de
   `regions.ts`, sem ida ao servidor. É o próximo, e o mais barato.
4. ⏳ **Povoar as regiões** pelos campos `species` — é o que reconcilia fauna e
   terreno.
5. ⏳ **Dungeons** — o multi-andar já funciona; hoje só o Depósito de Lumindale usa.
6. ⏳ **Elysia Map Editor** — já tem onde escrever.

⚠️ **O que NÃO fazer ainda:** desenhar arte de cidade. Nove das onze são praça e
muralha genéricas, e vão ser redesenhadas.

---

## 🗺️ 02/08 (tarde) — O MUNDO DE ELYSIA COMEÇOU. Leia isto antes de tudo.

O dono entregou o **mapa oficial** (`map/mapa-oficial/`: o PNG do mundo, o
`message.txt` com as regiões, e as pranchas da capital e do vilarejo) e pediu
para **antecipar a etapa de mundo**. O trabalho começou; está no meio.

### 🔴 Quatro decisões do dono que REVOGAM documento

Estas valem como canônicas e contrariam o que está escrito nos docs antigos. Não
"conserte" de volta.

| Decisão | O que morreu |
|---|---|
| **A capital é ARCADIA** (Valdor é o **reino**) | o nome **Asteria**, do `GDD-doc1-destilado.md`, está descartado |
| **O mundo é inteiramente visível desde o início** | `DD-MAP-001/002` (névoa de guerra) — **revogado** |
| idem | `DD-MAP-009` (exploração pertence à conta) — **revogado**, não há mais estado de descoberta para persistir |
| **Valem as 6 dungeons do PNG** | a outra lista de 6, do `message.txt` |

O que protege o novato agora **não é a ignorância do terreno, é a distância**: o
jogador vê o mundo inteiro e não sabe o que mora em cada lugar.

### ✅ O mapa virou tabela — `shared/src/regions.ts`

**12 regiões · 11 cidades · 6 dungeons de 6 andares**, com 13 testes travando as
regras. É **dado autoral, não geração procedural**: ruído daria um mundo
plausível e errado, porque o mapa do dono tem intenção (capital no centro, gelo
ao norte, deserto a sudeste) e intenção não sai de PRNG.

🔴 **A trava de coerência que o dono pediu com todas as letras:** região a menos
de 40 tiles do berço não começa acima do Lv.30, e região de Lv.70+ fica a pelo
menos 60. **É de um lado só de propósito** — floresta fácil longe é legítima,
porque *bioma não determina nível*.

🔴 **A ordem da lista é PRIORIDADE.** Campos de Valdor (Lv.1–15) é um bolsão
manso encravado nas Planícies de Verídia (Lv.30–50) e vem antes justamente por
isso. Sem essa ordem, quem sai de Lumindale cai direto em conteúdo de nível 30.

🔴 **O mar não é região.** Tile que ninguém reivindica é água.

⚠️ `species` (existe hoje) e `wanted` (espera o bestiário crescer) são campos
**separados** para que nenhuma região pareça pronta e nasça vazia. Hoje só
Campos de Valdor, Floresta de Eldor e pedaços de Montanhas/Pântano/Amaldiçoadas
têm bicho; **7 das 12 regiões não têm nenhuma espécie**, e isso é honesto, não
esquecimento. O `64.51` fixa a ordem: bestiário fechado → faixas → números →
loot → sprites.

### ✅ O motor passou a aguentar mundo grande (o passo 1)

Duas coisas quebrariam **antes** de o mapa novo ficar bonito, e as duas foram
consertadas:

🔴 **O cliente montava o andar INTEIRO de uma vez** — um objeto por tile, por
parede e por árvore. Valoria tem 3.600 tiles e passava despercebido; Elysia tem
**90.000**. Não é lentidão, é a aba morrendo. Agora o cenário é montado **por
pedaços de 16×16** conforme a câmera anda (`montaChunk`/`atualizaChunks` em
`client/src/main.ts`): o custo passa a ser o **tamanho da tela**, não o do mundo.

🔴 **O servidor mandava o andar inteiro para todo jogador, 15× por segundo.**
Agora corta por distância (`SNAPSHOT_RANGE = 32`). Sem isso, o custo cresceria
com *tamanho do mundo × número de jogadores* — o jeito mais rápido de matar um
servidor de MMO.

⚠️ Dois detalhes que não são gosto e quebram se mexerem: o piso agora usa
`sortableChildren` com `zIndex` **por linha de pedaço** (o tile de 64 px numa
célula de 32 se sobrepõe obliquamente, e a ordem de inserção deixou de
acompanhar a geografia); e paredes/árvores continuam **soltas** em `objects`,
não agrupadas por pedaço, porque precisam ser ordenadas por `y` **junto com as
entidades** — agrupá-las faria o monstro à frente da árvore aparecer atrás dela.

✅ **Visto em tela:** o mundo renderiza contínuo, sem buraco entre pedaços.
⚠️ **NÃO visto:** andar longe para ver pedaço entrando e saindo, e o efeito do
corte de 32 tiles com dois jogadores.

### 🎯 De onde continuar — a ordem acordada com o dono

> ⚠️ **Esta lista é da tarde de 02/08 e os passos 1 e 2 já fecharam.** A versão
> viva está no bloco "🌍 02/08 (noite)", no topo do arquivo.

1. ✅ ~~Motor aguentar mundo grande~~ — **feito** (acima).
2. ✅ ~~**Gerador de terreno 300×300 a partir de `regions.ts`**, e **Lumindale
   substitui Valoria** como vilarejo inicial~~ — **feito na noite de 02/08.**
3. ⏳ **Tecla M** — mapa-múndi inteiro, com zoom, nomes e "você está aqui".
   Sem névoa: sai direto de `regions.ts`, sem ida ao servidor.
4. ⏳ **Povoar** as regiões que o bestiário cobre.
5. ⏳ **Dungeons** — os 6 andares descendo. O motor já tem multi-andar
   (`floors` + `floorLinks`), hoje usado só para a casa do vilarejo.
6. ⏳ **Elysia Map Editor** — programa separado pedido pelo dono: ver o mapa
   inteiro com zoom livre e **editar à mão** spawn de monstro, NPC e nó de
   coleta.

🔴 **O editor muda uma decisão de arquitetura, e o passo 2 já tem que nascer
sabendo disso:** o **terreno** continua gerado de `regions.ts` (determinístico,
não trafega pela rede — é o que sustenta "nós são entidades, não tiles"), mas
**spawn, NPC e nó viram arquivo** em `shared/data/world/*.json`. Se ficassem em
código, a próxima geração apagaria o que o dono editou à mão. Como dado
versionado, o irmão ainda vê no diff o que ele mudou.

⚠️ **Valoria deixa de existir** no passo 2, e a posição salva dos personagens
não vale mais. O dono já autorizou apagar os personagens de teste.

---

## 🆕 Sessão de 02/08 — a coleta saiu do papel

Era a próxima etapa apontada pelo handoff anterior, e fechou: os cinco nós de
`gathering.ts` existem no mundo, o jogador clica e coleta, e as seis famílias de
material que estavam inalcançáveis passaram a ter origem.

### ✅ Nós de recurso — as três peças que faltavam

| Peça | Onde |
|---|---|
| Nó como **entidade** (spawn, cargas, respawn) | `ResourceNode` + `spawnInitialNodes` + `respawnNodes` em `server/src/index.ts` |
| Mensagem no protocolo | `C2S_Gather` e `S2C_Gathered` em `shared/src/protocol.ts` |
| Desenho e clique no cliente | `makeNodeView` em `client/src/main.ts` |

**46 nós no mapa inicial:** 25 Árvores, 8 Veios de Minério, 5 Cogumelos, 5 Ervas
e 3 Veios de Cristal.

🔴 **Nós são ENTIDADES, não tiles — e a decisão continua valendo.** O mapa é
gerado deterministicamente pelos dois lados e não trafega pela rede: cliente e
servidor concordam porque *calculam* a mesma coisa. Trocar um tile ao cortar uma
árvore quebraria esse acordo na hora. Por isso **cortar não derruba a árvore** —
o que se esgota é o nó, e o tile continua sendo árvore.

🔴 **A madeira mora EM CIMA do tile de árvore, que é sólido.** Não se pisa nele;
alcança-se de qualquer um dos oito lados (`GATHER_RANGE = 1`, o mesmo de pegar
item e de saquear corpo). O desenho é um **machado fincado no tronco** — a árvore
já está lá, o que faltava era dizer quais dá para cortar.

**Onde nasce cada coisa** (`buildResourceNodes`, em `shared/src/gathering.ts` —
puro e determinístico, então reiniciar o servidor devolve os nós aos mesmos
tiles):

| Nó | Distância do nascimento | Ferramenta |
|---|---|---|
| Cogumelos | 11–12 | **nenhuma** — é a porta de entrada |
| Ervas | 12–18 | Foice (70 de ouro no Comerciante) |
| Minério | 14–24 | Picareta (90) |
| Madeira | 11+ | Machado **equipado** |
| Cristal | **32+**, no território do Tier III | Picareta |

🔴 **Nenhum nó nasce dentro da vila** (`NODE_MIN_SPAWN_DIST = 11`, o primeiro
tile fora da muralha). Recurso dentro dos muros faria o jogador coletar sem sair
do lugar mais seguro do mapa, e coleta que não expõe a nada é só um clique
repetido. Há teste travando isso, mais alcançabilidade, determinismo e o fato de
madeira cair em árvore e o resto em chão andável.

### 🆕 Três profissões novas — e elas NÃO foram inventadas

`Minerador`, `Lenhador` e `Herbalista` entraram em `ProfessionId`. O
**`DD-NPC-005` nomeia as três** ("Instrutor Minerador", "Instrutor Lenhador",
"Instrutor Herbalista") — o documento já as tratava como profissões; o que
faltava era a atividade que as pratica. Cristal treina Minerador (é picareta) e
cogumelo treina Herbalista (nenhuma profissão do doc colhe cogumelo, e criar uma
quarta para um nó só seria profissão de fachada).

⚠️ **O nível de coleta sobe e aparece, e nada mais depende dele.** O
`DD-PROF-023` só descreve o efeito do nível na FABRICAÇÃO. Ligar rendimento ou
chance de raro ao nível de coleta é decisão de balanceamento do dono.

⚠️ **`GATHER_COOLDOWN_MS = 1200` é REFERÊNCIA** — nenhum doc dá tempo de coleta.
Sem ele, um nó de 3 cargas se esvazia num clique triplo e coletar vira um botão.
O limite mora no JOGADOR, não no nó: guardado no nó, bastaria alternar entre dois
veios para burlá-lo.

### 🔴 Parar AO LADO, nunca em cima (pedido do dono, vendo em tela)

Clicar numa moita levava o personagem para **dentro** do tile dela, e ele ficava
plantado por cima do que estava colhendo. Agora `irParaPerto` mira sempre um
vizinho — e **vale também para corpo e bolsa de loot**, que antes usavam
`irPara` direto. Quem colhe fica ao lado do que colhe; ninguém saqueia pisando no
morto.

Ele tenta os vizinhos do mais perto ao mais longe e fica no primeiro com rota de
verdade: o mais próximo em linha reta pode estar do outro lado de um muro, e aí a
distância mente.

### 🔴 BUG GRAVE ACHADO DE RASPÃO: o jogo nunca carregava em aba OCULTA

Achado ao testar: o carregamento parava sempre no mesmo ponto, **sem erro nenhum
no console**, e `document.visibilityState` era `hidden`.

**Causa:** `loadImage` era `img.decode().then(() => img)`. O Chrome **adia a
decodificação de imagem em aba de segundo plano**, e a promessa do `decode()`
simplesmente nunca resolve. Como todo o carregamento do mundo espera por essas
imagens, abrir Elysia numa aba que não está na frente bastava para ficar na tela
preta **para sempre**.

**Conserto:** `loadImage` espera `onload` (que dispara normalmente em aba
oculta); a decodificação acontece depois, no primeiro `drawImage`. Custa um
engasgo no primeiro quadro e devolve a garantia de que o jogo sempre carrega.
`trees.ts` tinha a mesma armadilha e passou a usar o mesmo `loadImage`.

🔴 **Não volte para `img.decode()`** em nada que o carregamento espere. É um bug
que não aparece em nenhum teste e some assim que alguém olha para a aba.

### 🔴 Toda árvore tinha um QUADRADO PRETO em volta

Relatado pelo dono, com print (`erros/arvore-bug.png`). A causa estava no laço de
`rebuildFloor`: **só tile de `height === 0` ganhava piso**, e árvore tem altura 1.

Para muro isso nunca apareceu, porque a face 2.5D cobre o tile inteiro. A árvore
é só tronco e copa, então nos cantos aparecia o fundo da página — que é preto.

**Conserto:** o chão passa a ser desenhado **sempre**, e embaixo de tile alto usa
**grama** — o `worldgen` preenche o mapa inteiro de grama antes de pintar
qualquer coisa por cima, e só planta árvore onde já era grama. Onde a escolha
poderia estar errada (parede sobre pedra, dentro da casa), o bloco cobre tudo e
ninguém vê.

### ✅ Verificado JOGANDO (02/08)

Minério (3 cargas, esgotou e sumiu do mundo) · cogumelo sem ferramenta · erva com
Foice · recusa por falta de ferramenta nos três · número flutuante subindo do nó ·
XP de profissão chegando · nome do nó no **hover** com as cargas restantes ·
carregamento com a aba oculta · **corte de árvore** (confirmado pelo dono) ·
árvore sem o quadrado preto.

⚠️ **NÃO foi visto em tela:** a parada **ao lado** depois do conserto do
`irParaPerto`. O corte de árvore, que depende do mesmo código, funciona — então
o caminho do tile sólido está provado; falta ver o herói parando no vizinho em
vez de em cima.

---

## 🆕 Sessão de 01/08 — a primeira vez que alguém jogou de verdade

Esta sessão é diferente das anteriores: quase tudo aqui saiu de **jogar**, não de
implementar etapa do roadmap. O aviso do handoff anterior — *"teste passando não é
o mesmo que funcionar em tela"* — se confirmou inteiro. Sete bugs, e nenhum deles
tinha teste que pudesse tê-los pego, porque todos moravam entre a rede, o
navegador e o desenho.

### 🔴 O bug que mais importa entender: o inventário sumido

**Sintoma:** equipamento e mochila vaziam ao entrar. Console limpo, servidor sem
erro, todos os `kind` salvos existiam no catálogo. Vida, atributos e battle list
funcionavam.

**Causa:** corrida no login. `routeServerMessage` dispara `startGame()`, que é
**assíncrono** (Pixi, folhas de sprite, tiles) e só instala o `gameHandler` no
fim. Mas o servidor manda `welcome`, `inventory`, `stats` e `towns` no MESMO
tique do join. Tudo que vinha atrás do `welcome` caía em `gameHandler?.(msg)` com
o handler ainda `null` — **descartado em silêncio pelo `?.`**.

**Por que parecia "só a mochila":** `stats` e `snapshot` são reenviados a cada
tique, então vida e atributos se recuperavam sozinhos em milissegundos.
`inventory` é mensagem de **uma vez só** — só volta quando o inventário muda. Daí
a mochila ficar vazia até o jogador pegar ou soltar algo.

**Conserto:** fila (`pendingGameMessages`). O que chega durante o carregamento
fica guardado e é drenado por `flushPendingGameMessages()` na **última linha** de
`startGame`, na ordem original do servidor.

🔴 **`flushPendingGameMessages()` tem que continuar sendo a última linha.** A
primeira versão drenava dentro de `setGameHandler` (linha ~1009) e explodia com
*"Cannot access 'goldEmMao' before initialization"*: o corpo de `startGame` vai
até a ~3900 e ainda declara estado que os handlers usam. A flag `gameReady`
existe só para garantir isso.

### 🔴 PERDA DE SAVE — leia antes de mexer no caminho de entrada

Durante esta sessão o personagem do dono **perdeu a mochila inteira, a arma e o
ouro**. Foi restaurado (havia dump do banco de antes), mas o mecanismo merece
registro porque é a classe de bug mais cara que existe aqui.

O auto-login de desenvolvimento autenticava **duas vezes**: o callback de status
roda dentro do `onopen` do `NetClient`, antes da linha `if (this.username)
this.sendAuth('login')` que existe para reconexão. Dois `authresult` viraram dois
`enterGame` (o NetClient reentra sozinho quando já tem `characterId`), o
personagem entrou duas vezes e o save da desconexão gravou o estado meio-montado.

Dois consertos, e o segundo é o que importa:

1. Cliente: o auto-login foi adiado um tique (`setTimeout(…, 0)`).
2. **Servidor: `case 'hello'` agora RECUSA entrar duas vezes na mesma conexão.**
   O bloco já derrubava *outras* conexões no mesmo personagem, mas nada impedia a
   mesma. Perda de save é irreversível — o servidor não pode depender de o
   cliente se comportar.

⚠️ **Faça backup de `server/data/elysia.db` antes de testar qualquer coisa que
envolva entrar no mundo.** Custa um `Copy-Item` e teria evitado o susto inteiro.

### ✅ O que mais foi corrigido

| Bug | Causa real | Onde |
|---|---|---|
| Item solto virava **pilha de ouro** no chão | `makeItemView` desenhava três círculos dourados FIXOS, ignorando `itemKind`. O `drop` sempre funcionou — o desenho é que mentia | `main.ts` · agora usa `itemIconCanvas`, a mesma função do ícone da mochila |
| **Botão direito atacava** criatura | `pointertap` do Pixi dispara para QUALQUER botão, não só o primário | `soBotaoEsquerdo()` envolve os 5 pontos clicáveis do mundo |
| **Tiro atravessava muro** | O ataque só conferia distância | `hasLineOfSight()` em `tiles.ts`, ligado nos 3 caminhos (PvE, PvP e magia de criatura) |
| **Chat sumia atrás do jogo** ao redimensionar | `resizeTo` do Pixi só escuta `window.resize`; a doca muda a altura do viewport sem a janela mudar, e o canvas ficava com o tamanho antigo | `ResizeObserver` no `#viewport` → `app.resize()` |
| Personagem **andava um tile e parava** | O deslize usava cadência MEDIDA, e `makeStepCadence` trava no intervalo mais rápido já visto. Todo passo mais lento terminava o deslize antes do próximo | `heroiStepMs`: usa o `moveIntervalMs` que o servidor já mandava |

🔴 **`hasLineOfSight` usa `blocksSight`, não `solid`.** Não é a mesma coisa: água
é sólida e transparente. Usar `solid` proibiria atirar por cima de um rio. O
campo já existia em `TileType`. Há 11 testes em `shared/tests/lineofsight.test.ts`
travando isso, incluindo o caso da água.

🔴 **Sobre o passo do herói:** este mesmo bug já tinha sido corrigido para as
CRIATURAS (ver `CREATURE_GLIDE_DESCONHECIDA`, cujo comentário descreve o sintoma
com estas palavras). O herói ficou de fora. A duração é `moveIntervalMs`
**arredondado para cima ao tique** — o servidor testa o cooldown uma vez por
tique de 15 Hz, então 278 ms nominais chegam na tela como ~334 ms. Outros
jogadores continuam medidos: a velocidade deles este cliente não conhece.

### ✅ O que ganhou comportamento novo (pedido do dono, estilo Tibia)

- **Soltar item cai no tile do MOUSE**, não aos pés. Alcance
  `DROP_THROW_RANGE = 3` (⚠️ REFERÊNCIA — nenhum doc fecha o número), e o
  servidor valida alcance e andabilidade. Sem `tileX`/`tileY` cai aos pés, que é
  o caso do botão direito.
- **Arrastar item pelo CHÃO**, de tile em tile, sem pegá-lo
  (`C2S_MoveGroundItem`). Duas distâncias diferentes de propósito: alcançar o
  item usa `PICKUP_RANGE`, o destino usa `DROP_THROW_RANGE`.
- **Loot de monstro vem numa BOLSA**, não em pilhas soltas empilhadas no mesmo
  tile. Reusa o sistema de corpo que já existia (`Corpse` ganhou `source`), com
  desenho e texto próprios. **Bolsa vazia some na hora** — corpo de jogador
  mantém o TTL curto, porque ele também marca onde alguém morreu.
- **Clicar na bolsa de longe anda até ela** e abre ao chegar, em vez de só dizer
  "Aproxime-se".
- **Doca do chat com altura arrastável**, salva em `localStorage`, com teto de
  55 % da janela.

### ⚠️ AUTO-LOGIN DE DESENVOLVIMENTO — TEMPORÁRIO, e é um bypass

`npm run dev:test` entra direto no personagem, **sem senha**. Existe porque o
Vite recarrega a cada edição e redigitar senha inviabiliza testar interface.

Três travas: `ELYSIA_DEV=1` (só `dev.ts` liga), `ELYSIA_DEV_ACCOUNT` preenchida,
e o nome bater. O servidor de verdade (`npm run dev` / `npm start`) não passa por
`dev.ts`, então nada disso existe lá.

🔴 **Isto é atalho de teste com cara de furo de autenticação.** Se algum dia
produção definir `ELYSIA_DEV`, vira bypass real. **Apagar quando a fase de teste
manual acabar** — `server/src/dev.ts`, o bloco no `case 'auth'`, o método
`contaSemSenhaParaDesenvolvimento` do store e o `DEV_AUTOLOGIN` do cliente.
A conta está fixada como `maxmurtesvieira`; sobrescreva com
`ELYSIA_DEV_ACCOUNT=suaconta npm run dev:test`.

---

## 🆕 Onde o projeto está agora

### ✅ Os dois branches foram fundidos, e a Etapa 9 fechou

Party completa: formação (dele) + shared XP, três regras de loot com votação e
loot de chefe por contribuição (do `main`). Mais menu de contexto, amigos
(schema v4) e o PvP com Caveira Branca. Detalhe do merge em
[`MERGE-PVP-CAVEIRA-BRANCA.md`](./MERGE-PVP-CAVEIRA-BRANCA.md).

### 🆕 Layout em três regiões (01/08) — o scroll eterno da barra acabou

Pedido do dono: *"os menus do lado direito estão muito grandes, tem que ficar
rolando o scroll"*. A causa era aritmética — a barra da direita sozinha somava
**~760 px de painel numa janela de ~695**.

**Como ficou** (`client/index.html`):

| Região | O que mora lá | Critério |
|---|---|---|
| **Esquerda** | Mapa · Atributos · Battle · Grupo · Amigos | informação do **mundo** — o que o jogador *consulta* |
| **Centro** | o jogo em cima, **chat docado no rodapé** | como no Tibia |
| **Direita** | Servidor/relógio · Vitais · Equipamentos+Mochila · PvP | o **personagem** — o que o jogador *opera* |

**Medido com carga realista** (mochila de 40 slots cheia, paperdoll, 6
atributos, 8 alvos na battle), numa janela de 695 px:

| | Conteúdo | Folga |
|---|---|---|
| Esquerda | 657 px | +38 |
| Direita | 681 px | +14 |
| ⚠️ Esquerda **com o painel de Grupo aberto** | 810 px | −115 |

⚠️ **Estar em grupo ainda estoura a coluna esquerda** em janela baixa: o painel
de Grupo pede ~810 px de altura de janela. Acima disso cabe tudo; abaixo, a
coluna rola (o `overflow-y: auto` continua lá como rede). Não foi "resolvido"
escondendo o painel porque quem está em grupo precisa ver o grupo.

🔴 **`--slot` caiu de 28 → 24 px, e não foi gosto.** A mochila de 40 slots são
8 linhas, mais 4 do paperdoll: **cada pixel de slot custa 12 px de altura**. Era
o único corte de ~48 px que não escondia informação. Para os ícones voltarem a
28, suba `--bar-w` junto — **214/28 fecha a conta** —, ao preço de 48 px de
largura tirados do mundo. Os dois estão amarrados, com a conta no comentário do
`:root`.

Outras duas coisas que mudaram junto: o minimapa foi para 130 px (o atributo do
`<canvas>` mudou junto — o JS deriva a escala de `miniCanvas.width`), e quatro
blocos de dica viraram `title` (o texto completo continua lá, no tooltip).

**Novo:** a doca do chat tem altura **arrastável** pelo pegador acima dela,
salva em `localStorage` (`elysia_chat_h`), com teto de 55 % da janela para não
dar para arrastar até o mundo sumir.

🔴 **O reordenar-painéis agora é POR BARRA.** Era `sidebarEl` fixo; virou uma
lista de barras, cada uma com a própria chave (`elysia_panel_order` e
`elysia_panel_order_left`). Um painel arrastado não pula de coluna. Ordem antiga
gravada não quebra: o teste `parentElement === bar.el` faz o id que mudou de
barra simplesmente não casar.

### ✅ Catálogo de equipamento inteiro

**205 modelos** do Doc 4 viraram itens jogáveis. `atk`, `def`, bônus fixo, nível
recomendado e preço saem de **cinco constantes** em `equipcurve.ts` — rebalancear
o jogo é mudar uma delas, não reabrir centenas de números.

Varinha virou família de `staff`, Livro Arcano virou **foco de mão secundária**
no slot do escudo, e `ItemDef.bonus` destravou anéis, colares e Vestes.

### ✅ Magic Level LIGADO

`Proficiencies` agora é chaveada pelo vocabulário do `DD-PROG-011`: o Cajado sobe
`magic`, arco e besta colapsam em `distance`, e **desarmado treina `fist`** — antes
não treinava nada. A migração roda no carregamento e é idempotente.

### ✅ Ciclo dia/noite de verdade

**1 h dia · 30 min tarde · 1 h noite.** Dava a volta em 2 minutos antes.
Comandos: `/dia` · `/tarde` · `/noite` · `/ciclo`.

### ✅ ~~Coleta e mineração — REGRAS prontas, NÃO ligadas~~ — **LIGADA em 02/08**

`gathering.ts` já tinha os cinco nós, ferramentas, cargas e rendimentos testados,
e os sete materiais no catálogo. Faltavam as três peças de mundo — entidade,
protocolo e desenho —, e elas entraram. Ver a sessão de 02/08 no topo.

🔴 **Se você for mexer em equipamento ou defesa, leia as seções "curva" e
"armadura ganha teto" do [`HISTORICO.md`](./HISTORICO.md) antes.** Ataque e
defesa têm curvas separadas, e a assimetria não é gosto: `resolveDamage` mitiga
por **subtração plana**, que não tem retorno decrescente — defesa acima do dano
bruto derruba o golpe ao piso e o jogador vira intocável.
`MIN_DAMAGE_AFTER_ARMOR` é a grade que impede isso.

---

## 🔴 A PRIMEIRA COISA A FAZER: confirmar se soltar item funciona

O dono relatou que **soltar item no chão nunca funcionou**, e foram encontradas
duas causas. A primeira está **provada e corrigida**; a segunda é diagnóstico por
eliminação e **não foi vista em tela** — ele precisou desligar o PC.

**Como confirmar (1 minuto):**

1. Entre no jogo com um personagem que tenha itens.
2. **Arraste um item da mochila para o mundo** — é o caminho novo e principal.
   O item tem que cair no chão **e ficar lá**, mesmo você parado em cima.
3. Ande para fora do tile e volte: aí sim ele é recolhido automaticamente.
4. `Shift` enquanto arrasta solta a pilha inteira.
5. O botão direito continua funcionando como atalho — **se ele não funcionar, é
   esperado**: é justamente o mecanismo suspeito, e por isso o arraste virou o
   caminho principal.

Se o arraste também falhar, o console do navegador (F12) é o que falta — nenhum
dos dois lados conseguiu olhar lá.

📖 O diagnóstico completo das duas causas está no
[`HISTORICO.md`](./HISTORICO.md), na seção "Soltar item no chão — a caçada ao
bug".

---

## 🔴 O que NUNCA rodou em tela

Teste passando não é o mesmo que funcionar. **Nada abaixo foi visto no jogo**, e
duas dessas coisas exigem duas pessoas — que é justamente o que vocês são.

| O quê | Como testar | Por que ninguém testou |
|---|---|---|
| **Party de ponta a ponta** | dois clientes · `/convidar <nome>` · `/sim` · matar algo perto e conferir se a XP dividiu | exige duas janelas |
| **PvP e Caveira Branca** | ligar PK · agredir · ver a caveira nos dois lados · revidar **sem** ligar o próprio PK · esperar 5 min | idem |
| **Regras de loot** | `/loot lider` → abre votação → todos votam → matar algo e ver quem recebe | idem |
| **Menu de contexto** | botão direito num jogador — "Informações" tem que ser o primeiro, "Atacar" o último, e atacar quem não tem caveira pede **dois cliques** | era o bug relatado; o conserto não foi visto rodando |
| **Ciclo dia/noite** | `/tarde` e `/noite`, e conferir que amanhece sozinho depois | novo |
| **Catálogo novo** | bancada do Ferreiro: a lista de peças muda conforme a receita escolhida | novo |
| **Reordenar painéis nas DUAS barras** | arrastar painel pelo cabeçalho, em cada coluna, e recarregar | o layout foi verificado, o arraste entre colunas não |
| **Linha de visão em PvP** | dois jogadores, um atrás de muro, tentar acertar | exige duas janelas |
| **Bolsa de loot em GRUPO** | com regra de loot ligada, ver se o dono recebe na mochila e o resto vai para a bolsa | idem |
| 🆕 **Parar AO LADO** | clicar num nó/corpo de longe: o herói tem que parar no tile vizinho, nunca em cima | o conserto é de 02/08 e não foi visto rodando |

✅ **Verificado JOGANDO em 01/08** (o dono, em tela): inventário aparecendo ao
entrar · bolsa de loot caindo e abrindo · arrastar item pelo chão · soltar item
no tile mirado · chat redimensionando sem cobrir o jogo · tiro parando no muro ·
botão direito não atacando.

⚠️ **Se algo estiver quebrado, suspeite primeiro do merge.** Dois branches
paralelos foram fundidos à mão em `server/src/index.ts` e `client/src/main.ts`,
que são os dois arquivos maiores do projeto.

> **Comece por aqui**, depois vá para [`ROADMAP-elysia.md`](./ROADMAP-elysia.md)
> (plano geral) e [`HISTORICO.md`](./HISTORICO.md) (detalhe de cada etapa).

---

## 🐛 ANTES DE MAIS NADA: este commit tem bugs conhecidos

**Não trate o último commit como estável.** O dono jogou depois da entrega, disse
que **"ainda tem alguns bugs"** e precisou sair antes de descrever quais. Então:

- ✅ O que está verificado: **333 testes passando**, **typecheck limpo** nos 3 pacotes,
  e a página do cliente carrega **sem erro de console**.
- ❌ O que **não** está verificado: **nada foi testado dentro do jogo** nesta sessão.
  A tela de login pede senha, e o agente não digita senha — então o menu de contexto,
  a party, a lista de amigos, o golpe em PvP e a Caveira Branca **nunca rodaram com
  dois jogadores de verdade**. Teste passando não é o mesmo que funcionar em tela.

🔴 **Onde eu olharia primeiro**, por serem o que mudou e o que menos tem rede de
proteção (nesta ordem):

1. **Barra lateral** — o box de posição/atalhos foi removido e ele era a **âncora do
   reordenamento de painéis**. Arraste os painéis e recarregue: a ordem tem que voltar.
2. **PvP com dois clientes** — é a mudança mais nova e a única sem teste de integração:
   agredir, ver a caveira aparecer nos dois lados, revidar com o PK desligado, e a
   caveira sumindo sozinha em 5 min.
3. **Party e amigos** — feitos na mesma sessão, também sem teste de ponta a ponta.

Se o bug for de regra de PvP, **leia o bloco da Caveira Branca abaixo antes de
"consertar"**: a regra atual é decisão do dono e contraria o que o código fazia ontem.

---

## 🚀 Retomando o trabalho — faça isto primeiro

```bash
git pull
npm install          # confere; nenhuma dependência nova foi adicionada
npm run typecheck    # tem que sair limpo nos 3 pacotes
npm test             # tem que dar 436 passando, 0 falhando
npm run dev:test     # sobe com os comandos de teste ligados
```

Se o `npm test` não der **436** (416 shared + 20 server), **não continue** — algo
se perdeu no caminho.

⚠️ **O auto-login de `dev:test` está preso à conta `maxmurtesvieira`.** Em outra
máquina são **DUAS** variáveis, e faltar uma delas não dá erro claro:

```bash
ELYSIA_DEV_ACCOUNT=suaconta VITE_DEV_ACCOUNT=suaconta npm run dev:test
```

🔴 **O servidor lê a primeira e o cliente lê a segunda** (`server/src/dev.ts:28`
e `client/src/main.ts:346`) — o cliente é Vite, e Vite só expõe variável com
prefixo `VITE_`. Passando só a do servidor, a tela de login responde **"Usuário
ou senha inválidos"**, que parece problema de conta e não é. Custou um restart em
09/08.

---

## ✅ Os dois branches foram FUNDIDOS (2026-07-30)

Durante um dia, dois irmãos trabalharam a partir do **mesmo commit** (`5afa083`)
sem saber, em `main` e em `pvp-caveira-branca`. O merge está feito e o histórico
de como foi resolvido está em
[`MERGE-PVP-CAVEIRA-BRANCA.md`](./MERGE-PVP-CAVEIRA-BRANCA.md).

🔴 **A Etapa 9 fechou por causa disso.** As duas metades eram complementares: um
fez a **formação** do grupo (convite, liderança, `PARTY_MAX`), o outro fez a
**distribuição** (shared XP, regras de loot, votação, loot de chefe). Nenhuma
fechava a etapa sozinha.

Do merge sobraram duas decisões que valem saber:

- **A faixa de XP no Lv.100 exato** ficou na janela de **10** (leitura de "até
  Lv.100" como inclusivo). O doc é ambíguo — aparece nas duas frases.
- **`PARTY_NEAR_TILES` virou um número só** (15) para o HUD e para a XP. Eram
  dois raios diferentes; se divergissem, o painel mentiria — alguém apareceria
  "perto" e não receberia XP, sem explicação na tela.

### 🆕 A regra de PvP estava ERRADA, e foi corrigida

Se você só for ler um bloco deste arquivo, leia este.

🔴 **O PK deixou de ser um escudo.** A versão anterior (feita horas antes, na mesma
sessão) exigia PK ON dos **dois** lados para o golpe existir. Consequência: bastava
deixar o flag desligado para ficar **intocável**, e emboscar alguém era impossível.

**O doc nunca pediu isso.** 17.32 e 17.33 falam só do flag de **quem ataca** (*"Se o
Sorcerer estiver com PK OFF…"*), e 17.34 diz que com PK ON "as ações ofensivas **podem
atingir jogadores válidos**" — sem exigir nada do lado de lá.

**Como funciona agora** (decisão do dono, igual ao Tibia):

1. Quem liga o PK **acerta quem está com o PK desligado**. Sofrer o ataque **não é
   opcional**.
2. Por isso, o agressor recebe a **⚪ Caveira Branca** por 5 minutos.
3. Enquanto ela durar, **a vítima e qualquer um que esteja vendo** podem atacá-lo **sem
   ligar o próprio PK e sem nenhuma punição** — não ganham caveira por isso.
4. Continuar agredindo **renova** os 5 min (não soma).

| Mudou | Impacto em quem tinha trabalho local |
|---|---|
| `canHarm` lê **só o flag do atacante**; `Combatant` ganhou `skull` | 🔴 **mexe em `shared/src/pvp.ts`** — é a regra inteira, resolva o conflito aqui primeiro |
| `HarmDecision` ganhou `justified` | gancho da Etapa 17: "esta morte não conta como assassinato" |
| `EntitySnapshot` ganhou `skull` | campo opcional, só viaja quando há caveira |
| `Player` ganhou `whiteSkullUntil`; `lockPk` virou `applyAggression` | não persiste (como `pkEnabled`); a trava de 10 s agora vale **só para o agressor** |
| Sumiu o box de **coordenadas e atalhos** da barra lateral | pedido do dono — 3 linhas a menos de CSS em `index.html` |

⚠️ **`WHITE_SKULL_MS = 5 min` é REFERÊNCIA.** O cap. 75 dá a duração da vermelha (7 dias) e
da preta (30), **não a da branca**; a única fonte é a conversa antiga ("poucos minutos").

🔴 **Não "conserte" de volta para exigir os dois flags.** Há teste travando as duas pontas
(`shared/tests/pvp.test.ts`), com o motivo escrito no próprio teste.

**Isto ainda não fecha a Etapa 17.** Amarela, vermelha e preta continuam de fora — e o que
elas exigem que a branca não exigiu é **persistência**: contagem de assassinatos por dia e
por semana, o que significa schema v5.

### Sessão de 2026-07-30 (madrugada) — social e PvP mínimo

Pedido do dono: **botão direito em outro jogador abre um menu** com atacar, seguir,
informações, amigos e convite de grupo. Saiu isso e o que cada item exigia por baixo.

| Mudou | Impacto em quem tinha trabalho local |
|---|---|
| **Schema v4** — tabela `account_friend` | migração auto-verificável por `hasTable`; seu banco se conserta sozinho no primeiro boot |
| `EntitySnapshot` ganhou `pkEnabled` e `partyId` | campos opcionais, só viajam quando são verdade — nada quebra |
| 5 mensagens novas no protocolo (`pk`, `party`, `friend`, `S2C_Party`, `S2C_PartyInvite`, `S2C_Friends`) | 🔴 **mexe em `shared/src/protocol.ts`, `server/src/index.ts` e `client/src/main.ts`** — resolva conflito nos três antes de qualquer outra coisa |
| `updatePlayers` passou a tratar **alvo jogador** | o caminho de PvE não mudou; há teste garantindo |

**O que ficou pronto:**

- **Menu de contexto** no botão direito (o clique no vazio continua cancelando a rota)
- **Seguir** — 100 % cliente, reusando o BFS do clique-para-andar. 🔴 **Não** virou
  mensagem de protocolo: "siga o jogador X" deixaria o cliente ditar posição
- **Party (formação)** — ver a Etapa 9 do roadmap para o que falta
- **Lista de amigos** — ⚠️ sistema **sem respaldo documental**, escopo CONTA por decisão
  do dono. Ver o comentário do `SCHEMA_V4`
- **PvP mínimo** — o **primeiro uso real do `canHarm`**, que estava pronto e testado
  desde a Etapa 8 sem nada chamá-lo. Golpe de jogador em jogador passa pelas mesmas
  camadas de defesa do PvE

🔴 **Isto NÃO é a Etapa 17.** Não há skull amarela, vermelha nem preta, não há
criminalidade, guarda não reage e duelo consensual não existe. O que existe é o flag PK
com interface e um golpe que conecta.

⚠️ **A regra de PvP descrita aqui foi CORRIGIDA horas depois** — ver o bloco no topo do
arquivo. Exigia PK ON dos dois lados; hoje só o do atacante conta, e a contrapartida é a
⚪ Caveira Branca.

⚠️ **Dois números novos marcados `REFERÊNCIA`**, nenhum vindo de documento:
`PARTY_MAX = 5` (do exemplo de XP do cap. 35) e `PK_COMBAT_LOCK_MS = 10_000` (o tempo
mínimo com PK ligado depois de agredir — sem ele, bater-e-desligar deixaria o menu do
outro dizendo "ligue o seu PK").

### O que mudou por baixo de você (30/07 à noite)

| Mudou | Impacto em quem tinha trabalho local |
|---|---|
| `makeMiniActor` ganhou `attack`/`hurt`/`death` e `EntityView` ganhou `playDeath` | 🔴 **mexe em `client/src/main.ts`** — se você estava editando o render, pule para lá primeiro e resolva conflito antes de qualquer outra coisa |
| **Quatro itens renomeados** (`Machadinha` → `Machado de Lenhador`, `Adaga` → `Adaga Curta`, `Lança` → `Lança Curta`, `Cajado de Aprendiz` → `Cajado do Aprendiz`) | o `kind` **não** mudou, então saves continuam válidos — só o nome exibido |
| **Mochila 20 → 40 slots**, e o tamanho passou a vir do container equipado | ✅ **corrigido um bug que isso expôs:** ver abaixo |
| Coluna `professions` passou a ser lida e gravada | a migração é auto-verificável; seu banco se conserta sozinho no primeiro boot |
| 38 itens novos (fragmentos, receitas, materiais) | nenhum conflito — só adições em `ITEMS` |

### 🔴 O bug que a mochila expôs, e por que isso importa para você

O carregamento de personagem dimensionava a mochila por uma **constante** (`BACKPACK_SIZE = 20`), não pela capacidade do container equipado. Quando a Mochila subiu para 40 slots, um personagem salvo com 40 **voltava com 20 — e perdia acesso aos itens dos slots 20 a 39**, que ficavam no banco, invisíveis.

Corrigido: `backpackSizeFor()` é a fonte única, usada no carregamento **e** ao trocar de mochila, com teste travando os quatro degraus.

**Se você tinha personagem de teste com mochila cheia antes do pull, confira o inventário depois de entrar** — os itens devem estar todos lá.
>
> 🆕 Chegou a **Parte 2 das lacunas** (aqui chamada de **Doc 4**): 69 capítulos,
> 227 decisões. Triagem e ordem aprovada em
> [`DOC4-TRIAGEM.md`](./DOC4-TRIAGEM.md).

---

## Saúde do código

| | 30/07 madrugada | pós-merge | 01/08 | **02/08** |
|---|---|---|---|---|
| Testes | 328 · 344 | 397 | 408 | **428** (408 shared + 20 server) |
| Typecheck | limpo | limpo | limpo | limpo nos 3 pacotes |
| Criaturas vivas no mapa | 32 | 32 | 32 | 32 |
| **Nós de recurso no mapa** | — | — | — | **46** |
| Espécies definidas | 23 | 23 | 23 | 23 |
| Schema do banco | v3 | **v4** (`account_friend`) | v4 | v4 (nó não persiste) |
| Itens no catálogo | ~85 | ~85 | **~256** | ~256 |
| Profissões | 1 (Ferreiro) | 1 | 1 | **4** (+ Minerador, Lenhador, Herbalista) |
| Modelos canônicos registrados | 113 | 113 | **205 — todos jogáveis** | 205 |

⚠️ A coluna "30/07 madrugada" tem **dois** números de teste porque foram duas
sessões paralelas: 328 no branch do PvP, 344 no `main` do catálogo.

`npm run dev:test` sobe tudo com os comandos de teste ligados.

---

## 🆕 O que a sessão de 30/07 à noite entregou

### ✅ As QUATRO pendências que travavam código — fechadas

Estavam abertas desde a Etapa 8, e **nenhuma das duas partes do documento de
lacunas as cobria**. O dono decidiu as quatro, delegando o balanceamento.

| Pendência | Decisão |
|---|---|
| `DD-DEATH-009` | penalidade **branda** confirmada: teto de **um nível** |
| `DD-PROG-002` | pontos por nível **10 → 20** em degraus de 50 níveis |
| `DD-CC-013/014` | **os dois** métodos anti-CC-chain (DR + imunidade de 3 s) |
| `DD-DEF-012` | cap de bloqueio **25 %** físico, **10 %** mágico |

🔴 **Sobre a penalidade de morte, leia antes de mexer:** havia uma discrepância
real entre roadmap e código, aberta por dois dias. O roadmap mandava reverter
para a tabela dura do Doc 1 (200–300 % em nível alto) e o código nunca
acompanhou. **A implementação estava certa; era o roadmap que estava errado.**
Corrigido nos dois lados, com o histórico das três voltas registrado na Etapa 5
do roadmap e um aviso em `death.ts`. **Não "conserte" de volta.**

### ✅ Doc 4 — três sistemas implementados

**Cap. 46 — Item Affix Bible.** Equipamento ganhou **nome**: *"Espada Longa Feroz
do Dragão"*. 40 prefixos, 30 sufixos, compatibilidade e maldições.

🔴 **Prefixo elemental muda o dano DE VERDADE** (decisão do dono): espada
Flamejante causa dano de fogo, a arma **vence a classe**, e dano não-físico bate
contra a defesa mágica da criatura. É o que fez as resistências saírem do papel.

**Cap. 44–45 — Material Bible e Monster Drop Bible.** 24 materiais novos, um
conjunto por família de criatura. Antes, **21 das 23 espécies só davam XP** — o
`DD-DROP-001` proíbe exatamente isso.

**Cap. 38/40 — afinidade de classe.** O tooltip agora diz para quem a peça foi
feita. É **recomendação, não bloqueio** — o doc diz "Prioriza".

### ✅ Fabricação completa

Dá para fabricar. **NPC Ferreiro** na praça de Valoria (laranja de forja), com
bancada que mostra a **tabela de probabilidade recalculada a cada digitação** —
essencial, porque `DD-PROF-022` faz da proporção dos fragmentos a origem da
chance: é aposta informada, não caixa-surpresa.

### ✅ Pedidos do dono

- **Soltar item no chão**: botão direito solta 1, `Shift`+direito solta a pilha.
  Some em 3 minutos.
- **Mochila de 40 slots** — e a escada do roadmap inteira: 10/40/60/80.

🔴 **Um vazamento de desempenho corrigido no caminho:** item no chão **nunca
expirava**. Com 32 criaturas renascendo para sempre, o mapa acumulava centenas de
entidades, e todas iam no snapshot de todo jogador a cada tique.

### ✅ O gargalo da ARTE foi destravado

🔴 **A seção 4 da [`SPEC-SPRITES-MONSTROS.md`](./SPEC-SPRITES-MONSTROS.md) está
desatualizada de propósito? Não — foi reescrita.** O bloqueio que ela descrevia
(*"hoje não há como um monstro ter 4 direções E animação de ataque"*) **não existe
mais.**

`makeMiniActor` aceita **`attack`, `hurt` e `death` por direção**, e
`loadCreatureSheets` lê exatamente o formato da spec: 4 linhas = 4 direções, com
suporte a folha de **3 linhas** (espelhando a esquerda) e a **entrega em partes**
(só `walk.png` é obrigatório).

**Para ligar uma espécie quando a arte chegar, é UMA linha** em `CREATURE_SHEETS`
(`client/src/miniworld.ts`):

```ts
forest_spider: 32,   // nome da pasta: lado da célula em px
```

🔴 **Quem desenha precisa informar o lado da célula.** É a única coisa que o
código não consegue adivinhar: uma folha de 4×4 células de 32 px tem exatamente as
mesmas dimensões de uma de 2×2 de 64 px.

Três comportamentos que valem saber ao desenhar: **golpe não é interrompido por
dano** (senão bastaria bater sem parar para desarmar qualquer inimigo), **morte é
terminal** (o sprite para no último quadro — desenhe-o pensando nisso), e o
**golpe fatal toca morte, não dano**.

O **Zumbi não entrou na lista**: usa `Zombie-alfa.png` na raiz, formato LPC antigo,
com loader próprio. Quando for redesenhado na spec, entra e o loader antigo sai.

### ✅ Legibilidade: ícones de condição e de loot

**As 10 condições ganharam FORMA**, não só cor — cristal, pedra, círculo cortado,
bolhas, gota, chama, ampulheta, seta, raízes. E o HUD lista as condições do
próprio jogador **com nome**, porque símbolo de 9 px não ensina o que significa; o
tooltip diz o que ainda dá para fazer.

**Os 38 itens novos ganharam ícone por identidade.** Eram todos a mesma elipse
mudando de cor — problema que a própria sessão criou ao adicionar 7 fragmentos, 7
receitas e 24 materiais. Agora fragmento é lasca angular, receita é pergaminho, e
material tem forma **por família** (osso, couro, tecido, escama, presa, frasco,
orbe), usando a taxonomia do cap. 44.

O raciocínio nos dois casos é o mesmo: **cor sozinha não serve.** Ninguém memoriza
38 tons, e quem tem daltonismo não distingue nenhum.

### ✅ Modelos canônicos — e quatro nomes errados corrigidos

Os cap. 13–23 listam **113 modelos** de equipamento. **Não foram criados como
itens**, e o motivo é o documento: dos onze capítulos, só o das Espadas tem
descrição qualitativa; os outros dez são lista de nome pura, sem um único número.
Criar 130 itens exigiria inventar `atk` e `def` de cada um — **decisão de
balanceamento do dono**.

O que entrou (`shared/src/models.ts`) foi o que o doc realmente fecha: os **nomes
canônicos**. E o teste imediatamente apanhou quatro divergências que já existiam:

| Estava | Canônico |
|---|---|
| Machadinha | **Machado de Lenhador** |
| Adaga | **Adaga Curta** |
| Lança | **Lança Curta** |
| Cajado de Aprendiz | **Cajado do Aprendiz** |

Nome divergente é retrabalho silencioso: descobre-se meses depois, quando o item
já está em save de jogador — e aí renomear é migração, não edição.

⚠️ **O tier dos modelos foi INFERIDO da ordem da lista** (o doc só rotula no cap.
13). Há teste garantindo que nenhum tipo regrida de faixa: se alguém embaralhar a
lista, a inferência se perde e o teste avisa.

✅ ~~**Três categorias que o doc cria e o código não tem**~~ — **decididas em
30/07 pelo dono: nenhum `WeaponType` novo.** Varinha virou família dentro de
`staff`, Livro Arcano virou foco de mão secundária no slot `shield`, e Escudo
ocupa `shield` sem classe de armadura. As três saíram de
`PENDING_MODEL_CATEGORIES`.

⚠️ O que **continua** pendente lá: os 41 modelos que exigem `EquipSlot` novo no
paperdoll (luvas, capas, braceletes, cintos, broches), os anéis e colares (que
esperam bônus fixo de equipamento), e as ferramentas/instrumentos/itens de
guilda, que dependem de coleta, exploração e guildas.

---

## ⚠️ Leia isto antes de tocar em número

Três coisas nesta base **parecem canônicas e não são**. Mudá-las por engano é
desfazer decisão do dono:

1. **Velocidade do Super Slime** — `SPEED.alta` (900) **contraria** a ficha
   aprovada `DD-BAL-036` ("Velocidade: Baixa"). É override explícito do dono, com
   o motivo no comentário da def e teste travando as duas pontas.
2. **`XP_QUADRATIC` e `XP_REQ_MULT`** (`shared/src/combat.ts`) — a *regra* de
   desacelerar é canônica (`DD-PROG-001`); os *números* são `⚠️ REFERÊNCIA`.
   `XP_REQ_MULT` é o botão de "subir de nível mais devagar/rápido".
3. **`SELL_PRICE_FACTOR = 0.4`** e os `sellPrice` de Gosma/Pele
   (`shared/src/items.ts`) — o Doc 3 fecha "comércio fixo, sem economia dinâmica",
   mas **nenhum número**.

E uma consequência de catálogo que ninguém decidiu: **Fragmento de Relíquia e as
receitas Rara+ têm `buyPrice: 0`, então o comerciante não compra o material de topo
do jogo.** Há teste travando o comportamento atual justamente para que mudá-lo seja
consciente.

---

## O que foi feito

### ✅ Etapa 8 — Elementos, condições e defesa em camadas (completa)

Era a próxima do roadmap. Funciona ponta a ponta:

- **7 tipos de dano** (`shared/src/elements.ts`) com resistências e fraquezas
- **Defesa em camadas** (`shared/src/defense.ts`): esquiva → escudo → armadura →
  resistências, e bloqueio completo à parte
- **10 condições** (`shared/src/conditions.ts`) com as 3 contramedidas
- **Flag PK** (`shared/src/pvp.ts`) — pronta, mas **sem uso** (não há PvP)
- Todo dano do jogo passa por `resolveDamage`
- DoT cobrado no tique do servidor, com o tipo certo (sangramento é físico,
  queimadura é fogo)
- Ícones de condição e números de dano coloridos por elemento no cliente
- **As aranhas de teia aplicam Lentidão de verdade**

### ✅ Bestiário canônico do Doc 3

O dono enviou o **Doc 3** (`.docx`, 759 decisões). Foi extraído para
[`doc3-lacunas-extraido.md`](./doc3-lacunas-extraido.md) — pesquisável por
ferramenta de busca — e triado em [`DOC3-TRIAGEM.md`](./DOC3-TRIAGEM.md).

- **Família Slime** inteira (`DD-BAL-033..036`). O Slime virou **Slime Verde**,
  50 HP e 10 XP, e é a **âncora de balanceamento de todo o bestiário**
- **Zumbi é Tier III** (`DD-BAL-055`): 340 HP, XP 95. Não é conteúdo inicial
- **Tier II e Tier III completos** — 18 criaturas novas
- **Super Slime virou MVP de verdade**: Salto Esmagador em área e fúria aos 50 %

### ✅ Crafting por Fragmentos

Regras completas e testadas (`shared/src/crafting.ts`), mais o material no jogo:

- 7 **fragmentos** e 7 **receitas** caindo de monstro, por dificuldade de fonte
- Receita é **consumível** — cada fabricação gasta uma (`DD-PROF-024`)
- **Profissões** com estado persistido (mapa, porque não há limite de profissões)
- Só **dois Mestres Ferreiros** no mundo fazem Mítico e Relíquia

---

## 🔴 O gargalo agora é ARTE

**18 das 23 criaturas não têm sprite** (eram 21; Slime Azul e Vermelho ganharam a
arte do Verde recolorida em 30/07). Aparecem como **bolha colorida com o nome em
cima** — placeholder deliberado.

📐 **Para desenhar, a spec é a [`SPEC-SPRITES-MONSTROS.md`](./SPEC-SPRITES-MONSTROS.md)**:
pasta por monstro (já criadas em `client/public/assets/monsters/`), nome de cada
arquivo, formato da folha e as animações de cada espécie.

✅ **O trabalho de código que a arte exigia FOI FEITO em 30/07 à noite** — ver a
seção "O gargalo da ARTE foi destravado" acima. `makeMiniActor` aceita `attack`,
`hurt` e `death` por direção. *(Este parágrafo dizia o contrário e ficou para trás;
corrigido em 30/07 de madrugada.)*

O motivo não é código nem espaço no mapa: o cliente escolhe o desenho por
`creatureType` e cai em `drawSlime` para tipo desconhecido
(`client/src/main.ts`). Cada espécie tem cor própria em
`CREATURE_PLACEHOLDER_COLORS`, o que dá para jogar e testar a curva de
dificuldade, mas não para admirar.

📋 **A lista completa do que falta desenhar está em
[`INVENTARIO-DE-ARTE.md`](./INVENTARIO-DE-ARTE.md)** — monstros, personagem,
equipamento, cartas, NPCs e efeitos, com sugestão de prioridade.

Dois avisos desse inventário:

- ⏸️ **Equipamento visível no personagem foi ADIADO para pós-lançamento** por
  decisão do dono. Não desenhe peça para vestir o personagem agora.
- 🚫 **Não desenhe cartas ainda.** A Etapa 10 não foi implementada e o formato
  depende de decisões não tomadas. Seria trabalho jogado fora.

Quando uma criatura ganhar sprite, ela deixa de passar por `drawSlime` — como já
acontece com o Zumbi — e sai da tabela de cores sozinha.

---

## O que está pela metade

### ~~Fabricar ainda não funciona~~ — ✅ resolvido em 30/07 à noite

`C2S_Craft`, handler e a bancada do Ferreiro estão prontos. Ver "Fabricação
completa" acima.

### ~~Party — só a metade social~~ — ✅ resolvido pelo merge

A metade que faltava (shared XP e distribuição de loot) veio do outro branch. A
Etapa 9 está completa.

### Sistemas prontos e sem uso

- **Resistência, redução e imunidade a condição** — a estrutura existe, mas nada
  no jogo as concede. Dependem das cartas (Etapa 10) e do equipamento (Etapa 11)
- ~~**Flag PK**~~ — ✅ ganhou botão e primeiro chamador em 30/07 de madrugada

---

## 🔴 Decisões esperando o dono

| # | Assunto | Situação |
|---|---|---|
| 1 | **Urso Pardo** | ficou `territorial` por **inferência** — a ficha não dá comportamento |
| 2 | **Tier do Slime Azul** | o Doc 3 se contradiz: linha 1906 diz Tier II, a ficha na linha 3155 diz Tier I. Implementado como **Tier I** |
| 3 | ~~**Slime Azul e Vermelho dormentes**~~ | ✅ **RESOLVIDO 2026-07-29.** O dono mandou reusarem a arte do Verde recolorida; ganharam sprite e **nascem no mapa** (4 azuis, 3 vermelhos) |
| 4 | **`DD-LOR-127..133` duplicados** | aparecem duas vezes no Doc 3 com conteúdos diferentes. Um bloco precisa ser renumerado |
| 5 | **"Água" não é elemento** | a linha 1670 dá `Slime Azul → Água`, mas `DD-ELM-002` fecha os sete tipos e Água não está entre eles. Provável intenção: **Gelo** |

### 🆕 Sessão de 2026-07-30 — overrides e novos REFERÊNCIA

**Override do dono contra o doc** (registrado no código, não é erro):

🔴 **Super Slime mais rápido.** `DD-BAL-036` pede "Velocidade: Baixa" (1500). Foi
para `SPEED.alta` (900) porque o dono jogou e vetou: *"ficou muito lento"*. A
prática dá razão a ele — de um chefe do qual se foge **andando** não se aprende
nada, o que esvazia o papel didático que a própria ficha quer. Continua mais lento
que o jogador (~455 ms/tile), então fugir segue possível. Teste trava as duas
pontas em `combat.test.ts`.

**Curva de nível — agora obedece `DD-PROG-001`:**

Era `100 + (nível−1)×50`, **linear**, e a regra diz *"sem level cap, progressão
desacelera em levels altos"*. Linear não desacelera; e como a XP das criaturas
cresce ~13× do Tier I ao III, subir de nível na prática **acelerava**. Virou
quadrática: 1,5× mais devagar no começo, 4,3× no nível 100.

| # | Assunto | Hoje | Onde |
|---|---|---|---|
| 1 | Termo de desaceleração | `XP_QUADRATIC = 1.5` | `shared/src/combat.ts` |
| 2 | **Botão de "mais devagar/rápido"** | `XP_REQ_MULT = 1.5` | idem |

⚠️ REFERÊNCIA: o doc dá a regra, não a fórmula, e ele mesmo põe "faixas de nível"
**depois** do bestiário na ordem oficial.

🔴 **Mas o principal do "subo rápido demais" não era a curva — era o mapa.** Havia
Zumbi (Tier III, conteúdo de nível 50–100) a **14 tiles** do nascimento. Corrigido
no povoamento, e é de lá que vem a maior parte da desaceleração.

**Mundo:** 66 → **32 criaturas**, uma de cada espécie, por distância da vila
(Tier I a 12–14, II a 18–24, III a 30–36). Cortou-se duplicata, não espécie —
espécie que não nasce é sprite que não se consegue conferir no jogo.

**Colisão:** monstro é obstáculo como parede, nos três sentidos (jogador ↔ monstro,
monstro ↔ monstro). ⚠️ Consequência deliberada, igual à do Tibia: **dá para
bloquear passagem com o corpo**.

**Banco (schema v3):** NPC próprio, o Banqueiro, em (18,18). Guarda **só ouro**, e
o guardado **sobrevive à morte** — é a razão de existir (`dropCorpse` tem
comentário protegendo isso). Doc 3 lista Comerciante e Banco como funções
separadas, daí não ser uma terceira aba da loja.

**Mover por clique:** rota por BFS no cliente, mas o protocolo continua só com
PASSO — nada de "andar até (x,y)", que deixaria o cliente ditar posição. Teclado
tem prioridade e cancela a rota; botão direito também.

**UI:** barras laterais de 240 → **190 px** (100 px devolvidos ao jogo), com
`--bar-w`, `--slot` e `--bar-pad` no `:root` fazendo o papel de "zoom" da
interface. ⚠️ `--slot` e `--bar-w` estão amarrados — ver o comentário no
`index.html`.

### 🆕 Venda ao comerciante — dois números esperando o dono (2026-07-29)

A aba **Vender** entrou no comerciante (mesmo NPC, duas abas). O Doc 3 fecha o
*princípio* — "lojas são permanentes", "sem economia dinâmica" — o que autoriza
preço fixo, mas **não dá número nenhum**. Ficaram como `⚠️ REFERÊNCIA`:

| # | Assunto | Hoje | Onde |
|---|---|---|---|
| 1 | **Margem de recompra** | `SELL_PRICE_FACTOR = 0.4` (paga 40 % do preço de loja) | `shared/src/items.ts` |
| 2 | **Preço do material de monstro** | Gosma de Slime 2, Pele de Serpente 5, ancorados no Fragmento Comum | `shared/src/items.ts` |

E uma **consequência do catálogo** que vale decisão consciente: Fragmento de
Relíquia e as receitas **Rara para cima** têm `buyPrice: 0`, então hoje o
comerciante **não compra** o material de topo. O efeito é defensável — não dá para
torrar o material mais raro por trocados — mas ninguém decidiu isso, saiu do
catálogo. Há teste travando o comportamento atual (`shared/tests/items.test.ts`),
para mudar exigir intenção.

Raridade multiplica o preço por `RARITY.statMult` (Comum 1.0 → Relíquia 2.3).
Reúso deliberado da escala canônica de poder, para não criar uma tabela de preço
paralela que pudesse contradizê-la.

### E as quatro pendências que o Doc 3 NÃO cobriu

Continuam abertas e destravariam mais código que o resto junto:

- `DD-CC-013/014` — método anti-CC-chain (resistência temporária? diminishing returns?)
- `DD-DEF-012` — valor do cap global de bloqueio (hoje 0,25 como referência)
- `DD-PROG-002` — faixas da curva de pontos por nível (10 → 20)
- `DD-DEATH-009` — fórmula de conversão da penalidade de morte

O dono está preparando uma **Parte 2** do documento de lacunas. Se cobrir alguma
dessas, é por onde começar.

---

## ⚠️ Armadilhas — leia antes de mexer

### 1. Não edite arquivo com script de PowerShell

Já mordeu duas vezes. A primeira corrompeu os acentos de `combat.ts`
(`ágil` → `Ã¡gil`); a segunda adicionou **BOM** a `serialize.ts`. As duas foram
revertidas antes de qualquer commit, mas o padrão é claro: **use a ferramenta de
edição do editor/agente**, nunca `Set-Content` ou `-replace` em arquivo-fonte.

### 2. Migração de banco tem que verificar o SCHEMA, não a versão

Aconteceu de verdade nesta sessão: o banco ficou marcado como `user_version = 2`
**sem a coluna nova existir**. `ALTER TABLE ADD COLUMN` e o `PRAGMA` não são
transacionais juntos, e um reinício do `tsx watch` caiu no meio. Todo cadastro de
personagem teria quebrado com *"no such column"*.

`Store.migrate()` agora usa o helper `hasColumn()` e checa
`PRAGMA table_info`. Ficou idempotente **e auto-corretivo**. **Siga esse padrão
nas próximas migrações** — número de versão sozinho mente.

### 3. Criaturas não persistem

`spawnInitialCreatures` roda a cada boot. Mexer em spawn exige reiniciar o
servidor, não só salvar o arquivo.

### 4. Condição não persiste no banco — de propósito

Sair envenenado e voltar curado é melhor que voltar morrendo de um DoT que o
jogador não pode responder.

---

## Regra de ouro do projeto — o que mais importa

`docs/` é a fonte de verdade, com hierarquia própria: **Doc 1 e Doc 2 acima da
conversa antiga**, e **o capítulo mais alto vence o mais baixo**. O que está
marcado `PENDENTE` ou `NÃO CONSOLIDAR` **não se implementa e não se inventa
número** — implementa-se a *estrutura*, deixando o valor configurável e
registrando a pendência.

⚠️ **Exceção autorizada pelo dono em 2026-07-29:** no **Doc 3**, o status
`PROPOSTA` **não bloqueia** implementação (*"tudo foi aprovado, mesmo como
proposta, pode implementar"*). Isso vale só para o Doc 3.

Valores que o doc não fecha estão marcados `⚠️ REFERÊNCIA` no código, com um
comentário dizendo o que é canônico e o que é ponto de partida para teste.

---

## Comandos de teste (`npm run dev:test`)

No chat do jogo:

| Comando | O que faz |
|---|---|
| `/level <n>` · `/sp <n>` · `/gold <n>` | ajustam progressão |
| `/hp <n>` · `/heal` · `/tp <x> <y>` | vida e posição |
| `/cond <id>` | aplica condição (`freeze`, `poison`, `silence`, `slow`, …) |
| `/uncond` | limpa todas as condições |
| `/dia` · `/tarde` · `/noite` | força a fase do ciclo — **efeito global**, todo mundo vê |
| `/ciclo` | devolve o ciclo ao horário natural |

🔴 **Os comandos de fase NÃO congelam o relógio.** Eles deslocam a origem do
ciclo, e o mundo segue andando dali: forçar `/noite` e esperar faz amanhecer
sozinho. Congelar esconderia justamente os bugs de transição, que é o que se
quer ver.

## Comandos de GRUPO — estes valem em produção, não são de teste

| Comando | O que faz |
|---|---|
| `/convidar <nome>` | convida quem estiver online |
| `/sim` · `/nao` | responde ao convite **ou** à votação de loot — do ponto de vista do jogador é a mesma pergunta |
| `/grupo` | lista membros, líder (★) e a regra de loot ativa |
| `/loot <livre\|lider\|aleatorio>` | **propõe** a regra — `DD-PARTY-015`, o líder não muda sozinho |
| `/expulsar <nome>` · `/sairdogrupo` | só o líder expulsa |

---

## 🎯 PRÓXIMA ETAPA

🔴 **Mudou na tarde de 02/08:** o dono entregou o mapa oficial e pediu para
antecipar a etapa de mundo. **A próxima coisa a fazer é o passo 2 da lista do
bloco "O MUNDO DE ELYSIA COMEÇOU"**, no topo deste arquivo — o gerador de
terreno 300×300.

O texto abaixo era a próxima etapa antes disso, e continua valendo **depois** do
mundo: nada nele foi feito.

### (em espera) Ligar a coleta à FABRICAÇÃO

Hoje o jogador colhe Minério de Ferro, Tora de Carvalho, Erva Comum e Cristal de
Mana, e **não tem o que fazer com eles**: a bancada do Ferreiro só consome
fragmentos e receitas de monstro. O material entrou no mundo pela porta da
frente e continua sem destino, que é a mesma acusação que o `DD-MAT-001` faz.

Duas frentes, nesta ordem:

1. **Receitas que usam material de coleta** na bancada do Ferreiro
   (`shared/src/crafting.ts`) — barra de ferro a partir de minério, etc.
2. **A bancada do Alquimista**, que o `DD-DROP-013` desenha inteira (Ervas,
   Flores, Essências, Venenos) e que hoje não existe como NPC. Precisa de um
   `NpcRole` novo em `tiles.ts`, no mesmo molde do `blacksmith`.

⚠️ Antes disso, **confirme as duas coisas que não foram vistas em tela** (corte
de árvore e parada ao lado) — ver o fim da sessão de 02/08 lá em cima.

**O que continua parado por falta de duas pessoas:** party de ponta a ponta, PvP
e Caveira Branca, regras de loot e linha de visão em PvP. Ver a tabela "O que
NUNCA rodou em tela".

---

## Sugestão de por onde começar (atualizada em 30/07 de madrugada)

> 🆕 **Entrou na frente da lista abaixo:** **fechar a Etapa 9** ligando o shared XP.
> A formação do grupo, o `partyId` e as faixas de nível já existem e estão testadas —
> falta a distribuição, que é o que o cap. 35 realmente pede. Não depende de arte nem
> de decisão do dono: `DD-PARTY-004/005/007` estão fechados. Os únicos pendentes
> numéricos são o **bônus de grupo** (`DD-PARTY-010`) e o **mínimo de contribuição**
> em boss global (`DD-PARTY-024`) — implementar a estrutura e deixar configurável.


O dono está **desenhando os sprites** — não mexa no bestiário nem adicione criatura
enquanto isso. O que rende agora é código que a arte vai precisar, e o que
está pela metade.

1. ✅ ~~Animação de ataque por direção~~ — **feito.** O caminho está pronto e
   esperando arte.
2. ✅ ~~Ícones das 10 condições~~ — **feito**, com nome no HUD.
3. ✅ ~~Dar números aos modelos~~ — **feito.** 177 modelos jogáveis, derivados de
   cinco constantes. Ver `equipcurve.ts` e `catalog.ts`.
4. ✅ ~~Decidir Varinha, Livro e Escudo~~ — **feito.** Nenhum `WeaponType` novo:
   Varinha é família dentro de `staff`, Livro é foco de mão secundária no slot
   `shield`, Escudo ocupa `shield` sem classe de armadura.
5. ✅ ~~Terminar a Etapa 9~~ — **feita, de ponta a ponta.** ⚠️ **Nunca foi testada
   com dois clientes de verdade** — sozinho dá para conferir que o painel some,
   que `/grupo` responde e que o convite a um nome inexistente é negado, mas
   convite→aceite→XP dividida exige duas janelas. É a primeira coisa a fazer
   quando houver dois.
6. ✅ ~~Bônus fixo de equipamento em `ItemDef`~~ — **feito**, e destravou as três
   coisas de uma vez: os 18 anéis do cap. 30, os 10 colares do cap. 31, a Veste
   (que agora troca proteção por mana) e o Livro Arcano.
7. **Etapa 10 — Cartas**, se quiser seguir o roadmap. ⚠️ Mas o
   [`INVENTARIO-DE-ARTE.md`](./INVENTARIO-DE-ARTE.md) avisa para **não desenhar
   cartas ainda**: o formato depende de decisões não tomadas.
8. **Os 41 modelos que exigem `EquipSlot` novo** (luvas, capas, braceletes,
   cintos, broches — cap. 28–29 e 32–34). Slot novo não é só um campo: é mexer no
   paperdoll da interface. Decisão do dono.

O que **não** vale a pena agora:

- **Adicionar Tier IV em diante** — mais criaturas-bolha tem retorno decrescente
  enquanto Tier II e III não têm arte.
- **Cartas, Sets e Relíquias** (cap. 50–79 do Doc 4, ~310 decisões) — são
  **endgame** e nenhum jogador passa do Tier III. Construir isso agora é conteúdo
  que ninguém alcança.
- **NPC / Quest / Reputação** (cap. 47–49) — precisam de cidade, o mesmo bloqueio
  da Asteria.
- **Chefes e Dungeons** (cap. 80–81) — contrariam a ordem que `DD-BAL-038` fechou:
  Tier por Tier antes de MVPs.

### 🔴 Duas portas fechadas de propósito (não são bugs)

- **Mítico e Relíquia são infabricáveis.** `DD-PROF-028` reserva os dois aos
  **dois Mestres Ferreiros do mundo**, que dependem de cidades (Etapa 16). A
  bancada recusa com mensagem explicando.
- ✅ ~~**Ervas, Flores, Cogumelos, Minérios, Madeiras e Gemas não existem**~~ —
  **resolvido em 02/08.** A coleta ligou no mundo e as seis famílias passaram a
  ter origem. O que ainda falta é o DESTINO delas: nenhuma receita as consome
  ainda (ver "PRÓXIMA ETAPA").

### ⚠️ A inconsistência que já apareceu QUATRO vezes

O vocabulário elemental do documento estoura os sete tipos de `DD-ELM-002`
(Físico · Fogo · Gelo · Elétrico · Veneno · Sagrado · Sombrio) em quatro lugares
diferentes:

| Onde | O que aparece fora dos sete |
|---|---|
| Doc 3 | `Slime Azul → Água` |
| Doc 4 cap. 46 | prefixos `Terreno`, `Marinho` |
| Doc 4 cap. 44 | 11 afinidades de material (Água, Terra, Vento, Aether, Corrupção) |
| Doc 4 cap. 39 | **14** afinidades de equipamento (soma Veneno, Vida, Morte) |

✅ **Decisão do dono (30/07): vocabulário único, colapsa nos sete.** Água e Gelo →
`ice`, Terra → `physical`, Vento e Raio → `electric`, Natureza → `poison`, Luz e
Aether → `holy`, Trevas e Corrupção → `dark`, Vida → `holy`, Morte → `dark`.

⚠️ **O que se perde:** Água e Gelo passam a ser indistinguíveis, e o mesmo vale
para Vento/Raio e Trevas/Corrupção. **Aether → `holy` é o mapeamento mais
frágil** — Aether é a energia mágica do mundo na lore, Sagrado é "energia vital".
Se o Aether ganhar peso mecânico próprio, é o primeiro lugar a rever.

Há testes em `materials.test.ts` e `affixes.test.ts` impedindo que um oitavo
elemento entre por descuido.

---

## Onde as coisas moram (mapa rápido do código)

| Assunto | Arquivo |
|---|---|
| Nós de coleta: regras e onde nascem | `shared/src/gathering.ts` |
| Curva de nível, bestiário, dano | `shared/src/combat.ts` |
| Itens, preço de venda | `shared/src/items.ts` |
| Elementos · condições · defesa | `shared/src/{elements,conditions,defense}.ts` |
| Crafting e profissões | `shared/src/crafting.ts` |
| NPCs do mundo (papéis) | `shared/src/worldgen.ts` · tipo em `tiles.ts` |
| Colisão, IA, spawn, handlers | `server/src/index.ts` |
| Migrações do banco | `server/src/store/{schema,store}.ts` |
| HUD, rota do clique, loja, banco | `client/src/main.ts` |
| Carregadores de sprite | `client/src/{sprites,miniworld}.ts` |
| CSS e "zoom" da UI | `client/index.html` (`:root`) |
