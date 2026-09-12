/* Test de js/i18n.js con el DOM simulado: deteccion de idioma, moneda por
   ubicacion, ausencia de estado guardado y paridad de claves.
   Correr:  node test-i18n.js                                              */

const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, 'js', 'i18n.js'), 'utf8');

/* Los valores de emergencia, sacados del propio js/i18n.js: son los que
   tienen que aparecer si config_editor.js no cargo. */
const EMERGENCIA = (() => {
  const desde = code.indexOf('{', code.indexOf('var EMERGENCIA'));
  const hasta = code.indexOf('}', desde);
  if (desde < 0 || hasta < 0) throw new Error('js/i18n.js: no encuentro EMERGENCIA');
  const salida = {};
  for (const m of code.slice(desde, hasta).matchAll(/(\w+)\s*:\s*'([^']*)'/g)) {
    salida[m[1]] = m[2];
  }
  return salida;
})();

/* El unico archivo editable. Se lee el de verdad, asi el test falla si
   alguien lo deja mal escrito o le saca un idioma. */
/* El numero de WhatsApp ya no es editable: vive en el href de los
   botones de index.html. Se lee de ahi, que es la unica fuente. */
const WA = (() => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const bases = [...html.matchAll(/<a[^>]*\sdata-wa=[^>]*>/g)].map((m) => {
    const href = /href="([^"]*)"/.exec(m[0]);
    return href ? href[1].split('?')[0] : null;
  });
  if (!bases.length) throw new Error('index.html: no encuentro los botones de WhatsApp');
  return { bases };
})();

const CONFIG = (() => {
  const crudo = fs.readFileSync(path.join(__dirname, 'config_editor.js'), 'utf8');
  /* sin regex a proposito: se busca el objeto por sus llaves, asi no
     importa como quede indentado el archivo */
  const desde = crudo.indexOf('{', crudo.indexOf('window.MLPC'));
  const hasta = crudo.lastIndexOf('}', crudo.indexOf(';', desde));
  if (desde < 0 || hasta < desde) {
    throw new Error('config_editor.js: no encuentro el objeto window.MLPC');
  }
  return JSON.parse(crudo.slice(desde, hasta + 1));
})();

function elemento(attrsIniciales = {}, anotar = null) {
  const attrs = { ...attrsIniciales };
  return {
    set href(v) { attrs.href = v; if (anotar) anotar.push(v); },
    get href() { return attrs.href; },
    textContent: '',
    innerHTML: '',
    setAttribute: (k, v) => { attrs[k] = v; },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    _attrs: attrs
  };
}

/* Reloj falso para probar la cuenta de años. i18n.js usa Date en un
   solo lugar (new Date().getFullYear()), asi que alcanza con esto. */
function reloj(anio) {
  return class extends Date {
    constructor(...a) { super(...(a.length ? a : [anio, 5, 15])); }
  };
}

function run({ ip, tz, nav, search = '', failGeo = false, sinConfig = false, sinDuracion = false, anio = null }) {
  return new Promise((resolve) => {
    const clases = new Set(['booting']);   /* la pone index.html; el JS la tiene que sacar */
    const html = { lang: '', classList: { add: (c) => clases.add(c), remove: (c) => clases.delete(c) } };
    const writes = [];
    const dom = { price: elemento(), currency: elemento(), duracion: elemento() };
    const nodoFrase = elemento();
    const nodoSub = elemento({ 'data-i18n-html': 'sub_exp' });
    /* los botones de WhatsApp: lo unico de la pagina que tiene que
       funcionar si o si */
    /* arranca con el href que trae el HTML, como en el navegador */
    const nodoWa = elemento({ 'data-wa': 'hero', href: WA.bases[0] });

    const ctx = {
      document: {
        documentElement: html,
        /* solo devuelve el nodo de la frase: es lo unico que este test
           mira del DOM, aparte del precio */
        querySelectorAll: (sel) => {
          if (sel === '[data-frase]') return [nodoFrase];
          if (sel === '[data-count]') return [dom.duracion];
          if (sel === 'a[data-wa]') return [nodoWa];
          if (sel === '[data-i18n-html]') return [nodoSub];
          return [];
        },
        getElementById: (id) => dom[id] || null,
        addEventListener: () => {},
        dispatchEvent: () => {},
        fonts: null          /* sin API de fuentes: la compuerta no espera */
      },
      navigator: { languages: nav },
      location: { search },
      /* si el codigo intenta guardar algo, lo anotamos y falla el test */
      localStorage: {
        getItem: () => null,
        setItem: (k) => writes.push(k),
        removeItem: (k) => writes.push(k)
      },
      Intl: {
        DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: tz }) }),
        NumberFormat: global.Intl.NumberFormat
      },
      fetch: failGeo
        ? () => Promise.reject(new Error('bloqueado'))
        : () => Promise.resolve({ ok: true, json: () => Promise.resolve({ country: ip }) }),
      AbortController: global.AbortController,
      setTimeout: global.setTimeout,
      clearTimeout: global.clearTimeout,
      addEventListener: () => {},
      Date: anio ? reloj(anio) : Date,
      JSON, parseFloat, encodeURIComponent
    };
    ctx.window = ctx;
    /* sinConfig simula que config_editor.js no cargo o quedo mal escrito:
       ahi tienen que entrar los valores de emergencia */
    if (!sinConfig) ctx.MLPC = JSON.parse(JSON.stringify(CONFIG));
    /* sinDuracion simula un config_editor.js escrito por una version
       vieja del editor, que no conoce esa clave y la deja afuera */
    if (sinDuracion) delete ctx.MLPC.duracion;

    new Function(...Object.keys(ctx), code)(...Object.values(ctx));
    setTimeout(() => resolve({
      lang: html.lang,
      booting: clases.has('booting'),
      moneda: dom.currency.textContent.trim(),
      monto: dom.price.getAttribute('data-count'),
      frase: nodoFrase.textContent,
      duracion: dom.duracion.textContent,
      wa: nodoWa.getAttribute('href'),
      sub: nodoSub.innerHTML,
      writes
    }), 30);
  });
}

const casos = [
  // nombre                                 escenario                                                              idioma  moneda
  ['VPN en Alemania (equipo argentino)',  { ip: 'DE', tz: 'America/Argentina/Buenos_Aires', nav: ['es-AR'] },        'de', 'USD'],
  ['argentino, todo argentino',           { ip: 'AR', tz: 'America/Argentina/Buenos_Aires', nav: ['es-AR'] },        'es', 'ARS'],
  ['argentino con Windows en ingles',     { ip: 'AR', tz: 'America/Argentina/Cordoba', nav: ['en-US'] },             'es', 'ARS'],
  ['argentino de viaje (IP AR, tz UE)',   { ip: 'AR', tz: 'Europe/Madrid', nav: ['es-ES'] },                         'es', 'ARS'],
  ['mexicano: habla español, paga USD',   { ip: 'MX', tz: 'America/Mexico_City', nav: ['es-MX'] },                   'es', 'USD'],
  ['español: mismo idioma, USD',          { ip: 'ES', tz: 'Europe/Madrid', nav: ['es-ES'] },                         'es', 'USD'],
  ['visitante de Brasil',                 { ip: 'BR', tz: 'America/Sao_Paulo', nav: ['pt-BR'] },                     'pt', 'USD'],
  ['visitante de Japon -> ingles',        { ip: 'JP', tz: 'Asia/Tokyo', nav: ['ja'] },                               'en', 'USD'],
  ['?lang=de no cambia la moneda',        { ip: 'AR', tz: 'America/Argentina/Salta', nav: ['es'], search: '?lang=de' }, 'de', 'ARS'],
  ['API caida en AR -> zona horaria',     { ip: 'AR', tz: 'America/Argentina/Mendoza', nav: ['es'], failGeo: true },  'es', 'ARS'],
  ['API caida afuera -> zona horaria',    { ip: 'DE', tz: 'Europe/Rome', nav: ['en'], failGeo: true },                'it', 'USD'],
  ['API caida y zona rara -> nav',        { ip: 'DE', tz: 'Antarctica/Troll', nav: ['de-DE'], failGeo: true },        'de', 'USD'],
  ['nada reconocible -> ingles',          { ip: 'JP', tz: 'Antarctica/Troll', nav: ['ja'], failGeo: true },           'en', 'USD'],
  /* la frase por idioma, que es lo que agrego el archivo editable */
  ['frase en aleman desde el config',    { ip: 'DE', tz: 'Europe/Berlin', nav: ['de'] },                            'de', 'USD'],
  ['frase en portugues desde el config', { ip: 'PT', tz: 'Europe/Lisbon', nav: ['pt-PT'] },                         'pt', 'USD'],
  /* sin el archivo editable: entran los valores de emergencia */
  ['sin config_editor.js -> emergencia', { ip: 'AR', tz: 'America/Argentina/Buenos_Aires', nav: ['es-AR'], sinConfig: true }, 'es', 'ARS'],
  /* un editor viejo regenera el archivo sin la clave de la duracion */
  ['config sin duracion -> emergencia',  { ip: 'AR', tz: 'America/Argentina/Buenos_Aires', nav: ['es-AR'], sinDuracion: true }, 'es', 'ARS']
];

const MONTOS = { ARS: CONFIG.precioAR, USD: CONFIG.precioUSD };
const MONTOS_EMERGENCIA = { ARS: EMERGENCIA.precioAR, USD: EMERGENCIA.precioUSD };

/* Paridad de claves: si a un idioma le falta una, ese texto queda en blanco.
   Tambien avisa si el HTML pide una clave que no existe en el diccionario. */
function paridad() {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

  const usadas = new Set(['wa', 'session_lang']);
  for (const m of html.matchAll(/data-i18n(?:-html)?="(\w+)"/g)) usadas.add(m[1]);
  for (const m of html.matchAll(/data-i18n-attr="[\w-]+:(\w+)"/g)) usadas.add(m[1]);

  const claves = {};
  for (const [, lang, cuerpo] of code.matchAll(/\n    ([a-z]{2}): \{([\s\S]*?)\n    \}/g)) {
    claves[lang] = new Set([...cuerpo.matchAll(/\n      ([a-z_0-9]+):/g)].map((m) => m[1]));
  }

  const idiomas = Object.keys(claves);
  const base = claves.es;
  let ok = true;

  for (const lang of idiomas) {
    const falta = [...base].filter((k) => !claves[lang].has(k));
    const sobra = [...claves[lang]].filter((k) => !base.has(k));
    if (falta.length || sobra.length) {
      ok = false;
      console.log(`FALLA ${lang}: falta [${falta}] sobra [${sobra}]`);
    }
  }
  const huerfanas = [...usadas].filter((k) => !base.has(k));
  if (huerfanas.length) {
    ok = false;
    console.log(`FALLA el HTML pide claves que no estan en el diccionario: [${huerfanas}]`);
  }

  console.log(`${ok ? 'OK  ' : 'FALLA'} paridad: ${idiomas.length} idiomas x ${base.size} claves (${idiomas})`);
  return ok;
}

/* Los años de oficio: en el diccionario va {anios} y el codigo escribe el
   año actual menos 2011. Se prueba que no quede ningun numero a mano y
   que la cuenta de bien, incluso con la fecha del equipo mal puesta. */
async function aniosOficio() {
  let ok = true;

  for (const [, lang, cuerpo] of code.matchAll(/\n    ([a-z]{2}): \{([\s\S]*?)\n    \}/g)) {
    for (const clave of ['sub_exp', 'desc']) {
      const linea = cuerpo.match(new RegExp('\\n      ' + clave + ': (.*)'));
      if (!linea) { ok = false; console.log(`FALLA ${lang}: no encuentro ${clave}`); continue; }
      if (!linea[1].includes('{anios}')) {
        ok = false;
        console.log(`FALLA ${lang}.${clave}: el año esta escrito a mano -> ${linea[1]}`);
      }
    }
  }
  console.log(`${ok ? 'OK  ' : 'FALLA'} ningun año escrito a mano en el diccionario`);

  const hoy = new Date().getFullYear();
  const pruebas = [
    ['este año',                     hoy,  String(hoy - 2011)],
    ['en 2031 dice 20 solo',         2031, '20'],
    ['reloj en 1970 (pila agotada)', 1970, '15'],   /* piso */
    ['reloj en 2099',                2099, '40']    /* techo */
  ];
  for (const [nombre, anio, esperado] of pruebas) {
    const r = await run({ ip: 'AR', tz: 'America/Argentina/Buenos_Aires', nav: ['es-AR'], anio });
    const visto = (r.sub.match(/<b>(\d+)/) || [])[1];
    const bien = visto === esperado;
    if (!bien) ok = false;
    console.log(`${bien ? 'OK  ' : 'FALLA'} ${nombre.padEnd(30)} -> "${r.sub}"` +
                (bien ? '' : `  (esperaba ${esperado})`));
  }
  return ok;
}

/* El numero de WhatsApp es fijo y vive en el href de los botones. Eso lo
   vuelve lo mas robusto de la pagina (anda sin JavaScript), pero tambien
   significa que si alguien edita uno solo de los cuatro, nadie se entera.
   Aca se controla que los cuatro lleven al mismo lado. */
function botonesDeWhatsApp() {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const anclas = [...html.matchAll(/<a[^>]*\sdata-wa="([^"]*)"[^>]*>/g)];
  let ok = true;

  if (anclas.length !== 4) {
    ok = false;
    console.log(`FALLA esperaba 4 botones de WhatsApp, hay ${anclas.length}`);
  }

  const bases = new Set();
  for (const m of anclas) {
    const href = /href="([^"]*)"/.exec(m[0]);
    if (!href) {
      ok = false;
      console.log(`FALLA el boton "${m[1]}" no tiene href escrito en el HTML`);
      continue;
    }
    bases.add(href[1].split('?')[0]);
  }

  if (bases.size > 1) {
    ok = false;
    console.log(`FALLA los botones no van todos al mismo numero: ${[...bases].join(' / ')}`);
  }

  const base = [...bases][0] || '';
  /* 54 (pais) + 9 (movil) + 11 (area) + 8 digitos, sin + ni guiones */
  if (!/^https:\/\/wa\.me\/549\d{10}$/.test(base)) {
    ok = false;
    console.log(`FALLA el link no tiene el formato oficial de wa.me: ${base}`);
  }

  /* el pie muestra el numero escrito: tiene que ser el mismo */
  const digitos = base.replace(/\D/g, '').slice(2);        // sin el 54
  const pie = /<a[^>]*data-wa="footer"[^>]*>([^<]*)<\/a>/.exec(html);
  const escrito = pie ? pie[1].replace(/\D/g, '') : '';
  if (escrito && digitos.slice(1) !== escrito) {
    ok = false;
    console.log(`FALLA el pie dice ${pie[1].trim()} y los botones van a ${base}`);
  }

  console.log(`${ok ? 'OK  ' : 'FALLA'} los 4 botones van al mismo numero (${base}), y el pie lo dice igual`);
  return ok;
}

(async () => {
  let ok = 0;
  for (const [nombre, cfg, idioma, moneda] of casos) {
    const r = await run(cfg);
    /* sin el archivo editable, lo que tiene que aparecer son los valores
       de emergencia; con el, los del archivo */
    const montos = cfg.sinConfig ? MONTOS_EMERGENCIA : MONTOS;
    /* la frase tiene que salir en el idioma que se detecto */
    const frase = cfg.sinConfig ? EMERGENCIA.frase : CONFIG.frase[idioma];
    /* la duracion de la sesion sale del mismo archivo editable */
    const duracion = (cfg.sinConfig || cfg.sinDuracion) ? EMERGENCIA.duracion : CONFIG.duracion;
    /* El link tiene que conservar el numero que estaba en el HTML y solo
       cambiarle el mensaje al idioma que se detecto. Si alguien vuelve a
       armar la URL desde cero en el JS, el numero deja de estar en un
       solo lugar y esto falla. */
    const waOk = typeof r.wa === 'string' &&
                 r.wa.startsWith(WA.bases[0] + '?text=') &&
                 r.wa.length > (WA.bases[0] + '?text=').length;
    const bien = waOk && r.lang === idioma && r.moneda === moneda &&
                 r.monto === montos[moneda] && r.writes.length === 0 &&
                 r.frase === frase && r.duracion === duracion &&
                 r.booting === false;      /* la compuerta SIEMPRE se levanta */
    if (bien) ok++;
    let detalle = `${r.lang} · ${r.monto} ${r.moneda} · ${r.duracion} min · "${r.frase}"`;
    if (r.lang !== idioma) detalle += `  (idioma esperado ${idioma})`;
    if (r.moneda !== moneda) detalle += `  (moneda esperada ${moneda})`;
    if (r.monto !== montos[moneda]) detalle += `  (monto esperado ${montos[moneda]})`;
    if (r.frase !== frase) detalle += `  (frase esperada "${frase}")`;
    if (r.duracion !== duracion) detalle += `  (duracion esperada ${duracion})`;
    if (!waOk) detalle += `  LINK MAL: ${r.wa}  (esperaba que empiece con ${WA.bases[0]}?text=)`;
    if (r.writes.length) detalle += `  GUARDO: ${r.writes.join(', ')}`;
    if (r.booting) detalle += '  QUEDO OCULTA (compuerta trabada)';
    console.log(`${bien ? 'OK  ' : 'FALLA'} ${nombre.padEnd(38)} -> ${detalle}`);
  }

  console.log('');
  const par = paridad();
  console.log('');
  const anios = await aniosOficio();
  console.log('');
  const wa = botonesDeWhatsApp();
  console.log(`\n${ok}/${casos.length} casos  (idioma + moneda + monto, y sin guardar estado)`);
  process.exit(ok === casos.length && par && anios && wa ? 0 : 1);
})();
