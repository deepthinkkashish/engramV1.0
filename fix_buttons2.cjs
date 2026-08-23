const fs = require('fs');
let code = fs.readFileSync('views/PodcastView.tsx', 'utf8');

const regex = /\{voice === 'Standard' \? 'Puck & Aoede' : 'Fenrir & Kore'\}\n\s*<\/button>\n\s*<button \n\s*onClick=\{\(e\) => \{ e\.stopPropagation\(\); playPreview\(voice as 'Standard' \| 'Deep'\); \}\}\n\s*disabled=\{previewLoading === voice\}\n\s*className=\{\`absolute right-3 top-1\/2 -translate-y-1\/2 p-1\.5 rounded-full \$\{\(config\.voice \|\| 'Standard'\) === voice \? \`bg-\$\{themeColor\}-100 dark:bg-\$\{themeColor\}-800\/50 text-\$\{themeColor\}-600\` : 'bg-gray-200 dark:bg-gray-700 text-gray-500'\} hover:scale-110 transition\`\}\n\s*>\n\s*\{previewLoading === voice \? <Loader size=\{14\} className="animate-spin" \/> : <Volume2 size=\{14\} \/>\}\n\s*<\/button>\n\s*\)\)}/g;

code = code.replace(/<button\n\s*key=\{voice\}\n\s*onClick=\{\(\) => onUpdate\(\{ \.\.\.config, voice: voice as 'Standard' \| 'Deep' \}\)\}\n\s*className=\{\`relative flex-1 py-3 rounded-xl/g, '<div key={voice} className="relative flex-1"><button onClick={() => onUpdate({ ...config, voice: voice as \\\'Standard\\\' | \\\'Deep\\\' })} className={`w-full py-3 rounded-xl');

code = code.replace(/\{previewLoading === voice \? <Loader size=\{14\} className="animate-spin" \/> : <Volume2 size=\{14\} \/>\}\n\s*<\/button>\n\s*\)\)}/g, '{previewLoading === voice ? <Loader size={14} className="animate-spin" /> : <Volume2 size={14} />}</button></div>))}');

fs.writeFileSync('views/PodcastView.tsx', code);
