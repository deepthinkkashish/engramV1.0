const fs = require('fs');

function replaceInFile(path, regex, replacement) {
    if (!fs.existsSync(path)) return;
    let code = fs.readFileSync(path, 'utf8');
    code = code.replace(regex, replacement);
    fs.writeFileSync(path, code);
}

// Restore testSeriesService.ts default to gemini-3.5-flash
replaceInFile('services/testSeriesService.ts', /let modelName = 'gemini-3\.6-flash';/g, "let modelName = 'gemini-3.5-flash';");

