const fs = require('fs');
const path = 'views/PodcastView.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/let body = await getTopicBodyFromIDB\(userId, topic\.id\);[\s\S]*?if \(!body \|\| body\.trim\(\)\.length === 0\) \{[\s\S]*?\/\/ If not in IDB but hasNotes is true, we should probably warn or skip, but for now fallback to shortNotes[\s\S]*?body = topic\.shortNotes \|\| '';[\s\S]*?\}/m, `let body = topic.shortNotes || '';`);

fs.writeFileSync(path, code);
