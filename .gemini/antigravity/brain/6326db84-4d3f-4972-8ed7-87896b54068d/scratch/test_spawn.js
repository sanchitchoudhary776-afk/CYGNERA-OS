import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htaContent = `
<!DOCTYPE html>
<html>
<head>
<title>Test Popup</title>
<hta:application id="test" border="thin" caption="yes" />
<script>
  window.resizeTo(400, 300);
  function closeMe() {
    window.close();
  }
</script>
</head>
<body>
  <h2>Test HTA Popup</h2>
  <button onclick="closeMe()">Close</button>
</body>
</html>
`;

const htaPath = path.join(__dirname, 'test.hta');
fs.writeFileSync(htaPath, htaContent, 'utf8');

console.log('Spawning mshta...');
const child = spawn('mshta.exe', [htaPath], {
  detached: true,
  stdio: 'ignore',
  windowsHide: false
});
child.unref();

console.log('Spawned! Cleaning up HTA file in 10 seconds...');
setTimeout(() => {
  try {
    fs.unlinkSync(htaPath);
    console.log('HTA file cleaned up!');
  } catch (e) {
    console.error('Cleanup error:', e);
  }
  process.exit(0);
}, 10000);
