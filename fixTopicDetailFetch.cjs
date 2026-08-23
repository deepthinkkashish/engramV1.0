const fs = require('fs');
const path = 'views/TopicDetailView.tsx';
let code = fs.readFileSync(path, 'utf8');

const replacement = `
        import('../services/storage').then(({ getTopicBodyFromIDB }) => {
            getTopicBodyFromIDB(userId, topic.id).then(idbNotes => {
                if (isCurrent && isMounted.current) {
                    if (idbNotes && idbNotes.length > 0) {
                        setNotes(idbNotes);
                        lastSavedNotesRef.current = idbNotes;
                    } else if (topic.shortNotes) {
                        setNotes(topic.shortNotes);
                        lastSavedNotesRef.current = topic.shortNotes;
                    } else {
                        setNotes('');
                        lastSavedNotesRef.current = '';
                    }
                    setIsLoadingBody(false);
                }
            }).catch(() => {
                if (isCurrent && isMounted.current) {
                    setNotes(topic.shortNotes || '');
                    lastSavedNotesRef.current = topic.shortNotes || '';
                    setIsLoadingBody(false);
                }
            });
        });
`;

code = code.replace(/const loadContent = \(\) => \{[\s\S]*?\};\s*loadContent\(\);/, replacement.trim());
fs.writeFileSync(path, code);
