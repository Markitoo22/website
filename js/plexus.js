/* ==================================================================
   Fondo plexus reactivo al mouse + entradas + conteo de numeros.
   Los colores NO estan escritos aca: se leen de las variables CSS,
   asi el canvas tambien depende de --brand (css/theme.css).
   ================================================================== */
(function () {
  'use strict';

  /* ===== EL FONDO NO CORRE EN CELULARES =====
     Se apago despues de tres intentos de arreglarlo. El sintoma final era
     que al scrollear a fondo la pagina quedaba blanca: no era el fondo de
     la pagina faltando, era EL CANVAS pintandose blanco. Esta en z-index 0,
     encima del fondo y debajo del contenido, que es exactamente la capa que
     se veia blanca mientras el header y las cajas seguian oscuros.
     Al scrollear fuerte el compositor descarta y reconstruye superficies, el
     canvas pierde su contexto GPU y en varios Android esa superficie perdida
     se pinta blanca. No hay forma de evitarlo desde el lado del canvas.
     En tactil queda el fondo con la viñeta, que es casi el mismo efecto.
     En true vuelve a dibujarse (una sola vez, sin animar). */
  var FONDO_EN_MOBILE = false;

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

  var C = palette(['plexus-near', 'plexus-mid', 'plexus-far', 'node', 'node-hot', 'brand', 'ink']);

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
  /* Campo del cursor. Mismo radio y misma fuerza en los dos modos: lo unico
     que cambia es el signo, asi que alcanza con dos numeros. */
  var FIELD = 330, FIELD2 = FIELD * FIELD;   /* radio de influencia, en px */
  var FORCE = 118;      /* px que se desplaza el nodo justo bajo el cursor */
  var EASE = 0.14;      /* que tan rapido acompaña el desplazamiento (0..1) */
  var ptr = { x: -9999, y: -9999, on: false, down: false };

  /* EL EMPUJON DE LA ONDA DEL CLICK (js/onda.js). Cuando el anillo alcanza
     a un nodo, sale despedido en el sentido de la onda (con un poco de
     azar), mas fuerte cuanto mas cerca del click, y vuelve a su lugar con
     un resorte amortiguado. Como el campo del cursor, es un desplazamiento
     de DIBUJO: la posicion real del nodo no se toca. */
  var KICK = 18, SPRING = 0.07, DAMP = 0.87, CAIDA = 700;
  var seg = [[], [], []];
  var STROKE = [C['plexus-near'], C['plexus-mid'], C['plexus-far']];

  function nodo(w, h) {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      ox: 0, oy: 0,        /* desplazamiento por el cursor (solo para dibujar) */
      kx: 0, ky: 0,        /* empujon de la onda del click (solo para dibujar) */
      kvx: 0, kvy: 0,      /* su velocidad: vuelve con resorte */
      hit: 0,              /* id de la ultima onda que lo alcanzo */
      px: 0, py: 0,        /* posicion pintada = base + desplazamiento */
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
        nodes[k].px = nodes[k].x;
        nodes[k].py = nodes[k].y;
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

    var ox, oy, d, f;
    var ahora = performance.now();
    var FR = window.mlpcOnda ? window.mlpcOnda.frentes(ahora) : [];
    /* el glitch de la onda: deformacion + split RGB mientras el anillo pasa */
    var DEF = window.mlpcOnda ? window.mlpcOnda.deformacion(ahora) : null;
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      a.x += a.vx; a.y += a.vy;
      if (a.x < -20) a.x = W + 20; else if (a.x > W + 20) a.x = -20;
      if (a.y < -20) a.y = H + 20; else if (a.y > H + 20) a.y = -20;

      /* CAMPO DEL CURSOR: repele, y ATRAE con el boton apretado. Simetrico:
         mismo radio y misma fuerza, cambia el signo.
         El desplazamiento no toca la posicion real del nodo: es con lo que se
         lo DIBUJA. Si se acumulara sobre la posicion, cada pasada del mouse
         barreria los nodos hacia los bordes y no volverian nunca (derivan a
         0,15 px por frame). Asi el campo se deforma al pasar y se cierra solo
         al alejarse.
         La fuerza decae al cuadrado y vale exactamente 0 en el borde: no hay
         ningun punto donde se active de golpe. */
      ox = 0; oy = 0;
      if (ptr.on) {
        dx = a.x - ptr.x; dy = a.y - ptr.y;      /* del cursor HACIA el nodo */
        d2 = dx * dx + dy * dy;
        if (d2 < FIELD2) {
          d = Math.sqrt(d2) || 0.001;
          f = 1 - d / FIELD;
          f = f * f * FORCE;                     /* decae al cuadrado, 0 en el borde */
          /* A proposito SIN limitar el tiron a la distancia: atrayendo, los
             nodos mas cercanos cruzan el cursor y salen del otro lado, y el
             campo se da vuelta sobre si mismo. Es acotado (FORCE px como
             maximo), no se descontrola. Para que se junten sin pasarse:
             if (ptr.down) f = Math.min(f, d * 0.82); */
          k = ptr.down ? -1 : 1;                 /* -1 atrae, 1 repele */
          ox = (dx / d) * f * k;
          oy = (dy / d) * f * k;
        }
      }
      /* se acompaña en vez de saltar: con el mouse rapido no da tirones */
      a.ox += (ox - a.ox) * EASE;
      a.oy += (oy - a.oy) * EASE;
      /* le llega el anillo: empujon (una vez por onda) */
      for (var q = 0; q < FR.length; q++) {
        var w = FR[q];
        if (w.id <= a.hit) continue;
        var ex = a.x + a.ox + a.kx - w.x, ey = a.y + a.oy + a.ky - w.y, ed = Math.sqrt(ex * ex + ey * ey) || 1;
        if (ed > w.r) continue;
        a.hit = w.id;
        var p = KICK * (0.4 + Math.random() * 0.8) * 1.35 * Math.exp(-ed / CAIDA);
        var ang = Math.atan2(ey, ex) + (Math.random() - 0.5) * 1.6;
        a.kvx += Math.cos(ang) * p;
        a.kvy += Math.sin(ang) * p;
      }
      if (a.kvx || a.kvy || a.kx || a.ky) {
        a.kvx = (a.kvx - a.kx * SPRING) * DAMP;
        a.kvy = (a.kvy - a.ky * SPRING) * DAMP;
        a.kx += a.kvx; a.ky += a.kvy;
        /* ya se acomodo: se deja en cero exacto y no se calcula mas */
        if (Math.abs(a.kx) + Math.abs(a.ky) + Math.abs(a.kvx) + Math.abs(a.kvy) < 0.02) a.kx = a.ky = a.kvx = a.kvy = 0;
      }
      a.px = a.x + a.ox + a.kx;
      a.py = a.y + a.oy + a.ky;
      a.e = 0;
      if (DEF) {
        var g = DEF(a.px, a.py);
        a.px += g.dx; a.py += g.dy; a.e = g.e;
      }
    }

    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        b = nodes[j];
        dx = a.px - b.px; dy = a.py - b.py; d2 = dx * dx + dy * dy;
        if (d2 < LINK2) {
          t = 1 - d2 / LINK2;
          seg[t > 0.62 ? 0 : t > 0.3 ? 1 : 2].push(a.px, a.py, b.px, b.py);
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

    /* Sin rayos desde el cursor: eran el dibujo de la atraccion (una
       constelacion juntandose en tu puntero). Con repulsion se contradicen,
       porque los nodos se van y las lineas los persiguen. El efecto ahora es
       la malla abriendose, y eso se lee mejor solo. */

    /* SPLIT RGB adentro del anillo, como el filtro sobre el contenido: una
       copia roja y una azul corridas a los costados de cada nodo y de cada
       linea que toca la onda. Rojo y azul puros a proposito: es el mismo
       corrimiento de canales que hace el filtro, no un color de la marca. */
    if (DEF) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        if (a.e < 0.05) continue;
        var o = a.e * 9, al = Math.min(1, a.e * 1.4), z = a.s + 1;
        ctx.fillStyle = 'rgba(255,40,60,' + al + ')';
        ctx.fillRect(a.px - o - z / 2, a.py - z / 2, z, z);
        ctx.fillStyle = 'rgba(40,120,255,' + al + ')';
        ctx.fillRect(a.px + o - z / 2, a.py - z / 2, z, z);
      }
      for (k = 0; k < 2; k++) {
        ctx.beginPath();
        var hay = false;
        for (i = 0; i < nodes.length; i++) {
          a = nodes[i];
          if (a.e < 0.05) continue;
          for (j = i + 1; j < nodes.length; j++) {
            b = nodes[j];
            dx = a.px - b.px; dy = a.py - b.py;
            if (dx * dx + dy * dy >= LINK2) continue;
            var o2 = (k ? 1 : -1) * Math.max(a.e, b.e || 0) * 9;
            ctx.moveTo(a.px + o2, a.py); ctx.lineTo(b.px + o2, b.py);
            hay = true;
          }
        }
        if (hay) {
          ctx.strokeStyle = k ? 'rgba(40,120,255,.35)' : 'rgba(255,40,60,.35)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      ctx.fillStyle = a.s > 2 ? C['node-hot'] : C['node'];
      ctx.fillRect(a.px - a.s / 2, a.py - a.s / 2, a.s, a.s);
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

  /* ---------- brillo y cursor propio, los dos siguen al puntero ---------- */
  if (mouse && !reduce) {
    var glow = document.getElementById('glow');
    var cursor = document.getElementById('cursor');

    /* El cursor del sistema se apaga RECIEN ACA, y no desde el CSS: si
       este bloque no corre (sin JS, en tactil, o con movimiento
       reducido) queda la flecha de siempre en vez de dejar al visitante
       sin cursor. */
    document.documentElement.classList.add('cursor-propio');

    var gx = 0, gy = 0, queued = false, visible = false;
    window.addEventListener('pointermove', function (e) {
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true;
      gx = e.clientX; gy = e.clientY;
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        glow.style.transform = 'translate3d(' + gx + 'px,' + gy + 'px,0)';
        /* el punto va en `translate` y no en `transform`: el tamaño usa
           `scale`, que es otra propiedad, y asi la transicion del tamaño
           no arrastra a la posicion */
        if (cursor) cursor.style.translate = gx + 'px ' + gy + 'px';
        if (!visible) {
          visible = true;
          glow.style.opacity = '1';
          if (cursor) cursor.style.opacity = '1';
        }
      });
    }, { passive: true });
    window.addEventListener('pointerleave', function () {
      ptr.on = false;
      ptr.down = false;
      visible = false;
      glow.style.opacity = '0';
      if (cursor) cursor.style.opacity = '0';
    });




    /* boton apretado = atraccion. Conviven con el arrastre de la pagina:
       agarras, la moves, y mientras el campo se junta hacia el cursor. */
    window.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button === 0) ptr.down = true;
    });
    var soltar = function () { ptr.down = false; };
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    window.addEventListener('blur', soltar);
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
