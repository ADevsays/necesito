---
name: spec-driven
description: Guía el ciclo Spec-Driven Development (SDD). Usar cuando el usuario pida implementar un feature, crear lógica de negocio, o generar tests. Garantiza que el agente lea spec.md antes de generar código, respete el Contrato y el Dominio, y genere tests de Validación automáticamente desde la especificación.
---

# Spec-Driven Development

El único input que determina el código es la especificación. Antes de escribir cualquier línea de código, lee `spec.md`.

## Ciclo de trabajo

1. **Leer `spec.md`** — Localizar la sección del feature a implementar.
2. **Respetar el Contrato** — Usar exactamente los tipos e interfaces definidos. No inventar tipos.
3. **Respetar el Dominio** — Cada regla de negocio en pseudocódigo debe tener un equivalente en el código. Si una regla no se puede implementar, detente y pregunta.
4. **Generar Validación** — Al terminar la implementación, generar tests desde la sección de Validación de la spec. El usuario no escribe tests manualmente.

## Estructura de una spec en spec.md

```md
## [Nombre del Feature]

### Contrato
Tipos TS, interfaces, enums, protocolos de API.

### Dominio
Reglas de negocio en pseudocódigo:
- "El X no puede ser menor a Y"
- "Si A entonces B"

### Validación
- Happy path: [caso esperado]
- Edge case: [caso no esperado]
- Sobrecarga: [límite de datos]
```

## Generación de tests

Con la sección **Validación** como input, genera tests que cubran:
- Casos esperados (happy path)
- Casos NO esperados (edge cases)
- Sobrecarga de datos

Los tests deben derivarse de las reglas del **Dominio**. Nunca escribas tests que no estén respaldados por la spec.

## Actualizar spec.md

Al completar un feature, actualiza `spec.md` marcando las validaciones cubiertas y agrega cualquier regla de dominio que hayas descubierto durante la implementación.
