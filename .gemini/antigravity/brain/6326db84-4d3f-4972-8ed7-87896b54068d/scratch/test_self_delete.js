import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htaPath = path.join(__dirname, 'self_delete.hta');
const safeHtaPath = htaPath.replace(/\\/g, '\\\\');

const htaContent = `
<!DOCTYPE html>
<html> 
<head>
<title>Self Delete Test</title>
<hta:application id="test" border="thin" caption="yes" /> 
<script>
  window.resizeTo(400, 300);
gj 
  function dismiss() {
    window.close();
  }

  window.onbeforeunload = function() {
    try {
      var fso = new ActiveXObject("Scripting.FileSystemObject");
      fso.DeleteFile("${safeHtaPath}");
    } catch(e) {
      alert("Error deleting: " + e.message);
    }
  };
</script>
</head>
<body>
  <h2>HTA Self-Delete Test</h2>
  <p>Clicking Close or [X] should close the window and delete the file immediately.</p>
  <button onclick="dismiss()">Close</button>
</body>
</html>
`;

fs.writeFileSync(htaPath, htaContent, 'utf8');

console.log('Spawning self-deleting HTA...');
const child = spawn('mshta.exe', [htaPath], {
  detached: true,
  stdio: 'ignore',
  windowsHide: false
});
child.unref();

console.log('Spawned! Please close the HTA window now. The script will check if it was deleted in 12 seconds...');
setTimeout(() => {
  if (fs.existsSync(htaPath)) {
    console.log('FAIL: HTA file still exists!');
  } else {
    console.log('SUCCESS: HTA file was successfully deleted on close!');
  }
  process.exit(0);
}, 12000);
