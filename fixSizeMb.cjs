const fs = require('fs');
const path = 'context/ProcessingContext.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/const sizeBytes = files.length > 0 \? Array.from\(files\).reduce\(\(acc, f\) => acc \+ f.size, 0\) : 0;\n            const sizeMb = sizeBytes \/ \(1024 \* 1024\);/m, `// sizeMb is declared earlier`);

fs.writeFileSync(path, code);
