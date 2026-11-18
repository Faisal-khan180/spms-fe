require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const frontendPath = __dirname;

app.get('/config.json', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const apiUrl = new URL(
    process.env.API_BASE_URL || `http://${req.hostname}:5000/api`
  );
  if (['localhost', '127.0.0.1', '::1'].includes(apiUrl.hostname)) {
    apiUrl.hostname = req.hostname;
  }
  res.json({
    apiBaseUrl: apiUrl.toString().replace(/\/$/, '')
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