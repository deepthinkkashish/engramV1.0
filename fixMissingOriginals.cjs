const fs = require('fs');
const path = 'views/TopicDetailView.tsx';
let code = fs.readFileSync(path, 'utf8');

const useEffectHook = `
    // Recovery mechanism for lost sourcePageCount
    useEffect(() => {
        if (!topic) return;
        if (!topic.sourcePageCount || topic.sourcePageCount === 0) {
            import('../services/storage').then(({ getTopicSourcePageCountFromIDB }) => {
                getTopicSourcePageCountFromIDB(topic.id).then(count => {
                    if (count > 0 && isMounted.current) {
                        onUpdateTopic({ ...topic, sourcePageCount: count });
                    }
                }).catch(() => {});
            }).catch(() => {});
        }
    }, [topic?.id, topic?.sourcePageCount, onUpdateTopic]);
`;

code = code.replace(/useEffect\(\(\) => \{\s*notesRef\.current = notes;\s*\}, \[notes\]\);/, 
    "useEffect(() => { notesRef.current = notes; }, [notes]);\n" + useEffectHook);

fs.writeFileSync(path, code);
