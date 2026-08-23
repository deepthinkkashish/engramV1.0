const fs = require('fs');
const path = 'hooks/useStudyData.ts';
let code = fs.readFileSync(path, 'utf8');

const oldCode = `    const handleDeleteSubject = useCallback((id: string) => {
        setUserSubjects(prev => prev.filter(s => s.id !== id));
    }, []);`;

const newCode = `    const handleDeleteSubject = useCallback(async (id: string) => {
        setStudyLog(prevLog => {
            const topicsToDelete = prevLog.filter(t => t.subjectId === id);
            
            // Clean up IDB asynchronously
            topicsToDelete.forEach(t => {
                deleteTopicBodyFromIDB(userId, t.id).catch(e => console.error("Failed to delete topic data from IDB", e));
                deleteAudioFromIDB(t.id).catch(e => console.error("Failed to delete topic audio from IDB", e));
            });
            
            return prevLog.filter(t => t.subjectId !== id);
        });

        setUserSubjects(prev => prev.filter(s => s.id !== id));
    }, [userId]);`;

code = code.replace(oldCode, newCode);
fs.writeFileSync(path, code);
