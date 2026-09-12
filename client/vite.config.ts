import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';

/**
 * 📸 **`POST /__captura` — grava um quadro/tira do jogo em disco.**
 *
 * 🔴 **Existe porque quase todo o trabalho deste projeto é VFX julgado em tela,
 * e não havia como olhar DEVAGAR.** O dono descreve o que viu (*"o estouro está
 * cortado nas laterais"*, *"a nuvem não precisa do meio pro fim"*) e a diferença
 * entre acertar e errar mora em 40 ms. Extrair quadro a quadro do jogo RODANDO é
 * a única forma de julgar o que a folha de contato não mostra — as partículas, o
 * tremor e o crescimento são desenhados por código, não existem em folha
 * nenhuma.
 *
 * ⚠️ **E os pixels precisam sair pelo DISCO, não pela tela.** Devolver a captura
 * como data URL para quem está pilotando o navegador custa megabytes de texto a
 * cada rodada; gravar em arquivo custa um caminho.
 *
 * 🔴 **É do servidor de DEV, e só existe enquanto ele roda** — não há build que
 * o publique. Ainda assim ele ESCREVE em disco, então o caminho é preso a
 * `.captura/` dentro do repositório: nome com `..` ou absoluto é recusado. Um
 * endpoint de escrita sem cerca é um buraco, mesmo em desenvolvimento.
 */
function capturaDeQuadros() {
  return {
    name: 'elysia-captura',
    configureServer(server: { middlewares: { use: (fn: unknown) => void } }) {
      const RAIZ = resolve(fileURLToPath(new URL('../.captura', import.meta.url)));
      server.middlewares.use((req: any, res: any, next: () => void) => {
        if (req.method !== 'POST' || !req.url?.startsWith('/__captura')) return next();
        const pedaços: Buffer[] = [];
        req.on('data', (d: Buffer) => pedaços.push(d));
        req.on('end', () => {
          try {
            const { nome, dataUrl } = JSON.parse(Buffer.concat(pedaços).toString());
            const destino = resolve(join(RAIZ, normalize(String(nome))));
            if (!destino.startsWith(RAIZ + '\\') && !destino.startsWith(RAIZ + '/')) {
              res.statusCode = 400;
              res.end('fora de .captura/');
              return;
            }
            mkdirSync(dirname(destino), { recursive: true });
            writeFileSync(destino, Buffer.from(String(dataUrl).split(',')[1]!, 'base64'));
            res.end(destino);
          } catch (err) {
            res.statusCode = 500;
            res.end(String(err));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [capturaDeQuadros()],
  resolve: {
    alias: {
      // Aponta o pacote compartilhado direto para o código-fonte TS,
      // para o Vite transpilar junto (sem etapa de build separada).
      '@dominion/shared': fileURLToPath(
        new URL('../shared/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    host: true, // expõe na LAN para você testar com seu irmão na mesma rede
    port: 5173,
    // Permite abrir por hostnames de túnel (trycloudflare.com, loca.lt etc.).
    allowedHosts: true,
    proxy: {
      // Encaminha o WebSocket do jogo pela MESMA porta/origem do site. Assim um
      // único túnel (porta 5173) leva site + multiplayer juntos, e sobre https
      // o navegador usa wss sem erro de "mixed content".
      '/ws': {
        target: 'ws://localhost:8080', // DEFAULT_SERVER_PORT
        ws: true,
      },
    },
  },
});
