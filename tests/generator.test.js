// Проверка генератора улиц: все улицы игры и сотни случайных настроек.
// У каждой улицы должно быть решение, а перемешанная улица не должна быть решена сразу.
// Запуск: npm run test:gen   (число случайных настроек можно передать: node tests/generator.test.js 2000)
import { generate, evaluate, mulberry32, tapsToSolve, isStuck } from '../js/core.js';
import { LEVELS } from '../js/levels.js';
import { createHash } from 'node:crypto';

const N = +(process.argv[2] || 600);
const clone = o => JSON.parse(JSON.stringify(o));
let bad = 0;

function verify(g, cfg) {
  const solved = clone(g); for (const c of solved.cells) c.rot = 0;
  return evaluate(solved).solved && !evaluate(clone(g)).solved && g.minTaps > 0 && g.limit > g.minTaps &&
    g.bridges === (cfg.bridges || 0) && g.doubles === (cfg.doubles || 0) && g.turn === (cfg.turn || 'pipe') &&
    // ржавых труб столько, сколько просили; поворотов каждой хватает, но не больше чем на один лишний
    g.cells.filter(c => c.left != null).length === (cfg.rusty || 0) && !isStuck(g) &&
    g.cells.every(c => c.left == null || (c.type === 'pipe' && !c.locked && tapsToSolve(c) > 0 && c.left - tapsToSolve(c) <= 1)) &&
    g.limit - g.minTaps === Math.max(3, Math.ceil(g.minTaps * (cfg.slack || 0.35)));
}

// 1) улицы игры
LEVELS.forEach((cfg, i) => {
  const g = generate(cfg);
  if (!g || !verify(g, cfg)) { console.log(`FAIL улица ${i + 1} «${cfg.name}» не собирается или собирается неверно`); bad++; }
});
console.log(`Улицы игры: ${LEVELS.length - bad} из ${LEVELS.length} в порядке`);
// Готовые улицы не должны меняться: у игроков на них уже есть звёзды. Отпечаток считается по первым DONE улицам.
// После добавления главы: увеличить DONE и вписать новый отпечаток (он печатается ниже).
const DONE = 40, PRINT = 'e91a66f45dcead6b';
{
  const h = createHash('sha1');
  for (let i = 0; i < DONE; i++) h.update(JSON.stringify(generate(LEVELS[i]).cells.map(c => [c.type, c.rot, c.locked ? 1 : 0, c.left ?? -1, c.segs.map(s => s.net + s.mask)])));
  const got = h.digest('hex').slice(0, 16);
  if (got !== PRINT) { console.log(`FAIL улицы 1–${DONE} изменились: отпечаток ${got}, ожидался ${PRINT}`); bad++; }
  else console.log(`Улицы 1–${DONE} не изменились (отпечаток ${got})`);
}

// 2) случайные настройки
const R = mulberry32(2026), groups = {};
let built = 0;
const PAIRS = [['w', 'e'], ['w', 'g'], ['e', 'g']], WORD = { w: 'вода', e: 'свет', g: 'газ' };
for (let k = 0; k < N; k++) {
  const r = R(), nets = r < 0.25 ? ['w'] : r < 0.65 ? PAIRS[Math.floor(R() * 3)] : ['w', 'e', 'g'];
  const many = nets.length > 1;
  const w = many ? 5 + Math.floor(R() * 2) : 4 + Math.floor(R() * 3);
  const h = many ? 5 + Math.floor(R() * 4) : 4 + Math.floor(R() * 5);
  const cfg = { w, h, nets, seed: 1 + Math.floor(R() * 1e6), blocks: Math.floor(R() * 3), locked: Math.floor(R() * 3) };
  if (many) { cfg.bridges = Math.floor(R() * 3); cfg.doubles = Math.floor(R() * 3); }
  if (R() < 0.35) cfg.rusty = 1 + Math.floor(R() * 6);
  if (R() < 0.4) { cfg.turn = 'leaf'; cfg.slack = 0.15 + R() * 0.2; } // поворотные вводы и свой запас ходов
  const key = nets.map(n => WORD[n]).join('+') + (many ? `, мостиков ${cfg.bridges}, двойных ${cfg.doubles}` : '') + (cfg.turn ? ', вводы' : '') + (cfg.rusty ? ', ржавые' : '');
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
  console.log(`  ${k.padEnd(48)} ${String(g.ok).padStart(3)}/${String(g.n).padEnd(3)}  среднее ${(s.reduce((a, b) => a + b, 0) / s.length).toFixed(1)} мс, максимум ${s[s.length - 1].toFixed(0)} мс`);
}
if (bad) { console.log(`\nОШИБКА: неверных улиц — ${bad}`); process.exitCode = 1; }
else console.log('\nГенератор в порядке');
