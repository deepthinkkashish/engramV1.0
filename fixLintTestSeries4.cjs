const fs = require('fs');
const path = 'services/testSeriesService.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/catch \(apiErr: any\)/g, 'catch (apiErr: unknown)');
code = code.replace(/catch \{\}/g, 'catch { /* ignore */ }');

fs.writeFileSync(path, code);
