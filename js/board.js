// Поле улицы: плитки, трубы и провода, отрисовка улицы и её раскладка на экране.
import { DX, DY, BIT, isCorner, bitCount, mulberry32, isLeaf, canTurn } from './core.js';
import { t as tr } from './i18n.js';
import { ctx, setCtx, mixH, rrect, circ, ell, badge, flamePath, drawLock, drawInCell, drawTuft, drawFlowers } from './art.js';
import { G, B } from './state.js';

/* ---------- трубы ---------- */
// Толщина трубы по сети (доля клетки) и порядок рисования: провод всегда сверху, газ — над водой.
const TUBE_W={w:0.25,g:0.2,e:0.15},ORDER={w:0,g:1,e:2};
// Тени и блики считаются в экранных координатах, поэтому при повороте клетки свет падает с одной стороны.
let curAng=0;
function offv(dx,dy){const c=Math.cos(-curAng),s=Math.sin(-curAng);return [dx*c-dy*s,dx*s+dy*c];}
function segPath(mask,entry,h){
  const p=new Path2D(),dirs=[0,1,2,3].filter(d=>mask&BIT[d]);
  const mid=d=>[DX[d]*h,DY[d]*h];
  if(dirs.length===2&&isCorner(mask)){
    let a=dirs[0],b=dirs[1];if(entry===b){const t=a;a=b;b=t;}
    const cx=(DX[a]+DX[b])*h,cy=(DY[a]+DY[b])*h,A=mid(a),Bp=mid(b);
    const a1=Math.atan2(A[1]-cy,A[0]-cx),a2=Math.atan2(Bp[1]-cy,Bp[0]-cx);
    let diff=a2-a1;while(diff>Math.PI)diff-=2*Math.PI;while(diff<-Math.PI)diff+=2*Math.PI;
    p.moveTo(A[0],A[1]);p.arc(cx,cy,h,a1,a2,diff<0);
  }else{
    const order=(entry>=0&&dirs.includes(entry))?[entry,...dirs.filter(d=>d!==entry)]:dirs;
    order.forEach((d,i)=>{const m=mid(d);if(i===0&&d===entry){p.moveTo(m[0],m[1]);p.lineTo(0,0);}else{p.moveTo(0,0);p.lineTo(m[0],m[1]);}});
  }
  return p;
}
function strokeOff(p,dx,dy,style,width){const o=offv(dx,dy);ctx.save();ctx.translate(o[0],o[1]);ctx.strokeStyle=style;ctx.lineWidth=width;ctx.stroke(p);ctx.restore();}
// f — насколько заполнена труба (0 — пусто, 1 — вода или ток дошли).
function drawTube(p,w,net,f){
  const now=G.now;
  ctx.lineCap='butt';ctx.lineJoin='round';
  strokeOff(p,w*0.1,w*0.24,'rgba(22,48,18,.3)',w);
  if(net==='w'){
    ctx.strokeStyle=mixH('#4a5866','#164c88',f);ctx.lineWidth=w;ctx.stroke(p);
    ctx.strokeStyle=mixH('#a9b6c2','#3d97ea',f);ctx.lineWidth=w*0.72;ctx.stroke(p);
    strokeOff(p,-w*0.1,-w*0.13,`rgba(255,255,255,${0.55-0.12*f})`,w*0.18);
    if(f>0.05){ctx.save();ctx.setLineDash([w*0.32,w*0.8]);ctx.lineDashOffset=-now*0.045;ctx.strokeStyle=`rgba(215,242,255,${0.6*f})`;ctx.lineWidth=w*0.2;ctx.stroke(p);ctx.restore();}
  }else if(net==='g'){
    // газовая труба: оранжевая, с тёмными кольцами-метками; газ «течёт» медленными бликами
    ctx.strokeStyle=mixH('#6b5446','#9c3f0c',f);ctx.lineWidth=w;ctx.stroke(p);
    ctx.strokeStyle=mixH('#c9a68a','#f58a2e',f);ctx.lineWidth=w*0.7;ctx.stroke(p);
    ctx.save();ctx.setLineDash([w*0.17,w*1.05]);ctx.strokeStyle=mixH('#7b6250','#8f3a0a',f);ctx.lineWidth=w;ctx.stroke(p);ctx.restore();
    strokeOff(p,-w*0.1,-w*0.13,`rgba(255,255,255,${0.5-0.15*f})`,w*0.16);
    if(f>0.05){ctx.save();ctx.setLineDash([w*0.5,w*1.6]);ctx.lineDashOffset=-now*0.03;ctx.strokeStyle=`rgba(255,236,200,${0.55*f})`;ctx.lineWidth=w*0.22;ctx.stroke(p);ctx.restore();}
  }else{
    if(f>0.05){ctx.save();ctx.shadowColor=`rgba(255,196,40,${0.9*f})`;ctx.shadowBlur=w*1.3;ctx.strokeStyle=mixH('#2b3038','#9a6a0e',f);ctx.lineWidth=w;ctx.stroke(p);ctx.restore();}
    else{ctx.strokeStyle='#2b3038';ctx.lineWidth=w;ctx.stroke(p);}
    ctx.strokeStyle=mixH('#5f6772','#ffd24a',f);ctx.lineWidth=w*0.58;ctx.stroke(p);
    strokeOff(p,-w*0.08,-w*0.1,'rgba(255,255,255,.32)',w*0.15);
    if(f>0.05){ctx.save();ctx.setLineDash([w*0.25,w*1.8]);ctx.lineDashOffset=-now*0.09;ctx.strokeStyle=`rgba(255,255,235,${0.95*f})`;ctx.lineWidth=w*0.32;ctx.stroke(p);ctx.restore();}
  }
}
const FIT={w:[1.36,'#c99a4b','#7d5a26'],e:[1.75,'#3a3f47','#22262c'],g:[1.4,'#8c7b6e','#4f4038']};
function drawFittings(s,w,S,h,hub){
  const ft=S*0.075;
  for(let d=0;d<4;d++){
    if(!(s.mask&BIT[d]))continue;
    const cx=DX[d]*(h-ft/2),cy=DY[d]*(h-ft/2),ns=d%2===0;
    const k=FIT[s.net],aw=w*k[0];
    const rw=ns?aw:ft,rh=ns?ft:aw;
    ctx.fillStyle=k[1];rrect(cx-rw/2,cy-rh/2,rw,rh,Math.min(rw,rh)*0.35);ctx.fill();
    ctx.strokeStyle=k[2];ctx.lineWidth=1;ctx.stroke();
  }
  if(hub){
    if(s.net==='w'){circ(0,0,w*0.68,'#7d5a26');circ(0,0,w*0.58,'#cfa152');const o=offv(-w*0.15,-w*0.18);circ(o[0],o[1],w*0.2,'rgba(255,255,255,.45)');}
    else if(s.net==='g'){circ(0,0,w*0.72,'#6e3410');circ(0,0,w*0.6,s.f>0.5?'#f39a4a':'#b9957a');const o=offv(-w*0.15,-w*0.18);circ(o[0],o[1],w*0.2,'rgba(255,255,255,.45)');}
    else{ctx.fillStyle='#262a30';rrect(-w*0.85,-w*0.85,w*1.7,w*1.7,w*0.35);ctx.fill();circ(0,0,w*0.35,s.f>0.5?'#ffd24a':'#5f6772');}
  }
}
function drawCellPipes(c,x0,y0,S){
  const h=S/2;
  ctx.save();ctx.translate(x0+h,y0+h);
  let ang=c.anim;if(c.wig){const t=(G.now-c.wig)/320;if(t<1)ang+=Math.sin(t*Math.PI*6)*0.13*(1-t);}
  // нажатая труба на мгновение «подпрыгивает»
  if(c.pop){const k=(G.now-c.pop)/170;if(k<1){const z=1+0.09*Math.sin(k*Math.PI);ctx.scale(z,z);}}
  ctx.rotate(ang);curAng=ang;
  ctx.beginPath();ctx.rect(-h,-h,S,S);ctx.clip();
  const segs=c.segs.slice().sort((a,b)=>ORDER[a.net]-ORDER[b.net]);
  const leaf=isLeaf(c.type);
  for(const [i,s] of segs.entries()){
    const be=leaf?[0,1,2,3].find(d=>s.mask&BIT[d]):(s.entry>=0?((s.entry-c.rot)&3):-1);
    const p=segPath(s.mask,be,h);
    const w=S*TUBE_W[s.net];
    if(c.shared==='bridge'&&i>0)strokeOff(p,S*0.06,S*0.11,'rgba(10,30,10,.35)',w*1.7);
    drawTube(p,w,s.net,s.f);
    drawFittings(s,w,S,h,bitCount(s.mask)>=3&&c.type!=='src');
  }
  ctx.restore();
}

/* ---------- плитки ---------- */
// Клетка источника окрашена в цвет своей сети, чтобы её не путали с домами.
const SRC_TILE={
  w:{bevel:'#2f6fae',top:'#a6d6fa',bot:'#74b9ef',rim:'rgba(255,255,255,.75)'},
  e:{bevel:'#a8790f',top:'#ffe07a',bot:'#f6c03a',rim:'rgba(255,255,255,.7)'},
  g:{bevel:'#b4531a',top:'#ffd2a0',bot:'#f7a55a',rim:'rgba(255,255,255,.72)'}
};
const SRC_OBJ={w:'tower',e:'tp',g:'gastank'};
function drawSourceTile(net,x,y,S,g,r){
  const p=SRC_TILE[net],w=S-2*g,h=S-2*g-1.5;
  ctx.fillStyle=p.bevel;rrect(x+g,y+g+2.5,w,S-2*g,r);ctx.fill();
  const gr=ctx.createLinearGradient(0,y,0,y+S);gr.addColorStop(0,p.top);gr.addColorStop(1,p.bot);
  ctx.fillStyle=gr;rrect(x+g,y+g,w,h,r);ctx.fill();
  ctx.save();rrect(x+g,y+g,w,h,r);ctx.clip();
  if(net==='w'){
    ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=Math.max(1.5,S*0.03);ctx.lineCap='round';
    for(const [wx,wy] of [[0.2,0.24],[0.8,0.36],[0.18,0.7],[0.82,0.82]]){
      const px=x+S*wx,py=y+S*wy,a=S*0.06;
      ctx.beginPath();ctx.moveTo(px-a*1.5,py);ctx.quadraticCurveTo(px-a*0.75,py-a*0.7,px,py);ctx.quadraticCurveTo(px+a*0.75,py+a*0.7,px+a*1.5,py);ctx.stroke();
    }
  }else if(net==='g'){
    ctx.fillStyle='rgba(255,255,255,.55)';
    for(const [fx,fy] of [[0.18,0.22],[0.82,0.22],[0.18,0.8],[0.82,0.8]]){flamePath(x+S*fx,y+S*fy,S*0.065);ctx.fill();}
  }else{
    const band=S*0.085;
    ctx.beginPath();ctx.rect(x,y,S,S);ctx.rect(x+g+band,y+g+band,w-2*band,h-2*band);ctx.clip('evenodd');
    ctx.fillStyle='#2f2a1f';
    for(let k=-S;k<S*2;k+=S*0.17){ctx.beginPath();ctx.moveTo(x+k,y);ctx.lineTo(x+k+S*0.085,y);ctx.lineTo(x+k+S*0.085-S,y+S);ctx.lineTo(x+k-S,y+S);ctx.closePath();ctx.fill();}
  }
  ctx.restore();
  ctx.strokeStyle=p.rim;ctx.lineWidth=Math.max(1.5,S*0.025);rrect(x+g+1.5,y+g+1.5,w-3,h-3,Math.max(1,r-1.5));ctx.stroke();
}
// Плитка поворотного ввода: трава и круглая каменная площадка с насечками — видно, что клетку можно крутить.
function drawTurnTile(x,y,S,g,r){
  ctx.fillStyle='#5d9a42';rrect(x+g,y+g+2.5,S-2*g,S-2*g,r);ctx.fill();
  const gr=ctx.createLinearGradient(0,y,0,y+S);gr.addColorStop(0,'#a3d977');gr.addColorStop(1,'#87c25d');
  ctx.fillStyle=gr;rrect(x+g,y+g,S-2*g,S-2*g-1.5,r);ctx.fill();
  const cx=x+S/2,cy=y+S/2-0.5,R=S*0.41;
  circ(cx,cy+S*0.03,R,'#8d8266');circ(cx,cy,R,'#e9dfc4');
  ctx.strokeStyle='#bfb18c';ctx.lineWidth=Math.max(1,S*0.022);ctx.beginPath();ctx.arc(cx,cy,R*0.8,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#a89a76';ctx.lineWidth=Math.max(1.2,S*0.03);ctx.lineCap='round';
  for(let k=0;k<8;k++){const a=k*Math.PI/4+Math.PI/8;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*R*0.86,cy+Math.sin(a)*R*0.86);ctx.lineTo(cx+Math.cos(a)*R*0.96,cy+Math.sin(a)*R*0.96);ctx.stroke();}
  ctx.lineCap='butt';
}
function drawTile(c,x,y,S){
  const g=Math.max(1.5,S*0.035),r=S*0.16;
  if(c.type==='src'){drawSourceTile(c.segs[0].net,x,y,S,g,r);return;}
  if(c.locked){
    ctx.fillStyle='#8f8670';rrect(x+g,y+g+2,S-2*g,S-2*g,r);ctx.fill();
    ctx.fillStyle='#d3c6a6';rrect(x+g,y+g,S-2*g,S-2*g-2,r);ctx.fill();
    const q=(S-2*g)/3;ctx.fillStyle='#bcae8c';
    for(let i=0;i<3;i++)for(let j=0;j<3;j++){rrect(x+g+i*q+q*0.1+(j%2)*q*0.15,y+g+j*q+q*0.12,q*0.75,q*0.66,q*0.22);ctx.fill();}
    return;
  }
  const alt=(c.x+c.y)%2===0;
  if(isLeaf(c.type)&&canTurn(G.L,c)){drawTurnTile(x,y,S,g,r);return;}
  ctx.fillStyle='#5d9a42';rrect(x+g,y+g+2.5,S-2*g,S-2*g,r);ctx.fill();
  const gr=ctx.createLinearGradient(0,y,0,y+S);gr.addColorStop(0,alt?'#a8dd7b':'#9ed671');gr.addColorStop(1,alt?'#8cc862':'#83bf59');
  ctx.fillStyle=gr;rrect(x+g,y+g,S-2*g,S-2*g-1.5,r);ctx.fill();
  ctx.strokeStyle='rgba(60,120,40,.35)';ctx.lineWidth=1.2;const v=c.v;
  for(let k=0;k<3;k++){const px=x+S*(0.18+((v*(k+3))%64)/100),py=y+S*(0.24+((v*(k+7))%58)/100);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-1.6,py-4);ctx.moveTo(px,py);ctx.lineTo(px+1.6,py-4);ctx.stroke();}
}

/* ---------- улица целиком ---------- */
// Размер клетки и положение поля под текущий экран, плюс травинки и цветы вокруг поля.
export function layoutLevel(){
  const L=G.L;if(!L)return;
  const VW=G.VW,VH=G.VH,padX=20,padTop=26,padBot=20;
  const S=Math.floor(Math.min((VW-padX*2)/L.W,(VH-padTop-padBot)/L.H,86));
  B.S=Math.max(24,S);B.x=Math.round((VW-B.S*L.W)/2);B.y=Math.round(padTop+((VH-padTop-padBot)-B.S*L.H)/2);
  const rng=mulberry32(G.li*101+7);L.bgd=[];
  for(let k=0;k<80;k++){const x=rng()*VW,y=rng()*VH;if(x>B.x-24&&x<B.x+B.S*L.W+24&&y>B.y-28&&y<B.y+B.S*L.H+26)continue;L.bgd.push({x,y,t:rng()<0.35?'fl':'tuft',c:Math.floor(rng()*4),s:0.75+rng()*0.6});}
}
// Неподвижная часть улицы: трава, рамка и плитки. Она не меняется, пока не изменится экран,
// поэтому рисуется один раз в отдельный холст, а в каждом кадре просто копируется (так быстрее).
let bgCv=null,bgKey='';
function drawStatic(){
  const L=G.L,VW=G.VW,VH=G.VH,S=B.S,W=L.W,H=L.H;
  ctx.fillStyle='#86c461';ctx.fillRect(0,0,VW,VH);
  ctx.save();ctx.globalAlpha=0.08;ctx.fillStyle='#ffffff';
  for(let k=-VH;k<VW+VH;k+=60){ctx.beginPath();ctx.moveTo(k,0);ctx.lineTo(k+30,0);ctx.lineTo(k+30-VH*0.45,VH);ctx.lineTo(k-VH*0.45,VH);ctx.fill();}
  ctx.restore();
  {const lg=ctx.createRadialGradient(VW/2,VH*0.42,10,VW/2,VH*0.42,Math.max(VW,VH)*0.75);lg.addColorStop(0,'rgba(255,255,210,.2)');lg.addColorStop(1,'rgba(40,90,30,.16)');ctx.fillStyle=lg;ctx.fillRect(0,0,VW,VH);}
  for(const d of L.bgd){if(d.t==='tuft')drawTuft(d.x,d.y,d.s);else drawFlowers(d.x,d.y,d.s,d.c);}
  const bx=B.x,by=B.y,bw=S*W,bh=S*H,m=Math.max(9,S*0.17);
  ctx.fillStyle='rgba(30,60,20,.28)';rrect(bx-m+4,by-m+9,bw+m*2,bh+m*2,18);ctx.fill();
  ctx.fillStyle='#a8763f';rrect(bx-m,by-m,bw+m*2,bh+m*2,18);ctx.fill();
  ctx.fillStyle='#d4a467';rrect(bx-m,by-m,bw+m*2,bh+m*2-5,18);ctx.fill();
  ctx.strokeStyle='rgba(120,80,40,.35)';ctx.lineWidth=1;
  for(let k=1;k<4;k++){ctx.beginPath();ctx.moveTo(bx-m+8,by-m+k*m/4*0.9+1);ctx.lineTo(bx+bw+m-8,by-m+k*m/4*0.9+1);ctx.stroke();}
  for(const [cx,cy] of [[bx-m*0.5,by-m*0.5],[bx+bw+m*0.5,by-m*0.5],[bx-m*0.5,by+bh+m*0.4],[bx+bw+m*0.5,by+bh+m*0.4]])circ(cx,cy,2.2,'#7d5a2e');
  ctx.fillStyle='#6b4a32';rrect(bx-3,by-3,bw+6,bh+6,10);ctx.fill();
  for(const c of L.cells)drawTile(c,bx+c.x*S,by+c.y*S,S);
}
export function drawLevel(){
  const L=G.L,now=G.now,tut=G.tut;
  const S=B.S,W=L.W,H=L.H,bx=B.x,by=B.y;
  const pw=Math.round(G.VW*G.DPR),ph=Math.round(G.VH*G.DPR),key=[G.li,pw,ph,G.DPR,bx,by,S].join();
  // только что подключённый дом, фонарь или теплица подпрыгивает
  const bump=(c,x0,y0,draw)=>{
    const k=c.litAt?(now-c.litAt)/380:1;
    if(k>=1){draw();return;}
    const z=1+0.16*Math.sin(k*Math.PI)*(1-k*0.4);
    ctx.save();ctx.translate(x0+S/2,y0+S*0.86);ctx.scale(z,z);ctx.translate(-(x0+S/2),-(y0+S*0.86));draw();ctx.restore();
  };
  if(key!==bgKey){
    if(!bgCv)bgCv=document.createElement('canvas');
    bgCv.width=pw;bgCv.height=ph;bgKey=key;
    const main=ctx,oc=bgCv.getContext('2d');
    setCtx(oc);oc.setTransform(G.DPR,0,0,G.DPR,0,0);drawStatic();setCtx(main);
  }
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(bgCv,0,0);ctx.restore();
  for(const c of L.cells)if(c.segs.length)drawCellPipes(c,bx+c.x*S,by+c.y*S,S);
  const res=L.res;
  if(res&&L.state==='play')for(const lk of res.leaks)if(lk.net==='w'){
    const px=bx+(lk.x+0.5+DX[lk.d]*0.5)*S,py=by+(lk.y+0.5+DY[lk.d]*0.5)*S;
    ell(px+DX[lk.d]*S*0.05,py+DY[lk.d]*S*0.05+S*0.02,S*0.13,S*0.08,'rgba(80,160,235,.38)');
  }
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const c=L.cells[y*W+x],x0=bx+x*S,y0=by+y*S;
    const tk=isLeaf(c.type)&&canTurn(L,c)?0.07:0; // на поворотной площадке постройка чуть меньше: виднее, куда смотрит ввод
    if(c.type==='house'){const s=c.segs[0];bump(c,x0,y0,()=>drawInCell('house',x0+tk*S,y0+tk*S,S*(1-2*tk),{v:c.v,ok:s.f>0.85,life:0.35+0.65*s.f}));}
    else if(c.type==='lamp'){const s=c.segs[0];bump(c,x0,y0,()=>drawInCell('lamp',x0+tk*S,y0+tk*S,S*(1-2*tk),{on:s.f>0.85,f:s.f}));}
    else if(c.type==='greenhouse'){const s=c.segs[0];bump(c,x0,y0,()=>drawInCell('greenhouse',x0+tk*S,y0+tk*S,S*(1-2*tk),{f:s.f,ok:s.f>0.85}));}
    else if(c.type==='src')drawInCell(SRC_OBJ[c.segs[0].net],x0,y0,S,{on:true});
    else if(c.type==='block')drawInCell(c.v%2?'rocks':(c.v%3===0?'pine':'tree'),x0,y0,S,{v:c.v});
    else if(c.type==='deco')drawInCell('bush',x0,y0,S,{v:c.v});
  }
  // метки поверх построек — всегда в правом верхнем углу клетки
  for(const c of L.cells){
    const x0=bx+c.x*S,y0=by+c.y*S;
    if(isLeaf(c.type))badge(x0+S*0.82,y0+S*0.18,S*0.1,c.segs[0].net,c.segs[0].f>0.85);
    else if(c.type==='pipe'&&c.locked)drawLock(x0+S*0.8,y0+S*0.2,S);
  }
  if(res){
    const pulse=0.6+0.4*Math.sin(now/180);
    for(const cf of res.conflicts){
      const px=bx+(cf.x+0.5+DX[cf.d]*0.5)*S,py=by+(cf.y+0.5+DY[cf.d]*0.5)*S,r=S*0.13;
      circ(px,py,r*1.5*pulse,'rgba(224,83,61,.25)');circ(px,py,r,'#e0533d');
      ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(2,S*0.035);ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(px-r*0.45,py-r*0.45);ctx.lineTo(px+r*0.45,py+r*0.45);ctx.moveTo(px+r*0.45,py-r*0.45);ctx.lineTo(px-r*0.45,py+r*0.45);ctx.stroke();
    }
  }
  if(tut>=0&&L.state==='play'){
    const c=L.cells[tut],px=bx+(c.x+0.5)*S,py=by+(c.y+0.5)*S,t=(now%1200)/1200;
    ctx.strokeStyle=`rgba(255,255,255,${0.9*(1-t)})`;ctx.lineWidth=4;ctx.beginPath();ctx.arc(px,py,S*(0.32+0.25*t),0,Math.PI*2);ctx.stroke();
    ctx.font='800 13px Nunito, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    const ty=py-S*0.72;ctx.fillStyle='rgba(20,32,26,.85)';rrect(px-34,ty-12,68,24,12);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(tr('tap'),px,ty+1);
  }
  for(const c of L.cells)if(c.hintAt&&now-c.hintAt<1400){
    const t=(now-c.hintAt)/1400,px=bx+(c.x+0.5)*S,py=by+(c.y+0.5)*S;
    ctx.strokeStyle=`rgba(255,214,80,${1-t})`;ctx.lineWidth=5;rrect(px-S*0.48,py-S*0.48,S*0.96,S*0.96,S*0.18);ctx.stroke();
  }
}
