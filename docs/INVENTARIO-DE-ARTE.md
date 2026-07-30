# Inventário de arte — o que falta desenhar

Lista do que já tem arte e do que ainda é placeholder, para dividir o trabalho
de desenho. Gerado em **2026-07-29**, com o jogo em 59 criaturas vivas no mapa.

> **Como usar:** desenhem na ordem que quiserem, mandem os arquivos, e eu ligo
> cada um no código. Cada linha marcada 🔴 é uma bolha colorida hoje.

---

## 🐉 Monstros — 21 de 23 sem arte

> 📐 **Para desenhar, use a [`SPEC-SPRITES-MONSTROS.md`](./SPEC-SPRITES-MONSTROS.md)**:
> tem a pasta de cada monstro (já criadas), o nome de cada arquivo, o formato da
> folha e **quais animações cada um precisa**. Esta seção aqui é a visão geral;
> aquela é a de execução.

O cliente escolhe o desenho por `creatureType` e cai no blob genérico para tipo
desconhecido. Hoje cada espécie tem **cor própria + nome sobre a cabeça**
(`CREATURE_PLACEHOLDER_COLORS`), o que dá para jogar mas não para admirar.

### ✅ Com arte

| Criatura | O que tem |
|---|---|
| Slime Verde | animação própria (`loadSlimeAnim`) |
| Zumbi | folha LPC 64px, andar + idle **gerado** (`Zombie-alfa.png`) |
| Super Slime | reusa o sprite do Slime, maior e tingido de roxo |
| **Slime Azul** | as 5 animações do Verde, matiz +120° (`loadSlimeVariants`) |
| **Slime Vermelho** | as 5 animações do Verde, matiz −120° |

✅ **Tier I resolvido em 2026-07-29 por decisão do dono:** os dois reusam a arte
do Verde recolorida, e agora **nascem no mapa** — o que encerra a pendência nº 3
do `HANDOFF.md`. Não é `sprite.tint`: tint multiplica, e verde × azul dá
verde-escuro sujo. É rotação de matiz em canvas, que troca a cor e preserva o
sombreado.

### 🔴 Tier II — sem arte

| Criatura | Cor | Identidade |
|---|---|---|
| Aranha da Floresta | roxo | rápida, corpo a corpo puro |
| Aranha de Teia | roxo claro | frágil, dispara teia (controle) |
| Formiga Soldado | marrom | tank, protege as outras |
| Formiga Cuspidora | verde-ácido | atira ácido à distância |
| Goblin Guerreiro | verde-oliva | espada e escudo |
| Goblin Arqueiro | verde claro | mantém distância |
| Lobo Cinzento | cinza | veloz, caça em alcateia |
| Orc Jovem | verde | força bruta, pouca técnica |
| Orc Guerreiro | verde escuro | elite do Tier II |

### 🔴 Tier III — sem arte

| Criatura | Cor | Identidade |
|---|---|---|
| Esqueleto Guerreiro | osso | usa equipamento, técnico |
| Esqueleto Arqueiro | osso claro | arqueiro disciplinado |
| Minotauro | vermelho-terra | força bruta, grande alcance |
| Urso Pardo | marrom | tanque natural, lento |
| Lobo Negro | quase preto | **o mais rápido do jogo** |
| Aranha Gigante | roxo escuro | porte e ameaça |
| Formiga Mística | azul | suporte mágico da colônia |
| Kobold Caçador | dourado | perseguição e armadilhas |
| Troll | verde-acinzentado | o mais duro do Tier III |

### 💤 Dormentes (existem no código, não nascem)

Coelho, Javali, Aranha, Snake e Rotworm têm **desenho geométrico próprio** e
foram tiradas do mundo a pedido. Se voltarem, já aparecem certas.

---

## 🧍 Personagem — parcial

| | Estado |
|---|---|
| Knight | ✅ arte dedicada (`loadKnightSprites`) |
| Sorcerer · Archer · Assassin | ⚠️ animação genérica de classe (`loadClassAnims`) |
| Druid | 🔴 **classe nem existe** — Etapa 15 |

🔴 **Falta o mais visível de todos:** o personagem não muda de aparência ao
equipar item. Armadura, capacete, escudo e arma são invisíveis no corpo.

---

## ⚔️ Equipamento — 25 itens, nenhum no corpo

> ✅ **Decisão do dono (2026-07-29): equipamento visível fica para DEPOIS do
> lançamento.** É caro de fazer e não bloqueia o jogo sair. Entra como update
> futuro. **Não desenhem peça de equipamento para vestir o personagem agora** —
> ícone de inventário continua valendo.

Os 25 itens têm ícone no inventário (tileset `Items.png`), mas:

- ⏸️ **nada aparece no personagem** quando equipado — adiado para pós-lançamento
- 🔴 **nenhuma arma tem sprite próprio** — os 8 tipos (espada, machado, maça,
  adaga, lança, arco, besta, cajado) usam ícone genérico
- 🔴 **raridade não tem moldura** — Comum a Relíquia são sete degraus sem
  distinção visual no ícone

---

## 🃏 Cartas — sistema inteiro por fazer

**Etapa 10 do roadmap, ainda não implementada.** Quando entrar, cada monstro tem
carta exclusiva (`DD-CAR-001`) — ou seja, a arte de cartas escala junto com o
bestiário, hoje 23 espécies e crescendo.

Não desenhem carta ainda: o formato depende de decisões que não foram tomadas.

---

## 👤 NPCs — 1 de ~60

| | Estado |
|---|---|
| Comerciante | ✅ animação própria (`loadNpcAnim`) |
| Os outros ~59 | 🔴 a Etapa 16 prevê **até 60 NPCs** na cidade principal |

Também sem arte: **guardas patrulhando** (Etapa 16) e o **Rei Esqueleto**, MVP
já definido no Doc 3.

---

## ✨ Efeitos — o que é forma geométrica hoje

| Efeito | Estado |
|---|---|
| Projéteis (flecha, firebolt, icebolt) | ⚠️ formas simples |
| **Ícones de condição** | 🔴 **quadradinho colorido** — 10 condições precisam de ícone |
| Ícones de elemento | 🔴 os 7 tipos de dano só têm cor, sem símbolo |
| Números de dano | ✅ já saem na cor do elemento |
| Corpo (cadáver) | ⚠️ genérico |

---

## Sugestão de prioridade

Com equipamento visível adiado para pós-lançamento, a ordem fica:

1. **Os 9 monstros do Tier II** — é a faixa que o jogador vê logo depois do
   tutorial, e hoje são bolhas coloridas
2. **Ícones das 10 condições** — hoje são quadrados sem significado, e agora que
   as aranhas aplicam Lentidão de verdade o jogador precisa entender o que pegou
3. **Slime Azul e Vermelho** — os mais baratos de todos: mesmo corpo, outra cor
4. **Os 9 do Tier III**
5. **Sprites de arma** para os 8 tipos (ícone de inventário, não no corpo)

---

## Formato que funciona melhor

O Zumbi entrou como **LPC Universal Sprite Sheet** (células de 64px) e deu certo,
com uma ressalva registrada no `HISTORICO.md`: andando para cima, o topo da
cabeça é cortado. O resto do jogo usa **MiniWorld 16×16**.

Misturar formatos funciona — o código já lida com os dois. Só avisem qual é qual
quando mandarem, porque âncora e escala saem de **medição do conteúdo dentro da
célula**, não de chute.
