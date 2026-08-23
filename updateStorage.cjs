const fs = require('fs');
const path = 'services/storage.ts';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('export const getTopicSourcePageCountFromIDB')) {
    code += `\nexport const getTopicSourcePageCountFromIDB = async (topicId: string): Promise<number> => {
    let count = 0;
    while (true) {
        const base64 = await getImageFromIDB(\`source_\${topicId}_\${count}\`);
        if (!base64) break;
        count++;
    }
    return count;
};\n`;
    fs.writeFileSync(path, code);
}
