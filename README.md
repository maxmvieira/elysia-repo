# Elysia Online

<sub>(nasceu como "Project Dominion 2D"; o nome antigo ainda aparece em alguns
lugares do código e da documentação.)</sub>

> 📍 **Estado do projeto e próximos passos:** [`docs/ROADMAP-elysia.md`](./docs/ROADMAP-elysia.md)
> · o que já foi feito: [`docs/HISTORICO.md`](./docs/HISTORICO.md)

MMORPG 2D top-down que roda no **navegador**, com construção de bases e raids.
Inspirado na *sensação* de MMORPGs 2D clássicos (câmera, movimento em grid,
múltiplos andares), com arte e conteúdo **próprios** — sem copiar assets de
terceiros. Fonte de verdade do design: [`docs/`](./docs).

## Stack

- **Cliente:** TypeScript + [PixiJS](https://pixijs.com) (WebGL) + UI em HTML/CSS
- **Servidor autoritativo:** Node.js + WebSocket (`ws`)
- **Compartilhado:** pacote `shared` com protocolo e constantes (mesmos tipos nos dois lados)
- **Persistência:** SQLite via `node:sqlite` (embutido no Node 22+, zero dependência).
  Contas, personagens e itens sobrevivem ao restart. O banco fica em `data/elysia.db`
  e **não** é versionado — cada instalação cria o seu no primeiro boot.
  A troca por PostgreSQL, se um dia for preciso, é uma segunda implementação da
  classe `Store` (`server/src/store/`) sem mexer no resto do servidor.

Monorepo com npm workspaces: `shared/`, `server/`, `client/`.

## Pré-requisitos

- Node.js 20+ (testado com 24) e npm 10+

## Como rodar (desenvolvimento)

```bash
npm install
npm run dev
```

Isso sobe **servidor** (ws://localhost:8080) e **cliente** (http://localhost:5173)
em paralelo. Abra o endereço do cliente no navegador.

### Jogar com outra pessoa na mesma rede (LAN)

O cliente e o servidor já escutam na rede local. A outra pessoa acessa
`http://SEU_IP_LOCAL:5173` (ex.: `http://192.168.0.10:5173`) no navegador.
Descubra seu IP com `ipconfig` (Windows). Para jogar pela internet fora da LAN,
usaremos hospedagem/túnel numa fase futura.

## Comandos úteis

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe servidor + cliente juntos |
| `npm run dev:test` | Idem, com os **comandos de teste** ligados (ver abaixo) |
| `npm run dev:server` | Só o servidor |
| `npm run dev:client` | Só o cliente |
| `npm run typecheck` | Checagem de tipos de todos os pacotes |

## Controles (protótipo atual)

- **Setas / WASD:** mover
- **Clicar num inimigo:** iniciar auto-ataque · **Esc:** soltar o alvo
- **C:** abrir/fechar o painel de personagem (distribuir pontos de atributo)
- **K:** abrir/fechar o painel de habilidades (gastar Skill Points)
- **B:** abrir/fechar o bestiário
- **Enter:** focar o chat / enviar mensagem
- **F1 / F2:** habilidades da barra de atalhos (clicar no quadrado faz o mesmo)

## Atributos (GDD §4)

São **sete**: STR, VIT, AGI, DEX, INT, WIS e **LUK**. Toda classe começa com os
mesmos **45 pontos-base** — o que muda é a distribuição, não a soma.

Cada nível dá **10 pontos**, mas subir um atributo tem **custo crescente**: de
1–20 custa 2 por ponto, de 151–175 custa 12, e acima de 200 custa 20. Não há
teto — chegar a 250 de STR é possível, só custa uma fortuna. A pergunta "gasto
12 pontos em +1 STR ou espalho em VIT/WIS/AGI?" é o coração da build.

Vida e mana no nível 1: Warrior 200/60 · Assassin 150/70 · Archer 120/80 ·
Sorcerer 100/180.

## Armas e equipamento (GDD §6)

Duas coisas separadas formam um equipamento:

**Identidade (fixa)** — o que faz uma espada ser espada. São 8 tipos, e dano e
velocidade se compensam: a adaga bate fraco e rapidíssimo, o machado o oposto.
Nenhum tipo é estritamente melhor.

| Arma | Mãos | Alcance | Perfil |
|---|---|---|---|
| Espada | 1 | 1 | Equilibrada |
| Machado | 1 | 1 | Lento, dano bruto maior |
| Maça | 1 | 1 | Alto impacto |
| Adaga | 1 | 1 | Fraca por golpe, rapidíssima |
| Lança | 2 | 2 | Perfuração e alcance |
| Arco | 2 | 5 | Rápido, longo alcance |
| Besta | 2 | 5 | Lenta, dano alto |
| Cajado | 1 | 4 | Poder mágico |

Arma de **duas mãos** não convive com escudo: em troca, entrega bem mais poder.

**Passivos (aleatórios)** — rolados quando o item nasce, para que nem toda
espada pareça igual. A raridade define quantos:

| Raridade | Passivos | Slots de carta |
|---|---|---|
| Comum | 0 | 1–2 |
| Incomum | 1 | 1–3 |
| Raro | 2 | 2–3 |
| Épico | 3 | 2–4 |
| Lendário | 4 | 3–4 |
| Mítico | 5 | 4 |
| Relíquia | 6 | 4 |

Os slots variam **dentro** da faixa de propósito: dois Épicos podem ser bem
diferentes, e um Épico bem rolado pode valer mais que um Lendário mediano.

**Proficiência** sobe com o uso e **não tem teto** — o que muda é a velocidade.
Os primeiros níveis voam; do 200 ao 300 é extremamente lento. Cada tipo de arma
tem a sua, e ela soma dano com retorno decrescente.

## Habilidades (barra de atalhos)

Barra flutuante no rodapé, estilo Ragnarok: cada quadrado é uma habilidade com
sua tecla (F1, F2, …). Arraste pelo "pegador" da esquerda para reposicionar — a
posição fica salva no navegador.

Habilidades são uma progressão **separada dos atributos**. Cada nível de
personagem rende **Skill Points** (Warrior ~1,5/nível · Assassin e Archer ~1,7 ·
Sorcerer ~2,5), mais um bônus nos níveis de marco (10, 25, 50, 75, 100 e a cada
50 depois disso).

Toda habilidade vai do **Lv.1 ao Lv.10**. Maximizar custa **28 pontos**, então o
personagem pode *conhecer* muitas mas não *maximizar* todas — é a especialização
que define a build. Subir o nível aumenta dano, mana e área, **nunca** reduz a
recarga.

### Árvore do Guerreiro

| Tecla | Habilidade | Requer | Mana | Recarga | Efeito |
|---|---|---|---|---|---|
| F1 | **Golpe Poderoso** | nível 1 | 8 | 1,5 s | Alvo único: DPS principal |
| F2 | **Bash** | nível 5 · Golpe Poderoso Lv.3 | 14 | 3,5 s | Fere **todos** ao redor |
| F3 | **Investida** | nível 8 · Golpe Poderoso Lv.3 | 10 | 8 s | Avança até o alvo — mobilidade |
| F4 | **Ruptura** | nível 12 · Bash Lv.3 | 12 | 6 s | Abre a defesa do alvo por 4 s |
| F5 | **Execução** | nível 15 · Golpe Poderoso Lv.5 | 15 | 8 s | Quanto menos vida o alvo tem, mais forte |
| F6 | **Provocar** | nível 6 | 4 | 2 s | Puxa o aggro da criatura |
| F7 | **Postura Defensiva** | nível 10 | — | 1,5 s | Alterna: −dano recebido, −seu dano, −movimento |
| F8 | **Fúria de Batalha** | nível 20 | 25 | 90 s | Vida ×3 e muito mais dano — **drena e não cancela** |

**Fúria de Batalha** merece destaque: multiplica a vida (2× no Lv.1, 3× no Lv.10),
aumenta dano e velocidade de ataque, mas você recebe mais dano e a vida **drena
continuamente**. Não existe botão para cancelar — ela só termina quando o HP
chega a 1, e nesse ponto o personagem fica vivo com 1 de vida. A drenagem é
perda direta: nenhuma defesa, resistência ou carta reduz. Cura funciona
normalmente, mas a drenagem continua. Especializar aumenta o poder **e** reduz a
drenagem (1 %/s no Lv.1 → 0,5 %/s no Lv.10) — o risco, porém, nunca some.

O dano é físico (sai do ataque físico e é reduzido pela defesa do monstro) — o
custo delas é a mana. O servidor valida tudo; sem alvo válido a habilidade não
sai e **nada** é gasto.

**Reset de skills** (painel K): devolve todos os pontos investidos. Custa 500 de
ouro na primeira vez, 5.000 na segunda, 25.000 na terceira e 100.000 daí em
diante — reset não pode virar troca de build entre hunt, PvP e guerra.

## Criaturas e bestiário (GDD §12)

Nem todo bicho quer te matar. Cada criatura tem um **temperamento**:

| Comportamento | O que faz | Exemplo |
|---|---|---|
| Pacífico | Nunca ataca, sempre foge | Coelho |
| Neutro | Não começa, mas revida — e esfria em 8 s | Javali |
| Territorial | Ataca quem entra no território | Aranha |
| Predador | Caça tudo que vê | — |
| Hostil | Ataca qualquer ser vivo | Slime |
| Fanático | Como o hostil, mas nunca recua | Super Slime |

**Variantes de spawn:** de vez em quando nasce um exemplar **Robusto** (8 % de
chance) com +20 % de vida e dano, entregando mais XP e loot. É o mesmo monstro
para o bestiário — só mais perigoso.

**Bestiário (tecla B):** a ficha de cada criatura se revela conforme você caça —
vida e XP, depois ataque e defesa, depois comportamento e loot, até a ficha
completa. Chefes são diferentes: **o primeiro abate já revela 50 %**, porque
exigir centenas de mortes de algo raro não faria sentido. E só **encontrar** a
criatura já a registra, mesmo que você morra ou fuja.

**Chefes aprendem:** um chefe que aniquila todo o grupo que o enfrentava fica
mais forte (+15 % de vida e dano por triunfo, até 5 vezes) e passa a valer mais
XP. Vale só para chefes — em monstro comum isso viraria bola de neve.

## Morte (GDD §8)

Filosofia do Tibia: morrer dói e **não existe ressurreição**.

Ao morrer você deixa um **corpo** no local exato, que qualquer jogador pode
abrir clicando nele. A mochila cai **inteira** — com o ouro, poções e tudo que
você tinha coletado. Cada peça equipada tem 8 % de chance de cair também; baixa,
mas nunca zero. Itens Lendários ou melhores resistem mais.

O corpo dura **15 minutos** (tempo de voltar de onde você renasceu). Se alguém
esvaziá-lo antes, ele some em 1 minuto para não poluir o mundo.

**Penalidade de XP**, por faixa de nível:

| Nível | Morte para jogador | Morte para monstro |
|---|---|---|
| 1–20 | 20 % da XP do nível | 14 % |
| 21–100 | 40 % | 28 % |
| 101+ | sobe devagar até 100 % | até 70 % |

O teto é **um nível** — e só no PvP em nível altíssimo. Morrer nunca apaga dois
ou três níveis de progresso.

Ser derrotado por outro jogador é sempre pior que morrer para um chefe — é o que
dá peso ao PvP. E se a perda derrubar seu nível, **os pontos de atributo são
devolvidos e precisam ser redistribuídos**.

## Comandos de teste

Rodando com `npm run dev:test`, o chat aceita comandos para experimentar
conteúdo de nível alto sem farmar horas. Num servidor normal (`npm run dev`)
eles são inertes — viram mensagem de chat comum.

| Comando | O que faz |
|---|---|
| `/level <n>` | Define o nível e concede os pontos de atributo e Skill Points |
| `/sp <n>` | Dá Skill Points avulsos |
| `/gold <n>` | Define o ouro |
| `/hp <n>` | Define a vida atual (testar morte, Execução, fim da Fúria) |
| `/tp <x> <y>` | Teleporta para um tile (voltar ao corpo, achar chefe) |
| `/heal` | Enche vida e mana |

## Roadmap por fases

Adaptação dos milestones do documento mestre para o alvo "navegador":

- [x] **F0 — Fundação:** monorepo, cliente PixiJS, servidor WS, câmera estilo Tibia
- [x] **F1 — Mundo + movimento:** mapa "Valoria" em tiles, colisão autoritativa, paredes 2.5D, múltiplos andares (escadas), visibilidade por andar
- [x] **F2 — Multiplayer:** dois jogadores se veem e jogam juntos na LAN, chat, movimento interpolado (testado na prática)
- [x] **F3 — Combate PvE:** Slime com IA (vaguear/perseguir/atacar/morrer/renascer), auto-ataque por clique, dano/crítico/defesa no servidor, XP, nível, morte/renascimento, loot de ouro, HUD (vida/mana/XP), números de dano
- [x] **F3+ — Classes e atributos:** 4 classes (Knight/Sorcerer/Archer/Druid) com estilos de ataque; 6 atributos (STR/DEX/VIT/INT/WIS/AGI) com 5 pontos por nível; skill que sobe com o uso; ataques à distância/mágicos com projéteis (flecha/firebolt/icebolt) e custo de mana; painel de personagem (tecla C) para distribuir pontos; esquiva; pontos de talento acumulados (árvore de talentos = futuro)
- [x] **F3++ — Magias ativas:** barra de atalhos flutuante (F1, F2, …) com cooldown e requisito de atributo; Dash (alvo único) e Vendaval de Lâminas (área) para o Guerreiro
- [ ] **F4 — Persistência:** login, PostgreSQL, inventário/equipamento
- [ ] **F5+ — Bases e Raids:** o diferencial do jogo

## Estado atual (F1)

Funciona: o cliente gera e renderiza a vila "Valoria" (mesmo mapa determinístico
do servidor) com pisos, muralha, casa, lago e bosque; paredes/árvores em 2.5D com
oclusão por profundidade; herói centralizado; **colisão validada no servidor**;
**múltiplos andares** via escada (o cliente redesenha o andar atual e só enxerga
quem está no mesmo andar). Dois jogadores na mesma rede se veem em tempo real.

Testes: `npm test` cobre colisão, limites do mapa, água sólida e troca de andar
sem oscilação.

Limitações conhecidas: personagem ainda é um placeholder geométrico (sprite
animado vem numa fase de arte dedicada); sem predição de cliente (movimento em
passos do tick — fica fluido na F2); sem persistência; sem combate; sem
transparência de teto do andar de cima (por ora só o andar atual é desenhado).
