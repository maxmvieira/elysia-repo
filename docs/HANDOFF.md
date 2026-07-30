# Handoff — estado do projeto em 2026-07-30

Resumo para quem for continuar o trabalho. Três sessões registradas: **29/07**
(Etapa 8, bestiário do Doc 3, crafting), **30/07 manhã** (aba Vender, colisão,
clique para andar, banco, curva de nível) e **30/07 noite** (as 4 pendências que
travavam código, Doc 4: Affix/Material/Drop Bible, fabricação completa).

> **Comece por aqui**, depois vá para [`ROADMAP-elysia.md`](./ROADMAP-elysia.md)
> (plano geral) e [`HISTORICO.md`](./HISTORICO.md) (detalhe de cada etapa).
>
> 🆕 Chegou a **Parte 2 das lacunas** (aqui chamada de **Doc 4**): 69 capítulos,
> 227 decisões. Triagem e ordem aprovada em
> [`DOC4-TRIAGEM.md`](./DOC4-TRIAGEM.md).

---

## Saúde do código

| | 29/07 | 30/07 manhã | **30/07 noite** |
|---|---|---|---|
| Testes | 223 | 237 | **288** (276 shared + 12 server) |
| Typecheck | limpo | limpo | limpo nos 3 pacotes |
| Criaturas vivas no mapa | 59 | 32 | 32 |
| Espécies definidas | 23 | 23 | 23 |
| Schema do banco | v2 | v3 | v3 |
| Itens no catálogo | ~25 | ~32 | **~85** |

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

🔴 **Trabalho de código que a arte vai exigir:** hoje **nenhum monstro consegue ter
4 direções E animação de ataque.** `makeMiniActor` tem 4 direções mas só
andar/parado; `makeSpriteActor` tem ataque/dano/morte mas é vista frontal única,
espelhada. Estender o caminho direcional está pendente — os gatilhos já existem no
servidor (`hit`, `hit.fatal`, `projectile`).

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

### Fabricar ainda não funciona

O material existe, as regras existem e estão testadas, mas **falta o ato**:

1. Mensagem de protocolo (`C2S_Craft`) em `shared/src/protocol.ts`
2. Handler no servidor consumindo fragmentos + receita e gerando o item
3. Bancada na interface

O item 3 é trabalho de UI e merece a opinião do dono no layout. Os itens 1 e 2
são objetivos e podem ser feitos já, expostos por comando de teste.

### Sistemas prontos e sem uso

- **Flag PK** (`canHarm`) — completa e testada; não há PvP implementado
- **Resistência, redução e imunidade a condição** — a estrutura existe, mas nada
  no jogo as concede. Dependem das cartas (Etapa 10) e do equipamento (Etapa 11)

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

---

## Sugestão de por onde começar (atualizada em 30/07 à noite)

O dono está **desenhando os sprites** — não mexa no bestiário nem adicione criatura
enquanto isso. O que rende agora é código que a arte vai precisar, e o que
está pela metade.

1. 🔴 **Animação de ataque por direção.** Hoje nenhum monstro consegue ter 4
   direções E ataque (ver o gargalo de arte acima). É o que bloqueia metade do que
   o dono está desenhando, e os gatilhos já existem no servidor. **Continua sendo
   o item mais valioso da lista.**
2. **Ícones das 10 condições** — hoje são quadrados coloridos sem significado, e as
   aranhas já aplicam Lentidão de verdade.
3. **Continuar o Doc 4 na ordem aprovada.** Os três primeiros sistemas estão
   feitos; o próximo é o **resto do catálogo de equipamentos** (cap. 13–43): os
   modelos de arma e armadura por família, que também destravam os "materiais
   complementares" nas receitas de fabricação.
4. **Etapa 9 — Party e shared XP**, se o dono quiser avançar o roadmap em vez do
   Doc 4.

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
