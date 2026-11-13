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
  /* testimonios por pagina: 6 en pantalla ancha, 3 en el celular (una
     columna: 6 seguidos ocupaban dos pantallas) */
  var celular = window.matchMedia ? window.matchMedia('(max-width: 620px)') : { matches: false };
  function porPagina() { return celular.matches ? 3 : 6; }
  var CORTO = 70;          /* hasta aca, el texto va grande, como cita */

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
    var items = [];          /* como vienen: el mas nuevo primero */
    var orden = 'fecha';     /* fecha | mas | menos */
    var pagina = 0;
    var paginas = 0;
    var vista = $('tVista');
    var pista = $('tLista');
    var puntos = $('tPuntos');

    var fecha = function (iso) {
      var d = new Date(iso);
      if (isNaN(d)) return '';
      try { return new Intl.DateTimeFormat(lang(), { month: 'short', year: 'numeric' }).format(d); }
      catch (e) { return ''; }
    };

    var tarjeta = function (t) {
      var fig = document.createElement('figure');
      fig.className = 'testi__card';

      var est = document.createElement('div');
      est.className = 'testi__stars';
      est.setAttribute('role', 'img');
      est.setAttribute('aria-label', txt('tTxtEstrellas', t.estrellas));
      var dibujo = '';
      for (var s = 1; s <= 5; s++) dibujo += s <= t.estrellas ? ESTRELLA : ESTRELLA.replace('<svg', '<svg class="off"');
      est.innerHTML = dibujo;              /* markup propio, sin nada del visitante */

      /* lo que escribio el cliente va SIEMPRE como texto, nunca como HTML.
         La caja tiene alto fijo: lo corto va grande para llenarla, lo
         largo se corta y se lee entero con "Leer mas". */
      var cita = document.createElement('blockquote');
      var corto = t.texto.length <= CORTO && t.texto.indexOf('\n') < 0;
      cita.className = 'testi__txt' + (corto ? ' testi__txt--corto' : '');
      var parrafo = document.createElement('p');
      parrafo.textContent = t.texto;
      cita.appendChild(parrafo);

      var leer = document.createElement('button');
      leer.type = 'button';
      leer.className = 'testi__leer';
      leer.setAttribute('data-i18n', 't_leer');
      leer.textContent = txt('tTxtLeer');
      leer.addEventListener('click', function () { abrir(t); });

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
      fig.appendChild(leer);
      fig.appendChild(pie);
      return fig;
    };

    /* "Leer mas" aparece solo en las tarjetas cuyo texto no entro. Se
       mide de verdad (no por cantidad de letras): depende del ancho de
       la pantalla y de la tipografia. */
    var marcarLargos = function () {
      var ps = pista.querySelectorAll('.testi__txt p');
      for (var i = 0; i < ps.length; i++) {
        var card = ps[i].closest('.testi__card');
        card.classList.toggle('es-largo', ps[i].scrollHeight > ps[i].clientHeight + 2);
      }
    };

    /* ---- el testimonio entero, en una ventanita ----
       El cursor propio se muda ADENTRO de la ventanita mientras esta
       abierta: un <dialog> se dibuja en la "top layer", por encima de
       cualquier z-index, y el punto quedaria tapado. Es lo mismo que hace
       js/formulario.js (ver ahi la explicacion larga). */
    var mudarCursor = function (adonde) {
      var punto = $('cursor'), halo = $('glow');
      if (punto) adonde.appendChild(punto);
      if (halo) adonde.appendChild(halo);
    };
    var modal = $('tModal');
    var abrir = function (t) {
      if (!modal || !modal.showModal) return;
      var caja = $('tModalCuerpo');
      caja.textContent = '';
      var card = tarjeta(t);
      card.classList.add('testi__card--entera');
      caja.appendChild(card);
      modal.showModal();
      mudarCursor(modal);
      /* el foco a la caja y no a la X: sin esto la X arranca con el aro
         de foco encendido, como si se hubiera tocado */
      modal.querySelector('.modal__caja').focus();
      document.documentElement.classList.add('modal-abierto');
    };
    if (modal) {
      var cerrar = function () { modal.close(); };
      $('tModalX').addEventListener('click', cerrar);
      /* tocar afuera de la caja (el fondo) cierra */
      modal.addEventListener('click', function (e) { if (e.target === modal) cerrar(); });
      modal.addEventListener('close', function () {
        mudarCursor(document.body);
        document.documentElement.classList.remove('modal-abierto');
      });
    }

    /* ------------------------------------------------------------------
       EL CARRUSEL: paginas de 6, la mas nueva primero. Ir a la DERECHA
       es ir hacia atras en el tiempo. Todas las paginas estan armadas una
       al lado de la otra y se corre la pista entera; la caja toma el alto
       de la pagina que se ve, asi una pagina corta no deja un hueco.
       ------------------------------------------------------------------ */
    var ajustarAlto = function () {
      /* SIEMPRE el alto de una pagina completa (la primera lo es), aunque
         la que se ve tenga menos: asi las flechas no suben y bajan */
      var llena = pista.children[0];
      if (llena) vista.style.height = llena.offsetHeight + 'px';
      marcarLargos();
    };

    var irA = function (n) {
      pagina = Math.max(0, Math.min(paginas - 1, n));
      pista.style.transform = 'translateX(' + (-100 * pagina) + '%)';
      for (var i = 0; i < pista.children.length; i++) {
        /* las paginas que no se ven no se recorren con Tab ni se leen */
        pista.children[i].setAttribute('aria-hidden', i === pagina ? 'false' : 'true');
        if ('inert' in pista.children[i]) pista.children[i].inert = i !== pagina;
      }
      for (var k = 0; k < puntos.children.length; k++) {
        puntos.children[k].setAttribute('aria-current', k === pagina ? 'true' : 'false');
      }
      $('tAnt').disabled = pagina === 0;
      $('tSig').disabled = pagina === paginas - 1;
      ajustarAlto();
    };

    var pintar = function () {
      var suma = 0;
      for (var i = 0; i < items.length; i++) suma += items[i].estrellas;
      var prom = suma / items.length;
      var num = window.mlpcNumero ? window.mlpcNumero(prom, 1) : prom.toFixed(1);
      $('tProm').innerHTML = ESTRELLA + num;
      $('tProm').setAttribute('aria-label', txt('tTxtEstrellas', num));
      $('tCant').textContent = items.length === 1 ? txt('tTxtUna') : txt('tTxtVarias', items.length);

      var N = porPagina();
      /* el orden elegido; a igual cantidad de estrellas, el mas nuevo
         primero (sort estable: se respeta el orden de llegada) */
      var vistos = items.slice();
      if (orden !== 'fecha') {
        vistos = vistos.map(function (t, i) { return { t: t, i: i }; })
          .sort(function (a, b) {
            var d = orden === 'mas' ? b.t.estrellas - a.t.estrellas : a.t.estrellas - b.t.estrellas;
            return d || a.i - b.i;
          })
          .map(function (x) { return x.t; });
      }
      paginas = Math.ceil(vistos.length / N);
      pista.textContent = '';
      puntos.textContent = '';
      for (var p = 0; p < paginas; p++) {
        var hoja = document.createElement('div');
        hoja.className = 'testi__pag';
        for (var k = p * N; k < Math.min(vistos.length, (p + 1) * N); k++) {
          hoja.appendChild(tarjeta(vistos[k]));
        }
        pista.appendChild(hoja);

        var punto = document.createElement('button');
        punto.type = 'button';
        punto.className = 'testi__punto';
        punto.setAttribute('aria-label', txt('tTxtPag', p + 1));
        punto.addEventListener('click', irA.bind(null, p));
        puntos.appendChild(punto);
      }
      $('tNav').hidden = paginas < 2;
      irA(pagina);
    };

    /* los tres botones de orden: cambiar el orden vuelve a la pagina 1 */
    var botonesOrden = $('tOrden').querySelectorAll('button');
    for (var b = 0; b < botonesOrden.length; b++) {
      botonesOrden[b].addEventListener('click', function () {
        var nuevo = this.getAttribute('data-orden');
        if (nuevo === orden) return;
        orden = nuevo;
        for (var j = 0; j < botonesOrden.length; j++) {
          botonesOrden[j].setAttribute('aria-pressed', botonesOrden[j] === this ? 'true' : 'false');
        }
        pagina = 0;
        pintar();
        ajustarAlto();
      });
    }

    $('tAnt').addEventListener('click', function () { irA(pagina - 1); });
    $('tSig').addEventListener('click', function () { irA(pagina + 1); });

    /* con el teclado: las flechas, estando adentro del carrusel */
    seccion.addEventListener('keydown', function (e) {
      if (e.target.closest && e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowRight') { irA(pagina + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { irA(pagina - 1); e.preventDefault(); }
    });

    /* Arrastrar de costado cambia de pagina: con el dedo y tambien con el
       click del mouse. La pista sigue al puntero y al soltar decide: si se
       corrio mas de un sexto del ancho (o fue un envion rapido), cambia de
       pagina; si no, vuelve.
       El sentido se decide en los primeros pixeles. Si es vertical, el
       gesto no es del carrusel: con el dedo scrollea el navegador
       (touch-action: pan-y en el CSS) y con el mouse sigue el arrastre de
       la pagina de js/drag.js. Si es horizontal, a js/drag.js se le pide
       que suelte la pagina. */
    var toque = null;
    vista.addEventListener('pointerdown', function (e) {
      if (paginas < 2) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('button')) return;          /* "Leer mas" es un boton */
      toque = { x: e.clientX, y: e.clientY, t: Date.now(), dx: 0, horizontal: null,
                id: e.pointerId, mouse: e.pointerType === 'mouse' };
    });
    vista.addEventListener('pointermove', function (e) {
      if (!toque || e.pointerId !== toque.id) return;
      var dx = e.clientX - toque.x, dy = e.clientY - toque.y;
      if (toque.horizontal === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        toque.horizontal = Math.abs(dx) > Math.abs(dy);
        if (toque.horizontal) {
          pista.classList.add('arrastrando');
          if (toque.mouse) {
            try { document.dispatchEvent(new CustomEvent('mlpc:soltar-pagina')); } catch (err) {}
            document.documentElement.classList.add('dragging');   /* el cursor se achica igual que al arrastrar la pagina */
          }
          try { vista.setPointerCapture(e.pointerId); } catch (err) {}
        }
      }
      if (!toque.horizontal) return;
      /* en los extremos se resiste, para que se note que no hay mas */
      var borde = (pagina === 0 && dx > 0) || (pagina === paginas - 1 && dx < 0);
      toque.dx = borde ? dx / 3 : dx;
      pista.style.transform = 'translateX(calc(' + (-100 * pagina) + '% + ' + toque.dx + 'px))';
    });
    var soltar = function () {
      if (!toque) return;
      var t = toque;
      toque = null;
      pista.classList.remove('arrastrando');
      if (!t.horizontal) return;
      if (t.mouse) {
        document.documentElement.classList.remove('dragging');
        /* fue un arrastre, no un click: que no dispare nada al soltar */
        var matar = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
        window.addEventListener('click', matar, true);
        window.setTimeout(function () { window.removeEventListener('click', matar, true); }, 0);
      }
      var rapido = Math.abs(t.dx) > 30 && Date.now() - t.t < 250;
      if (Math.abs(t.dx) > vista.offsetWidth / 6 || rapido) irA(pagina + (t.dx < 0 ? 1 : -1));
      else irA(pagina);
    };
    vista.addEventListener('pointerup', soltar);
    vista.addEventListener('pointercancel', soltar);
    vista.addEventListener('lostpointercapture', soltar);

    /* el alto de cada pagina depende del ancho (en un celular las
       tarjetas van en una columna): se vuelve a medir al girar o achicar */
    window.addEventListener('resize', ajustarAlto);

    /* al cruzar el ancho de celular cambia cuantos van por pagina: se
       rearma y se queda en la pagina que tiene al primero que se veia */
    var alCambiarAncho = function () {
      if (!items.length) return;
      var primero = pagina * (celular.matches ? 6 : 3);
      pagina = Math.floor(primero / porPagina());
      pintar();
      ajustarAlto();
    };
    if (celular.addEventListener) celular.addEventListener('change', alCambiarAncho);
    else if (celular.addListener) celular.addListener(alCambiarAncho);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarAlto);

    /* el idioma cambia con el selector del header: las fechas y el
       "12 opiniones" estan escritos por aca, asi que se rearman */
    if (window.MutationObserver) {
      new MutationObserver(function () { if (items.length) { pintar(); ajustarAlto(); } })
        .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }

    /* La entrada animada la maneja js/plexus.js para las secciones que
       existen al arrancar. Esta aparece despues (cuando contesta Google),
       asi que se arma aca con las mismas clases. */
    var entrar = function () {
      seccion.hidden = false;
      /* para js/nav.js: ahora existe la seccion, que aparezca su link */
      try { document.dispatchEvent(new CustomEvent('mlpc:secciones')); } catch (e) {}
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
      ajustarAlto();          /* oculta no tenia alto que medir */
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
