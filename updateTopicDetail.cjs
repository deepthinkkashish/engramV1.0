const fs = require('fs');

const path = 'views/TopicDetailView.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(`                    if (body) {
                        setNotes(body);
                        lastSavedNotesRef.current = body;
                    } else if (topic.shortNotes && topic.shortNotes.length > 0) {
                        setNotes(topic.shortNotes);
                        lastSavedNotesRef.current = topic.shortNotes;
                        // Migrate legacy notes to IDB
                        saveTopicBodyToIDB(userId, topic.id, topic.shortNotes).catch(console.error);
                    } else {`, `                    if (body) {
                        setNotes(body);
                        lastSavedNotesRef.current = body;
                    } else if (topic.hasNotes) {
                        // IDB wiped or on another device, but we know full notes exist somewhere.
                        // DO NOT fall back to shortNotes (100 char limit), as that permanently overwrites the note.
                        setNotes("> **⚠️ Note Content Not Found on this Device**\\n> \\n> The full content of this note is missing on this device. This usually happens if you created the note on another device (notes are stored locally), or if your device cleared local storage.\\n> \\n> **To recover it:** If you scanned pages, tap **View Original** below and re-extract the notes. If you created this on another device, please open the app there.");
                        lastSavedNotesRef.current = "";
                        setRenderError(true);
                    } else if (topic.shortNotes && topic.shortNotes.length > 0) {
                        setNotes(topic.shortNotes);
                        lastSavedNotesRef.current = topic.shortNotes;
                        // Migrate legacy notes to IDB
                        saveTopicBodyToIDB(userId, topic.id, topic.shortNotes).catch(console.error);
                    } else {`);

fs.writeFileSync(path, code);
