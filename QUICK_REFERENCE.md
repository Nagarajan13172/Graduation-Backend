# 🚀 Quick Reference - BillDesk Configuration

## ⚡ Super Quick Setup (5 minutes)

```bash
# 1. Create .env file (if you don't have one)
cp .env.template .env

# 2. Edit with your credentials
nano .env

# 3. Replace these lines:
BILLDESK_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID
BILLDESK_SECRET=YOUR_ACTUAL_SECRET
BILLDESK_MERC_ID=YOUR_ACTUAL_MERCHANT_ID

# 4. Restart server
npm start

# 5. Test
curl http://localhost:4000/api/graduation/billdesk-config
```

## 📋 Environment Variables Checklist

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `BILLDESK_CLIENT_ID` | Client ID from BillDesk | `BDCLIENT123` | ✅ Yes |
| `BILLDESK_SECRET` | HS256 secret key | `your_secret_key` | ✅ Yes |
| `BILLDESK_MERC_ID` | Merchant ID | `BDMERC456` | ✅ Yes |
| `BILLDESK_BASE_URL` | API endpoint | `https://uat1.billdesk.com/u2` | ✅ Yes |
| `RU_PUBLIC` | Return URL | `http://localhost:3000/payment/result` | ✅ Yes |
| `PORT` | Server port | `4000` | ⚪ Optional |

## 🎯 API Endpoints Quick Reference

```bash
# Check configuration
GET /api/graduation/billdesk-config

# Create order
POST /api/graduation/billdesk/orders

# Launch payment
GET /api/graduation/billdesk/launch?bdorderid=XXX&rdata=YYY

# Webhook (BillDesk calls this)
POST /api/graduation/billdesk/webhook

# Retrieve transaction
POST /api/graduation/billdesk/retrieve
```

## 🔍 Quick Diagnostics

### Check if configured properly:

```bash
curl http://localhost:4000/api/graduation/billdesk-config | grep configured
```

**Should see:** `"configured": true`

### Check server logs:

```bash
npm start
```

**Look for:** `✓ BillDesk configuration loaded from .env file`

### Common Issues:

| Issue | Cause | Fix |
|-------|-------|-----|
| Mock mode active | Placeholder values in .env | Update with real credentials |
| Module not found | Dependencies missing | Run `npm install` |
| Port already in use | Another app using port 4000 | Change PORT in .env |
| Config not loaded | .env file missing | Create .env from template |

## 📁 File Locations

```
.env                           # ← Your credentials HERE
.env.template                  # ← Copy from here
server/billdesk.js            # ← BillDesk utilities
src/controllers/graduationController.js  # ← Payment logic
```

## 🔐 Credential Sources

**Get BillDesk Credentials From:**
1. Your BillDesk relationship manager
2. BillDesk onboarding email
3. BillDesk merchant portal

**Need UAT credentials?**
- Email: support@billdesk.com
- Subject: "UAT Credentials Request for [Your Company]"

## ✅ Configuration Verification

```bash
# 1. Server starts without warnings
npm start
# Should see: ✓ BillDesk configuration loaded

# 2. Config endpoint returns true
curl http://localhost:4000/api/graduation/billdesk-config
# Should see: "configured": true

# 3. No mock mode messages
# Should NOT see: "mock": true in responses
```

## 📚 Documentation Files

| File | Use Case |
|------|----------|
| `CREDENTIALS_SETUP.md` | Complete setup guide |
| `CONFIGURATION_COMPLETE.md` | What changed in code |
| `BILLDESK_INTEGRATION_GUIDE.md` | Technical details |
| `BILLDESK_API_REFERENCE.md` | API examples |
| `QUICK_START.md` | Getting started |

## 🆘 Quick Troubleshooting

```bash
# Problem: Server won't start
npm install

# Problem: Mock mode won't turn off
1. Check .env has real values (not your_xxx_here)
2. Restart server
3. Test config endpoint

# Problem: Can't find .env
ls -la .env
# If missing: cp .env.template .env

# Problem: Configuration not loading
1. Verify .env is in root directory
2. Check for typos in variable names
3. No spaces around = in .env
4. Restart server after changes
```

## 💡 Pro Tips

1. **Keep UAT and Production separate**
   - Use different .env files
   - Never use production credentials in UAT

2. **Test before deploying**
   ```bash
   # Always verify config after changes
   curl http://localhost:4000/api/graduation/billdesk-config
   ```

3. **Monitor logs**
   ```bash
   # Watch for errors
   npm start | grep -i error
   ```

4. **Secure your credentials**
   - .env is in .gitignore ✅
   - Never commit to Git ✅
   - Use environment variables in production ✅

---

**Quick Links:**
- [Full Setup Guide](CREDENTIALS_SETUP.md)
- [Configuration Details](CONFIGURATION_COMPLETE.md)
- [API Reference](BILLDESK_API_REFERENCE.md)
