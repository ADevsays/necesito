# NECESITO — MVP DE EMERGENCIA OFFLINE

## MISIÓN

Construir y desplegar una PWA extremadamente ligera para que **voluntarios, periodistas, personal de ayuda y ciudadanos que estén recorriendo zonas afectadas** puedan registrar necesidades de personas afectadas **sin internet** y sincronizarlas posteriormente cuando recuperen conexión.

El producto NO intenta comunicar directamente a la víctima con internet.

El flujo fundamental es:

**PERSONA AFECTADA → VOLUNTARIO → TELÉFONO OFFLINE → CONEXIÓN → SERVIDOR → PERSONAS/ORGANIZACIONES QUE PUEDEN AYUDAR**

El MVP debe poder estar funcionando en producción en el menor tiempo posible.

## REGLA #1

### OFFLINE ES EL PRODUCTO.

Si la aplicación necesita internet para crear un reporte, está mal implementada.

---

# 1. ALCANCE

Inicialmente trabajar únicamente con:

* Manizales
* Cali
* Pereira
* Chocó

No intentar cubrir todo Colombia en el MVP.

No crear una app nativa.

No utilizar App Store.

No utilizar Google Play.

No implementar mesh/Bluetooth en esta primera versión.

No implementar cuentas complejas.

No implementar chat.

No implementar IA.

No implementar pagos monetarios (sí donaciones de insumos físicos en terreno).

No implementar red social.

No implementar navegación GPS turn-by-turn.

No implementar funcionalidades que no sean necesarias para registrar y transmitir necesidades y donaciones.

---

# 2. PRODUCTO

Nombre provisional:

# NECESITO

Tagline:

> **Encuentra una necesidad. Regístrala. Llévala hasta quien puede ayudar.**

La interfaz debe dejar claro que está diseñada para **personas que están ayudando en el terreno**.

No presentar el producto como sustituto de:

* bomberos;
* policía;
* Cruz Roja;
* Defensa Civil;
* UNGRD;
* servicios médicos;
* autoridades locales.

Es una herramienta de **recolección y transmisión de información de campo**.

---

# 3. USUARIO PRINCIPAL

El usuario principal NO es la víctima.

Es:

### VOLUNTARIO

Puede ser:

* ciudadano;
* periodista;
* líder comunitario;
* integrante de ONG;
* personal de ayuda;
* familiar;
* conductor;
* bombero;
* trabajador de campo.

No asumir conocimientos técnicos.

No asumir que tiene cuenta.

No asumir que tiene internet.

No asumir que conoce la ubicación exacta.

---

# 4. OBJETIVO DEL MVP

Un voluntario debe poder:

1. abrir la web;
2. crear un reporte;
3. registrar qué necesita una persona;
4. registrar aproximadamente dónde está;
5. guardar el reporte sin conexión;
6. continuar recogiendo reportes;
7. recuperar conexión;
8. sincronizar automáticamente;
9. permitir que un coordinador vea esos reportes.

Eso es TODO.

Si esto funciona perfectamente, el MVP está terminado.

---

# 5. STACK

Usar el stack más simple posible.

## Frontend

Astro + TypeScript.

Evitar React/Vue salvo que una pequeña parte realmente lo necesite.

Preferir HTML/CSS/TypeScript vanilla.

## Backend

Node.js + TypeScript.

API REST.

## Base de datos

Turso (libsql).

## Hosting

Utilizar una plataforma sencilla de desplegar inmediatamente.

No crear infraestructura compleja.

## PWA

Service Worker + Web App Manifest.

## almacenamiento offline

IndexedDB.

NO depender de localStorage para los reportes.

---

# 6. PRINCIPIO OFFLINE-FIRST

Toda la aplicación debe estar diseñada alrededor de este principio:

```text
LOCAL FIRST
     ↓
guardar
     ↓
intentar sincronizar
     ↓
si hay internet → sincronizar
si no hay internet → conservar localmente
```

Nunca:

```text
guardar
 ↓
POST API
 ↓
si falla → perder información
```

Eso está prohibido.

---

# 7. PRIMERA PANTALLA

La primera pantalla debe cargar extremadamente rápido.

Mostrar:

# NECESITO

### ¿Qué encontraste?

Botones principales:

## + REGISTRAR NECESIDAD (EMERGENCIA)
## 🙋‍♂️ QUIERO DONAR (INSUMOS)

Debajo:

### 📋 REPORTES PENDIENTES
### 🗺️ VER MAPA (Centro de Coordinación)

Y arriba/abajo:

`🟢 CONECTADO`

o

`🟠 MODO OFFLINE — SIN CONEXIÓN`

No mostrar login.

No mostrar tutorial.

No mostrar dashboard.

No mostrar estadísticas.

El voluntario debe poder empezar inmediatamente.

---

# 8. CREAR REPORTE

Al pulsar:

## + REGISTRAR NECESIDAD

abrir el formulario.

Todo debe poder completarse en aproximadamente 10–15 segundos.

---

# 9. UBICACIÓN

Primero:

# ¿DÓNDE ESTÁ LA PERSONA?

Botones:

### 📍 USAR MI UBICACIÓN

### 📌 MARCAR EN MAPA

### ✏️ ESCRIBIR UBICACIÓN

### ❓ NO SÉ

Intentar obtener:

* latitude;
* longitude;
* accuracy;
* timestamp.

El GPS debe intentarse aunque no exista internet.

IMPORTANTE:

### No bloquear el reporte si el GPS falla.

Un voluntario puede escribir:

> "Iglesia de San José del Palmar"

o

> "2 cuadras después del parque"

La ubicación puede ser aproximada.

---

# 10. NECESIDAD

Mostrar botones enormes:

## 🔴 RESCATE

Personas atrapadas, desaparecidas o que necesitan extracción.

## 🏥 MÉDICO

Heridos o personas que necesitan atención médica.

## 💧 AGUA

Necesidad de agua potable.

## 🍲 COMIDA

Necesidad de comida.

## 🏠 REFUGIO

Personas sin lugar seguro donde permanecer.

## 💊 MEDICAMENTOS

Medicamentos o insumos médicos.

## 👶 PERSONA VULNERABLE

Niños, adultos mayores, personas con discapacidad o personas solas.

## 👤 PERSONA DESAPARECIDA

Alguien que no ha podido ser localizado.

## 📦 OTRO

Cualquier necesidad diferente.

Permitir seleccionar más de una.

---

# 11. PRIORIDAD

Después:

# ¿QUÉ TAN URGENTE ES?

## 🔴 CRÍTICO

Existe riesgo inmediato para la vida.

## 🟠 URGENTE

Necesita ayuda pronto.

## 🟢 NECESARIO

Necesidad importante pero no inmediatamente peligrosa.

No utilizar escalas de 1–10.

---

# 12. PERSONAS

Preguntar:

# ¿CUÁNTAS PERSONAS?

Opciones:

`1  2  3  4  5  6  7  8  9  10+`

Después:

### ¿Hay heridos?

* Sí
* No
* No sé

### ¿Hay personas atrapadas?

* Sí
* No
* No sé

### ¿Hay niños?

* Sí
* No
* No sé

### ¿Hay adultos mayores?

* Sí
* No
* No sé

---

# 13. DESCRIPCIÓN

Campo opcional:

# ¿QUÉ ESTÁ PASANDO?

Máximo 280 caracteres.

Ejemplo:

> Hay 4 personas dentro del edificio. Una está herida en una pierna. La entrada está bloqueada.

No exigir texto.

No utilizar IA.

---

# 14. FOTO Y ALMACENAMIENTO DE MEDIOS

## En Reportes de Emergencia:
* **Opcional**. Título dinámico: `FOTO (Opcional)`.
* Botón: `📷 TOMAR FOTO`.
* La foto es secundaria; el reporte de emergencia debe poder guardarse sin ella.

## En Reportes de Donación:
* **Obligatoria**. Título dinámico: `FOTO (Obligatoria)`.
* Botón: `📷 TOMAR FOTO`.
* El formulario no permite guardar la donación si no se adjunta al menos 1 fotografía de evidencia.

## Reglas de Procesamiento y Almacenamiento:
* Máximo 1–2 fotografías.
* Comprimir en el cliente antes de almacenar en IndexedDB.
* Al sincronizar con el servidor, las imágenes se guardan como archivos físicos en disco (`public/uploads/`) y la base de datos sólo almacena la ruta relativa.
* **PROHIBIDO** almacenar blobs Base64 gigantes en columnas JSON de la base de datos para no saturar memoria o colapsar Turso/libSQL.

---

# 14.1. MODO DONACIONES (OFERTAS DE AYUDA)

Para canalizar la ayuda material de la ciudadanía y voluntarios:

1. El usuario selecciona **🙋‍♂️ QUIERO DONAR**.
2. La sección de necesidades cambia a: **¿QUÉ VAS A DONAR?**
3. Categorías de Donación disponibles:
   * 🧼 ASEO (`hygiene`)
   * 🍲 COMIDA (`food`)
   * 💧 AGUA (`water`)
   * 👕 ROPA (`clothes`)
   * 🧱 CONSTRUCCIÓN (`construction`)
   * 💊 MEDICAMENTOS (`medication`)
   * 📦 OTRO (`other`)
4. Campo de texto obligatorio: **DETALLES DE LA DONACIÓN** (`description`) donde se detalla cantidad y estado (ej. "3 cajas de ropa térmica y 2 pacas de agua").
5. Fotografía obligatoria.
6. El reporte se crea con `source = "donation"` y prioridad base `necessary`.
7. Al sincronizarse en el servidor, dispara automáticamente una notificación Push a los coordinadores de la zona registrada.

---

# 15. GUARDADO

Botón:

# GUARDAR REPORTE

Al pulsarlo:

### NO hacer una petición obligatoria al servidor.

Crear inmediatamente un registro IndexedDB.

Mostrar:

# ✅ REPORTE GUARDADO

> El reporte está guardado en este teléfono.
>
> Se enviará automáticamente cuando vuelva la conexión.

Si hay internet disponible, iniciar sincronización después de guardar.

---

# 16. MODELO LOCAL

Cada reporte debe contener como mínimo:

```ts
type LocalReport = {
  localId: string
  serverId?: string

  createdAt: string

  volunteerId: string

  location?: {
    latitude?: number
    longitude?: number
    accuracy?: number
    description?: string
  }

  needs: NeedType[]

  priority: "critical" | "urgent" | "needed"

  peopleCount: number

  injured: boolean | null
  trapped: boolean | null
  children: boolean | null
  elderly: boolean | null

  description?: string

  photos?: LocalPhoto[]

  syncStatus: "pending" | "syncing" | "synced" | "failed"

  syncAttempts: number

  lastSyncAttempt?: string
}
```

---

# 17. IDENTIDAD DEL VOLUNTARIO

No exigir registro.

Al primer uso:

# ¿QUIÉN ESTÁ REGISTRANDO?

Campo:

`Tu nombre o alias`

Ejemplo:

> Carlos

Opcional:

`Teléfono`

Generar automáticamente:

```text
volunteerId
```

Guardar localmente.

No pedir cédula.

No pedir dirección.

No pedir contraseña.

---

# 18. REPORTES PENDIENTES

Pantalla:

# REPORTES PENDIENTES

Cada elemento:

```text
🔴 RESCATE + MÉDICO
4 personas · 1 herido

📍 San José del Palmar
Hace 23 minutos

🟠 PENDIENTE DE SINCRONIZACIÓN
```

Estados:

### 🟠 PENDIENTE

### 🔄 SINCRONIZANDO

### 🟢 SINCRONIZADO

### ⚠️ ERROR — REINTENTAR

---

# 19. SINCRONIZACIÓN

Cuando `navigator.onLine === true`:

Intentar sincronizar automáticamente.

Pero:

### navigator.onLine NO es una garantía de internet real.

La aplicación debe hacer una pequeña petición real al backend para comprobar conectividad.

Cuando existe conexión:

1. obtener reportes `pending`;
2. enviarlos en batch;
3. utilizar `localId` como idempotency key;
4. recibir confirmación;
5. guardar `serverId`;
6. marcar como `synced`.

Si falla:

* conservar;
* incrementar `syncAttempts`;
* no duplicar;
* volver a intentar posteriormente.

---

# 20. API DE SINCRONIZACIÓN

Endpoint:

```text
POST /api/reports/sync
```

Payload:

```json
{
  "reports": [
    {
      "localId": "local_123",
      "volunteerId": "vol_456",
      "createdAt": "2026-08-13T01:23:00Z",
      "location": {
        "latitude": 5.0689,
        "longitude": -75.5174,
        "accuracy": 20,
        "description": "Cerca del parque"
      },
      "needs": ["rescue", "medical"],
      "priority": "critical",
      "peopleCount": 4,
      "injured": true,
      "trapped": true,
      "children": false,
      "elderly": false,
      "description": "4 personas atrapadas..."
    }
  ]
}
```

Respuesta:

```json
{
  "synced": [
    {
      "localId": "local_123",
      "serverId": "report_789"
    }
  ],
  "failed": []
}
```

El backend debe garantizar idempotencia por `localId`.

---

# 21. BACKEND

Crear tablas:

```text
volunteers
reports
report_status_history
```

## reports

Campos mínimos:

```text
id
local_id
volunteer_id
created_at
updated_at

latitude
longitude
location_accuracy
location_description

needs
priority

people_count

injured
trapped
children
elderly

description

status
assigned_to

created_from_offline
```

---

# 22. DASHBOARD Y MAPA (/coordinar)

Ruta:

```text
/coordinar
```

Interfaz accesible para coordinadores y voluntarios en terreno.

### Características del Dashboard:
1. **Banner de Conexión Dinámico**: Muestra `🟠 MODO OFFLINE — SIN CONEXIÓN` únicamente cuando el navegador pierde conectividad en tiempo real (eventos `online`/`offline`).
2. **Botón Central de Mapa**: `🗺️ VER MAPA` ubicado prominentemente en el centro junto a los filtros para alternar entre vista de lista y vista de mapa Leaflet.
3. **Lazy Loading (Paginación Dinámica)**: Para evitar bloqueos del navegador con cientos de reportes, la lista renderiza en lotes de 20 casos mediante `IntersectionObserver` al hacer scroll hacia el final.
4. **Distinción Visual de Donaciones**: Los reportes de donación muestran la insignia verde `🎁 DONACIÓN` y ocultan contadores innecesarios (heridos, atrapados).
5. **Mapa Interactivo**:
   * Marcadores de emergencia clasificados por color según prioridad (Rojo = Crítico, Naranja = Urgente, Azul/Verde = Necesario).
   * Marcadores de donación con icono verde distintivo **🎁**.
   * Ventanas emergentes (popups) 100% en español con botón interactivo **"VER CASO"**.
   * Al pulsar "VER CASO", el mapa se cierra, la pantalla se desplaza suavemente hasta la tarjeta correspondiente en la lista y la resalta con una animación de brillo.
6. **Sistema de Moderación Anti-Troll**:
   * Botón `⚠ Reportar` en cada tarjeta.
   * Si 3 voluntarios distintos marcan un reporte como malicioso o falso, pasa a estado `flagged` y se oculta automáticamente del panel.
7. **Alertas Web Push**:
   * Botón `🔔 ACTIVAR ALERTAS URGENTES` para suscribir el navegador a notificaciones de emergencias y donaciones por zona.

Orden de la lista:
1. Prioridad de estado (Nuevos → En proceso → Resueltos)
2. Severidad (CRÍTICO → URGENTE → NECESARIO)
3. Fecha de creación (más recientes primero)

---

# 23. FILTROS

Filtros mínimos:

## Zona

* Manizales
* Cali
* Pereira
* Chocó

## Necesidad

* Rescate
* Médico
* Agua
* Comida
* Refugio
* Medicamentos
* Vulnerable
* Desaparecido
* Otro

## Prioridad

* Crítico
* Urgente
* Necesario

## Estado

* Nuevo
* Asignado
* En proceso
* Resuelto
* Inválido

---

# 24. MAPA DEL DASHBOARD

Mostrar los reportes sobre un mapa.

Los marcadores deben representar:

* categoría;
* prioridad.

No hace falta un sistema GIS avanzado.

Si el mapa remoto no carga:

### LA LISTA DE REPORTES DEBE SEGUIR FUNCIONANDO.

El mapa nunca debe ser una dependencia del sistema.

---

# 25. ESTADOS

```text
new
assigned
in_progress
resolved
invalid
```

Flujo:

```text
new
 ↓
assigned
 ↓
in_progress
 ↓
resolved
```

También:

```text
new → invalid
assigned → invalid
```

---

# 26. ASIGNACIÓN

Desde un reporte:

### ASIGNAR

Seleccionar voluntario.

Cambiar:

```text
new → assigned
```

Posteriormente:

```text
assigned → in_progress
```

y:

```text
in_progress → resolved
```

Guardar historial.

---

# 27. DUPLICADOS

No construir IA.

Implementar una alerta simple.

Si dos reportes tienen:

* misma categoría;
* coordenadas muy cercanas;
* tiempo cercano;

mostrar:

> ⚠️ POSIBLE DUPLICADO

El coordinador decide.

No fusionar automáticamente.

---

# 28. MAPA OFFLINE DEL VOLUNTARIO

NO implementar un mapa pesado en el MVP inicial.

El voluntario necesita principalmente:

### ubicación GPS

y

### descripción de ubicación.

Si el tiempo lo permite, añadir un mapa vectorial muy ligero para las cuatro zonas.

Pero:

**la creación de reportes tiene prioridad absoluta sobre el mapa.**

Un voluntario debe poder registrar:

> "Frente a la iglesia"

aunque no exista ningún mapa cargado.

---

# 29. PWA

Manifest:

```json
{
  "name": "Necesito Colombia",
  "short_name": "Necesito",
  "display": "standalone",
  "orientation": "portrait"
}
```

Service Worker debe cachear:

* HTML crítico;
* CSS;
* JS;
* iconos;
* assets esenciales.

La aplicación debe abrirse después de:

1. cargarla una vez;
2. apagar Wi-Fi;
3. apagar datos móviles;
4. cerrar el navegador;
5. volver a abrirla.

---

# 30. TEST OFFLINE — CRÍTICO

Codex debe crear automáticamente una forma de probar esto.

### Test:

1. Abrir aplicación con internet.
2. Esperar a que termine la carga.
3. Desactivar Wi-Fi.
4. Desactivar datos.
5. Cerrar navegador.
6. Abrir nuevamente.
7. Crear 10 reportes.
8. Recargar.
9. Confirmar que siguen los 10.
10. Cerrar navegador.
11. Abrir nuevamente.
12. Confirmar que siguen los 10.
13. Recuperar internet.
14. Confirmar sincronización.
15. Confirmar que aparecen en dashboard.
16. Confirmar que no existen duplicados.

Este test debe pasar.

---

# 31. TAMAÑO

La aplicación debe ser extremadamente ligera.

Objetivo:

### JS inicial <200 KB gzip

No cargar:

* librerías gigantes;
* mapas pesados;
* frameworks innecesarios;
* fuentes externas;
* analytics pesados;
* trackers.

La primera pantalla debe funcionar incluso en un teléfono barato.

---

# 32. UX

Todo debe estar diseñado para utilizarse:

* caminando;
* con una mano;
* bajo estrés;
* con poca batería;
* con poca conectividad;
* con mala iluminación.

Botones grandes.

Texto corto.

Alto contraste.

Sin animaciones innecesarias.

Sin modales innecesarios.

Sin menús profundos.

---

# 33. MODO RÁPIDO

Agregar un botón:

# ⚡ REPORTE RÁPIDO

Este flujo debe ser todavía más rápido:

```text
NUEVO REPORTE
↓
UBICACIÓN
↓
NECESIDAD
↓
PRIORIDAD
↓
GUARDAR
```

Los demás datos pueden omitirse.

Esto permite registrar muchas personas rápidamente.

---

# 34. REPORTE MÍNIMO VÁLIDO

Un reporte puede existir únicamente con:

```text
localId
createdAt
volunteerId
need
priority
location OR locationDescription
```

Todo lo demás es opcional.

Nunca obligar a completar un formulario largo durante una emergencia.

---

# 35. CHOCÓ

Tratar Chocó como prioridad operativa.

No asumir que el usuario está en Quibdó.

Permitir:

* municipio;
* corregimiento;
* barrio/vereda;
* descripción libre;
* coordenadas;
* ubicación aproximada.

La arquitectura debe soportar lugares con poca o ninguna conectividad.

La necesidad de recoger información de zonas incomunicadas es especialmente relevante en esta emergencia. Fuentes recientes describen comunidades de Chocó que permanecen incomunicadas y dificultades importantes para la respuesta.

---

# 36. DATOS OFICIALES

No inventar:

* hospitales;
* refugios;
* carreteras;
* centros de atención;
* zonas seguras;
* puntos de rescate.

Si se agregan datos de infraestructura, deben provenir de fuentes oficiales verificables.

Para el MVP, es preferible:

### dato vacío

antes que:

### dato inventado.

---

# 37. SEGURIDAD Y PRIVACIDAD

No mostrar públicamente información sensible.

El dashboard requiere autenticación.

No mostrar nombres de voluntarios públicamente.

No pedir información personal innecesaria.

La ubicación de una emergencia solamente debe estar disponible para usuarios autorizados.

Implementar:

* HTTPS;
* validación de payloads;
* rate limiting;
* límites de tamaño;
* sanitización;
* autenticación dashboard.

---

# 38. FUERA DEL ALCANCE INMEDIATO

Queda explícitamente fuera de este alcance:

* Bluetooth / mesh P2P directo sin servidor;
* WebRTC;
* Chat en tiempo real y llamadas;
* Cuentas de usuario con contraseña para víctimas;
* Pasarelas de pagos monetarios bancarios / PSE;
* IA generativa o reconocimiento automático de fotos;
* Mapas 3D pesados;
* Navegación turn-by-turn estilo Waze;
* Scraping de redes sociales;
* Gamificación y comentarios libres;
* Apps nativas en tiendas (App Store / Play Store).

# 39. DEPLOYMENT

El resultado final debe quedar desplegado en producción.

No entregar únicamente código.

Debe existir:

```text
/
```

para voluntarios.

Y:

```text
/coordinar
```

para coordinadores.

Configurar:

* HTTPS;
* service worker;
* manifest;
* backend;
* PostgreSQL;
* variables de entorno;
* migraciones;
* health check.

Crear:

```text
GET /api/health
```

Debe responder:

```json
{
  "status": "ok"
}
```

---

# 40. DEMO REAL

Antes de considerar terminado el producto, demostrar exactamente este escenario:

### ESCENARIO

Un voluntario llega a una zona sin internet.

Encuentra:

* 4 personas;
* 1 herido;
* 2 personas atrapadas.

Abre NECESITO.

No tiene internet.

Registra:

```text
RESCATE
MÉDICO
CRÍTICO
4 PERSONAS
1 HERIDO
2 ATRAPADOS
```

Obtiene su GPS.

Escribe:

> Edificio parcialmente colapsado junto al parque.

Pulsa:

# GUARDAR

El reporte queda almacenado.

Después registra otros 9 reportes.

Todos quedan almacenados.

30 minutos después obtiene señal.

La aplicación sincroniza.

El dashboard recibe los 10.

El coordinador ve primero los críticos.

Puede asignar uno.

El reporte cambia:

```text
NUEVO
→ ASIGNADO
→ EN PROCESO
→ RESUELTO
```

No se pierde ningún reporte.

No se duplica ninguno.

---

# 41. CRITERIO DE ÉXITO

El producto NO se mide inicialmente por:

* usuarios registrados;
* descargas;
* visitas;
* seguidores.

La primera métrica es:

# NECESIDADES REALES REGISTRADAS Y TRANSMITIDAS

El producto debe permitir que una persona que está físicamente en una zona afectada pueda sacar información de esa zona incluso cuando no existe conectividad.

---

# 42. ORDEN DE IMPLEMENTACIÓN PARA CODEX

Implementar exactamente en este orden:

### FASE 1

PWA básica.

### FASE 2

IndexedDB.

### FASE 3

Crear reporte offline.

### FASE 4

GPS.

### FASE 5

Cola de sincronización.

### FASE 6

Backend.

### FASE 7

Dashboard.

### FASE 8

Filtros.

### FASE 9

Estados/asignación.

### FASE 10

Deploy.

### FASE 11

Prueba real completamente offline.

NO comenzar por el mapa.

NO comenzar por el dashboard.

NO comenzar por autenticación sofisticada.

NO comenzar por diseño visual complejo.

Primero demostrar:

# CREAR REPORTE SIN INTERNET → GUARDAR → RECUPERAR INTERNET → SINCRONIZAR

---

# 43. PRINCIPIO FINAL

Si hay que elegir entre:

**una funcionalidad más**

y

**hacer más robusto el funcionamiento offline**

elegir siempre:

# OFFLINE.

Si hay que elegir entre:

**un formulario más completo**

y

**registrar la necesidad en 10 segundos**

elegir:

# 10 SEGUNDOS.

Si hay que elegir entre:

**un mapa bonito**

y

**que el reporte no se pierda**

elegir:

# QUE EL REPORTE NO SE PIERDA.

El producto completo puede evolucionar después.

El MVP solamente tiene que resolver esto:

> **Un voluntario encuentra a alguien que necesita ayuda, registra la necesidad sin internet y consigue llevar esa información hasta alguien que puede actuar cuando vuelve la conectividad.**

CONSTRUIR ESTO AHORA.
