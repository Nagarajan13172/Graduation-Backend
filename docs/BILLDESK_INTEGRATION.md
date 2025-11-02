# BillDesk Payment Gateway Integration

## Overview
This backend implements BillDesk payment gateway integration for the Graduation Registration system. BillDesk uses JOSE (JSON Object Signing and Encryption) for secure API communication.

## Prerequisites

### 1. BillDesk Credentials
You need the following credentials from BillDesk:
- **Merchant ID** (`mercid`)
- **Client ID** (`clientid`)
- **Encryption Key** (for JWE encryption)
- **Encryption Key ID** (`kid` for encryption)
- **Signing Key** (for JWS signing)
- **Signing Key ID** (`kid` for signing)

### 2. Environment Configuration
Add these variables to your `.env` file:

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

**Note:** 
- Use `https://uat1.billdesk.com/u2` for UAT/Sandbox
- Use `https://api.billdesk.com/` for Production

## API Endpoints

### 1. Create Checkout Session (Order Creation)
**Endpoint:** `POST /api/graduation/create-checkout-session`

**Description:** Creates a BillDesk order with encrypted payload and returns order details for payment initiation.

**Request:**
- Content-Type: `multipart/form-data`
- All registration form fields including file uploads

**Response:**
```json
{
  "success": true,
  "bdorderid": "OAVS21T9I8QL",
  "orderid": "ORDER1698765432123",
  "merchantid": "BDMERCID",
  "links": [
    {
      "rel": "self",
      "href": "https://uat1.billdesk.com/u2/payments/ve1_2/orders/OAVS21T9I8QL"
    }
  ],
  "formData": {
    // Stored form data for post-payment registration
  }
}
```

### 2. Verify Payment
**Endpoint:** `POST /api/graduation/verify-payment`

**Description:** Verifies the payment status after user completes payment on BillDesk.

**Request:**
```json
{
  "orderid": "ORDER1698765432123",
  "transaction_response": "encrypted_response_from_billdesk" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "status": "success",
  "orderid": "ORDER1698765432123",
  "transactionid": "TXN123456789",
  "amount": "500.00",
  "transaction_date": "2023-10-23T10:30:45+05:30",
  "auth_status": "0300",
  "payment_method_type": "netbanking"
}
```

## Payment Flow

### Step 1: Create Order
1. Frontend collects registration form data
2. Frontend calls `/api/graduation/create-checkout-session` with form data
3. Backend validates data and creates BillDesk order
4. Backend returns `bdorderid` and order details

### Step 2: Redirect to BillDesk Payment Page
Frontend uses the response to redirect user to BillDesk payment page:

```html
<form name="sdklaunch" id="sdklaunch" 
      action="https://uat1.billdesk.com/u2/web/v1_2/embeddedsdk" 
      method="POST">
  <input type="hidden" name="bdorderid" value="OAVS21T9I8QL">
  <input type="hidden" name="merchantid" value="BDMERCID">
  <input type="hidden" name="rdata" value="encrypted_response_data">
</form>
<script>
  document.getElementById('sdklaunch').submit();
</script>
```

### Step 3: Payment Callback
After payment, BillDesk redirects to your `BILLDESK_RETURN_URL` with transaction response.

### Step 4: Verify Payment
1. Frontend extracts transaction response from callback
2. Frontend calls `/api/graduation/verify-payment` with `orderid` and `transaction_response`
3. Backend verifies payment status with BillDesk
4. If successful, complete the registration

### Step 5: Complete Registration
After successful payment verification, call `/api/graduation/register` with:
- Original form data
- Payment details (orderid, transactionid, etc.)

## Security Features

### 1. JOSE Encryption (JWE)
- Algorithm: `dir` (Direct Key Agreement)
- Encryption Method: `A256GCM` (AES-256 GCM)
- All requests are encrypted using BillDesk's encryption key

### 2. JOSE Signing (JWS)
- Algorithm: `HS256` (HMAC SHA-256)
- All requests are signed using BillDesk's signing key
- Ensures message integrity and authenticity

### 3. Headers
Every API request includes:
- `Content-Type: application/jose`
- `Accept: application/jose`
- `BD-Traceid`: Unique trace ID for idempotency (max 35 chars)
- `BD-Timestamp`: Unix epoch timestamp

## Error Handling

Common error scenarios:
1. **Configuration Error**: BillDesk credentials not set
2. **Encryption/Signing Error**: Invalid keys or algorithm mismatch
3. **API Error**: BillDesk API returns error response
4. **Payment Failed**: User cancels or payment fails
5. **Verification Failed**: Transaction status check fails

## Testing

### UAT Environment
- Base URL: `https://uat1.billdesk.com/u2`
- Use test credentials provided by BillDesk
- Use test payment methods (test cards, net banking)

### Test Cards (UAT)
Ask BillDesk support for test card numbers and other test payment methods.

## Production Checklist

Before going to production:
1. ✅ Update `BILLDESK_BASE_URL` to production URL
2. ✅ Update all credentials to production keys
3. ✅ Set correct `BILLDESK_RETURN_URL` (must be HTTPS)
4. ✅ Test all payment scenarios
5. ✅ Implement proper error handling and logging
6. ✅ Set up monitoring for payment failures
7. ✅ Implement payment reconciliation
8. ✅ Add webhook handler for payment notifications (if BillDesk supports)

## Database Schema

The `students` table includes BillDesk payment fields:
- `billdesk_order_id`: BillDesk order ID
- `billdesk_transaction_id`: Transaction ID after payment
- `payment_status`: Payment status (success/failed/pending)
- `payment_amount`: Amount paid

## Additional Resources

- [BillDesk Documentation](https://docs.billdesk.io/)
- [Authentication Guide](https://docs.billdesk.io/reference/authentications-and-endpoints)
- [Order Creation API](https://docs.billdesk.io/reference/createorder)
- [Transaction Retrieval API](https://docs.billdesk.io/reference/post-payments-v1_2-transactions-get)

## Support

For BillDesk-specific issues:
- Contact your BillDesk relationship manager
- Email: support@billdesk.com
- Check BillDesk developer documentation

## Notes

1. **Idempotency**: Use unique `BD-Traceid` for each request to prevent duplicate orders
2. **Trace ID**: Max 35 characters, alphanumeric, no spaces or special characters
3. **Amount Format**: Always use 2 decimal places (e.g., "500.00")
4. **Currency Code**: INR = "356"
5. **Order Date**: ISO 8601 format with timezone (e.g., "2023-10-23T10:30:45+05:30")
