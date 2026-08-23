const fs = require('fs');
let code = fs.readFileSync('views/PodcastView.tsx', 'utf8');

const target = `{['Standard', 'Deep'].map((voice) => (
                            <button
                                key={voice}
                                onClick={() => onUpdate({ ...config, voice: voice as 'Standard' | 'Deep' })}
                                className={\`relative flex-1 py-3 rounded-xl font-bold transition border-2 \${
                                    (config.voice || 'Standard') === voice 
                                        ? \`border-\${themeColor}-500 bg-\${themeColor}-50 text-\${themeColor}-700 dark:bg-\${themeColor}-900/30 dark:text-\${themeColor}-300\` 
                                        : 'border-transparent bg-gray-100 dark:bg-gray-800 text-gray-500'
                                }\`}
                            >
                                {voice === 'Standard' ? 'Puck & Aoede' : 'Fenrir & Kore'}
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); playPreview(voice as 'Standard' | 'Deep'); }}
                                disabled={previewLoading === voice}
                                className={\`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full \${(config.voice || 'Standard') === voice ? \`bg-\${themeColor}-100 dark:bg-\${themeColor}-800/50 text-\${themeColor}-600\` : 'bg-gray-200 dark:bg-gray-700 text-gray-500'} hover:scale-110 transition\`}
                            >
                                {previewLoading === voice ? <Loader size={14} className="animate-spin" /> : <Volume2 size={14} />}
                            </button>
                        ))}`;

const replaceStr = `{['Standard', 'Deep'].map((voice) => (
                            <div key={voice} className="relative flex-1">
                                <button
                                    onClick={() => onUpdate({ ...config, voice: voice as 'Standard' | 'Deep' })}
                                    className={\`w-full py-3 rounded-xl font-bold transition border-2 \${
                                        (config.voice || 'Standard') === voice 
                                            ? \`border-\${themeColor}-500 bg-\${themeColor}-50 text-\${themeColor}-700 dark:bg-\${themeColor}-900/30 dark:text-\${themeColor}-300\` 
                                            : 'border-transparent bg-gray-100 dark:bg-gray-800 text-gray-500'
                                    }\`}
                                >
                                    {voice === 'Standard' ? 'Puck & Aoede' : 'Fenrir & Kore'}
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); playPreview(voice as 'Standard' | 'Deep'); }}
                                    disabled={previewLoading === voice}
                                    className={\`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full \${(config.voice || 'Standard') === voice ? \`bg-\${themeColor}-100 dark:bg-\${themeColor}-800/50 text-\${themeColor}-600\` : 'bg-gray-200 dark:bg-gray-700 text-gray-500'} hover:scale-110 transition\`}
                                >
                                    {previewLoading === voice ? <Loader size={14} className="animate-spin" /> : <Volume2 size={14} />}
                                </button>
                            </div>
                        ))}`;
                        
code = code.replace(target, replaceStr);

fs.writeFileSync('views/PodcastView.tsx', code);
