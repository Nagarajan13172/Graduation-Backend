# BillDesk Console Logging Summary

## Overview
Added comprehensive console logging to track the entire BillDesk payment integration flow, including payload creation, encryption, signing, and API responses.

## What's Been Added

### 1. Order Creation Flow (`createCheckoutSession`)
When creating a checkout session, you'll now see:

```
=== BillDesk Order Creation ===
1. Order Payload (before encryption): {payload details}
2. Encrypted Request (JWS compact): {JWT token}
3. Signed Request Headers: {JOSE headers}
4. Request URL: {API endpoint}
5. Full Request Details: {complete request info}
6. BillDesk Response Status: {HTTP status}
7. BillDesk Response Data (encrypted): {encrypted response}
8. BillDesk Response Data (decrypted): {decoded response}
9. Extracted rdata for payment: {rdata value}
=== BillDesk Order Creation Complete ===
```

### 2. JWS Signing Process (`billdesk.jwsCompact`)
When signing a payload, you'll see:

```
=== JWS Signing Process ===
Payload to sign: {payload}
JWT Headers: {alg, typ, clientid, kid}
Algorithm: HS256
Secret key length: {length}
Signed JWS Token: {JWT token}
=== End JWS Signing ===
```

### 3. JOSE Headers Generation (`billdesk.joseHeaders`)
When generating request headers, you'll see:

```
=== JOSE Headers Generation ===
Generated Headers: {all headers}
Timestamp (IST): {yyyymmddHHMMss}
Trace ID: {random trace id}
=== End JOSE Headers ===
```

### 4. Transaction Retrieval Flow (`retrieveTransaction`)
When retrieving transaction status, you'll see:

```
=== BillDesk Retrieve Transaction ===
1. Transaction Query Payload: {payload}
2. Encrypted Request (JWS): {JWT token}
3. Request URL: {API endpoint}
4. Request Headers: {JOSE headers}
5. Response Status: {HTTP status}
6. Response Data (encrypted): {encrypted response}
7. Response Data (decrypted): {decoded response}
=== Retrieve Transaction Complete ===
```

## Files Modified

1. **`/home/allyhari/periyar/Graduation-Backend/src/controllers/graduationController.js`**
   - Added logging in `createCheckoutSession` function
   - Added logging in `retrieveTransaction` function

2. **`/home/allyhari/periyar/Graduation-Backend/server/billdesk.js`**
   - Added logging in `jwsCompact` function (encryption/signing)
   - Added logging in `joseHeaders` function (header generation)

## How to Use

1. **Start your server** (if not already running):
   ```bash
   npm start
   ```

2. **Make a payment request** (via your frontend or API testing tool):
   ```bash
   POST /api/graduation/checkout
   ```

3. **Check the terminal/console** where your server is running to see all the logged details.

## What You'll Learn From The Logs

- **Payload Structure**: See exactly what data is being sent to BillDesk
- **Encryption Process**: View the JWT token generated from the payload
- **Request Headers**: Understand the JOSE headers required by BillDesk
- **Response Handling**: See both encrypted and decrypted responses
- **Debugging**: Identify issues with payload formatting, signing, or API communication

## Security Note

⚠️ **Important**: These logs contain sensitive information including:
- Merchant credentials
- Secret key lengths
- Order details
- JWT tokens

**Recommendations**:
- Use these logs only in **development/testing** environments
- **Remove or comment out** these console.log statements before deploying to production
- Consider using a proper logging framework with different log levels (debug, info, error)
- Never commit logs containing real credentials to version control

## Example Output

When you create a checkout session, you'll see something like this in your console:

```
=== JWS Signing Process ===
Payload to sign: {
  "objectid": "order",
  "mercid": "BDMERCHANT001",
  "orderid": "ORD1730150400123",
  "amount": "500.00",
  "currency": "356",
  "ru": "http://localhost:3000/payment/result",
  "itemcode": "DIRECT",
  "additional_info": {
    "additional_info1": "John Doe",
    "additional_info2": "john@example.com",
    "additional_info3": "9876543210"
  }
}
JWT Headers: {
  "alg": "HS256",
  "typ": "JWT",
  "clientid": "your_client_id",
  "kid": "your_key_id"
}
Algorithm: HS256
Secret key length: 32
Signed JWS Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImNsaWVudGlkIjoieW91cl9jbGllbnRfaWQiLCJraWQiOiJ5b3VyX2tleV9pZCJ9...
=== End JWS Signing ===

=== JOSE Headers Generation ===
Generated Headers: {
  "content-type": "application/jose",
  "accept": "application/jose",
  "bd-timestamp": "20251028143000",
  "bd-traceid": "a1b2c3d4e5f6g7h8i9j0",
  "bd-merchantid": "BDMERCHANT001",
  "bd-clientid": "your_client_id"
}
Timestamp (IST): 20251028143000
Trace ID: a1b2c3d4e5f6g7h8i9j0
=== End JOSE Headers ===

=== BillDesk Order Creation ===
1. Order Payload (before encryption): {...}
2. Encrypted Request (JWS compact): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImNsaWVudGlkIjoieW91cl9jbGllbnRfaWQiLCJraWQiOiJ5b3VyX2tleV9pZCJ9...
3. Signed Request Headers: {...}
4. Request URL: https://uat1.billdesk.com/payments/ve1_2/orders/create
5. Full Request Details: {...}
6. BillDesk Response Status: 200
7. BillDesk Response Data (encrypted): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
8. BillDesk Response Data (decrypted): {
  "bdorderid": "BD1730150400456",
  "orderid": "ORD1730150400123",
  "links": [...]
}
9. Extracted rdata for payment: eyJtZXJjaWQiOiJCRE1FUkNIQU5UMDAxIiwib3JkZXJpZCI6Ik9SRDE3MzAxNTA0MDAxMjMifQ==
=== BillDesk Order Creation Complete ===
```

## Next Steps

1. Test the payment flow and observe the console logs
2. Verify that all data is correctly formatted
3. Check that encryption and signing are working properly
4. Once testing is complete, consider:
   - Moving to a structured logging library (Winston, Bunyan, etc.)
   - Setting up different log levels for dev vs production
   - Removing sensitive data from logs in production
