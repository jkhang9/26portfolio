const pages=[
 {filed:'ON THE CLOCK',hash:'work',name:'Work'},
 {filed:'AFTER HOURS',hash:'playground',name:'Playground'},
 {filed:'OFF THE CLOCK',hash:'about-me',name:'About me'}
];
let current=0;const $=id=>document.getElementById(id),sheet=document.querySelector('.sheet');
function render(index,writeHistory=true){current=(index+pages.length)%pages.length;const p=pages[current];sheet.dataset.page=current;$('work-page').hidden=current!==0;$('play-page').hidden=current!==1;$('about-page').hidden=current!==2;$('frame-scroll').setAttribute('aria-label',p.name+' content');$('frame-scroll').scrollTop=0;$('filed').textContent=p.filed;document.querySelectorAll('[data-index]').forEach(b=>{const active=Number(b.dataset.index)===current;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});if(writeHistory&&location.hash!=='#'+p.hash)history.pushState(null,'','#'+p.hash);document.title=`${p.name} — Janice Khang`;}
document.querySelectorAll('[data-index]').forEach(b=>b.addEventListener('click',()=>render(Number(b.dataset.index))));
function fromHash(){const aliases={'#introduction':0,'#practice':1,'#off-screen':2};const i=pages.findIndex(p=>'#'+p.hash===location.hash);render(i<0?(aliases[location.hash]??0):i,false)}window.addEventListener('popstate',fromHash);window.addEventListener('hashchange',fromHash);fromHash();

// Brief glyph shuffle; each hover settles on the next symbol.
const asteriskButton=$('asterisk'),asteriskGlyph=asteriskButton.querySelector('span');
const asteriskForms=['✱','✲','✳','✻','✼','✽','✾'];
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let asteriskIndex=2,asteriskTimer;
function shuffleAsterisk(){
 clearTimeout(asteriskTimer);
 const start=asteriskIndex;
 asteriskIndex=(asteriskIndex+1)%asteriskForms.length;
 const target=asteriskIndex;

 const show=i=>{asteriskGlyph.textContent=asteriskForms[i]+'\uFE0E';};
 if(reducedMotion.matches){show(target);return;}
 let frame=0;
 function tick(){
  if(frame===5){show(target);return;}
  show((start+frame+1)%asteriskForms.length);
  asteriskTimer=setTimeout(tick,[45,55,65,85,110][frame++]);
 }
 tick();
}
asteriskButton.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')shuffleAsterisk();});
asteriskButton.addEventListener('click',shuffleAsterisk);
asteriskButton.addEventListener('focus',()=>{if(asteriskButton.matches(':focus-visible'))shuffleAsterisk();});

// The study's subject is re-filed on hover, like a model thinking it through: the old phrase decodes into noise as it
// gathers into a single asterisk, the asterisk turns through its forms while it thinks, then it moves right, writing the new phrase
// behind it like a cursor. Letters sit in fixed-width cells; the asterisk is drawn centred over its cell, never clipped.
(()=>{
 const el=$('study-subject');
 const subjects=['EVERYDAY THINGS','PASSING CLOUDS','JUNK DRAWERS','KITCHEN NOISE','FOLDED RECEIPTS','QUIET HOURS','LITTLE DETOURS','GOOD DEFAULTS','HAPPY ACCIDENTS','QUIET PATTERNS','FOUND TYPE'];
 const stars=['✱','✲','✳','✻','✼','✽','✾'].map(s=>s+'︎');
 const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
 const cell=(ch,cls)=>`<span class="glyph${cls?' '+cls:''}">${ch}</span>`;
 const star=(k,cls)=>`<span class="glyph seed${cls?' '+cls:''}" aria-hidden="true"> <i>${stars[k%stars.length]}</i></span>`;
 let index=subjects.indexOf(el.textContent.trim());if(index<0)index=0;
 let busy=false;
 const GATHER=900,THINK=800,STEP=75,DECODE=180,ZONE=4;
 const letters='ABCDEFGHIJKLMNOPRSTUVWXYZ',marks=['·','•','+'];
 const rand=list=>list[Math.floor(Math.random()*list.length)];
 function run(dur,step){return new Promise(done=>{const s=performance.now();(function f(n){const t=Math.min(n-s,dur);step(t);if(t<dur)requestAnimationFrame(f);else done();})(s);});}
 async function refile(){
  if(busy)return;busy=true;
  const from=el.textContent;index=(index+1+Math.floor(Math.random()*(subjects.length-1)))%subjects.length;const to=subjects[index];
  el.setAttribute('aria-label',to);
  if(reducedMotion.matches){el.textContent=to;busy=false;return;}
  // gather: the old phrase draws back into the asterisk; the letters nearest it decode into noise as they go
  const noise=[...from].map(()=>({g:'',next:0}));
  await run(GATHER,t=>{
   const n=Math.max(0,Math.round(from.length*(1-ease(t/GATHER))));let h='';
   for(let i=0;i<n;i++){
    const d=n-1-i,c=from[i];
    if(d>=ZONE||c===' '){h+=cell(c);continue;}
    const z=noise[i];if(t>=z.next){z.g=d===0?rand(marks):rand(letters);z.next=t+80+Math.random()*70;}
    h+=cell(z.g,d<2?'decode':'leaving');
   }
   el.innerHTML=h+star(Math.floor(t/130),'big');
  });
  // think: the asterisk turns through its forms
  await run(THINK,t=>{el.innerHTML=star(Math.floor(t/170),'big'+(Math.sin(t*.008)>0?'':' pulse'));});
  // write: the asterisk moves right with the same ease as the gather, leaving the new phrase behind it
  const wnoise=[...to].map(()=>({g:rand(letters),next:0})),born=[],WRITE=to.length*STEP;
  await run(WRITE+DECODE+320,t=>{
   const k=Math.min(to.length,Math.round(to.length*ease(Math.min(1,t/WRITE))));let h='';
   for(let i=0;i<k;i++){
    if(born[i]===undefined)born[i]=t;
    const age=t-born[i],c=to[i];
    // each new letter decodes for a beat right behind the asterisk before it settles
    if(c!==' '&&age<DECODE){const z=wnoise[i];if(t>=z.next){z.g=rand(letters);z.next=t+70;}h+=cell(z.g,'leaving');continue;}
    h+=cell(c,age<DECODE+320?'glint':'');
   }
   if(k<to.length)h+=star(Math.floor(t/120),'big lead');
   el.innerHTML=h;
  });
  el.textContent=to;busy=false;
 }
 // One re-file per hover: the pointer has to leave before hovering again triggers another.
 let armed=true;
 el.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'&&armed){armed=false;refile();}});
 el.addEventListener('pointerleave',()=>{armed=true;});
 el.addEventListener('click',refile);
 el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();refile();}});
})();

// Scroll indicator in the sheet's right margin (the native scrollbar is hidden so nothing covers content).
// The thumb tracks the scroll position; drag it or click the rail to jump.
(()=>{
 const sc=$('frame-scroll'),rail=document.createElement('div'),thumb=document.createElement('div');
 rail.className='scroll-rail';rail.setAttribute('aria-hidden','true');thumb.className='scroll-thumb';rail.appendChild(thumb);sheet.appendChild(rail);
 let drag=null;
 function update(){
  const max=sc.scrollHeight-sc.clientHeight;rail.hidden=max<2;if(rail.hidden)return;
  const s=sheet.getBoundingClientRect(),f=sc.getBoundingClientRect(),gap=s.right-f.right;
  rail.style.top=(f.top-s.top)+'px';rail.style.height=f.height+'px';rail.style.right=Math.max(0,gap/2-7.5)+'px';
  const h=Math.max(28,f.height*sc.clientHeight/sc.scrollHeight);
  thumb.style.height=h+'px';thumb.style.top=((f.height-h)*sc.scrollTop/max)+'px';
 }
 function jump(y){const f=sc.getBoundingClientRect(),h=thumb.offsetHeight;sc.scrollTop=(y-f.top-h/2)/(f.height-h)*(sc.scrollHeight-sc.clientHeight)}
 rail.addEventListener('pointerdown',e=>{e.preventDefault();rail.setPointerCapture(e.pointerId);rail.classList.add('dragging');
  const t=thumb.getBoundingClientRect();drag=e.target===thumb?e.clientY-t.top-t.height/2:0;if(e.target!==thumb)jump(e.clientY)});
 rail.addEventListener('pointermove',e=>{if(drag!==null)jump(e.clientY-drag)});
 const end=()=>{drag=null;rail.classList.remove('dragging')};rail.addEventListener('pointerup',end);rail.addEventListener('pointercancel',end);
 sc.addEventListener('scroll',update,{passive:true});addEventListener('resize',update);
 new ResizeObserver(update).observe(sc);[...sc.children].forEach(c=>new ResizeObserver(update).observe(c));
 document.querySelectorAll('[data-index]').forEach(b=>b.addEventListener('click',()=>requestAnimationFrame(update)));
 addEventListener('hashchange',()=>requestAnimationFrame(update));addEventListener('load',update);update();
})();


// Each impression shifts the same restrained iridescent palette.
(() => {
 const colors=['#b6d4ec','#d5c2eb','#e8c8bf','#bddfd3'];
 const ns='http://www.w3.org/2000/svg';
 document.querySelectorAll('.social-links a').forEach((link,index)=>{
  const svg=link.querySelector('svg'); if(!svg)return;
  const defs=document.createElementNS(ns,'defs');
  const gradient=document.createElementNS(ns,'linearGradient');
  gradient.id='social-iridescence-'+index;
  gradient.setAttribute('x1','0');gradient.setAttribute('y1','0');
  gradient.setAttribute('x2','1');gradient.setAttribute('y2','1');
  colors.forEach((color,i)=>{const stop=document.createElementNS(ns,'stop');stop.setAttribute('offset',i/(colors.length-1));stop.setAttribute('stop-color',color);gradient.append(stop);});
  defs.append(gradient);svg.prepend(defs);
  link.style.setProperty('--icon-iridescence','url(#'+gradient.id+')');
  const refresh=()=>gradient.setAttribute('gradientTransform','rotate('+Math.floor(Math.random()*180)+' .5 .5)');
  link.addEventListener('pointerenter',refresh);
  link.addEventListener('focus',refresh);
 });
 document.querySelectorAll('.co-link,.work-project-link,#explore-playground,.footer-asterisk').forEach(element=>{
  const refresh=()=>element.style.setProperty('--iris-angle',(80+Math.floor(Math.random()*100))+'deg');
  element.addEventListener('pointerenter',refresh);
  element.addEventListener('focus',refresh);
 });
})();


/* Each new text selection shifts through the site's restrained iridescent palette. */
(()=>{
 const palette=['var(--interaction-blue)','var(--interaction-lilac)','var(--interaction-mint)','var(--interaction-peach)','#e3b9ce','#bcc6ed'];
 let index=-1;
 const shiftTint=()=>{
  index=(index+1)%palette.length;
  document.documentElement.style.setProperty('--selection-tint','color-mix(in srgb,'+palette[index]+' 27%,transparent)');
 };
 document.addEventListener('pointerdown',event=>{
  if(event.button!==0||!(event.target instanceof Element))return;
  if(event.target.closest('.sheet')&&!event.target.closest('a,button,input,textarea,select'))shiftTint();
 });
 document.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a')shiftTint();
  else if(event.shiftKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)){
   const selection=window.getSelection();
   if(!selection||selection.isCollapsed)shiftTint();
  }
 });
})();
