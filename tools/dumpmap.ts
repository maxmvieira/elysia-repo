// Utilitário de dev: exporta o andar 0 do mundo como JSON, para gerar prévias
// de renderização fora do navegador. Não faz parte do jogo.
import { buildWorldMap } from '@dominion/shared';
import { writeFileSync } from 'node:fs';

const m = buildWorldMap();
const out = process.argv[2] ?? 'map.json';
writeFileSync(out, JSON.stringify({ width: m.width, height: m.height, floor0: m.floors[0] }));
console.log(`mapa exportado para ${out}`);
