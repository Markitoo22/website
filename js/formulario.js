/* ==================================================================
   FORMULARIO DE DIAGNOSTICO

   Antes, tocar un boton de WhatsApp llevaba derecho al chat. El
   problema de eso no es tecnico: de cada diez que tocaban, nueve no
   escribian nunca, y de esos nueve no quedaba ni el nombre. Plata
   gastada en traer gente de la que despues no se sabe nada.

   Ahora el boton abre este formulario corto. Los datos se guardan
   ANTES de saltar a WhatsApp, asi que aunque la persona se arrepienta
   en el camino, el telefono ya quedo anotado y se la puede llamar.

   Y el pixel cambia de idea sobre que es un "Cliente potencial": ya no
   es el que toca un boton, es el que completa esto. Meta deja de
   buscar gente que toquetea y empieza a buscar gente que deja datos.

   ------------------------------------------------------------------
   SI ALGO DE ESTO NO ESTA, LA PAGINA SIGUE ANDANDO

   El dialogo solo se abre si el navegador lo soporta y si este archivo
   cargo. Si no, los botones conservan su href de siempre y llevan a
   WhatsApp igual que antes. Nunca se queda sin camino.
   ================================================================== */
(function () {
  'use strict';

  var modal = document.getElementById('modal');
  var form = document.getElementById('form');
  /* sin <dialog> no hay formulario: los botones siguen siendo links */
  if (!modal || !form || typeof modal.showModal !== 'function') return;

  var campos = {
    nombre: document.getElementById('fNombre'),
    tel: document.getElementById('fTel'),
    ok: document.getElementById('fOk')
  };
  /* el tipo de PC son dos etiquetas (radios); el problema, un desplegable */
  var grupos = { pc: document.getElementById('grupoPc') };
  var campoProb = document.getElementById('campoProb');
  var pais = document.getElementById('fPais');          /* input oculto: el valor */
  var paisLista = document.getElementById('fPaisLista');
  var ecoTel = document.getElementById('fTelEco');
  var error = document.getElementById('fError');
  var plantilla = document.getElementById('fPlantilla');

  /* De donde salio: el numero lo pone el propio boton, no este archivo.
     Asi sigue habiendo un solo lugar con el telefono. */
  var base = '';
  var origen = 'otro';

  /* cuanto se espera antes de dar por perdido el salto a WhatsApp */
  var ESPERA_SALTO = 15000;

  /* ------------------------------------------------------------------
     EL CURSOR PROPIO Y LA TOP LAYER

     Un <dialog> abierto con showModal() se dibuja en la "top layer", una
     capa que esta por encima de TODO el z-index de la pagina: no hay
     numero que le gane. El punto que dibujamos en vez del cursor del
     sistema quedaria atras y, como el cursor de verdad esta apagado, la
     persona no veria nada con que apuntar.

     La unica forma de que se vea es que este ADENTRO del dialogo.
     Mudarlo no rompe nada: es position fixed, asi que sus coordenadas
     siguen siendo las de la ventana, y js/plexus.js lo mueve por
     referencia al elemento, no por donde cuelga.
     ------------------------------------------------------------------ */
  var punto = document.getElementById('cursor');
  var halo = document.getElementById('glow');

  function mudarCursor(adonde) {
    if (punto) adonde.appendChild(punto);
    if (halo) adonde.appendChild(halo);
  }

  /* ---------------- abrir y cerrar ---------------- */

  function abrir() {
    marcar(null);
    prepararTel();
    modal.showModal();
    mudarCursor(modal);
    document.documentElement.classList.add('modal-abierto');
    /* En escritorio se enfoca el primer campo, que es lo comodo. En el
       telefono NO: enfocar un campo abre el teclado y tapa media
       pantalla antes de que la persona lea de que se trata. Ahi se
       enfoca la caja, que no es un control y no dibuja el aro. */
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      campos.nombre.focus();
    } else {
      form.focus();
    }
  }

  function cerrar() {
    mudarCursor(document.body);
    document.documentElement.classList.remove('modal-abierto');
  }

  modal.addEventListener('close', cerrar);
  modal.addEventListener('cancel', cerrar);          /* la tecla Escape */

  var equis = document.getElementById('fCerrar');
  if (equis) equis.addEventListener('click', function () { modal.close(); });

  /* tocar afuera de la caja tambien cierra */
  modal.addEventListener('click', function (e) {
    if (e.target === modal) modal.close();
  });

  /* El listener va en document y burbujeando, igual que el del pixel:
     js/drag.js mata el click cuando el puntero se movio mas de 6 px. */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[data-wa]');
    if (!a) return;
    var href = (a.getAttribute('href') || '').trim();
    if (!href) return;                    /* sin link, que siga su curso */

    e.preventDefault();
    base = href.split('?')[0];
    origen = a.getAttribute('data-wa') || 'otro';
    abrir();
  });

  /* ------------------------------------------------------------------
     EL TELEFONO

     Es el campo donde mas gente se cae, y no por distraida: en Argentina
     nadie sabe si va 11, 011, 15, +54, 54 9... Cada uno lo tiene
     agendado distinto y todos creen que el suyo esta mal.

     La salida no es explicarlo mejor, es no preguntarlo: se acepta lo
     que sea que escriba y se normaliza, y despues se le muestra el
     numero entero ya armado para que vea que se entendio.

     El pais arranca en el que dice la IP pero SE PUEDE CAMBIAR: un
     colombiano de visita en Argentina tiene numero de Colombia, y con un
     prefijo fijo se quedaba sin poder escribir el suyo.
     ------------------------------------------------------------------ */
  function codigo() { return pais ? pais.value : '54'; }
  function esAR() { return codigo() === '54'; }

  /* Deja los 10 digitos reales (area + abonado), venga como venga. */
  function telArgentino(crudo) {
    var d = String(crudo).replace(/\D/g, '');
    if (d.indexOf('54') === 0 && d.length > 10) d = d.slice(2);   /* +54        */
    if (d.indexOf('9') === 0 && d.length > 10) d = d.slice(1);    /* el 9 movil */
    if (d.indexOf('0') === 0) d = d.slice(1);                     /* 011...     */
    /* el 15 va pegado despues del area, que puede ser de 2 a 4 digitos */
    if (d.length > 10) {
      for (var a = 2; a <= 4; a++) {
        if (d.slice(a, a + 2) === '15' && d.length - 2 === 10) {
          d = d.slice(0, a) + d.slice(a + 2);
          break;
        }
      }
    }
    return d.slice(0, 10);
  }

  function telDigitos(crudo) {
    if (esAR()) return telArgentino(crudo);
    var cod = codigo();
    var d = String(crudo).replace(/\D/g, '');
    if (d.indexOf('00') === 0) d = d.slice(2);                    /* salida internacional */
    /* si repitio el codigo de pais que ya eligio arriba, sobra */
    if (d.indexOf(cod) === 0 && d.length > cod.length + 5) d = d.slice(cod.length);
    if (d.indexOf('0') === 0) d = d.slice(1);                     /* el 0 nacional */
    return d.slice(0, 15);
  }

  /* completo y listo para marcar: 5491155870867 */
  function telCompleto(d) { return esAR() ? '549' + d : codigo() + d; }

  /* como se lee: +54 9 11 5587-0867 */
  function telBonito(d) {
    if (!esAR()) return '+' + codigo() + ' ' + d;
    var resto = d.length === 10 && d.indexOf('11') === 0
      ? d.slice(0, 2) + ' ' + d.slice(2, 6) + '-' + d.slice(6)
      : d;
    return '+54 9 ' + resto;
  }

  function telListo(d) { return esAR() ? d.length === 10 : d.length >= 6; }

  /* El eco: mientras falta, cuenta cuanto; cuando esta, lo repite entero.
     Es lo que saca la duda de encima. */
  function pintarTel() {
    var d = telDigitos(campos.tel.value);
    if (campos.tel.value !== d) campos.tel.value = d;   /* solo digitos */
    if (!ecoTel) return;
    if (!d) { ecoTel.textContent = ''; ecoTel.className = 'eco'; return; }
    if (telListo(d)) {
      ecoTel.textContent = leyenda('f_tel_eco') + ' ' + telBonito(d);
      ecoTel.className = 'eco eco--ok';
    } else {
      ecoTel.textContent = esAR() ? d.length + ' / 10' : leyenda('f_tel_falta');
      ecoTel.className = 'eco';
    }
  }

  /* Los textos ya traducidos viven en el DOM; se leen de ahi para no
     tener que exponer el diccionario. */
  function leyenda(clave) {
    var e = document.querySelector('[data-i18n="' + clave + '"]');
    return e ? e.textContent.trim() : '';
  }

  /* El pais que dijo la IP queda elegido de entrada. Si no se supo, o no
     esta en la lista, queda Argentina, que es de donde viene casi todo. */
  function prepararTel() {
    if (pais && !pais.dataset.listo) {
      var cc = window.mlpcPais || (window.mlpcEsAR ? 'AR' : '');
      var op = paisLista && paisLista.querySelector('[data-pais="' + cc + '"]');
      if (op && comboPais) comboPais.elegir(op, false);
      pais.dataset.listo = '1';        /* si despues lo cambia, se respeta */
    }
    pintarTel();
  }

  campos.tel.addEventListener('input', pintarTel);

  /* ------------------------------------------------------------------
     LOS DESPLEGABLES, HECHOS ACA

     Ni el codigo de pais ni el problema usan <select>. Un desplegable
     nativo abre una ventana del SISTEMA, fuera de la pagina: ahi el
     cursor propio no puede seguir al mouse ni dibujarse encima, porque
     ningun z-index alcanza a otra ventana del sistema operativo. Siendo
     una lista comun no hay nada de eso, se ve con el estilo del sitio, y
     se puede tipear para saltar en vez de scrolear.

     La lista va en position fixed y ubicada a mano porque la caja del
     formulario tiene scroll propio, y ahi adentro quedaria recortada.

     Un solo armador para los dos: el valor elegido vive en un <input
     hidden> con el id base, asi el resto del codigo lo lee como a
     cualquier campo.
     ------------------------------------------------------------------ */
  var combos = [];

  function nuevoCombo(base, alElegir) {
    var btn = document.getElementById(base + 'Btn');
    var texto = document.getElementById(base + 'Texto');
    var lista = document.getElementById(base + 'Lista');
    var valor = document.getElementById(base);
    if (!btn || !texto || !lista || !valor) return null;

    var scroll = lista.querySelector('.combo__scroll');
    var barra = lista.querySelector('.combo__barra');
    var pulgar = barra && barra.querySelector('i');
    var opciones = lista.querySelectorAll('.combo__op');
    var yo = {};

    function elegir(op, avisar) {
      for (var i = 0; i < opciones.length; i++) {
        opciones[i].setAttribute('aria-selected', opciones[i] === op ? 'true' : 'false');
      }
      valor.value = op.getAttribute('data-cod');
      /* se copia el contenido, no el texto: adentro puede ir una bandera.
         El markup es nuestro y generado, no entra nada de afuera. */
      texto.innerHTML = op.innerHTML;
      /* desde que eligio, el texto es suyo: que el multiidioma no se lo
         pise con el "elegi una opcion" si cambia de idioma despues */
      texto.removeAttribute('data-i18n');
      if (avisar !== false && alElegir) alElegir();
    }

    function abierta() { return !lista.hidden; }

    /* ----------------------------------------------------------------
       LA BARRA, DIBUJADA Y ARRASTRADA POR NOSOTROS

       La nativa la maneja el compositor del navegador: mientras la
       arrastras la pagina no recibe pointermove y el cursor propio se
       queda clavado. Sacarla y listo tampoco iba: el que tiene la rueda
       rota se quedaba sin forma de llegar al final de 47 paises.

       Esta es un div. Los eventos son nuestros, asi que el cursor sigue
       andando mientras se arrastra, y se puede arrastrar como siempre.
       ---------------------------------------------------------------- */
    function pintarBarra() {
      if (!scroll || !barra || !pulgar) return;
      var visible = scroll.clientHeight;
      var total = scroll.scrollHeight;
      if (total <= visible + 1) { barra.classList.remove('hay'); return; }
      barra.classList.add('hay');
      var alto = Math.max(28, Math.round(visible * visible / total));
      var libre = visible - alto;
      var avance = scroll.scrollTop / (total - visible);
      pulgar.style.height = alto + 'px';
      pulgar.style.top = Math.round(libre * avance) + 'px';
    }

    if (scroll) scroll.addEventListener('scroll', pintarBarra, { passive: true });

    if (pulgar) {
      var arrastre = null;
      function soltar() {
        arrastre = null;
        barra.classList.remove('agarrada');
      }
      pulgar.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        arrastre = {
          y: e.clientY,
          desde: scroll.scrollTop,
          /* cuanto avanza el contenido por cada pixel del pulgar: la
             proporcion entre lo que le sobra a cada uno */
          razon: (scroll.scrollHeight - scroll.clientHeight) /
                 (scroll.clientHeight - pulgar.offsetHeight)
        };
        barra.classList.add('agarrada');
        try { pulgar.setPointerCapture(e.pointerId); } catch (err) { /* da igual */ }
      });
      pulgar.addEventListener('pointermove', function (e) {
        if (!arrastre) return;
        scroll.scrollTop = arrastre.desde + (e.clientY - arrastre.y) * arrastre.razon;
      });
      pulgar.addEventListener('pointerup', soltar);
      pulgar.addEventListener('pointercancel', soltar);
    }

    /* tocar el riel salta a esa altura */
    if (barra && scroll) {
      barra.addEventListener('pointerdown', function (e) {
        if (e.target !== barra) return;
        var r = barra.getBoundingClientRect();
        var donde = (e.clientY - r.top) / r.height;
        scroll.scrollTop = donde * (scroll.scrollHeight - scroll.clientHeight);
      });
    }

    function ubicar() {
      var r = btn.getBoundingClientRect();
      var abajo = window.innerHeight - r.bottom - 16;
      lista.style.left = r.left + 'px';
      lista.style.width = Math.max(r.width, 130) + 'px';
      /* si abajo no entra, se abre para arriba */
      if (abajo < 140 && r.top > 160) {
        lista.style.top = 'auto';
        lista.style.bottom = (window.innerHeight - r.top + 4) + 'px';
        lista.style.maxHeight = Math.min(300, r.top - 16) + 'px';
        if (scroll) scroll.style.maxHeight = lista.style.maxHeight;
      } else {
        lista.style.bottom = 'auto';
        lista.style.top = (r.bottom + 4) + 'px';
        lista.style.maxHeight = Math.max(140, Math.min(300, abajo)) + 'px';
        if (scroll) scroll.style.maxHeight = lista.style.maxHeight;
      }
    }

    function abrir() {
      cerrarTodos(yo);
      lista.hidden = false;
      ubicar();
      btn.setAttribute('aria-expanded', 'true');
      var sel = lista.querySelector('[aria-selected="true"]') || opciones[0];
      if (sel) { sel.focus(); sel.scrollIntoView({ block: 'center' }); }
      pintarBarra();
    }

    function cerrar(devolverFoco) {
      if (!abierta()) return;
      lista.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      if (devolverFoco !== false) btn.focus();
    }

    btn.addEventListener('click', function () {
      if (abierta()) cerrar(); else abrir();
    });

    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        abrir();
      }
    });

    for (var k = 0; k < opciones.length; k++) {
      opciones[k].addEventListener('click', function () {
        elegir(this, true);
        cerrar();
      });
    }

    /* teclado: flechas para moverse, letras para saltar, Escape para salir */
    lista.addEventListener('keydown', function (e) {
      var todas = Array.prototype.slice.call(opciones);
      var i = todas.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var j = i + (e.key === 'ArrowDown' ? 1 : -1);
        if (j < 0) j = todas.length - 1;
        if (j >= todas.length) j = 0;
        todas[j].focus();
        todas[j].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        var f = e.key === 'Home' ? todas[0] : todas[todas.length - 1];
        f.focus(); f.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (i > -1) { elegir(todas[i], true); cerrar(); }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cerrar();
      } else if (e.key === 'Tab') {
        cerrar(false);
      } else if (e.key.length === 1) {
        /* tipear salta: "co" -> Colombia, "t" -> Tarda mucho en arrancar */
        var letra = e.key.toUpperCase();
        for (var n = 1; n <= todas.length; n++) {
          var c = todas[(Math.max(i, 0) + n) % todas.length];
          var pista = c.getAttribute('data-pais') || c.textContent.trim();
          if (pista.charAt(0).toUpperCase() === letra) {
            c.focus(); c.scrollIntoView({ block: 'nearest' });
            break;
          }
        }
      }
    });

    yo.elegir = elegir;
    yo.cerrar = cerrar;
    yo.abierta = abierta;
    yo.lista = lista;
    yo.scroll = scroll;
    yo.opciones = opciones;
    combos.push(yo);
    return yo;
  }

  function cerrarTodos(menos) {
    for (var i = 0; i < combos.length; i++) {
      if (combos[i] !== menos) combos[i].cerrar(false);
    }
  }

  var comboPais = nuevoCombo('fPais', pintarTel);
  var comboProb = nuevoCombo('fProb', function () {
    if (error && !error.hidden) marcar(null);
  });

  /* tocar afuera cierra; scrollear la caja del formulario tambien, que es
     mas honesto que perseguir al boton con la lista. El scroll DE la
     lista no cuenta: el listener esta en captura y agarra los dos. */
  document.addEventListener('pointerdown', function (e) {
    if (!e.target.closest || !e.target.closest('.combo')) cerrarTodos(null);
  }, true);
  window.addEventListener('resize', function () { cerrarTodos(null); });
  if (modal) {
    modal.addEventListener('scroll', function (e) {
      for (var i = 0; i < combos.length; i++) {
        /* el scroll DE la lista no la cierra; el de la caja del
           formulario si, porque el boton se movio */
        if (e.target !== combos[i].scroll) combos[i].cerrar(false);
      }
    }, true);
  }

  /* ---------------- validacion ---------------- */

  /* caja = lo que se pinta de rojo; foco = a donde se manda al visitante */
  function marcar(caja, foco) {
    var todas = form.querySelectorAll('.campo, .acuerdo');
    for (var i = 0; i < todas.length; i++) todas[i].classList.remove('mal');
    if (error) error.hidden = true;
    if (!caja) return;

    caja.classList.add('mal');
    if (error) error.hidden = false;
    if (foco) { try { foco.focus(); } catch (e) { /* da igual */ } }
  }

  function elegido(nombre) {
    return form.querySelector('input[name="' + nombre + '"]:checked');
  }

  /* el texto de la etiqueta elegida, ya en el idioma del visitante */
  function textoDe(radio) {
    if (!radio) return '';
    var lab = radio.closest('label');
    return lab ? lab.textContent.trim() : '';
  }

  /* Solo se exige que esten completos. No se valida el formato del
     telefono: cada pais escribe el suyo distinto y rechazar un numero
     bueno cuesta mucho mas caro que recibir uno mal escrito. */
  function leer() {
    var pc = elegido('pc');
    var prob = document.getElementById('fProb');
    var opProb = prob.value && document.querySelector('#fProbLista [data-cod="' + prob.value + '"]');
    var digitos = telDigitos(campos.tel.value);
    var d = {
      nombre: campos.nombre.value.trim(),
      /* lo que se guarda es el numero completo y marcable, no lo tipeado */
      tel: telCompleto(digitos),
      pcTexto: textoDe(pc),
      probTexto: opProb ? opProb.textContent.trim() : ''
    };
    if (!d.nombre) return marcar(campos.nombre.closest('.campo'), campos.nombre);
    if (!telListo(digitos)) return marcar(campos.tel.closest('.campo'), campos.tel);
    if (!pc) return marcar(grupos.pc, grupos.pc.querySelector('input'));
    if (!opProb) return marcar(campoProb, document.getElementById('fProbBtn'));
    if (!campos.ok.checked) return marcar(campos.ok.closest('.acuerdo'), campos.ok);
    marcar(null);
    return d;
  }

  /* ---------------- el mensaje de WhatsApp ---------------- */

  /* La plantilla sale del diccionario, ya en el idioma del visitante:
     esta en un elemento oculto para no exponer el diccionario entero. */
  function mensaje(d) {
    var base = (plantilla && plantilla.textContent) ||
               'Hola! Soy {nombre}. Quiero el diagnostico gratis para mi {pc}: {problema}.';
    /* el tipo de PC y el problema van en minuscula: en las etiquetas
       estan capitalizados ("PC de escritorio") y en medio de la frase
       quedaban como gritos. El dato que se guarda no se toca. */
    return base.split('{nombre}').join(d.nombre)
               .split('{pc}').join(d.pcTexto.toLowerCase())
               .split('{problema}').join(d.probTexto.toLowerCase());
  }

  /* ------------------------------------------------------------------
     GUARDAR EL DATO

     Se manda con un <form> de verdad apuntando a un iframe oculto. Es el
     metodo mas viejo que existe y es el unico que el navegador no puede
     descartar: es una navegacion comun del iframe.

     Antes iba con sendBeacon y SE PERDIAN ENVIOS. sendBeacon esta hecho
     para disparar y olvidarse mientras la pagina se va, y el navegador
     tiene derecho a tirarlo a la basura si esta ocupado o si la pagina
     navega en el mismo instante — que es exactamente lo que hacemos al
     saltar a WhatsApp. Andaba en unas maquinas y en otras no.

     Ademas ahora se ESPERA a que el envio salga antes de ir a WhatsApp.
     Son unas decimas que nadie nota y son la diferencia entre tener el
     telefono de la persona o no tenerlo.
     ------------------------------------------------------------------ */
  function guardar(d, seguir) {
    var c = window.MLPC_FORM || {};
    var marco = document.getElementById('buzon');

    /* sin configurar o sin iframe: no se guarda, pero el contacto sigue */
    if (!c.url || !c.nombre || !marco) { seguir(); return; }

    var f = document.createElement('form');
    f.method = 'POST';
    f.action = c.url;
    f.target = 'buzon';
    f.style.display = 'none';

    function campo(nombre, valor) {
      if (!nombre) return;
      var i = document.createElement('input');
      i.type = 'hidden';
      i.name = nombre;
      i.value = valor;
      f.appendChild(i);
    }
    campo(c.nombre, d.nombre);
    campo(c.tel, d.tel);
    campo(c.pc, d.pcTexto);
    campo(c.problema, d.probTexto);
    campo(c.idioma, (document.documentElement.lang || '') + ' / ' + origen);

    /* Se sigue cuando el iframe termino de cargar la respuesta de Google,
       o al toque si tarda demasiado: nunca se deja a la persona esperando
       por algo que es asunto nuestro y no de ella. */
    var siguio = false;
    function unaVez() {
      if (siguio) return;
      siguio = true;
      marco.removeEventListener('load', unaVez);
      seguir();
    }
    marco.addEventListener('load', unaVez);
    window.setTimeout(unaVez, 1500);

    try {
      document.body.appendChild(f);
      f.submit();
      document.body.removeChild(f);
    } catch (e) {
      unaVez();
    }
  }

  /* ---------------- enviar ---------------- */

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var d = leer();
    if (!d) return;                      /* falta algo: ya quedo marcado */

    /* ACA se cuenta el Cliente potencial, y en ningun otro lado: el que
       llego hasta aca dejo nombre y telefono. */
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Lead', {
        content_name: origen,
        content_category: document.documentElement.lang || ''
      });
    }

    /* ----------------------------------------------------------------
       SOLO SE GUARDA AL QUE NO LLEGO

       Si la persona llega a WhatsApp, ya esta en contacto: anotarla
       seria ruido, y que le escriban despues, raro. Lo que sirve es la
       otra lista: los que completaron el formulario y se quedaron en el
       camino — por el cartel del navegador de Instagram, porque no
       tienen WhatsApp instalado, o porque algo fallo.

       Como se distingue: al saltar a WhatsApp la pagina pasa a segundo
       plano (la app se pone adelante) o directamente se va. Si a los 15
       segundos seguimos aca Y a la vista, no llego.

       Los 15 segundos son para que no cuente como perdido el que se
       queda leyendo el cartel de Facebook antes de aceptar. Si tarda
       mas que eso, se manda igual: es preferible una consulta de mas a
       un cliente perdido.
       ---------------------------------------------------------------- */
    var llego = false;
    function seFue() { llego = true; }
    /* Solo visibilitychange y pagehide. NO blur: la ventana pierde el
       foco por mil motivos (el propio cartel de Facebook, tocar la barra
       del navegador) y ahi daríamos por llegado a alguien que no llego.
       Un falso negativo es un cliente perdido; un falso positivo es una
       consulta de mas. */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) seFue();
    });
    window.addEventListener('pagehide', seFue);

    window.setTimeout(function () {
      if (llego || document.hidden) return;     /* esta en WhatsApp: nada que hacer */
      guardar(d, function () {});
    }, ESPERA_SALTO);

    if (base) window.location.href = base + '?text=' + encodeURIComponent(mensaje(d));
  });

  /* al corregir, se apaga la marca de error */
  form.addEventListener('input', function () {
    if (error && !error.hidden) marcar(null);
  });
})();
