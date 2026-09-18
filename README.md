# Chatbot de WhatsApp — Nativo Host 

Responde automáticamente preguntas frecuentes (menú, horarios, reservas, ubicación, hospedaje) a quienes escriban a tu número de WhatsApp. Opcionalmente puede usar IA para responder preguntas libres que no estén en la lista de FAQ.

## ⚠️ Algo importante primero

Esto usa la **WhatsApp Business Platform (Cloud API)** de Meta, que es distinta de la app gratuita "WhatsApp Business" que probablemente ya usas en tu celular con el `/menu`. No es algo que se descargue ni se instale: es un servicio en la nube al que accedes desde el panel web de Meta for Developers, y este código (que sí corre en un servidor) es el que se conecta a ese servicio. Para conectar un bot como este necesitas:

- Un número de teléfono dedicado para la API (puede ser un número nuevo, o migrar el actual — migrar tiene sus propios pasos y hace que ya no puedas usar la app normal en ese número).
- Una cuenta de Meta for Developers y una "app" de WhatsApp Business.
- Un servidor con URL pública (HTTPS) donde alojar este código, porque Meta necesita poder enviarle mensajes.

No sustituye tus respuestas rápidas actuales de la app — es un sistema aparte, más flexible pero que requiere esta configuración inicial.

## Pasos para configurarlo

### 1. Crear la app de WhatsApp en Meta
1. Entra a [developers.facebook.com](https://developers.facebook.com/) y crea una cuenta de desarrollador si no tienes.
2. Crea una nueva App → tipo "Business".
3. Dentro de la app, agrega el producto **WhatsApp**.
4. Meta te dará automáticamente un número de prueba, un **Token de acceso temporal** (dura 24h, luego generas uno permanente) y un **Phone Number ID**.

### 2. Preparar el proyecto
```bash
npm install
cp .env.example .env
```
Edita `.env` con:
- `VERIFY_TOKEN`: una frase secreta que inventes tú mismo.
- `WHATSAPP_TOKEN`: el token de acceso de tu app.
- `PHONE_NUMBER_ID`: el que te dio Meta.

### 3. Personalizar las respuestas
Abre `faq.json` y reemplaza los textos marcados con "EDITA ESTO" por tu información real: menú, horarios, política de reservas, ubicación, hospedaje. Cada entrada tiene `keywords` (palabras que activan esa respuesta) y `answer` (lo que responde el bot). Puedes agregar más entradas o palabras clave libremente.

### 4. Desplegar en un servidor público
Necesitas que el servidor sea accesible por HTTPS. Opciones sencillas y con capa gratuita: **Render**, **Railway** o **Fly.io**. En cualquiera de ellas:
1. Sube esta carpeta a un repositorio de GitHub.
2. Conecta el repositorio al servicio elegido.
3. Configura las mismas variables del `.env` en el panel del servicio.
4. Despliega — te darán una URL pública, por ejemplo `https://tu-bot.onrender.com`.

### 5. Conectar el webhook en Meta
1. En el panel de tu app, ve a WhatsApp → Configuration.
2. En "Webhook", coloca la URL: `https://tu-bot.onrender.com/webhook`.
3. En "Verify token" coloca el mismo valor que pusiste en `VERIFY_TOKEN`.
4. Suscríbete al campo `messages`.

### 6. Probar
Escríbele desde tu celular al número de prueba que te dio Meta. Deberías recibir la respuesta automática correspondiente.

### 7. (Opcional) Activar respuestas con IA
Si quieres que el bot conteste con naturalidad preguntas que no estén en `faq.json`, pon `USE_AI_FALLBACK=true` y agrega tu `ANTHROPIC_API_KEY` (la obtienes en [console.anthropic.com](https://console.anthropic.com/)). El bot usará el contexto de tu negocio para responder, pero evitará inventar precios u horarios que no le hayas dado.

## Ir a producción
El número de prueba de Meta solo puede enviar mensajes a números que agregues manualmente a una lista. Para atender a cualquier cliente necesitas verificar tu negocio en Meta Business Manager y solicitar un número de producción — Meta pide algunos días para revisar esto.
