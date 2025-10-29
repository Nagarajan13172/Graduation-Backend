// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const graduationRoutes = require('./src/routes/graduationRoutes');
const adminRoutes = require('./src/routes/adminRoutes'); 

const app = express();

app.use(cors());
// Handle BillDesk JOSE responses (application/jose, text/plain)
app.use(express.text({ type: ['application/jose', 'text/plain'], limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/', (_req, res) => res.json({ ok: true, service: 'Graduation Register API' }));

app.use('/api/graduation', graduationRoutes);
app.use('/api/admin', adminRoutes); 

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Graduation Register API running on http://localhost:${PORT}`));
