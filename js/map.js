// Карта посёлка Родниково: дорога с улицами, речка с мостом, кварталы, которые оживают после прохождения.
// Карта длинная и прокручивается пальцем или колесом мыши. Она собрана из частей по 10 улиц (глав):
// первые две нарисованы вручную, следующие строятся сами по образцу второй (со сдвигом вверх и через одну — зеркально).
// Чтобы добавить главу, достаточно добавить 10 улиц в js/levels.js и строку в THEMES (цвет травы, название, постройка).
import { mulberry32 } from './core.js';
import { LEVELS, CHAPTER, GATE } from './levels.js';
import { t } from './i18n.js';
import { ctx, mixH, rrect, circ, ell, poly, starPath, drawHouse, drawLamp, drawTower, drawTree, drawLock, drawGreenhouse, drawGasTank } from './art.js';
import { drawPart } from './fx.js';
import { G, M, unlocked, currentIdx, gateNeed, chapterStars } from './state.js';

// Карта рисуется в своих координатах: ширина 400, по высоте на экран помещается 720.
const MAP={w:400,h:720},STEP=600; // STEP — высота одной главы
const NCH=Math.ceil(LEVELS.length/CHAPTER);
// Оформление глав: два оттенка травы, ключ названия (js/i18n.js) и постройка главы.
const THEMES=[
  {grass:['#97d16f','#7fbb5b']},
  {grass:['#97d16f','#7fbb5b'],name:'ch2',mark:'gas'},
  {grass:['#b3d472','#93bd58'],name:'ch3',mark:'well'},
];
const theme=c=>THEMES[Math.min(c,THEMES.length-1)];
// Образец главы — вторая часть посёлка: точки улиц, кварталы (x, y, сторона: −1 — дома левее точки, 1 — правее) и места построек.
const N1=[[200,640],[295,582],[215,522],[110,492],[185,416],[300,366],[240,296],[125,250],[195,180],[300,118]];
const D1=[[118,656,-1],[352,604,1],[318,512,1],[54,536,-1],[92,392,-1],[350,404,1],[330,270,1],[54,282,-1],[104,152,-1],[358,160,1]];
const TN=[[215,55],[105,0],[190,-60],[300,-105],[250,-180],[130,-215],[95,-295],[200,-340],[305,-390],[230,-460]];
const TD=[[318,40,1],[50,62,-1],[100,-75,-1],[352,-60,1],[340,-200,1],[52,-195,-1],[55,-370,-1],[215,-272,1],[360,-330,1],[320,-470,1]];
const T_MARK=[262,-28],T_POND=[150,-135],T_BED=[78,-452],T_NAME=[150,104],T_END=[180,-560],T_SIGN=[176,-548];
// Перенос точки образца в главу c (c ≥ 1): сдвиг вверх, чётные по счёту главы — зеркально.
const place=(c,[x,y,sd])=>{const m=c%2===0;return [m?MAP.w-x:x,y-(c-1)*STEP,sd==null?undefined:(m?-sd:sd)];};
export const NODES=N1.slice(),DISTRICTS=D1.slice();
const MARKS=[],PONDS=[],BEDS=[[60,611]],NAMES=[];
for(let c=1;c<NCH;c++){
  const n=Math.min(CHAPTER,LEVELS.length-c*CHAPTER);
  for(let k=0;k<n;k++){NODES.push(place(c,TN[k]).slice(0,2));DISTRICTS.push(place(c,TD[k]));}
  const th=theme(c),[mx,my]=place(c,T_MARK),[px,py]=place(c,T_POND),[bx,by]=place(c,T_BED),[nx,ny]=place(c,T_NAME);
  MARKS.push({x:mx,y:my,kind:th.mark,c});PONDS.push([px,py]);BEDS.push([bx,by]);if(th.name)NAMES.push({x:nx,y:ny,key:th.name});
}
const LAST=Math.max(1,NCH-1),ROAD_END=place(LAST,T_END),SIGN=place(LAST,T_SIGN);
// Мир тянется от WORLD.top (верх, конец дороги) до WORLD.bottom (въезд в посёлок).
const WORLD={top:-610-(LAST-1)*STEP,bottom:720};
function catmull(pts,seg){const out=[];for(let i=0;i<pts.length-1;i++){const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];for(let k=0;k<seg;k++){const t=k/seg,t2=t*t,t3=t2*t;const f=j=>0.5*((2*p1[j])+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3);out.push({x:f(0),y:f(1),seg:i});}}const e=pts[pts.length-1];out.push({x:e[0],y:e[1],seg:pts.length-2});return out;}
const SEG=16;
const ROAD=catmull([[300,722],...NODES,ROAD_END],SEG);
const CROSS=ROAD[4*SEG+SEG/2],CROSS2=ROAD[4*SEG+SEG/2+1];
const CROSS_A=Math.atan2(CROSS2.y-CROSS.y,CROSS2.x-CROSS.x);
const RIVER=catmull([[-60,CROSS.y+30],[-10,CROSS.y+22],[CROSS.x-80,CROSS.y+6],[CROSS.x,CROSS.y],[CROSS.x+90,CROSS.y+16],[CROSS.x+180,CROSS.y-6],[430,CROSS.y+8],[470,CROSS.y+4]],SEG);
const TOWER=[348,700];
const mrng=mulberry32(4242);
// Пятна травы: у каждой главы свои оттенки.
const BLOBS=[];for(let k=0;k<90;k++)BLOBS.push({x:-160+mrng()*720,y:-60+mrng()*840,r:18+mrng()*46,c:theme(0).grass[mrng()<0.5?0:1]});
for(let c=1;c<NCH;c++){const top=-650-(c-1)*STEP,g=theme(c).grass;for(let k=0;k<80;k++)BLOBS.push({x:-160+mrng()*720,y:top+mrng()*(STEP+30),r:18+mrng()*46,c:g[mrng()<0.5?0:1]});}
const TREES=[];
{const near=(arr,x,y,d)=>arr.some(p=>(p.x-x)**2+(p.y-y)**2<d*d);
 const free=(x,y)=>!(near(ROAD,x,y,26)||near(RIVER,x,y,32)||
   NODES.some(n=>(n[0]-x)**2+(n[1]-y)**2<34*34)||DISTRICTS.some(d=>(d[0]-x)**2+(d[1]-y)**2<50*50)||
   (TOWER[0]-x)**2+(TOWER[1]-y)**2<44*44||MARKS.some(m=>(m.x-x)**2+(m.y-y)**2<48*48)||
   PONDS.some(p=>((p[0]-x)/62)**2+((p[1]-y)/38)**2<1)||BEDS.some(b=>Math.abs(b[0]-x)<50&&Math.abs(b[1]-y)<32)||
   NAMES.some(n=>Math.abs(n.x-x)<52&&y>n.y-52&&y<n.y+14)||(x>SIGN[0]-40&&x<SIGN[0]+44&&y>SIGN[1]-36&&y<SIGN[1]+14)||
   TREES.some(t=>(t.x-x)**2+(t.y-y)**2<22*22));
 for(let k=0;k<400&&TREES.length<30;k++){const x=14+mrng()*372,y=24+mrng()*690;if(free(x,y))TREES.push({x,y,s:30+mrng()*16,v:Math.floor(mrng()*99)});}
 for(let c=1;c<NCH;c++){const top=-540-(c-1)*STEP,want=TREES.length+32;for(let k=0;k<500&&TREES.length<want;k++){const x=14+mrng()*372,y=top+mrng()*(STEP-30);if(free(x,y))TREES.push({x,y,s:30+mrng()*16,v:Math.floor(mrng()*99)});}}
 // сверху — лес, где карта заканчивается
 for(let k=0;k<26;k++){const x=6+k*15.5+mrng()*6,y=WORLD.top+24+mrng()*34;if(Math.abs(x-ROAD_END[0])>36)TREES.push({x,y,s:34+mrng()*14,v:3*Math.floor(mrng()*30)});}
}
// Насколько «ожил» квартал: 0 — серый, 1 — цветной. Только что пройденная улица оживает плавно.
function districtLife(i){
  const ma=G.mapAnim;
  if(ma&&ma.i===i){if(!ma.t0||G.now<ma.t0)return 0;const t=(G.now-ma.t0)/1100;if(t>=1){G.mapAnim=null;return 1;}return t*t*(3-2*t);}
  return G.stars[i]?1:0;
}
function strokeLine(pts){ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);}

/* ---------- прокрутка ----------
   M.cy — какая точка карты (по высоте) сейчас у верхнего края экрана. Тянем пальцем — карта едет следом,
   отпустили с разгона — едет по инерции. mapFocus подводит карту к нужной улице. */
function view(){const sc=Math.min(G.VW/MAP.w,G.VH/MAP.h);return {sc,vh:G.VH/sc};}
function clampCy(cy){const {vh}=view(),lo=WORLD.top,hi=WORLD.bottom-vh;return hi<lo?(lo+hi)/2:Math.max(lo,Math.min(hi,cy));}
export function mapFocus(i,instant){
  const {vh}=view(),t=clampCy(NODES[i][1]-vh*0.58);M.vel=0;
  if(instant||M.cy==null){M.cy=t;M.target=null;}else M.target=t;
}
let grab=null;
export function mapGrab(py){grab={py0:py,cy0:M.cy,py,t:performance.now()};M.target=null;M.vel=0;}
export function mapDrag(py){
  if(!grab)return;
  const {sc}=view(),t=performance.now(),dt=Math.max(8,t-grab.t);
  M.cy=clampCy(grab.cy0-(py-grab.py0)/sc);
  M.vel=0.6*(-(py-grab.py)/sc/dt*1000)+0.4*M.vel;grab.py=py;grab.t=t;
}
export function mapRelease(){if(grab&&performance.now()-grab.t>90)M.vel=0;grab=null;}
export function mapWheel(dy){const {sc}=view();M.target=null;M.vel=0;M.cy=clampCy(M.cy+dy/sc);}
export function updMap(dt){
  if(M.cy==null||grab)return;
  if(M.target!=null){M.cy+=(M.target-M.cy)*Math.min(1,dt*7);if(Math.abs(M.target-M.cy)<0.5){M.cy=M.target;M.target=null;}}
  else if(Math.abs(M.vel)>4){const c=clampCy(M.cy+M.vel*dt);if(c!==M.cy+M.vel*dt)M.vel=0;M.cy=c;M.vel*=Math.exp(-dt*3.2);}
  else M.vel=0;
}

// Номер улицы под касанием (или −1).
export function nodeAt(px,py){
  const wx=(px-M.ox)/M.sc,wy=(py-M.oy)/M.sc;
  for(let i=0;i<NODES.length;i++){const [x,y]=NODES[i];if((x-wx)**2+(y-wy)**2<30*30)return i;}
  return -1;
}

export function drawMap(){
  const now=G.now,VW=G.VW,VH=G.VH,stars=G.stars;
  ctx.fillStyle='#8cc866';ctx.fillRect(0,0,VW,VH);
  if(M.cy==null)mapFocus(currentIdx(),true);
  const {sc,vh}=view();M.cy=clampCy(M.cy);
  const ox=(VW-MAP.w*sc)/2,oy=-M.cy*sc,y0=M.cy,y1=M.cy+vh;
  M.sc=sc;M.ox=ox;M.oy=oy;
  const inView=(y,up,down)=>y+down>y0&&y-up<y1; // рисуем только то, что видно
  ctx.save();ctx.translate(ox,oy);ctx.scale(sc,sc);
  ctx.globalAlpha=0.55;for(const b of BLOBS)if(inView(b.y,b.r,b.r))circ(b.x,b.y,b.r,b.c);ctx.globalAlpha=1;
  for(const [bx,by] of BEDS)if(inView(by,30,30))drawBed(bx-42,by-23);
  for(const [px,py] of PONDS)if(inView(py,40,40))drawPond(px,py,now);
  ctx.lineCap='round';ctx.lineJoin='round';
  strokeLine(ROAD);
  ctx.save();ctx.translate(2,4);ctx.strokeStyle='rgba(40,70,25,.22)';ctx.lineWidth=28;ctx.stroke();ctx.restore();
  ctx.strokeStyle='#b48e57';ctx.lineWidth=25;ctx.stroke();
  ctx.strokeStyle='#e3c78f';ctx.lineWidth=19;ctx.stroke();
  ctx.save();ctx.setLineDash([3,11]);ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=3;ctx.stroke();ctx.restore();
  strokeLine(RIVER);
  ctx.strokeStyle='#d8c58e';ctx.lineWidth=46;ctx.stroke();
  ctx.strokeStyle='#4ea3e3';ctx.lineWidth=33;ctx.stroke();
  ctx.strokeStyle='#6db7ee';ctx.lineWidth=19;ctx.stroke();
  ctx.save();ctx.setLineDash([10,24]);ctx.lineDashOffset=-now*0.02;ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=2.5;ctx.stroke();ctx.restore();
  ctx.save();ctx.translate(CROSS.x,CROSS.y);ctx.rotate(CROSS_A);
  ctx.fillStyle='rgba(20,50,80,.3)';ctx.fillRect(-29+3,-14+6,58,28);
  ctx.fillStyle='#a8743f';ctx.fillRect(-29,-14,58,28);
  ctx.strokeStyle='#7f5428';ctx.lineWidth=1.4;for(let k=-23;k<29;k+=6){ctx.beginPath();ctx.moveTo(k,-14);ctx.lineTo(k,14);ctx.stroke();}
  ctx.fillStyle='#7a4f26';ctx.fillRect(-31,-17,62,4);ctx.fillRect(-31,13,62,4);
  for(const k of [-29,0,27]){ctx.fillRect(k,-19,4,7);ctx.fillRect(k,12,4,7);}
  ctx.restore();
  const objs=[],add=(y,f)=>{if(inView(y,90,24))objs.push({y,f});};
  for(const t of TREES)add(t.y,()=>drawTree(t.x,t.y,t.s,1,t.v));
  DISTRICTS.forEach((d,i)=>{
    const [ax,ay,sd]=d;if(!inView(ay,90,60))return;
    const lf=districtLife(i),nets=LEVELS[i].nets;
    add(ay-40,()=>{ell(ax+6*sd,ay+2,48,22,mixH('#c7ad73','#a4dc78',lf));});
    add(ay,()=>drawHouse(ax-10*sd,ay,50,{v:i*7+1,life:0.3+0.7*lf,ok:lf>0.95}));
    add(ay+14,()=>drawHouse(ax+22*sd,ay+14,42,{v:i*7+5,life:0.3+0.7*lf,ok:lf>0.95}));
    // в газовых кварталах вместо дерева — теплица
    if(nets.includes('g'))add(ay-6,()=>drawGreenhouse(ax+40*sd,ay-6,40,{f:lf>0.95?1:0,ok:lf>0.95,life:0.3+0.7*lf}));
    else add(ay-8,()=>drawTree(ax+36*sd,ay-8,38,0.25+0.75*lf,i+1));
    if(nets.includes('e'))add(ay+16,()=>drawLamp(ax-30*sd,ay+16,46,{on:lf>0.95,f:lf>0.95?1:0}));
  });
  add(TOWER[1],()=>drawTower(TOWER[0],TOWER[1],78));
  for(const m of MARKS)add(m.y,()=>drawMark(m));
  for(const n of NAMES)add(n.y,()=>drawBoard(n.x,n.y,[t(n.key)],108));
  add(706,()=>drawBoard(82,706,[t('sign')],80));
  objs.sort((a,b)=>a.y-b.y);for(const o of objs)o.f();
  // тени облаков медленно плывут над посёлком
  for(let k=0;k<3;k++){
    const cx=((now*0.006+k*190)%620)-110,cy=y0+((k*0.37+0.12)%1)*vh+Math.sin(now/9000+k)*14;
    ctx.fillStyle='rgba(26,60,30,.075)';
    for(const [dx,dy,r] of [[0,0,46],[44,8,34],[-40,10,30],[10,-16,30]]){ctx.beginPath();ctx.ellipse(cx+dx,cy+dy,r*1.25,r*0.62,0,0,Math.PI*2);ctx.fill();}
  }
  const ci=currentIdx();
  NODES.forEach(([x,y],i)=>{
    if(!inView(y,30,40))return;
    const st=stars[i],un=unlocked(i),cur=un&&!st&&i===ci;
    circ(x+1.5,y+3,18,'rgba(30,50,20,.3)');
    if(cur){const t=(now%1400)/1400;ctx.strokeStyle=`rgba(255,255,255,${0.85*(1-t)})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,18+12*t,0,Math.PI*2);ctx.stroke();}
    circ(x,y,17,st?'#fbf6ea':cur?'#2a7fd6':'#cdc5b1');
    ctx.lineWidth=3;ctx.strokeStyle=st?'#3f9a5a':cur?'#ffffff':'#a69e89';ctx.beginPath();ctx.arc(x,y,17,0,Math.PI*2);ctx.stroke();
    ctx.font='700 14px Unbounded, "Arial Black", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=st?'#24322b':cur?'#ffffff':'#857d6a';ctx.fillText(String(i+1),x,y+1);
    if(!un){ctx.save();ctx.translate(x+12,y-12);drawLock(0,0,40);ctx.restore();}
    if(st)for(let k=0;k<3;k++){starPath(x-13+k*13,y+25,6.5,0);ctx.fillStyle=k<st?'#ffc83d':'#e7dfca';ctx.fill();ctx.strokeStyle='#8a6a1e';ctx.lineWidth=1.2;ctx.stroke();}
    // ворота главы: сколько звёзд набрано в прошлой части из нужных
    if(!un&&i>0&&stars[i-1]>0&&gateNeed(i)){
      const txt=`★ ${chapterStars(i/CHAPTER-1)}/${GATE}`;
      ctx.font='800 11px Nunito, system-ui, sans-serif';const w=ctx.measureText(txt).width+14;
      ctx.fillStyle='rgba(20,32,26,.82)';rrect(x-w/2,y+21,w,18,9);ctx.fill();ctx.fillStyle='#ffc83d';ctx.fillText(txt,x,y+30.5);
    }
  });
  for(const p of G.mparts)drawPart(p);
  // верхний край карты тонет в дымке
  if(y0<WORLD.top+90){const g=ctx.createLinearGradient(0,WORLD.top,0,WORLD.top+70);g.addColorStop(0,'rgba(236,246,226,.95)');g.addColorStop(1,'rgba(236,246,226,0)');ctx.fillStyle=g;ctx.fillRect(-200,WORLD.top-200,800,270);}
  if(inView(SIGN[1],50,20))drawSoon(SIGN[0],SIGN[1]);
  ctx.restore();
}
// Грядки с капустой.
function drawBed(x,y){
  ctx.fillStyle='#9a6e45';rrect(x,y,84,46,8);ctx.fill();ctx.fillStyle='#b5875a';rrect(x,y,84,43,8);ctx.fill();
  for(let r=0;r<5;r++){ctx.strokeStyle='#8a5f39';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+6,y+8+r*8);ctx.lineTo(x+78,y+8+r*8);ctx.stroke();for(let k=0;k<8;k++)circ(x+10+k*9.5,y+7+r*8,2.6,'#5fae48');}
}
// Пруд с камышом и бликами.
function drawPond(x,y,now){
  ell(x+3,y+5,64,36,'rgba(40,70,25,.2)');ell(x,y,64,36,'#d8c58e');ell(x,y,56,30,'#4ea3e3');ell(x-6,y-4,40,19,'#6db7ee');
  ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=2;ctx.lineCap='round';
  for(const [dx,dy,l] of [[-20,-8,14],[10,6,10],[22,-12,8]]){const o=Math.sin(now/900+dx)*3;ctx.beginPath();ctx.moveTo(x+dx+o,y+dy);ctx.lineTo(x+dx+o+l,y+dy);ctx.stroke();}
  for(const [dx,dy] of [[-52,8],[-46,14],[48,10],[54,2]]){ctx.strokeStyle='#4f8a3a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+dx,y+dy);ctx.lineTo(x+dx-2,y+dy-16);ctx.stroke();ell(x+dx-2,y+dy-17,2.4,5,'#7a5232');}
}
// Деревянная табличка на двух столбиках: название посёлка или его части.
function drawBoard(x,y,lines,w){
  const h=lines.length>1?24:22;
  ctx.fillStyle='#7a4f26';ctx.fillRect(x-w/2+12,y-22,4,22);ctx.fillRect(x+w/2-16,y-22,4,22);
  ctx.fillStyle='rgba(40,70,25,.25)';rrect(x-w/2+2,y-18-h+3,w,h,5);ctx.fill();
  ctx.fillStyle='#c98f52';rrect(x-w/2,y-18-h,w,h,5);ctx.fill();ctx.strokeStyle='#7a4f26';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.22)';rrect(x-w/2+3,y-18-h+3,w-6,4,2);ctx.fill();
  ctx.fillStyle='#3d2a14';ctx.textAlign='center';ctx.textBaseline='middle';
  let fs=lines.length>1?10:11;ctx.font=`800 ${fs}px Nunito, system-ui, sans-serif`;
  while(fs>7&&Math.max(...lines.map(l=>ctx.measureText(l).width))>w-10){fs-=0.5;ctx.font=`800 ${fs}px Nunito, system-ui, sans-serif`;}
  lines.forEach((l,k)=>ctx.fillText(l,x,y-18-h/2+(lines.length>1?(k?5.5:-4.5):1)));
}
// Постройка главы: газгольдер, колодец-журавль…
function drawMark(m){
  if(m.kind==='gas')drawGasTank(m.x,m.y,74);
  else if(m.kind==='well')drawWell(m.x-14,m.y+24,G.stars[m.c*CHAPTER]?1:0.45);
}
// Колодец-журавль: сруб с крышей-навесом, длинный шест с ведром.
function drawWell(x,y,lf){
  const wood=mixH('#9a9a94','#a8743f',lf),dark=mixH('#77776f','#7a4f26',lf),roof=mixH('#8d8d88','#b5533c',lf);
  ell(x+4,y+3,34,11,'rgba(30,60,20,.26)');
  // журавль: стойка и шест с противовесом
  ctx.strokeStyle=dark;ctx.lineCap='round';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+30,y);ctx.lineTo(x+30,y-46);ctx.stroke();
  ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+46,y-36);ctx.lineTo(x-2,y-58);ctx.stroke();
  ctx.fillStyle=dark;ctx.fillRect(x+41,y-40,9,9);
  ctx.strokeStyle='#5a4a36';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x-2,y-58);ctx.lineTo(x-2,y-30);ctx.stroke();
  poly([[x-7,y-30],[x+3,y-30],[x+1.5,y-21],[x-5.5,y-21]],mixH('#9aa0a6','#7fa9c9',lf));
  // сруб
  ctx.fillStyle=wood;rrect(x-17,y-18,30,20,3);ctx.fill();
  ctx.strokeStyle=dark;ctx.lineWidth=1.3;for(let k=1;k<4;k++){ctx.beginPath();ctx.moveTo(x-17,y-18+k*5);ctx.lineTo(x+13,y-18+k*5);ctx.stroke();}
  ell(x-2,y-18,15,4.5,dark);ell(x-2,y-18,12,3.2,lf>0.9?'#4ea3e3':'#5f6d75');
  // навес
  ctx.fillStyle=dark;ctx.fillRect(x-16,y-40,3,22);ctx.fillRect(x+9,y-40,3,22);
  poly([[x-23,y-38],[x-2,y-52],[x+19,y-38]],roof);poly([[x-23,y-38],[x+19,y-38],[x+17,y-35],[x-21,y-35]],mixH(roof,'#000000',0.2));
}
// Конец дороги: шлагбаум и табличка «Скоро новые улицы».
function drawSoon(x,y){
  ctx.fillStyle='#7a4f26';ctx.fillRect(x-30,y-28,4,30);ctx.fillRect(x+26,y-28,4,30);
  ctx.fillStyle='#c98f52';rrect(x-38,y-46,76,24,5);ctx.fill();ctx.strokeStyle='#7a4f26';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#3d2a14';ctx.font='800 10px Nunito, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t('soon1'),x,y-39);ctx.fillText(t('soon2'),x,y-29);
  for(let k=0;k<5;k++){ctx.fillStyle=k%2?'#ffffff':'#e0533d';ctx.fillRect(x-30+k*12,y-12,12,6);}
}
