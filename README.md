# ML PC Performance

Landing del servicio de puesta a punto de PC. Sitio estatico, sin build y sin
dependencias: se publica solo con GitHub Pages.

**En vivo:** https://mlpcperformance.com

## Archivos

```
index.html        la pagina (solo markup)
css/theme.css     EL COLOR: --brand y toda la paleta derivada de ahi
css/styles.css    estilos (ningun color literal)
js/i18n.js        TODA LA COPY, en 6 idiomas, y la deteccion por pais
js/plexus.js      fondo reactivo al mouse, entradas, conteo de numeros
js/drag.js        arrastre de la pagina con el click, con inercia
js/meta.js        pixel de Meta: eventos Contact y Lead al tocar WhatsApp
test-i18n.js      test de la deteccion de idioma: node test-i18n.js
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

Toda la copy vive en `js/i18n.js` (39 claves x 6 idiomas: es, en, pt, fr, de,
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

Una sola linea, en `css/theme.css`:

```css
--brand: #FF2E2E;
```

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

Los cuatro botones apuntan a `https://wa.me/5491155870867` con el mensaje ya
escrito. Formato del link: `54` + `9` (movil) + `11` (area, sin el 0) +
numero (sin el 15). Si cambia el numero, hay que tocarlo en 4 lugares de
`index.html`, incluido el texto visible del footer.
