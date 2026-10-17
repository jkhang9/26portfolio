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

// The study's subject is re-filed on hover, like a model thinking it through: the old words dim out left to right,
// a soft wave of dots runs across the shape of the next phrase, then each letter resolves in order with a brief
// iridescent glint. A few asterisks bloom along the way. Every character sits in a fixed-width cell, so the line never jumps.
(()=>{
 const el=$('study-subject');
 const subjects=['EVERYDAY THINGS','PASSING CLOUDS','JUNK DRAWERS','KITCHEN NOISE','FOLDED RECEIPTS','QUIET HOURS','LITTLE DETOURS','GOOD DEFAULTS','HAPPY ACCIDENTS','QUIET PATTERNS','FOUND TYPE'];
 const letters='ABCDEFGHIJKLMNOPRSTUVWY',stars=['✱','✲','✳','✻','✼','✽','✾'];
 let index=subjects.indexOf(el.textContent.trim());if(index<0)index=0;
 let busy=false,raf=0;
 const STAG=26,OUT=170,THINK=520,RES=34,GUESS=110;
 function refile(){
  if(busy)return;busy=true;
  const from=el.textContent;index=(index+1+Math.floor(Math.random()*(subjects.length-1)))%subjects.length;const to=subjects[index];
  if(reducedMotion.matches){el.textContent=to;busy=false;return;}
  const len=Math.max(from.length,to.length);
  el.textContent='';
  const cells=Array.from({length:len},(_,i)=>{const c=document.createElement('span');c.className='glyph';c.textContent=from[i]||'';if(!from[i])c.style.width='0';el.appendChild(c);
   return {c,from:from[i]||'',to:to[i]||'',guess:letters[Math.floor(Math.random()*letters.length)],state:''};});
  const resolveAt=i=>OUT+THINK+i*RES,end=resolveAt(to.length)+260,start=performance.now();
  function set(cell,text,cls,width){
   if(cell.state===text+cls+width)return;cell.state=text+cls+width;
   cell.c.textContent=text;cell.c.className='glyph'+(cls?' '+cls:'');cell.c.style.width=width;
  }
  function frame(now){
   const t=now-start;
   cells.forEach((cell,i)=>{
    const leave=i*STAG,r=resolveAt(i),inTo=i<to.length,blank=cell.to===' ';
    if(t<leave){set(cell,cell.from,'',cell.from?'':'0');return;}
    if(t<leave+OUT&&cell.from&&cell.from!==' '){set(cell,cell.from,'leaving','');return;}
    if(!inTo){set(cell,'','gone','0');return;}
    if(blank){set(cell,' ','','');return;}
    // a small asterisk leads the letters as they resolve
    if(t<r-GUESS&&t>=r-GUESS-RES&&i>0){set(cell,stars[Math.floor(t/90)%stars.length]+'\uFE0E','star lead','');return;}
    if(t<r-GUESS){
     // thinking: a slow wave of dots moving across the shape of the phrase; its crest blooms into an asterisk
     const w=Math.sin(t*.011-i*.55);
     if(w>.93){set(cell,stars[(i+Math.floor(t/140))%stars.length]+'\uFE0E','star','');return;}
     set(cell,w>.55?'•':'·',w>.2?'pulse':'dot','');return;
    }
    if(t<r){set(cell,cell.guess,'guess','');return;}
    set(cell,cell.to,t<r+170?'glint':'','');
   });
   if(t<end){raf=requestAnimationFrame(frame);}else{el.textContent=to;busy=false;}
  }
  raf=requestAnimationFrame(frame);
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
