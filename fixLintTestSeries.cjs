const fs = require('fs');
const path = 'services/testSeriesService.ts';
let code = fs.readFileSync(path, 'utf8');

// fix jsonString prefer-const
code = code.replace(/let jsonString = textWithoutThink/g, 'const jsonString = textWithoutThink');

// fix _e unused
code = code.replace(/catch\(_e\) \{/g, 'catch {');

// fix e unused
code = code.replace(/catch\(e\) \{\}/g, 'catch {}');

// fix isCustom unused
code = code.replace(/const \{ client, isCustom \} = getAiClient\(\);/g, 'const { client } = getAiClient();');

fs.writeFileSync(path, code);
