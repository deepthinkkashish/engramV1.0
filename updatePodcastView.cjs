const fs = require('fs');

const path = 'views/PodcastView.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(`            let body = topic.shortNotes;
            if (!body || body.trim().length === 0) {
                body = await getTopicBodyFromIDB(userId, topic.id) || '';
            }`, `            let body = await getTopicBodyFromIDB(userId, topic.id);
            if (!body || body.trim().length === 0) {
                // If not in IDB but hasNotes is true, we should probably warn or skip, but for now fallback to shortNotes
                body = topic.shortNotes || '';
            }`);

fs.writeFileSync(path, code);
