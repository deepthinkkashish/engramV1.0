const fs = require('fs');
const path = 'services/testSeriesService.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/q: TestSeriesQuestion \| any/g, 'q: TestSeriesQuestion | Record<string, unknown>');
fs.writeFileSync(path, code);
