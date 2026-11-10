// Частицы: брызги из открытых труб, искры из проводов, облачка газа, звёздочки при победе.
import { ctx, circ, starPath } from './art.js';

export function spawn(arr,p){if(arr.length<500)arr.push(Object.assign({delay:0,g:0,rot:Math.random()*6},p));}
export function updParts(arr,dt){for(const p of arr){if(p.delay>0){p.delay-=dt;continue;}p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;p.rot+=dt*4;}return arr.filter(p=>p.life>0);}
export function drawPart(p){
  if(p.delay>0)return;const a=Math.max(0,Math.min(1,p.life/p.max*1.6));
  ctx.globalAlpha=a;
  if(p.k==='drop')circ(p.x,p.y,p.r,'#5fb3ff');
  else if(p.k==='puff'){const t=1-p.life/p.max;ctx.globalAlpha=a*0.75;circ(p.x,p.y,p.r*(1+t*1.8),'#eed4b4');}
  else if(p.k==='spark'){ctx.strokeStyle='#ffe066';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*0.04,p.y-p.vy*0.04);ctx.stroke();}
  else{starPath(p.x,p.y,p.r,p.rot);ctx.fillStyle=p.c;ctx.fill();}
  ctx.globalAlpha=1;
}
