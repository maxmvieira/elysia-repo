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

/*
 * 🔴 AUTO-LOGIN — TEMPORÁRIO, e some quando a fase de teste manual acabar.
 *
 * Nome da conta que entra SEM SENHA neste servidor. Existe porque o Vite
 * recarrega a página a cada edição do cliente, e redigitar a senha a cada
 * recarga inviabiliza testar a interface.
 *
 * Sobrescreva com `ELYSIA_DEV_ACCOUNT=outraconta npm run dev:test`, ou apague a
 * linha para exigir senha de novo.
 *
 * ⚠️ Só vale aqui. O servidor de verdade (`npm run dev` / `npm start`) não passa
 * por este arquivo, então nem `ELYSIA_DEV` nem esta linha existem lá.
 */
process.env.ELYSIA_DEV_ACCOUNT = process.env.ELYSIA_DEV_ACCOUNT ?? 'maxmurtesvieira';

await import('./index.js');
