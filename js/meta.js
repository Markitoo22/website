/* ==================================================================
   Eventos del pixel de Meta.

   El ID del pixel se pone UNA sola vez, en el <head> de index.html
   (window.MLPC_PIXEL). Si esta vacio no pasa nada: ni script de Meta,
   ni cookies, ni este archivo hace nada.

   Se mide un solo hecho: el click en cualquier boton de WhatsApp.
   Sobre ese mismo click se mandan DOS eventos estandar, que es lo que
   Meta muestra con estos nombres:

     Contact  ->  "Contactar"
     Lead     ->  "Cliente potencial"

   OJO: es el MISMO click contado dos veces. En Ads Manager hay que
   elegir UNO como evento de conversion (Lead) y leer el otro como
   dato. Sumarlos da el doble de lo que paso de verdad.

   Y lo que mide es la INTENCION (abrio WhatsApp), no la conversacion:
   lo que se hable adentro de WhatsApp, desde la web no se ve.
   ================================================================== */
(function () {
  'use strict';

  if (!window.MLPC_PIXEL) return;

  var REPETIDO = 1200;            /* ms: dos clicks seguidos al mismo boton son uno */
  var ultimo = 0, ultimoDonde = '';

  /* El listener va en document y burbujeando A PROPOSITO: js/drag.js
     mata el click con un listener de captura en window cuando el
     puntero se movio mas de 6 px, asi que un arrastre que termina
     arriba del boton no llega hasta aca y no cuenta como lead. */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[data-wa]');
    if (!a || typeof window.fbq !== 'function') return;

    var donde = a.getAttribute('data-wa') || 'otro';
    var ahora = Date.now();
    if (donde === ultimoDonde && ahora - ultimo < REPETIDO) return;
    ultimo = ahora;
    ultimoDonde = donde;

    var datos = {
      content_name: donde,                                   /* que boton toco */
      content_category: document.documentElement.lang || ''  /* en que idioma leyo */
    };
    window.fbq('track', 'Contact', datos);
    window.fbq('track', 'Lead', datos);
  });
})();
