/* ==================================================================
   Arrastrar la pagina con el click, con inercia al soltar.
   Solo en desktop: en tactil el navegador ya tiene inercia nativa.
   ================================================================== */
(function () {
  'use strict';

  if (!window.matchMedia('(pointer: fine)').matches) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var DECAY = 0.935;                  /* cuanto tarda en frenar */
  var THROW = 1.6;                    /* fuerza del envion al soltar */
  var dragging = false, pid = null, lastY = 0, moved = 0, v = 0, raf = 0;

  function jumpTo(y) {                /* scroll sin la interpolacion del CSS */
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
  }

  function settle() {
    raf = 0; v = 0;
    root.style.scrollBehavior = '';
  }

  function glide() {
    if (Math.abs(v) < 0.8) { settle(); return; }
    var before = window.scrollY;
    jumpTo(before + v);
    if (Math.abs(window.scrollY - before) < 0.5) { settle(); return; }   /* llego al tope */
    v *= DECAY;
    raf = window.requestAnimationFrame(glide);
  }

  function halt() {
    if (raf) window.cancelAnimationFrame(raf);
    settle();
  }

  window.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    halt();
    dragging = true; pid = e.pointerId; lastY = e.clientY; moved = 0;
    root.classList.add('dragging');
  });

  window.addEventListener('pointermove', function (e) {
    if (!dragging || e.pointerId !== pid) return;
    var dy = e.clientY - lastY;
    if (!dy) return;
    lastY = e.clientY;
    moved += Math.abs(dy);
    jumpTo(window.scrollY - dy);
    v = v * 0.72 - dy * 0.28;         /* velocidad suavizada, en px por frame */
  }, { passive: true });

  function release() {
    if (!dragging) return;
    dragging = false; pid = null;
    root.classList.remove('dragging');

    if (moved > 6) {                  /* fue un arrastre: que no dispare el click del link */
      var kill = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
      window.addEventListener('click', kill, true);
      window.setTimeout(function () { window.removeEventListener('click', kill, true); }, 0);
    }

    if (!reduce && Math.abs(v) > 1) {
      v *= THROW;
      raf = window.requestAnimationFrame(glide);
    } else {
      settle();
    }
  }

  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', release);
  window.addEventListener('wheel', halt, { passive: true });
  window.addEventListener('keydown', halt);
  window.addEventListener('dragstart', function (e) { e.preventDefault(); });
})();
