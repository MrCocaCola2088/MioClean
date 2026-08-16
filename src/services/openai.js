const OpenAI = require("openai");
const { products } = require("../models/products");

// GitHub Models API endpoint — uses a GitHub token for auth.
// Docs: https://docs.github.com/en/github-models
const GITHUB_MODELS_ENDPOINT = "https://models.inference.ai.azure.com";
const MODEL_CHAT = "gpt-4o-mini";
const MODEL_AUDIO = "whisper-1";

let openai = null;

function getProductFamilyKey(productName = "") {
  return productName.replace(/\s+\d+(?:[.,]\d+)?L$/i, "").trim().toLowerCase();
}

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
    if (!product || typeof product.sizeL !== "number") return item;

    const requestedLiters = extractRequestedLiters(item.matchedName || message);
    if (!requestedLiters || product.sizeL === requestedLiters) return item;

    const familyKey = getProductFamilyKey(product.name);
    const candidate = products.find(
      (p) =>
        typeof p.sizeL === "number" &&
        p.sizeL === requestedLiters &&
        getProductFamilyKey(p.name) === familyKey
    );

    return candidate ? { ...item, productId: candidate.id } : item;
  });
}

function getClient() {
  if (!openai) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error(
        "GITHUB_TOKEN environment variable is not set. " +
          "Generate a token at https://github.com/settings/tokens and set it as GITHUB_TOKEN."
      );
    }
    openai = new OpenAI({
      baseURL: GITHUB_MODELS_ENDPOINT,
      apiKey: token,
    });
  }
  return openai;
}

/**
 * Parse a natural language text message and extract product requests.
 * Returns an array of { productId, quantity, matchedName } objects.
 *
 * @param {string} message - User message in Spanish or English
 * @returns {Promise<{items: Array, raw: string}>}
 */
async function parseShoppingRequest(message) {
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
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const raw = response.choices[0].message.content;
  const parsed = JSON.parse(raw);
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
    model: "whisper-1",
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
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  return JSON.parse(response.choices[0].message.content);
}

module.exports = { parseShoppingRequest, transcribeAudio, getRecommendations };
