// server/billdesk.js
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Load BillDesk configuration from .env file
const {
  BILLDESK_CLIENT_ID,
  BILLDESK_SECRET,
  BILLDESK_MERC_ID,
  BILLDESK_BASE_URL,
  BILLDESK_KEY_ID
} = process.env;

// Validate configuration on module load
function validateConfig() {
  const missing = [];
  if (!BILLDESK_CLIENT_ID || BILLDESK_CLIENT_ID.includes('your_')) missing.push('BILLDESK_CLIENT_ID');
  if (!BILLDESK_SECRET || BILLDESK_SECRET.includes('your_')) missing.push('BILLDESK_SECRET');
  if (!BILLDESK_MERC_ID || BILLDESK_MERC_ID.includes('your_')) missing.push('BILLDESK_MERC_ID');
  if (!BILLDESK_BASE_URL) missing.push('BILLDESK_BASE_URL');
  if (!BILLDESK_KEY_ID) missing.push('BILLDESK_KEY_ID');
  if (missing.length > 0) {
    console.warn('⚠️  BillDesk Configuration Warning: Missing or placeholder values detected');
    console.warn(`⚠️  Please update these in .env file: ${missing.join(', ')}`);
    console.warn('⚠️  Running in MOCK mode until credentials are configured');
    return false;
  }
  
  console.log('✓ BillDesk configuration loaded from .env file');
  console.log(`✓ Merchant ID: ${BILLDESK_MERC_ID}`);
  console.log(`✓ Client ID: ${BILLDESK_CLIENT_ID}`);
  console.log(`✓ Base URL: ${BILLDESK_BASE_URL}`);
  return true;
}

// Check configuration on module load
const isConfigured = validateConfig();

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
  if (!BILLDESK_SECRET) {
    throw new Error('BILLDESK_SECRET is not configured. Please update .env file.');
  }
  if (!BILLDESK_CLIENT_ID) {
    throw new Error('BILLDESK_CLIENT_ID is not configured. Please update .env file.');
  }
  if (!BILLDESK_KEY_ID) {
    throw new Error('BILLDESK_KEY_ID is not configured. Please update .env file.');
  }
  
  // HS256 compact JWS with clientid and kid (key ID) headers
  const headers = { 
    alg: "HS256", 
    clientid: BILLDESK_CLIENT_ID,
    kid: BILLDESK_KEY_ID
  };
  
  console.log('Signing JWT with headers:', headers);
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
  if (!BILLDESK_SECRET) {
    throw new Error('BILLDESK_SECRET is not configured. Please update .env file.');
  }
  
  return jwt.verify(compact, BILLDESK_SECRET, { algorithms: ["HS256"] });
}

const billdesk = {
  mercId: BILLDESK_MERC_ID,
  baseUrl: BILLDESK_BASE_URL,
  clientId: BILLDESK_CLIENT_ID,
  isConfigured,
  jwsCompact,
  verifyJws,
  joseHeaders,
};

module.exports = { billdesk };
