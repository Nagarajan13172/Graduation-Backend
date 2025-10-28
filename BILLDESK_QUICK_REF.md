# BillDesk Integration - Quick Reference

## ✅ Complete Setup Checklist

- [x] Encryption password added to .env
- [x] Signing password added to .env
- [x] Merchant ID, Client ID, Key ID configured
- [x] Encryption function implemented (JWE)
- [x] Signing function implemented (JWS)
- [x] Controller updated to use encrypt+sign flow
- [x] Test script created and passing

## 🔑 Credentials

```bash
Merchant ID:          BDUATV2KTK
Client ID:            bduatv2ktksj1
Key ID:               rkoGa4SDxctH
Signing Password:     B40hskbL1WQQ2GNNwpN2c1FbhS2UNO3r
Encryption Password:  Aoqm9Apw8XFvK1MARZ7aJqEloC60vF8j
```

## 🔄 Token Creation Flow

```
1. JSON Payload
   ↓
2. ENCRYPT with Encryption Password (JWE A256GCM)
   → Encrypted Token
   ↓
3. SIGN with Signing Password (JWS HS256)
   → Final Signed Token
   ↓
4. POST to BillDesk API
```

## 💻 Usage in Code

```javascript
const { billdesk } = require('./server/billdesk');

// Create order payload
const orderPayload = {
  mercid: billdesk.mercId,
  orderid: "ORD123456",
  amount: "500.00",
  currency: "356",
  ru: "http://localhost:3000/payment/result",
  itemcode: "DIRECT",
  additional_info: { additional_info1: "..." }
};

// Encrypt + Sign
const finalToken = await billdesk.createOrderToken(orderPayload);

// Send to BillDesk
const response = await axios.post(
  `${billdesk.baseUrl}/payments/ve1_2/orders/create`,
  finalToken,
  { headers: billdesk.joseHeaders() }
);
```

## 🧪 Testing

```bash
# Test token creation
node test-billdesk-token.js

# Start server
npm start

# Test order creation
POST http://localhost:4000/api/graduation/checkout-session
Content-Type: application/json

{
  "amount": "500.00",
  "full_name": "Test User",
  "email": "test@example.com",
  "mobile_number": "9876543210"
}
```

## 📋 Environment Variables

```bash
PORT=4000

# BillDesk Configuration
BILLDESK_MERC_ID=BDUATV2KTK
BILLDESK_CLIENT_ID=bduatv2ktksj1
BILLDESK_KEY_ID=rkoGa4SDxctH
BILLDESK_BASE_URL=https://uat1.billdesk.com/u2

# Passwords
BILLDESK_SECRET=B40hskbL1WQQ2GNNwpN2c1FbhS2UNO3r
BILLDESK_ENCRYPTION_PASSWORD=Aoqm9Apw8XFvK1MARZ7aJqEloC60vF8j

# Callback URL
RU_PUBLIC=http://localhost:3000/payment/result
```

## 🎯 Key Functions

| Function | Purpose | Parameters | Returns |
|----------|---------|------------|---------|
| `createOrderToken()` | Complete flow | `payload` | Final signed token |
| `encryptPayload()` | JWE encryption | `payload` | Encrypted JWE token |
| `signEncryptedToken()` | JWS signing | `encryptedToken` | Signed JWS token |
| `joseHeaders()` | API headers | none | Headers object |
| `verifyJws()` | Verify response | `compact` | Decoded payload |

## ⚠️ Important Notes

1. **Use `createOrderToken()`** - This does both encryption AND signing
2. **Don't use `jwsCompact()`** - Legacy function, only signs (incorrect)
3. **Both passwords required** - Encryption password AND signing password
4. **Order matters** - Always encrypt FIRST, then sign
5. **Headers required** - Use `joseHeaders()` for API calls

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "BILLDESK_ENCRYPTION_PASSWORD not configured" | Add to .env file |
| "require() of ES Module not supported" | Already fixed with dynamic import |
| "invalid noTimestamp option" | Already fixed in signEncryptedToken() |
| Token too short | Check both encryption and signing are running |
| API returns 401 | Verify signing password is correct |
| API returns 400 | Check payload format and encryption password |

## 📊 Expected Token Structure

```
Final Token Format: header.payload.signature

Header (base64url):
{
  "alg": "HS256",
  "clientid": "bduatv2ktksj1",
  "kid": "rkoGa4SDxctH"
}

Payload (base64url):
[The entire JWE encrypted token]

Signature:
HMAC-SHA256(header + "." + payload, SIGNING_PASSWORD)
```

## 🚀 Ready to Go!

Your BillDesk integration is now complete with proper encryption + signing flow. Start the server and test with real API calls!
