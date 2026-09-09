# ML PC Performance — landing

Sitio estatico, sin build y sin dependencias. Se sube tal cual a cualquier
hosting (Netlify, Vercel, un FTP, Shopify como pagina custom) y funciona.

## Archivos

```
index.html        la pagina
css/theme.css     EL COLOR: --brand y toda la paleta derivada de ahi
css/styles.css    estilos (ningun color literal)
js/plexus.js      fondo reactivo al mouse, entradas, conteo de numeros
js/drag.js        arrastre de la pagina con el click, con inercia
```

## Ver en local

Necesita servirse por HTTP (abrir el archivo con doble click funciona, pero
`file://` no es representativo). Desde esta carpeta:

```
python -m http.server 5173
```

y abris http://localhost:5173

## Cambiar el color de todo el sitio

Una sola linea, en `css/theme.css`:

```css
--brand: #FF2E2E;
```

De ese hex salen el tono y la saturacion de los ~34 colores restantes. Las
claridades son fijas, asi el fondo sigue siendo casi negro y el texto legible
con cualquier color. El canvas del fondo y el favicon tambien lo leen.

## Antes de mandarla a produccion

1. Numero de WhatsApp: buscar `5491100000000` en `index.html` (4 lugares,
   incluido el texto visible del footer).
2. Los numeros del panel antes/despues, los 1.400 equipos y las 48 h son de
   ejemplo: confirmarlos con datos reales.
