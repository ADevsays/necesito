# Necesito

Cuando hay un desastre, la infraestructura se cae primero. Sin señal, sin internet, sin forma de pedir ayuda. La gente queda aislada justo cuando más necesita ser encontrada.

**Necesito** nació de esa realidad. Es una plataforma de coordinación de emergencias para Colombia que permite registrar y gestionar reportes de personas que necesitan ayuda — rescate, atención médica, agua, comida, refugio — durante desastres naturales o crisis humanitarias.

La app funciona sin internet. Los reportes se guardan en el dispositivo y se sincronizan cuando vuelve la conexión. No depende de que haya señal para que alguien pueda decir "aquí estoy, necesito ayuda".

## Qué hace

- **Registro offline.** Un voluntario en zona puede registrar necesidades sin señal. Cuando el celular recupera conexión, todo se sube solo. No se pierde nada.
- **Geolocalización.** Cada reporte lleva coordenadas GPS exactas. No direcciones escritas a mano que nadie encuentra — un punto en el mapa que lleva al equipo de rescate directo al sitio.
- **Panel de coordinación.** Los coordinadores ven todos los reportes en tiempo real, filtran por zona o prioridad, y marcan el estado de cada caso para que no se duplique esfuerzo.
- **Alertas push.** Cuando entra un reporte crítico, les llega una notificación directa al celular a los rescatistas suscritos a esa ciudad. Sin tener que estar refrescando la pantalla.
- **Interfaz de alto contraste.** Diseño pensado para usarse bajo estrés, con poca luz, con las manos sucias o en pantallas rotas. Botones grandes, texto legible, cero adornos innecesarios.

## Stack

No se usaron frameworks pesados a propósito. En una emergencia cada segundo de carga cuenta.

- Frontend: HTML, CSS, JS vanilla. Service Worker para caché offline.
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

Si querés aportar algo, hacé un fork, creá una rama y mandá un PR. No hay burocracia, solo que el código sea limpio y que no rompa lo que ya funciona. Cualquier mejora que haga esto más rápido, más liviano o más útil en terreno es bienvenida.

---

Hecho porque alguien lo necesitaba. Ojalá no hiciera falta.
