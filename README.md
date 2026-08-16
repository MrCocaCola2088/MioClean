# 🧹 MioClean — Distribuidora de Artículos de Limpieza

AI-powered website for **MioClean**, a cleaning products distributor. Customers can place orders using **natural language text or voice** powered by **GitHub Models** (GPT-4o-mini + Whisper). The platform exposes a full **REST API** with **Swagger/OpenAPI docs** designed for CRM pipeline integration.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🛒 Smart Shopping Cart | Add products via text or voice AI |
| 🤖 GitHub Models AI | GPT-4o-mini parses orders, Whisper transcribes audio |
| 📚 Swagger UI | Full OpenAPI 3.0.3 docs at `/api-docs` |
| 🔌 CRM-ready API | Export cart as structured payload for external pipelines |
| 🌐 Responsive Design | Mobile-first, works on all screen sizes |
| 🇪🇸/🇺🇸 Bilingual | Spanish UI, English buttons — product data bilingual |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/MrCocaCola2088/MioClean.git
cd MioClean
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set your GITHUB_TOKEN
```

Generate a GitHub token at: https://github.com/settings/tokens  
*(No special scopes required for GitHub Models free tier)*

### 3. Start

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Open http://localhost:3000

---

## 📚 API Documentation

| URL | Description |
|-----|-------------|
| `GET /api-docs` | Swagger UI — interactive docs |
| `GET /api-docs.json` | Raw OpenAPI 3.0.3 spec (JSON) |
| `GET /api/health` | Health check |

### Endpoints Overview

#### Products
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/products` | List all products (filterable) |
| `GET` | `/api/products/categories` | List all categories |
| `GET` | `/api/products/:id` | Get product by ID |

#### Cart
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/cart/:sessionId` | Get or create cart |
| `POST` | `/api/cart/:sessionId/items` | Add item to cart |
| `DELETE` | `/api/cart/:sessionId/items/:productId` | Remove item |
| `DELETE` | `/api/cart/:sessionId` | Clear cart |
| `GET` | `/api/cart/:sessionId/crm` | Export as CRM payload |

#### AI (GitHub Models)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ai/parse-text` | Parse text → cart items |
| `POST` | `/api/ai/parse-audio` | Transcribe audio → cart items |
| `POST` | `/api/ai/recommendations` | AI product recommendations |

#### Orders
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/orders` | List all active orders |
| `GET` | `/api/orders/:sessionId` | Get order details |
| `POST` | `/api/orders/:sessionId/submit` | Submit order + attach CRM data |

---

## 🤖 AI Integration Example

### Parse a text order
```bash
curl -X POST http://localhost:3000/api/ai/parse-text \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Necesito 3 galones de cloro y una caja de guantes de nitrilo",
    "sessionId": "my-session-id",
    "autoAddToCart": true
  }'
```

### Parse an audio order
```bash
curl -X POST http://localhost:3000/api/ai/parse-audio \
  -F "audio=@pedido.mp3" \
  -F "sessionId=my-session-id" \
  -F "autoAddToCart=true"
```

### Export as CRM payload
```bash
curl http://localhost:3000/api/cart/my-session-id/crm
```

---

## 🏗️ Project Structure

```
MioClean/
├── index.js                  # Express app entry point
├── src/
│   ├── swagger.js            # OpenAPI 3.0.3 spec definition
│   ├── routes/
│   │   ├── products.js       # GET /api/products
│   │   ├── cart.js           # /api/cart
│   │   ├── ai.js             # /api/ai (GitHub Models)
│   │   └── orders.js         # /api/orders
│   ├── services/
│   │   └── openai.js         # GitHub Models API client
│   └── models/
│       ├── products.js       # Product catalog
│       └── cart.js           # In-memory cart store
├── public/
│   ├── index.html            # Frontend SPA
│   ├── css/style.css         # Responsive stylesheet
│   └── js/app.js             # Frontend JavaScript
└── .env.example
```

---

## 🔌 CRM Pipeline Integration

The `/api/orders/:sessionId/submit` endpoint returns a structured payload ready for CRM/ERP consumption:

```json
{
  "orderId": "ORD-1705312200000",
  "source": "mioclean-web",
  "status": "submitted",
  "customer": { "customerName": "...", "company": "..." },
  "lineItems": [{ "sku": "MC-001", "qty": 2, "lineTotal": 91.98 }],
  "totals": { "subtotal": 91.98, "tax": 11.04, "total": 103.02, "currency": "USD" }
}
```

---

## 📄 License

ISC © MioClean
