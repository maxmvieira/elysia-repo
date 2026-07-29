# Destilação do Doc 1 — Lore Bible / GDD consolidado

Fonte: [`../informacoes/doc1-lore-bible-e-gdd.md`](../informacoes/doc1-lore-bible-e-gdd.md)
(58.596 linhas · 78 capítulos · baixado do Google Docs em 2026-07-28)

> **Regra de ouro NOVA (decidida em 2026-07-28):** o **Doc 1 vence sempre** —
> inclusive sobre decisões tomadas depois da conversa-fonte. A conversa
> (`conversa-gpt-elysia-historia-mmorpg.md`) passa a ser material histórico;
> onde o Doc 1 fala, é ele que vale.

O Doc 1 traz um **Design Decision Log** com status por decisão. Vocabulário dele:

| Status | Significa |
|---|---|
| `FECHADO` | vale, pode implementar |
| `FECHADO EM CONCEITO` | a regra vale, o número ainda não |
| `ATUALIZAÇÃO POSTERIOR` | substitui o que veio antes no próprio doc |
| `REFERÊNCIA DEFINIDA` / `RECUPERADA` | número existe, mas é ponto de partida |
| `PENDENTE` / `NÃO CONSOLIDAR` | **não implementar** — o doc se recusa a fechar |

**Nota sobre o arquivo:** ele tem duplicações (títulos de capítulo repetidos e o
cap. 76 aparece duas vezes, na linha 56590 e na 57238). A numeração de capítulos
também se repete por assunto (atributos aparecem em 15, 66 e 73; morte em 17, 34
e 74). **Quando houver duas versões, a de capítulo mais alto é a consolidada.**

---

## Passe 1 — capítulos 72 a 78 (consolidação final)

### Cap. 72 — As CINCO classes

Warrior · Assassin · Archer · Sorcerer · **Druid**. **Priest não existe.**

| Classe | Identidade | Combate |
|---|---|---|
| ⚔️ Warrior | linha de frente | resistência + armas + aggro |
| 🗡️ Assassin | burst/mobilidade | explosão + furtividade + veneno |
| 🏹 Archer | distância | kiting + traps + controle territorial |
| 🔮 Sorcerer | poder mágico | elementos + grandes magias + controle |
| 🌿 Druid | sustentação | cura + buff + debuff + Natureza |

- Warrior separa **maestria 1H** (com escudo, defensivo) de **2H** (ofensivo).
  "Warrior" deixa de ser sinônimo de tank.
- Assassin tem 3 configurações: **1 adaga = dano dobrado** · **2 adagas = 2º
  golpe com dano reduzido** · **Shuriken** (arremesso).
- Sorcerer: 18 habilidades. Druid: **23 habilidades**.
- Nenhuma classe deve ser boa em tudo; counters vêm também de equipamento e carta.
- ⚠️ **Números do doc (15 %, 6 s, 450 %…) são valores iniciais de balanceamento,
  não leis** (72.27).

### Cap. 73 — Progressão

- `DD-PROG-001` **Sem level cap.** Progressão desacelera em levels altos.
- `DD-PROG-003` Level não define poder sozinho. Quatro camadas: **Level ·
  Atributos · Proficiências · Skill Points**.
- `DD-PROG-020` Sistemas que escalam demais (vel. de ataque, esquiva, redução de
  cast, crítico) precisam de **soft caps / retornos decrescentes**.
- `DD-PROG-008/009` Sorcerer e Druid recebem **mais SP** (árvores maiores), mas
  não podem maximizar tudo.
- `DD-PROG-007` Pré-requisito não exige maximizar a skill anterior — só o mínimo.
- Proficiências: **1H · 2H · Distance · Shield · Magic Level**.
- `DD-PROG-011` **Magic Level é proficiência, NÃO é INT.** Requisito de magias
  avançadas (Nevasca, Círculo Arcano).
- `DD-PROG-021` diz que a lista de atributos não estava fechada — mas ⚠️ **isso foi
  resolvido no cap. 65**: `DD-BAL-008` fecha os **7 atributos** (STR/VIT/AGI/DEX/INT/
  WIS/LUK). A versão de 6 sem WIS é a proposta *antiga*. **Vale a de 7.** Ver Passe 3.
- Referência conceitual: um Lv.100 exige ~4 Lv.25 ou ~2 Lv.50 para enfrentá-lo.

### Cap. 74 — Morte

- `DD-DEATH-002` **Backpack dropa 100 %** na morte normal.
- `DD-DEATH-003` Cada peça equipada tem **chance individual** de cair.
- `DD-DEATH-004` **Sem Blessings/amuletos** que anulem o drop.
- Perda de XP por faixa (`DD-DEATH-006/007/008`):
  | Level | Penalidade |
  |---|---|
  | 1–20 | **50 %** |
  | 21–100 | **100 %** |
  | 101+ | **200–300 %** |
- O % é **equivalente de progressão de level**, não XP total do personagem:
  100 % ≈ uma referência de level inteira, 300 % ≈ três.
- `DD-DEATH-009` ⚠️ **A fórmula exata está PENDENTE** — o doc se recusa a fechar.
- `DD-DEATH-010` **PvE = 60–80 % da punição de PvP/PK** (correção posterior, prevalece).
- `DD-DEATH-011` A perda pode ultrapassar o level atual → **perder level**.
- `DD-DEATH-012` **Sem ressurreição.** O papel do Druid é impedir a morte, não desfazê-la.
- Corpo/loot no chão: referência de **~120 segundos**.
- Área de caça **não pertence** a quem chegou primeiro.

### Cap. 75 — PK e Skulls

- PvP aberto fora das áreas protegidas. `DD-PK-002` **Level baixo NÃO tem imunidade.**
- 🟡 **Yellow Skull** — quem intervém para proteger alguém de um agressor não é
  tratado como PK comum.
- 🔴 **Red Skull** — 3 kills/dia **ou** 5/semana. Some após **7 dias sem novos kills**.
- ⚫ **Black Skull** — 10 kills/semana. Some após **30 dias sem novos kills**.
- Guardas patrulham cidades **e regiões próximas**, reagindo a agressão.
- `DD-PK-009` **Duelo consensual é separado de PK.**
- ⚠️ `DD-PK-010` PENDENTE: multiplicadores de drop de Red/Black, prisão, bounty,
  quais serviços NPC recusam criminosos.

### Cap. 76 — Loot, raridade e cartas

- Raridade controla **quantas propriedades** o item carrega, não o dano base:
  | Raridade | Propriedades |
  |---|---|
  | ⚪ Common | 0 |
  | 🟢 Uncommon | 1 |
  | 🔵 Rare | 2 |
  | 🟣 Epic | 3 |
- `DD-ITEM-005` **Lendário NÃO é "Epic + 1"** — é *item especial*, com identidade
  e origem próprias, tratado fora da escada de raridade.
- `DD-ITEM-006` **Carta é camada separada** da raridade do item.
- `DD-ITEM-008` Uma carta **não** neutraliza vários status ao mesmo tempo.
- `DD-ITEM-011` NPC não vende os melhores itens; raros circulam entre jogadores.
- `DD-ITEM-013` Loot abandonado some em **~120 s**.
- `DD-ITEM-016/017` **Regra de loot da party não muda em silêncio** — exige aviso
  e votação (aceitar/rejeitar), para impedir golpe do líder.
- `DD-ITEM-018` **Dungeons normais são open world**, estilo Tibia — não instanciadas.
- `DD-ITEM-019/020/021/022/023` **Boss Mítico é a exceção instanciada**: 1 a 10
  jogadores, escala de forma **não linear**, e **solo mantém chance do melhor drop**.
- Três categorias distintas: **Boss** (região/dungeon) · **MVP** (mundo
  compartilhado) · **Boss Mítico** (instanciado).
- Economia precisa de **item sinks** (mundo sem seasons acumula itens para sempre).

### Cap. 77–78 — Economia e profissões

*(lidos parcialmente — completar no passe final)* Economia controlada pelos
jogadores; NPC fornece só a base; profissões transformam material em equipamento;
faltam moeda, gold sinks e controle de inflação.

---

---

## Passe 2 — Doc 2 completo (capítulos 78.9 a 97 + Decisões Oficiais)

Fonte: [`ELYSIA ONLINE PARTE 2.txt`](./ELYSIA%20ONLINE%20PARTE%202.txt) · 6.265 linhas.
**É a continuação direta do Doc 1** — começa no meio do cap. 78.

### Cap. 79 — Sobrevivência

- `DD-SURV-001/002` Existem **fome** e **peso/capacidade**.
- `DD-SURV-004/005` Excesso de peso reduz **movimentação** *e* **regeneração** — peso
  não é limite binário.
- Loot conta no peso: a hunt termina naturalmente quando o personagem enche.
- `DD-SURV-009` **Não adicionar** sede, temperatura, sono, sanidade, doença, fadiga.
- ⚠️ `DD-SURV-007` Fórmula de capacidade PENDENTE (não fixar `STR × N`).

### Cap. 80 — Montarias

- `DD-MOUNT-005` **Não pode montar dentro das cidades.**
- `DD-MOUNT-006` Montaria **some ao entrar em dungeon**.
- `DD-MOUNT-007` **Receber dano desmonta** — vale para dano de monstro também.
- `DD-MOUNT-008` **Remontar leva ~3 s** e a montagem pode ser interrompida.
- `DD-MOUNT-010` Capacidade de carga finita — montaria não é banco portátil.
- `DD-MOUNT-012` **Sem montaria voadora.**
- ⚠️ `DD-MOUNT-011` PENDENTE: o que acontece com a carga da montaria na morte.

### Cap. 81 — Barcos

- Portos ligam continentes/ilhas; o jogador precisa **chegar fisicamente** ao porto.
- `DD-SHIP-007` **Teleporte global irrestrito não existe** — geografia importa.
- `DD-SHIP-008/009/010` **Não adicionar** pilotagem manual, combate naval nem
  construção de navios.
- Passagem pode funcionar como **gold sink**, sem bloquear exploração inicial.

### Cap. 82 — Casas e castelos (visão geral)

- Propriedades existem **dentro do mundo**, não como menu.
- `DD-HOUSE-005` Bases podem sofrer **raid** — patrimônio físico gera risco.
- ⚠️ PENDENTE: regras de raid, proteção offline, capacidade, aquisição de terreno,
  se a construção é livre. **Não presumir.**
- Servidor de ~**500 jogadores** torna propriedade socialmente significativa.

### Cap. 83 — GUERRA DO IMPÉRIO (muito detalhado)

**Regras de PvP e morte durante a guerra** — completamente diferentes do mundo:

| Durante a Guerra do Império | |
|---|---|
| PK / caveira | **desativado** (`DD-WAR-011`) |
| Perda de XP, nível, skill, proficiência | **zero** (`DD-WAR-008`) |
| Drop de equipamento | **zero, regra absoluta** (`DD-WAR-010`) |
| Perda da bolsa | **até 20 % dos recursos carregados** (`DD-WAR-009`) |

O risco econômico da guerra está nos **consumíveis**, nunca no equipamento.

**Dois tipos de guerra** (`DD-WAR-012`…`019`):

| | Primeira Conquista | Invasão posterior |
|---|---|---|
| Dono | nenhum | existe |
| Guildas | 2 disputando | atacante × defensora |
| Spawn | ambas **externas**, em lados opostos | defensora **dentro** do castelo |
| Guarnição NPC | **neutra**, hostil às duas | serve à defensora |
| Vantagem defensiva | nenhuma | proprietária |

- Múltiplas entradas que **convergem** para o centro → Salão Central → **Porta do
  Guardião** (o grande gargalo) → Sala do Guardião → **Núcleo/Coração**.
- **Sala do Guardião**: quando os **5 primeiros membros da mesma guilda** entram,
  a porta **sela**. Vira PvE 5 × Guardião; ninguém mais entra, nem aliado nem
  inimigo. Se o grupo morre, a porta reabre e outra equipe pode tentar.
- **Guardião ≠ General.** Castelo **neutro** tem *Guardião* (espírito da fortaleza,
  um por castelo: Magma, Gelo, Ancestral, Sombras). Castelo **conquistado** tem
  *General do Império* (nível 1 ao conquistar, evolui com a guilda) + Guarnição +
  Coração.
- **Objetivo final é o Coração do Castelo**, não matar jogadores nem o General.
- **Comandante da Guarnição**: a guilda não compra soldados — a quantidade é fixa,
  ela **distribui** os existentes entre entradas, muralhas e salas. Duas guildas
  com o mesmo castelo o defendem de formas completamente diferentes.
- Ciclo: 1ª derrota → perde Guild XP, General enfraquece · **revanche em 15 dias** ·
  **2ª derrota consecutiva para a mesma guilda** → perde o castelo, reset total,
  novo dono começa no General nível 1.

### Cap. 84 — Evolução dos castelos

- **Três progressões separadas**: Level do personagem · Guild XP · **Castle Level**.
- Evoluem em separado: General · Guarnição · Muralhas · Portões · Torres · Quartel ·
  Tesouro · Bênçãos. A guilda escolhe onde investir → castelos com personalidade.
- Evolução da guarnição melhora **qualidade**, não quantidade de soldados.
- Melhorias **não são instantâneas** — exigem tempo e recursos.
- `DD-CASTLE-005` Bênçãos são **benefícios moderados** (XP, regen, velocidade).

### Cap. 85–86 — CALABOUÇO DO CASTELO *(sistema novo, não estava no roadmap)*

- `DD-CASTLE-006` Cada castelo tem um **calabouço exclusivo** da guilda proprietária.
  Perdeu o castelo → perde o acesso na hora.
- `DD-CASTLE-007` **10 andares**, dificuldade e loot crescentes.
- `DD-CASTLE-008` **A partir do 7º andar**, limpar o andar completamente dá **chance**
  (não garantia) de nascer um **MVP aleatório**. Sem horário fixo → sem camping.
- `DD-CASTLE-009` Cada castelo produz **materiais exclusivos** (Vulcânico → minério e
  essência de fogo; Glacial → cristais e couros invernais; Floresta → madeira antiga
  e resinas). **Nenhum castelo produz tudo** → obriga comércio entre guildas.
- Divisão de recompensa sugerida: andares 1–6 integração de iniciantes; 7–10 materiais
  territoriais e MVP; **o endgame de verdade continua no mundo aberto**.

### Cap. 89–91 — Administração e infraestrutura da guilda

- Cargos: **Fundador** (histórico, permanente) · **Líder** (só um) · Vice-Líderes ·
  Oficiais · Recrutadores · Membros + **cargos personalizados por permissão**.
- `DD-GUILD-022` **Cofre é da guilda, nunca do líder.** `DD-GUILD-023` **histórico de
  movimentação obrigatório** (quem depositou, quem retirou, custo das bênçãos).
- **Banco da Guilda ≠ Cofre**: o Banco guarda itens *pessoais* de cada membro.
- Estruturas do castelo: Salão Principal · Sala do Conselho · Quartel · Arsenal ·
  Portal do Calabouço · Pátio de Treinamento · Estábulos · Armazéns · Torre de Vigia ·
  Banco · Oficina · Biblioteca · Hospital · Sala dos Registros.
- `DD-CASTLE-021` Infraestrutura dá **conveniência, não bônus de combate**.
- Portal do castelo leva **só a áreas do próprio território** — não é teleporte global.
- `DD-TERRITORY-001` **O território NÃO é fechado** — qualquer jogador continua podendo
  caçar, coletar e atravessar a região. O privilégio da guilda é o calabouço e a
  infraestrutura, nunca bloquear mapa.

### Cap. 93–97 — Craft e profissões

- Qualidade do item produzido: **Comum → Boa → Excelente → Obra-Prima**, dependendo da
  habilidade do artesão, dos materiais e da receita.
- `DD-CRA-004` **Assinatura do artesão** grava o nome de quem forjou, permanentemente.
- `DD-PROF-003` **Receitas são separadas do nível da profissão** — vêm de exploração,
  quests, dungeons, MVPs, comerciantes e eventos.
- Quatro categorias: **Coleta** (Minerador, Lenhador, Herbalista, Pescador, Caçador) ·
  **Transformação** · **Produção** (Ferreiro, Armeiro, Carpinteiro, Alfaiate, Joalheiro) ·
  **Serviços** (Alquimista, Encantador, Cozinheiro).
- `DD-PROF-004` **CONFIRMADO: sem limite de profissões** — todo personagem pode aprender
  todas. O gargalo é tempo, receitas e materiais.
- `DD-PROF-015` **Profissões são autossuficientes** — Fundidor, Curtidor e Serralheiro
  foram **absorvidos** nas profissões principais, não existem separadamente.

### 🔴 DECISÕES OFICIAIS (bloco final do Doc 2 — as mais concretas de todo o material)

1. **Gemas: REMOVIDO.** Sem rubi/safira/diamante/esmeralda, sem slot de gema.
   Personalização vem de atributos naturais, encantamento, qualidade da forja e raridade.
2. **Durabilidade: CONFIRMADO.** Todo equipamento **abaixo de Lendário** tem durabilidade.
   Ao zerar: **o item NÃO quebra**, continua equipado, mas **perde eficiência** até ser
   reparado. Reparo devolve 100 % e **não reduz a durabilidade máxima**.
   **Lendário não perde durabilidade e nunca precisa de reparo.**
3. **Encantamentos: CONFIRMADO.** **Um único encantamento elemental por item** —
   Fogo, Gelo, Raio, Terra, Luz ou Sombras. Pode ser removido; aplicar e remover
   **custam caro**.
4. **Craft Lendário.** Boss não dropa item lendário pronto — dropa **Fragmento Lendário**
   (chance baixa). **100 fragmentos** → o jogador **escolhe a categoria** (espada, arco,
   armadura…) → sai um **Lendário aleatório** (com/sem slot, com/sem atributo, qualidade
   e aparência variáveis).
5. **Correio.** Só três funções: transferir ouro · entregar compras do Marketplace ·
   enviar pacotes. **Não armazena equipamento.**
6. **Banco × Casa.** Banco: espaço **pequeno**, expansível por muito ouro, para itens
   importantes. Casa: armazenamento **praticamente ilimitado**, baús, decoração.
   ⚠️ **Aluguel vencido NÃO faz perder itens** — a casa fecha e o conteúdo entra em
   **"Armazenamento Lacrado"**: nada entra nem sai até pagar de novo ou comprar outra casa.
7. **Mochilas** — capacidade em peso **e** compartimentos:
   | Mochila | Peso | Compartimentos |
   |---|---|---|
   | Pequena | 200 | 20 |
   | Média | 500 | 40 |
   | Grande | 1000 | 60 |
   | Viajante | 1500 | 80 |
   Bolsas especializadas (runas, minérios, ervas) **reduzem o peso efetivo daquele tipo**,
   sem aumentar capacidade universal.
8. **Pesca** — peixes comum/incomum/raro/épico/lendário + itens curiosos (baús, garrafas,
   mapas, chaves).
9. **Culinária** — buffs **duradouros** (vida/mana máx., regen, ataque, defesa, velocidades,
   resistência elemental). **Nunca substituem poções**, que são efeito imediato.
10. **Montarias por raridade** — Comum → Rara → Épica → **Lendária**. Até Épica há
    vendedores; **Lendária só de boss, evento ou conquista rara**.

---

---

## Passe 3 — Doc 1, cap. 65 (régua-base de combate e atributos)

**Este é o capítulo mais importante para o código que já existe.** Ele *confirma*
quase toda a Etapa 1 e entrega os primeiros números duros.

### ✅ O que ele CONFIRMA do que já está implementado

| Regra | Doc | Código |
|---|---|---|
| 7 atributos com LUK | `DD-BAL-008` | ✅ igual |
| 45 pontos-base por classe | 65.19 · `DD-BAL-009` | ✅ igual |
| 10 pontos/nível como **moeda**, não +10 no atributo | 65.40 · `DD-BAL-021` | ✅ igual |
| Custo crescente 1–20 = 2 … 201+ = 20 | 65.41 | ✅ **tabela idêntica** |
| HP/Mana nv.1: Warrior 200 · Assassin 150/70 · Archer 120/80 · Sorcerer 100/180 | 65.31 | ✅ igual |
| Crítico em LUK, não DEX | `DD-BAL-017` | ✅ igual |
| WIS = regen de mana + resist. mágica | `DD-BAL-016` | ✅ igual |
| **STR não aumenta dano de arco** — é DEX | `DD-BAL-014` | ✅ igual |
| AGI = velocidade de ataque + esquiva | `DD-BAL-012` | ✅ igual |
| Sem limite rígido de atributo; pontos podem ser acumulados | `DD-BAL-019/023` | ✅ |

**Conclusão: a Etapa 1 não precisa ser refeita.** ⚠️ *Ressalva:* a Mana inicial do
Warrior ficou explicitamente **PENDENTE** (65.32) — o doc se recusa a fixá-la.

### 🆕 Números novos que o código ainda não tem

- **Atributos-base por classe** (65.20) — STR/VIT/AGI/DEX/INT/WIS/LUK:
  | Classe | STR | VIT | AGI | DEX | INT | WIS | LUK |
  |---|---|---|---|---|---|---|---|
  | Warrior | 11 | 10 | 6 | 6 | 3 | 4 | 5 |
  | Archer | 5 | 6 | 9 | 11 | 4 | 5 | 5 |
  | Assassin | 7 | 6 | 11 | 7 | 3 | 4 | 7 |
  | Sorcerer | 3 | 5 | 5 | 6 | 12 | 10 | 4 |
  ⚠️ Druid ainda **sem tabela** (`DD-BAL-029`, PENDENTE).
- **Crítico**: base **2 %**; **10 LUK ≈ +1 %**; dano crítico base **150 %**.
  (50 LUK → 7 % · 100 LUK → 12 % · 200 LUK → 22 %)
- **DEX**: +1 de dano físico ranged por ponto, antes dos multiplicadores.
- **INT**: +1 de poder mágico e **+4 MP** por ponto. 100 Magic Power **≠** +100 % de dano.
- **Esquiva**: meta de **30–35 % máximo vindo de AGI**. Nunca 80 % (65.55).
- `DD-BAL-024` **Precisa existir cap de velocidade de ataque** (valor não fechado).
- `DD-BAL-012` proibido `1 AGI = +1 % velocidade` — quebra em nível alto.
- **HP natural por nível** (proposta inicial): Warrior +12 · Assassin +8 · Archer +7 ·
  Sorcerer +5. Proibido `+100 HP/nível` (65.10).
- **Crescimento natural da classe**: existe, mas **fracionado** — nunca +1 atributo
  cheio por nível, senão a classe decide a build por você (65.36).
- **Peso**: pouco carregado → normal · muito carregado → perde mobilidade ·
  **100 % da capacidade → não anda mais**.

### 🎯 A régua de balanceamento (a parte mais reutilizável)

- `DD-BAL-007` **Tempo de combate importa mais que HP absoluto.**
  Meta para criatura normal adequada ao nível: **3–8 segundos**.
- `DD-BAL-003/004` **Slime Verde é a unidade de referência**: nível 1, **50 HP**,
  dano **4–7**, defesa **1**, neutro (só revida). Warrior nv.1 com ~15 de dano o mata
  em ~4 golpes.
- 65.8 A pergunta nunca é "quanto HP esse dragão tem?", e sim **"quanto tempo um
  personagem adequado deve levar para matá-lo?"** — o HP sai daí.
- 65.81 **Primeiro balanceia o personagem, depois o mundo contra ele.**
- `DD-BAL-002` A escala precisa continuar funcionando no nível **200 e 400**.

### ⚠️ 65.76 — a lista de PENDENTES do próprio doc

O capítulo termina listando ~30 fórmulas que **não estão fechadas**: fórmula final de
cada atributo, cap de ASPD, esquiva, precisão, crítico, defesa física e mágica, regen
de HP/mana, tempo de conjuração, capacidade de carga por STR, penalidade exata de peso,
dano das armas, XP do Slime Verde. **Não inventar — são decisões de balanceamento a
tomar em jogo.**

---

---

## Passe 4 — Doc 1, cap. 66 (progressão) e 67 (árvore do Warrior)

### Cap. 66 — ✅ confirma quase toda a Etapa 2

| Regra | Doc | Código |
|---|---|---|
| Skills Lv.1–10 | `DD-PROG-013` | ✅ |
| Custo 1-1-1-2-2-3-3-4-5-6 = **28 SP** | 66.26/66.27 | ✅ **idêntico** |
| SP/nível: Warrior 1,5 · Assassin 1,7 · Archer 1,7 · Sorcerer 2,5 | 66.29 | ✅ igual |
| Marcos em 10/25/50/75/100 e a cada 50 | 66.34 | ✅ igual |
| ~5–6 skills máximas no Lv.100 (Warrior), ~9 (Sorcerer) | 66.37 | ✅ igual |
| Cooldown nunca cai com o nível | (cap. 73) | ✅ |

**+ Druid entra com 2,0 SP/nível** (entre as físicas e o Sorcerer).

### 🔴 Cap. 66 — o que MUDA no que já está implementado

- **Pontos de atributo por nível NÃO são 10 fixos.** `DD-PROG-002`: a curva cresce
  **10 → 11 → 12 → … → 20** conforme o personagem avança, com teto de referência em
  ~20. ⚠️ **As faixas de nível de cada degrau NÃO estão definidas** (66.3: "não
  devemos inventar"). O código hoje dá 10 sempre.
- **Warrior nasce com 200 HP / 60 MP** — `DD-PROG-005`, resolve o que estava pendente
  no cap. 65.
- `DD-PROG-009` **HP/MP iniciais JÁ incluem os atributos-base.** Não somar o bônus dos
  10 VIT do Warrior por cima dos 200 — ele aparece no jogo com 200, ponto. Só quando
  **subir** VIT é que o HP cresce.
- `DD-PROG-010` **Bloqueio não vem de atributo nenhum** — só de escudo, equipamento,
  carta ou efeito. O mesmo vale para roubo de vida/mana, redução % especial e
  resistências elementais (66.17).
- **Proficiências são 8**: Sword · Axe · Club · Spear · Dagger · **Distance** · **Fist** ·
  **Magic Level**. ⚠️ O código tem proficiência por *tipo de arma* (8 tipos, com arco e
  besta separados e cajado próprio). No doc, **arco + besta = Distance** e **cajado =
  Magic Level**; e existe **Fist** para lutar sem arma.
- `DD-PROG-028` **Ataque básico com cajado é FÍSICO** (Sorcerer e Druid). Dano mágico
  à distância exige gastar uma habilidade e mana.
- `DD-PROG-024/025` **Druid tem WIS como atributo principal, não INT** — e **WIS escala
  o poder de cura**. Cura ≈ poder-base + WIS + nível da skill + equipamento.
- Cartas podem **conceder uma habilidade não aprendida** (rara) e **somar níveis de
  skill** — mas `DD-PROG-023` **Lv.10 continua sendo o teto**, carta não leva a Lv.11+.
- `DD-PROG-020` Não deixar o jogador acumular SP e nascer com a skill nova já no Lv.10.

⚠️ **66.65 — armadilha:** o doc contém **duas escalas de SP incompatíveis** (a média de
1,5–2,5/nível e uma proposta posterior de 10–17/nível). Ele manda **NÃO fundir as duas**.
A reconciliação está PENDENTE. **Mantemos a de 1,5–2,5**, que é a que o código já usa.

### Cap. 67 — 🔴 Warrior tem **15 skills**, não 8

`DD-WAR-001`. As 8 implementadas estão **corretas e com os cooldowns certos**; faltam 7.

| # | Skill | Tipo | CD | No código? |
|---|---|---|---|---|
| 1 | Golpe Poderoso | ativa | 1,5 s | ✅ F1 |
| 2 | Bash | ativa | 3,5 s | ✅ F2 |
| 3 | Investida | ativa | 8 s | ✅ F3 |
| 4 | Ruptura | ativa | 6 s | ✅ F4 |
| 5 | Execução | ativa | 8 s | ✅ F5 |
| 6 | Fúria de Batalha | especial | 90 s **após terminar** | ✅ F8 |
| 7 | Postura Defensiva | postura | — | ✅ F7 |
| 8 | Provocar | ativa | 2 s | ✅ F6 |
| 9 | **Grito de Guerra** | buff | 30 s | ❌ |
| 10 | **Contra-Ataque** | ativa | 6 s | ❌ |
| 11 | **Pele de Ferro** | passiva | — | ❌ |
| 12 | **Resistência** | passiva | — | ❌ |
| 13 | **Segundo Fôlego** | ativa | 45 s | ❌ |
| 14 | **Maestria de Armadura Pesada** | passiva | — | ❌ |
| 15 | **Última Resistência** | passiva | 60 s interno | ❌ |

**As 7 que faltam:**
- **Grito de Guerra** — 30 s CD, 15 s de duração, área ao redor; Lv.10 dá +10 % dano
  físico, +10 % DEF física, +10 % resist. a controle ao Warrior **e à party**.
  `DD-WAR-017` **não aumenta poder mágico** (para o Warrior não virar suporte
  obrigatório de todo mundo). `DD-WAR-018` **não empilha** entre Warriors — vale o maior.
- **Contra-Ataque** — ativa com **janela de 1 s**; se for atingido nela, reduz 30–50 %
  daquele dano e responde com golpe forte. **Se ninguém acertar, falha e entra em CD.**
  Recompensa timing, não é proc passivo.
- **Pele de Ferro** — passiva, até **+12 % DEF física**.
- **Resistência** — passiva, até **−20 % de duração de CC**. `DD-WAR-020` afeta stun,
  slow, root, fear — **não** afeta veneno, sangramento, queimadura nem redução de
  DEF/ATK. **Controle ≠ debuff.** Proposto cap global de resistência a CC em 50–60 %.
- **Segundo Fôlego** — 45 s CD, cura 5 %/10 %/**15 %** do HP máximo. `DD-WAR-022`
  calcula sobre o **HP normal**, não sobre o HP inflado pela Fúria.
- **Maestria de Armadura Pesada** — passiva; reduz penalidade e melhora armadura pesada.
  ⚠️ números não recuperados — não inventar.
- **Última Resistência** — passiva automática abaixo de **20 % do HP normal**; por 5 s
  reduz o dano recebido em 10/20/**30 %**. **CD interno de 60 s.** Não cura, não deixa
  imortal, e **não reduz a drenagem da Fúria**.

**Detalhes novos das 8 que já existem:**
- Investida: alcance ~4 quadrados no Lv.1 → ~6 no Lv.10; interrompe ação de monstro
  comum, mas `DD-WAR-005` **não dá stun em MVP**.
- Ruptura: −5 %/−10 %/**−15 %** DEF física por 4 s; contra MVP a eficiência cai pela
  metade (~−7,5 %). Beneficia a party inteira, não só o Warrior.
- Provocar: `DD-WAR-015` **no PvP nunca força troca de alvo** — em vez disso o
  provocado causa ~−10 % de dano contra *outros* jogadores por ~4 s. Solo, o monstro
  provocado bate ~3–8 % mais fraco no Warrior.
- Fúria: Lv.10 chega a **3× HP temporário**; `DD-WAR-012` o **CD de 90 s só começa
  quando ela termina**.

**Removidas explicitamente** (`DD-WAR-025/026/027`): **Sede de Batalha** (incentivava
farmar bicho fraco antes da luta), **Maestria Ofensiva** (multiplicador sem identidade)
e **Pisotear** (Bash já ocupa o espaço de área).

**Skills avançadas por arma** virão depois, com requisito duplo — ex.: técnica avançada
de Sword pede Character Lv.120 **+** Sword Lv.80 **+** Golpe Poderoso Lv.10.

---

---

## Passe 5 — Doc 1, cap. 67.A–N, 68 (Assassin) e 69 (Archer)

### 🔴🔴 67.N — A ÁRVORE DE 15 SKILLS DO WARRIOR FOI SUPERADA

O próprio doc se corrige: *"'WARRIOR V1 = FECHADO COM 15 SKILLS' **não representa mais
a estrutura mais recente**. Aquela árvore é uma etapa anterior. Posteriormente o projeto
evoluiu para **HABILIDADES GERAIS + MAESTRIAS DE ARMAS**."*

E deixa a regra de leitura para todo o resto do documento:

> **"Daqui para frente, vou priorizar a última revisão cronológica de cada classe, em
> vez de parar quando encontrar o primeiro 'fechado'."**

⚠️ **Isso vale para TODAS as classes.** O arquivo tem várias decisões marcadas "FECHADO"
que foram reabertas depois. Sempre buscar a revisão mais recente.

**A estrutura nova de toda classe é a mesma:**

```
CLASSE
  │
  ├── Habilidades Gerais  (valem para qualquer arma)
  │
  └── Linhas de Maestria por família de arma
         └── cada família tem variante 1H (+ escudo) e 2H (ofensiva)
```

As 15 skills continuam válidas como conteúdo — mudam de lugar: viram **Habilidades
Gerais** ou entram nas linhas específicas.

### Cap. 67.A–N — Warrior por família de arma

Quatro famílias, cada uma com 1H e 2H → **8 configurações principais**:

| Família | Identidade da maestria | 1H | 2H |
|---|---|---|---|
| ⚔️ Espada | **rápido e técnico** | Espada Curta + escudo | Espada Longa |
| 🪓 Machado | **sangramento** | Machado de Guerra + escudo | Machado Bárbaro |
| 🔨 Maça | **controle** | Maça + escudo | Martelo de Guerra |
| 🔱 Lança | **alcance, controle de espaço, guerra** | Lança Curta + escudo | Lança Longa |

- Regra geral 1H: menor dano base, mais versátil, **permite escudo**, mais defensivo.
  2H: mais dano e potencial ofensivo, **sem escudo**.
- Conceitos da linha de Lança: **Investida · Muralha de Lanças · Perfurar · Formação**
  (Formação exige escudo).
- ⚠️ 67.K: o doc **não confirma** que existam duas passivas genéricas "Maestria 1H" e
  "Maestria 2H". O que está confirmado é maestria **por família**. Não inventar.

### Cap. 68 — Assassin

**Quatro famílias:** 🗡️ Adagas · ⚔️ Espadas Curtas · ⚔️ Katar · 🥷 Armas de Arremesso.
Afinidade oficial: primárias **Adagas e Katar**, secundária **Espadas Curtas**,
situacionais **Shuriken e Kunai**.

**Ataque Duplo** — a mecânica central, chance por nível:
| Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Chance | 35 % | 40 % | 45 % | 50 % | 55 % | 60 % | 65 % | 70 % | 75 % | **80 %** |

- `DD-ASS-003` **Adaga + Escudo**: o golpe extra causa **100 %** do dano da arma →
  o proc rende **200 %** de um ataque normal. É a config **mais defensiva e consistente**,
  não a "versão fraca".
- `DD-ASS-004/005` **Dual Dagger TAMBÉM tem Ataque Duplo** (a regra antiga que o
  desativava foi **revogada**), mas o golpe extra de cada adaga causa só **50 %**.
  Numa sequência favorável saem **4 hits**. Ganha volume, veneno, on-hit e cartas dobradas;
  perde o escudo.
- `DD-ASS-007` **Anti-cascata: Ataque Duplo não pode gerar outro Ataque Duplo.**
- `DD-ASS-006` **Katar não usa Ataque Duplo** — é 2 mãos, sem escudo, e vai de
  **crítico + burst + Sonic Blow**.
- **Espada Curta** ≠ adaga com outro sprite: mais dano base, menos velocidade, menos
  crítico, mais duelo.
- **Armas de arremesso**: `DD-ASS-011` **alcance menor que o Archer**. Assassin de
  Shuriken é **híbrido móvel** (aproxima furtivo → ataca → recua → arremessa), não um
  segundo Archer. Munição consumível (~40 shurikens), proficiência reduz a perda.
- ⚠️ `DD-ASS-014/015` As skills específicas de Shuriken/Kunai (Lançamento Rápido,
  Tempestade de Shurikens, Kunai Envenenada, Lançamento Fantasma, Ataque Oculto) e as de
  Espada Curta (Corte Cruzado, Dança das Lâminas, Corte Profundo, Contra-ataque) são
  **PROPOSTAS PENDENTES**, não fechadas.

### Cap. 69 — Archer

**Três famílias** → **5 configurações naturais**:

| Config | Defesa | Velocidade | Alcance | Dano | Identidade |
|---|---|---|---|---|---|
| 🏹🛡️ Arco Curto + Escudo (1H) | maior | muito alta | menor | médio | mobilidade |
| 🏹 Arco Longo (2H) | baixa | alta | muito alto | alto | DPS / alcance |
| 🎯🛡️ Besta Leve + Escudo (1H) | maior | média | médio | alto | segurança / impacto |
| 🎯 Besta Pesada (2H) | baixa | baixa | alto | muito alto | **sniper / crítico** |
| 🗡️🛡️ **Azagaia** + Escudo | maior | — | **curto** | alto | lutar mais perto |

- **Azagaia** é a adição mais peculiar: lança curta de arremesso, **usa escudo**, é
  **consumível** (~10 equipadas) e `DD-ARC-029` **quanto maior o Distance, menor a
  chance de perder a azagaia no arremesso**. Uma mesma azagaia pode durar muitos usos.
- `DD-ARC-021/024/027` **Escudo virou build legítima do Archer** (arco curto, besta leve
  e azagaia). Mas 69.48: **isso não o transforma em tank** — troca poder ofensivo por
  sobrevivência.
- `DD-ARC-015` **Archer NÃO tem dash, backstep nem teleporte.** A sobrevivência é
  alcance → armadilha → Concentração → corrida → reposicionamento.
- `DD-ARC-013` **Estar mais longe NÃO aumenta o dano.** A vantagem de estar longe é
  estar longe.
- `DD-ARC-019` **Munição elemental é ITEM, não skill.** Nada de "Flecha de Fogo" na
  árvore — o elemento vem da munição, do equipamento ou da carta.

**As 12 skills da V1** (a maioria sobrevive como Habilidades Gerais):
Maestria com Arco · Maestria com Besta · **Disparo Duplo** (só arco, CD 1,5 s, 2 projéteis
independentes, 2 × 60 % → 2 × 90 %) · **Tiro Preciso** (só besta, ~0,7 s de preparação) ·
**Disparo Perfurante** (CD 6 s — ⚠️ `DD-ARC-009` **não atravessa inimigos**; reduz DEF
−5/−10/−15 % e tem 10/20/30 % de sangramento) · **Chuva de Flechas** (AoE, até 10 alvos) ·
**Saraivada** (5–8 disparos) · **Olho de Águia** (+15 % precisão, +20 % alcance; **não dá
dano**) · **Concentração** (+15 % precisão, +10 % ASPD, +10 % movimento) ·
**Armadilha de Caça** (1→2→**3 traps**; a 4ª apaga a mais antiga; **ocultas** ao inimigo,
visíveis à party) · **Armadilha Explosiva** (dano em raio + 10/20/30 % de **Queimadura**;
`DD-ARC-017` **sem slow**) · **Instinto do Caçador** (esquiva +2/+6/**+10 %**,
deliberadamente **mais fraca que a Evasão do Assassin**).

⚠️ Propostas **não fechadas**: Disparo Pesado, Flecha Explosiva, Arremesso Preciso,
Arremesso Rápido. E **Flecha Explosiva ≠ Armadilha Explosiva** — não fundir.

---

---

## Passe 6 — Doc 1, cap. 70 (Sorcerer) e 71 (Druid)

### Cap. 70 — 🔮 Sorcerer: **18 habilidades em 4 escolas**

⚠️ 70.60: diferente do Archer, o Sorcerer **NÃO sofreu reformulação posterior** — a
V1 de 18 habilidades **continua sendo a versão mais atual**.

| Escola | Nº | Identidade |
|---|---|---|
| 🔥 Fogo | 4 | dano bruto, Queimadura, AoE — **destrói** |
| ❄️ Gelo | 4 | slow, Congelamento, barreiras — **controla** |
| ⚡ Raio | 3 | velocidade, burst, resposta imediata — **reage e explode** |
| ✨ Arcano | 7 | mana, cast, defesa, utilidade — **faz o Sorcerer funcionar** |

**🔥 Fogo:** Fire Bolt (alvo único econômico, multi-hit — o "Golpe Poderoso" do mago) →
Fire Wall (controle de espaço) → Meteoro (impacto + pequena AoE) → **Chuva de Meteoros**.
Pré-req da suprema: Fire Bolt 5 + Fire Wall 5 + Meteoro 5.
`DD-SOR-010` **Os meteoros caem em posições parcialmente aleatórias na área** — um alvo
pequeno leva poucos impactos, um **MVP enorme leva vários**. O tamanho físico do inimigo
importa. Lv.10: 10 meteoros, área grande, ~4 s, cast ~3 s, CD ~15 s, MP altíssimo.

**❄️ Gelo:** Cold Bolt → Ice Wall (barreira física destruível, 1→3 paredes simultâneas,
20 s→60 s) → Explosão Glacial (360° ao redor de si, para quando o melee **cola** nele) →
**Nevasca** (tempestade persistente, múltiplos ciclos, exige Magic Level mínimo).

🔴 **`DD-SOR-012` CONGELAMENTO DURA ~10 SEGUNDOS** — correção posterior que **substitui**
a proposta antiga de 1–2 s. Congelado não anda, não ataca, não usa habilidade, não usa
item, não conjura. **Mas dano externo quebra o gelo e liberta.** Por isso a Nevasca foi
rebalanceada de 25 % para **8–12 % de chance por impacto** no Lv.10.
Combo: congela → abre distância → prepara Meteoro → impacto quebra o gelo.

**⚡ Raio** (só 3, de propósito): Lightning Ball (multi-hit, **8 hits** no Lv.10, empurra
progressivamente — knockback é tratado **separado do dano**, resistir ao empurrão não
evita o dano) → Descarga Elétrica (AoE rápida, `DD-SOR-018` **sem stun, sem knockback**)
→ **Ira de Thor** (suprema, múltiplos raios, pequena chance de stun por impacto com
proteção anti-cadeia).

**✨ Arcano** (ramificado, não linear): Aprimoramento Mágico → Amplificação Mágica (Lv.5)
e Maestria de Conjuração (Lv.3) · Regeneração de Mana → Proteção Mágica (Lv.3) ·
Chama de Revelação · **Círculo Arcano de Proteção**.
- **Proteção Mágica**: converte parte do dano recebido em consumo de MP; **liga e desliga**.
- **Chama de Revelação**: detecta Assassin furtivo, monstro invisível e **armadilhas**;
  revela para aliados. CD ~15 s. `70.42` **não é detecção permanente** — é counter com
  counterplay.
- **Círculo Arcano**: `DD-SOR-023/024` **100 % de imunidade a dano FÍSICO** dentro da
  área — **magia continua acertando normal**. Só vale enquanto está dentro; saiu, acabou.
  Lv.1 2,0 s → Lv.10 **4,0 s**, CD **45 s**. Dois círculos **não acumulam**.

`70.49` **Se todo o kit defensivo estiver em cooldown e o Warrior colar nele, o Sorcerer
tem que estar em perigo real.** Isso é proposital — evita kite infinito.
`DD-SOR-032/033` O counter de controle forte vem de **carta/resistência**, e uma carta
não neutraliza várias mecânicas.

### Cap. 71 — 🌿 Druid: **23 habilidades em 4 ramos**

`DD-DRU-006` A contagem foi corrigida de 22 para **23**. São ~230 níveis possíveis —
**maximizar tudo é impossível de propósito**.

| Ramo | Nº | Papel |
|---|---|---|
| 💚 Cura | 5 | healer |
| 🌟 Buff/Defesa | 6 | suporte |
| ☠️ Debuff | 6 | controle |
| 🌿 Natureza | 6 | solo / ofensivo |

**Ficha V1 do Druid** (⚠️ sujeita à consolidação global de atributos):
HP **140** · MP **150** · STR 4 · VIT 7 · AGI 5 · DEX 5 · INT 9 · **WIS 11** · LUK 4.

**💚 Cura** — Cura individual (CD **~1 s**, pode ser repetida em sequência; Lv.10 = 450 %
de poder relativo, cast ~1,0 s; o limitador é **MP + cast**, não cooldown) → Regeneração
(HoT, ~10 pulsos em ~20 s, **mais eficiente em mana** que a cura direta; libera o Druid
para fazer outra coisa) → **Cura em Área** → **Santuário** → 5ª de emergência.
⚠️ As três últimas **não têm detalhes recuperados** — nomes e números não confirmados.

**🌟 Buffs** — Bênção da Agilidade → Pele de Carvalho / Bênção Espiritual → Força da
Natureza → **Bênção da Natureza** (exige as 4 anteriores no Lv.5; dura 30→**90 s**, CD
~30 s — é magia de "vamos entrar no MVP", não de spam).
**🌿 Harmonia Natural** — passiva **só do próprio Druid**, não é buff de party. Lv.10:
+15 % resist. a status, +10 % elemental, +15 % a debuffs, **+10 % de cura recebida por
ele mesmo** (não aumenta a cura que ele dá). `DD-DRU-013` **é resistência, não imunidade**
— não substitui carta.

**☠️ Debuff** — o ramo que dá identidade à classe: *não precisa causar dano se faz o
inimigo causar menos e os aliados causarem mais.*
| Skill | Lv.10 | CD |
|---|---|---|
| Enfraquecer | −15 % ATK e poder mágico, 16 s | ~5 s |
| Vulnerabilidade | **−15 % DEF e MDEF**, 12 s | ~8 s |
| Maldição da Lentidão | −25 % movimento, −15 % ASPD, 10 s | ~8 s |
| Maldição da Fraqueza | **−40 % de cura recebida** (anti-healer), 10 s | ~15 s |
| Silêncio | **6 s** — bloqueia magia, mas o alvo **continua andando e batendo** | ~20 s |
| Praga da Natureza | AoE com versões reduzidas de tudo (−10/−10/−15/−10 %), 8–10 s | ~25 s |

Bifurcação proposital: **Silêncio → PvP/anti-caster** · **Praga → guerra/controle de grupo**.
`71.23` **MVP não precisa ser imune a debuff** — basta reduzir a eficiência. Isso mantém
o Druid relevante em boss fight.

**🌿 Natureza** (o que permite jogar solo) — Espinho da Terra (básica, alvo único, chance
de sangramento) → Raízes Prensoras (imobiliza: **pode atacar e conjurar, mas não anda**;
Lv.10 ~4 s) / Lâminas de Vento (AoE, ~20 % de pequeno knockback) → Esporos Venenosos
(DoT em área, 10–12 s) → **Ira da Natureza** (suprema: **persistente** 4→8 s, ataca a
região em ciclos **enquanto o Druid continua curando e debuffando** — essa é a identidade;
`DD-DRU-021` dano bruto **abaixo** das supremas do Sorcerer).
**Afinidade com a Natureza** — passiva: +15 % dano de natureza e de veneno.
`DD-DRU-026` **não aumenta cura** — separa investimento ofensivo de healer.

### 🪨 PETRIFICAÇÃO — o status característico do Druid

Vem de **Raízes Prensoras** (níveis altos) e **Ira da Natureza** (~3–5 % por ciclo).
`DD-DRU-028/029/030` **Não é Congelamento com outro visual:**

| | ❄️ Congelamento (Sorcerer) | 🪨 Petrificação (Druid) |
|---|---|---|
| Incapacita | sim | sim |
| Duração | **maior** (~10 s) | **menor** (~5–7 s) |
| Dano externo remove | **sim** | **não** |
| Defesa durante o CC | normal | **grande bônus de DEF/MDEF** |

Consequência tática: **Congelamento prepara burst** (quebra com o impacto);
**Petrificação é controle puro** — o alvo fica preso e vira praticamente uma estátua
blindada, então não vale a pena focar nele. `DD-DRU-031` **imunidade a Congelamento ≠
imunidade a Petrificação** — cartas separadas.

`DD-DRU-032` **Druid não tem Ressurreição** — a função dele é **impedir** a morte, não
desfazê-la (senão o sistema de penalidade perde sentido).

**4 arquétipos registrados:** 💚 Healer/Suporte · ⚔️ Guerra (Cura em Área + Santuário +
debuff pesado) · 🌿 Solo (Natureza quase toda no Lv.10) · 👹 MVP (cura e buff máximos,
Vulnerabilidade alta, quase nada de ofensiva).
`71.54` **O Druid não pode ser tudo ao mesmo tempo** — o limite são os Skill Points.

---

---

## Passe 7 — Doc 1, cap. 25–26 (equipamentos e raridade)

### 🔴 CORREÇÃO: as 7 raridades estão certas — o conflito que reportei não existe

`DD-RAR-001` **Sete raridades. Status: Definido.**

> **Comum → Incomum → Raro → Épico → Lendário → Mítico → Relíquia**

O `Common 0 / Uncommon 1 / Rare 2 / Epic 3` do cap. 76 é só a **contagem de passivos dos
quatro primeiros degraus** — o próprio cap. 76 chama isso de "a primeira estrutura" e
cita "itens lendários/especiais" à parte. **O código não precisa mudar.**

### Slots do personagem (cap. 25.3)

Cabeça · Peitoral · Calças · Botas · Luvas · Capa · Colar · **Anel 1** · **Anel 2** ·
Cinto · Arma(s) · **🆕 Relíquia** (slot especial).

- `DD-EQP-004` **Peitoral é a maior fonte de DEF** do conjunto.
- **Relíquia** é um slot próprio que aceita Totem, Livro, Orbe, Amuleto, Cristal ou
  Insígnia — cada classe aproveita melhor um tipo.
- Botas → velocidade · Luvas → precisão/ASPD/crítico/força · Capa → resistência
  elemental/esquiva · Cinto → **capacidade de carga** (liga ao sistema de peso).

### 🔴 Quatro camadas independentes — não confundir (26.12/26.13)

| Camada | O que faz |
|---|---|
| **Raridade** | qualidade natural; define quantos passivos e a faixa de slots |
| **Evolução** | sobe o **patamar-base** da peça (para um Mítico não virar lixo 50 níveis depois) |
| **Refino +0→+15** | fortalece **dentro** do patamar |
| **Reroll** | troca **só os passivos aleatórios** — não mexe em raridade, slots nem cartas |

### Refino (25.31–25.37)

- Vai de **+0 a +15**. Acima de +15 foi **descartado explicitamente**.
- 🔴 `DD-EQP-009` **Falhar NÃO destrói o item e NÃO volta para +0.** O custo da falha é
  perder o gold e os materiais da tentativa.
- Curva-base **para teste**: +1/+2 = 100 % · +3 95 % · +5 85 % · +7 70 % · +10 **40 %** ·
  +12 20 % · +13 12 % · +14 7 % · **+15 = 3 %**.
- `DD-EQP-011` **Refino não pode valer mais que a build inteira** — nada de +15 = +150 %
  de dano.
- Armas → ATK base. Armaduras → DEF base. Marcos em +5/+10/+15 podem dar extra (não fechado).

### Cartas e slots (25.40–25.43, 26.14–26.17)

- `DD-RAR-008` **Máximo de 3 slots por equipamento.** Nunca 4, 5, 6 ou 8.
- 🔴 `DD-RAR-009` **O limite de 8 cartas é GLOBAL do personagem**, do conjunto equipado
  inteiro — não por peça. ✅ bate com a Etapa 7 do roadmap.
- **Validação ao equipar**: se o personagem está em 7/8 e tenta equipar uma armadura com
  3 cartas, daria 9/8 → **o jogo simplesmente não deixa equipar**. A carta **não** é
  removida do item; a peça continua guardável, vendável e usável em outro conjunto.
- Isso cria **conjuntos alternativos** (PvE / PvP / guerra) como parte da estratégia.
- Raridade **não determina sozinha** o número de slots — há geração aleatória. Um
  **Escudo Épico com 3 slots** vale muito mesmo para quem não vai usá-lo.

### Crafting × raridade (26.18–26.22)

| Raridade | Fabricável? |
|---|---|
| Comum → **Lendário** | ✅ sim |
| **Mítico** | ❌ **não** |
| **Relíquia** | ❌ **não** |

**Lendário é o teto da fabricação.** Míticos e Relíquias vêm só do mundo, de bosses e de
conteúdo excepcional. `DD-RAR-013` O artesão influencia a chance de raridade, valores e
slots — mas **não escolhe a combinação perfeita de passivos**. A sorte continua existindo.

### Raridade máxima por fonte de loot (25.52 / 26.25)

| Fonte | Teto |
|---|---|
| Monstro comum | **Raro** |
| Elite | **Épico** (pequena chance de Lendário) |
| Boss de Dungeon | **Mítico** |
| **World Boss** | **Relíquia** |

Chances experimentais para monstro comum: 50 % de soltar equipamento; se soltar,
80 % Comum / 18 % Incomum / 2 % Raro.

### Potencial de evolução por raridade (26.11)

Comum baixíssimo · Incomum baixo · Raro moderado · Épico alto · Lendário muito alto ·
Mítico **excepcional** · Relíquia **regras próprias**.
`DD-RAR-005` **Nenhum equipamento evolui infinitamente** — senão uma espada inicial
viraria endgame só com gold, e exploração/boss/craft perderiam sentido.
⚠️ `DD-RAR-007` **A quantidade de níveis de evolução por raridade NÃO está definida.**

### Proficiência em vez de bloqueio (25.18–25.20)

`DD-EQP-005` **Não travar armas rigidamente por classe** — usar proficiência. Um Warrior
*pode* pegar um arco, mas com proficiência baixa, sem as maestrias e sem as habilidades.
Liberdade para experimentar sem dissolver a identidade das classes.
⚠️ Status: "proposta registrada; requer consolidação final antes da implementação".

---

---

## Passe 8 — Doc 1, cap. 27 (passivos) e 28 (CARTAS)

### Cap. 27 — Passivos por raridade `DD-PAS-003`…`008`

| Raridade | Passivos naturais |
|---|---|
| Comum | **0** |
| Incomum | 1 |
| Raro | 2 |
| Épico | 3 |
| **Lendário** | **4** |
| **Mítico** | **5** |
| **Relíquia** | **6 ou passivos únicos** |

✅ Confirma de vez as 7 raridades — a escada de passivos **vai até 6**, não para no 3.

- 🔴 **Sistema de Peso / Orçamento de Poder** (27.29–27.31): cada passivo tem um custo
  interno e cada raridade tem um **orçamento**:
  | Raridade | Orçamento |
  |---|---|
  | Incomum | 2 |
  | Raro | 5 |
  | Épico | 8 |
  | Lendário | 11 |
  | Mítico | 15 |
  | Relíquia | 18 |
  Exemplos de peso: +5 % crítico = 1 · +10 % velocidade = 2 · Sangramento = 2 ·
  Roubo de Vida = 3 · Executor = 3 · Eco Arcano = 4 · Flecha Flamejante = 4.
  **Mais passivos ≠ melhor** — dá para gastar tudo em poucos efeitos fortes.
- 🔴 **Incompatibilidades** (27.32): Roubo de Vida × Roubo de Mana · Eco Arcano ×
  Magia Instável · Ataque Duplo × Golpe Brutal · Flecha Flamejante × Flecha Congelante.
- **Categorias**: ofensivos · defensivos · mobilidade · **economia/coleta** (mais gold,
  recurso extra, chance de recuperar consumível — equipamento de farm!) · **invocação** ·
  mágicos (Eco Arcano, Drenagem de Mana, Afinidade/Ruptura Elemental…) · **híbridos**
  (Flecha Flamejante, Espada Arcana que converte parte do dano físico em mágico, Adaga
  Sombria que dá dano mágico pelas costas) · exclusivos raríssimos.
- **Ataque Triplo existe**, mas tem que ser **muito raro**.
- 🔴 `DD-PAS-016` **SLOTS SÃO PERMANENTES.** Nasceu com 2 slots, morre com 2 slots —
  nenhum sistema transforma 2 em 3. Isso protege o valor da geração original.
- `DD-PAS-014` **Reroll mexe SÓ nos passivos.** Uma Lendária +12 continua Lendária +12,
  com os mesmos slots e as mesmas cartas, depois do reroll.
- 27.38 **A oficina aperfeiçoa um bom item; não fabrica um item perfeito do zero.**
- ⚠️ Passivos exclusivos de **Archer, Sorcerer e Druid** ainda **não existem** —
  o doc proíbe inventá-los (27.28).

### Cap. 28 — 🃏 SISTEMA DE CARTAS (base da Etapa 7)

- `DD-CAR-001` **Cada monstro tem sua própria carta exclusiva.** Isso mantém bicho fraco
  relevante: o loot pode ser ruim, mas a carta pode ser cobiçada.
- `DD-CAR-002/003` **8 cartas ativas, limite do PERSONAGEM** — não importa se os
  equipamentos somam 15 slots. UI mostra contador **`6/8`**.
- `DD-CAR-004` **0 a 3 slots por equipamento elegível.**
- 🔴 `DD-CAR-006` **Carta inserida fica permanentemente presa ao equipamento.** Não há
  como retirar e recuperar intacta. Encaixar uma carta rara é decisão de compromisso.
- **Validação ao equipar** (28.24): personagem em 7/8 tenta equipar armadura com 3 cartas
  → daria 9/8 → **bloqueado**, com mensagem explícita. A peça continua existindo,
  guardável e **vendável**.

**Quatro categorias** — a carta declara onde entra:
| Categoria | Onde | Perfil |
|---|---|---|
| **Arma** | espada, machado, lança, maça, adaga, arco, besta, cajado | crítico, Ataque Duplo, sangramento, roubo de vida/mana, penetração, elemental, dano vs. espécie/boss |
| **Escudo** | escudo | bloqueio, redução de dano, reflexão, resist. a projétil/crítico, efeitos ao bloquear |
| **Armadura** | elmo, peitoral, calça, botas | HP, DEF, esquiva, resist. elemental/veneno/sangramento/stun, **anti-Congelamento**, **anti-Petrificação**, anti-knockback, proteção de cast |
| **Acessório** | anel, amuleto | velocidade de cast, custo de mana, regen, precisão, **anti-Silêncio**, crítico |

⚠️ 28.68 **Decisões antigas SUBSTITUÍDAS** (não deixar voltar ao GDD): distribuição fixa
dos 8 slots entre peças · **escudo sem cartas** · **anéis fora do sistema**. Hoje escudo
e acessório **têm** cartas.

**Filosofia** — 28.33: a pergunta nunca é *"qual a melhor build?"*, é **"melhor para
quê?"**. Toda contramedida tem **custo de oportunidade**: gastar um slot em imunidade a
knockback é um slot que não deu crítico. `DD-CAR-017` **uma carta não neutraliza cinco
mecânicas**.

**Procs mágicos** (28.42): ataque físico com chance de soltar Fire Bolt, crítico com
chance de Lightning Bolt, tomar dano com chance de Frost Nova. **Não transforma a classe
em Sorcerer** — são procs, não magia controlada.

**MVP Cards** (28.44–28.50): `DD-CAR-019` fortes mas **especializadas** — quem tem a
carta **não ganhou o jogo**. São **alteradoras de mecânica**, não pacotes de atributo.
Exemplos: Dragão Ancestral (imune a queimadura + resist. fogo) · Behemoth (imune a
knockback + resist. stun) · Arquimago Corrompido (**conjuração não é interrompida por
dano comum**) · Hidra Ancestral (resist. veneno e sangramento + regen) · Senhor das
Tempestades (proc de Lightning Bolt).

**Sinergia entre cartas** (28.51): Carta do Zumbi dá pouco roubo de vida; Carta do
Vampiro **aumenta a eficiência de roubo de vida**. Conjuntos emergem sem precisar de
"sets" artificiais.

### 🆕 RESSONÂNCIA (28.55–28.62) — sistema que o roadmap não tinha

Algumas cartas têm **propriedades ocultas que despertam conforme o REFINO** do
equipamento onde estão:
- **+10 → Ressonância I** · **+12 → Ressonância II** · **+15 → efeito máximo**
- ⚠️ **NÃO é universal** — só cartas específicas, raras e MVP Cards. Senão levar tudo a
  +15 viraria obrigatório.
- A propriedade pode ser **desconhecida no início** — a comunidade descobre testando e a
  informação circula. Depois o **Grimório Oficial** registra o que já foi descoberto.
- `28.60` A ressonância tem que **complementar a identidade da carta** (carta de crítico
  → ressonância de crítico), nunca virar outra coisa. E **não pode transformar uma carta
  mediana em escolha obrigatória**.


---

## Passe 9 — Doc 1, cap. 31 (defesa) e 32 (elementos e condições)

### Cap. 31 — Defesa em camadas

```
ATAQUE
  ↓ ESQUIVA          → o ataque não conecta
  ↓ ESCUDO           → conecta, mas parte do dano é amortecida
  ↓ ARMADURA/DEF     → reduz o dano bruto
  ↓ RESISTÊNCIAS     → atuam sobre o tipo de dano/efeito
  = DANO FINAL

à parte: BLOQUEIO COMPLETO → 0 de dano (propriedade especial, não é do escudo)
```

🔴 **As duas correções mais importantes do capítulo:**

1. `DD-DEF-006` **Escudo normal NÃO tem chance natural de anular ataque.** Ele
   **reduz** dano. Ex.: ataque de 1.000 com 25 % de mitigação → passam 750.
2. `DD-DEF-009` **Chance de Bloqueio não vem de NENHUM dos 7 atributos** — nem STR,
   nem VIT, nem AGI, nem DEX, nem INT, nem WIS, nem LUK. Vem **só** de escudo,
   equipamento, carta e propriedades especiais.

- `DD-DEF-007` **A proficiência Shield = eficiência de MITIGAÇÃO**, não chance de negar
  golpe. O mesmo escudo com Shield 20 e com Shield 100 rende coisas diferentes.
- **DEF Física = VIT + armadura** · **DEF Mágica = WIS + equipamento**. Um Warrior com
  muita VIT e sem armadura decente **não** tem a defesa de um bem equipado.
- **Defesa ≠ redução percentual.** DEF corta o dano bruto primeiro; a redução % age sobre
  o que sobrou. Reduções % fortes vêm de equipamento/skill/buff/carta — **nunca** de
  acumular VIT ou WIS.
- **Esquiva** vem de AGI, com `DD-DEF-005` **retorno decrescente e teto** (nada de
  Assassin com 90 %).
- **Escudos são especializados**, não uma escada de números: Escudo Pesado (físico) ·
  **Escudo Arcano** (troca proteção física por mágica) · anti-projétil (contra Archer) ·
  resistências a perfuração/sangramento/fogo/gelo/veneno. **Um Lendário não é
  universalmente melhor que outro Lendário.**
- `DD-DEF-012` **Bloqueio mágico completo deve ser MUITO raro** — senão o Knight
  fecha todas as formas de pressioná-lo. Existe **cap global de bloqueio** (valor pendente).
- `DD-DEF-018` **Sem botão manual de "levantar escudo"** — tudo automático no servidor.
- ⚠️ 31.56 A **ordem matemática definitiva** das camadas ainda **não está fechada**.

### Cap. 32 — 🔴 Elementos e condições (base de todo o combate)

**`DD-ELM-002` Sete tipos:** **Físico · Fogo · Gelo · Elétrico · Veneno · Sagrado · Sombrio.**
Decisão explícita de **não** ter 15–25 elementos — a profundidade vem de resistências,
condições, cartas e builds.

🔴 **32.2 — Elemento ≠ Condição.** *Gelo* é elemento, *Congelamento* é condição.
**Causar dano de gelo NÃO congela** — depende da habilidade, da chance e das resistências.

| Condição | Categoria | Efeito |
|---|---|---|
| **Congelamento** | controle total | não anda, não ataca, não usa item, não conjura |
| **Petrificação** | controle total | idem + (versão posterior) **grande bônus de DEF/MDEF** |
| **Stun** | controle total **curto** | incapacita e **interrompe cast** |
| **Silêncio** | restrição | **só** bloqueia magia — anda e bate normal |
| **Veneno** | DoT | dano periódico |
| **Sangramento** | DoT físico | perda periódica de HP |
| **Queimadura** | DoT elemental | dano periódico, ligado a Fogo |
| Lentidão · Knockback · Aprisionamento | parciais | ainda sem documentação individual |

- `DD-CC-004/005` **Stun, Congelamento e Petrificação interrompem conjuração.**
- **Fogo não reduz mobilidade, não congela, não atordoa** só por ser fogo — é dano +
  queimadura. O controle territorial vem de habilidade específica (Barreira de Fogo,
  com duração máxima **e** durabilidade por impactos).
- ⚠️ 🔴 `DD-CC-012` **CONFLITO NÃO RESOLVIDO nas durações**: a definição inicial dizia
  Petrificação **mais longa** e mais rara que Congelamento; a definição posterior (Druid)
  diz Congelamento **~10 s** e Petrificação **5–7 s**. O doc manda **não escolher
  silenciosamente** — fica pendente de balanceamento. **A diferença mecânica, essa sim,
  vale**: dano quebra Congelamento, dano **não** quebra Petrificação.
- `DD-CC-013/014` **CC Chain infinito deve ser impedido** — mas o método (resistência
  temporária após sofrer controle / diminishing returns) **ainda não está definido**.
- **Três níveis de contramedida:** **Resistência** (reduz a chance) · **Redução**
  (reduz a duração) · **Imunidade** (não funciona). `DD-CC-016` imunidade tem que ser
  **rara e específica** — e `DD-CC-009` **imunidade a Congelamento não protege de
  Petrificação**.
- `DD-ELM-003` **Resistência ≠ imunidade**: alta resistência a fogo não zera o dano de
  fogo, só torna a escolha menos eficiente.
- **Fraqueza recompensa preparação, mas não garante vitória** — continua havendo
  mecânica de boss, posicionamento e execução.
- **Bestiário revela resistências e fraquezas em patamares** (`Resistências: ???` até o
  jogador conhecer a espécie) — ✅ encaixa direto no bestiário já implementado na Etapa 6.

### 🆕 32.57–32.61 — PK OFF / PK ON (sistema que o roadmap não tinha)

🔴 Com **PK OFF**, a ação ofensiva de um jogador **simplesmente não existe** para outro
jogador: sem dano, sem queimadura, sem stun, sem congelamento, sem debuff, sem AoE, sem
DoT, sem armadilha — **e o caster não vira PK**. Uma Chuva de Meteoros não pega quem
atravessa a área.
Com **PK ON**, tudo passa a valer segundo as regras de PvP/PK.
Em **guerra de guilda oficial**, os inimigos são **hostis automaticamente** — não precisa
ligar PK a cada combate.
**Friendly fire fica desligado por padrão** entre aliados.

*(Isso resolve a preocupação da Etapa 10 sobre "magia de área acertando quem não está
em PvP" — a resposta do doc é o flag de PK, não um tratamento especial de AoE.)*

---

---

## Passe 10 — Doc 1, cap. 35 (party) e 36 (dungeons, MVPs e bosses)

### Cap. 35 — 🆕 PARTY (sistema inteiro que o roadmap não tinha)

**Shared XP tem faixa de nível** — é o anti-power-leveling:
| Faixa | Janela |
|---|---|
| até Lv.100 | **~10 níveis** (10–20, 20–30, …) |
| Lv.100–200 | **~20 níveis** (100–120, 120–140, …) |
| acima de Lv.200 | ⚠️ **não definido** |

🔴 `DD-PARTY-007` **Um Lv.300 pode ajudar um Lv.20** — atacar, proteger, participar —
**mas não divide XP com ele.** Ajudar sim, carregar não.

Três condições para receber shared XP: **faixa de nível válida + proximidade +
participação ativa**. `35.9` **anti-leech**: personagem parado não ganha XP.

**A XP não é simplesmente dividida** (`DD-PARTY-009`): aplica-se primeiro um **bônus de
grupo**, depois divide. Exemplo do doc: monstro de 1.000 XP com 5 jogadores → ~300–350
cada, ou seja **1.500–1.750 XP totais**. Resultado: **solo rende mais XP por monstro
individualmente; party rende mais no total e caça mais rápido.**

🔴 `DD-PARTY-011/012` **LOOT NÃO É MULTIPLICADO.** Se o boss gera 5 itens, existem
**5 itens** — com 2, 5 ou 10 jogadores. Nada de "cada um recebe a tabela completa", que
inflacionaria o servidor. Com 10 jogadores e 5 itens, **alguns não recebem nada** — e
isso é proposital. Um mesmo jogador pode receber mais de um.

**Três modos de distribuição** (visíveis antes de entrar na party):
**Aleatório** · **Loot do Líder** · **Loot Livre**.

🔴 `DD-PARTY-015…020` **O líder NÃO muda a regra sozinho:**
- pode **propor**; todos recebem aviso e votam
- **maioria simples**; o voto do líder vale **um voto**
- **empate mantém a configuração atual**
- 🔴 **trava durante combate de boss** — impede o golpe clássico (boss a 1 % de HP →
  líder troca para "Loot do Líder" → leva tudo)
- **alteração nunca é retroativa**; o drop usa a regra vigente no momento em que caiu

**Boss Global — dois estágios** (`DD-PARTY-021/022`):
1. A **contribuição** de cada party/jogador solo pondera o sorteio dos drops reais
   (ex.: Party A 38 % · Party B 27 % · solo D 10 %). **Peso, não garantia** — 38 % não
   significa receber 38 % dos itens naquela morte.
2. O drop atribuído à party é então distribuído **internamente** pela regra dela.
- **Last hit não vale nada.** · Existe **contribuição mínima** para disputar os drops
  principais (percentual ainda não definido) — evita dar um golpe e sortear uma Relíquia.
- **Jogador solo compete normalmente** pelo loot de Boss Global.

### Cap. 36 — Dungeons, MVPs e Bosses

- `36.2` **Dungeons são desenhadas à mão, nunca procedurais.** Cada uma tem arquitetura,
  salas, segredos e população próprios.
- `36.3–36.6` **Dungeon é um lugar do mapa, não um lobby.** Entra e sai quando quiser,
  sem obrigação de terminar. **Outros jogadores estão lá.** ✅ bate com a Etapa 13.
- `36.7` **PvP e PK valem dentro da dungeon** — ela não cria zona separada das regras.
- 🔴 `36.11` **Sem level mínimo artificial.** Nada de "precisa ser Lv.80 para entrar".
  Um Lv.20 **pode** entrar numa dungeon perigosa — o mundo mostra se ele estava pronto.
  O perigo é comunicado por **ambiente, criaturas, cadáveres, corrupção**, não por placa.
- **Classificação interna D1–D6** (Inicial → Endgame) só para balancear no
  desenvolvimento — **não aparece ao jogador**.
- `36.16/36.17` **Sala limpa continua vazia** por um período. Se muita gente caça na
  mesma dungeon, a eficiência cai e os jogadores se espalham pelo mundo naturalmente.
- `36.18` **Não existe propriedade automática de hunt** — respeitar, dividir, negociar
  ou disputar é decisão social dos jogadores.

**Quatro categorias distintas:**
| | Instanciado? | Característica |
|---|---|---|
| **Boss de Dungeon** | não | pertence ao local, respawn com janela **previsível** |
| **MVP** | **não** | mundo aberto, mais raro, regiões preferenciais, respawn **menos previsível** |
| **Boss Global** | não | acontecimento público do servidor, dezenas de jogadores |
| **Boss Mítico** | **SIM** | evento especial, 1–10 jogadores |

🔴 `36.27` **TODO BOSS DEVE SER TECNICAMENTE SOLÁVEL.** Nenhum boss exige número mínimo
artificial de jogadores. `36.29` **proibido** design do tipo "dois botões precisam ser
apertados ao mesmo tempo" ou "este ataque só é sobrevivível com outro jogador presente".
A dificuldade solo vem de números, recursos, mecânicas e execução — nunca de trava.
"Solável" ≠ "fácil".

`36.31` **Solo que derruba um boss compartilhado fica com 100 % da contribuição** — logo,
com **todo o loot**. Não porque o jogo criou mais, mas porque não há mais ninguém disputando.

**Boss Mítico** (a exceção instanciada):
- Acesso: token, convite, chave craftada, fragmentos de MVP ou recompensa de evento —
  ⚠️ **nenhum escolhido como regra universal**; Míticos diferentes podem usar métodos
  diferentes.
- **1 a 10 jogadores**, com escalonamento que muda HP, dano, resistência, summons,
  frequência de habilidade e mecânicas de área — não só HP:
  | Participantes | Filosofia |
  |---|---|
  | 1 | extremamente difícil, **mas possível** |
  | 2–3 | muito difícil |
  | 4–5 | difícil |
  | 6–8 | difícil, com mecânicas maiores |
  | 9–10 | versão completa do encontro |
- `36.51` **A versão solo não é "modo fácil"** — preserva identidade, ataques principais
  e mecânicas. O escalonamento torna possível, não trivial.
- **Loot escala, mas não linearmente** (ilustração: solo 2–3 rolls · 5 jogadores 4–6 ·
  10 jogadores 6–8). Se fosse linear, maximizar a party seria a única jogada racional e
  o mercado inundaria de item raro.
- 🔴 `36.55` **O jogador solo NÃO perde a chance do melhor item.** Se existe uma carta
  mítica do boss, ele também pode tirá-la. Grupo maior = mais rolls, mas divididos entre
  mais gente.

---

---

## Passe 11 — Doc 1, cap. 37 (respawn/população) e 38 (aggro)

### Cap. 37 — 🔴 Respawn é por POPULAÇÃO DE REGIÃO, não por cronômetro

`DD-SPAWN-001/006` **Não é** "monstro morreu → timer → mesmo monstro nasce no mesmo
quadrado". Cada região/andar tem uma **população-alvo** e o servidor **recompõe
gradualmente**.

- `DD-SPAWN-004` **O monstro vivo persiste no mundo** — não some porque ninguém passou
  ali. Ele circula dentro da área permitida (patrulha, ronda o ninho, ou fica quase parado).
- 🔴 `DD-SPAWN-007` **Reposição é PARCIAL**: 60 vivos → matam 30 → sobram 30 → repõe ~15
  → **45 disponíveis**. Não volta a 60 na hora.
- 🔴 `DD-SPAWN-008/009` **A hunt PODE ficar escassa** — e isso é **desejado**. Se os
  jogadores matam mais rápido que a reposição, a população despenca (20/60, 15/60…).
  Quem chegar depois encontra a região quase limpa e decide: espera, troca de andar,
  vai para outra dungeon ou disputa.
- `DD-SPAWN-010` Diminuiu a pressão → a região **se recupera sozinha** aos poucos.
- 🔴 `37.21` **Não existe instância/canal para resolver saturação.** A escassez faz parte
  do mundo compartilhado. É ela que espalha os 500 jogadores pelo mapa, sem o jogo
  precisar dizer "já tem 10 pessoas aqui".
- `DD-SPAWN-011` Intervalos e quantidades **variam** — o respawn não pode ser decorável
  ("a cada 5 min nascem 15"), mas também não é RNG caótico.
- 🔴 `DD-SPAWN-014` **Dia/noite muda a população**: criaturas que só aparecem à noite,
  mortos-vivos mais fortes, loot noturno ligeiramente melhor, áreas iniciais mais seguras
  de dia. ✅ o ciclo dia/noite já implementado ganha função de gameplay.
- `DD-ECO-001` **Sem simulação ecológica** — nada de cadeia alimentar, reprodução ou
  migração. A ecologia é: *spawn + população + reposição + variantes + dia/noite*.
- Composição varia com a profundidade e **conta a história da dungeon** sem placa:
  entrada com ovos → operárias e soldados → ranged e criaturas mágicas → profundezas.

**Corpo e loot de monstro:**
- `DD-LOOT-002` **~120 segundos** de permanência (referência inicial).
- `DD-LOOT-005` **Corpo vazio pode ser removido em poucos segundos** ✅ igual ao código.
- 🔴 `DD-LOOT-003/004` **Não pegou, perdeu.** Nada vai automaticamente para o depósito.
  Isso conversa com o peso: "esse material vale pouco e estou cheio" → deixa → some.
  É um **sink natural** de itens, e uma necessidade técnica (500 jogadores gerando
  milhares de cadáveres).
- `DD-LOOT-006` **Item que o jogador larga no chão também expira** (tempo não fechado) —
  senão o mundo vira depósito.

> ⚠️ **Conferir na hora de mexer no código:** esses 120 s são do **corpo de MONSTRO**.
> O corpo de **JOGADOR** da Etapa 5 (15 min, vazio some em 1 min) é outro objeto — o doc
> não trata os dois no mesmo lugar. Não unificar sem decidir.

### Cap. 38 — Aggro e perseguição

**Três comportamentos-base** (`DD-AI-002`): **Passivo** (só revida) · **Agressivo**
(detecta e ataca) · **Territorial** (tolera até invadirem ninho/território).
✅ Os **6 comportamentos** já implementados na Etapa 6 são um refinamento disso, não um
conflito. `38.4` **passivo não é indefeso** — depois de atacado ele revida, persegue ou
foge conforme a espécie.

🔴 `DD-AI-003` **Aggro NÃO é "quem bate mais".** A ameaça combina:

```
PROXIMIDADE + DANO RECEBIDO + TAUNT/PROVOCAÇÃO + AMEAÇA DE HABILIDADES
```

- `DD-AI-008` É isso que faz o **Warrior ser blocker de verdade** — não é ter mais HP,
  é ter ferramentas para manipular a atenção. Se aggro fosse só dano, o Sorcerer roubaria
  tudo e o tank não existiria.
- `DD-AI-009/010` **Mas o aggro não é eterno**: se alguém despeja dano absurdo, o monstro
  **pode recalcular e trocar de alvo**. O blocker **gerencia** a ameaça, não a possui.
- 🔴 `DD-AI-011/012` **Limite territorial de perseguição.** Não dá para puxar 30 monstros
  e correr até a cidade. Ao ultrapassar o limite o monstro **desiste**.
- `DD-AI-013/014` Ao desistir, ele **volta caminhando** para a região — **sem teleporte**,
  e **continua sendo a mesma criatura** (coerente com a persistência do cap. 37).
- `DD-AI-015/016` **A IA varia por espécie**, com regras simples sobre uma base comum:
  Orc Guerreiro avança direto · **Orc Arqueiro mantém distância** · Lobo rápido e
  persegue muito · Urso lento e brutal · Javali com investida · Morcego rápido e difícil
  de acertar · Formiga Rainha invoca durante a luta · Lobo Alfa uiva e chama a matilha.
- ⚠️ `38.33` **Não existe fórmula universal de aggro para bosses** — cada boss recebe
  comportamento próprio quando for criado. Não inventar "todo boss troca de alvo a cada 15 s".

**Fluxo consolidado:** `DETECÇÃO → COMPORTAMENTO → AGGRO → PERSEGUIÇÃO → LIMITE
TERRITORIAL → RETORNO`.

⚠️ `38.42` Nada numérico está fechado: raio de percepção, distância territorial,
multiplicador de ameaça do tank, ameaça por ponto de dano, duração e CD do taunt,
frequência de recálculo, distância ideal do ranged, velocidade de retorno.

---

---

## Passe 12 — Doc 1, cap. 40 (mapa, exploração e névoa de guerra) — **base da Etapa 8**

### 🔴 O princípio central (40.12)

> **MAPA REVELA "ONDE". EXPLORAÇÃO REVELA "O QUE EXISTE LÁ".**

O jogador pode conhecer perfeitamente **onde está** e ainda não saber **o que vai
encontrar ali**.

### Névoa de guerra

- `DD-MAP-001/002` O mundo **não** começa revelado. O terreno aparece conforme o
  personagem atravessa.
- 🔴 `DD-MAP-003/004` **EXCEÇÃO: todas as cidades principais são visíveis desde o
  início.** O jogador sabe que a Cidade X existe e onde fica — mas **não** conhece a
  estrada, as pontes, as florestas, as hunts, os perigos nem os atalhos.
  **Destino conhecido ≠ caminho conhecido.**
- `DD-MAP-025` O mapa distingue **cidade conhecida** (existe, nunca fui) de
  **cidade visitada** (já cheguei fisicamente).
- **Atalhos** existem e são descobertos explorando — trilhas, passagens de montanha,
  cavernas, pontes alternativas. `40.9` **atalho ≠ caminho seguro**: pode cortar a
  viagem pela metade atravessando uma região muito pior.

### 🔴 `DD-MAP-009` A EXPLORAÇÃO PERTENCE À CONTA

Essa foi uma **mudança explícita** — a proposta inicial era por personagem e **foi
rejeitada**. ✅ Confirma o item 3 da Etapa 8 ("névoa de guerra por conta").

**A separação que precisa ficar clara no código:**
| | Escopo |
|---|---|
| Geografia descoberta, marcadores, anotações | **CONTA** |
| Nível, quest, chave, item, ponto de respawn | **PERSONAGEM** |

Exemplo do doc: um Lv.300 descobre uma dungeon → o jogador cria um Lv.15 → o novo
personagem **vê onde a dungeon fica**, mas **não entra** se houver requisito de nível,
quest ou chave. E `40.21` **conhecer a cidade não libera o respawn ali** — isso continua
sendo progressão do personagem.

Isso permite o estilo "**este personagem é meu explorador**": ele varre o mundo e tudo
que descobre vira memória permanente da conta.

### Minimapa

`DD-MAP-007/008` Existe minimapa funcional (terreno descoberto, estradas, construções,
marcadores). Mas **não** é lista de objetivos — nunca mostra automaticamente
`"MVP AQUI"`, `"ITEM RARO AQUI"`, `"PASSAGEM SECRETA AQUI"`, `"BOSS ÀS 18:00"`.
O mapa ajuda a **navegar**, não substitui a **descoberta**.

### Marcadores pessoais (`DD-MAP-013/014/015`)

Ícone + anotação curta, editáveis, removíveis e com liga/desliga para não poluir:
⚠️ PERIGO · ⚔️ HUNT · 🕳️ DUNGEON · ⛏️ MINÉRIO · 💀 MVP VISTO AQUI.
**Pertencem à conta** — e 🔴 **NÃO acompanham um mapa vendido**. Quem compra um mapa
recebe **geografia**, nunca "tem minério aqui" ou "MVP aparece aqui".
*(Compartilhar marcadores com party/guilda foi considerado e **não aprovado** na base atual.)*

### 🆕 Mapas físicos negociáveis (`DD-MAP-016/017/021/022`)

- Usar um mapa **incorpora aquela geografia permanentemente à conta do comprador**.
- Tipos: **cidade · estradas · regional · dungeon**.
- 🔴 **Oferta limitada.** A ideia de o jogador produzir cópias mediante pagamento foi
  **descartada** — senão explorar uma vez e vender 500 mapas destruiria o valor da
  informação.
- **Concluir a exploração de uma dungeon gera 1 ou 2 mapas físicos** (quantidade sujeita
  a balanceamento). Quem já conhece a dungeon não precisa dele → **vende**.
- `DD-MAP-020` **Cartógrafo não é profissão formal** — a atividade surge sozinha.
- `DD-MAP-018` **Mapa comprado nunca entrega segredo**: boss secreto, MVP, carta, loot,
  passagem falsa e quest continuam desconhecidos.

### Viagem de barco (`DD-MAP-024`)

Desembarcar na Cidade B a torna **visitada** e revela a região do porto — mas
🔴 **todo o território pulado continua desconhecido**. Viajar de barco **não desenha uma
rota terrestre** entre as duas cidades.

### Exploração como estatística

Pode existir `Continente Norte — 73 %`, `Mundo — 46 %`, mas `DD-MAP-012` **não há
recompensa obrigatória por 100 %**. O prêmio da exploração é o próprio conteúdo
encontrado: baús, NPCs escondidos, entradas alternativas, quests secretas, receitas,
livros de lore, materiais raros.

⚠️ **Para a implementação, o doc deixa em aberto:** forma visual da névoa, **raio de
revelação ao redor do personagem**, zoom do mapa mundial, máximo de marcadores, conjunto
de ícones, limite de caracteres da anotação, critério técnico de "dungeon completamente
explorada" e quantidade final de mapas gerados.

---

---

## Passe 13 — Doc 1, cap. 44 (quests/tasks/bestiário) e 45 (biomas)

### Cap. 44 — Quests, Tasks e Bestiário

🔴 `DD-QTB-001/002` **Elysia NÃO é "NPC → Quest → NPC → Quest".** As quests existem para
**contar a história**; a progressão continua vindo de hunt, exploração, dungeon, boss,
PvP, guilda, economia e profissão.

**Só quatro capítulos narrativos** (`DD-QTB-003`):
| Marco | Função |
|---|---|
| **Lv.10** | Capítulo I — apresenta o mundo e o conflito |
| **Lv.50** | Capítulo II — aprofunda história, ameaças e mistérios |
| **Lv.100** | Capítulo III — demônios e o que **realmente aconteceu** em Elysia |
| **~Lv.200** | Capítulo Final — encerra o arco principal |

🔴 `DD-QTB-004` **O Capítulo Final encerra a HISTÓRIA, não o jogo.** Não é level cap,
não é fim de progressão. **História principal ≠ endgame.**

- `DD-QTB-005` Quest secundária **só** quando houver história que justifique — nada de
  dezenas de NPCs com tarefas irrelevantes por cidade.
- **Diário de quests lembra o que o jogador descobriu — não é GPS.** Registra a
  informação e deixa ele explorar.
- 🔴 `DD-QTB-006` **Progresso de quest é do PERSONAGEM** — ao contrário do mapa, que é da
  conta. Um Knight Lv.150 concluir a história **não** conclui para o Sorcerer Lv.1.
  ⚠️ Exceção: algumas **recompensas podem ser únicas por conta** (anti-exploit); a lista
  não foi definida.

**Tasks** (`DD-QTB-008`): atividade recorrente de caça que **complementa** a hunt —
**nunca a principal fonte de XP**.

🔴 `DD-QTB-009/010` **Task e Bestiário compartilham o MESMO contador.** Matou 1.000 orcs
→ vale para os dois. **Não duplica grind.** E o Bestiário **progride sozinho**, sem
precisar aceitar task.

**Uma task por espécie, com três marcos** (`DD-QTB-011/012`):
| Marco | Recompensa (referência) |
|---|---|
| 100 abates | **+5–8 % de XP** |
| 500 abates | **+20 %** |
| 1.000 abates | **+40 %** e **Bestiário 100 %** |

🔴 `DD-QTB-013` **O bônus é recompensa de conclusão, NÃO aumento permanente do monstro.**
Descartada a ideia de "quem matou 2.000 orcs ganha mais XP por orc para sempre" — isso
quebraria party XP, balanceamento e cálculo de eficiência.

🔴 `DD-QTB-015` **A task termina em 1.000. Não é infinita.** Se pudesse repetir, todo
mundo descobriria a melhor XP/minuto e ficaria nela. O objetivo é o contrário: completou
→ procura outra espécie → viaja → descobre outra hunt → outra região.

**Variantes** (`DD-QTB-019…023`): **Comum · Incomum · Raro** — e cada uma vale progresso
diferente na task:
| Variante | Pontos |
|---|---|
| Comum | **1** |
| Incomum | **3** |
| Raro | **5–8** |

Assim, "1.000 pontos" **não exige matar 1.000 corpos** se aparecerem variantes boas —
mata a sensação de repetição sem criar dez sistemas paralelos.
🔴 `DD-QTB-023` **Mesma espécie = mesmo bestiário = MESMA CARTA.** Uma variante **não**
gera entrada nem carta própria (isso inflaria o sistema de cartas).
`DD-QTB-018` **Variantes nascem naturalmente na população** — não são desbloqueadas por
kills pessoais.

> ✅ Confirma e refina a Etapa 6 já implementada: o código tem comum/incomum ("Robusto");
> falta a terceira variante **Raro** e o sistema de **pontos 1/3/5–8** na task.

### Cap. 45 — Biomas

`DD-BIO-002` **Oito grandes grupos**, com identidade forte — não dezenas:

**Planícies e Campos · Florestas · Montanhas · Pântanos · Desertos · Regiões Geladas ·
Regiões de Mortos-Vivos · Regiões Corrompidas/Demoníacas**

`DD-BIO-011/012` **Costa e ilhas são GEOGRAFIA, não bioma.** Uma ilha pode ser tropical,
vulcânica, florestal, gelada ou corrompida. Vulcão, oásis, tundra, geleira, selva e
cânion são **sub-regiões**, não categorias novas.

🔴 `DD-BIO-013/014` **A REGRA MAIS IMPORTANTE: BIOMA NÃO DETERMINA LEVEL.**
Explicitamente **rejeitado** o modelo `Floresta = Lv.1–30 · Deserto = 30–60 · Neve =
60–100`. A mesma floresta pode ser inicial perto da cidade e **Lv.150+** como Floresta
Ancestral em outra parte do mundo. Visualmente iguais, em gameplay mundos diferentes.

> **Bioma define identidade e ecossistema · Região define contexto e população ·
> Dificuldade é outra camada.**

- 🔴 `DD-BIO-015` **A dificuldade varia DENTRO da própria região**: perto da estrada
  administrável → sai da estrada pior → mais fundo mais hostil → entra numa caverna,
  ameaça muito superior. O jogador decide **até onde quer ir**.
- 🔴 `45.30` **Não existem paredes de level.** Um Lv.10 pode entrar numa região perigosa;
  talvez descubra rápido que não deveria — mas o jogo **não o impede**.
- `DD-BIO-016` **Transições naturais** — nada de grama, linha reta, neve. Campo → ganha
  árvores → vegetação aumenta → floresta. **O mundo tem que parecer um lugar**, não uma
  coleção de mapas.

🔴 `DD-BIO-018` **O bestiário será construído REGIÃO POR REGIÃO** — não 200 criaturas
abstratas para depois decidir onde colocar. A ordem fixada é:

```
Região → Ecossistema → Criaturas adequadas → Dificuldade → Variantes →
Drops → Carta → XP → Comportamento → Task/Bestiário → Miniboss/MVP
```

> ⚠️ **Isso muda a forma de executar a Etapa 16.** O roadmap sugeria "por família";
> o doc manda **por região**, com o ecossistema completo de cada uma fechado antes de
> passar para a próxima. `DD-BIO-020` criaturas ligadas à lore (demônios) só entram
> respeitando seus arcos narrativos.

---

---

## Passe 14 — Doc 1, cap. 46 (dificuldade regional) e 48 (famílias e tipos)

### Cap. 46 — 🔴 Duas réguas internas, nenhuma é parede de level

`DD-DIF-001` **Região tem dificuldade predominante, não trava de level.** O modelo
`Área Lv.1–20 → Lv.20–40 → Lv.40–80` foi **rejeitado**.

**Régua A — D1 a D6** (`DD-DIF-012…019`), classifica **áreas/conteúdo**:
D1 Inicial · D2 Baixa · D3 Intermediária · D4 Alta · D5 Muito Alta · D6 Endgame.

**Régua B — Tiers de monstro** (46.46), classifica **faixa de progressão das criaturas**:
Tier I 1–20 · Tier II 20–50 · Tier III 50–100 · Tier IV 100–150 · e assim por diante.

🔴 `DD-DIF-019/025` **Nenhuma das duas aparece ao jogador nem bloqueia acesso.** São
ferramentas de design para organizar HP, dano, XP, loot e densidade. Um jogador **pode**
encontrar um Tier IV antes do nível 100 — só está entrando em território perigoso.

🔴 `DD-DIF-020` **Uma mesma região tem várias classificações ao mesmo tempo:**
| Sub-área | Classificação |
|---|---|
| Estrada principal | D1/D2 |
| Mata externa | D2 |
| Interior da floresta | D2/D3 |
| Floresta profunda | D3 |
| Caverna escondida | **D4** |
| MVP local | **D5** |

Isso faz o **mesmo espaço geográfico continuar relevante** durante toda a progressão:
cedo o jogador anda pela estrada; depois entra fundo; depois acha a caverna; muito
depois volta preparado para o MVP.

**Como o perigo é comunicado** (`DD-DIF-006/007/008`), sem nunca escrever "⚠️ Área Lv.100":
**o ambiente** (estrada com cadáveres, vegetação corrompida) · **a aparência da criatura**
(tamanho, armadura, comportamento) · **a experiência do próprio jogador**.
`46.24` **Fugir faz parte do gameplay** — encontrar algo forte demais não é morte
obrigatória.

**Fluxo de construção de uma região** (46.48):
`identidade ambiental → dificuldade predominante → subáreas → populações → ameaças
intermediárias → poucos perigos superiores → variantes → cavernas/dungeons →
miniboss/MVP → balancear HP, dano, XP e loot`

> **Regra de ouro (46.52):** *"O mundo não pergunta se você tem level para entrar.
> Ele apenas contém perigos."*

### Cap. 48 — 🔴 A taxonomia das criaturas (base da Etapa 16)

`DD-TIP-001` **Tipo e Elemento/Afinidade são independentes.** Exemplo canônico:
> Esqueleto Guerreiro — **Tipo:** Morto-vivo · **Afinidade:** Sombrio · **Fraqueza:** Sagrado

**Sete Tipos** (`DD-TIP-002…008`):
| Tipo | Exemplos |
|---|---|
| **Humanoide** | bandidos, guerreiros, cultistas, **goblins** |
| **Besta** | lobos, ursos, ratos, javalis |
| **Inseto/Aracnídeo** | aranhas, escorpiões, formigas |
| **Réptil** | serpentes, criaturas reptilianas |
| **Morto-vivo** | esqueletos, fantasmas, reanimados |
| **Demoníaco** | demônios e corrompidos da lore |
| **Monstruosidade** | o que não cabe nas anteriores (**slime**) |

- `DD-TIP-012/013` **Tipo não determina comportamento nem dificuldade.** Rato do Campo,
  Lobo e Javali são todos Besta — e são neutro, agressivo e territorial respectivamente.
  "Besta" também não significa monstro fraco.
- 🔴 `DD-TIP-023` **Demoníaco ≠ Sombrio.** Um *Demônio das Chamas* é Tipo Demoníaco com
  **afinidade Fogo**. Não presumir que todo demônio é sombrio nem que todo morto-vivo é.
- `DD-TIP-010/011` A utilidade mecânica do Tipo é servir de **tag**: `+X % de dano contra
  Mortos-vivos` atinge esqueleto, zumbi, fantasma e lich de uma vez, em vez de um efeito
  por espécie.

🔴 **As cinco camadas** (`DD-TIP-014`) — não confundir:
```
Família: Goblins          (conjunto temático/ecológico)
  └ Espécie: Goblin Saqueador   (bestiário, task e carta próprios)
      ├ Tipo: Humanoide         (tag mecânica)
      ├ Afinidade: Físico
      └ Variante: Comum / Incomum / Raro
```
`DD-TIP-015` **Espécie determina o comportamento · Variante determina a excepcionalidade
do indivíduo.** `DD-TIP-018` 🔴 **MVP é criatura própria, NÃO o degrau seguinte a Raro.**

- `DD-TIP-016/017` **Nem toda família precisa ter melee, ranged, mágico e tank.**
  *Lobos não passam a usar magia só para dar variedade* — continuam melee; o Alfa/MVP
  ganha uivo e habilidades, mas **continua lutando como lobo**. Já **Orcs** (jovem,
  guerreiro, arqueiro, xamã, berserker, ogro de guerra, chefe MVP), **formigas** (castas
  de colônia) e **aranhas** (veneno, teia, distância) justificam variedade — porque ela
  tem **coerência interna**.

🆕 🔴 **Tipo afeta MAGIA** (`DD-TIP-019`): magias de **energia vital** curam seres vivos
compatíveis e **causam DANO** em mortos-vivos, esqueletos, zumbis, vampiros e demônios.
Vale também para **Cura em Área** e **Santuário** (aliados curam, mortos-vivos na área
tomam dano). Isso evita duplicar habilidade — a própria Cura muda de resultado conforme
o alvo. *(Toca direto a árvore do Druid do cap. 71.)*

⚠️ **Pendências reais desta taxonomia:**
- `DD-TIP-020` **Tipo Primário/Secundário não está fechado** — a Hidra do Pântano aparece
  como *Monstruosidade/Réptil*, e não há regra sobre acúmulo de bônus contra os dois.
- **Não decidido** se Vampiro, Elemental, Construto, Dragão, Planta e Celestial viram
  Tipos próprios. `DD-TIP-009` regra: **só criar Tipo novo se houver necessidade mecânica
  real** (cartas, equipamentos e resistências específicas), não porque a criatura é
  importante.

**Ficha prevista por criatura** (48.58): nome · aparência · comportamento · dificuldade ·
HP · ataque · XP · elemento · Tipo · loot · carta · variantes · bestiário.
🔴 Mas a decisão **posterior** manda: **primeiro fechar catálogo e identidade; os números
(HP, XP, drops) vêm depois, na fase de balanceamento.**

**Os quatro pilares antes do bestiário estão fechados:** Biomas → Dificuldade Regional →
Elementos/Resistências → Famílias/Tipos. A partir do cap. 49 começa o catálogo,
**pela região/vilarejo inicial**, das criaturas mais fracas para as mais complexas.

---

## Passe 15 — Doc 1, cap. 13 (criação de personagem)

⚠️ **Capítulo antigo — parcialmente superado.** Ele ainda fala em **4 classes**
(Knight/Sorcerer/Archer/Assassin) e **6 atributos sem WIS**. Pelas revisões posteriores
valem **5 classes** (cap. 72) e **7 atributos** (cap. 65). O que segue é só o que **não**
foi superado.

⚠️ **Inconsistência de nome a resolver:** o cap. 13 chama a classe de **"Knight"**;
do cap. 67 em diante ela é **"Warrior"**. O código usa Warrior. Escolher um e padronizar.

### O que vale

- 🔴 `DD-CHR-001` **Raça na v1.0: apenas HUMANO.** Sem tela com raças bloqueadas.
  **Elfo, Anão e Orc** ficam para expansão — e o doc quer que eles **existam no mundo
  como NPCs antes** de virarem jogáveis: uma raça nova deve ser um **acontecimento**, não
  mais um botão no menu.
- `DD-CHR-003/004` **Masculino e feminino, com igualdade mecânica total** — mesmas
  classes, armas, magias, skills, atributos, equipamentos, profissões, conteúdo.
  **Nada de "homem +STR, mulher +AGI".**
- `13.10` **Aparência não define poder.** Rosto, cabelo, barba, tom de pele, sexo e
  cosméticos **nunca** alteram estatística.
- **Fluxo de criação:** `Humano → Masculino/Feminino → Customização visual → Nome →
  Classe → entrada em Elysia` (ordem da interface ainda pode mudar).
- `DD-CHR-006` **Classe não determina moralidade nem facção.** Assassin não nasce
  criminoso, Knight não pertence a uma ordem, Sorcerer não pertence a uma academia.
  Facção e história pessoal são sistemas separados.
- `13.44/13.42` **Não existe alinhamento Bom/Neutro/Mau** nem **background selecionável**
  (nobre, camponês, órfão…) — os dois foram **explicitamente não aprovados**.
- `13.1` **O personagem começa como habitante mortal comum** — não é rei, herói lendário
  nem escolhido. *"Em Elysia, o mundo sempre será maior do que o jogador."*
- `DD-CHR-008` **O personagem não começa conhecendo a verdade do universo** — descobre por
  ruínas, manuscritos, templos, artefatos e eventos. **Conhecimento é uma forma de
  progressão.** E `13.51` **nem a conclusão da história entrega todas as respostas.**

### ⚠️ Pendências que batem na Etapa 8 (contas e criação)

O capítulo deixa **26 itens em aberto**. Os que bloqueiam a implementação de criação de
personagem:
- **Regras de nome** (tamanho mín./máx., espaços, sobrenome, caracteres especiais, nomes
  repetidos, nomes reservados) — **nada definido**.
- **Cidade inicial** — `13.47` **PENDENTE**; o doc **se recusa** a assumir Asteria como
  spawn sem a decisão explícita.
- **Local exato de spawn**, **tutorial**, **equipamento inicial de cada classe** e
  **primeira quest** — todos pendentes.
- Toda a customização visual (quantidade de rostos, cabelos, cores, barbas, tons de pele,
  altura, tipo físico, tatuagens, cicatrizes, vozes) e se dá para **alterar depois**.

> 👉 Para a Etapa 8, o que dá para implementar sem inventar: conta → personagens →
> humano → sexo → nome → uma das classes. **Nome e cidade inicial precisam de decisão
> sua** antes de virar schema.

---

## Passe 16 — Doc 1, Volume I de LORE: cap. 1–3

### 🔴 A regra que governa toda a lore

> **Verdade Absoluta** (só a equipe conhece) ≠ **Conhecimento dos Habitantes**
> (fragmentado, contraditório e às vezes simplesmente errado).

`DD-LOR-006` Nenhum rei, sacerdote ou mago conhece a história inteira. Nenhum NPC fala
com Deus. **Nenhuma missão leva até Deus.** `DD-LOR-001` **Deus não é NPC, não é boss e
não é acessível** — e não resolve conflito nenhum.

`DD-LOR-014` O jogador **nunca** recebe um livro com toda a verdade. Ele monta o
quebra-cabeça com pergaminhos, inscrições, tábuas, ruínas, relatos, tradições religiosas,
canções, murais, vitrais e memórias ligadas ao Aether — **fontes que podem se contradizer,
estar erradas ou ter sido deliberadamente alteradas.**

### A cosmologia (cap. 1)

```
DEUS  →  HEART  →  AETHER  →  CRIAÇÃO
(origem) (instrumento) (força que sustenta) (o que recebe)
```

- **Heart** — `DD-LOR-002` a **primeira criação**, o núcleo por onde o Aether alcança tudo.
  🔴 **NÃO é uma segunda divindade.** Enquanto pulsa, a existência é alimentada.
  *(Civilizações vão adorá-lo como deus, negá-lo, ou achar que é fenômeno natural — nada
  disso muda a verdade interna.)*
- **Aether** — `DD-LOR-003` a força primordial; **é o que os povos chamam de magia**.
  Toda vida tem alguma ligação com ele.
- **Sete Arcanjos** — criados antes dos mortais.

**A queda começa pelo orgulho, não pela violência** (1.13): a crença de que uma criatura
pode se colocar acima da ordem que permite sua existência.

`DD-LOR-005`/`1.14` **Deus não desapareceu, não morreu, não foi derrotado** — só não anula
cada escolha errada, porque isso destruiria o livre-arbítrio.

### Cap. 2 — Livre-arbítrio (o pilar filosófico E de gameplay)

> **Liberdade para escolher ≠ imunidade às consequências da escolha.**

`DD-LOR-008` E o doc liga isso direto às mecânicas: um rei escolhe a guerra mas não quantos
sobrevivem · um mago faz o experimento mas não controla o que soltou · uma guilda toma a
fortaleza mas enfrenta quem quer retomá-la. **Escolha + consequência é a raiz comum da
narrativa e do design.**

🔴 `DD-LOR-013` **O JOGADOR NÃO É O ESCOLHIDO.** Não há profecia, não é o único capaz de
salvar a criação. Ele é *mais uma alma livre*. Se ficar famoso no servidor, é **por causa
das ações dele** — não porque o universo o declarou especial.

🔴 `DD-LOR-012` **O mal não é uma raça.** Orc não é automaticamente mau, humano não é
automaticamente bom, elfo não é automaticamente virtuoso. Reinos civilizados cometem
atrocidades; povos ditos selvagens têm honra. **Nada de "raças boas contra raças más".**

`DD-LOR-011` **A Corrupção não serve de desculpa moral.** Nem todo ato destrutivo vem
dela — muita gente simplesmente escolheu. Evita o clichê *"ele era bom, mas a Corrupção o
controlou"*.

**Ordem · Caos · Corrupção** (2.13) são **forças filosóficas, não três facções
obrigatórias**. Ordem no extremo vira tirania; liberdade sem responsabilidade vira domínio
pela força.

`2.16` **O mundo atual é o resultado acumulado das escolhas de quem veio antes** — uma
guerra antiga virou fronteira, um experimento virou dungeon, uma civilização morta deixou
criaturas que ainda existem.

### Cap. 3 — Os Sete Arcanjos

`DD-LOR-015/016/017` Criados antes dos mortais, com **três responsabilidades**:
**proteger o Heart · preservar o equilíbrio · orientar os primeiros povos.**
🔴 **Servir, nunca governar.** Não são deuses, não são reis, não deviam exigir adoração.

`DD-LOR-018` **Têm livre-arbítrio** — podem questionar, interpretar, escolher e **falhar**.
`DD-LOR-019` 🔴 **Um deles cai — e NÃO por inveja nem por ódio**, mas por **acreditar
sinceramente que poderia construir algo melhor que o Criador**. Ele vê guerra, sofrimento
e conflito e conclui que tem capacidade de corrigir. *"Proteger a criação" vira
"controlar a criação"* — e controlar exige o Heart.
**A contradição central (3.16):** para salvar a criação ele precisa destruir a liberdade
que a tornou significativa.

- `DD-LOR-020` **Arcanjos não são raça jogável e não são boss comum.** Regra de design:
  **quanto mais poderosa e misteriosa a criatura, mais rara sua presença direta.**
  Encontrar um *vestígio* já deve ser significativo.
- `3.13` Eles **não podem virar NPC de tutorial de cosmologia** — a presença deles tem que
  gerar tantas perguntas quanto respostas.
- `3.11` Influenciam o mundo **sem aparecer**: ruínas, símbolos, templos, relíquias,
  inscrições, cultos, ordens antigas, nomes de região, artefatos, dungeons.
- `3.22` São o **motor de longevidade narrativa**: um Arcanjo pode ficar anos só como mito
  e ser revelado numa expansão, sem precisar reescrever a cosmologia depois.

### ⚠️ PENDÊNCIAS grandes da lore — **não inventar**

- `DD-LOR-022` **Nomes, poderes, aparência, artefatos, títulos e destinos individuais dos
  Sete Arcanjos: TODOS PENDENTES.** Inclusive **qual dos sete caiu**.
- `3.17` Quantos dos outros seis apoiaram a rebelião, quantos ficaram fiéis, se algum
  morreu, desapareceu ou foi corrompido — **nada decidido**.
- `DD-LOR-021` Os **Sete Senhores da Corrupção** existem como conceito aprovado, mas
  🔴 **7 Arcanjos ≠ 7 Senhores da Corrupção** — a equivalência **não** deve ser criada.
  Os Senhores podem ter sido antigos guardiões **ou** grandes líderes mortais.
- A hierarquia entre Arcanjo rebelde → Senhores da Corrupção → Senhores do Inferno →
  demônios **ainda não está consolidada**; não tratar como sinônimos.
- A proposta de os 7+7 representarem **virtudes e vícios** existe, mas a lista **não**.

---

## Passe 17 — Doc 1, cap. 4 (A Primeira Rebelião) e 5 (A Corrupção)

### Cap. 4 — A Primeira Rebelião

`4.2` 🔴 **Não começou com uma guerra.** Não havia exércitos nem cidades queimando —
**e demônios sequer existiam.** Começou com uma **ideia**.

**A doutrina da Rebelião** (4.6), a frase que convence:
> *"A Criação é imperfeita. Nós somos capazes de construir algo melhor."*

E cada seguidor via nela uma coisa diferente: **o rei via ordem · o mago via conhecimento
· o sacerdote via transcendência · o mortal comum via o fim do sofrimento** — e o Arcanjo
via a chance de recriar a ordem da existência.

`DD-LOR-026` Os seguidores foram **mortais, magos, reis e sacerdotes** — a Rebelião
**atravessou** a sociedade, não pertenceu a uma raça nem a uma classe.

🔴 `4.12` **A REBELIÃO VEM ANTES DOS DEMÔNIOS.** Ninguém precisava ser demônio para
participar: **cada um escolheu**. Essa ordem cronológica é fundamental.

**A ruptura** (4.18): tentaram alterar o Heart e **falharam** — não por falta de poder,
mas porque o resultado não foi o pretendido. O equilíbrio rompeu e **nasceu a Corrupção**.

🔴 `4.20` **A ironia central: a Corrupção foi consequência, não objetivo.** Ao tentar
eliminar aquilo que julgavam imperfeito, criaram a ruptura capaz de deformar a existência.
`DD-LOR-029` **Deus não criou a Corrupção.**

**A cadeia de origem** (4.26) — cinco categorias distintas, **não sinônimos**:
```
Arcanjos          → criados antes da Rebelião
Rebeldes          → criaturas que ESCOLHERAM participar
Corrompidos       → criaturas transformadas após a ruptura
Demônios          → aqueles cuja transformação se tornou profunda
Senhores do Inferno → entidades surgidas desse processo
```
`DD-LOR-030` 🔴 **O demônio de Elysia tem origem trágica:** guardiões, reis, grandes magos
e **pessoas comuns** cuja identidade foi apagada por séculos de Corrupção.

`4.30` **Como a história principal revela isso:** o personagem começa conhecendo só mitos →
descobre que houve uma ruptura → descobre a participação dos Arcanjos → percebe que os
demônios não eram raça criada → e só bem tarde entende parte do papel do Heart.
*(Encaixa nos quatro capítulos narrativos Lv.10/50/100/200.)*

⚠️ **PENDENTES do cap. 4:** nome, aparência, poderes e **destino do Arcanjo rebelde** ·
participação individual dos outros seis · número de reinos e raças envolvidas ·
**duração da Rebelião** · local do confronto · **o método usado para interferir no Heart**
(ritual? artefato? magia? — nada definido) · condição física final do Heart.

### Cap. 5 — 🔴 A Corrupção (um dos pilares do mundo)

**Definição canônica dupla** (`DD-LOR-034`):
> **A Corrupção é uma CICATRIZ NO HEART e uma DISTORÇÃO DO AETHER.**

Não é "energia maligna" genérica, não é um segundo criador, não é um deus rival.

🔴 `5.6` **A Corrupção NÃO CRIA — ela DISTORCE o que já existe.** Ela encontra uma
criatura, uma floresta, uma região, uma alma — e altera. Por isso **quase toda criatura
corrompida teve uma forma anterior**.

`DD-LOR-035` **Quanto maior a Corrupção, menor a presença do Aether puro.**
⚠️ Mas o doc **evita** dizer que Corrupção = "anti-Aether" — é **distorção**, e a diferença
pode importar depois.

**No ambiente:** florestas ficam negras · montanhas racham · rios morrem. O bioma tem
identidade própria: **árvores mortas, cristais negros, névoa, solo corrompido**.
🔴 `5.12` **O jogador deve perceber que entrou numa região corrompida ANTES de encontrar o
primeiro monstro.**

### 🆕 A CENTELHA ORIGINAL — o gancho narrativo mais forte do capítulo

`DD-LOR-039`:
> *"Enquanto existir uma centelha do Aether original, ainda existe esperança de redenção."*

Corrupção **não é automaticamente condenação irreversível**. Isso abre: personagens
corrompidos, criaturas parcialmente transformadas, **missões de purificação**, conflitos
religiosos, **NPCs lutando contra a própria transformação**.
⚠️ Mas `5.18` **redenção ≠ cura garantida** — não pode virar "usa um item e volta ao
normal". As regras de purificação estão **PENDENTES**.

### 🔴 A Corrupção NÃO explica todas as criaturas (5.28)

Regra essencial — senão vira desculpa genérica para todo monstro estranho:

| Origem | Exemplo |
|---|---|
| **Corrompidas** | demônios, Behemoths, abominações, devoradores, aberrações |
| **Mortos-vivos** | almas que **não conseguiram voltar ao Heart** — esqueletos, zumbis, ghouls, wraiths, liches, banshees, cavaleiros espectrais |
| **Vampiros** | 🔴 origem **própria**: almas que **retardam a Corrupção alimentando-se do Aether no sangue** — mas isso os **afasta ainda mais do Heart**. **Não são "demônio humanoide"** |
| **Lobisomens** | maldição ligada à Corrupção; conflito entre a natureza original e a transformação |
| **Aberrações** | experimentos/mutações — **Beholders** vieram de **magos que tentaram moldar o Aether à força** |
| naturais, primordiais, tribais, arcanas, marítimas, celestiais | sem relação com Corrupção |

🔴 `5.23` **MORTO-VIVO ≠ DEMÔNIO.** Separação fundamental para o bestiário.

### O Inferno

`DD-LOR-037` 🔴 **O Inferno não foi criado por Deus e não existia originalmente.** Ele
**nasce gradualmente**: ruptura → Corrupção → expansão → regiões transformadas → os povos
passam a chamar aquilo de *Inferno*.
`5.21` **Não é "outro mapa cheio de demônios" — é uma ferida aberta na própria Criação.**

### Pontos de cautela registrados

- `DD-LOR-040` 🔴 **"Void" NÃO é o nome canônico da Corrupção.** Pertence a uma versão
  **antiga** da cosmologia (em que o Heart surgia naturalmente e Elysia era um organismo
  vivo). Pode ser reaproveitado depois como nome que **uma cultura específica** dá — mas
  só com aprovação.
- `5.30/5.31` **A Corrupção não tem criador e não está decidido se tem vontade.**
  ⚠️ Até decidir: **não tratar como personagem, não dar voz a ela, não dizer que tem planos.**
- `5.32` **Senhores do Inferno não são a Corrupção personificada** — usam e espalham, mas
  são entidades distintas do fenômeno.
- `DD-LOR-041` **O Heart CONTINUA existindo** após a ruptura — senão a Criação inteira não
  se sustentaria. Aprovado: **o equilíbrio foi rompido**. ⚠️ **Pendente**: se a fratura foi
  física, espiritual ou ambas.
- 🆕 **ABISMO DA CORRUPÇÃO** — no **centro do continente**, onde o Coração do Mundo foi
  partido. Importante para geografia, endgame e dungeons. ⚠️ Relação física com o Heart
  **pendente de consolidação**.
- 🔴 `5.42` **A Corrupção NÃO é o objetivo final do jogador.** O jogo **não** começa dizendo
  "sua missão é destruir toda a Corrupção" — ela é *um* dos pilares do mundo, que continua
  tendo guerra, economia, PvP, guildas, política e monstros sem relação nenhuma com ela.

⚠️ **14 pendências explícitas** no cap. 5, entre elas: se há **ponto irreversível** de
Corrupção · como funciona **purificação** · se magos podem **canalizar Corrupção
conscientemente** · se haverá **mecânica mensurável de Corrupção para o jogador** ·
efeitos sobre tempo/espaço/matéria · origem dos Behemoths.

---

## Passe 18 — Doc 1, cap. 9 (morte, Caminho do Retorno e destino das almas)

**O capítulo de lore que mais conversa com sistema já implementado.**

### O ciclo (`DD-LOR-070/071`)

```
VIDA → MORTE → SEPARAÇÃO DA ALMA → CAMINHO DO RETORNO → HEART
     → PURIFICAÇÃO → RETORNO AO FLUXO DO AETHER
```

🔴 `DD-LOR-072` **Nem toda alma completa o retorno — e não porque Deus a rejeitou.**
*Ela própria se prendeu*, por **orgulho, ganância, ódio, crueldade e sede de poder**.
Isso mantém a coerência com o livre-arbítrio: Deus não precisa julgar cada morte.

🔴 `DD-LOR-074` **MORTOS-VIVOS SÃO ALMAS INCAPAZES DE RETORNAR AO HEART.** É a origem
espiritual da família inteira — esqueletos, zumbis, ghouls, wraiths, liches, vampiros,
dullahans, banshees, espíritos, cavaleiros espectrais.
`DD-LOR-073` **Quanto mais tempo afastada, mais vulnerável à Corrupção**: primeiro perde
a **identidade**, depois as **memórias**, e por fim restam fragmentos distorcidos.

### 🔴 Três coisas que o doc PROÍBE explicitamente

1. `9.14` **NÃO existe barra de alma.** Nada de `Pureza: 72%` ou `Corrupção da Alma: 34%` —
   *"banalizaria um sistema construído como parte da cosmologia"*.
2. `9.13` **Nada de tabela de pecados.** Não existe `10 assassinatos = alma perdida`.
   O sistema espiritual é narrativo; gameplay é outra questão.
3. `9.36` **NÃO existe condenação eterna.** Enquanto houver centelha do Aether original,
   a redenção continua possível. Elysia **não** usa `vida → julgamento → destino eterno`.

### 🔴 Heart ≠ Céu · Inferno ≠ destino das almas (`DD-LOR-078`)

`9.53` A cosmologia **não** é `bom → Heart / mau → Inferno`. É:
```
Morte → Caminho do Retorno → ou retorna ao Heart
                            → ou a alma permanece presa ao mundo → possível Corrupção
```
- `9.51` O Heart **não é uma cidade espiritual** onde os mortos vivem eternamente.
- `9.52` **O Inferno não é o destino de quem falha no retorno** — ele tem outra origem
  (regiões da Criação deformadas pela Corrupção). Uma alma que falha vira fantasma ou
  outra entidade, **não vai para o Inferno**.

### ⚠️ A pendência que bate direto na Etapa 5 (já implementada)

`9.48/9.49` O doc **separa explicitamente lore de mecânica** e avisa:
> *"NÃO vamos tratar cada morte de gameplay como reencarnação. O personagem continua
> sendo o mesmo personagem."*

- 🔴 **`PENDENTE 27` — explicação canônica da morte e respawn do jogador.** O sistema de
  morte da Etapa 5 **funciona, mas não tem justificativa de lore**. Se o jogador morre e
  volta, o que aconteceu com a alma dele? **Não está decidido.**
- 🔴 **`PENDENTE 26` — ressurreição verdadeira existe?** O doc alerta: *"se ressurreição
  verdadeira for fácil, a morte perde grande parte de seu peso narrativo"*.
  ⚠️ Isso **não contradiz** o "Druid sem Ressurreição" já fechado (`DD-DRU-032`) — são
  coisas diferentes: aquilo é uma **skill**, isto é a **possibilidade cosmológica**.

### Conexões com o bestiário e o combate

- `DD-LOR-077` ✅ **Confirma a regra do cap. 48**: magia de cura **restaura vivos
  compatíveis e causa DANO** em mortos-vivos, vampiros e demônios.
- `9.42` 🔴 **Mas demônio ≠ morto-vivo** mesmo compartilhando essa vulnerabilidade — e a
  distinção *"deverá existir também na programação interna das criaturas"*.
- `9.39` **Destruir fisicamente um morto-vivo não significa destruir sua alma.** A
  pergunta certa — *o que acontece com a alma quando a forma morta-viva é destruída?* —
  **não tem resposta universal**; depende da criatura.
- `9.38` Derrotar uma criatura corrompida **pode libertar o que resta de sua alma** — mas
  ⚠️ **não** vale como regra geral ("todo monstro morto retorna ao Heart" seria amplo demais).
- `9.33/9.34` **Necromancia é possível como conceito**, mas terá de obedecer a este
  capítulo: **um necromante não pode "criar almas"** — almas pertencem ao ciclo do Heart.
- `9.30` ⚠️ **"Espírito" é termo ambíguo** — há Espíritos da Floresta entre as *Criaturas
  Arcanas*. Separar espírito de morto, espírito arcano e espírito natural.
- `9.45` **Criaturas arcanas (slimes, elementais, golems, wisps) nascem de concentração de
  Aether** — o que acontece quando morrem **não está definido**; não assumir o mesmo ciclo
  de um humano.

### Valor de worldbuilding

`9.56/9.57` Cemitérios, catacumbas, criptas, tumbas, campos de batalha e ruínas ganham
peso narrativo — mas ⚠️ **sem transformar todo cemitério em dungeon automaticamente**, e
**sem** dizer que toda morte violenta gera fantasma. O fator é a **incapacidade de
completar o retorno**, não a causa da morte.

⚠️ **28 pendências** no capítulo, incluindo a origem individual de cada família de
morto-vivo (esqueleto, zumbi, ghoul, wraith, lich, vampiro, dullahan, banshee, cavaleiro
espectral), o **sistema metafísico da necromancia**, **almas de animais** e o **destino
espiritual dos Arcanjos**.

---

## Passe 19 — Doc 1, cap. 10 (A Grande Árvore da Vida)

**A origem de TODAS as criaturas.** Base indispensável da Etapa 16.

> ⚠️ **Não confundir com os 7 Tipos do cap. 48.** São camadas diferentes:
> **Árvore da Vida = ORIGEM** (de onde a criatura veio) · **Tipo = TAG MECÂNICA**
> (para cartas, equipamentos e resistências).

### As oito famílias de origem (`DD-LOR-079`)

**I Povos Livres · II Povos Antigos · III Povos Primordiais · IV Fauna Selvagem ·
V Criaturas Arcanas · VI Mortos-Vivos · VII Aberrações · VIII Corrompidos**

### 🔴 I — Povos Livres: só QUATRO (`DD-LOR-080`)

**Humanos · Elfos · Anões · ORCS**

🔴 `10.8` **ORCS NÃO SÃO UMA "RAÇA MALIGNA"** — são um dos quatro Povos Livres, com
cidades, política, cultura, religião, economia, alianças, heróis **e** vilões, igual aos
humanos. Saíram da antiga classificação de "Povos Tribais".

`DD-LOR-082/083` **Só Humano é jogável na v1.0**; Elfo, Anão e Orc são as futuras
possibilidades — **e não há compromisso de tornar mais nenhum povo jogável**.
`10.13` **Existir no mundo ≠ ser selecionável.**

🔴 `DD-LOR-081` **GNOMOS FORAM REMOVIDOS COMPLETAMENTE.** Não são jogáveis, não são NPCs,
não são civilização perdida, não são monstros e **não fazem parte da história antiga**.
Qualquer referência anterior é obsoleta.

### II — Povos Antigos (civilizações **não jogáveis**)

**Minotauros · Trolls · Ciclopes · Gigantes** — confirmados.
`DD-LOR-086` **Podem ter cidades, cultura, política, alianças e guerras próprias** — uma
cidade **não precisa** pertencer aos Povos Livres. `10.70` **Civilização não significa
amizade**: uma cidade minotauro pode proibir humanos, um clã pode atacar viajantes e outro
comerciar com eles. Relações são **políticas**, não biológicas.
⚠️ **PENDENTES:** Sátiros · Homens-lagarto · Nagas (classificação conflitante) · Harpias.

### III — Povos Primordiais (`DD-LOR-087`)

**Dragões · Hidras · Fênix · Grifos · Basiliscos · Quimeras · Mantícoras · Leviatãs ·
Krakens.** ⚠️ Unicórnios **não** aparecem na lista revisada — não confirmar.
`10.28` **Primordial ≠ divino** — são antigos e poderosos, mas fazem parte da Criação.

🔴 `10.29` **DRAGÕES GUARDAM REGIÕES ONDE O FLUXO DE AETHER É INTENSO.** Isso lhes dá razão
cosmológica: não são "monstros grandes para raid" — **a presença de um dragão indica algo
sobre a estrutura do mundo**.
⚠️ `10.34` **Não assumir petrificação no Basilisco** nem `10.32` renascimento clássico na
Fênix — o universo tem regras próprias de alma e morte. Nada de copiar outras franquias.

### IV — Fauna Selvagem

Lobos · ursos · javalis · aranhas · escorpiões · serpentes · crocodilos · morcegos ·
tigres · mamutes · rinocerontes + **variantes gigantes** (Lobo Gigante, Urso Gigante,
Aranha Colossal).
`10.40` **Fauna não significa inimigo** — o comportamento depende de território, fome,
ameaça, horário. ⚠️ `10.41` **Não atribuir Corrupção automaticamente às variantes gigantes**
— a origem delas não está definida.

### V — Criaturas Arcanas (nascidas de **concentração de Aether**)

**Slimes · Elementais · Golems · Wisps · Espíritos · Guardiões Arcanos · Mimics.**

🔴 `10.43` **SLIMES SÃO CONCENTRAÇÕES NATURAIS DE AETHER** — normalmente inofensivos, mas
**ambientes saturados de energia os tornam perigosos**. ✅ Dá origem cosmológica ao slime
que já está implementado no código.
⚠️ `10.47` **"Espírito" é ambíguo** — existe espírito de morto (cap. 9) e espírito arcano.
⚠️ **Golem arcano ≠ Flesh Golem** (este último é Aberração).

### VII — Aberrações (origem **artificial/experimental**)

**Beholders · Homúnculos · Flesh Golems · Parasitas · Vermes Colossais · Horrores ·
Devoradores.**
🔴 `10.53` **Beholders foram criados por magos que tentaram moldar o Aether à força** —
resultado de interferência artificial, **não** de Corrupção.
`10.35` Também existe **Quimera Natural (Primordial)** vs. **Quimera Artificial (Aberração)**
— distinção a preservar.

### 🔴 VIII — Corrompidos: **condição, não espécie** (`DD-LOR-085`)

> *"A Corrupção não cria uma nova espécie; ela distorce o que já existe."*

```
Humano → Humano Corrompido      Dragão → Dragão Corrompido
Elfo   → Elfo Corrompido        Minotauro → Minotauro Corrompido
Orc    → Orc Corrompido         Hidra  → Hidra Corrompida
```

`10.4` **A Corrupção não escolhe espécie** — humano pode cair, elfo pode cair, dragão pode
cair, **e até um Arcanjo pode cair**. Poder não concede imunidade moral.

### 🔴 A ficha multicamadas (10.58/10.64) — como modelar no código

`10.63` **ORIGEM ≠ HABITAT.** Isso evita colocar a mesma criatura em duas árvores:

```
Nome:        Dragão Corrompido
Origem:      Primordial          ← a família da Árvore da Vida
Espécie:     Dragão              ← não desaparece ao ser corrompido
Estado:      Corrompido          ← condição sobreposta
Habitat:     variável
Afinidade:   Aether elevado
Inteligência / Hostilidade: por criatura
```

**Kraken** = Origem *Primordial* + Habitat *Marinho*. Por isso a antiga categoria
"Criaturas do Mar" (sereias, tritões, serpentes marinhas, polvos abissais) **deixou de
ser família principal** — marinho é **habitat**.

### Entidades Celestiais

**Os Sete Arcanjos** são canônicos. **Mensageiros · Guardiões do Heart · Serafins** ⚠️
**pendentes de validação individual**.

### Dois princípios de design que valem para o bestiário inteiro

🔴 `10.67` **"O monstro precisa ter uma razão para existir."** Nunca *"precisamos de um
monstro nível 20 nesta floresta"*. A equipe tem de saber: por que vive ali · o que come ·
o que caça · **quem o caça** · qual recurso produz · como interage com o ambiente · se tem
relação com o Aether · se é natural ou artificial · se tem cultura · se é corrompido.
*(Nem tudo isso precisa aparecer ao jogador — mas a equipe precisa saber.)*

🔴 `DD-LOR-088` **"Nem tudo que existe no mundo precisa estar disponível ao jogador"** —
impede que toda criatura interessante vire raça, pet, montaria ou companheiro. E
`10.73` **expansões não criam povos do nada**: quando uma raça ou região nova sai, ela
deve parecer algo que **sempre existiu** e só não estava acessível. Por isso dá para
mencionar elfos, anões, orcs e continentes distantes **anos antes** de serem jogáveis.

⚠️ **20 pendências**, entre elas: lista definitiva dos Povos Antigos · **classificação dos
Vampiros** (mortos-vivos *ou* linhagem que surge em qualquer Povo Livre — em conflito;
só é certo que **não são raça jogável**) · **classificação dos Lobisomens** · taxonomia
dos Espíritos · origem dos Golems e Mimics · destino dos Halflings.

---

## Passe 20 — Doc 1, cap. 6 (O Inferno) e 7 (Os primeiros demônios)

### Cap. 6 — O Inferno

`DD-LOR-042` 🔴 **O Inferno não existia na Criação original, Deus não o criou, e ele não
foi feito como lugar de punição.** É **consequência**.

`DD-LOR-043` 🔴 **Corrupção ≠ Inferno.** A Corrupção é o *fenômeno*; o Inferno é o que
surge quando ela transforma uma região profundamente. Uma floresta pode ter Corrupção
**sem ser Inferno**; uma dungeon pode ter Corrupção **sem estar no Inferno**. Isso permite
a ameaça existir pelo mundo todo sem tudo virar território infernal.

`6.4` **Não houve um dia em que o Inferno apareceu** — levou séculos.

🔴 `6.9` **O INFERNO NÃO É APENAS FOGO E LAVA.** Uma região infernal pode ter sido floresta,
pântano, montanha, cidade, planície, caverna, costa ou **um antigo reino** — a aparência
depende **do que existia antes** e de como a Corrupção o deformou. Isso dá variedade
geográfica enorme.

🔴 `6.6/6.36` **"AQUELA TERRA NEM SEMPRE FOI O INFERNO."** Sob a fortaleza demoníaca há
ruínas de outra civilização; estradas antigas ainda atravessam o território; templos
permanecem reconhecíveis; estátuas mostram povos que existiram antes.
**Explorar o Inferno vira arqueologia narrativa.**

`DD-LOR-044` 🔴 **O Inferno não é um segundo mundo nem plano paralelo** — nasce **dentro
da própria Criação**.
`DD-LOR-048` **Morrer não significa "ir para o Inferno"** — o destino das almas é o
Caminho do Retorno (cap. 9), sistema completamente separado.

⚠️ **Pendências grandes:** geografia do Inferno (um território ou vários?) · relação com o
**Abismo da Corrupção** (`DD-LOR-049` — **não** declarar que é "a capital do Inferno") ·
relação com **Umbra** (`DD-LOR-050` — continente devastado proposto, **não** consolidado
como Inferno) · `6.25` **não existe "Rei do Inferno" canônico** · 🔴 **o Inferno continua
se expandindo hoje?** · **territórios podem ser purificados?**

### Cap. 7 — Os primeiros demônios

`DD-LOR-051` 🔴 **Deus não criou os demônios**, e eles **não vieram de outro universo ou
dimensão**. Eram criaturas que já existiam — com outras formas, outros nomes, famílias,
povos governados, estudos do Aether.

**Quatro grupos entre os primeiros** (`DD-LOR-054`): **antigos guardiões · reis · grandes
magos · pessoas comuns.**
🔴 `7.4` **"A CORRUPÇÃO NÃO ESCOLHE POR CLASSE SOCIAL."** Poder, conhecimento e autoridade
não dão imunidade — e origem humilde também não protege.
`7.8` **Nem todos eram figuras extraordinárias** — isso impede tratar o Inferno como
resultado só das decisões de uma elite. *A elite iniciou a ruptura; gerações inteiras
herdaram a consequência.*

🔴 `DD-LOR-053`/`7.15` **A perda de identidade é PROGRESSIVA** — nem todo demônio está no
mesmo estágio:
- **O demônio que lembra** — preserva um nome, um lugar, uma promessa, um símbolo, um
  fragmento da antiga missão. Narrativamente muito mais interessante que um inimigo
  irracional; abre tragédia, descoberta e redenção.
- **O demônio que esqueceu** — eras de Corrupção deixaram só fragmentos distorcidos.

🔴 `7.36` **UM DEMÔNIO PODE TER SIDO UM HERÓI.** O jogador pode descobrir que uma criatura
lendária tem história completamente diferente da que as tradições modernas ensinam.
`7.37` **Nomes perdidos**: os mais antigos são conhecidos só por título — *"O Rei Caído"*,
*"O Guardião Negro"* (exemplos de estrutura, **não** nomes canônicos) — e o nome verdadeiro
pode aparecer em registros antiquíssimos. Ferramenta recorrente de storytelling.

🔴 `DD-LOR-060` **Quatro categorias que NÃO se misturam:**
| | |
|---|---|
| **Demônios** | corrompidos extremos |
| **Mortos-vivos** | almas que não retornaram ao Heart |
| **Aberrações** | experimentos/mutações (beholder, flesh golem, homúnculo) |
| **Povos tribais** | 🔴 **orcs, trolls, ogros, goblins, kobolds, minotauros, centauros, ciclopes, sátiros NÃO são demônios** — têm origens próprias, podem negociar e fazer alianças |

`7.20` **Aparência monstruosa não determina origem demoníaca.** A origem importa.

### Os Sete Senhores

`DD-LOR-055/056` Surgiram **dos corrompidos mais poderosos** — **não existiam antes**.
Conceito aprovado dos **Sete Senhores da Corrupção** (antigos guardiões *ou* grandes
líderes da Rebelião).

⚠️ 🔴 `7.24` **"Senhores do Inferno" e "Senhores da Corrupção" são dois termos no doc, e
NÃO há confirmação de que sejam o mesmo grupo.** Não fundir.
⚠️ `7.25` **Não concluir que cada Arcanjo tem um equivalente demoníaco** — a composição
pode ser diferente.
⚠️ `7.27` 🔴 **NÃO usar automaticamente os sete pecados capitais.** Só o **Orgulho** tem
posição canônica (a queda do primeiro Arcanjo); os outros seis vícios estão indefinidos.
⚠️ `7.29` **Não está decidido se o Arcanjo rebelde é um dos sete, está acima deles, ou tem
destino totalmente diferente.**
⚠️ `7.30` **Não criar hierarquia demoníaca** do tipo `Rei → Arquidemônio → General →
Capitão`. Diabretes, Súcubos, Íncubos e General Infernal aparecem em planejamento de
dungeon, **não** como hierarquia oficial.

🔴 `DD-LOR-058` **Os Senhores não são só bosses esperando em arenas** — a presença deles se
sente por **regiões, facções, cultos e eventos**. Um Senhor pode influenciar uma região
sem aparecer: seu culto existe, seu símbolo está nas ruínas, uma facção tenta libertá-lo e
outra protege o que o mantém preso.
🔴 `7.40` **Matar um Senhor não apaga sua influência** — cultos continuam, artefatos
permanecem, regiões seguem marcadas. *Ideias sobrevivem aos seus criadores.*
`7.39` E **não precisam ser enfrentados no lançamento**: mencionado agora, culto depois,
história revelada mais tarde, região anos depois, confronto só quando fizer sentido.

🔴 `7.44` **O jogador NÃO escolhe "lado dos demônios".** Demônio não é raça jogável nem
facção disponível, e **não existe alinhamento "Céu ou Inferno"** — isso não será criado.

**Guia para o bestiário demoníaco** (7.45) — cada família deve responder: o que era
originalmente · como foi corrompida · **quanto da identidade permanece** · relação com o
Aether e com a Corrupção · onde vive e por quê · é inteligente · tem cultura · **pode ser
redimida** · tem ligação com algum Senhor.

---

## Passe 21 — Doc 1, cap. 11 (As Eras e a Cronologia)

### As dez eras (11.4)

```
I  Antes do Tempo          VI   Era da Corrupção
II Era da Criação          VII  Era das Grandes Quedas
III Era do Florescimento   VIII Era da Reconstrução
IV Era da Prosperidade     IX   Era dos Reinos
V  A PRIMEIRA REBELIÃO     X    ERA ATUAL  ← o jogo começa aqui
```

🔴 `DD-LOR-093` **NÃO EXISTE CALENDÁRIO ABSOLUTO.** Nada de "Ano 4.812 — Primeira
Rebelião". Enquanto o calendário e a duração das eras não forem definidos, usar **eras,
ordem relativa, séculos e milênios** — **inventar datas seria criar conteúdo**.
⚠️ `DD-LOR-090` A antiga **"Era do Silêncio" foi SUBSTITUÍDA** — ela dizia que só o Heart
existia antes da Criação, o que contradiz *Deus existe antes do Heart*.

🆕 **GRANDE FRATURA** (11.22/11.23) — o nome **histórico**, usado pelos povos, para a
ruptura do Heart. Os dois termos coexistem:
**Primeira Rebelião** = o acontecimento político/espiritual · **Grande Fratura** = a
ruptura provocada durante ele.

### 🔴 Regras de criação de conteúdo histórico (as mais reutilizáveis do capítulo)

`11.51` **TODO GRANDE EVENTO DEVE POSSUIR CAUSA E CONSEQUÊNCIA.** *"Não criaremos uma
guerra apenas porque precisamos de uma dungeon."*

| Elemento | Precisa responder |
|---|---|
| **Guerra** | quem lutou · por quê · por qual território/princípio · quem ganhou · quem perdeu · o que mudou · **quais cicatrizes permaneceram** — 🔴 *"se nenhuma consequência existe, provavelmente a guerra não precisa fazer parte da Lore"* |
| **Dungeon** | Era · construção original · evento que a abandonou · estado atual · o que ficou enterrado. Ex.: *Era da Prosperidade → templo → abandonado na Corrupção → hoje ocupado por mortos-vivos* |
| **Artefato** | quem criou · quando · com qual propósito · quem usou · como se perdeu · **por que ainda existe** — *"artefatos não surgirão apenas porque precisamos de equipamento lendário"* |
| **NPC histórico** | Era · povo · local · função · acontecimentos · consequências |

**Modelo de registro histórico** (11.56), 15 campos: nome do evento · era · data aproximada ·
local · povos · personagens · causa · acontecimento · consequências imediatas · consequências
de longo prazo · **vestígios na Era Atual** · quests · dungeons · NPCs · artefatos relacionados.

🔴 `11.34` **Novos reinos foram construídos SOBRE ruínas antigas** — *"uma dungeon pode
literalmente existir abaixo de uma cidade moderna"*. Liga geografia e história de graça.

### Continuidade

- 🔴 `DD-LOR-096` **NÃO EXISTEM TEMPORADAS QUE REINICIAM A HISTÓRIA.** O que acontece
  passa a fazer parte do mundo.
- `11.47` **Expansões não criam regiões do nada** — o continente **já existia**; só ficou
  acessível, descoberto ou politicamente aberto.
- 🔴 `11.49` **Duas cronologias depois do lançamento**: a **História Antiga** (criada pela
  lore) e a **História do Servidor** (emergente). **Dois servidores podem desenvolver
  histórias parcialmente diferentes.**
- `11.50` **Deixar espaços históricos deliberados** — não definir todos os reis, anos,
  guerras e cidades antigas agora, para poder preencher depois sem contradizer.
- `11.48` **Mundo vivo**: regiões prosperam ou decaem, espécies migram, minas desmoronam,
  cavernas novas surgem, bosses morrem e são substituídos.

### Quem sabe o quê

**Habitante comum:** seu reino, sua cidade, guerras recentes, lendas locais, a religião
predominante, algumas histórias de monstros. **Estudioso:** ruínas, civilizações antigas,
textos, linhagens, artefatos — e **dois estudiosos podem discordar profundamente**.
`11.39` *"um livro antigo encontrado numa dungeon pode contradizer o que um sacerdote
ensina na cidade — isso é intencional"*.

🆕 **Memórias do Aether** aparecem entre as fontes de descoberta, ao lado de pergaminhos,
tábuas, murais, vitrais e canções.

⚠️ **23 pendências**, entre elas: nomes definitivos das eras · sistema de calendário e
Ano Zero · ordem de surgimento dos Povos Livres · grandes impérios da Era da Prosperidade ·
guerras posteriores à Rebelião · **data de fundação de Asteria** *(o nome aparece aqui —
Asteria é uma cidade do mundo, mas o cap. 13 ainda não confirma que é a cidade inicial)*.
⚠️ `11.44` Os marcos de quest **Lv.10/50/100/200 são tratados como "proposta antiga"** — a
**estrutura de revelação progressiva** permanece, os números exatos não são canônicos.

---

## Passe 22 — Doc 1, cap. 12 (Os Humanos de Elysia)

`DD-LOR-098/099` Humanos são **um dos quatro Povos Livres** e a **única raça jogável na
v1.0**. 🔴 `12.5` **"O MUNDO NÃO NASCE HUMANO"** — o que nasce humano é a *experiência
inicial do jogador*. Elfos, anões, orcs e os Povos Antigos já têm história própria.

`12.4` A razão de começar só com humanos é **de produção**, não de lore: reduz complexidade,
concentra recursos, simplifica balanceamento — e faz cada raça nova ser **um acontecimento**.

### 🔴 12.9 — RAÇA ≠ FACÇÃO (a distinção mais útil do capítulo)

| Camada | O que é |
|---|---|
| **Humano** | raça |
| **Reino** | estrutura política |
| **Guilda** | organização |
| **Culto** | organização religiosa/ideológica |
| **Exército** | instituição militar |
| **Bandido** | condição/função social |
| **Corrompido** | estado causado pela Corrupção |

**Dois humanos podem estar em lados completamente opostos.**

### 🆕 Família de bestiário "HUMANOS HOSTIS" (12.10)

**Bandido · Bandida Arqueira · Saqueador · Mercenário · Besteiro Mercenário · Mago
Renegado · Curandeira Renegada · Cavaleiro Renegado · Cultista** — mais **MVPs** ligados a
bandidos e mercenários.
⚠️ Isso **não** representa a humanidade; são facções e indivíduos inimigos.

🔴 `12.21` **HOSTIL ≠ CORROMPIDO.** Um bandido, um mercenário inimigo ou um mago renegado
**não precisam estar corrompidos** — agem por interesse, dinheiro, poder, política, crime,
ideologia ou vingança. **Motivos humanos.** Essa separação é essencial para o bestiário
não virar "tudo que é hostil é corrompido".

🆕 `12.11` **Decisão posterior do projeto: aumentar a presença de personagens femininas
entre os humanoides** — daí *Bandida Arqueira*, *Curandeira Renegada* e *Cultista*.
**A filosofia deve valer para o resto da população humana**, não só para esses três.

### Cultura e identidade

🔴 `12.29/12.30` **Não existe "uma cultura humana".** Ela é **regional** — dois humanos de
regiões distantes podem ter arquitetura, roupas, tradições, culinária, dialetos e costumes
completamente diferentes. *"Área humana" não pode significar sempre a mesma arquitetura*:
uma cidade pode ser comercial, outra militar, agrícola, fronteiriça, antiga, parcialmente
destruída **ou construída sobre ruínas**.

🔴 `12.40` **Classe não define personalidade.** Knight não precisa ser honrado · Assassin
não precisa ser maligno · Sorcerer não precisa ser sábio · Archer não precisa viver na
floresta. Classe é **capacidade de gameplay**; personalidade pertence ao personagem.

`DD-LOR-103` Masculino e feminino com **as mesmas possibilidades mecânicas** — a diferença
é identidade, aparência, modelo, voz e animação. `DD-LOR-104` **Sem bônus racial humano**
(nem +STR, nem +INT, nem +LUK).
🔴 `12.44` **Quando elfos, anões e orcs entrarem, humanos não podem ficar obsoletos** — o
que exige **evitar bônus raciais fortes** que tornem uma combinação obrigatória.

### Pendências que tocam a Etapa 9

- 🔴 `12.26` **ASTERIA: não está fechado** se é cidade ou reino, se é a capital, quem
  governa, como funciona a sucessão nem qual território controla. *(Bate com o cap. 13,
  que também deixa a cidade inicial pendente.)*
- **Sistema político humano — PENDENTE.** Não inventar castas, nobreza hereditária, senado,
  monarquia absoluta, feudalismo ou sistema eleitoral.
- **Religiões humanas — PENDENTES.** Existem fé, sacerdotes e interpretações sobre o Heart,
  mas nenhuma religião oficial consolidada.
- **Tradições mágicas humanas — PENDENTES**; e `12.18` **não há afinidade racial humana com
  o Aether definida** (humanos não aprendem magia mais rápido nem mais devagar).
- `12.32` **Sistema de reputação racial** (ganhar reputação com orcs até poder comerciar,
  ter casa, entrar na cidade e aceitar quests) é **proposta a consolidar**, não regra.
- ⚠️ **25 pendências** no total, incluindo as relações históricas Humanos × Elfos, ×
  Anões e × Orcs, as ordens de Knights e as instituições de Sorcerers.

> ✅ **Volume I da Lore Bible concluído** (cap. 1–13). Cap. 8 (*O Silêncio de Deus*) foi
> lido em resumo: consolida que Deus **não intervém para preservar o livre-arbítrio**, que
> **não é NPC, boss nem quest giver**, que **ninguém fala diretamente com Ele**, e que
> **a fé existe, mas a certeza não** — princípios já registrados nos passes 16 e 20.

---

## Passe 23 — Doc 1, cap. 18 (inventário/peso/fome) e 19 (habitação) — **base da Etapa 11**

### Cap. 18 — Inventário, peso e fome

> **"PROFUNDIDADE NA MECÂNICA, SIMPLICIDADE NA INTERFACE."** O desafio não é reorganizar
> grade — é decidir **o que carregar, quanto, por quanto tempo ficar e quando voltar**.

🔴 `DD-INV-001` **UM ITEM = UM SLOT.** Nada de 2×2, 3×3 ou formatos geométricos.
✅ Confirma o "tamanho de item fora de escopo" do roadmap.
🔴 `18.6` **ESPAÇO ≠ PESO** — ter slot livre não significa conseguir carregar.

**Estados de carga** (`DD-INV-005/006`):
| Carga | Efeito |
|---|---|
| 0–70 % | sem penalidade |
| 70–90 % | pequena redução de velocidade e de regeneração |
| 90–99 % | **movimentação lenta**, regeneração bastante reduzida |
| **100 %** | 🔴 **não consegue caminhar** |

`18.11` **Alvo de design: 1–2 horas de exploração** antes de a carga virar fator.
`18.10` 🔴 **"O VALOR DO LOOT TAMBÉM É DETERMINADO PELO PESO"** — a 94 % de carga, largar
material barato para levar algo valioso vira decisão real.

🔴 `DD-INV-008` **A FOME NÃO MATA.** Estados: **Alimentado → Com fome → Faminto →
Inanição**, e a penalidade cai sobre **regeneração e recuperação de recursos**, nunca sobre
a vida. Não pode virar *"coma a cada cinco minutos ou morra"*.

🔴 `DD-INV-011/012` **CORREÇÃO IMPORTANTE — montaria na morte.** A versão antiga em que ela
**fugia sozinha para o estábulo** foi **rejeitada por complexidade**. Vale a posterior:
**a montaria morre junto com o dono**, o corpo fica perto do cadáver por ~10 min e some.
Penalidade de **20–30 % da carga** (referência; distribuição exata não fechada).

> ⚠️ **CONFLITO com o Doc 2:** o cap. 18 dá recipientes por **slots** (Bolsa 12 · Couro 24 ·
> Explorador 36 · Expedição 48). O Doc 2 (posterior) dá **peso + compartimentos**
> (Pequena 200/20 · Média 500/40 · Grande 1000/60 · Viajante 1500/80). **Vale o Doc 2.**

### Cap. 19 — Habitação

- `DD-HOUSE-001` **Casas existem fisicamente no mundo** e continuam visíveis **mesmo com o
  dono offline**.
- 🔴 `DD-HOUSE-002` **Quantidade LIMITADA** — não existe casa instanciada infinita.
  Por isso **localização tem valor**: perto de cidade, mina, rota comercial ou dungeon.
  Distribuídas em **regiões residenciais naturais** (ex.: Floresta Norte 15 · Montanhas 12 ·
  Costa 20 · Pântano 8 — números ilustrativos), nunca espalhadas de forma que estraguem
  paisagem e rotas.
- 🔴 `DD-HOUSE-003/004` **Um único Locatário Principal** + **moradores autorizados** com
  permissões individuais (entrar · usar armazenamento · usar oficinas · contribuir com
  upgrades · gerenciar decoração). O aluguel é cobrado **integralmente do titular** — o
  servidor **não** divide 30/30/40 entre moradores.
- 🔴 `DD-HOUSE-007/010` **Transferência voluntária MANTÉM os upgrades · despejo/abandono
  RESETA a propriedade.** O novo locatário recebe a casa **básica**.
- 🔴 `DD-HOUSE-008` **Todo investimento estrutural passa a pertencer à CASA — sem
  reembolso.** Quem investiu materiais na Forja e depois é removido **não recebe nada de
  volta**. O sistema tem de **avisar explicitamente antes da contribuição**:
  > *"Materiais e gold investidos nesta propriedade são permanentes e pertencem à
  > residência. Caso você perca acesso à casa, esses recursos não serão devolvidos."*

**Instalações** (`DD-HOUSE-012`): **Forja · Laboratório de Alquimia · Cozinha · Área de
Treinamento** — e o **tamanho da casa limita quantas cabem** (casa pequena: laboratório;
média: laboratório + cozinha; grande: forja + laboratório + cozinha + outras).
🔴 `DD-HOUSE-013` **Treinamento offline ≈ 5 % da eficiência ativa**, **uma proficiência por
vez**, e **para se a casa for perdida**.
🔴 `19.24` **Oficinas públicas básicas existem** — **casa não é obrigatória** para começar
uma profissão; ela dá progressão avançada.

**Inadimplência em três ciclos** (`DD-HOUSE-009`): **1ª falha → aviso · 2ª → aviso final ·
3ª → despejo automático.**
🔴 `19.33` **A cobrança usa CICLOS GLOBAIS do servidor**, não um cronômetro individual por
casa — e o **relógio visual do mundo (dia/noite acelerado) é separado do calendário
administrativo**. Simplifica muito a implementação.

🆕 `DD-HOUSE-011` **DEPÓSITO DE DESPEJO** — os itens pessoais **não são destruídos**; vão
para um depósito vinculado ao personagem que **só permite RETIRAR** (nunca depositar), para
não virar armazenamento grátis. O que se perde é o que é **estrutural**: forja,
laboratório, cozinha, área de treinamento e melhorias.
`19.39` Quem perdeu a casa e loga depois **não reaparece dentro dela** — volta para a
cidade principal.

> ⚠️ **CONFLITO com o Doc 2:** aqui é **Depósito de Despejo** (só retira). No Doc 2 é
> **"Armazenamento Lacrado"** (nada entra nem sai até pagar de novo ou comprar outra casa).
> **O Doc 2 é posterior — vale o Armazenamento Lacrado.** ⚠️ Ajustar a Etapa 11, que hoje
> fala em "despejo".

**Fortificação e invasão:**
- Melhorias: muralhas · portões · torres · armadilhas · guardas.
- 🔴 `DD-HOUSE-015` Os defensores **não são Guardas Reais — são MERCENÁRIOS** contratados
  (Espadachim · Arqueiro · Escudeiro · Veterano). *Referência V1:* até **3 por casa** e
  fortificação em **níveis 1–5** — não confirmados.
- `19.44` A invasão exige **interação física**: **quebrar baús individualmente**, decidir
  entre procurar itens, ir ao objetivo principal ou fugir antes dos defensores chegarem.
  **Nada de "clicou na casa → roubou o inventário inteiro".**
- 🆕 **Bandeira da Propriedade** como objetivo de invasão (entrar, achar, roubar, escapar) —
  ⚠️ `DD-HOUSE-017` **o efeito do roubo ainda é PENDENTE**.
- 🔴 `DD-HOUSE-018` **A defesa NÃO pode depender de o proprietário estar online.**
  Notificação (in-game, e-mail, SMS) é conveniência, **nunca requisito**.

`19.26` **CASA ≠ BANCO**: o banco guarda o que é realmente importante; a casa é o grande
armazenamento cotidiano. Assim perder a propriedade dói **sem destruir tudo**.
`19.50/19.51` A casa é um dos maiores **gold sinks E material sinks** do jogo — e quando
uma propriedade abandonada é resetada, **aquele investimento sai permanentemente da
economia**.

⚠️ **25 pendências**, incluindo: quantas casas por servidor e por conta · tamanhos oficiais ·
fórmula do aluguel · duração do ciclo · matriz de permissões · capacidade de armazenamento ·
requisitos de respawn na casa · janela e duração da invasão · limite de saque · regras de
PvP/criminalidade durante invasões.

---

## Passe 24 — Doc 1, cap. 64 (AUDITORIA DO BESTIÁRIO) — a espinha da Etapa 16

🔴 `DD-AUD-002` **A criação automática de monstros foi ENCERRADA** após a família 27
(Kobolds). O bestiário já era grande o bastante para exigir revisão estrutural **antes**
de qualquer número.

### As 27 famílias (`DD-AUD-001`)

| | | | |
|---|---|---|---|
| 1 Orcs | 8 Mortos-Vivos | 15 Dragões e Drakes | 22 Mar e Costa |
| 2 Goblins | 9 Corrompidos e Demônios | 16 Gigantes e Povos Selvagens | 23 Celestiais |
| 3 Slimes | 10 Elementais e Construtos | 17 Floresta Encantada | 24 Arcanos e Bruxaria |
| 4 Aranhas | 11 Pântano e Aquáticos | 18 Elfos Hostis/Renegados | 25 Insetoides |
| 5 Formigas | 12 Deserto e Ruínas | 19 Vampiros e Criaturas Noturnas | 26 Homens-Fera |
| 6 Animais Selvagens | 13 Mímicos / Criaturas de Dungeon | 20 Anões Renegados | 27 Kobolds |
| 7 Minas e Cavernas | 14 Gelo e Montanhas | 21 Humanos Hostis | |

⚠️ `DD-AUD-027` **O total exato de criaturas NÃO foi contado** ("provavelmente acima de
100 com MVPs") — a contagem definitiva depende de uma lista-mestra sem duplicações.

### 🔴 As três regras anti-inflação

1. `DD-AUD-003` **HABITAT NÃO CRIA ESPÉCIE.** Um morcego que vive em várias cavernas é
   **um morcego** — nada de *Morcego da Caverna A · da Mina · das Ruínas*.
2. `DD-AUD-006` **VARIANTE NÃO CRIA ENTRADA.** *Orc Guerreiro* Comum + Incomum + Raro
   continua sendo **1 Orc Guerreiro**. A variante muda atributos e recompensa, **não a
   espécie**.
3. `64.12` **"MAIS CRIATURAS NÃO SIGNIFICA UM BESTIÁRIO MELHOR."** Depois das 27 famílias,
   só entra bicho novo se houver **lacuna real** de gameplay, habitat, narrativa ou função
   de combate.

**Duplicações já corrigidas:** `DD-AUD-004` existe **um único Elemental de Gelo** (estava
em *Elementais* e em *Gelo e Montanhas*) · `DD-AUD-005` o **Caranguejo Gigante** fica no
**ambiente costeiro**.

### 🔴 Tiers I–VI (`DD-AUD-008`…`013`) — régua, não barreira

| Tier | Faixa | Criaturas registradas |
|---|---|---|
| **I** | 1–20 | Slime Verde · Slime Azul · Rato do Campo · Morcego · Aranha Pequena · Ovo de Formiga · Larva · Formiga Operária · Goblin Saqueador · Besouro de Carapaça · Cogumelo Vivo · Bandido |
| **II** | 20–50 | Slime Vermelho · Aranha da Floresta · Aranha de Teia · Lobo Cinzento · Javali · Formiga Soldado · Formiga Cuspidora · Goblin Guerreiro · Goblin Arqueiro · Orc Jovem · Orc Guerreiro · Serpente · Escorpião · Abelha Gigante · Homem-Rato · Kobold · Bandida Arqueira · Esqueleto |
| **III** | 50–100 | Orc Arqueiro/Xamã/Berserker · Goblin Xamã · Urso Pardo · Lobo Negro · Aranha Gigante · Formiga Mística · Zumbi · Esqueleto Guerreiro/Arqueiro · Minotauro · Troll · Ogro · Kobold Guerreiro/Arqueiro · Anão Renegado · Elfo Renegado/Arqueiro · Mercenário · Múmia |
| **IV** | 100–150 | Cavaleiro Morto · Fantasma · Necromante · Demônio Menor · Súcubo · Guerreiro Corrompido · Homem-Lagarto + Xamã · Minotauro Guerreiro/Xamã · Ciclope · Golem de Pedra · Elemental de Terra/Fogo · Vampiro · Lobisomem · Gárgula · Guardião da Tumba · Anão Guerreiro |
| **V** | 150–200 | Demônio das Chamas/Sombrio · Guardião Demoníaco · Vampiro Nobre · Cavaleiro Vampiro · Gigante + Gigante Guerreiro · Golem de Ferro/Arcano · Elemental Elétrico/de Gelo · Gigante do Gelo · Feiticeiro do Gelo · Naga Feiticeira/Sacerdotisa · Guardião Celestial · Anjo Guerreiro · Anja da Luz |
| **VI** | **200+** | Dragão Verde/Vermelho/de Gelo/Negro · Anjo Guardião · Anjo Caído · Anja Caída |

🔴 `DD-AUD-014/015` **Tier é referência de balanceamento (HP, dano, defesa, XP), NÃO
bloqueio.** Um jogador pode enfrentar Tier IV antes do nível 100 — só está **entrando em
território perigoso**.
🔴 `DD-AUD-018` **FAMÍLIA NÃO É FAIXA DE NÍVEL:** um **Drake pode ser nível 100** e um
**Dragão adulto 200+**. Isso estica a vida útil de cada família.
🔴 `64.27` **Um monstro COMUM de Tier V já deve conseguir matar um jogador despreparado** —
para o nível alto **não transformar todo o mundo anterior em conteúdo irrelevante**.
`DD-AUD-019/020` **Tier VI não é o fim** — o servidor pode receber conteúdo 300+, 400+, 500+.

### 🔴 MVP tem escala PRÓPRIA (`DD-AUD-016/017`)

```
MVP Inicial → MVP Intermediário → MVP Avançado → MVP Endgame → MÍTICO
```
`64.37` **Não existe um "Tier MVP" único**: **Super Slime** funciona como MVP inicial
enquanto o **Dragão Ancião** ocupa conteúdo 200+.
⚠️ Só *Super Slime* (inicial) e *Dragão Ancião* (endgame, a formalizar) estão exemplificados
— as faixas Intermediário/Avançado **não têm nomes atribuídos; não inventar**.
✅ O **Super Slime** já implementado no código bate com "MVP inicial".

### 🔴 Identidade acima da simetria (`DD-AUD-021/022`)

**Criaturas do mesmo nível NÃO precisam ter atributos equivalentes.** O Tier dá a faixa;
a **função de combate** (tank, melee, ranged, mágico, suporte, assassino, controle,
invocador) molda a curva:
- um **Urso** tem muito mais HP e dano que um **Arqueiro** do mesmo nível — o arqueiro
  compensa com **distância**;
- um **Xamã** pode ter pouco HP e **muito dano mágico**.

🔴 `DD-AUD-023` **O bestiário NÃO pode ser balanceado apenas contra o Warrior** — tem de
considerar Warrior, Sorcerer, Archer e Assassin, com alcance, mobilidade, resistência e
recursos diferentes.

### 🔴 A ordem oficial de desenvolvimento (64.51) — importante para a Etapa 16

```
BESTIÁRIO FECHADO → FAIXAS DE NÍVEL → HP/DANO/DEFESA/XP → LOOT → SPRITES/ANIMAÇÕES
```

`DD-AUD-024` **Nada de "Orc tem X HP" antes de existir a régua global** — isso obrigaria a
rebalancear o bestiário inteiro depois.
`DD-AUD-025/026` A régua começa pelo **Tier I** e por um **personagem nível 1**,
respondendo: *quanto tempo o nível 1 leva para matar um Slime Verde?* e *quanto dano ele
recebe nesse combate?* — ✅ é exatamente a régua do cap. 65 (Slime Verde 50 HP, dano 4–7,
combate de 3–8 s).

**Ficha futura de monstro** (64.54): nível recomendado · HP · dano físico · dano mágico ·
defesa física · defesa mágica · velocidade · XP · elemento · fraqueza · resistência.

**Fluxo final:** `CRIATURA → FUNÇÃO → TIER → REFERÊNCIA DE PERSONAGEM → HP/DANO/DEFESA/
RESISTÊNCIA → VELOCIDADE → XP → VARIANTES → LOOT`

⚠️ `DD-AUD-... 64.67/64.68` **A lista de Tiers está INCOMPLETA** — várias criaturas já
aprovadas não aparecem nela. 🔴 **Ausência na lista ≠ remoção do bestiário**, e o Tier de
uma criatura ausente **não deve ser inventado só para completar a tabela**.

> 📌 **Os cap. 49–63 são o catálogo por família** (fichas individuais de cada criatura:
> Rato do Campo, Slime, Lobo Cinzento, Javali, Aranha da Floresta, Goblin Saqueador,
> Goblin Arqueiro e por aí adiante, família a família). São **conteúdo da Etapa 16**, a ser
> consultado família por família **na hora de implementar cada região** — não é material
> que mude decisão de arquitetura agora. A **estrutura** que rege todos eles está aqui,
> no cap. 64, e nos quatro pilares (cap. 45–48).

---

## ✅ LEITURA CONCLUÍDA

**Doc 2:** integral. **Doc 1:** todos os capítulos estruturais e de sistema —
1–13, 18–19, 25–28, 31–32, 35–38, 40, 44–46, 48, 64, 65–78.
**Não destilado em detalhe:** cap. 14–17, 20–24, 29–30, 33–34, 39, 41–43, 47 (versões V1
superadas pelos capítulos posteriores ou pelo Doc 2) e cap. 49–63 (catálogo de criaturas,
consultável sob demanda na Etapa 16).
- [ ] P18 — Doc 1 cap. 49–64 (bestiário completo por família + auditoria)
- [ ] P16 — Doc 1 cap. 13–24 (criação de personagem, inventário/peso/fome, habitação, guildas, tasks, biomas V1, bestiário V1)
- [ ] P17 — Doc 1 cap. 1–12 (Volume I: lore, cosmologia, eras, humanos) (party, dungeons/MVPs, respawn, aggro, **IA de monstro**, mapa/**névoa de guerra**, transporte, clima, quests, biomas)
- [ ] P10 — Doc 1 cap. 49–64 (bestiário completo por família + auditoria)
- [ ] P11 — Doc 1 cap. 13–24 (criação de personagem, inventário/peso/fome, habitação, guildas, tasks, biomas, bestiário V1)
- [ ] P12 — Doc 1 cap. 1–12 (Volume I: lore, cosmologia, eras, humanos)
- [ ] P3 — cap. 22–34 (biomas, bestiário, equipamentos, raridade, passivos, cartas, refino, armaduras, escudo, elementos, HP/mana)
- [ ] P4 — cap. 35–48 (party, dungeons, respawn, aggro, IA, mapa, transporte, clima, guildas, quests, biomas, famílias)
- [ ] P5 — cap. 49–64 (bestiário completo por família + auditoria)
- [ ] P6 — cap. 65–71 (régua-base de combate, matemática dos atributos, as 5 árvores)
- [ ] P7 — cap. 1–12 (Volume I: lore, cosmologia, eras, humanos, criação de personagem)
- [ ] P8 — cap. 77–78 completos
