// server/billdesk.js
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Load BillDesk configuration from .env file
const {
  BILLDESK_CLIENT_ID,
  BILLDESK_SECRET,   // MUST be the SIGNING PASSWORD
  BILLDESK_ENCRYPTION_PASSWORD, // MUST be the ENCRYPTION PASSWORD
  BILLDESK_MERC_ID,
  BILLDESK_BASE_URL,
  BILLDESK_KEY_ID
} = process.env;

// Dynamic import of jose (ES module)
let CompactEncrypt;
async function loadJose() {
  if (!CompactEncrypt) {
    const jose = await import('jose');
    CompactEncrypt = jose.CompactEncrypt;
  }
  return CompactEncrypt;
}

// Validate configuration on module load
function validateConfig() {
  const missing = [];
  if (!BILLDESK_CLIENT_ID || BILLDESK_CLIENT_ID.includes('your_')) missing.push('BILLDESK_CLIENT_ID');
  if (!BILLDESK_SECRET || BILLDESK_SECRET.includes('your_')) missing.push('BILLDESK_SECRET');
  if (!BILLDESK_ENCRYPTION_PASSWORD || BILLDESK_ENCRYPTION_PASSWORD.includes('your_')) missing.push('BILLDESK_ENCRYPTION_PASSWORD');
  if (!BILLDESK_MERC_ID || BILLDESK_MERC_ID.includes('your_')) missing.push('BILLDESK_MERC_ID');
  if (!BILLDESK_BASE_URL) missing.push('BILLDESK_BASE_URL');
  if (!BILLDESK_KEY_ID) missing.push('BILLDESK_KEY_ID');
  if (missing.length > 0) {
    console.warn('⚠️ BillDesk config: Missing or placeholder values:', missing.join(', '));
    console.warn('⚠️ Running in MOCK mode until credentials are configured');
    return false;
  }

  console.log('✓ BillDesk configuration loaded');
  console.log(`  Merchant ID: ${BILLDESK_MERC_ID}`);
  console.log(`  Client ID:   ${BILLDESK_CLIENT_ID}`);
  console.log(`  Base URL:    ${BILLDESK_BASE_URL}`);
  console.log(`  Key ID:      ${BILLDESK_KEY_ID}`);
  return true;
}

const isConfigured = validateConfig();

/** Generate compact timestamp (yyyyMMddHHmmss) for BD-Timestamp header */
function generateBdTimestamp() {
  const istOffsetMin = 5 * 60 + 30; // IST offset is +5:30
  const now = new Date();
  const istMs = now.getTime() + (istOffsetMin - now.getTimezoneOffset()) * 60000;
  const ist = new Date(istMs);
  
  const pad = (n) => String(n).padStart(2, "0");
  return `${ist.getFullYear()}${pad(ist.getMonth()+1)}${pad(ist.getDate())}${pad(ist.getHours())}${pad(ist.getMinutes())}${pad(ist.getSeconds())}`;
}

/** Generate ISO 8601 timestamp for order_date field */
function istTimestampCompact() {
  const now = new Date();

  // Compute IST time
  const istOffset = 5.5 * 60 * 60000;
  const istTime = new Date(now.getTime() + istOffset);

  const pad = (n) => String(n).padStart(2, '0');

  const yyyy = istTime.getUTCFullYear();
  const MM = pad(istTime.getUTCMonth() + 1);
  const dd = pad(istTime.getUTCDate());
  const hh = pad(istTime.getUTCHours());
  const mm = pad(istTime.getUTCMinutes());
  const ss = pad(istTime.getUTCSeconds());

  // Format: YYYY-MM-DDThh:mm:ss+05:30
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}+05:30`;
}

/** 10-35 char trace id (alphanumeric only, no special characters) */
function newTraceId() {
  // Generate alphanumeric traceid (10-35 chars, no special characters)
  const traceid = crypto.randomBytes(10).toString('hex'); // 20 chars, alphanumeric
  // Validate it's alphanumeric only
  if (!/^[A-Za-z0-9]+$/.test(traceid)) {
    console.warn('Generated traceid contains non-alphanumeric characters, regenerating');
    return newTraceId(); // Recursive retry
  }
  return traceid;
}

/**
 * Step 1: Encrypt JSON payload with encryption password using JWE
 * Algorithm: dir (Direct Key Agreement)
 * Encryption: A256GCM
 */
async function encryptPayload(payload) {
  if (!BILLDESK_ENCRYPTION_PASSWORD) throw new Error('BILLDESK_ENCRYPTION_PASSWORD not configured');
  if (!BILLDESK_KEY_ID) throw new Error('BILLDESK_KEY_ID not configured');
  if (!BILLDESK_CLIENT_ID) throw new Error('BILLDESK_CLIENT_ID not configured');

  console.log('=== JWE Encryption Process ===');
  console.log('Payload to encrypt:', JSON.stringify(payload, null, 2));

  // Load jose module
  const CompactEncryptClass = await loadJose();

  // Convert encryption password to Uint8Array (the secret key)
  const secret = new TextEncoder().encode(BILLDESK_ENCRYPTION_PASSWORD);

  // Create JWE with required headers
  const jweToken = await new CompactEncryptClass(
    new TextEncoder().encode(JSON.stringify(payload))
  )
    .setProtectedHeader({
      alg: 'dir',           // Direct key agreement
      enc: 'A256GCM',       // AES-256 GCM encryption
      kid: BILLDESK_KEY_ID,
      clientid: BILLDESK_CLIENT_ID
    })
    .encrypt(secret);

  console.log('Encrypted JWE Token:', jweToken);
  console.log('=== End JWE Encryption ===\n');

  return jweToken;
}

/**
 * Step 2: Sign the encrypted JWE token with signing password using JWS
 * Algorithm: HS256
 * 
 * According to BillDesk spec, we sign the entire JWE token as a string
 */
function signEncryptedToken(encryptedToken) {
  if (!BILLDESK_SECRET) throw new Error('BILLDESK_SECRET not configured');
  if (!BILLDESK_CLIENT_ID) throw new Error('BILLDESK_CLIENT_ID not configured');
  if (!BILLDESK_KEY_ID) throw new Error('BILLDESK_KEY_ID not configured');

  const headers = {
    alg: "HS256",
    clientid: BILLDESK_CLIENT_ID,
    kid: BILLDESK_KEY_ID
  };

  console.log('=== JWS Signing Process ===');
  console.log('Encrypted token to sign (first 100 chars):', encryptedToken.substring(0, 100) + '...');
  console.log('JWT Headers:', JSON.stringify(headers, null, 2));
  console.log('Algorithm: HS256');

  // Create JWS manually: header.payload.signature
  // The payload is the base64url encoded encrypted token
  const headerJson = JSON.stringify(headers);
  const headerB64 = Buffer.from(headerJson).toString('base64url');
  const payloadB64 = Buffer.from(encryptedToken).toString('base64url');
  
  const signingInput = `${headerB64}.${payloadB64}`;
  
  // Sign with HS256
  const signature = crypto
    .createHmac('sha256', BILLDESK_SECRET)
    .update(signingInput)
    .digest('base64url');
  
  const signedToken = `${headerB64}.${payloadB64}.${signature}`;
  
  console.log('Final Signed Token (first 150 chars):', signedToken );
  console.log('=== End JWS Signing ===\n');

  return signedToken;
}

/**
 * Complete flow: Encrypt then Sign
 * This is the main function to create BillDesk order token
 */
async function createOrderToken(payload) {
  console.log('\n========================================');
  console.log('Creating BillDesk Order Token');
  console.log('========================================\n');
  
  // Step 1: Encrypt the payload
  const encryptedToken = await encryptPayload(payload);
  
  // Step 2: Sign the encrypted token
  const finalToken = signEncryptedToken(encryptedToken);
  
  console.log('========================================');
  console.log('Token Creation Complete');
  console.log('========================================\n');
  
  return finalToken;
}

/** Sign payload with HS256 and create JWS compact (Legacy method - kept for backward compatibility) */
/** Sign payload with HS256 and create JWS compact */
function jwsCompact(payload) {
  if (!BILLDESK_SECRET) throw new Error('BILLDESK_SECRET not configured');
  if (!BILLDESK_CLIENT_ID) throw new Error('BILLDESK_CLIENT_ID not configured');
  if (!BILLDESK_KEY_ID) throw new Error('BILLDESK_KEY_ID not configured');

  // Some BillDesk setups are strict about including typ + both client and kid
  const headers = {
    alg: "HS256",
    typ: "JWT",
    clientid: BILLDESK_CLIENT_ID,
    kid: BILLDESK_KEY_ID
  };

  console.log('=== JWS Signing Process ===');
  console.log('Payload to sign:', JSON.stringify(payload, null, 2));
  console.log('JWT Headers:', JSON.stringify(headers, null, 2));
  console.log('Algorithm: HS256');
  console.log('Secret key length:', BILLDESK_SECRET ? BILLDESK_SECRET.length : 0);

  const signedJws = jwt.sign(payload, BILLDESK_SECRET, { algorithm: "HS256", header: headers });
  
  console.log('Signed JWS Token:', signedJws);
  console.log('=== End JWS Signing ===\n');

  return signedJws;
}

/** JOSE headers for BillDesk */
function joseHeaders() {
  const timestamp = generateBdTimestamp(); // Use the dedicated function for bd-timestamp
  const traceid = newTraceId();
  
  const headers = {
    "content-type": "application/jose",
    "accept": "application/jose",
    "bd-timestamp": timestamp, // yyyyMMddHHmmss format
    "bd-traceid": traceid,    // 10-35 chars
    "bd-merchantid": BILLDESK_MERC_ID,
    "bd-clientid": BILLDESK_CLIENT_ID
  };

  console.log('=== JOSE Headers Generation ===');
  console.log('Generated Headers:', JSON.stringify(headers, null, 2));
  console.log('Timestamp (IST):', timestamp);
  console.log('Trace ID:', traceid);
  console.log('=== End JOSE Headers ===\n');

  return headers;
}



/** Verify and decode JWS compact */
function verifyJws(compact) {
  if (!BILLDESK_SECRET) throw new Error('BILLDESK_SECRET not configured');
  return jwt.verify(compact, BILLDESK_SECRET, { algorithms: ["HS256"] });
}

/**
 * RESPONSE PROCESSING - Reverse Flow
 * Step 1: Verify JWS signature and extract encrypted payload
 */
function verifySignature(signedToken) {
  if (!BILLDESK_SECRET) throw new Error('BILLDESK_SECRET not configured');
  
  console.log('=== JWS Signature Verification ===');
  console.log('Signed token to verify (first 100 chars):', signedToken);
  
  try {
    // Parse the JWS token: header.payload.signature
    const parts = signedToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWS format - expected 3 parts');
    }
    
    const [headerB64, payloadB64, signatureB64] = parts;
    
    // Verify signature
    const signingInput = `${headerB64}.${payloadB64}`;
    const expectedSignature = crypto
      .createHmac('sha256', BILLDESK_SECRET)
      .update(signingInput)
      .digest('base64url');
    
    if (expectedSignature !== signatureB64) {
      throw new Error('Signature verification failed - signature mismatch');
    }
    
    console.log('✓ Signature verified successfully');
    
    // Decode header and payload
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
    const encryptedPayload = Buffer.from(payloadB64, 'base64url').toString();
    
    console.log('JWS Header:', JSON.stringify(header, null, 2));
    console.log('Encrypted payload extracted (JWE token)');
    console.log('=== End Signature Verification ===\n');
    
    return encryptedPayload; // This is the JWE token
    
  } catch (error) {
    console.error('❌ Signature verification failed:', error.message);
    throw error;
  }
}

/**
 * Step 2: Decrypt JWE token to get original JSON response
 */
async function decryptResponse(jweToken) {
  if (!BILLDESK_ENCRYPTION_PASSWORD) throw new Error('BILLDESK_ENCRYPTION_PASSWORD not configured');
  
  console.log('=== JWE Decryption Process ===');
  console.log('JWE token to decrypt (first 100 chars):', jweToken);
  
  try {
    // Load jose module dynamically
    const jose = await import('jose');
    const { compactDecrypt } = jose;
    
    // Convert encryption password to Uint8Array
    const secret = new TextEncoder().encode(BILLDESK_ENCRYPTION_PASSWORD);
    
    // Decrypt the JWE token
    const { plaintext, protectedHeader } = await compactDecrypt(jweToken, secret);
    
    // Convert plaintext to JSON
    const decryptedJson = new TextDecoder().decode(plaintext);
    const response = JSON.parse(decryptedJson);
    
    console.log('✓ Decryption successful');
    console.log('Protected Header:', JSON.stringify(protectedHeader, null, 2));
    console.log('Decrypted Response:', JSON.stringify(response, null, 2));
    console.log('=== End Decryption ===\n');
    
    return response;
    
  } catch (error) {
    console.error('❌ Decryption failed:', error.message);
    throw error;
  }
}

/**
 * Complete reverse flow: Verify Signature then Decrypt
 * This is the main function to process BillDesk responses
 */
async function processResponse(signedToken) {
  console.log('\n========================================');
  console.log('Processing BillDesk Response');
  console.log('========================================\n');
  
  // Step 1: Verify signature and extract encrypted payload
  const encryptedPayload = verifySignature(signedToken);
  
  // Step 2: Decrypt the payload to get JSON response
  const jsonResponse = await decryptResponse(encryptedPayload);
  
  console.log('========================================');
  console.log('Response Processing Complete');
  console.log('========================================\n');
  
  return jsonResponse;
}

const billdesk = {
  mercId: BILLDESK_MERC_ID,
  baseUrl: BILLDESK_BASE_URL,
  clientId: BILLDESK_CLIENT_ID,
  isConfigured,
  
  // REQUEST FLOW: Encrypt + Sign
  createOrderToken,     // Main: Complete flow (encrypt + sign)
  encryptPayload,       // Step 1: Encryption (JWE)
  signEncryptedToken,   // Step 2: Signing (JWS)
  
  // RESPONSE FLOW: Verify + Decrypt
  processResponse,      // Main: Complete flow (verify + decrypt)
  verifySignature,      // Step 1: Verify signature
  decryptResponse,      // Step 2: Decrypt payload
  
  // Legacy/Utility functions
  jwsCompact,          // Legacy: Direct signing (for backward compatibility)
  verifyJws,           // Legacy: Direct verification
  joseHeaders,         // Generate API headers
  generateBdTimestamp,  // Timestamp for headers (yyyyMMddHHmmss)
  istTimestampCompact, // ISO 8601 timestamp for order_date
};

module.exports = { billdesk };
