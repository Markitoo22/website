const fs = require('fs');
const path = require('path').join(__dirname, 'js', 'i18n.js');
const code = fs.readFileSync(path, 'utf8');

function run({ ip, tz, nav, search = '', savedLang = null, savedGeo = null, failGeo = false }) {
  return new Promise((resolve) => {
    const store = {};
    if (savedLang) store['mlpc.lang'] = savedLang;
    if (savedGeo) store['mlpc.country'] = JSON.stringify({ c: savedGeo, t: Date.now() });

    const html = { lang: '' };
    const ctx = {
      document: {
        documentElement: html,
        querySelectorAll: () => [],
        getElementById: () => null
      },
      navigator: { languages: nav },
      location: { search },
      localStorage: {
        getItem: (k) => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = v; },
      },
      Intl: {
        DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: tz }) }),
        NumberFormat: global.Intl.NumberFormat
      },
      fetch: failGeo
        ? () => Promise.reject(new Error('bloqueado'))
        : () => Promise.resolve({ ok: true, json: () => Promise.resolve({ country: ip }) }),
      AbortController: global.AbortController,
      setTimeout: global.setTimeout, clearTimeout: global.clearTimeout,
      Date, JSON, parseFloat, encodeURIComponent
    };
    ctx.window = ctx;

    const fn = new Function(...Object.keys(ctx), code);
    fn(...Object.values(ctx));
    setTimeout(() => resolve(html.lang), 30);
  });
}

const casos = [
  ['VPN en Alemania (equipo argentino)', { ip: 'DE', tz: 'America/Argentina/Buenos_Aires', nav: ['es-AR'] }, 'de'],
  ['visitante de Brasil',                { ip: 'BR', tz: 'America/Sao_Paulo', nav: ['pt-BR'] }, 'pt'],
  ['visitante de Japon -> ingles',       { ip: 'JP', tz: 'Asia/Tokyo', nav: ['ja'] }, 'en'],
  ['argentino con Windows en ingles',    { ip: 'AR', tz: 'America/Argentina/Buenos_Aires', nav: ['en-US'] }, 'es'],
  ['?lang=it manda sobre la IP',         { ip: 'DE', tz: 'Europe/Berlin', nav: ['de'], search: '?lang=it' }, 'it'],
  ['eleccion guardada manda sobre IP',   { ip: 'DE', tz: 'Europe/Berlin', nav: ['de'], savedLang: 'fr' }, 'fr'],
  ['pais cacheado, sin llamada',         { ip: 'XX', tz: 'America/Argentina/Buenos_Aires', nav: ['es'], savedGeo: 'IT' }, 'it'],
  ['API bloqueada -> zona horaria',      { ip: 'DE', tz: 'Europe/Rome', nav: ['en'], failGeo: true }, 'it'],
  ['API bloqueada y zona rara -> nav',   { ip: 'DE', tz: 'Antarctica/Troll', nav: ['de-DE'], failGeo: true }, 'de'],
  ['nada reconocible -> ingles',         { ip: 'JP', tz: 'Antarctica/Troll', nav: ['ja'], failGeo: true }, 'en']
];

(async () => {
  let ok = 0;
  for (const [nombre, cfg, esperado] of casos) {
    const got = await run(cfg);
    const pass = got === esperado;
    if (pass) ok++;
    console.log(`${pass ? 'OK  ' : 'FALLA'} ${nombre.padEnd(38)} -> ${got}${pass ? '' : '  (esperaba ' + esperado + ')'}`);
  }
  console.log(`\n${ok}/${casos.length}`);
})();
