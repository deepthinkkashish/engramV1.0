const fs = require('fs');
const path = 'services/gemini.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/catch \(e: any\)/g, 'catch (e: unknown)');
code = code.replace(/\(part as any\)/g, '(part as Record<string, unknown>)');
code = code.replace(/e\.status/g, '(e as any)?.status');

fs.writeFileSync(path, code);
