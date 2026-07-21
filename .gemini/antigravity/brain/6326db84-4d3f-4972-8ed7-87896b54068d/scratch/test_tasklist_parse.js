import { exec } from 'child_process';
import { promisify } from 'util';
const execPromise = promisify(exec);

async function test() {
  console.time('tasklist_run');
  const { stdout } = await execPromise('tasklist /V /FO CSV', { windowsHide: true });
  console.timeEnd('tasklist_run');

  const lines = stdout.split('\n');
  const processes = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line safely
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);

    if (parts.length >= 9) {
      const imageName = parts[0];
      const pid = parseInt(parts[1], 10);
      const windowTitle = parts[8];
      processes.push({
        ProcessName: imageName.replace(/\.exe$/i, ''),
        Id: pid,
        MainWindowTitle: windowTitle === 'N/A' ? '' : windowTitle
      });
    }
  }

  console.log(`Parsed ${processes.length} processes.`);
  console.log('Sample processes:', processes.slice(0, 10));
}

test();
