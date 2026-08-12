# Plano — cores de personagem (outfits)

> Status: **PLANO, não implementado.** Escrito em 2026-08-11 a pedido do dono
> ("customizável as cores do personagem igual o Tibia, como outfits").
> Nada aqui virou código ainda.

## O que os documentos já decidem, e o que continua com você

| | O quê | Onde |
|---|---|---|
| ✅ | O fluxo de criação **já prevê** customização visual: `Humano → Masculino/Feminino → Customização visual → Nome → Classe` | `GDD-doc1-destilado.md:1583` |
| 🔴 | **`13.10` — aparência NUNCA altera estatística.** Rosto, cabelo, tom de pele, sexo e cosméticos não mexem em número nenhum | `:1581` |
| ⏳ | **Toda a customização visual é PENDENTE** — "quantidade de rostos, cabelos, cores, barbas, tons de pele... **e se dá para alterar depois**" | `:1606` |

O pedido do dono **resolve parte da pendência** (haverá cores escolhíveis) e
deixa o resto em aberto. Por isso, o que for número — quantas cores tem a
paleta, quais são elas — nasce marcado `⚠️ REFERÊNCIA` no código, configurável,
como manda a regra do projeto.

⚠️ **"Se dá para alterar depois" continua PENDENTE.** O plano constrói a
estrutura para permitir, mas **não** inventa um barbeiro no jogo. Escolha na
criação; trocar depois é decisão sua.

## 🔴 Por que o modelo do Tibia NÃO transfere direto

No Tibia cada sprite vem com um **template**: uma segunda imagem onde cabeça,
tronco, pernas e pés estão pintados em cores chapadas. O cliente troca a cor de
cada região. **A nossa arte não tem template** — é PNG achatado.

A saída óbvia seria deduzir as regiões pela **altura** (bota embaixo, capuz em
cima). Medi antes de propor, e **não funciona**:

| Classe | Cores distintas | O que a medição mostrou |
|---|---|---|
| Archer | 78 | ✅ separa: verdes em y 10..43 (túnica), marrons em y 23..59 (calça/bota) |
| Assassin | 51 | ✅ separa: vinho em cima, couro escuro embaixo |
| Sorcerer | 88 | ⚠️ o manto roxo é **uma peça só** cobrindo tronco E pernas |
| **Knight** | 85 | 🔴 **não separa**: o cinza da armadura vai de **y 4 a y 59** — elmo, peito e greva são a mesma cor |

🔴 **O Knight mata a ideia de dividir por altura.** Armadura é uma peça que
cobre o corpo inteiro; não existe "cor da perna" separada nele.

**O que separa bem é o MATIZ, não a posição.** Nos quatro packs as famílias de
cor são nítidas: Knight = azul do tabardo · cinza da armadura · dourado.
Sorcerer = roxo do manto · marrons. Archer = verdes · marrons. Assassin =
vinho · couro escuro.

⚠️ **~40% de cada sprite é contorno quase-preto** (no Archer, 323 de 811 px
opacos em três tons de `#07`–`#0e`). Contorno **não pode** ser recolorido: é
ele que segura a legibilidade a 64 px. Pele também fica de fora — tom de pele é
outra pendência do Doc 1, com escolha própria.

## A proposta

**Grupos coloríveis por classe, derivados da paleta da própria arte** — 2 a 4
por classe, em vez de quatro regiões fixas iguais para todos.

Para o jogador a experiência continua sendo a do Tibia: escolhe cores num
seletor e o personagem muda. A diferença é interna, e é ela que faz funcionar
com a arte que temos.

```
archer   → { túnica: verde,  couro: marrom }
knight   → { tabardo: azul,  armadura: cinza, detalhe: dourado }
sorcerer → { manto: roxo,    detalhe: marrom }
assassin → { pano: vinho,    couro: escuro }
```

### As quatro peças, em ordem de risco

**1. Ferramenta offline: `tools/outfit-mascaras.mjs`** *(a peça que decide tudo)*

Lê os packs, agrupa as cores por matiz nas famílias declaradas por classe, e
grava um **mapa de grupos** — um PNG paralelo em que cada pixel diz a que grupo
pertence (0 = não recolorir). Contorno e pele caem sempre em 0.

🔴 **É aqui que o plano vive ou morre**, e é barato descobrir: a ferramenta é
determinística, roda offline e o resultado se **olha** — mesma disciplina de
`sprites-preview.html`. Se a segmentação sair suja, aparece na hora.

⚠️ A cauda longa (37 a 74 cores de sombreado por classe) vai por vizinhança:
cada cor da cauda herda o grupo da família mais próxima em matiz.

**2. Cliente: recolorir em canvas, no carregamento**

O tom escolhido substitui o do grupo **preservando o sombreado** — desloca
matiz e saturação, mantém a luminância relativa. Sem isso as dobras do pano
somem e o personagem vira mancha chapada.

Feito uma vez por combinação `(classe, cores)`, com cache, e vira `Texture`.
**Não é shader**, de propósito: outfit muda raramente, e o projeto já processa
PNG em canvas 2D (`spritebox.ts`). Menos peça nova, mesmo caminho conhecido.

**3. `shared` + protocolo: o outfit viaja no snapshot**

Campo novo em `EntitySnapshot`, pela **mesma razão registrada para
`weaponType`** no `HISTORICO.md`: o cliente sabe o outfit do próprio jogador,
não o dos outros — sem o campo, todo mundo apareceria com a cor padrão.

**4. `server` + banco: persistir**

Colunas novas na tabela de personagem. 🔴 **A migração confere o SCHEMA, não o
`user_version`** — é a armadilha nº 3 do projeto, que já deixou banco marcado
como migrado sem a coluna existir. O padrão é `Store.hasColumn()`.

### Ordem que eu seguiria

1. **Só a ferramenta**, e olhar o resultado em `sprites-preview.html`. Nenhuma
   linha de protocolo, banco ou interface antes disso — se a segmentação não
   prestar, o resto não tem por que existir.
2. Recolorir no cliente, com cor fixa no código, ainda sem escolha.
3. Protocolo + banco + escolha na criação de personagem.

⚠️ **Nada aqui gasta geração do PixelLab.** É tudo sobre a arte que já existe.

## O que este plano NÃO faz

- **Não** cria barbeiro nem troca de cor depois da criação (PENDENTE no Doc 1).
- **Não** mexe em rosto, cabelo, barba, altura ou tom de pele — são pendências
  separadas, e tom de pele exige decidir a paleta de pele antes.
- **Não** dá bônus a cosmético, e não pode: `13.10`.
- **Não** resolve a variante feminina do sprite — os packs têm um corpo só por
  classe, e isso continua esperando arte.
