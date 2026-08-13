# 🚨 Necesito Colombia

**Necesito** es una plataforma de respuesta a emergencias y coordinación de rescates diseñada específicamente para operar en condiciones extremas y de baja conectividad. Construida con una arquitectura *Offline-first*, permite a víctimas y voluntarios registrar solicitudes urgentes (rescate, asistencia médica, suministros) incluso sin internet, sincronizándose automáticamente en cuanto la conexión se restablece.

## 🎯 Características Principales

*   **⚡ Offline-First (PWA):** La aplicación web funciona sin conexión. Los reportes creados sin internet se guardan localmente y se suben al servidor automáticamente tan pronto como hay red.
*   **📍 Geolocalización de Precisión:** Captura coordenadas exactas por GPS para guiar a los equipos de rescate y voluntarios directamente al punto crítico, integrándose automáticamente con Google Maps.
*   **🎛️ Dashboard de Coordinación:** Panel de control en tiempo real para centros de mando. Permite filtrar por estado, municipio, prioridad y gestionar el ciclo de vida del reporte (Nuevo > En Proceso > Resuelto > Descartado).
*   **🔔 Alertas Push Inteligentes:** Notificaciones Push en tiempo real enviadas directamente a los dispositivos de los rescatistas cuando se reporta un caso "CRÍTICO" o "URGENTE" en su área de operaciones.
*   **🎨 Diseño Brutalista y Accesible:** Interfaz de alto contraste, tipografía grande y botones claros, diseñada para ser utilizada bajo estrés, con guantes, o en pantallas dañadas/con brillo bajo.

## 🛠️ Stack Tecnológico

La plataforma fue construida buscando la máxima ligereza, velocidad de carga y facilidad de despliegue en cualquier entorno de crisis:

*   **Frontend:** Vanilla JS, HTML5, CSS3 nativo. Sin frameworks pesados para garantizar tiempos de carga mínimos. Service Workers para caché offline.
*   **Backend:** Node.js + Express (escrito en TypeScript).
*   **Base de Datos:** SQLite Edge Serverless usando [Turso](https://turso.tech/) (LibSQL).
*   **Notificaciones:** Web Push Protocol (`web-push`).
*   **Despliegue:** Preparado nativamente para Docker / Dokploy / VPS.

## 🚀 Instalación y Despliegue Rápido

El repositorio incluye un `Dockerfile` optimizado, haciéndolo ideal para desplegar en plataformas PaaS como **Dokploy**, Vercel, Render, o un VPS tradicional usando Docker.

### Variables de Entorno Requeridas (`.env`)
```env
PORT=3000
TURSO_URL=libsql://tu-base-de-datos.turso.io
TURSO_AUTH_TOKEN=tu-token
VAPID_PUBLIC_KEY=tu-llave-publica
VAPID_PRIVATE_KEY=tu-llave-privada
VAPID_SUBJECT=mailto:contacto@dominio.com
COORDINATOR_TOKEN=tu-contraseña-dashboard
```

### Ejecutar Localmente para Desarrollo

```bash
# 1. Instalar dependencias
npm install

# 2. Compilar TypeScript e iniciar en modo desarrollo
npm run dev
```

### Desplegar con Docker
```bash
docker build -t necesito-app .
docker run -p 3000:3000 --env-file .env necesito-app
```

## 🤝 Contribuciones

Este es un proyecto abierto pensado para ayudar en tiempos de crisis. Cualquier contribución que mejore la accesibilidad, reduzca el peso de la aplicación, o facilite la coordinación de los rescatistas es bienvenida.

1. Haz un *Fork* del repositorio.
2. Crea una rama para tu feature (`git checkout -b feature/MejoraIncreible`).
3. Haz un *Commit* de tus cambios (`git commit -m 'Añade una mejora increíble'`).
4. Sube la rama (`git push origin feature/MejoraIncreible`).
5. Abre un Pull Request.

---
*Construido para resistir. Construido para salvar vidas.*
