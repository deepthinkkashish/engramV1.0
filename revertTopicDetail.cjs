const fs = require('fs');

const path = 'views/TopicDetailView.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/const loadContent = async \(\) => \{[\s\S]*?loadContent\(\);/m, `const loadContent = () => {
            if (isCurrent) {
                const content = topic.shortNotes || "";
                setNotes(content);
                lastSavedNotesRef.current = content;
                setIsLoadingBody(false);
            }
        };

        loadContent();`);

code = code.replace(/const handleSave = useCallback\(async \(currentNotes: string\) => \{[\s\S]*?try \{[\s\S]*?await saveTopicBodyToIDB\(userId, topic\.id, currentNotes\);[\s\S]*?lastSavedNotesRef\.current = currentNotes;[\s\S]*?const updatedTopic = \{[\s\S]*?\.\.\.topic,[\s\S]*?\/\/ Only store a small preview or clear it, rely on IDB for full text[\s\S]*?shortNotes: currentNotes\.substring\(0, 100\),[\s\S]*?hasNotes: currentNotes\.trim\(\)\.length > 0[\s\S]*?\};[\s\S]*?onUpdateTopic\(updatedTopic\);[\s\S]*?if \(isMounted\.current\) setTimeout\(\(\) => setSaveStatus\('saved'\), 800\);[\s\S]*?return true;[\s\S]*?\} catch \(e\) \{[\s\S]*?console\.error\("Error updating notes:", e\);[\s\S]*?if \(isMounted\.current\) \{[\s\S]*?setSaveStatus\('unsaved'\);[\s\S]*?\}[\s\S]*?return false;[\s\S]*?\}[\s\S]*?\}, \[topic, onUpdateTopic, userId\]\);/m, `const handleSave = useCallback(async (currentNotes: string) => {
        if (!topic) return false;
        setSaveStatus('saving');
        
        lastSavedNotesRef.current = currentNotes;
        
        const updatedTopic = { 
            ...topic, 
            shortNotes: currentNotes, 
            hasNotes: currentNotes.trim().length > 0
        };
        onUpdateTopic(updatedTopic);
        
        // Optionally save to IDB just as a backup, but source of truth is shortNotes
        saveTopicBodyToIDB(userId, topic.id, currentNotes).catch(console.error);
        
        if (isMounted.current) setTimeout(() => setSaveStatus('saved'), 800);
        return true;
    }, [topic, onUpdateTopic, userId]);`);

fs.writeFileSync(path, code);
