const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { getOrCreateCart, getCart, addItemToCart, removeItemFromCart, updateCart, clearCart } = require("../models/cart");
const { products } = require("../models/products");

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart management / Gestión del carrito de compras
 */

/**
 * @swagger
 * /api/cart/{sessionId}:
 *   get:
 *     summary: Get cart by session ID
 *     description: Retrieves the current cart for a given session. Creates a new empty cart if none exists.
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique session identifier (UUID)
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Cart data returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 cart:
 *                   $ref: '#/components/schemas/Cart'
 */
router.get("/:sessionId", (req, res) => {
  const cart = getOrCreateCart(req.params.sessionId);
  res.json({ success: true, cart });
});

/**
 * @swagger
 * /api/cart/{sessionId}/items:
 *   post:
 *     summary: Add an item to the cart
 *     description: Adds a product to the cart (or increases quantity if already present).
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID from the catalog
 *                 example: MC-001
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Number of units to add
 *                 example: 2
 *     responses:
 *       200:
 *         description: Item added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 cart:
 *                   $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Invalid input or insufficient stock
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/:sessionId/items", (req, res) => {
  const { productId, quantity } = req.body;
  const qty = Number.parseInt(quantity, 10);

  if (!productId || !Number.isFinite(qty) || qty < 1) {
    return res.status(400).json({ success: false, error: "productId y quantity son requeridos / productId and quantity are required" });
  }

  const product = products.find((p) => p.id === productId.toUpperCase());
  if (!product) {
    return res.status(404).json({ success: false, error: "Producto no encontrado / Product not found" });
  }

  if (product.stock < qty) {
    return res.status(400).json({ success: false, error: `Stock insuficiente / Insufficient stock. Available: ${product.stock}` });
  }

  const cart = addItemToCart(req.params.sessionId, product, qty);
  res.json({ success: true, cart });
});

/**
 * @swagger
 * /api/cart/{sessionId}/items/{productId}:
 *   delete:
 *     summary: Remove an item from the cart
 *     description: Removes a product completely from the cart.
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         example: MC-001
 *     responses:
 *       200:
 *         description: Item removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 cart:
 *                   $ref: '#/components/schemas/Cart'
 *       404:
 *         description: Cart not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:sessionId/items/:productId", (req, res) => {
  const cart = getCart(req.params.sessionId);
  if (!cart) {
    return res.status(404).json({ success: false, error: "Carrito no encontrado / Cart not found" });
  }
  const updated = removeItemFromCart(req.params.sessionId, req.params.productId.toUpperCase());
  res.json({ success: true, cart: updated });
});

/**
 * @swagger
 * /api/cart/{sessionId}:
 *   delete:
 *     summary: Clear the entire cart
 *     description: Removes all items from the cart and deletes the session.
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Cart cleared
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: Cart cleared successfully
 */
router.delete("/:sessionId", (req, res) => {
  clearCart(req.params.sessionId);
  res.json({ success: true, message: "Cart cleared successfully / Carrito eliminado" });
});

/**
 * @swagger
 * /api/cart/{sessionId}/crm:
 *   get:
 *     summary: Export cart as CRM-ready payload
 *     description: Returns the cart data formatted for CRM integration, including line items, totals, and customer metadata for use in external pipelines.
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: CRM payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CrmPayload'
 *       404:
 *         description: Cart not found or empty
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:sessionId/crm", (req, res) => {
  const cart = getCart(req.params.sessionId);
  if (!cart || cart.items.length === 0) {
    return res.status(404).json({ success: false, error: "Cart not found or empty" });
  }

  const crmPayload = {
    success: true,
    orderId: `ORD-${Date.now()}`,
    sessionId: cart.sessionId,
    source: "mioclean-web",
    createdAt: cart.createdAt,
    exportedAt: new Date().toISOString(),
    customer: cart.crmData || {},
    lineItems: cart.items.map((item, idx) => ({
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
      subtotal: cart.subtotal,
      tax: parseFloat((cart.subtotal * 0.12).toFixed(2)),
      total: parseFloat((cart.subtotal * 1.12).toFixed(2)),
      currency: "USD",
    },
  };

  res.json(crmPayload);
});

module.exports = router;
