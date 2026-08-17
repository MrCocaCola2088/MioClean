const express = require("express");
const rateLimit = require("express-rate-limit");
const { processPedidoInteligente } = require("../services/pedidoInteligente");

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

/**
 * @swagger
 * /api/pedido-inteligente:
 *   post:
 *     summary: Pedido inteligente con AgenteMioClean
 *     description: |
 *       Recibe texto en lenguaje natural (`inputText`), lo envía al agente Azure
 *       AgenteMioClean y devuelve un JSON de pedido (items, subtotal, delivery 12%, total).
 *       Si `autoAddToCart` es true, también carga el carrito/checkout.
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inputText
 *             properties:
 *               inputText:
 *                 type: string
 *                 example: quiero 2 bidones de 5 litros
 *               sessionId:
 *                 type: string
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *               autoAddToCart:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Pedido parseado
 *       400:
 *         description: Falta inputText
 */
router.post("/", limiter, async (req, res) => {
  const inputText = req.body?.inputText || req.body?.message;
  const { sessionId, autoAddToCart = true } = req.body || {};

  if (!inputText || typeof inputText !== "string" || inputText.trim() === "") {
    return res.status(400).json({ success: false, error: "inputText is required", message: "inputText is required" });
  }

  try {
    const data = await processPedidoInteligente({
      inputText: inputText.trim(),
      sessionId,
      autoAddToCart,
    });
    res.json(data);
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      error: error.message,
    });
  }
});

module.exports = router;
