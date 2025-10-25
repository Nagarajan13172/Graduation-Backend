# 🚀 Quick Start Guide - BillDesk Integration

## Prerequisites Completed ✅

- [x] Code updated to use JWT-based BillDesk integration
- [x] Dependencies installed (`jsonwebtoken`, `uuid`)
- [x] Documentation created
- [x] Migration scripts ready

## What You Need to Do Now

### 1️⃣ Configure Environment Variables (5 minutes)

```bash
# Edit your .env file
nano .env
```

Add or update these variables:
```env
PORT=8080

# Get these from BillDesk
BILLDESK_CLIENT_ID=your_actual_client_id
BILLDESK_SECRET=your_actual_hs256_secret
BILLDESK_MERC_ID=your_actual_merchant_id

# BillDesk UAT base URL
BILLDESK_BASE_URL=https://uat1.billdesk.com/u2

# Your frontend return URL
RU_PUBLIC=http://localhost:3000/payment/result
```

**Where to get credentials?**
- Contact your BillDesk relationship manager
- Request UAT credentials for testing
- They will provide: Client ID, Merchant ID, and Secret Key

### 2️⃣ Run Database Migrations (2 minutes)

```bash
cd /home/allyhari/periyar/Graduation-Backend

# Run all migrations
sqlite3 graduation.db < migrations/run_all.sql

# Verify migrations
sqlite3 graduation.db ".tables"
# Should show: pending_orders, students, etc.
```

### 3️⃣ Test the Server (1 minute)

```bash
# Start the server
npm start

# In another terminal, test the configuration
curl http://localhost:8080/api/graduation/billdesk-config
```

**Expected response:**
```json
{
  "configured": true,
  "message": "BillDesk is fully configured and ready to use",
  "config": {
    "mercId": "✓ Set",
    "clientId": "✓ Set",
    "secret": "✓ Set",
    ...
  }
}
```

If you see `"configured": false`, check your `.env` file.

### 4️⃣ Test Payment Flow (Optional - UAT)

```bash
# Test creating an order (simplified)
curl -X POST http://localhost:8080/api/graduation/billdesk/orders \
  -F "full_name=Test User" \
  -F "email=test@example.com" \
  -F "mobile_number=9876543210" \
  # ... add all required fields
```

See `BILLDESK_API_REFERENCE.md` for complete examples.

## Directory Structure After Setup

```
Graduation-Backend/
├── .env                              # ← YOU NEED TO CONFIGURE THIS
├── graduation.db                     # ← MIGRATIONS WILL UPDATE THIS
├── server/
│   └── billdesk.js                   # ✅ Created
├── src/
│   ├── controllers/
│   │   └── graduationController.js   # ✅ Updated
│   └── routes/
│       └── graduationRoutes.js       # ✅ Updated
├── migrations/                       # ✅ Created
│   ├── 001_create_pending_orders.sql
│   ├── 002_add_payment_fields_to_students.sql
│   └── run_all.sql
├── BILLDESK_INTEGRATION_GUIDE.md    # ✅ Read this for details
├── BILLDESK_API_REFERENCE.md        # ✅ Use for frontend
├── MIGRATION_CHECKLIST.md           # ✅ Deployment guide
└── UPDATE_SUMMARY.md                # ✅ What changed
```

## Quick Commands Reference

```bash
# Start server
npm start

# Check configuration
curl http://localhost:8080/api/graduation/billdesk-config

# Run migrations
sqlite3 graduation.db < migrations/run_all.sql

# View database tables
sqlite3 graduation.db ".tables"

# View pending_orders schema
sqlite3 graduation.db ".schema pending_orders"

# Check for errors in logs
npm start 2>&1 | grep -i error
```

## Common Issues & Solutions

### Issue: "Mock mode" response
**Cause:** Environment variables not set or contain placeholder values  
**Solution:** Update `.env` with actual BillDesk credentials

### Issue: "Cannot find module '../server/billdesk'"
**Cause:** File path issue  
**Solution:** Check that `server/billdesk.js` exists

### Issue: "Table pending_orders does not exist"
**Cause:** Migrations not run  
**Solution:** Run `sqlite3 graduation.db < migrations/run_all.sql`

### Issue: Cannot connect to BillDesk
**Cause:** Wrong base URL or credentials  
**Solution:** Verify `BILLDESK_BASE_URL` and credentials with BillDesk

## Next Steps

1. **Frontend Integration**
   - Read `BILLDESK_API_REFERENCE.md`
   - Update frontend to use new endpoints
   - Test payment flow end-to-end

2. **Production Deployment**
   - Follow `MIGRATION_CHECKLIST.md`
   - Update production environment variables
   - Configure webhook URL in BillDesk portal
   - Monitor logs after deployment

## Testing Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Server starts without errors
- [ ] Configuration endpoint returns "configured: true"
- [ ] Can create test order (mock mode or UAT)
- [ ] Frontend integrated with new endpoints
- [ ] Payment flow tested end-to-end in UAT
- [ ] Webhook receiving callbacks
- [ ] Transaction status retrieval working

## Documentation Reference

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **QUICK_START.md** (this file) | Get started quickly | Now |
| **BILLDESK_INTEGRATION_GUIDE.md** | Complete technical guide | During development |
| **BILLDESK_API_REFERENCE.md** | API examples & frontend | Frontend integration |
| **MIGRATION_CHECKLIST.md** | Deployment steps | Before production |
| **UPDATE_SUMMARY.md** | What changed | Understanding changes |
| **migrations/README.md** | Database setup | Running migrations |

## Support

- **BillDesk Issues:** Contact your BillDesk relationship manager
- **Technical Questions:** Refer to documentation files
- **Code Issues:** Check error logs and documentation

## 🎉 You're Ready!

Once you complete steps 1-3 above, you're ready to:
- Test the payment flow
- Integrate with frontend
- Deploy to production

**Estimated Setup Time:** 10-15 minutes

---

**Need help?** Check `BILLDESK_INTEGRATION_GUIDE.md` for detailed information.
