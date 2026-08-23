const fs = require('fs');
const path = 'views/TopicDetailView.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/try \{\n            await Promise\.all\(\[adPromise, startProcessing\(userId, topic\.id, files\)\]\);\n        \} catch \(err\) \{/m, `try {
            const [_, newContent] = await Promise.all([adPromise, startProcessing(userId, topic.id, files)]);
            if (newContent) {
                await handleSave(newContent);
                setNotes(newContent); // Update local UI state explicitly
            }
        } catch (err) {`);

fs.writeFileSync(path, code);
