# Roadmap de desenvolvimento — Elysia Online

Plano e estado atual do projeto.

**Os quatro documentos:**
- **este arquivo** — o plano e o estado atual (comece pelo bloco 📍 abaixo)
- [`GDD-doc1-destilado.md`](./GDD-doc1-destilado.md) — **a fonte de verdade destilada**
  (141 KB, 24 passes, 314 referências `DD-` rastreáveis)
- [`HISTORICO.md`](./HISTORICO.md) — o que cada etapa feita entregou e onde mora
- [`GDD-indice-da-conversa.md`](./GDD-indice-da-conversa.md) — índice da conversa antiga

---

## ⚖️ REGRA DE OURO (revisada em 2026-07-28)

A hierarquia de fontes mudou. Vale, **nesta ordem**:

1. 🥇 **Doc 1** ([`../informacoes/doc1-lore-bible-e-gdd.md`](../informacoes/doc1-lore-bible-e-gdd.md),
   78 capítulos) e **Doc 2** ([`ELYSIA ONLINE PARTE 2.txt`](./ELYSIA%20ONLINE%20PARTE%202.txt),
   cap. 78.9–97). O Doc 2 é a **continuação direta** do Doc 1.
2. 🥈 **Dentro dos docs: o capítulo mais alto vence o mais baixo.** O próprio documento
   manda *"priorizar a última revisão cronológica de cada classe, em vez de parar quando
   encontrar o primeiro 'fechado'"* (67.N). Isso vale para **todos** os sistemas.
3. 🥉 **A conversa-fonte virou material histórico.** Onde o Doc 1 fala, é ele que vale.

> ⚠️ **A tabela de "Decisões que substituem a conversa" foi ZERADA.** A decisão de 27/07
> sobre penalidade de morte foi revertida pelo Doc 1 — por escolha explícita do dono
> em 2026-07-28.

### Vocabulário do Design Decision Log

Os docs marcam status por decisão. **Respeitar isso é o que impede reescrever o jogo duas vezes:**

| Status | O que fazer |
|---|---|
| `FECHADO` / `DEFINITIVO` | implementar |
| `FECHADO EM CONCEITO` | a regra vale, **o número não** |
| `ATUALIZAÇÃO POSTERIOR` | **substitui** o que veio antes |
| `REFERÊNCIA DEFINIDA` | número existe, mas é ponto de partida para teste |
| `PENDENTE` / `NÃO CONSOLIDAR` | 🚫 **não implementar, não inventar** |

---

## 📍 ONDE ESTAMOS — leia isto primeiro

**Última atualização:** 2026-07-29
**Etapas concluídas:** 1 a 7 (de 23) — as 1–6 com ajustes pendentes, ver abaixo
**Etapa em curso:** **8 — Elementos, condições e defesa em camadas** ⚔️ — as REGRAS
estão fechadas e testadas em `shared`; falta **ligar no servidor e no cliente**
**Saúde do código:** **182 testes** passando (170 shared + 12 server) · typecheck limpo
nos 3 pacotes · smoke de ponta a ponta validado (derruba servidor → personagem sobrevive)

### 🔴 Três decisões esperando o dono (Etapa 8)

O doc deixa as três em aberto e o código implementou a **estrutura** sem escolher
número. Ver `docs/HISTORICO.md` para o detalhe:

1. **Ordem das camadas de defesa** (`31.56`) — o diagrama do cap. 31 e o texto do
   mesmo capítulo se contradizem. Default atual: o diagrama (escudo antes da
   armadura). A escolha muda o dano final.
2. **Duração de Congelamento × Petrificação** (`DD-CC-012`) — adotada a revisão
   posterior (10 s e 6 s) pela regra de ouro. Confirmar ou reverter.
3. **Método anti-CC-chain** (`DD-CC-013/014`) — resistência temporária?
   diminishing returns? Não implementado, porque o doc não define.

### O que já funciona no jogo

Mapa Valoria 60×60 com andares · movimento e colisão autoritativos · multiplayer em LAN ·
chat · 7 atributos com custo crescente · 4 classes · árvore de 8 habilidades do Guerreiro
(F1–F8, tecla K) · 8 tipos de arma com passivos aleatórios e 7 raridades · proficiência sem
teto · combate PvE · morte com corpo saqueável · 6 comportamentos de criatura · variantes
"Robusto" · bestiário (tecla B) · chefes que escalam · inventário + equipamento + depósito ·
NPC comerciante · ciclo dia/noite · battle list · comandos de teste (`npm run dev:test`).

### ✅ Decisões do dono — 2026-07-28 (destravam a Etapa 7)

Estas **fecham pendências que os próprios documentos deixaram em aberto**. Passam a valer
como canônicas, no mesmo nível do Doc 1.

**1. Nome do personagem** — o jogador escolhe, com filtro:
- ❌ **sem palavrão nem nome abusivo** (lista de bloqueio)
- ❌ **sem caracteres especiais**
- ❌ **sem números**
- ✅ **apenas letras** · nome **único** no servidor
- *(resolve `13.21` e `PENDENTE 13` do cap. 13)*

**2. Cidade inicial e respawn** — 🔴 **Asteria é a cidade principal**, mas:
- o personagem **nasce num vilarejo ao redor** de uma cidade principal, **não** nela
- depois de **ir fisicamente** à cidade grande, pode **defini-la como ponto de
  renascimento**
- ✅ Encaixa exatamente em `DD-MAP-010`/`40.21`: **a conta conhece o mapa, mas o respawn
  continua sendo progressão do personagem** — visitar é o que desbloqueia
- *(resolve `13.47`, `12.26` e `PENDENTE 17/18` do cap. 13)*

**3. Nomenclatura da classe: KNIGHT** — vale o cap. 13, não o 67+.
- 🔧 **O código usa `Warrior` e precisa ser renomeado** para `Knight`
  (`shared/src/stats.ts`, `skills.ts`, servidor e cliente)

---

## ✅ ETAPAS FEITAS (1–6) e o que mudou nelas

### ✅ Etapa 1 — Ficha de personagem

**Confirmada quase inteira pelo cap. 65.** `DD-BAL-008/009`, 65.41 e 65.31 batem linha a
linha com `shared/src/stats.ts`: 7 atributos com LUK, 45 pontos-base, 10 pontos/nível como
**moeda** com custo crescente (1–20 = 2 … 201+ = 20), HP/Mana 200/150/120/100, crítico em
LUK, WIS = regen de mana, **STR não aumenta dano de arco**.

🔧 **Ajustes pendentes:**
- 🔴 **Pontos por nível não são 10 fixos.** `DD-PROG-002`: a curva cresce **10 → 20**
  conforme o personagem avança. ⚠️ As faixas de nível de cada degrau **não estão definidas**
  (66.3: *"não devemos inventar"*) — implementar a estrutura, deixar a curva configurável.
- 🆕 **Números disponíveis que o código ainda não usa:** atributos-base por classe
  (Warrior 11/10/6/6/3/4/5 · Archer 5/6/9/11/4/5/5 · Assassin 7/6/11/7/3/4/7 ·
  Sorcerer 3/5/5/6/12/10/4) · crítico base **2 %** com **10 LUK ≈ +1 %** e dano crítico
  **150 %** · DEX **+1 dano ranged**/ponto · INT **+1 poder mágico e +4 MP**/ponto ·
  esquiva com teto de **30–35 %** vinda de AGI.
- ⚠️ `DD-PROG-009` **HP/MP iniciais JÁ incluem os atributos-base** — não somar o bônus dos
  10 VIT do Warrior por cima dos 200.
- ⚠️ `DD-PROG-010` **Bloqueio não vem de atributo nenhum** — só de escudo, equipamento e carta.

### ✅ Etapa 2 — Skill Points e árvore

**Confirmada pelo cap. 66.** Custo 1-1-1-2-2-3-3-4-5-6 = **28 SP**, SP/nível 1,5 / 1,7 /
1,7 / 2,5, marcos em 10/25/50/75/100 e a cada 50, cooldown que nunca cai — tudo igual.

🔧 **Ajustes pendentes:**
- 🆕 **Druid entra com 2,0 SP/nível** (entre as físicas e o Sorcerer).
- 🔴 **Magic Level não existe no código e precisa entrar** — `DD-PROG-011`: é
  **proficiência, NÃO é INT**. Dois Sorcerers com a mesma INT podem ter Magic Levels
  diferentes. É requisito de magias avançadas (Nevasca, Círculo Arcano).
- 🔧 **As proficiências mudam de forma:** o doc usa **Sword · Axe · Club · Spear · Dagger ·
  Distance · Fist · Magic Level**. Arco e besta colapsam em **Distance**; cajado vira
  **Magic Level**; e existe **Fist** para lutar sem arma.
- ⚠️ 66.65 **O doc tem DUAS escalas de SP** (1,5–2,5 e 10–17 por nível) e manda **não
  fundir**. Mantemos a de 1,5–2,5, que é a implementada.

### ⚠️ Etapa 3 — Warrior — **estrutura superada**

🔴 **O cap. 67.N se corrige:** *"'WARRIOR V1 = FECHADO COM 15 SKILLS' não representa mais a
estrutura mais recente"*. A estrutura atual de **toda classe** é:

```
CLASSE
 ├── Habilidades Gerais (valem para qualquer arma)
 └── Linhas de Maestria por família de arma
        └── cada família com variante 1H (+escudo) e 2H (ofensiva)
```

✅ **As 8 skills implementadas estão corretas, com os cooldowns certos.** Elas não são
jogadas fora — mudam de lugar.

🔧 **Faltam 7 skills** (viram Habilidades Gerais ou entram em linhas):
Grito de Guerra (30 s, buff de party, **não aumenta poder mágico**, não empilha) ·
Contra-Ataque (janela de 1 s; falha se ninguém acertar) · Pele de Ferro (+12 % DEF) ·
Resistência (−20 % duração de CC — **controle ≠ debuff**) · Segundo Fôlego (15 % do HP
**normal**, não do inflado pela Fúria) · Maestria de Armadura Pesada · Última Resistência
(abaixo de 20 % do HP normal, −30 % dano por 5 s, CD interno de 60 s).

🔧 **As 4 famílias de arma do Warrior**, cada uma com 1H e 2H → **8 configurações**:
⚔️ Espada (técnico) · 🪓 Machado (**sangramento**) · 🔨 Maça (**controle**) ·
🔱 Lança (**alcance, formação, guerra**).

### ✅ Etapa 4 — Armas, equipamento e proficiência

🔴 **CORREÇÃO: as 7 raridades estão certas.** `DD-RAR-001` fecha Comum → Incomum → Raro →
Épico → Lendário → Mítico → Relíquia. O "4 raridades" do cap. 76 era só a contagem de
passivos dos quatro primeiros degraus. **Nada a desfazer.**

🔧 **Ajustes pendentes:**
- **Passivos por raridade vão até 6:** Comum 0 · Incomum 1 · Raro 2 · Épico 3 ·
  **Lendário 4 · Mítico 5 · Relíquia 6/únicos**.
- 🆕 **Orçamento de poder:** cada passivo tem peso e cada raridade um teto (Incomum 2 ·
  Raro 5 · Épico 8 · Lendário 11 · Mítico 15 · Relíquia 18). **Mais passivos ≠ melhor.**
- 🆕 **Incompatibilidades:** Roubo de Vida × Roubo de Mana · Eco Arcano × Magia Instável ·
  Ataque Duplo × Golpe Brutal · Flecha Flamejante × Flecha Congelante.
- 🔴 `DD-PAS-016` **SLOTS SÃO PERMANENTES.** Nasceu com 2, morre com 2.
- 🔧 **Proficiência muda** de "por tipo de arma" para **maestria por família + 1H/2H**.
- 🆕 **Raridade máxima por fonte:** monstro comum → Raro · elite → Épico (chance de
  Lendário) · boss de dungeon → Mítico · **world boss → Relíquia**.
- 🆕 **Crafting alcança no máximo Lendário.** Mítico e Relíquia **não são fabricáveis**.
- 🆕 **Slot de Relíquia** no personagem (totem, livro, orbe, amuleto, cristal, insígnia).

### 🔴 Etapa 5 — Morte, loot e punição — **penalidade revertida**

🔴 **A penalidade de XP volta para a tabela do Doc 1** (`DD-DEATH-006/007/008`):

| Level | Penalidade |
|---|---|
| 1–20 | **50 %** |
| 21–100 | **100 %** |
| 101+ | **200–300 %** |

O % é **equivalente de progressão de level**, não XP total.
⚠️ 🔴 `DD-DEATH-009` **A FÓRMULA EXATA É PENDENTE** — o doc se recusa a fechar. Implementar
a **estrutura em faixas**, deixar o cálculo configurável.
✅ **PvE = 60–80 % do PvP** — os 70 % implementados cabem dentro.
✅ Backpack 100 %, chance individual por peça, sem blessings, sem ressurreição, perder nível
zera a distribuição — tudo confirmado.

🔧 **Ajustes pendentes:**
- **Corpo de MONSTRO: ~120 s** (`DD-LOOT-002`), corpo vazio pode sumir antes ✅.
  ⚠️ **O corpo de JOGADOR (15 min) é outro objeto** — o doc não trata os dois juntos.
  **Não unificar sem decidir.**
- 🆕 **Durabilidade entra** (estava "ficou de fora"): todo equipamento **abaixo de
  Lendário** tem durabilidade; ao zerar **não quebra**, perde eficiência até reparar.
  **Lendário nunca precisa de reparo.**
- ⚠️ 🔴 **`PENDENTE 27` do cap. 9: a morte/respawn do jogador não tem justificativa de
  lore.** O doc avisa que *"o personagem continua sendo o mesmo personagem"* — não é
  reencarnação. **Decisão sua.**

### ✅ Etapa 6 — Monstros e bestiário

✅ Os **6 comportamentos** implementados são um refinamento válido dos 3 do doc
(passivo/agressivo/territorial). Bestiário em patamares, chefe revelando 50 %, encontrar já
contar — tudo confirmado.

🔧 **Ajustes pendentes:**
- 🆕 **Falta a 3ª variante: RARO.** `DD-QTB-019`: Comum · Incomum · **Raro**.
- 🆕 **Pontos de task por variante:** Comum **1** · Incomum **3** · Raro **5–8**. Assim
  1.000 pontos **não exigem 1.000 corpos**.
- 🆕 **Marcos de task 100/500/1.000** → **+5–8 % / +20 % / +40 %** de XP, como *recompensa
  de conclusão* — 🔴 **nunca** como aumento permanente do XP do monstro.
- 🆕 **Task e Bestiário compartilham o contador** — não duplicar grind.
- 🔴 **Aggro não é dano.** `DD-AI-003`: ameaça = **proximidade + dano + taunt + habilidades**.
  É isso que faz o tank existir.
- 🆕 **Limite territorial de perseguição** — não dá para arrastar monstro até a cidade;
  ele desiste e **volta caminhando** (sem teleporte).
- 🆕 **Respawn por população de região**, com **reposição parcial** — a hunt **pode ficar
  escassa** de propósito, e **não existe instância** para resolver saturação.
- 🆕 **Dia/noite altera a população** — o ciclo já implementado ganha função de gameplay.
- 🔴 `DD-TIP-023` **Mesma espécie = mesmo bestiário = MESMA CARTA.** Variante não gera
  entrada nem carta própria.

---

## ✅ ETAPA 7 — Persistência e contas 💾 — **FEITA (2026-07-28)**

**Pronto:** conta com login/senha (scrypt+salt) · criação de personagem com o filtro de
nome · ficha inteira no banco (atributos, skills, proficiências, bestiário, inventário,
equipamento, depósito, posição) · autosave a cada 30 s + no disconnect + na morte +
no Ctrl+C · spawn no vilarejo · respawn desbloqueado por visita física · rename
`Warrior → Knight`.

🔴 **Desvio consciente do plano: SQLite, não PostgreSQL.** A máquina não tem Postgres nem
Docker, e exigir um dos dois faria o servidor parar de subir — regressão pior que a falta
de persistência. O Node 24 traz `node:sqlite` embutido (zero dependência). Tudo passa pela
classe `Store`, então trocar para Postgres depois é escrever um segundo `Store` sem tocar
no servidor. Vale a pena quando o alvo de 500 jogadores se aproximar.

⏳ **Ficou para a etapa 7b:** a **névoa de guerra** propriamente dita. As tabelas
(`account_discovery`, `account_marker`) já existem e a separação conta × personagem está
implementada e testada — falta o rastreio de tiles revelados e o desenho no cliente, que é
trabalho de render e merecia etapa própria.

<details><summary>Escopo original da etapa (para conferência)</summary>

*Enquanto o estado vive só em memória, salvar qualquer arquivo do servidor reinicia o
`tsx watch` e apaga os personagens. Tudo construído antes disso é conteúdo que ninguém
consegue manter.*

1. **Login e PostgreSQL**
2. **Salvar** personagem, inventário, depósito, skills, proficiências e bestiário
3. 🆕 **Névoa de guerra POR CONTA** — o cap. 40 é a base pronta:

   | Escopo | O quê |
   |---|---|
   | **CONTA** | geografia descoberta · marcadores · anotações |
   | **PERSONAGEM** | nível · quest · chave · item · **ponto de respawn** |

   `DD-MAP-003` **Todas as cidades principais são visíveis desde o início** — mas
   *destino conhecido ≠ caminho conhecido*. `DD-MAP-025` distinguir **cidade conhecida** de
   **cidade visitada**.

**Pronto quando:** derrubar e subir o servidor mantém nível, itens e skills; e um
personagem novo da mesma conta já enxerga o mapa que outro descobriu.

</details>

⚠️ **Asteria ainda não existe no mapa.** O registro de cidades (`shared/src/towns.ts`) tem
só **Valoria**, que é a vila que o mapa realmente desenha. A cidade principal é conteúdo da
**etapa 16** — quando ela for desenhada, entra como mais uma linha em `TOWNS` e todo o
sistema de visita/respawn já funciona.

---

## ⏭️ ETAPA 8 — Elementos, condições e defesa em camadas ⚔️ — **PRÓXIMA**

---

## 🧱 FASE A — Fundação de combate (o que falta para tudo o resto)

*Base de praticamente todo o resto. Cartas, Druid, Sorcerer, bestiário e PvP dependem disso.*

1. 🆕 **7 tipos de dano** (`DD-ELM-002`): Físico · Fogo · Gelo · Elétrico · Veneno ·
   Sagrado · Sombrio. 🔴 **Elemento ≠ Condição** — dano de gelo **não congela** sozinho.
2. 🆕 **Condições:** Congelamento · Petrificação · Stun (os três **interrompem cast**) ·
   Silêncio (**só** bloqueia magia) · Veneno · Sangramento · Queimadura · Lentidão ·
   Knockback · Aprisionamento.
3. 🆕 **Defesa em camadas:** `ESQUIVA → ESCUDO → ARMADURA → RESISTÊNCIAS → dano final`,
   com **Bloqueio Completo** à parte. 🔴 **Escudo normal reduz dano, não anula** — e
   **chance de bloqueio não vem de nenhum dos 7 atributos**.
4. 🆕 **Três níveis de contramedida:** Resistência (chance) · Redução (duração) ·
   Imunidade (não funciona).
5. 🆕 **Flag PK ON/OFF** — com PK OFF, AoE/DoT/armadilha de um jogador **simplesmente não
   existe** para outro, e o caster não vira PK.

⚠️ **Pendente no doc:** a **duração** de Congelamento × Petrificação está em conflito
(`DD-CC-012`) — mas a **diferença mecânica vale**: dano quebra congelamento, **não** quebra
petrificação, e o petrificado ganha grande bônus de DEF/MDEF.

### Etapa 9 — Party, shared XP e distribuição de loot 👥

1. **Shared XP com faixa de nível:** ~10 níveis até Lv.100, ~20 depois. 🔴 Um Lv.300 pode
   **ajudar** um Lv.20, mas **não divide XP** — anti-power-leveling.
2. **Bônus de grupo antes da divisão** — solo rende mais por monstro; party rende mais no total.
3. 🔴 `DD-PARTY-011` **LOOT NÃO É MULTIPLICADO.** 5 itens são 5 itens com 2 ou 10 jogadores.
4. **Três modos:** Aleatório · Loot do Líder · Loot Livre, visíveis antes de entrar.
5. 🔴 **O líder não muda a regra sozinho** — proposta + votação por maioria simples, empate
   mantém, e **trava durante combate de boss** (anti-golpe).
6. **Boss compartilhado:** contribuição pondera o sorteio · **last hit não vale nada** ·
   existe contribuição mínima · solo compete normalmente.

---

## 💎 FASE B — Itens e economia

### Etapa 10 — Cartas 🃏 *(era a Etapa 7)*

1. `DD-CAR-001` **Cada monstro tem sua carta exclusiva** — bicho fraco continua relevante.
2. **8 cartas ativas, limite do PERSONAGEM** · **0–3 slots por peça** · contador `6/8` na UI.
3. 🔴 **Carta encaixada fica presa ao item para sempre.**
4. **Validação ao equipar:** 7/8 + peça com 3 cartas = **bloqueado**, com mensagem.
5. **Quatro categorias:** Arma · **Escudo** · Armadura · **Acessório** — escudos e anéis
   voltaram ao sistema (decisões antigas substituídas).
6. **MVP Cards são alteradoras de mecânica**, não pacotes de atributo.
7. 🆕 **RESSONÂNCIA** — cartas raras com propriedade oculta que desperta no refino
   **+10 / +12 / +15**, descoberta pela comunidade e depois registrada no Grimório.

### Etapa 11 — Refino, reroll, evolução e durabilidade 🔨

1. **Quatro camadas independentes:** Raridade · **Evolução** (sobe o patamar) ·
   **Refino +0→+15** (fortalece dentro dele) · **Reroll** (só os passivos).
2. 🔴 **Falhar no refino NÃO destrói o item e não volta para +0** — o custo é o gold e os
   materiais. Curva-base: +1/+2 100 % … +10 40 % … **+15 = 3 %**.
3. **Durabilidade:** abaixo de Lendário perde eficiência (não quebra); Lendário é imune.
4. 🆕 **Encantamento:** **um único elemental por item** (Fogo/Gelo/Raio/Terra/Luz/Sombras),
   removível, caro para aplicar e para remover.
5. 🆕 **Fragmentos Lendários:** boss não dropa lendário pronto — **100 fragmentos**, o
   jogador escolhe a categoria, sai um lendário **aleatório**.

### Etapa 12 — Profissões, craft e economia 💰

1. 🔴 `DD-PROF-004` **SEM LIMITE de profissões** — o gargalo é tempo, receitas e materiais.
2. **Quatro categorias:** Coleta · Transformação · Produção · Serviços.
   ⚠️ `DD-PROF-015` **Fundidor, Curtidor e Serralheiro foram absorvidos** nas principais.
3. **Qualidade:** Comum → Boa → Excelente → **Obra-Prima**.
4. 🆕 **Assinatura do artesão** grava o nome de quem forjou, permanentemente.
5. **Receitas são separadas do nível da profissão** — vêm de exploração, quest, MVP, evento.
6. 🆕 **Correio** (ouro, marketplace, pacotes — **não armazena**) e **marketplace**.
7. 🆕 **Mochilas com peso E compartimentos:** 200/20 · 500/40 · 1000/60 · 1500/80 +
   bolsas especializadas que reduzem o peso do tipo.
8. **Gemas: REMOVIDAS.**

---

## 🎭 FASE C — Classes

### Etapa 13 — Maestrias de arma e reestruturação das classes 🗡️

*Converte a Etapa 3 para a estrutura nova e prepara o terreno para as outras classes.*

1. **Habilidades Gerais + linhas de maestria por família**, cada uma com 1H/2H.
2. **As 7 skills que faltam ao Warrior.**
3. **Magic Level e Fist** como proficiências.
4. 🔴 **Assassin:** Ataque Duplo (35 % → **80 %** do Lv.1 ao 10) — **1 adaga = golpe extra
   integral (200 %)** · **2 adagas = golpe extra a 50 %** · **Katar sem Ataque Duplo**
   (crítico + Sonic Blow) · **anti-cascata**: Ataque Duplo não gera outro.
5. 🔴 **Archer:** 5 configurações (Arco Curto+escudo · Arco Longo · Besta Leve+escudo ·
   Besta Pesada · **Azagaia**+escudo). **Sem dash, sem backstep, sem teleporte.**
   Munição elemental é **item**, não skill. **Distance reduz a perda da azagaia.**

### Etapa 14 — Sorcerer completo 🔮

18 habilidades em 4 escolas: 🔥 Fogo (destrói) · ❄️ Gelo (controla) · ⚡ Raio (reage e
explode) · ✨ Arcano (faz o Sorcerer funcionar).
🔴 **Congelamento dura ~10 s**, mas **dano quebra o gelo**. **Círculo Arcano = 100 % de
imunidade a dano FÍSICO** (magia passa normal), 4 s no Lv.10, CD 45 s.
🔴 **Ataque básico com cajado é FÍSICO** — magia exige habilidade e mana.

### Etapa 15 — Druid 🌿 *(a 5ª classe)*

23 habilidades em 4 ramos: 💚 Cura (5) · 🌟 Buff (6) · ☠️ Debuff (6) · 🌿 Natureza (6).
🔴 **WIS é o atributo principal, não INT** — e **WIS escala o poder de cura**.
🆕 **PETRIFICAÇÃO** é o status característico: mais curta que o congelamento, **dano não
remove**, e o alvo ganha **grande bônus de DEF/MDEF** (é controle puro, não prepara burst).
🆕 **Cura como arma:** energia vital **cura vivos e causa DANO** em mortos-vivos, vampiros e
demônios — inclusive em Cura em Área e Santuário.
🔴 **Sem Ressurreição** — a função do Druid é **impedir** a morte.

⚠️ **Priest não existe.** São **5 classes**, não 6.

---

## 🌍 FASE D — Mundo

### Etapa 16 — Cidades, NPCs e quests 🏘️

🔴 Elysia **não é** "NPC → quest → NPC → quest". Só **quatro capítulos narrativos**
(marcos ~Lv.10 / 50 / 100 / 200 — tratados como referência, não como número canônico), e o
**Capítulo Final encerra a história, não o jogo**.
**Diário lembra o que foi descoberto — não é GPS.** Quest é do **personagem** (o mapa é da
conta). Vilarejo inicial · cidade principal com até 60 NPCs · guardas patrulhando.

⚠️ **Muito pendente aqui:** cidade inicial, capital humana, sistema político, religiões,
Asteria, ordens de Knights. **Não inventar.**

### Etapa 17 — PvP, skulls e criminalidade ⚔️

🟡 **Yellow Skull** (quem intervém para proteger não é PK comum) · 🔴 **Red Skull**
(3 kills/dia ou 5/semana; some em **7 dias sem novos kills**) · ⚫ **Black Skull**
(10/semana; **30 dias**). **Level baixo NÃO tem imunidade.** **Duelo é separado de PK.**
Guardas reagem em cidades **e regiões próximas**.
✅ O problema de "AoE acertando quem não está em PvP" é resolvido pelo **flag PK** da Etapa 8.

### Etapa 18 — Casa, montaria e sobrevivência 🏠

**Casas físicas, em quantidade limitada** — localização tem valor. **Um Locatário
Principal** + moradores com permissões. **Transferência mantém upgrades; despejo reseta.**
🔴 **Investimento estrutural pertence à casa — sem reembolso**, com aviso explícito.
Instalações: Forja · Laboratório · Cozinha · **Área de Treinamento** (offline ≈ 5 %).
**Três ciclos de inadimplência** com **cobrança global do servidor**.
🔴 **Aluguel vencido NÃO perde itens** — entra em **"Armazenamento Lacrado"** (Doc 2
substitui o "Depósito de Despejo" do cap. 19).
**Peso:** 0–70 % livre · 70–90 % leve penalidade · 90–99 % lento · **100 % não anda**.
🔴 **A FOME NÃO MATA** — afeta regeneração. **Montaria morre junto com o dono** (a versão
em que ela fugia para o estábulo foi rejeitada).

### Etapa 19 — Dungeons, MVPs e bosses 🕳️

**Dungeons desenhadas à mão, abertas, sem level mínimo artificial** — o perigo é comunicado
pelo ambiente, não por placa. Classificação interna **D1–D6**, invisível ao jogador.
🔴 `36.27` **TODO BOSS DEVE SER TECNICAMENTE SOLÁVEL** — proibido design de "dois botões
simultâneos". **Solo que derruba boss compartilhado fica com todo o loot.**
🆕 **Boss Mítico é a exceção instanciada:** 1–10 jogadores, escalonamento **não linear**, e
🔴 **o solo NÃO perde a chance do melhor item**.

### Etapa 20 — Guildas, castelos e Guerra do Império 🏰

🆕 **Sistema muito maior do que o roadmap antigo supunha.**
**Guerra do Império:** PK desativado · **zero** perda de XP/nível/skill · **zero** drop de
equipamento · só **até 20 % da bolsa**.
**Primeira Conquista** (2 guildas, ambas externas, guarnição neutra) ≠ **Invasão**
(defensora nasce dentro). **Guardião** (castelo neutro) ≠ **General** (conquistado) +
**Coração do Castelo** como objetivo final. **Sala do Guardião sela com 5 membros da mesma
guilda.** Duas derrotas consecutivas para a mesma guilda = perde o castelo.
**Castle Level** separado de Guild XP. **Comandante da Guarnição** distribui soldados fixos.
Cargos por permissão · **Cofre é da guilda**, com histórico obrigatório.

### Etapa 21 — Calabouço do Castelo 🕳️👑 *(sistema novo)*

**10 andares por castelo**, exclusivos da guilda proprietária — perdeu o castelo, perde o
acesso. **MVP aleatório a partir do 7º andar** após limpar o andar (sem horário fixo).
Cada castelo produz **materiais exclusivos** → **nenhum produz tudo** → obriga comércio
entre guildas. Andares 1–6 integram iniciantes; 7–10 dão material territorial.
🔴 **O endgame de verdade continua no mundo aberto.**

### Etapa 22 — Mundo grande, biomas e transporte 🗺️

**8 grupos de bioma:** Planícies · Florestas · Montanhas · Pântanos · Desertos · Regiões
Geladas · Mortos-Vivos · Corrompidas. Costa e ilhas são **geografia**, não bioma.
🔴 **BIOMA NÃO DETERMINA LEVEL** — a mesma floresta pode ser inicial perto da cidade e
Lv.150+ do outro lado do mundo. **Transições naturais**, sem linha reta grama/neve.
**Montarias** (sem cidade, sem dungeon, dano desmonta, 3 s para remontar, sem voadora) ·
**barcos e portos** (sem teleporte global, sem combate naval) · **mapas negociáveis** com
oferta limitada · clima · 500 jogadores por servidor.

### Etapa 23 — Bestiário completo 👹👹

**27 famílias** consolidadas. 🔴 **Construir REGIÃO POR REGIÃO** (`DD-BIO-018`), não por
família como o roadmap antigo sugeria — ecossistema completo de cada região antes de passar
para a próxima.

**Ordem oficial** (64.51): `bestiário fechado → faixas de nível → HP/dano/defesa/XP → loot
→ sprites`. 🔴 **Nada de "Orc tem X HP" antes da régua global.**

**Tiers I–VI** (1–20 · 20–50 · 50–100 · 100–150 · 150–200 · 200+) como **régua, não
barreira**. **MVP tem escala própria:** Inicial → Intermediário → Avançado → Endgame →
Mítico.
**Três regras anti-inflação:** habitat não cria espécie · variante não cria entrada ·
"mais criaturas ≠ bestiário melhor".
🔴 **O monstro precisa ter uma razão para existir** — o que come, quem o caça, que recurso
produz.

---

## Depois do lançamento

- **Elfos, Anões e Orcs** como raças jogáveis — 🔴 **Orcs são um dos quatro Povos Livres**,
  não uma raça maligna. Devem **existir no mundo como NPCs antes** de virarem jogáveis.
- Torre de 100+ andares · novos arcos da história · conteúdo 300+/400+/500+.

## Fora de escopo (decidido)

- **Pets** · **Caravanas** · **Gemas** (removidas no Doc 2) · **Gnomos**
  (🔴 `DD-LOR-081` **removidos completamente** — nem NPC, nem monstro, nem história) ·
  slot de carta em anel *(revogado: anéis **voltaram** ao sistema de cartas)* ·
  tamanho de item no inventário · montaria voadora · combate naval · teleporte global.

---

## ⚠️ Pendências do próprio documento — **não inventar**

O Doc 1 marca centenas de itens como `PENDENTE`. Os que mais afetam implementação:

| Área | O que está em aberto |
|---|---|
| **Combate** | fórmula final de cada atributo · cap de ASPD · fórmula de esquiva, precisão, crítico, defesa · regen de HP/mana |
| **Morte** | fórmula de conversão da penalidade · **justificativa de lore do respawn** · ressurreição verdadeira existe? |
| **Mundo** | cidade inicial · capital humana · sistema político · religiões · calendário e Ano Zero |
| **Lore** | **nomes, poderes e destinos dos 7 Arcanjos** · qual deles caiu · 7 Senhores da Corrupção ≠ 7 Senhores do Inferno · se a Corrupção tem vontade |
| **Bestiário** | contagem final · Tier das criaturas ausentes da lista · multiplicadores de variante |
| **Casa** | tamanhos · fórmula de aluguel · janela de invasão · efeito da Bandeira |

📌 **Falta ainda o Doc 3** (preenchimento de lacunas), que o dono ainda está finalizando.
Boa parte dessas pendências provavelmente é resolvida por ele.
