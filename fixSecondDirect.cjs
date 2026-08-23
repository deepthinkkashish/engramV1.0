const fs = require('fs');
const path = 'services/testSeriesService.ts';
let code = fs.readFileSync(path, 'utf8');

// The second block has `typeof prompt !== 'undefined' ? prompt : chunkPrompt`
// But we only want to fix it inside generateExamQuiz
const firstPart = code.substring(0, code.indexOf('export const generateExamQuiz ='));
let secondPart = code.substring(code.indexOf('export const generateExamQuiz ='));

secondPart = secondPart.replace(/typeof prompt !== 'undefined' \? prompt : chunkPrompt/g, 'chunkPrompt');
secondPart = secondPart.replace(/typeof prompt !== 'undefined' \? 0\.2 : 0\.7/g, '0.7');
secondPart = secondPart.replace(/responseSchema \|\| \{/g, '{');

fs.writeFileSync(path, firstPart + secondPart);
