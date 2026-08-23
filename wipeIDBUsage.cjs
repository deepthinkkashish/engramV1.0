const fs = require('fs');

function replaceInFile(path, regex, replacement) {
    if (!fs.existsSync(path)) return;
    let code = fs.readFileSync(path, 'utf8');
    code = code.replace(regex, replacement);
    fs.writeFileSync(path, code);
}

// 1. HomeView.tsx
replaceInFile('views/HomeView.tsx', /notesContent = await getTopicBodyFromIDB\(userId, t\.id\) \|\| "";/g, 'notesContent = t.shortNotes || "";');

// 2. AppRouter.tsx
replaceInFile('components/AppRouter.tsx', /const note = await getTopicBodyFromIDB\(props\.userId, id\);/g, 'const note = topicsMap.get(id)?.shortNotes || "";');

// 3. PodcastView.tsx
replaceInFile('views/PodcastView.tsx', /let body = await getTopicBodyFromIDB\(userId, topic\.id\);/g, 'let body = topic.shortNotes || "";');

// 4. usePodcast.ts
replaceInFile('hooks/usePodcast.ts', /const body = await getTopicBodyFromIDB\(userId, topic\.id\) \|\| '';/g, 'const body = topic.shortNotes || "";');

