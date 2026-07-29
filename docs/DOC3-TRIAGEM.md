# Doc 3 — Triagem para implementação

Mapa do que o **Doc 3** (`ELYSIA ONLINE ATUALIZAÇOES DE LACUNAS.docx`) contém e
o que dá para virar código. Texto pesquisável em
[`doc3-lacunas-extraido.md`](./doc3-lacunas-extraido.md) — os números de linha
abaixo se referem a ele.

**Autorização do dono (2026-07-29):** *"tudo foi aprovado, mesmo como proposta,
pode implementar"*. Ou seja, o status `PROPOSTA` **não bloqueia** implementação
neste documento — diferente do vocabulário do Doc 1, onde `PENDENTE` bloqueia.

## Tamanho do documento

| | |
|---|---|
| Decisões `DD-` | **759** |
| `PROPOSTA` | 215 |
| `DEFINITIVO` / `Aprovado` | 83 |
| Linhas de texto | 11.504 |

Distribuição por família: **MVP 544** (projetos de chefe) · BAL 184 · LOR 80 ·
PAS 70 · QST 38 · EVT 34 · FCT 32 · EXP 26 · REL 20 · BST/PROF 16 · DUR/ECO 15 ·
ELEM 10 · WPN 10 · ART 9 · AI 8.

Isso é conteúdo para **muitas sessões**. A ordem sugerida está no fim.

## Blocos do documento

| Linha | Bloco |
|---|---|
| 1 | 01 — Crafting (versão consolidada) |
| 380 | 03 — A Hierarquia Celestial |
| 483 | 04 — Os Seis Arcanjos Fiéis |
| 578 | 05 — Os Sete Senhores da Corrupção |
| 689 | 06 — As Religiões de Elysia |
| 803 | 07 — As Sete Eras da Reconstrução |
| 937 | 08 — A Queda das Grandes Civilizações |

Depois da linha ~950 o documento abandona o formato "BLOCO" e passa a listar
decisões `DD-` diretamente, em lotes por sistema.

## ✅ O que o Doc 3 RESOLVE

**Lore (76 decisões `DD-LOR-070` a `DD-LOR-145`, linhas 277–1494).** Fecha
praticamente toda a lista de pendências de lore do roadmap: os Arcanjos, os Sete
Senhores da Corrupção, as religiões, o calendário e a contagem dos anos, as
eras, os reinos humanos, **Asteria** (`DD-LOR-114`, linha 1254) e os Povos
Livres.

🔴 **Isto destrava a Etapa 16**, que estava parada com um "não inventar"
explícito sobre cidade inicial, capital humana, sistema político e religiões.

**Balanceamento do bestiário (`DD-BAL-038` a `DD-BAL-043`, linhas 3421–3509).**
São decisões de **processo**, não números:

- ordem obrigatória: Tier I → II → III → IV → V → VI → MVPs → revisão global,
  cada Tier fechado antes do seguinte
- Tiers são referência, **não bloqueio** — jogador experiente pode subir de
  faixa, e uma região pode misturar Tiers
- dificuldade nunca é só atributo maior: entra IA, complexidade e comportamento
- MVP tem escala própria, com identidade, habilidades, IA, loot e papel narrativo

**Taxonomia dos Slimes** (linhas 1892–1895): Verde → Tier I · Azul → Tier II ·
Vermelho → Tier III · Ancião → Tier V.

**`DD-BAL-027` (linha 2744) — o único número canônico direto:** Slime Verde
tem **XP 10, 50 HP, dano 4–7, defesa 1**, combate de 3–8 s, e é a **âncora de
balanceamento de todo o bestiário**.

## ❌ O que o Doc 3 NÃO resolve

As quatro pendências que travam código **continuam abertas** — nenhuma aparece
no documento:

| Pendência | O que falta |
|---|---|
| `DD-CC-013/014` | método anti-CC-chain (resistência temporária? diminishing returns?) |
| `DD-DEF-012` | valor do cap global de bloqueio (hoje 0,25 como referência) |
| `DD-PROG-002` | faixas da curva de pontos por nível (10 → 20) |
| `DD-DEATH-009` | fórmula de conversão da penalidade de morte |

Também segue pendente a **velocidade-base do sistema** (linha 2661).

## ⚠️ Conflitos a resolver

**1. "Água" não é um dos sete elementos.** A linha 1670 dá `Slime Azul → Água`,
mas `DD-ELM-002` fecha os sete tipos em Físico · Fogo · Gelo · Elétrico ·
Veneno · Sagrado · Sombrio. Água não existe. Provável intenção: **Gelo**.
🔴 Precisa de decisão antes de o Slime Azul entrar.

**2. Códigos `DD-LOR` duplicados.** `DD-LOR-127` a `DD-LOR-133` aparecem duas
vezes, com conteúdos diferentes (linhas 1355–1386 e 1393–1423). Um dos blocos
precisa ser renumerado, senão referenciar um código fica ambíguo.

**3. `DD-BAL-027` conflita com o bestiário implementado.** Ver abaixo.

## Estado do bestiário depois de `DD-BAL-027`

Aplicar a âncora canônica ao Slime Verde deixa o resto do bestiário
**desalinhado** — o que é esperado: `DD-BAL-038` manda balancear o Tier I
inteiro antes de seguir, e esse trabalho ainda não foi feito.

| Criatura | HP | XP | Situação |
|---|---|---|---|
| Slime Verde | 50 | 10 | ✅ canônico (`DD-BAL-027`) |
| Rotworm | 90 | 20 | ⚠️ acima da âncora do Tier I — DORMENTE |
| Snake | 70 | 24 | ⚠️ idem — DORMENTE |
| Aranha | 80 | 26 | ⚠️ idem — DORMENTE |
| Coelho | 25 | 6 | ⚠️ DORMENTE |
| Javali | 150 | 34 | ⚠️ DORMENTE |
| Zumbi | 160 | 40 | ⚠️ ativo, precisa de Tier definido |
| Super Slime | 2400 | 800 | ⚠️ chefe, escala própria (`DD-BAL-042`) |

As DORMENTES não nascem no mapa, então o desalinhamento não afeta quem joga
hoje. O Zumbi afeta.

## ⚠️ Conflito interno do Doc 3: o Tier do Slime Azul

A linha 1906 diz **`Slime Azul → Tier II`**. A ficha canônica na linha 3155 diz
**`Tier: I`**. As duas não podem valer.

Implementado como **Tier I**, seguindo a ficha — ela é mais específica, mais
recente no documento e traz os números. Precisa de confirmação.

## Ordem sugerida de implementação

1. ✅ **`DD-BAL-027`** — Slime Verde como âncora *(feito)*
2. ✅ **`DD-BAL-033` a `036`** — família Slime inteira *(feito)*
3. ✅ **`DD-BAL-055`** — Zumbi é Tier III *(feito)*
4. ✅ **`DD-BAL-044` a `059`** — Tier II e Tier III definidos *(feito, dormentes)*
5. 🔴 **ARTE** — é o que trava tudo agora, ver abaixo
6. **Lore no código** — Asteria em `towns.ts`, destrava a Etapa 16

## 🔴 O gargalo virou ARTE, não código

18 criaturas novas estão definidas com ficha canônica e **nenhuma nasce no
mapa**. O motivo não é espaço nem código:

O cliente escolhe o desenho por `creatureType` e, para tipo desconhecido, cai em
`drawSlime` (`client/src/main.ts`). Spawnar hoje encheria o mundo de **bolhas
visualmente idênticas** com atributos de 140 a 480 de vida. O jogador não teria
como distinguir um Troll de um Slime antes de morrer para ele — pior que não ter
as criaturas.

**Dois caminhos, e eles não se excluem:**

| Caminho | O que envolve |
|---|---|
| **Arte de verdade** | um sprite por espécie, como o irmão fez com o Zumbi (formato LPC) |
| **Placeholder distinguível** | dar cor/forma por família no `drawBody`, como o herói que ainda é geometria |

O placeholder destrava playtest sem esperar 18 sprites. Depois cada arte
substitui o placeholder da sua espécie, uma de cada vez.

⚠️ **Expandir o mapa não é necessário ainda.** O 60×60 comporta bem mais que as
27 criaturas atuais — o aperto seria de identificação visual, não de espaço.

## Criaturas definidas e dormentes

**Tier II** (`DD-BAL-044` a `048`): Aranha da Floresta · Aranha de Teia ·
Formiga Soldado · Formiga Cuspidora · Goblin Guerreiro · Goblin Arqueiro ·
Lobo Cinzento · Orc Jovem · Orc Guerreiro

**Tier III** (`DD-BAL-055` a `059`): Esqueleto Guerreiro · Esqueleto Arqueiro ·
Minotauro · Urso Pardo · Lobo Negro · Aranha Gigante · Formiga Mística ·
Kobold Caçador · Troll *(o Zumbi também é Tier III e já está ativo)*

## Comportamentos que as fichas descrevem e a IA ainda não faz

- **Teia da Aranha de Teia** — aplicar Lentidão. Criaturas ainda não aplicam
  condição nenhuma; hoje só o comando `/cond` aplica
- **Recuo do Goblin Arqueiro e reposicionamento do Esqueleto Arqueiro** — não
  existe kite na IA. Eles atiram enquanto dá e brigam quando encostam
- **Buff da Formiga Mística** em outras formigas — não há IA de suporte
- **Armadilhas do Kobold Caçador**
- **Alcateia** do Lobo Cinzento (`predator` persegue, mas não cerca em grupo)

## 🔴 Aviso de dificuldade: o Zumbi na vila inicial

`DD-BAL-055` põe o Zumbi no **Tier III** (340 HP · dano 20–28 · XP 95). Ele
continua nascendo onde nascia: **fora da muralha**, em 9 pontos, longe da zona
segura do centro. Isso não mudou.

O que mudou é o que acontece quando um personagem novo encontra um. Antes eram
160 HP e ~15 de dano; agora é mais que o dobro de vida e quase o dobro de dano,
contra um nível 1 que tem entre 100 e 200 de vida.

⚠️ **O zumbi de `(20,34)` está em linha reta ao sul do nascimento em `(20,20)`.**
Ele foi posto ali de propósito como alvo de teste. Hoje é um encontro
provavelmente fatal para quem acabou de criar personagem.

`DD-BAL-039` **permite** isto — "uma mesma região pode conter criaturas de
diferentes Tiers quando isso fizer sentido para o ambiente", e Tier não é
bloqueio de acesso. Então não é bug. Mas é uma decisão de design que vale ser
tomada de propósito:

- **manter** — sair da muralha é perigoso, e o jogo comunica isso pela dor
- **afastar** os spawns do eixo sul do nascimento
- **substituir** os zumbis próximos por um morto-vivo de Tier menor: o Doc 3 tem
  **Esqueleto no Tier II** (`DD-BAL-051D`, linha 3918)

O código **não** foi alterado — spawn é decisão do dono e do mapa.
3. **Lore no código** — Asteria em `shared/src/towns.ts`, calendário, reinos.
   Destrava a Etapa 16
4. **Crafting por fragmentos** (Bloco 01) — encaixa na Etapa 12
5. **MVPs** (544 decisões) — só depois dos Tiers, como `DD-BAL-038` manda

## Como regerar o texto extraído

O `.docx` é binário e ilegível por ferramenta de busca. Para regerar o `.md`
depois de atualizar o Word, extraia `word/document.xml` do `.docx` (é um zip),
tire as tags e decodifique as entidades HTML.
