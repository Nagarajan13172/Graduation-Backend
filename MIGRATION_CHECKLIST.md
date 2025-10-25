# BillDesk Integration - Migration Checklist

## ✅ Completed Tasks

### Backend Updates
- [x] Created `server/billdesk.js` with JWT signing utilities
- [x] Installed `jsonwebtoken` and `uuid` packages
- [x] Updated `graduationController.js` with new payment logic
- [x] Removed old JWE encryption code
- [x] Updated `graduationRoutes.js` with new endpoints
- [x] Added JOSE body parser to `server.js`
- [x] Created `.env.example` with new variable format
- [x] Created comprehensive documentation

### New API Endpoints
- [x] `POST /api/graduation/billdesk/orders` - Create order
- [x] `GET /api/graduation/billdesk/launch` - Launch payment
- [x] `POST /api/graduation/billdesk/webhook` - Handle webhook
- [x] `POST /api/graduation/billdesk/return` - Handle browser return
- [x] `POST /api/graduation/billdesk/retrieve` - Check transaction status

## 🔲 Pending Tasks

### Environment Configuration
- [ ] Update `.env` file with actual BillDesk credentials
  - [ ] `BILLDESK_CLIENT_ID` (from BillDesk)
  - [ ] `BILLDESK_SECRET` (HS256 secret from BillDesk)
  - [ ] `BILLDESK_MERC_ID` (merchant ID from BillDesk)
  - [ ] `BILLDESK_BASE_URL` (keep UAT URL or update for production)
  - [ ] `RU_PUBLIC` (your frontend return URL)

### Database Schema Updates
- [ ] Create `pending_orders` table
  ```sql
  CREATE TABLE pending_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderid TEXT UNIQUE NOT NULL,
    bdorderid TEXT,
    form_data TEXT, -- JSON string of all registration fields
    file_paths TEXT, -- JSON string of uploaded file paths
    payment_status TEXT DEFAULT 'pending',
    transaction_id TEXT,
    auth_status TEXT,
    amount TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```

- [ ] Update `students` table with payment fields
  ```sql
  ALTER TABLE students ADD COLUMN payment_status TEXT DEFAULT 'pending';
  ALTER TABLE students ADD COLUMN orderid TEXT;
  ALTER TABLE students ADD COLUMN bdorderid TEXT;
  ALTER TABLE students ADD COLUMN transaction_id TEXT;
  ALTER TABLE students ADD COLUMN payment_amount TEXT;
  ALTER TABLE students ADD COLUMN payment_date DATETIME;
  ```

### Controller Updates
- [ ] Update `createCheckoutSession` to store order in `pending_orders` table
- [ ] Implement webhook handler to:
  - [ ] Retrieve order from `pending_orders`
  - [ ] Verify payment status
  - [ ] If successful, insert into `students` table
  - [ ] Update `pending_orders` with final status
  - [ ] Handle idempotency (duplicate webhook calls)
- [ ] Add endpoint to check order status for frontend polling
- [ ] Add cleanup job for expired pending orders (> 24 hours)

### Security & Infrastructure
- [ ] Configure BillDesk webhook URL in their portal
- [ ] Whitelist BillDesk IP addresses for webhook endpoint
- [ ] Enable HTTPS/SSL in production
- [ ] Set up monitoring/alerts for webhook failures
- [ ] Configure CORS for production frontend domain
- [ ] Set up logging for payment transactions
- [ ] Implement rate limiting for payment endpoints

### Frontend Integration
- [ ] Update API endpoints in frontend code:
  - Old: `/create-checkout-session` → New: `/billdesk/orders`
  - Old: `/verify-payment` → New: `/billdesk/retrieve`
- [ ] Implement redirect to `/billdesk/launch` after order creation
- [ ] Add payment status polling on return page
- [ ] Handle different payment statuses (success, failure, pending)
- [ ] Update environment variables with backend URL
- [ ] Test complete payment flow in UAT

### Testing
- [ ] Unit tests for BillDesk helper functions
- [ ] Integration tests for payment flow
- [ ] Test with BillDesk UAT test cards
- [ ] Test webhook handler with mock data
- [ ] Test error scenarios (network failure, invalid signatures, etc.)
- [ ] Load testing for concurrent orders
- [ ] Security audit of payment flow

### Documentation
- [ ] Update API documentation with new endpoints
- [ ] Document payment flow for team
- [ ] Create runbook for payment issues
- [ ] Document rollback procedure if needed

### Deployment
- [ ] Deploy to staging environment
- [ ] Test end-to-end in staging
- [ ] Update production environment variables
- [ ] Deploy to production
- [ ] Monitor logs for first 24 hours
- [ ] Verify webhook is receiving calls
- [ ] Test with real payment in production

## 📝 Migration Notes

### Breaking Changes
1. **Environment Variables Changed:**
   - `BILLDESK_MERCHANT_ID` → `BILLDESK_MERC_ID`
   - `BILLDESK_SIGNING_KEY` → `BILLDESK_SECRET`
   - Removed: `BILLDESK_ENCRYPTION_KEY`, `BILLDESK_ENCRYPTION_KEY_ID`, `BILLDESK_SIGNING_KEY_ID`
   - Added: `RU_PUBLIC`

2. **API Endpoints Changed:**
   - `/create-checkout-session` → `/billdesk/orders`
   - `/verify-payment` → `/billdesk/retrieve`
   - New endpoints: `/launch`, `/webhook`, `/return`

3. **Response Format Changed:**
   - Simplified structure
   - Added `rdata` field for payment launch
   - Removed mock mode check from responses

### Rollback Plan
If issues arise, you can rollback by:
1. Keep old code in a backup branch
2. Revert environment variables
3. Redeploy previous version
4. Update DNS/load balancer if needed

### Testing Checklist
- [ ] Configuration endpoint returns correct status
- [ ] Order creation works with complete form data
- [ ] Payment launch redirects to BillDesk correctly
- [ ] Webhook receives and processes callbacks
- [ ] Transaction retrieval returns accurate status
- [ ] Mock mode works when credentials not set
- [ ] Error handling works for network failures
- [ ] Duplicate webhook calls are handled correctly

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies (DONE)
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Edit .env with your BillDesk credentials
nano .env

# 4. Start server
npm start

# 5. Test configuration
curl http://localhost:8080/api/graduation/billdesk-config

# 6. Run database migrations (create SQL files first)
# sqlite3 graduation.db < migrations/001_add_pending_orders.sql
# sqlite3 graduation.db < migrations/002_update_students_table.sql
```

## 📚 Reference Documents

1. **BILLDESK_INTEGRATION_GUIDE.md** - Complete integration guide
2. **BILLDESK_API_REFERENCE.md** - API endpoints and examples
3. **BILLDESK_SUMMARY.md** - Original integration notes (outdated)
4. **.env.example** - Environment variable template

## 🆘 Support Contacts

- **BillDesk Technical Support**: Contact your relationship manager
- **BillDesk UAT Issues**: support@billdesk.com (or specific UAT email)
- **Internal Team**: [Add your team contacts]

## 📅 Timeline

- [x] Backend code updates - Completed
- [ ] Environment setup - Pending
- [ ] Database migrations - Pending
- [ ] Frontend integration - Pending
- [ ] UAT testing - Pending
- [ ] Production deployment - Pending

**Estimated Time to Complete Pending Tasks:** 2-3 days

---

## Next Steps

1. **Immediate**: Update `.env` with BillDesk credentials
2. **Day 1**: Complete database migrations
3. **Day 1-2**: Implement webhook handler fully
4. **Day 2**: Frontend integration and testing
5. **Day 3**: UAT testing and production deployment

**Questions or Issues?** Refer to BILLDESK_INTEGRATION_GUIDE.md or contact BillDesk support.
