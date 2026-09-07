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

### Segunda rodada, 2026-09-02

| Pack | Vira, no jogo |
|---|---|
| Slime mobs (788364) + Slime monsters (510319) | **Slime Verde/Azul/Vermelho e Super Slime** (já existiam, ganharam arte) + Slime Sombrio e Âmbar |
| Lich (543463) | Lich, Lich do Gelo, Rei Lich |
| Golem (625807) | Golem de Terra, de Cristal, Arcano |
| Hunt animals (789196) | **Javali** (existia dormente) + Lebre, Galo-lira, Raposa, Cervo |
| Swordsman lvl1–9 (bandidos / guardas vilarejo / guardas cidade) | Bandidos, e os seis GUARDAS — estes ainda sem comportamento |

🔴 **A folha do Slime também saiu de um caminho especial**: o Azul e o Vermelho
eram o Verde com o matiz girado, e o Super Slime não tinha arte nenhuma. Agora
os quatro têm sprite próprio e as cinco animações.

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

## Tela de entrada — 2026-09-02

| Asset | Onde mora | Origem | Licença |
|---|---|---|---|
| `login-bg.png` / `login-bg.mp4` | `client/public/assets/ui/` | Trazidos pelo dono em 02/09 | **não registrada** |
| `login-music.mp3` — *The Old Forest* | `client/public/assets/ui/` | Trazida pelo dono em 02/09 | **não registrada** |

🔴 **As três não têm licença anotada, e a música é a mais séria delas.** Arte de
fundo passa despercebida; trilha sonora não — é o que mais dispara reclamação
automática, e ela toca na primeira tela que qualquer pessoa vê. **Só o dono sabe
de onde ela veio**, então só ele pode preencher esta linha.

⚠️ **O que já foi feito com os arquivos**, para o registro não se perder:

- O vídeo foi **refeito em vai-e-volta** e recomprimido: 8,4 MB → 2,6 MB, 5,17 s
  → 10,25 s, 2544 → 1920 de largura. É obra derivada do original.
- A música foi **reamostrada de 320 para 128 kbps** (22,9 MB → 9,2 MB) e teve os
  metadados removidos. O original de 320 kbps está em `assets/The Old Forest.mp3`
  na máquina do dono, mas ⚠️ **ele é ignorado pelo Git** (ver `.gitignore`): 23 MB
  de repositório por um arquivo que ninguém abre depois de convertido. **Quem
  clonar não recebe o original** — guardá-lo em outro lugar é com o dono.
- `login-music.m4a` são os 5,09 s de trilha **arrancados do próprio
  `login-bg.mp4`**, de quando não havia faixa nenhuma. Hoje é só a reserva para
  o caso de o `.mp3` faltar, e herda a licença do vídeo — seja ela qual for.
