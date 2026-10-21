(() => {
  'use strict';
  // Quiet Skies: one of three dithered scenes (Veil, Cloudsea, Galaxy), chosen at random on each load.
  // Scenes are composed for the two side panels a wide-screen visitor sees beside the sheet.
  // Each scene plays as a seamless 10-second loop. Phone-size screens and reduced-motion
  // settings get a single still frame instead.
  const host = document.querySelector('.dither-bg');
  const canvas = host?.querySelector('canvas');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  const SCENE = Math.floor(Math.random() * 3);
  const LOOP = 10;         // seconds per loop
  const STORY = .8;        // fixed scene state
  const still = matchMedia('(max-width: 700px), (prefers-reduced-motion: reduce)');
  let raf = 0, start = performance.now(), colors = { muted: [.57, .6, .62], ink: [.91, .91, .9] };
  const sheet = document.querySelector('.sheet');
  const tabs = document.querySelector('.index-tabs');
  let tabRect = [0, 0, 0, 0], sheetRect = [0, 0, 0, 0];
  function measureTabs() {
    if (!tabs) return;
    const r = tabs.getBoundingClientRect(), h = host.getBoundingClientRect();
    tabRect = [r.left - h.left, r.top - h.top, r.right - h.left, r.bottom - h.top];
  }
  function measureSheet() {
    const h = host.getBoundingClientRect();
    if (!sheet) { sheetRect = [h.width / 2, 0, h.width / 2, h.height]; return; }
    const r = sheet.getBoundingClientRect();
    sheetRect = [r.left - h.left, r.top - h.top, r.right - h.left, r.bottom - h.top];
  }
  const dividers = [...document.querySelectorAll('.registration,.sheet>footer')];

  // Top-edge highlight (unchanged from the original).
  const motionless = matchMedia('(prefers-reduced-motion: reduce)');
  let edgePosition = null, edgeTarget = 0, edgeRAF = 0, edgeLast = 0;
  function drawEdge() { sheet.style.setProperty('--edge-x', edgePosition + 'px'); }
  function travelEdge(time) {
    edgeRAF = 0;
    const delta = edgeTarget - edgePosition;
    const dt = Math.min((time - edgeLast) / 1000, .04);
    edgeLast = time;
    edgePosition += Math.sign(delta) * Math.min(Math.abs(delta), 200 * dt);
    drawEdge();
    if (Math.abs(delta) > .25) edgeRAF = requestAnimationFrame(travelEdge);
  }
  function updateEdge(clientX) {
    if (!sheet) return;
    const bounds = sheet.getBoundingClientRect();
    edgeTarget = Math.max(0, Math.min(bounds.width, clientX - bounds.left));
    if (edgePosition === null || motionless.matches) {
      cancelAnimationFrame(edgeRAF); edgeRAF = 0;
      edgePosition = edgeTarget; drawEdge();
    } else if (!edgeRAF) {
      edgeLast = performance.now();
      edgeRAF = requestAnimationFrame(travelEdge);
    }
  }

  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = `precision highp float;
uniform vec2 R;uniform float DPR;uniform float T;uniform float P;uniform float STEP;uniform float TINT;uniform float SCENE;uniform vec3 MUTED;uniform vec3 INK;uniform vec4 TABS;uniform vec4 SH;
#define PI 3.14159265
float b2(vec2 a){a=floor(a);return fract(dot(a,vec2(.5,a.y*.75)));}
float b4(vec2 a){return b2(.5*a)*.25+b2(a);}
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){v+=a*n(p);p=m*p;a*=.5;}return v;}
float ridged(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*(1.-abs(2.*n(p)-1.));p=p*2.03+1.7;a*=.5;}return v;}
float bump(float x,float c,float w){x=(x-c)/w;return exp(-x*x);}

// Every scene is composed for what a wide-screen visitor actually sees: two side panels beside the sheet.
// o = distance from the panel's outer screen edge, g = panel width, y = height down the screen, all in
// screen heights. sd is 0 for the left panel and 1 for the right; each side gets its own shapes so the
// two panels answer each other instead of repeating.

// Sparse stars that gather in loose clusters, never an even carpet.
float stars(vec2 px,float dens,out float ink){
 vec2 c=floor(px/STEP);
 float hs=h(c);
 float cl=smoothstep(.42,.78,fbm(px/240.+7.));
 float on=step(1.-dens*(.0035+.022*cl),hs);
 ink=on*step(.72,h(c+11.))*(.7+.3*sin(T*.5+hs*60.));
 return on*(.32+.3*h(c+3.));
}

// ---------- Veil: aurora over still water (the original, kept as is) ----------
const float HZ=-.2;

// one curtain of light; y is height above the horizon
float curtain(vec2 s,float y,float fk){
 float x=s.x*(.9+fk*.35)+fk*5.1;
 float t=T*(.010+fk*.004);
 float ph=x*1.25+t*2.;
 float fold=fbm(vec2(x*.8+t,fk*3.+T*.012));
 float yc=.11+fk*.085+.10*sin(ph+fold*2.4)+.035*fbm(vec2(x*3.,fk));
 float dy=y-yc;
 float hang=dy>0.?exp(-dy/(.13+.16*fold)):exp(-dy*dy/.0008);
 float slope=cos(ph+fold*2.4);
 float turn=.55+.75*pow(1.-abs(slope),4.);
 float xs=x+dy*.55+.05*sin(dy*9.+fold*4.);
 float rays=.22+.78*pow(n(vec2(xs*38.,t*3.+fk*7.)),2.)*(.5+.5*n(vec2(xs*120.,fk+T*.02)));
 float fringe=exp(-dy*dy/.00012)*.55*(.45+.55*n(vec2(x*140.,T*.08+fk)));
 float side=smoothstep(.05,.75,abs(s.x)/(R.x/R.y*.5));
 float span=(.15+.85*smoothstep(.2,.6,fbm(vec2(x*.55+fk*2.,T*.007))))*(.55+.65*side);
 return (hang*rays*turn+fringe)*span;
}

float sky(vec2 s,vec2 starCell,out float ink){
 float y=s.y-HZ;
 float l=.03+.42*exp(-abs(y)*10.)*(.35+.65*smoothstep(0.,.9,P))+.06*exp(-abs(y)*2.);
 // a faint band of tiny stars crossing the sky
 float band=exp(-pow((s.y-.22-s.x*.22)/.13,2.));
 l+=band*.09*fbm(s*5.)*(.5+.5*fbm(s*24.));
 // stars: three depths, dim ones as dots, bright ones as ink
 float hs=h(starCell);
 float sp=smoothstep(0.,.12,y);
 l=max(l,step(.985,hs)*.32*sp);
 ink=step(.9965,hs)*(.7+.3*sin(T*.2+hs*40.))*sp*(1.-.35*smoothstep(.5,1.,P));
 // curtains wake one by one
 for(int k=0;k<3;k++){
  float fk=float(k);
  float g=smoothstep(.08+fk*.24,.45+fk*.24,P);
  l+=curtain(s,y,fk)*g*(1.-fk*.22)*2.6;
 }
 // soft upper wash
 l+=.07*smoothstep(.2,1.,P)*exp(-abs(y-.33)*3.5);
 return l;
}

float ridges(vec2 s,float y,float base){
 float l=base;
 for(int k=0;k<3;k++){
  float fk=float(k);
  float hk=HZ+.006+(.07-fk*.018)*fbm(vec2(s.x*(1.1+fk*.9)+fk*9.,fk*2.))-fk*.006;
  if(s.y<hk){
   float haze=.10-fk*.035+.05*smoothstep(.3,1.,P)*(1.-fk*.5);
   float tex=.05*step(.62,fract((hk-s.y)*(160.-fk*40.)+fbm(s*30.)*.6));
   l=haze+tex*(1.-fk*.3);
  }
 }
 return l;
}


float veil(vec2 p,vec2 cell,float K,out float ink){
 float l;ink=0.;
 if(p.y>=HZ){
  l=sky(p,cell,ink);
  l=ridges(p,p.y-HZ,l);
 }else{
  float dep=HZ-p.y;
  vec2 s=vec2(p.x,2.*HZ-p.y);
  float wob=sin(p.y*(170.-dep*90.)+T*.45)*.0035*(1.+dep*9.)+sin(p.x*30.+p.y*60.+T*.3)*.0015;
  s.x+=wob;
  float sink;
  l=sky(s,floor(s*K),sink);
  l=ridges(s,s.y-HZ,l);
  float streak=.45+.55*smoothstep(.25,.75,n(vec2(p.x*2.5+T*.004,p.y*170.+T*.06)));
  l*=.62*streak*(1.-dep*.5);
  ink=sink*.5*streak*step(.5,h(cell+3.));
  float hg=h(cell+5.);ink=max(ink,step(.99,hg)*pow(.5+.5*sin(T*.35+hg*60.),6.)*smoothstep(.2,.55,l)*.8);
 }
 l+=exp(-pow((p.y-HZ)/.022,2.))*(.06+.12*smoothstep(.3,1.,P))*(.5+.5*fbm(vec2(p.x*2.5+T*.01,p.y*20.)));
 return l;
}


// ---------- Cloudsea: lit peaks above a slow sea of cloud ----------
// Each panel holds three peaks of its own. A peak is lit on the side facing the world's left; the
// lit and shaded faces meet along a ridge that wanders down from the summit, and gullies fan out
// from the summit so the faces read as rock, not flat planes.
void peakSet(float sd,float gw,int i,out float c,out float hp,out float w,out float k){
 if(sd<.5){
  if(i==0){c=gw*.46;hp=.47;w=gw*.6;k=.35;}
  else if(i==1){c=gw*.07;hp=.27;w=gw*.32;k=-.4;}
  else{c=gw*.90;hp=.21;w=gw*.3;k=.5;}
 }else{
  if(i==0){c=gw*.60;hp=.39;w=gw*.55;k=-.3;}
  else if(i==1){c=gw*.18;hp=.31;w=gw*.34;k=.45;}
  else{c=gw*.97;hp=.17;w=gw*.26;k=-.5;}
 }
}
float peakH(float o,float sd,int i,float c,float hp,float w){
 float fi=float(i),u=abs(o-c)/w;
 float hh=hp*pow(max(0.,1.-u),1.15);
 hh+=hp*.22*bump(o,c+w*(i==1?.35:-.38),w*.13)*step(u,1.);
 float jag=(ridged(vec2(o*5.+fi*3.+sd*11.,1.3))-.5)*.6+(ridged(vec2(o*16.+fi*7.,2.1))-.5)*.3;
 return hh+.16*hp*jag*smoothstep(0.,.05,hh)+.004*(n(vec2(o*90.,sd+fi))-.5);
}
// One peak's rock and snow, lit from the world's left. haze lifts and flattens the farther peaks.
float peakTone(float o,float y,float sd,float c,float hp,float k,float top,float cl,vec2 px,float haze){
 float sum=cl-hp,dep=max(y-sum,0.);
 float rx=c+dep*k+.05*(fbm(vec2(dep*6.,c*7.))-.5)*dep*3.;
 float side=(o-rx)*(sd<.5?1.:-1.);
 float lit=1.-smoothstep(-.004-dep*.02,.004+dep*.02,side);
 float fan=ridged(vec2((o-c)/(dep+.05)*2.6+sd*5.,dep*4.));
 float crag=ridged(vec2(o*22.,y*14.)+sd*3.);
 float rock=.62+.8*(fan-.5)+.45*(crag-.5)+.2*(fbm(px/9.)-.5);
 float tone=mix(.12,.50,lit)*rock;
 float snow=smoothstep(.17,.24,cl-y+.06*(fan-.5))*smoothstep(.14,.22,hp);
 tone=mix(tone,mix(.26,.86,lit)*(.85+.3*(fan-.5)),snow);
 tone+=smoothstep(.006,0.,y-top)*(.10+.45*lit);
 return mix(tone,.16+.25*tone,haze);
}
float cloudsea(float o,float y,float g,float sd,vec2 px,out float ink){
 float cl=.80;ink=0.;
 float wx=px.x/R.x*DPR;
 float l=.17*exp(-max(cl-y,0.)*2.4)*(1.-.55*wx);
 float sk;l=max(l,stars(px,smoothstep(.0,.3,cl-.3-y)*(.4+.6*wx),sk));ink=sk;
 if(sd<0.)return l;
 float gw=max(g,.2);
 // a far range in haze: one soft flat tone so the near peaks stand in front of it
 float fh=cl-.11-.06*fbm(vec2(o*2.5+sd*5.,2.))-.07*bump(o,gw*(sd<.5?.3:.78),gw*.22);
 if(y>fh){ink=0.;l=.13+.04*fbm(px/14.)+.08*exp(-(y-fh)*140.);}
 // peaks drawn back to front: the two side peaks sit behind in haze, the main peak in front
 for(int j=0;j<3;j++){
  int i=j==2?0:j+1;
  float c,hp,w,k;peakSet(sd,gw,i,c,hp,w,k);
  float top=cl-peakH(o,sd,i,c,hp,w);
  if(top<cl-.002&&y>top){ink=0.;l=peakTone(o,y,sd,c,hp,k,top,cl,px,i==0?0.:.35);}
 }
 float billow=fbm(vec2(o*2.4+T*.012+sd*7.,T*.02));
 float ctop=cl+.01-.09*pow(billow,1.6)-.025*fbm(vec2(o*9.+T*.02,sd));
 if(y>ctop){
  ink=0.;
  float dep=y-ctop;
  vec2 q=vec2(o*3.+T*.01+sd*9.,dep*6.);
  float b=fbm(q*1.5);
  float puff=smoothstep(.3,.72,fbm(q*2.8+b*1.5));
  l=.20+.52*puff*exp(-dep*1.3)+.28*exp(-dep*35.)*(.6+.4*puff);
 }
 return l;
}

// ---------- Galaxy: one band of the Milky Way crossing the screen, as a single continuous field ----------
float galaxy(float o,float y,float g,float sd,vec2 px,out float ink){
 float A=R.x/R.y;vec2 w=vec2(px.x/(R.y/DPR),y);
 vec2 a=vec2(0.,1.02),b=vec2(A,-.02),dir=normalize(b-a),nm=vec2(-dir.y,dir.x);
 float along=dot(w-a,dir),across=dot(w-a,nm);
 across+=.08*(fbm(vec2(along*1.1,1.))-.5);
 float wid=.19+.06*fbm(vec2(along*1.8,3.));
 float d=across/wid;
 float core=exp(-d*d*1.6),halo=exp(-d*d*.28);
 vec2 q=vec2(along+T*.004,across);
 float cloud=fbm(q*vec2(2.6,6.))*.6+fbm(q*vec2(8.,16.))*.4;
 float l=core*(.3+.95*smoothstep(.25,.75,cloud))+halo*.16;
 float rift=fbm(q*vec2(3.2,8.)+vec2(0.,fbm(q*2.)*1.8));
 float lane=smoothstep(.48,.68,rift)*exp(-pow((across+.025)/(wid*.42),2.));
 l*=1.-.85*lane;
 l+=core*.5*smoothstep(.75,.93,fbm(q*13.+2.))*(1.-lane);
 float sk;l=max(l,stars(px,.3+.8*halo*(1.-.6*lane)+.8*core,sk));ink=sk*(1.-lane);
 // the band's outer glow breaks into soft filaments of dust and starlight that drift off it,
 // so the whole sky reads as one continuous field rather than separate objects
 vec2 fq=vec2(along*1.4+T*.003,across*2.2);
 float wisps=fbm(fq*2.+vec2(0.,fbm(fq*1.3+5.)*1.6));
 float reach=exp(-d*d*.07)*(1.-core);
 l+=reach*smoothstep(.5,.78,wisps)*.32;
 return l;
}

void main(){
 vec2 css=R/DPR;
 vec2 px=vec2(gl_FragCoord.x,R.y-gl_FragCoord.y)/DPR;
 vec2 cell=floor(px/STEP);
 vec2 cc=(cell+.5)*STEP;
 vec2 p=vec2(cc.x-css.x*.5,css.y*.5-cc.y)/css.y;
 float H=css.y;
 float sd=cc.x<SH.x?0.:(cc.x>SH.z?1.:-1.);
 float pg=sd<.5?SH.x/H:(css.x-SH.z)/H;
 float po=sd<.5?cc.x/H:(css.x-cc.x)/H;
 float py=cc.y/H;
 float ink=0.,l;
 if(SCENE<.5)l=veil(p,cell,css.y/STEP,ink);
 else if(SCENE<1.5)l=cloudsea(po,py,pg,sd,cc,ink);
 else l=galaxy(po,py,pg,sd,cc,ink);
 l=clamp(l,0.,1.);
 // a smooth clearing around the tab row so the tabs stay easy to find
 vec2 tq=max(max(TABS.xy-px,px-TABS.zw),0.);
 float clear=TABS.z>TABS.x?smoothstep(0.,90.,length(tq))*.85+.15*smoothstep(0.,24.,length(tq)):1.;
 l*=clear;ink*=clear;
 float on=step(b4(cell)*.94+.03,l);
 float r=mix(.62,1.3,l)*STEP/3.;
 float d=length(px-cc);
 float a=on*smoothstep(r+.35,r-.35,d)*(.3+.6*l);
 vec3 col=mix(MUTED,INK,smoothstep(.5,.92,l));
 vec3 pa=vec3(.714,.831,.925),pb=vec3(.835,.761,.922),pc=vec3(.910,.784,.749),pd=vec3(.741,.875,.827);
 float tt=fract(p.x*.3+abs(p.y+.15)*.9+T*.005)*4.;
 vec3 pastel=tt<1.?mix(pa,pb,tt):tt<2.?mix(pb,pc,tt-1.):tt<3.?mix(pc,pd,tt-2.):mix(pd,pa,tt-3.);
 col=mix(col,pastel*mix(.85,1.05,l),TINT*.75);
 vec4 o=vec4(col*a,a);
 if(ink>.02){float ri=mix(.75,1.25,smoothstep(.6,.8,ink))*STEP/3.;float ai=smoothstep(ri+.35,ri-.35,d)*clamp(ink,0.,1.)*.85;o=mix(o,vec4(INK*ai,ai),step(o.a,ai));}
 gl_FragColor=o;
}`;

  const U = {};
  if (gl) {
    const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(program);
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['R', 'DPR', 'T', 'P', 'STEP', 'TINT', 'SCENE', 'MUTED', 'INK', 'TABS', 'SH'].forEach(k => U[k] = gl.getUniformLocation(program, k));
  }

  function rgb(value, fallback) {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const x = c.getContext('2d'); x.fillStyle = fallback; x.fillStyle = value || fallback; x.fillRect(0, 0, 1, 1);
    const d = x.getImageData(0, 0, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255];
  }

  // Scene time follows one smooth cycle every LOOP seconds, so the last frame meets the first.
  function sceneTime(now) {
    const phase = ((now - start) / 1000 / LOOP) * Math.PI * 2;
    return 40 + 7 * Math.sin(phase);
  }

  function draw(T) {
    if (!gl) return;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.R, canvas.width, canvas.height);
    gl.uniform1f(U.DPR, Math.min(devicePixelRatio || 1, 2));
    gl.uniform1f(U.T, T);
    gl.uniform1f(U.P, STORY);
    gl.uniform1f(U.STEP, 2.5);
    gl.uniform1f(U.TINT, 0);
    gl.uniform1f(U.SCENE, SCENE);
    gl.uniform3fv(U.MUTED, colors.muted);
    gl.uniform3fv(U.INK, colors.ink);
    gl.uniform4fv(U.TABS, tabRect);
    gl.uniform4fv(U.SH, sheetRect);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  let last = 0;
  function frame(now) {
    raf = 0;
    if (document.hidden || still.matches) return;
    if (now - last >= 33) { last = now; draw(sceneTime(now)); }
    raf = requestAnimationFrame(frame);
  }
  function sync() {
    cancelAnimationFrame(raf); raf = 0;
    if (still.matches) { draw(40); return; }
    if (!document.hidden) raf = requestAnimationFrame(frame);
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(host.clientWidth * dpr);
    canvas.height = Math.round(host.clientHeight * dpr);
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
    measureTabs();
    measureSheet();
    const palette = getComputedStyle(document.documentElement);
    colors = { muted: rgb(palette.getPropertyValue('--muted').trim(), '#929a9d'), ink: rgb(palette.getPropertyValue('--ink').trim(), '#e9e9e6') };
    draw(still.matches ? 40 : sceneTime(performance.now()));
  }

  still.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('pointermove', event => {
    dividers.forEach(divider => {
      const rect = divider.getBoundingClientRect();
      const edgeY = divider.matches('footer') ? rect.top - 1 : rect.bottom - 1;
      divider.style.setProperty('--divider-x', (event.clientX - rect.left) + 'px');
      divider.style.setProperty('--divider-y', (event.clientY - edgeY) + 'px');
    });
    updateEdge(event.clientX);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { dividers.forEach(divider => { divider.style.setProperty('--divider-x', '-999px'); divider.style.setProperty('--divider-y', '-999px'); }); });
  new ResizeObserver(resize).observe(host);
  if (tabs) new ResizeObserver(resize).observe(tabs);
  if (sheet) new ResizeObserver(resize).observe(sheet);
  resize();
  if (sheet) updateEdge(innerWidth * .65);
  sync();
})();
