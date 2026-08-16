const express = require("express");
const router = express.Router();
const { products } = require("../models/products");

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Catálogo de productos MioClean / MioClean product catalog
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List all products
 *     description: Returns the full MioClean product catalog with optional filtering by category or search term.
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by product category (e.g. detergentes, desinfectantes)
 *         example: detergentes
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search term (matches name, description or tags)
 *         example: cloro
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *         description: If true, return only products with stock > 0
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 total:
 *                   type: integer
 *                   example: 12
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
router.get("/", (req, res) => {
  const { category, q, inStock } = req.query;
  let result = [...products];

  if (category) {
    result = result.filter((p) => p.category === category.toLowerCase());
  }

  if (q) {
    const term = q.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.tags.some((t) => t.toLowerCase().includes(term))
    );
  }

  if (inStock === "true") {
    result = result.filter((p) => p.stock > 0);
  }

  res.json({ success: true, total: result.length, products: result });
});

/**
 * @swagger
 * /api/products/categories:
 *   get:
 *     summary: List all product categories
 *     description: Returns all unique categories in the MioClean catalog.
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: detergentes
 *                       name:
 *                         type: string
 *                         example: detergentes
 *                       nameEn:
 *                         type: string
 *                         example: detergents
 */
router.get("/categories", (req, res) => {
  const unique = [];
  const seen = new Set();
  for (const p of products) {
    if (!seen.has(p.category)) {
      seen.add(p.category);
      unique.push({ id: p.category, name: p.category, nameEn: p.categoryEn });
    }
  }
  res.json({ success: true, categories: unique });
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     description: Returns a single product from the catalog by its unique ID.
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID (e.g. MC-001)
 *         example: MC-001
 *     responses:
 *       200:
 *         description: Product found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", (req, res) => {
  const product = products.find((p) => p.id === req.params.id.toUpperCase());
  if (!product) {
    return res.status(404).json({ success: false, error: "Producto no encontrado / Product not found" });
  }
  res.json({ success: true, product });
});

module.exports = router;
