const fs = require('fs');

const path = 'hooks/usePodcast.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(`            let topicNotes = topic.shortNotes;
            if (!isRecap && (!topicNotes || topicNotes.trim().length === 0)) {
                topicNotes = await getTopicBodyFromIDB(userId, topic.id) || '';
            }`, `            let topicNotes = await getTopicBodyFromIDB(userId, topic.id);
            if (!isRecap && (!topicNotes || topicNotes.trim().length === 0)) {
                topicNotes = topic.shortNotes || '';
            }`);

fs.writeFileSync(path, code);
