// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const graduationRoutes = require('./src/routes/graduationRoutes');
const adminRoutes = require('./src/routes/adminRoutes'); 

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => res.json({ ok: true, service: 'Graduation Register API' }));

app.use('/api/graduation', graduationRoutes);
app.use('/api/admin', adminRoutes); 

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Graduation Register API running on http://localhost:${PORT}`));
