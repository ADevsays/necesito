---
name: nuxt-architecture
description: Entiende arquitecturas Nuxt.js 3 feature-based modulares y genera nuevos componentes, módulos y utilidades respetando las convenciones. Usar cuando se necesite crear nuevos features/módulos, agregar componentes, implementar composables, añadir páginas con routing, crear utilidades, o entender dónde ubicar archivos según su tipo en proyectos Nuxt.js 3
---

# Nuxt Architecture Skill

Esta skill ayuda a generar código para proyectos Nuxt.js 3 con arquitectura feature-based modular, respetando las convenciones y estructura del proyecto.

## Arquitectura General

Proyectos Nuxt.js 3 con enfoque **feature-based modular**:
- Módulos independientes organizados por funcionalidad
- Convenciones de Nuxt.js 3 (auto-import, file-based routing)
- TypeScript y Composition API

## Estructura de Directorios

### Módulos (`modules/<feature>/`)

Cada feature tiene su propia carpeta con estructura completa:

```
modules/<feature-name>/
├── components/      # Componentes específicos del feature
├── composables/     # Lógica reutilizable del feature (Frontend)
├── server/          # Lógica de servidor específica del módulo
│   ├── api/         # Endpoints locales (opcional)
│   ├── services/    # Lógica de negocio específica
│   ├── const/       # Constantes específicas
│   └── utils/       # Helpers específicos
├── views/           # Vistas/páginas del feature
├── sections/        # Secciones de páginas (opcional)
├── store/           # Estado Pinia (opcional)
└── types/           # Tipos específicos del módulo
```

**Ejemplo:** `modules/articles/`, `modules/badges/`

### Servidor Global (`server/`)

Para lógica que trasciende a un solo módulo o es core del sistema:

- **`server/api/`**: Endpoints globales o compartidos por varios módulos (ej: `/leads`).
- **`server/services/`**: Lógica de negocio core (ej: base de datos, auth compartido).
- **`server/lib/`**: Inicialización de librerías externas (ej: Supabase, Prisma).
- **`server/const/`**: Constantes globales (ej: roles de usuario, códigos de error).
- **`server/utils/`**: Utilidades de servidor globales.

### UI Global (`ui/`)

Para componentes visuales y secciones reutilizables en todo el proyecto que no pertenecen a un feature específico. Deben ser totalmente **agnósticos** (recibir datos vía `props` en lugar de amarrarse a `locales/` o data estática de algún módulo).

```text
ui/
├── components/     # Piezas reutilizables menores (Layout, Buttons, Inputs, Items)
│   ├── BackButton.vue
│   └── FaqItem.vue
└── sections/       # Bloques completos reutilizables (Headers, Footers, FAQ blocks)
    └── FaqSection.vue
```

- **Naming:** PascalCase descriptivo.
- **Ruta de Tailwind:** Debe estar incluida explícitamente en el arreglo `content` de `tailwind.config.ts` (ej: `'./ui/**/*.vue'`).

### Composables

**Globales** (`composables/`):
- Lógica compartida entre features (ej: `useAuth.ts`, `useFetch.ts`).

**Por módulo** (`modules/<feature>/composables/`):
- Lógica específica del feature (ej: `useCalculator.ts`).

**Convenciones:**
- Naming: `use<Functionality>.ts` (camelCase).

### Utils (`utils/`)

Funciones helper puras sin estado:
- **Globales**: `/utils/<name>.ts`
- **De Módulo**: `modules/<feature>/utils/` o `modules/<feature>/server/utils/`

---

### Constantes (`const/`)

Valores constantes y contenido declarativo:
- **Directorio**: Siempre `const/` (singular).
- **Regla**: Si solo se usa en un módulo, debe ir dentro de él (`modules/<feature>/const/` o `modules/<feature>/server/const/`).

---

## Árbol de Decisión

¿Qué estoy creando?

**Lógica de Servidor (Services/Utils):**
1. **¿Se usa en más de un módulo?** → `server/services/` o `server/utils/`
2. **¿Es exclusiva de un feature?** → `modules/<feature>/server/services/` o `modules/<feature>/server/utils/`

**Endpoints (API):**
- **¿Consumido por múltiples módulos?** (ej: leads de landing y calculadora) → `server/api/`
- **¿Consumido sólo por el propio módulo?** → `modules/<feature>/server/api/`

**Componentes Vue / Interfaz Gráfica:**
- ¿Pieza específica de un feature? → `modules/<feature>/components/<Name>.vue`
- ¿Sección completa de un feature? → `modules/<feature>/sections/<Name>.vue`
- ¿Pieza reutilizable globalmente? → `ui/components/<Name>.vue`
- ¿Sección completa reutilizable globalmente? → `ui/sections/<Name>.vue`

**Valores constantes:**
- ¿Globales? → `server/const/`
- ¿De un módulo? → `modules/<feature>/[server/]const/`

## Mejores Prácticas

1. **Modularización Estricta**: Si una lógica (service, const, util) solo sirve a un módulo, **debe** vivir dentro de ese módulo.
2. **Core vs Feature**: El directorio `/server` raíz es solo para el núcleo compartido (database, leads generales, auth).
3. **Naming Singulares**: Usar `const/` en lugar de `constants/` o `consts/`.
4. **Organización por feature**: Mantén todo lo relacionado a un feature junto.
