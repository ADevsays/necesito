---
name: send-massive-emails
description: Guía estandarizada para crear scripts desechables de envíos masivos de correo electrónico en el proyecto Facto usando Nodemailer y Brevo SMTP.
---

# Send Massive Emails Skill

Esta skill define el procedimiento exacto y las configuraciones técnicas requeridas para enviar correos masivos a usuarios o fundadores dentro del ecosistema de Facto.

## 1. Configuración de Transporte (Nodemailer + Brevo)

El proyecto utiliza **Brevo** como proveedor SMTP. Para conectarse exitosamente sin errores de certificado SSL/TLS o rechazo de servidor, es **obligatorio** usar la siguiente configuración del transportador:

```typescript
import nodemailer from 'nodemailer'
import 'dotenv/config'

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_HOST || 'smtp-relay.brevo.com',
  port: Number(process.env.BREVO_PORT) || 587,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS
  },
  // CRÍTICO: Bypass requerido para evitar errores TLS con Brevo en Node
  tls: {
    rejectUnauthorized: true,
    checkServerIdentity: () => undefined
  },
  logger: false,
  debug: false
})
```

## 2. Remitente Verificado

Todo envío de correo DEBE usar el siguiente remitente oficial. Cualquier otro correo provocará que Brevo rechace el envío silenciosamente:

```typescript
from: '"Facto" <oficial@adevsays.com>'
```

## 3. Metodología "Test First"

Nunca realizar un envío masivo directamente. Los scripts de correo deben diseñarse con una estructura de prueba que restrinja el envío a correos internos a menos que se invoque con el flag `--production`.

```typescript
const args = process.argv.slice(2)
const isTest = args[0] !== '--production'

if (isTest) {
  // Enviar solo a correos de prueba: adevsaysinfo@gmail.com, adevsaysoficial@gmail.com
} else {
  // Enviar a los destinatarios reales (producción)
}
```

## 4. Diseño del Correo (Facto Aesthetic)

El diseño visual del correo debe alinearse perfectamente con el ecosistema de Facto. 
**Regla crítica:** Antes de generar el HTML del correo, DEBES consultar la skill `facto-design`. Utiliza esas directrices de colores premium (`#030305`), tipografías (Playfair Display, Inter) y estilos de botones (GlassButton Cyan) para construir el layout en HTML puro (usando CSS inline y etiquetas básicas compatibles con clientes de correo). No generes el diseño sin haber leído primero `facto-design`.

## 5. Datos Reales de Supabase

Cuando se enlacen startups del ranking en el correo, siempre obtener el `slug` actualizado desde la base de datos `saas_entries` en Supabase y construir las URLs usando el formato:
`https://www.factosaas.com/saas/${slug}`.
Nunca generar URLs basadas en el ID directamente (UUID), ya que el frontend utiliza el slug.
