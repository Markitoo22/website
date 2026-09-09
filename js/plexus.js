/* ==================================================================
   Fondo plexus reactivo al mouse + entradas + conteo de numeros.
   Los colores NO estan escritos aca: se leen de las variables CSS,
   asi el canvas tambien depende de --brand (css/theme.css).
   ================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* mouse de verdad: excluye tactil, hibridos y la vista mobile del devtools.
     Sin mouse el fondo igual se mueve, pero no reacciona a nada. */
  var mouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- leer colores resueltos desde el CSS ----------
     Un elemento sonda devuelve el valor ya calculado en rgba(),
     que es lo que entiende el canvas.                          */
  function palette(names) {
    var probe = document.createElement('span');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;opacity:0';
    document.body.appendChild(probe);
    var out = {};
    for (var i = 0; i < names.length; i++) {
      probe.style.color = 'var(--' + names[i] + ')';
      out[names[i]] = window.getComputedStyle(probe).color;
    }
    probe.parentNode.removeChild(probe);
    return out;
  }

  var C = palette(['plexus-near', 'plexus-mid', 'plexus-far', 'plexus-ptr', 'node', 'node-hot', 'brand', 'ink']);

  /* ---------- favicon derivado de --brand (solo version standalone) ---------- */
  var icon = document.querySelector('link[rel="icon"][data-brandable]');
  if (icon) {
    icon.href = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
      '<rect width="32" height="32" fill="' + C.ink + '"/>' +
      '<rect x="7" y="7" width="18" height="18" fill="none" stroke="' + C.brand + '" stroke-width="3"/>' +
      '</svg>'
    );
  }

  /* ---------- canvas ---------- */
  var canvas = document.getElementById('plexus');
  var ctx = canvas.getContext('2d', { alpha: true });
  var W = 0, H = 0, nodes = [], raf = 0, last = 0;
  var frameGap = mouse ? 0 : 32;                       /* ~30fps en tactil */
  var LINK = mouse ? 138 : 112, LINK2 = LINK * LINK;
  var PTR = 190, PTR2 = PTR * PTR;
  var ptr = { x: -9999, y: -9999, on: false };
  var seg = [[], [], []];
  var STROKE = [C['plexus-near'], C['plexus-mid'], C['plexus-far']];

  function build() {
    var w = window.innerWidth, h = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, mouse ? 1.75 : 1.4);
    W = w; H = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var n = Math.round((w * h) / 17000);
    n = Math.max(14, Math.min(mouse ? 62 : 24, n));    /* menos nodos en celular */
    nodes.length = 0;
    for (var i = 0; i < n; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        s: Math.random() < 0.22 ? 2.4 : 1.4
      });
    }
  }

  function draw() {
    var i, j, a, b, dx, dy, d2, t, k, s;
    ctx.clearRect(0, 0, W, H);
    seg[0].length = seg[1].length = seg[2].length = 0;

    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      a.x += a.vx; a.y += a.vy;
      if (a.x < -20) a.x = W + 20; else if (a.x > W + 20) a.x = -20;
      if (a.y < -20) a.y = H + 20; else if (a.y > H + 20) a.y = -20;

      if (ptr.on) {                                    /* imantado suave al cursor */
        dx = ptr.x - a.x; dy = ptr.y - a.y; d2 = dx * dx + dy * dy;
        if (d2 < PTR2 && d2 > 4) {
          k = (1 - d2 / PTR2) * 0.04;
          a.x += dx * k; a.y += dy * k;
        }
      }
    }

    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        b = nodes[j];
        dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy;
        if (d2 < LINK2) {
          t = 1 - d2 / LINK2;
          seg[t > 0.62 ? 0 : t > 0.3 ? 1 : 2].push(a.x, a.y, b.x, b.y);
        }
      }
    }

    for (k = 0; k < 3; k++) {                          /* un stroke por nivel de alfa */
      s = seg[k];
      if (!s.length) continue;
      ctx.beginPath();
      for (i = 0; i < s.length; i += 4) {
        ctx.moveTo(s[i], s[i + 1]);
        ctx.lineTo(s[i + 2], s[i + 3]);
      }
      ctx.strokeStyle = STROKE[k];
      ctx.lineWidth = k === 0 ? 0.9 : 0.6;
      ctx.stroke();
    }

    if (ptr.on) {
      ctx.beginPath();
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        dx = ptr.x - a.x; dy = ptr.y - a.y;
        if (dx * dx + dy * dy < PTR2) { ctx.moveTo(ptr.x, ptr.y); ctx.lineTo(a.x, a.y); }
      }
      ctx.strokeStyle = C['plexus-ptr'];
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      ctx.fillStyle = a.s > 2 ? C['node-hot'] : C['node'];
      ctx.fillRect(a.x - a.s / 2, a.y - a.s / 2, a.s, a.s);
    }
  }

  function loop(ts) {
    raf = window.requestAnimationFrame(loop);
    if (frameGap && ts - last < frameGap) return;
    last = ts;
    draw();
  }

  function start() { if (!raf && !reduce) raf = window.requestAnimationFrame(loop); }
  function stop() { if (raf) { window.cancelAnimationFrame(raf); raf = 0; } }

  build();
  draw();
  start();

  var rt;
  window.addEventListener('resize', function () {
    window.clearTimeout(rt);
    rt = window.setTimeout(function () { build(); draw(); }, 180);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  /* ---------- brillo que sigue al cursor ---------- */
  if (mouse && !reduce) {
    var glow = document.getElementById('glow');
    var gx = 0, gy = 0, queued = false;
    window.addEventListener('pointermove', function (e) {
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true;
      gx = e.clientX; gy = e.clientY;
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        glow.style.transform = 'translate3d(' + gx + 'px,' + gy + 'px,0)';
        glow.style.opacity = '1';
      });
    }, { passive: true });
    window.addEventListener('pointerleave', function () {
      ptr.on = false;
      glow.style.opacity = '0';
    });
  }

  /* ---------- hairline del header ---------- */
  if ('IntersectionObserver' in window) {
    var top = document.getElementById('top');
    new IntersectionObserver(function (es) {
      top.classList.toggle('stuck', !es[0].isIntersecting);
    }, { rootMargin: '-8px 0px 0px 0px' }).observe(document.getElementById('sentinel'));
  }

  /* ---------- entradas y conteo ---------- */
  var nf = new Intl.NumberFormat('es-AR');

  function countUp(el) {
    var end = parseFloat(el.getAttribute('data-count'));
    var t0 = window.performance.now(), dur = 900;
    window.requestAnimationFrame(function tick(now) {
      var p = Math.min(1, (now - t0) / dur);
      el.textContent = nf.format(Math.round(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) window.requestAnimationFrame(tick);
    });
  }

  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        Array.prototype.forEach.call(en.target.querySelectorAll('[data-count]'), countUp);
        io.unobserve(en.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

    Array.prototype.forEach.call(document.querySelectorAll('[data-reveal]'), function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
        Array.prototype.forEach.call(el.querySelectorAll('[data-count]'), countUp);
        return;                                        /* ya visible: sin animacion de entrada */
      }
      el.classList.add('armed');
      io.observe(el);
    });
  }
})();
