/* ==================================================================
   EL GLITCH DEL SALTO A WHATSAPP

   Al tocar "Confirmar diagnostico gratis" (con el formulario completo) la
   pagina explota en un glitch: bandas y bloques de color, el contenido
   sacudido con split RGB, cambios de tono, el logo de WhatsApp
   materializandose cortado en el centro y un destello final. Es el mismo
   efecto de la pagina de Zalotron al tocar una red.

   CUANDO SE ABRE WHATSAPP (lo decide js/formulario.js):
   - en el celular, en el instante del toque: el navegador interno de
     Instagram/Facebook y Safari del iPhone solo dejan abrir otra app si
     pasa justo en el toque. El efecto corre abajo del cartel o de la app;
   - en la PC, al final del efecto (alTerminar), en una pestaña nueva.
     Antes no: la pestaña nueva pasa adelante y el efecto no se veria.

   Lo llama js/formulario.js: window.mlpcGlitchSalto(alTerminar).
   Con "reducir movimiento" no hace nada (llama alTerminar y listo).
   ================================================================== */
(function () {
  'use strict';

  var DUR = 1600;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var corriendo = false;

  function color(v) {
    var p = document.createElement('i');
    p.style.color = 'var(' + v + ')';
    p.style.display = 'none';
    document.body.appendChild(p);
    var c = window.getComputedStyle(p).color;
    p.remove();
    return c;
  }

  window.mlpcGlitchSalto = function (alTerminar) {
    alTerminar = alTerminar || function () {};
    if (reduce || corriendo) { alTerminar(); return; }
    corriendo = true;

    var root = document.documentElement;
    /* lo que se sacude: el contenido y, si esta abierta, la caja de la
       ventana (el formulario). El filtro de color va en los mismos: en
       <html> rompia las capas fijas en Chrome (ver js/onda.js). */
    var ventana = document.querySelector('dialog[open]');
    var blancos = [document.querySelector('.wrap'), ventana && ventana.querySelector('.modal__caja')].filter(Boolean);
    var previos = blancos.map(function (t) { return t.style.filter; });

    /* el lienzo va ADENTRO de la ventana abierta si hay una: la ventana
       esta en la capa de arriba de todo y lo taparia */
    var cv = document.createElement('canvas'), x = cv.getContext('2d');
    cv.className = 'salto-fx';
    (ventana || document.body).appendChild(cv);
    var w = cv.width = window.innerWidth, h = cv.height = window.innerHeight;

    var pal = [color('--accent'), 'rgb(40, 120, 255)', color('--mal'), color('--fg'), color('--ink')];
    var rnd = function (a, b) { a = a == null ? 1 : a; b = b || 0; return b + Math.random() * (a - b); };
    var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

    /* el logo de WhatsApp (el mismo del boton), en 3 tintes: principal y
       dos para el split RGB */
    var camino = document.querySelector('#fEnviar .ico-wa path') || document.querySelector('.ico-wa path');
    var S = Math.round(Math.min(w, h) * .32);
    var tinte = function (c) {
      var o = document.createElement('canvas'), ox = o.getContext('2d');
      o.width = o.height = S;
      ox.scale(S / 24, S / 24); ox.fillStyle = c; ox.fill(new Path2D(camino.getAttribute('d')));
      return o;
    };
    var L = camino && window.Path2D ? { main: tinte(pal[0]), r: tinte(pal[2]), b: tinte(pal[1]) } : null;

    var termino = false;
    function reset() {
      if (termino) return;
      termino = true;
      root.classList.remove('salto-glitch');
      root.style.removeProperty('--gx'); root.style.removeProperty('--ga');
      blancos.forEach(function (t, i) { t.style.removeProperty('transform'); t.style.filter = previos[i]; });
      cv.remove();
      corriendo = false;
      document.removeEventListener('visibilitychange', alVolver);
      alTerminar();
    }
    /* en el celular WhatsApp se pone adelante y la pagina se congela: al
       volver, se termina de una (no se retoma un efecto a medias) */
    function alVolver() { if (!document.hidden) reset(); }
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('pageshow', reset, { once: true });

    root.classList.add('salto-glitch');
    var t0 = performance.now();
    (function paso(now) {
      if (termino) return;
      var p = clamp((now - t0) / DUR, 0, 1), g = p * p * (3 - 2 * p) * p;   /* arranca suave, explota al final */

      var sacude = Math.random() < g * .9;
      var tono = Math.random() < g * .6 ? rnd(360) : 0;
      var invierte = Math.random() < g * g * .3;
      blancos.forEach(function (t, i) {
        t.style.transform = sacude ? 'translate(' + (rnd(-1, 1) * 46 * g) + 'px,' + (rnd(-1, 1) * 10 * g) + 'px) skewX(' + (rnd(-1, 1) * 8 * g) + 'deg)' : '';
        t.style.filter = 'hue-rotate(' + tono + 'deg) saturate(' + (1 + g * 2.5) + ') contrast(' + (1 + g * .9) + ')' + (invierte ? ' invert(1)' : '');
      });
      root.style.setProperty('--gx', (rnd(-1, 1) * 14 * g) + 'px');
      root.style.setProperty('--ga', clamp((g - .15) * 2, 0, 1));

      x.clearRect(0, 0, w, h);
      var i, bandas = Math.floor(g * g * 46 + g * 6);
      for (i = 0; i < bandas; i++) {
        x.globalAlpha = rnd(.2, .85) * Math.max(g, .3);
        x.fillStyle = pal[Math.random() * pal.length | 0];
        x.fillRect(rnd(w * .4, -w * .2), rnd(h), w * rnd(1, .15), rnd(4 + g * 70, 1));
      }
      for (i = 0; i < g * 120; i++) {
        x.globalAlpha = rnd(.9, .3); x.fillStyle = pal[Math.random() * pal.length | 0];
        var s = rnd(4 + g * 26, 2); x.fillRect(rnd(w), rnd(h), s * rnd(4, 1), s);
      }
      /* el logo: aparece de a poco, en franjas corridas, con split RGB */
      if (L && Math.random() > (1 - p) * .55) {
        var ox = (w - S) / 2, oy = (h - S) / 2, a = clamp(p * 1.5, 0, 1), sp = 4 + 18 * (1 - p) + rnd(10 * g);
        for (var y = 0; y < S;) {
          var sh = Math.min(S - y, rnd(4 + 30 * p, 3)), grande = Math.random() < .25;
          var dx = rnd(-1, 1) * (grande ? 70 : 8) * (1.2 - p * .6);
          if (Math.random() < .12 * (1 - p)) { y += sh; continue; }
          x.globalAlpha = a * .8;
          x.drawImage(L.r, 0, y, S, sh, ox + dx - sp, oy + y, S, sh);
          x.drawImage(L.b, 0, y, S, sh, ox + dx + sp, oy + y, S, sh);
          x.globalAlpha = a;
          x.drawImage(L.main, 0, y, S, sh, ox + dx, oy + y, S, sh);
          y += sh;
        }
      }
      x.globalAlpha = g * .25; x.fillStyle = pal[4];
      for (var yy = 0; yy < h; yy += 3) x.fillRect(0, yy, w, 1);           /* lineas de barrido */
      if (p > .94) { x.globalAlpha = (p - .94) / .06 * .9; x.fillStyle = pal[3]; x.fillRect(0, 0, w, h); }   /* destello */
      x.globalAlpha = 1;

      if (p < 1) window.requestAnimationFrame(paso);
      else reset();
    })(t0);
  };
})();
