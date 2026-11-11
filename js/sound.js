// Звуки без файлов: короткие тоны через Web Audio. Звук включается после первого касания (так требует браузер),
// замолкает, когда вкладка скрыта, и выключается кнопкой на карте (выбор запоминается).
// iPhone: 1) звук разрешается только в конце касания (touchend/click), поэтому unlock() висит на этих событиях;
// 2) при выключенном боковом переключателе звонка Web Audio молчит — тип сеанса 'playback' это обходит;
// 3) после звонка или сворачивания состояние бывает 'interrupted', а не 'suspended'.
const KEY='rodnikovo-sound';
let ac=null,out=null,primed=false,on=true;
try{on=localStorage.getItem(KEY)!=='0';}catch(e){}
function ctx(){
  if(!ac){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;try{ac=new C();}catch(e){return null;}}
  if(!out){
    // общий выход: усиление и ограничитель, чтобы короткие тоны было слышно из динамика телефона
    const comp=ac.createDynamicsCompressor();out=ac.createGain();out.gain.value=1.8;out.connect(comp);comp.connect(ac.destination);
    // лёгкое эхо, будто звук во дворе
    const dl=ac.createDelay(0.5),fb=ac.createGain(),wet=ac.createGain(),lp=ac.createBiquadFilter();
    dl.delayTime.value=0.13;fb.gain.value=0.28;wet.gain.value=0.22;lp.type='lowpass';lp.frequency.value=2400;
    out.connect(dl);dl.connect(lp);lp.connect(fb);fb.connect(dl);lp.connect(wet);wet.connect(comp);
  }
  if(ac.state!=='running'&&!document.hidden)ac.resume().catch(()=>{});
  return ac;
}
function unlock(){
  if(!on)return;
  try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(e){}
  const a=ctx();if(!a||primed)return;
  // беззвучный щелчок в самом касании — после него iPhone разрешает звук из любого места кода
  try{const b=a.createBuffer(1,1,22050),s=a.createBufferSource();s.buffer=b;s.connect(a.destination);s.start(0);primed=a.state==='running';}catch(e){}
}
for(const ev of ['touchend','click','keydown'])document.addEventListener(ev,unlock,{capture:true,passive:true});
// Звуки собраны из «деревенских» тембров, а не из писка: деревянный стук, капля, маримба, колокольчик, птичка.
// Всё мягкое: плавное начало, долгое затухание, лёгкое эхо.
let noiseBuf=null;
const noise=a=>{if(!noiseBuf){noiseBuf=a.createBuffer(1,Math.floor(a.sampleRate*0.4),a.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}return noiseBuf;};
// Затухающий голос: частота от f0 к f1, плавное начало att, затухание dur.
function voice(f0,f1,dur,vol,at,att,glide){
  const a=ctx();if(!a)return;
  const t0=a.currentTime+(at||0),o=a.createOscillator(),g=a.createGain();
  o.type='sine';o.frequency.setValueAtTime(f0,t0);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t0+(glide||dur));
  g.gain.setValueAtTime(0.0001,t0);g.gain.linearRampToValueAtTime(vol,t0+(att||0.006));g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(g);g.connect(out);o.start(t0);o.stop(t0+dur+0.05);
}
// Маримба: основной тон и быстро гаснущий верхний призвук — тёплый деревянный звук.
function marimba(f,vol,at,dur){voice(f,f,dur||0.55,vol,at,0.004);voice(f*4,f*4,0.09,vol*0.22,at,0.002);voice(f*0.5,f*0.5,(dur||0.55)*0.6,vol*0.25,at,0.004);}
// Колокольчик для звёзд.
function bell(f,vol,at){voice(f,f,0.7,vol,at,0.003);voice(f*2.76,f*2.76,0.35,vol*0.3,at,0.003);voice(f*5.4,f*5.4,0.15,vol*0.12,at,0.002);}
// Деревянный стук: короткий шум через узкий фильтр и глухой удар.
function knock(f,vol,at){
  const a=ctx();if(!a)return;
  const t0=a.currentTime+(at||0),n=a.createBufferSource(),bp=a.createBiquadFilter(),g=a.createGain();
  n.buffer=noise(a);bp.type='bandpass';bp.frequency.value=f;bp.Q.value=4;
  g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(0.0001,t0+0.05);
  n.connect(bp);bp.connect(g);g.connect(out);n.start(t0);n.stop(t0+0.07);
  voice(f*0.16,f*0.11,0.07,vol*0.7,at,0.002);
}
// Капля: тон быстро «подпрыгивает» вверх.
function drop(f,vol,at){voice(f,f*1.9,0.14,vol,at,0.012,0.06);}
// Птичка: два-три коротких свиста вверх.
function chirp(vol,at,f){const b=f||2600+Math.random()*700;for(let k=0;k<2+Math.floor(Math.random()*2);k++)voice(b*(1+k*0.06),b*1.32,0.07,vol,(at||0)+k*0.11,0.01,0.05);}
const PENTA=[523.25,587.33,659.25,783.99,880,1046.5]; // до-ре-ми-соль-ля: всегда звучит мирно
const S={
  turn:()=>{knock(1500+Math.random()*250,0.22);},
  stuck:()=>{knock(520,0.2);voice(120,90,0.14,0.14,0,0.004);},
  flow:n=>{const k=Math.min(n,4);for(let i=0;i<k;i++)drop(520+i*90+Math.random()*60,0.07,i*0.07);},
  ok:n=>{marimba(PENTA[(n||0)%PENTA.length],0.15);},
  ui:()=>{knock(1100,0.14);},
  hint:()=>{chirp(0.06);},
  win:()=>{[0,2,3,5].forEach((k,i)=>marimba(PENTA[k],0.15,i*0.16,0.8));marimba(PENTA[0]/2,0.12,0.64,1.1);chirp(0.04,1.0);},
  star:n=>{bell(1046.5*[1,1.25,1.5][n%3],0.08);},
  fail:()=>{marimba(392,0.14,0,0.7);marimba(329.63,0.14,0.24,0.9);},
  hatch:()=>{knock(700,0.16);knock(950,0.1,0.07);},
  open:()=>{marimba(PENTA[0],0.11);marimba(PENTA[3],0.11,0.12);},
  bird:()=>{chirp(0.03);if(Math.random()<0.5)chirp(0.025,0.5);},
};
export const sound={
  get on(){return on;},
  toggle(){on=!on;try{localStorage.setItem(KEY,on?'1':'0');}catch(e){}if(on)S.ui();return on;},
  play(name,n){if(!on||document.hidden)return;try{S[name](n);}catch(e){console.warn('звук',name,String(e));}},
};
document.addEventListener('visibilitychange',()=>{if(!ac)return;if(document.hidden)ac.suspend().catch(()=>{});else if(on)ac.resume().catch(()=>{});});
export const soundState=()=>ac?ac.state:'none';
