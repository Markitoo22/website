/* ==================================================================
   Multiidioma.

   Que idioma se muestra, en este orden:
     1. ?lang=xx en la URL            (para compartir un link ya traducido)
     2. la eleccion guardada          (si el visitante toco el selector)
     3. LA ZONA HORARIA del equipo    (de donde se conecta)
     4. el idioma del navegador       (si la zona no esta mapeada)
     5. ingles

   La zona horaria va antes que el idioma del navegador a proposito: un
   gamer argentino con Windows en ingles tiene que ver la pagina en
   espanol. No usa geolocalizacion por IP porque eso obligaria a pedirle
   permiso o a llamar a una API externa en cada visita.

   Para AGREGAR un idioma: sumar su bloque a DICT, su codigo a LANGS y,
   si hace falta, sus zonas a ZONES. Nada mas.
   Para SACAR uno: borrarlo de LANGS.
   ================================================================== */
(function () {
  'use strict';

  var LANGS = ['es', 'en', 'pt', 'fr', 'de', 'it'];
  var FALLBACK = 'en';

  /* Idiomas en los que se puede atender la sesion. Al visitante que llega
     en cualquier otro se le avisa antes de que escriba, y el mensaje que
     se autocompleta en WhatsApp sale en ingles. */
  var SPOKEN = ['es', 'en'];

  var DICT = {

    es: {
      desc: 'Puesta a punto de PC 100% remota: más FPS, menos temperatura, menos ruido. 15 años optimizando equipos.',
      eyebrow_hero: 'Puesta a punto remota · desde 2011',
      h1: 'El <em>doble</em> de FPS.<span>La mitad de grados.</span>',
      sub: 'Optimización remota, medida antes y después. <b>15 años</b> y más de <b>1.400 equipos</b>.',
      cta_hero: 'Pedir turno',
      link_results: 'Ver resultados',
      note_hero: '100% remoto · sin mover la máquina · respondo el mismo día',
      sec_results: 'Antes / después',
      rig: 'Ryzen 5 5600 · RTX 3060 · 1080p alto',
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
      s_years: 'Años optimizando',
      s_rigs: 'Equipos afinados',
      s_session: 'Dura la sesión',
      sec_steps: 'Qué le hago a tu PC',
      steps_meta: '4 pasos · en orden',
      st1_t: 'Conexión remota',
      st1_d: 'Ves en pantalla todo lo que hago.',
      st2_t: 'Diagnóstico',
      st2_d: 'Temperaturas, frametimes y cuellos de botella.',
      st3_t: 'Afinado',
      st3_d: 'Undervolt, ventiladores, Windows, drivers y latencia.',
      st4_t: 'Verificación',
      st4_d: 'Benchmark final y los números en la mano.',
      eyebrow_close: 'Cupos limitados por semana',
      close_h: '¿Arrancamos?',
      cta_close: 'Escribime por WhatsApp',
      note_close: 'Coordinamos día y horario',
      session_lang: 'Las sesiones son en español o inglés.',
      wa: 'Hola! Quiero una puesta a punto de mi PC'
    },

    en: {
      desc: '100% remote PC tune-up: more FPS, lower temperatures, less noise. 15 years optimizing rigs.',
      eyebrow_hero: 'Remote PC tune-up · since 2011',
      h1: '<em>Double</em> the FPS.<span>Half the heat.</span>',
      sub: 'Remote optimization, measured before and after. <b>15 years</b> and <b>1,400+ rigs</b>.',
      cta_hero: 'Book a session',
      link_results: 'See results',
      note_hero: '100% remote · your PC never leaves your desk · same-day reply',
      sec_results: 'Before / after',
      rig: 'Ryzen 5 5600 · RTX 3060 · 1080p high',
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
      s_years: 'Years optimizing',
      s_rigs: 'Rigs tuned',
      s_session: 'Session length',
      sec_steps: 'What I do to your PC',
      steps_meta: '4 steps · in order',
      st1_t: 'Remote session',
      st1_d: 'You watch everything I do, on your screen.',
      st2_t: 'Diagnosis',
      st2_d: 'Temperatures, frametimes and bottlenecks.',
      st3_t: 'Tuning',
      st3_d: 'Undervolt, fan curves, Windows, drivers and latency.',
      st4_t: 'Verification',
      st4_d: 'Final benchmark, numbers in hand.',
      eyebrow_close: 'Limited slots each week',
      close_h: 'Shall we?',
      cta_close: 'Message me on WhatsApp',
      note_close: "We'll pick a day and time",
      session_lang: 'Sessions are run in Spanish or English.',
      wa: 'Hi! I want a PC tune-up'
    },

    pt: {
      desc: 'Otimização de PC 100% remota: mais FPS, menos temperatura, menos ruído. 15 anos otimizando máquinas.',
      eyebrow_hero: 'Otimização remota · desde 2011',
      h1: 'O <em>dobro</em> de FPS.<span>Metade dos graus.</span>',
      sub: 'Otimização remota, medida antes e depois. <b>15 anos</b> e mais de <b>1.400 máquinas</b>.',
      cta_hero: 'Agendar sessão',
      link_results: 'Ver resultados',
      note_hero: '100% remoto · sem sair de casa · respondo no mesmo dia',
      sec_results: 'Antes / depois',
      rig: 'Ryzen 5 5600 · RTX 3060 · 1080p alto',
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
      s_years: 'Anos otimizando',
      s_rigs: 'Máquinas ajustadas',
      s_session: 'Duração da sessão',
      sec_steps: 'O que eu faço no seu PC',
      steps_meta: '4 passos · em ordem',
      st1_t: 'Conexão remota',
      st1_d: 'Você vê na tela tudo o que eu faço.',
      st2_t: 'Diagnóstico',
      st2_d: 'Temperaturas, frametimes e gargalos.',
      st3_t: 'Ajuste',
      st3_d: 'Undervolt, ventoinhas, Windows, drivers e latência.',
      st4_t: 'Verificação',
      st4_d: 'Benchmark final e os números na mão.',
      eyebrow_close: 'Vagas limitadas por semana',
      close_h: 'Vamos?',
      cta_close: 'Fale comigo no WhatsApp',
      note_close: 'Combinamos dia e horário',
      session_lang: 'As sessões são feitas em espanhol ou inglês.',
      /* el mensaje sale en ingles: es el idioma en que se puede responder */
      wa: 'Hi! I want a PC tune-up'
    },

    fr: {
      desc: 'Optimisation PC 100 % à distance : plus de FPS, moins de chaleur, moins de bruit. 15 ans de métier.',
      eyebrow_hero: 'Optimisation PC à distance · depuis 2011',
      h1: '<em>Deux fois</em> plus de FPS.<span>Deux fois moins chaud.</span>',
      sub: 'Optimisation à distance, mesurée avant et après. <b>15 ans</b> et plus de <b>1 400 machines</b>.',
      cta_hero: 'Réserver une session',
      link_results: 'Voir les résultats',
      note_hero: '100 % à distance · sans déplacer la machine · réponse le jour même',
      sec_results: 'Avant / après',
      rig: 'Ryzen 5 5600 · RTX 3060 · 1080p élevé',
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
      s_years: "Ans d'optimisation",
      s_rigs: 'Machines optimisées',
      s_session: 'Durée de la session',
      sec_steps: 'Ce que je fais à votre PC',
      steps_meta: '4 étapes · dans l’ordre',
      st1_t: 'Connexion à distance',
      st1_d: "Vous voyez à l'écran tout ce que je fais.",
      st2_t: 'Diagnostic',
      st2_d: "Températures, frametimes et goulots d'étranglement.",
      st3_t: 'Réglages',
      st3_d: 'Undervolt, ventilateurs, Windows, pilotes et latence.',
      st4_t: 'Vérification',
      st4_d: 'Benchmark final, chiffres en main.',
      eyebrow_close: 'Places limitées chaque semaine',
      close_h: 'On commence ?',
      cta_close: 'Écrivez-moi sur WhatsApp',
      note_close: 'On choisit le jour et l’heure',
      session_lang: 'Les sessions se déroulent en espagnol ou en anglais.',
      wa: 'Hi! I want a PC tune-up'
    },

    de: {
      desc: '100 % remote PC-Optimierung: mehr FPS, weniger Hitze, weniger Lärm. 15 Jahre Erfahrung.',
      eyebrow_hero: 'Remote PC-Optimierung · seit 2011',
      h1: '<em>Doppelt</em> so viele FPS.<span>Halb so heiß.</span>',
      sub: 'Remote-Optimierung, vorher und nachher gemessen. <b>15 Jahre</b> und über <b>1.400 Rechner</b>.',
      cta_hero: 'Termin buchen',
      link_results: 'Ergebnisse ansehen',
      note_hero: '100 % remote · der Rechner bleibt bei dir · Antwort am selben Tag',
      sec_results: 'Vorher / nachher',
      rig: 'Ryzen 5 5600 · RTX 3060 · 1080p hoch',
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
      s_years: 'Jahre Optimierung',
      s_rigs: 'Optimierte Rechner',
      s_session: 'Dauer der Sitzung',
      sec_steps: 'Was ich mit deinem PC mache',
      steps_meta: '4 Schritte · der Reihe nach',
      st1_t: 'Remote-Verbindung',
      st1_d: 'Du siehst auf dem Bildschirm alles, was ich mache.',
      st2_t: 'Diagnose',
      st2_d: 'Temperaturen, Frametimes und Flaschenhälse.',
      st3_t: 'Feinabstimmung',
      st3_d: 'Undervolt, Lüfterkurven, Windows, Treiber, Latenz.',
      st4_t: 'Nachweis',
      st4_d: 'Abschluss-Benchmark, Zahlen auf dem Tisch.',
      eyebrow_close: 'Begrenzte Plätze pro Woche',
      close_h: 'Legen wir los?',
      cta_close: 'Schreib mir auf WhatsApp',
      note_close: 'Wir finden Tag und Uhrzeit',
      session_lang: 'Die Sitzungen finden auf Spanisch oder Englisch statt.',
      wa: 'Hi! I want a PC tune-up'
    },

    it: {
      desc: 'Ottimizzazione PC 100% da remoto: più FPS, meno temperatura, meno rumore. 15 anni di esperienza.',
      eyebrow_hero: 'Ottimizzazione PC da remoto · dal 2011',
      h1: 'Il <em>doppio</em> di FPS.<span>Metà dei gradi.</span>',
      sub: 'Ottimizzazione da remoto, misurata prima e dopo. <b>15 anni</b> e oltre <b>1.400 macchine</b>.',
      cta_hero: 'Prenota una sessione',
      link_results: 'Vedi i risultati',
      note_hero: "100% da remoto · il PC resta dov'è · risposta lo stesso giorno",
      sec_results: 'Prima / dopo',
      rig: 'Ryzen 5 5600 · RTX 3060 · 1080p alto',
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
      s_years: 'Anni di ottimizzazione',
      s_rigs: 'Macchine ottimizzate',
      s_session: 'Durata della sessione',
      sec_steps: 'Cosa faccio al tuo PC',
      steps_meta: '4 passi · in ordine',
      st1_t: 'Connessione remota',
      st1_d: 'Vedi sullo schermo tutto quello che faccio.',
      st2_t: 'Diagnosi',
      st2_d: 'Temperature, frametime e collo di bottiglia.',
      st3_t: 'Messa a punto',
      st3_d: 'Undervolt, ventole, Windows, driver e latenza.',
      st4_t: 'Verifica',
      st4_d: 'Benchmark finale, numeri alla mano.',
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

  var STORE = 'mlpc.lang';

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

  function stored() {
    try { return supported(localStorage.getItem(STORE)); } catch (e) { return null; }
  }

  function detect() {
    var q = /[?&]lang=([a-z-]{2,5})/i.exec(location.search);
    return supported(q && q[1]) || stored() || fromZone() || fromBrowser() || FALLBACK;
  }

  function apply(lang) {
    var t = DICT[lang] || DICT[FALLBACK];
    document.documentElement.lang = lang;

    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].getAttribute('data-i18n');
      if (t[k] != null) nodes[i].textContent = t[k];
    }

    nodes = document.querySelectorAll('[data-i18n-html]');
    for (i = 0; i < nodes.length; i++) {
      var kh = nodes[i].getAttribute('data-i18n-html');
      if (t[kh] != null) nodes[i].innerHTML = t[kh];   /* el diccionario es nuestro, no entra nada de afuera */
    }

    /* atributos: data-i18n-attr="content:desc" */
    nodes = document.querySelectorAll('[data-i18n-attr]');
    for (i = 0; i < nodes.length; i++) {
      var pair = nodes[i].getAttribute('data-i18n-attr').split(':');
      if (t[pair[1]] != null) nodes[i].setAttribute(pair[0], t[pair[1]]);
    }

    /* el mensaje que se autocompleta en WhatsApp, en el idioma del visitante */
    nodes = document.querySelectorAll('a[href*="wa.me"]');
    for (i = 0; i < nodes.length; i++) {
      nodes[i].href = nodes[i].href.split('?')[0] + '?text=' + encodeURIComponent(t.wa);
    }

    /* separador de miles segun el idioma: 1.400 / 1,400 / 1 400 */
    var nf = new Intl.NumberFormat(lang);
    nodes = document.querySelectorAll('[data-count]');
    for (i = 0; i < nodes.length; i++) {
      nodes[i].textContent = nf.format(parseFloat(nodes[i].getAttribute('data-count')));
    }

    /* aviso de idioma de la sesion: solo si no hablamos el del visitante */
    var covered = SPOKEN.indexOf(lang) > -1;
    nodes = document.querySelectorAll('[data-lang-note]');
    for (i = 0; i < nodes.length; i++) nodes[i].hidden = covered;

    var sel = document.getElementById('lang');
    if (sel) sel.value = lang;
  }

  var current = detect();
  apply(current);

  var select = document.getElementById('lang');
  if (select) {
    select.addEventListener('change', function () {
      current = supported(select.value) || FALLBACK;
      try { localStorage.setItem(STORE, current); } catch (e) {}
      apply(current);
    });
  }
})();
