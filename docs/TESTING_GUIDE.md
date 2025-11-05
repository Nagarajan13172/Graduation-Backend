# BillDesk Integration - Testing Guide

## ✅ Server Status
Your server is now running successfully on http://localhost:4000

## 🔧 Setup Checklist

### 1. Environment Variables
Make sure you have updated `.env` with actual BillDesk credentials:
```env
BILLDESK_MERCHANT_ID=<your_merchant_id>
BILLDESK_CLIENT_ID=<your_client_id>
BILLDESK_ENCRYPTION_KEY=<your_encryption_key>
BILLDESK_ENCRYPTION_KEY_ID=<your_encryption_key_id>
BILLDESK_SIGNING_KEY=<your_signing_key>
BILLDESK_SIGNING_KEY_ID=<your_signing_key_id>
BILLDESK_BASE_URL=https://uat1.billdesk.com/u2
BILLDESK_RETURN_URL=http://localhost:3000/payment/callback
```

### 2. Database
✅ Database initialized successfully with BillDesk payment fields

## 🧪 Testing the Endpoints

### Test 1: Check Email
```bash
curl -X GET "http://localhost:4000/api/graduation/check-email?email=test@example.com"
```

Expected Response:
```json
{
  "exists": false
}
```

### Test 2: Create BillDesk Order (Payment Session)
```bash
curl -X POST http://localhost:4000/api/graduation/create-checkout-session \
  -F "full_name=John Doe" \
  -F "date_of_birth=1990-01-01" \
  -F "gender=Male" \
  -F "guardian_name=Jane Doe" \
  -F "nationality=Indian" \
  -F "religion=Hindu" \
  -F "email=john@example.com" \
  -F "mobile_number=9876543210" \
  -F "place_of_birth=Salem" \
  -F "community=OC" \
  -F "mother_tongue=Tamil" \
  -F "aadhar_number=123456789012" \
  -F "degree_name=B.Tech" \
  -F "university_name=Anna University" \
  -F "degree_pattern=Semester" \
  -F "convocation_year=2023" \
  -F "occupation=Engineer" \
  -F "address=123 Main St, Salem" \
  -F "declaration=true" \
  -F "lunch_required=VEG" \
  -F "companion_option=1 Veg" \
  -F "is_registered_graduate=false" \
  -F "applicant_photo=@/path/to/photo.jpg" \
  -F "aadhar_copy=@/path/to/aadhar.pdf" \
  -F "residence_certificate=@/path/to/residence.pdf" \
  -F "degree_certificate=@/path/to/degree.pdf" \
  -F "signature=@/path/to/signature.jpg"
```

Expected Response (with real BillDesk credentials):
```json
{
  "success": true,
  "bdorderid": "OAVS21T9I8QL",
  "orderid": "ORDER1698765432123",
  "merchantid": "BDMERCID",
  "links": [...],
  "formData": {
    // Stored form data
  }
}
```

### Test 3: Verify Payment
```bash
curl -X POST http://localhost:4000/api/graduation/verify-payment \
  -H "Content-Type: application/json" \
  -d '{
    "orderid": "ORDER1698765432123"
  }'
```

Expected Response:
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

### Test 4: List All Students
```bash
curl -X GET http://localhost:4000/api/graduation/all
```

## 🔒 Important Notes

### Before Testing Order Creation:
1. **Get BillDesk Credentials**: Contact your BillDesk relationship manager
2. **Update .env**: Replace placeholder values with actual credentials
3. **Use UAT Environment**: Keep `BILLDESK_BASE_URL=https://uat1.billdesk.com/u2` for testing
4. **Test Payment Methods**: Ask BillDesk for test card numbers

### Configuration Errors You Might See:
- **"Payment gateway not configured"**: BillDesk credentials not set in .env
- **"Failed to encrypt payload"**: Invalid encryption key or key format
- **"Failed to sign payload"**: Invalid signing key or key format
- **BillDesk API errors**: Check merchant ID, client ID, or API endpoint

## 🌐 Frontend Integration Example

### Step 1: Create Order on Backend
```javascript
const formData = new FormData();
// Add all form fields and files...

const response = await fetch('/api/graduation/create-checkout-session', {
  method: 'POST',
  body: formData
});

const { bdorderid, orderid, merchantid, formData: savedData } = await response.json();
```

### Step 2: Redirect to BillDesk Payment Page
```html
<form id="billdesk-payment" action="https://uat1.billdesk.com/u2/web/v1_2/embeddedsdk" method="POST">
  <input type="hidden" name="bdorderid" value="${bdorderid}">
  <input type="hidden" name="merchantid" value="${merchantid}">
</form>
<script>
  // Auto-submit the form
  document.getElementById('billdesk-payment').submit();
</script>
```

### Step 3: Handle Payment Callback
When user returns from BillDesk to your `BILLDESK_RETURN_URL`:

```javascript
// Extract orderid from URL or response
const orderid = new URLSearchParams(window.location.search).get('orderid');

// Verify payment
const verifyResponse = await fetch('/api/graduation/verify-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orderid })
});

const paymentStatus = await verifyResponse.json();

if (paymentStatus.success) {
  // Payment successful!
  // Now complete the registration with saved form data
  await completeRegistration(savedData, paymentStatus);
} else {
  // Payment failed
  alert('Payment failed. Please try again.');
}
```

## 📝 Development vs Production

### UAT/Development (Current Setup)
- Base URL: `https://uat1.billdesk.com/u2`
- Use test credentials
- Use test payment methods
- Return URL can be HTTP (localhost)

### Production
- Base URL: `https://api.billdesk.com/`
- Use production credentials
- Real payment methods
- Return URL must be HTTPS
- Test thoroughly in UAT before deploying

## 🐛 Troubleshooting

### Server won't start?
```bash
# Check for syntax errors
npm start

# Check if port 4000 is available
lsof -i :4000
```

### Can't test endpoints?
```bash
# Make sure server is running
curl http://localhost:4000/api/graduation/all

# Check logs
tail -f logs/app.log  # if you have logging setup
```

### BillDesk API errors?
- Check BillDesk documentation: https://docs.billdesk.io/
- Verify all credentials are correct
- Check BD-Traceid is unique (max 35 chars)
- Ensure request payload matches BillDesk specs

## 📚 Additional Resources

- **BillDesk Docs**: https://docs.billdesk.io/
- **Integration Guide**: See `BILLDESK_INTEGRATION.md`
- **Summary**: See `BILLDESK_SUMMARY.md`

## 🎯 Next Steps

1. ✅ Server is running successfully
2. 🔄 Get actual BillDesk credentials from your relationship manager
3. 🔄 Update `.env` with real credentials
4. 🔄 Test order creation in UAT environment
5. 🔄 Test payment flow with test cards
6. 🔄 Integrate with frontend
7. 🔄 Test complete registration flow
8. 🔄 Move to production after thorough testing

## ✨ Success Indicators

When everything is working:
- ✅ Server starts without errors
- ✅ Database connection successful
- ✅ Can create BillDesk orders
- ✅ Can verify payment status
- ✅ Can complete registration after payment
- ✅ All files are uploaded and stored correctly

Good luck with your BillDesk integration! 🚀
