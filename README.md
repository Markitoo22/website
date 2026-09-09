# ML PC Performance

Landing del servicio de puesta a punto de PC. Sitio estatico, sin build y sin
dependencias: se publica solo con GitHub Pages.

**En vivo:** https://mlpcperformance.com

## Archivos

```
index.html        la pagina
css/theme.css     EL COLOR: --brand y toda la paleta derivada de ahi
css/styles.css    estilos (ningun color literal)
js/plexus.js      fondo reactivo al mouse, entradas, conteo de numeros
js/drag.js        arrastre de la pagina con el click, con inercia
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

1. Numero de WhatsApp: buscar `5491100000000` en `index.html` (4 lugares,
   incluido el texto visible del footer).
2. Los numeros del panel antes/despues, los 1.400 equipos y las 48 h son de
   ejemplo: confirmarlos con datos reales.
