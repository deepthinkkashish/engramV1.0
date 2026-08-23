const fs = require('fs');
const path = 'services/testSeriesService.ts';
let code = fs.readFileSync(path, 'utf8');

// We need to replace all instances of `const errStr = (apiErr.message || "").toLowerCase();`
// with a robust version.
code = code.replace(/const errStr = \(apiErr\.message \|\| ""\)\.toLowerCase\(\);/g, 
`const errStr = (apiErr?.message || (apiErr?.error?.message) || JSON.stringify(apiErr) || String(apiErr) || "").toLowerCase();`);

fs.writeFileSync(path, code);
