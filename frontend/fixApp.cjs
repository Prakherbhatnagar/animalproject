const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('c:/Users/prakh/OneDrive/Desktop/animal project/frontend/App.tsx');
let lines = fs.readFileSync(targetFile, 'utf8').split('\n');

lines.splice(1270, 1325 - 1270 + 1, '    </div>', '  );', '}');

fs.writeFileSync(targetFile, lines.join('\n'));
console.log('Successfully fixed App.tsx corruption.');
