require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./src/swagger");

// Routes
const productsRouter = require("./src/routes/products");
const cartRouter = require("./src/routes/cart");
const aiRouter = require("./src/routes/ai");
const ordersRouter = require("./src/routes/orders");
const contactRouter = require("./src/routes/contact");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
const swaggerLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

// ─── Security & Utilities ────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
        fontSrc: ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com"],
        // Product images are served from github.com/user-attachments, which redirects to a
        // rotating github-production-user-asset-*.s3.amazonaws.com signed URL — allow any https image host.
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'", "blob:"],
      },
    },
  })
);
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ─── Swagger UI ───────────────────────────────────────────────────────────────
app.use(
  "/api-docs",
  swaggerLimiter,
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: `
      .swagger-ui .topbar { background-color: #1a6ca8; }
      .swagger-ui .topbar .download-url-wrapper { display: none; }
    `,
    customSiteTitle: "MioClean API Docs",
    customfavIcon: "/favicon.ico",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tagsSorter: "alpha",
    },
  })
);

// Expose raw OpenAPI spec as JSON
app.get("/api-docs.json", swaggerLimiter, (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api", generalLimiter);
app.use("/api/products", productsRouter);
app.use("/api/cart", cartRouter);
app.use("/api/ai", aiRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/contact", contactRouter);

// ─── Health Check ────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     description: Returns the current server status and timestamp.
 *     tags: []
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: MioClean API
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 openai:
 *                   type: string
 *                   example: configured
 */
app.get("/api/health", (req, res) => {
  const hasAgentConfig = Boolean(process.env.AZURE_AI_PROJECT_ENDPOINT && process.env.AZURE_AI_AGENT_NAME && process.env.AZURE_AI_AGENT_VERSION);
  res.json({
    status: "ok",
    service: "MioClean API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    ai_backend: hasAgentConfig ? "azure-ai-agent" : "azure-openai",
    ai_configured: process.env.AZURE_OPENAI_API_KEY ? "configured" : "not configured",
  });
});

// ─── SPA fallback ─────────────────────────────────────────────────────────────
app.get("/{*path}", generalLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ─── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🧹 MioClean API running at http://localhost:${PORT}`);
    console.log(`📚 Swagger docs:      http://localhost:${PORT}/api-docs`);
    console.log(`📄 OpenAPI JSON:      http://localhost:${PORT}/api-docs.json`);
    console.log(`🔑 Azure OpenAI:      ${process.env.AZURE_OPENAI_API_KEY ? "✅ Configured" : "❌ Not configured (set AZURE_OPENAI_API_KEY)"}`);
    console.log(`🤖 Azure AI Agent:    ${process.env.AZURE_AI_PROJECT_ENDPOINT && process.env.AZURE_AI_AGENT_NAME && process.env.AZURE_AI_AGENT_VERSION ? "✅ Enabled for parse" : "⚪ Disabled (set AZURE_AI_PROJECT_ENDPOINT, AZURE_AI_AGENT_NAME, AZURE_AI_AGENT_VERSION)"}\n`);
  });
}

module.exports = app;
