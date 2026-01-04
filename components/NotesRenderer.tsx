
import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Loader, X, Layers } from 'lucide-react';
import { getImageFromIDB } from '../services/storage';
import katex from 'katex';
import DOMPurify from 'dompurify';

interface NotesRendererProps {
  content: string;
}

const InlineImage: React.FC<{ imageId: string, description: string }> = ({ imageId, description }) => {
    const [src, setSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        let active = true;
        getImageFromIDB(imageId).then(base64 => {
            if (active && base64) {
                setSrc(`data:image/jpeg;base64,${base64}`);
            }
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [imageId]);

    useEffect(() => {
        if (isModalOpen) {
            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') setIsModalOpen(false);
            };
            window.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
            return () => {
                window.removeEventListener('keydown', handleEsc);
                document.body.style.overflow = 'unset';
            };
        }
    }, [isModalOpen]);

    if (loading) return <div className="h-48 w-full bg-gray-50 dark:bg-gray-800 rounded-xl animate-pulse flex items-center justify-center border border-gray-100 dark:border-gray-700 my-4"><Loader size={20} className="animate-spin text-gray-300"/></div>;
    
    // Placeholder for when image is missing or failed to load - styled as "Figure Identified" placeholder
    if (!src) return (
        <div className="my-6 p-5 bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-gray-700 rounded-full text-gray-400 shadow-sm">
                <ImageIcon size={24} />
            </div>
            <div>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Figure identified</p>
                <p className="text-xs text-gray-500 italic mt-0.5">{description}</p>
            </div>
        </div>
    );

    // Render cropped image with "AI Crop" badge
    return (
        <>
            <div 
                className="my-8 group relative rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 cursor-zoom-in hover:shadow-md transition-all duration-300"
                onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
            >
                {/* AI Crop Badge */}
                <div className="absolute top-3 left-3 z-10">
                    <span className="bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-white/10 flex items-center shadow-lg">
                        <Layers size={12} className="mr-1.5"/> AI Crop
                    </span>
                </div>
                
                <div className="relative bg-white dark:bg-black/20 p-2">
                    <img src={src} alt={description} className="w-full h-auto max-h-[400px] object-contain mx-auto rounded-lg" />
                </div>

                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-medium italic text-center leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>

            {isModalOpen && (
                <div 
                    className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in duration-200"
                    onClick={(e) => { e.stopPropagation(); setIsModalOpen(false); }}
                >
                    <div className="flex justify-between items-center p-6 shrink-0">
                        <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Figure Viewer</span>
                        <button 
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
                            onClick={(e) => { e.stopPropagation(); setIsModalOpen(false); }}
                        >
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                        <img 
                            src={src} 
                            alt={description} 
                            className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-300"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div className="p-8 text-center">
                        <p className="text-white text-sm font-medium italic">{description}</p>
                    </div>
                </div>
            )}
        </>
    );
};

export const NotesRenderer: React.FC<NotesRendererProps> = React.memo(({ content }) => {
    if (!content) return null;

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    
    const captureRegex = /\[FIG_CAPTURE: (.*?) \| (.*?)\]/g; 

    const renderMath = (text: string) => {
        // Detect block math $$ ... $$
        const blockMathRegex = /\$\$(.*?)\$\$/g;
        // Detect inline math $ ... $
        const inlineMathRegex = /\$(.*?)\$/g;

        let processedText = text;

        // Process block math placeholders to avoid conflict with inline
        const blockMatches: string[] = [];
        processedText = processedText.replace(blockMathRegex, (match, formula) => {
            try {
                const html = katex.renderToString(formula, { displayMode: true, throwOnError: false });
                blockMatches.push(html);
                return `__BLOCK_MATH_${blockMatches.length - 1}__`;
            } catch (e) {
                return match;
            }
        });

        // Process inline math
        processedText = processedText.replace(inlineMathRegex, (match, formula) => {
            try {
                const html = katex.renderToString(formula, { displayMode: false, throwOnError: false });
                return html;
            } catch (e) {
                return match;
            }
        });

        // Restore block math with horizontal scroll container and touch hint
        blockMatches.forEach((html, index) => {
            const wrappedHtml = `<div class="overflow-x-auto w-full pb-2 mb-2 touch-pan-x">${html}</div>`;
            processedText = processedText.replace(`__BLOCK_MATH_${index}__`, wrappedHtml);
        });

        // Basic Markdown Formatting
        processedText = processedText
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 dark:text-white font-bold">$1</strong>')
            .replace(/_(.*?)_/g, '<em class="text-blue-600 dark:text-blue-400 not-italic">$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 rounded text-red-600 dark:text-red-400 font-mono text-xs">$1</code>');

        return processedText;
    };

    lines.forEach((line, index) => {
        let currentLine = line;

        // Image Captures
        const captureMatch = [...currentLine.matchAll(captureRegex)];
        if (captureMatch.length > 0) {
            captureMatch.forEach((match) => {
                elements.push(<InlineImage key={`img-${index}-${match[1]}`} imageId={match[1]} description={match[2]} />);
            });
            return; // Skip text rendering for image lines
        }

        // Headers
        if (currentLine.startsWith('### ')) {
             elements.push(<h4 key={index} className="text-lg font-bold text-gray-800 dark:text-gray-100 mt-6 mb-3">{currentLine.replace(/^###\s+/, '')}</h4>);
             return;
        }
        if (currentLine.startsWith('## ')) {
             elements.push(<h3 key={index} className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">{currentLine.replace(/^##\s+/, '')}</h3>);
             return;
        }
        if (currentLine.startsWith('# ')) {
             elements.push(<h2 key={index} className="text-2xl font-extrabold text-gray-900 dark:text-white mt-8 mb-6">{currentLine.replace(/^#\s+/, '')}</h2>);
             return;
        }

        // Lists
        if (currentLine.match(/^\s*[-\*\d\.]/)) {
            const cleanText = currentLine.replace(/^\s*[-\*\d\.]+\s*/, '');
            elements.push(
                <li key={index} className="ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700 my-2 text-base leading-relaxed text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMath(cleanText)) }}></li>
            );
            return;
        }

        // Paragraphs
        if (currentLine.trim()) {
            elements.push(
                <p key={index} className="mb-4 text-base leading-relaxed text-gray-800 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMath(currentLine)) }}></p>
            );
        } else {
             elements.push(<div key={index} className="h-2" />);
        }
    });

    return <div className="font-sans antialiased">{elements}</div>;
});
