const fs = require('fs');

function replaceInFile(path, regex, replacement) {
    if (!fs.existsSync(path)) return;
    let code = fs.readFileSync(path, 'utf8');
    code = code.replace(regex, replacement);
    fs.writeFileSync(path, code);
}

replaceInFile('services/gemini.ts', /"gemini-3\.6-flash-preview-tts"/g, '"gemini-3.1-flash-tts-preview"');
