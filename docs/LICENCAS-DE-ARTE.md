# Licenças de arte — o que está publicado e sob que termos

> Levantamento feito em **2026-08-24**, a pedido do dono. Ele responde a uma
> pergunta que o `CREDITS.md` não respondia: **o que exatamente está em
> `client/public/assets/` e `assets/`, e o que cada licença permite.**
>
> 🔴 Este documento não substitui o [`CREDITS.md`](../CREDITS.md) — o CREDITS é
> a lista curta e de manutenção; aqui está o levantamento com evidência, para a
> decisão de expurgo.

## 🔴 O achado que explica o resto

O [`client/public/assets/README.md`](../client/public/assets/README.md) afirma,
em texto, que a pasta está no `.gitignore` e que os arquivos *"ficam só na sua
máquina e não vão para um repositório público"*.

**Ela não está ignorada.** O git rastreia mais de 400 arquivos ali, e o
repositório é **público desde 29/07** (verificado em 11/08 pela API do GitHub e
de novo em 24/08 — `github.com/maxmvieira/elysia-repo` responde sem
autenticação).

O `.gitignore` carrega o mesmo engano, e ainda se avisa sozinho:

> *"Os assets de arte ENTRAM no repositório de propósito: ele é PRIVADO, então
> versioná-los não é redistribuição pública"* — e logo abaixo: *"⚠️ Se algum dia
> este repositório virar PÚBLICO, revise as licenças ANTES"*.

Esse aviso venceu há quase um mês.

⚠️ **O `CREDITS.md` lista 2 packs. Existem pelo menos 8 lotes de arte de
terceiros no repositório.**

## Pack a pack

| Pack | Arquivos | Evidência da licença | Veredito |
|---|---|---|---|
| **weapons_and_tools** (beast-pixels) | 11 | `LICENSE.txt` no próprio pack: **CC-BY 4.0** — distribuir é permitido, **crédito é obrigatório** | ✅ **Fica.** Só falta creditar. ⚠️ Nenhum código lê essa pasta hoje |
| **FreeCharactersAnimationsAssetPack** | 58 | `License.txt`: uso pessoal e comercial ok, mas **proíbe redistribuir e revender**, com todas as letras | 🔴 **Sai.** É explícito, e o código usa |
| **CraftPix** (cristais + árvores) | 333 em `assets/`, 27 em `client/` | `License.txt` é só a URL `craftpix.net/file-licenses/` — os termos moram lá, não no arquivo | 🔴 **Sai** — no mínimo os pacotes extraídos inteiros em `assets/`, que nem são usados pelo jogo |
| **Oblique Fantasy Tile Set** (redspark) | `Ground.png`, `Walls.png`, `Items.png` | `CREDITS.md`: uso comercial ✅, sem crédito obrigatório, **"não revender"** | ⚠️ Zona cinzenta: publicar num repo não é revender. **Ler os termos no itch antes de decidir** |
| **100 Pixel Art Trees** (WsT) | a identificar | `CREDITS.md`: pack comprado (US$ 1), **"Não redistribuir"** | 🔴 **Sai** — falta descobrir quais arquivos de `trees/` vieram dele |
| **MiniWorldSprites** | **208** | **nenhum arquivo de licença, e nenhuma URL de origem em lugar nenhum do repositório** | ❓ O maior lote e o mais opaco. É o estilo unificado do jogo — trocar seria caro |
| **Character Customizer** | 3 | só um `ReadMe.txt` de como abrir no GIMP | ❓ Sem licença |
| **Zombie** (`monsters/`) | 3 | `INVENTARIO-DE-ARTE.md` diz *"folha **LPC** 64px"* | ❓ LPC costuma ser **share-alike** — se for, contamina o derivado e obriga a licenciar igual |

### ✅ Arte do próprio projeto — sem licença de terceiro

`buildings`, `furniture`, `classes`, `classes-pixellab`, `classes-layered`,
`interior-tiles.png`, `models3d`, `beautiful_female_warrior_*`,
`Create_a_professional_*`, `arte-fonte/pixellab` — geradas por vocês pelo
PixelLab, pelo `gpt-image-1` e pelo Blender.

⚠️ Único ponto a conferir **uma vez**: os termos do PixelLab sobre a propriedade
do output.

## 🔴 Sobre "tirar do histórico" — leia antes de tentar

Expurgar exige reescrever o histórico (`git filter-repo` ou BFG) e **force
push**. Duas consequências que não se desfazem:

1. **Quebra o clone do irmão** — todo mundo que já clonou precisa reclonar.
2. **Não desfaz a publicação.** São ~4 semanas de repositório aberto. Fork,
   cache do GitHub e crawler podem já ter cópia. Reescrever o histórico esconde,
   não apaga.

⚠️ **O que de fato reduz risco é tornar o repositório PRIVADO.** É um clique,
restaura a premissa que o `.gitignore` e o README já assumem, e não custa
trabalho nenhum. O HANDOFF de 11/08 já apontava isso como "o conserto barato" e
ninguém pegou.

🔴 **Enquanto for público: nunca commitar segredo aqui** — não existe "privado"
para cair de volta. O token do PixelLab está em `.env`, que é ignorado (linha 5
do `.gitignore`). Mantenha assim.

## A ordem recomendada

1. **Privar o repositório.** Ação do dono, no GitHub. Tudo o mais fica mais
   barato depois disso.
2. **Consertar o `README.md` de assets e o `.gitignore`**, que hoje descrevem
   uma proteção que não existe.
3. **Atualizar o `CREDITS.md`** com os 6 packs que faltam.
4. **Descobrir a origem** de MiniWorld, Character Customizer e Zombie — sem
   isso não dá para dizer se ficam.
5. **Expurgo de histórico**, e só se ainda quiser reabrir o repositório depois.

> Nada disso foi executado em 24/08. O levantamento parou aqui de propósito: o
> passo 1 é decisão do dono, e os outros dependem dele.
