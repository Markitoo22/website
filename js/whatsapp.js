/* ==================================================================
   Abrir WhatsApp desde el telefono salteando el cartel de Meta.

   El navegador interno de Instagram y Facebook intercepta a proposito
   cualquier salida de su app y muestra un cartel de "vas a ir a otro
   sitio". No se puede desactivar desde afuera: es una decision de Meta.

   Lo unico que podemos intentar es no salir por una URL http. El
   esquema whatsapp:// no es una navegacion web, asi que algunos
   WebView lo mandan derecho a la app sin preguntar nada.

   NO SE CAMBIA EL href. Los botones siguen apuntando a wa.me y eso es
   lo que ve el HTML, el pixel y cualquiera que copie el link. Este
   archivo solo intercepta el toque y prueba el atajo; si el atajo no
   funciona, sigue por wa.me igual que siempre.

   SOLO EN TELEFONOS. En una PC, wa.me abre WhatsApp Web, que funciona
   con solo tener el telefono a mano; whatsapp:// en cambio necesitaria
   la app de escritorio instalada y dejaria afuera a casi todos. Y esta
   pagina vende puestas a punto de PC: mucha gente entra desde la
   computadora que quiere arreglar.

   Si alguna vez molesta mas de lo que ayuda, se borra la linea que
   carga este archivo en index.html y todo vuelve a como estaba.
   ================================================================== */
(function () {
  'use strict';

  /* Las dos condiciones tienen que darse juntas: un sistema de telefono
     y una pantalla que se toca. Una notebook con pantalla tactil sigue
     teniendo el puntero fino como principal, y ahi wa.me es mejor. */
  var esTelefono = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') &&
                   !!window.matchMedia &&
                   window.matchMedia('(pointer: coarse)').matches;
  if (!esTelefono) return;

  /* Cuanto se espera antes de aceptar que la app no abrio. Si abrio, la
     pagina queda en segundo plano mucho antes de esto. */
  var ESPERA = 800;

  /* El listener va en document y burbujeando, igual que el del pixel:
     js/drag.js mata el click con un listener de captura cuando el dedo
     se movio mas de 6 px, asi que un arrastre no dispara nada. */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[data-wa]');
    if (!a) return;

    var href = a.getAttribute('href') || '';
    var corte = href.indexOf('wa.me/');
    if (corte < 0) return;                   /* sin link conocido, que siga su curso */

    /* https://wa.me/549XXXXXXXXXX?text=Hola  ->
       whatsapp://send?phone=549XXXXXXXXXX&text=Hola                     */
    var resto = href.slice(corte + 6);       /* 6 = largo de "wa.me/" */
    var partes = resto.split('?');
    var numero = partes[0].replace(/\D/g, '');
    if (!numero) return;

    var esquema = 'whatsapp://send?phone=' + numero +
                  (partes[1] ? '&' + partes[1] : '');

    e.preventDefault();

    /* La red: si a los 800 ms la pagina sigue a la vista, la app no
       abrio (no esta instalada, o el WebView bloqueo el esquema) y se
       sigue por wa.me, que es exactamente lo que pasaba antes de que
       existiera este archivo. Nunca se queda sin hacer nada. */
    window.setTimeout(function () {
      if (!document.hidden) window.location.href = href;
    }, ESPERA);

    window.location.href = esquema;
  });
})();
