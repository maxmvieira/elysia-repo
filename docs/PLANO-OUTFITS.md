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

**1. ✅ FEITO — `tools/outfit-grupos.mjs`** *(a peça que decidia tudo)*

Escreve `grupos.json` por classe e um PNG de conferência com cada grupo pintado
chapado. Resultado em 11/08: **Knight** separa armadura / tabardo+escudo /
filete dourado; **Archer** separa túnica / couro / empena. As quatro classes
saíram com 3 grupos coloríveis e 42% a 54% dos pixels fixos.

🔴 **Virou TABELA DE CORES, não máscara por quadro** — e é melhor. Todas as
tiras de uma classe compartilham a mesma paleta, então "a que grupo pertence
este pixel" é função da **cor**, não da posição. Uma tabela de ~80 entradas vale
para `walk`, `pose`, `attack` e `death` de uma vez, sem gerar imagem nenhuma, e
dá para abrir o JSON e conferir a olho.

🔴 **Contorno é propriedade da POSIÇÃO, não da cor.** A primeira versão
classificou contorno por luminância e engoliu roupa em personagem escuro: no
Arqueiro a calça de couro saía salpicada. Agora cada cor é medida pela **fração
dos seus pixels que vive na borda** (encostando em transparência, ou como mínimo
local de luminância). Os dados separam sem sobreposição:

| | fração de borda | luminância |
|---|---|---|
| contorno | **0,78 – 0,98** | 0,01 – 0,05 |
| pano | **0,00 – 0,50** | 0,22 – 0,49 |

⚠️ **42% a 54% dos pixels ficarem fixos NÃO é defeito** — é o que esta arte é.
Só as seis cores de contorno do Arqueiro somam 13.381 px. Traço preto grosso é
o que sustenta a legibilidade a 64 px, e recolorir quase-preto não se veria.

⚠️ Os limiares (`DELTA`, `FRACAO`) são `⚠️ REFERÊNCIA`, sobrescrevíveis por
variável de ambiente, e `DIAG=1` imprime a fração de borda das cores de maior
área — foi assim que os números acima foram escolhidos, olhando dado.

**2. ✅ FEITO — cliente recolore em canvas, no carregamento**

Em `client/src/heroes.ts`. Entra por `?outfit=RRGGBB,RRGGBB,RRGGBB` na URL —
**sem o parâmetro o jogo desenha exatamente como antes.** Recolorir é opt-in
até haver escolha de verdade, então o passo 2 não muda a cara do jogo.

🔴 **Troca matiz e saturação, e desloca a luminância EM BLOCO — não a
substitui.** Cada pixel mantém a sua distância de luz para os vizinhos, e o
grupo inteiro sobe ou desce junto pela diferença entre a cor escolhida e a cor
dominante original. Substituir a luminância chapa o sombreado: **as dobras do
pano são luminância**. Visto em conferência — as dobras do tabardo e o brilho
da armadura sobrevivem nas quatro variações testadas.

⚠️ **Com outfit o caminho de carregamento é OUTRO:** `Assets.load` devolve
textura de GPU, e recolorir exige os pixels na mão, então passa por
`loadImage` + canvas 2D — o mesmo motivo de `spritebox.ts`. E `loadImage`
espera `onload`, **nunca** `img.decode()`: em aba oculta o Chrome adia a
decodificação e a promessa não resolve (bug de 02/08).

⚠️ A conversão de cor é memoizada **por cor, não por pixel**: a paleta tem ~80
entradas para dezenas de milhares de pixels.

**Não é shader**, de propósito: outfit muda raramente, e o projeto já processa
PNG em canvas 2D. Menos peça nova, mesmo caminho conhecido.

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
