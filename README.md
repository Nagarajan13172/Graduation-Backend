# 🎓 Graduation Registration Backend - BillDesk Payment Integration

A Node.js/Express backend for graduation registration with integrated BillDesk payment gateway.

## 🚀 Recent Updates (October 2025)

**Major refactoring to BillDesk integration:**
- ✅ Simplified JWT-based payment flow (JWS/HS256)
- ✅ Removed complex JWE encryption
- ✅ Added webhook handler for reliable payment confirmation
- ✅ Improved error handling and logging
- ✅ Comprehensive documentation added

## 📋 Features

- **Student Registration** - Complete registration form with file uploads
- **BillDesk Payment Integration** - Secure online payment processing
- **File Management** - Upload and download student documents
- **Admin Panel** - Manage registrations and view statistics
- **Database** - SQLite for data persistence

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQLite3
- **Payment Gateway:** BillDesk (UAT v1.2)
- **File Upload:** Multer
- **Authentication:** JWT (jsonwebtoken)

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd Graduation-Backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your BillDesk credentials

# Run database migrations
sqlite3 graduation.db < migrations/run_all.sql

# Start server
npm start
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with:

```env
PORT=8080

# BillDesk Configuration
BILLDESK_CLIENT_ID=your_client_id_here
BILLDESK_SECRET=your_hs256_secret_here
BILLDESK_MERC_ID=your_mercid_here
BILLDESK_BASE_URL=https://uat1.billdesk.com/u2
RU_PUBLIC=https://your-frontend.example.com/payment/result
```

Get your BillDesk credentials from your relationship manager.

## 📚 API Endpoints

### Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/graduation/billdesk-config` | Check BillDesk configuration |
| POST | `/api/graduation/billdesk/orders` | Create payment order |
| GET | `/api/graduation/billdesk/launch` | Launch payment gateway |
| POST | `/api/graduation/billdesk/webhook` | Handle payment webhook |
| POST | `/api/graduation/billdesk/return` | Handle browser return |
| POST | `/api/graduation/billdesk/retrieve` | Check transaction status |

### Registration Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/graduation/register` | Register student (after payment) |
| GET | `/api/graduation/all` | List all students |
| GET | `/api/graduation/check-email` | Check email availability |
| GET | `/api/graduation/file/:studentId/:fileType` | Download file |
| GET | `/api/graduation/files/:studentId` | Download all files as ZIP |

### Admin Endpoints

See `src/routes/adminRoutes.js` for admin endpoints.

## 📖 Documentation

Comprehensive documentation is available:

- **[QUICK_START.md](QUICK_START.md)** - Get started in 10 minutes
- **[BILLDESK_INTEGRATION_GUIDE.md](BILLDESK_INTEGRATION_GUIDE.md)** - Complete technical guide
- **[BILLDESK_API_REFERENCE.md](BILLDESK_API_REFERENCE.md)** - API examples & frontend integration
- **[MIGRATION_CHECKLIST.md](MIGRATION_CHECKLIST.md)** - Deployment checklist
- **[UPDATE_SUMMARY.md](UPDATE_SUMMARY.md)** - What changed in recent update
- **[migrations/README.md](migrations/README.md)** - Database migration guide

## 🎯 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Add your BillDesk credentials to .env

# 3. Run migrations
sqlite3 graduation.db < migrations/run_all.sql

# 4. Start server
npm start

# 5. Test configuration
curl http://localhost:8080/api/graduation/billdesk-config
```

See [QUICK_START.md](QUICK_START.md) for detailed instructions.

## 🔄 Payment Flow

```
User submits form → Backend creates order → Redirect to BillDesk
                                              ↓
                                        User pays on BillDesk
                                              ↓
                                        Webhook notifies backend
                                              ↓
                                        Registration completed
                                              ↓
                                        User returns to frontend
```

## 🗄️ Database Schema

### Tables

- **students** - Student registration data with payment details
- **pending_orders** - Orders awaiting payment completion
- **admins** - Admin user accounts

See [migrations/README.md](migrations/README.md) for schema details.

## 🧪 Testing

### Mock Mode (No BillDesk credentials)

```bash
# Server runs in mock mode if credentials not configured
npm start

# Test endpoints return mock data
curl http://localhost:8080/api/graduation/billdesk-config
```

### UAT Testing (With BillDesk credentials)

```bash
# Configure .env with UAT credentials
# Use BillDesk test cards/accounts
# Monitor webhook callbacks
```

## 📁 Project Structure

```
Graduation-Backend/
├── server/
│   └── billdesk.js              # BillDesk utilities
├── src/
│   ├── controllers/
│   │   ├── graduationController.js
│   │   └── adminController.js
│   ├── routes/
│   │   ├── graduationRoutes.js
│   │   └── adminRoutes.js
│   ├── db.js
│   ├── initDb.js
│   └── Uploads/                 # Student documents
├── migrations/                  # Database migrations
├── graduation.db                # SQLite database
├── server.js                    # Main entry point
└── package.json
```

## 🔐 Security

- HTTPS required in production
- JWT-based authentication for admin
- Webhook IP whitelisting
- File upload validation
- SQL injection prevention (parameterized queries)
- XSS protection (Content-Security-Policy headers)

## 🚀 Deployment

### Prerequisites

1. BillDesk production credentials
2. SSL certificate for HTTPS
3. Public URL for webhook
4. Node.js 14+ on server

### Steps

1. Update `.env` with production values
2. Run database migrations
3. Configure BillDesk webhook URL
4. Start server with PM2 or similar
5. Monitor logs for errors

See [MIGRATION_CHECKLIST.md](MIGRATION_CHECKLIST.md) for detailed deployment guide.

## 📊 Monitoring

Key metrics to monitor:

- Payment success rate
- Webhook delivery rate
- Server uptime
- Database size
- File storage usage

## 🐛 Troubleshooting

### Common Issues

**Server won't start:**
- Check Node.js version (14+ required)
- Verify all dependencies installed
- Check port 8080 is available

**Mock mode when credentials are set:**
- Check for `your_` placeholder values in `.env`
- Verify no extra spaces in environment variables

**Webhook not receiving calls:**
- Ensure webhook URL is public
- Configure URL in BillDesk portal
- Check firewall/IP whitelist

See documentation files for more troubleshooting tips.

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## 📝 License

[Add your license here]

## 📞 Support

- **BillDesk Issues:** Contact your BillDesk relationship manager
- **Technical Questions:** Refer to documentation
- **Bug Reports:** Create an issue in the repository

## 🎓 Credits

Developed for Periyar University graduation registration system.

---

**Quick Links:**
- [Quick Start Guide](QUICK_START.md)
- [API Documentation](BILLDESK_API_REFERENCE.md)
- [Integration Guide](BILLDESK_INTEGRATION_GUIDE.md)
- [Migration Checklist](MIGRATION_CHECKLIST.md)

**Last Updated:** October 23, 2025
