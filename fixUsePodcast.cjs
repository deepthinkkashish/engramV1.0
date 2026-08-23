const fs = require('fs');
const path = 'hooks/usePodcast.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/let topicNotes = await getTopicBodyFromIDB\(userId, topic\.id\);[\s\S]*?if \(!isRecap && \(!topicNotes \|\| topicNotes\.trim\(\)\.length === 0\)\) \{[\s\S]*?topicNotes = topic\.shortNotes \|\| '';[\s\S]*?\}/m, `let topicNotes = topic.shortNotes || '';`);

fs.writeFileSync(path, code);
