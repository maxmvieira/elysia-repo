# Créditos de Assets

Registro dos packs de arte usados no jogo e suas licenças. Manter atualizado
conforme novos assets forem adicionados.

| Asset | Autor | Fonte | Licença | Observações |
|---|---|---|---|---|
| Oblique Fantasy Tile Set (Ground/Walls) | redspark | https://redspark.itch.io/oblique-fantasy-tile-set | Uso comercial ✅, sem crédito obrigatório, não revender | **Em uso** no chão (grama/terra/água/areia). Tiles 64×64 oblíquos. |
| _(pendente)_ 100 Pixel Art Trees | WsT (westudesign) | https://westudesign.itch.io/100-pixel-art-trees-pack-for-your-ots | ver termos no download | Pack comprado (US$1). Árvores 64×64, projeção oblíqua. Não redistribuir. |

## Packs CraftPix de 2026-09-01

Catorze packs entraram num dia só: treze de monstro e um de HUD. Todos vêm com
`License.txt` apontando para <https://craftpix.net/file-licenses/> — os termos
moram lá, não no arquivo.

| Pack | Vira, no jogo |
|---|---|
| Ent (838021) | Ent Seco, Ent, Ent Ancestral |
| Vampiros (208004) | Vampiro, Nobre, Senhor |
| Cogumelos (846584) | Cogumelo Pardo, Escarlate, Púrpura |
| Rato Gigante (415491) | Rato Gigante, Pestilento, Sombrio |
| Homens-lagarto (900504) | Homem-Lagarto, Soldado, Campeão |
| Demônios (463118) | Demônio, Carmesim, Senhor Demônio |
| Fantasmas (894297) | Fantasma, Assombração, Espectro |
| Diabretes (500988) | Diabrete, Alado, Infernal |
| Observadores (404608) | Observador, Escarlate, do Vazio |
| Esqueletos (870078) | **Esqueleto Guerreiro** (já existia sem arte), Guarda, Rei |
| Gnolls (393827) | Gnoll, Guerreiro, Chefe |
| Zumbis (550920) | **Zumbi** (já existia), de Cova, Pútrido |
| Goblins (710530) | **Goblin Guerreiro** (já existia), Capitão, Xamã |
| HP/Mana/Scroll bar (573594) | o emblema alado do HUD |

⚠️ Fonte em `assets/monstros-craftpix/` e `assets/HUD-barras/`; o que o jogo
carrega sai de `npm run monstros:build` e `node tools/hud/recortar.mjs`.

🔴 **A folha LPC do Zumbi SAIU do jogo em 01/09**, substituída pela da CraftPix.
Era a única arte do repositório com licença *share-alike*, que contamina o
derivado. Os PNGs antigos (`Zombie.png`, `Zombie-alfa*.png`) continuam no disco,
sem uso — apagá-los fecha a questão de vez.

⚠️ **Estes catorze packs AUMENTAM um problema que já existia**: o repositório é
público e versiona arte de terceiro. Há um levantamento pack a pack feito em
24/08, com veredito de cada licença, parado na branch `cenario-iso-2d` como
`docs/LICENCAS-DE-ARTE.md` — ele não veio para a `main` porque o dono optou por
seguir só com o trabalho do irmão. Vale trazer.

> Placeholders atuais (chão, muros, personagem) são arte original gerada por
> código no próprio projeto — sem licença de terceiros.
