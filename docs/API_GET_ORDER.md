# Get Order Details API

## Overview

Retrieve complete order information including form data and transaction details based on the Order ID.

## Endpoint

```
GET /api/graduation/orders/:orderid
```

## Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| `orderid` | string | URL Path | Yes | Unique order identifier |

## Request Example

```bash
# Using cURL
curl -X GET "http://localhost:8080/api/graduation/orders/5C18174777704880AD37B799E8F91C56"

# Using JavaScript (fetch)
fetch('http://localhost:8080/api/graduation/orders/5C18174777704880AD37B799E8F91C56')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));

# Using axios
const response = await axios.get('/api/graduation/orders/5C18174777704880AD37B799E8F91C56');
console.log(response.data);
```

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "orderid": "5C18174777704880AD37B799E8F91C56",
  
  "personal_info": {
    "full_name": "SATHISH KUMAR",
    "date_of_birth": "2001-12-01",
    "gender": "Male",
    "guardian_name": "Arputharajan",
    "nationality": "indian",
    "religion": "Hindu",
    "email": "SATHISH7845kumar@gmail.com",
    "mobile_number": "7448574698",
    "place_of_birth": "Dharmapuri",
    "community": "BC",
    "mother_tongue": "telugu",
    "aadhar_number": "123456789012"
  },
  
  "academic_info": {
    "degree_name": "Bachelor of Science",
    "university_name": "Periyar University",
    "degree_pattern": "Semester",
    "convocation_year": "2024",
    "is_registered_graduate": false
  },
  
  "additional_info": {
    "occupation": "Software Developer",
    "address": "123 Main Street, Salem",
    "lunch_required": "VEG",
    "companion_option": "1 Veg"
  },
  
  "transaction_info": {
    "payment_status": "paid",
    "bdorderid": "BD20251103001234",
    "transaction_id": "TXN20251103001234",
    "payment_amount": "500.00",
    "payment_date": "2025-11-03T14:30:45.000Z",
    "payment_method_type": "netbanking",
    "payment_bank_ref": "BK123456789",
    "payment_error_code": null,
    "payment_error_desc": null,
    "receipt_number": "RCP1730645445123",
    "receipt_generated_at": "2025-11-03T14:30:45.123Z"
  },
  
  "metadata": {
    "student_id": 1,
    "created_at": "2025-11-03 14:25:30",
    "updated_at": "2025-11-03 14:30:45"
  }
}
```

### Error Responses

#### 400 Bad Request - Missing OrderID

```json
{
  "success": false,
  "error": "orderid is required"
}
```

#### 404 Not Found - Order Not Found

```json
{
  "success": false,
  "error": "Order not found",
  "message": "No order found with orderid: INVALID_ORDER_ID"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Failed to fetch order details",
  "message": "Database connection error"
}
```

## Response Fields

### Personal Info

| Field | Type | Description |
|-------|------|-------------|
| `full_name` | string | Student's full name (uppercase) |
| `date_of_birth` | string | Date of birth (YYYY-MM-DD) |
| `gender` | string | Gender (Male/Female/Other) |
| `guardian_name` | string | Parent/Guardian name |
| `nationality` | string | Nationality |
| `religion` | string | Religion |
| `email` | string | Email address |
| `mobile_number` | string | 10-digit mobile number |
| `place_of_birth` | string | Birth district |
| `community` | string | Community category (OC/BC/SC/ST/MBC) |
| `mother_tongue` | string | Mother tongue |
| `aadhar_number` | string | 12-digit Aadhar number |

### Academic Info

| Field | Type | Description |
|-------|------|-------------|
| `degree_name` | string | Name of the degree |
| `university_name` | string | University name |
| `degree_pattern` | string | Pattern/system of degree |
| `convocation_year` | string | Year of convocation |
| `is_registered_graduate` | boolean | Registered with another university |

### Additional Info

| Field | Type | Description |
|-------|------|-------------|
| `occupation` | string | Current occupation |
| `address` | string | Residential address |
| `lunch_required` | string | Lunch preference (VEG/NON-VEG) |
| `companion_option` | string | Number and type of companions |

### Transaction Info

| Field | Type | Description |
|-------|------|-------------|
| `payment_status` | string | Status: pending/paid/failed |
| `bdorderid` | string | BillDesk order ID |
| `transaction_id` | string | Transaction reference ID |
| `payment_amount` | string | Payment amount (INR) |
| `payment_date` | string | Payment timestamp (ISO 8601) |
| `payment_method_type` | string | Payment method (netbanking/card/upi) |
| `payment_bank_ref` | string | Bank reference number |
| `payment_error_code` | string | Error code (if failed) |
| `payment_error_desc` | string | Error description (if failed) |
| `receipt_number` | string | Receipt number (if paid) |
| `receipt_generated_at` | string | Receipt generation time |

### Metadata

| Field | Type | Description |
|-------|------|-------------|
| `student_id` | integer | Internal database ID |
| `created_at` | string | Record creation timestamp |
| `updated_at` | string | Last update timestamp |

## Use Cases

### 1. Payment Status Check

Check if a payment has been completed:

```javascript
const { transaction_info } = await getOrderDetails(orderid);

if (transaction_info.payment_status === 'paid') {
  console.log('Payment successful!');
  console.log('Receipt:', transaction_info.receipt_number);
} else if (transaction_info.payment_status === 'pending') {
  console.log('Payment pending...');
} else {
  console.log('Payment failed:', transaction_info.payment_error_desc);
}
```

### 2. Display Order Summary

Show complete order information to the user:

```javascript
const order = await getOrderDetails(orderid);

console.log(`
  Order ID: ${order.orderid}
  Student: ${order.personal_info.full_name}
  Email: ${order.personal_info.email}
  Status: ${order.transaction_info.payment_status}
  Amount: ₹${order.transaction_info.payment_amount}
`);
```

### 3. Generate Receipt

Use order data to generate a receipt:

```javascript
const order = await getOrderDetails(orderid);

if (order.transaction_info.payment_status === 'paid') {
  const receipt = {
    receiptNumber: order.transaction_info.receipt_number,
    studentName: order.personal_info.full_name,
    amount: order.transaction_info.payment_amount,
    date: order.transaction_info.payment_date,
    transactionId: order.transaction_info.transaction_id
  };
  
  generatePDF(receipt);
}
```

### 4. Order Tracking

Track order from creation to completion:

```javascript
const order = await getOrderDetails(orderid);

console.log('Order Timeline:');
console.log('Created:', order.metadata.created_at);
console.log('Updated:', order.metadata.updated_at);
console.log('Status:', order.transaction_info.payment_status);

if (order.transaction_info.payment_date) {
  console.log('Paid:', order.transaction_info.payment_date);
}
```

### 5. Student Portal

Display student's own information:

```javascript
// After user logs in with orderid
const order = await getOrderDetails(userOrderId);

// Show personal dashboard
return {
  profile: order.personal_info,
  academic: order.academic_info,
  payment: {
    status: order.transaction_info.payment_status,
    receipt: order.transaction_info.receipt_number
  }
};
```

## Integration Examples

### React Component

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function OrderDetails({ orderid }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const response = await axios.get(`/api/graduation/orders/${orderid}`);
        setOrder(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch order');
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrder();
  }, [orderid]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!order) return <div>Order not found</div>;

  return (
    <div className="order-details">
      <h2>Order {order.orderid}</h2>
      
      <section>
        <h3>Personal Information</h3>
        <p>Name: {order.personal_info.full_name}</p>
        <p>Email: {order.personal_info.email}</p>
        <p>Mobile: {order.personal_info.mobile_number}</p>
      </section>
      
      <section>
        <h3>Payment Status</h3>
        <p>Status: {order.transaction_info.payment_status}</p>
        <p>Amount: ₹{order.transaction_info.payment_amount}</p>
        {order.transaction_info.receipt_number && (
          <p>Receipt: {order.transaction_info.receipt_number}</p>
        )}
      </section>
    </div>
  );
}

export default OrderDetails;
```

### Node.js Backend

```javascript
const express = require('express');
const axios = require('axios');

const router = express.Router();

// Proxy endpoint with additional processing
router.get('/student/order/:orderid', async (req, res) => {
  try {
    const { orderid } = req.params;
    
    // Fetch order details
    const response = await axios.get(
      `http://localhost:8080/api/graduation/orders/${orderid}`
    );
    
    const order = response.data;
    
    // Add additional computed fields
    order.computed = {
      isPaid: order.transaction_info.payment_status === 'paid',
      hasReceipt: !!order.transaction_info.receipt_number,
      daysSinceCreation: calculateDays(order.metadata.created_at)
    };
    
    res.json(order);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Failed to fetch order'
    });
  }
});

module.exports = router;
```

## Notes

- **Performance**: Query uses indexed `orderid` field for fast lookups
- **Security**: No authentication required (public endpoint), but consider adding auth for production
- **Caching**: Response can be cached based on `payment_status` (cache paid orders, don't cache pending)
- **Rate Limiting**: Consider implementing rate limiting for this endpoint

## Related Endpoints

- `POST /api/graduation/billdesk/orders` - Create new order
- `POST /api/graduation/billdesk/transactions/get` - Retrieve transaction from BillDesk
- `GET /api/graduation/all` - List all orders (admin)

## Version History

- **v1.0** (November 2025) - Initial release

---

**Last Updated:** November 5, 2025
