/* ==================================================================
   Multiidioma, por PAIS DE CONEXION.

   Que idioma se muestra, en este orden:
     1. ?lang=xx en la URL          (para compartir un link ya traducido)
     2. EL PAIS DE SU IP            (de donde se conecta de verdad)
     3. la zona horaria del equipo  (pintado instantaneo y respaldo)
     4. el idioma del navegador
     5. ingles

   NO GUARDA NADA. El selector del header cambia el idioma solo para ese
   momento: al recargar, se vuelve a detectar de cero. Asi el idioma
   siempre refleja de donde se esta conectando el visitante, y probar con
   una VPN no arrastra el resultado de la prueba anterior.

   El contenido NO se muestra hasta que esten resueltos el pais (idioma y
   moneda) y las fuentes: eso lo sostiene la compuerta "booting" que arma
   index.html. Recien despues se muestra y se anima todo. Sin eso se ve el
   idioma por defecto y el cambio de tipografia en la cara.
   Techo de espera: 1,2 s; pasado eso se muestra con lo que haya.

   Si el servicio de IP falla, tarda o lo bloquea un adblocker, se muestra
   con lo que decidio la zona horaria del equipo.

   Para AGREGAR un idioma: sumar su bloque a DICT, su codigo a LANGS y
   sus paises a COUNTRY (y sus zonas a ZONES, opcional).
   Para SACAR uno: borrarlo de LANGS.
   ================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     LOS VALORES EDITABLES salen de config_editor.js, el unico archivo
     que toca la herramienta de EDIT/: los dos precios, el telefono, el
     color y la frase (con una entrada por idioma).

     EMERGENCIA es el respaldo, y se usa SOLO si ese archivo no cargo o
     quedo mal escrito. No hay que mantenerlo al dia: existe para que
     el sitio no aparezca vacio, no para ser la verdad.
     ------------------------------------------------------------------ */
  var CONF = window.MLPC || {};
  var EMERGENCIA = {
    precioAR:  '89999',
    precioUSD: '89.99',
    duracion:  '30',
    telefono:  '1155870867',
    frase:     'Solución garantizada'
  };

  /* minutos de la sesion, solo digitos */
  var DURACION = String(CONF.duracion || EMERGENCIA.duracion).replace(/\D/g, '') ||
                 EMERGENCIA.duracion;

  /* area 11 + 8 digitos, sin el 15 */
  var TELEFONO = String(CONF.telefono || EMERGENCIA.telefono).replace(/\D/g, '');

  /* ------------------------------------------------------------------
     LOS AÑOS DE OFICIO SE CUENTAN SOLOS: el diccionario escribe {anios}
     y aca se reemplaza por el año actual menos el primero. Asi el 1 de
     enero el numero sube sin que nadie toque el sitio.

     El techo y el piso son por las fechas mal puestas: una PC con la
     pila del reloj agotada arranca en 1970 o en 2010, y justo esa es la
     computadora que entra a esta pagina. Antes que "mas de -41 años",
     el numero de cuando se escribio esto.
     ------------------------------------------------------------------ */
  var DESDE = 2011;
  var ANIOS = String(Math.min(Math.max(new Date().getFullYear() - DESDE, 15), 40));

  function conAnios(txt) {
    return txt.indexOf('{anios}') < 0 ? txt : txt.split('{anios}').join(ANIOS);
  }

  var LANGS = ['es', 'en', 'pt', 'fr', 'de', 'it'];
  var FALLBACK = 'en';

  /* Idiomas en los que se puede atender la sesion. Al visitante que llega
     en cualquier otro se le avisa antes de que escriba, y el mensaje que
     se autocompleta en WhatsApp sale en ingles. */
  var SPOKEN = ['es', 'en'];

  var DICT = {

    es: {
      desc: 'Puesta a punto de PC 100% a distancia: más FPS, menos temperatura, menos ruido. {anios} años optimizando equipos.',
      eyebrow_hero: 'Puesta a punto a distancia · desde 2011',
      h1: '<span>Más <em>rápida</em></span><span>que nueva</span>',
      sub_exp: 'Más de <b>{anios} años</b> de experiencia.',
      cta_hero: 'Pedir turno',
      link_results: 'Ver resultados',
      note_hero: 'Sin mover la máquina · Respondo el mismo día',
      m_fps: 'FPS promedio',
      m_low: 'FPS 1% low',
      m_temp: 'Temperatura en carga',
      m_noise: 'Ruido',
      h_more: 'más es mejor',
      h_low: 'fluidez real',
      h_less: 'menos es mejor',
      before: 'Antes',
      after: 'Después',
      d_fps: '×2,5',
      d_low: '×3,8',
      d_temp: '−27°',
      d_noise: '−14',
      foot_panel: 'Equipo real de un cliente: mismo juego, misma configuración gráfica, misma herramienta de medición.<br>Cada máquina arranca de un estado distinto — el diagnóstico dice cuánto se puede ganar en la tuya.',
      s_price: 'Precio por sesión promedio',
      s_session: 'Duración promedio',
      sec_steps: 'Qué le hago a tu PC',
      steps_meta: '4 pasos · en orden',
      st1_t: 'Conexión a distancia',
      st1_d: 'Ves en pantalla todo lo que hago.',
      st2_t: 'Diagnóstico',
      st2_d: 'Verifico el estado general de tu PC.',
      st3_t: 'Afinado',
      st3_d: 'Más de 790 configuraciones.',
      st4_t: 'Verificación',
      st4_d: 'Ves las mejoras de la operación.',
      eyebrow_close: 'Cupos limitados por semana',
      close_h: '¿Arrancamos?',
      cta_close: 'Escribime por WhatsApp',
      note_close: 'Coordinamos día y horario',
      session_lang: 'Las sesiones son en español o inglés.',
      wa: 'Hola! Quiero una puesta a punto de mi PC'
    },

    en: {
      desc: '100% remote PC tune-up: more FPS, lower temperatures, less noise. {anios} years optimizing rigs.',
      eyebrow_hero: 'Remote PC tune-up · since 2011',
      h1: '<span><em>Faster</em></span><span>than new</span>',
      sub_exp: 'More than <b>{anios} years</b> of experience.',
      cta_hero: 'Book a session',
      link_results: 'See results',
      note_hero: 'Your PC never leaves your desk · Same-day reply',
      m_fps: 'Average FPS',
      m_low: '1% low FPS',
      m_temp: 'Temperature under load',
      m_noise: 'Noise',
      h_more: 'higher is better',
      h_low: 'real smoothness',
      h_less: 'lower is better',
      before: 'Before',
      after: 'After',
      d_fps: '×2.5',
      d_low: '×3.8',
      d_temp: '−27°',
      d_noise: '−14',
      foot_panel: "A real customer's rig: same game, same graphics settings, same measuring tool.<br>Every machine starts from a different place — the diagnosis tells you what yours can gain.",
      s_price: 'Average price per session',
      s_session: 'Average length',
      sec_steps: 'What I do to your PC',
      steps_meta: '4 steps · in order',
      st1_t: 'Remote session',
      st1_d: 'You watch everything I do, on your screen.',
      st2_t: 'Diagnosis',
      st2_d: 'I check the overall state of your PC.',
      st3_t: 'Tuning',
      st3_d: 'More than 790 settings.',
      st4_t: 'Verification',
      st4_d: 'You see the improvements from the session.',
      eyebrow_close: 'Limited slots each week',
      close_h: 'Shall we?',
      cta_close: 'Message me on WhatsApp',
      note_close: "We'll pick a day and time",
      session_lang: 'Sessions are run in Spanish or English.',
      wa: 'Hi! I want a PC tune-up'
    },

    pt: {
      desc: 'Otimização de PC 100% a distância: mais FPS, menos temperatura, menos ruído. {anios} anos otimizando máquinas.',
      eyebrow_hero: 'Otimização a distância · desde 2011',
      h1: '<span>Mais <em>rápido</em></span><span>que novo</span>',
      sub_exp: 'Mais de <b>{anios} anos</b> de experiência.',
      cta_hero: 'Agendar sessão',
      link_results: 'Ver resultados',
      note_hero: 'Sem sair de casa · Respondo no mesmo dia',
      m_fps: 'FPS médio',
      m_low: 'FPS 1% low',
      m_temp: 'Temperatura em carga',
      m_noise: 'Ruído',
      h_more: 'mais é melhor',
      h_low: 'fluidez real',
      h_less: 'menos é melhor',
      before: 'Antes',
      after: 'Depois',
      d_fps: '×2,5',
      d_low: '×3,8',
      d_temp: '−27°',
      d_noise: '−14',
      foot_panel: 'Máquina real de um cliente: mesmo jogo, mesma configuração gráfica, mesma ferramenta de medição.<br>Cada máquina parte de um estado diferente — o diagnóstico diz quanto a sua pode ganhar.',
      s_price: 'Preço médio por sessão',
      s_session: 'Duração média',
      sec_steps: 'O que eu faço no seu PC',
      steps_meta: '4 passos · em ordem',
      st1_t: 'Conexão a distância',
      st1_d: 'Você vê na tela tudo o que eu faço.',
      st2_t: 'Diagnóstico',
      st2_d: 'Verifico o estado geral do seu PC.',
      st3_t: 'Ajuste',
      st3_d: 'Mais de 790 configurações.',
      st4_t: 'Verificação',
      st4_d: 'Você vê as melhorias da operação.',
      eyebrow_close: 'Vagas limitadas por semana',
      close_h: 'Vamos?',
      cta_close: 'Fale comigo no WhatsApp',
      note_close: 'Combinamos dia e horário',
      session_lang: 'As sessões são feitas em espanhol ou inglês.',
      /* el mensaje sale en ingles: es el idioma en que se puede responder */
      wa: 'Hi! I want a PC tune-up'
    },

    fr: {
      desc: 'Optimisation PC 100 % à distance : plus de FPS, moins de chaleur, moins de bruit. {anios} ans de métier.',
      eyebrow_hero: 'Optimisation PC à distance · depuis 2011',
      h1: '<span>Plus <em>rapide</em></span><span>que neuf</span>',
      sub_exp: 'Plus de <b>{anios} ans</b> d’expérience.',
      cta_hero: 'Réserver une session',
      link_results: 'Voir les résultats',
      note_hero: 'Sans déplacer la machine · Réponse le jour même',
      m_fps: 'FPS moyens',
      m_low: 'FPS 1% low',
      m_temp: 'Température en charge',
      m_noise: 'Bruit',
      h_more: "plus, c'est mieux",
      h_low: 'fluidité réelle',
      h_less: "moins, c'est mieux",
      before: 'Avant',
      after: 'Après',
      d_fps: '×2,5',
      d_low: '×3,8',
      d_temp: '−27°',
      d_noise: '−14',
      foot_panel: "Machine réelle d'un client : même jeu, mêmes réglages graphiques, même outil de mesure.<br>Chaque machine part d'un état différent — le diagnostic dit ce que la vôtre peut gagner.",
      s_price: 'Prix moyen par session',
      s_session: 'Durée moyenne',
      sec_steps: 'Ce que je fais à votre PC',
      steps_meta: '4 étapes · dans l’ordre',
      st1_t: 'Connexion à distance',
      st1_d: "Vous voyez à l'écran tout ce que je fais.",
      st2_t: 'Diagnostic',
      st2_d: "Je vérifie l'état général de votre PC.",
      st3_t: 'Réglages',
      st3_d: 'Plus de 790 réglages.',
      st4_t: 'Vérification',
      st4_d: "Vous voyez les améliorations de l'intervention.",
      eyebrow_close: 'Places limitées chaque semaine',
      close_h: 'On commence ?',
      cta_close: 'Écrivez-moi sur WhatsApp',
      note_close: 'On choisit le jour et l’heure',
      session_lang: 'Les sessions se déroulent en espagnol ou en anglais.',
      wa: 'Hi! I want a PC tune-up'
    },

    de: {
      desc: 'PC-Optimierung aus der Ferne: mehr FPS, weniger Hitze, weniger Lärm. {anios} Jahre Erfahrung.',
      eyebrow_hero: 'PC-Optimierung per Fernwartung · seit 2011',
      h1: '<span><em>Schneller</em></span><span>als neu</span>',
      sub_exp: 'Über <b>{anios} Jahre</b> Erfahrung.',
      cta_hero: 'Termin buchen',
      link_results: 'Ergebnisse ansehen',
      note_hero: 'Der Rechner bleibt bei dir · Antwort am selben Tag',
      m_fps: 'Durchschnittliche FPS',
      m_low: '1% low FPS',
      m_temp: 'Temperatur unter Last',
      m_noise: 'Lautstärke',
      h_more: 'mehr ist besser',
      h_low: 'echte Laufruhe',
      h_less: 'weniger ist besser',
      before: 'Vorher',
      after: 'Nachher',
      d_fps: '×2,5',
      d_low: '×3,8',
      d_temp: '−27°',
      d_noise: '−14',
      foot_panel: 'Echter Rechner eines Kunden: gleiches Spiel, gleiche Grafikeinstellungen, gleiches Messwerkzeug.<br>Jede Maschine startet anders — die Diagnose zeigt, was bei dir drin ist.',
      s_price: 'Durchschnittspreis pro Sitzung',
      s_session: 'Durchschnittliche Dauer',
      sec_steps: 'Was ich mit deinem PC mache',
      steps_meta: '4 Schritte · der Reihe nach',
      st1_t: 'Fernzugriff',
      st1_d: 'Du siehst auf dem Bildschirm alles, was ich mache.',
      st2_t: 'Diagnose',
      st2_d: 'Ich prüfe den Gesamtzustand deines PCs.',
      st3_t: 'Feinabstimmung',
      st3_d: 'Über 790 Einstellungen.',
      st4_t: 'Nachweis',
      st4_d: 'Du siehst, was die Optimierung gebracht hat.',
      eyebrow_close: 'Begrenzte Plätze pro Woche',
      close_h: 'Legen wir los?',
      cta_close: 'Schreib mir auf WhatsApp',
      note_close: 'Wir finden Tag und Uhrzeit',
      session_lang: 'Die Sitzungen finden auf Spanisch oder Englisch statt.',
      wa: 'Hi! I want a PC tune-up'
    },

    it: {
      desc: 'Ottimizzazione PC 100% a distanza: più FPS, meno temperatura, meno rumore. {anios} anni di esperienza.',
      eyebrow_hero: 'Ottimizzazione PC a distanza · dal 2011',
      h1: '<span>Più <em>veloce</em></span><span>che nuovo</span>',
      sub_exp: 'Oltre <b>{anios} anni</b> di esperienza.',
      cta_hero: 'Prenota una sessione',
      link_results: 'Vedi i risultati',
      note_hero: "Il PC resta dov'è · Risposta lo stesso giorno",
      m_fps: 'FPS medi',
      m_low: 'FPS 1% low',
      m_temp: 'Temperatura sotto carico',
      m_noise: 'Rumore',
      h_more: 'più è meglio',
      h_low: 'fluidità reale',
      h_less: 'meno è meglio',
      before: 'Prima',
      after: 'Dopo',
      d_fps: '×2,5',
      d_low: '×3,8',
      d_temp: '−27°',
      d_noise: '−14',
      foot_panel: 'Macchina reale di un cliente: stesso gioco, stesse impostazioni grafiche, stesso strumento di misura.<br>Ogni macchina parte da uno stato diverso — la diagnosi dice quanto puoi guadagnare sulla tua.',
      s_price: 'Prezzo medio per sessione',
      s_session: 'Durata media',
      sec_steps: 'Cosa faccio al tuo PC',
      steps_meta: '4 passi · in ordine',
      st1_t: 'Connessione a distanza',
      st1_d: 'Vedi sullo schermo tutto quello che faccio.',
      st2_t: 'Diagnosi',
      st2_d: 'Verifico lo stato generale del tuo PC.',
      st3_t: 'Messa a punto',
      st3_d: 'Oltre 790 impostazioni.',
      st4_t: 'Verifica',
      st4_d: "Vedi i miglioramenti dell'intervento.",
      eyebrow_close: 'Posti limitati ogni settimana',
      close_h: 'Partiamo?',
      cta_close: 'Scrivimi su WhatsApp',
      note_close: 'Concordiamo giorno e ora',
      session_lang: 'Le sessioni si svolgono in spagnolo o in inglese.',
      wa: 'Hi! I want a PC tune-up'
    }

  };

  /* Zonas horarias -> idioma. Solo hace falta listar las que NO son
     inglesas; el resto cae en el fallback. Se compara por prefijo. */
  var ZONES = {
    es: ['America/Argentina', 'America/Buenos_Aires', 'America/Cordoba', 'America/Mendoza',
         'America/Mexico', 'America/Tijuana', 'America/Monterrey', 'America/Bogota',
         'America/Santiago', 'America/Lima', 'America/Caracas', 'America/Montevideo',
         'America/Asuncion', 'America/La_Paz', 'America/Guayaquil', 'America/Havana',
         'America/Santo_Domingo', 'America/Guatemala', 'America/Tegucigalpa',
         'America/Managua', 'America/Costa_Rica', 'America/El_Salvador', 'America/Panama',
         'Europe/Madrid', 'Atlantic/Canary', 'Africa/Malabo'],
    pt: ['America/Sao_Paulo', 'America/Bahia', 'America/Fortaleza', 'America/Recife',
         'America/Belem', 'America/Manaus', 'America/Cuiaba', 'America/Campo_Grande',
         'America/Porto_Velho', 'America/Rio_Branco', 'America/Boa_Vista', 'America/Maceio',
         'America/Araguaina', 'America/Santarem', 'America/Noronha',
         'Europe/Lisbon', 'Atlantic/Madeira', 'Atlantic/Azores', 'Africa/Luanda',
         'Africa/Maputo', 'Africa/Bissau', 'Africa/Sao_Tome'],
    fr: ['Europe/Paris', 'Europe/Monaco', 'Europe/Luxembourg', 'Africa/Abidjan',
         'Africa/Dakar', 'Africa/Douala', 'Africa/Algiers', 'Africa/Casablanca',
         'Africa/Tunis', 'Indian/Reunion', 'America/Martinique', 'America/Guadeloupe',
         'America/Cayenne'],
    de: ['Europe/Berlin', 'Europe/Vienna', 'Europe/Zurich', 'Europe/Busingen',
         'Europe/Vaduz'],
    it: ['Europe/Rome', 'Europe/Vatican', 'Europe/San_Marino', 'Europe/Malta']
  };

  /* Pais de la IP -> idioma. Todo lo que no este listado cae en ingles. */
  var COUNTRY = {
    es: ['AR', 'MX', 'CO', 'CL', 'PE', 'VE', 'UY', 'PY', 'BO', 'EC', 'CU', 'DO',
         'GT', 'HN', 'NI', 'CR', 'SV', 'PA', 'PR', 'ES', 'GQ'],
    pt: ['BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL'],
    fr: ['FR', 'BE', 'LU', 'MC', 'SN', 'CI', 'CM', 'ML', 'BF', 'NE', 'TG', 'BJ',
         'GA', 'CG', 'CD', 'MG', 'TN', 'MA', 'DZ', 'HT', 'GP', 'MQ', 'RE', 'NC', 'PF'],
    de: ['DE', 'AT', 'CH', 'LI'],   /* CH: aleman es la mayoria */
    it: ['IT', 'SM', 'VA']
    /* BE va en frances: no hay holandes en la lista, y es el mas util de los dos.
       CA no esta: fuera de Quebec se habla ingles, y aca solo hay pais. */
  };

  /* Dos proveedores sin API key, con CORS abierto. Si el primero no
     contesta en 900 ms se prueba el segundo: la pagina entera espera 1,2 s. */
  var GEO = [
    { url: 'https://api.country.is/', pick: function (j) { return j.country; } },
    { url: 'https://get.geojs.io/v1/ip/country.json', pick: function (j) { return j.country; } }
  ];

  /* Nombres para el menu del header, en su propio idioma. */
  var NAMES = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français', de: 'Deutsch', it: 'Italiano' };

  /* ---------- PRECIO ----------
     Solo dos monedas. La moneda sigue al PAIS, no al idioma: un mexicano
     lee la pagina en español y paga en USD; un argentino con Windows en
     ingles la lee en ingles y paga en ARS.
     El monto va como lo entiende JS (punto decimal) y se formatea despues
     segun el idioma: 89999 -> "89.999" en es, "89,999" en en. */
  var PRECIOS = {
    AR:     { monto: String(CONF.precioAR  || EMERGENCIA.precioAR),  moneda: 'ARS' },
    resto:  { monto: String(CONF.precioUSD || EMERGENCIA.precioUSD), moneda: 'USD' }
  };

  /* Zonas horarias argentinas, para acertar la moneda en el primer pintado
     mientras viaja la respuesta de la IP. */
  var ZONAS_AR = ['America/Argentina', 'America/Buenos_Aires', 'America/Cordoba',
                  'America/Mendoza', 'America/Catamarca', 'America/Jujuy', 'America/Rosario'];

  function supported(code) {
    if (!code) return null;
    code = String(code).toLowerCase().slice(0, 2);
    return LANGS.indexOf(code) > -1 ? code : null;
  }

  function fromZone() {
    var tz;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return null; }
    for (var lang in ZONES) {
      var list = ZONES[lang];
      for (var i = 0; i < list.length; i++) {
        if (tz.indexOf(list[i]) === 0) return lang;
      }
    }
    return null;
  }

  function fromBrowser() {
    var list = navigator.languages || [navigator.language];
    for (var i = 0; i < list.length; i++) {
      var hit = supported(list[i]);
      if (hit) return hit;
    }
    return null;
  }

  /* --- numeros: un solo formateador para toda la pagina --- */

  var cache = {};
  function decimales(txt) {
    var punto = String(txt).split('.');
    return punto.length > 1 ? punto[1].length : 0;
  }
  /* lo usa tambien el conteo animado de js/plexus.js */
  window.mlpcNumero = function (valor, dec) {
    var lang = document.documentElement.lang || 'es';
    var k = lang + '|' + dec;
    if (!cache[k]) {
      cache[k] = new Intl.NumberFormat(lang, {
        minimumFractionDigits: dec, maximumFractionDigits: dec
      });
    }
    return cache[k].format(valor);
  };

  function pintarNumeros() {
    var nodes = document.querySelectorAll('[data-count]');
    for (var i = 0; i < nodes.length; i++) {
      var v = nodes[i].getAttribute('data-count');
      nodes[i].textContent = window.mlpcNumero(parseFloat(v), decimales(v));
    }
  }

  /* --- precio --- */

  function zonaEsAR() {
    var tz;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return false; }
    for (var i = 0; i < ZONAS_AR.length; i++) {
      if (tz.indexOf(ZONAS_AR[i]) === 0) return true;
    }
    return false;
  }

  /* La frase del idioma pedido. Si falta esa traduccion cae en la
     española, y si falta el archivo entero, en la de emergencia. */
  function frase(lang) {
    var f = CONF.frase || {};
    return f[lang] || f.es || EMERGENCIA.frase;
  }

  /* 1155870867 -> 11 5587-0867 */
  function telVisible(tel) {
    if (tel.length !== 10) return tel;
    return tel.slice(0, 2) + ' ' + tel.slice(2, 6) + '-' + tel.slice(6);
  }

  function pintarPrecio(esAR) {
    var p = esAR ? PRECIOS.AR : PRECIOS.resto;
    var monto = document.getElementById('price');
    var moneda = document.getElementById('currency');
    if (!monto || !moneda) return;
    monto.setAttribute('data-count', p.monto);
    monto.textContent = window.mlpcNumero(parseFloat(p.monto), decimales(p.monto));
    moneda.textContent = ' ' + p.moneda;
  }

  /* --- pais de la IP --- */

  function fromCountry(cc) {
    if (!cc) return null;
    cc = String(cc).toUpperCase();
    for (var lang in COUNTRY) {
      if (COUNTRY[lang].indexOf(cc) > -1) return lang;
    }
    return FALLBACK;                       /* pais conocido, idioma que no tenemos */
  }

  function countryFetch(done) {
    if (!window.fetch) return done(null);
    var i = 0;
    (function next() {
      if (i >= GEO.length) return done(null);
      var p = GEO[i++];
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = window.setTimeout(function () { if (ctl) ctl.abort(); }, 900);
      window.fetch(p.url, ctl ? { signal: ctl.signal } : undefined)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          window.clearTimeout(timer);
          var cc = j && p.pick(j);
          if (!cc) return next();
          done(cc);
        })
        .catch(function () { window.clearTimeout(timer); next(); });
    })();
  }

  function apply(lang) {
    var t = DICT[lang] || DICT[FALLBACK];
    document.documentElement.lang = lang;

    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].getAttribute('data-i18n');
      if (t[k] != null) nodes[i].textContent = conAnios(t[k]);
    }

    nodes = document.querySelectorAll('[data-i18n-html]');
    for (i = 0; i < nodes.length; i++) {
      var kh = nodes[i].getAttribute('data-i18n-html');
      if (t[kh] != null) nodes[i].innerHTML = conAnios(t[kh]);   /* el diccionario es nuestro, no entra nada de afuera */
    }

    /* atributos: data-i18n-attr="content:desc" */
    nodes = document.querySelectorAll('[data-i18n-attr]');
    for (i = 0; i < nodes.length; i++) {
      var pair = nodes[i].getAttribute('data-i18n-attr').split(':');
      if (t[pair[1]] != null) nodes[i].setAttribute(pair[0], conAnios(t[pair[1]]));
    }

    /* La frase sale de config_editor.js, que tiene una entrada por
       idioma: se muestra la del idioma detectado. */
    nodes = document.querySelectorAll('[data-frase]');
    for (i = 0; i < nodes.length; i++) {
      nodes[i].textContent = frase(lang);
    }

    /* Todos los botones de WhatsApp salen del MISMO numero, con el
       mensaje autocompletado en el idioma del visitante. */
    var tel = TELEFONO.replace(/\D/g, '');
    nodes = document.querySelectorAll('a[data-wa]');
    for (i = 0; i < nodes.length; i++) {
      nodes[i].href = 'https://wa.me/549' + tel + '?text=' + encodeURIComponent(t.wa);
    }

    /* el unico lugar donde el numero se lee escrito es el pie */
    nodes = document.querySelectorAll('[data-wa-texto]');
    for (i = 0; i < nodes.length; i++) {
      nodes[i].textContent = telVisible(tel);
    }

    /* la duracion tambien sale del archivo editable; se deja escrita en
       data-count y la pinta pintarNumeros() como cualquier otro numero */
    var dur = document.getElementById('duracion');
    if (dur) dur.setAttribute('data-count', DURACION);

    /* separadores segun el idioma: 89.999 / 89,999 · 89,99 / 89.99 */
    pintarNumeros();

    /* aviso de idioma de la sesion: solo si no hablamos el del visitante */
    var covered = SPOKEN.indexOf(lang) > -1;
    nodes = document.querySelectorAll('[data-lang-note]');
    for (i = 0; i < nodes.length; i++) nodes[i].hidden = covered;

    /* selector del header */
    var code = document.getElementById('langCode');
    if (code) code.textContent = lang.toUpperCase();
    nodes = document.querySelectorAll('.lang__opt');
    for (i = 0; i < nodes.length; i++) {
      var on = nodes[i].getAttribute('data-lang') === lang;
      nodes[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
  }

  /* --- fuentes --- */

  function fuentesListas(done) {
    if (!document.fonts || !document.fonts.load) return done();
    /* el texto de muestra decide que subconjunto baja: sin acentos, Google
       sirve solo el basico y despues cambia la tipografia en pantalla */
    var muestra = 'MÁS RÁPIDA ÜÖÇÃÊ 0123456789';
    var caras = ['700 1em Quantico', '400 1em Quantico',
                 '400 1em Archivo', '500 1em Archivo', '600 1em Archivo'];
    var cargas = [];
    for (var i = 0; i < caras.length; i++) {
      try { cargas.push(document.fonts.load(caras[i], muestra)); } catch (e) {}
    }
    Promise.all(cargas).then(function () { return document.fonts.ready; })
      .then(done, done);      /* si alguna falla, se muestra igual */
  }

  /* --- arranque ---
     Orden: se resuelven pais (idioma + moneda) y fuentes, se ajusta todo el
     contenido y AHI se muestra y se anima. Al reves se ve el idioma por
     defecto y el cambio de tipografia en la cara. */

  var q = /[?&]lang=([a-z-]{2,5})/i.exec(location.search);
  var forced = supported(q && q[1]);        /* solo la URL puede tapar a la IP */

  /* provisorio, todavia detras de la compuerta: si la IP no contesta, esto
     es lo que se muestra */
  var current = forced || fromZone() || fromBrowser() || FALLBACK;
  apply(current);
  pintarPrecio(zonaEsAR());

  var mostrado = false;
  function mostrar() {
    if (mostrado) return;
    mostrado = true;
    document.documentElement.classList.remove('booting');
    window.mlpcListo = true;
    try { document.dispatchEvent(new CustomEvent('mlpc:listo')); } catch (e) {}
  }

  var faltan = 2;                           /* pais + fuentes */
  function paso() { if (--faltan <= 0) mostrar(); }

  /* La consulta al pais se hace SIEMPRE, incluso con ?lang= forzado: el
     idioma se puede elegir, la moneda no. Nada de esto se cachea. */
  countryFetch(function (cc) {
    if (cc) {
      pintarPrecio(String(cc).toUpperCase() === 'AR');
      if (!forced) {                        /* si eligio idioma, no se lo toca */
        var byIp = fromCountry(cc);
        if (byIp && byIp !== current) {
          current = byIp;
          apply(current);
        }
      }
    }
    paso();
  });

  fuentesListas(paso);

  /* techo: la pagina no espera a nadie mas de 1,2 s */
  window.setTimeout(mostrar, 1200);

  /* --- selector del header: menu propio, sin guardar nada --- */

  var box = document.getElementById('langBox');
  var btn = document.getElementById('langBtn');
  var menu = document.getElementById('langMenu');

  if (box && btn && menu) {
    /* el menu se arma desde LANGS: agregar un idioma no toca el HTML */
    var items = '';
    for (var b = 0; b < LANGS.length; b++) {
      items += '<button class="lang__opt" type="button" role="option" aria-selected="false" data-lang="' +
               LANGS[b] + '"><span class="lang__abbr">' + LANGS[b].toUpperCase() + '</span>' +
               (NAMES[LANGS[b]] || LANGS[b]) + '</button>';
    }
    menu.innerHTML = items;

    var opts = menu.querySelectorAll('.lang__opt');
    var mark = menu.querySelector('[data-lang="' + current + '"]');
    if (mark) mark.setAttribute('aria-selected', 'true');

    var open = function (yes) {
      box.classList.toggle('is-open', yes);
      btn.setAttribute('aria-expanded', yes ? 'true' : 'false');
      if (yes) {
        var sel = menu.querySelector('[aria-selected="true"]') || opts[0];
        if (sel) sel.focus();
      }
    };

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      open(!box.classList.contains('is-open'));
    });

    for (var n = 0; n < opts.length; n++) {
      opts[n].addEventListener('click', function () {
        current = supported(this.getAttribute('data-lang')) || FALLBACK;
        apply(current);
        open(false);
        btn.focus();
      });
    }

    /* flechas para moverse, Escape para salir */
    menu.addEventListener('keydown', function (e) {
      var list = Array.prototype.slice.call(opts);
      var at = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var to = (at + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
        list[to].focus();
      } else if (e.key === 'Escape' || e.key === 'Tab') {
        open(false);
        if (e.key === 'Escape') btn.focus();
      }
    });

    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(true); }
      else if (e.key === 'Escape') open(false);
    });

    document.addEventListener('click', function (e) {
      if (!box.contains(e.target)) open(false);
    });
    window.addEventListener('scroll', function () {
      if (box.classList.contains('is-open')) open(false);
    }, { passive: true });
  }
})();
