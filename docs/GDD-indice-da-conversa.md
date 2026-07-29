# Índice da conversa-fonte — Elysia Online

Mapa de navegação de [`informacoes/conversa-gpt-elysia-historia-mmorpg.md`](../informacoes/conversa-gpt-elysia-historia-mmorpg.md)
(1.041 mensagens · 1,6 milhão de caracteres · 541 do usuário, 500 do ChatGPT).

**Como usar:** os números `#N` são o marcador da mensagem no arquivo. Para ler um
trecho, procure por `## [N]` no arquivo. As decisões abaixo são do **usuário** —
onde o ChatGPT propôs e o usuário aprovou, vale o que foi aprovado.

> ⚠️ Este índice é um mapa, não um resumo completo. Quando for implementar um
> bloco, **leia as mensagens indicadas** — há detalhe fino demais para caber aqui.

## Decisões posteriores à conversa

A conversa é a fonte de verdade, mas o dono do projeto pode revisá-la depois.
Onde isso acontecer, vale o que está aqui:

| Data | Assunto | Decisão | Substitui |
|---|---|---|---|
| 2026-07-27 | Penalidade de morte | Teto de **um nível** (20 % até nv.20, 40 % até 100, subindo devagar até 100 %). Perder 2–3 níveis afasta o jogador. | `#154` |
| 2026-07-27 | Velocidade dos monstros | Todos ~2–3× mais lentos, e o movimento entre tiles virou **duas coisas**: o bicho desliza em 60 % do intervalo e fica parado o resto. Antes ele deslizava sem parar e "patinava". | — (não estava na conversa) |

---

## 1. Conceito e pilares — `#1–#35`

- Mistura de **Diablo I/II + Ragnarok Online + Tibia** `#1`
- Mundo aberto, **sem tela de loading** `#1`, `#159`
- Base/casa do jogador **raidável a qualquer momento** `#4`
- Pontos de atributo (Ragnarok/Diablo) + **treino de arma por uso** `#6`
- Magias desbloqueadas conforme os níveis `#16`
- Jogador pode ser **mercador** de itens/cartas raras `#22`
- **Loot no chão some** se ninguém pegar `#33`
- Servidor com no máximo **500 jogadores** `#165`, `#315`

## 2. Lore e mundo — `#20–#35`, `#191–#216`

- Deus criador; **livre-arbítrio** levou a criatura a querer ser Deus `#193`
- O **Heart** corrompido; almas que não renascem `#193`, `#195`
- Objetivo de Deus: a criação encontrar o caminho certo por si `#197`
- Raças/civilizações: manter variedade (orcs, minotauros…) `#199`, `#201`
- **Poucas raças jogáveis** para não confundir o iniciante `#205`, `#207`
- Excluídos como jogáveis: gnomos, trolls, centauros, ciclopes, gigantes,
  vampiros, draconianos → viram **povos selvagens** `#209`
- **Povos primordiais** só em dungeons/chefes `#211`, `#213`

## 3. Mapa, biomas e cidades — `#107–#125`, `#157–#164`, `#509–#526`

- Biomas variados + dungeons de vampiros, lobisomens, fantasmas, deserto `#109`
- **Cidade principal: máx. 60 NPCs** (incluindo guardas) — 250 foi rejeitado `#124`
- Cidade inteira **patrulhada por guardas**, sem portal `#158`
- **Vilarejo inicial** separado `#161`; só sai dele por volta do **nível 10** `#371`
- Névoa de guerra **por conta** (novo personagem herda o mapa explorado) `#509`
- Cidades já vêm desbloqueadas; o **entorno** é desconhecido `#511`
- Mapas **negociáveis** entre jogadores `#513`
- Transporte: **a pé, montaria, barco e balão** `#519`
- Clima é **só estético**, não muda gameplay `#525`

## 4. Classes, atributos e progressão — `#693–#740`

> **Bloco mais importante para o código atual.**

- **7 atributos**: STR, VIT, AGI, DEX, INT, WIS, **LUK** (Sorte → crítico) `#700`
- **45 pontos-base** no nível 1, iguais para todas as classes `#700`
- **10 pontos por nível**, com **custo crescente** por faixa do atributo
  (1–20 custa 2/ponto … 201+ custa 20/ponto) `#716`
- **Sem level cap**, sem limite rígido de atributo `#716`
- HP/mana iniciais: Warrior 200/60 · Assassin 150/70 · Archer 120/80 ·
  Sorcerer 100/180 `#701`
- **Skill/Magic Level separado dos atributos**; cada habilidade vai do Lv.1 ao
  Lv.10; níveis sobem dano/efeito, **não** cooldown `#720`
- Teto de especialização: Warrior até 5 skills no Lv.10, Assassin 6, Archer 6,
  Sorcerer 10 — mas pode **conhecer** 15–20 `#720`
- **Subclasse a partir do nível 20 de magia** `#379`, `#381`
- Reset de pontos: 1º barato, 2º médio, 3º+ caro `#903`
- Curva de nível: rápida 1–10, moderada 20–50, lenta 50–100+ `#369`
- Classes existentes: Warrior, Assassin, Archer, Sorcerer, **Priest/Sacerdote**
  `#703`, **Druid** `#765`

## 5. Habilidades por classe — `#741–#930`

### Warrior `#741–#764`
- **Golpe Poderoso**: alvo único, cooldown **1,5 s**, mana baixa `#744`
- **Bash**: impacto no chão, dano em **área ao redor**, cooldown **3,5 s**,
  mana média — substituiu o "Golpe Giratório" `#741`, `#742`, `#744`
- Bash varia por arma: espada equilibrado, machado mais dano, maça mais
  controle `#742`
- **Fúria de Batalha**: drena vida, máx. **0,5 %/s** `#747`, `#749`
- **Provocar/taunt** com cooldown curto `#763`

### Assassin `#787–#808`
- **Ataque duplo** estilo Ragnarok, começa em 30 % `#787`, `#789`
- Maestrias: ataque duplo, adaga dupla, e alcance `#791`
- **Backstep** (mobilidade) `#793`
- **Ataque pelas costas**: passivo, mais crítico e dano `#795`, `#797`
- **Sonic Blow** `#801`; dual dagger com 2º golpe a 50 % `#805`

### Archer `#809–#840`
- Disparo perfurante **quebra defesa** (não atravessa fila) `#813`
- **Chuva de flechas**: alvo único + dano em raio pequeno `#815`
- Disparo duplo com leve chance de **empurrar** `#817`
- **Armadilhas**: explosiva com chance de **queimar** (sem slow) `#833`, `#835`
- Também usa **lança de arremesso** + escudo `#947`, `#951`

### Sorcerer `#851–#906`
- Escolas: **fogo, gelo, raio, arcana, sombrio, sagrado** `#851`
- **Nevasca**: congela ~10 s, dano só no primeiro tick, quebra ao ser atingido;
  duração 5 s (Lv.1) → 8–10 s (Lv.10) `#879`, `#881`, `#883`, `#885`
- **Descarga elétrica** (raio) e bola de raio `#853`
- **Círculo arcano**: imunidade curta, 2–4 s `#855`
- Magias com **pré-requisitos** em árvore (ex.: meteoro) `#875`
- Regen de mana: **40 % em combate**, muito maior fora (20–30 s) `#863`, `#865`

### Priest / Druid `#909–#930`
- Cura **não** funciona em mortos-vivos `#911`
- **Chama de revelação** cresce até o Lv.10 `#859`
- Buffs, resistências, **petrificação** `#925`
- Sacerdote **bate corpo a corpo**, não é arqueiro de magia `#703`

## 6. Combate, condições e itens — `#257–#268`, `#443–#458`, `#941–#968`

- Combate: **marca o alvo e ataca automático** (Tibia/Ragnarok);
  magias de área são **miradas** `#257`
- Armas com **atributos randomizados** `#261`, `#263`
- Condições: **congelamento** (40–60 %) e **petrificação** (~30 %) travam o
  personagem; congelado também fica lento `#449`, `#451`, `#455`
- Uma mão vs. duas mãos: 2H dá mais atributo, 1H permite escudo `#943`, `#945`
- **Cajado serve para Priest e Druid** `#941`
- Bloqueio vem de equipamento/carta, não de atributo `#711`
- Proficiência de arma **sem limite** `#965`

## 7. Cartas (estilo Ragnarok) — `#293–#310`

- Todo monstro dropa algum tipo de carta `#293`
- Carta colocada **não sai mais** do item `#297`
- Limite: **8 cartas no personagem**; arma até **3 slots** `#299`, `#305`
- Anéis **não** têm slot (removido) `#303`
- Builds separadas PvE / PvP `#307`
- Cartas de resistência: anticongelamento, antipetrificação `#445`

## 8. Loot, morte e punição — `#138–#156`, `#279–#292`, `#1001–#1004`

- **Sem ressurreição** — igual Tibia `#471`
- Perde a **bolsa** sempre; equipamentos têm chance `#138`, `#1001`
- **Corpo fica no chão** e o jogador pode recuperar o que perdeu `#1003`
- Perda de XP: **50 % a menos do nível 1 ao 20** `#151`; começa em 35 % `#147`
- Punição pesada só em **PK**; morte para monstro/boss é 60–80 % disso `#153`
- Redistribuir pontos ao perder nível `#140`
- Item mítico/lendário com chance de perda **menor** `#323`

## 9. PvP, guildas e guerra — `#126–#137`, `#527–#548`

- **PvP aberto fora das cidades** `#126`
- Sistema de caveira: matar nível muito menor = punição maior `#128`, `#130`
- Quem toma caveira ganha **algum bônus** (não incentivar, mas movimentar) `#132`
- Guardas atacam quem agride dentro da cidade `#134`; guardas também no
  **entorno** da cidade `#136`
- **Guildas pequenas** (50 já dominariam 500 players) `#527`
- **Guerra de Império aos sábados**, de 15 em 15 dias; inscrição 8h–10h `#533`,
  `#535`, `#537`
- **Castelos não são construídos** — existem e são tomados `#987`
- Castelo tem **soldados NPC**, que passam à guilda dominante `#989`, `#991`
- Guardião dá XP à equipe; mín. 5 players `#539`
- Magia global de guilda `#531`

## 10. Casa, montaria e sobrevivência — `#217–#251`, `#387–#402`

- Mecânicas de **fome e peso**; mais forte carrega mais `#217`
- **Montaria** com inventário próprio `#221`, `#241`
- Montaria **some em dungeon** `#237`; **desmonta ao tomar dano** `#243`
- **Não pode montar dentro de cidades** `#247`
- Montado dá para usar poções e buffs `#249`
- Penalidade de 20–30 % do coletado ao morrer montado `#231`, `#233`
- **Pets removidos** do escopo `#235`
- Casa é **alugada**, já existe no mundo `#389`, `#1005`
- Cozinha + forja + laboratório de alquimia na casa `#363`
- Aluguel em **ciclos de 7 dias**; avisos e despejo no 3º mês `#395`, `#399`
- **Treino offline** só com área de treino comprada `#387`

## 11. Profissões e crafting — `#317–#366`, `#941–#968`

- Ferreiro: forja, minério e lenha evoluem juntos `#327`
- **Refino até +12/+13**, caro a partir da 10ª tentativa; item **não quebra** `#339`
- **Reroll de atributos** na oficina, só para míticos/lendários `#335`, `#341`
- Fábrica chega no máximo a épico/lendário `#343`
- Alquimia é **preparo**, não coleta `#351`; poção craftada cura mais que a
  comprada `#353`
- Pesca com **raridade de peixe** → culinária `#357`
- Joalheiro: anéis, colares e amuletos — **sem gemas** `#957`
- **Encantador**: pergaminhos de magia `#959`

## 12. Monstros, dungeons e bosses — `#269–#292`, `#485–#508`, `#549–#692`

- IA por tipo: agressivo, neutro (revida), simples (foge) `#269`, `#271`, `#273`
- Aranhas e goblins são **sempre agressivos** `#971`
- Variantes: comum → incomum → raro (slime verde/azul/vermelho + **Super Slime
  MVP**) `#551`, `#553`, `#617`, `#582`
- Bestiário grande, organizado por **famílias** `#549`, `#601`–`#680`
- Bestiário revela dados ao matar (50 % no 1º kill de MVP) `#563`
- **Dungeons não são instanciadas** — abertas, estilo Tibia `#485`
- Spawn por andar (ex.: andar 1 = 60 monstros, andar 2 = 80) `#497`
- **Luring impossível dentro de dungeon** `#501`
- Boss global/MVP pode ser solado com recurso suficiente `#487`, `#491`
- **Dragão fica mais forte** se matar o time inteiro `#275`, `#277`
- Formigueiro com ovos/larvas e MVP no fim `#573`, `#575`, `#577`
- **Torre de 100+ andares** — adiada para pós-lançamento `#981`, `#985`

## 13. Quests — `#162`, `#541–#548`

- Quests **não obrigatórias**, com recompensa/equipamento/XP `#162`
- Quest principal conta a lore do mundo `#541`
- Primeiro arco fecha ~nível 200; história segue em arcos `#543`, `#545`

## 14. Arte e sprites — `#36–#106`, `#579–#692`

- Fluxo escolhido: **PixelLab + ChatGPT** `#57`
- Visual "estilo Tibia, porém mais bonito" `#59`
- Guerreiro masculino e feminino `#87`, `#90`
- Variante de cor por raridade (slime comum/incomum/raro) `#582`
- Sprites das famílias de monstros gerados um a um `#585`–`#692`
