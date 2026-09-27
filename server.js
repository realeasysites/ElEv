'use strict';

require('dotenv').config();
const path = require('path');
const express = require('express');

const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));

app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use('/api/admin', adminRoutes.api);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes.pages);

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '7d', index: 'index.html' }));

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

app.listen(PORT, () => console.log(`Elevated Events site running on http://localhost:${PORT}`));
