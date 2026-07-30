# Plano de merge — `pvp-caveira-branca` → `main`

**Situação em 2026-07-30.** Os dois irmãos trabalharam em paralelo a partir do
**mesmo commit** (`5afa083`) sem saber. Nenhum dos dois branches contém o outro.

> 🔴 **Nada está perdido.** `main` está publicado e íntegro; o branch dele também.
> O merge foi **tentado e abortado de propósito** — 6 conflitos, dois deles em
> arquivos grandes, e a sessão não tinha contexto para terminar bem. Árvore limpa.

---

## O que cada lado tem

| | `main` (Frank) | `pvp-caveira-branca` (Max) |
|---|---|---|
| Commits | 8 | 2 |
| Catálogo de equipamento | **205 modelos** gerados por curva | — |
| Party | **distribuição**: XP dividida, bônus de grupo, 3 regras de loot, votação, loot de chefe por contribuição | **formação**: convite com vetos, expiração de 30 s, expulsar, passar liderança, `PARTY_MAX = 5` |
| PvP | — | **Caveira Branca**, `canHarm` só pelo flag do atacante |
| Amigos | — | tabela `account_friend`, **schema v4** |
| UI | painel de grupo na barra | **menu de contexto** no botão direito, barra reordenável |
| Balanceamento | teto da armadura, drop 0,18 → 0,08 | — |

🔴 **Os dois `party.ts` são complementares, não rivais.** Ele escreveu no próprio
commit: *"NÃO entrega o coração da Etapa 9: a XP continua indo inteira para quem
deu o abate"*. É exatamente o que o `main` tem. **Juntos fecham a Etapa 9.**

---

## O conflito real

`git merge origin/pvp-caveira-branca` produz:

**Auto-resolvem, sem conflito:** `client/index.html` · `shared/src/index.ts`

**Entram limpos (só um lado mexeu):**
- só `main`: `catalog.ts`, `equipcurve.ts`, `models.ts`, `items.ts`, `weapons.ts`,
  `defense.ts`, `catalog.test.ts`, `defense.test.ts`, `models.test.ts`,
  `HISTORICO.md`, `DOC4-TRIAGEM.md`
- só ele: `store/schema.ts`, `store/store.ts`, `friends.test.ts`, `pvp.ts`,
  `pvp.test.ts`, `pvpattack.test.ts`

**Conflitam (6):** `shared/src/party.ts` · `shared/tests/party.test.ts` ·
`shared/src/protocol.ts` · `server/src/index.ts` · `client/src/main.ts` ·
`docs/HANDOFF.md` · `docs/ROADMAP-elysia.md`

---

## Como resolver cada um

### 1. `shared/src/party.ts` — UNIÃO, quase indolor

Ficar com **os dois conjuntos**. A única duplicação real é a faixa de nível:

| Dele | Meu | O que fazer |
|---|---|---|
| `xpBandFor` | `sharedXpBand` | **ficar com o meu** — o dele está sem chamador, ele mesmo diz |
| `sharesXpWith` | `sharesXp` | idem |
| `canInvite`, `inviteVetoText`, `removeMember`, `PARTY_MAX`, `PartyState`, `InviteVeto` | — | **manter os dele** |
| — | `partyXpBonus`, `eligibleForXp`, `distributeXp`, `LootRule`, votação, `rollBossLootWinner` | **manter os meus** |

⚠️ Conferir se a regra da faixa é a mesma nos dois antes de descartar a dele. Se
divergir, é decisão de dono, não de merge.

### 2. `shared/tests/party.test.ts` — UNIÃO

Mesma lógica: os testes dele cobrem formação, os meus cobrem distribuição. Juntar
os dois arquivos e remover só os que testam a faixa duplicada.

### 3. `shared/src/protocol.ts` — UNIÃO com atenção

Os dois adicionaram mensagens de party. **As formas provavelmente divergem** —
comparar `S2C_Party`/`PartyMemberView` (meu) com o equivalente dele e escolher
UMA. O `EntitySnapshot` dele ganhou `pkEnabled`, `skull` e `partyId`: manter os
três, são do PvP e do menu de contexto.

### 4. `server/src/index.ts` — 🔴 O ARQUIVO DIFÍCIL (ele mudou 1259 linhas)

**Usar a versão DELE como base** (mudou muito mais) e **reaplicar por cima** o que
só o `main` tem:

- [ ] `Creature.damageBy` (contribuição de dano por jogador) e o `.clear()` no respawn
- [ ] `grantKillXp` chamando `distributeXp` — **é o coração da Etapa 9**
- [ ] `lootRecipientFor` + o parâmetro `recipient` de `dropLoot` (a função `entrega`)
- [ ] `somaAffix` e a leitura de `def0.bonus` em `equipBonus`
- [ ] a trava de fabricação (`craftableModel` no `handleCraft`)
- [ ] `dropLevelRange` / `dropPoolFor` (drop por nível) no lugar dos `DROP_POOL_*` fixos
- [ ] `EQUIP_DROP_CHANCE = 0.08`
- [ ] os comandos de chat de party — **conferir se o menu de contexto dele já cobre**;
      se cobrir, os comandos viram redundância e podem sair

⚠️ **O `partyId` dele já chega ao `canHarm`** (friendly fire desligado no grupo).
Isso é dele e não conflita com a distribuição; manter.

### 5. `client/src/main.ts` — 🔴 (ele mudou 568 linhas)

Também **base dele** (reestruturou a barra lateral e removeu o box de
coordenadas, que era a âncora do reordenamento). Reaplicar:

- [ ] `renderParty` — ou fundir com o painel dele, se ele já fez um
- [ ] o filtro da bancada por raridade de receita (`renderCraftKinds`)
- [ ] o bônus fixo no tooltip (`def.bonus` antes dos passivos rolados)

### 6. Docs — reescrever à mão

`HANDOFF.md` e `ROADMAP-elysia.md` divergem em contagem de testes, schema e etapa
atual. **Schema final é v4** (dele). **Etapa 9 passa a estar completa** depois do
merge — hoje o `main` diz completa e o dele diz "em andamento", e depois do merge
o certo é completa.

O `HISTORICO.md` entra limpo (só `main` mexeu), mas precisa **ganhar a entrada
dele** sobre Caveira Branca, amigos e menu de contexto.

---

## Depois do merge

```bash
npm run typecheck    # tem que sair limpo nos 3 pacotes
npm test             # ~334 (main) + ~8 server (amigos/pvp dele), menos os duplicados
npm run build --workspace client
```

### 🔴 E então testar EM TELA, com dois clientes

Nenhum dos dois lados foi testado dentro do jogo:

- **Ele:** *"nesta sessão NADA foi testado dentro do jogo, porque a tela de login
  pede senha"* — e registrou que o dono relatou *"ainda tem alguns bugs"* sem
  chegar a descrever quais. Ordem de onde olhar que ele deixou: **barra lateral**
  (perdeu a âncora do reordenamento de painéis), **PvP com dois clientes**,
  **party** e **amigos**.
- **Eu:** a Etapa 9 nunca rodou com duas janelas. Convite → aceite → XP dividida
  é o caminho a validar.

**Os bugs não descritos são a primeira coisa a levantar com o dono** — é mais
barato consertar antes de misturar as duas bases do que depois.
