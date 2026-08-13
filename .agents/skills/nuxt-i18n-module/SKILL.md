---
name: nuxt-i18n-module
description: Guía completa para la internacionalización (i18n) de módulos en Nuxt 3. Cubre la creación de locales JSON, integración de componentes frontend con useLanguage, detección automática de idioma, metadatos SEO dinámicos y propagación del idioma al servidor para correos y reportes. Usar cuando se necesite traducir un nuevo feature, página o flujo completo en el proyecto.
---

# Nuxt i18n Module Skill

Esta skill documenta el patrón de diseño utilizado en Factos para soportar múltiples idiomas (ES/EN) de forma consistente en todo el stack.

## Estructura del Proceso

La internacionalización se divide en tres capas principales:

1.  **Frontend (Locales & Componentes)**: Manejo de textos en la UI y SEO.
2.  **Constantes Dinámicas**: Manejo de textos largos o lógicas de negocio (ej. tips de valoración).
3.  **Backend & Emails**: Propagación del idioma al servidor para comunicaciones con el usuario.

## Guías de Implementación

Para implementar i18n en un nuevo módulo, sigue estas guías detalladas:

- **[Frontend i18n](references/frontend-i18n.md)**: Cómo configurar `pages/es/` y `pages/en/`, usar `useLanguage` y manejar SEO por URL.
- **[Constants i18n](references/constants-i18n.md)**: Patrón de archivos separados (`.es.ts` / `.en.ts`) para textos largos.
- **[Backend & Emails i18n](references/backend-i18n.md)**: Cómo enviar el idioma al API y generar emails traducidos.

## Principios Clave

- **Evitar v-html**: Siempre usar interpolación de Vue o componentes si es posible.
- **Detección Automática**: Siempre llamar a `detectLanguage()` en el `onMounted` de las páginas principales.
- **Single Source of Truth**: Las etiquetas estáticas deben vivir en los JSON de locales del módulo.
- **Typescript First**: Mantener interfaces comunes para asegurar que todos los idiomas tengan las mismas claves.
