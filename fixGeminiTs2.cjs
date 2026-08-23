const fs = require('fs');
const path = 'services/gemini.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/\/\/ Rate limit, wait\s*await new Promise\(r => setTimeout\(r, 2000 \* \(i \+ 1\)\)\);\s*continue;\s*\}/m, 
`// Fallback retry delay
                await new Promise(r => setTimeout(r, 2000 * (i + 1)));`);

fs.writeFileSync(path, code);
