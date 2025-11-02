# BillDesk Payment API - Quick Reference

## Frontend Integration Example

### Step 1: Create Payment Order

```javascript
// Create order with student registration data
const formData = new FormData();
formData.append('full_name', 'John Doe');
formData.append('email', 'john@example.com');
formData.append('mobile_number', '9876543210');
// ... add all other fields and files

const response = await fetch('http://localhost:8080/api/graduation/billdesk/orders', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log(data);
/* Response:
{
  "success": true,
  "bdorderid": "BD1234567890",
  "orderid": "ORD1234567890123",
  "merchantid": "YOUR_MERC_ID",
  "rdata": "encrypted_data_here",
  "links": [...],
  "formData": { ... }
}
*/
```

### Step 2: Redirect to Payment Gateway

```javascript
// After receiving response, redirect user to launch URL
const launchUrl = `http://localhost:8080/api/graduation/billdesk/launch?bdorderid=${data.bdorderid}&rdata=${encodeURIComponent(data.rdata)}`;

// Option 1: Direct redirect
window.location.href = launchUrl;

// Option 2: Open in new window
window.open(launchUrl, '_blank');
```

### Step 3: Check Payment Status

```javascript
// After user returns from payment gateway
// Poll for payment status (recommended: use setInterval)

async function checkPaymentStatus(orderid) {
  const response = await fetch('http://localhost:8080/api/graduation/billdesk/retrieve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ orderid })
  });
  
  const result = await response.json();
  
  // Check auth_status
  if (result.auth_status === '0300') {
    console.log('Payment successful!');
    return 'success';
  } else if (result.auth_status === '0399') {
    console.log('Payment failed');
    return 'failed';
  } else if (result.auth_status === '0002') {
    console.log('Payment pending');
    return 'pending';
  } else {
    console.log('Payment not attempted');
    return 'cancelled';
  }
}

// Poll every 3 seconds for up to 1 minute
let attempts = 0;
const maxAttempts = 20;
const pollInterval = setInterval(async () => {
  attempts++;
  const status = await checkPaymentStatus(orderid);
  
  if (status === 'success') {
    clearInterval(pollInterval);
    // Show success message, redirect to confirmation page
  } else if (status === 'failed') {
    clearInterval(pollInterval);
    // Show failure message, allow retry
  } else if (attempts >= maxAttempts) {
    clearInterval(pollInterval);
    // Timeout - ask user to check status later
  }
}, 3000);
```

## React Component Example

```jsx
import React, { useState } from 'react';

function PaymentForm() {
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create order
      const formData = new FormData(e.target);
      const response = await fetch('/api/graduation/billdesk/orders', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // 2. Store orderid for later status check
        localStorage.setItem('pendingOrderId', data.orderid);

        // 3. Redirect to payment gateway
        const launchUrl = `/api/graduation/billdesk/launch?bdorderid=${data.bdorderid}&rdata=${encodeURIComponent(data.rdata)}`;
        window.location.href = launchUrl;
      } else {
        alert('Failed to create payment order');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="full_name" placeholder="Full Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="mobile_number" placeholder="Mobile" required />
      {/* Add all other form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Pay & Register'}
      </button>
    </form>
  );
}

function PaymentStatusChecker() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const orderid = localStorage.getItem('pendingOrderId');
    if (!orderid) return;

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const response = await fetch('/api/graduation/billdesk/retrieve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderid })
        });

        const result = await response.json();

        if (result.auth_status === '0300') {
          setStatus('success');
          clearInterval(interval);
          localStorage.removeItem('pendingOrderId');
        } else if (result.auth_status === '0399') {
          setStatus('failed');
          clearInterval(interval);
          localStorage.removeItem('pendingOrderId');
        } else if (attempts >= 20) {
          setStatus('timeout');
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {status === 'checking' && <p>Checking payment status...</p>}
      {status === 'success' && <p>Payment successful! ✓</p>}
      {status === 'failed' && <p>Payment failed. Please try again.</p>}
      {status === 'timeout' && <p>Status check timeout. Please check later.</p>}
    </div>
  );
}

export { PaymentForm, PaymentStatusChecker };
```

## cURL Testing Examples

### 1. Check Configuration
```bash
curl http://localhost:8080/api/graduation/billdesk-config
```

### 2. Create Order (minimal test)
```bash
curl -X POST http://localhost:8080/api/graduation/billdesk/orders \
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
  -F "degree_pattern=Regular" \
  -F "convocation_year=2024" \
  -F "is_registered_graduate=false" \
  -F "occupation=Software Engineer" \
  -F "address=123 Main St, Salem" \
  -F "declaration=true" \
  -F "lunch_required=VEG" \
  -F "companion_option=1 Veg" \
  -F "applicant_photo=@/path/to/photo.jpg" \
  -F "aadhar_copy=@/path/to/aadhar.pdf" \
  -F "residence_certificate=@/path/to/residence.pdf" \
  -F "degree_certificate=@/path/to/degree.pdf" \
  -F "signature=@/path/to/signature.jpg"
```

### 3. Retrieve Transaction Status
```bash
curl -X POST http://localhost:8080/api/graduation/billdesk/retrieve \
  -H "Content-Type: application/json" \
  -d '{"orderid":"ORD1234567890123"}'
```

## Auth Status Reference

| Code | Description | Action |
|------|-------------|--------|
| 0300 | Success | Complete registration |
| 0399 | Failure | Show error, allow retry |
| 0002 | Pending | Keep polling |
| NA   | Not attempted | User cancelled |

## Testing URLs

### UAT Environment
- Base URL: `https://uat1.billdesk.com/u2`
- Test cards/netbanking available from BillDesk
- Use UAT credentials from BillDesk

### Local Development
- Backend: `http://localhost:8080`
- Mock mode: Automatic when credentials not configured
- Use any values for testing form validation

## Important Notes

1. **Order ID Format**: Must be 10-35 alphanumeric characters
2. **Amount Format**: String with 2 decimal places (e.g., "500.00")
3. **Currency**: "356" for INR
4. **Webhook**: Must be publicly accessible (use ngrok for local testing)
5. **Return URL**: Should be your frontend URL where user lands after payment

## Postman Collection

You can create a Postman collection with these endpoints for testing:

1. GET `/api/graduation/billdesk-config`
2. POST `/api/graduation/billdesk/orders` (with multipart form data)
3. GET `/api/graduation/billdesk/launch?bdorderid=xxx&rdata=xxx`
4. POST `/api/graduation/billdesk/retrieve` (with JSON body)

## Troubleshooting

**Issue**: "Mock mode" message in response
- **Solution**: Update `.env` with actual BillDesk credentials

**Issue**: Cannot reach payment gateway
- **Solution**: Check if `bdorderid` and `rdata` are correctly passed to launch URL

**Issue**: Webhook not called
- **Solution**: Ensure webhook URL is publicly accessible, whitelist BillDesk IPs

**Issue**: Payment status always pending
- **Solution**: Wait 30-60 seconds, BillDesk may have processing delay
