/* ==================================================================
   TESTIMONIOS — el pedacito de servidor que el sitio no tiene

   El sitio es estatico (GitHub Pages) y un link "de un solo uso" exige
   que ALGUIEN recuerde cuales ya se usaron. Ese alguien es este script,
   que vive pegado a una Google Sheet de la cuenta del dueño:

     hoja "Links"        un renglon por link generado: para quien, cuando
                         vence, y cuando se uso (vacio = sin usar)
     hoja "Testimonios"  un renglon por testimonio recibido. La columna
                         "Mostrar" es una casilla: destildarla lo saca del
                         sitio al instante, sin borrar nada.

   Que hace:
     GET  ?accion=lista          los testimonios visibles (lo lee el sitio)
     GET  ?accion=link&t=XXXX    si ese link sirve todavia (lo lee el
                                 formulario ANTES de que la persona escriba)
     POST {accion:'enviar', ...} guarda un testimonio y quema el link
     POST {accion:'crear', clave, para}   genera un link nuevo (Editor.exe)
     POST {accion:'links', clave}         los ultimos links y su estado
     POST {accion:'turno', clave, tel}    avisa a Meta que esa persona
                                          agendo turno (evento Schedule)

   Crear y listar links pide la CLAVE, que vive en las propiedades del
   script (nunca en el codigo ni en el repo) y la conoce solo el editor.

   Como se instala: README.md, seccion "Testimonios".
   Este archivo se versiona en el repo solo para tenerlo a mano: NO tiene
   secretos. Lo que corre es la copia pegada en Apps Script.
   ================================================================== */

/* EL ID DE LA PLANILLA. Vacio si el script se creo desde la planilla
   (Extensiones -> Apps Script). Si se creo aparte, en script.google.com,
   va el pedazo de la direccion de la planilla que esta entre /d/ y /edit:
   docs.google.com/spreadsheets/d/ ESTO_DE_ACA /edit */
var ID_PLANILLA = '';

var HOJA_T = 'Testimonios';
var HOJA_L = 'Links';
var DIAS_LINK = 7;            /* cuanto dura un link sin usar */
var MAX_NOMBRE = 40;
var MIN_TEXTO = 10;
var MAX_TEXTO = 500;
var CACHE_SEG = 300;          /* la lista se guarda 5 min en memoria */

/* META: el pixel del sitio (el mismo de index.html) y la version de la
   API. El TOKEN no va aca: va en Configuracion del proyecto -> Propiedades
   del script, con el nombre META_TOKEN (ver README, "Turno agendado").
   META_PRUEBA, opcional: el codigo de "Probar eventos" de Events Manager,
   para ver los eventos llegar sin que cuenten. Borrarlo al terminar. */
var PIXEL_ID = '1124671366336545';
var META_API = 'v26.0';
var HOJA_TURNOS = 'Turnos';

/* ------------------------------------------------------------------
   UNA SOLA VEZ: elegir esta funcion arriba y apretar "Ejecutar".
   Arma las dos hojas y genera la clave del editor. Correrla de nuevo
   no rompe nada y vuelve a mostrar la misma clave.
   ------------------------------------------------------------------ */
function configurar() {
  var libro = libro_();

  var t = libro.getSheetByName(HOJA_T) || libro.insertSheet(HOJA_T);
  if (t.getLastRow() === 0) {
    t.appendRow(['Fecha', 'Nombre', 'Estrellas', 'Testimonio', 'Mostrar', 'Idioma', 'Link']);
    t.setFrozenRows(1);
    t.getRange('A1:G1').setFontWeight('bold');
    t.setColumnWidth(4, 420);
  }

  var l = libro.getSheetByName(HOJA_L) || libro.insertSheet(HOJA_L);
  if (l.getLastRow() === 0) {
    l.appendRow(['Link', 'Para', 'Creado', 'Vence', 'Usado']);
    l.setFrozenRows(1);
    l.getRange('A1:E1').setFontWeight('bold');
  }

  var props = PropertiesService.getScriptProperties();
  var clave = props.getProperty('CLAVE');
  if (!clave) {
    clave = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('CLAVE', clave);
  }

  /* Un script creado aparte no recibe solo el aviso de que se edito la
     planilla: hay que pedirlo. Se crea una vez sola. */
  if (ID_PLANILLA && !ScriptApp.getProjectTriggers().some(function (g) {
        return g.getHandlerFunction() === 'onEdit'; })) {
    ScriptApp.newTrigger('onEdit').forSpreadsheet(libro).onEdit().create();
  }

  /* va al registro de ejecucion: de ahi se copia para pegarla en el editor */
  Logger.log('CLAVE PARA EL EDITOR (copiala entera):\n\n' + clave + '\n');
  return clave;
}

/* ------------------------------------------------------------------
   Entradas
   ------------------------------------------------------------------ */

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.accion === 'link') return json(estadoLink(p.t));
    return json(lista());
  } catch (err) {
    return json({ ok: false, error: 'servidor' });
  }
}

function doPost(e) {
  var d;
  try {
    d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json({ ok: false, error: 'datos' });
  }
  try {
    if (d.accion === 'enviar') return json(enviar(d));
    if (d.accion === 'crear') return json(crear(d));
    if (d.accion === 'links') return json(links(d));
    if (d.accion === 'turno') return json(turno(d));
    return json({ ok: false, error: 'accion' });
  } catch (err) {
    return json({ ok: false, error: 'servidor' });
  }
}

/* Al destildar "Mostrar" o corregir un texto en la planilla, el sitio
   tiene que verlo ya, no dentro de 5 minutos. (Borrar un renglon entero
   no dispara esto: ese cambio tarda hasta 5 minutos en verse.) */
function onEdit() {
  CacheService.getScriptCache().remove('lista');
}

/* ------------------------------------------------------------------
   Lo publico
   ------------------------------------------------------------------ */

function lista() {
  var cache = CacheService.getScriptCache();
  var guardada = cache.get('lista');
  if (guardada) return JSON.parse(guardada);

  var hoja = hoja_(HOJA_T);
  var filas = hoja.getLastRow() > 1
    ? hoja.getRange(2, 1, hoja.getLastRow() - 1, 6).getValues()
    : [];

  var items = [];
  for (var i = 0; i < filas.length; i++) {
    var f = filas[i];
    if (f[4] !== true) continue;                       /* Mostrar destildado */
    var estrellas = Math.round(Number(f[2]));
    var texto = String(f[3] || '').trim();
    if (!texto || !(estrellas >= 1 && estrellas <= 5)) continue;
    items.push({
      nombre: String(f[1] || '').trim(),
      estrellas: estrellas,
      texto: texto,
      fecha: f[0] instanceof Date ? f[0].toISOString() : '',
      idioma: String(f[5] || '')
    });
  }
  items.sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });   /* nuevos primero */

  var r = { ok: true, items: items };
  try { cache.put('lista', JSON.stringify(r), CACHE_SEG); } catch (err) {}   /* >100 KB no entra: se lee siempre */
  return r;
}

function estadoLink(token) {
  var l = buscarLink_(token);
  if (!l) return { ok: false, error: 'invalido' };
  if (l.usado) return { ok: false, error: 'usado' };
  if (l.vence < new Date()) return { ok: false, error: 'vencido' };
  return { ok: true, para: l.para };
}

function enviar(d) {
  var nombre = limpio_(d.nombre).slice(0, MAX_NOMBRE);
  var texto = limpio_(d.texto, true);
  var estrellas = Number(d.estrellas);
  var idioma = String(d.idioma || '').slice(0, 5);

  if (!nombre || texto.length < MIN_TEXTO || texto.length > MAX_TEXTO ||
      !(estrellas >= 1 && estrellas <= 5) || Math.round(estrellas) !== estrellas) {
    return { ok: false, error: 'datos' };
  }

  /* Con candado: dos envios simultaneos con el mismo link (doble toque,
     dos pestañas) no pueden pasar los dos el control de "sin usar". */
  var candado = LockService.getScriptLock();
  candado.waitLock(15000);
  try {
    var l = buscarLink_(d.t);
    if (!l) return { ok: false, error: 'invalido' };
    if (l.usado) return { ok: false, error: 'usado' };
    if (l.vence < new Date()) return { ok: false, error: 'vencido' };

    var ahora = new Date();
    hoja_(HOJA_L).getRange(l.fila, 5).setValue(ahora);
    var t = hoja_(HOJA_T);
    t.appendRow([ahora, texto_(nombre), estrellas, texto_(texto), true, texto_(idioma), texto_(l.token)]);
    t.getRange(t.getLastRow(), 5).insertCheckboxes().setValue(true);
    SpreadsheetApp.flush();
  } finally {
    candado.releaseLock();
  }

  CacheService.getScriptCache().remove('lista');
  return { ok: true };
}

/* ------------------------------------------------------------------
   Lo del editor (pide la clave)
   ------------------------------------------------------------------ */

function crear(d) {
  if (!claveOk_(d.clave)) return { ok: false, error: 'clave' };
  var token = Utilities.getUuid().replace(/-/g, '');
  var ahora = new Date();
  var vence = new Date(ahora.getTime() + DIAS_LINK * 864e5);
  var para = limpio_(d.para).slice(0, MAX_NOMBRE);
  /* el token tambien como texto: uno hecho solo de cifras, o con forma
     de "12e45", la planilla lo convertiria en numero y no se encontraria */
  hoja_(HOJA_L).appendRow([texto_(token), texto_(para), ahora, vence, '']);
  return { ok: true, token: token, vence: vence.toISOString(), dias: DIAS_LINK };
}

function links(d) {
  if (!claveOk_(d.clave)) return { ok: false, error: 'clave' };
  var hoja = hoja_(HOJA_L);
  var n = Math.min(hoja.getLastRow() - 1, 8);
  if (n <= 0) return { ok: true, links: [] };
  var filas = hoja.getRange(hoja.getLastRow() - n + 1, 1, n, 5).getValues();
  var ahora = new Date();
  var r = [];
  for (var i = filas.length - 1; i >= 0; i--) {
    var f = filas[i];
    r.push({
      para: String(f[1] || ''),
      creado: f[2] instanceof Date ? f[2].toISOString() : '',
      estado: f[4] ? 'usado' : (f[3] instanceof Date && f[3] < ahora ? 'vencido' : 'pendiente')
    });
  }
  return { ok: true, links: r };
}

/* ------------------------------------------------------------------
   Auxiliares
   ------------------------------------------------------------------ */

/* ------------------------------------------------------------------
   TURNO AGENDADO -> evento Schedule a Meta (API de Conversiones)

   El turno se arregla por WhatsApp, fuera de la pagina, asi que el
   pixel no se entera. Lo avisa el dueño desde Editor.exe con el
   telefono del cliente, y Meta lo cruza con la persona que vio el
   anuncio. El telefono viaja CIFRADO (SHA-256), como pide Meta: nunca
   sale de aca en claro.
   ------------------------------------------------------------------ */
function turno(d) {
  if (!claveOk_(d.clave)) return { ok: false, error: 'clave' };
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('META_TOKEN');
  if (!token) return { ok: false, error: 'meta_token' };

  var tel = String(d.tel || '').replace(/\D/g, '').replace(/^00/, '');
  if (tel.length < 10 || tel.length > 15 || tel.charAt(0) === '0') return { ok: false, error: 'tel' };

  /* Argentina: el mismo celular figura con el 9 (+54 9 11...) o sin el
     (+54 11...) segun donde se haya cargado. Se mandan las dos formas
     y Meta usa la que coincida. */
  var formas = [tel];
  if (/^549\d{10}$/.test(tel)) formas.push('54' + tel.slice(3));
  else if (/^54\d{10}$/.test(tel)) formas.push('549' + tel.slice(2));

  var evento = {
    event_name: 'Schedule',
    event_time: Math.floor(Date.now() / 1000),
    event_id: Utilities.getUuid(),
    action_source: 'chat',
    user_data: { ph: formas.map(sha256_) }
  };
  var cuerpo = { data: [evento] };
  var prueba = props.getProperty('META_PRUEBA');
  if (prueba) cuerpo.test_event_code = prueba;

  var r = UrlFetchApp.fetch(
    'https://graph.facebook.com/' + META_API + '/' + PIXEL_ID + '/events?access_token=' + encodeURIComponent(token),
    { method: 'post', contentType: 'application/json', payload: JSON.stringify(cuerpo), muteHttpExceptions: true });
  var codigo = r.getResponseCode();
  var resp = {};
  try { resp = JSON.parse(r.getContentText()); } catch (e) {}

  var ok = codigo === 200 && resp.events_received === 1;
  var detalle = ok ? 'recibido' + (prueba ? ' (prueba)' : '')
                   : ((resp.error && resp.error.message) || ('Meta respondio ' + codigo));

  /* registro para el dueño: cuando, a quien (solo los ultimos 4
     numeros) y que contesto Meta */
  var libro = libro_();
  var h = libro.getSheetByName(HOJA_TURNOS);
  if (!h) {
    h = libro.insertSheet(HOJA_TURNOS);
    h.appendRow(['Fecha', 'Telefono', 'Meta']);
    h.setFrozenRows(1);
    h.getRange('A1:C1').setFontWeight('bold');
  }
  h.appendRow([new Date(), texto_('...' + tel.slice(-4)), texto_(detalle)]);

  return ok ? { ok: true, prueba: !!prueba } : { ok: false, error: 'meta', detalle: detalle };
}

function sha256_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

function libro_() {
  return ID_PLANILLA ? SpreadsheetApp.openById(ID_PLANILLA)
                     : SpreadsheetApp.getActiveSpreadsheet();
}

function hoja_(nombre) {
  var h = libro_().getSheetByName(nombre);
  if (!h) throw new Error('falta la hoja ' + nombre + ': correr configurar()');
  return h;
}

function claveOk_(clave) {
  var buena = PropertiesService.getScriptProperties().getProperty('CLAVE');
  return !!buena && typeof clave === 'string' && clave === buena;
}

function buscarLink_(token) {
  if (typeof token !== 'string' || !/^[0-9a-f]{32}$/.test(token)) return null;
  var hoja = hoja_(HOJA_L);
  if (hoja.getLastRow() < 2) return null;
  var filas = hoja.getRange(2, 1, hoja.getLastRow() - 1, 5).getValues();
  for (var i = 0; i < filas.length; i++) {
    if (String(filas[i][0]) === token) {
      return {
        fila: i + 2,
        token: token,
        para: String(filas[i][1] || ''),
        vence: filas[i][3] instanceof Date ? filas[i][3] : new Date(0),
        usado: !!filas[i][4]
      };
    }
  }
  return null;
}

/* Espacios de mas afuera; en el testimonio se respetan los renglones
   (hasta dos seguidos), en el nombre no. */
function limpio_(v, renglones) {
  var s = String(v == null ? '' : v).replace(/\r\n?/g, '\n');
  s = renglones ? s.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n')
                : s.replace(/\s+/g, ' ');
  return s.trim();
}

/* El apostrofo obliga a la planilla a guardarlo como TEXTO. Sin el,
   un nombre como "=IMPORTXML(...)" seria una formula, y "1/2" una
   fecha. Al leer, la planilla devuelve el texto sin el apostrofo. */
function texto_(s) {
  return s ? "'" + s : '';
}
