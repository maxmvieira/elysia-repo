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

## Armadilha conhecida

O estado vive **em memória**: salvar qualquer arquivo do servidor reinicia o
`tsx watch` e **apaga os personagens**. Isso atrapalha testes longos e some na
Etapa 8 (persistência) — que por isso foi movida para a frente.
