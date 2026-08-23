const fs = require('fs');
let code = fs.readFileSync('views/PodcastView.tsx', 'utf8');
code = code.replace(/\\\'/g, "'");
fs.writeFileSync('views/PodcastView.tsx', code);
