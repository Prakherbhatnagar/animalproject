const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('c:/Users/prakh/OneDrive/Desktop/animal project/frontend/App.tsx');
let lines = fs.readFileSync(targetFile, 'utf8').split('\n');

// We know the corruption is exactly between lines 1271 and 1325 (1-based index).
// In 0-based index, this is lines 1270 to 1324.

lines.splice(1270, 1325 - 1270 + 1, '    </div>', '  );', '}');

fs.writeFileSync(targetFile, lines.join('\n'));
console.log('Successfully fixed App.tsx corruption.');
