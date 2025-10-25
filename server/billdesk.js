// server/billdesk.js
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const {
  BILLDESK_CLIENT_ID,
  BILLDESK_SECRET,
  BILLDESK_MERC_ID,
  BILLDESK_BASE_URL
} = process.env;

/**
 * Generate IST timestamp in yyyymmddHHMMss format
 */
function istTimestampCompact() {
  // yyyymmddHHMMss in IST
  const istOffsetMin = 5 * 60 + 30; // +05:30
  const now = new Date();
  const istMs = now.getTime() + (istOffsetMin - now.getTimezoneOffset()) * 60000;
  const ist = new Date(istMs);

  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = ist.getFullYear();
  const MM = pad(ist.getMonth() + 1);
  const dd = pad(ist.getDate());
  const HH = pad(ist.getHours());
  const mm = pad(ist.getMinutes());
  const ss = pad(ist.getSeconds());
  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
}

/**
 * Generate a new trace ID (10-35 chars)
 * Using crypto.randomBytes instead of uuid to avoid ES Module issues
 */
function newTraceId() {
  // Generate random bytes and convert to hex string
  return crypto.randomBytes(10).toString('hex');
}

/**
 * Sign payload with HS256 and create JWS compact format
 */
function jwsCompact(payload) {
  // HS256 compact JWS with clientid header
  const headers = { alg: "HS256", clientid: BILLDESK_CLIENT_ID };
  return jwt.sign(payload, BILLDESK_SECRET, { algorithm: "HS256", header: headers });
}

/**
 * Generate JOSE headers for BillDesk API calls
 */
function joseHeaders() {
  return {
    "content-type": "application/jose",
    "accept": "application/jose",
    "bd-timestamp": istTimestampCompact(),
    "bd-traceid": newTraceId()
  };
}

/**
 * Verify and decode JWS compact format
 */
function verifyJws(compact) {
  return jwt.verify(compact, BILLDESK_SECRET, { algorithms: ["HS256"] });
}

const billdesk = {
  mercId: BILLDESK_MERC_ID,
  baseUrl: BILLDESK_BASE_URL,
  clientId: BILLDESK_CLIENT_ID,
  jwsCompact,
  verifyJws,
  joseHeaders,
};

module.exports = { billdesk };
