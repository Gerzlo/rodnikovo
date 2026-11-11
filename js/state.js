// Общее состояние игры. Модули читают и меняют его через объекты G, B и M.
import { LEVELS, CHAPTER, GATE } from './levels.js';

export const G = {
  now: 0,                // время текущего кадра, мс
  VW: 1, VH: 1, DPR: 1,  // размер сцены в CSS-пикселях и плотность экрана
  screen: 'map',         // 'map' — карта посёлка, 'level' — улица
  L: null,               // текущая улица: данные генератора + состояние игры
  li: 0,                 // номер текущей улицы
  moves: 0,              // сделано ходов
  tut: -1,               // клетка с подсказкой «Нажми» (только на первой улице)
  stars: [],             // звёзды по улицам
  mapAnim: null,         // улица, которая сейчас «оживает» на карте
  parts: [], mparts: [], // частицы на улице и на карте
  autoNext: null,        // улица, которая откроется сама после кнопки «Дальше»: {i, at}
};
export const B = { x: 0, y: 0, S: 40 };   // поле улицы: левый верхний угол и размер клетки
export const M = { sc: 1, ox: 0, oy: 0, cy: null, vel: 0, target: null }; // карта: масштаб, сдвиг, прокрутка (cy), инерция, цель

// Звёзды, набранные в главе ch (0 — первая).
export const chapterStars = ch => G.stars.slice(ch * CHAPTER, (ch + 1) * CHAPTER).reduce((a, b) => a + b, 0);
// Сколько звёзд не хватает, чтобы открыть главу, которая начинается с улицы i (0 — ворота открыты или это не начало главы).
export const gateNeed = i => (i > 0 && i % CHAPTER === 0) ? Math.max(0, GATE - chapterStars(i / CHAPTER - 1)) : 0;
export const unlocked = i => i === 0 || (G.stars[i - 1] > 0 && gateNeed(i) === 0);
export function currentIdx() { for (let i = 0; i < LEVELS.length; i++) if (!G.stars[i]) return i; return LEVELS.length - 1; }
