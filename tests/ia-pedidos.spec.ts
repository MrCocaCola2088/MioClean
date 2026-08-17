import { test, expect, APIRequestContext } from '@playwright/test';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? 'test-internal-key';

// The AI backend (Azure OpenAI deployment) may not be configured/reachable in every
// environment, so probe it once and skip AI-dependent tests with a clear reason instead
// of failing when the deployment isn't available.
let aiProbeStatus = 0;

async function probeAi(request: APIRequestContext) {
  const response = await request.post(`${API_URL}/api/ai/parse-text`, {
    data: { message: 'cloro' },
  });
  aiProbeStatus = response.status();
}

test.describe('MioClean IA pedidos flow', () => {
  test.beforeAll(async ({ request }) => {
    await probeAi(request);
  });

  test('POST /api/ai/parse-text returns AI-matched products for a valid shopping request', async ({ request }) => {
    test.skip(aiProbeStatus !== 200, `AI backend not available (probe returned ${aiProbeStatus})`);

    const response = await request.post(`${API_URL}/api/ai/parse-text`, {
      data: {
        message: 'Necesito 2 galones de cloro y una caja de guantes de nitrilo',
        autoAddToCart: false,
      },
    });

    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.success).toBeTruthy();
    expect(Array.isArray(json.items)).toBeTruthy();
    expect(json.items.length).toBeGreaterThan(0);
  });

  test('POST /api/pedido-inteligente returns structured cart JSON for 2 bidones de 5L', async ({ request }) => {
    test.skip(aiProbeStatus !== 200, `AI backend not available (probe returned ${aiProbeStatus})`);

    const sessionId = 'test-session-pedido-inteligente';
    const response = await request.post(`${API_URL}/api/pedido-inteligente`, {
      data: {
        inputText: 'quiero 2 bidones de 5 litros',
        sessionId,
        autoAddToCart: true,
      },
    });

    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.success).toBeTruthy();
    expect(json.pedido).toBeTruthy();
    expect(json.pedido.items.length).toBeGreaterThan(0);
    expect(json.pedido.items[0].litros).toBe(5);
    expect(json.pedido.items[0].cantidad).toBe(2);
    expect(json.pedido.subtotal).toBe(150);
    expect(json.pedido.delivery).toBe(18);
    expect(json.pedido.total).toBe(168);
    expect(json.cart).toBeTruthy();
    expect(json.cart.items.length).toBeGreaterThan(0);
  });

  test('POST /api/ai/parse-text can auto-add matched items to a cart session', async ({ request }) => {
    test.skip(aiProbeStatus !== 200, `AI backend not available (probe returned ${aiProbeStatus})`);

    const sessionId = 'test-session-ia-pedidos';
    const response = await request.post(`${API_URL}/api/ai/parse-text`, {
      data: {
        message: 'Quiero 1 detergente multiusos y 1 cloro',
        sessionId,
        autoAddToCart: true,
      },
    });

    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.success).toBeTruthy();
    expect(json.cart).toBeTruthy();
    expect(json.cart.sessionId).toBe(sessionId);
    expect(json.cart.items.length).toBeGreaterThan(0);
  });

  test('GET /api/orders returns active cart sessions', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/orders`, {
      headers: {
        'x-api-key': INTERNAL_API_KEY,
      },
    });
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.success).toBeTruthy();
    expect(Array.isArray(json.orders)).toBeTruthy();
  });

  test('POST /api/orders/:sessionId/submit returns CRM payload for a valid order', async ({ request }) => {
    const sessionId = 'test-session-submit';

    const seedResponse = await request.post(`${API_URL}/api/cart/${sessionId}/items`, {
      data: {
        productId: 'MC-001',
        quantity: 1,
      },
    });

    expect(seedResponse.status()).toBe(200);

    const submitResponse = await request.post(`${API_URL}/api/orders/${sessionId}/submit`, {
      headers: {
        'x-api-key': INTERNAL_API_KEY,
      },
      data: {
        customerName: 'Ana López',
        customerEmail: 'ana@mioclean.com',
        customerPhone: '+1-809-555-0100',
        company: 'MioClean Client',
        notes: 'Entrega en almacén central',
      },
    });

    expect(submitResponse.status()).toBe(200);
    const json = await submitResponse.json();
    expect(json.success).toBeTruthy();
    expect(json.orderId).toBeTruthy();
    expect(json.sessionId).toBe(sessionId);
    expect(json.customer.customerName).toBe('Ana López');
    expect(json.totals).toBeTruthy();
  });

  test('POST /api/ai/parse-text rejects missing message', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/ai/parse-text`, {
      data: {},
    });

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json.success).toBeFalsy();
  });

  test('POST /api/pedido-inteligente rejects missing inputText', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/pedido-inteligente`, {
      data: {},
    });

    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json.success).toBeFalsy();
  });

  test.describe('Spanish size-based shopping requests reflect the matched product in the cart', () => {
    const cases = [
      { message: 'Quiero comprar una sachet o paquete de 1 litro', sessionId: 'test-session-ia-1l', expectedSizeL: 1 },
      { message: 'quiero comprar una botella de 4 litros', sessionId: 'test-session-ia-4l', expectedSizeL: 4 },
      { message: 'quiero un bidon de 5 litros', sessionId: 'test-session-ia-5l', expectedSizeL: 5 },
    ];

    for (const { message, sessionId, expectedSizeL } of cases) {
      test(`"${message}" returns 200 and adds the matched product to the cart`, async ({ request }) => {
        test.skip(aiProbeStatus !== 200, `AI backend not available (probe returned ${aiProbeStatus})`);

        const response = await request.post(`${API_URL}/api/ai/parse-text`, {
          data: { message, sessionId, autoAddToCart: true },
        });

        expect(response.status()).toBe(200);
        const json = await response.json();
        expect(json.success).toBeTruthy();
        expect(Array.isArray(json.items)).toBeTruthy();
        expect(json.items.length).toBeGreaterThan(0);

        if (expectedSizeL !== null) {
          expect(json.items[0].product.sizeL).toBe(expectedSizeL);
        }

        // Cart must reflect the matched product, not just the parsed AI response.
        expect(json.cart).toBeTruthy();
        expect(json.cart.sessionId).toBe(sessionId);
        expect(json.cart.items.length).toBeGreaterThan(0);

        const cartProductIds = json.cart.items.map((i: { productId: string }) => i.productId);
        const matchedProductId = json.items[0].productId;
        expect(cartProductIds).toContain(matchedProductId);
      });
    }
  });
});
