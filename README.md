# Nicolás Corera - Portfolio Personal

Sitio web de portfolio de **Nicolás Corera**, desarrollador Full Stack Jr. y estudiante de la Licenciatura en Sistemas en la Universidad Torcuato Di Tella (UTDT), Argentina.

**[Ver sitio en vivo](nicolascorera.com.ar)**

---

## Vista previa

Diseño oscuro y minimalista con una paleta violeta/púrpura, animaciones con GSAP y una presentación visual pensada para destacar los proyectos.

## Características

- **Cursor personalizado** con punto y anillo animado (solo en escritorio con mouse).
- **Barra de navegación flotante** con efecto glassmorphism y menú hamburguesa responsive.
- **Sección Hero** en dos columnas: texto a la izquierda y panel visual animado a la derecha, con chips flotantes de tecnologías (JS, Firebase, HTML/CSS, Node.js, Git, React).
- **Sobre mí**, con texto descriptivo y tarjetas de estadísticas.
- **Stack tecnológico** con etiquetas que se animan al hacer scroll.
- **Proyectos destacados** en una grilla de tarjetas.
- **Contacto** con enlaces a redes sociales y un modal con formulario.
- **Animaciones GSAP con ScrollTrigger** en todas las secciones.
- **Enlace activo en la navegación** según la sección visible (IntersectionObserver).
- **Textura de ruido** sutil en el fondo, generada con SVG inline.

## Tecnologías

| Tecnología | Uso |
|---|---|
| HTML5 y CSS3 | Estructura y estilos |
| JavaScript (vanilla) | Interactividad y lógica |
| [GSAP 3.12](https://gsap.com/) + ScrollTrigger | Animaciones de entrada y de scroll |
| [Font Awesome 6.4](https://fontawesome.com/) | Iconografía |
| Google Fonts | Tipografías: Space Grotesk e Inter |

No usa frameworks ni bundlers: se ejecuta directamente en el navegador y las librerías se cargan por CDN.

## Estructura

```
portfolio/
├── index.html      # Sitio completo (HTML, CSS y JS en un solo archivo)
├── LICENCE.md
└── README.md
```

Todo el CSS está embebido en una etiqueta `<style>` y el JavaScript se encuentra al final del `<body>`.

## Cómo ejecutarlo

1. Cloná o descargá el repositorio.
2. Abrí `index.html` directamente en el navegador.

Opcionalmente, con un servidor local:

```bash
npx serve .
# o
python -m http.server 8080
```

## Próximas mejoras

- [ ] Separar CSS y JavaScript en archivos independientes.
- [ ] Optimizar imágenes y mejorar el rendimiento (Lighthouse).
- [ ] Mejorar la accesibilidad (navegación por teclado, contraste y etiquetas ARIA).
- [ ] Agregar versión en inglés.

## Desarrollo asistido por IA

Este proyecto fue desarrollado con ayuda de inteligencia artificial. Parte del código y de la documentación fue generada o asistida por estas herramientas, y luego revisada, probada y ajustada por el autor.

## Contacto

- **GitHub:** [github.com/Nicolas-Corera](https://github.com/Nicolas-Corera)
- **LinkedIn:** [linkedin.com/in/nicolas-corera/](https://www.linkedin.com/in/nicolas-corera/)
- **Instagram:** [@nico.corera](https://instagram.com/nico.corera)

## Licencia

Distribuido bajo la licencia MIT. Consultá el archivo [LICENCE.md](./LICENCE.md) para más información.

&copy; 2026 Nicolás Corera
