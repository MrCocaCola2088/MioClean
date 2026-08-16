const express = require("express");
const router = express.Router();
const { getAllCarts, getCart } = require("../models/cart");

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management and CRM export / Gestión de pedidos y exportación CRM
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: List all active cart sessions (orders)
 *     description: Returns all active shopping sessions with their contents. Intended for internal use or CRM pipeline consumption.
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: List of all active orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 total:
 *                   type: integer
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Cart'
 */
router.get("/", (req, res) => {
  const orders = getAllCarts().filter((c) => c.items.length > 0);
  res.json({ success: true, total: orders.length, orders });
});

/**
 * @swagger
 * /api/orders/{sessionId}:
 *   get:
 *     summary: Get order details by session ID
 *     description: Returns full order details including line items and totals for a specific session.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Order found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 order:
 *                   $ref: '#/components/schemas/Cart'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:sessionId", (req, res) => {
  const cart = getCart(req.params.sessionId);
  if (!cart) {
    return res.status(404).json({ success: false, error: "Order not found" });
  }
  res.json({ success: true, order: cart });
});

/**
 * @swagger
 * /api/orders/{sessionId}/submit:
 *   post:
 *     summary: Submit an order for CRM processing
 *     description: |
 *       Marks a cart as submitted and attaches customer metadata. This endpoint
 *       is designed to be called by external pipelines (e.g., a CRM or workflow
 *       automation) to finalize the order and attach customer data.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerName:
 *                 type: string
 *                 example: "Juan Pérez"
 *               customerEmail:
 *                 type: string
 *                 format: email
 *                 example: "juan@empresa.com"
 *               customerPhone:
 *                 type: string
 *                 example: "+1-809-555-0100"
 *               company:
 *                 type: string
 *                 example: "Limpieza Express S.R.L."
 *               notes:
 *                 type: string
 *                 example: "Entregar en almacén trasero"
 *     responses:
 *       200:
 *         description: Order submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CrmPayload'
 *       404:
 *         description: Order not found or empty
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/:sessionId/submit", (req, res) => {
  const cart = getCart(req.params.sessionId);
  if (!cart || cart.items.length === 0) {
    return res.status(404).json({ success: false, error: "Order not found or empty" });
  }

  const { updateCart } = require("../models/cart");
  const crmData = {
    customerName: req.body.customerName || "",
    customerEmail: req.body.customerEmail || "",
    customerPhone: req.body.customerPhone || "",
    company: req.body.company || "",
    notes: req.body.notes || "",
    submittedAt: new Date().toISOString(),
  };

  updateCart(req.params.sessionId, { crmData, status: "submitted" });

  const submittedCart = getCart(req.params.sessionId);

  const crmPayload = {
    success: true,
    orderId: `ORD-${Date.now()}`,
    sessionId: submittedCart.sessionId,
    source: "mioclean-web",
    status: "submitted",
    createdAt: submittedCart.createdAt,
    submittedAt: crmData.submittedAt,
    customer: crmData,
    lineItems: submittedCart.items.map((item, idx) => ({
      lineNumber: idx + 1,
      sku: item.productId,
      description: item.name,
      descriptionEn: item.nameEn,
      qty: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      lineTotal: item.total,
    })),
    totals: {
      subtotal: submittedCart.subtotal,
      tax: parseFloat((submittedCart.subtotal * 0.12).toFixed(2)),
      total: parseFloat((submittedCart.subtotal * 1.12).toFixed(2)),
      currency: "USD",
    },
  };

  res.json(crmPayload);
});

module.exports = router;
