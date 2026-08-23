const fs = require('fs');
let code = fs.readFileSync('views/PodcastView.tsx', 'utf8');

const target = `}> = ({ config, onUpdate, navigateTo, themeColor, studyLog, onPlayTopic, onUpdateTopic }) => {`;
const replacement = `}> = ({ config, onUpdate, navigateTo, themeColor, studyLog, onPlayTopic, onUpdateTopic }) => {
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

code = code.replace(target, replacement);
fs.writeFileSync('views/PodcastView.tsx', code);
