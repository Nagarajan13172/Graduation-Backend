
# BillDesk Token Creation Flow - Visual Guide

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BILLDESK ORDER CREATION FLOW                      │
└─────────────────────────────────────────────────────────────────────┘

STEP 1: Create JSON Payload
═══════════════════════════
┌───────────────────────────────────────────────┐
│ {                                             │
│   "mercid": "BDUATV2KTK",                     │
│   "orderid": "ORD123456",                     │
│   "amount": "500.00",                         │
│   "currency": "356",                          │
│   "ru": "http://localhost:3000/callback",     │
│   "itemcode": "DIRECT",                       │
│   "additional_info": {...}                    │
│ }                                             │
└───────────────────────────────────────────────┘
                    ↓
                    ↓ billdesk.encryptPayload(payload)
                    ↓ Using: BILLDESK_ENCRYPTION_PASSWORD
                    ↓ Algorithm: A256GCM
                    ↓

STEP 2: Encrypt with JWE (JSON Web Encryption)
═══════════════════════════════════════════════
┌───────────────────────────────────────────────┐
│ JWE Headers:                                  │
│   - alg: "dir"                                │
│   - enc: "A256GCM"                            │
│   - kid: "rkoGa4SDxctH"                       │
│   - clientid: "bduatv2ktksj1"                 │
│                                               │
│ Encrypted Token (JWE):                        │
│ eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNI...      │
│ (Length: ~500 characters)                     │
└───────────────────────────────────────────────┘
                    ↓
                    ↓ billdesk.signEncryptedToken(jweToken)
                    ↓ Using: BILLDESK_SECRET (Signing Password)
                    ↓ Algorithm: HS256
                    ↓

STEP 3: Sign with JWS (JSON Web Signature)
═══════════════════════════════════════════
┌───────────────────────────────────────────────┐
│ JWS Headers:                                  │
│   - alg: "HS256"                              │
│   - kid: "rkoGa4SDxctH"                       │
│   - clientid: "bduatv2ktksj1"                 │
│                                               │
│ JWS Structure:                                │
│   header.payload.signature                    │
│                                               │
│ Where payload = base64url(JWE token)          │
│                                               │
│ Final Signed Token (JWS):                     │
│ eyJhbGciOiJIUzI1NiIsImNsaWVudGlkIjoi...      │
│ (Length: ~950 characters)                     │
└───────────────────────────────────────────────┘
                    ↓
                    ↓ axios.post(url, finalToken, headers)
                    ↓ Headers from billdesk.joseHeaders()
                    ↓

STEP 4: POST to BillDesk API
═════════════════════════════
┌───────────────────────────────────────────────┐
│ POST /payments/ve1_2/orders/create            │
│                                               │
│ Headers:                                      │
│   Content-Type: application/jose             │
│   Accept: application/jose                   │
│   bd-timestamp: 20251028142530               │
│   bd-traceid: a1b2c3d4e5f6g7h8i9j0           │
│   bd-merchantid: BDUATV2KTK                  │
│   bd-clientid: bduatv2ktksj1                 │
│                                               │
│ Body: [Final Signed Token from Step 3]       │
└───────────────────────────────────────────────┘
                    ↓
                    ↓ BillDesk verifies signature
                    ↓ BillDesk decrypts payload
                    ↓ BillDesk processes order
                    ↓

STEP 5: BillDesk Response
═════════════════════════
┌───────────────────────────────────────────────┐
│ Response (also JWS encrypted):                │
│ {                                             │
│   "orderid": "ORD123456",                     │
│   "bdorderid": "BD987654321",                 │
│   "links": [{                                 │
│     "rel": "payment",                         │
│     "parameters": {                           │
│       "rdata": "..."  ← Payment redirect data │
│     }                                         │
│   }]                                          │
│ }                                             │
└───────────────────────────────────────────────┘
```

## 🔐 Security Layers

```
┌────────────────────────────────────────────────────┐
│                  SECURITY LAYERS                   │
└────────────────────────────────────────────────────┘

Layer 1: ENCRYPTION (JWE)
━━━━━━━━━━━━━━━━━━━━━━━
Password: Aoqm9Apw8XFvK1MARZ7aJqEloC60vF8j
Purpose:  Encrypt the payload data
Result:   Only BillDesk can decrypt using this password

Layer 2: SIGNING (JWS)
━━━━━━━━━━━━━━━━━━━━
Password: B40hskbL1WQQ2GNNwpN2c1FbhS2UNO3r
Purpose:  Verify request authenticity
Result:   BillDesk knows request is from you

Combined Security:
━━━━━━━━━━━━━━━━━
✓ Data is encrypted (confidentiality)
✓ Data is signed (integrity + authentication)
✓ Man-in-the-middle attacks prevented
✓ Tampering detected
```

## 📊 Token Anatomy

```
FINAL TOKEN STRUCTURE
═════════════════════

eyJhbGciOiJIUzI1NiIsImNsaWVudGlkIjoiYmR1YXR2Mmt0a3NqMSIsImtpZCI6InJrb0dhNFNEeGN0SCJ9
│                                                                           │
│                            JWS HEADER (base64url)                         │
│                                                                           │
│  Decoded:                                                                 │
│  {                                                                        │
│    "alg": "HS256",                                                        │
│    "clientid": "bduatv2ktksj1",                                           │
│    "kid": "rkoGa4SDxctH"                                                  │
│  }                                                                        │
└───────────────────────────────────────────────────────────────────────────┘
                                      .
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
ZXlKaGJHY2lPaUprYVhJaUxDSmxibU1pT2lKQk1qVTJSME5OSWl3aWEybGtJam9pY210dlIyRTBVMFI0
Y3RISWl3aWMyeHBaVzUwYVdRaU9pSmlaSFZoZEhZeWEzUnJjMm94SW4wLi50ZzlNaHI0LVdnQzlJWT
FfLktLNlhWUVpoOEFuYzNDdzhSaHpyNjU1U1JkYUtZbE5MbzFseWFQQ1lWX1Zvdi05SDhoT0pWcWg4
c0p1UEw3RFBvS2p1YS1CRTdTRjBHeG9OVVNuckR6NVJpWVAtSGl0MWM4LXNmcC1MQzNGZ3NFcXA2Tj
Bqz2U4X1piR1hvb0Y1dHFMdlUtRlVZVkRCQ3ZQM0tOLXlSajVpMlptbTQ5dWI2N3RmZVNvTnpqRExD
T3VJODk0WTc5NEpIelhaWHZJeHJ5azlsVHlpN3J5TkFoRjl1OXJaeDY3RmkdGpBVnZHRlJPckZjR1lY
elB4Rzk2azYyV21vZmRfVUdGZlNnTUpTMmxTSmw4Zk9WU3ZIc1EtOXNGanFyQ3NTZUZDNzc4dFo2OW
FVcGlyekhod0luWTdjNE9tZnQtbFBUemVvcWpmTnAwMXhWT1dyZndQSmpCS2cwSFVHdlNCQWJHZEpG
NE1Ld2drb3dmZE9HaXhaYmg4NjBxWC1Idk5PM0JoSTlXNFZYUUttLTAwZGpFWmRPbWVlcXhRX0t3V2
tkQmFPS1Z0Wnl4MVJZS0NXMGV1T3lkcXlWc01JWjNIYUw3bm5yZG5wOWlPams0Wm1TVzNJdi1kNjhK
SExqUk1lcEEuTW5yQUw4N19MbjZ4VzRfQWlrcEFkZw
│                                                                           │
│                          JWS PAYLOAD (base64url)                          │
│                                                                           │
│  This IS the entire JWE encrypted token from Step 2                      │
│  BillDesk will base64url decode this to get the JWE token                │
│  Then decrypt the JWE to get the original JSON payload                   │
└───────────────────────────────────────────────────────────────────────────┘
                                      .
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
4JWg8dwBbevVj4dRhgetaCUTkbFKzxK26ynaPna2-BY
│                                                                           │
│                          JWS SIGNATURE                                    │
│                                                                           │
│  HMAC-SHA256(header + "." + payload, BILLDESK_SECRET)                     │
│  BillDesk verifies this using your signing password                      │
└───────────────────────────────────────────────────────────────────────────┘
```

## 🎯 Function Call Hierarchy

```
Controller: createCheckoutSession()
         ↓
         ├─→ billdesk.createOrderToken(orderPayload)
         │            ↓
         │            ├─→ billdesk.encryptPayload(payload)
         │            │         ↓
         │            │         └─→ JWE.CompactEncrypt()
         │            │                   ↓
         │            │                   └─→ Returns JWE Token
         │            │
         │            └─→ billdesk.signEncryptedToken(jweToken)
         │                      ↓
         │                      └─→ crypto.createHmac('sha256')
         │                                ↓
         │                                └─→ Returns JWS Token
         │
         ├─→ billdesk.joseHeaders()
         │         ↓
         │         └─→ Returns headers object
         │
         └─→ axios.post(url, finalToken, headers)
                   ↓
                   └─→ BillDesk API Response
```

## 🔍 Verification Process (BillDesk Side)

```
BillDesk receives: Final JWS Token
         ↓
         ├─→ Parse JWS: header.payload.signature
         │
         ├─→ Verify Signature
         │   ├─→ Recreate signature using SIGNING_PASSWORD
         │   └─→ Compare with received signature
         │             ↓
         │             ├─→ Match? Continue ✓
         │             └─→ No match? Reject ✗
         │
         ├─→ Decode payload (base64url)
         │   ├─→ Get JWE Token
         │   │
         │   └─→ Decrypt JWE using ENCRYPTION_PASSWORD
         │             ↓
         │             ├─→ Get original JSON payload
         │             └─→ Process order
         │
         └─→ Send response (also encrypted)
```

## 📝 Code Example

```javascript
// In your controller
const orderPayload = {
  mercid: "BDUATV2KTK",
  orderid: "ORD123456",
  amount: "500.00",
  currency: "356",
  ru: "http://localhost:3000/payment/result",
  itemcode: "DIRECT",
  additional_info: {
    additional_info1: "bduatv2ktksj1"
  }
};

// ONE FUNCTION DOES IT ALL!
const finalToken = await billdesk.createOrderToken(orderPayload);

// Send to BillDesk
const response = await axios.post(
  `${billdesk.baseUrl}/payments/ve1_2/orders/create`,
  finalToken,
  { headers: billdesk.joseHeaders() }
);
```

## ✅ Checklist

```
Environment Setup:
  [✓] BILLDESK_MERC_ID
  [✓] BILLDESK_CLIENT_ID
  [✓] BILLDESK_KEY_ID
  [✓] BILLDESK_SECRET (Signing Password)
  [✓] BILLDESK_ENCRYPTION_PASSWORD (NEW!)
  [✓] BILLDESK_BASE_URL
  [✓] RU_PUBLIC

Implementation:
  [✓] encryptPayload() function
  [✓] signEncryptedToken() function
  [✓] createOrderToken() function
  [✓] Controller updated to use createOrderToken()
  [✓] Test script created

Testing:
  [✓] Test script runs successfully
  [✓] Token length ~950 characters
  [✓] Encryption working
  [✓] Signing working

Ready for:
  [ ] BillDesk UAT API testing
  [ ] End-to-end payment flow testing
  [ ] Production deployment
```

---

**Remember:** Always encrypt FIRST, then sign. Never the other way around! 🔐
