const fs = require('fs');

function replaceInFile(path, regex, replacement) {
    if (!fs.existsSync(path)) return;
    let code = fs.readFileSync(path, 'utf8');
    code = code.replace(regex, replacement);
    fs.writeFileSync(path, code);
}

replaceInFile('services/gemini.ts', /gemini-2\.5-flash/g, 'gemini-1.5-flash');
replaceInFile('services/testSeriesService.ts', /gemini-2\.5-flash/g, 'gemini-1.5-flash');

