# Elysia Online — Design Tokens (fonte de verdade da UI)

Referência visual: `exemplo-layout-Elyzia.png` (raiz do projeto).
Style guide navegável: `docs/elysia-style-guide.html` (render dos componentes reais).

> Regra de ouro: **toda tela nova reusa estes tokens**. Metal (bronze→ouro) só em molduras/títulos/ações — nunca em grandes áreas. Cores de vitais e de combate são fixas e não se misturam com o dourado de marca.

## Cores

| Token | Hex | Uso |
|---|---|---|
| `--ground` | `#0D0B09` | fundo da tela |
| `--panel` / `--panel-2` | `#15110B` / `#1B160E` | fundo de painel (translúcido ~0.9) |
| `--slot` | `#0F0C08` | célula de item/hotbar (côncava) |
| `--bronze-lo` / `--bronze` | `#4A3823` / `#8A6A3A` | moldura (deep / mid) |
| `--gold` / `--gold-bright` | `#D9B26A` / `#F0D492` | títulos, hairline, ouro claro |
| `--parchment` / `--muted` / `--faint` | `#E2D6BD` / `#9A8C72` / `#6F6553` | texto / secundário / timestamp |
| `--hp` | `#CF3B2E` (track `#3A1512`) | vida |
| `--mana` | `#4A86D8` (track `#10233F`) | mana |
| `--vigor` | `#D9A441` (track `#3A2A10`) | vigor (barra mais fina) |
| `--xp` | `#6FB84A` (track `#16240F`) | proficiências / progresso |
| `--c-monster` | `#E0473A` | nome de monstro |
| `--c-player` | `#5FD15F` | nome de jogador |
| `--c-npc` | `#E8C24A` | nome de NPC |
| `--c-crit` | `#FF9A3C` | dano crítico |

## Tipografia

- **Display/serifa** (marca, títulos, nomes): `"Iowan Old Style","Palatino Linotype","Book Antiqua",Georgia,serif` — caixa-alta + `letter-spacing` generoso nos títulos.
- **Corpo/sans**: `"Segoe UI",system-ui,sans-serif`.
- **Números**: sempre `font-variant-numeric: tabular-nums`.
- Sem webfont externa (CSP dos artifacts bloqueia CDN) — usar stacks de sistema. Se quiser Cinzel/Trajan reais depois, embutir via `@font-face` data-URI.

## Anatomia do painel (`.frame`)

1. Fundo: gradiente escuro quente translúcido.
2. Moldura: `1px` bronze + hairline dourada interna (`::after` inset 3px, `rgba(217,178,106,.20)`).
3. Cantos: colchetes dourados (`.cnr`) a 55% de opacidade.
4. Título: serifa caixa-alta dourada, ícone à esquerda, `✕` à direita, divisória inferior.
5. Sombra externa profunda (`0 10px 30px #000a`) pra separar do mundo.

## Zonas de layout (do mockup)

- **Topo:** marca `ELYSIA ONLINE` · FPS · Ping · zona (`Floresta de Arden`) · relógio.
- **Esquerda:** cartão do personagem (orbe + nome/classe/guilda + HP/Mana/Vigor + ícones) → Diário de Missões.
- **Direita:** Habilidades → Mapa (minimapa + bússola) → Inventário (paperdoll) → Mochila (grade + peso/ouro) → Grupo.
- **Rodapé esq.:** chat em abas. **Rodapé centro:** hotbar 12 slots F1–F12.
- **Gameplay:** ~70% da tela; UI nunca cobre a ação.

## Combate

- Barras de vida discretas sobre a cabeça; alvo com colchete vermelho.
- Números de dano em serifa com contorno escuro; normal branco, **crítico laranja e maior**, cura verde.
- Partículas de magia/impacto (fase posterior).

## Loot

- Janela compacta ao clicar no corpo: nome (cor de monstro) + linhas (ícone · nome · `Nx`) + botão **Pegar Tudo**.
- Corpo decompõe/some após alguns minutos se ninguém saquear.
