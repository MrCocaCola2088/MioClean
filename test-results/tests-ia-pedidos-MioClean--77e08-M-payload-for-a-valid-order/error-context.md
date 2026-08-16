# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\ia-pedidos.spec.ts >> MioClean IA pedidos flow >> POST /api/orders/:sessionId/submit returns CRM payload for a valid order
- Location: tests\ia-pedidos.spec.ts:57:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 401
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const API_URL = process.env.API_URL ?? 'http://localhost:3000';
  4   | const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? 'test-internal-key';
  5   | const HAS_GITHUB_TOKEN = !!process.env.GITHUB_TOKEN;
  6   | 
  7   | test.describe('MioClean IA pedidos flow', () => {
  8   |   test('POST /api/ai/parse-text returns AI-matched products for a valid shopping request', async ({ request }) => {
  9   |     test.skip(!HAS_GITHUB_TOKEN, 'Requires GITHUB_TOKEN to call GitHub Models');
  10  | 
  11  |     const response = await request.post(`${API_URL}/api/ai/parse-text`, {
  12  |       data: {
  13  |         message: 'Necesito 2 galones de cloro y una caja de guantes de nitrilo',
  14  |         autoAddToCart: false,
  15  |       },
  16  |     });
  17  | 
  18  |     expect(response.status()).toBe(200);
  19  |     const json = await response.json();
  20  |     expect(json.success).toBeTruthy();
  21  |     expect(Array.isArray(json.items)).toBeTruthy();
  22  |     expect(json.items.length).toBeGreaterThan(0);
  23  |   });
  24  | 
  25  |   test('POST /api/ai/parse-text can auto-add matched items to a cart session', async ({ request }) => {
  26  |     test.skip(!HAS_GITHUB_TOKEN, 'Requires GITHUB_TOKEN to call GitHub Models');
  27  | 
  28  |     const sessionId = 'test-session-ia-pedidos';
  29  |     const response = await request.post(`${API_URL}/api/ai/parse-text`, {
  30  |       data: {
  31  |         message: 'Quiero 1 detergente multiusos y 1 cloro',
  32  |         sessionId,
  33  |         autoAddToCart: true,
  34  |       },
  35  |     });
  36  | 
  37  |     expect(response.status()).toBe(200);
  38  |     const json = await response.json();
  39  |     expect(json.success).toBeTruthy();
  40  |     expect(json.cart).toBeTruthy();
  41  |     expect(json.cart.sessionId).toBe(sessionId);
  42  |     expect(json.cart.items.length).toBeGreaterThan(0);
  43  |   });
  44  | 
  45  |   test('GET /api/orders returns active cart sessions', async ({ request }) => {
  46  |     const response = await request.get(`${API_URL}/api/orders`, {
  47  |       headers: {
  48  |         'x-api-key': INTERNAL_API_KEY,
  49  |       },
  50  |     });
  51  |     expect(response.status()).toBe(200);
  52  |     const json = await response.json();
  53  |     expect(json.success).toBeTruthy();
  54  |     expect(Array.isArray(json.orders)).toBeTruthy();
  55  |   });
  56  | 
  57  |   test('POST /api/orders/:sessionId/submit returns CRM payload for a valid order', async ({ request }) => {
  58  |     const sessionId = 'test-session-submit';
  59  | 
  60  |     const seedResponse = await request.post(`${API_URL}/api/cart/${sessionId}/items`, {
  61  |       data: {
  62  |         productId: 'MC-001',
  63  |         quantity: 1,
  64  |       },
  65  |     });
  66  | 
  67  |     expect(seedResponse.status()).toBe(200);
  68  | 
  69  |     const submitResponse = await request.post(`${API_URL}/api/orders/${sessionId}/submit`, {
  70  |       headers: {
  71  |         'x-api-key': INTERNAL_API_KEY,
  72  |       },
  73  |       data: {
  74  |         customerName: 'Ana López',
  75  |         customerEmail: 'ana@mioclean.com',
  76  |         customerPhone: '+1-809-555-0100',
  77  |         company: 'MioClean Client',
  78  |         notes: 'Entrega en almacén central',
  79  |       },
  80  |     });
  81  | 
> 82  |     expect(submitResponse.status()).toBe(200);
      |                                     ^ Error: expect(received).toBe(expected) // Object.is equality
  83  |     const json = await submitResponse.json();
  84  |     expect(json.success).toBeTruthy();
  85  |     expect(json.orderId).toBeTruthy();
  86  |     expect(json.sessionId).toBe(sessionId);
  87  |     expect(json.customer.customerName).toBe('Ana López');
  88  |     expect(json.totals).toBeTruthy();
  89  |   });
  90  | 
  91  |   test('POST /api/ai/parse-text rejects missing message', async ({ request }) => {
  92  |     const response = await request.post(`${API_URL}/api/ai/parse-text`, {
  93  |       data: {},
  94  |     });
  95  | 
  96  |     expect(response.status()).toBe(400);
  97  |     const json = await response.json();
  98  |     expect(json.success).toBeFalsy();
  99  |   });
  100 | });
  101 | 
```