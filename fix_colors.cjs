const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', (filePath) => {
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Text colors
    content = content.replace(/'#eef2ee'/gi, "'var(--t1)'");
    content = content.replace(/"#eef2ee"/gi, '"var(--t1)"');
    content = content.replace(/'#c8d4c8'/gi, "'var(--t2)'");
    content = content.replace(/"#c8d4c8"/gi, '"var(--t2)"');
    content = content.replace(/'#8a9e8a'/gi, "'var(--t3)'");
    content = content.replace(/"#8a9e8a"/gi, '"var(--t3)"');
    content = content.replace(/'#4e614e'/gi, "'var(--t4)'");
    content = content.replace(/"#4e614e"/gi, '"var(--t4)"');
    
    // Primary colors
    content = content.replace(/'#09cd83'/gi, "'var(--p)'");
    content = content.replace(/"#09cd83"/gi, '"var(--p)"');
    content = content.replace(/'#3df5a0'/gi, "'var(--p-lt)'");
    content = content.replace(/"#3df5a0"/gi, '"var(--p-lt)"');
    content = content.replace(/'#07a468'/gi, "'var(--p-dk)'");
    content = content.replace(/"#07a468"/gi, '"var(--p-dk)"');

    // Deep backgrounds
    content = content.replace(/'#002a18'/gi, "'var(--bg-deep)'");
    content = content.replace(/"#002a18"/gi, '"var(--bg-deep)"');

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log('Updated', filePath);
    }
  }
});
