const fs = require('fs');
const path = 'services/testSeriesService.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/type: "ARRAY"/g, "type: Type.ARRAY");
code = code.replace(/type: "OBJECT"/g, "type: Type.OBJECT");
code = code.replace(/type: "STRING"/g, "type: Type.STRING");

fs.writeFileSync(path, code);
