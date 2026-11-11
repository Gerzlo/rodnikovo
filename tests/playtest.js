// Автотест «Родниково» в браузере: играет как человек — касаниями по экрану — и проверяет сценарии.
// Запуск: npm run test:play. Скриншоты — в папке test-results/.
// Известные проблемы (запланированы на следующие этапы) помечаются «ИЗВ.» и не валят прогон.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.js';
import { mulberry32 } from '../js/core.js';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'test-results');
fs.mkdirSync(OUT, { recursive: true });
const SAVE_KEY = 'rodnikovo-save-1';
const ALL_BUT_LAST = JSON.stringify({ stars: [...Array(19).fill(3), 0] }); // открыта последняя, самая большая улица
const LEAF = { w: 'house', e: 'lamp', g: 'greenhouse' };
// Известные проблемы: { ключ: 'когда исправим' }. Сейчас таких нет.
const KNOWN = {};

const results = [];
function check(name, ok, info = '', known = '') {
  const status = ok ? 'ok' : known ? 'known' : 'fail';
  results.push({ name, status, info, known });
  const mark = ok ? '  ok ' : known ? 'ИЗВ. ' : 'FAIL ';
  console.log(`${mark} ${name}${info ? ' — ' + info : ''}${!ok && known ? ` (известно: ${known})` : ''}`);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const H = (page, fn, ...args) => page.evaluate(([f, a]) => window.__rodnikovo[f](...a), [fn, args]);

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const where = ((m.location() && m.location().url) || '') + ' ' + m.text();
    if (/fonts\.(googleapis|gstatic)\.com|ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED/.test(where)) return; // шрифты недоступны без интернета
    errors.push('console: ' + m.text());
  });
  return errors;
}
const box = page => page.locator('#cv').boundingBox();
async function press(page, sel, mode) { if (mode === 'mouse') await page.click(sel); else await page.tap(sel); }
async function tapCell(page, lv, c, mode, button) {
  const b = await box(page);
  const x = b.x + lv.board.x + (c.x + 0.5) * lv.board.S, y = b.y + lv.board.y + (c.y + 0.5) * lv.board.S;
  if (mode === 'mouse') await page.mouse.click(x, y, button ? { button } : undefined);
  else await page.touchscreen.tap(x, y);
}
// Решает улицу: нажимает каждую трубу столько раз, сколько нужно. extra — лишние нажатия (полный оборот одной трубы).
async function solve(page, mode, extra = 0) {
  const lv = await H(page, 'level');
  if (extra) { const c = lv.cells.find(c => c.type === 'pipe' && !c.locked); for (let k = 0; k < extra; k++) await tapCell(page, lv, c, mode); }
  for (const c of lv.cells) for (let k = 0; k < c.taps; k++) await tapCell(page, lv, c, mode);
  await sleep(150);
  return H(page, 'level');
}
const overlay = async page => ((await page.isVisible('#ov')) ? page.textContent('#ovT') : null);
async function startIntroIfAny(page, mode) {
  await sleep(200);
  if ((await overlay(page)) && (await page.textContent('#ovB1')) === 'Начать') await press(page, '#ovB1', mode);
  await sleep(350);
}
async function openFromMap(page, mode) { await press(page, '#btnPlay', mode); await startIntroIfAny(page, mode); }
// Провести пальцем по экрану (касание через протокол Chrome: Playwright умеет только тап).
// В конце палец замирает, чтобы карта не уехала по инерции.
const cdps = new WeakMap();
async function swipe(page, x, y0, y1, steps = 8) {
  if (!cdps.has(page)) cdps.set(page, await page.context().newCDPSession(page));
  const cdp = cdps.get(page), T = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: y == null ? [] : [{ x, y }] });
  await T('touchStart', y0);
  for (let k = 1; k <= steps; k++) { await T('touchMove', y0 + (y1 - y0) * k / steps); await sleep(16); }
  await sleep(130); await T('touchEnd'); await sleep(120);
}
// Улица на карте: если точка за краем экрана — прокручиваем карту пальцем, потом нажимаем.
async function showNode(page, i) {
  for (let t = 0; t < 10; t++) {
    const n = (await H(page, 'mapNodes'))[i];
    if (n.vis) return n;
    const b = await box(page), dy = Math.max(-b.height * 0.6, Math.min(b.height * 0.6, b.height / 2 - n.y));
    await swipe(page, b.x + b.width * 0.12, b.y + b.height / 2 - dy / 2, b.y + b.height / 2 + dy / 2);
  }
  return (await H(page, 'mapNodes'))[i];
}
async function tapNode(page, i) {
  const n = await showNode(page, i), b = await box(page);
  await page.touchscreen.tap(b.x + n.x, b.y + n.y);
  await startIntroIfAny(page, 'touch');
}
async function winStars(page) {
  await page.waitForSelector('#ov:not([hidden])', { timeout: 8000 });
  return page.$$eval('#ovStars span:not(.off)', e => e.length);
}
const wrongCount = lv => lv.cells.filter(c => c.taps > 0).length;

const server = await serve();
const URL = server.url + 'index.html?lang=ru'; // тесты сверяют русские надписи; английский проверяется отдельно ниже
const guard = setTimeout(() => { console.error('ТЕСТ ЗАВИС: больше 12 минут'); process.exit(1); }, 12 * 60 * 1000);
guard.unref();

try {
  const browser = await chromium.launch();
  const T = Date.now();

  /* 1. Телефон: все улицы подряд, как новый игрок */
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await page.goto(URL); await sleep(800);
  check('Карта открывается', (await H(page, 'screen')) === 'map');
  {
    // Режим «На экран Домой» на iPhone здесь не воспроизвести — проверяем, что защита от залипшего масштаба на месте.
    const vp = await page.getAttribute('meta[name="viewport"]', 'content');
    check('Масштаб страницы заблокирован (для iPhone «На экран Домой»)', /maximum-scale=1(,|$)/.test(vp) && /user-scalable=no/.test(vp), vp);
  }
  await page.screenshot({ path: `${OUT}/01-map-start.png` });
  {
    const n = (await H(page, 'mapNodes'))[3], b = await box(page);
    await page.touchscreen.tap(b.x + n.x, b.y + n.y); await sleep(150);
    const t = (await page.isVisible('#toast')) ? await page.textContent('#toast') : '';
    check('Закрытая улица не открывается и объясняет почему', (await H(page, 'screen')) === 'map' && t.startsWith('Сначала'), t);
  }
  {
    // Карта длиннее экрана: тянем пальцем вниз — открывается верхняя часть посёлка. Сдвиг пальца — не нажатие.
    const b = await box(page), n0 = (await H(page, 'mapNodes'))[0], cy0 = await H(page, 'mapScroll');
    await swipe(page, b.x + n0.x, b.y + n0.y, b.y + n0.y + b.height * 0.5);
    const cy1 = await H(page, 'mapScroll');
    check('Карта прокручивается пальцем', cy1 < cy0 - 100, `верх экрана на карте: ${Math.round(cy0)} → ${Math.round(cy1)}`);
    check('Палец начал на открытой улице и сдвинулся — улица не открывается', (await H(page, 'screen')) === 'map' && !(await page.isVisible('#ov')));
    const nLast = await showNode(page, (await H(page, 'stars')).length - 1);
    check('Прокруткой можно добраться до последней улицы', nLast.vis);
    await page.screenshot({ path: `${OUT}/03-map-top.png` });
    check('Текущая улица за краем экрана → появляется кнопка «К ул. 1»', await page.isVisible('#btnJump'), await page.textContent('#btnJump'));
    await page.tap('#btnJump'); await sleep(900);
    check('Кнопка «К ул. 1» возвращает карту к текущей улице', (await H(page, 'mapNodes'))[0].vis && !(await page.isVisible('#btnJump')));
  }
  {
    await page.tap('#btnSound'); await sleep(100);
    const off = await page.evaluate(() => localStorage.getItem('rodnikovo-sound'));
    await page.tap('#btnSound'); await sleep(100);
    check('Кнопка звука выключает и включает звук, выбор запоминается', off === '0' && (await page.evaluate(() => localStorage.getItem('rodnikovo-sound'))) === '1');
  }
  const total = (await H(page, 'stars')).length;
  for (let i = 0; i < total; i++) {
    // первая улица — кнопкой «Играть», дальше улицы открываются сами после кнопки «Дальше»
    if (i === 0) await openFromMap(page, 'touch');
    else { for (let k = 0; k < 40 && (await H(page, 'screen')) !== 'level' && !(await overlay(page)); k++) await sleep(100); await startIntroIfAny(page, 'touch'); }
    let lv = await H(page, 'level');
    const street = (await page.textContent('#tTitle')).replace('ул. ', '');
    check(`Ул. ${i + 1} «${street}» открылась`, lv && lv.index === i && lv.moves === 0 && lv.state === 'play' && !lv.solved,
      lv ? `${lv.W}×${lv.H}, минимум ${lv.minTaps} ходов, лимит ${lv.limit}` : 'нет уровня');
    {
      const bad = lv.nets.filter(n => lv.cells.filter(c => c.type === 'src' && c.net === n).length !== 1 || lv.cells.filter(c => c.type === LEAF[n]).length < 2);
      check(`Ул. ${i + 1}: у каждой сети (${lv.nets.join('+')}) один источник и не меньше двух потребителей`, bad.length === 0, bad.join(','));
    }
    const isObj = c => c.locked || c.type === 'house' || c.type === 'lamp' || c.type === 'greenhouse' || c.type === 'src';
    const fixed = lv.cells.filter(c => isObj(c) && !c.turns).slice(0, 5);
    for (const c of fixed) await tapCell(page, lv, c, 'touch');
    check(`Ул. ${i + 1}: источники, трубы с замком${lv.turn === 'leaf' ? '' : ' и дома'} не крутятся и ходы не тратят`, (await H(page, 'level')).moves === 0);
    if (lv.turn === 'leaf') {
      const leaf = lv.cells.find(c => c.turns && c.type !== 'pipe');
      for (let k = 0; k < 4; k++) await tapCell(page, lv, leaf, 'touch');
      const m = (await H(page, 'level')).moves;
      await page.tap('#btnRestart'); await sleep(300);
      check(`Ул. ${i + 1}: поворотный ввод крутится и тратит ход`, !!leaf && m === 4, `ходов ${m}`);
    }
    if ([0, 5, 7, 8, 12, 15, 19, 20, 25, 29].includes(i)) await page.screenshot({ path: `${OUT}/s${String(i + 1).padStart(2, '0')}-start.png` });
    lv = await solve(page, 'touch');
    check(`Ул. ${i + 1}: решена за минимум ходов`, lv.state === 'won' && lv.solved && lv.moves === lv.minTaps, `ходов ${lv.moves}`);
    if ([12, 15, 20, total - 1].includes(i)) { await sleep(1000); await page.screenshot({ path: `${OUT}/s${String(i + 1).padStart(2, '0')}-solved.png` }); }
    const st = await winStars(page), title = await page.textContent('#ovT');
    check(`Ул. ${i + 1}: окно победы, 3 звезды`, st === 3 && title.includes(street), title);
    const b1 = await page.textContent('#ovB1');
    await page.tap('#ovB1'); await sleep(400);
    check(`Ул. ${i + 1}: результат сохранён, кнопка «${b1}» ведёт на карту`, b1 === (i < total - 1 ? 'Дальше' : 'На карту') && (await H(page, 'screen')) === 'map' && (await H(page, 'stars'))[i] === 3);
  }
  await sleep(1700);
  await page.screenshot({ path: `${OUT}/02-map-done.png` });

  /* 2. Проигрыш, «+5 ходов», «Заново», звёзды за лишние ходы */
  await tapNode(page, 2);
  {
    const lv = await H(page, 'level');
    check('Пройденную улицу можно переиграть с карты', lv.index === 2 && lv.moves === 0 && lv.state === 'play');
    const c = lv.cells.find(c => c.type === 'pipe' && !c.locked && c.taps > 0);
    for (let k = 0; k < lv.limit; k++) await tapCell(page, lv, c, 'touch');
    await sleep(900);
    const t = await overlay(page);
    check('Ходы кончились → окно «Ходы закончились»', t === 'Ходы закончились', String(t));
    await page.screenshot({ path: `${OUT}/31-fail.png` });
    await page.tap('#ovB1'); await sleep(1100);
    const l2 = await H(page, 'level');
    check('«+5 ходов» даёт 5 ходов, игра продолжается', l2.state === 'play' && l2.limit === lv.limit + 5 && l2.moves === lv.limit, `лимит ${lv.limit} → ${l2.limit}`);
    for (let k = 0; k < 5; k++) await tapCell(page, l2, c, 'touch');
    await sleep(900);
    check('Кончились снова → окно появляется снова', (await overlay(page)) === 'Ходы закончились');
    await page.tap('#ovB2'); await sleep(400);
    const l3 = await H(page, 'level');
    check('«Заново» начинает улицу с нуля', l3.moves === 0 && l3.state === 'play' && l3.limit === lv.limit);
  }
  {
    const l = await solve(page, 'touch', 4);
    const st = await winStars(page), exp = l.moves <= l.t3 ? 3 : l.moves <= l.t2 ? 2 : 1;
    check('Лишние ходы → меньше звёзд', st === exp && st < 3, `${l.moves} ходов при минимуме ${l.minTaps} → ${st}★`);
    await page.tap('#btnBack'); await sleep(300);
    check('Лучший результат не затирается худшим', (await H(page, 'stars'))[2] === 3);
  }

  /* 3. Подсказка и «Заново» */
  await tapNode(page, 4);
  {
    const l = await H(page, 'level'), w0 = wrongCount(l);
    await page.tap('#btnHint'); await sleep(1100);
    const l2 = await H(page, 'level');
    check('Подсказка ставит одну трубу правильно и не тратит ход', wrongCount(l2) === w0 - 1 && l2.moves === 0, `неправильных труб: ${w0} → ${wrongCount(l2)}`);
    await tapCell(page, l2, l2.cells.find(c => c.taps > 0), 'touch');
    check('Обычное касание тратит ход', (await H(page, 'level')).moves === 1);
    await page.tap('#btnRestart'); await sleep(300);
    check('«Заново» сбрасывает ходы', (await H(page, 'level')).moves === 0);
  }

  /* 4. Уход с улицы, пока игра ждёт окно или рекламу */
  {
    await solve(page, 'touch');
    await page.tap('#btnBack'); await sleep(3500);
    const o = await overlay(page);
    check('Победа → сразу «Карта»: окно победы не всплывает поверх карты', !o && (await H(page, 'screen')) === 'map', o ? `всплыло «${o}»` : '');
    if (o) { await page.tap('#ovB1'); await sleep(300); }
  }
  {
    await tapNode(page, 0);
    const l = await H(page, 'level'), c = l.cells.find(c => c.type === 'pipe' && !c.locked && c.taps > 0);
    for (let k = 0; k < l.limit; k++) await tapCell(page, l, c, 'touch');
    await page.tap('#btnRestart'); await sleep(1200);
    const o = await overlay(page);
    check('Ходы кончились → сразу «Заново»: окно проигрыша не всплывает на новой попытке', !o, o ? `всплыло «${o}»` : '');
    if (o) { await page.tap('#ovB2'); await sleep(300); }
  }
  {
    // Окно уже на экране, а игрок жмёт нижнюю кнопку «Заново»: окно должно закрыться.
    const l = await H(page, 'level'), c = l.cells.find(c => c.type === 'pipe' && !c.locked && c.taps > 0);
    for (let k = 0; k < l.limit; k++) await tapCell(page, l, c, 'touch');
    await sleep(900);
    const before = await overlay(page);
    await page.tap('#btnRestart'); await sleep(400);
    const o = await overlay(page);
    check('Окно «Ходы закончились» открыто → нижняя «Заново»: окно закрывается', !!before && !o && (await H(page, 'level')).moves === 0, o ? `осталось «${o}»` : '');
    if (o) { await page.tap('#ovB2'); await sleep(300); }
    await solve(page, 'touch'); await sleep(3200);
    const w = await overlay(page);
    await page.tap('#btnRestart'); await sleep(400);
    const o2 = await overlay(page);
    check('Окно победы открыто → нижняя «Заново»: окно закрывается', !!w && !o2, o2 ? `осталось «${o2}»` : '');
    if (o2) { await page.tap('#ovB2'); await sleep(300); }
  }
  {
    const l = await H(page, 'level'), w0 = wrongCount(l);
    await page.tap('#btnHint'); await sleep(120); await page.tap('#btnBack'); await sleep(1200);
    const l2 = await H(page, 'level');
    check('Подсказка → сразу «Карта»: подсказка не срабатывает в фоне', wrongCount(l2) === w0 && (await H(page, 'screen')) === 'map', `неправильных труб: ${w0} → ${wrongCount(l2)}`);
  }

  /* 5. Перезагрузка страницы */
  await page.reload(); await sleep(800);
  {
    const s = await H(page, 'stars');
    check('После перезагрузки прогресс на месте', s.length === total && s.every(v => v === 3), s.join(' '));
  }

  /* 6. 400 случайных касаний (одни и те же при каждом запуске) */
  await tapNode(page, total - 1);
  {
    const rnd = mulberry32(7), b = await box(page);
    for (let k = 0; k < 400; k++) {
      await page.touchscreen.tap(b.x + rnd() * b.width, b.y + rnd() * b.height);
      if (await page.isVisible('#ov')) {
        await page.tap(rnd() < 0.5 ? '#ovB1' : '#ovB2'); await sleep(60);
        if ((await H(page, 'screen')) === 'map') await tapNode(page, total - 1);
      }
    }
    await sleep(1200);
    const l = await H(page, 'level');
    check('400 случайных касаний подряд — без ошибок', errors.length === 0, `улица в состоянии «${l && l.state}», ходов ${l && l.moves}`);
  }

  /* 7. Скорость: обычный процессор и в 4 раза медленнее (как слабый телефон) */
  if (await overlay(page)) { await page.tap('#ovB2'); await sleep(300); }
  if ((await H(page, 'screen')) !== 'level') await tapNode(page, total - 1);
  await page.tap('#btnRestart'); await sleep(300);
  {
    const cdp = await ctx.newCDPSession(page);
    const measure = async () => { await H(page, 'resetFrame'); await sleep(2500); return H(page, 'frame'); };
    const fmt = f => `${f.work.avg.toFixed(1)} мс на кадр (95%: ${f.work.p95.toFixed(1)}), ~${Math.round(1000 / f.gap.avg)} кадров/с`;
    const f1 = await measure();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const f4 = await measure();
    await page.tap('#btnBack'); await sleep(300);
    const m4 = await measure();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    check('Скорость: самая большая улица', f4.work.p95 < 33, `обычный процессор: ${fmt(f1)}; в 4 раза медленнее: ${fmt(f4)}`);
    check('Скорость: карта посёлка', m4.work.p95 < 33, `в 4 раза медленнее: ${fmt(m4)}`);
  }
  check('Ошибок в консоли нет (телефон)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();

  /* 7a. Английский язык и ворота между частями посёлка */
  {
    const c = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' });
    const p = await c.newPage(); const e = watchErrors(p);
    await p.goto(server.url + 'index.html'); await sleep(700);
    const play = await p.textContent('#btnPlay');
    await p.tap('#btnPlay'); await sleep(300);
    const intro = `${await p.textContent('#ovT')} ${await p.textContent('#ovP')} ${await p.textContent('#ovB1')}`;
    await p.tap('#ovB1'); await sleep(500);
    const hud = `${await p.textContent('#tTitle')} | ${await p.textContent('#tSub')} | ${await p.textContent('#btnRestart')} | ${await p.textContent('#btnHint')}`;
    const all = `${play} ${intro} ${hud}`;
    check('Английский: у игрока с английским браузером нет русских букв', (await H(p, 'lang')) === 'en' && !/[а-яё]/i.test(all), all.slice(0, 110));
    await p.screenshot({ path: `${OUT}/50-english.png` });
    // ворота: первая часть пройдена на 1 звезду (10 из 18 нужных) — вторая закрыта
    await p.evaluate(([k]) => localStorage.setItem(k, JSON.stringify({ stars: Array(10).fill(1) })), [SAVE_KEY]);
    await p.goto(URL); await sleep(700);
    const btn = await p.textContent('#btnPlay');
    await p.tap('#btnPlay'); await sleep(200);
    const toast = (await p.isVisible('#toast')) ? await p.textContent('#toast') : '';
    check('Ворота: мало звёзд в первой части — вторая закрыта, кнопка говорит, сколько не хватает', (await H(p, 'screen')) === 'map' && btn.includes('8') && toast.includes('18'), `${btn} | ${toast}`);
    await p.screenshot({ path: `${OUT}/51-gate.png` });
    await p.evaluate(([k]) => localStorage.setItem(k, JSON.stringify({ stars: [3, 3, 3, 3, 1, 1, 1, 1, 1, 1] })), [SAVE_KEY]);
    await p.reload(); await sleep(700);
    await p.tap('#btnPlay'); await startIntroIfAny(p, 'touch');
    check('Ворота: 18 звёзд набрано — вторая часть открывается', (await H(p, 'screen')) === 'level' && (await H(p, 'level')).index === 10);
    check('Ошибок в консоли нет (английский и ворота)', e.length === 0, e.slice(0, 3).join(' | '));
    await c.close();
  }

  /* 8. Маленькие телефоны и планшет боком */
  for (const [dev, shot, min] of [
    ['iPhone SE', '40-small-street20', 40],
    ['Galaxy S8', null, 44],
    ['iPad (gen 7) landscape', '42-tablet-street20', 44],
  ]) {
    if (!devices[dev]) { console.log(`  --  ${dev}: такого устройства нет в Playwright, пропуск`); continue; }
    const c = await browser.newContext({ ...devices[dev] });
    const p = await c.newPage(); const e = watchErrors(p);
    await p.goto(URL); await p.evaluate(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, ALL_BUT_LAST]);
    await p.reload(); await sleep(700);
    check(`${dev}: заставка «Поверни телефон» не мешает`, !(await p.isVisible('#rotate')));
    await openFromMap(p, 'touch');
    const l = await H(p, 'level'), vp = p.viewportSize();
    if (shot) await p.screenshot({ path: `${OUT}/${shot}.png` });
    check(`${dev} (${vp.width}×${vp.height}): клетка не меньше ${min} px`, !!l && l.board.S >= min, l ? `клетка ${l.board.S} px на поле ${l.W}×${l.H}` : 'улица не открылась');
    check(`${dev}: без ошибок`, e.length === 0, e.join(' | '));
    await c.close();
  }

  /* 9. Телефон боком: игра просит повернуть телефон и не пропускает касания */
  {
    const c = await browser.newContext({ ...devices['iPhone 13 landscape'] });
    const p = await c.newPage(); const e = watchErrors(p);
    await p.goto(URL); await p.evaluate(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, ALL_BUT_LAST]);
    await p.reload(); await sleep(700);
    check('Телефон боком: показывает «Поверни телефон»', await p.isVisible('#rotate'));
    await p.screenshot({ path: `${OUT}/41-landscape.png` });
    const bb = await p.locator('#btnPlay').boundingBox();
    await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await sleep(400);
    check('Телефон боком: касания в игру не проходят', (await H(p, 'screen')) === 'map' && !(await p.isVisible('#ov')));
    await p.setViewportSize({ width: 390, height: 664 }); await sleep(700);
    check('Повернули вертикально: заставка исчезла', !(await p.isVisible('#rotate')));
    await openFromMap(p, 'touch');
    const l = await H(p, 'level');
    check('После поворота можно играть: клетка не меньше 44 px', !!l && l.board.S >= 44, l ? `клетка ${l.board.S} px` : 'улица не открылась');
    check('Телефон боком: без ошибок', e.length === 0, e.join(' | '));
    await c.close();
  }

  /* 10. Компьютер, мышь */
  {
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await c.newPage(); const e = watchErrors(p);
    await p.goto(URL); await sleep(700);
    check('Компьютер: заставка «Поверни телефон» не появляется', !(await p.isVisible('#rotate')));
    await p.screenshot({ path: `${OUT}/43-desktop-map.png` });
    {
      const b = await box(p), cy0 = await H(p, 'mapScroll');
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.wheel(0, -600); await sleep(200);
      const cy1 = await H(p, 'mapScroll');
      await p.mouse.wheel(0, 3000); await sleep(200);
      check('Компьютер: карта прокручивается колесом мыши', cy1 < cy0 - 100 && Math.abs((await H(p, 'mapScroll')) - cy0) < 1, `${Math.round(cy0)} → ${Math.round(cy1)} → обратно`);
    }
    await openFromMap(p, 'mouse');
    let l = await H(p, 'level');
    await tapCell(p, l, l.cells.find(x => x.type === 'pipe' && !x.locked), 'mouse', 'right');
    check('Компьютер: правая кнопка мыши трубу не крутит', (await H(p, 'level')).moves === 0);
    await p.screenshot({ path: `${OUT}/44-desktop-street1.png` });
    l = await solve(p, 'mouse');
    check('Компьютер: улица проходится мышью', l.state === 'won' && l.moves === l.minTaps);
    check('Компьютер: без ошибок', e.length === 0, e.join(' | '));
    await c.close();
  }

  await browser.close();
  const failed = results.filter(r => r.status === 'fail'), known = results.filter(r => r.status === 'known');
  console.log(`\nИтого: пройдено ${results.length - failed.length - known.length} из ${results.length}, известных проблем ${known.length}, новых ошибок ${failed.length} — за ${Math.round((Date.now() - T) / 1000)} с`);
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
  if (failed.length) process.exitCode = 1;
} catch (e) {
  console.error('ТЕСТ УПАЛ:', e);
  process.exitCode = 1;
} finally {
  await server.close();
}
