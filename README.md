# ML PC Performance

Landing del servicio de puesta a punto de PC. Sitio estatico, sin build y sin
dependencias: se publica solo con GitHub Pages.

**En vivo:** https://mlpcperformance.com

## Archivos

```
index.html        la pagina (solo markup)
config_editor.js  EL UNICO ARCHIVO EDITABLE: precios, telefono, color y frase
css/theme.css     la paleta: toda derivada del --brand que pone el config
css/styles.css    estilos (ningun color literal)
js/i18n.js        TODA LA COPY, en 6 idiomas, y la deteccion por pais
js/plexus.js      fondo reactivo al mouse, entradas, conteo de numeros
js/drag.js        arrastre de la pagina con el click, con inercia
js/meta.js        pixel de Meta: eventos Contact y Lead al tocar WhatsApp
test-i18n.js      test de la deteccion de idioma: node test-i18n.js
EDIT/             herramienta del dueño para cambiar valores (NO se versiona)
CNAME             el dominio propio que usa GitHub Pages
.nojekyll         que Pages publique los archivos tal cual, sin procesarlos
```

## Ver en local

Necesita servirse por HTTP (`file://` no es representativo). Desde la raiz:

```
python -m http.server 5173
```

y abris http://localhost:5173

## Publicar

Cada push a `main` republica el sitio. En GitHub: Settings -> Pages ->
Source: "Deploy from a branch", Branch: `main`, carpeta `/ (root)`.

El dominio sale del archivo `CNAME`. Cuando el chequeo de DNS de a ✓, activar
"Enforce HTTPS" (el certificado tarda unos minutos en emitirse).

### DNS del dominio (Hostinger)

El dominio venia apuntado a Shopify; el 2026-09-09 se paso a GitHub Pages.

```
A      @      185.199.108.153        los cuatro, mismo nombre @
A      @      185.199.109.153
A      @      185.199.110.153
A      @      185.199.111.153
CNAME  www    Markitoo22.github.io
```

Opcional, para IPv6: cuatro AAAA en `@` a `2606:50c0:8000::153`,
`8001::153`, `8002::153` y `8003::153`.

Lo que quedo del setup viejo y NO hay que tocar:

- `TXT @ facebook-domain-verification=...` — verificacion de dominio de Meta,
  no tiene relacion con el hosting. Si se borra, se cae la verificacion del
  pixel y del catalogo.
- `CNAME cuenta -> shops.myshopify.com` — cuentas de cliente de Shopify. Solo
  afecta a ese subdominio, se borra cuando se de de baja la tienda.

Se elimino `A @ 23.227.38.65`, que era la IP de Shopify.

### Cache del CDN (el `?v=` de los links)

Pages esta detras de Fastly y sirve todo con `Cache-Control: max-age=600`.
Cada nodo del CDN guarda su propia copia, asi que dos redes distintas pueden
estar viendo versiones distintas hasta 10 minutos: es tipico ver el cambio en
la PC por WiFi y no en el celular por 4G, porque salen por nodos diferentes.

Los links a `css/` y `js/` en `index.html` llevan `?v=AAAAMMDD`. **Hay que
subir ese numero en cada deploy que toque CSS o JS**: al cambiar la URL, el
navegador y el CDN estan obligados a pedir el archivo de nuevo.

Para verificar desde afuera:

```
curl -sI https://mlpcperformance.com/css/styles.css | grep -iE "age|x-cache|etag"
```

`Age` es la antiguedad de la copia en ese nodo y `X-Served-By` dice cual es
(`-EZE` es Ezeiza). Para probar en el celular sin esperar, alcanza con abrir
`mlpcperformance.com/?1` y subir el numero.

## Idiomas

Toda la copy vive en `js/i18n.js` (40 claves x 6 idiomas: es, en, pt, fr, de,
it). El HTML solo tiene marcas `data-i18n="clave"`, y el texto que quedo
escrito ahi es el español, que es lo que se ve si el JS no carga.

Que idioma se muestra, en este orden:

1. `?lang=xx` en la URL — sirve para probar: `?lang=de`, `?lang=pt`
2. **el pais de su IP** — de donde se conecta de verdad
3. la zona horaria del equipo
4. el idioma del navegador
5. ingles

**No guarda nada.** El selector del header cambia el idioma solo para ese
momento: al recargar se detecta de cero. Es a proposito — asi el idioma
siempre refleja de donde se conecta el visitante, y probar con VPN no arrastra
el resultado de la prueba anterior.

El pais lo resuelve `api.country.is`, con `get.geojs.io` de respaldo: dos
servicios sin API key y con CORS abierto. La pagina espera esa respuesta antes
de mostrarse (ver "Arranque"). Si el servicio falla, tarda o lo bloquea un
adblocker, queda lo que decidio la zona horaria.

El menu del selector es propio, no un `<select>`: el nativo abre una lista del
sistema operativo que no se puede estilar. Se arma solo desde `LANGS`, asi que
agregar un idioma no toca el HTML.

La contra a saber: la IP del visitante pasa por un tercero. Si algun dia hace
falta evitarlo, se borra el bloque `GEO` y la deteccion sigue funcionando con
la zona horaria.

La logica tiene test: `node test-i18n.js` (en la raiz del repo) cubre 13 casos
(VPN, moneda por ubicacion, API caida, respaldos), que no se guarde estado, que
la compuerta de arranque siempre se levante, y la paridad de claves entre los
6 idiomas.

### Arranque (por que la pagina no se ve al instante)

El contenido espera detras de una compuerta hasta que estan resueltos el pais
(idioma + moneda) y las fuentes. Sin eso se ve el idioma por defecto y el
cambio de tipografia en la cara, porque el pais llega ~200 ms tarde y las
fuentes de Google mas tarde todavia.

El orden es: se consulta la IP -> se fija idioma y moneda -> se ajusta el
contenido -> se muestra y se anima.

- La clase `booting` la pone un script inline en el `<head>` de `index.html`,
  antes del primer pintado, y la saca `js/i18n.js` cuando termina.
- Ese script inline tiene un `setTimeout` de 1.6 s como red de seguridad: si
  el JS explota, la pagina aparece igual. Sin JS la clase nunca se agrega.
- `js/i18n.js` tiene su propio techo de 1,2 s: pasado eso muestra con lo que
  haya, aunque falte el pais.
- El fondo (plexus + viñeta) si se ve durante la espera: la hace parecer
  intencional y no una pagina en blanco.
- Al levantarse dispara `mlpc:listo`, y ahi `js/plexus.js` arranca las
  entradas y el conteo de numeros.
- Hay tres `preconnect` en el head (googleapis, gstatic y api.country.is) para
  que ese arranque sea lo mas corto posible.

### Precio y moneda

Dos monedas, y nada mas: **89.999 ARS** para quien se conecta desde Argentina,
**89,99 USD** para todos los demas. Los montos estan en `PRECIOS`, dentro de
`js/i18n.js`.

La moneda depende ESTRICTAMENTE de la ubicacion, nunca del idioma:

- Un mexicano lee la pagina en español y paga en USD.
- Un argentino con Windows en ingles la lee en ingles y paga en ARS.
- `?lang=de` cambia el idioma pero no la moneda.
- Cambiar el idioma con el selector tampoco la cambia: solo re-formatea el
  numero (`89.999` en es, `89,999` en en, `89,99` vs `89.99` para USD).

El pais sale de la IP. Antes de que llegue esa respuesta se usa la zona
horaria del equipo, que tambien es ubicacion y no idioma; si la API falla,
esa es la decision que queda.

**Idiomas que se pueden atender:** `SPOKEN` en `js/i18n.js`, hoy es y en. A
quien llega en cualquier otro idioma se le avisa antes de que escriba ("las
sesiones son en español o ingles") y el mensaje que se autocompleta en
WhatsApp le sale en ingles.

- Agregar un idioma: su bloque en `DICT`, su codigo en `LANGS`, sus paises en
  `COUNTRY`, su nombre en `NAMES` y (opcional) sus zonas en `ZONES`.
- Sacar uno: borrarlo de `LANGS`.

## Pixel de Meta

Sirve para que Meta optimice la campaña hacia gente que realmente toca el
boton de WhatsApp, en vez de hacia clicks baratos.

**El ID del pixel se pone en un solo lugar**, en el `<head>` de `index.html`:

```js
window.MLPC_PIXEL = '';      // 15 o 16 digitos
```

Sale de Events Manager -> Origenes de datos -> el pixel. Mientras ese campo
este vacio la pagina no carga nada de Meta: ni el script, ni las cookies.

`js/meta.js` escucha el click en los cuatro botones de WhatsApp y manda dos
eventos estandar sobre ese mismo click:

| Evento    | Como se llama en Ads Manager |
|-----------|------------------------------|
| `Contact` | Contactar                    |
| `Lead`    | Cliente potencial            |

**Son el mismo click contado dos veces.** En Ads Manager hay que elegir UNO
como evento de conversion (usar `Lead`) y leer el otro como dato. Sumarlos da
el doble de lo que paso.

Cada evento lleva dos parametros:

- `content_name`: que boton fue (`header`, `hero`, `cierre`, `footer`)
- `content_category`: en que idioma estaba la pagina (`es`, `en`, `pt`...)

Detalles de la implementacion:

- El listener esta en `document` y en fase de burbuja **a proposito**:
  `js/drag.js` mata el click con un listener de captura en `window` cuando el
  puntero se movio mas de 6 px, asi que arrastrar la pagina y soltar arriba
  del boton no dispara un lead falso.
- Dos clicks al mismo boton dentro de 1,2 s cuentan como uno.
- Lo que se mide es la INTENCION (abrio WhatsApp), no la conversacion: lo que
  se hable adentro de WhatsApp no se ve desde la web. Para eso haria falta la
  API de Conversiones mandando el evento desde el telefono o el CRM.

### Que falta hacer del lado de Meta

1. Pegar el ID en `index.html` y publicar.
2. Entrar a la pagina y tocar un boton de WhatsApp. **Hasta que el pixel no
   recibe su primer evento, el desplegable de "evento de conversion" aparece
   vacio**: Meta solo lista eventos que ya vio.
3. Verificarlo en Events Manager -> Probar eventos, con la URL del sitio.
4. Events Manager -> Configuracion de eventos web -> priorizar los eventos del
   dominio. Sin esto, el trafico de iPhone optimiza mucho peor.
5. En la campaña: conjunto de datos = el pixel, evento de conversion = Cliente
   potencial.

El dominio ya esta verificado en Meta desde la epoca de Shopify (el
`TXT facebook-domain-verification` del DNS), siempre que sea el mismo Business
Manager.

## config_editor.js — el unico archivo editable

Cuatro cosas cambian con el tiempo: los dos precios, el telefono, el color
y la frase. Viven todas en `config_editor.js`, en la raiz, y **no estan
escritas en ningun otro lado del sitio**.

```js
window.MLPC = {
  "precioAR": "89999",
  "precioUSD": "89.99",
  "telefono": "1155870867",
  "color": "#00d19d",
  "frase": { "es": "...", "en": "...", "pt": "...", "fr": "...", "de": "...", "it": "..." }
};
```

Quien lo consume:

| Valor | Quien lo usa |
|-------|--------------|
| `precioAR` / `precioUSD` | `PRECIOS` en `js/i18n.js`, segun el pais de la IP |
| `telefono` | los cuatro `[data-wa]` y el `[data-wa-texto]` del pie |
| `color` | `--brand`, que lo pone el propio archivo (ver abajo) |
| `frase` | el `[data-frase]` de abajo de las cajas, en el idioma detectado |

### Por que es .js y no .json

Un `.json` habria que traerlo con `fetch`, que contesta **despues** del
primer pintado. El color de marca se veria cambiar en la cara, porque el
fondo se ve durante el arranque a proposito. Un `<script>` comun en el
`<head>` corre antes de pintar.

El archivo pone el color el mismo, con un estilo en linea sobre `<html>`,
que le gana al `:root` de `css/theme.css`. El valor que quedo en
`theme.css` es el **color de emergencia**: solo se ve si este archivo no
carga o queda mal escrito, y por eso no hace falta mantenerlo al dia.

`js/i18n.js` tiene su propio bloque `EMERGENCIA` con la misma idea: si
`window.MLPC` no existe, el sitio no aparece vacio. No es una fuente de
verdad, es una red.

### Lo que se perdio a cambio

Sin JavaScript el sitio ya se veia a medias (el idioma, la moneda y la
compuerta de arranque son todos JS). Ahora, ademas, **los botones de
WhatsApp no tienen `href` hasta que corre el JS** y el precio muestra un
guion. Se acepto a proposito: la alternativa era mantener copias de cada
valor en el HTML, que es justo la fragilidad que este archivo elimina. Un
`href` viejo apuntando a otro numero es peor que un boton inerte.

Los buscadores ejecutan JS, y las previsualizaciones de link usan el
`<title>` y el `<meta description>`, que siguen escritos en el HTML.

## EDIT/ — la herramienta del dueño

Un `.exe` de Go (7 MB, sin dependencias) que abre una pagina local en el
navegador y publica por la API de GitHub, **sin git instalado**. Esta en
`.gitignore` porque no es parte del sitio.

Lo importante del diseño: **escribe `config_editor.js` completo, generado
desde los valores.** No parsea HTML ni CSS, asi que el markup del sitio
puede cambiar todo lo que quiera sin romper la herramienta. Lo unico que
toca de `index.html` es el `?v=`, que es un patron estable y ademas se
verifica antes de reemplazar: si no engancha, el publicado se aborta con
un mensaje que dice que falto y en que archivo, en vez de subir a medias.

- Lee los valores del repo en vivo al abrir: lo que muestra es siempre lo
  que esta publicado.
- La frase se traduce con Google Translate (el endpoint sin clave que usa
  la extension de Chrome, con un segundo de respaldo) y las traducciones
  se muestran editables **antes** de publicar.
- Publica un solo commit con blob -> tree -> commit -> ref: o entra todo o
  no entra nada. Relee el archivo justo antes de escribir, asi no pisa un
  cambio hecho desde otro lado.
- Cada campo tiene un boton que lo devuelve a su valor **original** (la
  variable `iniciales` de `EDIT/main.go`, horneada en el binario): los
  valores con los que salio el sitio no se pierden por mas veces que se
  publique encima. Es distinto de "Volver a lo publicado", que vuelve a
  lo que esta online. Para mover esa linea de base hay que editar
  `iniciales` y recompilar.
- **Se apaga solo cuando se cierra el navegador.** La pagina manda un
  latido a `/api/latido` cada 15 s y el programa se cierra si pasan 120
  sin ninguno. Sin eso quedaria un proceso huerfano invisible, porque se
  compila con `-H windowsgui` y no tiene consola ni ventana. El margen de
  120 s es a proposito: los navegadores frenan los temporizadores de las
  pestañas en segundo plano hasta uno por minuto, y una recarga tambien
  deja un hueco. Para probarlo rapido: `MLPC_EDITOR_LATIDO=6`.
- La llave de GitHub se guarda en la carpeta de configuracion del usuario
  (`%APPDATA%`), **no** al lado del exe: mover el programa no la pierde, y
  GitHub muestra el token una sola vez. Si existe un `editor-config.json`
  al lado del exe, ese gana (modo pendrive). En los dos casos queda fuera
  del repo.
- `cd EDIT && go test ./...` prueba contra los archivos reales del repo:
  que `config_editor.js` se lea, que lo generado vuelva a leerse igual
  (ida y vuelta), que un archivo roto avise con claridad, que ningun valor
  invalido llegue a publicarse, y que el `?v=` de `index.html` siga
  estando.

Para revisar la interfaz sin que se abra el navegador:

```
MLPC_EDITOR_PUERTO=8123 MLPC_EDITOR_SIN_NAVEGADOR=1 ./Editor.exe
```

Las instrucciones para el dueño estan en `EDIT/LEEME.txt`.

## El destello de la frase

La frase de abajo de las cajas tiene un reflejo que la cruza cada 3
segundos. Dos decisiones que no se ven pero sostienen el efecto:

**No es una capa de luz por encima.** Las dos lineas y el texto se
**pintan** con el degradado del destello, asi solo se ve donde hay tinta
y nada sobre el fondo. En el texto eso se consigue con `background-clip:
text`, detras de un `@supports` porque necesita `color: transparent`: sin
el recorte por texto la frase quedaria invisible.

**`background-attachment: fixed` es lo que lo hace UN reflejo que viaja.**
Pone el degradado en coordenadas del viewport, asi que las tres piezas
muestran su tajada del mismo dibujo. Con backgrounds normales, cada una
se mediria contra su propia caja y los tres destellos prenderian a la
vez, sin recorrido. La posicion se anima una sola vez, en `.claim`, sobre
una propiedad `@property` heredada: las tres van sincronizadas por
construccion.

El recorrido va de `-45vw` a `130vw` (la banda mide `34vw`), asi arranca y
termina fuera de la pantalla, y el `linear` es a proposito: con easing se
percibe un frenado justo antes de desaparecer. Del ciclo de 3 s, cruza en
1,35 y el resto espera fuera de cuadro.

El color sale de `--claim-shine`, que es casi blanco y no del tono de la
marca: el destello va ENCIMA del color de marca, asi que con el mismo
tono no aclararia nada.

## Logo

El escudo ML es un SVG **inline** en el header de `index.html` (id `logo-ml`),
vectorizado a partir de `referencia para hacer un svg.png`. Va inline y no como
archivo para que herede `currentColor` y los tokens del tema.

- Los rellenos salen de clases (`.l-ink`, `.l-field`, `.l-shade`) definidas en
  `css/styles.css`, no de `fill="var(--x)"`: el var() en atributos de
  presentacion tuvo bugs en Safari.
- Los dos azules del original (#013067 / #001A3D) son el mismo tono con dos
  claridades, asi que se derivan del brand: `--logo-field` (20%) y
  `--logo-shade` (12%) en `css/theme.css`. El logo acompaña al color del sitio.
- **El favicon se genera desde ese mismo SVG** en `js/plexus.js`: lo clona,
  reemplaza cada relleno por su color ya resuelto (un `data:` URI no ve el CSS)
  y lo mete en el `<link rel="icon">`. Asi el dibujo existe una sola vez.

Fidelidad medida contra el PNG original, rasterizando los paths y comparando
mascaras: 99,3 % la silueta del escudo, 97,4 % las letras.

## Cambiar el color de todo el sitio

Desde la herramienta de `EDIT/`, o a mano en `config_editor.js`:

```js
"color": "#FF2E2E"
```

El `--brand` de `css/theme.css` es el color de emergencia, el que se ve
si `config_editor.js` no carga.

De ese hex salen el tono y la saturacion de los ~34 colores restantes. Las
claridades son fijas, asi el fondo sigue siendo casi negro y el texto legible
con cualquier color. El canvas del fondo y el favicon tambien lo leen.

Requiere color relativo de CSS: Chrome/Edge 119+, Safari 16.4+, Firefox 128+.

## Antes de mandarla a produccion

1. Son de ejemplo y hay que confirmarlos: los numeros del panel antes/despues,
   los 90 min de duracion, las 790 configuraciones y los dos precios
   (89.999 ARS / 89,99 USD).

El servicio es 100% REMOTO: nada de la copia puede implicar tocar la maquina
en persona (desarmar, pasta termica, retiro y entrega a domicilio).

## WhatsApp

El numero esta en `config_editor.js` y de ahi salen los cuatro botones y
el texto del pie. Formato del link: `54` + `9` (movil) + `11`
(area, sin el 0) + numero (sin el 15).

Para cambiarlo no hace falta tocar codigo: esta en la herramienta de
`EDIT/`. A mano, es ese unico valor; los `href` los arma `js/i18n.js`.

El mensaje que se autocompleta es la clave `wa` de cada idioma.
