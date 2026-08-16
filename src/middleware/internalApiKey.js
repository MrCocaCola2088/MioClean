const crypto = require("crypto");

function hasValidInternalApiKey(req) {
  const configuredKey = process.env.INTERNAL_API_KEY;
  if (!configuredKey) {
    return { ok: false, status: 503, error: "Internal API not configured. Set INTERNAL_API_KEY." };
  }

  const providedKey = req.get("x-api-key");
  if (!providedKey) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const expected = Buffer.from(configuredKey);
  const received = Buffer.from(providedKey);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true };
}

function requireInternalApiKey(req, res, next) {
  const result = hasValidInternalApiKey(req);
  if (!result.ok) {
    return res.status(result.status).json({ success: false, error: result.error });
  }

  next();
}

module.exports = { requireInternalApiKey };
