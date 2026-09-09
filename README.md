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

El dominio sale del archivo `CNAME`. Del lado del DNS, para el apex hacen
falta los registros A (y AAAA) que GitHub muestra en Settings -> Pages.

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
