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
