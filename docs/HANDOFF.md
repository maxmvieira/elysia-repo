# Handoff — estado do projeto em 2026-07-30

Resumo para quem for continuar o trabalho. Quatro sessões registradas: **29/07**
(Etapa 8, bestiário do Doc 3, crafting), **30/07 manhã** (aba Vender, colisão,
clique para andar, banco, curva de nível), **30/07 noite** (as 4 pendências que
travavam código, Doc 4: Affix/Material/Drop Bible, fabricação completa) e
**30/07 madrugada** (o catálogo de equipamento inteiro ganhou números, e as
regras de Party).

---

## 🆕 A sessão mais recente, em seis linhas

1. **Os 205 modelos canônicos do Doc 4 viraram itens jogáveis** — `atk`, `def`,
   bônus fixo, nível recomendado e preço saem de **cinco constantes** em
   `equipcurve.ts`, não de centenas de números escritos à mão.
2. **Varinha, Livro Arcano e Escudo foram decididos** e saíram do pendente. O
   Livro é **foco de mão secundária**, no slot do escudo.
3. **A Etapa 9 está COMPLETA** — party, shared XP, três regras de loot com
   votação, e loot de chefe por contribuição. Jogável por comandos de chat
   (`/convidar`, `/loot`, `/grupo`) com painel na barra lateral.
4. **Passe de balanceamento** — a armadura ganhou teto e o drop de equipamento
   caiu para menos da metade.
5. **`ItemDef.bonus`** — bônus fixo de equipamento. Destravou os anéis, os
   colares, a Veste e o Livro Arcano de uma vez só.
6. **`proficiency.ts`** — o vocabulário do `DD-PROG-011`. **Magic Level e Fist
   passam a existir.** ⚠️ É camada de LEITURA: `Proficiencies` continua indexada
   por `WeaponType` em save, e ligar de verdade exige migração.

🔴 **Se você for mexer em equipamento ou defesa, leia as seções "curva" e
"armadura ganha teto" do [`HISTORICO.md`](./HISTORICO.md) antes.** Ataque e
defesa têm curvas separadas, e a assimetria não é gosto: `resolveDamage` mitiga
por **subtração plana**, que não tem retorno decrescente — defesa acima do dano
bruto derruba o golpe ao piso e o jogador vira intocável.
`MIN_DAMAGE_AFTER_ARMOR` é a grade que impede isso.

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
npm test             # tem que dar 377 passando, 0 falhando
npm run dev:test     # sobe com os comandos de teste ligados
```

Se o `npm test` não der 377, **não continue** — algo se perdeu no merge.

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

| | 30/07 manhã | 30/07 noite | 30/07 madrugada | **pós-merge** |
|---|---|---|---|---|
| Testes | 237 | 298 | 328 · 344 | **377** (357 shared + 20 server) |
| Typecheck | limpo | limpo | limpo | limpo nos 3 pacotes |
| Criaturas vivas no mapa | 32 | 32 | 32 | 32 |
| Espécies definidas | 23 | 23 | 23 | 23 |
| Schema do banco | v3 | v3 | **v4** (`account_friend`) | v4 (a caveira não persiste) |
| Itens no catálogo | ~32 | ~85 | ~85 | **~256** |
| Modelos canônicos registrados | — | 113 | 113 | **205 — todos jogáveis** |

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
- **Ervas, Flores, Cogumelos, Minérios, Madeiras e Gemas não existem** como
  material. Dependem de **coleta e mineração**, que não foram feitas. Há teste
  impedindo que entrem antes — criar o item sem forma de obtê-lo seria item
  inalcançável, e `DD-MAT-001` proíbe material que "existe apenas para ocupar
  espaço". **Consequência prática: o Ferreiro não tem minério e o Alquimista não
  tem erva.** As profissões dependem da coleta para funcionarem de verdade.

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
