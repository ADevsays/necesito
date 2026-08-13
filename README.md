# 🆘 Necesito

Cuando pega un desastre, lo primero que se cae es la comunicación. Sin señal, sin internet, sin forma de avisar que hay gente atrapada tres cuadras más abajo. La ayuda existe pero no sabe dónde ir, y los que necesitan ayuda no tienen cómo pedirla.

**Necesito** es una plataforma de coordinación de emergencias construida para funcionar justamente cuando todo lo demás falla. Nació durante la crisis en Colombia, con una premisa simple: que alguien pueda decir "acá necesitamos ayuda" incluso sin conexión a internet.

## Cómo funciona

Cualquier voluntario abre la app desde el celular, reporta lo que se necesita — rescate, atención médica, agua, comida, refugio — y el GPS marca el punto exacto. Si no hay señal en ese momento, no importa: el reporte se guarda en el teléfono y se envía solo cuando vuelve la conexión. No se pierde nada.

Los mismos voluntarios pueden ver todos los reportes que van entrando en un panel compartido, filtrar por zona o prioridad, y marcar qué casos ya están siendo atendidos para no duplicar esfuerzos. Cuando entra un reporte crítico o urgente, les llega una notificación directo al celular a quienes estén suscritos a esa ciudad.

La interfaz está diseñada con alto contraste, letras grandes y botones claros. Pensada para usarse con las manos sucias, con poca luz o desde un celular con la pantalla medio rota.

## Stack

No hay frameworks de frontend. Cada kilobyte de más es un segundo que alguien con 2G tiene que esperar.

- HTML, CSS, JS vanilla + Service Worker para offline
- Node.js + Express (TypeScript) en el backend
- Turso (SQLite edge) como base de datos
- Web Push para las alertas
- Docker para desplegar donde sea

## Levantar el proyecto

### Variables de entorno

Crea un `.env` en la raíz:

```env
PORT=3000
TURSO_URL=libsql://tu-base.turso.io
TURSO_AUTH_TOKEN=tu-token
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:tu@correo.com
COORDINATOR_TOKEN=contraseña-para-el-panel
```

### Desarrollo

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

No hay un proceso formal. Si ves algo que se puede mejorar, hacé un fork y mandá un PR. Lo único que importa es que funcione y que no pese más de lo necesario. Cada gramo cuenta cuando la conexión es un lujo.

---

Ojalá no hiciera falta. Pero hace falta.
