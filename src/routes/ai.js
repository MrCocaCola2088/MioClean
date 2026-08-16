const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const { v4: uuidv4 } = require("uuid");
const { parseShoppingRequest, transcribeAudio, getRecommendations } = require("../services/openai");
const { addItemToCart, getOrCreateCart } = require("../models/cart");
const { products } = require("../models/products");

const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

// Tighter rate limit for AI endpoints (they call external APIs and handle file uploads)
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

function createCartValidationError(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function validateCartQuantity(product, quantity) {
  const qty = Number.parseInt(quantity, 10);

  if (!Number.isFinite(qty) || qty < 1) {
    throw createCartValidationError("productId y quantity son requeridos / productId and quantity are required");
  }

  if (product.stock < qty) {
    throw createCartValidationError(`Stock insuficiente / Insufficient stock. Available: ${product.stock}`);
  }

  return qty;
}

function autoAddValidatedItemsToCart(sessionId, items) {
  const validatedItems = items.map((item) => ({
    item,
    quantity: validateCartQuantity(item.product, item.quantity),
  }));

  for (const { item, quantity } of validatedItems) {
    addItemToCart(sessionId, item.product, quantity);
  }

  return getOrCreateCart(sessionId);
}

// Multer config for audio uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(__dirname, "../../uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".webm";
    const name = `audio-${uuidv4()}${ext}`;
    // Store the server-generated filename in req so route handlers
    // can reconstruct the path without relying on req.file.path (user-tainted).
    req.uploadedFilename = name;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (req, file, cb) => {
    const allowed = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/ogg", "audio/m4a", "audio/mp4", "video/webm"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported audio format. Use mp3, wav, webm, ogg or m4a."));
    }
  },
});

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI-powered smart shopping cart endpoints / Carrito inteligente con IA
 */

/**
 * @swagger
 * /api/ai/transcribe:
 *   post:
 *     summary: Transcribe an audio file to text
 *     description: |
 *       Accepts an audio file (mp3, wav, webm, ogg, m4a) and returns only the raw
 *       transcription using OpenAI Whisper. No product parsing is performed.
 *       Use the transcription result with /api/ai/parse-text to generate an order.
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Audio file (mp3, wav, webm, ogg, m4a — max 25 MB)
 *     responses:
 *       200:
 *         description: Audio transcribed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transcription:
 *                   type: string
 *                   description: Raw transcription text
 *                   example: "Necesito dos galones de cloro y jabón antibacterial"
 *       400:
 *         description: No audio file uploaded or invalid format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: OpenAI API key not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/transcribe", aiLimiter, upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "Audio file is required. Field name: 'audio'" });
  }

  const filename = req.uploadedFilename;
  if (!filename) {
    return res.status(400).json({ success: false, error: "Upload processing error" });
  }
  const safePath = path.join(UPLOADS_DIR, path.basename(filename));

  try {
    const transcription = await transcribeAudio(safePath);
    fs.unlink(safePath, () => {});
    res.json({ success: true, transcription });
  } catch (err) {
    fs.unlink(safePath, () => {});
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/ai/parse-text:
 *   post:
 *     summary: Parse a text message into cart items
 *     description: |
 *       Sends a natural-language text message (Spanish or English) to OpenAI GPT and returns
 *       matched products from the MioClean catalog. The matched products can be optionally
 *       added to a cart session automatically.
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: Natural language shopping request in Spanish or English
 *                 example: "Necesito 2 galones de cloro y una caja de guantes de nitrilo"
 *               sessionId:
 *                 type: string
 *                 description: Optional cart session ID. If provided, matched items are added to the cart.
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *               autoAddToCart:
 *                 type: boolean
 *                 description: If true and sessionId is provided, automatically add matched products to cart
 *                 default: false
 *                 example: true
 *     responses:
 *       200:
 *         description: Successfully parsed shopping request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AiParseResponse'
 *       400:
 *         description: Missing required field
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: OpenAI API key not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/parse-text", aiLimiter, async (req, res) => {
  const { message, sessionId, autoAddToCart } = req.body;

  if (!message || typeof message !== "string" || message.trim() === "") {
    return res.status(400).json({ success: false, error: "message is required" });
  }

  try {
    const parsed = await parseShoppingRequest(message.trim());

    // Enrich with product details
    const enrichedItems = parsed.items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        return { ...item, product };
      })
      .filter(Boolean);

    // Auto-add to cart if requested
    let cart = null;
    if (autoAddToCart && sessionId) {
      cart = autoAddValidatedItemsToCart(sessionId, enrichedItems);
    }

    res.json({
      success: true,
      message: parsed.summary,
      items: enrichedItems,
      unrecognized: parsed.unrecognized || [],
      cart,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/ai/parse-audio:
 *   post:
 *     summary: Transcribe audio and parse into cart items
 *     description: |
 *       Accepts an audio file (mp3, wav, webm, ogg, m4a), transcribes it using OpenAI Whisper,
 *       then parses the transcription into MioClean catalog matches. Supports voice-based
 *       shopping requests in Spanish.
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Audio file (mp3, wav, webm, ogg, m4a — max 25 MB)
 *               sessionId:
 *                 type: string
 *                 description: Optional cart session ID to auto-add matched products
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *               autoAddToCart:
 *                 type: string
 *                 description: Set to "true" to auto-add matched products to the cart
 *                 example: "true"
 *     responses:
 *       200:
 *         description: Audio transcribed and parsed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/AiParseResponse'
 *                 - type: object
 *                   properties:
 *                     transcription:
 *                       type: string
 *                       description: Raw transcription from Whisper
 *                       example: "Necesito dos galones de cloro y jabón antibacterial"
 *       400:
 *         description: No audio file uploaded or invalid format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: OpenAI API key not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/parse-audio", aiLimiter, upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "Audio file is required. Field name: 'audio'" });
  }

  const { sessionId, autoAddToCart } = req.body;

  // Reconstruct path from server-generated filename (breaks taint from req.file.path)
  const filename = req.uploadedFilename;
  if (!filename) {
    return res.status(400).json({ success: false, error: "Upload processing error" });
  }
  const safePath = path.join(UPLOADS_DIR, path.basename(filename));

  try {
    // 1. Transcribe
    const transcription = await transcribeAudio(safePath);

    // 2. Parse
    const parsed = await parseShoppingRequest(transcription);

    // 3. Enrich
    const enrichedItems = parsed.items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        return { ...item, product };
      })
      .filter(Boolean);

    // 4. Auto-add to cart
    let cart = null;
    if (autoAddToCart === "true" && sessionId) {
      cart = autoAddValidatedItemsToCart(sessionId, enrichedItems);
    }

    // Clean up uploaded file
    fs.unlink(safePath, () => {});

    res.json({
      success: true,
      transcription,
      message: parsed.summary,
      items: enrichedItems,
      unrecognized: parsed.unrecognized || [],
      cart,
    });
  } catch (err) {
    if (safePath) fs.unlink(safePath, () => {});
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/ai/recommendations:
 *   post:
 *     summary: Get AI product recommendations for a cart
 *     description: |
 *       Analyzes the current cart contents and returns up to 3 AI-generated product
 *       recommendations from the MioClean catalog that complement the existing items.
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Cart session ID to analyze
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *               context:
 *                 type: string
 *                 description: Optional context (e.g. customer type, industry)
 *                 example: "restaurante de comida rápida"
 *     responses:
 *       200:
 *         description: Recommendations generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   description: AI-generated recommendation message in Spanish
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                         example: MC-004
 *                       reason:
 *                         type: string
 *                         example: "Complementa bien con los desinfectantes que ya tienes"
 *                       product:
 *                         $ref: '#/components/schemas/Product'
 *       400:
 *         description: Missing sessionId or empty cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: OpenAI API key not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/recommendations", aiLimiter, async (req, res) => {
  const { sessionId, context } = req.body;
  if (!sessionId) {
    return res.status(400).json({ success: false, error: "sessionId is required" });
  }

  const { getCart } = require("../models/cart");
  const cart = getCart(sessionId);
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ success: false, error: "Cart is empty or not found" });
  }

  try {
    const result = await getRecommendations(cart.items, context || "");
    const enriched = (result.recommendations || [])
      .map((r) => ({ ...r, product: products.find((p) => p.id === r.productId) }))
      .filter((r) => r.product);

    res.json({ success: true, message: result.message, recommendations: enriched });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
