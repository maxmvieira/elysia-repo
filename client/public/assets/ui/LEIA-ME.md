# Arte de interface

## `login-bg.png` — o cenário da tela de entrada

✅ **JÁ ESTÁ AQUI** (instalada em 02/09, 1672×941). O texto abaixo fica para
quem for TROCAR a arte.

**Solte o arquivo aqui com este nome exato e ele aparece.** Nada mais precisa
mudar: o CSS já aponta para `/assets/ui/login-bg.png`.

⚠️ Sem o arquivo a tela **continua funcionando** — o `#loginbg` cai num gradiente
escuro e todo o resto (lore, login, servidor) segue no lugar. É encaixe vazio, e
não dependência quebrada.

Recomendações, pelo que o layout espera:

- **Paisagem larga**, algo como 1920×1080. O CSS usa `cover`, então o corte
  acontece nas bordas — não ponha nada essencial nos cantos.
- **Meio escuro ou com o centro calmo**: o cartão de login fica no centro, e há
  um véu escuro por cima da arte para o texto ler. Uma imagem muito clara no meio
  briga com as letras mesmo com o véu.

## `login-bg.mp4` — o vídeo de fundo

✅ **JÁ ESTÁ AQUI**, e foi **refeito em 02/09 (noite)**. Leia isto antes de
trocá-lo, porque o formato dele não é livre.

🔴 **Ele é um VAI-E-VOLTA, e é isso que faz o laço não ter emenda.** O clipe
original era um empurrão de câmera de 5,17 s: abria largo e fechava no pé da
Árvore. Em laço, ele pulava do fechado de volta para o largo a cada cinco
segundos — um talho impossível de esconder. Tentar dissolvência foi pior: cruzar
um quadro largo com um fechado sobrepõe duas escalas da mesma imagem, e o que
sai é fantasma, não transição.

O arquivo de hoje tem os 124 quadros de ida **seguidos dos mesmos 122 de volta**,
sem repetir as pontas: 246 quadros, 10,25 s. A câmera fecha e abre, e o último
quadro é vizinho do primeiro. **A emenda sumiu do arquivo**, então o `loop`
comum do navegador basta e não há transição nenhuma no código.

⚠️ **Se um dia trocar o vídeo, ou ele já loopa sozinho, ou tem de passar pelo
mesmo tratamento** — senão o talho volta. O comando foi:

```
ffmpeg -i entrada.mp4 -filter_complex \
  "[0:v]split[a][b];[b]reverse,trim=start_frame=1:end_frame=123,setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1,scale=1920:-2[out]" \
  -map "[out]" -an -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart saida.mp4
```

(`end_frame` é a contagem de quadros do original; ajuste com `ffprobe`.)

⚠️ Refazer também **cortou peso: 8,4 MB → 2,6 MB**, com o dobro da duração. O
`-an` é de propósito — a trilha agora mora no `.m4a` abaixo. E 1920 de largura
sobra: o vídeo aparece sob um véu escuro, e os 2544 do original não chegavam a
ser vistos.

## `login-music.mp3` — a música (*The Old Forest*)

✅ **JÁ ESTÁ AQUI** (o dono trouxe em 02/09). São **10 minutos**. Para trocar a
música é só trocar este arquivo — nada no código precisa mudar.

⚠️ **Ela foi reamostrada de 320 para 128 kbps na entrada: 22,9 MB → 9,2 MB.** O
original está guardado em `assets/The Old Forest.mp3`. 320 kbps é taxa de faixa
para se ouvir de perto; esta toca **a 10 % de volume atrás de uma tela de login**,
onde a diferença não é audível e os 13 MB a mais seriam banda do jogador.

🔴 **O tamanho do arquivo não é o que o jogador baixa.** O `<audio>` nasce em
`preload="metadata"`: pega só a duração e depois streama conforme toca, ou seja,
gasta pelo tempo que a pessoa realmente ficar na tela — uns 16 KB/s. Quem fica um
minuto baixa cerca de 1 MB, não 9.

Se for trocar a faixa:

- **Que comece e termine parecidas** — as duas pontas se cruzam no laço, numa
  travessia de 0,9 s.
- **mp3** (a ordem de busca está em `TRILHAS`, no `client/src/main.ts`).
- **Sem pico no primeiro segundo**: a música entra por uma rampa de subida, e um
  ataque forte atravessaria ela.
- **128 kbps chega**, pelo motivo acima.
- O volume padrão é **10 %**, e o jogador regula no controle ao lado do
  alto-falante. Masterize pensando que ela toca baixa.
- ⚠️ **Anote a licença no `CREDITS.md`.** A desta ainda está em branco, e trilha
  sonora é o tipo de asset que mais dispara reclamação automática.

## `login-music.m4a` — a reserva

São os **5,09 s** de trilha arrancados do próprio `login-bg.mp4`, de quando não
havia faixa nenhuma. **Não é para tocar**: só entra se o `.mp3` sumir ou vier
corrompido, e aí a tela repete cinco segundos em vez de ficar muda. 81 KB.

⚠️ Se um dia o `.mp3` faltar, o console mostra **um erro de mídia** — é a
tentativa que falha e cai para cá. Em desenvolvimento não aparece um 404: o Vite
responde 200 com o `index.html` para qualquer caminho que não exista, e quem
recusa é o próprio `<audio>`, por formato.
