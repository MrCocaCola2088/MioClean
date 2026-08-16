const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "MioClean API",
      version: "1.0.0",
      description: `
## MioClean — Distribuidora de Artículos de Limpieza

REST API for the MioClean AI-powered shopping platform. This API allows you to:

- 🛒 **Manage shopping carts** — create, update, and retrieve cart sessions
- 🤖 **AI smart cart** — parse natural-language text or voice messages into cart items using GitHub Models (GPT-4o-mini)
- 🎤 **Voice shopping** — upload an audio file and have it transcribed (Whisper via GitHub Models) and parsed automatically
- 💡 **AI recommendations** — get contextual product suggestions based on cart contents
- 📦 **Product catalog** — browse and search the full MioClean product catalog
- 📋 **CRM export** — export cart data as structured payloads ready for CRM or external pipeline consumption

### AI Backend
This API uses the **GitHub Models API** (https://models.inference.ai.azure.com) for all AI features.  
Set the GITHUB_TOKEN environment variable to a GitHub Personal Access Token.  
No OpenAI account or billing is required — a free GitHub account is sufficient for the free tier.  
Generate a token at: https://github.com/settings/tokens

### Authentication
No authentication is required for the public endpoints. The AI endpoints require a valid GITHUB_TOKEN set as an environment variable on the server.

### Language
The API accepts requests and returns responses in Spanish and English. Product data is bilingual (Spanish primary, English secondary fields suffixed with \`En\`).
      `.trim(),
      contact: {
        name: "MioClean Support",
        email: "soporte@mioclean.com",
      },
      license: {
        name: "ISC",
      },
    },
    servers: [
      {
        url: "http://localhost:{port}",
        description: "Local development server",
        variables: {
          port: {
            default: "3000",
            description: "Application port (set via PORT env variable)",
          },
        },
      },
    ],
    components: {
      schemas: {
        Product: {
          type: "object",
          description: "A MioClean catalog product",
          properties: {
            id: { type: "string", example: "MC-001", description: "Unique product identifier" },
            name: { type: "string", example: "Detergente Multiusos Premium", description: "Product name in Spanish" },
            nameEn: { type: "string", example: "Premium Multi-Purpose Detergent", description: "Product name in English" },
            category: { type: "string", example: "detergentes", description: "Category in Spanish" },
            categoryEn: { type: "string", example: "detergents", description: "Category in English" },
            brand: { type: "string", example: "MioClean Pro" },
            price: { type: "number", format: "float", example: 45.99, description: "Price in USD" },
            unit: { type: "string", example: "galón", description: "Unit of measure in Spanish" },
            unitEn: { type: "string", example: "gallon", description: "Unit of measure in English" },
            stock: { type: "integer", example: 250, description: "Units available in stock" },
            description: { type: "string", example: "Detergente concentrado para superficies industriales." },
            descriptionEn: { type: "string", example: "Concentrated detergent for industrial surfaces." },
            tags: { type: "array", items: { type: "string" }, example: ["detergente", "multiusos"] },
            image: { type: "string", example: "/images/detergente-premium.jpg" },
          },
        },
        CartItem: {
          type: "object",
          description: "A single line item in a shopping cart",
          properties: {
            productId: { type: "string", example: "MC-001" },
            name: { type: "string", example: "Detergente Multiusos Premium" },
            nameEn: { type: "string", example: "Premium Multi-Purpose Detergent" },
            quantity: { type: "integer", example: 2 },
            unitPrice: { type: "number", format: "float", example: 45.99 },
            unit: { type: "string", example: "galón" },
            total: { type: "number", format: "float", example: 91.98 },
          },
        },
        Cart: {
          type: "object",
          description: "A shopping cart session",
          properties: {
            id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            sessionId: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            items: { type: "array", items: { $ref: "#/components/schemas/CartItem" } },
            subtotal: { type: "number", format: "float", example: 91.98 },
            createdAt: { type: "string", format: "date-time", example: "2024-01-15T10:30:00.000Z" },
            updatedAt: { type: "string", format: "date-time", example: "2024-01-15T10:35:00.000Z" },
            crmData: {
              type: "object",
              nullable: true,
              description: "Attached customer CRM metadata (populated on order submit)",
            },
          },
        },
        CrmPayload: {
          type: "object",
          description: "CRM-ready order payload for pipeline integration",
          properties: {
            success: { type: "boolean" },
            orderId: { type: "string", example: "ORD-1705312200000" },
            sessionId: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
            source: { type: "string", example: "mioclean-web" },
            status: { type: "string", enum: ["pending", "submitted"], example: "submitted" },
            createdAt: { type: "string", format: "date-time" },
            submittedAt: { type: "string", format: "date-time" },
            customer: {
              type: "object",
              properties: {
                customerName: { type: "string", example: "Juan Pérez" },
                customerEmail: { type: "string", format: "email", example: "juan@empresa.com" },
                customerPhone: { type: "string", example: "+1-809-555-0100" },
                company: { type: "string", example: "Limpieza Express S.R.L." },
                notes: { type: "string", example: "Entregar en almacén trasero" },
              },
            },
            lineItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  lineNumber: { type: "integer", example: 1 },
                  sku: { type: "string", example: "MC-001" },
                  description: { type: "string", example: "Detergente Multiusos Premium" },
                  descriptionEn: { type: "string", example: "Premium Multi-Purpose Detergent" },
                  qty: { type: "integer", example: 2 },
                  unit: { type: "string", example: "galón" },
                  unitPrice: { type: "number", example: 45.99 },
                  lineTotal: { type: "number", example: 91.98 },
                },
              },
            },
            totals: {
              type: "object",
              properties: {
                subtotal: { type: "number", example: 91.98 },
                tax: { type: "number", description: "12% tax", example: 11.04 },
                total: { type: "number", example: 103.02 },
                currency: { type: "string", example: "USD" },
              },
            },
          },
        },
        AiParseResponse: {
          type: "object",
          description: "Response from AI parsing of a text or audio shopping request",
          properties: {
            success: { type: "boolean" },
            message: { type: "string", description: "AI-generated summary in Spanish", example: "Encontré 2 productos en tu pedido" },
            items: {
              type: "array",
              description: "Matched products from the catalog",
              items: {
                type: "object",
                properties: {
                  productId: { type: "string", example: "MC-002" },
                  quantity: { type: "integer", example: 2 },
                  matchedName: { type: "string", description: "What the customer said", example: "cloro" },
                  product: { $ref: "#/components/schemas/Product" },
                },
              },
            },
            unrecognized: {
              type: "array",
              description: "Terms from the request that could not be matched to any product",
              items: { type: "string" },
              example: ["champú"],
            },
            cart: {
              $ref: "#/components/schemas/Cart",
              nullable: true,
              description: "Updated cart (only if autoAddToCart was true and sessionId was provided)",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string", example: "Resource not found" },
          },
        },
      },
    },
    tags: [
      { name: "Products", description: "Product catalog / Catálogo de productos" },
      { name: "Cart", description: "Shopping cart / Carrito de compras" },
      { name: "AI", description: "AI smart shopping / Compras inteligentes con IA" },
      { name: "Orders", description: "Orders & CRM export / Pedidos y exportación CRM" },
    ],
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
