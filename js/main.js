(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Year
  $('#year').textContent = new Date().getFullYear();

  // Nav: scrolled state, mobile menu, active link
  const nav = $('#nav'), menuBtn = $('#menuBtn'), links = $('#navLinks');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 30);
  onScroll(); addEventListener('scroll', onScroll, { passive: true });
  menuBtn.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  $$('a', links).forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false);
  }));
  const sections = $$('main section[id]');
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) $$('a', links).forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));

  // Theme toggle
  $('#themeBtn').addEventListener('click', () => {
    const root = document.documentElement;
    const cur = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  // Reveal on scroll
  $$('.card, .project, .case, .tl-item, .pub, .skill, .honors article, .edu, .prose, .sec-head').forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));

  // Count-up stats
  const fmt = (el, v) => {
    const dec = +el.dataset.dec || 0;
    el.textContent = (el.dataset.prefix || '') + v.toFixed(dec) + (el.dataset.suffix || '');
  };
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, end = +el.dataset.count;
    if (reduce) return fmt(el, end);
    const t0 = performance.now(), dur = 1200;
    const tick = t => {
      const p = Math.min((t - t0) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
      fmt(el, end * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  // Cost-analysis bar chart (values in taka, from the project's overall-analysis table)
  const data = [
    ['Floor tiles', 860750, 1486750],
    ['Admixture machine', 90000, 360000],
    ['Skilled labour', 330000, 360000],
    ['Ordinary labour', 300000, 330000],
    ['Stone', 171000, 148500],
    ['RCC piling', 64000, 50000],
    ['Water pump', 25000, 35000],
  ];
  const max = Math.max(...data.flat().filter(Number.isFinite));
  const chart = $('#costChart');
  const n = v => '৳' + v.toLocaleString('en-US');
  chart.innerHTML = data.map(([name, a, b]) => `
    <div class="brow"><span>${name}</span><div class="btracks">
      <div class="bt"><div class="bar a" data-w="${a / max * 100}"></div><em>${n(a)}</em></div>
      <div class="bt"><div class="bar b" data-w="${b / max * 100}"></div><em>${n(b)}</em></div>
    </div></div>`).join('');
  const bio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    $$('.bar', chart).forEach(b => b.style.width = `calc(${b.dataset.w}% * .72)`);
    bio.disconnect();
  }), { threshold: .3 });
  bio.observe(chart);
  // bars share the row with a value label, so scale to 72% of the track

  // GRE pies: same 130-170 scale mapping
  // dash length 101 (not 100) closes the hairline seam on a full pie
  $$('.pie').forEach(p => { p._to = 101 - 100 * (+p.dataset.score - 130) / 40; });
  const pio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    pio.unobserve(e.target);
    $('.pie-val', e.target).style.strokeDashoffset = e.target._to;
    // a perfect score is a full disc: fill it once the sweep ends so no anti-aliased seam shows
    if (+e.target.dataset.score >= 170) setTimeout(() => e.target.classList.add('full'), reduce ? 0 : 1700);
  }), { threshold: .5 });
  $$('.pie').forEach(p => pio.observe(p));

  // Copy citation
  $$('.copy').forEach(btn => btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(btn.dataset.cite); btn.textContent = 'Copied ✓'; }
    catch (e) { btn.textContent = 'Copy failed'; }
    setTimeout(() => btn.textContent = 'Copy citation', 1800);
  }));

  // Hero: animated topographic / flow-line field
  const cv = $('#contours'), ctx = cv.getContext('2d');
  let w, h, dpr, t = 0, raf;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const field = (x, y, t) =>
    Math.sin(x * .004 + t * .25) * 34 + Math.sin(y * .006 - t * .18 + x * .002) * 28 + Math.sin((x + y) * .0025 + t * .12) * 40;
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    const rows = Math.ceil(h / 26);
    for (let i = 0; i < rows; i++) {
      const y0 = i * 26 + 8;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 14) {
        const y = y0 + field(x, y0, t) * (.35 + i / rows * .7);
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = `rgba(120,225,215,${.05 + .13 * (i / rows)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    t += .016;
    if (!reduce) raf = requestAnimationFrame(draw);
  };
  resize(); draw();
  addEventListener('resize', () => { resize(); if (reduce) draw(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf); else if (!reduce) draw();
  });
})();
