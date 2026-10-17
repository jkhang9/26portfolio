// About: sixteen slide mounts drawn in WebGL. Each card is a bent quad; the vertex shader turns it on its vertical axis with a
// little paper bow and perspective, the fragment shader adds paper tooth, fold shading and a faint monochrome sheen that follows
// the pointer. Faces are painted once to 2D canvases (so text and stamps use the site fonts) and uploaded as textures.
// The buttons in the DOM stay the real controls; without WebGL the same faces are shown as canvases and cross-fade.
(()=>{
const page=document.getElementById('about-page'),list=page&&page.querySelector('.slide-grid'),canvas=page&&page.querySelector('.slide-gl');
if(!list||!canvas)return;
const buttons=[...list.querySelectorAll('.slide')],cells=buttons.map(b=>b.parentElement);
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
// Colours come from the live CSS tokens so the cards follow whichever theme the site is wearing.
const PAL={};let TONES=[];
function readPalette(){const cs=getComputedStyle(document.documentElement);for(const k of['ink','paper','muted','accent'])PAL[k]=cs.getPropertyValue('--'+k).trim();
 TONES=[mix(PAL.paper,PAL.accent,.55),mix(PAL.paper,PAL.accent,.4),mix(PAL.paper,PAL.accent,.72),mix(PAL.paper,PAL.muted,.14)]}
const mix=(a,b,t)=>{const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),A=p(a),B=p(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('')};
const data=buttons.map(b=>({no:b.dataset.no,date:b.dataset.date,subject:b.dataset.subject,label:b.dataset.label,win:b.dataset.win,rot:b.dataset.rot==='1',tone:+b.dataset.tone,note:document.getElementById(b.getAttribute('aria-describedby')).textContent}));

const WIN={l:{ww:.7,wh:.47,wy:.21},p:{ww:.46,wh:.64,wy:.17}};
// Photo window as a uv rectangle of the front texture (turned with the card when it is printed upside down).
function winUV(d){const g=WIN[d.win==='p'?'p':'l'],x0=(1-g.ww)/2,y0=g.wy,x1=x0+g.ww,y1=y0+g.wh;return d.rot?[1-x1,1-y1,1-x0,1-y0]:[x0,y0,x1,y1]}
function scene(x,i,wx,wy,ww,wh){ // stand-in for a photo: sky, sun, skyline and grain, so the effects have something to chew on
 let a=(i+1)*2654435761>>>0;const r=()=>((a=Math.imul(a^a>>>15,2246822507)^a>>>13)>>>0)/4294967296;
 const g=x.createLinearGradient(0,wy,0,wy+wh);g.addColorStop(0,mix(PAL.accent,PAL.muted,.3));g.addColorStop(.62,mix(PAL.muted,PAL.ink,.4));g.addColorStop(.62,mix(PAL.paper,PAL.accent,.5));g.addColorStop(1,mix(PAL.paper,PAL.accent,.2));
 x.fillStyle=g;x.fillRect(wx,wy,ww,wh);
 x.fillStyle=mix(PAL.muted,PAL.ink,.7);x.beginPath();x.arc(wx+ww*(.2+.6*r()),wy+wh*.28,wh*.14,0,7);x.fill();
 for(let b=0,bx=wx;bx<wx+ww;b++){const bw=ww*(.07+.1*r()),bh=wh*(.12+.3*r());x.fillStyle=mix(PAL.accent,PAL.paper,.2+.5*r());x.fillRect(bx,wy+wh*.62-bh,bw,bh+wh*.38);bx+=bw+ww*.01}
 x.fillStyle=PAL.ink;x.globalAlpha=.07;for(let n=0;n<ww*wh/14;n++)x.fillRect(wx+r()*ww,wy+r()*wh,1.2,1.2);x.globalAlpha=1;
}
// ---- faces -------------------------------------------------------------------------------------------------------------
function roundRect(x,px,py,w,h,r){x.beginPath();x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath()}
function wrap(x,text,max){const out=[];let line='';for(const word of text.split(' ')){const t=line?line+' '+word:word;if(x.measureText(t).width>max&&line){out.push(line);line=word}else line=t}if(line)out.push(line);return out}
function dots(x,x0,x1,y){x.fillStyle=PAL.muted;for(let px=x0;px<x1;px+=4)x.fillRect(px,y,1,1)}
function face(i,side,w,px){
 const c=document.createElement('canvas');c.width=c.height=px;const x=c.getContext('2d'),d=data[i],f=Math.min(1.1,Math.max(.8,w/340));
 x.scale(px/w,px/w);x.textBaseline='top';
 const mono=`400 ${12*f}px "Commit Mono",monospace`,sans=`400 ${14*f}px Geist,Arial,sans-serif`;
 x.save();roundRect(x,0,0,w,w,5);x.clip();x.fillStyle=TONES[d.tone];x.fillRect(0,0,w,w);
 if(side==='f'&&d.rot){x.translate(w,w);x.rotate(Math.PI)}
 x.font=mono;x.fillStyle=PAL.ink;x.textAlign='left';x.fillText(d.no,w*.07,w*.07);
 x.fillStyle=PAL.muted;x.textAlign='right';x.fillText(d.date,w*.93,w*.07);
 if(side==='f'){
  const g=WIN[d.win==='p'?'p':'l'],ww=w*g.ww,wh=w*g.wh,wx=(w-ww)/2,wy=w*g.wy;
  x.save();x.beginPath();x.rect(wx,wy,ww,wh);x.clip();
  scene(x,i,wx,wy,ww,wh);x.restore();
  x.strokeStyle=PAL.ink;x.globalAlpha=.16;x.strokeRect(wx+.5,wy+.5,ww-1,wh-1);x.globalAlpha=1;
  x.font=mono;x.fillStyle=PAL.muted;x.textAlign='left';x.fillText('PHOTO '+d.no,wx+8,wy+wh-8-12*f);
  x.textAlign='center';x.font=mono;
  if(d.label==='fields'){
   x.textAlign='left';const ly=wy+wh+w*.07;
   x.fillStyle=PAL.muted;x.fillText('SUBJECT',w*.1,ly);dots(x,w*.1+x.measureText('SUBJECT ').width,w*.9,ly+10*f);
   x.fillStyle=PAL.muted;x.fillText('DATE',w*.1,ly+w*.075);dots(x,w*.1+x.measureText('DATE ').width,w*.9,ly+w*.075+10*f);
  }else if(d.label){x.fillStyle=PAL.muted;x.fillText(d.label,w/2,wy+wh+w*.07)}
 }else{
  const field=(label,value,y)=>{x.font=mono;x.textAlign='left';x.fillStyle=PAL.muted;x.fillText(label,w*.07,y);const lw=x.measureText(label+' ').width;
   x.font=sans;x.textAlign='right';x.fillStyle=PAL.ink;x.fillText(value,w*.93,y-2*f);const vw=x.measureText(' '+value).width;dots(x,w*.07+lw,w*.93-vw,y+10*f)};
  field('SUBJECT',d.subject,w*.2);
  x.font=sans;x.fillStyle=PAL.ink;x.textAlign='left';
  const lh=14*f*1.45,top=w*.34,lines=wrap(x,d.note,w*.86);
  lines.forEach((l,k)=>{if(top+(k+1)*lh<w*.88)x.fillText(l,w*.07,top+k*lh)});
  x.font=mono;x.fillStyle=PAL.muted;x.fillText('CLICK TO FLIP BACK',w*.07,w*.93-12*f);
 }
 x.restore();x.strokeStyle=PAL.muted;x.globalAlpha=.3;roundRect(x,.5,.5,w-1,w-1,5);x.stroke();
 return c;
}

// ---- state -------------------------------------------------------------------------------------------------------------
const st=buttons.map(()=>({t:0,target:0,h:0,hT:0,px:.5,py:.5}));
let gl,progs,mesh,tex=[],rects=[],pose=[],zoom=1,W=0,H=0,dpr=1,texW=0,raf=0,last=0,started=false;
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

function open(i){
 const on=st[i].target===0;st.forEach(s=>s.target=0);if(on)st[i].target=1;
 sync_open();request();
}
function sync_open(){buttons.forEach((b,k)=>{const p=st[k].target===1,q=pose[k];b.setAttribute('aria-pressed',p);cells[k].classList.toggle('flipped',p);
 b.style.transform=p&&q&&gl?`translate(${q.dx}px,${q.dy}px) scale(${zoom})`:''})}
function close(){if(!st.some(s=>s.target))return;st.forEach(s=>s.target=0);sync_open();request()}
buttons.forEach((b,i)=>{
 b.addEventListener('click',()=>open(i));
 b.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){st[i].hT=1;request()}});
 b.addEventListener('pointerleave',()=>{st[i].hT=0;request()});
 b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();st[i].px=(e.clientX-r.left)/r.width;st[i].py=(e.clientY-r.top)/r.height;if(gl)request()});
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!page.hidden)close()});
document.addEventListener('click',e=>{if(!page.hidden&&!e.target.closest('.slide'))close()});

// ---- WebGL -------------------------------------------------------------------------------------------------------------
const VS=`attribute vec2 aUv;uniform vec4 uRect;uniform vec2 uView;uniform float uAngle,uHover,uZoom;varying vec2 vUv;varying float vZ;
void main(){float w=uRect.z,h=uRect.w,s=sin(uAngle),c=cos(uAngle);
 float x=(aUv.x-.5)*w,y=(aUv.y-.5)*h;
 float z=x*s+s*.09*w*(1.-pow(2.*aUv.x-1.,2.));
 float k=3.*w/(3.*w-z)*uZoom*(1.+.018*uHover);
 vec2 p=uRect.xy+uRect.zw*.5+vec2(x*c,y)*k+vec2(0.,-4.*uHover);
 gl_Position=vec4(p.x/uView.x*2.-1.,1.-p.y/uView.y*2.,0.,1.);vUv=aUv;vZ=z/w;}`;
const FS=`precision highp float;varying vec2 vUv;varying float vZ;uniform sampler2D uFront,uBackTex;uniform float uAngle,uHover;uniform vec2 uPtr;uniform vec4 uWin;uniform float uFx,uTime;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 S(vec2 q){return texture2D(uFront,uWin.xy+clamp(q,0.,1.)*(uWin.zw-uWin.xy)).rgb;}
float bayer2(vec2 p){p=floor(mod(p,2.));return mod(p.x*2.+p.y*3.,4.)/4.;}
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
const vec3 DK=vec3(.06),LT=vec3(.88);
// Eight light, single-pass treatments for the photo window; k is the hover strength (0 = the plain photo).
vec3 effect(vec2 q,float k,vec2 p,float asp){vec3 c=S(q),o=c;float f=uFx;
 if(f<.5){vec2 g=floor(q*vec2(46.,46./asp));float th=bayer2(g)+bayer2(floor(g*.5))*.25;o=mix(DK,LT,step(th*.9+.05,lum(c)));}
 else if(f<1.5){vec2 n=vec2(26.,26./asp),ctr=(floor(q*n)+.5)/n;float r=sqrt(lum(S(ctr)))*.72,d=length((q-ctr)*n);o=mix(DK,LT,1.-step(r,d));}
 else if(f<2.5){vec2 v=(q-p)*vec2(asp,1.);float d=length(v);o=S(q+normalize(v+1e-4)*vec2(1./asp,1.)*sin(d*46.-uTime*6.)*.018*k*exp(-d*2.2));}
 else if(f<3.5){float n=mix(80.,12.,k);o=S((floor(q*n)+.5)/n);}
 else if(f<4.5){vec2 off=vec2(.03,0.)*(.6+.4*sin(uTime*3.));o=vec3(S(q+off).r,c.g,S(q-off).b)*(.86+.14*sin(q.y*190.));}
 else if(f<5.5){float l=floor(lum(c)*3.+.5)/3.;o=mix(DK,LT,l);}
 else if(f<6.5){float row=floor(q.y*26.),n=hash(vec2(row,floor(uTime*7.)));o=S(q+vec2((n-.5)*.22*step(.72,n),0.));}
 else{vec2 v=q-p;float d=length(v*vec2(asp,1.));q=p+v*(1.-.6*(1.-smoothstep(0.,.5,d)));o=S(q);}
 return mix(c,o,k);}
void main(){bool back=uAngle>1.5707963;vec2 uv=vUv;if(back)uv.x=1.-uv.x;
 vec4 t=back?texture2D(uBackTex,uv):texture2D(uFront,uv);if(t.a<.003)discard;
 vec3 col=t.rgb/t.a;float s=sin(uAngle);
 if(!back&&uHover>.004){vec2 sz=uWin.zw-uWin.xy,q=(vUv-uWin.xy)/sz;
  if(q.x>0.&&q.x<1.&&q.y>0.&&q.y<1.)col=effect(q,uHover,(uPtr-uWin.xy)/sz,sz.x/sz.y);}
 col+=(hash(floor(vUv*420.))-.5)*.035;
 float pos=uv.x*.8+uv.y*.5,at=.15+uPtr.x*.7+uPtr.y*.2+uAngle/3.14159*.9;
 float band=exp(-pow(pos-at,2.)*28.),amt=clamp(.6*uHover+s,0.,1.);
 col=mix(col,vec3(.92),.14*band*amt);
 col=mix(col,vec3(0.),s*(.12+.3*clamp(.3-vZ,0.,1.)));
 gl_FragColor=vec4(col*t.a,t.a);}`;
const SVS=`attribute vec2 aUv;uniform vec4 uBox;uniform vec2 uView;varying vec2 vP;
void main(){vec2 q=(aUv-.5)*uBox.zw;vP=q;vec2 p=uBox.xy+q;gl_Position=vec4(p.x/uView.x*2.-1.,1.-p.y/uView.y*2.,0.,1.);}`;
const SFS=`precision highp float;varying vec2 vP;uniform vec2 uHalf;uniform float uPad,uAlpha;
void main(){vec2 q=abs(vP)-uHalf+5.;float d=length(max(q,0.))+min(max(q.x,q.y),0.)-5.;float a=1.-smoothstep(0.,uPad,d);a*=a;
 gl_FragColor=vec4(0.,0.,0.,a*uAlpha);}`;
function compile(vs,fs){const mk=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
 const p=gl.createProgram();gl.attachShader(p,mk(gl.VERTEX_SHADER,vs));gl.attachShader(p,mk(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
 const u={};for(let i=0,n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i<n;i++){const nm=gl.getActiveUniform(p,i).name;u[nm]=gl.getUniformLocation(p,nm)}return{p,u}}
function initGL(){
 gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true});if(!gl)return false;
 try{progs={card:compile(VS,FS),shadow:compile(SVS,SFS)}}catch(e){console.warn(e);gl=null;return false}
 const C=24,R=6,uv=[],idx=[];
 for(let r=0;r<=R;r++)for(let c=0;c<=C;c++)uv.push(c/C,r/R);
 for(let r=0;r<R;r++)for(let c=0;c<C;c++){const a=r*(C+1)+c,b=a+1,d=a+C+1,e=d+1;idx.push(a,b,d,b,e,d)}
 mesh={vb:gl.createBuffer(),ib:gl.createBuffer(),n:idx.length};
 gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(uv),gl.STATIC_DRAW);
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx),gl.STATIC_DRAW);
 gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);return true;
}
function upload(c){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
function buildTextures(w){
 const px=Math.min(1024,Math.round(w*dpr)),zw=w*zoom;texW=w;
 if(gl){tex.forEach(t=>{gl.deleteTexture(t.f);gl.deleteTexture(t.b)});
  const fp=Math.min(1024,Math.round(w*dpr*1.5)),bp=Math.min(1024,Math.round(zw*dpr));
  tex=data.map((_,i)=>({f:upload(face(i,'f',w,fp)),b:upload(face(i,'b',zw,bp))}))}
 else cells.forEach((cell,i)=>{cell.querySelectorAll('.slide-face').forEach(n=>n.remove());
  for(const s of['f','b']){const c=face(i,s,w,px);c.className='slide-face '+s;cell.appendChild(c)}});
}
function bind(prog,attr){gl.useProgram(prog.p);const a=gl.getAttribLocation(prog.p,attr);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vb);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ib)}
function draw(now=0){
 if(!gl||!tex.length)return;
 gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);

 const pz=st.map((s,i)=>{const e=ease(s.t),[x,y,w,h]=rects[i],q=pose[i]||{dx:0,dy:0},z=1+(zoom-1)*e;return{e,z,cx:x+w/2+q.dx*e,cy:y+h/2+q.dy*e}});
 const order=st.map((s,i)=>i).sort((a,b)=>(st[a].t>0)+st[a].h-((st[b].t>0)+st[b].h));
 const sh=progs.shadow;bind(sh,'aUv');gl.uniform2f(sh.u.uView,W,H);
 for(const i of order){const s=st[i],[,,w0,h0]=rects[i],{z,cx,cy}=pz[i],w=w0*z,h=h0*z,ang=ease(s.t)*Math.PI,a=(s.h*.5+Math.sin(ang)*.9)*.28+pz[i].e*.2;if(a<.004)continue;
  const sw=Math.max(Math.abs(Math.cos(ang)),.1)*w,pad=20;
  gl.uniform4f(sh.u.uBox,cx,cy+8+4*Math.sin(ang),sw+pad*2,h+pad*2);gl.uniform2f(sh.u.uHalf,sw/2,h/2);gl.uniform1f(sh.u.uPad,pad);gl.uniform1f(sh.u.uAlpha,Math.min(1,a*3));
  gl.drawElements(gl.TRIANGLES,mesh.n,gl.UNSIGNED_SHORT,0)}
 const cd=progs.card;bind(cd,'aUv');gl.uniform2f(cd.u.uView,W,H);gl.uniform1i(cd.u.uFront,0);gl.uniform1i(cd.u.uBackTex,1);
 for(const i of order){const s=st[i],[,,w,h]=rects[i],{z,cx,cy}=pz[i];
  gl.uniform1f(cd.u.uZoom,z);gl.uniform4f(cd.u.uRect,cx-w/2,cy-h/2,w,h);gl.uniform1f(cd.u.uAngle,ease(s.t)*Math.PI);gl.uniform1f(cd.u.uHover,s.h);gl.uniform2f(cd.u.uPtr,s.px,s.py);gl.uniform4fv(cd.u.uWin,winUV(data[i]));gl.uniform1f(cd.u.uFx,i%8);gl.uniform1f(cd.u.uTime,now);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex[i].f);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,tex[i].b);
  gl.drawElements(gl.TRIANGLES,mesh.n,gl.UNSIGNED_SHORT,0)}
}
function frame(now){
 raf=0;const dt=Math.min(.1,(now-last)/1000||0);last=now;let busy=false;
 for(const s of st){
  if(s.t!==s.target){const dur=reduce.matches?.001:.85;s.t+=Math.sign(s.target-s.t)*Math.min(Math.abs(s.target-s.t),dt/dur);busy=true}
  const dh=s.hT-s.h;if(Math.abs(dh)>.002){s.h+=dh*Math.min(1,dt*12);busy=true}else s.h=s.hT;
  if(s.hT)busy=true; // the hovered card's effect is animated
 }
 draw(now/1000%1000);if(busy)raf=requestAnimationFrame(frame);
}
function request(){if(!gl||raf)return;last=performance.now();raf=requestAnimationFrame(frame)}

function layout(){
 const pr=page.getBoundingClientRect();if(!pr.width)return;
 W=pr.width;H=pr.height;dpr=Math.min(2,window.devicePixelRatio||1);
 rects=buttons.map(b=>{const r=b.getBoundingClientRect();return[r.left-pr.left,r.top-pr.top,r.width,r.height]});
 if(gl){canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);gl.viewport(0,0,canvas.width,canvas.height)}
 const lr=list.getBoundingClientRect(),L=lr.left-pr.left,T=lr.top-pr.top,w0=rects[0][2];
 zoom=Math.max(1,Math.min(2.4,.96*Math.min(lr.width,lr.height)/w0));
 pose=rects.map(([x,y,w,h])=>{const half=w*zoom/2,cx=x+w/2,cy=y+h/2;
  return{dx:Math.min(Math.max(cx,L+half),L+lr.width-half)-cx,dy:Math.min(Math.max(cy,T+half),T+lr.height-half)-cy}});
 if(Math.abs(w0-texW)>1.5)buildTextures(w0);sync_open();
 page.classList.add('ready');draw();
}
async function start(){
 started=true;readPalette();
 if(!initGL())canvas.remove();
 try{await Promise.all(['400 14px Geist','400 12px "Commit Mono"'].map(f=>document.fonts.load(f)))}catch(e){}
 layout();new ResizeObserver(layout).observe(page);
}
function sync(){if(!page.hidden){if(!started)start();else requestAnimationFrame(layout)}}
new MutationObserver(sync).observe(page,{attributes:true,attributeFilter:['hidden']});sync();
})();
