# Árbol de Decisiones para Ubicación de Archivos

Este documento ayuda a determinar dónde ubicar cada tipo de archivo en el proyecto Nuxt.js.

## Diagrama de Decisión

```
¿Qué estoy creando?

├─ Componente Vue (.vue)
│  │
│  ├─ ¿Es específico de un feature/módulo?
│  │  └─ SÍ → modules/<feature>/components/<ComponentName>.vue
│  │     Ejemplo: modules/articles/components/ArticleCardIndex.vue
│  │
│  └─ ¿Es reutilizable en toda la aplicación?
│     └─ SÍ → components/UI/<ComponentName>.vue
│        Ejemplo: components/UI/BackButton.vue
│
├─ Lógica reutilizable (Composable .ts)
│  │
│  ├─ ¿Es específico de un feature/módulo?
│  │  └─ SÍ → modules/<feature>/composables/use<FunctionName>.ts
│  │     Ejemplo: modules/articles/composables/useCheckCoins.ts
│  │
│  └─ ¿Se usará en múltiples features?
│     └─ SÍ → composables/use<FunctionName>.ts
│        Ejemplo: composables/useFetch.ts
│
├─ Función helper/utilidad pura (.ts)
│  └─ utils/<functionName>.ts
│     Ejemplo: utils/insertYTVideo.ts
│     Características: Sin estado, función pura, transformación de datos
│
├─ Valores constantes (.ts)
│  └─ const/<categoryName>.ts
│     Ejemplo: const/coins.ts
│     Características: Objetos constantes, enums, configuraciones
│
├─ Página/Ruta (.vue)
│  │
│  ├─ ¿Es una ruta dinámica?
│  │  └─ SÍ → pages/<route>/[param].vue
│  │     Ejemplo: pages/noticias/[newName].vue
│  │
│  └─ ¿Es una ruta estática?
│     └─ SÍ → pages/<route>.vue o pages/<route>/index.vue
│        Ejemplo: pages/dashboard/index.vue
│
├─ Función server-side (.ts)
│  └─ modules/<feature>/server/<actionName>.ts
│     Ejemplo: modules/articles/server/updateVisit.ts
│     Características: Async, llama APIs, usa fetchWithAuth
│
├─ Sección de página (.vue)
│  └─ modules/<feature>/sections/<SectionName>.vue
│     Ejemplo: modules/articles/sections/HeroIndex.vue
│     Características: Componentes grandes usados en views
│
├─ Vista del módulo (.vue)
│  └─ modules/<feature>/views/<ViewName>.vue
│     Ejemplo: modules/articles/views/View.vue
│     Características: Componente principal, orquesta secciones
│
├─ Store/Estado (.ts)
│  └─ modules/<feature>/store/<storeName>.ts
│     Ejemplo: modules/badges/store/certificateStates.ts
│     Características: Pinia store, estado del feature
│
└─ Nuevo feature/módulo completo
   └─ modules/<new-feature-name>/
      ├── components/
      ├── composables/
      ├── server/
      ├── views/
      ├── sections/ (opcional)
      ├── store/ (opcional)
      └── test/ (opcional)
```

## Casos de Uso Comunes

### Caso 1: Crear un botón reutilizable

**Pregunta:** ¿Dónde poner un componente de botón que se usará en todo el proyecto?

**Respuesta:** `components/UI/Button.vue`

**Razón:** Es un componente UI reutilizable globalmente.

---

### Caso 2: Crear lógica de notificaciones para un módulo

**Pregunta:** ¿Dónde poner la lógica para manejar notificaciones del módulo `notifications`?

**Respuesta:** `modules/notifications/composables/useNotifications.ts`

**Razón:** Es lógica específica del feature notifications.

---

### Caso 3: Crear función para formatear fechas

**Pregunta:** ¿Dónde poner una función que formatea fechas en español?

**Respuesta:** `utils/formatDate.ts`

**Razón:** Es una función helper pura sin estado.

---

### Caso 4: Crear constantes de colores del tema

**Pregunta:** ¿Dónde poner los colores del tema de la aplicación?

**Respuesta:** `const/theme.ts` o `const/colors.ts`

**Razón:** Son valores constantes compartidos.

---

### Caso 5: Crear página de perfil de usuario

**Pregunta:** ¿Dónde poner la página de perfil?

**Respuesta:** `pages/perfil/index.vue` o simplemente `pages/perfil.vue`

**Razón:** Es una ruta del file-based routing de Nuxt.

---

### Caso 6: Crear tarjeta de producto para módulo shop

**Pregunta:** ¿Dónde poner un componente ProductCard para la tienda?

**Respuesta:** `modules/shop/components/ProductCard.vue`

**Razón:** Es un componente específico del módulo shop.

---

### Caso 7: Crear composable de autenticación global

**Pregunta:** ¿Dónde poner un composable useAuth que se usará en varios módulos?

**Respuesta:** `composables/useAuth.ts`

**Razón:** Es un composable global usado en múltiples features.

---

### Caso 8: Crear función para llamar API de productos

**Pregunta:** ¿Dónde poner una función que obtiene productos del servidor?

**Respuesta:** `modules/shop/server/getProducts.ts`

**Razón:** Es una función server-side específica del módulo shop.

---

### Caso 9: Crear sección Hero para landing page de artículos

**Pregunta:** ¿Dónde poner la sección Hero de la página de artículos?

**Respuesta:** `modules/articles/sections/HeroIndex.vue`

**Razón:** Es una sección grande del módulo articles.

---

### Caso 10: Crear nuevo módulo completo para chat

**Pregunta:** ¿Cómo estructurar un nuevo módulo de chat?

**Respuesta:**
```
modules/chat/
├── components/         # ChatBubble.vue, ChatInput.vue, etc.
├── composables/        # useChat.ts, useMessages.ts
├── server/            # sendMessage.ts, getMessages.ts
├── views/             # ChatView.vue
└── store/             # chatStore.ts
```

**Razón:** Módulo completo con todas las carpetas necesarias.

## Reglas Rápidas

1. **¿Lo usa solo un módulo?** → Va dentro del módulo
2. **¿Lo usan varios módulos?** → Va en carpeta global (components/UI, composables, utils, const)
3. **¿Es una página?** → Va en pages/
4. **¿Es server-side?** → Va en modules/<feature>/server/
5. **¿Es UI puro?** → components/UI/ si global, modules/<feature>/components/ si específico
6. **¿Es lógica de negocio?** → composables/ si global, modules/<feature>/composables/ si específico
7. **¿Es función helper?** → utils/
8. **¿Es valor constante?** → const/

## Tips para Naming

- **Componentes:** PascalCase - `ArticleCard.vue`, `BackButton.vue`
- **Composables:** camelCase con prefijo `use` - `useAuth.ts`, `useCheckCoins.ts`
- **Utils:** camelCase descriptivo - `formatDate.ts`, `insertYTVideo.ts`
- **Const:** camelCase - `coins.ts`, `navigation.ts`
- **Pages:** kebab-case o camelCase según ruta - `[id].vue`, `dashboard/index.vue`
- **Server:** camelCase descriptivo de la acción - `updateVisit.ts`, `getProducts.ts`
