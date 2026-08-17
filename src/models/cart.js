/**
 * Cart in-memory store (replace with a database in production)
 */

const carts = new Map();

/**
 * @typedef {Object} CartItem
 * @property {string} productId
 * @property {string} name
 * @property {number} quantity
 * @property {number} unitPrice
 * @property {number} total
 */

/**
 * @typedef {Object} Cart
 * @property {string} id
 * @property {string} sessionId
 * @property {CartItem[]} items
 * @property {number} subtotal
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {Object|null} crmData
 */

function createCart(sessionId) {
  const cart = {
    id: sessionId,
    sessionId,
    items: [],
    subtotal: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    crmData: null,
  };
  carts.set(sessionId, cart);
  return cart;
}

function getCart(sessionId) {
  return carts.get(sessionId) || null;
}

function getOrCreateCart(sessionId) {
  return getCart(sessionId) || createCart(sessionId);
}

function updateCart(sessionId, updates) {
  const cart = getOrCreateCart(sessionId);
  const updated = { ...cart, ...updates, updatedAt: new Date().toISOString() };
  updated.subtotal = updated.items.reduce((sum, item) => sum + item.total, 0);
  carts.set(sessionId, updated);
  return updated;
}

function clearCart(sessionId) {
  carts.delete(sessionId);
}

function addItemToCart(sessionId, product, quantity) {
  const cart = getOrCreateCart(sessionId);
  const existingIdx = cart.items.findIndex((i) => i.productId === product.id);

  let items;
  if (existingIdx >= 0) {
    items = cart.items.map((item, idx) =>
      idx === existingIdx
        ? { ...item, quantity: item.quantity + quantity, total: item.unitPrice * (item.quantity + quantity) }
        : item
    );
  } else {
    items = [
      ...cart.items,
      {
        productId: product.id,
        name: product.name,
        nameEn: product.nameEn,
        quantity,
        unitPrice: product.price,
        unit: product.unit,
        image: product.image || null,
        total: product.price * quantity,
      },
    ];
  }

  return updateCart(sessionId, { items });
}

function removeItemFromCart(sessionId, productId) {
  const cart = getOrCreateCart(sessionId);
  const items = cart.items.filter((i) => i.productId !== productId);
  return updateCart(sessionId, { items });
}

function getAllCarts() {
  return Array.from(carts.values());
}

module.exports = {
  createCart,
  getCart,
  getOrCreateCart,
  updateCart,
  clearCart,
  addItemToCart,
  removeItemFromCart,
  getAllCarts,
};
