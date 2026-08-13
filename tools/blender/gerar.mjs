/**
 * Roda os geradores do Blender em lote. `npm run models:build`.
 *
 * 🔴 POR QUE EXISTE UM RUNNER, e não "abra o Blender e exporte":
 *
 * É o mesmo motivo do `frames2strip.mjs` e do `tmx2world.mjs` — exportação
 * feita à mão erra em silêncio. A árvore que boiava acima da própria sombra
 * (05/08) e o quadro cuja sola não caía em `GROUND_Y` (10/08) foram os dois o
 * mesmo defeito: uma convenção que dependia de alguém lembrar. Aqui a
 * convenção está em `comum.py` e o runner a executa sempre igual.
 *
 * ⚠️ `--factory-startup` é obrigatório: sem ele o Blender carrega as
 * preferências do usuário, e aí o resultado depende da máquina de quem rodou.
 *
 * Uso:
 *   node tools/blender/gerar.mjs            # todos os modelos
 *   node tools/blender/gerar.mjs casa       # só os que casam com "casa"
 *   BLENDER="C:/.../blender.exe" node ...   # aponta o executável na mão
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..', '..');
const MODELOS = join(AQUI, 'modelos');

/**
 * Onde o Blender pode estar. A variável de ambiente vence tudo — é a saída
 * para quem instalou fora do padrão, e evita ter que editar este arquivo.
 */
function achaBlender() {
  if (process.env.BLENDER) {
    if (!existsSync(process.env.BLENDER)) {
      erro(`BLENDER aponta para algo que não existe: ${process.env.BLENDER}`);
    }
    return process.env.BLENDER;
  }
  const bases = [
    'C:/Program Files/Blender Foundation',
    'C:/Program Files (x86)/Blender Foundation',
    join(process.env.LOCALAPPDATA ?? '', 'Programs/Blender Foundation'),
    '/Applications/Blender.app/Contents/MacOS',
    '/usr/bin',
    '/usr/local/bin',
  ].filter(Boolean);

  for (const base of bases) {
    if (!existsSync(base)) continue;
    // Blender instala em "Blender X.Y/blender.exe"; pega a versão mais alta.
    const candidatos = [];
    for (const entrada of readdirSync(base, { withFileTypes: true })) {
      if (entrada.isDirectory()) {
        for (const exe of ['blender.exe', 'blender']) {
          const p = join(base, entrada.name, exe);
          if (existsSync(p)) candidatos.push(p);
        }
      } else if (entrada.name === 'blender' || entrada.name === 'blender.exe') {
        candidatos.push(join(base, entrada.name));
      }
    }
    if (candidatos.length > 0) {
      candidatos.sort();
      return candidatos[candidatos.length - 1];
    }
  }
  erro(
    'Blender não encontrado. Instale-o, ou aponte o executável:\n' +
      '  $env:BLENDER = "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe"',
  );
}

function erro(msg) {
  console.error(`\n[models] ${msg}\n`);
  process.exit(1);
}

const filtro = process.argv[2] ?? '';
const blender = achaBlender();
console.log(`[models] Blender: ${blender}`);

if (!existsSync(MODELOS)) erro(`pasta de geradores não existe: ${MODELOS}`);
const scripts = readdirSync(MODELOS)
  .filter((f) => f.endsWith('.py'))
  .filter((f) => f.includes(filtro))
  .sort();

if (scripts.length === 0) erro(`nenhum gerador casa com "${filtro}"`);

let falhas = 0;
for (const script of scripts) {
  const caminho = join(MODELOS, script);
  const r = spawnSync(blender, ['--background', '--factory-startup', '--python', caminho], {
    cwd: RAIZ,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  // O Blender é barulhento; só as linhas `ELYSIA` do `comum.py` interessam.
  const linhas = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.split(/\r?\n/);
  const relatorio = linhas.filter((l) => l.startsWith('ELYSIA '));
  const problemas = linhas.filter((l) => /Traceback|^\s+File "|Error:/.test(l));

  if (r.status !== 0 || relatorio.length === 0) {
    falhas++;
    console.error(`[models] ✗ ${script}`);
    for (const l of problemas.slice(0, 12)) console.error(`         ${l}`);
    continue;
  }

  const campos = Object.fromEntries(
    relatorio.map((l) => {
      const [k, ...resto] = l.replace('ELYSIA ', '').split('=');
      return [k, resto.join('=')];
    }),
  );
  console.log(
    `[models] ✓ ${campos.modelo}  ${campos.tamanho_tiles} tiles  ` +
      `${campos.altura_em_herois} heróis de altura  ${campos.triangulos} tri`,
  );
}

if (falhas > 0) erro(`${falhas} gerador(es) falharam.`);
console.log(`[models] ${scripts.length} modelo(s) em client/public/assets/models3d/`);
