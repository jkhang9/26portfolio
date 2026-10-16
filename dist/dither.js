(() => {
  'use strict';
  // Quiet Skies: one of three dithered scenes (Veil, Cloudsea, Galaxy), chosen at random on each load.
  // Each scene plays as a seamless 5-second loop. Phone-size screens and reduced-motion
  // settings get a single still frame instead.
  const host = document.querySelector('.dither-bg');
  const canvas = host?.querySelector('canvas');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  const SCENE = Math.floor(Math.random() * 3);
  const LOOP = 5;          // seconds per loop
  const STORY = .8;        // fixed scene state
  const still = matchMedia('(max-width: 700px), (prefers-reduced-motion: reduce)');
  let raf = 0, start = performance.now(), colors = { muted: [.57, .6, .62], ink: [.91, .91, .9] };
  const sheet = document.querySelector('.sheet');
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
uniform vec2 R;uniform float DPR;uniform float T;uniform float P;uniform float STEP;uniform float TINT;uniform float SCENE;uniform vec3 MUTED;uniform vec3 INK;
#define PI 3.14159265
float b2(vec2 a){a=floor(a);return fract(dot(a,vec2(.5,a.y*.75)));}
float b4(vec2 a){return b2(.5*a)*.25+b2(a);}
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){v+=a*n(p);p=m*p;a*=.5;}return v;}

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

// ---------- Galaxy: a wide band of stars and dust crossing the sky ----------
float galaxy(vec2 p,vec2 cell,out float ink){
 float glow=smoothstep(0.,1.,P);
 float a=-.42;
 vec2 q=vec2(p.x*cos(a)-p.y*sin(a),p.x*sin(a)+p.y*cos(a));
 q.x+=T*.0035;
 float w=.15+.06*fbm(vec2(q.x*1.4,3.));
 float off=.07*fbm(vec2(q.x*.8,1.))-.035;
 float d=(q.y-off)/w;
 float core=exp(-d*d*1.5);
 float halo=exp(-d*d*.25);
 float clouds=fbm(q*vec2(3.,6.)+vec2(T*.002,0.))*.6+fbm(q*vec2(10.,20.))*.4;
 float side=smoothstep(.05,.75,abs(p.x)/(R.x/R.y*.5));
 float l=.025+core*(.2+.85*clouds)*(.45+.55*glow)*(.4+.6*side)+halo*.14*(.5+.5*glow);
 float rift=fbm(q*vec2(4.,10.)+vec2(0.,fbm(q*2.5)*1.6));
 float lane=smoothstep(.52,.72,rift)*exp(-pow((q.y-off+.015)/(w*.42),2.));
 l*=1.-lane*.8*(.35+.65*glow);
 l+=.12*smoothstep(.6,.88,fbm(p*2.+vec2(T*.002,5.)))*(.3+.7*glow)*(1.-core*.5);
 float kn=smoothstep(.78,.95,fbm(q*16.+3.))*core;
 l+=kn*.5*(1.-lane);
 float hs=h(cell);
 float dens=mix(.993,.955,core*(.4+.6*clouds)*(1.-lane*.7));
 l=max(l,step(dens,hs)*(.35+.4*core));
 ink=step(.9972,hs)*(.65+.35*sin(T*.16+hs*50.));
 return l;
}

// ---------- Cloudsea: peaks above a slow sea of cloud ----------
float peakH(float x){
 float h0=max(.36/(1.+pow(abs(x+.62)*4.,1.4)),max(.3/(1.+pow(abs(x-.66)*4.5,1.4)),.13/(1.+pow(abs(x-.05)*6.,1.4))));
 float rough=fbm(vec2(x*9.,1.))*.05+fbm(vec2(x*30.,2.))*.012;
 return h0+rough*smoothstep(.02,.15,h0);
}
float cloudsea(vec2 p,vec2 cell,out float ink){
 float dawn=smoothstep(0.,1.,P);
 float CL=-.08;
 float l=.03+(.12+.32*dawn)*exp(-max(p.y-CL,0.)*4.)*(.55+.45*exp(-abs(p.x+.45)*1.5));
 float hs=h(cell);
 ink=step(.9968,hs)*smoothstep(.05,.3,p.y)*(1.-dawn*.7)*(.75+.25*sin(T*.2+hs*40.));
 l=max(l,step(.988,hs)*.25*smoothstep(.1,.35,p.y)*(1.-dawn*.6));
 float H=CL-.02+peakH(p.x);
 if(p.y<H){
  float e=.003;float sl=(peakH(p.x+e)-peakH(p.x-e))/(2.*e);
  float lit=clamp(.3+sl*.7,0.,1.);
  float d=H-p.y;
  float grain=.7+.3*fbm(p*vec2(10.,26.));
  l=.012+.025*fbm(p*25.)+lit*grain*(.2+.55*dawn)*exp(-d*3.5);
  l+=.07*step(.62,fract(d*110.+p.x*8.+fbm(p*14.)*2.))*lit;
  l+=smoothstep(.006,0.,d)*(.22+.4*dawn*lit);
  ink=0.;
 }
 float top=CL+.018*fbm(vec2(p.x*5.+T*.008,T*.01))+.01*sin(p.x*3.+T*.05);
 if(p.y<top){
  float dep=top-p.y;float z=1./(dep+.02);
  vec2 cq=vec2(p.x*z*.12,z*.09-T*.012);
  float b=fbm(cq*1.4);
  float b2=fbm(cq*3.1+b);
  float puff=smoothstep(.3,.7,b2);
  float rim=clamp((b-fbm(cq*1.4+vec2(.06)))*7.,0.,1.);
  float side=smoothstep(.05,.75,abs(p.x)/(R.x/R.y*.5));
  l=(.24+.62*puff*(.55+.45*dawn)*(.55+.45*side)+.25*rim*(.3+.7*dawn))*(.8+.2*exp(-dep*2.5));
  ink=0.;
 }
 float a=p.y-top;
 if(a>0.&&a<.06)l+=.1*exp(-a*40.)*smoothstep(.45,.75,fbm(vec2(p.x*4.+T*.01,a*25.+T*.01)));
 return l;
}
void main(){
 vec2 css=R/DPR;
 vec2 px=vec2(gl_FragCoord.x,R.y-gl_FragCoord.y)/DPR;
 vec2 cell=floor(px/STEP);
 vec2 cc=(cell+.5)*STEP;
 vec2 p=vec2(cc.x-css.x*.5,css.y*.5-cc.y)/css.y;
 float K=css.y/STEP;
 float ink=0.,l;
 if(SCENE<.5)l=veil(p,cell,K,ink);
 else if(SCENE<1.5)l=cloudsea(p,cell,ink);
 else l=galaxy(p,cell,ink);
 l=clamp(l,0.,1.);
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
    ['R', 'DPR', 'T', 'P', 'STEP', 'TINT', 'SCENE', 'MUTED', 'INK'].forEach(k => U[k] = gl.getUniformLocation(program, k));
  }

  function rgb(value, fallback) {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const x = c.getContext('2d'); x.fillStyle = fallback; x.fillStyle = value || fallback; x.fillRect(0, 0, 1, 1);
    const d = x.getImageData(0, 0, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255];
  }

  // Scene time follows one smooth cycle every LOOP seconds, so the last frame meets the first.
  function sceneTime(now) {
    const phase = ((now - start) / 1000 / LOOP) * Math.PI * 2;
    return 40 + 1.6 * Math.sin(phase);
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
  resize();
  if (sheet) updateEdge(innerWidth * .65);
  sync();
})();
