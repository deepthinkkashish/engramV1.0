const fs = require('fs');
const path = 'services/testSeriesService.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/q: any/g, 'q: TestSeriesQuestion | any');
code = code.replace(/catch\(e: any\)/g, 'catch(e: unknown)');
code = code.replace(/e\.message \|\| e/g, '(e as Error).message || e');

fs.writeFileSync(path, code);
