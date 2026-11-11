// Измеритель сложности улицы. Решает улицу «как человек»: смотрит на клетку и её соседей и вычёркивает
// повороты, которые точно не подходят (труба упирается в край, в камень или в чужую сеть, либо некуда выйти).
// Так повторяется волнами, пока что-то вычёркивается.
//   waves  — сколько волн рассуждений понадобилось (длина цепочки «раз тут так, значит там так»);
//   guess  — сколько труб осталось неясными после всех волн: тут нужно думать на несколько шагов вперёд;
//   sols   — сколько у улицы решений (1 или «2+»);
//   score  — общая оценка сложности, по ней подбираются зёрна (см. docs/plan-100.md).
// Запуск: node tools/rate.js            — таблица по всем улицам игры
//         node tools/rate.js find '{"w":6,"h":8,"nets":["w","e"],"bridges":1}' 40 55 [сколько] [с какого зерна]
//                                       — подобрать зёрна с оценкой от 40 до 55
import { BIT, DX, DY, opp, rotM, evaluate, generate, isLeaf } from '../js/core.js';
import { LEVELS } from '../js/levels.js';

// Что клетка «показывает» соседу со стороны d при повороте r: имя сети или '' (стенка).
const face = (c, r, d) => { for (const s of c.segs) if (rotM(s.mask, r) & BIT[d]) return s.net; return ''; };
const sig = (c, r) => [0, 1, 2, 3].map(d => face(c, r, d)).join('|');

// turn: какие клетки можно крутить — 'pipe' (как сейчас), 'leaf' (ещё и вводы домов, фонарей, теплиц), 'all' (ещё и источники).
export function rate(L, turn = L.turn || 'pipe') {
  const { W, H, cells } = L, at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? null : cells[y * W + x];
  // варианты поворота каждой клетки (одинаковые по виду считаются одним)
  const cand = cells.map(c => {
    const can = c.type === 'pipe' ? !c.locked : isLeaf(c.type) ? turn !== 'pipe' : c.type === 'src' && turn === 'all';
    if (!can) return [0];
    const seen = new Set(), out = [];
    for (let r = 0; r < 4; r++) { const k = sig(c, r); if (!seen.has(k)) { seen.add(k); out.push(r); } }
    return out;
  });
  const free = cells.filter((c, i) => cand[i].length > 1).length;
  const prune = cd => { // одна волна; возвращает число вычеркнутых вариантов, −1 — тупик
    let cut = 0; const next = cd.map(a => a.slice());
    for (let i = 0; i < cells.length; i++) {
      if (cd[i].length < 2) continue;
      const c = cells[i];
      next[i] = cd[i].filter(r => [0, 1, 2, 3].every(d => {
        const f = face(c, r, d), n = at(c.x + DX[d], c.y + DY[d]);
        if (!n) return f === '';
        const j = n.y * W + n.x;
        return cd[j].some(q => face(n, q, opp(d)) === f);
      }));
      cut += cd[i].length - next[i].length;
      if (!next[i].length) return { cut: -1, next };
    }
    return { cut, next };
  };
  const settle = cd => { let waves = 0; for (;;) { const p = prune(cd); if (p.cut < 0) return null; if (!p.cut) return { cd, waves }; cd = p.next; waves++; } };
  const first = settle(cand);
  const guess = first.cd.filter(a => a.length > 1).length;
  // перебор оставшегося: считаем решения (до двух) и глубину перебора
  let sols = 0, nodes = 0;
  const solved = cd => { const T = { W, H, nets: L.nets, src: L.src, cells: cells.map((c, i) => ({ ...c, segs: c.segs.map(s => ({ ...s })), rot: cd[i][0] })) }; return evaluate(T).solved; };
  const dfs = cd => {
    if (sols > 1 || nodes > 20000) return;
    nodes++;
    const s = settle(cd); if (!s) return;
    let k = -1, best = 9; s.cd.forEach((a, i) => { if (a.length > 1 && a.length < best) { best = a.length; k = i; } });
    if (k < 0) { if (solved(s.cd)) sols++; return; }
    for (const r of s.cd[k]) { const n = s.cd.map(a => a.slice()); n[k] = [r]; dfs(n); }
  };
  dfs(cand);
  const waves = first.waves;
  // оценка: размер задачи + длина цепочек + «слепые» места (самый тяжёлый вклад)
  const score = Math.round(free * 0.5 + waves * 2 + guess * 4 + (nodes > 1 ? Math.min(20, Math.log2(nodes) * 3) : 0));
  return { free, waves, guess, sols: sols > 1 ? '2+' : String(sols), nodes, score };
}

const fmt = (i, c, g, r) => `${String(i).padStart(3)} ${(c.name || '').padEnd(12)} ${g.W}×${g.H} ${c.nets.join('+').padEnd(6)} ходов ${String(g.minTaps).padStart(2)} лимит ${String(g.limit).padStart(2)} | труб ${String(r.free).padStart(2)} волн ${String(r.waves).padStart(2)} неясных ${String(r.guess).padStart(2)} решений ${r.sols.padEnd(2)} | сложность ${r.score}`;

if (process.argv[1] && process.argv[1].endsWith('rate.js')) {
  if (process.argv[2] === 'find') {
    const base = JSON.parse(process.argv[3]), lo = +process.argv[4], hi = +process.argv[5], want = +(process.argv[6] || 5), from = +(process.argv[7] || 1);
    let found = 0;
    for (let seed = from; seed < from + 4000 && found < want; seed++) {
      const c = { ...base, seed }, g = generate(c); if (!g || g.attempts > 60) continue;
      const cons = {}; for (const x of g.cells) if (isLeaf(x.type)) cons[x.segs[0].net] = (cons[x.segs[0].net] || 0) + 1;
      const v = c.nets.map(n => cons[n] || 0);
      if (Math.min(...v) < 3 || Math.max(...v) > 2 * Math.min(...v) + 1) continue; // сети примерно равные
      const r = rate(g, base.turn); if (r.score < lo || r.score > hi) continue;
      console.log(fmt(seed, { ...c, name: 'seed ' + seed }, g, r)); found++;
    }
    if (!found) console.log('ничего не найдено — расширь границы сложности');
  } else LEVELS.forEach((c, i) => { const g = generate(c); console.log(fmt(i + 1, c, g, rate(g, process.argv[2]))); });
}
