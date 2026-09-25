(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // nav state, drawer, sticky mobile CTA
  const onScroll = () => {
    const bh = document.querySelector('.build'); document.body.classList.toggle('scrolled', scrollY > (bh ? bh.offsetHeight - 90 : 40));
    const m = $('.mcta'); if (m) m.classList.toggle('show', scrollY > (bh ? bh.offsetHeight : innerHeight * 0.9));
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const dr = $('.drawer');
  $$('[data-open-drawer]').forEach(b => b.addEventListener('click', () => { dr.classList.add('open'); document.body.style.overflow = 'hidden'; }));
  $$('[data-close-drawer], .drawer a').forEach(b => b.addEventListener('click', () => { dr.classList.remove('open'); document.body.style.overflow = ''; }));

  // reveal
  const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('v'); io.unobserve(x.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.in').forEach(el => { const p = el.parentElement; const sib = p ? [...p.children].filter(c => c.classList.contains('in')) : []; const i = sib.indexOf(el);
    if (sib.length > 2) el.style.transitionDelay = (i % 6) * 70 + 'ms'; io.observe(el); });

  // film grain
  (() => { const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'); const d = g.createImageData(160, 160);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); const el = document.createElement('div'); el.className = 'grain'; el.style.backgroundImage = `url(${c.toDataURL()})`; document.body.prepend(el); })();

  // autoplay background videos only when visible
  const vio = new IntersectionObserver(es => es.forEach(x => { const v = x.target; if (x.isIntersecting) { v.play().catch(() => {}); } else v.pause(); }), { threshold: .15 });
  $$('video[data-auto]').forEach(v => { if (reduce) { v.removeAttribute('autoplay'); return; } v.muted = true; v.playsInline = true; vio.observe(v); });

  // ===== scroll-build hero =====
  const cv = $('#scene');
  if (cv) {
    const ctx = cv.getContext('2d'), build = $('.build'), N = +cv.dataset.frames || 180, SH = +cv.dataset.shots || 9;
    const chapters = $$('.chapter'), wk = $('#wk'), ph = $('#phase'), rail = $$('#rail span'), bar = $('.bar'), hint = $('.hint'), lb = $('.loadbar');
    const phases = JSON.parse(cv.dataset.phases);
    let set = null, frames = [], loaded = 0, W = 0, H = 0, dpr = 1;
    const pickSet = () => (innerHeight > innerWidth * 1.05 ? 'm' : 'd');
    function load() {
      const s = pickSet(); if (s === set) return; set = s; frames = new Array(N); loaded = 0;
      const order = []; for (let step of [30, 10, 5, 2, 1]) for (let i = 0; i < N; i += step) if (!order.includes(i)) order.push(i);
      let q = 0; const next = () => { if (q >= order.length) return; const i = order[q++]; const im = new Image(); im.decoding = 'async';
        im.onload = () => { frames[i] = im; loaded++; if (lb) lb.textContent = loaded < N ? `Loading build ${Math.round(loaded / N * 100)}%` : ''; if (lb && loaded >= N) lb.style.opacity = 0; next(); };
        im.onerror = next; im.src = `frames-${s}/f_${String(i + 1).padStart(4, '0')}.webp`; };
      for (let k = 0; k < 6; k++) next();
    }
    function size() { dpr = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; load(); }
    size(); addEventListener('resize', size);
    let target = 0, cur = 0, lastDrawn = -1;
    const read = () => { const r = build.getBoundingClientRect(); const tot = build.offsetHeight - innerHeight; target = Math.min(1, Math.max(0, -r.top / tot)); if (reduce) cur = target; };
    addEventListener('scroll', read, { passive: true }); read();
    function draw(p) {
      const i = Math.round(p * (N - 1)); let k = i, im = frames[k];
      for (let d = 1; !im && d < N; d++) { im = frames[i - d] || frames[i + d]; }
      if (!im) return; if (im === lastDrawn) return; lastDrawn = im;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const s = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
      ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
      const po = $('.stage .poster'); if (po) po.remove();
    }
    function ui(p) {
      const g = cv.dataset.linear ? p * SH : p * (SH - 0.6);
      chapters.forEach(c => { const a = +c.dataset.in, b = +c.dataset.out, f = .22;
        const o = Math.min(1, Math.max(0, (g - a) / f)) * Math.min(1, Math.max(0, (b - g) / f));
        c.style.opacity = o.toFixed(3); c.style.transform = `translateY(${((1 - o) * (g < a + f ? 26 : -26)).toFixed(1)}px)`; });
      let cp = phases[0]; phases.forEach(x => { if (g >= x[0] - 0.15) cp = x; });
      wk.textContent = String(cp[2]).padStart(2, '0'); ph.textContent = cp[1];
      rail.forEach((s, i) => s.classList.toggle('on', +s.dataset.i === cp[3]));
      bar.style.width = (p * 100).toFixed(2) + '%'; hint.style.opacity = p < .015 ? .85 : 0;
    }
    (function loop() { cur += (target - cur) * 0.1; if (Math.abs(target - cur) < 1e-4) cur = target;
      const r = build.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) { draw(cur); ui(cur); } requestAnimationFrame(loop); })();
  }

  // ===== carousel =====
  $$('[data-car]').forEach(w => { const track = $(w.dataset.car); const step = () => track.firstElementChild.getBoundingClientRect().width + 16;
    $('[data-prev]', w).onclick = () => track.scrollBy({ left: -step(), behavior: 'smooth' });
    $('[data-next]', w).onclick = () => track.scrollBy({ left: step(), behavior: 'smooth' }); });

  // ===== lightbox (images + video) =====
  let lbEl, group = [], gi = 0;
  function ensureLB() { if (lbEl) return; lbEl = document.createElement('div'); lbEl.className = 'lb'; lbEl.setAttribute('role', 'dialog'); lbEl.setAttribute('aria-modal', 'true');
    lbEl.innerHTML = '<div class="body"></div><button class="x" aria-label="Close">✕</button><button class="pv" aria-label="Previous">←</button><button class="nx" aria-label="Next">→</button><div class="cap2"></div>';
    document.body.append(lbEl); $('.x', lbEl).onclick = close; lbEl.onclick = e => { if (e.target === lbEl) close(); };
    $('.pv', lbEl).onclick = () => show(gi - 1); $('.nx', lbEl).onclick = () => show(gi + 1);
    addEventListener('keydown', e => { if (!lbEl.classList.contains('open')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(gi - 1); if (e.key === 'ArrowRight') show(gi + 1); }); }
  function show(i) { gi = (i + group.length) % group.length; const a = group[gi]; const body = $('.body', lbEl);
    body.innerHTML = a.dataset.video ? `<video src="${a.dataset.video}" controls autoplay playsinline></video>` : `<img src="${a.getAttribute('href')}" alt="">`;
    $('.cap2', lbEl).textContent = a.dataset.cap || ''; const multi = group.length > 1; $('.pv', lbEl).style.display = $('.nx', lbEl).style.display = multi ? '' : 'none'; }
  function close() { lbEl.classList.remove('open'); $('.body', lbEl).innerHTML = ''; document.body.style.overflow = ''; }
  document.addEventListener('click', e => { const a = e.target.closest('[data-lb],[data-video]'); if (!a) return; e.preventDefault(); ensureLB();
    const g = a.dataset.lb; group = g ? $$(`[data-lb="${g}"]`).filter(x => x.offsetParent !== null) : [a]; show(group.indexOf(a)); lbEl.classList.add('open'); document.body.style.overflow = 'hidden'; });

  // ===== gallery filters =====
  const fl = $('#filters');
  if (fl) { const items = $$('[data-cat]', $('#grid'));
    const apply = f => { $$('button', fl).forEach(b => b.classList.toggle('on', b.dataset.f === f)); items.forEach(it => it.style.display = f === 'all' || it.dataset.cat === f ? '' : 'none'); };
    fl.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; apply(b.dataset.f); history.replaceState(null, '', b.dataset.f === 'all' ? location.pathname : '#' + b.dataset.f); });
    const h = location.hash.slice(1); if (h && $(`[data-f="${h}"]`, fl)) apply(h); }

  // ===== forms (demo) =====
  $$('form.f').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); const ok = $('.ok', f);
    if (ok) ok.textContent = 'Thanks — this is the demo form. At launch it books straight into the Steve Breck calendar and texts Adrian.'; }));
})();
