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

function elemento(attrsIniciales = {}) {
  const attrs = { ...attrsIniciales };
  return {
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

function run({ ip, tz, nav, search = '', failGeo = false, sinConfig = false, anio = null }) {
  return new Promise((resolve) => {
    const clases = new Set(['booting']);   /* la pone index.html; el JS la tiene que sacar */
    const html = { lang: '', classList: { add: (c) => clases.add(c), remove: (c) => clases.delete(c) } };
    const writes = [];
    const dom = { price: elemento(), currency: elemento() };
    const nodoFrase = elemento();
    const nodoSub = elemento({ 'data-i18n-html': 'sub_exp' });

    const ctx = {
      document: {
        documentElement: html,
        /* solo devuelve el nodo de la frase: es lo unico que este test
           mira del DOM, aparte del precio */
        querySelectorAll: (sel) => {
          if (sel === '[data-frase]') return [nodoFrase];
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

    new Function(...Object.keys(ctx), code)(...Object.values(ctx));
    setTimeout(() => resolve({
      lang: html.lang,
      booting: clases.has('booting'),
      moneda: dom.currency.textContent.trim(),
      monto: dom.price.getAttribute('data-count'),
      frase: nodoFrase.textContent,
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
  ['sin config_editor.js -> emergencia', { ip: 'AR', tz: 'America/Argentina/Buenos_Aires', nav: ['es-AR'], sinConfig: true }, 'es', 'ARS']
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

(async () => {
  let ok = 0;
  for (const [nombre, cfg, idioma, moneda] of casos) {
    const r = await run(cfg);
    /* sin el archivo editable, lo que tiene que aparecer son los valores
       de emergencia; con el, los del archivo */
    const montos = cfg.sinConfig ? MONTOS_EMERGENCIA : MONTOS;
    /* la frase tiene que salir en el idioma que se detecto */
    const frase = cfg.sinConfig ? EMERGENCIA.frase : CONFIG.frase[idioma];
    const bien = r.lang === idioma && r.moneda === moneda &&
                 r.monto === montos[moneda] && r.writes.length === 0 &&
                 r.frase === frase &&
                 r.booting === false;      /* la compuerta SIEMPRE se levanta */
    if (bien) ok++;
    let detalle = `${r.lang} · ${r.monto} ${r.moneda} · "${r.frase}"`;
    if (r.lang !== idioma) detalle += `  (idioma esperado ${idioma})`;
    if (r.moneda !== moneda) detalle += `  (moneda esperada ${moneda})`;
    if (r.monto !== montos[moneda]) detalle += `  (monto esperado ${montos[moneda]})`;
    if (r.frase !== frase) detalle += `  (frase esperada "${frase}")`;
    if (r.writes.length) detalle += `  GUARDO: ${r.writes.join(', ')}`;
    if (r.booting) detalle += '  QUEDO OCULTA (compuerta trabada)';
    console.log(`${bien ? 'OK  ' : 'FALLA'} ${nombre.padEnd(38)} -> ${detalle}`);
  }

  console.log('');
  const par = paridad();
  console.log('');
  const anios = await aniosOficio();
  console.log(`\n${ok}/${casos.length} casos  (idioma + moneda + monto, y sin guardar estado)`);
  process.exit(ok === casos.length && par && anios ? 0 : 1);
})();
