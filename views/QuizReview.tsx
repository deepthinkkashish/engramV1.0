
import React, { useEffect, useRef } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Trophy, Share2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Topic, QuizQuestion } from '../types';
import { SPACING_INTERVALS } from '../constants';
import katex from 'katex';
import DOMPurify from 'dompurify';

interface QuizReviewProps {
    topic: Topic;
    quizData: QuizQuestion[];
    answers: { qIndex: number; selected: string; correct: string }[];
    timeTaken: number;
    navigateTo: (view: string, data?: any) => void;
    repetitionNumber: number;
    themeColor: string;
}

export const QuizReview: React.FC<QuizReviewProps> = ({ topic, quizData, answers, timeTaken, navigateTo, repetitionNumber, themeColor }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // DEBUG: Verify props on mount
    useEffect(() => {
        if (topic) {
            console.debug(`[REVIEW] View mounted. Topic: ${topic.topicName}, Repetition: ${repetitionNumber} (1-based)`);
        }
    }, [topic?.id, repetitionNumber]);

    const renderMathHtml = (text: string) => {
        if (!text) return "";
        const blockMathRegex = /\$\$(.*?)\$\$/g;
        const inlineMathRegex = /\$(.*?)\$/g;
        let processedText = text;

        const blockMatches: string[] = [];
        processedText = processedText.replace(blockMathRegex, (match, formula) => {
            try {
                const html = katex.renderToString(formula, { displayMode: true, throwOnError: false });
                blockMatches.push(html);
                return `__BLOCK_MATH_${blockMatches.length - 1}__`;
            } catch (e) { return match; }
        });

        processedText = processedText.replace(inlineMathRegex, (match, formula) => {
            try {
                const html = katex.renderToString(formula, { displayMode: false, throwOnError: false });
                return html;
            } catch (e) { return match; }
        });

        blockMatches.forEach((html, index) => {
            processedText = processedText.replace(`__BLOCK_MATH_${index}__`, html);
        });

        return DOMPurify.sanitize(processedText);
    };

    if (!quizData || !answers || !topic) {
        return (
            <Card className="text-center py-10 bg-red-100 border border-red-400 text-red-800">
                <h3 className="text-xl font-bold mb-2">Error Loading Review</h3>
                <p>Could not load quiz results data. Please go back to the topic and try again.</p>
                <button
                    onClick={() => navigateTo('subjects')}
                    className={`mt-4 px-4 py-2 bg-${themeColor}-500 text-white rounded-full hover:bg-${themeColor}-600 font-medium flex items-center mx-auto`}
                >
                    <ArrowLeft size={18} className="mr-2" /> Back to Subjects
                </button>
            </Card>
        );
    }
    
    const score = answers.filter(a => a.selected === a.correct).length;
    const isSuccessful = (score / 10) * 100 >= 60;
    
    // Calculate next review date based on current repetition index
    // Note: repetitionNumber is 1-based index of the ATTEMPT just finished.
    // The next interval uses this index.
    const intervalDays = SPACING_INTERVALS[repetitionNumber] || 30;
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

    useEffect(() => {
        if (isSuccessful && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Set canvas size to window for full screen confetti
            const setCanvasSize = () => {
                const dpr = window.devicePixelRatio || 1;
                canvas.width = window.innerWidth * dpr;
                canvas.height = window.innerHeight * dpr;
                ctx.scale(dpr, dpr);
                canvas.style.width = `${window.innerWidth}px`;
                canvas.style.height = `${window.innerHeight}px`;
            };

            setCanvasSize();
            window.addEventListener('resize', setCanvasSize);

            const particles: any[] = [];
            const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
            
            // Create particles
            for (let i = 0; i < 150; i++) {
                particles.push({
                    x: window.innerWidth / 2,
                    y: window.innerHeight / 2, // Start from center of screen
                    vx: (Math.random() - 0.5) * 12,
                    vy: (Math.random() - 0.5) * 12 - 4, // Slight upward bias
                    size: Math.random() * 6 + 2,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    life: 1,
                    decay: 0.005 + Math.random() * 0.015,
                    rotation: Math.random() * 360,
                    rotationSpeed: (Math.random() - 0.5) * 10
                });
            }

            let animationId: number;

            const animate = () => {
                if (!ctx) return;
                ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
                
                let activeParticles = 0;

                particles.forEach(p => {
                    if (p.life > 0) {
                        activeParticles++;
                        p.x += p.vx;
                        p.y += p.vy;
                        p.vy += 0.2; // Gravity
                        p.vx *= 0.95; // Drag
                        p.vy *= 0.95;
                        p.life -= p.decay;
                        p.rotation += p.rotationSpeed;

                        ctx.save();
                        ctx.translate(p.x, p.y);
                        ctx.rotate((p.rotation * Math.PI) / 180);
                        ctx.fillStyle = p.color;
                        ctx.globalAlpha = Math.max(p.life, 0);
                        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                        ctx.restore();
                    }
                });

                if (activeParticles > 0) {
                    animationId = requestAnimationFrame(animate);
                }
            };

            animate();

            return () => {
                cancelAnimationFrame(animationId);
                window.removeEventListener('resize', setCanvasSize);
            };
        }
    }, [isSuccessful]);

    const handleShare = async () => {
        const text = `I just scored ${score}/10 on ${topic.topicName} in Engram! 🚀 Can you beat my score? https://engram-space.vercel.app`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Engram Result',
                    text: text,
                });
            } catch (err) {
                console.log('Share canceled');
            }
        } else {
            navigator.clipboard.writeText(text);
            alert("Result copied to clipboard!");
        }
    };

    return (
        <>
            {isSuccessful && (
                <canvas 
                    ref={canvasRef} 
                    className="fixed inset-0 pointer-events-none z-50"
                />
            )}
            
            <Card className="p-6 relative">
                <div className="relative z-20">
                    <h2 className={`text-3xl font-bold mb-4 text-${themeColor}-700 text-center`}>Quiz Results</h2>
                    
                    <div className={`p-4 rounded-xl text-center mb-6 relative overflow-hidden ${isSuccessful ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {isSuccessful && <div className="absolute top-0 right-0 p-4 opacity-20 transform rotate-12"><Trophy size={64} /></div>}
                        <p className="text-xl font-bold">Score: <span className="text-4xl">{score} / 10</span></p>
                        <p className="mt-1">Time: {timeTaken} seconds | Repetition: {repetitionNumber}</p>
                        <p className="text-sm mt-2 font-medium">Next Review: {nextReviewDate.toLocaleDateString()}</p>
                        {isSuccessful && <p className="text-xs font-bold uppercase tracking-widest mt-2 text-green-600 animate-pulse">Quiz Passed!</p>}
                    </div>

                    <div className="space-y-6">
                        {quizData.map((q, index) => {
                            const answer = answers.find(a => a.qIndex === index);
                            const isCorrect = answer && answer.selected === answer.correct;
                            const resultIcon = isCorrect ? <CheckCircle size={16} className="text-green-600" /> : <XCircle size={16} className="text-red-600" />;

                            return (
                                <Card key={index} className={`p-4 border-l-4 ${isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-lg font-bold flex items-center text-gray-800">
                                            Q{index + 1}: {resultIcon}
                                        </h4>
                                        <span className={`text-sm font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                            {isCorrect ? 'CORRECT' : 'INCORRECT'}
                                        </span>
                                    </div>

                                    <p 
                                        className="mb-3 text-sm font-medium"
                                        dangerouslySetInnerHTML={{ __html: renderMathHtml(q.question) }}
                                    />

                                    <div className="space-y-1 text-sm">
                                        {Object.entries(q.options).map(([letter, text]) => {
                                            const isSelected = answer && answer.selected === letter;
                                            const isCorrectAnswer = q.correct_answer_letter === letter;
                                            let optionClass = 'p-1 rounded flex items-center';

                                            if (isCorrectAnswer) {
                                                optionClass += ' bg-green-200 font-bold text-green-800';
                                            } else if (isSelected) {
                                                optionClass += ' bg-red-200 font-bold text-red-800';
                                            } else {
                                                optionClass += ' text-gray-700';
                                            }

                                            return (
                                                <div key={letter} className={optionClass}>
                                                    <span className="w-4 font-bold mr-2">{letter}.</span>
                                                    <div dangerouslySetInnerHTML={{ __html: renderMathHtml(text) }} />
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-3 p-2 border-t border-gray-300">
                                        <p className={`text-xs font-semibold text-${themeColor}-700`}>Explanation:</p>
                                        <div 
                                            className="text-xs text-gray-600 mt-1"
                                            dangerouslySetInnerHTML={{ __html: renderMathHtml(q.explanation) }}
                                        />
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    <div className="mt-8 flex justify-center space-x-3">
                        <button
                            onClick={() => navigateTo('topicDetail', topic)}
                            className={`px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 font-medium flex items-center`}
                        >
                            <ArrowLeft size={18} className="mr-2" /> Back
                        </button>
                        {isSuccessful && (
                            <button 
                                onClick={handleShare} 
                                className={`px-4 py-2 bg-${themeColor}-600 text-white rounded-full hover:bg-${themeColor}-700 font-medium flex items-center shadow-md transform transition active:scale-95`}
                            >
                                <Share2 size={18} className="mr-2" /> Share Success
                            </button>
                        )}
                        <button
                            onClick={() => navigateTo('home')}
                            className={`px-4 py-2 bg-${themeColor}-500 text-white rounded-full hover:bg-${themeColor}-600 font-medium flex items-center`}
                        >
                            Go Home
                        </button>
                    </div>
                </div>
            </Card>
        </>
    );
};
