// Runs the Expo dev server with a public tunnel and prints a scannable QR to
// stdout — so when this runs on a cloud host (e.g. Railway), the QR shows up in
// the deploy logs/console and you can scan it straight into Expo Go.
//
// Start command (Railway): npm run cloud:dev
import { spawn } from 'node:child_process';
import QRCode from 'qrcode';

const expo = spawn('npx', ['expo', 'start', '--tunnel'], {
  stdio: ['ignore', 'inherit', 'inherit'],
  shell: true,
  env: { ...process.env, CI: '1' },
});

async function waitForTunnelUrl() {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch('http://127.0.0.1:4040/api/tunnels');
      const j = await res.json();
      const t = (j.tunnels ?? []).find((x) => String(x.public_url).startsWith('https'));
      if (t) return t.public_url.replace(/^https/, 'exp');
    } catch { /* tunnel not up yet */ }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

const url = await waitForTunnelUrl();
if (url) {
  const qr = await QRCode.toString(url, { type: 'terminal', small: true });
  console.log('\n==================  SCAN IN EXPO GO  ==================');
  console.log(`  ${url}`);
  console.log(qr);
  console.log('======================================================\n');
} else {
  console.log('\n[cloud-dev] Could not detect the tunnel URL — check the Expo logs above.\n');
}

expo.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGTERM', () => expo.kill('SIGTERM'));
process.on('SIGINT', () => expo.kill('SIGINT'));
