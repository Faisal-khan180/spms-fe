require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const frontendPath = __dirname;

app.get('/config.json', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000/api'
  });
});

app.use((req, res, next) => {
  if (/\/(?:server\.js|package(?:-lock)?\.json|\.env(?:\..*)?)$/i.test(req.path)) {
    return res.sendStatus(404);
  }
  return next();
});

app.use(express.static(frontendPath, { dotfiles: 'deny' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SPMS frontend listening on port ${PORT}`);
});