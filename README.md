# Necesito

Plataforma de coordinación de emergencias para Colombia. Permite registrar y gestionar reportes de personas que necesitan ayuda (rescate, atención médica, agua, comida, refugio) durante desastres naturales o crisis humanitarias.

La app funciona sin internet. Los reportes se guardan en el dispositivo y se sincronizan cuando vuelve la conexión.

## Qué hace

- **Registro de necesidades offline.** La gente puede reportar qué necesita aunque no tenga señal. Cuando el celular recupera conexión, todo se sube solo.
- **Geolocalización.** Cada reporte incluye coordenadas GPS para que los equipos de respuesta sepan exactamente dónde ir.
- **Panel de coordinación.** Los coordinadores ven todos los reportes en tiempo real, pueden filtrar por zona o prioridad, y marcar el estado de cada caso.
- **Notificaciones push.** Cuando entra un reporte crítico o urgente, les llega una alerta directa al celular a los rescatistas que estén suscritos a esa ciudad.
- **Interfaz de alto contraste.** Diseño brutalist pensado para usarse bajo estrés, con poca luz o pantallas dañadas. Botones grandes, texto legible, cero adornos.

## Stack

- Frontend: HTML, CSS, JS vanilla. Sin frameworks. Service Worker para caché offline.
- Backend: Node.js + Express, TypeScript.
- Base de datos: Turso (SQLite edge, LibSQL).
- Notificaciones: Web Push con VAPID.
- Despliegue: Docker. Preparado para Dokploy o cualquier VPS.

## Cómo correrlo

### Variables de entorno

Crea un archivo `.env` en la raíz:

```env
PORT=3000
TURSO_URL=libsql://tu-base.turso.io
TURSO_AUTH_TOKEN=tu-token
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:tu@correo.com
COORDINATOR_TOKEN=contraseña-para-el-panel
```

### Desarrollo local

```bash
npm install
npm run dev
```

### Docker

```bash
docker build -t necesito .
docker run -p 3000:3000 --env-file .env necesito
```

## Contribuir

Si querés aportar algo, hacé un fork, creá una rama y mandá un PR. No hay reglas formales por ahora, solo que el código sea limpio y que no rompa lo que ya funciona.

---

Hecho para cuando la gente necesita ayuda y la infraestructura no alcanza.
