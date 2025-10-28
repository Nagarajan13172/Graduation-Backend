# 🔄 Environment Variable Mapping - Old vs New

## Problem You Had

Your `.env` file was using OLD variable names from the previous JWE-based integration, but the new code expects DIFFERENT variable names for the simpler JWT-based integration.

**Result:** Server was running in MOCK mode even though you had valid credentials! ❌

## Variable Name Changes

| Old Variable Name | New Variable Name | Your Value | Notes |
|-------------------|-------------------|------------|-------|
| `BILLDESK_MERCHANT_ID` | `BILLDESK_MERC_ID` | `BDUATV2KTK` | ✅ Renamed |
| `BILLDESK_CLIENT_ID` | `BILLDESK_CLIENT_ID` | `bduatv2ktksj1` | ✅ Same name |
| `BILLDESK_SIGNING_KEY` | `BILLDESK_SECRET` | `B40hskbL1WQQ2GNNwpN2c1FbhS2UNO3r` | ✅ Renamed |
| `BILLDESK_ENCRYPTION_KEY` | ❌ Not used | - | Removed (no longer needed) |
| `BILLDESK_ENCRYPTION_KEY_ID` | ❌ Not used | - | Removed (no longer needed) |
| `BILLDESK_SIGNING_KEY_ID` | ❌ Not used | - | Removed (no longer needed) |
| `BILLDESK_BASE_URL` | `BILLDESK_BASE_URL` | `https://uat1.billdesk.com/u2` | ✅ Same name |
| `BILLDESK_RETURN_URL` | `RU_PUBLIC` | `http://localhost:3000/payment/result` | ✅ Renamed |

## What Changed in Your `.env` File

### ❌ BEFORE (Old - Not Working):

```env
BILLDESK_MERCHANT_ID=BDUATV2KTK
BILLDESK_CLIENT_ID=bduatv2ktksj1
BILLDESK_ENCRYPTION_KEY=your_encryption_key
BILLDESK_ENCRYPTION_KEY_ID=rkoGa4SDxctH
BILLDESK_SIGNING_KEY=your_signing_key
BILLDESK_SIGNING_KEY_ID=your_signing_key_id
BILLDESK_BASE_URL=https://uat1.billdesk.com/u2
BILLDESK_RETURN_URL=http://localhost:3000/payment/callback
```

**Why it didn't work:**
- Wrong variable names (code looks for `BILLDESK_MERC_ID`, not `BILLDESK_MERCHANT_ID`)
- System couldn't find the values → fell back to MOCK mode

### ✅ AFTER (New - Working):

```env
PORT=4000

# BillDesk Configuration
BILLDESK_MERC_ID=BDUATV2KTK
BILLDESK_CLIENT_ID=bduatv2ktksj1
BILLDESK_SECRET=B40hskbL1WQQ2GNNwpN2c1FbhS2UNO3r
BILLDESK_BASE_URL=https://uat1.billdesk.com/u2
RU_PUBLIC=http://localhost:3000/payment/result
```

**Why it works now:**
- ✅ Correct variable names that match the code
- ✅ Uses Signing Password as SECRET (for JWT signing)
- ✅ Removed unnecessary encryption variables

## What You Should See Now

### 1. Server Startup Messages

**Before (Mock Mode):**
```
⚠️  BillDesk Configuration Warning: Missing or placeholder values detected
⚠️  Running in MOCK mode until credentials are configured
```

**After (Real Mode):**
```
✓ BillDesk configuration loaded from .env file
✓ Merchant ID: BDUATV2KTK
✓ Client ID: bduatv2ktksj1
✓ Base URL: https://uat1.billdesk.com/u2
```

### 2. API Response from `/api/graduation/billdesk/orders`

**Before (Mock Response):**
```json
{
  "success": true,
  "mock": true,  ← This flag indicates mock mode
  "message": "BillDesk not configured...",
  "merchantid": "MOCK_MERCHANT",
  "orderid": "MOCK_1761630467407823"
}
```

**After (Real Response):**
```json
{
  "success": true,
  "bdorderid": "BD1234567890",  ← Real BillDesk order ID
  "orderid": "ORD1761630467407123",  ← Real order ID (no MOCK_ prefix)
  "merchantid": "BDUATV2KTK",  ← Your actual merchant ID
  "rdata": "actual_encrypted_rdata_from_billdesk",
  "links": [...]
}
```

**Note:** No `"mock": true` flag in the response!

## Why the Integration Changed

### Old Integration (JWE-based):
- ❌ Complex: Required encryption + signing
- ❌ Multiple keys: Encryption key, Signing key, Key IDs
- ❌ Library issues: jose library with ES Module problems

### New Integration (JWT-based):
- ✅ Simple: Only JWT signing (HS256)
- ✅ Single secret: One key for everything
- ✅ Standard: Uses jsonwebtoken library
- ✅ Reliable: No ES Module issues

## Steps to Complete Setup

1. **✅ DONE:** Updated `.env` with correct variable names
2. **📍 NEXT:** Restart the server
3. **📍 VERIFY:** Check server logs for success messages
4. **📍 TEST:** Try creating order again

## Restart Server

```bash
# Stop current server (Ctrl+C if running)

# Start server
npm start

# You should see:
# ✓ BillDesk configuration loaded from .env file
# ✓ Merchant ID: BDUATV2KTK
```

## Test Configuration

```bash
# Test configuration endpoint
curl http://localhost:4000/api/graduation/billdesk-config

# Should return:
{
  "configured": true,
  "message": "BillDesk is fully configured and ready to use",
  ...
}
```

## Your Credentials (for reference)

```
Merchant ID: BDUATV2KTK
Client ID: bduatv2ktksj1
Secret (Signing Password): B40hskbL1WQQ2GNNwpN2c1FbhS2UNO3r
Base URL: https://uat1.billdesk.com/u2
```

**Note:** Encryption Password (`Aoqm9Apw8XFvK1MARZ7aJqEloC60vF8j`) is NOT used in the new integration.

## Frontend Fix

After restarting the server, your frontend should now receive:

```json
{
  "success": true,
  "bdorderid": "BD...",  ← Real value
  "rdata": "...",        ← Real value  
  // NO "mock": true flag
}
```

The error `⚠️ Missing bdorderid/rdata in response` will be fixed because:
- `bdorderid` will be a real BillDesk order ID (not mock)
- `rdata` will be actual encrypted data from BillDesk (not "mock_rdata_value")

## Summary

**Problem:** Wrong variable names in `.env`  
**Solution:** Updated to new variable names  
**Action Required:** Restart server  
**Expected Result:** Real BillDesk integration (no mock mode)

---

**Last Updated:** October 28, 2025  
**Status:** ✅ `.env` file updated with correct variable names
