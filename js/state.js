// Общее состояние игры. Модули читают и меняют его через объекты G, B и M.
import { LEVELS } from './levels.js';

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
};
export const B = { x: 0, y: 0, S: 40 };   // поле улицы: левый верхний угол и размер клетки
export const M = { sc: 1, ox: 0, oy: 0 }; // карта: масштаб и сдвиг

export const unlocked = i => i === 0 || G.stars[i - 1] > 0;
export function currentIdx() { for (let i = 0; i < LEVELS.length; i++) if (!G.stars[i]) return i; return LEVELS.length - 1; }
