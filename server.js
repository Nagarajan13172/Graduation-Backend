// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const graduationRoutes = require('./src/routes/graduationRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');

const app = express();

app.use(cors());

// Custom middleware to handle BillDesk callback format
app.use((req, res, next) => {
  if (req.headers['content-type'] === 'application/x-www-form-urlencoded' && req.body && req.body.transaction_response) {
    console.log('Received BillDesk callback with transaction_response');
    // Keep the raw transaction_response as is
    next();
  } else {
    next();
  }
});

// Handle different content types
app.use(express.text({ type: ['application/jose', 'text/plain'], limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/', (_req, res) => res.json({ ok: true, service: 'Graduation Register API' }));

app.use('/api/graduation', graduationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Graduation Register API running on http://localhost:${PORT}`));
