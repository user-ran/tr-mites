# Catálogo interactivo de trámites · Registro Agrario Nacional

Sitio estático (HTML + CSS + JS, sin dependencias ni compilación) con 41 fichas de trámites del RAN.

## Publicar en GitHub Pages
1. Crea un repositorio en GitHub y sube **todo el contenido de esta carpeta** (que `index.html` quede en la raíz).
2. En el repositorio: **Settings → Pages → Build and deployment → Deploy from a branch**.
3. Elige la rama `main` y la carpeta `/ (root)` → **Save**.
4. En 1–2 minutos estará en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

Para probarlo en tu computadora: abre `index.html` o ejecuta `python3 -m http.server` en esta carpeta.

## Estructura
- `index.html` – página
- `css/styles.css` – estilos (colores en variables `:root`)
- `js/app.js` – buscador inteligente, filtros, tarjetas y ficha interactiva
- `data/tramites.js` – datos de los trámites (se edita aquí)
- `assets/` – logo oficial del RAN, favicon (PNG/ICO), ilustración del encabezado e imagen para compartir

## Notas
- Datos extraídos de gob.mx el 19-oct-2026. RAN-04-004 no existe en el sitio y no se incluye.
- En requisitos se limpió la numeración duplicada ("6. 1. Formato…"); el resto del texto es literal.
- El encabezado usa `assets/logo-ran-horizontal.png` (versión clara del logo oficial, para fondo guinda); el favicon usa solo el emblema de las parcelas sobre fondo blanco.

## Actualización DOF 12/11/2025 y 19/02/2026
- 41 fichas activas; 16 con distintivo «Trámite simplificado» (7 del DOF 12/11/2025 y 9 del 19/02/2026); 25 sin cambios directos.
- 16 homoclaves absorbidas (`abs` en `data/tramites.js`): se buscan y redirigen a la ficha vigente (`#/RAN-04-047` → `#/RAN-04-046`).
- El estado «Plazo de adecuación transcurrido / Dentro del plazo de adecuación» se calcula con la fecha del visitante (constante `ADEC` en `js/app.js`). Para el acuerdo del 12/11/2025 no se publica fecha de término de los 120 días hábiles (el cómputo oficial no está validado); solo se muestra el estado «transcurrido». Solo refleja el plazo legal, no el avance de implementación.
- Filtro «Simplificación» en el catálogo (`?simp=si|no`).
