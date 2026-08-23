const fs = require('fs');

const path = 'views/TopicDetailView.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(`            } catch (e) {
                console.warn("Failed to load topic body", e);
                if (isCurrent) {
                    if (topic.shortNotes && topic.shortNotes.length > 0) {
                        setNotes(topic.shortNotes);
                        lastSavedNotesRef.current = topic.shortNotes;
                    }`, `            } catch (e) {
                console.warn("Failed to load topic body", e);
                if (isCurrent) {
                    if (topic.hasNotes) {
                        setNotes("> **⚠️ Note Content Not Found on this Device**\\n> \\n> The full content of this note is missing on this device. This usually happens if you created the note on another device (notes are stored locally), or if your device cleared local storage.\\n> \\n> **To recover it:** If you scanned pages, tap **View Original** below and re-extract the notes. If you created this on another device, please open the app there.");
                        lastSavedNotesRef.current = "";
                        setRenderError(true);
                    } else if (topic.shortNotes && topic.shortNotes.length > 0) {
                        setNotes(topic.shortNotes);
                        lastSavedNotesRef.current = topic.shortNotes;
                    }`);

fs.writeFileSync(path, code);
