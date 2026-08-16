import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? 'test-internal-key';
const HAS_GITHUB_TOKEN = !!process.env.GITHUB_TOKEN;

test.describe('MioClean IA pedidos flow', () => {
  test('POST /api/ai/parse-text returns AI-matched products for a valid shopping request', async ({ request }) => {
    test.skip(!HAS_GITHUB_TOKEN, 'Requires GITHUB_TOKEN to call GitHub Models');

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

  test('POST /api/ai/parse-text can auto-add matched items to a cart session', async ({ request }) => {
    test.skip(!HAS_GITHUB_TOKEN, 'Requires GITHUB_TOKEN to call GitHub Models');

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
});
