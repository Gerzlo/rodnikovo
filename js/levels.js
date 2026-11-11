// Улицы посёлка Родниково по порядку.
// w, h — размер поля (на телефоне не больше 6×8); nets — сети ('w' вода, 'e' электричество, 'g' газ);
// seed — зерно (улица одинакова у всех);
// blocks — камни и деревья; locked — трубы с замком; bridges — мостики; doubles — двойные клетки;
// intro — карточка с новым правилом перед первым прохождением (тексты — в js/i18n.js: i_<key>_t и i_<key>_p);
// en — название по-английски; turn:'leaf' — крутятся и вводы домов, фонарей, теплиц; slack — запас ходов (обычно 0.35).
// Улицы идут главами по 10. Сложность подбирается командой node tools/rate.js find (см. docs/plan-100.md).
export const LEVELS=[
  {name:'Садовая', en:'Garden',     w:4,h:4, nets:['w'], seed:3,
   intro:{tag:'tagHow',key:'start'}},
  {name:'Речная', en:'River',      w:4,h:5, nets:['w'], seed:5},
  {name:'Школьная', en:'School',    w:5,h:5, nets:['w'], seed:8, blocks:2},
  {name:'Луговая', en:'Meadow',     w:5,h:6, nets:['w'], seed:13, blocks:2, locked:3,
   intro:{tag:'tagNew',key:'lock'}},
  {name:'Мельничная', en:'Mill',  w:5,h:6, nets:['w'], seed:21, blocks:3, locked:2},
  {name:'Полевая', en:'Field',     w:5,h:6, nets:['w','e'], seed:34, blocks:1,
   intro:{tag:'tagNew',key:'power'}},
  {name:'Лесная', en:'Forest',      w:6,h:6, nets:['w','e'], seed:55, blocks:2},
  {name:'Мостовая', en:'Bridge',    w:6,h:6, nets:['w','e'], seed:89, bridges:2,
   intro:{tag:'tagNew',key:'bridge'}},
  {name:'Кленовая', en:'Maple',    w:6,h:7, nets:['w','e'], seed:144, doubles:2,
   intro:{tag:'tagNew',key:'double'}},
  {name:'Центральная', en:'Central', w:6,h:7, nets:['w','e'], seed:233, bridges:1, doubles:2, blocks:2, locked:2},
  // Верхняя часть посёлка: газ (13-я) и три сети сразу (с 16-й).
  {name:'Берёзовая', en:'Birch',   w:6,h:7, nets:['w','e'], seed:382, bridges:1, doubles:1, blocks:2, locked:1},
  {name:'Озёрная', en:'Lake',     w:6,h:8, nets:['w','e'], seed:612, bridges:2, doubles:1, blocks:3},
  {name:'Тепличная', en:'Greenhouse',   w:5,h:6, nets:['w','g'], seed:991, blocks:1,
   intro:{tag:'tagNew',key:'gas'}},
  {name:'Рябиновая', en:'Rowan',   w:6,h:7, nets:['w','g'], seed:1597, blocks:2, locked:2},
  {name:'Пасечная', en:'Beekeeper',    w:6,h:7, nets:['e','g'], seed:2585, bridges:2, blocks:1},
  {name:'Овражная', en:'Ravine',    w:6,h:7, nets:['w','e','g'], seed:4184, blocks:1,
   intro:{tag:'tagNew',key:'three'}},
  {name:'Вишнёвая', en:'Cherry',    w:6,h:8, nets:['w','e','g'], seed:6765, blocks:2, locked:1},
  {name:'Кузнечная', en:'Blacksmith',   w:6,h:8, nets:['w','e','g'], seed:10948, bridges:2, locked:2},
  {name:'Сиреневая', en:'Lilac',   w:6,h:8, nets:['w','e','g'], seed:17711, doubles:2, blocks:1},
  {name:'Заречная', en:'Riverside',    w:6,h:8, nets:['w','e','g'], seed:28670, bridges:2, doubles:2, blocks:2, locked:2},
  // Глава 3. Старый посёлок: поворотные вводы.
  {name:'Колодезная', en:'Well',        w:4,h:5, nets:['w'], seed:21, turn:'leaf', slack:0.3, intro:{tag:'tagNew',key:'turn'}},
  {name:'Тополиная', en:'Poplar',       w:5,h:5, nets:['w'], seed:34, turn:'leaf', slack:0.3},
  {name:'Ямская', en:'Coach',           w:5,h:6, nets:['w'], seed:55, turn:'leaf', slack:0.3, blocks:2},
  {name:'Гончарная', en:'Potter',       w:5,h:6, nets:['w','e'], seed:89, turn:'leaf', slack:0.3},
  {name:'Липовая', en:'Linden',         w:6,h:6, nets:['w'], seed:146, turn:'leaf', slack:0.3, locked:2},
  {name:'Калиновая', en:'Berry',        w:6,h:7, nets:['w','e'], seed:233, turn:'leaf', slack:0.3, bridges:1},
  {name:'Плотницкая', en:'Carpenter',   w:6,h:7, nets:['w','g'], seed:377, turn:'leaf', slack:0.3, doubles:1, blocks:1},
  {name:'Соловьиная', en:'Nightingale', w:6,h:7, nets:['w'], seed:611, turn:'leaf', slack:0.3, blocks:2},
  {name:'Каштановая', en:'Chestnut',    w:6,h:8, nets:['w','e','g'], seed:987, turn:'leaf', slack:0.3, bridges:2, doubles:1},
  {name:'Ярмарочная', en:'Fair',        w:6,h:8, nets:['w'], seed:1602, turn:'leaf', slack:0.25, blocks:3},
];
// Главы: по 10 улиц. Следующая глава открывается, когда в предыдущей набрано GATE звёзд из 30.
export const CHAPTER=10, GATE=18;
