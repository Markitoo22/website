/* Test de js/i18n.js con el DOM simulado: deteccion de idioma, moneda por
   ubicacion, ausencia de estado guardado y paridad de claves.
   Correr:  node test-i18n.js                                              */

const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, 'js', 'i18n.js'), 'utf8');

function elemento() {
  const attrs = {};
  return {
    textContent: '',
    setAttribute: (k, v) => { attrs[k] = v; },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    _attrs: attrs
  };
}

function run({ ip, tz, nav, search = '', failGeo = false }) {
  return new Promise((resolve) => {
    const clases = new Set(['booting']);   /* la pone index.html; el JS la tiene que sacar */
    const html = { lang: '', classList: { add: (c) => clases.add(c), remove: (c) => clases.delete(c) } };
    const writes = [];
    const dom = { price: elemento(), currency: elemento() };

    const ctx = {
      document: {
        documentElement: html,
        querySelectorAll: () => [],
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
      Date, JSON, parseFloat, encodeURIComponent
    };
    ctx.window = ctx;

    new Function(...Object.keys(ctx), code)(...Object.values(ctx));
    setTimeout(() => resolve({
      lang: html.lang,
      booting: clases.has('booting'),
      moneda: dom.currency.textContent.trim(),
      monto: dom.price.getAttribute('data-count'),
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
  ['nada reconocible -> ingles',          { ip: 'JP', tz: 'Antarctica/Troll', nav: ['ja'], failGeo: true },           'en', 'USD']
];

const MONTOS = { ARS: '89999', USD: '89.99' };

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

(async () => {
  let ok = 0;
  for (const [nombre, cfg, idioma, moneda] of casos) {
    const r = await run(cfg);
    const bien = r.lang === idioma && r.moneda === moneda &&
                 r.monto === MONTOS[moneda] && r.writes.length === 0 &&
                 r.booting === false;      /* la compuerta SIEMPRE se levanta */
    if (bien) ok++;
    let detalle = `${r.lang} · ${r.monto} ${r.moneda}`;
    if (r.lang !== idioma) detalle += `  (idioma esperado ${idioma})`;
    if (r.moneda !== moneda) detalle += `  (moneda esperada ${moneda})`;
    if (r.monto !== MONTOS[moneda]) detalle += `  (monto esperado ${MONTOS[moneda]})`;
    if (r.writes.length) detalle += `  GUARDO: ${r.writes.join(', ')}`;
    if (r.booting) detalle += '  QUEDO OCULTA (compuerta trabada)';
    console.log(`${bien ? 'OK  ' : 'FALLA'} ${nombre.padEnd(36)} -> ${detalle}`);
  }

  console.log('');
  const par = paridad();
  console.log(`\n${ok}/${casos.length} casos  (idioma + moneda + monto, y sin guardar estado)`);
  process.exit(ok === casos.length && par ? 0 : 1);
})();
