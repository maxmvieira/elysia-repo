# Doc 4 (Parte 2) — Triagem para implementação

Mapa do **`ELYSIA ONLINE ATUALIZAÇOES DE LACUNAS PARTE 2.docx`**: 69 capítulos,
**227 decisões**, ~10 sistemas completos. Em superfície de design é maior que
tudo o que já foi implementado somado.

O `.docx` é binário e ilegível por busca. Para trabalhar em cima dele, extraia
para texto pelo mesmo caminho descrito no fim de [`DOC3-TRIAGEM.md`](./DOC3-TRIAGEM.md).

**Autorização do dono (2026-07-30):** eu apresento o plano de cada sistema antes
de implementar e espero aprovação — a granularidade combinada é **por sistema**,
não por decisão.

## Mapa dos capítulos

| Cap. | Sistema | Decisões |
|---|---|---|
| 13–43 | Catálogo de equipamentos: 9 tipos de arma, armaduras, acessórios, afinidade por classe, banco oficial | — |
| 44 | **Material Bible** | 2 MAT |
| 45 | **Monster Drop Bible** | 15 DROP |
| 46 | **Item Affix Bible** | 13 AFFIX |
| 47 | NPC Bible | 18 NPC |
| 48 | Quest Bible | 21 QUEST |
| 49 | Reputation Bible | 11 REP |
| 50–67 | **Card Bible** + 15 capítulos de catálogo | **144 CARD** |
| 68–70 | Relíquias Lendárias | 34 RELIC |
| 68–79 | Sets Lendários (8 sets detalhados) | **132 SET** |
| 80 | Grandes Chefes | 12 BOSS |
| 81 | Dungeons Lendárias | 13 DUN |

## ⚠️ Dois problemas do documento

**1. Colisão de numeração.** Os capítulos **68, 69 e 70 aparecem duas vezes** —
uma para Relíquias Lendárias, outra para Sets Lendários. A regra de ouro do
projeto depende de "o capítulo mais alto vence"; com número repetido, citar
"capítulo 69" é ambíguo. 🔴 **Precisa renumerar um dos blocos.**

**2. As quatro pendências que travam código continuam sem cobertura.** Procurado
explicitamente: `DD-CC-013/014`, `DD-DEF-012`, `DD-PROG-002` e `DD-DEATH-009`
não aparecem em nenhum lugar da Parte 2. São as mesmas que a Parte 1 não cobriu.

## Ordem de implementação aprovada

Aprovada pelo dono em 2026-07-30. A lógica é **começar pelo que conecta no que já
existe** e destrava o que está pela metade, em vez de construir endgame antes de
o meio de jogo existir:

1. ✅ **Item Affix Bible (cap. 46)** *(feito)*
2. ✅ **Material Bible + Monster Drop Bible (cap. 44–45)** *(feito)*
3. **Fechar a fabricação** — protocolo e handler
4. **Catálogo de equipamentos (cap. 13–43)**

## ✅ Cap. 44–45 — Material Bible e Monster Drop Bible (implementados)

**A primeira surpresa:** nenhum dos dois capítulos tem conteúdo. O cap. 44 é
**puro esquema de classificação** (19 famílias, 11 origens, 12 usos, 6
qualidades, 7 estados, cadastro de ~25 campos) e não lista **nenhum material**.
O cap. 45 é **filosofia + identidade de família**, sem tabela de drop.

**A acusação que o cap. 45 faz ao jogo:**

> `DD-DROP-001`: *"O jogador nunca deve derrotar um monstro apenas pela
> experiência."*

Antes disto, **21 das 23 espécies eram exatamente isso** — só Slime e Serpente
largavam material próprio. Um Minotauro, um Troll, um Esqueleto Guerreiro: todos
davam ouro, fragmento genérico e nada que os identificasse.

### O que entrou

- **`shared/src/materials.ts`** — a taxonomia do cap. 44 e o cadastro do `44.13`,
  com **núcleo obrigatório** (o que o jogo usa) e o resto opcional. Tornar os ~25
  campos obrigatórios faria cada material ocupar vinte linhas sem ganho.
- **24 materiais novos**, um conjunto por família de criatura, seguindo os
  exemplos literais do `DD-DROP-006`.
- **`CREATURE_FAMILY`** — as 28 espécies mapeadas para 13 famílias.
- **`FAMILY_MATERIALS`** — o material característico **por família, não por
  espécie**. É o que faz a lição valer para o grupo: matar Lobo Cinzento ou Lobo
  Negro dá o mesmo tipo de couro, então o jogador aprende uma vez.

**Duas tabelas, um `kind`:** `ITEMS` diz o que a coisa é como objeto de
inventário (nome, preço, empilha); `MATERIALS` diz o que ela é como matéria-prima
(família, origem, profissão). Teste garante que não se separem.

### 🔴 Decisão do dono: afinidade usa os SETE tipos de dano

O `44.11` lista **onze** afinidades — Fogo, Água, Terra, Vento, Raio, Gelo,
Natureza, Luz, Trevas, Aether, Corrupção — mas `DD-ELM-002` fecha os tipos em
sete. Era a **terceira** ocorrência do conflito (antes: `Slime Azul → Água` no
Doc 3 e os prefixos `Terreno`/`Marinho` no cap. 46).

O dono escolheu **vocabulário único**: as onze colapsam nos sete.

| Palavra do doc | Vira |
|---|---|
| Fogo | Físico → `fire` |
| Água · Gelo | `ice` |
| Terra | `physical` |
| Vento · Raio | `electric` |
| Natureza | `poison` |
| Luz · Aether | `holy` |
| Trevas · Corrupção | `dark` |

⚠️ **O que se perde:** Água e Gelo passam a ser indistinguíveis, e o mesmo vale
para Vento/Raio e Trevas/Corrupção. Se algum dia uma receita precisar aceitar
Água mas não Gelo, a distinção volta a fazer falta.

⚠️ **Aether → `holy` é o mapeamento mais frágil.** Aether é a energia mágica do
mundo na lore; Sagrado é "energia vital". Próximos, não iguais. Se o Aether ganhar
peso mecânico próprio, é o primeiro lugar a rever.

### O que ficou de fora, e por quê

| Item | Motivo |
|---|---|
| **Ervas, Flores, Cogumelos, Minérios, Madeiras, Gemas** | dependem de **coleta e mineração**, que não existem. Criar o item sem forma de obtê-lo seria item inalcançável — e `DD-MAT-001` proíbe material que "existe apenas para ocupar espaço". Há teste impedindo que entrem antes da coleta |
| **Estado de processamento** (Bruto → Refinado) | depende de profissões com ação |
| **Qualidade** (Impuro → Perfeito) | afeta "eficiência de produção", e produção não existe |
| **Nível tecnológico e tamanho** | organizacionais, sem efeito mecânico. Campos opcionais |

**Adiado, com motivo:**

| Sistema | Por que espera |
|---|---|
| Cartas (50–67) | encaixam em equipamento, e o catálogo canônico de equipamento não existe |
| Sets (68–79) e Relíquias (68–70) | **endgame** — nenhum jogador passa do Tier III hoje |
| NPC / Quest / Reputação (47–49) | precisam de cidade, o mesmo bloqueio da Asteria |
| Chefes e Dungeons (80–81) | contrariam a ordem que `DD-BAL-038` fechou: Tier por Tier antes de MVPs |

## ✅ Cap. 46 — Item Affix Bible (implementado)

**A descoberta que barateou tudo:** os dois sistemas eram **complementares, não
conflitantes**. `weapons.ts` já tinha os EFEITOS mecânicos (`AffixId`) com faixa
de valor e sorteio por raridade; o doc dá os **NOMES** e diz que os valores
"serão definidos posteriormente". Não houve reescrita — só uma camada nova em
cima.

`shared/src/affixes.ts` fecha:

- **40 prefixos** nos 5 grupos, cada um apontando para os efeitos que concede
- **30 sufixos** nos 6 grupos
- **Composição do nome** (`DD-AFFIX-001`): `Espada Longa Feroz do Dragão`
- **Compatibilidade** (`DD-AFFIX-009`): arma só ofensivo/elemental/mágico,
  armadura só defensivo, e raridade mínima por modificador
- **Cadastro padronizado** do `DD-AFFIX-012`, com os campos de aplicação
- **Maldições** (`DD-AFFIX-007`) como par bônus/custo estruturado

### 🔴 Prefixo elemental muda o dano DE VERDADE

Decisão do dono. Uma "Espada Longa Flamejante" causa dano de **fogo**, usando o
pipeline da Etapa 8. É o que faz as resistências das criaturas saírem do papel —
o Zumbi fraco a Sagrado passa a ter um contra real em vez de um número parado.

A arma **vence a classe**: quem empunha espada Glacial bate de gelo, mesmo sendo
Knight. E dano não-físico passa a bater contra a **defesa mágica** da criatura,
que é a troca que dá sentido a carregar arma elemental contra bicho de armadura
grossa.

### O que ficou de fora, e por quê

| Item | Motivo |
|---|---|
| **Bênçãos** (`DD-AFFIX-006`) | "extremamente raras, ligadas à Lore" — sem fonte, sem número e sem a lore ligada. Implementar seria inventar |
| **Encantamentos** (`DD-AFFIX-005`) | obtenção via "NPCs, profissões, quests", e nada disso existe |
| **Propriedades Únicas** (`DD-AFFIX-008`) | são por item específico; pertencem ao catálogo de equipamentos (cap. 13–43) |
| **Compatibilidade por material e origem** (`DD-AFFIX-010/011`) | citam Mithril, Adamantita, Escamas de Dragão e equipamento Élfico/Anão/Celestial, que **não existem no código**. Os campos estão **declarados e não-aplicados** — ligar é uma linha quando o Material Bible (cap. 44) entrar |

### 🔴 Conflito novo: elementos fora dos sete

Os prefixos elementais incluem **"Terreno"** e **"Marinho"**, mas `DD-ELM-002`
fecha os sete tipos em Físico · Fogo · Gelo · Elétrico · Veneno · Sagrado ·
Sombrio. **Terra e Água não estão lá.**

Mapeados por decisão provisória: **Terreno → Físico** (impacto) e
**Marinho → Gelo**. É a mesma leitura proposta para o `Slime Azul → Água` do
Doc 3, e as duas precisam da mesma confirmação. Há teste garantindo que ninguém
invente um oitavo elemento.

### ⚠️ Prefixos que prometem efeito inexistente

Três nomes do doc pedem mecânica que o jogo não tem. Foram mapeados para o
vizinho mais próximo, com o comentário dizendo a intenção original:

| Prefixo | Queria | Ficou com | Quando muda |
|---|---|---|---|
| **Preciso** | precisão/acerto | chance de crítico | quando precisão existir |
| **Impenetrável** | bloqueio | defesa plana | Etapa 11 (bloqueio por equipamento) |
| **Pesado** | defesa com custo de mobilidade | defesa + vida | quando peso afetar movimento |
