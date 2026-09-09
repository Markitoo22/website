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

## Idiomas

Toda la copy vive en `js/i18n.js` (42 claves x 6 idiomas: es, en, pt, fr, de,
it). El HTML solo tiene marcas `data-i18n="clave"`, y el texto que quedo
escrito ahi es el español, que es lo que se ve si el JS no carga.

Que idioma se muestra, en este orden:

1. `?lang=xx` en la URL — sirve para probar: `?lang=de`, `?lang=pt`
2. lo que el visitante haya elegido en el selector (queda guardado)
3. **el pais de su IP** — de donde se conecta de verdad
4. la zona horaria del equipo
5. el idioma del navegador
6. ingles

El pais lo resuelve `api.country.is`, con `get.geojs.io` de respaldo: dos
servicios sin API key y con CORS abierto. La pagina no espera la respuesta:
pinta al instante con la zona horaria y reescribe los textos cuando llega el
pais (~200 ms), solo si dio otro idioma. El pais queda cacheado 12 h, asi que
desde la segunda visita sale de una y sin llamada. Si el servicio falla, tarda
o lo bloquea un adblocker, queda lo que decidio la zona horaria.

La contra a saber: la IP del visitante pasa por un tercero. Si algun dia hace
falta evitarlo, se borra el bloque `GEO` y la deteccion sigue funcionando con
la zona horaria.

La logica tiene test: `node test-i18n.js` (en la raiz del repo) cubre
los 10 casos (VPN, cache, API caida, fallbacks).

**Idiomas que se pueden atender:** `SPOKEN` en `js/i18n.js`, hoy es y en. A
quien llega en cualquier otro idioma se le avisa antes de que escriba ("las
sesiones son en español o ingles") y el mensaje que se autocompleta en
WhatsApp le sale en ingles.

- Agregar un idioma: sumar su bloque a `DICT`, su codigo a `LANGS`, sus zonas
  horarias a `ZONES` y un `<option>` al selector del header.
- Sacar uno: borrarlo de `LANGS` y su `<option>`.

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

1. Los numeros del panel antes/despues, los 1.400 equipos y los 90 min de
   sesion son de ejemplo: confirmarlos con datos reales.

El servicio es 100% REMOTO: nada de la copia puede implicar tocar la maquina
en persona (desarmar, pasta termica, retiro y entrega a domicilio).

## WhatsApp

Los cuatro botones apuntan a `https://wa.me/5491155870867` con el mensaje ya
escrito. Formato del link: `54` + `9` (movil) + `11` (area, sin el 0) +
numero (sin el 15). Si cambia el numero, hay que tocarlo en 4 lugares de
`index.html`, incluido el texto visible del footer.
