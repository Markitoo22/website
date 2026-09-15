/* ==================================================================
   Arrastrar la pagina con el click, con inercia al soltar.
   Solo en desktop: en tactil el navegador ya tiene inercia nativa.
   ================================================================== */
(function () {
  'use strict';

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

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
    /* si el click arranca en un control, es del control: el desplegable
       del idioma se traga el pointerup y la pagina quedaria arrastrandose */
    if (e.target.closest && e.target.closest('select, input, textarea, button, [contenteditable]')) return;
    /* con un dialogo abierto la pagina de atras no se arrastra: el gesto
       es del dialogo. Sin esto, arrastrar la lista del pais movia la
       pagina, y el scroll terminaba cerrando la lista. */
    if (e.target.closest('dialog')) return;
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


  /* ------------------------------------------------------------------
     DESPLAZAMIENTO AUTOMATICO, HECHO ACA

     Apretar la rueda activa el de Windows, que dibuja su propio icono
     anclado donde apretaste: el unico momento en que se ven dos cursores
     a la vez. Ese icono no se puede esconder — lo dibuja el navegador, no
     la pagina, igual que la barra de scroll o el desplegable nativo.

     Asi que se cancela el nativo y se hace el mismo gesto aca: se ancla
     donde apreto, y la pagina scrollea mas rapido cuanto mas lejos del
     ancla esta el puntero. Se sale con otro click, con una tecla o con
     la rueda, como el de siempre.

     No se dibuja ninguna marca: lo unico que tiene que verse es nuestro
     cursor, como en el resto de la pagina.
     ------------------------------------------------------------------ */
  var ZONA = 14;        /* px alrededor del ancla donde no pasa nada */
  var VELOZ = 0.45;     /* px de scroll por frame y por px de distancia */
  var auto = null;

  function pararAuto() {
    if (!auto) return;
    if (auto.raf) window.cancelAnimationFrame(auto.raf);
    root.classList.remove('autoscroll');
    auto = null;
  }

  function pasoAuto() {
    if (!auto) return;
    var dy = auto.actual - auto.y;
    var lejos = Math.abs(dy) - ZONA;
    if (lejos > 0) {
      /* respuesta acelerada, como la nativa: cerca del ancla se mueve
         despacio y se puede afinar; lejos, vuela */
      var v = (dy < 0 ? -1 : 1) * Math.pow(lejos, 1.35) * VELOZ * 0.1;
      jumpTo(window.scrollY + v);
    }
    auto.raf = window.requestAnimationFrame(pasoAuto);
  }

  window.addEventListener('mousedown', function (e) {
    if (e.button !== 1) return;
    e.preventDefault();               /* sin esto aparece el icono del sistema */
    if (auto) { pararAuto(); return; }  /* segundo click: se sale */

    halt();                           /* corta cualquier inercia en curso */
    auto = { y: e.clientY, actual: e.clientY, raf: 0 };
    root.classList.add('autoscroll');
    auto.raf = window.requestAnimationFrame(pasoAuto);
  });

  window.addEventListener('pointermove', function (e) {
    if (auto) auto.actual = e.clientY;
  }, { passive: true });

  /* se sale igual que con el nativo */
  window.addEventListener('wheel', pararAuto, { passive: true });
  window.addEventListener('keydown', pararAuto);
  window.addEventListener('blur', pararAuto);
  window.addEventListener('mousedown', function (e) {
    if (e.button !== 1 && auto) pararAuto();
  });

  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', release);
  window.addEventListener('wheel', halt, { passive: true });
  window.addEventListener('keydown', halt);
  window.addEventListener('dragstart', function (e) { e.preventDefault(); });
})();
