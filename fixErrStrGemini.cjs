const fs = require('fs');
const path = 'services/gemini.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/const errStr = \(e\.message \|\| ""\)\.toLowerCase\(\);/g, 
`const errStr = (e?.message || (e?.error?.message) || JSON.stringify(e) || String(e) || "").toLowerCase();`);

fs.writeFileSync(path, code);
