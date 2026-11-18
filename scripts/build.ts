import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const pagesDir = resolve(root, 'src', 'pages');
const assetsDir = resolve(root, 'src', 'assets');
const distDir = resolve(root, 'dist');

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

cpSync(pagesDir, distDir, { recursive: true });
cpSync(assetsDir, resolve(distDir, 'assets'), { recursive: true });

console.log('Built static site into dist/');
