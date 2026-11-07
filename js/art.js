// Рисунки: цвета, простые фигуры, постройки, природа и реестр объектов для клеток.
import { G } from './state.js';

export let ctx = null;
export function setCtx(c) { ctx = c; }

/* ---------- цвета ---------- */
const HX=new Map();
function hx(h){let v=HX.get(h);if(!v){const n=parseInt(h.slice(1),16);v=[(n>>16)&255,(n>>8)&255,n&255];HX.set(h,v);}return v;}
export function mixH(a,b,t){t=t<0?0:t>1?1:t;const A=hx(a),Bc=hx(b);let s='#';for(let i=0;i<3;i++){const v=Math.round(A[i]+(Bc[i]-A[i])*t);s+=(v<16?'0':'')+v.toString(16);}return s;}
export function shade(h,k){return k<0?mixH(h,'#000000',-k):mixH(h,'#ffffff',k);}
function grey(h){const c=hx(h);const v=Math.min(232,Math.round((c[0]*.3+c[1]*.59+c[2]*.11)*.72+38));const w=Math.round(v*.95);return '#'+[v,v,w].map(z=>(z<16?'0':'')+z.toString(16)).join('');}
// life: 0 — серый «неживой» цвет, 1 — полный цвет
export function life(h,t){return t>=0.999?h:mixH(grey(h),h,t);}

/* ---------- простые фигуры ---------- */
export function rrect(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else{ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}}
export function poly(pts,fill){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
export function circ(x,y,r,fill){ctx.beginPath();ctx.arc(x,y,Math.max(0.1,r),0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
export function ell(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,Math.max(0.1,rx),Math.max(0.1,ry),0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
export function dropPath(x,y,r){ctx.beginPath();ctx.moveTo(x,y-r);ctx.bezierCurveTo(x+r*0.95,y-r*0.05,x+r*0.75,y+r*0.85,x,y+r*0.85);ctx.bezierCurveTo(x-r*0.75,y+r*0.85,x-r*0.95,y-r*0.05,x,y-r);ctx.closePath();}
export function boltPath(x,y,r){ctx.beginPath();ctx.moveTo(x+r*0.2,y-r);ctx.lineTo(x-r*0.55,y+r*0.15);ctx.lineTo(x-r*0.02,y+r*0.15);ctx.lineTo(x-r*0.22,y+r);ctx.lineTo(x+r*0.58,y-r*0.18);ctx.lineTo(x+r*0.06,y-r*0.18);ctx.closePath();}
export function starPath(x,y,r,rot){ctx.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+(rot||0)+k*Math.PI/5,rr=k%2?r*0.45:r;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}ctx.closePath();}
// Метка над домом или фонарём: капля (вода) или молния (ток); ok — сеть дошла.
export function badge(x,y,r,kind,ok){
  circ(x,y+r*0.16,r,'rgba(20,40,20,.25)');
  circ(x,y,r,ok?(kind==='w'?'#2a7fd6':'#f2b631'):'#fffaf0');
  ctx.lineWidth=Math.max(1,r*0.15);ctx.strokeStyle=ok?(kind==='w'?'#1b5fa8':'#b98510'):'#cfc4a8';
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
  if(kind==='w'){dropPath(x,y+r*0.02,r*0.58);ctx.fillStyle=ok?'#ffffff':'#a8b2b8';ctx.fill();}
  else{boltPath(x,y,r*0.6);ctx.fillStyle=ok?'#3b2a04':'#a8b2b8';ctx.fill();}
}

/* ---------- постройки и природа ----------
   Все функции рисуют от точки опоры (x, y) — середины основания; s — размер. */
const WALLS=['#f4e7c9','#f7f0e3','#efdcb4','#f3dfd0'];
const ROOFS=['#d4573b','#3f948e','#4b72b8','#a35f3d','#cf8232'];
export function drawHouse(x,y,s,o){
  const lf=o.life==null?1:o.life,v=o.v||0;
  const wb=WALLS[v%4],rb=ROOFS[(v>>2)%5];
  const wall=life(wb,lf),wallD=life(shade(wb,-0.17),lf),roof=life(rb,lf),roofD=life(shade(rb,-0.28),lf);
  const w=s*0.5,hw=s*0.27,rh=s*0.25,dx=s*0.13,dy=s*0.09,ovh=s*0.05,ey=y-hw+s*0.025;
  ell(x+dx*0.5,y+s*0.01,w*0.74,s*0.075,'rgba(30,60,20,.24)');
  poly([[x+w/2,y],[x+w/2+dx,y-dy],[x+w/2+dx,y-hw-dy],[x+w/2,y-hw]],wallD);
  ctx.fillStyle=wall;ctx.fillRect(x-w/2,y-hw,w,hw);
  ctx.fillStyle='rgba(0,0,0,.08)';ctx.fillRect(x-w/2,y-s*0.03,w,s*0.03);
  const chx=x+w*0.36,chy=y-hw-rh*0.42;
  ctx.fillStyle=life('#a5503a',lf);ctx.fillRect(chx,chy-s*0.11,s*0.055,s*0.12);
  ctx.fillStyle=life('#7d3a29',lf);ctx.fillRect(chx-s*0.008,chy-s*0.12,s*0.071,s*0.022);
  poly([[x,y-hw-rh],[x+dx,y-hw-rh-dy],[x+w/2+ovh+dx,ey-dy],[x+w/2+ovh,ey]],roof);
  poly([[x-w/2,y-hw],[x,y-hw-rh+s*0.035],[x+w/2,y-hw]],shade(wall,0.06));
  ctx.strokeStyle=roofD;ctx.lineWidth=s*0.06;ctx.lineJoin='round';ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x-w/2-ovh,ey);ctx.lineTo(x,y-hw-rh);ctx.lineTo(x+w/2+ovh,ey);ctx.stroke();
  ctx.lineWidth=s*0.03;ctx.beginPath();ctx.moveTo(x,y-hw-rh);ctx.lineTo(x+dx,y-hw-rh-dy);ctx.stroke();
  const win=o.ok?'#ffe39a':life('#7d96a8',lf);
  ctx.fillStyle=life('#8a5434',lf);rrect(x-s*0.055,y-s*0.155,s*0.11,s*0.155,s*0.025);ctx.fill();
  circ(x+s*0.03,y-s*0.08,s*0.011,'#e8c36a');
  for(const sx of [-1,1]){ctx.fillStyle=win;ctx.fillRect(x+sx*w*0.3-s*0.04,y-hw*0.72,s*0.08,s*0.07);ctx.fillStyle=life('#ffffff',lf);ctx.fillRect(x+sx*w*0.3-s*0.005,y-hw*0.72,s*0.01,s*0.07);}
  circ(x,y-hw-rh*0.4,s*0.036,win);
  poly([[x+w/2+dx*0.28,y-hw*0.38-dy*0.28],[x+w/2+dx*0.78,y-hw*0.38-dy*0.78],[x+w/2+dx*0.78,y-hw*0.72-dy*0.78],[x+w/2+dx*0.28,y-hw*0.72-dy*0.28]],o.ok?'#f5d47e':life('#6f8696',lf));
  if(o.ok){
    for(let k=0;k<3;k++){const t=((G.now/1600)+k/3)%1;circ(chx+s*0.03+t*s*0.08,chy-s*0.13-t*s*0.22,s*(0.025+t*0.035),`rgba(255,255,255,${0.55*(1-t)})`);}
    for(const fx of [x-w/2-s*0.03,x+w/2+dx+s*0.02]){circ(fx,y-s*0.03,s*0.055,'#4e9c43');circ(fx-s*0.02,y-s*0.06,s*0.018,'#ff7aa8');circ(fx+s*0.025,y-s*0.05,s*0.016,'#ffd34d');}
  }
}
// Фонарь симметричный: тумба, столб, коробка посередине (к ней подходит провод), фонарь сверху.
export function drawLamp(x,y,s,o){
  const f=o.f||0,on=o.on,top=y-s*0.6,ly=y-s*0.665,by=y-s*0.4;
  if(f>0.05){const g=ctx.createRadialGradient(x,y,1,x,y,s*0.42);g.addColorStop(0,`rgba(255,226,140,${0.55*f})`);g.addColorStop(1,'rgba(255,226,140,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,s*0.42,s*0.18,0,0,Math.PI*2);ctx.fill();}
  ell(x+s*0.04,y+s*0.005,s*0.12,s*0.035,'rgba(30,60,20,.25)');
  ctx.fillStyle='#24392f';rrect(x-s*0.085,y-s*0.085,s*0.17,s*0.085,s*0.02);ctx.fill();
  ctx.fillStyle='#3b6152';ctx.fillRect(x-s*0.085,y-s*0.085,s*0.17,s*0.018);
  const pg=ctx.createLinearGradient(x-s*0.03,0,x+s*0.03,0);pg.addColorStop(0,'#4f7866');pg.addColorStop(1,'#24392f');
  ctx.fillStyle=pg;ctx.fillRect(x-s*0.03,top,s*0.06,y-s*0.085-top);
  ctx.fillStyle='#3a4048';rrect(x-s*0.08,by-s*0.065,s*0.16,s*0.13,s*0.025);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(x-s*0.07,by-s*0.058,s*0.14,s*0.02);
  circ(x,by+s*0.015,s*0.022,on?'#ffd24a':'#6b737c');
  if(f>0.05){const g=ctx.createRadialGradient(x,ly,1,x,ly,s*0.34);g.addColorStop(0,`rgba(255,236,150,${0.85*f})`);g.addColorStop(1,'rgba(255,236,150,0)');ctx.fillStyle=g;ctx.fillRect(x-s*0.36,ly-s*0.36,s*0.72,s*0.72);}
  ctx.fillStyle='#24392f';ctx.fillRect(x-s*0.045,top-s*0.02,s*0.09,s*0.025);
  poly([[x-s*0.05,top-s*0.02],[x+s*0.05,top-s*0.02],[x+s*0.08,y-s*0.71],[x-s*0.08,y-s*0.71]],on?'#fff1b0':'#8d969e');
  ctx.strokeStyle='#24392f';ctx.lineWidth=Math.max(1,s*0.018);ctx.beginPath();ctx.moveTo(x,top-s*0.02);ctx.lineTo(x,y-s*0.71);ctx.stroke();
  poly([[x-s*0.1,y-s*0.71],[x+s*0.1,y-s*0.71],[x,y-s*0.78]],'#24392f');
  circ(x,y-s*0.785,s*0.018,'#24392f');
}
// Водонапорная башня (как у Рожновского): столб, бак с синей полосой, конусная крыша.
export function drawTower(x,y,s){
  ell(x+s*0.07,y+s*0.01,s*0.26,s*0.07,'rgba(30,60,20,.28)');
  const colTop=y-s*0.4,tankTop=y-s*0.68,tw=s*0.22;
  const g=ctx.createLinearGradient(x-s*0.12,0,x+s*0.12,0);g.addColorStop(0,'#c9d6e0');g.addColorStop(.45,'#95abbd');g.addColorStop(1,'#5f768a');
  poly([[x-s*0.12,y],[x+s*0.12,y],[x+s*0.085,colTop],[x-s*0.085,colTop]],g);
  ctx.strokeStyle='rgba(40,60,80,.4)';ctx.lineWidth=1;
  for(let k=1;k<4;k++){const yy=y-(y-colTop)*k/4,hw=s*0.12-s*0.035*k/4;ctx.beginPath();ctx.moveTo(x-hw,yy);ctx.lineTo(x+hw,yy);ctx.stroke();}
  ctx.strokeStyle='#4e6275';ctx.lineWidth=Math.max(1,s*0.012);
  ctx.beginPath();ctx.moveTo(x+s*0.05,y-s*0.02);ctx.lineTo(x+s*0.04,colTop);ctx.moveTo(x+s*0.08,y-s*0.02);ctx.lineTo(x+s*0.065,colTop);ctx.stroke();
  for(let k=1;k<7;k++){const yy=y-(y-colTop)*k/7;ctx.beginPath();ctx.moveTo(x+s*0.045,yy);ctx.lineTo(x+s*0.075,yy);ctx.stroke();}
  ctx.fillStyle='#4b5d6e';rrect(x-s*0.07,y-s*0.12,s*0.07,s*0.12,s*0.02);ctx.fill();
  const tg=ctx.createLinearGradient(x-tw,0,x+tw,0);tg.addColorStop(0,'#e6eff5');tg.addColorStop(.5,'#b5c8d7');tg.addColorStop(1,'#7c94a9');
  ctx.fillStyle=tg;ctx.beginPath();ctx.moveTo(x-tw,tankTop);ctx.lineTo(x-tw,colTop);ctx.ellipse(x,colTop,tw,s*0.06,0,Math.PI,0,true);ctx.lineTo(x+tw,tankTop);ctx.closePath();ctx.fill();
  const b1=tankTop+(colTop-tankTop)*0.42,b2=b1+s*0.055;
  ctx.fillStyle='#2a7fd6';ctx.beginPath();ctx.moveTo(x-tw,b1);ctx.ellipse(x,b1,tw,s*0.06,0,Math.PI,0,true);ctx.lineTo(x+tw,b2);ctx.ellipse(x,b2,tw,s*0.06,0,0,Math.PI,false);ctx.closePath();ctx.fill();
  ctx.fillStyle='#596e82';ctx.beginPath();ctx.moveTo(x-tw-s*0.025,tankTop);ctx.lineTo(x,tankTop-s*0.17);ctx.lineTo(x+tw+s*0.025,tankTop);ctx.ellipse(x,tankTop,tw+s*0.025,s*0.055,0,0,Math.PI,false);ctx.closePath();ctx.fill();
  poly([[x-tw*0.75,tankTop+s*0.01],[x-s*0.01,tankTop-s*0.16],[x-tw*0.2,tankTop+s*0.04]],'rgba(255,255,255,.22)');
  circ(x,tankTop-s*0.18,s*0.022,'#dfe8ef');
}
// Трансформаторная подстанция: будка с дверями, знаком «опасно» и изоляторами на крыше.
export function drawTP(x,y,s,on){
  ell(x+s*0.06,y+s*0.01,s*0.3,s*0.07,'rgba(30,60,20,.28)');
  const w=s*0.46,h=s*0.36,dx=s*0.1,dy=s*0.07;
  poly([[x+w/2,y],[x+w/2+dx,y-dy],[x+w/2+dx,y-h-dy],[x+w/2,y-h]],'#b3ad9b');
  ctx.fillStyle='#e3ded0';ctx.fillRect(x-w/2,y-h,w,h);
  poly([[x-w/2-s*0.03,y-h],[x+w/2+s*0.03,y-h],[x+w/2+s*0.03+dx,y-h-dy],[x-w/2-s*0.03+dx,y-h-dy]],'#5b616b');
  ctx.fillStyle='#454b54';ctx.fillRect(x-w/2-s*0.03,y-h,w+s*0.06,s*0.025);
  ctx.fillStyle='#a3aab1';ctx.fillRect(x-w*0.42,y-h*0.82,w*0.38,h*0.8);ctx.fillRect(x+w*0.04,y-h*0.82,w*0.38,h*0.8);
  ctx.strokeStyle='#7f868e';ctx.lineWidth=1;ctx.strokeRect(x-w*0.42,y-h*0.82,w*0.38,h*0.8);ctx.strokeRect(x+w*0.04,y-h*0.82,w*0.38,h*0.8);
  const tx=x-w*0.23,ty=y-h*0.55,tr=s*0.075;
  poly([[tx,ty-tr],[tx+tr*1.05,ty+tr*0.75],[tx-tr*1.05,ty+tr*0.75]],'#ffcc33');
  boltPath(tx,ty+tr*0.12,tr*0.5);ctx.fillStyle='#2b2b2b';ctx.fill();
  for(let k=0;k<3;k++){const ix=x-w*0.25+k*w*0.25+dx*0.5,iy=y-h-dy*0.5;ctx.fillStyle='#f2efe6';ctx.fillRect(ix-s*0.015,iy-s*0.07,s*0.03,s*0.07);circ(ix,iy-s*0.075,s*0.022,'#ffffff');}
  if(on){const g=ctx.createRadialGradient(tx,ty,1,tx,ty,s*0.25);g.addColorStop(0,'rgba(255,220,90,.55)');g.addColorStop(1,'rgba(255,220,90,0)');ctx.fillStyle=g;ctx.fillRect(tx-s*0.25,ty-s*0.25,s*0.5,s*0.5);}
}
// Дерево: v%3===0 — ёлка, иначе лиственное (иногда с яблоками).
export function drawTree(x,y,s,lf,v){
  ell(x+s*0.07,y+s*0.01,s*0.24,s*0.07,'rgba(30,60,20,.26)');
  const dk=life('#3c873d',lf),md=life('#58a84a',lf),lt=life('#86cc5f',lf),tr=life('#7a5232',lf);
  if(v%3===0){
    ctx.fillStyle=tr;ctx.fillRect(x-s*0.035,y-s*0.14,s*0.07,s*0.14);
    poly([[x-s*0.25,y-s*0.12],[x+s*0.25,y-s*0.12],[x,y-s*0.48]],dk);
    poly([[x-s*0.21,y-s*0.3],[x+s*0.21,y-s*0.3],[x,y-s*0.64]],md);
    poly([[x-s*0.15,y-s*0.47],[x+s*0.15,y-s*0.47],[x,y-s*0.78]],lt);
  }else{
    ctx.fillStyle=tr;ctx.fillRect(x-s*0.035,y-s*0.24,s*0.07,s*0.24);
    circ(x-s*0.13,y-s*0.33,s*0.16,dk);circ(x+s*0.12,y-s*0.35,s*0.15,dk);
    circ(x,y-s*0.47,s*0.19,md);circ(x-s*0.09,y-s*0.36,s*0.13,md);
    circ(x-s*0.05,y-s*0.53,s*0.08,lt);
    if(lf>0.9&&v%3===1){circ(x+s*0.08,y-s*0.42,s*0.025,'#e94b4b');circ(x-s*0.1,y-s*0.3,s*0.025,'#e94b4b');}
  }
}
export function drawBush(x,y,s,v){
  ell(x+s*0.04,y+s*0.03,s*0.2,s*0.06,'rgba(30,60,20,.22)');
  circ(x-s*0.1,y-s*0.04,s*0.11,'#4a9a42');circ(x+s*0.09,y-s*0.03,s*0.1,'#4a9a42');circ(x,y-s*0.1,s*0.13,'#62b350');
  circ(x-s*0.03,y-s*0.15,s*0.05,'#87cf62');
  const fc=['#ff7aa8','#ffd34d','#ffffff','#b48cff'][v%4];
  for(let k=0;k<4;k++)circ(x+Math.cos(k*1.7+v)*s*0.12,y-s*0.07+Math.sin(k*2.3+v)*s*0.06,s*0.02,fc);
}
export function drawRocks(x,y,s,v){
  ell(x+s*0.04,y+s*0.04,s*0.26,s*0.07,'rgba(30,60,20,.24)');
  poly([[x-s*0.24,y+s*0.03],[x-s*0.2,y-s*0.12],[x-s*0.06,y-s*0.2],[x+s*0.06,y-s*0.12],[x+s*0.04,y+s*0.04]],'#8e8f88');
  poly([[x-s*0.2,y-s*0.12],[x-s*0.06,y-s*0.2],[x-s*0.02,y-s*0.1],[x-s*0.16,y-s*0.05]],'#b4b5ad');
  poly([[x,y+s*0.04],[x+s*0.05,y-s*0.08],[x+s*0.17,y-s*0.1],[x+s*0.24,y],[x+s*0.2,y+s*0.05]],'#7f8079');
  poly([[x+s*0.05,y-s*0.08],[x+s*0.17,y-s*0.1],[x+s*0.15,y-s*0.03]],'#a6a79f');
  if(v%2)circ(x-s*0.24,y+s*0.02,s*0.04,'#62b350');
}
export function drawLock(x,y,S){
  const r=S*0.085;
  ctx.strokeStyle='#6b5a2e';ctx.lineWidth=S*0.028;ctx.beginPath();ctx.arc(x,y-r*0.2,r*0.62,Math.PI,0);ctx.stroke();
  ctx.fillStyle='#e2b649';rrect(x-r,y-r*0.25,r*2,r*1.5,r*0.35);ctx.fill();
  ctx.strokeStyle='#8a6a26';ctx.lineWidth=1;ctx.stroke();
  circ(x,y+r*0.4,r*0.22,'#6b5a2e');
}
export function drawTuft(x,y,k){ctx.strokeStyle='rgba(50,110,35,.45)';ctx.lineWidth=1.6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3*k,y-7*k);ctx.moveTo(x,y);ctx.lineTo(x,y-9*k);ctx.moveTo(x,y);ctx.lineTo(x+3*k,y-7*k);ctx.stroke();}
export function drawFlowers(x,y,k,c){const fc=['#ff7aa8','#ffd34d','#ffffff','#b48cff'][c];for(let i=0;i<3;i++){const fx=x+Math.cos(i*2.1)*6*k,fy=y+Math.sin(i*2.1)*4*k;circ(fx,fy,2.6*k,fc);circ(fx,fy,1*k,'#f0a020');}}

/* ---------- объекты в клетках ----------
   ПРАВИЛО: любой объект в клетке стоит по центру своих габаритов.
   Габариты — в долях размера s: [лево, право, верх, низ] от точки опоры (середина основания).
   Новую постройку (газ, котельная…) добавь сюда с габаритами — она сама встанет по центру. */
export const OBJECTS={
  house:{box:[-0.33,0.43,-0.62,0],scale:1,draw:(x,y,s,o)=>drawHouse(x,y,s,o)},
  lamp: {box:[-0.1,0.1,-0.8,0],scale:1,draw:(x,y,s,o)=>drawLamp(x,y,s,o)},
  tower:{box:[-0.245,0.245,-0.882,0],scale:0.92,draw:(x,y,s)=>drawTower(x,y,s)},
  tp:   {box:[-0.26,0.36,-0.492,0],scale:1.05,draw:(x,y,s,o)=>drawTP(x,y,s,o.on)},
  tree: {box:[-0.29,0.27,-0.66,0],scale:0.95,draw:(x,y,s,o)=>drawTree(x,y,s,1,o.v)},
  pine: {box:[-0.25,0.25,-0.78,0],scale:0.95,draw:(x,y,s,o)=>drawTree(x,y,s,1,o.v)},
  rocks:{box:[-0.28,0.24,-0.2,0.05],scale:1,draw:(x,y,s,o)=>drawRocks(x,y,s,o.v)},
  bush: {box:[-0.21,0.19,-0.23,0.07],scale:1,draw:(x,y,s,o)=>drawBush(x,y,s,o.v)},
};
export function drawInCell(kind,x0,y0,S,o){
  const ob=OBJECTS[kind],s=S*ob.scale,b=ob.box;
  ob.draw(x0+S/2-(b[0]+b[1])/2*s,y0+S/2-(b[2]+b[3])/2*s,s,o||{});
}
