/* ==================================================================
   EL UNICO ARCHIVO EDITABLE DEL SITIO

   Aca viven los valores que cambian con el tiempo: los dos precios, la
   duracion de la sesion, el color de la marca y la frase.
   Todo el resto del sitio los lee de aca; no estan escritos en ningun
   otro lado.

   El telefono de WhatsApp NO esta aca a proposito: es fijo y vive en el
   href de los botones, en index.html. Asi WhatsApp funciona aunque el
   JavaScript no llegue a correr, que es lo unico de la pagina que tiene
   que funcionar si o si. Si algun dia cambia, se cambia ahi.

   Lo reescribe COMPLETO la herramienta de EDIT/ cada vez que se
   publica, asi que no agregues codigo ni comentarios adentro del
   objeto: se pierden en la proxima publicacion. A mano tambien se
   puede editar, son valores y no logica, pero tiene que quedar JSON
   valido o el sitio usa los valores de emergencia.

   Es .js y no .json A PROPOSITO: un .json habria que traerlo con
   fetch, que contesta despues del primer pintado, y el color de marca
   se veria cambiar en la cara (el fondo se ve durante el arranque). Un
   <script> comun en el <head> corre antes de pintar. El contenido es
   JSON igual; lo unico distinto es como lo carga el navegador.
   ================================================================== */
window.MLPC = {
    "precioAR": "79999",
    "precioUSD": "49.99",
    "duracion": "30",
    "color": "#00d19d",
    "frase": {
      "de": "Garantierte Lösung",
      "en": "Guaranteed solution",
      "es": "Solución garantizada",
      "fr": "Solution garantie",
      "it": "Soluzione garantita",
      "pt": "Solução garantida"
    }
  };

/* El color, antes del primer pintado: un estilo en linea sobre <html>
   le gana al :root de css/theme.css, que queda como color de
   emergencia por si este archivo no carga o queda mal escrito. */
if (window.MLPC && window.MLPC.color) {
  document.documentElement.style.setProperty('--brand', window.MLPC.color);
}
