(() => {
  'use strict';
  const host = document.querySelector('.dither-bg');
  const canvas = host?.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.createElement('button');
  toggle.className = 'background-motion';
  toggle.type = 'button';
  document.body.append(toggle);
  const bayer = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
  let width = 0, height = 0, phase = 0, last = 0, raf = 0;
  let playing = !preference.matches, ink, muted;
  const pointer = { x: -1, y: -1 };
  const sheet = document.querySelector('.sheet');
  const dividers = [...document.querySelectorAll('.registration,.sheet>footer')];
  // A slower, continuous highlight confined to the top edge.
  let edgePosition = null, edgeTarget = 0, edgeRAF = 0, edgeLast = 0;
  function drawEdge() {
    sheet.style.setProperty('--edge-x', edgePosition + 'px');
  }
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
    if (edgePosition === null || preference.matches) {
      cancelAnimationFrame(edgeRAF); edgeRAF = 0;
      edgePosition = edgeTarget; drawEdge();
    } else if (!edgeRAF) {
      edgeLast = performance.now();
      edgeRAF = requestAnimationFrame(travelEdge);
    }
  }

  function label() {
    toggle.textContent = playing ? 'Ⅱ PAUSE BACKGROUND' : '▷ PLAY BACKGROUND';
    toggle.setAttribute('aria-label', playing ? 'Pause background motion' : 'Play background motion');
  }
  function paint() {
    ctx.clearRect(0, 0, width, height);
    if (!width || !height) return;
    // A 32-second visual story: signals gather, find a thread, weave, release.
    // Cosine envelopes return to their starting state without a visible reset.
    const cycle = phase * Math.PI * 2 / 32;
    const gather = Math.pow((1 - Math.cos(cycle)) / 2, .8);
    const weave = Math.pow((1 - Math.cos(cycle)) / 2, 3);
    const step = 4;
    const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    const path = (x, offset = 0) => .46 + .34 * Math.sin(x * 6.4 + .25)
      + .04 * Math.sin(x * 17 + Math.sin(cycle)) + offset;
    for (let x = 2; x < width; x += step) {
      const nx = x / width;
      const center = path(nx);
      const branch = .065 * weave * Math.sin(nx * 15 + Math.sin(cycle));
      const breadth = .025 + .055 * (1 - gather);
      for (let y = 2; y < height; y += step) {
        const ny = y / height;
        const distance = (ny - center - branch) / breadth;
        const other = (ny - center + branch) / breadth;
        const ribbon = Math.exp(-distance * distance);
        const partner = Math.exp(-other * other) * weave;
        const rib = .55 + .45 * Math.cos(distance * 14 + nx * 7);
        const fragments = Math.pow(.5 + .5 * Math.sin(nx * 43 + Math.sin(cycle) * 2)
          * Math.cos(ny * 37 - Math.sin(cycle)), 5) * .2;
        const density = Math.min(.95, gather * (ribbon * (.28 + .6 * rib) + partner * .35)
          + fragments * (1 - gather));
        const threshold = (bayer[Math.floor(y / step) % 4][Math.floor(x / step) % 4] + .5) / 16;
        if (density > threshold) {
          ctx.fillStyle = muted;
          ctx.globalAlpha = .24 + density * .42;
          ctx.fillRect(x, y, density > .6 ? 1.8 : 1.2, density > .6 ? 1.8 : 1.2);
        }
      }
    }
    // Individual signals visibly converge on the same thread, then drift home.
    ctx.fillStyle = ink;
    for (let i = 0; i < 240; i++) {
      const homeX = hash(i + 2), homeY = hash(i + 901);
      const nx = homeX + Math.sin(cycle) * .015 * (1 - gather);
      const target = path(nx, (hash(i + 21) - .5) * .035)
        + (i % 2 ? 1 : -1) * .065 * weave * Math.sin(nx * 15 + Math.sin(cycle));
      const y = homeY * (1 - gather) + target * gather;
      ctx.globalAlpha = .08 + gather * .25 + hash(i + 17) * .09;
      ctx.fillRect(nx * width, y * height, 1.3, 1.3);
    }
    ctx.globalAlpha = 1;
  }
  function frame(time) {
    raf = 0;
    if (!playing || document.hidden) return;
    if (time - last >= 40) {
      phase += Math.min((time - last) / 1000, .06) ;
      last = time;
      paint();
    }
    raf = requestAnimationFrame(frame);
  }
  function sync() {
    cancelAnimationFrame(raf);
    raf = 0;
    label();
    if (playing && !document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }
  function resize() {
    width = host.clientWidth;
    height = host.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const palette = getComputedStyle(document.documentElement);
    ink = palette.getPropertyValue('--ink').trim();
    muted = palette.getPropertyValue('--muted').trim();
    paint();
  }
  toggle.addEventListener('click', () => { playing = !playing; sync(); });
  preference.addEventListener('change', event => { playing = !event.matches; sync(); paint(); });
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('pointermove', event => {
    pointer.x = event.clientX / width;
    pointer.y = event.clientY / height;
    dividers.forEach(divider => {
      const rect = divider.getBoundingClientRect();
      const edgeY = divider.matches('footer') ? rect.top - 1 : rect.bottom - 1;
      divider.style.setProperty('--divider-x', (event.clientX - rect.left) + 'px');
      divider.style.setProperty('--divider-y', (event.clientY - edgeY) + 'px');
    });
    updateEdge(event.clientX, event.clientY);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer.x = -1; pointer.y = -1; dividers.forEach(divider => { divider.style.setProperty('--divider-x', '-999px'); divider.style.setProperty('--divider-y', '-999px'); }); });
  new ResizeObserver(resize).observe(host);
  resize();
  if (sheet) updateEdge(innerWidth * .65, 0);
  sync();
})();
