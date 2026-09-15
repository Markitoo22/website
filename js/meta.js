/* ==================================================================
   Eventos del pixel de Meta.

   El ID del pixel se pone UNA sola vez, en el <head> de index.html
   (window.MLPC_PIXEL). Si esta vacio no pasa nada: ni script de Meta,
   ni cookies, ni este archivo hace nada.

   Aca se mide UN solo hecho: el click en un boton de WhatsApp, que es
   el que abre el formulario. Va como Contact ("Contactar" en Ads
   Manager) y significa intencion, nada mas.

   EL "CLIENTE POTENCIAL" (Lead) YA NO SE DISPARA ACA. Lo manda
   js/formulario.js cuando alguien completa y envia el formulario, que
   es cuando dejo nombre y telefono de verdad. La diferencia importa:
   antes Meta aprendia de gente que toca botones, ahora aprende de
   gente que deja datos.

   Los dos numeros juntos son el embudo: cuantos abrieron el formulario
   (Contact) contra cuantos lo completaron (Lead).

   Meta ademas registra por su cuenta un SubscribedButtonClick en el
   mismo click; no es nuestro y no hay que sumarlo.

   ------------------------------------------------------------------
   POR QUE HAY FILTROS

   Un evento de un bot no se cobra, pero es peor que eso: entra como
   ejemplo al optimizador de Meta, que aprende a buscar mas gente
   parecida. Esa plata si se pierde. Meta filtra crawlers conocidos por
   user-agent (plugin BotBlocking), pero eso no alcanza para clicks
   sinteticos ni para navegadores automatizados.

   Cada filtro de abajo esta elegido para que NINGUNA persona real
   quede afuera: para apretar el boton hay que haber apuntado o tocado
   antes, y la pagina recien se muestra cuando resolvio idioma y
   fuentes.
   ================================================================== */
(function () {
  'use strict';

  if (!window.MLPC_PIXEL) return;

  var REPETIDO = 1200;  /* ms: dos clicks seguidos al mismo boton son uno */
  var ESPERA = 500;     /* ms minimos entre que el contenido se ve y el click */

  var ultimo = 0, ultimoDonde = '';

  /* Cuando el visitante vio el contenido de verdad. La compuerta de
     arranque lo avisa; si este archivo cargo despues de que se levanto,
     el flag ya esta puesto y vale el momento de carga. */
  var visto = Date.now();
  if (!window.mlpcListo) {
    document.addEventListener('mlpc:listo', function () {
      visto = Date.now();
    });
  }

  /* ------------------------------------------------------------------
     Señal de que del otro lado hay una persona.

     El mouse NO cuenta por apretar: cuenta por MOVERSE. Un bot manejado
     por el navegador (CDP, Selenium) dispara el click en una coordenada
     sin recorrido previo, y esos clicks son "de verdad" para el
     navegador, asi que isTrusted no los ve.

     El dedo y el lapiz si cuentan al apoyarse: un toque es un contacto
     fisico y hay equipos tactiles que no emiten pointermove antes.
     ------------------------------------------------------------------ */
  var humano = false;
  var senales = ['pointermove', 'wheel', 'scroll', 'keydown', 'touchstart'];

  /* Alcanza con una sola señal, asi que los oyentes se borran solos:
     pointermove es un evento caliente y no tiene sentido seguir
     escuchandolo toda la visita para volver a poner true. */
  function marcarHumano() {
    humano = true;
    for (var j = 0; j < senales.length; j++) {
      window.removeEventListener(senales[j], marcarHumano);
    }
    window.removeEventListener('pointerdown', desdeElDedo);
  }

  function desdeElDedo(e) {
    if (e.pointerType && e.pointerType !== 'mouse') marcarHumano();
  }

  for (var i = 0; i < senales.length; i++) {
    window.addEventListener(senales[i], marcarHumano, { passive: true });
  }
  window.addEventListener('pointerdown', desdeElDedo, { passive: true });

  /* ------------------------------------------------------------------
     El listener va en document y burbujeando A PROPOSITO: js/drag.js
     mata el click con un listener de captura en window cuando el
     puntero se movio mas de 6 px, asi que un arrastre que termina
     arriba del boton no llega hasta aca y no cuenta como lead.
     ------------------------------------------------------------------ */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[data-wa]');
    if (!a || typeof window.fbq !== 'function') return;

    /* 1. el boton tiene que llevar a algun lado. Si el link no se llego a
          armar (un error de JS antes de tiempo, un bloqueador que carga a
          medias), el click no puede terminar en una conversacion: contarlo
          seria festejar una conversion que no existe.

          Se mira que HAYA destino, no cual: a donde apunte el boton es
          problema del boton. Atarlo a un dominio haria que cambiar el
          formato del link apagara el conteo en silencio. */
    var destino = (a.getAttribute('href') || '').trim();
    if (!destino || destino.charAt(0) === '#') return;

    /* 2. clicks armados por codigo: extensiones, scripts, bots simples.
          Un element.click() da isTrusted false; el dedo da true. */
    if (e.isTrusted === false) return;

    /* 3. el navegador se declara automatizado */
    if (navigator.webdriver) return;

    /* 4. la pagina se tiene que estar viendo. Tapa el prerender, que
          ejecuta todo sin que nadie haya mirado nada todavia. */
    if (document.prerendering || document.visibilityState !== 'visible') return;

    /* 5. antes hubo una persona moviendo, tocando o tecleando */
    if (!humano) return;

    /* 6. medio segundo desde que el contenido aparecio. Nadie lee una
          pagina y apunta a un boton en menos que eso. */
    if (Date.now() - visto < ESPERA) return;

    var donde = a.getAttribute('data-wa') || 'otro';
    var ahora = Date.now();
    if (donde === ultimoDonde && ahora - ultimo < REPETIDO) return;
    ultimo = ahora;
    ultimoDonde = donde;

    window.fbq('track', 'Contact', {
      content_name: donde,                                   /* que boton toco */
      content_category: document.documentElement.lang || ''  /* en que idioma leyo */
    });
  });
})();
