/**
 * Grava as folhas da Nevasca que vieram prontas em base64 (trazidas pelo dono
 * em 11/09, geradas fora do projeto).
 *
 * ⚠️ **Só existem DUAS das três.** O atlas `nevoa_base.json` aponta para
 * `nevoa_base_sheet.png`, e nenhum script gera esse arquivo — ver a conferência
 * no histórico do dia.
 */
import fs from 'node:fs';
import path from 'node:path';

const ASSETS_DIR = path.resolve('client/public/assets/spells');
fs.mkdirSync(ASSETS_DIR, { recursive: true });

// 1. Gelo Grande (288x48px - 6 frames)
const b64GeloGrande = 'iVBORw0KGgoAAAANSUhEUgAAASAAAAAwCAYAAACxIqevAAAABHNCSVQICAgIfAhkiAAAAL96VFh0UmF3IHByb2ZpbGUgdHlwZSBBUFAxAAAYlX1PUQ7DIAj99xQ9whMU9ThmcUuTZVt6/49h1bYmyyACvvB4YB7lVbb1tny29319FrNUI8C45BJlABHNGLAEW7PGZj2z1UpJCP1PLUuKAe7SlzGZ1w5hsUFfI9SQ2hw3ZJnUdUbGL23UJS8aNCqecT5EZzznwcuukqnjcdx9nM9JnDBDrNZ+3ytwEM8kxInx38dyuy6d9/nKjR2b77Z8bg3zBeBBVfKp/hePAAAD4UlEQVR4nO3dP27bMBiHYanoEVwgXbPUR0h9h045gD0VypaxR8iYLUYn5QCdcgcnR3AXrw3g3IEdYrYMI1myxD8fqfcBAhSIbFG2+Av5SVSLAgAAAAAAAJiws4tKxW4DkLMPsRsAYLq8B9Bivc1iFJHLcQCSeA+g75dffO8CQKK8BhA1FADHBKkBMX0B0IQiNIBovAUQ0y9g2vpkgPcR0HLmew8A2sQcCDw/rcuubYJNwVKsA/X5AAHJpJ/DXgLITN37Fx97CGux3qpdfRu7GYOog9jtQD8p/qEegyJ0T+er69hNQGShwmFKIeQ8gHIrPtd7Rg+YViiEFHQExJeI1Pk8h833nkpf+Ri7AZLlNprLUb1XavWp9FpoDREGeh+bai66aKwt1lvloq1OA4gOK8tUpo++QyhEKMQMniFh4qq9FKFb6DBdzv4vqJ3KsDiUsQGpX5/SvWYS/yjEDL/gAUQnRlG47Yj3LzI7dhPf08XUOA0g6Tc9QY6URi19pRKCkjAFa0Aty696r5S+QXVop216XewAYHRzuuBXwVKp8rdxVf33ze6MIa4W9eEiJPR7SDienIU4Z5wH0PPTukx5BJFy21Ngn9D1XqljJ7pSSpXl298RPGGE+Jy5DwhRdZ3kdvggL15qQG3FaOlTl2OjH/PZ1lzJi0PaotrYNaccUISGOG1BI2005GKKMvUQI4AOcqr9tJ3UqZzs0oLGp1j1LJej+DHv5S2A7GmY9OlXk5uHu9hNALxw2R/HvBcjoIGoAw2T0ueW06hYKgLooOsu7p+/fodqyihdHTxWACzWWxVyVflYhE8YXi/Dv3bquyRu3DuVpGMyO92uvi2Ky/ap466+fbO97+OIEXhjH20hLXzOLirVd5nTKdtK4L2hqdw5rJkn383DXbGcvS52tEdAUo7Jfl61XbfSa67MZ3P/+Hb179/nq+tgxxIq+OzQGxNEEjqzeU5KaM8Y9mfqfQompaO6JOWYusKnjbmdPSLyaVPNS/3Zhdinub8hpHV2ae0Zwj4GakCWpi9ZYv1naPg0bR8yhIqifzAow5B9DGudTDmETxOWYpxI2on957Ff8DQ9/mJ5eO3nr1fvfynA0PuBpH1HY+UaPkVBACVPh0fbCKipBqSZtSAgBqZgDVJYy7ap5qX5f5WdGiaxCtGAiRFQwjbVvDRrQTpUjtWD7KBKKXz01aCcpyRTwxd5RL1XShegJXfSd/cBdTBHTtKOqytkCKG88CW20As3UwggU5+rWdKPpelGQDNwpNyfA3iX0tqlXJxdVEr/HNsmZJu6nNoeae2HQKHWL+E9OigAAAAAAE79BWW6DfSt7GfFAAAAAElFTkSuQmCC';
fs.writeFileSync(path.join(ASSETS_DIR, 'gelo_grande_sheet.png'), Buffer.from(b64GeloGrande, 'base64'));

// 2. Partículas Menores / Centelhas (96x16px - 6 frames)
const b64Particulas = 'iVBORw0KGgoAAAANSUhEUgAAAGAAAAAQCAYAAADpunr5AAAAkUlEQVR4nO2W0QnAIAxEpSM5okM4mEO4xvlRAqXQDxMlptz7FJMcZ6KmRAghhBxK7YC3hp1c3gJ2kEv79aFNYTVDOwHvOMskuU6hl4FSGwC0GqS2RsMRV18uDbXrDJBYAFM5ar/3S6zwXJ/RAdiMtDZgLk3dQEsERJ2Ar1zhiPwGhDV9JStN4O9IAbuQEEK2MQC0EqgU3lHKCwAAAABJRU5ErkJggg==';
fs.writeFileSync(path.join(ASSETS_DIR, 'particulas_menores_sheet.png'), Buffer.from(b64Particulas, 'base64'));

console.log('Sprites exportados em client/public/assets/spells com sucesso!');
