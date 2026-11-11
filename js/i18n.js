// Все надписи игры на двух языках. Язык берётся из браузера (русский — для ru, остальным — английский),
// для проверки можно задать в адресе: ?lang=en или ?lang=ru.
// t('ключ', {число: 5}) — надпись с подстановкой; новые надписи добавлять сразу в оба словаря.
const RU={
  title:'Родниково',
  street:'ул. {n}', streetNo:'Улица {i} · {nets}',
  subStart:'Посёлок ждёт воду', subDone:'Весь посёлок восстановлен', subProgress:'Восстановлено улиц: {a} из {b}',
  play:'Играть · {s}', needStars:'Нужно ещё {n} ★',
  back:'← Карта', moves:'ходов', restart:'Заново', hint:'Подсказка', hintSub:'за рекламу',
  w:'вода', e:'свет', g:'газ', and:' и ',
  winTitle:'{s}: {nets} есть!', winPerfect:'Ходов: {m}. Идеально!', winMore:'Ходов: {m}. На три звезды нужно не больше {t}.',
  next:'Дальше', again:'Ещё раз', toMap:'На карту',
  failTitle:'Ходы закончились', failText:'Осталось совсем немного. Возьми 5 ходов за просмотр рекламы или начни улицу заново.', plus5:'+5 ходов',
  ad:'Здесь будет реклама', start:'Начать', cancel:'Назад',
  lockedToast:'Сначала пройди {s}', gateToast:'Нужно {need} ★ в прошлой части посёлка, сейчас {have}',
  genFail:'Не получилось собрать уровень',
  tap:'Нажми', soon1:'Скоро', soon2:'новые улицы', sign:'Родниково',
  rotate1:'Поверни телефон', rotate2:'Родниково играется только вертикально',
  soundOn:'Звук включён', soundOff:'Звук выключен', boardAria:'Игровое поле',
  tagNew:'Новое', tagHow:'Как играть',
  ch2:'Верхняя часть', ch3:'Старый посёлок', toCurrent:'К ул. {i}',
  i_start_t:'Вода для Родниково', i_start_p:'Нажимай на трубу, и она повернётся. Проведи воду от башни ко всем домам. Число ходов ограничено: чем меньше потратишь, тем больше звёзд.',
  i_lock_t:'Закреплённые трубы', i_lock_p:'Трубы на брусчатке с замком уже стоят правильно, их не повернуть. Используй их как подсказку.',
  i_power_t:'Электричество', i_power_p:'Провода ведут от подстанции к фонарям. Провод не может упираться в трубу: такое место загорится красным.',
  i_bridge_t:'Мостик', i_bridge_p:'На мостике провод проходит над трубой. Вода и ток пересекаются в одной клетке и не мешают друг другу.',
  i_double_t:'Двойная клетка', i_double_p:'В одной клетке сразу труба и провод. Один поворот меняет обе сети, ищи положение, которое подходит обеим.',
  i_gas_t:'Газ', i_gas_p:'Газ греет теплицы. Проведи оранжевые трубы от газгольдера к каждой теплице. Газовая труба тоже не может упираться в чужую.',
  i_three_t:'Три сети', i_three_p:'Вода, свет и газ на одной улице. У каждой сети свой источник: башня, подстанция и газгольдер.',
  i_turn_t:'Поворотные вводы', i_turn_p:'В старом посёлке трубу к дому никто не подвёл. Дома, фонари и теплицы на круглой площадке тоже поворачиваются: нажми, и повернётся их ввод.',
};
const EN={
  title:'Rodnikovo',
  street:'{n} St', streetNo:'Street {i} · {nets}',
  subStart:'The village needs water', subDone:'The whole village is restored', subProgress:'Streets restored: {a} of {b}',
  play:'Play · {s}', needStars:'{n} more ★ needed',
  back:'← Map', moves:'moves', restart:'Restart', hint:'Hint', hintSub:'watch an ad',
  w:'water', e:'power', g:'gas', and:' and ',
  winTitle:'{s}: {nets} connected!', winPerfect:'Moves: {m}. Perfect!', winMore:'Moves: {m}. Three stars need {t} or fewer.',
  next:'Next', again:'Replay', toMap:'Map',
  failTitle:'Out of moves', failText:'So close! Watch an ad for 5 more moves or restart the street.', plus5:'+5 moves',
  ad:'An ad will play here', start:'Start', cancel:'Back',
  lockedToast:'Finish {s} first', gateToast:'You need {need} ★ in the previous part, you have {have}',
  genFail:'Could not build the level',
  tap:'Tap', soon1:'More streets', soon2:'coming soon', sign:'Rodnikovo',
  rotate1:'Rotate your phone', rotate2:'Rodnikovo plays in portrait only',
  soundOn:'Sound on', soundOff:'Sound off', boardAria:'Game board',
  tagNew:'New', tagHow:'How to play',
  ch2:'Upper Village', ch3:'Old Village', toCurrent:'To street {i}',
  i_start_t:'Water for Rodnikovo', i_start_p:'Tap a pipe to turn it. Bring water from the tower to every house. Moves are limited: the fewer you use, the more stars you get.',
  i_lock_t:'Locked pipes', i_lock_p:'Pipes on cobblestone with a lock are already right and cannot be turned. Use them as a clue.',
  i_power_t:'Power', i_power_p:'Wires run from the substation to the street lamps. A wire must not run into a pipe: that spot turns red.',
  i_bridge_t:'Bridge', i_bridge_p:'On a bridge the wire passes over the pipe. Water and power cross in one tile without touching.',
  i_double_t:'Double tile', i_double_p:'One tile holds both a pipe and a wire. One turn moves both, so find the position that fits both networks.',
  i_gas_t:'Gas', i_gas_p:'Gas heats the greenhouses. Run the orange pipes from the gas tank to every greenhouse. A gas pipe must not run into another network either.',
  i_three_t:'Three networks', i_three_p:'Water, power and gas on one street. Each has its own source: the tower, the substation and the gas tank.',
  i_turn_t:'Turning inlets', i_turn_p:'In the old village nobody laid the last pipe. Houses, lamps and greenhouses on a round plate turn too: tap one to turn its inlet.',
};
function pick(){
  try{const q=new URLSearchParams(location.search).get('lang');if(q==='ru'||q==='en')return q;}catch(e){}
  const l=(typeof navigator!=='undefined'&&(navigator.language||''))||'ru';
  return /^(ru|be|uk|kk)\b/i.test(l)?'ru':'en';
}
export const lang=pick();
const D=lang==='ru'?RU:EN;
export function t(key,p){let s=D[key];if(s==null)s=RU[key]!=null?RU[key]:key;return p?s.replace(/\{(\w+)\}/g,(m,k)=>p[k]!=null?p[k]:m):s;}
// Название улицы: «ул. Садовая» или «Garden St».
export const streetName=lv=>t('street',{n:lang==='ru'?lv.name:(lv.en||lv.name)});
// Сети словами: «вода», «вода и газ», «вода, свет и газ».
export function netsText(nets){const w=nets.map(n=>t(n));return w.length<2?w[0]:w.slice(0,-1).join(', ')+t('and')+w[w.length-1];}
