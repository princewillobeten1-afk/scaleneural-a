import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const distDir = resolve(process.cwd(), 'dist');

app.use(express.static(distDir, { extensions: ['html'] }));

app.get('/about', (_req, res) => {
  res.sendFile(resolve(distDir, 'about', 'index.html'));
});

app.get('/sectors', (_req, res) => {
  res.sendFile(resolve(distDir, 'sectors', 'index.html'));
});

app.use((_req, res) => {
  const indexFile = resolve(distDir, 'index.html');
  if (existsSync(indexFile)) {
    res.sendFile(indexFile);
    return;
  }
  res.status(404).send('Not found');
});

app.listen(PORT, HOST, () => {
  console.log(`ScaleNeural AI server running at http://${HOST}:${PORT}`);
});
