# NECESITO Colombia

MVP PWA offline-first para registro de necesidades en emergencias.

## Ejecutar

```bash
npm start
```

Abre:

- Voluntarios: `http://localhost:3000/`
- Coordinación: `http://localhost:3000/coordinar`

## Estado actual

- Captura offline con IndexedDB
- Reportes persistentes en el teléfono
- Sincronización idempotente por `local_id`
- Dashboard de coordinación
- Service worker y manifest PWA
- Datasets geográficos vacíos preparados para no inventar datos

## Estructura de datos

Las zonas están preparadas en:

- `data/manizales`
- `data/cali`
- `data/pereira`
- `data/choco`

Cada carpeta incluye archivos vacíos listos para cargar datos verificados más adelante.
