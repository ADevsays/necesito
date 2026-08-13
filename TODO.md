# TODO — Necesito

## Pendiente

### Sistema de Moderación Comunitaria (Anti-Troll)
- [ ] Nueva tabla `report_flags` (report_id, flagged_by, reason, created_at)
- [ ] Endpoint `POST /api/reports/:id/flag` con protección de voto duplicado
- [ ] Auto-ocultar reportes con 3+ flags (estado `flagged`)
- [ ] Excluir `flagged` del listado por defecto en `listReports`
- [ ] Botón "⚠ Reportar" en cada tarjeta del panel de coordinación
- [ ] Contador visual de flags en la tarjeta
- [ ] Animación de ocultamiento al llegar al umbral
