# BillDesk Payment Integration - Implementation Summary

## What Was Implemented

### 1. Dependencies Installed
- `jose` - For JWT encryption (JWE) and signing (JWS) required by BillDesk
- `axios` - For making HTTP requests to BillDesk API

### 2. Environment Variables Added (`.env`)
```env
BILLDESK_MERCHANT_ID=BDMERCID
BILLDESK_CLIENT_ID=your_billdesk_client_id
BILLDESK_ENCRYPTION_KEY=your_encryption_key
BILLDESK_ENCRYPTION_KEY_ID=your_encryption_key_id
BILLDESK_SIGNING_KEY=your_signing_key
BILLDESK_SIGNING_KEY_ID=your_signing_key_id
BILLDESK_BASE_URL=https://uat1.billdesk.com/u2
BILLDESK_RETURN_URL=http://localhost:3000/payment/callback
```

**Important:** Replace the placeholder values with actual credentials from BillDesk.

### 3. Controller Functions (`graduationController.js`)

#### `createCheckoutSession()`
- Validates all registration form fields
- Checks email uniqueness
- Creates encrypted and signed BillDesk order
- Makes API call to BillDesk order creation endpoint
- Returns order details including `bdorderid` for payment initiation

#### `verifyPayment()`
- Accepts orderid and optional transaction_response
- Verifies payment with BillDesk
- Decrypts and validates transaction status
- Returns payment success/failure status

#### Helper Functions
- `encryptPayload()` - Encrypts JSON payload using JWE (A256GCM)
- `signPayload()` - Signs encrypted payload using JWS (HS256)
- `decryptAndVerifyResponse()` - Decrypts and verifies BillDesk responses

### 4. Routes Added (`graduationRoutes.js`)
```javascript
POST /api/graduation/create-checkout-session  // Create BillDesk order
POST /api/graduation/verify-payment            // Verify payment status
```

### 5. Database Schema Updated
Added BillDesk payment fields to `students` table:
- `billdesk_order_id` - BillDesk order ID
- `billdesk_transaction_id` - Transaction ID after payment
- `payment_status` - Payment status (success/failed/pending)
- `payment_amount` - Amount paid

### 6. Database Initialization Script
Created `src/initDb.js` to initialize database schema.

## How to Use

### Step 1: Configure Environment
1. Get credentials from BillDesk
2. Update `.env` file with actual credentials
3. Run database initialization: `node src/initDb.js`

### Step 2: Create Order
Make a POST request to `/api/graduation/create-checkout-session` with form data:

```javascript
const formData = new FormData();
formData.append('full_name', 'John Doe');
formData.append('email', 'john@example.com');
formData.append('mobile_number', '9876543210');
// ... add all other fields and files

const response = await fetch('/api/graduation/create-checkout-session', {
  method: 'POST',
  body: formData
});

const data = await response.json();
// data.bdorderid, data.orderid, data.merchantid
```

### Step 3: Redirect to BillDesk
Use the response to create a form and redirect user to BillDesk:

```html
<form id="paymentForm" action="https://uat1.billdesk.com/u2/web/v1_2/embeddedsdk" method="POST">
  <input type="hidden" name="bdorderid" value="${data.bdorderid}">
  <input type="hidden" name="merchantid" value="${data.merchantid}">
</form>
<script>
  document.getElementById('paymentForm').submit();
</script>
```

### Step 4: Handle Payment Callback
When user returns from BillDesk to your `BILLDESK_RETURN_URL`:

```javascript
// Extract orderid from callback
const orderid = getOrderIdFromCallback();

// Verify payment
const verifyResponse = await fetch('/api/graduation/verify-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orderid })
});

const paymentStatus = await verifyResponse.json();

if (paymentStatus.success) {
  // Payment successful, complete registration
  await completeRegistration();
}
```

## Payment Flow Diagram

```
1. User fills registration form
   ↓
2. Frontend → POST /create-checkout-session
   ↓
3. Backend creates encrypted BillDesk order
   ↓
4. Backend ← Returns bdorderid & order details
   ↓
5. Frontend redirects to BillDesk payment page
   ↓
6. User completes payment on BillDesk
   ↓
7. BillDesk redirects to BILLDESK_RETURN_URL
   ↓
8. Frontend → POST /verify-payment
   ↓
9. Backend verifies with BillDesk API
   ↓
10. Backend ← Returns payment status
   ↓
11. If success → Complete registration
```

## Important Notes

### Security
1. **Never expose signing/encryption keys** in client-side code
2. All encryption/signing happens on the backend
3. Use HTTPS in production for `BILLDESK_RETURN_URL`

### Testing
1. Use UAT environment URL: `https://uat1.billdesk.com/u2`
2. Get test credentials from BillDesk
3. Use test payment methods provided by BillDesk

### Production
1. Update `BILLDESK_BASE_URL` to `https://api.billdesk.com/`
2. Use production credentials
3. Set proper `BILLDESK_RETURN_URL` (must be HTTPS)
4. Test thoroughly before going live

### Idempotency
- Each API request uses unique `BD-Traceid` to prevent duplicate orders
- Same `BD-Traceid` within 24 hours will be rejected by BillDesk

### Amount Format
- Always use 2 decimal places: "500.00"
- Currency code for INR: "356"

## Next Steps

1. **Update .env with real credentials** from BillDesk
2. **Test order creation** in UAT environment
3. **Test payment flow** with test cards
4. **Implement error handling** for payment failures
5. **Add payment status updates** to database after verification
6. **Create webhook handler** if BillDesk supports webhooks
7. **Add payment reconciliation** logic

## Troubleshooting

### "Payment gateway not configured"
- Check if all BillDesk environment variables are set
- Verify `.env` file is loaded properly

### "Failed to encrypt payload"
- Check if `BILLDESK_ENCRYPTION_KEY` is correct
- Verify key format (should be UTF-8 string)

### "Failed to sign payload"
- Check if `BILLDESK_SIGNING_KEY` is correct
- Verify key format (should be UTF-8 string)

### Order creation fails
- Check BillDesk API logs with `BD-Traceid`
- Verify merchant ID and client ID are correct
- Ensure amount format is correct ("500.00")

## Files Modified/Created

### Modified
- `src/controllers/graduationController.js` - Added BillDesk payment functions
- `src/routes/graduationRoutes.js` - Added payment routes
- `.env` - Added BillDesk configuration
- `package.json` - Added jose and axios dependencies

### Created
- `src/initDb.js` - Database initialization script
- `BILLDESK_INTEGRATION.md` - Detailed integration guide
- `BILLDESK_SUMMARY.md` - This summary file

## Support Resources

- [BillDesk Developer Docs](https://docs.billdesk.io/)
- [Authentication Guide](https://docs.billdesk.io/reference/authentications-and-endpoints)
- [JOSE RFC Specs](https://jose.readthedocs.io/)

Contact your BillDesk relationship manager for:
- UAT credentials
- Test payment methods
- Production credentials
- Technical support
