/* ==================================================================
   TESTIMONIOS

   Dos trabajos en un archivo, segun la pagina en la que se cargue:

   - index.html  (#testimonios): trae los testimonios y arma la seccion.
     Si no hay ninguno, o el servicio no contesta, la seccion NO aparece:
     una seccion vacia o con "cargando" resta mas de lo que suma.

   - testimonio.html (#tForm): el formulario al que lleva el link de un
     solo uso. Primero pregunta si el link sirve, asi la persona no
     escribe un texto entero para enterarse al final de que vencio.

   Los datos viven en una Google Sheet del dueño, del otro lado de un
   Apps Script (servidor/testimonios.gs). Como se instala: README.md,
   seccion "Testimonios".
   ================================================================== */
(function () {
  'use strict';

  /* LA DIRECCION DEL APPS SCRIPT: Implementar -> Administrar
     implementaciones -> "URL de la aplicacion web". Termina en /exec.
     Editor.exe tambien la lee de aca para generar los links: no cambiar
     el formato de esta linea. */
  var API = 'https://script.google.com/macros/s/AKfycbznF3wU0pofSnpMDBKeLXl7pMcT1zuCDLMEuXytvOpSsaZuTu7xciBrYxCfFHK1YkA/exec';

  var listo = API.indexOf('PEGAR_ACA') < 0;
  var $ = function (id) { return document.getElementById(id); };
  var MAX_TEXTO = 500;     /* el mismo techo que servidor/testimonios.gs */
  var MIN_TEXTO = 10;
  var VISIBLES = 6;        /* el resto, detras de "Ver mas" */

  /* Los textos que el JS necesita YA TRADUCIDOS viven en spans ocultos
     con data-i18n: js/i18n.js los deja al dia como a todo lo demas. */
  function txt(id, n) {
    var el = $(id);
    var s = el ? el.textContent : '';
    return n == null ? s : s.split('{n}').join(n);
  }
  function lang() { return document.documentElement.lang || 'es'; }

  function pedir(url, opciones, ms) {
    var ctl = window.AbortController ? new AbortController() : null;
    var reloj = window.setTimeout(function () { if (ctl) ctl.abort(); }, ms);
    if (ctl) opciones.signal = ctl.signal;
    return window.fetch(url, opciones)
      .then(function (r) { return r.json(); })
      .then(function (d) { window.clearTimeout(reloj); return d; },
            function (e) { window.clearTimeout(reloj); throw e; });
  }

  /* las estrellas: SVG y no el caracter ★, que en cada sistema sale con
     otro dibujo (y en algunos como emoji amarillo) */
  var ESTRELLA = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.6l2.6 5.3 5.8.85-4.2 4.1 1 5.8L10 14.9l-5.2 2.75 1-5.8-4.2-4.1 5.8-.85z"/></svg>';

  /* ==================================================================
     LA SECCION DEL SITIO
     ================================================================== */
  var seccion = $('testimonios');
  if (seccion && listo && window.fetch) {
    var items = [];
    var abierta = false;

    var fecha = function (iso) {
      var d = new Date(iso);
      if (isNaN(d)) return '';
      try { return new Intl.DateTimeFormat(lang(), { month: 'short', year: 'numeric' }).format(d); }
      catch (e) { return ''; }
    };

    var pintar = function () {
      var suma = 0;
      for (var i = 0; i < items.length; i++) suma += items[i].estrellas;
      var prom = suma / items.length;
      var num = window.mlpcNumero ? window.mlpcNumero(prom, 1) : prom.toFixed(1);
      $('tProm').innerHTML = ESTRELLA + num;
      $('tProm').setAttribute('aria-label', txt('tTxtEstrellas', num));
      $('tCant').textContent = items.length === 1 ? txt('tTxtUna') : txt('tTxtVarias', items.length);

      var lista = $('tLista');
      lista.textContent = '';
      var hasta = abierta ? items.length : Math.min(items.length, VISIBLES);
      for (var k = 0; k < hasta; k++) {
        var t = items[k];
        var fig = document.createElement('figure');
        fig.className = 'testi__card';

        var est = document.createElement('div');
        est.className = 'testi__stars';
        est.setAttribute('role', 'img');
        est.setAttribute('aria-label', txt('tTxtEstrellas', t.estrellas));
        var estrellas = '';
        for (var s = 1; s <= 5; s++) estrellas += s <= t.estrellas ? ESTRELLA : ESTRELLA.replace('<svg', '<svg class="off"');
        est.innerHTML = estrellas;          /* markup propio, sin nada del visitante */

        /* lo que escribio el cliente va SIEMPRE como texto, nunca como HTML */
        var cita = document.createElement('blockquote');
        cita.className = 'testi__txt';
        cita.textContent = t.texto;

        var pie = document.createElement('figcaption');
        pie.className = 'testi__pie';
        var quien = document.createElement('b');
        quien.textContent = t.nombre;
        pie.appendChild(quien);
        var f = fecha(t.fecha);
        if (f) {
          var cuando = document.createElement('span');
          cuando.textContent = f;
          pie.appendChild(cuando);
        }

        fig.appendChild(est);
        fig.appendChild(cita);
        fig.appendChild(pie);
        lista.appendChild(fig);
      }
      $('tMas').hidden = abierta || items.length <= VISIBLES;
    };

    $('tMas').addEventListener('click', function () {
      abierta = true;
      pintar();
    });

    /* el idioma cambia con el selector del header: las fechas y el
       "12 opiniones" estan escritos por aca, asi que se rearman */
    if (window.MutationObserver) {
      new MutationObserver(function () { if (items.length) pintar(); })
        .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }

    /* La entrada animada la maneja js/plexus.js para las secciones que
       existen al arrancar. Esta aparece despues (cuando contesta Google),
       asi que se arma aca con las mismas clases. */
    var entrar = function () {
      seccion.hidden = false;
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || !('IntersectionObserver' in window) ||
          seccion.getBoundingClientRect().top < window.innerHeight * 0.9) return;
      seccion.classList.remove('in');
      seccion.classList.add('armed');
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        seccion.classList.add('in');
        io.disconnect();
      }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
      io.observe(seccion);
    };

    pedir(API + '?accion=lista', {}, 10000).then(function (d) {
      if (!d || !d.ok || !d.items || !d.items.length) return;
      items = d.items;
      pintar();
      entrar();
    }).catch(function () { /* sin testimonios no se muestra nada: nadie lo nota */ });
  }

  /* ==================================================================
     EL FORMULARIO DEL LINK
     ================================================================== */
  var form = $('tForm');
  if (!form) return;

  var token = (/[?&]t=([0-9a-f]{32})/i.exec(location.search) || [])[1] || '';
  token = token.toLowerCase();
  var estrellas = 0;

  function mostrar(estado) {
    var pantallas = document.querySelectorAll('[data-pantalla]');
    for (var i = 0; i < pantallas.length; i++) {
      pantallas[i].hidden = pantallas[i].getAttribute('data-pantalla') !== estado;
    }
  }

  /* un link que no sirve: una pantalla por motivo, cada una ya traducida */
  function linkMalo(motivo) {
    mostrar(motivo === 'usado' || motivo === 'vencido' ? motivo : 'invalido');
  }

  if (!listo || !window.fetch) { linkMalo('servidor'); return; }
  if (!token) { linkMalo('invalido'); return; }

  pedir(API + '?accion=link&t=' + token, {}, 15000).then(function (d) {
    if (!d || !d.ok) return linkMalo(d && d.error);
    if (d.para && !$('tNombre').value) $('tNombre').value = d.para;
    mostrar('form');
  }).catch(function () {
    /* no se pudo preguntar: se deja escribir igual, y si el link no
       servia lo dice el envio */
    mostrar('form');
  });

  /* --- estrellas: radios de verdad (teclado y lector de pantalla), con
         el dibujo pintado hasta la elegida o hasta la que esta abajo
         del mouse --- */
  var grupo = $('tEstrellas');
  var radios = grupo.querySelectorAll('input');
  function encender(n) {
    var labels = grupo.querySelectorAll('label');
    for (var i = 0; i < labels.length; i++) labels[i].classList.toggle('on', i < n);
  }
  for (var r = 0; r < radios.length; r++) {
    radios[r].addEventListener('change', function () {
      estrellas = Number(this.value);
      encender(estrellas);
      grupo.classList.remove('mal');
    });
    radios[r].parentNode.addEventListener('mouseenter', function () {
      encender(Number(this.querySelector('input').value));
    });
  }
  grupo.addEventListener('mouseleave', function () { encender(estrellas); });

  /* --- contador del texto --- */
  var area = $('tTexto');
  function contar() {
    var n = area.value.trim().length;
    var c = $('tCuenta');
    c.textContent = n + ' / ' + MAX_TEXTO;
    c.classList.toggle('pasado', n > MAX_TEXTO);
  }
  area.addEventListener('input', function () {
    contar();
    area.closest('.campo').classList.remove('mal');
  });
  $('tNombre').addEventListener('input', function () {
    this.closest('.campo').classList.remove('mal');
  });
  contar();

  function avisar(texto) {
    var err = $('tError');
    err.textContent = texto;
    err.hidden = false;
  }
  function marcar(caja, foco, aviso) {
    caja.classList.add('mal');
    avisar(aviso || txt('tTxtFalta'));
    foco.focus();
  }

  var enviando = false;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (enviando) return;
    $('tError').hidden = true;

    var nombre = $('tNombre').value.trim();
    var texto = area.value.trim();
    if (!estrellas) return marcar(grupo, radios[4]);
    if (!nombre) return marcar($('tNombre').closest('.campo'), $('tNombre'));
    if (texto.length < MIN_TEXTO) return marcar(area.closest('.campo'), area, txt('tTxtCorto'));
    if (texto.length > MAX_TEXTO) return marcar(area.closest('.campo'), area, txt('tTxtLargo'));

    enviando = true;
    var boton = $('tEnviar');
    boton.disabled = true;
    boton.classList.add('cargando');

    /* text/plain a proposito: es un pedido "simple" para el navegador y no
       dispara la consulta previa de CORS, que Apps Script no contesta */
    pedir(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        accion: 'enviar', t: token, nombre: nombre, texto: texto,
        estrellas: estrellas, idioma: lang()
      })
    }, 25000).then(function (d) {
      if (d && d.ok) { mostrar('gracias'); return; }
      var motivo = d && d.error;
      if (motivo === 'usado' || motivo === 'vencido' || motivo === 'invalido') return linkMalo(motivo);
      throw new Error(motivo || 'sin respuesta');
    }).catch(function () {
      avisar(txt('tTxtError'));
    }).then(function () {
      enviando = false;
      boton.disabled = false;
      boton.classList.remove('cargando');
    });
  });
})();
