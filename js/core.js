// Логика игры без браузера: направления, повороты, генератор улиц и проверка соединений.
// Работает и в браузере, и в Node — на этом построен тест генератора (tests/generator.test.js).

// Сети: 'w' — вода (башня → дома), 'e' — электричество (подстанция → фонари), 'g' — газ (газгольдер → теплицы).
export const LEAF = { w: 'house', e: 'lamp', g: 'greenhouse' };
export const isLeaf = t => t === 'house' || t === 'lamp' || t === 'greenhouse';

// Можно ли крутить клетку: трубу без замка — всегда; ввод дома, фонаря или теплицы — на улицах с turn:'leaf'.
// Ржавая труба (left — сколько поворотов ей осталось) при нуле больше не крутится. Труба под люком (hidden) — тоже.
export const canTurn = (L, c) => c.hidden || c.left === 0 ? false : c.type === 'pipe' ? !c.locked : L.turn === 'leaf' && isLeaf(c.type);
// Тупик: какой-то ржавой трубе уже не хватит поворотов, чтобы встать правильно.
export const isStuck = L => L.cells.some(c => c.left != null && tapsToSolve(c) > c.left);

// Люки: труба под люком открывается, когда вода, ток или газ дошли до соседней клетки (вызывать после evaluate).
// Возвращает клетки, которые только что открылись.
export function openHatches(L){
  const out=[];
  for(const c of L.cells){
    if(!c.hidden)continue;
    for(let d=0;d<4;d++){
      const x=c.x+DX[d],y=c.y+DY[d];
      if(x<0||y<0||x>=L.W||y>=L.H)continue;
      if(L.cells[y*L.W+x].segs.some(s=>s.reached)){out.push(c);break;}
    }
  }
  for(const c of out)c.hidden=false;
  return out;
}

// Направления: 0 — север, 1 — восток, 2 — юг, 3 — запад. Маска клетки — набор открытых сторон (биты 1, 2, 4, 8).
export const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], BIT = [1, 2, 4, 8];
export const opp = d => (d + 2) & 3;
export const rotM = (m, r) => { r &= 3; return ((m << r) | (m >> (4 - r))) & 15; };
export const bitCount = m => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);
export const isStraight = m => m === 5 || m === 10;
export const isCorner = m => m === 3 || m === 6 || m === 12 || m === 9;

// Предсказуемые «случайные» числа: одно зерно — одна и та же улица у всех игроков.
export function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

// Сколько нажатий нужно клетке до правильного положения.
export function tapsToSolve(c){for(let t=0;t<4;t++){const r=(c.rot+t)&3;if(c.segs.every(s=>rotM(s.mask,r)===s.mask))return t;}return 0;}

// Проверка улицы: куда дошли вода и ток, где открытые концы (утечки) и где сети упираются друг в друга.
export function evaluate(L){
  const W=L.W,H=L.H,cells=L.cells;
  const at=(x,y)=>(x<0||y<0||x>=W||y>=H)?null:cells[y*W+x];
  for(const c of cells)for(const s of c.segs){s.cur=rotM(s.mask,c.rot);s.reached=false;s.depth=-1;s.entry=-1;}
  const leaks=[];let maxDepth=0;
  for(const net of L.nets){
    const c0=cells[L.src[net]],s0=c0.segs.find(z=>z.net===net);
    s0.reached=true;s0.depth=0;
    const q=[[c0,s0]];
    for(let qi=0;qi<q.length;qi++){
      const c=q[qi][0],s=q[qi][1];
      for(let d=0;d<4;d++){
        if(!(s.cur&BIT[d]))continue;
        const n=at(c.x+DX[d],c.y+DY[d]);
        const t=n?n.segs.find(z=>z.net===net&&(z.cur&BIT[opp(d)])):null;
        if(t){if(!t.reached){t.reached=true;t.depth=s.depth+1;t.entry=opp(d);if(t.depth>maxDepth)maxDepth=t.depth;q.push([n,t]);}}
        else leaks.push({x:c.x,y:c.y,d,net});
      }
    }
  }
  const conflicts=[];
  for(const c of cells)for(const s of c.segs)for(const d of [1,2]){
    if(!(s.cur&BIT[d]))continue;
    const n=at(c.x+DX[d],c.y+DY[d]);if(!n)continue;
    for(const z of n.segs)if(z.net!==s.net&&(z.cur&BIT[opp(d)]))conflicts.push({x:c.x,y:c.y,d});
  }
  let all=true;for(const c of cells)for(const s of c.segs)if(!s.reached)all=false;
  return {leaks,conflicts,maxDepth,solved:all&&leaks.length===0};
}

// Одна попытка собрать улицу. От источников растут «деревья» сетей, их концы становятся домами и фонарями,
// где сети встречаются — мостики и двойные клетки. Потом клетки случайно поворачиваются.
function tryGen(cfg,rng){
  const W=cfg.w,H=cfg.h,N=W*H,nets=cfg.nets;
  const ri=n=>Math.floor(rng()*n);
  const cells=[];
  for(let i=0;i<N;i++)cells.push({x:i%W,y:(i/W)|0,type:'free',segs:[],rot:0,locked:false,shared:null});
  const at=(x,y)=>(x<0||y<0||x>=W||y>=H)?null:cells[y*W+x];
  let nb=cfg.blocks||0,g=0;
  while(nb>0&&g++<300){const c=cells[ri(N)];if(c.type==='free'){c.type='block';nb--;}}
  const src={};
  for(const net of nets){
    let c=null;
    for(let k=0;k<60;k++){
      let x,y;
      if(nets.length===1){x=W>2?1+ri(W-2):ri(W);y=H>2?1+ri(H-2):ri(H);}
      else{ // первая сеть — внизу, вторая — вверху, третья — в середине поля
        x=ri(W);const band=Math.max(1,Math.floor(H/3)),k=nets.indexOf(net);
        y=k===0?H-1-ri(band):k===1?ri(band):band+ri(Math.max(1,H-2*band));
      }
      const t=at(x,y);if(t&&t.type==='free'){c=t;break;}
    }
    if(!c)return null;
    c.type='src';c.segs=[{net,mask:0}];src[net]=c;
  }
  const owned={};nets.forEach(n=>owned[n]=[src[n]]);
  const wantB=cfg.bridges||0,wantD=cfg.doubles||0;let nB=0,nD=0;
  for(let step=0;step<2000;step++){
    const cand=[];let wsum=0;
    for(const net of nets){
      const bal=nets.length>1?1/(owned[net].length+2):1;
      for(const c of owned[net]){
        if(c.segs.length!==1)continue;
        const s=c.segs[0],deg=bitCount(s.mask);
        if(deg>=3)continue;
        const base=(c.type!=='src'&&deg===1)?3:1;
        for(let d=0;d<4;d++){
          if(s.mask&BIT[d])continue;
          const n=at(c.x+DX[d],c.y+DY[d]);
          if(!n||n.type==='block')continue;
          if(n.segs.length===0){const w=base*bal;cand.push({net,c,d,n,kind:'free',w});wsum+=w;}
          else if(n.segs.length===1&&n.segs[0].net!==net&&n.type!=='src'){
            const ym=n.segs[0].mask;
            if(bitCount(ym)!==2||(ym&BIT[opp(d)]))continue;
            let kind,xm,exit;
            if(isStraight(ym)){if(nB>=wantB)continue;kind='bridge';xm=BIT[opp(d)]|BIT[d];exit=d;}
            else{if(nD>=wantD)continue;kind='double';xm=15&~ym;exit=[0,1,2,3].find(e=>e!==opp(d)&&(xm&BIT[e]));}
            const n2=at(n.x+DX[exit],n.y+DY[exit]);
            if(!n2||n2.type==='block'||n2.segs.length)continue;
            const w=8*bal;cand.push({net,c,d,n,kind,xm,exit,n2,w});wsum+=w;
          }
        }
      }
    }
    if(!cand.length)break;
    let r=rng()*wsum,pick=cand[cand.length-1];
    for(const k of cand){r-=k.w;if(r<=0){pick=k;break;}}
    pick.c.segs[0].mask|=BIT[pick.d];
    if(pick.kind==='free'){pick.n.segs.push({net:pick.net,mask:BIT[opp(pick.d)]});owned[pick.net].push(pick.n);}
    else{
      pick.n.segs.push({net:pick.net,mask:pick.xm});pick.n.shared=pick.kind;
      pick.n2.segs.push({net:pick.net,mask:BIT[opp(pick.exit)]});owned[pick.net].push(pick.n2);
      if(pick.kind==='bridge')nB++;else nD++;
    }
  }
  if(nB<wantB||nD<wantD)return null;
  const cons={};nets.forEach(n=>cons[n]=0);let empty=0;
  for(const c of cells){
    if(c.type==='block')continue;
    if(!c.segs.length){c.type='deco';empty++;continue;}
    if(c.type==='src'){if(!c.segs[0].mask)return null;continue;}
    if(c.segs.length===1&&bitCount(c.segs[0].mask)===1){c.type=LEAF[c.segs[0].net];cons[c.segs[0].net]++;}
    else c.type='pipe';
  }
  const maxEmpty=cfg.maxEmpty!=null?cfg.maxEmpty:(nets.length>1?3:0);
  if(empty>maxEmpty)return null;
  let tot=0;for(const n of nets){if(cons[n]<2)return null;tot+=cons[n];}
  if(tot>Math.ceil(N*0.4))return null;
  const pipes=cells.filter(c=>c.type==='pipe');
  if(pipes.length<N*0.35)return null;
  let nl=cfg.locked||0;
  const pool=pipes.filter(c=>c.segs.length===1&&!isStraight(c.segs[0].mask));
  while(nl>0&&pool.length){const k=ri(pool.length);pool[k].locked=true;pool.splice(k,1);nl--;}
  if(nl>0)return null;
  const turn=cfg.turn==='leaf'?'leaf':'pipe';
  const rotatable=turn==='leaf'?cells.filter(c=>canTurn({turn},c)):pipes.filter(c=>!c.locked);
  const srcIdx={};for(const n of nets)srcIdx[n]=src[n].y*W+src[n].x;
  const L={W,H,nets,cells,src:srcIdx};
  for(let t=0;t<40;t++){
    for(const c of rotatable)c.rot=ri(4);
    let taps=0,need=0;for(const c of rotatable){const k=tapsToSolve(c);taps+=k;if(k)need++;}
    if(need<rotatable.length*0.6)continue;
    if(evaluate(L).solved)continue;
    const slack=Math.max(3,Math.ceil(taps*(cfg.slack||0.35))); // запас ходов сверх минимума
    // ржавые трубы: поворотов ровно столько, сколько нужно, или на один больше
    const nR=cfg.rusty||0;
    if(nR){
      for(const c of cells)c.left=undefined;
      const rp=rotatable.filter(c=>c.type==='pipe'&&tapsToSolve(c)>0);
      if(rp.length<nR)continue;
      for(let k=0;k<nR;k++){const j=ri(rp.length),c=rp[j];c.left=tapsToSolve(c)+ri(2);rp.splice(j,1);}
    }
    // люки: доля труб спрятана под землёй. Не рядом с клеткой, куда вода или ток доходят с самого начала
    // (иначе люк откроется сразу), и не ржавые и не рядом с ржавыми (там считают повороты — соседей должно быть видно).
    const hf=cfg.hidden||0;let nH=0;
    if(hf){
      for(const c of cells)c.hidden=false;
      const nb=(c,f)=>[0,1,2,3].some(d=>{const n=at(c.x+DX[d],c.y+DY[d]);return n&&f(n);});
      const hp=pipes.filter(c=>!c.locked&&c.left==null&&!nb(c,n=>n.left!=null||n.segs.some(s=>s.reached)));
      nH=Math.round(pipes.length*hf);
      if(hp.length<nH)continue;
      for(let k=0;k<nH;k++){const j=ri(hp.length);hp[j].hidden=true;hp.splice(j,1);}
    }
    return {W,H,nets,src:srcIdx,bridges:nB,doubles:nD,turn,rusty:nR,hatches:nH,
      cells:cells.map((c,i)=>({x:c.x,y:c.y,type:c.type,segs:c.segs.map(s=>({net:s.net,mask:s.mask})),rot:c.rot,locked:c.locked,shared:c.shared,left:c.left,hidden:c.hidden||undefined,v:(i*37+ri(997))%997})),
      minTaps:taps,limit:taps+slack,t3:taps+Math.floor(slack/3),t2:taps+Math.floor(slack*2/3)};
  }
  return null;
}

// Собирает улицу по настройкам (размер, сети, мостики, замки, зерно). Решение всегда есть.
export function generate(cfg){const rng=mulberry32(cfg.seed*7919+13);for(let a=0;a<1500;a++){const r=tryGen(cfg,rng);if(r){r.attempts=a;return r;}}return null;}
