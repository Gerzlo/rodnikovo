// Карта посёлка Родниково: дорога с улицами, речка с мостом, кварталы, которые оживают после прохождения.
import { mulberry32 } from './core.js';
import { ctx, mixH, rrect, circ, ell, starPath, drawHouse, drawLamp, drawTower, drawTree, drawLock } from './art.js';
import { drawPart } from './fx.js';
import { G, M, unlocked, currentIdx } from './state.js';

// Карта рисуется в своих координатах 400×720 и вписывается в экран.
const MAP={w:400,h:720};
export const NODES=[[200,640],[295,582],[215,522],[110,492],[185,416],[300,366],[240,296],[125,250],[195,180],[300,118]];
// Кварталы у каждой улицы: x, y, сторона (−1 — дома левее точки, 1 — правее).
export const DISTRICTS=[[118,656,-1],[352,604,1],[318,512,1],[54,536,-1],[92,392,-1],[350,404,1],[330,270,1],[54,282,-1],[104,152,-1],[214,84,-1]];
function catmull(pts,seg){const out=[];for(let i=0;i<pts.length-1;i++){const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];for(let k=0;k<seg;k++){const t=k/seg,t2=t*t,t3=t2*t;const f=j=>0.5*((2*p1[j])+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3);out.push({x:f(0),y:f(1),seg:i});}}const e=pts[pts.length-1];out.push({x:e[0],y:e[1],seg:pts.length-2});return out;}
const SEG=16;
const ROAD=catmull([[300,722],...NODES],SEG);
const CROSS=ROAD[4*SEG+SEG/2],CROSS2=ROAD[4*SEG+SEG/2+1];
const CROSS_A=Math.atan2(CROSS2.y-CROSS.y,CROSS2.x-CROSS.x);
const RIVER=catmull([[-60,CROSS.y+30],[-10,CROSS.y+22],[CROSS.x-80,CROSS.y+6],[CROSS.x,CROSS.y],[CROSS.x+90,CROSS.y+16],[CROSS.x+180,CROSS.y-6],[430,CROSS.y+8],[470,CROSS.y+4]],SEG);
const TOWER=[348,700];
const mrng=mulberry32(4242);
const BLOBS=[];for(let k=0;k<90;k++)BLOBS.push({x:-160+mrng()*720,y:-60+mrng()*840,r:18+mrng()*46,c:mrng()<0.5?'#97d16f':'#7fbb5b'});
const TREES=[];
{const near=(arr,x,y,d)=>arr.some(p=>(p.x-x)**2+(p.y-y)**2<d*d);
 for(let k=0;k<400&&TREES.length<30;k++){
  const x=14+mrng()*372,y=24+mrng()*690;
  if(near(ROAD,x,y,26)||near(RIVER,x,y,32))continue;
  if(NODES.some(n=>(n[0]-x)**2+(n[1]-y)**2<34*34))continue;
  if(DISTRICTS.some(d=>(d[0]-x)**2+(d[1]-y)**2<50*50))continue;
  if((TOWER[0]-x)**2+(TOWER[1]-y)**2<44*44)continue;
  if(x<100&&y>570&&y<640)continue;
  if(TREES.some(t=>(t.x-x)**2+(t.y-y)**2<22*22))continue;
  TREES.push({x,y,s:30+mrng()*16,v:Math.floor(mrng()*99)});
 }}
// Насколько «ожил» квартал: 0 — серый, 1 — цветной. Только что пройденная улица оживает плавно.
function districtLife(i){
  const ma=G.mapAnim;
  if(ma&&ma.i===i){if(!ma.t0||G.now<ma.t0)return 0;const t=(G.now-ma.t0)/1100;if(t>=1){G.mapAnim=null;return 1;}return t*t*(3-2*t);}
  return G.stars[i]?1:0;
}
function strokeLine(pts){ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);}

// Номер улицы под касанием (или −1).
export function nodeAt(px,py){
  const wx=(px-M.ox)/M.sc,wy=(py-M.oy)/M.sc;
  for(let i=0;i<NODES.length;i++){const [x,y]=NODES[i];if((x-wx)**2+(y-wy)**2<30*30)return i;}
  return -1;
}

export function drawMap(){
  const now=G.now,VW=G.VW,VH=G.VH,stars=G.stars;
  ctx.fillStyle='#8cc866';ctx.fillRect(0,0,VW,VH);
  const sc=Math.min(VW/MAP.w,VH/MAP.h),ox=(VW-MAP.w*sc)/2,oy=(VH-MAP.h*sc)/2;
  M.sc=sc;M.ox=ox;M.oy=oy;
  ctx.save();ctx.translate(ox,oy);ctx.scale(sc,sc);
  ctx.globalAlpha=0.55;for(const b of BLOBS)circ(b.x,b.y,b.r,b.c);ctx.globalAlpha=1;
  ctx.fillStyle='#9a6e45';rrect(18,588,84,46,8);ctx.fill();ctx.fillStyle='#b5875a';rrect(18,588,84,43,8);ctx.fill();
  for(let r=0;r<5;r++){ctx.strokeStyle='#8a5f39';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(24,596+r*8);ctx.lineTo(96,596+r*8);ctx.stroke();for(let k=0;k<8;k++)circ(28+k*9.5,595+r*8,2.6,'#5fae48');}
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
  const objs=[];
  for(const t of TREES)objs.push({y:t.y,f:()=>drawTree(t.x,t.y,t.s,1,t.v)});
  DISTRICTS.forEach((d,i)=>{
    const lf=districtLife(i),[ax,ay,sd]=d;
    objs.push({y:ay-40,f:()=>{ell(ax+6*sd,ay+2,48,22,mixH('#c7ad73','#a4dc78',lf));}});
    objs.push({y:ay,f:()=>drawHouse(ax-10*sd,ay,50,{v:i*7+1,life:0.3+0.7*lf,ok:lf>0.95})});
    objs.push({y:ay+14,f:()=>drawHouse(ax+22*sd,ay+14,42,{v:i*7+5,life:0.3+0.7*lf,ok:lf>0.95})});
    objs.push({y:ay-8,f:()=>drawTree(ax+36*sd,ay-8,38,0.25+0.75*lf,i+1)});
    if(i>=5)objs.push({y:ay+16,f:()=>drawLamp(ax-30*sd,ay+16,46,{on:lf>0.95,f:lf>0.95?1:0})});
  });
  objs.push({y:TOWER[1],f:()=>drawTower(TOWER[0],TOWER[1],78)});
  objs.push({y:704,f:()=>{
    ctx.fillStyle='#7a4f26';ctx.fillRect(56,684,4,22);ctx.fillRect(104,684,4,22);
    ctx.fillStyle='#c98f52';rrect(42,666,80,24,5);ctx.fill();ctx.strokeStyle='#7a4f26';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#3d2a14';ctx.font='800 11px Nunito, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Родниково',82,679);
  }});
  objs.sort((a,b)=>a.y-b.y);for(const o of objs)o.f();
  const ci=currentIdx();
  NODES.forEach(([x,y],i)=>{
    const st=stars[i],un=unlocked(i),cur=un&&!st&&i===ci;
    circ(x+1.5,y+3,18,'rgba(30,50,20,.3)');
    if(cur){const t=(now%1400)/1400;ctx.strokeStyle=`rgba(255,255,255,${0.85*(1-t)})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,18+12*t,0,Math.PI*2);ctx.stroke();}
    circ(x,y,17,st?'#fbf6ea':cur?'#2a7fd6':'#cdc5b1');
    ctx.lineWidth=3;ctx.strokeStyle=st?'#3f9a5a':cur?'#ffffff':'#a69e89';ctx.beginPath();ctx.arc(x,y,17,0,Math.PI*2);ctx.stroke();
    ctx.font='700 14px Unbounded, "Arial Black", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=st?'#24322b':cur?'#ffffff':'#857d6a';ctx.fillText(String(i+1),x,y+1);
    if(!un){ctx.save();ctx.translate(x+12,y-12);drawLock(0,0,40);ctx.restore();}
    if(st)for(let k=0;k<3;k++){starPath(x-13+k*13,y+25,6.5,0);ctx.fillStyle=k<st?'#ffc83d':'#e7dfca';ctx.fill();ctx.strokeStyle='#8a6a1e';ctx.lineWidth=1.2;ctx.stroke();}
  });
  for(const p of G.mparts)drawPart(p);
  ctx.restore();
}
