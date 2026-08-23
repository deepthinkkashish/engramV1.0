const fs = require('fs');
const path = 'services/gemini.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/if \(e && typeof e === 'object' && e\.name === 'UsageLimitError'\) throw e; \/\/ Don't retry quota errors/g, 
`// if (e && typeof e === 'object' && e.name === 'UsageLimitError') throw e; // Let the fallback logic handle it`);

fs.writeFileSync(path, code);
