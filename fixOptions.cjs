const fs = require('fs');

function replaceInFile(path, regex, replacement) {
    if (!fs.existsSync(path)) return;
    let code = fs.readFileSync(path, 'utf8');
    code = code.replace(regex, replacement);
    fs.writeFileSync(path, code);
}

replaceInFile('services/gemini.ts', /\{ id: 'gemini-3\.6-flash', label: 'Gemini 3\.5 Flash \(Latest & Fastest\)' \},/g, "{ id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (Latest & Fastest)' },");
replaceInFile('services/gemini.ts', /\{ id: 'gemini-3\.6-flash-lite', label: 'Gemini 3\.5 Flash Lite \(Ultra-fast\)' \},/g, "{ id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite (Ultra-fast)' },");
