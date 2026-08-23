const fs = require('fs');
const path = 'views/PodcastView.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/const handleDownload = async \(topic: Topic, isSubjectRecap = false, e: React\.MouseEvent\) => \{[\s\S]*?const context = isSubjectRecap[\s\S]*?\? body[\s\S]*?: \`Topic: \\\$\\{topic\.topicName\\}\\n\\\$\\{body\\}\`;/m, `const handleDownload = async (topic: Topic, isSubjectRecap = false, e: React.MouseEvent) => {
        e.stopPropagation();
        if (state.downloadingIds.includes(topic.id)) return;

        const body = topic.shortNotes || '';
        const context = isSubjectRecap 
            ? body 
            : \`Topic: \${topic.topicName}\\n\${body}\`;`);

fs.writeFileSync(path, code);
