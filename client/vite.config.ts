import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
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
