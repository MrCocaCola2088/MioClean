# MioClean IA-Pedidos Test Plan

## Objective
Validate the AI-powered order flow for MioClean, focused on natural-language product parsing, cart updates, and final order submission.

## Scope
This plan targets the following API flows:
- POST /api/ai/parse-text
- POST /api/ai/parse-audio
- GET /api/cart/:sessionId
- POST /api/orders/:sessionId/submit
- GET /api/orders
- GET /api/orders/:sessionId

## Priority areas
1. AI text parsing for shopping requests
2. Auto-add to cart behavior
3. Order submission to CRM payload
4. Validation and security checks
5. Audio transcription and parsing

## Test matrix

| Priority | Scenario | Endpoint | Expected result |
| --- | --- | --- | --- |
| P0 | Parse valid Spanish shopping request | /api/ai/parse-text | 200, success=true, items found |
| P0 | Auto-add matched products to a cart | /api/ai/parse-text | cart updated with correct quantities |
| P0 | Submit a valid order with customer metadata | /api/orders/:sessionId/submit | 200 with CRM payload and totals |
| P0 | Fetch order list and detail | /api/orders and /api/orders/:sessionId | order data returned correctly |
| P1 | Missing message payload | /api/ai/parse-text | 400 and helpful error |
| P1 | Missing GitHub token | /api/ai/parse-text | 503 when AI is not configured |
| P1 | Audio transcription success path | /api/ai/parse-audio | 200 with transcription and parsed items |
| P1 | Invalid or unsupported audio format | /api/ai/parse-audio | 400 |
| P1 | Empty or invalid cart submit | /api/orders/:sessionId/submit | 404 |
| P2 | Unrecognized product terms | /api/ai/parse-text | unrecognized list populated |
| P2 | Stock validation | /api/ai/parse-text | quantity validation prevents over-purchase |
| P2 | Mixed-language request input | /api/ai/parse-text | valid parsing in Spanish/English |

## Detailed scenarios

### 1. AI text parsing
- Send a natural-language message like: "Necesito 2 galones de cloro y una caja de guantes de nitrilo"
- Confirm the API responds with success=true
- Verify returned items match catalog IDs and quantities
- Verify the summary message contains an understandable Spanish response

### 2. Auto-add to cart
- Use a valid sessionId
- Set autoAddToCart=true
- Confirm the cart now includes the AI-matched products
- Confirm quantities are validated against stock

### 3. Order creation and CRM payload
- Create or reuse a session with existing cart items
- Submit the order with customerName, customerEmail, customerPhone, company, notes
- Validate returned payload includes:
  - success=true
  - orderId
  - sessionId
  - createdAt/submittedAt
  - lineItems
  - totals.tax and totals.total

### 4. Orders API
- GET /api/orders should return all active cart sessions with items
- GET /api/orders/:sessionId should return the selected order details
- Invalid session IDs should return 404

### 5. Security and error handling
- Requests without the internal API key should be rejected as configured by middleware
- Missing required request bodies should fail with 400
- AI endpoints without GITHUB_TOKEN should fail with 503

### 6. Audio translation/voice shopping
- Upload a valid mp3/wav/webm audio file
- Validate transcription is returned
- Confirm parsed items are generated from the spoken request
- Confirm cleanup of uploaded temp file after processing

## Playwright execution strategy
The Playwright coverage should be written as API tests against the local server, using `request` fixtures rather than browser UI where possible.

Recommended flow:
1. Start the app locally
2. Ensure GITHUB_TOKEN is configured for AI endpoints
3. Run the API suite against http://localhost:3000
4. Validate automation against known products and cart flows

## Exit criteria
The IA-pedidos flow is considered ready when:
- all P0 and P1 scenarios pass
- quantity and stock logic are validated
- order submission returns the CRM payload structure
- AI endpoints behave correctly with and without configuration
