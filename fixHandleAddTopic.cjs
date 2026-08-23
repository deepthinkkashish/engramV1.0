const fs = require('fs');
const path = 'hooks/useStudyData.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/saveTopicBodyToIDB\(userId, newTopic\.id, newTopic\.shortNotes \|\| ""\);/g, `// IDB logic abandoned, relies on shortNotes`);

fs.writeFileSync(path, code);
