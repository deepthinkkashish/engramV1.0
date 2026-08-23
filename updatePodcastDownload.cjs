const fs = require('fs');

const path = 'views/PodcastView.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(`    const handleDownload = async (topic: Topic, isSubjectRecap = false, e: React.MouseEvent) => {
        e.stopPropagation();
        if (state.downloadingIds.includes(topic.id)) return;

        const context = isSubjectRecap 
            ? topic.shortNotes 
            : \`Topic: \${topic.topicName}\\n\${topic.shortNotes}\`;`, `    const handleDownload = async (topic: Topic, isSubjectRecap = false, e: React.MouseEvent) => {
        e.stopPropagation();
        if (state.downloadingIds.includes(topic.id)) return;

        let body = await getTopicBodyFromIDB(userId, topic.id);
        if (!body || body.trim().length === 0) {
            body = topic.shortNotes || '';
        }

        const context = isSubjectRecap 
            ? body 
            : \`Topic: \${topic.topicName}\\n\${body}\`;`);

fs.writeFileSync(path, code);
