const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building frontend...');
execSync('npm --prefix frontend install && npm --prefix frontend run build', { stdio: 'inherit' });

console.log('Syncing dist to public directory for Vercel...');
const src = path.join(__dirname, '..', 'frontend', 'dist');
const dest = path.join(__dirname, '..', 'public');

if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}
fs.cpSync(src, dest, { recursive: true });
console.log('Build and public sync complete.');
