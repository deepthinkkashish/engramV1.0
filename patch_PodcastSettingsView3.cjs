const fs = require('fs');
let code = fs.readFileSync('views/PodcastView.tsx', 'utf8');

// I will add the Preview state inside the PodcastSettingsView component
// export const PodcastSettingsView: React.FC<{ ... }> = ({ ... }) => {
//     const [previewLoading, setPreviewLoading] = useState<'Standard' | 'Deep' | null>(null);
//     const [previewPlaying, setPreviewPlaying] = useState<'Standard' | 'Deep' | null>(null);
//     const audioRef = React.useRef<HTMLAudioElement | null>(null);

const compStartRegex = /export const PodcastSettingsView: React\.FC<\{[^}]+\}> = \(\{[^}]+\}\) => \{/;

code = code.replace(compStartRegex, (match) => {
    return match + `
    const [previewLoading, setPreviewLoading] = useState<'Standard' | 'Deep' | null>(null);
    const [previewPlaying, setPreviewPlaying] = useState<'Standard' | 'Deep' | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const playPreview = async (voice: 'Standard' | 'Deep') => {
        if (previewPlaying === voice) {
            audioRef.current?.pause();
            setPreviewPlaying(null);
            return;
        }
        
        if (audioRef.current) {
            audioRef.current.pause();
            setPreviewPlaying(null);
        }

        setPreviewLoading(voice);
        try {
            const script = voice === 'Standard' 
                ? "Kittu: Hi, I'm Kittu.\\nKashish: And I'm Kashish. This is what we sound like!"
                : "Kittu: Hello. I'm Kittu, providing a deeper tone.\\nKashish: And I'm Kashish, guiding your study sessions.";
            const audioData = await generatePodcastAudio(script, 'preview', voice);
            const blob = createWavBlob(atob(audioData));
            const url = URL.createObjectURL(blob);
            
            const audio = new Audio(url);
            audioRef.current = audio;
            
            audio.onended = () => {
                setPreviewPlaying(null);
                URL.revokeObjectURL(url);
            };
            
            await audio.play();
            setPreviewPlaying(voice);
        } catch (e) {
            console.error("Preview failed", e);
        } finally {
            setPreviewLoading(null);
        }
    };
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);
`;
});

const voiceButtonsRegex = /\{voice === 'Standard' \? 'Puck & Aoede' : 'Fenrir & Kore'\}\n\s*<\/button>/g;

let matchCount = 0;
code = code.replace(voiceButtonsRegex, (match) => {
    return match + `
                            <button 
                                onClick={(e) => { e.stopPropagation(); playPreview(voice as 'Standard' | 'Deep'); }}
                                disabled={previewLoading === voice}
                                className={\`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full \${(config.voice || 'Standard') === voice ? \`bg-\${themeColor}-100 dark:bg-\${themeColor}-800/50 text-\${themeColor}-600\` : 'bg-gray-200 dark:bg-gray-700 text-gray-500'} hover:scale-110 transition\`}
                            >
                                {previewLoading === voice ? <Loader size={14} className="animate-spin" /> : <Volume2 size={14} />}
                            </button>
`;
});

// We need to add "relative" to the button so the absolute preview button positions correctly.
code = code.replace(/className=\{\`flex-1 py-3 rounded-xl/g, "className={`relative flex-1 py-3 rounded-xl");

fs.writeFileSync('views/PodcastView.tsx', code);
