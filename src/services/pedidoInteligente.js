const { parseShoppingRequest } = require("./openai");
const { addItemToCart, getOrCreateCart } = require("../models/cart");
const { products } = require("../models/products");

const DELIVERY_RATE = 0.12;

function getAgentMeta() {
  return {
    assistant_id: process.env.AZURE_AI_AGENT_NAME || "AgenteMioClean",
    version: process.env.AZURE_AI_AGENT_VERSION || "4",
    agentName: process.env.AZURE_AI_AGENT_NAME || "AgenteMioClean",
    resourceId:
      process.env.AZURE_AI_RESOURCE_ID ||
      "/subscriptions/140d7984-2f53-4403-bae9-2d38f0053476/resourceGroups/cloud-shell-storage-eastus/providers/Microsoft.CognitiveServices/accounts/mioclean-resource/projects/mioclean",
  };
}

function validateCartQuantity(product, quantity) {
  const qty = Number.parseInt(quantity, 10);
  if (!Number.isFinite(qty) || qty < 1) {
    const err = new Error("productId y quantity son requeridos / productId and quantity are required");
    err.status = 400;
    throw err;
  }
  if (product.stock < qty) {
    const err = new Error(`Stock insuficiente / Insufficient stock. Available: ${product.stock}`);
    err.status = 400;
    throw err;
  }
  return qty;
}

function enrichParsedItems(parsedItems) {
  return (parsedItems || [])
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      return { ...item, product };
    })
    .filter(Boolean);
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

function roundBs(n) {
  return Math.round(Number(n));
}

function buildPedido(inputText, summary, enrichedItems, unrecognized) {
  const items = enrichedItems.map((item) => {
    const precioUnitario = item.product?.price ?? 0;
    const cantidad = item.quantity;
    return {
      productId: item.productId,
      nombre: item.product?.name || item.productId,
      cantidad,
      unidad: item.product?.unit || "",
      litros: item.product?.sizeL ?? null,
      precioUnitario,
      subtotal: roundBs(precioUnitario * cantidad),
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const delivery = roundBs(subtotal * DELIVERY_RATE);
  const total = subtotal + delivery;

  return {
    resumen: summary || "",
    inputText,
    items,
    noReconocidos: unrecognized || [],
    subtotal,
    delivery,
    deliveryRate: DELIVERY_RATE,
    total,
    moneda: "Bs",
  };
}

async function processPedidoInteligente({ inputText, sessionId, autoAddToCart }) {
  const parsed = await parseShoppingRequest(inputText.trim());
  const items = enrichParsedItems(parsed.items);
  const unrecognized = parsed.unrecognized || [];
  const pedido = buildPedido(inputText.trim(), parsed.summary, items, unrecognized);

  let cart = null;
  if (autoAddToCart && sessionId && items.length) {
    cart = autoAddValidatedItemsToCart(sessionId, items);
  }

  return {
    success: true,
    message: parsed.summary,
    items,
    unrecognized,
    pedido,
    cart,
    agent: getAgentMeta(),
  };
}

module.exports = {
  DELIVERY_RATE,
  processPedidoInteligente,
  enrichParsedItems,
  autoAddValidatedItemsToCart,
};
