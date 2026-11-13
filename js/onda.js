/* ==================================================================
   LA ONDA DEL CLICK

   Cada click (o toque) larga un anillo que se expande desde ese punto y
   barre la pantalla. Por donde pasa:

   1. DISTORSION: el contenido real se deforma adentro del anillo
      (refraccion + cortes horizontales + split RGB) con el filtro SVG
      #onda sobre el CONTENIDO (.wrap), no sobre <html>: con el filtro en
      <html>, Chrome con aceleracion deja de dibujar las capas fijas (el
      fondo de nodos y el cursor propio desaparecian) y al scrollear se
      veia una franja blanca. Asi el fondo y el cursor quedan afuera. Cada frame se genera el mapa de desplazamiento
      (R = x, G = y, gris 128 = neutro) a baja resolucion.
   2. GLITCH DE TEXTO: los caracteres que alcanza el anillo se cambian un
      momento por glifos random (mas cuanto mas cerca del click) y vuelven.
      El layout no se mueve: cada caracter va en una cajita del ancho que
      ocupaba, y el contenedor queda congelado mientras dura.

   Nada mas: ni particulas ni sacudones.

   - Calidad adaptativa: el filtro cuesta segun los pixeles de pantalla y
     la maquina. Se calibra durante la compuerta de arranque (la pagina
     todavia no se ve) y, mientras corre una onda, si los frames tardan
     mas de 40 ms baja un nivel en el momento. En el peor caso queda solo
     el glitch de texto.
   - No toca los formularios ni los dialogos (los textos del formulario de
     diagnostico no se glitchean mientras alguien lo completa).
   - Con "reducir movimiento" activado en el sistema, no hace nada.
   - Si otro codigo reescribe un texto mientras glitchea (el conteo de los
     numeros, el cambio de idioma, el carrusel), se suelta sin pisar nada.
   ================================================================== */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ---- AJUSTES ---- */
  var GLITCH = {
    chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!<>-_\\/[]{}=+*^?#Δ',
    duracion: 250,    /* ms que dura el glitch en cada texto */
    cantidad: .7,     /* fraccion maxima de caracteres cambiados, pegado al click */
    minimo: .04,      /* fraccion minima, aunque este lejos */
    cadaFrames: 3     /* cada cuantos frames se re-sortean los glifos */
  };
  var WAVE = { list: [], n: 0, DUR: 1400, T: 190 };   /* T = grosor del anillo */
  var A_WAVE = .6, A_TEAR = .95;                      /* refraccion / cortes (0-1 del scale del filtro) */
  var CAIDA = 700;                                    /* px: con la distancia, el glitch de texto afloja */

  var root = document.documentElement;
  var obj = document.querySelector('.wrap') || root;   /* a quien se le aplica el filtro */
  var $ = function (s) { return document.querySelector(s); };
  var caida = function (d) { return Math.exp(-d / CAIDA); };

  /* frentes de onda activos: { id, x, y, r (radio del anillo), f (fuerza que le queda) } */
  function frentes(now) {
    var out = [];
    WAVE.list.forEach(function (R) {
      var p = (now - R.t0) / WAVE.DUR;
      if (p >= 0 && p < 1) out.push({ id: R.id, x: R.x, y: R.y, r: R.maxR * (1 - Math.pow(1 - p, 2.2)), f: Math.pow(1 - p, 1.3) });
    });
    return out;
  }

  /* ==================================================================
     1. DISTORSION (filtro SVG sobre <html>)
     ================================================================== */
  var NIVELES = [
    { K: 4, f: '#onda', m: '#onda-mapa' },            /* mapa a 1/4, split RGB */
    { K: 6, f: '#onda', m: '#onda-mapa' },            /* mapa mas chico */
    { K: 8, f: '#onda-lite', m: '#onda-mapa-lite' },  /* un solo desplazamiento, sin split */
    null                                              /* sin filtro: queda el glitch de texto */
  ];
  var dpr = window.devicePixelRatio || 1;
  var lvl = window.innerWidth * window.innerHeight * dpr * dpr > 8e6 ? 1 : 0;
  var filt, fe, K, EDGE, mc, mx, mw = 0, mh = 0, img, rows, NEUTRO;

  function usar(l) {
    lvl = l;
    var L = NIVELES[lvl];
    if (fe) fe.removeAttribute('href');
    if (!L) { obj.style.removeProperty('filter'); return; }
    filt = $(L.f); fe = $(L.m); K = L.K;
    EDGE = Math.round(56 / K);   /* cerca de los bordes se apaga: no samplea afuera (sin blancos) */
    mc = document.createElement('canvas'); mx = mc.getContext('2d'); mw = 0;
  }
  if (!$('#onda')) return;
  usar(lvl);

  /* viewport sin la barra de scroll, cacheado: leerlo por frame fuerza un layout */
  var VW = root.clientWidth, VH = root.clientHeight;
  function vread() { VW = root.clientWidth; VH = root.clientHeight; }
  if (window.ResizeObserver) new ResizeObserver(vread).observe(root);
  window.addEventListener('resize', vread);

  function medir() {
    mw = Math.ceil(VW / K); mh = Math.ceil(VH / K); mc.width = mw; mc.height = mh;
    img = mx.createImageData(mw, mh); rows = new Float32Array(mh);
    NEUTRO = new Uint8ClampedArray(mw * mh * 4).fill(128);
    for (var i = 3; i < NEUTRO.length; i += 4) NEUTRO[i] = 255;
  }

  /* el mapa se codifica en segundo plano (toBlob), no en el hilo principal */
  var pendiente = false, url = null, vivo = false;
  function publicar() {
    if (pendiente) return;
    pendiente = true;
    mc.toBlob(function (b) {
      pendiente = false;
      if (!b || !vivo) return;
      var u = URL.createObjectURL(b);
      fe.setAttribute('href', u);
      if (url) URL.revokeObjectURL(url);
      url = u;
    });
  }
  function limpiar() {
    vivo = false;
    if (fe) fe.removeAttribute('href');
    if (url) { URL.revokeObjectURL(url); url = null; }
  }

  var corriendo = false, frame = 0, ultimo = 0, dts = [];

  function loop(now) {
    if (ultimo) {
      dts.push(now - ultimo); if (dts.length > 4) dts.shift();
      if (dts.length === 4 && lvl < NIVELES.length - 1 && dts.slice().sort(function (a, b) { return a - b; })[1] > 40) { usar(lvl + 1); dts.length = 0; }
    }
    ultimo = now;
    try { dibujar(now); } catch (e) { WAVE.list.length = 0; }
    if (WAVE.list.length) window.requestAnimationFrame(loop);
    else { obj.style.removeProperty('filter'); limpiar(); corriendo = false; }
  }

  function dibujar(now) {
    var act = [];
    for (var i = WAVE.list.length - 1; i >= 0; i--) {
      var R = WAVE.list[i], p = Math.max(0, (now - R.t0) / WAVE.DUR);
      if (p >= 1) { WAVE.list.splice(i, 1); continue; }
      act.push({ x: R.x, y: R.y, r: R.maxR * (1 - Math.pow(1 - p, 2.2)), f: Math.pow(1 - p, 1.3) });
    }
    if (!act.length || !NIVELES[lvl]) return;
    render(act, false);
  }

  /* neutro = mismo trabajo pero sin deformar (para calibrar sin que se vea) */
  function render(act, neutro) {
    var vw = VW, vh = VH, caja = obj.getBoundingClientRect();
    if (Math.ceil(vw / K) !== mw || Math.ceil(vh / K) !== mh) medir();
    /* el filtro trabaja en coords del contenido: su region = la parte que
       se ve en pantalla (no procesa toda la pagina) */
    fe.setAttribute('x', -caja.left); fe.setAttribute('y', -caja.top);
    fe.setAttribute('width', vw); fe.setAttribute('height', vh);
    /* La region del FILTRO es mas grande que la pantalla (media pantalla
       arriba y abajo): lo que queda fuera de la region no se dibuja, y al
       scrollear en plena onda el contenido nuevo entraba por una franja
       vacia. En ese margen no hay mapa, asi que no deforma nada. */
    var margen = Math.round(vh / 2);
    filt.setAttribute('x', -caja.left); filt.setAttribute('y', -caja.top - margen);
    filt.setAttribute('width', vw); filt.setAttribute('height', vh + margen * 2);

    /* cortes: bloques de filas con desplazamiento horizontal al azar, cada 2 frames */
    if (frame++ % 2 === 0) for (var y0 = 0; y0 < mh;) {
      var n = 1 + (Math.random() * 6 | 0), v = Math.random() < .4 ? Math.random() * 2 - 1 : 0;
      for (var k = 0; k < n && y0 < mh; k++) rows[y0++] = v;
    }

    var half = WAVE.T / 2 / K, d = img.data;
    var A = act.map(function (a) { return { cx: a.x / K, cy: a.y / K, r: a.r / K, f: a.f }; });
    vivo = true;
    d.set(NEUTRO);   /* todo neutro; solo se calcula lo que toca algun anillo */
    for (var y = 0; y < mh; y++) {
      var tear = rows[y], ey = Math.min(1, y / EDGE, (mh - 1 - y) / EDGE);
      if (ey <= 0) continue;
      var spans = [];
      A.forEach(function (a) {
        var oy = Math.abs(y - a.cy), ro = a.r + half;
        if (oy >= ro) return;
        var xo = Math.sqrt(ro * ro - oy * oy), ri = a.r - half, xi = ri > oy ? Math.sqrt(ri * ri - oy * oy) : 0;
        if (xi > 0) spans.push(a.cx - xo, a.cx - xi, a.cx + xi, a.cx + xo); else spans.push(a.cx - xo, a.cx + xo);
      });
      for (var sp = 0; sp < spans.length; sp += 2) {
        for (var x = Math.max(0, Math.floor(spans[sp])), x1 = Math.min(mw - 1, Math.ceil(spans[sp + 1])), i = (y * mw + x) * 4; x <= x1; x++, i += 4) {
          var edge = Math.min(ey, x / EDGE, (mw - 1 - x) / EDGE), dx = 0, dy = 0;
          if (edge > 0) for (var q = 0; q < A.length; q++) {
            var a = A[q], ox = x - a.cx, oy2 = y - a.cy, dist = Math.sqrt(ox * ox + oy2 * oy2) || 1, s = (dist - a.r) / half;
            if (s <= -1 || s >= 1) continue;
            var e = (.5 + .5 * Math.cos(Math.PI * s)) * a.f, wv = Math.sin(Math.PI * s) * A_WAVE;
            dx += (ox / dist * wv + tear * A_TEAR) * e;
            dy += (oy2 / dist * wv) * e;
          }
          d[i] = 128 + Math.max(-1, Math.min(1, dx * edge)) * 127;
          d[i + 1] = 128 + Math.max(-1, Math.min(1, dy * edge)) * 127;
          d[i + 2] = 128; d[i + 3] = 255;
        }
      }
    }
    if (neutro) d.set(NEUTRO);
    mx.putImageData(img, 0, 0);
    publicar();
    obj.style.filter = 'url(' + NIVELES[lvl].f + ')';
  }

  /* CALIBRACION, con la compuerta de arranque tapando la pagina: se aplica
     el filtro de verdad unos frames (con mapa neutro: no deforma nada) y se
     compara contra frames sin filtro. Si la maquina no da abasto, ya
     arranca un nivel mas liviano. De paso paga los costos de primera vez
     (compilar el filtro, el codificador de PNG): el primer click llega
     "caliente". */
  function calibrar() {
    var base = [], test = [], prev = 0;
    var med = function (a) { return a.slice().sort(function (p, q) { return p - q; })[a.length >> 1]; };
    var fin = function () { if (corriendo) return; obj.style.removeProperty('filter'); limpiar(); };
    var bajar = function () { usar(lvl + 1); test.length = 0; };
    window.requestAnimationFrame(function paso(now) {
      if (corriendo) return;
      if (prev) (base.length < 6 ? base : test).push(now - prev);
      prev = now;
      if (base.length >= 6) {
        if (test.length && test[test.length - 1] > 150) bajar();
        else if (test.length >= 6) { if (med(test) > 40 && med(test) - med(base) > 10) bajar(); else return fin(); }
        if (!NIVELES[lvl]) return fin();
        try { render([{ x: VW / 2, y: VH / 2, r: Math.min(VW, VH) * .3, f: 1 }], true); } catch (e) { return fin(); }
      }
      window.requestAnimationFrame(paso);
    });
  }
  if (root.classList.contains('booting')) window.setTimeout(calibrar, 100);

  /* ==================================================================
     2. GLITCH DE TEXTO
     ================================================================== */
  var SALTEAR = 'script,style,svg,input,textarea,select,dialog,.cursor,.cursor-glow,zg-t';
  var vivos = new Map(), golpe = new WeakMap(), pend = [], glitcheando = false;
  var rnd = function () { return GLITCH.chars[Math.random() * GLITCH.chars.length | 0]; };

  /* textos visibles al momento del click (rect en coords de documento, para seguir el scroll) */
  function juntar() {
    var vh = window.innerHeight, sy = window.scrollY, out = [], rg = document.createRange();
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return n.data.trim() && !n.parentElement.closest(SALTEAR) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    for (var n; (n = w.nextNode());) {
      rg.selectNodeContents(n);
      var r = rg.getBoundingClientRect();
      if (r.width && r.bottom >= 0 && r.top <= vh) out.push({ n: n, l: r.left, r: r.right, t: r.top + sy, b: r.bottom + sy });
    }
    return out;
  }

  /* ancho real de cada caracter tal como esta dibujado (con kerning,
     letter-spacing y mayusculas por CSS), y donde arranca cada renglon */
  function medirTexto(n) {
    var rg = document.createRange(), rs = [], brs = new Set(), prev = null, i;
    for (i = 0; i < n.data.length; i++) { rg.setStart(n, i); rg.setEnd(n, i + 1); rs.push(rg.getBoundingClientRect()); }
    rs.forEach(function (r, j) {
      if (/\s/.test(n.data[j])) return;
      if (prev && r.top > prev.top + prev.height * .5) brs.add(j);
      prev = r;
    });
    var ws = rs.map(function (r, j) {
      var nx = rs[j + 1];
      return nx && !/\s/.test(n.data[j + 1]) && Math.abs(nx.top - r.top) < 1 ? nx.left - r.left : r.width;
    });
    return { ws: ws, brs: brs };
  }

  /* el contenedor queda congelado mientras glitchea; varios textos en la
     misma caja comparten el candado */
  var candados = new Map();
  function cajaDe(n) {
    var el = n.parentElement;
    while (el.parentElement && window.getComputedStyle(el).display === 'inline') el = el.parentElement;
    return el;
  }
  function trabar(el, r) {
    var l = candados.get(el);
    if (l) { l.count++; return; }
    candados.set(el, { count: 1, w: el.style.width, h: el.style.height });
    el.style.width = r.width + 'px'; el.style.height = r.height + 'px';
  }
  function destrabar(el) {
    var l = candados.get(el);
    if (!l || --l.count) return;
    el.style.width = l.w; el.style.height = l.h; candados.delete(el);
  }

  /* texto -> palabras de cajitas de ancho fijo; los renglones del original
     van con <br> y no se corta en ningun otro lado */
  function cajitas(data, ws, into, brs) {
    var chars = [], word = null;
    for (var i = 0; i < data.length; i++) {
      var ch = data[i];
      if (brs && brs.has(i)) { into.appendChild(document.createElement('br')); word = null; }
      if (/\s/.test(ch)) { word = null; into.appendChild(document.createTextNode(ch)); continue; }
      if (!word) { word = document.createElement('zg-w'); into.appendChild(word); }
      var c = document.createElement('zg-c');
      c.style.width = ws[i] + 'px'; c.textContent = ch;
      word.appendChild(c); chars.push({ c: c, ch: ch });
    }
    return chars;
  }

  /* medir (lecturas) -> devuelve la funcion que envuelve (escrituras) */
  function preparar(n) {
    var cont = cajaDe(n), cs = window.getComputedStyle(cont);
    var cr = { width: parseFloat(cs.width), height: parseFloat(cs.height) };
    if (n.data.length === 1 && cont === n.parentElement && cont.childNodes.length === 1) {
      var orig = n.data;
      return function () {
        trabar(cont, cr);
        return { chars: [{ c: n, ch: orig, nodo: true }], alive: function () { return n.isConnected; },
                 end: function (ok) { if (ok) n.data = orig; destrabar(cont); } };
      };
    }
    var m = medirTexto(n);
    return function () {
      trabar(cont, cr);
      var box = document.createElement('zg-t'), chars = cajitas(n.data, m.ws, box, m.brs);
      n.parentNode.replaceChild(box, n);
      return { chars: chars, alive: function () { return box.isConnected; },
               end: function (ok) { if (ok && box.parentNode) box.parentNode.replaceChild(n, box); destrabar(cont); } };
    };
  }

  function tick() {
    var now = performance.now(), FR = frentes(now), sy = window.scrollY, hits = new Map();
    /* le llega el anillo a un texto (al punto mas cercano de su caja) */
    pend.forEach(function (p) {
      FR.forEach(function (a) {
        if (a.id <= (golpe.get(p.n) || 0)) return;
        var dx = Math.max(p.l - a.x, 0, a.x - p.r), dy = Math.max(p.t - sy - a.y, 0, a.y - (p.b - sy)), d = Math.hypot(dx, dy);
        if (d > a.r) return;
        golpe.set(p.n, a.id);
        var amt = GLITCH.cantidad * caida(d) + GLITCH.minimo, s = vivos.get(p.n);
        if (s) { s.t0 = now; s.amt = Math.max(s.amt, amt); }
        else if (p.n.isConnected) hits.set(p.n, Math.max(hits.get(p.n) || 0, amt));
      });
    });
    /* primero se mide todo, despues se escribe */
    var listos = [];
    hits.forEach(function (amt, n) { listos.push({ n: n, amt: amt, aplicar: preparar(n) }); });
    listos.forEach(function (o) {
      if (!o.n.isConnected || vivos.has(o.n)) return;
      var s = o.aplicar(); s.t0 = now; s.amt = o.amt; s.f = 0;
      vivos.set(o.n, s);
    });

    vivos.forEach(function (s, n) {
      if (!s.alive()) { s.end(false); vivos.delete(n); return; }
      var k = (now - s.t0) / GLITCH.duracion;
      if (k >= 1) { s.end(true); vivos.delete(n); return; }
      if (s.f++ % GLITCH.cadaFrames) return;
      var amt = s.amt * (1 - k * k);
      s.chars.forEach(function (o) {
        var g = /\s/.test(o.ch) || Math.random() >= amt ? o.ch : rnd();
        if (o.nodo) { if (o.c.data !== g) o.c.data = g; }
        else if (o.c.textContent !== g) o.c.textContent = g;
      });
    });
    return FR.length > 0 || vivos.size > 0;
  }

  /* si un frame falla, se restauran todos los textos y el loop sigue */
  function loopTexto() {
    var mas = false;
    try { mas = tick(); }
    catch (e) { vivos.forEach(function (s) { try { s.end(true); } catch (er) {} }); vivos.clear(); }
    if (mas) window.requestAnimationFrame(loopTexto);
    else { glitcheando = false; pend = []; }
  }

  /* ==================================================================
     EL CLICK
     ================================================================== */
  /* SOLO UN CLICK DE VERDAD: apretar y soltar casi en el mismo lugar.
     Arrastrar para scrollear (js/drag.js) o deslizar el carrusel no larga
     onda: si no, el filtro trabajaba durante todo el arrastre y el scroll
     se ponia pesado. Sale al soltar, donde se solto. */
  var apreto = null;
  window.addEventListener('pointerdown', function (e) {
    apreto = e.button ? null : { id: e.pointerId, x: e.clientX, y: e.clientY };
  }, { passive: true });
  window.addEventListener('pointercancel', function () { apreto = null; }, { passive: true });
  window.addEventListener('pointerup', function (e) {
    var a = apreto;
    apreto = null;
    if (!a || a.id !== e.pointerId || Math.hypot(e.clientX - a.x, e.clientY - a.y) > 8) return;
    /* con un dialogo abierto el click es del dialogo: no se larga onda */
    if (document.querySelector('dialog[open]')) return;
    var x = e.clientX, y = e.clientY;
    /* radio final fijo: misma velocidad desde cualquier punto, y alcanza
       para barrer toda la pantalla */
    var maxR = Math.hypot(VW, VH) + WAVE.T;
    WAVE.list.push({ id: ++WAVE.n, x: x, y: y, maxR: maxR, t0: performance.now() });
    if (!corriendo) { corriendo = true; ultimo = 0; dts.length = 0; window.requestAnimationFrame(loop); }
    pend = juntar();
    if (!glitcheando) { glitcheando = true; window.requestAnimationFrame(loopTexto); }
  }, { passive: true });
})();
