/* ═══════════════════════════════════════════
   MioClean — Frontend Application
   ═══════════════════════════════════════════ */

const API = '';
const SESSION_KEY = 'mioclean_session';

// ─── Utilities ────────────────────────────────────────────────────────────────

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(() => { t.className = 'toast'; }, 3000);
}

function fmt(n) { return '$' + Number(n).toFixed(2); }

function categoryEmoji(cat) {
  const map = {
    detergentes: '🧴', desinfectantes: '🦠', jabones: '🧼', limpiapisos: '🫧',
    desengrasantes: '⚙️', papel: '🧻', equipos: '🧹', descartables: '🗑️',
    proteccion: '🧤', ambientadores: '🌸', lavandería: '👕',
  };
  return map[cat] || '📦';
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  hamburger.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => { navLinks.classList.remove('open'); });
});

// ─── Cart State ────────────────────────────────────────────────────────────────

let cartData = null;

async function fetchCart() {
  try {
    const res = await fetch(`${API}/api/cart/${getSessionId()}`);
    const data = await res.json();
    cartData = data.cart;
    renderCart();
  } catch (e) { /* offline */ }
}

function renderCart() {
  const badge = document.getElementById('cartBadge');
  const itemsEl = document.getElementById('cartItems');
  const footerEl = document.getElementById('cartFooter');

  if (!cartData || cartData.items.length === 0) {
    badge.textContent = '0';
    badge.classList.add('hidden');
    itemsEl.innerHTML = `<div class="cart-empty"><span>🛒</span><p>Tu carrito está vacío</p><a href="#catalogo" class="btn btn-outline" id="shopNowBtn">Shop Now</a></div>`;
    footerEl.hidden = true;
    return;
  }

  const count = cartData.items.reduce((s, i) => s + i.quantity, 0);
  badge.textContent = count;
  badge.classList.remove('hidden');

  itemsEl.innerHTML = cartData.items.map(item => `
    <div class="cart-item">
      <div class="cart-item-icon">${categoryEmoji(item.productId)}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-qty">×${item.quantity} ${item.unit}</div>
      </div>
      <div class="cart-item-price">${fmt(item.total)}</div>
      <button class="cart-item-remove" data-id="${item.productId}" title="Remove">✕</button>
    </div>
  `).join('');

  itemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
  });

  const tax = cartData.subtotal * 0.12;
  document.getElementById('cartSubtotal').textContent = fmt(cartData.subtotal);
  document.getElementById('cartTax').textContent = fmt(tax);
  document.getElementById('cartTotal').textContent = fmt(cartData.subtotal + tax);
  footerEl.hidden = false;
}

async function addToCart(productId, quantity = 1) {
  try {
    const res = await fetch(`${API}/api/cart/${getSessionId()}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity }),
    });
    const data = await res.json();
    if (!data.success) { showToast(data.error, 'error'); return; }
    cartData = data.cart;
    renderCart();
    showToast('✅ Agregado al carrito', 'success');
  } catch (e) { showToast('Error de conexión', 'error'); }
}

async function removeFromCart(productId) {
  try {
    const res = await fetch(`${API}/api/cart/${getSessionId()}/items/${productId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { cartData = data.cart; renderCart(); showToast('Eliminado del carrito'); }
  } catch (e) { showToast('Error de conexión', 'error'); }
}

async function clearCart() {
  try {
    await fetch(`${API}/api/cart/${getSessionId()}`, { method: 'DELETE' });
    cartData = null;
    renderCart();
    showToast('Carrito vaciado');
  } catch (e) { showToast('Error de conexión', 'error'); }
}

// ─── Cart Drawer ──────────────────────────────────────────────────────────────

const cartToggle = document.getElementById('cartToggle');
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const closeCartBtn = document.getElementById('closeCart');

function openCart() { cartDrawer.classList.add('open'); cartOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeCart() { cartDrawer.classList.remove('open'); cartOverlay.classList.remove('open'); document.body.style.overflow = ''; }

cartToggle.addEventListener('click', openCart);
closeCartBtn.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);
document.getElementById('clearCartBtn').addEventListener('click', () => { if (confirm('¿Vaciar el carrito?')) clearCart(); });
document.getElementById('checkoutBtn').addEventListener('click', () => {
  closeCart();
  document.getElementById('checkoutOverlay').hidden = false;
});

// ─── Checkout Modal ─────────────────────────────────────────────────────────

document.getElementById('closeCheckout').addEventListener('click', () => {
  document.getElementById('checkoutOverlay').hidden = true;
});
document.getElementById('checkoutOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('checkoutOverlay')) document.getElementById('checkoutOverlay').hidden = true;
});

document.getElementById('checkoutForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Processing...';

  try {
    const res = await fetch(`${API}/api/orders/${getSessionId()}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: document.getElementById('chkNombre').value,
        customerEmail: document.getElementById('chkEmail').value,
        customerPhone: document.getElementById('chkTel').value,
        company: document.getElementById('chkEmpresa').value,
        notes: document.getElementById('chkNotas').value,
      }),
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('checkoutForm').hidden = true;
      const successEl = document.getElementById('orderSuccess');
      successEl.hidden = false;
      document.getElementById('orderIdDisplay').textContent = `ID del pedido: ${data.orderId}`;
      cartData = null; renderCart();
    } else {
      showToast(data.error || 'Error al enviar el pedido', 'error');
    }
  } catch (err) { showToast('Error de conexión', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Submit Order ✅'; }
});

document.getElementById('closeSuccessBtn').addEventListener('click', () => {
  document.getElementById('checkoutOverlay').hidden = true;
  document.getElementById('checkoutForm').hidden = false;
  document.getElementById('orderSuccess').hidden = true;
  document.getElementById('checkoutForm').reset();
});

// ─── Product Catalog ──────────────────────────────────────────────────────────

let allProducts = [];
let activeCategory = '';

async function loadProducts() {
  try {
    const [pRes, cRes] = await Promise.all([
      fetch(`${API}/api/products`),
      fetch(`${API}/api/products/categories`),
    ]);
    const pData = await pRes.json();
    const cData = await cRes.json();
    allProducts = pData.products;
    renderCategories(cData.categories);
    renderProducts(allProducts);
  } catch (e) {
    document.getElementById('productsGrid').innerHTML = '<p class="no-results">Error cargando productos. Intenta de nuevo.</p>';
  }
}

function renderCategories(cats) {
  const bar = document.getElementById('categoriesBar');
  const all = bar.querySelector('[data-cat=""]');
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.dataset.cat = c.id;
    btn.textContent = c.nameEn.charAt(0).toUpperCase() + c.nameEn.slice(1);
    bar.appendChild(btn);
  });
  bar.addEventListener('click', e => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    bar.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.dataset.cat;
    filterProducts();
  });
}

function filterProducts() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const inStock = document.getElementById('inStockOnly').checked;
  let filtered = allProducts;
  if (activeCategory) filtered = filtered.filter(p => p.category === activeCategory);
  if (q) filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tags.some(t => t.includes(q)));
  if (inStock) filtered = filtered.filter(p => p.stock > 0);
  renderProducts(filtered);
}

function renderProducts(prods) {
  const grid = document.getElementById('productsGrid');
  if (!prods.length) { grid.innerHTML = '<p class="no-results">No se encontraron productos / No products found</p>'; return; }
  grid.innerHTML = prods.map(p => `
    <div class="product-card">
      <div class="product-img">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy" />` : categoryEmoji(p.category)}
        <span class="product-badge ${p.stock === 0 ? 'out' : ''}">${p.stock > 0 ? 'In Stock' : 'Agotado'}</span>
      </div>
      <div class="product-body">
        <div class="product-category">${p.categoryEn}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description}</div>
      </div>
      <div class="product-footer">
        <div>
          <div class="product-price">${fmt(p.price)}</div>
          <div class="product-unit">/ ${p.unit}</div>
        </div>
        <button class="add-btn" data-id="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>
          ${p.stock === 0 ? 'Agotado' : 'Add to Cart'}
        </button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.add-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.id, 1));
  });
}

document.getElementById('searchInput').addEventListener('input', filterProducts);
document.getElementById('inStockOnly').addEventListener('change', filterProducts);

// ─── AI – Text Parsing ────────────────────────────────────────────────────────

let lastAiItems = [];

document.getElementById('parseTextBtn').addEventListener('click', async () => {
  const msg = document.getElementById('aiTextInput').value.trim();
  if (!msg) { showToast('Escribe tu pedido primero', 'warning'); return; }
  const autoAdd = document.getElementById('textAutoAdd').checked;
  await runAiParse({ message: msg, autoAdd });
});

async function runAiParse({ message, autoAdd }) {
  const btn = document.getElementById('parseTextBtn');
  btn.disabled = true; btn.textContent = '⏳ Analizando...';

  try {
    const res = await fetch(`${API}/api/ai/parse-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId: getSessionId(), autoAddToCart: autoAdd }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Error de IA', 'error'); return; }
    if (autoAdd && data.cart) { cartData = data.cart; renderCart(); }
    displayAiResults(data, null);
  } catch (e) { showToast('Error de conexión', 'error'); }
  finally { btn.disabled = false; btn.innerHTML = '<span class="btn-icon">✨</span> Parse with AI'; }
}

// ─── AI – Audio ───────────────────────────────────────────────────────────────

let mediaRecorder = null;
let audioChunks = [];
let recordedBlob = null;
let selectedFile = null;

const recordBtn = document.getElementById('recordBtn');
const recordIcon = document.getElementById('recordIcon');
const recordLabel = document.getElementById('recordLabel');
const parseAudioBtn = document.getElementById('parseAudioBtn');
const audioFileInput = document.getElementById('audioFileInput');
const audioFileName = document.getElementById('audioFileName');

recordBtn.addEventListener('click', async () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    recordBtn.classList.remove('recording');
    recordIcon.textContent = '🎙️'; recordLabel.textContent = 'Start Recording';
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });
      stream.getTracks().forEach(t => t.stop());
      audioFileName.textContent = `Grabación lista (${(recordedBlob.size / 1024).toFixed(1)} KB)`;
      parseAudioBtn.disabled = false;
      selectedFile = null;
    };
    mediaRecorder.start();
    recordBtn.classList.add('recording');
    recordIcon.textContent = '⏹️'; recordLabel.textContent = 'Stop Recording';
  } catch (e) { showToast('No se pudo acceder al micrófono', 'error'); }
});

audioFileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  selectedFile = file;
  recordedBlob = null;
  audioFileName.textContent = file.name;
  parseAudioBtn.disabled = false;
});

parseAudioBtn.addEventListener('click', async () => {
  const blob = selectedFile || recordedBlob;
  if (!blob) { showToast('Sube o graba un audio primero', 'warning'); return; }
  const autoAdd = document.getElementById('audioAutoAdd').checked;

  parseAudioBtn.disabled = true; parseAudioBtn.textContent = '⏳ Transcribiendo...';

  try {
    const fd = new FormData();
    fd.append('audio', blob, selectedFile ? selectedFile.name : 'recording.webm');
    fd.append('sessionId', getSessionId());
    if (autoAdd) fd.append('autoAddToCart', 'true');

    const res = await fetch(`${API}/api/ai/parse-audio`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Error de IA', 'error'); return; }
    if (autoAdd && data.cart) { cartData = data.cart; renderCart(); }
    displayAiResults(data, data.transcription);
  } catch (e) { showToast('Error de conexión', 'error'); }
  finally { parseAudioBtn.disabled = false; parseAudioBtn.innerHTML = '<span class="btn-icon">🎧</span> Transcribe &amp; Parse'; }
});

function displayAiResults(data, transcription) {
  lastAiItems = data.items || [];

  document.getElementById('aiSummary').textContent = data.message || '';
  const transEl = document.getElementById('aiTranscription');
  if (transcription) { transEl.textContent = transcription; transEl.hidden = false; }
  else { transEl.hidden = true; }

  const itemsEl = document.getElementById('aiItemsList');
  if (lastAiItems.length) {
    itemsEl.innerHTML = lastAiItems.map(item => `
      <div class="ai-item-card">
        <div class="match-label">Interpretado como: "${item.matchedName}"</div>
        <div class="item-name">${item.product?.name || item.productId}</div>
        <div class="item-qty">Cantidad: ${item.quantity} ${item.product?.unit || ''}</div>
        <div class="item-price">${fmt((item.product?.price || 0) * item.quantity)}</div>
        <button class="btn btn-outline add-single-btn" style="margin-top:.5rem;font-size:.8rem;padding:.3rem .7rem" data-id="${item.productId}" data-qty="${item.quantity}">
          + Add to Cart
        </button>
      </div>
    `).join('');
    itemsEl.querySelectorAll('.add-single-btn').forEach(btn => {
      btn.addEventListener('click', () => addToCart(btn.dataset.id, parseInt(btn.dataset.qty)));
    });
  } else {
    itemsEl.innerHTML = '<p style="color:var(--text-muted);font-size:.9rem">No se reconocieron productos en el mensaje.</p>';
  }

  const unrec = data.unrecognized || [];
  const unrecEl = document.getElementById('aiUnrecognized');
  if (unrec.length) { unrecEl.textContent = unrec.join(', '); unrecEl.hidden = false; }
  else { unrecEl.hidden = true; }

  const actionsEl = document.getElementById('aiResultsActions');
  actionsEl.hidden = lastAiItems.length === 0;

  const resultsEl = document.getElementById('aiResults');
  resultsEl.hidden = false;
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('addAllToCartBtn').addEventListener('click', async () => {
  for (const item of lastAiItems) {
    await addToCart(item.productId, item.quantity);
  }
  showToast(`✅ ${lastAiItems.length} producto(s) agregados`, 'success');
});

document.getElementById('closeResults').addEventListener('click', () => {
  document.getElementById('aiResults').hidden = true;
});

// ─── Contact Form ─────────────────────────────────────────────────────────────

document.getElementById('contactForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('[type=submit]');
  const statusEl = document.getElementById('formStatus');
  btn.disabled = true;

  const body = {
    nombre: document.getElementById('cNombre').value.trim(),
    email: document.getElementById('cEmail').value.trim(),
    empresa: document.getElementById('cEmpresa').value.trim(),
    mensaje: document.getElementById('cMensaje').value.trim(),
    sessionId: getSessionId(),
  };

  try {
    const res = await fetch(`${API}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      statusEl.className = 'form-status success';
      statusEl.textContent = '✅ ¡Mensaje enviado! Te contactaremos pronto.';
      e.target.reset();
    } else {
      statusEl.className = 'form-status error';
      statusEl.textContent = `❌ Error: ${data.error}`;
    }
  } catch {
    statusEl.className = 'form-status error';
    statusEl.textContent = '❌ Error al enviar el mensaje. Intenta de nuevo.';
  }

  statusEl.hidden = false;
  btn.disabled = false;
  setTimeout(() => { statusEl.hidden = true; }, 6000);
});

// ─── Init ─────────────────────────────────────────────────────────────────────

fetchCart();
loadProducts();
