/* ==================================================================
   Fondo plexus reactivo al mouse + entradas + conteo de numeros.
   Los colores NO estan escritos aca: se leen de las variables CSS,
   asi el canvas tambien depende de --brand (css/theme.css).
   ================================================================== */
(function () {
  'use strict';

  /* ===== INTERRUPTOR DEL FONDO EN CELULARES =====
     En false el canvas no se dibuja ni existe en pantallas tactiles.
     Poner false y recargar es todo lo que hay que hacer para matarlo. */
  var FONDO_EN_MOBILE = true;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* mouse de verdad: excluye tactil, hibridos y la vista mobile del devtools. */
  var mouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var usarFondo = mouse || FONDO_EN_MOBILE;

  /* SOLO SE ANIMA CON MOUSE.
     Un canvas fijo que se redibuja en cada frame obliga al navegador a
     re-rasterizar una capa de pantalla completa mientras el compositor mueve
     la pagina por el scroll. En desktop sobra potencia; en un celular eso
     pelea con el scroll, con la animacion de la barra de direcciones y con el
     backdrop-filter del header, y el fondo se ve roto.
     Dibujado una sola vez, el canvas es una textura que la GPU solo mueve. */
  var animar = mouse && !reduce;

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

  /* ---------- favicon: el mismo escudo del header ----------
     Se clona el SVG inline y se le reemplazan los var(--...) por el color
     ya resuelto, porque un data: URI no ve el CSS de la pagina. Asi el
     dibujo vive en un solo lugar y el icono acompaña a --brand. */
  var icon = document.querySelector('link[rel="icon"][data-brandable]');
  var logo = document.getElementById('logo-ml');
  if (icon && logo && window.XMLSerializer) {
    var clon = logo.cloneNode(true);
    var origen = logo.querySelectorAll('path');
    var copia = clon.querySelectorAll('path');
    for (var f = 0; f < origen.length; f++) {
      copia[f].setAttribute('fill', window.getComputedStyle(origen[f]).fill);
    }
    clon.removeAttribute('class');
    clon.removeAttribute('id');
    clon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    icon.href = 'data:image/svg+xml,' + encodeURIComponent(new XMLSerializer().serializeToString(clon));
  }

  /* ---------- canvas ---------- */
  var canvas = document.getElementById('plexus');
  var ctx = canvas.getContext('2d', { alpha: true });
  var W = 0, H = 0, nodes = [], raf = 0, last = 0;
  var frameGap = 0;
  /* mas alcance sin mouse: el dibujo es unico, las lineas no cuestan por frame */
  var LINK = mouse ? 138 : 132, LINK2 = LINK * LINK;
  var PTR = 190, PTR2 = PTR * PTR;
  var ptr = { x: -9999, y: -9999, on: false };
  var seg = [[], [], []];
  var STROKE = [C['plexus-near'], C['plexus-mid'], C['plexus-far']];

  function nodo(w, h) {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      s: Math.random() < 0.22 ? 2.4 : 1.4
    };
  }

  /* El tamaño sale de la caja del propio canvas, no de window.innerHeight:
     en mobile ese valor es el del viewport visible y no coincide con el alto
     del elemento fijo, asi que el dibujo no llegaba al final de la pantalla. */
  function build() {
    var caja = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(caja.width));
    var h = Math.max(1, Math.round(caja.height));
    var dpr = Math.min(window.devicePixelRatio || 1, animar ? 1.75 : 2);

    /* los nodos se reescalan, no se rehacen: rearmarlos hace saltar el fondo */
    if (nodes.length && W && H) {
      var sx = w / W, sy = h / H;
      for (var k = 0; k < nodes.length; k++) {
        nodes[k].x *= sx;
        nodes[k].y *= sy;
      }
    }

    W = w; H = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* sin animacion se puede poblar mas del doble: se paga una sola vez */
    var n = Math.round((w * h) / (animar ? 17000 : 12000));
    n = Math.max(14, Math.min(animar ? 62 : 46, n));
    while (nodes.length > n) nodes.pop();              /* se ajusta la cantidad */
    while (nodes.length < n) nodes.push(nodo(w, h));   /* sin tocar los que hay */
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

  function start() { if (!raf && animar) raf = window.requestAnimationFrame(loop); }
  function stop() { if (raf) { window.cancelAnimationFrame(raf); raf = 0; } }

  if (usarFondo) {
    build();
    draw();
    start();          /* si no hay mouse, queda ese unico dibujo */
  } else {
    canvas.style.display = 'none';
  }

  var rt;
  window.addEventListener('resize', function () {
    if (!usarFondo) return;
    /* En mobile la barra de direcciones aparece y desaparece al scrollear y
       dispara resize con solo un cambio de alto. Si rearmamos ahi, el fondo
       se mueve solo mientras el visitante scrollea. Reaccionamos al ancho
       (rotacion) y a cambios de alto grandes, no a los de la barra. */
    var caja = canvas.getBoundingClientRect();
    if (Math.abs(Math.round(caja.width) - W) < 2 &&
        Math.abs(Math.round(caja.height) - H) < 150) return;
    window.clearTimeout(rt);
    rt = window.setTimeout(function () { build(); draw(); }, 180);
  }, { passive: true });

  if (animar) {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
  }

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
  /* formatea con el idioma activo; lo expone js/i18n.js, que corre antes */
  var fmt = window.mlpcNumero || function (v) { return String(v); };

  function decimales(raw) {
    return raw.split('.').length > 1 ? raw.split('.')[1].length : 0;
  }

  function countUp(el) {
    var inicial = el.getAttribute('data-count');
    var t0 = window.performance.now(), dur = 900;

    window.requestAnimationFrame(function tick(now) {
      var raw = el.getAttribute('data-count');

      /* El precio puede cambiar en el medio de la animacion: la moneda la
         define la IP y llega unos 200 ms despues del primer pintado. Si eso
         pasa, se corta y se escribe el valor final; si no, la animacion
         seguiria mostrando el monto viejo con la moneda nueva
         (89.999 USD, o sea 89 mil dolares). */
      if (raw !== inicial) {
        el.textContent = fmt(parseFloat(raw), decimales(raw));
        return;
      }

      var p = Math.min(1, (now - t0) / dur);
      /* sin Math.round: el precio en USD tiene decimales (89.99) */
      el.textContent = fmt(parseFloat(raw) * (1 - Math.pow(1 - p, 3)), decimales(raw));
      if (p < 1) window.requestAnimationFrame(tick);
    });
  }

  /* Las entradas y el conteo arrancan cuando js/i18n.js levanta la compuerta:
     antes de eso el contenido esta oculto y la animacion se desperdiciaria. */
  function alLevantarse(fn) {
    if (window.mlpcListo) fn();
    else document.addEventListener('mlpc:listo', fn, { once: true });
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

    alLevantarse(function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-reveal]'), function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
          Array.prototype.forEach.call(el.querySelectorAll('[data-count]'), countUp);
          return;                                      /* ya visible: sin animacion de entrada */
        }
        el.classList.add('armed');
        io.observe(el);
      });
    });
  }
})();
