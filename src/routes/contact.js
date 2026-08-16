const express = require("express");
const router = express.Router();
const { getCart } = require("../models/cart");

const WHATSAPP_TO = "whatsapp:+59177056858";

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw Object.assign(new Error("Twilio not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."), { status: 503 });
  }
  const twilio = require("twilio");
  return twilio(sid, token);
}

/**
 * @swagger
 * tags:
 *   name: Contact
 *   description: Contact form / Formulario de contacto
 */

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Send a contact message via WhatsApp
 *     description: |
 *       Sends the contact form data (and optionally the current cart order)
 *       as a WhatsApp message to the MioClean sales number.
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - email
 *               - mensaje
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Juan Pérez"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "juan@empresa.com"
 *               empresa:
 *                 type: string
 *                 example: "Limpieza Express S.R.L."
 *               mensaje:
 *                 type: string
 *                 example: "Necesito cotización para 50 unidades"
 *               sessionId:
 *                 type: string
 *                 description: Optional cart session ID to include the current order in the message
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 messageSid:
 *                   type: string
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: Twilio not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", async (req, res) => {
  const { nombre, email, empresa, mensaje, sessionId } = req.body;

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ success: false, error: "nombre, email y mensaje son requeridos" });
  }

  // Build message text
  let text = `📩 *Nuevo mensaje de contacto - MioClean*\n\n`;
  text += `👤 *Nombre:* ${nombre}\n`;
  text += `✉️ *Email:* ${email}\n`;
  if (empresa) text += `🏢 *Empresa:* ${empresa}\n`;
  text += `\n💬 *Mensaje:*\n${mensaje}\n`;

  // Attach cart/order if sessionId provided
  if (sessionId) {
    const cart = getCart(sessionId);
    if (cart && cart.items && cart.items.length > 0) {
      text += `\n📦 *Pedido (carrito):*\n\`\`\`\n${JSON.stringify(cart, null, 2)}\n\`\`\``;
    }
  }

  try {
    const client = getTwilioClient();
    const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
    const message = await client.messages.create({ from, to: WHATSAPP_TO, body: text });
    res.json({ success: true, messageSid: message.sid });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
