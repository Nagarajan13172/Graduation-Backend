# 🔐 BillDesk Credentials Setup Guide

## Quick Start

### Step 1: Check if you have a `.env` file

```bash
ls -la .env
```

If you don't see a `.env` file, create one:

```bash
cp .env.template .env
```

### Step 2: Edit your `.env` file

```bash
nano .env
# or
code .env
# or use your preferred editor
```

### Step 3: Update BillDesk Credentials

Replace the placeholder values with your actual BillDesk credentials:

```env
# BEFORE (placeholder values - won't work):
BILLDESK_CLIENT_ID=your_client_id_here
BILLDESK_SECRET=your_hs256_secret_here
BILLDESK_MERC_ID=your_mercid_here

# AFTER (with your actual credentials):
BILLDESK_CLIENT_ID=BDCLIENT123456
BILLDESK_SECRET=your_actual_secret_key_from_billdesk
BILLDESK_MERC_ID=BDMERCHANT123
```

### Step 4: Update Return URL (if needed)

```env
# For local development (default):
RU_PUBLIC=http://localhost:3000/payment/result

# For production (update to your domain):
RU_PUBLIC=https://yourdomain.com/payment/result
```

### Step 5: Restart the Server

```bash
# Stop the server (Ctrl+C if running)
# Then start again:
npm start
```

### Step 6: Verify Configuration

Test the configuration endpoint:

```bash
curl http://localhost:4000/api/graduation/billdesk-config
```

**Expected response when configured:**
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

**Response when NOT configured (mock mode):**
```json
{
  "configured": false,
  "message": "BillDesk is not fully configured...",
  "instructions": {
    "step1": "Open .env file...",
    ...
  }
}
```

## Getting BillDesk Credentials

### For UAT (Testing) Environment:

1. **Contact BillDesk:**
   - Email: support@billdesk.com
   - Or contact your assigned relationship manager

2. **Request UAT Credentials:**
   - Ask for UAT environment access
   - Mention you need: Client ID, Merchant ID, and HS256 Secret Key

3. **Receive Credentials:**
   They will provide:
   - `BILLDESK_CLIENT_ID` - Your client identifier
   - `BILLDESK_MERC_ID` - Your merchant identifier  
   - `BILLDESK_SECRET` - HS256 secret key for JWT signing

4. **UAT Base URL:**
   ```
   https://uat1.billdesk.com/u2
   ```

### For Production Environment:

1. Complete UAT testing successfully
2. Request production credentials from BillDesk
3. Update `.env` with production values
4. Update `BILLDESK_BASE_URL` to production URL
5. Configure production webhook URL in BillDesk portal

## Troubleshooting

### Issue: "Mock mode" message appears

**Cause:** Environment variables not set or contain placeholder values

**Solution:**
1. Check your `.env` file exists: `ls -la .env`
2. Verify values don't contain `your_` prefix
3. Restart server after updating `.env`

### Issue: Server shows warnings on startup

**Warning:**
```
⚠️  BillDesk Configuration Warning: Missing or placeholder values detected
⚠️  Please update these in .env file: BILLDESK_CLIENT_ID, BILLDESK_SECRET
```

**Solution:**
Update the mentioned variables in `.env` file with actual credentials

### Issue: "Cannot find module" error

**Solution:**
```bash
npm install
```

## Security Best Practices

1. **Never commit `.env` to Git:**
   ```bash
   # .gitignore already includes:
   .env
   ```

2. **Keep credentials secure:**
   - Don't share in email or chat
   - Don't paste in public forums
   - Store securely (password manager)

3. **Use different credentials for UAT and Production:**
   - UAT credentials for testing
   - Production credentials only in production

4. **Rotate secrets periodically:**
   - Contact BillDesk to rotate secrets every 6-12 months

## Configuration Checklist

- [ ] Created `.env` file from template
- [ ] Updated `BILLDESK_CLIENT_ID` with actual value
- [ ] Updated `BILLDESK_SECRET` with actual value
- [ ] Updated `BILLDESK_MERC_ID` with actual value
- [ ] Verified `BILLDESK_BASE_URL` is correct (UAT or Production)
- [ ] Updated `RU_PUBLIC` with your frontend URL
- [ ] Restarted the server
- [ ] Tested configuration endpoint
- [ ] Verified response shows `"configured": true`

## Need Help?

- **BillDesk Technical Support:** Contact your relationship manager
- **Integration Issues:** Check BILLDESK_INTEGRATION_GUIDE.md
- **API Documentation:** See BILLDESK_API_REFERENCE.md
- **Deployment:** Follow MIGRATION_CHECKLIST.md

---

**Last Updated:** October 28, 2025
