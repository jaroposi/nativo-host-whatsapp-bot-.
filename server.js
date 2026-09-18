// Chatbot de WhatsApp para Nativo Host / Nuna Lodge
// Requiere Node.js 18+ (usa fetch nativo)

import express from "express";
import dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config();

const faqs = JSON.parse(readFileSync(new URL("./faq.json", import.meta.url)));

const app = express();
app.use(express.json());

const {
  VERIFY_TOKEN,
  WHATSAPP_TOKEN,
  PHONE_NUMBER_ID,
  USE_AI_FALLBACK,
  ANTHROPIC_API_KEY,
} = process.env;

// --- 1. Verificación del webhook (Meta la llama una sola vez al configurarlo) ---
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente.");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// --- 2. Recepción de mensajes entrantes ---
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // Meta espera una respuesta rápida (200) sin importar el resultado

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (!message) return; // ej: notificaciones de "leído", ignoradas

    const from = message.from;
    const text = (message.text?.body || "").trim();
    if (!text) return;

    console.log(`📩 Mensaje de ${from}: ${text}`);

    const reply = await buildReply(text);
    await sendWhatsAppMessage(from, reply);
  } catch (err) {
    console.error("Error procesando mensaje:", err);
  }
});

// --- Lógica de respuesta ---
function matchFaq(text) {
  const lower = text.toLowerCase();
  for (const item of faqs) {
    if (item.id !== "default" && item.keywords.some((k) => lower.includes(k))) {
      return item.answer;
    }
  }
  return null;
}

async function buildReply(text) {
  const direct = matchFaq(text);
  if (direct) return direct;

  if (USE_AI_FALLBACK === "true" && ANTHROPIC_API_KEY) {
    try {
      return await askClaude(text);
    } catch (err) {
      console.error("Error con IA de respaldo:", err);
    }
  }

  return faqs.find((f) => f.id === "default")?.answer;
}

// --- Respaldo con IA (opcional) para preguntas que no coinciden con el FAQ ---
async function askClaude(userText) {
  const contexto = faqs
    .filter((f) => f.id !== "default")
    .map((f) => `- ${f.id}: ${f.answer}`)
    .join("\n");

  const systemPrompt =
    `Eres el asistente de WhatsApp de Nativo Host / Nuna Lodge, un café y restaurante ` +
    `en la ruta Saraguro-Loja, Ecuador ("Siente la cultura, vive la experiencia"). ` +
    `Responde en español, de forma breve, cálida y directa (máximo 3-4 líneas). ` +
    `Usa esta información del negocio cuando sea relevante:\n${contexto}\n` +
    `Si no tienes la información exacta, dile amablemente al cliente que un miembro del equipo se lo confirmará pronto. No inventes precios ni horarios.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: "user", content: userText }],
    }),
  });

  const data = await response.json();
  const textBlock = data.content?.find((c) => c.type === "text");
  return textBlock?.text?.trim() || faqs.find((f) => f.id === "default")?.answer;
}

// --- Envío de mensajes vía WhatsApp Cloud API ---
async function sendWhatsAppMessage(to, body) {
  const res = await fetch(
    `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        text: { body },
      }),
    }
  );
  if (!res.ok) {
    console.error("Error enviando mensaje:", await res.text());
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor escuchando en puerto ${PORT}`));
