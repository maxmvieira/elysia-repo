# Histórico de implementação — Elysia Online

Registro do que cada etapa concluída entregou, **onde mora no código** e quais
decisões de design ficaram travadas por teste.

> **Para uma sessão futura:** leia primeiro o bloco "📍 ONDE ESTAMOS" do
> [`ROADMAP-elysia.md`](./ROADMAP-elysia.md). Este arquivo é o detalhe — use
> quando precisar mexer em algo que já foi feito e entender o porquê.

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

## Armadilha conhecida

⚠️ Não edite `combat.ts` com script de PowerShell. Uma tentativa de trocar os
sete valores de uma vez corrompeu os acentos do arquivo (`ágil` → `Ã¡gil`). Use
a ferramenta de edição.

> **Histórico:** até a Etapa 7 o estado vivia só em memória e cada reinício do
> `tsx watch` apagava os personagens. Isso acabou — hoje tudo vai para o SQLite
> em `data/elysia.db`. O que **não** persiste são as criaturas: `spawnInitialCreatures`
> roda a cada boot, então mexer nos spawns exige reiniciar o servidor.
