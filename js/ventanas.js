/* ==================================================================
   CIERRE ANIMADO DE LAS VENTANAS (formulario y "Leer mas")

   La entrada es solo CSS (css/styles.css, "ENTRADA Y SALIDA DE LAS
   VENTANAS"). La salida necesita esto: una animacion no puede correr en
   una ventana que ya se cerro, asi que close() primero le pone .cerrando,
   espera a que termine el apagado y RECIEN AHI la cierra de verdad.

   Se reemplaza close() en cada ventana: asi cualquier codigo que la cierre
   (la X, tocar afuera, saltar a WhatsApp) pasa por la animacion sin tener
   que enterarse. Escape tambien: se cancela el cierre instantaneo del
   navegador y se cierra por aca.
   ================================================================== */
(function () {
  'use strict';
  if (!window.HTMLDialogElement) return;
  var cerrarDeVerdad = HTMLDialogElement.prototype.close;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  Array.prototype.forEach.call(document.querySelectorAll('dialog.modal'), function (d) {
    var caja = d.querySelector('.modal__caja');

    d.close = function (valor) {
      if (!d.open || d.classList.contains('cerrando')) return;
      /* sin animacion si no hay quien la vea: con la pagina atras (por
         ejemplo, recien se abrio WhatsApp Web en otra pestaña) el navegador
         congela las animaciones y la ventana quedaba abierta */
      if (reduce || !caja || document.hidden) { cerrarDeVerdad.call(d, valor); return; }
      d.classList.add('cerrando');
      var listo = false;
      var fin = function () {
        if (listo) return;
        listo = true;
        caja.removeEventListener('animationend', alTerminar);
        d.classList.remove('cerrando');
        cerrarDeVerdad.call(d, valor);
      };
      var alTerminar = function (e) { if (e.target === caja) fin(); };
      caja.addEventListener('animationend', alTerminar);
      window.setTimeout(fin, 600);   /* por si la animacion no corre */
    };

    d.addEventListener('cancel', function (e) {   /* Escape */
      e.preventDefault();
      d.close();
    });
  });
})();
