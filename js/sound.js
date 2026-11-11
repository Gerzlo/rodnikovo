// Звуки без файлов: короткие тоны через Web Audio. Звук включается после первого касания (так требует браузер),
// замолкает, когда вкладка скрыта, и выключается кнопкой на карте (выбор запоминается).
const KEY='rodnikovo-sound';
let ac=null,on=true;
try{on=localStorage.getItem(KEY)!=='0';}catch(e){}
function ctx(){
  if(!ac){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;try{ac=new C();}catch(e){return null;}}
  if(ac.state==='suspended'&&!document.hidden)ac.resume().catch(()=>{});
  return ac;
}
// Один тон: частота от f0 к f1 за dur секунд, начало через at секунд.
function tone(f0,f1,dur,vol,type,at){
  const a=ctx();if(!a)return;
  const t0=a.currentTime+(at||0),o=a.createOscillator(),g=a.createGain();
  o.type=type||'sine';o.frequency.setValueAtTime(f0,t0);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t0+dur);
  g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+0.012);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(g);g.connect(a.destination);o.start(t0);o.stop(t0+dur+0.03);
}
const S={
  turn:()=>{tone(520,330,0.07,0.16,'triangle');},
  stuck:()=>{tone(150,110,0.12,0.2,'square');},
  flow:n=>{tone(420+Math.min(n,8)*45,620+Math.min(n,8)*60,0.16,0.09,'sine');},
  ok:n=>{const f=[784,880,988,1175,1319][(n||0)%5];tone(f,f,0.22,0.12,'sine');tone(f*2,f*2,0.18,0.04,'sine',0.02);},
  ui:()=>{tone(660,560,0.05,0.1,'triangle');},
  hint:()=>{tone(700,1050,0.2,0.12,'sine');},
  win:()=>{[523,659,784,1047].forEach((f,i)=>tone(f,f,0.3,0.14,'triangle',i*0.11));tone(1568,1568,0.5,0.06,'sine',0.44);},
  star:n=>{tone(900+n*180,900+n*180,0.16,0.1,'sine');},
  fail:()=>{tone(392,330,0.22,0.14,'triangle');tone(330,220,0.4,0.14,'triangle',0.2);},
  open:()=>{tone(392,587,0.14,0.1,'sine');},
};
export const sound={
  get on(){return on;},
  toggle(){on=!on;try{localStorage.setItem(KEY,on?'1':'0');}catch(e){}if(on)S.ui();return on;},
  play(name,n){if(!on||document.hidden)return;try{S[name](n);}catch(e){}},
};
document.addEventListener('visibilitychange',()=>{if(!ac)return;if(document.hidden)ac.suspend().catch(()=>{});else if(on)ac.resume().catch(()=>{});});
