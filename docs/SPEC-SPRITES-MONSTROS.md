# Especificação de sprites — monstros

Onde colocar cada arquivo, com que nome, e **quais animações cada monstro
precisa**. Gerado em **2026-07-29** a partir do bestiário real
(`shared/src/combat.ts`), com o servidor de pé e 59 criaturas no mapa.

> Complementa o [`INVENTARIO-DE-ARTE.md`](./INVENTARIO-DE-ARTE.md), que diz *o
> que falta*. Este diz *como entregar*.

---

## 1. Onde colocar

Uma pasta por criatura, **nomeada pelo `creatureType` do código** — as 22 pastas
já existem, vazias:

```
client/public/assets/monsters/<creatureType>/
```

O nome da pasta não é estético: é a chave que o cliente usa para escolher o
desenho (`e.creatureType`). Com a pasta batendo com a chave, o carregador acha o
sprite sozinho e a criatura sai do placeholder sem eu ter que escrever um caso
novo para cada espécie.

## 2. Nome dos arquivos

Dentro da pasta, um arquivo por animação. **Só `walk.png` é obrigatório** — o que
faltar cai no que existe (sem `idle`, ele fica no quadro 0 de `walk`; sem
`attack`, dá o pulinho de investida que o placeholder já dá hoje).

| Arquivo | O que é | Quadros sugeridos |
|---|---|---|
| `walk.png` | **obrigatório** — ciclo de passos | 4 a 8 |
| `idle.png` | parado, respirando/balançando | 2 a 4 |
| `attack.png` | golpe corpo a corpo | 4 a 6 |
| `hurt.png` | levou dano | 2 a 3 |
| `death.png` | morrendo | 4 a 8 |
| `cast.png` | disparo/conjuração — **só os 4 de longe** | 4 a 6 |
| `attack2.png` | variação cosmética do golpe — **opcional**, ver §6 | 4 a 6 |

## 3. Formato da folha

Cada arquivo é uma folha com **4 linhas = 4 direções**, N colunas = N quadros:

```
linha 0 → BAIXO  (de frente, olhando para a câmera)
linha 1 → CIMA   (de costas)
linha 2 → DIREITA
linha 3 → ESQUERDA
```

É a ordem do MiniWorld, que é o estilo unificado do jogo. (O Zumbi usa a ordem
do LPC — cima/esquerda/baixo/direita — e o código lida com as duas, mas para
arte nova use a de cima.)

Se a esquerda for espelho exato da direita, pode entregar **3 linhas** e avisar:
eu espelho no código. Não invente uma 4ª linha duplicada.

### Tamanho da célula

| Faixa | Célula | Por quê |
|---|---|---|
| Tier I e II | **32×32** | o tile do jogo é 32px (`TILE_SIZE`) |
| Tier III grandes (Minotauro, Troll, Urso, Aranha Gigante) | **48×48** | precisam transbordar o tile para impor porte |
| Super Slime (MVP) | **64×64** | ele é desenhado a 3,6× hoje |

Regras que valem para qualquer tamanho:

- célula **quadrada**, e **a mesma para todos os arquivos daquele monstro**
- **pés na última linha de pixels** do conteúdo, e o corpo centrado em x
- fundo **transparente**, sem sombra embutida (o motor desenha a sombra)
- pixel-art sem antialias — o motor renderiza `nearest`

⚠️ Âncora e escala saem de **medição do conteúdo dentro da célula**, não de
chute. Só avise o tamanho da célula quando mandar; o resto eu meço.

---

## 4. O que o motor toca hoje — leia antes de desenhar

Existem dois caminhos de render, e **nenhum dos dois faz as duas coisas**:

| Caminho | Direções | Animações |
|---|---|---|
| `makeMiniActor` (Zumbi) | ✅ 4 de verdade | 🔴 só `walk` + `idle` |
| `makeSpriteActor` (Slime) | 🔴 frontal única, espelhada | ✅ idle/walk/attack/hurt/death |

Ou seja: **hoje não há como um monstro ter 4 direções E animação de ataque.**

Isso é trabalho meu, não seu: vou estender o `makeMiniActor` para aceitar
`attack`/`hurt`/`death`/`cast` por direção. **Desenhe como está especificado
aqui** — o gatilho de cada animação já existe no servidor:

| Animação | Gatilho que já existe | Ligado? |
|---|---|---|
| walk / idle | movimento do servidor | ✅ sim |
| attack | mensagem `hit` (`playAttack`) | ⚠️ só no caminho frontal |
| hurt | mensagem `hit` no alvo (`playHurt`) | ⚠️ só no caminho frontal |
| death | `hit.fatal = true` | 🔴 nunca ligado (nem no Slime) |
| cast | mensagem `projectile` | 🔴 nunca ligado |
| slam (MVP) | mensagem `fx` + `slam` da def | 🔴 nunca ligado |

---

## 5. As 22 criaturas

Velocidade em ms por passo: **700 = muito alta**, 900 = alta, 1200 = média,
1500 = baixa, 2000 = muito lenta. Importa para o ritmo do ciclo de passos.

### 🟢 Tier I — 2 pastas (as mais baratas do lote)

Mesmo corpo do Slime Verde, outra cor. Se preferir, mande só a paleta e eu
tingo — mas a arte própria fica melhor.

| Pasta | Criatura | HP | Vel. | Animações |
|---|---|---|---|---|
| `slime_blue` | Slime Azul | 70 | 1500 | walk · idle · attack · hurt · death |
| `slime_red` | Slime Vermelho | 100 | 1500 | walk · idle · attack · hurt · death |

> ⚠️ **Os dois estão definidos mas não nascem no mapa** (pendência nº 3 do
> `HANDOFF.md`). Desenhar não é desperdício — ligar o spawn é uma linha — mas
> saiba que hoje você não os encontra jogando.

### 🟡 Tier II — 9 pastas · **a prioridade**

É a faixa que o jogador vê logo depois do tutorial. `DD-BAL-049`: cada espécie
ocupa um **papel**, e é o papel que a silhueta tem que entregar.

| Pasta | Criatura | HP | Vel. | Papel a transmitir | Animações |
|---|---|---|---|---|---|
| `forest_spider` | Aranha da Floresta | 140 | 1200 | corpo a corpo puro, rápida | walk · idle · attack · hurt · death |
| `web_spider` | Aranha de Teia | 130 | 1200 | frágil, **solta teia** (Lentidão) | walk · idle · attack · hurt · death |
| `soldier_ant` | Formiga Soldado | 180 | 1200 | tank, protege as outras | walk · idle · attack · hurt · death |
| `spitter_ant` | Formiga Cuspidora | 120 | 1200 | cospe ácido à distância | walk · idle · attack · hurt · death · **cast** |
| `goblin_warrior` | Goblin Guerreiro | 170 | 1200 | espada e escudo | walk · idle · attack · hurt · death |
| `goblin_archer` | Goblin Arqueiro | 120 | 1200 | mantém distância, arco | walk · idle · attack · hurt · death · **cast** |
| `grey_wolf` | Lobo Cinzento | 160 | **900** | veloz, caça em alcateia | walk · idle · attack · hurt · death |
| `young_orc` | Orc Jovem | 180 | 1200 | força bruta, pouca técnica | walk · idle · attack · hurt · death |
| `orc_warrior` | Orc Guerreiro | 230 | 1200 | elite do Tier II | walk · idle · attack · hurt · death |

A Aranha de Teia é a única do Tier II cuja identidade é **aplicar condição** — o
`attack.png` dela deveria ler como "lançou algo", não como "mordeu". É a razão de
ela existir ao lado da Aranha da Floresta.

### 🔴 Tier III — 9 pastas

| Pasta | Criatura | HP | Vel. | Papel a transmitir | Animações |
|---|---|---|---|---|---|
| `skeleton_warrior` | Esqueleto Guerreiro | 280 | 1200 | usa equipamento, técnico | walk · idle · attack · hurt · death |
| `skeleton_archer` | Esqueleto Arqueiro | 220 | 1200 | arqueiro disciplinado | walk · idle · attack · hurt · death · **cast** |
| `minotaur` | Minotauro | 420 | 1200 | força bruta, grande alcance | walk · idle · attack · hurt · death |
| `brown_bear` | Urso Pardo | 360 | 1200 | tanque natural, lento | walk · idle · attack · hurt · death |
| `black_wolf` | Lobo Negro | 250 | **700** | **o mais rápido do jogo** | walk · idle · attack · hurt · death |
| `giant_spider` | Aranha Gigante | 310 | 1200 | porte e ameaça, aplica Lentidão | walk · idle · attack · hurt · death |
| `mystic_ant` | Formiga Mística | 260 | 1200 | suporte mágico da colônia | walk · idle · attack · hurt · death · **cast** |
| `kobold_hunter` | Kobold Caçador | 220 | **900** | perseguição e armadilhas | walk · idle · attack · hurt · death |
| `troll` | Troll | 480 | 1500 | o mais duro do Tier III | walk · idle · attack · hurt · death |

Os três Esqueletos e o Zumbi têm **fraqueza a Sagrado** (`holy: -0.5`) — arte de
morto-vivo, não de bicho.

### ⚫ Já no jogo, mas incompletos — 2 pastas

| Pasta | Criatura | Situação | Falta desenhar |
|---|---|---|---|
| `zombie` | Zumbi (Tier III, 340 HP) | ✅ tem `walk` LPC 64px + idle **gerado por código** | `attack` · `hurt` · `death` — e um `idle.png` de verdade aposenta o balanço de cabeça improvisado |
| `super_slime` | **Super Slime (MVP)**, 500 HP | ⚠️ hoje é o sprite do Slime tingido de roxo e ampliado 3,6× | tudo, em 64×64 — **mais `slam.png`** (Salto Esmagador em área) e **`enrage.png`** (fúria aos 50 %) |

O Super Slime é o único MVP do jogo hoje e é o que menos parece um. Vale mais que
qualquer criatura comum.

### 💤 Fora do escopo — não desenhe

Coelho, Javali, Aranha, Snake e Rotworm estão **dormentes** (não nascem) e já têm
desenho geométrico próprio. Se voltarem ao mapa, aparecem certos.

---

## 6. Sobre "ataque 2"

**Hoje cada criatura tem exatamente UM ataque corpo a corpo nas regras.** Não
existe segundo golpe no servidor — nenhuma criatura alterna entre dois.

Então `attack2.png` é **puramente cosmético**: uma variação sorteada do mesmo
golpe, para o combate longo não ficar repetitivo. É barato de ligar e fica bom,
mas é a última coisa da fila. **Não desenhe `attack2` de ninguém antes de
`walk` + `attack` das 20 criaturas que hoje são bolha colorida.**

A única exceção real é o **Super Slime**, que tem dois ataques de verdade na def:
o golpe normal e o `slam` (Salto Esmagador). Para ele, `slam.png` não é cosmético.

---

## 7. Ordem sugerida

1. **Tier II inteiro** (9) — maior impacto por hora de trabalho
2. **Super Slime** (1) — é o MVP e hoje é um slime roxo grande
3. **Tier III** (9)
4. **Zumbi**: `attack` · `hurt` · `death` (3 arquivos, monstro que já existe)
5. **Slime Azul e Vermelho** (2) — baratos, mas nem nascem no mapa ainda
6. `attack2` de quem sobrar tempo

Dentro de cada monstro, a ordem que mais rende: **`walk` → `attack` → `death` →
`idle` → `hurt`**. `walk` tira do placeholder; `attack` faz o combate ler;
`death` fecha o ciclo. `hurt` é o menos sentido dos cinco.

---

## 8. Quando mandar

Só me diga **o tamanho da célula** e **se entregou 3 ou 4 linhas**. O resto
(âncora, escala, velocidade de quadro, ordem das linhas) eu meço no arquivo.

Cada criatura que ganha sprite sai sozinha da tabela de bolhas coloridas
(`CREATURE_PLACEHOLDER_COLORS`) — como já acontece com o Zumbi.
