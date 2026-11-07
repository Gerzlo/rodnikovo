// Проверка генератора улиц: все улицы игры и сотни случайных настроек.
// У каждой улицы должно быть решение, а перемешанная улица не должна быть решена сразу.
// Запуск: npm run test:gen   (число случайных настроек можно передать: node tests/generator.test.js 2000)
import { generate, evaluate, mulberry32 } from '../js/core.js';
import { LEVELS } from '../js/levels.js';

const N = +(process.argv[2] || 600);
const clone = o => JSON.parse(JSON.stringify(o));
let bad = 0;

function verify(g, cfg) {
  const solved = clone(g); for (const c of solved.cells) c.rot = 0;
  return evaluate(solved).solved && !evaluate(clone(g)).solved && g.minTaps > 0 && g.limit > g.minTaps &&
    g.bridges === (cfg.bridges || 0) && g.doubles === (cfg.doubles || 0);
}

// 1) улицы игры
LEVELS.forEach((cfg, i) => {
  const g = generate(cfg);
  if (!g || !verify(g, cfg)) { console.log(`FAIL улица ${i + 1} «${cfg.name}» не собирается или собирается неверно`); bad++; }
});
console.log(`Улицы игры: ${LEVELS.length - bad} из ${LEVELS.length} в порядке`);

// 2) случайные настройки
const R = mulberry32(2026), groups = {};
let built = 0;
for (let k = 0; k < N; k++) {
  const two = R() < 0.6;
  const w = two ? 5 + Math.floor(R() * 3) : 4 + Math.floor(R() * 4);
  const h = two ? 5 + Math.floor(R() * 4) : 4 + Math.floor(R() * 5);
  const cfg = { w, h, nets: two ? ['w', 'e'] : ['w'], seed: 1 + Math.floor(R() * 1e6), blocks: Math.floor(R() * 3), locked: Math.floor(R() * 3) };
  if (two) { cfg.bridges = Math.floor(R() * 3); cfg.doubles = Math.floor(R() * 3); }
  const key = two ? `вода+свет, мостиков ${cfg.bridges}, двойных ${cfg.doubles}` : 'только вода';
  const gr = groups[key] || (groups[key] = { ok: 0, n: 0, ms: [] });
  const t = process.hrtime.bigint();
  const g = generate(cfg);
  gr.ms.push(Number(process.hrtime.bigint() - t) / 1e6);
  gr.n++;
  if (!g) continue; // не собралась — это ограничение настроек, а не ошибка
  if (!verify(g, cfg)) { bad++; console.log('FAIL неверная улица:', JSON.stringify(cfg)); continue; }
  gr.ok++; built++;
}
console.log(`Случайные настройки: собрано ${built} из ${N}`);
for (const [k, g] of Object.entries(groups).sort()) {
  const s = g.ms.slice().sort((a, b) => a - b);
  console.log(`  ${k.padEnd(34)} ${String(g.ok).padStart(3)}/${String(g.n).padEnd(3)}  среднее ${(s.reduce((a, b) => a + b, 0) / s.length).toFixed(1)} мс, максимум ${s[s.length - 1].toFixed(0)} мс`);
}
if (bad) { console.log(`\nОШИБКА: неверных улиц — ${bad}`); process.exitCode = 1; }
else console.log('\nГенератор в порядке');
