# BillDesk Payment Integration - Implementation Guide

## Overview
This document describes the updated BillDesk payment integration using JWT (JWS) with HS256 signing algorithm instead of the previous JWE encryption approach. This is simpler and aligns with BillDesk's standard UAT integration.

## Architecture Changes

### Previous Implementation (Removed)
- ❌ JWE encryption with A256GCM
- ❌ Complex key management (encryption + signing keys)
- ❌ jose library with async imports
- ❌ Separate encryption and signing steps

### New Implementation (Current)
- ✅ JWS compact format with HS256
- ✅ Single secret key for signing
- ✅ Standard jsonwebtoken library
- ✅ Simpler, more maintainable code
- ✅ Better error handling

## File Structure

```
Graduation-Backend/
├── server/
│   └── billdesk.js           # BillDesk helper utilities (NEW)
├── src/
│   ├── controllers/
│   │   └── graduationController.js  # Payment controllers (UPDATED)
│   └── routes/
│       └── graduationRoutes.js      # Payment routes (UPDATED)
└── .env.example               # Environment template (NEW)
```

## Environment Variables

Update your `.env` file with these new variables:

```env
# Server Configuration
PORT=8080

# BillDesk UAT Configuration
BILLDESK_CLIENT_ID=your_client_id_here
BILLDESK_SECRET=your_hs256_secret_here
BILLDESK_MERC_ID=your_mercid_here
BILLDESK_BASE_URL=https://uat1.billdesk.com/u2
RU_PUBLIC=https://your-frontend.example.com/payment/result
```

### Getting BillDesk Credentials

1. Contact your BillDesk relationship manager
2. Request UAT environment credentials
3. You'll receive:
   - **Client ID**: Identifies your application
   - **Merchant ID (MERC_ID)**: Your merchant identifier
   - **Secret Key**: HS256 signing secret (keep this secure!)

## API Endpoints

### 1. Configuration Check
**GET** `/api/graduation/billdesk-config`

Check if BillDesk is properly configured.

**Response:**
```json
{
  "configured": true,
  "message": "BillDesk is fully configured and ready to use",
  "config": {
    "mercId": "✓ Set",
    "clientId": "✓ Set",
    "secret": "✓ Set",
    "baseUrl": "https://uat1.billdesk.com/u2",
    "returnUrl": "https://your-frontend.example.com/payment/result"
  }
}
```

### 2. Create Order (Checkout Session)
**POST** `/api/graduation/billdesk/orders`

Creates a BillDesk order and returns payment details.

**Request:** Multipart form data with all student registration fields + files

**Response:**
```json
{
  "success": true,
  "bdorderid": "BD1234567890",
  "orderid": "ORD1234567890123",
  "merchantid": "YOUR_MERC_ID",
  "rdata": "encrypted_payment_data",
  "links": [...],
  "formData": { /* student data */ }
}
```

### 3. Launch Payment Page
**GET** `/api/graduation/billdesk/launch?bdorderid=xxx&rdata=xxx`

Returns HTML page that auto-submits to BillDesk payment gateway.

**Usage:** Redirect user to this URL after creating order.

### 4. Webhook Handler (S2S)
**POST** `/api/graduation/billdesk/webhook`

BillDesk calls this endpoint to notify payment status (source of truth).

**Important:**
- Always returns 200 status
- Processes payment in background
- Updates database based on `auth_status`
- Should be secured/whitelisted to BillDesk IPs

### 5. Return URL Handler
**POST** `/api/graduation/billdesk/return`

Browser redirect after payment (user-facing).

**Usage:** Shows "processing" message while webhook updates DB.

### 6. Retrieve Transaction
**POST** `/api/graduation/billdesk/retrieve`

Query transaction status from BillDesk.

**Request:**
```json
{
  "orderid": "ORD1234567890123"
}
```

**Response:**
```json
{
  "orderid": "ORD1234567890123",
  "bdorderid": "BD1234567890",
  "transactionid": "TXN123456",
  "auth_status": "0300",
  "amount": "500.00",
  "transaction_date": "2025-10-23T10:30:00Z",
  "payment_method_type": "netbanking"
}
```

## Payment Flow

### Complete Payment Flow

```
1. User fills registration form
   ↓
2. Frontend calls POST /api/graduation/billdesk/orders
   ↓
3. Backend creates order with BillDesk
   ↓
4. Backend returns bdorderid, rdata
   ↓
5. Frontend redirects to GET /api/graduation/billdesk/launch
   ↓
6. Auto-submit form sends user to BillDesk payment page
   ↓
7. User completes payment on BillDesk
   ↓
8. BillDesk calls POST /api/graduation/billdesk/webhook (S2S)
   ↓
9. Backend processes payment, updates database
   ↓
10. Browser redirects to POST /api/graduation/billdesk/return
    ↓
11. User sees "processing" message
    ↓
12. Frontend polls backend for payment status
    ↓
13. Shows success/failure to user
```

## Auth Status Codes

BillDesk returns these `auth_status` codes:

- **0300**: Success - Payment completed
- **0399**: Failure - Payment failed
- **0002**: Pending - Payment in progress
- **NA**: Not attempted - User cancelled

## Integration Checklist

### Backend Setup
- [x] Install dependencies (`jsonwebtoken`, `uuid`)
- [ ] Update `.env` with actual BillDesk credentials
- [ ] Configure `RU_PUBLIC` to your frontend URL
- [ ] Test configuration endpoint
- [ ] Whitelist BillDesk IPs for webhook

### Database Updates (TODO)
- [ ] Create `pending_orders` table to store form data before payment
- [ ] Add `payment_status` field to `students` table
- [ ] Add `transaction_id` and `bdorderid` fields
- [ ] Implement webhook handler to complete registration

### Frontend Integration
1. Call `/billdesk/orders` with form data
2. Receive `bdorderid` and `rdata`
3. Redirect to `/billdesk/launch?bdorderid=xxx&rdata=xxx`
4. After return, poll `/billdesk/retrieve` for status
5. Show success/failure message

## Security Considerations

1. **Secret Key**: Never commit `BILLDESK_SECRET` to git
2. **Webhook IP**: Whitelist only BillDesk IPs
3. **SSL/TLS**: Use HTTPS in production
4. **JWS Verification**: Always verify JWS signatures from BillDesk
5. **Idempotency**: Handle duplicate webhook calls gracefully

## Testing

### Mock Mode (When Not Configured)
If BillDesk credentials contain `your_` placeholders, the system runs in mock mode:
- Returns fake order IDs
- Simulates successful payments
- Useful for frontend development

### UAT Testing
1. Update `.env` with actual UAT credentials
2. Use BillDesk UAT test cards/netbanking
3. Monitor logs for errors
4. Verify webhook receives callbacks

## Troubleshooting

### Common Issues

**Error: "Failed to sign payload"**
- Check `BILLDESK_SECRET` is set correctly
- Ensure no extra whitespace in .env

**Error: "Failed to create checkout session"**
- Verify all credentials are set
- Check BillDesk UAT is accessible
- Review axios error response

**Webhook not receiving calls**
- Ensure public URL is configured in BillDesk
- Check firewall/IP whitelist
- Verify webhook endpoint returns 200

**Transaction shows as pending**
- Wait 30-60 seconds for BillDesk processing
- Use `/retrieve` endpoint to check status
- Check webhook logs

## Migration from Old Implementation

### Breaking Changes
1. Environment variables renamed:
   - `BILLDESK_MERCHANT_ID` → `BILLDESK_MERC_ID`
   - `BILLDESK_SIGNING_KEY` → `BILLDESK_SECRET`
   - Removed: `BILLDESK_ENCRYPTION_KEY`, `BILLDESK_ENCRYPTION_KEY_ID`, `BILLDESK_SIGNING_KEY_ID`

2. API endpoint changes:
   - `/create-checkout-session` → `/billdesk/orders`
   - `/verify-payment` → `/billdesk/retrieve`

3. Response format changes:
   - Simpler response structure
   - Added `rdata` field for payment launch

### Migration Steps
1. Install new dependencies
2. Update `.env` with new variable names
3. Update frontend API calls
4. Test in UAT environment
5. Deploy to production

## Support

For BillDesk-specific issues:
- Contact your BillDesk relationship manager
- Reference BillDesk UAT v1.2 documentation
- Check BillDesk developer portal

For implementation issues:
- Review logs in console
- Check network requests
- Verify environment configuration
