# Skill: Conversion Landing Page

## Description
Esta skill permite generar landing pages de alta conversión basadas en una arquitectura visual de impacto (estilo Prisma 3D) y una narrativa persuasiva estructurada en módulos específicos de Nuxt 3.

## Core Principles
1. **Impacto Visual Primero**: Toda landing debe comenzar con un Hero inmersivo (Canvas 3D o visual potente) con animaciones de entrada escalonadas (`staggered`).
2. **Estructura Narrativa**:
   - **Hero**: Propuesta de valor clara + Call to Action.
   - **Pain (Problema)**: Agitar los puntos de dolor del usuario.
   - **Solution (Solución)**: Presentar la oferta como la cura definitiva.
   - **Process (Proceso)**: Pasos claros (01, 02, 03) con tiempos estimados.
   - **FAQ**: Resolver objeciones comunes.
   - **Footer**: Refuerzo final de marca y contacto.

## Component Library
- `StatusPill`: Para etiquetas superiores con/sin pulso neón.
- `FeatureCard`: Para beneficios con iconos minimalistas.
- `FaqItem`: Acordeones para objeciones.
- `GlassButton`: Botón principal con efecto de cristal y gradiente.
- `FooterCTA`: Texto masivo para el cierre de la página.

## Implementation Guidelines
- Usar Nuxt 3 y Tailwind CSS.
- Animaciones con GSAP (especialmente `ScrollTrigger`).
- Mantener un esquema de colores "Dark Premium" con acentos vibrantes (ej. #00D4FF o #FF4D00).
- La lógica de carga global debe esperar a los assets pesados (Prisma/Imágenes) mediante un estado global de "isReady".
- Usar `useStaggeredEntrance` para mapear automáticamente la entrada de elementos en cada sección.

## Workflows
### Crear nueva sección
1. Definir el propósito (Problem, Solution, Info).
2. Usar `StatusPill` para el título de la categoría.
3. Mantener tipografía Serif para títulos grandes y Sans para cuerpos de texto.
4. Aplicar `opacity-0` y la clase `.reveal-item` para animaciones automáticas.
