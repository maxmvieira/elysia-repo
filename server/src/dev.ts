/**
 * Entrada do servidor em MODO DE TESTE (`npm run dev:test`).
 *
 * Só liga a flag e sobe o servidor normal. Com ela os comandos de chat de
 * desenvolvimento (/level, /sp, /gold, /heal) passam a funcionar, o que permite
 * testar conteúdo de nível alto sem farmar horas.
 *
 * O servidor de verdade (`npm run dev` / `npm start`) NÃO passa por aqui, então
 * os comandos ficam inertes — viram mensagem de chat comum.
 */
export {}; // marca o arquivo como módulo (habilita o await de topo)

process.env.ELYSIA_DEV = '1';

await import('./index.js');
