const fs = require('fs');
const path = 'context/ProcessingContext.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/await saveImageToIDB\(topicId, attachments\[i\]\.base64\.replace\(\/\^data:image\\\\\/jpeg;base64,\/\, ''\), originalCount\);/g, 
    "await saveImageToIDB(`source_${topicId}_${originalCount}`, attachments[i].base64.replace(/^data:image\\/jpeg;base64,/, ''));");

fs.writeFileSync(path, code);
