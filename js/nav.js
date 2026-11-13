/* ==================================================================
   LAS SECCIONES DEL HEADER

   Cada link lleva a su seccion con un desplazamiento suave, y el de la
   seccion que se esta leyendo queda encendido mientras se scrollea.

   - Sin JS los links siguen andando: son anclas comunes (#precio...).
     Con JS se scrollea por codigo para no ensuciar la direccion con el
     #, y para descontar el alto del header, que es fijo y taparia el
     titulo de la seccion.
   - "Opiniones" aparece solo si la seccion de testimonios aparece (no
     la hay si todavia no hay ninguno, o si Google no contesta).
   - Mientras dura el viaje despues de un click, se deja encendido el
     destino: si no, se iban prendiendo una por una las del medio.
   ================================================================== */
(function () {
  'use strict';

  var nav = document.getElementById('nav');
  if (!nav) return;
  var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var top = document.getElementById('top');

  function seccionDe(a) { return document.getElementById(a.getAttribute('href').slice(1)); }
  function altoHeader() { return top ? top.offsetHeight : 0; }

  /* la seccion de testimonios puede no estar: su link va igual */
  function sincronizar() {
    links.forEach(function (a) {
      var s = seccionDe(a);
      a.hidden = !s || s.hidden;
    });
  }

  var fijo = null;                 /* destino de un click, mientras se viaja */
  var finViaje = 0;

  function encender(a) {
    links.forEach(function (l) {
      if (l === a) l.setAttribute('aria-current', 'true');
      else l.removeAttribute('aria-current');
    });
  }

  /* La que se esta leyendo: la ultima cuyo comienzo ya paso una linea
     imaginaria a un tercio de la pantalla. Al llegar al fondo se
     enciende la ultima, aunque sea corta y nunca llegue a esa linea. */
  function actual() {
    var visibles = links.filter(function (a) { return !a.hidden; });
    if (!visibles.length) return null;
    var fondo = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (fondo) return visibles[visibles.length - 1];
    var linea = altoHeader() + window.innerHeight * 0.3;
    var cual = null;
    visibles.forEach(function (a) {
      if (seccionDe(a).getBoundingClientRect().top <= linea) cual = a;
    });
    return cual;
  }

  var pedido = 0;
  function revisar() {
    pedido = 0;
    sincronizar();
    encender(fijo || actual());
  }
  function alScrollear() {
    if (!pedido) pedido = window.requestAnimationFrame(revisar);
  }

  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      var s = seccionDe(a);
      if (!s || s.hidden) return;
      e.preventDefault();
      var y = s.getBoundingClientRect().top + window.scrollY - altoHeader() + 1;
      fijo = a;
      encender(a);
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      /* 'scrollend' avisa cuando termina el viaje; donde no existe, un
         tiempo tope. Si ya estaba ahi, no hay viaje: se suelta enseguida */
      window.clearTimeout(finViaje);
      finViaje = window.setTimeout(soltar, 1400);
    });
  });

  function soltar() {
    window.clearTimeout(finViaje);
    fijo = null;
    revisar();
  }
  window.addEventListener('scrollend', function () { if (fijo) soltar(); });
  /* si la persona agarra la rueda o arrastra en pleno viaje, manda ella */
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (t) {
    window.addEventListener(t, function (e) {
      if (fijo && !(e.target.closest && e.target.closest('#nav'))) soltar();
    }, { passive: true });
  });

  window.addEventListener('scroll', alScrollear, { passive: true });
  window.addEventListener('resize', alScrollear);
  /* la seccion de testimonios aparece tarde (cuando contesta Google) */
  document.addEventListener('mlpc:secciones', alScrollear);
  revisar();
})();
