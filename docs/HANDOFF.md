# Handoff — estado do projeto em 2026-07-29

Resumo para quem for continuar o trabalho. Escrito ao fim de uma sessão de
desenvolvimento no clone do **frankmvieira-creator**, com 16 commits publicados
em `main`.

> **Comece por aqui**, depois vá para [`ROADMAP-elysia.md`](./ROADMAP-elysia.md)
> (plano geral) e [`HISTORICO.md`](./HISTORICO.md) (detalhe de cada etapa).

---

## Saúde do código

| | Antes desta sessão | Agora |
|---|---|---|
| Testes | 134 | **223** (211 shared + 12 server) |
| Typecheck | limpo | limpo nos 3 pacotes |
| Criaturas vivas no mapa | 27 | **59** |
| Espécies definidas | 8 | **23** |
| Schema do banco | v1 | **v2** (coluna `professions`) |

`npm run dev:test` sobe tudo com os comandos de teste ligados.

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

**21 das 23 criaturas não têm sprite.** Todas aparecem como **bolha colorida com
o nome em cima** — placeholder deliberado.

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

## Sugestão de por onde começar

1. **Arte do Tier II** — 9 criaturas, é a faixa que o jogador vê depois do
   tutorial. Maior impacto por hora de trabalho
2. **Ícones das 10 condições** — hoje são quadrados coloridos sem significado, e
   as aranhas já aplicam Lentidão de verdade
3. **Protocolo + handler de fabricação** — objetivo, não depende de decisão de
   design
4. **Responder as 5 decisões pendentes** acima, que são baratas e destravam
   código

O que **não** vale a pena agora: adicionar Tier IV em diante. Mais criaturas-bolha
tem retorno decrescente enquanto o Tier II não tem arte.
