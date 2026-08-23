const fs = require('fs');
const path = 'hooks/useStudyData.ts';
let code = fs.readFileSync(path, 'utf8');

const oldCode = `                finalTopics = finalTopics.map(topic => {
                    let subjectId = topic.subjectId;
                    let subjectName = topic.subject || 'Uncategorized';
                    
                    if (idMapping.has(subjectId)) {
                        subjectId = idMapping.get(subjectId)!;
                        subjectName = idToName.get(subjectId) || subjectName;
                    } else if (!subjectId) {
                        missingIdCount++;
                        // Topic is missing subjectId, try to find by name or create
                        const normName = subjectName.trim().toLowerCase();
                        if (nameMap.has(normName)) {
                            const master = nameMap.get(normName)!;
                            subjectId = master.id;
                            subjectName = master.name;
                        } else {
                            // Create new subject
                            subjectId = \`sub-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
                            const newSub = { id: subjectId, name: subjectName };
                            nameMap.set(normName, newSub);
                            uniqueSubjects.push(newSub);
                            idToName.set(subjectId, subjectName);
                        }
                    }
                    
                    return { ...topic, subjectId, subject: subjectName };
                });`;

const newCode = `                const validTopics: Topic[] = [];
                const orphanedTopics: Topic[] = [];

                finalTopics.forEach(topic => {
                    let subjectId = topic.subjectId;
                    let subjectName = topic.subject || 'Uncategorized';
                    
                    if (subjectId && !idMapping.has(subjectId) && !idToName.has(subjectId)) {
                        orphanedTopics.push(topic);
                        return;
                    }
                    
                    if (idMapping.has(subjectId)) {
                        subjectId = idMapping.get(subjectId)!;
                        subjectName = idToName.get(subjectId) || subjectName;
                    } else if (!subjectId) {
                        missingIdCount++;
                        // Topic is missing subjectId, try to find by name or create
                        const normName = subjectName.trim().toLowerCase();
                        if (nameMap.has(normName)) {
                            const master = nameMap.get(normName)!;
                            subjectId = master.id;
                            subjectName = master.name;
                        } else {
                            // Create new subject
                            subjectId = \`sub-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
                            const newSub = { id: subjectId, name: subjectName };
                            nameMap.set(normName, newSub);
                            uniqueSubjects.push(newSub);
                            idToName.set(subjectId, subjectName);
                        }
                    }
                    
                    validTopics.push({ ...topic, subjectId, subject: subjectName });
                });
                
                finalTopics = validTopics;

                if (orphanedTopics.length > 0) {
                    console.log(\`%c [Boot] Found \${orphanedTopics.length} orphaned topics. Cleaning up...\`, 'color: orange');
                    orphanedTopics.forEach(t => {
                        deleteTopicBodyFromIDB(userId, t.id).catch(() => {});
                        deleteAudioFromIDB(t.id).catch(() => {});
                    });
                }`;

code = code.replace(oldCode, newCode);
fs.writeFileSync(path, code);
