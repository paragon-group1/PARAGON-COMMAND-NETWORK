# Plataforma de acceso

Landing con logo central y despliegue de consola a pantalla completa.

## Estructura
- `index.html` — portada con botón ENTRAR
- `terminal.html` — consola eDEX-UI
- `styles.css` / `app.js` — estilos y lógica de la portada

## Cambiar el logo
Reemplaza `assets/logo.svg` por tu archivo, o edita el `src` de la
imagen en `index.html` (línea del bloque `<div class="frame">`).

## Cambiar el texto superior
En `index.html`, busca `SISTEMAS EN LÍNEA` dentro de `<header class="hud">`.

## Desplegar
1. Crea un repositorio público.
2. Sube todos los archivos a la raíz de la rama `main`.
3. Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`.
4. Guarda y espera el build. El sitio queda en `https://USUARIO.github.io/REPO/`.
