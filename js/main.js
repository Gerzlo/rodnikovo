// Главный модуль: экраны, кнопки, касания, ход игры и главный цикл.
import { DX, DY, tapsToSolve, evaluate, generate, isLeaf } from './core.js';
import { LEVELS } from './levels.js';
import { G, B, M, unlocked, currentIdx } from './state.js';
import { setCtx } from './art.js';
import { spawn, updParts, drawPart } from './fx.js';
import { layoutLevel, drawLevel } from './board.js';
import { NODES, DISTRICTS, drawMap, nodeAt, mapFocus, mapGrab, mapDrag, mapRelease, mapWheel, updMap } from './map.js';
import { platform } from './platform.js';

const $=id=>document.getElementById(id);
const cv=$('cv'),ctx=cv.getContext('2d'),stage=$('stage');
setCtx(ctx);
const ov=$('ov'),ovTag=$('ovTag'),ovStars=$('ovStars'),ovT=$('ovT'),ovP=$('ovP'),ovB1=$('ovB1'),ovB2=$('ovB2');
const tTitle=$('tTitle'),tSub=$('tSub'),tScore=$('tScore'),btnBack=$('btnBack');
const movesBox=$('movesBox'),mvStars=$('mvStars'),mvBar=$('mvBar'),mvFill=$('mvFill'),mvLeft=$('mvLeft');
const mapBar=$('mapBar'),lvlBar=$('lvlBar'),btnPlay=$('btnPlay'),btnRestart=$('btnRestart'),btnHint=$('btnHint'),toastEl=$('toast');
// iPhone: запрет масштабирования щипком. В режиме «На экран Домой» увеличенный масштаб иначе «залипает»
// (после поворота телефона или случайного щипка) — шапка уезжает под строку со временем, края обрезаются.
for(const ev of ['gesturestart','gesturechange','gestureend'])document.addEventListener(ev,e=>e.preventDefault(),{passive:false});
// Телефон боком: на экране заставка «Поверни телефон» (css/style.css), игру в это время не рисуем.
const sideways=matchMedia('(orientation: landscape) and (pointer: coarse) and (max-height: 500px)');

G.now=performance.now();
G.stars=platform.loadStars(LEVELS.length);
function save(){platform.saveStars(G.stars);}
const genCache=[];
// Какие сети на улице — словами: «вода», «вода и газ», «вода, свет и газ».
const NET_WORD={w:'вода',e:'свет',g:'газ'};
function netsText(nets){const w=nets.map(n=>NET_WORD[n]);return w.length<2?w[0]:w.slice(0,-1).join(', ')+' и '+w[w.length-1];}
function levelData(i){if(!genCache[i])genCache[i]=generate(LEVELS[i]);return genCache[i];}

/* ---------- ход игры ---------- */
// Пересчитать, куда дошли вода и ток. Новые участки заполняются по очереди — вода «бежит» по трубам.
function refresh(){
  const L=G.L,r=evaluate(L);L.res=r;
  const newly=[];let minD=1e9;
  for(const c of L.cells)for(const s of c.segs){if(s.reached&&!s.was){newly.push(s);if(s.depth<minD)minD=s.depth;}s.was=s.reached;}
  for(const s of newly)s.fillAt=G.now+(s.depth-minD)*75;
  return r;
}
function startLevel(i){
  const data=levelData(i);if(!data){toast('Не получилось собрать уровень');return;}
  ov.hidden=true; // окно победы или проигрыша могло остаться открытым (нижняя кнопка «Заново»)
  G.li=i;const L=G.L=JSON.parse(JSON.stringify(data));L.state='play';G.moves=0;G.parts=[];
  for(const c of L.cells){c.turns=c.rot;c.anim=c.rot*Math.PI/2;for(const s of c.segs){s.f=0;s.was=false;s.fillAt=0;}}
  refresh();G.screen='level';
  G.tut=-1;if(i===0&&!G.stars[0]){const c=pickHint();if(c)G.tut=L.cells.indexOf(c);}
  layoutLevel();showScreenUi();updateHud();
}
// Какую трубу подсказать: неправильную, рядом с уже заполненной сетью и ближе к источнику.
function pickHint(){
  const L=G.L;
  const cand=L.cells.filter(c=>c.type==='pipe'&&!c.locked&&tapsToSolve(c)>0);
  if(!cand.length)return null;
  const score=c=>{let best=99;for(let d=0;d<4;d++){const n=L.cells[(c.y+DY[d])*L.W+(c.x+DX[d])];if(c.x+DX[d]<0||c.y+DY[d]<0||c.x+DX[d]>=L.W||c.y+DY[d]>=L.H)continue;if(n.segs.some(s=>s.reached))best=Math.min(best,0);}
    const sc=L.cells[L.src[c.segs[0].net]];return best*100+Math.abs(sc.x-c.x)+Math.abs(sc.y-c.y);};
  return cand.sort((a,b)=>score(a)-score(b))[0];
}
function tapLevel(px,py){
  const L=G.L;if(L.state!=='play')return;
  const gx=Math.floor((px-B.x)/B.S),gy=Math.floor((py-B.y)/B.S);
  if(gx<0||gy<0||gx>=L.W||gy>=L.H)return;
  const c=L.cells[gy*L.W+gx];
  if(c.type!=='pipe')return;
  if(c.locked){c.wig=G.now;return;}
  c.turns++;c.rot=c.turns&3;G.moves++;G.tut=-1;
  afterChange();
}
// После каждого хода: победа, проигрыш или играем дальше.
// Отложенные окна проверяют, что игрок всё ещё на этой же улице (иначе окно всплыло бы не там).
function afterChange(){
  const L=G.L,r=refresh();updateHud();
  if(r.solved)win(r);
  else if(G.moves>=L.limit){L.state='lost';setTimeout(()=>{if(G.L===L&&G.screen==='level'&&L.state==='lost')showFail();},500);}
}
const starsFor=m=>m<=G.L.t3?3:m<=G.L.t2?2:1;
function win(r){
  const L=G.L,li=G.li;L.state='won';
  const st=starsFor(G.moves),first=!G.stars[li];
  if(st>G.stars[li]){G.stars[li]=st;save();}
  if(first)G.mapAnim={i:li,t0:0};
  const S=B.S;
  for(const c of L.cells){
    if(!(isLeaf(c.type)||c.type==='src'))continue;
    const s=c.segs[0],px=B.x+(c.x+0.5)*S,py=B.y+(c.y+0.3)*S;
    for(let k=0;k<9;k++)spawn(G.parts,{k:'star',x:px,y:py,vx:(Math.random()-0.5)*130,vy:-70-Math.random()*130,g:170,life:1,max:1,r:3+Math.random()*4,c:['#ffd34d','#ffffff','#7cc4ff'][k%3],delay:Math.max(0,s.depth)*0.075+Math.random()*0.15});
  }
  setTimeout(()=>{if(G.L===L&&G.screen==='level'&&L.state==='won')showWin(st);},950+r.maxDepth*75);
}
function showWin(st){
  const L=G.L,li=G.li,moves=G.moves;
  showOverlay({stars:st,title:`ул. ${LEVELS[li].name}: ${netsText(L.nets)} есть!`,
    text:st===3?`Ходов: ${moves}. Идеально!`:`Ходов: ${moves}. На три звезды нужно не больше ${L.t3}.`,
    b1:{label:'На карту',fn:goMap},b2:{label:'Ещё раз',fn:()=>startLevel(li)}});
}
function showFail(){
  const li=G.li;
  showOverlay({title:'Ходы закончились',text:'Осталось совсем немного. Возьми 5 ходов за просмотр рекламы или начни улицу заново.',
    b1:{label:'+5 ходов',fn:()=>{const L=G.L;fakeAd(()=>{if(G.L!==L||G.screen!=='level'||L.state!=='lost')return;L.limit+=5;L.state='play';updateHud();});}},
    b2:{label:'Заново',fn:()=>startLevel(li)}});
}
function fakeAd(fn){toast('Здесь будет реклама');platform.rewarded(fn);}
function openLevel(i){
  const lv=LEVELS[i];
  if(lv.intro&&!G.stars[i])showOverlay({tag:lv.intro.tag,title:lv.intro.t,text:lv.intro.p,b1:{label:'Начать',fn:()=>startLevel(i)},b2:{label:'Назад'}});
  else startLevel(i);
}
function goMap(){
  G.screen='map';G.parts=[];mapFocus(G.li,true);
  const ma=G.mapAnim;
  if(ma&&!ma.t0){
    ma.t0=G.now+350;const [ax,ay]=DISTRICTS[ma.i];
    for(let k=0;k<26;k++)spawn(G.mparts,{k:'star',x:ax+(Math.random()-0.5)*70,y:ay-10-Math.random()*30,vx:(Math.random()-0.5)*50,vy:-30-Math.random()*70,g:40,life:1.2,max:1.2,r:2.5+Math.random()*3.5,c:['#ffd34d','#ffffff','#7cc4ff'][k%3],delay:0.35+Math.random()*0.9});
  }
  showScreenUi();updateHud();
}

/* ---------- интерфейс ---------- */
function showOverlay(o){
  ovTag.hidden=!o.tag;ovTag.textContent=o.tag||'';
  ovStars.hidden=o.stars==null;
  if(o.stars!=null)ovStars.innerHTML=[0,1,2].map(k=>`<span class="${k<o.stars?'':'off'}">★</span>`).join('');
  ovT.textContent=o.title;ovP.textContent=o.text;
  ovB1.textContent=o.b1.label;ovB1.onclick=()=>{ov.hidden=true;o.b1.fn();};
  if(o.b2){ovB2.hidden=false;ovB2.textContent=o.b2.label;ovB2.onclick=()=>{ov.hidden=true;if(o.b2.fn)o.b2.fn();};}else ovB2.hidden=true;
  ov.hidden=false;ovB1.focus({preventScroll:true});
}
let toastT=0;
function toast(msg){toastEl.textContent=msg;toastEl.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{toastEl.hidden=true;},1300);}
function showScreenUi(){
  const lv=G.screen==='level';
  btnBack.hidden=!lv;movesBox.hidden=!lv;mapBar.hidden=lv;lvlBar.hidden=!lv;
  requestAnimationFrame(fit);
}
function updateHud(){
  const stars=G.stars,total=stars.reduce((a,b)=>a+b,0);
  if(G.screen==='map'){
    const done=stars.filter(Boolean).length;
    tTitle.textContent='Родниково';
    tSub.textContent=done===0?'Посёлок ждёт воду':done===LEVELS.length?'Весь посёлок восстановлен':`Восстановлено улиц: ${done} из ${LEVELS.length}`;
    tScore.textContent=`★ ${total}/${LEVELS.length*3}`;
    btnPlay.textContent='Играть · ул. '+LEVELS[currentIdx()].name;
  }else{
    const L=G.L,li=G.li;
    tTitle.textContent='ул. '+LEVELS[li].name;
    tSub.textContent=`Улица ${li+1} · ${netsText(L.nets)}`;
    tScore.textContent=stars[li]?'★ '+stars[li]+'/3':'★ —';
    const left=Math.max(0,L.limit-G.moves);
    mvLeft.textContent=left;mvFill.style.width=(left/L.limit*100)+'%';mvBar.classList.toggle('low',left<=3);
    const st=starsFor(G.moves);[...mvStars.children].forEach((e,k)=>e.classList.toggle('off',k>=st));
  }
}
btnBack.addEventListener('click',()=>{ov.hidden=true;goMap();});
btnPlay.addEventListener('click',()=>openLevel(currentIdx()));
btnRestart.addEventListener('click',()=>{if(G.screen==='level')startLevel(G.li);});
btnHint.addEventListener('click',()=>{
  const L=G.L;
  if(G.screen!=='level'||L.state!=='play')return;
  fakeAd(()=>{if(G.L!==L||G.screen!=='level'||L.state!=='play')return;const c=pickHint();if(!c)return;const t=tapsToSolve(c);c.turns+=t;c.rot=c.turns&3;c.hintAt=G.now;G.tut=-1;afterChange();});
});
// На улице труба поворачивается сразу при касании. На карте касание открывает улицу, только если палец
// не сдвинулся: сдвиг — это прокрутка карты.
let drag=null;
const local=e=>{const r=cv.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
cv.addEventListener('pointerdown',e=>{
  if(!ov.hidden||e.button>0)return;
  const [px,py]=local(e);
  if(G.screen==='level'){tapLevel(px,py);return;}
  drag={id:e.pointerId,px,py,moved:false};mapGrab(py);
  try{cv.setPointerCapture(e.pointerId);}catch(_){}
});
cv.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id||G.screen!=='map')return;
  const [px,py]=local(e);
  if(!drag.moved&&Math.hypot(px-drag.px,py-drag.py)>8)drag.moved=true;
  if(drag.moved)mapDrag(py);
});
function endDrag(e,cancel){
  if(!drag||e.pointerId!==drag.id)return;
  const d=drag;drag=null;mapRelease();
  if(cancel||d.moved||G.screen!=='map'||!ov.hidden)return;
  const i=nodeAt(d.px,d.py);
  if(i<0)return;
  if(unlocked(i))openLevel(i);else toast('Сначала пройди ул. '+LEVELS[i-1].name);
}
cv.addEventListener('pointerup',e=>endDrag(e,false));
cv.addEventListener('pointercancel',e=>endDrag(e,true));
cv.addEventListener('wheel',e=>{if(G.screen!=='map')return;e.preventDefault();mapWheel(e.deltaY*(e.deltaMode===1?16:1));},{passive:false});

function fit(){
  const r=stage.getBoundingClientRect();G.VW=Math.max(1,r.width);G.VH=Math.max(1,r.height);
  G.DPR=Math.min(window.devicePixelRatio||1,2.5);
  cv.width=Math.round(G.VW*G.DPR);cv.height=Math.round(G.VH*G.DPR);
  layoutLevel();
}
window.addEventListener('resize',fit);

/* ---------- доступ для автотестов: только читает состояние игры ---------- */
const perfBuf=[],gapBuf=[];
const stat=a=>{if(!a.length)return null;const s=a.slice().sort((p,q)=>p-q);return {avg:s.reduce((x,v)=>x+v,0)/s.length,p95:s[Math.floor(s.length*0.95)],max:s[s.length-1],n:s.length};};
window.__rodnikovo={
  screen:()=>G.screen,
  stars:()=>G.stars.slice(),
  level:()=>{const L=G.L;return L?{index:G.li,W:L.W,H:L.H,nets:L.nets.slice(),moves:G.moves,limit:L.limit,t3:L.t3,t2:L.t2,minTaps:L.minTaps,state:L.state,
    solved:!!(L.res&&L.res.solved),leaks:L.res?L.res.leaks.length:0,conflicts:L.res?L.res.conflicts.length:0,
    board:{x:B.x,y:B.y,S:B.S},
    cells:L.cells.map(c=>({x:c.x,y:c.y,type:c.type,net:c.segs.length?c.segs[0].net:null,locked:c.locked,shared:c.shared,taps:c.type==='pipe'&&!c.locked?tapsToSolve(c):0}))}:null;},
  mapNodes:()=>NODES.map(([x,y])=>{const sx=M.ox+x*M.sc,sy=M.oy+y*M.sc;return {x:sx,y:sy,vis:sx>20&&sx<G.VW-20&&sy>24&&sy<G.VH-24};}),
  mapScroll:()=>M.cy,
  frame:()=>({work:stat(perfBuf),gap:stat(gapBuf)}),
  resetFrame:()=>{perfBuf.length=0;gapBuf.length=0;}
};

/* ---------- главный цикл ---------- */
let last=performance.now();
function loop(t){
  if(sideways.matches){last=t;requestAnimationFrame(loop);return;}
  const t0=performance.now();
  gapBuf.push(t-last);if(gapBuf.length>300)gapBuf.shift();
  const dt=Math.min(0.05,(t-last)/1000);last=t;G.now=t;
  const L=G.L;
  if(G.screen==='level'&&L){
    for(const c of L.cells){
      const target=c.turns*Math.PI/2;c.anim+=(target-c.anim)*Math.min(1,dt*16);
      for(const s of c.segs){if(s.reached){if(G.now>=s.fillAt)s.f=Math.min(1,s.f+dt/0.16);}else s.f=Math.max(0,s.f-dt/0.12);}
    }
    if(L.state==='play'&&L.res)for(const lk of L.res.leaks){
      if(Math.random()>dt*(lk.net==='w'?9:lk.net==='g'?5:6))continue;
      const S=B.S,px=B.x+(lk.x+0.5+DX[lk.d]*0.5)*S,py=B.y+(lk.y+0.5+DY[lk.d]*0.5)*S;
      if(lk.net==='w')spawn(G.parts,{k:'drop',x:px,y:py,vx:DX[lk.d]*70+(Math.random()-0.5)*50,vy:DY[lk.d]*70-40-Math.random()*40,g:260,life:0.55,max:0.55,r:1.6+Math.random()*1.8});
      else if(lk.net==='g')spawn(G.parts,{k:'puff',x:px,y:py,vx:DX[lk.d]*26+(Math.random()-0.5)*14,vy:DY[lk.d]*26-12-Math.random()*10,life:0.9,max:0.9,r:S*0.035+Math.random()*S*0.02});
      else spawn(G.parts,{k:'spark',x:px,y:py,vx:(Math.random()-0.5)*220,vy:(Math.random()-0.5)*220,life:0.22,max:0.22});
    }
  }
  if(G.screen==='map')updMap(dt);
  G.parts=updParts(G.parts,dt);G.mparts=updParts(G.mparts,dt);
  ctx.setTransform(G.DPR,0,0,G.DPR,0,0);
  if(G.screen==='level'&&L){drawLevel();for(const p of G.parts)drawPart(p);}else drawMap();
  perfBuf.push(performance.now()-t0);if(perfBuf.length>300)perfBuf.shift();
  requestAnimationFrame(loop);
}
fit();updateHud();showScreenUi();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
requestAnimationFrame(loop);
