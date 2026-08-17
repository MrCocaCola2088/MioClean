const OpenAI = require("openai");
const { products } = require("../models/products");
const { getAgentResponsesUrl, getAgentAuthHeaders } = require("../config/azureAuth");

const DEFAULT_AZURE_OPENAI_ENDPOINT = "https://azure-openai-euu-001.openai.azure.com/";
const MODEL_CHAT = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || "gpt-5-mini";
const MODEL_AUDIO = process.env.AZURE_OPENAI_AUDIO_DEPLOYMENT || "whisper-1";

let openai = null;

function extractRequestedLiters(text = "") {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:l|lt|litro|litros)\b/i);
  if (!match) return null;
  const value = Number.parseFloat(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function normalizeParsedItemsBySize(items = [], message = "") {
  const byId = new Map(products.map((p) => [p.id, p]));
  return (items || []).map((item) => {
    const product = byId.get(item.productId);
    const requestedLiters = extractRequestedLiters(`${item.matchedName || ""} ${message}`);
    if (!requestedLiters) return item;

    const candidate = products.find((p) => p.sizeL === requestedLiters);
    if (candidate && (!product || product.sizeL !== requestedLiters)) {
      return { ...item, productId: candidate.id };
    }
    return item;
  });
}

function getClient() {
  if (!openai) {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureOpenAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT || DEFAULT_AZURE_OPENAI_ENDPOINT;
    if (!apiKey) {
      const err = new Error(
        "AZURE_OPENAI_API_KEY environment variable is not set. " +
          "Set it to your Azure OpenAI resource key."
      );
      err.status = 503;
      throw err;
    }
    openai = new OpenAI({
      baseURL: `${azureOpenAIEndpoint}openai/deployments/${MODEL_CHAT}`,
      apiKey,
      defaultHeaders: { "api-key": apiKey },
      defaultQuery: { "api-version": "2024-02-01" },
    });
  }
  return openai;
}

function extractAgentOutputText(payload) {
  if (!payload) return "";
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const parts = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function parseAgentOutput(outputText) {
  if (!outputText || typeof outputText !== "string") {
    throw new Error("Azure AI agent returned an empty response");
  }

  try {
    return JSON.parse(outputText);
  } catch {
    const start = outputText.indexOf("{");
    const end = outputText.lastIndexOf("}");
    if (start < 0 || end <= start) {
      throw new Error("Azure AI agent response was not valid JSON");
    }
    return JSON.parse(outputText.slice(start, end + 1));
  }
}

async function parseShoppingRequestWithAgent(message) {
  const catalog = products.map((p) => ({
    id: p.id,
    name: p.name,
    nameEn: p.nameEn,
    sizeL: p.sizeL,
    price: p.price,
    unit: p.unit,
    tags: p.tags.join(", "),
  }));

  const input =
    `Analiza esta solicitud de compra para el catálogo de MioClean y responde SOLO con JSON válido.\n\n` +
    `Catálogo:\n${JSON.stringify(catalog)}\n\n` +
    `Estructura exacta requerida:\n` +
    `{"items":[{"productId":"MC-XXX","quantity":1,"matchedName":"texto original"}],"unrecognized":[],"summary":"resumen breve en español"}\n\n` +
    `Reglas: si el cliente pide bidones de 5 litros usa MC-005; 4 litros MC-004; 1 litro MC-001. ` +
    `Si no indica cantidad, asume 1. El precio es 15 Bs por litro.\n\n` +
    `Mensaje del cliente: ${message}`;

  const response = await fetch(getAgentResponsesUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getAgentAuthHeaders()),
    },
    body: JSON.stringify({ input, stream: false }),
  });

  const rawBody = await response.text();
  if (!response.ok) {
    const err = new Error(`Azure AI agent error (${response.status}): ${rawBody.slice(0, 400)}`);
    err.status = response.status === 401 || response.status === 403 ? 503 : 502;
    throw err;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = { output_text: rawBody };
  }

  const outputText = extractAgentOutputText(payload) || rawBody;
  const parsed = parseAgentOutput(outputText);
  return {
    items: Array.isArray(parsed.items) ? parsed.items : [],
    unrecognized: Array.isArray(parsed.unrecognized) ? parsed.unrecognized : [],
    summary: typeof parsed.summary === "string" ? parsed.summary : "Pedido procesado",
    raw: outputText,
  };
}

/**
 * Parse a natural language text message and extract product requests.
 * Returns an array of { productId, quantity, matchedName } objects.
 *
 * @param {string} message - User message in Spanish or English
 * @returns {Promise<{items: Array, raw: string}>}
 */
async function parseShoppingRequest(message) {
  let parsed;
  let raw;

  try {
    const agentParsed = await parseShoppingRequestWithAgent(message);
    parsed = agentParsed;
    raw = agentParsed.raw;
  } catch (agentErr) {
    if (!process.env.AZURE_OPENAI_API_KEY) throw agentErr;
    console.warn("Azure agent parse failed, falling back to Azure OpenAI:", agentErr.message);
    const client = getClient();

    const catalog = products.map((p) => ({
      id: p.id,
      name: p.name,
      nameEn: p.nameEn,
      sizeL: p.sizeL,
      tags: p.tags.join(", "),
      unit: p.unit,
    }));

    const systemPrompt = `Eres un asistente de ventas para MioClean, una distribuidora de artículos de limpieza.
Tu tarea es analizar el mensaje del cliente e identificar qué productos quiere comprar y en qué cantidad.

CATÁLOGO DE PRODUCTOS DISPONIBLES (JSON):
${JSON.stringify(catalog, null, 2)}

Responde SOLO con un JSON válido con esta estructura exacta, sin explicaciones ni texto adicional:
{
  "items": [
    { "productId": "MC-XXX", "quantity": N, "matchedName": "nombre que usó el cliente" }
  ],
  "unrecognized": ["palabras o frases que no reconociste como productos"],
  "summary": "Resumen breve en español de lo que el cliente pidió"
}

Reglas:
- Si el cliente pide "cloro", busca en los tags y nombres del catálogo.
- Si no especifica cantidad, asume 1.
- Si menciona "docena" = 12, "caja" puede referirse al unit del producto.
- Si el cliente especifica presentación en litros (ej. 1L, 3L, 5L), elige el productId de ese tamaño exacto.
- Solo incluye productos que estén en el catálogo.
- El productId debe ser exactamente el del catálogo.`;

  const response = await client.chat.completions.create({
    model: MODEL_CHAT,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

    raw = response.choices[0].message.content;
    parsed = JSON.parse(raw);
  }

  const normalizedItems = normalizeParsedItemsBySize(parsed.items, message);

  return { ...parsed, items: normalizedItems, raw };
}

/**
 * Transcribe an audio file to text using OpenAI Whisper.
 *
 * @param {string} filePath - Absolute path to the audio file
 * @returns {Promise<string>} Transcribed text
 */
async function transcribeAudio(filePath) {
  const client = getClient();
  const fs = require("fs");
  const path = require("path");

  // Validate the file exists and is a regular file (no path traversal)
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    throw new Error("Invalid audio file path");
  }

  const transcription = await client.audio.transcriptions.create({
    file: fs.createReadStream(resolvedPath),
    model: MODEL_AUDIO,
    language: "es",
    response_format: "text",
  });

  return transcription;
}

/**
 * Generate product recommendations based on cart contents and context.
 *
 * @param {Array} cartItems - Current cart items
 * @param {string} context - Optional context (customer type, use case)
 * @returns {Promise<{recommendations: Array, message: string}>}
 */
async function getRecommendations(cartItems, context = "") {
  const client = getClient();

  const catalog = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    sizeL: p.sizeL,
    unit: p.unit,
    tags: p.tags.join(", "),
  }));

  const cartSummary = cartItems.map((i) => `${i.name} x${i.quantity}`).join(", ");

  const prompt = `El cliente tiene en su carrito: ${cartSummary}.
${context ? `Contexto adicional: ${context}` : ""}

Catálogo disponible: ${JSON.stringify(catalog)}

Recomienda hasta 3 productos complementarios que el cliente podría necesitar.
Responde SOLO con JSON:
{
  "recommendations": [
    { "productId": "MC-XXX", "reason": "razón breve en español" }
  ],
  "message": "mensaje amigable de recomendación en español"
}`;

  const response = await client.chat.completions.create({
    model: MODEL_CHAT,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  return JSON.parse(response.choices[0].message.content);
}

module.exports = { parseShoppingRequest, transcribeAudio, getRecommendations };
